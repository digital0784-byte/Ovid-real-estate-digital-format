import React, { useState, useMemo } from "react";
import {
  Boxes,
  Truck,
  ShoppingCart,
  ShieldCheck,
  CheckSquare,
  Droplet,
  FileSpreadsheet,
  MessageSquare,
  Eye,
  Activity,
  Cpu,
  Cloud,
  Layers,
  Search,
  Plus,
  AlertCircle,
  FileText,
  User,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Play,
  Volume2,
  Send,
  Zap,
  HardDrive,
  RefreshCw,
  Sparkles,
  Download,
  Calendar,
  DollarSign,
  MapPin,
  ClipboardCheck,
  Maximize2,
  BookOpen,
  FileCheck,
  QrCode,
  Wrench,
  ShieldAlert,
  Leaf,
  GraduationCap,
  Briefcase,
  BarChart3,
  Network,
  DatabaseBackup,
  Sliders,
  Smartphone,
  Tablet,
  Mic,
  Star,
  ThumbsUp
} from "lucide-react";
import { UserRole } from "../types";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface EnterpriseErpHubProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction: (action: string, details: string) => void;
}

export const EnterpriseErpHub: React.FC<EnterpriseErpHubProps> = ({
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>("executive");

  // --- FLUTTER & AI ENGINE SIMULATION STATE ---
  const [selectedMobileApp, setSelectedMobileApp] = useState<string>("Head Office App");
  const [selectedDbCollection, setSelectedDbCollection] = useState<string>("companies");
  const [voiceQuery, setVoiceQuery] = useState<string>("");
  const [voiceResponse, setVoiceResponse] = useState<string>("");
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [droneFlightSimulating, setDroneFlightSimulating] = useState<boolean>(false);
  const [droneFlightStep, setDroneFlightStep] = useState<string>("Idle");
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>("");
  const [surveyX, setSurveyX] = useState<string>("1542.45");
  const [surveyY, setSurveyY] = useState<string>("8412.33");
  const [surveyZ, setSurveyZ] = useState<string>("241.15");
  const [deviationStatus, setDeviationStatus] = useState<string>("Awaiting calculation");
  const [registeredNewEmployeeName, setRegisteredNewEmployeeName] = useState<string>("");
  const [registeredNewEmployeeRole, setRegisteredNewEmployeeRole] = useState<string>("Site Engineer");
  const [biometricEnrollmentStatus, setBiometricEnrollmentStatus] = useState<string>("Not Started");

  const [cadFileUploaded, setCadFileUploaded] = useState<boolean>(false);
  const [aiCadWorkforceOutput, setAiCadWorkforceOutput] = useState<any>(null);
  const [payrollApprovalStatus, setPayrollApprovalStatus] = useState<string>("Pending Review");
  const [concreteReadinessChecked, setConcreteReadinessChecked] = useState<any>({
    survey: true,
    quality: true,
    panels: false,
    alignment: false,
    safety: true,
    materials: true,
    equipment: true,
    engineer: false
  });

  // --- USER FEEDBACK & CX SYSTEM STATE ---
  const [feedbacks, setFeedbacks] = useState<any[]>([
    {
      id: "FB-001",
      userName: "Eng. Yohannes Berhanu",
      userRole: "Surveyor",
      project: "Bole Heights Bloc B1",
      site: "Bole Heights",
      category: "Technical",
      type: "System",
      subject: "Leica TS16 Bluetooth latency on Floor 4",
      description: "We are experiencing a 3-second lag when pushing coordinate buffers directly from the Leica TS16 total station to the cloud database. This slows down the deviation verification loop. We need the offline local buffer sync optimization.",
      priority: "High",
      status: "In Review",
      ratings: { easeOfUse: 4, speed: 2, reliability: 3, design: 5, features: 4, management: 4, communication: 3, support: 3, workEnvironment: 4 },
      anonymous: false,
      assignedDepartment: "IT & Digital Infrastructure",
      comments: [
        { author: "Zewdu A. (System Admin)", role: "IT Lead", text: "We are reviewing the network socket queue for the Bole Heights container server. We will deploy the local cache patch tomorrow.", date: "2026-07-10 14:32" }
      ],
      createdAt: "2026-07-10 09:15",
      attachment: "leica_sync_log.txt",
      hasAudio: false,
      sentiment: "Negative",
      sentimentScore: 0.35,
      aiAnalysis: {
        detectedProblems: "Bluetooth connection queue timeout, server replication delay.",
        priorityRecommendation: "High",
        suggestedAction: "Implement background sync queue in Flutter client package."
      }
    },
    {
      id: "FB-002",
      userName: "Anonymous site worker",
      userRole: "Site Worker",
      project: "Bole Heights Bloc B2",
      site: "Bole Heights",
      category: "Safety",
      type: "Construction",
      subject: "Unsafe scaffolding anchor points in Zone C",
      description: "The scaffolding anchor points near the lift shaft on Level 3 feel loose. We reported it to the supervisor but need immediate safety check before concrete pouring starts.",
      priority: "Critical",
      status: "Action Taken",
      ratings: { easeOfUse: 5, speed: 5, reliability: 5, design: 4, features: 4, management: 2, communication: 2, support: 4, workEnvironment: 1 },
      anonymous: true,
      assignedDepartment: "HSE Safety Department",
      comments: [
        { author: "Fikru T. (HSE Lead)", role: "Safety Inspector", text: "Scaffolding inspected and re-anchored. Anchors certified tight. Work resumed safely.", date: "2026-07-11 08:20" }
      ],
      createdAt: "2026-07-11 07:12",
      attachment: "scaffolding_view.jpg",
      hasAudio: false,
      sentiment: "Negative",
      sentimentScore: 0.12,
      aiAnalysis: {
        detectedProblems: "Life-threatening hazard, loose scaffold anchors near elevator shaft.",
        priorityRecommendation: "Critical",
        suggestedAction: "Dispatch immediate HSE emergency team and freeze pouring permit."
      }
    },
    {
      id: "FB-003",
      userName: "Kassa Haile",
      userRole: "Supervisor",
      project: "Bole Heights Bloc B1",
      site: "Bole Heights",
      category: "Materials",
      type: "Construction",
      subject: "Delay in wedge pin supply in Zone B",
      description: "Formwork panels are ready, but we are running low on locking pins and wedges. Please expedite warehouse delivery to prevent delay in Floor 4 slab completion.",
      priority: "Medium",
      status: "Assigned",
      ratings: { easeOfUse: 4, speed: 3, reliability: 4, design: 4, features: 4, management: 3, communication: 4, support: 3, workEnvironment: 3 },
      anonymous: false,
      assignedDepartment: "Procurement & Materials Supply",
      comments: [],
      createdAt: "2026-07-11 08:45",
      attachment: "pins_inventory.jpg",
      hasAudio: true,
      audioDuration: "0:24",
      sentiment: "Neutral",
      sentimentScore: 0.50,
      aiAnalysis: {
        detectedProblems: "Locking pins inventory below critical safety threshold.",
        priorityRecommendation: "Medium",
        suggestedAction: "Trigger auto-release of bundle id BUN-PN-44 from Central Warehouse."
      }
    },
    {
      id: "FB-004",
      userName: "Chala B.",
      userRole: "Site Engineer",
      project: "Bole Heights Bloc B1",
      site: "Bole Heights",
      category: "Management",
      type: "Organization",
      subject: "Excellent coordination on Floor 4 pre-pour cycle",
      description: "The coordination between surveyor Leica coordinate alignment, supervisor daily checklists, and drone photo verification has been exceptionally smooth today. The ERP dashboard made it very easy to verify everything.",
      priority: "Low",
      status: "Open",
      ratings: { easeOfUse: 5, speed: 5, reliability: 5, design: 5, features: 5, management: 5, communication: 5, support: 5, workEnvironment: 5 },
      anonymous: false,
      assignedDepartment: "Project Management Office",
      comments: [],
      createdAt: "2026-07-11 09:30",
      attachment: "",
      hasAudio: false,
      sentiment: "Positive",
      sentimentScore: 0.95,
      aiAnalysis: {
        detectedProblems: "None. Positive workplace synergy.",
        priorityRecommendation: "Low",
        suggestedAction: "Log as positive precedent and share team appreciation."
      }
    }
  ]);

  const [feedbackName, setFeedbackName] = useState<string>("");
  const [feedbackCategory, setFeedbackCategory] = useState<string>("Technical");
  const [feedbackType, setFeedbackType] = useState<string>("System");
  const [feedbackSubject, setFeedbackSubject] = useState<string>("");
  const [feedbackDescription, setFeedbackDescription] = useState<string>("");
  const [feedbackPriority, setFeedbackPriority] = useState<string>("Medium");
  const [feedbackAnonymous, setFeedbackAnonymous] = useState<boolean>(false);
  const [feedbackSearch, setFeedbackSearch] = useState<string>("");
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>("All");
  const [feedbackPriorityFilter, setFeedbackPriorityFilter] = useState<string>("All");
  const [selectedFeedbackForDetails, setSelectedFeedbackForDetails] = useState<any>(null);

  // Ratings
  const [easeOfUseRating, setEaseOfUseRating] = useState<number>(3);
  const [speedRating, setSpeedRating] = useState<number>(3);
  const [reliabilityRating, setReliabilityRating] = useState<number>(3);
  const [designRating, setDesignRating] = useState<number>(3);
  const [featuresRating, setFeaturesRating] = useState<number>(3);
  
  const [managementRating, setManagementRating] = useState<number>(3);
  const [communicationRating, setCommunicationRating] = useState<number>(3);
  const [supportRating, setSupportRating] = useState<number>(3);
  const [workEnvironmentRating, setWorkEnvironmentRating] = useState<number>(3);

  // Audio simulation state
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordedAudioDuration, setRecordedAudioDuration] = useState<number>(0);
  const [audioSimulationAttached, setAudioSimulationAttached] = useState<boolean>(false);
  const [recordingIntervalId, setRecordingIntervalId] = useState<any>(null);

  // Photo simulation state
  const [photoSimulationAttached, setPhotoSimulationAttached] = useState<boolean>(false);
  const [photoPreviewName, setPhotoPreviewName] = useState<string>("");

  // Ticket interaction state
  const [adminCommentText, setAdminCommentText] = useState<string>("");
  const [adminAssignedDept, setAdminAssignedDept] = useState<string>("");

  // AI Analytics View
  const [showAiInsightsTab, setShowAiInsightsTab] = useState<boolean>(false);

  // --- PEER PERFORMANCE APPRAISAL STATE ---
  const [appraisals, setAppraisals] = useState<any[]>([
    {
      id: "APP-001",
      evaluatorName: "Abebe Kebede",
      evaluatorRole: "Project Manager",
      targetName: "Chala Birru",
      targetRole: "Section Head",
      ratings: { workQuality: 5, speed: 4, teamWork: 5, safety: 5, attendance: 5 },
      comments: "እጅግ በጣም ጎበዝ የክፍል ኃላፊ ነው። የቡድን ስራን በማስተባበር ረገድ ከፍተኛ አስተዋጽኦ አለው።",
      averageScore: 4.8,
      status: "Sent to Head Office",
      createdAt: "2026-07-11 08:30",
      project: "Bole Heights Bloc B1"
    },
    {
      id: "APP-002",
      evaluatorName: "Marta Hailu",
      evaluatorRole: "Section Head",
      targetName: "Yoseph Assefa",
      targetRole: "Supervisor",
      ratings: { workQuality: 4, speed: 4, teamWork: 4, safety: 5, attendance: 4 },
      comments: "ስራዎችን በቅርበት ይከታተላል። ለደህንነት መመሪያዎች መከበር ጥብቅ ነው።",
      averageScore: 4.2,
      status: "Sent to Head Office",
      createdAt: "2026-07-11 09:15",
      project: "Bole Heights Bloc B1"
    },
    {
      id: "APP-003",
      evaluatorName: "Yoseph Assefa",
      evaluatorRole: "Supervisor",
      targetName: "Desta Tilahun",
      targetRole: "Team Leader",
      ratings: { workQuality: 4, speed: 5, teamWork: 4, safety: 4, attendance: 5 },
      comments: "የተሰጡትን የግንባታ እቅዶች በወቅቱ ያጠናቅቃል። ቡድኑን በስነ-ስርዓት ይመራል።",
      averageScore: 4.4,
      status: "Sent to Head Office",
      createdAt: "2026-07-11 10:20",
      project: "Bole Heights Bloc B1"
    },
    {
      id: "APP-004",
      evaluatorName: "Desta Tilahun",
      evaluatorRole: "Team Leader",
      targetName: "Kebede Alula",
      targetRole: "Gang Chief",
      ratings: { workQuality: 5, speed: 5, teamWork: 3, safety: 4, attendance: 4 },
      comments: "በአሉሚኒየም ፎርምወርክ መገጣጠም ላይ ከፍተኛ ልምድ አለው።",
      averageScore: 4.2,
      status: "Sent to Head Office",
      createdAt: "2026-07-11 11:05",
      project: "Bole Heights Bloc B1"
    },
    {
      id: "APP-005",
      evaluatorName: "Kebede Alula",
      evaluatorRole: "Gang Chief",
      targetName: "Tewodros Yohannes",
      targetRole: "Assembler",
      ratings: { workQuality: 4, speed: 4, teamWork: 5, safety: 5, attendance: 4 },
      comments: "ፓነሎችን በመገጣጠም እና በማጽዳት ላይ በንቃት ይሳተፋል።",
      averageScore: 4.4,
      status: "Sent to Head Office",
      createdAt: "2026-07-11 13:45",
      project: "Bole Heights Bloc B1"
    },
    {
      id: "APP-006",
      evaluatorName: "Aster Tolosa",
      evaluatorRole: "Time Keeper",
      targetName: "Tewodros Yohannes",
      targetRole: "Assembler",
      ratings: { workQuality: 3, speed: 4, teamWork: 4, safety: 4, attendance: 5 },
      comments: "በሰዓት መከበር ላይ ምንም ዓይነት ችግር የለበትም። ሁልጊዜ ቀድሞ ይገኛል።",
      averageScore: 4.0,
      status: "Sent to Head Office",
      createdAt: "2026-07-11 14:10",
      project: "Bole Heights Bloc B1"
    }
  ]);

  const [appraisalEvName, setAppraisalEvName] = useState<string>("");
  const [appraisalEvRole, setAppraisalEvRole] = useState<string>("Section Head");
  const [appraisalTgtName, setAppraisalTgtName] = useState<string>("");
  const [appraisalTgtRole, setAppraisalTgtRole] = useState<string>("Supervisor");
  const [appraisalWorkQuality, setAppraisalWorkQuality] = useState<number>(4);
  const [appraisalSpeed, setAppraisalSpeed] = useState<number>(4);
  const [appraisalTeamWork, setAppraisalTeamWork] = useState<number>(4);
  const [appraisalSafety, setAppraisalSafety] = useState<number>(4);
  const [appraisalAttendance, setAppraisalAttendance] = useState<number>(4);
  const [appraisalCommentsText, setAppraisalCommentsText] = useState<string>("");
  const [appraisalProject, setAppraisalProject] = useState<string>("Bole Heights Bloc B1");
  const [appraisalFilterRole, setAppraisalFilterRole] = useState<string>("All");
  const [appraisalSearchText, setAppraisalSearchText] = useState<string>("");

  // --- 1. MATERIAL STATE ---
  const [materials, setMaterials] = useState([
    { id: "MAT-01", name: "Aluminum Formwork Panels", code: "ALP-1200", qty: 2450, minQty: 500, bundleId: "BUN-AL-01", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-02", name: "Beam Panels", code: "BMP-0900", qty: 850, minQty: 200, bundleId: "BUN-BM-04", cleaning: "To Clean", repair: "Needs Welding" },
    { id: "MAT-03", name: "Soffit Panels", code: "SFP-0600", qty: 1200, minQty: 300, bundleId: "BUN-SF-02", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-04", name: "Wall Panels", code: "WLP-2400", qty: 3100, minQty: 600, bundleId: "BUN-WL-09", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-05", name: "Corner Panels", code: "CNP-0300", qty: 450, minQty: 100, bundleId: "BUN-CN-01", cleaning: "To Clean", repair: "Ready" },
    { id: "MAT-06", name: "External Corners", code: "EXC-0100", qty: 180, minQty: 50, bundleId: "BUN-EX-03", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-07", name: "Internal Corners", code: "INC-0100", qty: 220, minQty: 50, bundleId: "BUN-IN-02", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-08", name: "Props (Heavy Steel)", code: "PRP-3500", qty: 950, minQty: 250, bundleId: "BUN-PR-11", cleaning: "Clean", repair: "Thread Oiled" },
    { id: "MAT-09", name: "Waler Support Rails", code: "WLR-4000", qty: 420, minQty: 100, bundleId: "BUN-WL-05", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-10", name: "Tie Rods & Sleeves", code: "TRD-1500", qty: 5800, minQty: 1500, bundleId: "BUN-TR-20", cleaning: "Clean", repair: "Thread Grinded" },
    { id: "MAT-11", name: "Formwork Locking Pins", code: "PIN-0150", qty: 18400, minQty: 2000, bundleId: "BUN-PN-44", cleaning: "To Rust-treat", repair: "Ready" },
    { id: "MAT-12", name: "Formwork Wedges", code: "WDG-0100", qty: 16900, minQty: 2000, bundleId: "BUN-WD-12", cleaning: "Clean", repair: "Ready" },
    { id: "MAT-13", name: "Corner Brackets", code: "ACC-BRK", qty: 120, minQty: 150, bundleId: "BUN-AC-02", cleaning: "Clean", repair: "Needs Realignment" } // low stock example
  ]);

  const [matSearch, setMatSearch] = useState("");
  const [newMatItem, setNewMatItem] = useState({ name: "", qty: 100, minQty: 50, type: "Receiving", notes: "" });

  // --- CAD-Driven Material Planning ---
  const [planFloor, setPlanFloor] = useState<string>("Floor 4");
  const [planZone, setPlanZone] = useState<string>("Zone A");
  const [planIsRunning, setPlanIsRunning] = useState<boolean>(false);
  const [planningSubmitted, setPlanningSubmitted] = useState<boolean>(false);
  const [planResults, setPlanResults] = useState<any>({
    panels: 320,
    beams: 145,
    soffits: 98,
    tieRods: 210,
    wedges: 840,
    props: 195,
    accessories: 130
  });

  // --- Workforce Performance Analytics ---
  const [perfReportPeriod, setPerfReportPeriod] = useState<string>("Daily");
  const [perfLeaderboardFilter, setPerfLeaderboardFilter] = useState<string>("Team");
  const [perfDigestActive, setPerfDigestActive] = useState<boolean>(false);
  const [perfDigestContent, setPerfDigestContent] = useState<string>("");

  // --- Admin Workflow simulation selectors ---
  const [selectedWorkflowCat, setSelectedWorkflowCat] = useState<string>("All");
  const [simTriggerId, setSimTriggerId] = useState<string>("WFK-13");
  const [simTriggerDetails, setSimTriggerDetails] = useState<string>("Floor 4 Zone A Column Pour - 45 m³ C30 mix");

  // --- Smart Scheduling selectors ---
  const [selectedScheduleTab, setSelectedScheduleTab] = useState<string>("daily");
  const [simDelayType, setSimDelayType] = useState<string>("Severe Storm / Torrential Rain");

  // --- 2. EQUIPMENT STATE ---
  const [equipment, setEquipment] = useState([
    { id: "EQ-01", name: "Tower Crane 01 (Potain)", status: "Active", fuel: "450L", usage: "8.5 Hrs", maintenance: "2026-07-20", inspector: "Alemayehu K.", operator: "Kassahun T.", breakdown: "None" },
    { id: "EQ-02", name: "Mobile Crane (Sany 50T)", status: "Active", fuel: "210L", usage: "4.0 Hrs", maintenance: "2026-07-25", inspector: "Alemayehu K.", operator: "Chala B.", breakdown: "Hydraulic Leak fixed" },
    { id: "EQ-03", name: "Passenger Hoist Block B1", status: "Active", fuel: "N/A (Electric)", usage: "16 Hrs", maintenance: "2026-07-12", inspector: "Mulugeta S.", operator: "Automation", breakdown: "Relay replaced" },
    { id: "EQ-04", name: "Concrete Pump Truck 02", status: "Maintenance", fuel: "120L", usage: "0 Hrs", maintenance: "2026-07-09", inspector: "Eng. Dawit", operator: "Zewdu A.", breakdown: "Piston Seal Wear Out" },
    { id: "EQ-05", name: "Backup Generator 250kVA", status: "Standby", fuel: "800L", usage: "1.2 Hrs", maintenance: "2026-08-01", inspector: "Yoseph H.", operator: "Abebe G.", breakdown: "None" },
    { id: "EQ-06", name: "High-Freq Concrete Vibrators", status: "Active", fuel: "Petrol (45L)", usage: "6.5 Hrs", maintenance: "2026-07-15", inspector: "Fikru T.", operator: "Subcontractor Gangs", breakdown: "Flexible shaft replaced" },
    { id: "EQ-07", name: "Surveying Total Station (Leica)", status: "Active", fuel: "Battery (90%)", usage: "7.0 Hrs", maintenance: "2026-07-11", inspector: "Survey Team", operator: "Yohannes B.", breakdown: "Recalibrated" },
    { id: "EQ-08", name: "Site Recon Drone (DJI RTK)", status: "Standby", fuel: "Battery (100%)", usage: "1.5 Hrs", maintenance: "2026-07-10", inspector: "Safety Team", operator: "Eng. Yoseph", breakdown: "None" }
  ]);

  const [newEqLog, setNewEqLog] = useState({ eqId: "EQ-01", fuelUsed: 45, usageHrs: 8, reportText: "" });

  // --- 3. PROCUREMENT STATE ---
  const [procurements, setProcurements] = useState([
    { id: "PR-304", item: "M20 Heavy Tie-Rods (High Tensile)", qty: "1,500 Pcs", cost: "ETB 240,000", supplier: "Ethio-Steel Ltd", status: "Approved", date: "2026-07-08", approvalBy: "Nuriye Ahmed Adem" },
    { id: "PR-303", item: "Aluminum Formwork Pin Wedges", qty: "10,000 Pcs", cost: "ETB 95,000", supplier: "Global Fasteners PLC", status: "Goods Received", date: "2026-07-06", approvalBy: "Eng. Dawit" },
    { id: "PR-302", item: "High Performance Formwork Release Agent", qty: "10 Drums", cost: "ETB 115,000", supplier: "Nile Chemicals Co.", status: "Payment Completed", date: "2026-07-02", approvalBy: "Nuriye Ahmed Adem" },
    { id: "PR-301", item: "Steel Props Adjusting Sleeves", qty: "300 Pcs", cost: "ETB 180,000", supplier: "Bole Structural Casting", status: "Pending Approval", date: "2026-07-09", approvalBy: "Awaiting Nuriye" }
  ]);

  const [newPrItem, setNewPrItem] = useState({ item: "", qty: "", cost: "", supplier: "" });

  // --- 4. SAFETY (HSE) STATE ---
  const [hseLogs, setHseLogs] = useState([
    { id: "HSE-901", type: "Toolbox Meeting", topic: "Safe Handling & Stripping of Aluminum Formwork Panels", attendees: 42, supervisor: "Kassa Hunegn", status: "Completed", date: "2026-07-09" },
    { id: "HSE-902", type: "PPE Inspection", topic: "Mandatory Safety Harness Lock checks for Block B1 Level 5", attendees: 38, supervisor: "Fikru Tolossa", status: "All Complied", date: "2026-07-09" },
    { id: "HSE-903", type: "Near Miss Report", topic: "Loose Wedge Pin dropped from Floor 5 near walkways (No injuries, safety nets pre-installed)", attendees: 0, supervisor: "Kassa Hunegn", status: "Investigated & Net Reinforced", date: "2026-07-08" },
    { id: "HSE-904", type: "Hazard Report", topic: "Slurry splash hazard on column C3 scaffolding plank. Fixed alignment.", attendees: 0, supervisor: "Yohannes B.", status: "Mitigated Immediately", date: "2026-07-07" }
  ]);

  const [newHseReport, setNewHseReport] = useState({ topic: "", type: "Incident Report", details: "" });

  // --- 5. QUALITY CONTROL STATE ---
  const [qualityControls, setQualityControls] = useState([
    { id: "QC-801", type: "Concrete Pour Checklist", zone: "B1-Floor 4-Zone A", checklist: "Pre-pour slump 120mm, Cover blocks 25mm, Rebars clean", status: "Passed & Signed", approvedBy: "Nuriye Ahmed Adem", date: "2026-07-08" },
    { id: "QC-802", type: "Formwork Inspection", zone: "B1-Floor 4-Zone B", checklist: "Wall panel verticality check, wedge pin engagement > 98%", status: "NCR Issued (2mm variance)", approvedBy: "Eng. Dawit", date: "2026-07-09" },
    { id: "QC-803", type: "Reinforcement Inspection", zone: "B1-Floor 4-Zone B", checklist: "Tension lap length checks (50D compliance), links spacing", status: "Pending Check", approvedBy: "Alemayehu Kebede", date: "2026-07-09" }
  ]);

  const [newQc, setNewQc] = useState({ type: "Aluminum Formwork Inspection", zone: "B1-Floor 4-Zone C", status: "Pending Check", checklist: "" });

  // --- 6. CONCRETE MANAGEMENT STATE ---
  const [concreteTrucks, setConcreteTrucks] = useState([
    { id: "CON-TRK-01", project: "Bole Heights B1", volume: "8 m³", supplier: "Mugher ReadyMix", arrival: "08:15 AM", slump: "125mm", cubeCode: "CUBE-C30-41A", status: "Poured & Approved", cureDays: 3 },
    { id: "CON-TRK-02", project: "Bole Heights B1", volume: "8 m³", supplier: "Mugher ReadyMix", arrival: "09:02 AM", slump: "120mm", cubeCode: "CUBE-C30-41B", status: "Poured & Approved", cureDays: 3 },
    { id: "CON-TRK-03", project: "Bole Heights B1", volume: "10 m³", supplier: "National Cement", arrival: "10:30 AM", slump: "135mm", cubeCode: "CUBE-C30-42A", status: "Slump Tested", cureDays: 0 },
    { id: "CON-TRK-04", project: "Bole Heights B1", volume: "10 m³", supplier: "National Cement", arrival: "11:15 AM", slump: "Pending", cubeCode: "Pending", status: "Approaching Gate", cureDays: 0 }
  ]);

  const [newTruck, setNewTruck] = useState({ volume: "8 m³", supplier: "Mugher ReadyMix", slump: "120mm", status: "Gate In" });

  // --- 7. DOCUMENT MANAGEMENT STATE ---
  const [documents, setDocuments] = useState([
    { id: "CAD-101", name: "FormworkLayout_Floor4_B1.dwg", type: "CAD Drawing", ver: "v2.4", syncDate: "2026-07-08", approval: "Approved by Nuriye" },
    { id: "SD-304", name: "CornerBracket_AssemblyDetail_Shop.pdf", type: "Shop Drawing", ver: "v1.2", syncDate: "2026-07-05", approval: "Approved by Eng. Dawit" },
    { id: "MTS-501", name: "MethodStatement_HighRiseFormwork_Digital Construction ERP.pdf", type: "Method Statement", ver: "v3.0", syncDate: "2026-06-15", approval: "Lead Admin Signed" },
    { id: "RFI-221", name: "RFI_SlabConduits_Elect_ZoneB.docx", type: "RFI", ver: "v1.0", syncDate: "2026-07-09", approval: "Awaiting Consultant" }
  ]);

  const [newDocName, setNewDocName] = useState("");

  // --- 8. COMMUNICATION CENTER STATE ---
  const [chats, setChats] = useState([
    { id: 1, sender: "Nuriye Ahmed Adem (Admin)", text: "Team, we have 2 ready mix trucks incoming for Floor 4 Column Pour. Ensure stripping is finished on Area B.", time: "09:12 AM" },
    { id: 2, sender: "Eng. Dawit (PM)", text: "Confirming. Wedge pins are secure on Block B1-A. Surveyors have aligned verticality.", time: "09:14 AM" },
    { id: 3, sender: "Kassa Hunegn (Supervisor)", text: "Assembly Team Alpha is checking pins now. Scraping panels complete.", time: "09:18 AM" }
  ]);

  const [chatInput, setChatInput] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([
    { id: "V-01", sender: "Fikru Tolossa", duration: "12 Secs", time: "08:30 AM", url: "Voice_AlphaFinished_Slab.mp3" },
    { id: "V-02", sender: "Abebe Girma", duration: "18 Secs", time: "08:55 AM", url: "Voice_BiometricError_Solved.mp3" }
  ]);

  // --- 9. CLIENT/CONSULTANT VIEW ---
  const [clientApprovals, setClientApprovals] = useState([
    { id: "CA-101", task: "Structural Pour Level 4 columns Check", submitted: "2026-07-08", status: "Approved with Comments", consultant: "Tekle & Partners", comments: "Clean column base completely before concreting." },
    { id: "CA-102", task: "Formwork Stripping approval Floor 3", submitted: "2026-07-07", status: "Fully Approved", consultant: "Tekle & Partners", comments: "Curing checks satisfied for 72 hours." }
  ]);

  // --- 10. AI DIGITAL TWIN KPI METRICS ---
  const aiTwinProgress = {
    totalBldgProgress: 76.5,
    delayPrediction: "0 Days (On Schedule)",
    materialForecast: "Wedges +12% surplus, Pins -2% near threshold. Restock in 5 days.",
    workforceForecast: "Optimum (65 Workers registered on site today vs 60 Target)",
    productivityScore: 94.2,
    concreteReadiness: "98% Ready",
    qualityStatus: "Excellent (1 minor snag open on Zone B)",
    safetyStatus: "No incidents recorded"
  };

  // --- PHASE 2 STATE VARIABLES ---
  const [erpCategory, setErpCategory] = useState<"operations" | "enterprise">("operations");

  // Req 14: Digital Site Diary
  const [diaryLogs, setDiaryLogs] = useState([
    {
      id: "SD-2026-07-09",
      date: "2026-07-09",
      weather: "Sunny, Wind 12 km/h, 24°C",
      attendance: "65 Workers Registered, 2 Late",
      surveyResults: "Verticality check passed (vertical slope deviation < 1.2mm)",
      activities: "Formwork stripping on Level 4 Zone A; Erecting scaffolding on Level 5 Slab support",
      photos: "B1_Floor4_West_Facing.jpg",
      droneImages: "Digital Construction ERP_Drone_Ortho_B1_0709.tiff",
      safetyIncidents: "Zero incidents (1 Toolbox meeting completed at 07:30 AM)",
      materialUsage: "450 Wall panels, 1200 Wedge pins, 5 Drums chemical release agent",
      equipmentUsage: "Tower Crane 01 (8.5 Hrs), Mobile Crane (4.0 Hrs), Concrete Vibrators (6.5 Hrs)",
      concreteActivities: "Poured 16 m³ compressive concrete C30 on Floor 4 Area C Column Bases",
      visitors: "Consultant inspector Eng. Tekle, Digital Construction ERP Executive Auditor Senait M.",
      engineerNotes: "Slab supports alignment verified. Minor slab deflection check on Zone B completed.",
      supervisorNotes: "Scraping of stripped panels went smoothly. Group B completed formwork oiled stack.",
      aiSummary: "Highly productive day. Formwork cycle completed in 4.2 days vs 5.0 target. Slurry seals 100% airtight."
    },
    {
      id: "SD-2026-07-08",
      date: "2026-07-08",
      weather: "Cloudy, Wind 15 km/h, 21°C",
      attendance: "61 Workers Registered, 0 Late",
      surveyResults: "Column alignment checked, all within 2mm tolerance",
      activities: "Concrete pouring columns C1 to C8; Pre-curing water sprays on Floor 3 columns",
      photos: "B1_Floor4_Pour_Preparation.jpg",
      droneImages: "Digital Construction ERP_Drone_Altitude_B1_0708.tiff",
      safetyIncidents: "None (Minor hazard warning on scaffolding toe-boards resolved)",
      materialUsage: "180 Corner brackets, 80 Tie-rods, 30 Steel props adjusted",
      equipmentUsage: "Backup Generator 250kVA (1.2 Hrs), High-Freq Vibrators (5 Hrs)",
      concreteActivities: "Poured 18 m³ concrete columns C1-C8 (slump 120mm checked)",
      visitors: "Digital Construction ERP VP HR Dr. Solomon G.",
      engineerNotes: "Cube compressive test CUBE-C30-41A prepared for curing tank.",
      supervisorNotes: "Assembly crew worked till 06:30 PM to secure the tie-rod sleeves.",
      aiSummary: "Pouring sequence optimized. Curing regime initiated on schedule."
    }
  ]);
  const [newDiaryEntry, setNewDiaryEntry] = useState({
    weather: "Sunny, 25°C",
    activities: "",
    engineerNotes: "",
    supervisorNotes: "",
    concreteActivities: "Poured 8 m³ columns",
    safetyIncidents: "None",
    materialUsage: ""
  });

  // Req 15: Work Permit Management
  const [permits, setPermits] = useState([
    { id: "PER-801", type: "Hot Work", zone: "Block B1-Floor 4-Zone A", requestedBy: "Chala B. (Welder Lead)", approvedBy: "Nuriye Ahmed Adem", expiry: "2026-07-09 18:00", status: "Active", alerts: "No alerts" },
    { id: "PER-802", type: "Height Work", zone: "Tower Crane MC125 Boom Support", requestedBy: "Kassahun T. (Crane Op)", approvedBy: "Eng. Dawit", expiry: "2026-07-10 12:00", status: "Approved", alerts: "Alert: Winds forecast 25+ km/h tomorrow" },
    { id: "PER-803", type: "Excavation", zone: "Tower B2 Gate Base Foundation", requestedBy: "Mulugeta S. (Gangs Chief)", approvedBy: "Alemayehu Kebede", expiry: "2026-07-08 17:00", status: "Expired", alerts: "Expired: Auto-archived" },
    { id: "PER-804", type: "Crane Lifting", zone: "Heavy Bundle Unloading Yard", requestedBy: "Yoseph H. (Supervisor)", approvedBy: "Nuriye Ahmed Adem", expiry: "2026-07-09 17:30", status: "Active", alerts: "No alerts" },
    { id: "PER-805", type: "Confined Space", zone: "Block B1 Sewer Connection Tank", requestedBy: "Zewdu A. (Plumber Lead)", approvedBy: "Pending", expiry: "2026-07-10 18:00", status: "Pending Approval", alerts: "Check oxygen levels before entry" },
    { id: "PER-806", type: "Concrete Pour", zone: "Block B1-Floor 5-Slab Base", requestedBy: "Fikru T. (Concrete Supervisor)", approvedBy: "Pending", expiry: "2026-07-11 18:00", status: "Pending Approval", alerts: "Awaiting slump report" },
    { id: "PER-807", type: "Formwork Removal", zone: "Block B1-Floor 3-Zone B Column", requestedBy: "Kassa H. (Formwork Lead)", approvedBy: "Eng. Dawit", expiry: "2026-07-09 12:00", status: "Active", alerts: "Cure cycle verified 72 Hrs" }
  ]);
  const [newPermit, setNewPermit] = useState({
    type: "Hot Work",
    zone: "Floor 4-Zone B",
    requestedBy: "Chala B.",
    expiry: "2026-07-10 18:00"
  });

  // Req 16: Asset Tracking
  const [assets, setAssets] = useState([
    { id: "AST-401", code: "QR-ALUM-PAN-401", name: "Aluminum Formwork Panel Set A", category: "Aluminum Panels", location: "Block B1-Floor 4", assignedTo: "Assembly Team Alpha", status: "In Use", serviceHistory: "Last repaired on 2026-06-15" },
    { id: "AST-402", code: "RFID-SURV-TS16", name: "Leica TS16 Total Station Precision", category: "Survey Instruments", location: "Surveying Yard Office", assignedTo: "Yohannes B. (Surveyor)", status: "Healthy", serviceHistory: "Calibrated on 2026-07-01 by Leica Ethio" },
    { id: "AST-403", code: "QR-CRANE-POTAIN", name: "Potain Tower Crane MC125", category: "Cranes", location: "Block B1 Construction Center", assignedTo: "Chala B. (Operator)", status: "Active", serviceHistory: "Slew ring safety overhaul completed 2026-05-10" },
    { id: "AST-404", code: "QR-GEN-CAT250", name: "Caterpillar 250kVA Generator", category: "Generators", location: "Power Station South Yard", assignedTo: "Yoseph H. (Supervisor)", status: "Standby", serviceHistory: "Engine oil, filters replaced on 2026-06-20" },
    { id: "AST-405", code: "QR-PUMP-SANY32", name: "Sany Concrete Pump Truck 32m", category: "Concrete Pumps", location: "Digital Construction ERP Central Yard", assignedTo: "Zewdu A. (Operator)", status: "Maintenance", serviceHistory: "Piston seal wearing out, spare parts on order" },
    { id: "AST-406", code: "RFID-DRONE-RTK", name: "DJI Matrice 300 RTK Survey Drone", category: "Drones", location: "Engineering Office Block", assignedTo: "Eng. Yoseph (Tech Lead)", status: "Healthy", serviceHistory: "Compass recalibrated, firmware updated 2026-07-05" },
    { id: "AST-407", code: "QR-TOOL-HILTI", name: "Hilti TE-70 Heavy Rotary Hammer", category: "Power Tools", location: "Central Tool Store", assignedTo: "Gangs Crew Alpha", status: "Healthy", serviceHistory: "Trigger assembly replaced 2026-04-18" }
  ]);
  const [assetSearch, setAssetSearch] = useState("");
  const [newAsset, setNewAsset] = useState({
    code: "",
    name: "",
    category: "Aluminum Panels",
    location: "Block B1-Floor 4",
    assignedTo: ""
  });

  // Req 17: Maintenance Management
  const [maintenanceSchedule, setMaintenanceSchedule] = useState([
    { id: "MNT-901", asset: "Potain Tower Crane MC125", type: "Slew Ring Greasing & Wire rope integrity", dueDate: "2026-07-12", assignedTo: "Fikru Tolossa (Safety Tech)", status: "Notification Sent", alertTime: "3 Days Before" },
    { id: "MNT-902", asset: "Leica TS16 Total Station", type: "Prism alignment & Laser recalibration", dueDate: "2026-07-11", assignedTo: "Yohannes B. (Surveyor)", status: "Pending Alert", alertTime: "2 Days Before" },
    { id: "MNT-903", asset: "Caterpillar 250kVA Generator", type: "Radiator Coolant flush & Fuel injector check", dueDate: "2026-07-20", assignedTo: "Yoseph H. (Supervisor)", status: "Scheduled", alertTime: "11 Days Before" },
    { id: "MNT-904", asset: "Sany Concrete Pump Truck 32m", type: "Piston seal replacement & Hydraulic cylinder check", dueDate: "2026-07-09", assignedTo: "Eng. Dawit", status: "Undergoing Repair", alertTime: "Overdue" },
    { id: "MNT-905", asset: "DJI Matrice 300 RTK Survey Drone", type: "Rotor blade replacement & Battery diagnostic cycle", dueDate: "2026-07-25", assignedTo: "Eng. Yoseph", status: "Scheduled", alertTime: "16 Days Before" }
  ]);
  const [newMaintItem, setNewMaintItem] = useState({
    asset: "Leica TS16 Total Station",
    type: "",
    dueDate: "2026-07-15",
    assignedTo: ""
  });

  // Req 18: Cost Control
  const [costItems, setCostItems] = useState([
    { category: "Labor Cost", planned: 450000, actual: 420000, color: "#ef4444" },
    { category: "Material Cost", planned: 850000, actual: 890000, color: "#334155" },
    { category: "Equipment Cost", planned: 300000, actual: 320000, color: "#f59e0b" },
    { category: "Fuel Cost", planned: 120000, actual: 115000, color: "#10b981" },
    { category: "Subcontractor Cost", planned: 500000, actual: 480000, color: "#6366f1" },
    { category: "Concrete Cost", planned: 950000, actual: 980000, color: "#ec4899" },
    { category: "Overhead Cost", planned: 150000, actual: 140000, color: "#8b5cf6" }
  ]);
  const [newCostRecord, setNewCostRecord] = useState({
    category: "Labor Cost",
    planned: 50000,
    actual: 50000
  });

  // Req 19: AI Risk Management
  const [aiRisks, setAiRisks] = useState([
    { id: "RSK-01", category: "Schedule Delays", priority: "Low", desc: "No critical path delays predicted. Formwork sequence completed 4 hours ahead of yesterday's projection.", recommendation: "Maintain active workforce layout." },
    { id: "RSK-02", category: "Safety Risks", priority: "High", desc: "High wind speed forecast of 28 km/h tomorrow between 13:00 and 16:00.", recommendation: "Halt tower crane operations above 15m. Suspend Level 5 slab exterior formwork stripping during peak gust times." },
    { id: "RSK-03", category: "Quality Risks", priority: "Low", desc: "Concrete slump values from national ready mix are highly stable within 120-130mm.", recommendation: "Continue cube crush evaluations daily." },
    { id: "RSK-04", category: "Budget Risks", priority: "Low", desc: "Cumulated material variance is +1.2%, easily offset by labor efficiency gains of 4.5%.", recommendation: "No urgent reallocation required." },
    { id: "RSK-05", category: "Material Shortages", priority: "Medium", desc: "Locking wedge pin inventory is down to 16,900. Near 15,000 safety threshold.", recommendation: "Authorize the procurement request (PR-301) to Global Fasteners for 10,000 pins immediately." },
    { id: "RSK-06", category: "Equipment Breakdowns", priority: "Medium", desc: "Sany Concrete Pump has been in repair shop for 18 hours. Seal wear-out.", recommendation: "Utilize auxiliary ready mix truck chute directly for Ground-Level retaining walls." },
    { id: "RSK-07", category: "Workforce Availability", priority: "Low", desc: "Biometric attendance Board registered 65 workers today. Well above the 60 target.", recommendation: "Maintain shift rotations without extra overtime cost." }
  ]);

  // Req 20: Environmental Management
  const [environmentalMetrics, setEnvironmentalMetrics] = useState({
    wasteDisposed: "2.4 Tons total (Recycled Aluminum form scraps: 95%, Concrete chips used for backfill)",
    dustControl: "Water sprinkler systems active 4x daily on walkways (PM10: 34 µg/m³ - Standard Compliant)",
    noiseLevels: "68.2 dB Average across 3 perimeter sensors (Under the 85dB municipality limit)",
    waterUsage: "12,400 Liters today (5,200L recycled from slurry settling pool, 7,200L fresh bore)",
    fuelConsumption: "720 Liters total (Generators: 420L, Cranes: 180L, Mobile loaders: 120L)",
    carbonEmissions: "1.92 Tons CO2eq today (Offset via certified solar PV array on administrative yard: 0.45 Tons)"
  });

  // Req 21: Training & Competency
  const [trainingRecords, setTrainingRecords] = useState([
    { id: "EMP-082", employee: "Chala B. (Welder Lead)", course: "Height Work & Safety Harness Lock", certDate: "2026-01-15", expiryDate: "2026-12-15", status: "Valid", blockStatus: "Clear" },
    { id: "EMP-011", employee: "Kassahun T. (Crane Op)", course: "Tower Crane Operation Level II Certification", certDate: "2025-06-30", expiryDate: "2026-06-30", status: "Expired", blockStatus: "Blocked from Task" },
    { id: "EMP-090", employee: "Yohannes B. (Surveyor)", course: "Survey Instrument Calibration & Leica GS18 T", certDate: "2025-04-10", expiryDate: "2027-04-10", status: "Valid", blockStatus: "Clear" },
    { id: "EMP-045", employee: "Alemayehu K. (QC Engineer)", course: "Reinforcement Tensile Testing & ASTM Standards", certDate: "2025-10-02", expiryDate: "2026-10-02", status: "Valid", blockStatus: "Clear" },
    { id: "EMP-102", employee: "Mulugeta S. (Supervisor)", course: "Confined Space Entry Safety Marshal Certification", certDate: "2025-01-20", expiryDate: "2026-01-20", status: "Expired", blockStatus: "Blocked from Task" }
  ]);
  const [newTraining, setNewTraining] = useState({
    employee: "",
    course: "Height Work & Safety Harness Lock",
    expiryDate: "2027-07-09"
  });

  // Req 22: Multi-Project Management
  const [multiProjects, setMultiProjects] = useState([
    { id: "PRJ-01", company: "Digital Construction ERP PLC", name: "Bole Heights Phase I", towers: "Block B1 + B2 (Towers)", floors: "G+12 Floors", zones: "Zones A, B, C", budget: "ETB 45M", progress: 76.5, status: "Active" },
    { id: "PRJ-02", company: "Digital Construction ERP System", name: "Yeka Hills Premium Gated Estate", towers: "12 Residential Towers", floors: "G+15 Floors", zones: "Phases 1, 2, 3", budget: "ETB 180M", progress: 22.0, status: "Active" },
    { id: "PRJ-03", company: "Digital Infrastructure", name: "Lemi National Cement Plant Expansion", towers: "Industrial Concrete Silos", floors: "Heavy Industrial Structure", zones: "Zone West, Crusher Yard", budget: "ETB 240M", progress: 94.0, status: "Active" },
    { id: "PRJ-04", company: "Digital Housing Co.", name: "Gotera Low-Cost Block housing", towers: "Block A1, A2, A3, A4", floors: "G+7 Floors", zones: "Zone North", budget: "ETB 38M", progress: 5.0, status: "Mobilization" }
  ]);
  const [newProject, setNewProject] = useState({
    company: "Digital Construction ERP PLC",
    name: "",
    towers: "Block B3",
    floors: "G+10 Floors",
    budget: "ETB 20M"
  });

  // Req 24: Enterprise API Integration & Sync Logs
  const [apiLogs, setApiLogs] = useState([
    { id: "API-9482", endpoint: "/api/v1/erp/sync-inventory", method: "POST", status: 200, system: "SAP ERP Financials", payload: "Sync 13 Material items, zero discrepancies.", timestamp: "2026-07-09 11:15" },
    { id: "API-9481", endpoint: "/api/v1/hr/biometric-pull", method: "GET", status: 200, system: "Digital Construction ERP HRMS (ZKTeco Hub)", payload: "Pulled 65 worker check-in times.", timestamp: "2026-07-09 11:00" },
    { id: "API-9480", endpoint: "/api/v1/bim/telemetry", method: "POST", status: 201, system: "Autodesk Construction Cloud (BIM)", payload: "Updated Floor 4 Zone A mesh model progress (76.5%).", timestamp: "2026-07-09 10:45" },
    { id: "API-9479", endpoint: "/api/v1/gis/topography-contour", method: "POST", status: 200, system: "ArcGIS Survey Integration", payload: "Uploaded Ortho mosaic drone point cloud.", timestamp: "2026-07-09 08:30" },
    { id: "API-9478", endpoint: "/api/v1/accounting/purchase-invoice-sync", method: "POST", status: 500, system: "Peachtree Accounting Integration", payload: "Error: Socket connection timeout. Retrying in 120s...", timestamp: "2026-07-09 07:15" }
  ]);

  // Req 25: Backup & Disaster Recovery
  const [backupLogs, setBackupLogs] = useState([
    { id: "BKP-01", timestamp: "2026-07-09 03:00", type: "Full Cold Backup", size: "14.2 GB", checksum: "SHA-256 (Valid)", destination: "AWS Frankfurt (Secondary Node)", status: "Completed" },
    { id: "BKP-02", timestamp: "2026-07-09 02:00", type: "Incremental Sync", size: "245 MB", checksum: "SHA-256 (Valid)", destination: "Google Cloud Dublin (Secondary)", status: "Completed" },
    { id: "BKP-03", timestamp: "2026-07-09 01:00", type: "Incremental Sync", size: "182 MB", checksum: "SHA-256 (Valid)", destination: "Google Cloud Dublin (Secondary)", status: "Completed" }
  ]);
  const [drRecoveryPlan, setDrRecoveryPlan] = useState({
    slaTime: "< 15 Minutes Recovery Objective",
    lastVerification: "Checked Today 03:15 AM (100% Data Integrity Validated)",
    activeReplicas: "3 Live Nodes (Addis Ababa, Dublin, Frankfurt)",
    cloudSyncState: "Continuous Real-Time Sync enabled via Firestore local caching"
  });

  // Req 26: Enterprise HO Administration
  const [approvalWorkflows, setApprovalWorkflows] = useState([
    { id: "WFK-01", name: "Employee Registration", path: "HR Specialist ➔ Site Manager ➔ HR Director", status: "Enforced", levels: 3, autoNotify: true, category: "HR" },
    { id: "WFK-02", name: "Attendance Exceptions", path: "Timekeeper ➔ Site Supervisor ➔ Project Manager", status: "Enforced", levels: 3, autoNotify: true, category: "Attendance" },
    { id: "WFK-03", name: "Leave Requests", path: "Team Leader ➔ Section Head ➔ HR Specialist", status: "Enforced", levels: 3, autoNotify: true, category: "HR" },
    { id: "WFK-04", name: "Survey Approval", path: "Survey Engineer ➔ Chief Surveyor ➔ Consultant", status: "Enforced", levels: 3, autoNotify: true, category: "Engineering" },
    { id: "WFK-05", name: "CAD Drawing Approval", path: "CAD Designer ➔ Planning Engineer ➔ Chief Engineer", status: "Enforced", levels: 3, autoNotify: true, category: "Engineering" },
    { id: "WFK-06", name: "Daily Work Plan", path: "Team Leader ➔ Gang Chief ➔ Area Supervisor", status: "Enforced", levels: 3, autoNotify: true, category: "Operations" },
    { id: "WFK-07", name: "Daily Activity Report", path: "Gang Chief ➔ Area Supervisor ➔ Project Manager", status: "Enforced", levels: 3, autoNotify: true, category: "Operations" },
    { id: "WFK-08", name: "Material Request", path: "Site Supervisor ➔ Warehouse Manager ➔ Project Manager", status: "Enforced", levels: 3, autoNotify: true, category: "Logistics" },
    { id: "WFK-09", name: "Material Transfer", path: "Warehouse 1 Custodian ➔ Warehouse 2 Custodian ➔ Logistics Head", status: "Enforced", levels: 3, autoNotify: true, category: "Logistics" },
    { id: "WFK-10", name: "Equipment Request", path: "Site Supervisor ➔ Machinery Dispatcher ➔ Project Manager", status: "Enforced", levels: 3, autoNotify: true, category: "Logistics" },
    { id: "WFK-11", name: "Purchase Request", path: "Project Manager ➔ Finance Controller ➔ GM", status: "Enforced", levels: 3, autoNotify: true, category: "Finance" },
    { id: "WFK-12", name: "Purchase Order", path: "Procurement Officer ➔ Finance Director ➔ Managing Director", status: "Enforced", levels: 3, autoNotify: true, category: "Finance" },
    { id: "WFK-13", name: "Concrete Pour Approval", path: "Site Engineer ➔ QC Engineer ➔ Resident Consultant", status: "Enforced", levels: 3, autoNotify: true, category: "Operations" },
    { id: "WFK-14", name: "Formwork Installation Approval", path: "Erection Supervisor ➔ QC Engineer ➔ Resident Consultant", status: "Enforced", levels: 3, autoNotify: true, category: "Operations" },
    { id: "WFK-15", name: "Formwork Removal Approval", path: "QC Engineer ➔ Safety Marshall ➔ Consultant Inspector", status: "Enforced", levels: 3, autoNotify: true, category: "Operations" },
    { id: "WFK-16", name: "Payroll Approval", path: "Finance Specialist ➔ Project Manager ➔ Finance Director ➔ CEO", status: "Enforced", levels: 4, autoNotify: true, category: "Finance" },
    { id: "WFK-17", name: "Safety Incident Approval", path: "Safety Marshal ➔ Safety Officer ➔ Project Manager", status: "Enforced", levels: 3, autoNotify: true, category: "Safety" },
    { id: "WFK-18", name: "Quality Inspection Approval", path: "QC Inspector ➔ QC Engineer ➔ Lead Consultant", status: "Enforced", levels: 3, autoNotify: true, category: "Quality" }
  ]);
  const [systemSettings, setSystemSettings] = useState({
    sessionTimeout: "10 Minutes Idle",
    rbacEnforcement: "Strict Level 4 Token Validation",
    mfaAuthentication: "Required for Head Office Admin Roles",
    automaticDailyCloudBackup: "Enabled (Scheduled at 03:00 AM daily)"
  });

  // --- PHASE 3 STATE EXPANSION ---
  const [selectedCompany, setSelectedCompany] = useState<string>("Digital Construction ERP PLC");
  
  // Simulated Workflow Engine Requests (for the 18 configurable processes)
  const [simulatedWorkflowRequests, setSimulatedWorkflowRequests] = useState([
    { id: "REQ-101", workflowId: "WFK-13", workflowName: "Concrete Pour Approval", initiator: "Eng. Yoseph", project: "Bole Heights Phase I", details: "Floor 4 Zone A Column Pour - 45 m³ C30 mix", levels: ["Supervisor Approved", "QC Approved", "Pending Consultant Sign-off"], currentLevel: 2, maxLevel: 3, status: "Pending" },
    { id: "REQ-102", workflowId: "WFK-08", workflowName: "Material Request", initiator: "Supervisor Mulugeta", project: "Yeka Hills Premium Gated Estate", details: "Require 150 standard wall panels, 80 props", levels: ["Pending Warehouse Check", "Upcoming PM Sign-off"], currentLevel: 0, maxLevel: 3, status: "Pending" },
    { id: "REQ-103", workflowId: "WFK-11", workflowName: "Purchase Request", initiator: "PM Chala", project: "Lemi National Cement Plant Expansion", details: "Procurement of 500 liters formwork release agent", levels: ["Approved by PM", "Approved by Finance", "Approved by GM"], currentLevel: 3, maxLevel: 3, status: "Approved" }
  ]);

  // Smart Scheduling States
  const [schedulingData, setSchedulingData] = useState({
    dailySchedule: [
      { id: "SCH-D1", task: "Erect wall panels Block B1 Floor 4 Zone A", time: "08:00 AM - 12:00 PM", resources: "Assembly Team Alpha, 140 Panels, 120 Wedges", status: "On Track" },
      { id: "SCH-D2", task: "Concrete Cube Strength Compression Test", time: "01:30 PM - 03:00 PM", resources: "QC Engineer Yoseph, Test Press Unit", status: "On Track" }
    ],
    weeklySchedule: [
      { id: "SCH-W1", week: "Week 28", task: "Complete Floor 4 Zone B formwork strip & level 5 hoist", progress: 65, status: "Active" },
      { id: "SCH-W2", week: "Week 28", task: "Pour concrete slab Floor 5 Zone A", progress: 0, status: "Scheduled" }
    ],
    monthlySchedule: [
      { id: "SCH-M1", month: "July 2026", objective: "Complete structural concrete up to Floor 6 across all blocks", status: "On Track" },
      { id: "SCH-M2", month: "August 2026", objective: "Initiate masonry partitions and external glazing prep", status: "Scheduled" }
    ],
    laborAllocation: [
      { role: "Formwork Assemblers", allocated: 28, required: 25, status: "Surplus" },
      { role: "QC Inspectors", allocated: 4, required: 4, status: "Optimal" },
      { role: "Concrete Technicians", allocated: 12, required: 15, status: "Under-allocated" }
    ],
    equipmentAllocation: [
      { name: "Tower Crane #1", assigned: "Bole Heights Block B1", utilization: "88%", status: "Active" },
      { name: "Concrete Pump Truck", assigned: "Bole Heights Block B2", utilization: "45%", status: "Active" },
      { name: "Mobile Boom Pump", assigned: "Yeka Hills", utilization: "95%", status: "Active" }
    ],
    materialAllocation: [
      { item: "Standard Wall Panels", allocated: 450, tracking: "Batch AL-04-A", site: "Bole Heights" },
      { item: "Props & Shoring Beams", allocated: 380, tracking: "Batch AL-04-Prop", site: "Bole Heights" }
    ],
    surveySchedule: [
      { id: "SRV-1", task: "Flatness Survey Floor 4 Zone B Slab", time: "09:00 AM", assigned: "Yohannes B." },
      { id: "SRV-2", task: "Plumb-line check column forms Floor 5 Zone A", time: "02:00 PM", assigned: "Alemayehu K." }
    ],
    inspectionSchedule: [
      { id: "INSP-1", task: "Pre-pour formwork tightness & tie-rod tension", time: "11:00 AM", inspector: "Consultant Eng. Tariku" },
      { id: "INSP-2", task: "Formwork strip evaluation (Floor 4 Column Cube)", time: "03:30 PM", inspector: "Alemayehu K." }
    ],
    concretePourSchedule: [
      { id: "POUR-1", area: "Floor 4 Zone B Columns", quantity: "45 m³", truckEta: "10:30 AM", status: "Scheduled" },
      { id: "POUR-2", area: "Floor 5 Zone A Slab", quantity: "110 m³", truckEta: "02:00 PM tomorrow", status: "Pending Stripping Permit" }
    ],
    lastDelayTrigger: "None",
    reschedulingLog: [] as string[]
  });

  // Smart Material Planning States
  const [materialEstimations, setMaterialEstimations] = useState([
    { item: "Panels (Standard Wall/Col)", required: 1420, warehouseStock: 1550, unit: "Pcs", delta: 130, status: "Surplus", cost: "ETB 24,000", recommendation: "No immediate procurement needed. Surplus available." },
    { item: "Beams (Shoring)", required: 480, warehouseStock: 420, unit: "Pcs", delta: -60, status: "Shortage", cost: "ETB 180,000", recommendation: "Procure 60 beams immediately or transfer from CMC Site." },
    { item: "Soffits & Corners", required: 350, warehouseStock: 380, unit: "Pcs", delta: 30, status: "Surplus", cost: "ETB 15,000", recommendation: "Stock levels sufficient for Floor 4 & 5 cycle." },
    { item: "Tie Rods", required: 1200, warehouseStock: 950, unit: "Pcs", delta: -250, status: "Shortage", cost: "ETB 50,000", recommendation: "Order 250 high-tensile tie rods from local Digital Construction ERP supplier." },
    { item: "Wedges & Pins", required: 3500, warehouseStock: 4200, unit: "Pcs", delta: 700, status: "Surplus", cost: "ETB 7,000", recommendation: "Surplus of wedges. Store extra in secure bins." },
    { item: "Props (Heavy Duty)", required: 950, warehouseStock: 820, unit: "Pcs", delta: -130, status: "Shortage", cost: "ETB 260,000", recommendation: "Urgent shortage of props. Request rental dispatch or transfer from Ayat warehouse." },
    { item: "Soffit Accessories", required: 180, warehouseStock: 200, unit: "Pcs", delta: 20, status: "Surplus", cost: "ETB 12,000", recommendation: "Stock optimal. Monitor wear and tear." }
  ]);

  // AI Construction Progress Verification State
  const [aiVerification, setAiVerification] = useState({
    estimatedProgress: "78.4%",
    lastScanTime: "Today, 11:30 AM",
    cadMatchConfidence: "98.2%",
    discrepancies: [
      { id: "DISC-01", type: "Geometrical Deviation", details: "LIDAR Drone Scan detects Column C-12 plumb offset of +8.5mm against Structural CAD blueprint on Floor 4 Zone A.", severity: "Medium Risk", status: "Flagged for Review", assignedEngineer: "Eng. Yoseph" },
      { id: "DISC-02", type: "Material Inconsistency", details: "Concrete compression strength registered 28 MPa at 7-days vs 30 MPa specified in engineering specifications on Slab S-04B.", severity: "High Risk", status: "Engineering Hold", assignedEngineer: "Alemayehu K." },
      { id: "DISC-03", type: "Sequencing Deficit", details: "Photo inspection confirms formwork removal completed on Column C-11 4 hours ahead of standard cure permit timeline.", severity: "Low Risk", status: "Approved with warning", assignedEngineer: "Consultant Eng. Tariku" }
    ]
  });

  // GIS & Map Dashboard States
  const [gisOverlay, setGisOverlay] = useState({
    showSites: true,
    showAttendance: true,
    showSurvey: true,
    showEquipment: true,
    showMaterial: true,
    showDrones: true,
    showIncidents: true
  });
  const [gisSelectedSite, setGisSelectedSite] = useState<string>("Bole Heights");

  // Notifications State
  const [simulatedNotifications, setSimulatedNotifications] = useState([
    { id: "NOT-01", type: "Late Attendance", title: "Missing Timecard Scan", text: "Team Beta Assembler Chala D. did not log biometrics by 08:15 AM.", channels: ["Push", "SMS"], time: "08:15 AM" },
    { id: "NOT-02", type: "Survey Completed", title: "As-Built Survey Uploaded", text: "Surveyor Yohannes B. completed and verified slab level flatness on Floor 4 Zone B.", channels: ["Email"], time: "09:30 AM" },
    { id: "NOT-03", type: "Material Shortage", title: "Heavy Props Shortage Warning", text: "AI predicts shoring prop deficit of -130 units for Floor 5 Zone A cyclic assembly.", channels: ["Push", "Email"], time: "11:45 AM" },
    { id: "NOT-04", type: "Equipment Breakdown", title: "Tower Crane #2 Down", text: "Motor overload fault reported on Tower Crane #2. Maintenance dispatched.", channels: ["Push", "SMS", "Email"], time: "01:15 PM" },
    { id: "NOT-05", type: "Concrete Approval", title: "Slab Concrete Pour Sign-off", text: "Resident Consultant approved Concrete Pour request for Floor 4 Zone A.", channels: ["Email", "SMS"], time: "02:40 PM" }
  ]);
  const [showNotificationToast, setShowNotificationToast] = useState<string | null>(null);

  // --- PHASE 3: SIMULATED WORKFLOW ENGINE OPERATIONS ---
  const handleInitiateSimRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const wf = approvalWorkflows.find(w => w.id === simTriggerId);
    if (!wf) return;
    
    // Deconstruct stages
    const stages = wf.path.split(" ➔ ");
    const newReq = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      workflowId: wf.id,
      workflowName: wf.name,
      initiator: "Eng. Nuriye Ahmed",
      project: "Bole Heights Block B1",
      details: simTriggerDetails,
      levels: stages,
      currentLevel: 0,
      maxLevel: wf.levels,
      status: "Pending"
    };

    setSimulatedWorkflowRequests(prev => [newReq, ...prev]);
    onLogAction("Initiated Workflow", `Submitted ${wf.name} approval pipeline for details: ${simTriggerDetails}`);
    
    // Smart Notification trigger
    if (wf.autoNotify) {
      const channelText = "Channels: Push Notification, SMS dispatched to " + stages[0];
      const newNotif = {
        id: `NOT-${Date.now().toString().slice(-4)}`,
        type: "Workflow Initiated",
        title: wf.name + " Initiated",
        text: `Approval level 1 requested for: "${simTriggerDetails}". ${channelText}`,
        channels: ["Push", "SMS", "Email"],
        time: "Just Now"
      };
      setSimulatedNotifications(prev => [newNotif, ...prev]);
      setShowNotificationToast(`Pipeline Fire: ${wf.name} Level 1 request sent to ${stages[0]}!`);
      setTimeout(() => setShowNotificationToast(null), 4000);
    }
    setSimTriggerDetails("");
  };

  const handleAdvanceApproval = (reqId: string, approve: boolean) => {
    setSimulatedWorkflowRequests(prev => prev.map(req => {
      if (req.id !== reqId) return req;
      if (!approve) {
        onLogAction("Workflow Disapproved", `${req.workflowName} rejected by current level assignee.`);
        const rejectNotif = {
          id: `NOT-${Date.now().toString().slice(-4)}`,
          type: "Workflow Rejected",
          title: req.workflowName + " Rejected",
          text: `Request ${req.id} was disapproved and returned to initiator by ${req.levels[req.currentLevel] || "Assignee"}.`,
          channels: ["Push", "SMS"],
          time: "Just Now"
        };
        setSimulatedNotifications(nPrev => [rejectNotif, ...nPrev]);
        setShowNotificationToast(`Workflow ${req.id} Disapproved / Returned`);
        setTimeout(() => setShowNotificationToast(null), 4000);
        return { ...req, status: "Rejected" };
      }

      const nextLevel = req.currentLevel + 1;
      const isCompleted = nextLevel >= req.maxLevel;
      onLogAction("Workflow Approved Level", `Approved stage ${nextLevel} of ${req.maxLevel} for ${req.workflowName}`);
      
      const appNotif = {
        id: `NOT-${Date.now().toString().slice(-4)}`,
        type: isCompleted ? "Workflow Approved" : "Workflow Stage Approved",
        title: isCompleted ? req.workflowName + " Completed" : req.workflowName + " Level Approved",
        text: isCompleted 
          ? `High-Integrity approval achieved for: "${req.details}". Signed off by all levels.` 
          : `Stage ${nextLevel} approved for: "${req.details}". Pending next stage signoff by ${req.levels[nextLevel]}.`,
        channels: ["Push", "SMS", "Email"],
        time: "Just Now"
      };
      setSimulatedNotifications(nPrev => [appNotif, ...nPrev]);
      setShowNotificationToast(isCompleted ? `Workflow ${req.id} FULLY APPROVED!` : `Workflow ${req.id} Stage ${nextLevel} Approved`);
      setTimeout(() => setShowNotificationToast(null), 4000);

      return {
        ...req,
        currentLevel: nextLevel,
        status: isCompleted ? "Approved" : "Pending"
      };
    }));
  };

  // --- Helper to handle sub-actions ---
  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatItem.name) return;
    const isReceiving = newMatItem.type === "Receiving";
    const delta = isReceiving ? newMatItem.qty : -newMatItem.qty;

    setMaterials(prev => {
      const idx = prev.findIndex(m => m.name.toLowerCase() === newMatItem.name.toLowerCase());
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].qty = Math.max(0, copy[idx].qty + delta);
        return copy;
      } else {
        return [...prev, {
          id: `MAT-${Date.now().toString().slice(-2)}`,
          name: newMatItem.name,
          code: `ACC-${newMatItem.name.substring(0, 3).toUpperCase()}`,
          qty: Math.max(0, newMatItem.qty),
          minQty: newMatItem.minQty,
          bundleId: `BUN-CUST-${Date.now().toString().slice(-2)}`,
          cleaning: "Clean",
          repair: "Ready"
        }];
      }
    });

    onLogAction(`Warehouse ${newMatItem.type}`, `Adjusted ${newMatItem.name} by ${delta} units. Notes: ${newMatItem.notes || "N/A"}`);
    setNewMatItem({ name: "", qty: 100, minQty: 50, type: "Receiving", notes: "" });
  };

  // --- PHASE 3: AI DISASTER AUTOPILOT RESCHEDULING ---
  const handleAiReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    onLogAction("AI Rescheduling Triggered", `Delay event: ${simDelayType} - Triggered auto-rescheduling autopilot.`);

    // Set schedulingData changes
    setSchedulingData(prev => {
      let desc = "";
      let newDaily = [...prev.dailySchedule];
      let newWeekly = [...prev.weeklySchedule];
      let newLabor = [...prev.laborAllocation];
      let newEquipment = [...prev.equipmentAllocation];
      let newConcrete = [...prev.concretePourSchedule];

      if (simDelayType.includes("Storm") || simDelayType.includes("Rain")) {
        desc = "Severe Storm. High wind speed & heavy rainfall prevent Crane operations and concrete pours. AI delayed pour schedules by 24 hours, rescheduled curing sensor checks, and re-allocated 15 assemblers to indoor pre-assembly yards.";
        newDaily = [
          { id: "SCH-D1", task: "Indoor pre-assembly of Corner Wedges & Brackets", time: "08:00 AM - 12:00 PM", resources: "Assembly Team Alpha, Pre-assembly Yard", status: "Re-allocated" },
          { id: "SCH-D2", task: "Rainwater clearance & sump pump operation Floor 4", time: "01:30 PM - 04:30 PM", resources: "Operations team, 2x Submersible Pumps", status: "On Track" }
        ];
        newConcrete = prev.concretePourSchedule.map(p => p.id === "POUR-1" ? { ...p, status: "Delayed by Weather (24h)" } : p);
        newLabor = prev.laborAllocation.map(l => l.role === "Concrete Technicians" ? { ...l, allocated: 4, status: "Standby" } : l);
      } else if (simDelayType.includes("Crane") || simDelayType.includes("Breakdown")) {
        desc = "Tower Crane #1 Motor Fault. AI automatically re-allocated Mobile Sany 50T Crane to support Floor 4 hoisting. Prioritized light hand-carried panel stripping and ground level logistics to sustain 4-day structural cycle.";
        newDaily = [
          { id: "SCH-D1", task: "Hand-carried stripping of internal soffits Block B1", time: "08:00 AM - 12:00 PM", resources: "Assembly Team Alpha, Hand Tools", status: "Optimized" },
          { id: "SCH-D2", task: "Setup Mobile Crane (Sany 50T) at Block B1 West edge", time: "01:00 PM - 03:00 PM", resources: "Operator Chala B., Rigging Crew", status: "Assigned" }
        ];
        newEquipment = prev.equipmentAllocation.map(eq => eq.name === "Mobile Crane (Sany 50T)" ? { ...eq, assigned: "Bole Heights Block B1 (Hoisting Priority)", utilization: "98%" } : eq);
      } else if (simDelayType.includes("Shortage") || simDelayType.includes("Wedge")) {
        desc = "Aluminum Wedge Shortage. AI flagged deficit. Auto-submitted warehouse transfer of 4,000 wedges from CMC site, and rescheduled Floor 5 Zone A assembly from Thursday morning to Thursday afternoon to allow logistics ETA buffer.";
        newWeekly = prev.weeklySchedule.map(w => w.id === "SCH-W2" ? { ...w, task: "Pour concrete Floor 5 (Delayed 4h for wedge delivery)", status: "Re-scheduled" } : w);
        newDaily = [
          { id: "SCH-D1", task: "Inventory count & sort existing locking wedges", time: "08:00 AM - 10:00 AM", resources: "Storekeeper, Yard crew", status: "On Track" },
          { id: "SCH-D2", task: "Receive and inspect 4,000 wedges from CMC Site", time: "02:00 PM - 03:30 PM", resources: "Logistics Lead, Flatbed Truck", status: "Pending Sync" }
        ];
      } else {
        desc = "Engineering Change Approved. AI auto-calculated alignment. Adjusted panel layouts for column C-12 plumb correction, scheduled alignment survey, and logged structural revision sign-off.";
        newDaily = [
          { id: "SCH-D1", task: "Plumb adjustment column C-12 formwork", time: "08:30 AM - 11:30 AM", resources: "Erection Supervisor + 4 assemblers", status: "Critical Path" },
          { id: "SCH-D2", task: "Verify column alignment via Total Station", time: "01:00 PM - 02:30 PM", resources: "Yohannes B. (Surveyor)", status: "On Track" }
        ];
      }

      const updatedLogs = [desc, ...prev.reschedulingLog];
      
      const newNotif = {
        id: `NOT-${Date.now().toString().slice(-4)}`,
        type: "AI Rescheduled Workflows",
        title: "AI Autopilot Rescheduled Plan",
        text: desc.substring(0, 120) + "...",
        channels: ["Push", "Email"],
        time: "Just Now"
      };
      setSimulatedNotifications(nPrev => [newNotif, ...nPrev]);
      setShowNotificationToast("AI Autopilot: Plan Recalculated!");
      setTimeout(() => setShowNotificationToast(null), 4000);

      return {
        ...prev,
        dailySchedule: newDaily,
        weeklySchedule: newWeekly,
        laborAllocation: newLabor,
        equipmentAllocation: newEquipment,
        concretePourSchedule: newConcrete,
        lastDelayTrigger: simDelayType,
        reschedulingLog: updatedLogs
      };
    });
  };

  const handleAddProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrItem.item) return;
    const newPr = {
      id: `PR-${Date.now().toString().slice(-3)}`,
      item: newPrItem.item,
      qty: newPrItem.qty || "100 Pcs",
      cost: newPrItem.cost || "ETB 50,000",
      supplier: newPrItem.supplier || "Local Prdigital_construction_erper",
      status: "Pending Approval",
      date: new Date().toISOString().split("T")[0],
      approvalBy: "Awaiting Nuriye"
    };
    setProcurements([newPr, ...procurements]);
    onLogAction("Purchase Request Issued", `Item: ${newPrItem.item} from ${newPrItem.supplier}`);
    setNewPrItem({ item: "", qty: "", cost: "", supplier: "" });
  };

  const handleAddHseReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHseReport.topic) return;
    const newHse = {
      id: `HSE-${Date.now().toString().slice(-3)}`,
      type: newHseReport.type,
      topic: newHseReport.topic,
      attendees: newHseReport.type.includes("Meeting") ? 30 : 0,
      supervisor: "Nuriye Ahmed Adem",
      status: "Reported / Open Action",
      date: new Date().toISOString().split("T")[0]
    };
    setHseLogs([newHse, ...hseLogs]);
    onLogAction(`HSE ${newHseReport.type} Logged`, `Details: ${newHseReport.topic}`);
    setNewHseReport({ topic: "", type: "Incident Report", details: "" });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      id: Date.now(),
      sender: "Nuriye Ahmed Adem (Admin)",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChats([...chats, msg]);
    onLogAction("Enterprise Chat Message Sent", `Message content preview: ${chatInput.substring(0, 30)}...`);
    setChatInput("");
  };

  const triggerBroadcastAlert = (isEmergency: boolean) => {
    const text = isEmergency 
      ? "EMERGENCY EVACUATION SIMULATION: Drill initiated by Lead Admin Nuriye Ahmed Adem." 
      : "ANNOUNCEMENT: Head Office audit starting tomorrow at 08:00 AM.";
    const msg = {
      id: Date.now(),
      sender: "🚨 SYSTEM ALERT BROADCAST",
      text: text,
      time: "JUST NOW"
    };
    setChats(prev => [...prev, msg]);
    onLogAction("Site Broadcast Dispatched", text);
    alert(text);
  };

  const handleAddTruck = (e: React.FormEvent) => {
    e.preventDefault();
    const trk = {
      id: `CON-TRK-${Date.now().toString().slice(-2)}`,
      project: "Bole Heights B1",
      volume: newTruck.volume || "8 m³",
      supplier: newTruck.supplier,
      arrival: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      slump: newTruck.slump || "120mm",
      cubeCode: `CUBE-C30-${Date.now().toString().slice(-2)}`,
      status: newTruck.status,
      cureDays: 0
    };
    setConcreteTrucks([trk, ...concreteTrucks]);
    onLogAction("Concrete Truck Logged", `Arrival of truck from ${newTruck.supplier}, volume ${newTruck.volume}`);
    setNewTruck({ volume: "8 m³", supplier: "Mugher ReadyMix", slump: "120mm", status: "Gate In" });
  };

  const handleApprovePr = (id: string) => {
    setProcurements(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: "Approved", approvalBy: "Nuriye Ahmed Adem" };
      }
      return p;
    }));
    onLogAction("Procurement Request Approved", `Approved PR ID ${id} by Lead Admin.`);
  };

  // Filter materials based on search
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => 
      m.name.toLowerCase().includes(matSearch.toLowerCase()) || 
      m.code.toLowerCase().includes(matSearch.toLowerCase())
    );
  }, [materials, matSearch]);

  // Peer Performance helpers & useMemo
  const peerRolesList = useMemo(() => [
    "Section Head",
    "Supervisor",
    "Team Leader",
    "Gang Chief",
    "Time Keeper",
    "Project Manager",
    "Assembler"
  ], []);

  const roleStats = useMemo(() => {
    return peerRolesList.map(role => {
      const receivedReviews = appraisals.filter(a => a.targetRole === role);
      const givenReviews = appraisals.filter(a => a.evaluatorRole === role);
      const totalScore = receivedReviews.reduce((sum, item) => sum + item.averageScore, 0);
      const average = receivedReviews.length > 0 ? parseFloat((totalScore / receivedReviews.length).toFixed(1)) : 0;
      return {
        role,
        average,
        countReceived: receivedReviews.length,
        countGiven: givenReviews.length
      };
    });
  }, [appraisals, peerRolesList]);

  const filteredAppraisals = useMemo(() => {
    return appraisals.filter(a => {
      const matchesSearch = a.evaluatorName.toLowerCase().includes(appraisalSearchText.toLowerCase()) || 
                            a.targetName.toLowerCase().includes(appraisalSearchText.toLowerCase()) ||
                            a.comments.toLowerCase().includes(appraisalSearchText.toLowerCase());
      const matchesRole = appraisalFilterRole === "All" || a.targetRole === appraisalFilterRole || a.evaluatorRole === appraisalFilterRole;
      return matchesSearch && matchesRole;
    });
  }, [appraisals, appraisalSearchText, appraisalFilterRole]);

  // Executive summary stats computations
  const totalWls = materials.reduce((sum, item) => sum + item.qty, 0);
  const lowStockItems = materials.filter(m => m.qty <= m.minQty);
  const activeEqCount = equipment.filter(e => e.status === "Active").length;

  return (
    <div className="space-y-6">
      {/* Top Banner introducing Admin */}
      <div className="bg-gradient-to-r from-red-700 via-slate-900 to-slate-900 p-4 sm:p-5 rounded-2xl border border-red-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-red-600/90 text-[10px] font-bold tracking-widest uppercase">
              {isAmharic ? "ኢንተርፕራይዝ ፖርታል" : "Enterprise ERP Core"}
            </span>
            <span className="flex items-center gap-0.5 text-xs text-red-400 font-bold animate-pulse">
              <Zap size={10} /> Active Local Sync
            </span>
          </div>
          <h2 className="text-lg font-black tracking-tight font-sans">
            {isAmharic ? "Digital Construction ERP አልሙኒየም ፎርምወርክ ኢንተርፕራይዝ ሲስተም" : "Digital Construction ERP Aluminum Formwork Enterprise ERP"}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            {isAmharic 
              ? "የሲስተም አበልጻጊ እና ዋና አድሚን፡ ኑሪዬ አህመድ አደም። የቁጥጥር ስልጣን ሙሉ በሙሉ ክፍት ነው።" 
              : "System Architect & Lead Admin: Nuriye Ahmed Adem. Real-time control and synchronization module enabled."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 font-mono text-[10px] space-y-0.5">
            <p className="text-slate-400 text-[9px]">{isAmharic ? "ዋና አስተዳዳሪ" : "LEAD ADMINISTRATOR"}</p>
            <p className="text-red-400 font-black">Nuriye Ahmed Adem</p>
            <p className="text-slate-300 text-[9px]">0910097862 / 0920843843</p>
          </div>
        </div>
      </div>

      {/* ERP Suite Category Switcher */}
      <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1">
        <button
          onClick={() => {
            setErpCategory("operations");
            setActiveSubTab("executive");
          }}
          className={`flex-1 py-2.5 rounded-lg text-center text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            erpCategory === "operations" 
              ? "bg-slate-800 text-white border-b-2 border-red-500 shadow-md animate-none" 
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Layers size={14} className="text-red-500" />
          <span>{isAmharic ? "ክፍል 1: የግንባታ ስራዎች ቁጥጥር" : "Phase 1: Project Operations"}</span>
        </button>
        <button
          onClick={() => {
            setErpCategory("enterprise");
            setActiveSubTab("siteDiary");
          }}
          className={`flex-1 py-2.5 rounded-lg text-center text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
            erpCategory === "enterprise" 
              ? "bg-slate-800 text-white border-b-2 border-red-500 shadow-md animate-none" 
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Sliders size={14} className="text-red-500" />
          <span>{isAmharic ? "ክፍል 2: የላቀ ኢንተርፕራይዝ ERP ስብስብ" : "Phase 2: Advanced Enterprise"}</span>
        </button>
      </div>

      {/* Enterprise Sub-Navigation Grid (Category Aware) */}
      {erpCategory === "operations" ? (
        <div className="bg-slate-900 p-2 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none border border-slate-800 flex items-center space-x-1">
          <button
            onClick={() => setActiveSubTab("executive")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "executive" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Activity size={14} />
            <span>{isAmharic ? "ዋና ሰሌዳ" : "Executive Dashboard"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("materials")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "materials" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Boxes size={14} />
            <span>{isAmharic ? "ማቴሪያልና መጋዘን" : "Material & Warehouse"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("equipment")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "equipment" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Truck size={14} />
            <span>{isAmharic ? "ማሽነሪና መሳሪያዎች" : "Equipment Hub"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("procurement")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "procurement" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShoppingCart size={14} />
            <span>{isAmharic ? "የግዢ አስተዳደር" : "Procurement"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("safety")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "safety" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShieldCheck size={14} />
            <span>{isAmharic ? "ደህንነት (HSE)" : "Safety (HSE)"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("quality")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "quality" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <CheckSquare size={14} />
            <span>{isAmharic ? "የጥራት ቁጥጥር" : "Quality Control"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("concrete")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "concrete" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Droplet size={14} />
            <span>{isAmharic ? "ኮንክሪት ፍሰት" : "Concrete Management"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("documents")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "documents" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>{isAmharic ? "ሰነዶች ማዕከል" : "Document System"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("communication")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "communication" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MessageSquare size={14} />
            <span>{isAmharic ? "ውይይት ማዕከል" : "Communication"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("feedback")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "feedback" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Star size={14} />
            <span>{isAmharic ? "ግብረመልስና ሲኤክስ" : "Feedback & CX"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("client")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "client" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Eye size={14} />
            <span>{isAmharic ? "ደንበኛ/አማካሪ" : "Client Portal"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("twin")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "twin" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Layers size={14} />
            <span>{isAmharic ? "ዲጂታል መንታ" : "AI Digital Twin"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("intelligence")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "intelligence" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Cpu size={14} />
            <span>{isAmharic ? "አይአይ ኢንተለጀንስ" : "System Intelligence"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("cloud")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "cloud" ? "bg-red-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Cloud size={14} />
            <span>{isAmharic ? "ክላውድ ኢንፍራ" : "Cloud Infrastructure"}</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 p-2 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none border border-slate-800 flex items-center space-x-1">
          <button
            onClick={() => setActiveSubTab("siteDiary")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "siteDiary" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <BookOpen size={14} />
            <span>{isAmharic ? "የሳይት ማስታወሻ" : "Digital Site Diary"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("permits")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "permits" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileCheck size={14} />
            <span>{isAmharic ? "የስራ ፈቃዶች" : "Work Permits"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("assets")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "assets" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <QrCode size={14} />
            <span>{isAmharic ? "የንብረት ክትትል" : "Asset QR/RFID"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("maintenance")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "maintenance" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Wrench size={14} />
            <span>{isAmharic ? "የጥገና ቁጥጥር" : "Maintenance"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("costs")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "costs" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <DollarSign size={14} />
            <span>{isAmharic ? "ወጪ ቁጥጥር" : "Cost Control"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("aiRisks")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "aiRisks" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShieldAlert size={14} />
            <span>{isAmharic ? "አይአይ ስጋት" : "AI Risk Management"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("environmental")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "environmental" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Leaf size={14} />
            <span>{isAmharic ? "አካባቢ ጥበቃ" : "Environmental"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("training")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "training" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <GraduationCap size={14} />
            <span>{isAmharic ? "ስልጠናና ብቃት" : "Training & Competency"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("peerPerformance")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "peerPerformance" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <CheckSquare size={14} />
            <span>{isAmharic ? "የርስበርስ ብቃት መገምገሚያ" : "Peer Appraisal"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("multiProject")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "multiProject" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Briefcase size={14} />
            <span>{isAmharic ? "መልቲ-ፕሮጀክቶች" : "Multi-Project"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("biDashboard")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "biDashboard" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <BarChart3 size={14} />
            <span>{isAmharic ? "የንግድ ኢንተለጀንስ" : "BI Dashboard"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("apiIntegration")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "apiIntegration" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Network size={14} />
            <span>{isAmharic ? "ኤፒአይ ማገናኛ" : "API Integration"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("disasterRecovery")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "disasterRecovery" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <DatabaseBackup size={14} />
            <span>{isAmharic ? "አደጋ መቋቋም" : "DR & Backup"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("adminSettings")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "adminSettings" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Sliders size={14} />
            <span>{isAmharic ? "ኢንተርፕራይዝ አድሚን" : "Administration"}</span>
          </button>
          <button
            onClick={() => setActiveSubTab("flutterApps")}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === "flutterApps" ? "bg-red-600 text-white shadow-md animate-none" : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Smartphone size={14} />
            <span>{isAmharic ? "ሞባይል አፖችና አይአይ" : "Flutter Apps & AI Engine"}</span>
          </button>
        </div>
      )}

      {/* RENDER ACTIVE ERP SUB-MODULE */}

      {/* --- 1. EXECUTIVE DASHBOARD --- */}
      {activeSubTab === "executive" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "አጠቃላይ ፕሮጀክቶች" : "Total Projects"}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">5</h3>
              <p className="text-[10px] text-green-500 font-bold mt-1">● Bole Heights Site Active</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ጠቅላላ ማቴሪያል" : "Material Inventory"}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalWls.toLocaleString()} <span className="text-xs font-normal text-slate-500">Pcs</span></h3>
              <p className="text-[10px] text-red-500 font-semibold mt-1">⚠️ {lowStockItems.length} Low Stock Alert Items</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ማሽነሪዎች ቁጥር" : "Active Equipment"}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{activeEqCount} / {equipment.length}</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">1 Pump under maintenance</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "አጠቃላይ ጥራትና ደህንነት" : "HSE & Quality Index"}</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">98.5%</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">No major incidents today</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "ዕለታዊ የግንባታ ሂደት እና ወጪ ንፅፅር" : "Daily Progress & Cost Allocation (ETB)"}</h4>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">Bole Heights Block B1</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Mon", Progress: 82, Budget: 50, Actual: 48 },
                    { name: "Tue", Progress: 88, Budget: 50, Actual: 52 },
                    { name: "Wed", Progress: 94, Budget: 55, Actual: 54 },
                    { name: "Thu", Progress: 96, Budget: 55, Actual: 53 },
                    { name: "Fri", Progress: 95, Budget: 60, Actual: 59 },
                    { name: "Sat", Progress: 98, Budget: 60, Actual: 58 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Progress" name="Formwork Productivity %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" name="Cost (x10k ETB)" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "ቅጽበታዊ የስራ ማስጠንቀቂያዎች (Real-Time)" : "AI Predictive Alerts & Notifications"}</h4>
              <div className="space-y-2.5">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertTriangle className="text-red-500 shrink-0" size={16} />
                  <div>
                    <h5 className="text-[11px] font-bold text-red-900">{isAmharic ? "የማቴሪያል እጥረት ቅድመ-ማስጠንቀቂያ" : "Material Shortage Predictor"}</h5>
                    <p className="text-[10px] text-red-700 mt-0.5">Formwork Pin Wedges down to 16,900. Reorder needed by Saturday to prevent cycle delay.</p>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertCircle className="text-amber-500 shrink-0" size={16} />
                  <div>
                    <h5 className="text-[11px] font-bold text-amber-900">{isAmharic ? "ማሽነሪዎች ጥገና ማንቂያ" : "Equipment Upkeep Reminder"}</h5>
                    <p className="text-[10px] text-amber-700 mt-0.5">Concrete Pump Truck 02 is in maintenance. Swapping to reserve pump 03 for concrete pour at 14:00.</p>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-2">
                  <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                  <div>
                    <h5 className="text-[11px] font-bold text-emerald-900">{isAmharic ? "የኮንክሪት ሙከራ ስኬት" : "Cube Compressive Strength Check"}</h5>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Cube test CUBE-C30-41A achieved 24.5 MPa (81.6% target) on Day 7. Formwork stripping authorized.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. MATERIAL & WAREHOUSE MANAGEMENT --- */}
      {activeSubTab === "materials" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የአሉሚኒየም ፎርምወርክ ማቴሪያልና መጋዘን ቁጥጥር" : "Aluminum Formwork Material & Warehouse System"}</h3>
              <p className="text-xs text-slate-500">{isAmharic ? "ባርኮድ፣ የቡድን መለያ ቁጥጥር እና ዕለታዊ ገቢ-ወጪ ምዝገባ" : "Manage Panels, Corners, Props, and Accessories with Bundle & QR Status"}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder={isAmharic ? "ማቴሪያል ፈልግ..." : "Search Materials..."}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-48 font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                  value={matSearch}
                  onChange={(e) => setMatSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">{isAmharic ? "ማቴሪያል ስም" : "Item Description"}</th>
                      <th className="p-3">{isAmharic ? "ባርኮድ" : "SKU Code"}</th>
                      <th className="p-3">{isAmharic ? "የቡድን ID" : "Bundle Track"}</th>
                      <th className="p-3 text-right">{isAmharic ? "ያለ ክምችት" : "Current Qty"}</th>
                      <th className="p-3">{isAmharic ? "የጽዳት ሁኔታ" : "Cleaning Status"}</th>
                      <th className="p-3">{isAmharic ? "የጥገና ሁኔታ" : "Repair State"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {filteredMaterials.map((mat) => {
                      const isLow = mat.qty <= mat.minQty;
                      return (
                        <tr key={mat.id} className={`hover:bg-slate-50/50 ${isLow ? "bg-red-50/45" : ""}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span>{mat.name}</span>
                              {isLow && <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Low Stock</span>}
                            </div>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">{mat.code}</td>
                          <td className="p-3 font-mono text-[10px] text-slate-500">{mat.bundleId}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">{mat.qty.toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                              mat.cleaning === "Clean" ? "bg-green-50 text-green-700 border border-green-200/50" : "bg-amber-50 text-amber-700 border border-amber-200/50"
                            }`}>{mat.cleaning}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] text-slate-500">{mat.repair}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* --- PHASE 3: CAD-DRIVEN SMART MATERIAL PLANNING ENGINE --- */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-red-500/20 space-y-4 shadow-md mt-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-red-500 tracking-wider flex items-center gap-1.5 font-sans">
                      <Cpu size={14} className="text-red-500" />
                      <span>{isAmharic ? "በCAD ስእል የተመራ የማቴሪያል እቅድ" : "AI CAD-Driven Material Estimator & Planner"}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isAmharic 
                        ? "የሳይት ስእል (CAD) እና የተረጋገጠውን ስራ በማነጻጸር የሚቀሩ ማቴሪያሎችን በራስ-ሰር ያሰላል።" 
                        : "Compare architectural CAD vectors against active progress coordinates to forecast cyclical formwork demands."}
                    </p>
                  </div>
                  <span className="text-[9px] bg-red-950/80 text-red-400 font-bold px-2 py-0.5 rounded border border-red-800/40 font-mono">
                    {isAmharic ? "ስማርት እቅድ" : "CAD INTELLIGENCE"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-300">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">{isAmharic ? "የታለመ ፎቅ" : "Target Floor CAD Model"}</label>
                    <select
                      value={planFloor}
                      onChange={e => {
                        setPlanFloor(e.target.value);
                        setPlanningSubmitted(false);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="Floor 4">Floor 4 Slab CAD (A-701)</option>
                      <option value="Floor 5">Floor 5 Slab CAD (A-702)</option>
                      <option value="Floor 6">Floor 6 Slab CAD (A-703)</option>
                      <option value="Floor 7">Floor 7 Slab CAD (A-704)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-400">{isAmharic ? "የሳይት ቀጠና" : "Slab Pour Zone"}</label>
                    <select
                      value={planZone}
                      onChange={e => {
                        setPlanZone(e.target.value);
                        setPlanningSubmitted(false);
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="Zone A">Zone A - Main Slab Area</option>
                      <option value="Zone B">Zone B - Elevator Core</option>
                      <option value="Zone C">Zone C - Balconies & Shear-Walls</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPlanIsRunning(true);
                      setTimeout(() => {
                        setPlanIsRunning(false);
                        // Recalculate based on floor/zone
                        let multiplier = 1.0;
                        if (planFloor === "Floor 5") multiplier = 1.15;
                        if (planFloor === "Floor 6") multiplier = 1.30;
                        if (planFloor === "Floor 7") multiplier = 1.45;
                        if (planZone === "Zone B") multiplier *= 0.85;
                        if (planZone === "Zone C") multiplier *= 0.65;

                        setPlanResults({
                          panels: Math.round(320 * multiplier),
                          beams: Math.round(145 * multiplier),
                          soffits: Math.round(98 * multiplier),
                          tieRods: Math.round(210 * multiplier),
                          wedges: Math.round(840 * multiplier),
                          props: Math.round(195 * multiplier),
                          accessories: Math.round(130 * multiplier),
                        });
                        onLogAction("CAD Material Forecast", `Computed architectural formwork demand for ${planFloor} ${planZone} using vector parsing algorithms.`);
                      }, 1000);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {planIsRunning ? (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                        {isAmharic ? "በማስላት ላይ..." : "Analyzing CAD Vectors..."}
                      </span>
                    ) : (
                      <>
                        <Cpu size={14} />
                        <span>{isAmharic ? "የማቴሪያል ፍላጎት አስላ" : "Run AI CAD Estimation"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Estimation Matrix Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 font-sans">
                  <div className="grid grid-cols-4 bg-slate-900 p-2.5 text-[9px] font-black uppercase text-slate-400 border-b border-slate-800 text-center">
                    <div className="text-left">{isAmharic ? "የማቴሪያል አይነት" : "Component Type"}</div>
                    <div>{isAmharic ? "CAD ፍላጎት" : "CAD Required"}</div>
                    <div>{isAmharic ? "የመጋዘን ክምችት" : "Stock Available"}</div>
                    <div>{isAmharic ? "የክፍተት ሁኔታ" : "Status / Gap"}</div>
                  </div>

                  <div className="divide-y divide-slate-800 text-xs">
                    {[
                      { key: "panels", name: "Formwork Aluminum Panels", code: "PNL-1200", stock: 450, color: "text-blue-400" },
                      { key: "beams", name: "Mid-Beams 1200mm", code: "BEM-1200", stock: 180, color: "text-indigo-400" },
                      { key: "soffits", name: "Soffit Lengths 900mm", code: "SOF-0900", stock: 85, color: "text-amber-400" },
                      { key: "tieRods", name: "High-Tensile Tie Rods", code: "TIE-2000", stock: 680, color: "text-teal-400" },
                      { key: "wedges", name: "Formwork Wedges", code: "WDG-0100", stock: 16900, color: "text-rose-400" },
                      { key: "props", name: "Heavy Duty Shoring Props", code: "PRP-3500", stock: 140, color: "text-purple-400" },
                      { key: "accessories", name: "Corner Brackets", code: "ACC-BRK", stock: 120, color: "text-emerald-400" },
                    ].map(comp => {
                      const req = planResults[comp.key] || 0;
                      const stock = comp.stock;
                      const diff = stock - req;
                      const isDeficit = diff < 0;

                      return (
                        <div key={comp.key} className="grid grid-cols-4 p-2.5 items-center text-center font-mono text-[11px] border-b border-slate-800 last:border-b-0">
                          <div className="text-left flex flex-col">
                            <span className="font-bold text-slate-200 leading-tight">{comp.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{comp.code}</span>
                          </div>
                          <div className="text-slate-300 font-bold">{req} pcs</div>
                          <div className="text-slate-400">{stock.toLocaleString()} pcs</div>
                          <div>
                            {isDeficit ? (
                              <span className="text-red-400 font-bold bg-red-950/50 border border-red-900/30 px-1.5 py-0.5 rounded text-[10px]">
                                {diff} pcs (Shortage)
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded text-[10px]">
                                +{diff} pcs (Surplus)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Procurement Recommendations */}
                <div className="bg-slate-800 p-3.5 rounded-xl border border-slate-700/50 space-y-2 text-xs">
                  <h5 className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1">
                    <CheckSquare size={12} />
                    <span>AI Procurement & Dispatch Advice</span>
                  </h5>
                  <div className="space-y-2 font-medium text-slate-300 leading-relaxed text-[11px]">
                    {planResults.soffits > 85 && (
                      <p className="flex items-start gap-1.5">
                        <span className="text-red-400">⚠️</span>
                        <span>
                          <strong>Soffit Deficit</strong>: A shortage of {planResults.soffits - 85} Soffit Lengths detected. Please request a warehouse transfer from Block C or initiate an immediate Purchase Order.
                        </span>
                      </p>
                    )}
                    {planResults.props > 140 && (
                      <p className="flex items-start gap-1.5">
                        <span className="text-red-400">⚠️</span>
                        <span>
                          <strong>Prop Shortage</strong>: Shoring Props are deficient by {planResults.props - 140} units. System recommends dispatching from the central Digital Construction ERP warehouse immediately.
                        </span>
                      </p>
                    )}
                    {planResults.soffits <= 85 && planResults.props <= 140 && (
                      <p className="flex items-start gap-1.5">
                        <span className="text-green-400">✅</span>
                        <span>All formwork components are in optimal stock surplus. Material dispatch and cycle setup can proceed safely.</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => {
                        setPlanningSubmitted(true);
                        alert("AI-generated material requisition submitted to procurement division. Reference PO-REQ-2026-CAD-09");
                        onLogAction("CAD Procurement Request", `Logged a deficit requisition request for ${planFloor} ${planZone} formwork assembly cycle.`);
                      }}
                      className={`w-full font-bold py-1.5 rounded text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        planningSubmitted 
                          ? "bg-emerald-600 text-white" 
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {planningSubmitted ? "✓ Requisitions Dispatched" : "🛒 Auto-Submit Requisitions to Procurement"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Warehouse Dispatch & Receiving Entry Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "የማቴሪያል ገቢ-ወጪ እና የጉዳት ሪፖርት መመዝገቢያ" : "Warehouse Inventory Transaction Form"}</h4>
              <form onSubmit={handleAddMaterial} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የግብይት አይነት" : "Transaction Action"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newMatItem.type}
                    onChange={(e) => setNewMatItem({ ...newMatItem, type: e.target.value })}
                  >
                    <option value="Receiving">Material Receiving (ገቢ)</option>
                    <option value="Issue">Material Issue to Zone (ወጪ)</option>
                    <option value="Transfer">Material Transfer (ዝውውር)</option>
                    <option value="Return">Material Return (መልስ)</option>
                    <option value="Damage">Damage Report (የጉዳት ሪፖርት)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የማቴሪያል አይነት" : "Material Item"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newMatItem.name}
                    onChange={(e) => setNewMatItem({ ...newMatItem, name: e.target.value })}
                  >
                    <option value="">-- select material --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ብዛት" : "Quantity"}</label>
                    <input
                      type="number"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newMatItem.qty}
                      onChange={(e) => setNewMatItem({ ...newMatItem, qty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ዝቅተኛ ወሰን" : "Min Threshold"}</label>
                    <input
                      type="number"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newMatItem.minQty}
                      onChange={(e) => setNewMatItem({ ...newMatItem, minQty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ማስታወሻ" : "Remarks / Reference / Zone ID"}</label>
                  <input
                    type="text"
                    placeholder="e.g. Returned from Floor 4 Zone A"
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newMatItem.notes}
                    onChange={(e) => setNewMatItem({ ...newMatItem, notes: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>{isAmharic ? "ግብይቱን መዝግብ" : "Log Transaction"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- 3. EQUIPMENT TRACKING --- */}
      {activeSubTab === "equipment" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የማሽነሪዎች እና ከባድ መሣሪያዎች አጠቃላይ ቁጥጥር" : "Heavy Machinery & Equipment Fleet Portal"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "ዕለታዊ አጠቃቀም፣ የነዳጅ ፍጆታ እና መደበኛ የጥገና የጊዜ ሰሌዳ መከታተያ" : "Track Operator assignment, daily hours, fuel utilization, and diagnostics logs"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {equipment.map((eq) => (
                  <div key={eq.id} className="border border-slate-200 p-4 rounded-xl space-y-3 relative hover:shadow-xs transition-shadow">
                    <span className={`absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 rounded-full ${
                      eq.status === "Active" ? "bg-green-50 text-green-700 border border-green-200/50" : 
                      eq.status === "Maintenance" ? "bg-red-50 text-red-700 border border-red-200/50 animate-pulse" : 
                      "bg-slate-50 text-slate-500 border border-slate-200"
                    }`}>{eq.status}</span>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{eq.id}</p>
                      <h4 className="text-xs font-black text-slate-800">{eq.name}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-[10px] border-t border-b border-slate-100 py-2">
                      <div>
                        <span className="block text-slate-400 font-bold">{isAmharic ? "ነዳጅ:" : "Fuel:"}</span>
                        <span className="text-slate-800 font-black">{eq.fuel}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold">{isAmharic ? "አጠቃቀም:" : "Usage:"}</span>
                        <span className="text-slate-800 font-black">{eq.usage}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-bold">{isAmharic ? "አንቀሳቃሽ:" : "Operator:"}</span>
                        <span className="text-slate-800 font-black truncate">{eq.operator}</span>
                      </div>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      <p className="text-slate-500">
                        <span className="font-bold text-slate-400">{isAmharic ? "ቀጣይ ጥገና:" : "Next Maintenance:"}</span> {eq.maintenance}
                      </p>
                      <p className="text-slate-500">
                        <span className="font-bold text-slate-400">{isAmharic ? "ብልሽት ታሪክ:" : "Breakdown History:"}</span> <span className="text-red-600 font-medium">{eq.breakdown}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "የዕለት አጠቃቀምና ነዳጅ ፍጆታ መመዝገቢያ" : "Log Daily Usage & Diagnostics"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                setEquipment(prev => prev.map(eq => {
                  if (eq.id === newEqLog.eqId) {
                    return {
                      ...eq,
                      fuel: eq.fuel.includes("N/A") ? eq.fuel : `${newEqLog.fuelUsed}L`,
                      usage: `${newEqLog.usageHrs} Hrs`,
                      breakdown: newEqLog.reportText ? newEqLog.reportText : eq.breakdown
                    };
                  }
                  return eq;
                }));
                onLogAction("Machinery Log Submited", `Log entered for machinery ${newEqLog.eqId}: Fuel: ${newEqLog.fuelUsed}L, Usage: ${newEqLog.usageHrs} Hrs`);
                setNewEqLog({ eqId: "EQ-01", fuelUsed: 45, usageHrs: 8, reportText: "" });
              }} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ማሽነሪ ይምረጡ" : "Select Equipment"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newEqLog.eqId}
                    onChange={(e) => setNewEqLog({ ...newEqLog, eqId: e.target.value })}
                  >
                    {equipment.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የተቃጠለ ነዳጅ (L)" : "Fuel Used (Liters)"}</label>
                    <input
                      type="number"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newEqLog.fuelUsed}
                      onChange={(e) => setNewEqLog({ ...newEqLog, fuelUsed: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የስራ ሰዓት" : "Usage (Hours)"}</label>
                    <input
                      type="number"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newEqLog.usageHrs}
                      onChange={(e) => setNewEqLog({ ...newEqLog, usageHrs: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የብልሽት ሪፖርት / ሌላ" : "Breakdown / Inspection Findings"}</label>
                  <textarea
                    rows={2}
                    placeholder="Describe any warning lights or mechanical play observed..."
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newEqLog.reportText}
                    onChange={(e) => setNewEqLog({ ...newEqLog, reportText: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>{isAmharic ? "የማሽነሪ ሁኔታ መዝግብ" : "Log Machine Diagnostics"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- 4. PROCUREMENT MANAGEMENT --- */}
      {activeSubTab === "procurement" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የግዢ ፍላጎት፣ ትዕዛዝና አቅራቢዎች ማዕከል" : "Procurement, Purchase Orders & Supplier Portal"}</h3>
              <p className="text-xs text-slate-500">{isAmharic ? "የግዢ መጠየቂያዎችን ይከታተሉ፣ ያጽድቁ እና የክፍያ ሁኔታዎችን ይቆጣጠሩ" : "Track workflow status of material requests, pricing approvals, and invoices"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">{isAmharic ? "የመጠየቂያ ቁጥር" : "Request ID"}</th>
                      <th className="p-3">{isAmharic ? "የእቃው ዝርዝር" : "Item Requested"}</th>
                      <th className="p-3">{isAmharic ? "ብዛት" : "Quantity"}</th>
                      <th className="p-3">{isAmharic ? "ወጪ (ETB)" : "Cost (Estimated)"}</th>
                      <th className="p-3">{isAmharic ? "አቅራቢ" : "Supplier"}</th>
                      <th className="p-3">{isAmharic ? "ሁኔታ" : "Workflow Status"}</th>
                      <th className="p-3">{isAmharic ? "ተቆጣጣሪ" : "Authority"}</th>
                      <th className="p-3 text-center">{isAmharic ? "እርምጃ" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {procurements.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-[10px] text-slate-400">{pr.id}</td>
                        <td className="p-3 text-slate-900">{pr.item}</td>
                        <td className="p-3 font-mono text-slate-500">{pr.qty}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{pr.cost}</td>
                        <td className="p-3 text-slate-500">{pr.supplier}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            pr.status.includes("Completed") || pr.status.includes("Received") ? "bg-green-50 text-green-700 border border-green-200/50" : 
                            pr.status.includes("Approved") ? "bg-blue-50 text-blue-700 border border-blue-200/50" : 
                            "bg-amber-50 text-amber-700 border border-amber-200/50 animate-pulse"
                          }`}>{pr.status}</span>
                        </td>
                        <td className="p-3 text-slate-400 text-[10px]">{pr.approvalBy}</td>
                        <td className="p-3 text-center">
                          {pr.status === "Pending Approval" ? (
                            <button
                              onClick={() => handleApprovePr(pr.id)}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold text-[9px] px-2 py-1 rounded-md cursor-pointer transition-all uppercase"
                            >
                              {isAmharic ? "አጽድቅ" : "Approve PR"}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">Locked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ የግዢ መጠየቂያ መመዝገቢያ" : "Issue New Purchase Request"}</h4>
              <form onSubmit={handleAddProcurement} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የእቃው ዝርዝር" : "Item Details"}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M12 High tensile alignment pins"
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newPrItem.item}
                    onChange={(e) => setNewPrItem({ ...newPrItem, item: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ብዛት" : "Quantity"}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5,000 Pcs"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newPrItem.qty}
                      onChange={(e) => setNewPrItem({ ...newPrItem, qty: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ግምታዊ ዋጋ" : "Estimated Cost"}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ETB 45,000"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newPrItem.cost}
                      onChange={(e) => setNewPrItem({ ...newPrItem, cost: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "አቅራቢ ድርጅት" : "Preferred Supplier"}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ethio Fasteners Ltd"
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newPrItem.supplier}
                    onChange={(e) => setNewPrItem({ ...newPrItem, supplier: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>{isAmharic ? "የግዢ ጥያቄውን ላክ" : "Submit Procurement Order"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- 5. SAFETY (HSE) MODULE --- */}
      {activeSubTab === "safety" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "ደህንነትና ጤና (HSE) መከታተያ ማዕከል" : "HSE Safety & Toolbox Command Hub"}</h3>
              <p className="text-xs text-slate-500">{isAmharic ? "ዕለታዊ የደህንነት ስብሰባዎች (Toolbox), PPE ቁጥጥርና የድንገተኛ አደጋ ሪፖርቶች" : "Track mandatory inspections, safety checklists, hazard reports, and trigger alerts"}</p>
            </div>
            <button
              onClick={() => triggerBroadcastAlert(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-transform duration-100 hover:scale-[1.01]"
            >
              <AlertTriangle size={14} className="animate-bounce" />
              <span>{isAmharic ? "የአደጋ ጊዜ ስርጭት (Emergency Broadcast)" : "Dispatch Emergency Alert"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">{isAmharic ? "የደህንነት ዝግጅት አይነት" : "Inspection/Report Type"}</th>
                      <th className="p-3">{isAmharic ? "ርዕሰ ጉዳይ / ዝርዝር" : "Topic & Details"}</th>
                      <th className="p-3 text-center">{isAmharic ? "የተገኙ ሰራተኞች" : "Staff Count"}</th>
                      <th className="p-3">{isAmharic ? "ኃላፊ ሱፐርቫይዘር" : "Safety Marshal"}</th>
                      <th className="p-3">{isAmharic ? "ቀን" : "Log Date"}</th>
                      <th className="p-3">{isAmharic ? "ሁኔታ" : "Mitigation State"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {hseLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-red-700 font-bold">{log.type}</td>
                        <td className="p-3 text-slate-950 font-sans">{log.topic}</td>
                        <td className="p-3 text-center font-mono text-slate-800">{log.attendees > 0 ? log.attendees : "N/A"}</td>
                        <td className="p-3 text-slate-500">{log.supervisor}</td>
                        <td className="p-3 font-mono text-slate-400">{log.date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            log.status.includes("Mitigated") || log.status.includes("Completed") || log.status.includes("Complied")
                              ? "bg-green-50 text-green-700 border border-green-200/50" 
                              : "bg-amber-50 text-amber-700 border border-amber-200/50"
                          }`}>{log.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ የአደጋ ወይም የደህንነት ሪፖርት" : "File HSE Incident or Near Miss"}</h4>
              <form onSubmit={handleAddHseReport} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የደህንነት ምድብ" : "Safety Classification"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newHseReport.type}
                    onChange={(e) => setNewHseReport({ ...newHseReport, type: e.target.value })}
                  >
                    <option value="Incident Report">Incident Report (የአደጋ ሪፖርት)</option>
                    <option value="Near Miss Report">Near Miss Report (ለትንሽ የተረፈ አደጋ)</option>
                    <option value="Hazard Identification">Hazard ID (የአደጋ ምንጭ መጠቆሚያ)</option>
                    <option value="Toolbox Meeting Log">Toolbox Meeting Log (ዕለታዊ የደህንነት ስብሰባ)</option>
                    <option value="PPE Compliance Checklist">PPE Compliance Audit (የPPE ፍተሻ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "አርዕስት / ዋናው ነጥብ" : "HSE Topic / Description"}</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Prdigital_construction_erpe precise location, time, and severity of hazard..."
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newHseReport.topic}
                    onChange={(e) => setNewHseReport({ ...newHseReport, topic: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>{isAmharic ? "የደህንነት ሪፖርቱን መዝግብ" : "Submit HSE Entry"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- 6. QUALITY CONTROL MODULE --- */}
      {activeSubTab === "quality" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የጥራት ቁጥጥር፣ ፍተሻ እና NCR ማስተካከያ ፓነል" : "Quality Assurance & NCR (Non-Conformance) Console"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የአሉሚኒየም ፎርምወርክ ቁመት መለኪያ፣ የብረት ማጠናከርና የኮንክሪት ጥራት ፍተሻዎች" : "Manage Quality Snags, Corrective & Preventive Action workflows (CAPA)"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">{isAmharic ? "የፍተሻ አይነት" : "Quality Inspection Type"}</th>
                      <th className="p-3">{isAmharic ? "ብሎክና ዞን" : "Block/Zone Location"}</th>
                      <th className="p-3">{isAmharic ? "የቼክሊስት ዝርዝር" : "Audit Checklist Scope"}</th>
                      <th className="p-3">{isAmharic ? "የተቆጣጠረው መሀንዲስ" : "Lead QC Engineer"}</th>
                      <th className="p-3">{isAmharic ? "ሁኔታ" : "Verification State"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {qualityControls.map((qc) => (
                      <tr key={qc.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-900">{qc.type}</td>
                        <td className="p-3 font-mono text-slate-500">{qc.zone}</td>
                        <td className="p-3 text-slate-500 text-[11px] font-sans">{qc.checklist}</td>
                        <td className="p-3 text-slate-400 text-[10px]">{qc.approvedBy}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            qc.status.includes("Passed") || qc.status.includes("Signed")
                              ? "bg-green-50 text-green-700 border border-green-200/50" 
                              : qc.status.includes("NCR")
                              ? "bg-red-50 text-red-700 border border-red-200/50"
                              : "bg-amber-50 text-amber-700 border border-amber-200/50"
                          }`}>{qc.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ የጥራት ፍተሻ መጠየቂያ መመዝገቢያ" : "Log QC Inspection Action"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newQc.checklist) return;
                const entry = {
                  id: `QC-${Date.now().toString().slice(-3)}`,
                  type: newQc.type,
                  zone: newQc.zone,
                  checklist: newQc.checklist,
                  approvedBy: "Nuriye Ahmed Adem",
                  status: newQc.status,
                  date: new Date().toISOString().split("T")[0]
                };
                setQualityControls([entry, ...qualityControls]);
                onLogAction("QC Inspection Registered", `Scope: ${newQc.type} at ${newQc.zone}`);
                setNewQc({ type: "Aluminum Formwork Inspection", zone: "B1-Floor 4-Zone C", status: "Pending Check", checklist: "" });
              }} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የፍተሻ መስክ" : "Inspection Target"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newQc.type}
                    onChange={(e) => setNewQc({ ...newQc, type: e.target.value })}
                  >
                    <option value="Aluminum Formwork Inspection">Aluminum Formwork Inspection</option>
                    <option value="Concrete Pre-pour Inspection">Concrete Pre-pour Inspection</option>
                    <option value="Reinforcement Steel Inspection">Reinforcement Steel Inspection</option>
                    <option value="Finishing & Wall Alignment Check">Finishing & Wall Alignment Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ፕሮጀክት ዞን" : "Location Zone"}</label>
                  <input
                    type="text"
                    required
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                    value={newQc.zone}
                    onChange={(e) => setNewQc({ ...newQc, zone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የጥራት ሁኔታ" : "Status Target"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newQc.status}
                    onChange={(e) => setNewQc({ ...newQc, status: e.target.value })}
                  >
                    <option value="Passed Inspection">Passed Inspection (አልፏል)</option>
                    <option value="Pending Check">Pending Verification (በሂደት ላይ)</option>
                    <option value="NCR Issued">NCR Issued (የጥራት ጉድለት ሪፖርት ተከፍቷል)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የቼክሊስት መመዘኛዎች" : "Aesthetic & Structural Findings"}</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Pins locked, zero concrete debris, release agent applied..."
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newQc.checklist}
                    onChange={(e) => setNewQc({ ...newQc, checklist: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>{isAmharic ? "የጥራት መዝገቡን አስገባ" : "Record Inspection Entry"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- 7. CONCRETE FLOW & MANAGEMENT --- */}
      {activeSubTab === "concrete" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የኮንክሪት ሙሌት፣ የስランプ ሙከራና የኪዩብ ጥንካሬ ቁጥጥር" : "Concrete Delivery, Pour Schedule & Lab Quality System"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የመኪናዎች መድረሻ፣ የስランプ ሙከራ መለኪያዎች እና የኪዩብ ጥንካሬ (MPa) ማረጋገጫዎች" : "Track incoming concrete mixers, verify slump tests, log compressive cube crush records"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">{isAmharic ? "መኪና / የሙከራ ኮድ" : "Truck / Cube Code"}</th>
                      <th className="p-3">{isAmharic ? "አቅራቢ" : "Supplier"}</th>
                      <th className="p-3 text-right">{isAmharic ? "የኮንክሪት መጠን" : "Pour Volume"}</th>
                      <th className="p-3">{isAmharic ? "የደረሰበት ሰዓት" : "Gate Arrival"}</th>
                      <th className="p-3 text-center">{isAmharic ? "የስላምፕ ልኬት" : "Slump (mm)"}</th>
                      <th className="p-3">{isAmharic ? "ጥንካሬ ቀን" : "Curing Tracker"}</th>
                      <th className="p-3">{isAmharic ? "የፍቃድ ሁኔታ" : "Approval State"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {concreteTrucks.map((trk) => (
                      <tr key={trk.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900">{trk.id}</span>
                            <p className="font-mono text-[9px] text-slate-400">{trk.cubeCode}</p>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500">{trk.supplier}</td>
                        <td className="p-3 text-right font-mono text-slate-800">{trk.volume}</td>
                        <td className="p-3 font-mono text-slate-400">{trk.arrival}</td>
                        <td className="p-3 text-center font-mono text-slate-900 font-bold">{trk.slump}</td>
                        <td className="p-3 font-mono text-slate-400 text-[10px]">
                          {trk.cureDays > 0 ? (
                            <span className="text-green-600 font-bold">Cured {trk.cureDays} Days (72h Stripping Approved)</span>
                          ) : (
                            <span className="text-amber-500 font-black animate-pulse">Under Water Curing...</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            trk.status.includes("Approved") ? "bg-green-50 text-green-700 border border-green-200/50" : 
                            trk.status.includes("Approaching") ? "bg-slate-50 text-slate-500 border border-slate-200" :
                            "bg-amber-50 text-amber-700 border border-amber-200/50"
                          }`}>{trk.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ የደረሰ የኮንክሪት መኪና መመዝገቢያ" : "Register Concrete Mixer Truck"}</h4>
              <form onSubmit={handleAddTruck} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የኮንክሪት መጠን" : "Volume (m³)"}</label>
                    <select
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                      value={newTruck.volume}
                      onChange={(e) => setNewTruck({ ...newTruck, volume: e.target.value })}
                    >
                      <option value="8 m³">8 m³</option>
                      <option value="10 m³">10 m³</option>
                      <option value="12 m³">12 m³</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የስላምፕ ልኬት" : "Slump tested (mm)"}</label>
                    <input
                      type="text"
                      className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none font-mono"
                      value={newTruck.slump}
                      onChange={(e) => setNewTruck({ ...newTruck, slump: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "አቅራቢ ድርጅት" : "ReadyMix Supplier"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newTruck.supplier}
                    onChange={(e) => setNewTruck({ ...newTruck, supplier: e.target.value })}
                  >
                    <option value="Mugher ReadyMix">Mugher ReadyMix</option>
                    <option value="National Cement">National Cement PLC</option>
                    <option value="Dangote Cement ReadyMix">Dangote Concrete</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ሁኔታ" : "Entry Status"}</label>
                  <select
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newTruck.status}
                    onChange={(e) => setNewTruck({ ...newTruck, status: e.target.value })}
                  >
                    <option value="Gate In">Gate In / Gate Control</option>
                    <option value="Slump Tested">Slump Tested / Lab Checked</option>
                    <option value="Poured & Approved">Concreting Complete</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>{isAmharic ? "መኪናውን መዝግብ" : "Log Mixer Arrival"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- 8. DOCUMENT SYSTEM --- */}
      {activeSubTab === "documents" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የኢንተርፕራይዝ የሰነዶች፣ Shop Drawings እና RFI አስተዳደር" : "Enterprise Shop Drawing & CAD Document Vault"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የሪቪዥን ስሪት ቁጥጥር፣ የRFI ጥያቄዎች ምዝገባ እና ራስ-ሰር የክላውድ መጠባበቂያ ኦዲት" : "Ensure 100% compliant revision matching, technical submittals, and cloud backups logs"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-3">{isAmharic ? "የሰነድ ስም" : "Blueprint / PDF Document Name"}</th>
                      <th className="p-3">{isAmharic ? "ምድብ" : "Document Category"}</th>
                      <th className="p-3">{isAmharic ? "ስሪት" : "Version"}</th>
                      <th className="p-3">{isAmharic ? "ማመሳሰያ ቀን" : "Sync Timestamp"}</th>
                      <th className="p-3">{isAmharic ? "ማረጋገጫ ፊርማ" : "Approving Signature"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50">
                        <td className="p-3 flex items-center gap-2">
                          <FileText className="text-red-500" size={14} />
                          <span className="font-bold text-slate-900">{doc.name}</span>
                        </td>
                        <td className="p-3 text-slate-500">{doc.type}</td>
                        <td className="p-3 font-mono text-red-600 font-black">{doc.ver}</td>
                        <td className="p-3 font-mono text-slate-400">{doc.syncDate}</td>
                        <td className="p-3 text-slate-500 text-[11px] font-sans italic">{doc.approval}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ሰነድ ወይም RFI መጠየቂያ" : "Upload New Revision or RFI"}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የሰነድ አይነት" : "Technical Classification"}</label>
                  <select className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none">
                    <option value="CAD Drawing">CAD Drawing (.DWG / BIM)</option>
                    <option value="Shop Drawing">Shop Drawing (.PDF)</option>
                    <option value="Method Statement">Method Statement (.PDF)</option>
                    <option value="Technical Submittal">Technical Submittal (.PDF)</option>
                    <option value="RFI Log">RFI (Request for Information)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የፋይል ስም" : "File Name"}</label>
                  <input
                    type="text"
                    placeholder="FormworkLayout_Floor4_B2_Rev3.pdf"
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newDocName) return;
                    setDocuments([...documents, {
                      id: `DOC-${Date.now().toString().slice(-3)}`,
                      name: newDocName,
                      type: "Technical Submittal",
                      ver: "v1.0",
                      syncDate: new Date().toISOString().split("T")[0],
                      approval: "Lead Admin Signed"
                    }]);
                    onLogAction("Document Uploaded", `File: ${newDocName} with cloud replication.`);
                    setNewDocName("");
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Cloud size={13} />
                  <span>{isAmharic ? "ሰነድ ወደ ክላውድ ስቀል" : "Sync Document to Storage"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 9. COMMUNICATION CENTER --- */}
      {activeSubTab === "communication" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የቡድን ውይይት፣ የድምፅ መልዕክቶች እና የአደጋ ማንቂያዎች" : "Real-Time Intercom & Emergency Broadcast System"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "በሳይትና በዋና መስሪያ ቤት መሀከል የሚደረጉ ፈጣን ግንኙነቶችንና የድምጽ መልዕክቶች መለዋወጫ" : "Simulate walkie-talkie push, text chat logs, and dispatch notifications"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col h-[320px]">
                <div className="bg-slate-950 p-3 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Radio Channel #1 (Bole Heights)</span>
                  </div>
                </div>

                <div className="p-4 flex-grow overflow-y-auto space-y-3 font-semibold text-xs">
                  {chats.map((chat) => {
                    const isAdmin = chat.sender.includes("Nuriye");
                    const isSystemAlert = chat.sender.includes("ALERT");
                    return (
                      <div key={chat.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[75%] p-3 rounded-2xl ${
                          isSystemAlert ? "bg-red-900/90 text-white border border-red-500 animate-pulse w-full max-w-full text-center" :
                          isAdmin ? "bg-red-600 text-white" : "bg-white text-slate-800 border border-slate-200"
                        }`}>
                          {!isSystemAlert && <p className="text-[9px] text-red-100 font-bold block mb-1">{chat.sender}</p>}
                          <p className="font-sans leading-tight">{chat.text}</p>
                          <span className="text-[8px] text-red-200 block text-right mt-1 font-mono">{chat.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendChat} className="p-2 bg-white border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={isAmharic ? "መልዕክት ፃፍ..." : "Type site message here..."}
                    className="flex-grow border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Send size={12} />
                  </button>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "የሳይት ድምፅ ማስታወሻዎች" : "Walkie-Talkie Voice Snippets"}</h4>
                <div className="space-y-2">
                  {voiceMessages.map(v => (
                    <div key={v.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between font-semibold">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-800 flex items-center gap-1">
                          <Volume2 size={11} className="text-red-500" />
                          <span>{v.sender}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">{v.time} | {v.duration}</p>
                      </div>
                      <button
                        onClick={() => {
                          alert(`Simulating voice playback: "${v.url}"`);
                          onLogAction("Radio Message played", `Played recording from ${v.sender}`);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2 py-1 rounded-md cursor-pointer transition-all uppercase"
                      >
                        Play
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 space-y-2.5">
                <h4 className="text-xs font-black uppercase text-red-800">{isAmharic ? "ፈጣን ማስታወቂያ ስርጭቶች" : "Broadcast Announcements"}</h4>
                <button
                  onClick={() => triggerBroadcastAlert(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send size={12} />
                  <span>{isAmharic ? "የኦዲት ማስታወቂያ ላክ" : "Dispatch Audit Alert"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 10. CLIENT/CONSULTANT VIEW --- */}
      {activeSubTab === "client" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የደንበኛ እና የአማካሪ መሀንዲስ ፖርታል" : "Client & Consultant Verification Portal"}</h3>
              <p className="text-xs text-slate-500">{isAmharic ? "የግንባታ መረጃ፣ የፎቶዎች ግምገማ እና የፍተሻ መጠየቂያዎች ማረጋገጫ" : "A transparent portal allowing stakeholders to review, comment, and sign-off on inspections"}</p>
            </div>
            <button
              onClick={() => {
                alert("Generating Executive PDF construction report...");
                onLogAction("PDF Progress Report Downloaded", "Generated executive PDF containing Gantt timelines, drone survey, and material KPIs.");
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all uppercase"
            >
              <Download size={13} />
              <span>{isAmharic ? "ሪፖርት አውርድ (PDF)" : "Download Progress PDF"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "የቅርብ ጊዜ የአማካሪ ማረጋገጫዎች" : "Consultant Action & Approval Requests"}</h4>
              <div className="space-y-3">
                {clientApprovals.map(ca => (
                  <div key={ca.id} className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.5 rounded-md font-bold">{ca.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        ca.status.includes("Fully") ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>{ca.status}</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900">{ca.task}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Submitted: {ca.submitted} | Reviewed by: <span className="font-bold">{ca.consultant}</span></p>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700 font-sans border-l-2 border-slate-300 pl-3">
                      <span className="font-bold text-slate-500 uppercase text-[9px] block">Consultant Feedback / Comments:</span>
                      "{ca.comments}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 h-fit">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አማካሪ ፊርማ አስቀምጥ" : "Simulate Stakeholder Comment"}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የፍተሻ ተግባር" : "Verification Task"}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Columns alignment B1 Floor 4"
                    className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "ሁኔታ" : "Review Status"}</label>
                  <select className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none">
                    <option value="Fully Approved">Fully Approved</option>
                    <option value="Approved with comments">Approved with comments</option>
                    <option value="Rejected (Needs repair)">Rejected (Needs repair)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isAmharic ? "የአስተያየት ዝርዝር" : "Review Notes / Comments"}</label>
                  <textarea rows={3} placeholder="Prdigital_construction_erpe specific directives or tolerances to adjust..." className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none" />
                </div>
                <button
                  onClick={() => {
                    alert("Client/Consultant portal response saved to central ledger.");
                    onLogAction("Consultant Signature Recorded", "Authorized supervisor recorded Tekle Partners feedback.");
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ClipboardCheck size={13} />
                  <span>{isAmharic ? "አስተያየቱን መዝግብ" : "Submit Consultant Directives"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 11. AI DIGITAL TWIN --- */}
      {activeSubTab === "twin" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "አይአይ ዲጂታል መንታ (BIM, CAD, Drone & Photo Integration)" : "AI Digital Twin & BIM-Telemetry Control Room"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የህንፃው ቅጽበታዊ ግንባታ ደረጃ፣ የሰርቬይንግ ልኬቶች፣ የሠራተኞችና የማቴሪያል ፍሰት በዲጂታል መንታ" : "Dynamic building replica integrating drone contours, CAD details, daily photos, and labor metrics"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-950 p-4 h-[300px] flex flex-col justify-between text-white relative">
                {/* Simulated 3D Building Layout */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-1">
                    <Activity size={12} className="text-red-500" />
                    <span>Live 3D Telemetry: Bole Heights Block B1</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 font-bold text-[9px]">AI Twin Render V2.4</span>
                </div>

                <div className="flex items-center justify-center h-40">
                  <div className="w-56 h-36 flex flex-col-reverse gap-1 border-b-2 border-slate-700 pb-1 relative">
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[9px] font-bold text-slate-500">Foundation (100% Cured)</div>
                    <div className="bg-green-600/80 h-6 rounded border border-green-500/50 flex items-center justify-center text-[9px] font-mono font-bold">Floor 1: 100% (Stripped)</div>
                    <div className="bg-green-600/80 h-6 rounded border border-green-500/50 flex items-center justify-center text-[9px] font-mono font-bold">Floor 2: 100% (Stripped)</div>
                    <div className="bg-green-600/80 h-6 rounded border border-green-500/50 flex items-center justify-center text-[9px] font-mono font-bold">Floor 3: 100% (Stripped)</div>
                    <div className="bg-amber-600/70 h-6 rounded border border-amber-500/50 flex items-center justify-center text-[9px] font-mono font-bold animate-pulse">Floor 4: 76.5% (Pouring Zone A)</div>
                    <div className="border border-slate-800 border-dashed h-6 rounded flex items-center justify-center text-[8px] font-mono font-bold text-slate-600">Floor 5: 0% (Slab Prepped)</div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-900 pt-2 text-[10px] text-slate-400 font-mono">
                  <span>Drone contours: Verified today 08:15 AM</span>
                  <span className="text-green-500 font-black">Accuracy Variance: &lt; 1.5mm</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3 text-xs font-semibold text-slate-700">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "ዲጂታል መንታ ቁልፍ መለኪያዎች" : "Integrated Telemetry Values"}</h4>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400">Total Progress:</span>
                  <span className="text-slate-900 font-bold">{aiTwinProgress.totalBldgProgress}% Complete</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400">Delay Prediction:</span>
                  <span className="text-green-600 font-bold">{aiTwinProgress.delayPrediction}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400">Concrete status:</span>
                  <span className="text-slate-900 font-bold">{aiTwinProgress.concreteReadiness}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400">Productivity Score:</span>
                  <span className="text-red-600 font-bold">{aiTwinProgress.productivityScore}% Index</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400">Quality:</span>
                  <span className="text-slate-900 font-bold">{aiTwinProgress.qualityStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Material Forecast:</span>
                  <span className="text-slate-800 font-bold text-right text-[10px] w-1/2 leading-tight">{aiTwinProgress.materialForecast}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 12. SYSTEM INTELLIGENCE --- */}
      {activeSubTab === "intelligence" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "አይአይ ሲስተም ኢንተለጀንስ (AI Autopilot, Predictive Analytics & Reports)" : "AI Intelligent Autopilot & Dynamic Reporting Core"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የነገው የዕለት ስራ እቅድ ማመንጫ፣ የስራ መዘግየት ትንበያዎች እና የስራ ማስተካከያ ምክረ-ሃሳቦች" : "Generates optimized daily site scheduling, forecasts workforce constraints, and writes daily digests"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-slate-300 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-1">
                    <Sparkles size={14} className="animate-pulse" />
                    <span>AI Autopilot: Generated Plan for Tomorrow (2026-07-10)</span>
                  </span>
                  <span className="text-[9px] bg-slate-800 px-2 py-0.5 rounded-md font-mono text-slate-400">Confidence Score: 98.4%</span>
                </div>

                <div className="space-y-3 font-sans text-xs">
                  <p className="text-slate-200 font-bold">Recommended Sequence of Operations:</p>
                  <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
                    <li><span className="font-bold text-white">08:00 AM:</span> Complete concrete curing evaluation for Floor 4 Column Cube CUBE-C30-41A. Verify minimum threshold of 24 MPa is maintained.</li>
                    <li><span className="font-bold text-white">09:15 AM:</span> Begin aluminum formwork panel stripping on Floor 4 Zone A (Assembly Team Alpha). Reposition panels directly to Level 5 slab supports via hoist.</li>
                    <li><span className="font-bold text-white">11:00 AM:</span> Release agent spraying & scraping for 450 wall panels at Bole site yard warehouse. Update bundle BUN-AL-01 cleaning ledger.</li>
                    <li><span className="font-bold text-white">02:00 PM:</span> Concrete pour check sign-off for Floor 4 Zone B column bases. (Assigning site engineer Alemayehu Kebede).</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "የአይአይ ትንበያ ሁኔታዎች" : "AI Predicted Milestones"}</h4>
                <div className="space-y-2 text-xs font-semibold text-slate-700">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Predicted Completion Date</span>
                    <p className="text-sm font-black text-slate-900">2026-10-15</p>
                    <p className="text-[10px] text-green-600 font-bold">● 4 days ahead of scheduled timeline</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Schedule & Slurry Risks</span>
                    <p className="text-sm font-black text-red-600">Low Risk Detected</p>
                    <p className="text-[10px] text-slate-500">Slurry leaks checked and mitigated via tight foam tape application.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 13. CLOUD INFRASTRUCTURE --- */}
      {activeSubTab === "cloud" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800">{isAmharic ? "የደመና መሠረተ-ልማት ኦዲት እና የደህንነት ሁኔታ" : "Production-Ready Enterprise Cloud Architecture"}</h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የባዮሜትሪክ መዝገቦች ስርጭት፣ የሮል-ተኮር ፍቃዶች (RBAC) እና አውቶማቲክ የመጠባበቂያ ኦዲት ሁኔታዎች" : "Monitor replication lag, Firebase Firestore quotas, backup cycles, and offline-sync ledgers"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-slate-200 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                <Cloud size={14} className="text-red-500" />
                <span>Backend Replication State</span>
              </h4>
              <div className="space-y-2 font-mono text-[11px] text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Database Engine:</span>
                  <span className="text-slate-900 font-bold">Cloud Firestore</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Auth Engine:</span>
                  <span className="text-slate-900 font-bold">Firebase Auth</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Local Cache:</span>
                  <span className="text-green-600 font-bold">Offline-Sync Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">FCM Push Push Token:</span>
                  <span className="text-slate-900 font-bold">Active Connection</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                <HardDrive size={14} className="text-red-500" />
                <span>Disaster Recovery & Backup</span>
              </h4>
              <div className="space-y-2 font-mono text-[11px] text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Auto Backup Cycle:</span>
                  <span className="text-slate-900 font-bold">Hourly Incremental</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Last Cold Backup:</span>
                  <span className="text-slate-900 font-bold">Today 03:00 AM</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Backup Quota used:</span>
                  <span className="text-slate-900 font-bold">14.2 GB of 100 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recovery SLA:</span>
                  <span className="text-green-600 font-bold">&lt; 15 Mins</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                <RefreshCw size={14} className="text-red-500 animate-spin-slow" />
                <span>Security (RBAC) Audit Logs</span>
              </h4>
              <div className="space-y-2 font-mono text-[11px] text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Primary Role:</span>
                  <span className="text-slate-900 font-bold">Lead Administrator</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Acting User:</span>
                  <span className="text-red-600 font-bold">Nuriye Ahmed Adem</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Session Limit:</span>
                  <span className="text-slate-900 font-bold">10 Minutes Idle</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Access Key Level:</span>
                  <span className="text-green-600 font-bold">Level 4 Top Tier</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 14. DIGITAL SITE DIARY --- */}
      {activeSubTab === "siteDiary" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <BookOpen size={16} className="text-red-600" />
                <span>{isAmharic ? "ዲጂታል ሳይት ዳየሪ" : "Digital Site Diary Autopilot"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "ዕለታዊ የግንባታ ሪፖርት፣ አየር ሁኔታ፣ የሠራተኞች ብዛት እና የአይአይ ማጠቃለያ" : "Unified daily record with automated drone images, concrete slump tests, and AI digests"}</p>
            </div>
            <button
              onClick={() => {
                alert("Site Diary PDF generated successfully! Saved to Digital Construction ERP Document Repository.");
                onLogAction("Generate Site Diary PDF", `Exported diary for ${diaryLogs[0]?.date}`);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer self-start"
            >
              <Download size={13} />
              <span>{isAmharic ? "ዕለታዊ ሪፖርት PDF አውርድ" : "Auto-Generate PDF Report"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column: Recent Logs and Diary Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የቅርብ ቀናት ዕለታዊ መዝገቦች" : "Recent Site Diary Logs"}</h4>
              <div className="space-y-4">
                {diaryLogs.map((log) => (
                  <div key={log.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Calendar size={13} className="text-red-500" />
                        <span>Date: {log.date}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">ID: {log.id}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-700">
                      <div><span className="text-slate-400 font-medium">Weather:</span> <span className="font-bold">{log.weather}</span></div>
                      <div><span className="text-slate-400 font-medium">Attendance:</span> <span className="font-bold text-emerald-600">{log.attendance}</span></div>
                      <div className="sm:col-span-2"><span className="text-slate-400 font-medium">Activities:</span> <p className="font-semibold mt-0.5">{log.activities}</p></div>
                      <div><span className="text-slate-400 font-medium">Survey Results:</span> <span className="font-semibold text-blue-600">{log.surveyResults}</span></div>
                      <div><span className="text-slate-400 font-medium">Concrete Activities:</span> <span className="font-semibold">{log.concreteActivities}</span></div>
                      <div><span className="text-slate-400 font-medium font-mono text-[10px]">Photo Attachment:</span> <span className="font-mono text-[10px] bg-white border px-1.5 py-0.5 rounded">{log.photos}</span></div>
                      <div><span className="text-slate-400 font-medium font-mono text-[10px]">Drone Ortho:</span> <span className="font-mono text-[10px] bg-white border px-1.5 py-0.5 rounded">{log.droneImages}</span></div>
                      <div className="sm:col-span-2"><span className="text-slate-400 font-medium">Material / Equipment:</span> <p className="mt-0.5 italic text-slate-600">{log.materialUsage} | {log.equipmentUsage}</p></div>
                      <div className="sm:col-span-2"><span className="text-slate-400 font-medium">Safety:</span> <span className="font-bold text-emerald-600">🛡️ {log.safetyIncidents}</span></div>
                      <div><span className="text-slate-400 font-medium">Engineer Directives:</span> <p className="italic text-slate-600 mt-0.5">{log.engineerNotes}</p></div>
                      <div><span className="text-slate-400 font-medium">Supervisor Notes:</span> <p className="italic text-slate-600 mt-0.5">{log.supervisorNotes}</p></div>
                    </div>

                    <div className="bg-red-50/50 p-3 rounded-lg border border-red-100/60 mt-2">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={11} className="animate-pulse" />
                        <span>AI Autopilot Generated Summary:</span>
                      </p>
                      <p className="text-[11px] text-slate-800 font-medium mt-1 leading-relaxed">{log.aiSummary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: New Entry Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ዕለታዊ ሪፖርት መዝግብ" : "Add Daily Site Log"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newDiaryEntry.activities) return;
                const newLog = {
                  id: `SD-${Date.now().toString().slice(-4)}`,
                  date: new Date().toISOString().split('T')[0],
                  weather: newDiaryEntry.weather,
                  attendance: "65 Workers Registered, 0 Late (Auto-pulled from Biometrics)",
                  surveyResults: "Passed (1.0mm verticality tolerance verified)",
                  activities: newDiaryEntry.activities,
                  photos: "Auto_Attached_Camera_04.jpg",
                  droneImages: "Auto_Drone_B1_CloudSync.tiff",
                  safetyIncidents: newDiaryEntry.safetyIncidents,
                  materialUsage: newDiaryEntry.materialUsage || "450 Wall panels, 1200 Wedge pins",
                  equipmentUsage: "Tower Crane 01 (8.0 Hrs), Concrete Vibrators (4.5 Hrs)",
                  concreteActivities: newDiaryEntry.concreteActivities,
                  visitors: "Digital Construction ERP Quality Supervisor Team",
                  engineerNotes: newDiaryEntry.engineerNotes || "Standard verification complete.",
                  supervisorNotes: newDiaryEntry.supervisorNotes || "Shift rotation handoff successful.",
                  aiSummary: "Log compiled successfully. Safety indices at 100%. Sequence productivity matched target expectations."
                };
                setDiaryLogs(prev => [newLog, ...prev]);
                onLogAction("Create Site Diary Entry", `Created daily log for ${newLog.date}`);
                setNewDiaryEntry({
                  weather: "Sunny, 25°C",
                  activities: "",
                  engineerNotes: "",
                  supervisorNotes: "",
                  concreteActivities: "Poured 8 m³ columns",
                  safetyIncidents: "None",
                  materialUsage: ""
                });
                alert("Site Diary Entry logged successfully!");
              }} className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Weather Summary</label>
                  <input type="text" value={newDiaryEntry.weather} onChange={e => setNewDiaryEntry({...newDiaryEntry, weather: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Activities of the Day</label>
                  <textarea rows={3} value={newDiaryEntry.activities} onChange={e => setNewDiaryEntry({...newDiaryEntry, activities: e.target.value})} placeholder="Describe concrete pouring, formwork stripping, scaffolding..." className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Concrete Pour Activities</label>
                  <input type="text" value={newDiaryEntry.concreteActivities} onChange={e => setNewDiaryEntry({...newDiaryEntry, concreteActivities: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Materials/Accessories Used</label>
                  <input type="text" value={newDiaryEntry.materialUsage} onChange={e => setNewDiaryEntry({...newDiaryEntry, materialUsage: e.target.value})} placeholder="e.g. 150 Wall panels, 30 Steel props" className="w-full mt-1 border rounded p-1.5 bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Safety Incidents</label>
                  <input type="text" value={newDiaryEntry.safetyIncidents} onChange={e => setNewDiaryEntry({...newDiaryEntry, safetyIncidents: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Engineer Directives</label>
                  <input type="text" value={newDiaryEntry.engineerNotes} onChange={e => setNewDiaryEntry({...newDiaryEntry, engineerNotes: e.target.value})} placeholder="Slurry tape seal check, alignments..." className="w-full mt-1 border rounded p-1.5 bg-white font-medium" />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "መዝግብ" : "Log Site Diary Entry"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 15. WORK PERMIT MANAGEMENT --- */}
      {activeSubTab === "permits" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <FileCheck size={16} className="text-red-600" />
              <span>{isAmharic ? "የስራ ፈቃድ ቁጥጥር" : "Digital Work Permits Ledger"}</span>
            </h3>
            <p className="text-xs text-slate-500">{isAmharic ? "ከፍታ ላይ ስራ፣ ሙቅ ስራ፣ ቁፋሮ እና ሌሎች የደህንነት ፈቃዶች አያያዝ" : "Enforce safety boundaries with role-based digital approvals, auto-expirations, and active wind-speed monitoring"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table of Permits */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "አሁን ያሉ የስራ ፈቃዶች" : "Active & Pending Work Permits"}</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Zone/Area</th>
                      <th className="p-3">Requested By</th>
                      <th className="p-3">Expiry Time</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {permits.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-[10px] text-slate-500">{p.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-800 border">
                            {p.type}
                          </span>
                        </td>
                        <td className="p-3">{p.zone}</td>
                        <td className="p-3 text-slate-600">{p.requestedBy}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{p.expiry}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            p.status === "Active" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                            p.status === "Approved" ? "bg-blue-100 text-blue-800 border border-blue-300" :
                            p.status === "Expired" ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse" :
                            "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                          }`}>
                            {p.status}
                          </span>
                          {p.alerts !== "No alerts" && (
                            <p className="text-[9px] text-rose-500 font-bold mt-1 max-w-[150px] leading-tight">⚠️ {p.alerts}</p>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {p.status === "Pending Approval" ? (
                            <button
                              onClick={() => {
                                setPermits(prev => prev.map(item => item.id === p.id ? { ...item, status: "Active", approvedBy: "Nuriye Ahmed Adem", alerts: "No alerts" } : item));
                                onLogAction("Approve Work Permit", `Approved ${p.type} Permit ID ${p.id} by Nuriye Ahmed.`);
                                alert(`Permit ${p.id} has been fully APPROVED and is now ACTIVE.`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2 py-1 rounded font-bold cursor-pointer mr-1 transition-all"
                            >
                              Approve
                            </button>
                          ) : p.status === "Active" ? (
                            <button
                              onClick={() => {
                                setPermits(prev => prev.map(item => item.id === p.id ? { ...item, status: "Expired", alerts: "Revoked by safety auditor" } : item));
                                onLogAction("Revoke Work Permit", `Revoked Permit ID ${p.id} for safety compliance.`);
                                alert(`Permit ${p.id} has been REVOKED and ARCHIVED.`);
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-2 py-1 rounded font-bold cursor-pointer transition-all"
                            >
                              Revoke
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Archived</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Request Permit Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ፈቃድ ጠይቅ" : "Request Digital Permit"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                const newP = {
                  id: `PER-${Date.now().toString().slice(-3)}`,
                  type: newPermit.type,
                  zone: newPermit.zone,
                  requestedBy: `${newPermit.requestedBy} (Formwork Unit)`,
                  approvedBy: "Pending",
                  expiry: newPermit.expiry,
                  status: "Pending Approval",
                  alerts: newPermit.type === "Height Work" ? "Alert: Winds forecast 25+ km/h tomorrow" : "No alerts"
                };
                setPermits(prev => [newP, ...prev]);
                onLogAction("Request Work Permit", `Requested ${newP.type} permit for ${newP.zone}`);
                alert("Work Permit requested successfully! Lead Admin notified.");
              }} className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Permit Category</label>
                  <select value={newPermit.type} onChange={e => setNewPermit({...newPermit, type: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium">
                    <option value="Hot Work">Hot Work (Welding, Grinding)</option>
                    <option value="Height Work">Height Work (Crane Boom, Scaffolding)</option>
                    <option value="Excavation">Excavation & Foundations</option>
                    <option value="Crane Lifting">Crane Tandem Lifting</option>
                    <option value="Electrical Work">Electrical High-Voltage Grid</option>
                    <option value="Confined Space">Confined Space (Deep Tanks)</option>
                    <option value="Concrete Pour">Concrete Heavy Structural Pour</option>
                    <option value="Formwork Removal">Formwork Quick Stripping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Specific Location / Zone</label>
                  <input type="text" value={newPermit.zone} onChange={e => setNewPermit({...newPermit, zone: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Requested By (Name)</label>
                  <input type="text" value={newPermit.requestedBy} onChange={e => setNewPermit({...newPermit, requestedBy: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Expiration Time</label>
                  <input type="text" value={newPermit.expiry} onChange={e => setNewPermit({...newPermit, expiry: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "ፈቃድ ጠይቅ" : "Request Permit"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 16. ASSET TRACKING --- */}
      {activeSubTab === "assets" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <QrCode size={16} className="text-red-600" />
                <span>{isAmharic ? "ባርኮድና የንብረት ቁጥጥር (QR & RFID)" : "Enterprise Asset Tracking (QR / RFID)"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "አልሙኒየም ፓነሎች፣ ማሽነሪዎችና መሣሪያዎች የት እንዳሉ በባርኮድ መከታተያ" : "Real-time coordinate maps, assigned teams, and automatic scan audit trails"}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isAmharic ? "ፈልግ..." : "Filter assets by QR code or name..."}
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                className="border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none w-52 sm:w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Asset Table */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የንብረት ዝርዝር" : "Registered Assets"}</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">Asset Barcode</th>
                      <th className="p-3">Asset Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Current Location</th>
                      <th className="p-3">Assigned Team</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Scans</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {assets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || a.code.toLowerCase().includes(assetSearch.toLowerCase())).map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/80">
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-900 bg-slate-100 p-1 rounded border w-fit">
                            <QrCode size={11} className="text-red-500" />
                            <span>{a.code}</span>
                          </div>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{a.name}</td>
                        <td className="p-3 text-slate-500">{a.category}</td>
                        <td className="p-3 text-slate-700">{a.location}</td>
                        <td className="p-3 text-slate-600">{a.assignedTo}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            a.status === "Healthy" || a.status === "In Use" || a.status === "Active" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                            a.status === "Standby" ? "bg-slate-100 text-slate-700 border" :
                            "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              alert(`Asset scanned! RFID response: Verified Location '${a.location}' of '${a.name}'.`);
                              onLogAction("RFID Scanner Audit", `Audited location for ${a.name} (${a.code})`);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer transition-all"
                          >
                            Scan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Asset Register Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ንብረት ይመዝግቡ (ባርኮድ ማመንጫ)" : "Register New Asset"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newAsset.name) return;
                const finalCode = newAsset.code || `QR-GEN-${Date.now().toString().slice(-4)}`;
                const newAs = {
                  id: `AST-${Date.now().toString().slice(-3)}`,
                  code: finalCode,
                  name: newAsset.name,
                  category: newAsset.category,
                  location: newAsset.location,
                  assignedTo: newAsset.assignedTo || "Central Pool",
                  status: "Healthy",
                  serviceHistory: "Registered today into Enterprise Cloud Ledger."
                };
                setAssets(prev => [newAs, ...prev]);
                onLogAction("Register Asset", `Registered ${newAs.name} with barcode ${newAs.code}`);
                alert(`Asset registered successfully! Autopilot printed QR code '${finalCode}'.`);
                setNewAsset({
                  code: "",
                  name: "",
                  category: "Aluminum Panels",
                  location: "Block B1-Floor 4",
                  assignedTo: ""
                });
              }} className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Asset Category</label>
                  <select value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium">
                    <option value="Aluminum Panels">Aluminum Panels</option>
                    <option value="Survey Instruments">Survey Instruments</option>
                    <option value="Cranes">Cranes</option>
                    <option value="Vehicles">Vehicles</option>
                    <option value="Generators">Generators</option>
                    <option value="Power Tools">Power Tools</option>
                    <option value="Office Equipment">Office Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Asset / Panel Name</label>
                  <input type="text" placeholder="e.g. Total Station Leica GS18" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custom Barcode/RFID (Optional)</label>
                  <input type="text" placeholder="Auto-generates if blank" value={newAsset.code} onChange={e => setNewAsset({...newAsset, code: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Initial Current Location</label>
                  <input type="text" value={newAsset.location} onChange={e => setNewAsset({...newAsset, location: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned User or Team</label>
                  <input type="text" placeholder="e.g. Surveying Yard" value={newAsset.assignedTo} onChange={e => setNewAsset({...newAsset, assignedTo: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "ንብረት መዝግብ" : "Register and Generate Barcode"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 17. MAINTENANCE MANAGEMENT --- */}
      {activeSubTab === "maintenance" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <Wrench size={16} className="text-red-600" />
              <span>{isAmharic ? "የጥገና እና የካሊብሬሽን አስተዳደር" : "Preventive Maintenance & Calibration Schedule"}</span>
            </h3>
            <p className="text-xs text-slate-500">{isAmharic ? "ለሰርቬይ መሣሪያዎች፣ ክሬኖች፣ ጄኔሬተሮች እና ማሽነሪዎች የጥገና ዕቅድ" : "Schedule periodic sensor diagnostics, grease cycles, and trigger automated alert notifications"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Maintenance List */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የመጪ ጥገናዎች ዕቅድ" : "Active Maintenance Schedule"}</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">ID</th>
                      <th className="p-3">Asset</th>
                      <th className="p-3">Maintenance Task Type</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Assigned Technician</th>
                      <th className="p-3">Alert Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {maintenanceSchedule.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-[10px] text-slate-500">{m.id}</td>
                        <td className="p-3 font-bold text-slate-800">{m.asset}</td>
                        <td className="p-3 text-slate-600">{m.type}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{m.dueDate}</td>
                        <td className="p-3 text-slate-600">{m.assignedTo}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            m.status === "Scheduled" ? "bg-slate-100 text-slate-800 border" :
                            m.status === "Pending Alert" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                            m.status === "Undergoing Repair" ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse" :
                            "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}>
                            {m.status}
                          </span>
                          <span className="block text-[8px] text-slate-400 mt-1">{m.alertTime}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setMaintenanceSchedule(prev => prev.map(item => item.id === m.id ? { ...item, status: "Calibrated & Completed", alertTime: "Checked Today" } : item));
                              onLogAction("Complete Maintenance", `Completed calibration on ${m.asset}`);
                              alert(`Maintenance signed off! Asset is certified and returned to active roster.`);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer transition-all whitespace-nowrap"
                          >
                            Sign-off Task
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Schedule Maintenance Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ጥገና ያቅዱ" : "Schedule Preventive Task"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newMaintItem.type) return;
                const newM = {
                  id: `MNT-${Date.now().toString().slice(-3)}`,
                  asset: newMaintItem.asset,
                  type: newMaintItem.type,
                  dueDate: newMaintItem.dueDate,
                  assignedTo: newMaintItem.assignedTo || "Unassigned Tech Pool",
                  status: "Scheduled",
                  alertTime: "Alert is scheduled"
                };
                setMaintenanceSchedule(prev => [newM, ...prev]);
                onLogAction("Schedule Maintenance", `Scheduled ${newM.type} for ${newM.asset}`);
                alert("Preventive maintenance task scheduled in central CRM calendar.");
                setNewMaintItem({
                  asset: "Leica TS16 Total Station",
                  type: "",
                  dueDate: "2026-07-15",
                  assignedTo: ""
                });
              }} className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select Target Asset</label>
                  <select value={newMaintItem.asset} onChange={e => setNewMaintItem({...newMaintItem, asset: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium">
                    <option value="Potain Tower Crane MC125">Potain Tower Crane MC125</option>
                    <option value="Leica TS16 Total Station">Leica TS16 Total Station</option>
                    <option value="Caterpillar 250kVA Generator">Caterpillar 250kVA Generator</option>
                    <option value="Sany Concrete Pump Truck 32m">Sany Concrete Pump Truck 32m</option>
                    <option value="DJI Matrice 300 RTK Survey Drone">DJI Matrice 300 RTK Survey Drone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Maintenance Task Detail</label>
                  <input type="text" placeholder="e.g. Calibrate optical prism, swap engine oil" value={newMaintItem.type} onChange={e => setNewMaintItem({...newMaintItem, type: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Scheduled Due Date</label>
                  <input type="date" value={newMaintItem.dueDate} onChange={e => setNewMaintItem({...newMaintItem, dueDate: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned Technician (Name)</label>
                  <input type="text" placeholder="e.g. Yohannes B." value={newMaintItem.assignedTo} onChange={e => setNewMaintItem({...newMaintItem, assignedTo: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "እቅድ መዝግብ" : "Schedule Preventive Task"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 18. COST CONTROL --- */}
      {activeSubTab === "costs" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <DollarSign size={16} className="text-red-600" />
                <span>{isAmharic ? "የወጪ ቁጥጥርና የበጀት ኦዲት" : "Enterprise Cost Control & Budget Variance"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "የሠራተኞች፣ ማቴሪያሎች፣ ነዳጅ እና ማሽነሪዎች ወጪ ከበጀት ጋር ማነጻጸሪያ" : "Real-time cost trackers comparing Planned budget vs Actual expenditure"}</p>
            </div>
            <div className="bg-slate-100 p-2 rounded-lg font-mono text-[10px] flex items-center gap-3">
              <div><span className="text-slate-400">Total Planned:</span> <span className="font-bold text-slate-900">ETB 3,290,000</span></div>
              <div><span className="text-slate-400">Total Actual:</span> <span className="font-bold text-red-600">ETB 3,310,000</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-2 space-y-4 bg-slate-50 p-4 rounded-xl border">
              <h4 className="text-xs font-black uppercase text-slate-700">Planned vs Actual Cumulative Cost (ETB)</h4>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costItems}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                    <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Bar dataKey="planned" name="Planned Budget (ETB)" fill="#334155" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual Spending (ETB)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost logging Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4 text-xs font-semibold text-slate-700">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "የወጪ ዝርዝር መዝግብ" : "Log Expense Voucher"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                setCostItems(prev => prev.map(item => item.category === newCostRecord.category ? {
                  ...item,
                  planned: item.planned + Number(newCostRecord.planned),
                  actual: item.actual + Number(newCostRecord.actual)
                } : item));
                onLogAction("Log Expenditure", `Logged expense for ${newCostRecord.category}: Planned ETB ${newCostRecord.planned}, Actual ETB ${newCostRecord.actual}`);
                alert("Expenditure logged and synchronized to central General Ledger successfully!");
                setNewCostRecord({
                  category: "Labor Cost",
                  planned: 50000,
                  actual: 50000
                });
              }} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cost Allocation Category</label>
                  <select value={newCostRecord.category} onChange={e => setNewCostRecord({...newCostRecord, category: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium">
                    <option value="Labor Cost">Labor Cost</option>
                    <option value="Material Cost">Material Cost</option>
                    <option value="Equipment Cost">Equipment Cost</option>
                    <option value="Fuel Cost">Fuel Cost</option>
                    <option value="Subcontractor Cost">Subcontractor Cost</option>
                    <option value="Concrete Cost">Concrete Cost</option>
                    <option value="Overhead Cost">Overhead Cost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Planned Budget Addition (ETB)</label>
                  <input type="number" value={newCostRecord.planned} onChange={e => setNewCostRecord({...newCostRecord, planned: Number(e.target.value)})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Actual Expenditure Addition (ETB)</label>
                  <input type="number" value={newCostRecord.actual} onChange={e => setNewCostRecord({...newCostRecord, actual: Number(e.target.value)})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "መዝግብ" : "Log Ledger Entry"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 19. AI RISK MANAGEMENT --- */}
      {activeSubTab === "aiRisks" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-600 animate-pulse" />
                <span>{isAmharic ? "አይአይ የስጋት ቁጥጥር እና ማስተካከያዎች" : "Proactive AI Risk Autopilot"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "የአየር ሁኔታ ስጋቶች፣ ጥራትና መዘግየት ትንበያዎች በአይአይ ረዳት" : "Predicts upcoming high winds, material shortfalls, concrete curing delays, and publishes alerts"}</p>
            </div>
            <button
              onClick={() => {
                alert("BROADCAST SAFETY ALERT: Tower Crane operations restricted due to peak winds forecast. Safety warnings sent to all supervisor biometrics!");
                onLogAction("Safety Broadcast Triggered", "Sent high wind crane lock alerts system-wide.");
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer self-start animate-pulse"
            >
              <AlertTriangle size={13} />
              <span>{isAmharic ? "ለሠራተኞች አስቸኳይ ማስጠንቀቂያ ላክ" : "Trigger Emergency Safety Broadcast"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aiRisks.map(risk => (
              <div key={risk.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{risk.category}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      risk.priority === "High" ? "bg-red-600 text-white" :
                      risk.priority === "Medium" ? "bg-amber-500 text-white" :
                      "bg-emerald-600 text-white"
                    }`}>
                      {risk.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">{risk.desc}</p>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border border-red-100/60 mt-2">
                  <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>AI Recommendation:</span>
                  </p>
                  <p className="text-[11px] text-slate-900 font-bold mt-1 leading-normal">{risk.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- REQ 20. ENVIRONMENTAL MANAGEMENT --- */}
      {activeSubTab === "environmental" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <Leaf size={16} className="text-emerald-600" />
              <span>{isAmharic ? "አካባቢ ጥበቃ እና ደህንነት መቆጣጠሪያ" : "Environmental Compliance & Dust Telemetry"}</span>
            </h3>
            <p className="text-xs text-slate-500">{isAmharic ? "የአካባቢ ብክለት፣ አቧራ (PM10)፣ ጫጫታ መጠን እና የካርቦን ልቀት መቆጣጠሪያ" : "Monitors walkway water sprays, noise decibels average, concrete recycling, and carbon emission offsets"}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Walkway PM10</p>
              <h4 className="text-lg font-black text-slate-900">34 µg/m³</h4>
              <span className="text-[9px] text-emerald-600 font-bold">● Compliant</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Average Noise</p>
              <h4 className="text-lg font-black text-slate-900">68.2 dB</h4>
              <span className="text-[9px] text-emerald-600 font-bold">● Limit 85dB</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Water Recycled</p>
              <h4 className="text-lg font-black text-slate-900">5,200 L</h4>
              <span className="text-[9px] text-slate-500 font-semibold">Today volume</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aluminum Recycled</p>
              <h4 className="text-lg font-black text-slate-900">95%</h4>
              <span className="text-[9px] text-emerald-600 font-bold">● Top Score</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Carbon Emissions</p>
              <h4 className="text-lg font-black text-slate-900">1.92 Tons</h4>
              <span className="text-[9px] text-slate-500 font-semibold">Daily footprint</span>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl border space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Solar Offsets</p>
              <h4 className="text-lg font-black text-slate-900">-0.45 Tons</h4>
              <span className="text-[9px] text-emerald-600 font-bold">● Active PV Array</span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 text-xs font-semibold text-slate-700 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-800">Environmental Compliance Ledger Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 font-mono text-[11px]">
                <div><span className="text-slate-400 font-medium">Waste Disposed details:</span> <span className="font-bold text-slate-900">{environmentalMetrics.wasteDisposed}</span></div>
                <div><span className="text-slate-400 font-medium">Walkway Dust Suppression:</span> <span className="font-bold text-slate-900">{environmentalMetrics.dustControl}</span></div>
                <div><span className="text-slate-400 font-medium">Noise Levels Average:</span> <span className="font-bold text-slate-900">{environmentalMetrics.noiseLevels}</span></div>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div><span className="text-slate-400 font-medium">Daily Water Usage:</span> <span className="font-bold text-slate-900">{environmentalMetrics.waterUsage}</span></div>
                <div><span className="text-slate-400 font-medium">Diesel Fuel Consumption:</span> <span className="font-bold text-slate-900">{environmentalMetrics.fuelConsumption}</span></div>
                <div><span className="text-slate-400 font-medium">Carbon Emissions Offset:</span> <span className="font-bold text-emerald-600">{environmentalMetrics.carbonEmissions}</span></div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  alert("Water sprinklers cycle manually activated for another 15 minutes.");
                  onLogAction("Manual Water Sprinklers On", "Activated perimeter walkway mist sprayers.");
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 px-3 rounded text-xs transition-all cursor-pointer"
              >
                Trigger Walkway Water Sprinklers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 21. TRAINING & COMPETENCY --- */}
      {activeSubTab === "training" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
              <GraduationCap size={16} className="text-red-600" />
              <span>{isAmharic ? "የሠራተኞች ደህንነት ስልጠናና ማረጋገጫ" : "Employee Safety Competency Registry"}</span>
            </h3>
            <p className="text-xs text-slate-500">{isAmharic ? "ከፍታ ላይ ስራ፣ የክሬን ስራ እና የኮንክሪት ስራ ማረጋገጫዎች መዝገብ" : "Expired certifications automatically block employees from critical site operations"}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Training List */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የሠራተኞች ማረጋገጫዎች ሁኔታ" : "Active Safety Competency Certifications"}</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Safety Course / Certificate</th>
                      <th className="p-3">Expiry Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Task Block Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {trainingRecords.map(tr => (
                      <tr key={tr.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-bold text-slate-800">{tr.employee}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-800 border">
                            {tr.course}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-500">{tr.expiryDate}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            tr.status === "Valid" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                            "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                          }`}>
                            {tr.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            tr.blockStatus === "Clear" ? "bg-slate-100 text-slate-800 border" :
                            "bg-red-600 text-white animate-pulse"
                          }`}>
                            {tr.blockStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {tr.status === "Expired" ? (
                            <button
                              onClick={() => {
                                setTrainingRecords(prev => prev.map(item => item.id === tr.id ? { ...item, status: "Valid", blockStatus: "Clear", expiryDate: "2027-07-09" } : item));
                                onLogAction("Renew Safety Certification", `Renewed safety competency for ${tr.employee}`);
                                alert(`Safety certification successfully RENEWED. All critical task blocks have been lifted.`);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1 rounded cursor-pointer transition-all"
                            >
                              Renew & Unblock
                            </button>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Training Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ስልጠና መዝግብ" : "Register Safety Competency"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newTraining.employee) return;
                const newT = {
                  id: `TRN-${Date.now().toString().slice(-3)}`,
                  employee: newTraining.employee,
                  course: newTraining.course,
                  certDate: new Date().toISOString().split('T')[0],
                  expiryDate: newTraining.expiryDate,
                  status: "Valid",
                  blockStatus: "Clear"
                };
                setTrainingRecords(prev => [newT, ...prev]);
                onLogAction("Register Training Certificate", `Registered ${newT.course} for ${newT.employee}`);
                alert("Certification registered and synced with security biometrics portal!");
                setNewTraining({
                  employee: "",
                  course: "Height Work & Safety Harness Lock",
                  expiryDate: "2027-07-09"
                });
              }} className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Employee Name</label>
                  <input type="text" placeholder="e.g. Fikru Tolossa" value={newTraining.employee} onChange={e => setNewTraining({...newTraining, employee: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Safety Course Category</label>
                  <select value={newTraining.course} onChange={e => setNewTraining({...newTraining, course: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium">
                    <option value="Height Work & Safety Harness Lock">Height Work & Safety Harness Lock</option>
                    <option value="Tower Crane Operation Level II Certification">Tower Crane Operation Level II Certification</option>
                    <option value="Survey Instrument Calibration & Leica GS18 T">Survey Instrument Calibration & Leica GS18 T</option>
                    <option value="Reinforcement Tensile Testing & ASTM Standards">Reinforcement Tensile Testing & ASTM Standards</option>
                    <option value="Confined Space Entry Safety Marshal Certification">Confined Space Entry Safety Marshal Certification</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Certification Expiration Date</label>
                  <input type="date" value={newTraining.expiryDate} onChange={e => setNewTraining({...newTraining, expiryDate: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "መዝግብ" : "Register Certification"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 22. MULTI-PROJECT MANAGEMENT --- */}
      {activeSubTab === "multiProject" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <Briefcase size={16} className="text-red-600" />
                <span>{isAmharic ? "መልቲ-ፕሮጀክት እና መልቲ-ካምፓኒ ቁጥጥር" : "Enterprise Multi-Project & Multi-Company Ledger"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "Digital Construction ERP ግንባታ፣ ሪል ስቴት እና መሰረተ-ልማት ስራዎች በአንድ ላይ መቆጣጠሪያ" : "Monitor budgets, towers, blocks, and curing progress simultaneously across all Digital Construction ERP sister companies"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects Grid */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የሁሉም ፕሮጀክቶች ደረጃ" : "Cumulative Project Statuses"}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {multiProjects.map(p => (
                  <div key={p.id} className="bg-slate-50 p-4 rounded-xl border space-y-3 relative overflow-hidden">
                    <span className="absolute -top-1 -right-1 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest bg-red-600 text-white rounded-bl-lg">
                      {p.company.substring(5, 17)}
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.id}</p>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">{p.name}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-semibold">
                      <div>Towers: <span className="font-bold text-slate-900">{p.towers}</span></div>
                      <div>Floors: <span className="font-bold text-slate-900">{p.floors}</span></div>
                      <div>Budget Limit: <span className="font-bold text-red-600">{p.budget}</span></div>
                      <div>Status: <span className="font-bold text-emerald-600">{p.status}</span></div>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                        <span>Physical Progress:</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provision New Project Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">{isAmharic ? "አዲስ ፕሮጀክት ይመዝግቡ" : "Provision New Site Workspace"}</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newProject.name) return;
                const newP = {
                  id: `PRJ-${Date.now().toString().slice(-3)}`,
                  company: newProject.company,
                  name: newProject.name,
                  towers: newProject.towers,
                  floors: newProject.floors,
                  zones: "Zone A, B",
                  budget: newProject.budget,
                  progress: 5.0,
                  status: "Mobilization"
                };
                setMultiProjects(prev => [...prev, newP]);
                onLogAction("Provision Project", `Provisioned new workspace ${newP.name} under ${newP.company}`);
                alert(`Workspace provisioned successfully! Autopilot initiated Firestore replica node for ${newP.name}.`);
                setNewProject({
                  company: "Digital Construction ERP PLC",
                  name: "",
                  towers: "Block B3",
                  floors: "G+10 Floors",
                  budget: "ETB 20M"
                });
              }} className="space-y-3 text-xs font-semibold text-slate-700">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Digital Construction ERP Company Node</label>
                  <select value={newProject.company} onChange={e => setNewProject({...newProject, company: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium">
                    <option value="Digital Construction ERP PLC">Digital Construction ERP PLC</option>
                    <option value="Digital Construction ERP System">Digital Construction ERP System</option>
                    <option value="Digital Infrastructure">Digital Infrastructure</option>
                    <option value="Digital Housing Co.">Digital Housing Co.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Project Name</label>
                  <input type="text" placeholder="e.g. Bole Heights Phase II" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Towers / Blocks count</label>
                  <input type="text" value={newProject.towers} onChange={e => setNewProject({...newProject, towers: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Design Floors count</label>
                  <input type="text" value={newProject.floors} onChange={e => setNewProject({...newProject, floors: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Initial Budget Limit</label>
                  <input type="text" placeholder="e.g. ETB 40M" value={newProject.budget} onChange={e => setNewProject({...newProject, budget: e.target.value})} className="w-full mt-1 border rounded p-1.5 bg-white font-medium" required />
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded py-2 font-bold cursor-pointer transition-all">
                  {isAmharic ? "ፕሮጀክት መዝግብ" : "Provision and Deploy"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 23. BUSINESS INTELLIGENCE DASHBOARD --- */}
      {activeSubTab === "biDashboard" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <BarChart3 size={16} className="text-red-600" />
                <span>{isAmharic ? "ኢንተርፕራይዝ የንግድ ኢንተለጀንስ (BI)" : "Executive Business Intelligence (BI) Analytics"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "የ Digital Construction ERP ጠቅላላ ምርታማነት፣ የጥራት ጠቋሚዎች እና የወጪ አዝማሚያዎች በአይአይ ትንበያ" : "Analyzes overall equipment effectiveness, safety milestones, and financial margins in real-time"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl text-white space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">OEE index</span>
              <p className="text-2xl font-black text-red-500">92.4%</p>
              <p className="text-[9px] text-slate-400">Equipment effectiveness</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl text-white space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Safety index</span>
              <p className="text-2xl font-black text-emerald-500">100.0%</p>
              <p className="text-[9px] text-slate-400">Zero major loss of time</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl text-white space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quality score</span>
              <p className="text-2xl font-black text-blue-400">98.5%</p>
              <p className="text-[9px] text-slate-400">Cube stress testing avg</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl text-white space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Profitability margin</span>
              <p className="text-2xl font-black text-yellow-500">+14.2%</p>
              <p className="text-[9px] text-slate-400">Variance below ceiling</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-50 p-4 rounded-xl border space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-700">Cumulative Progress & Planned S-Curves</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { month: "Jan", planned: 10, actual: 12 },
                    { month: "Feb", planned: 25, actual: 24 },
                    { month: "Mar", planned: 40, actual: 43 },
                    { month: "Apr", planned: 55, actual: 58 },
                    { month: "May", planned: 70, actual: 72 },
                    { month: "Jun", planned: 85, actual: 88 },
                    { month: "Jul", planned: 100, actual: 98 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                    <Tooltip contentStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                    <Area type="monotone" dataKey="actual" name="Actual Physical progress (%)" stroke="#dc2626" fill="#fca5a5" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="planned" name="Planned Schedule S-Curve (%)" stroke="#1e293b" fill="#cbd5e1" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border text-xs font-semibold text-slate-700 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800">Autopilot Financial & Productivity Digest</h4>
              <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                <p>📈 <span className="font-bold text-slate-900">Aluminum Formwork Productivity:</span> Cumulative sequence cycle is resting at 4.2 days, outperforming regional standard by 16%.</p>
                <p>📉 <span className="font-bold text-slate-900">Asset Deflect Index:</span> Slump variance rests below 1.5%. No micro-sag risk calculated for Block B1 structural concrete.</p>
                <p>🛢️ <span className="font-bold text-slate-900">Fuel burn-rate efficiency:</span> Mobile crane operators matching target curve. Total fuel saving of ETB 12,500 calculated today.</p>
              </div>
              <button
                onClick={() => {
                  alert("BI executive summary report dispatched to Nuriye Ahmed Adem's administrative email.");
                  onLogAction("Dispatched BI Report", "Emailed BI analysis digest to mejennur669@gmail.com");
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded py-2 font-bold cursor-pointer transition-all"
              >
                Send BI Report to mejennur669@gmail.com
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 24. ENTERPRISE API INTEGRATION & SYNC LOGS --- */}
      {activeSubTab === "apiIntegration" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <Network size={16} className="text-red-600 animate-pulse" />
                <span>{isAmharic ? "ኤፒአይ ማገናኛና የሲስተም ግንኙነቶች" : "Enterprise API Integration & Sync Logs"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "ከ SAP፣ ከባዮሜትሪክ እና ከሂሳብ አያያዝ ሲስተም ጋር ቅጽበታዊ ግንኙነት" : "Real-time sync channels connecting SAP Financials, Autodesk Construction Cloud, and ZKTeco biometric hubs"}</p>
            </div>
            <button
              onClick={() => {
                setApiLogs(prev => [
                  { id: `API-${Math.floor(1000 + Math.random() * 9000)}`, endpoint: "/api/v1/erp/sync-inventory", method: "POST", status: 200, system: "SAP ERP Financials", payload: "Continuous auto-sync finalized with zero lag.", timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16) },
                  ...prev
                ]);
                onLogAction("SAP ERP Sync Triggered", "Manual payload synchronization with SAP gateway performed.");
                alert("ERP synchronization request published! Checked 13 material bundles, status 200 OK.");
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer self-start"
            >
              <RefreshCw size={13} className="animate-spin-slow" />
              <span>{isAmharic ? "ከ SAP ጋር አሁኑኑ አመሳስል" : "Force Real-time SAP Sync"}</span>
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የኤፒአይ ትራፊክ መዝገቦች" : "Live API Gateway Traffic Logs"}</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Calling Endpoint</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Target System</th>
                    <th className="p-3">Response Payload</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                  {apiLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-mono text-[10px] text-slate-500">{log.id}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-800 font-black">{log.endpoint}</td>
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                          log.method === "POST" ? "bg-blue-100 text-blue-800 border" : "bg-slate-100 text-slate-700"
                        }`}>{log.method}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          log.status === 200 || log.status === 201 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                          "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                        }`}>{log.status}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{log.system}</td>
                      <td className="p-3 text-slate-500 font-mono text-[10px] max-w-xs truncate">{log.payload}</td>
                      <td className="p-3 font-mono text-[10px] text-slate-400">{log.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 25. BACKUP & DISASTER RECOVERY --- */}
      {activeSubTab === "disasterRecovery" && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                <DatabaseBackup size={16} className="text-red-600" />
                <span>{isAmharic ? "የመጠባበቂያ ፋይል እና የአደጋ መቋቋም ኦዲት" : "Backup & Disaster Recovery Monitor"}</span>
              </h3>
              <p className="text-xs text-slate-500">{isAmharic ? "በደመና ላይ በየሰዓቱ የሚቀመጡ ኮፒዎች እና የሲስተም ደህንነት ፍተሻ" : "Continuously replicates Firestore nodes with SHA-256 data validation and sub-15 minute SLA"}</p>
            </div>
            <button
              onClick={() => {
                alert("Database integrity validation complete! Checksum matches 100% across Addis, Frankfurt, and Dublin nodes.");
                onLogAction("Database Integrity Self-Test", "Passed checksum validations across multi-cloud clusters.");
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer self-start"
            >
              <CheckCircle size={13} />
              <span>{isAmharic ? "የሲስተም ጤንነት ፍተሻ አሁኑኑ አከናውን" : "Run Database Integrity Self-Test"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DR Status */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-700">{isAmharic ? "የመጠባበቂያ መዝገቦች ታሪክ" : "Active Incremental Backup Log"}</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">Backup ID</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Backup Size</th>
                      <th className="p-3">Integrity Checksum</th>
                      <th className="p-3">Geographic Node Location</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                    {backupLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono text-[10px] text-slate-500">{log.id}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-800">{log.timestamp}</td>
                        <td className="p-3">{log.type}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-600">{log.size}</td>
                        <td className="p-3 font-mono text-[10px] text-emerald-600 font-bold">{log.checksum}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-500 font-bold">{log.nodes}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SLA Info */}
            <div className="space-y-4">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-slate-300 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-red-500">SLA Compliance Status</h4>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span>RTO Compliance Limit:</span>
                    <span className="text-white font-bold">&lt; 15 Minutes (12m actual)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span>RPO Data Loss Max:</span>
                    <span className="text-white font-bold">&lt; 1 Hour (Synced Live)</span>
                  </div>
                  <div className="flex justify-between pb-1.5">
                    <span>Multi-Region Nodes:</span>
                    <span className="text-emerald-500 font-bold">Active (3 Synchronized)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REQ 26. ENTERPRISE HO ADMINISTRATION --- */}
      {activeSubTab === "adminSettings" && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="bg-slate-900 text-white p-5 rounded-xl border border-red-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                Enterprise Hub
              </span>
              <h3 className="text-lg font-black uppercase text-white mt-1 flex items-center gap-2">
                <Sliders size={18} className="text-red-500" />
                <span>{isAmharic ? "ኢንተርፕራይዝ ወርክፍሎውና ሲስተም አስተዳደር" : "Lead Configurable Workflow Engine"}</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {isAmharic 
                  ? "ሁሉንም 18 የድርጅት ስራ ሂደቶች የፊርማና የውሳኔ መስመሮች እዚህ ያዋቅሩ፤ ይቆጣጠሩ።"
                  : "Configure, enforce, and simulate multi-level approval hierarchies for all 18 standard business processes."}
              </p>
            </div>
            <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-xs text-slate-300 font-semibold font-mono">
              <span className="text-slate-400">Enforcement Level:</span> <strong className="text-red-400">Strict Level 4 RBAC</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-xs text-slate-700">
            {/* 18 Workflows Config Panel */}
            <div className="xl:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 font-sans">
                  <CheckSquare size={14} className="text-red-600" />
                  <span>{isAmharic ? "የ18ቱን ስራዎች የውሳኔ መስመር ማዋቀሪያ" : "Configurable Core Workflows (18 Processes)"}</span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {["All", "Operations", "Finance", "Logistics", "HR", "Safety", "Quality"].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedWorkflowCat(cat)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        selectedWorkflowCat === cat 
                          ? "bg-slate-900 text-white shadow-xs" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {approvalWorkflows
                  .filter(w => selectedWorkflowCat === "All" || w.category === selectedWorkflowCat)
                  .map(w => (
                    <div key={w.id} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-black text-slate-900 leading-tight">{w.name}</span>
                          <span className="text-[8px] bg-slate-200 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider text-slate-600 font-mono">
                            {w.category}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono font-bold text-slate-500 leading-snug">
                          Levels: <span className="text-slate-800 font-black">{w.path}</span>
                        </p>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-150/80">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-bold text-slate-400">Levels:</span>
                          <span className="text-[10px] font-black text-red-600">{w.levels} Stages</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={w.autoNotify}
                              onChange={() => {
                                setApprovalWorkflows(prev => prev.map(item => item.id === w.id ? { ...item, autoNotify: !item.autoNotify } : item));
                                onLogAction("Configure Workflow", `Toggled automatic notification for ${w.name}`);
                              }}
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-[9px] font-bold text-slate-500 font-sans">AutoNotify</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Live Pipeline Simulator */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1">
                  <Play size={14} className="text-red-600" />
                  <span>Workflow Pipeline Simulator</span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Submit a real-time request to see the configured multi-level pipeline fire automatically.</p>
              </div>

              {/* Submission Form */}
              <form onSubmit={handleInitiateSimRequest} className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase font-sans">Process to Trigger</label>
                  <select
                    value={simTriggerId}
                    onChange={e => setSimTriggerId(e.target.value)}
                    className="w-full mt-1 border rounded p-1.5 bg-white font-black text-slate-800 text-[11px]"
                  >
                    {approvalWorkflows.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.levels} Levels)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase font-sans">Request Summary Details</label>
                  <input
                    type="text"
                    value={simTriggerDetails}
                    onChange={e => setSimTriggerDetails(e.target.value)}
                    placeholder="e.g., Concrete Pour on slab zone C, 40m3"
                    className="w-full mt-1 border rounded p-1.5 bg-white text-slate-800 text-[11px] font-semibold"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded uppercase text-[10px] tracking-wider cursor-pointer"
                >
                  Initiate Approval Pipeline
                </button>
              </form>

              {/* Active Requests List */}
              <div className="space-y-3.5 pt-2">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Verification Pipeline Queue</h5>
                {simulatedWorkflowRequests.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-4">No active pipeline requests.</p>
                ) : (
                  <div className="space-y-3">
                    {simulatedWorkflowRequests.map(req => {
                      const percentage = Math.round((req.currentLevel / req.maxLevel) * 100);
                      return (
                        <div key={req.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-[10px] font-semibold">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[8px] font-mono text-slate-400 font-bold">{req.id} • {req.initiator}</p>
                              <h4 className="font-black text-slate-900 text-[11px] leading-tight">{req.workflowName}</h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              req.status === "Approved" ? "bg-emerald-600 text-white" : "bg-yellow-500 text-slate-950"
                            }`}>
                              {req.status}
                            </span>
                          </div>

                          <p className="text-slate-600 italic font-medium leading-snug">{req.details}</p>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-400">
                              <span>Pipeline Level Progress:</span>
                              <span>{req.currentLevel} of {req.maxLevel} Approved ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-red-600 h-full transition-all" style={{ width: `${percentage}%` }} />
                            </div>
                            <p className="text-[8px] font-mono text-red-600 leading-snug font-bold">
                              Current level path: <span className="text-slate-800 font-black">{req.levels[req.currentLevel] || "Approved & Logged"}</span>
                            </p>
                          </div>

                          {req.status === "Pending" && (
                            <div className="flex gap-1.5 pt-1">
                              <button
                                onClick={() => handleAdvanceApproval(req.id, true)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 rounded cursor-pointer text-center text-[9px] uppercase tracking-wider"
                              >
                                Approve Next Stage
                              </button>
                              <button
                                onClick={() => handleAdvanceApproval(req.id, false)}
                                className="px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1 rounded cursor-pointer text-center text-[9px] uppercase"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* System and Developer Info Column */}
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-red-500">Security Policies (Enforced)</h4>
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span>Session Idle Timeout:</span>
                    <span className="text-white font-bold">{systemSettings?.sessionTimeout || "10 Minutes"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span>RBAC Validation level:</span>
                    <span className="text-white font-bold">{systemSettings?.rbacEnforcement || "Strict Level 4"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span>Administrative MFA:</span>
                    <span className="text-white font-bold">{systemSettings?.mfaAuthentication || "Active (SMS/Email)"}</span>
                  </div>
                  <div className="flex justify-between pb-1.5">
                    <span>Firestore Cold Backup:</span>
                    <span className="text-emerald-500 font-bold">{systemSettings?.automaticDailyCloudBackup || "Every 24 Hours"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-950 to-slate-950 p-4 rounded-xl border border-red-500/30 text-white space-y-2">
                <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">DEVELOPER DETAILS & CREDITS</p>
                <div className="space-y-1">
                  <h4 className="text-sm font-black tracking-tight">Nuriye Ahmed Adem</h4>
                  <p className="text-[11px] text-slate-300 font-medium">Full Stack ERP Architect</p>
                  <p className="text-[11px] font-mono text-red-400">0910097862 / 0920843843</p>
                  <p className="text-[11px] font-mono text-slate-400 font-semibold">mejennur669@gmail.com</p>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 italic leading-snug">
                  Designed explicitly for Digital Construction ERP Aluminum Formwork Systems. Authenticated under high-integrity multi-region cloud servers.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 14. FLUTTER MOBILE APP ECOSYSTEM & AI INTEGRATION CORE --- */}
      {activeSubTab === "flutterApps" && (
        <div className="space-y-6">
          {/* Header Dashboard Metrics */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-red-500/20 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-[10px] font-black tracking-widest uppercase">
                    {isAmharic ? "ሞባይል ሲስተም ቁጥጥር" : "Multi-Device Ecosystem"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-green-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    {isAmharic ? "ሁሉም 11 አፖች ተገናኝተዋል" : "11/11 Mobile Clients Online"}
                  </span>
                </div>
                <h3 className="text-xl font-black font-sans tracking-tight">
                  {isAmharic ? "Digital Construction ERP የሞባይል አፖችና አይአይ ማዕከላዊ ሲስተም" : "Digital Construction ERP Mobile Apps & AI Construction Command Center"}
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl">
                  {isAmharic
                    ? "ከደመና ፋየርቤዝ ጋር የተገናኙ 11 የሞባይል አፕሊኬሽኖች፣ የሰርቬይንግ መሳሪያዎች፣ ድሮን እና አይአይ ሲስተሞች ቅጽበታዊ መቆጣጠሪያ ፓነል።"
                    : "Simulate and verify live cross-device synchronizations across all 11 client roles, cloud Firestore database pipelines, AI formwork image recognition, and surveyor Total Station integrations."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center font-mono">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Sync Latency</span>
                  <span className="text-xs font-black text-emerald-400">12ms (Real-time)</span>
                </div>
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center font-mono">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Active Workers</span>
                  <span className="text-xs font-black text-red-400">2,450 Registered</span>
                </div>
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center font-mono">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Cloud Encryption</span>
                  <span className="text-xs font-black text-blue-400">AES-256 / SSL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Double Column Grid: Emulator Left, AI command center Right */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Column - Smartphone Device Emulator (5 Cols) */}
            <div className="xl:col-span-5 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider block">
                  {isAmharic ? "ለመሞከር የሞባይል አፕ ይምረጡ" : "Select Flutter App Client"}
                </label>
                <div className="relative">
                  <select
                    value={selectedMobileApp}
                    onChange={(e) => {
                      setSelectedMobileApp(e.target.value);
                      onLogAction("Mobile App Client Switched", `Switched emulator screen to ${e.target.value}`);
                    }}
                    className="w-full bg-slate-950 text-white font-bold text-xs p-3 rounded-xl border border-slate-700 focus:border-red-500 outline-none cursor-pointer"
                  >
                    <option value="Head Office App">📱 1. Head Office App (Super Admin)</option>
                    <option value="Section Head App">📱 2. Section Head App</option>
                    <option value="Project Manager App">📱 3. Project Manager App</option>
                    <option value="Site Engineer App">📱 4. Site Engineer App</option>
                    <option value="Surveyor App">📱 5. Surveyor App (Total Station Link)</option>
                    <option value="Supervisor App">📱 6. Supervisor App</option>
                    <option value="Team Leader App">📱 7. Team Leader App</option>
                    <option value="Gang Chief App">📱 8. Gang Chief App</option>
                    <option value="Time Keeper App">📱 9. Time Keeper App (Enrollment)</option>
                    <option value="Employee App">📱 10. Employee Self-Service App</option>
                    <option value="Drone Operator App">📱 11. Drone Flight App</option>
                  </select>
                </div>
              </div>

              {/* Physical Smartphone Shell Mockup */}
              <div className="border-[8px] border-slate-950 rounded-[2.5rem] shadow-2xl bg-slate-950 text-white font-sans relative aspect-[9/18] w-full max-w-[320px] mx-auto overflow-hidden flex flex-col justify-between">
                
                {/* Device Speaker Bar & Camera Hole */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-20 flex items-center justify-center gap-1.5 px-3">
                  <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                </div>

                {/* Simulated App Header */}
                <div className="bg-red-700 text-white p-4 pt-8 text-center border-b border-red-800 z-10 flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[8px] font-mono opacity-80 mb-1">
                    <span>9:41 AM</span>
                    <span className="font-sans font-bold">Digital Construction ERP ERP Mobile</span>
                    <span>🔋 100%</span>
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-wider">{selectedMobileApp}</h4>
                  <span className="text-[9px] text-red-100 font-mono tracking-widest">
                    FIRESTORE REALTIME SYNC
                  </span>
                </div>

                {/* Smartphone Dynamic Screen Body (Scrollable) */}
                <div className="flex-1 bg-slate-950 overflow-y-auto p-4 space-y-3 scrollbar-none text-xs text-left">
                  
                  {/* --- SCREEN 1: HEAD OFFICE APP --- */}
                  {selectedMobileApp === "Head Office App" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[10px] space-y-1">
                        <p className="text-slate-400 uppercase font-black tracking-widest">Live National Dashboard</p>
                        <p className="text-white text-xs font-black">All 5 Digital Construction ERP Sites online</p>
                        <div className="w-full bg-slate-950 rounded-full h-1 mt-1">
                          <div className="bg-red-500 h-1 rounded-full w-[76%]"></div>
                        </div>
                        <p className="text-[8px] text-slate-500 mt-1">Weighted progress: 76.5%</p>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-[10px] font-black text-red-400 uppercase">Executive Controls</p>
                        <button
                          onClick={() => {
                            triggerBroadcastAlert(true);
                            onLogAction("Admin Alert Broadcasted", "Triggered live mobile safety drill alert.");
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-[10px] uppercase transition-all shadow-md cursor-pointer"
                        >
                          Dispatch National Alert
                        </button>
                        <button
                          onClick={() => {
                            setSystemSettings(prev => ({ ...prev, rbacEnforcement: "Level 4 Rigid Token Lockout" }));
                            alert("Security Lockout: Demanded immediate 2FA validation across all 11 app client tokens.");
                            onLogAction("Admin Enforced Token Reset", "Updated global security policies across mobile sessions.");
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-1.5 rounded text-[10px] uppercase transition-all border border-slate-700 cursor-pointer"
                        >
                          Lock System / Force MFA
                        </button>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono text-[9px] text-slate-300">
                        <p className="text-slate-400 uppercase font-bold">Cloud Backup Auto-Schedule</p>
                        <p>Destination: <span className="text-emerald-400">AWS Frankfurt</span></p>
                        <p>Frequency: <span className="text-white">Daily 03:00 AM</span></p>
                        <p>Recovery Objective: <span className="text-white">&lt; 15 mins</span></p>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 2: SECTION HEAD APP --- */}
                  {selectedMobileApp === "Section Head App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Assigned Sections</p>
                        <div className="bg-slate-950 p-2 rounded border border-slate-800">
                          <p className="text-white font-bold">Bole Heights Bloc B1 & B2</p>
                          <p className="text-[8px] text-slate-500">Supervisors: Fikru T., Kassa H.</p>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Awaiting Approvals</p>
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
                          <div>
                            <p className="text-white font-bold">Team Alpha Overtime</p>
                            <p className="text-[8px] text-slate-500">2.5 Hrs (15 Workers)</p>
                          </div>
                          <button
                            onClick={() => {
                              alert("Overtime approved for Team Alpha!");
                              onLogAction("Overtime Approved", "Approved 2.5 hours overtime request on Section Head App.");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            Approve
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-slate-950 p-2 rounded">
                          <div>
                            <p className="text-white font-bold">M20 Steel Tie-Rods</p>
                            <p className="text-[8px] text-slate-500">Qty: 1,500 Pcs</p>
                          </div>
                          <button
                            onClick={() => {
                              alert("Material requisition authorized!");
                              onLogAction("Material Requisition Signed", "Section Head approved 1,500 pcs steel tie-rods.");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 3: PROJECT MANAGER APP --- */}
                  {selectedMobileApp === "Project Manager App" && (
                    <div className="space-y-3">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5 text-[10px]">
                        <p className="text-slate-400 uppercase font-black text-[9px]">CAD Drawing Overlay</p>
                        <div className="border border-slate-700 rounded p-1.5 bg-slate-950 text-center font-mono">
                          <p className="text-red-400 font-bold">FormworkLayout_Floor4_B1.dwg</p>
                          <p className="text-[8px] text-slate-500 mt-1">Comparison status: 76.5% Synced</p>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2 text-[10px]">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Cycle Planner</p>
                        <button
                          onClick={() => {
                            setAiCadWorkforceOutput({
                              requiredWorkforce: 60,
                              estimatedDurationDays: 4.5,
                              zoneAssignments: "Zone A: 20 Workers, Zone B: 25 Workers, Zone C: 15 Workers"
                            });
                            alert("AI Planner: Analyzed layout. Calculated 60 workers required for Floor 5 assembly cycle.");
                            onLogAction("AI Workforce Program Generated", "Generated cycle plan for Floor 5 via PM App CAD engine.");
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold py-1.5 rounded uppercase cursor-pointer"
                        >
                          Generate AI Work Program
                        </button>
                        {aiCadWorkforceOutput && (
                          <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[9px] space-y-1">
                            <p className="text-slate-400">Target Workforce: <span className="text-white">{aiCadWorkforceOutput.requiredWorkforce} Men</span></p>
                            <p className="text-slate-400">Cycle Duration: <span className="text-white">{aiCadWorkforceOutput.estimatedDurationDays} Days</span></p>
                            <p className="text-slate-400">{aiCadWorkforceOutput.zoneAssignments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 4: SITE ENGINEER APP --- */}
                  {selectedMobileApp === "Site Engineer App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Technical Checks</p>
                        <div className="flex justify-between text-[9px] border-b border-slate-800 pb-1">
                          <span>Vertical Slope Deviation:</span>
                          <span className="text-emerald-400 font-bold">&lt; 1.2mm (Passed)</span>
                        </div>
                        <div className="flex justify-between text-[9px] border-b border-slate-800 pb-1">
                          <span>Horizontal Level tolerance:</span>
                          <span className="text-emerald-400 font-bold">1.5mm (Passed)</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span>Pre-Pour Concrete checklist:</span>
                          <span className="text-red-400 font-bold">Awaiting PM Sign-off</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Concrete Pour Readiness</p>
                        <button
                          onClick={() => {
                            setConcreteReadinessChecked(prev => ({ ...prev, panels: true, alignment: true, engineer: true }));
                            alert("Pre-pour inspection approved! Panel alignment and formwork oiling verified.");
                            onLogAction("Technical Pour Signed-off", "Approved pre-pour check for Block B1 Level 4 Area C.");
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded text-[9px] uppercase cursor-pointer"
                        >
                          Sign-off Technical Pour
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 5: SURVEYOR APP --- */}
                  {selectedMobileApp === "Surveyor App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Total Station Bluetooth Link</p>
                        <div className="flex items-center gap-1.5 bg-slate-950 p-2 rounded">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          <span className="font-mono text-[9px] text-emerald-400">Leica TS16 Connected</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Survey Coordinates (X, Y, Z)</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="text"
                            value={surveyX}
                            onChange={(e) => setSurveyX(e.target.value)}
                            placeholder="X Coordinate"
                            className="bg-slate-950 text-white font-mono text-[9px] p-1 rounded border border-slate-800 outline-none"
                          />
                          <input
                            type="text"
                            value={surveyY}
                            onChange={(e) => setSurveyY(e.target.value)}
                            placeholder="Y Coordinate"
                            className="bg-slate-950 text-white font-mono text-[9px] p-1 rounded border border-slate-800 outline-none"
                          />
                          <input
                            type="text"
                            value={surveyZ}
                            onChange={(e) => setSurveyZ(e.target.value)}
                            placeholder="Z Elevation"
                            className="bg-slate-950 text-white font-mono text-[9px] p-1 rounded border border-slate-800 outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            setDeviationStatus("Deviation Calculated: X: -0.8mm, Y: +1.1mm (Passed Tolerance)");
                            onLogAction("Survey Coordinates Submitted", `Coordinates: X:${surveyX}, Y:${surveyY}, Z:${surveyZ}. Passed calibration.`);
                            alert(`Coordinates published to Firestore! Deviation check passed: sloped variance within Leica TS16 threshold.`);
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-[9px] uppercase cursor-pointer"
                        >
                          Push Survey coordinates
                        </button>
                        {deviationStatus && (
                          <p className="text-[9px] font-mono text-emerald-400 bg-slate-950 p-1.5 rounded border border-slate-800 text-center">
                            {deviationStatus}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 6: SUPERVISOR APP --- */}
                  {selectedMobileApp === "Supervisor App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Daily Site Activity Photos</p>
                        <div className="border border-dashed border-slate-700 p-3 rounded bg-slate-950 text-center cursor-pointer hover:bg-slate-900">
                          <span className="block text-slate-500 font-mono text-[8px] mb-1">Upload Daily photo</span>
                          <span className="bg-red-700/50 text-[8px] px-1.5 py-0.5 rounded font-black uppercase">Simulate Camera</span>
                        </div>
                        <button
                          onClick={() => {
                            setAiAnalysisResult("AI PHOTO RESULT: Computer vision scanned rebar counts. Confirmed 42 rebars installed vs 42 design. Slurry seal 100% tight.");
                            alert("AI Image verification complete! Rebars matched CAD layout.");
                            onLogAction("Supervisor Site Photo Uploaded", "Simulated upload of Level 4 Zone C. Triggered computer vision check.");
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1 rounded text-[9px] uppercase cursor-pointer"
                        >
                          Run AI progress verification
                        </button>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Assigned Workers</p>
                        <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded">
                          <span>Chala B. (Welder)</span>
                          <span className="text-emerald-400 font-mono">Present</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-950 p-1.5 rounded">
                          <span>Chala Chuko (Formwork)</span>
                          <span className="text-emerald-400 font-mono">Present</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 7: TEAM LEADER APP --- */}
                  {selectedMobileApp === "Team Leader App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-slate-300">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Today's Cycle Program</p>
                        <p className="text-white font-bold">Level 4 Area C assemblies</p>
                        <p>Target panels: <span className="text-white font-black">120 panels</span></p>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Simulate Work Progress</p>
                        <button
                          onClick={() => {
                            alert("Progress updated! Level 4 Zone C panel assemblies logged: 120/120 panels completed.");
                            onLogAction("Team Leader Progress Submitted", "Logged 120 panels assembled on Level 4 Zone C.");
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded text-[9px] uppercase cursor-pointer"
                        >
                          Submit 100% Assembly Done
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 8: GANG CHIEF APP --- */}
                  {selectedMobileApp === "Gang Chief App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Fingerprint Sign Board</p>
                        <p className="text-[9px] text-slate-400 leading-tight">Gangs crew check-in via localized biometric interface.</p>
                        <button
                          onClick={() => {
                            alert("Biometric check-in logged! Worker Chala Chuko registered at 07:32 AM on site.");
                            onLogAction("Gang Chief Biometric Logged", "Simulated biometric check-in for Chala Chuko.");
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-[9px] uppercase cursor-pointer"
                        >
                          Scan Crew Member Fingerprint
                        </button>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 9: TIME KEEPER APP --- */}
                  {selectedMobileApp === "Time Keeper App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Biometric Enrollment</p>
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={registeredNewEmployeeName}
                            onChange={(e) => setRegisteredNewEmployeeName(e.target.value)}
                            placeholder="Full Name (eg. Eng. Yohannes)"
                            className="w-full bg-slate-950 text-white p-1.5 rounded border border-slate-800 outline-none font-sans"
                          />
                          <select
                            value={registeredNewEmployeeRole}
                            onChange={(e) => setRegisteredNewEmployeeRole(e.target.value)}
                            className="w-full bg-slate-950 text-white p-1.5 rounded border border-slate-800 outline-none"
                          >
                            <option value="Site Engineer">Site Engineer</option>
                            <option value="Surveyor">Surveyor</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Team Leader">Team Leader</option>
                            <option value="Gang Chief">Gang Chief</option>
                            <option value="Site Worker">Site Worker</option>
                          </select>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (!registeredNewEmployeeName) {
                                alert("Please enter the employee's name first.");
                                return;
                              }
                              setBiometricEnrollmentStatus("Face Scanned (Biometric Hash Saved)");
                              alert("Face capture registered in biometrics profile!");
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1 rounded text-[8px] uppercase cursor-pointer"
                          >
                            Scan Face
                          </button>
                          <button
                            onClick={() => {
                              if (!registeredNewEmployeeName) {
                                alert("Please enter the employee's name first.");
                                return;
                              }
                              setBiometricEnrollmentStatus("Fingerprint Registered & Encrypted");
                              alert("Fingerprint template captured and saved!");
                            }}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1 rounded text-[8px] uppercase cursor-pointer"
                          >
                            Scan Fingerprint
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            if (!registeredNewEmployeeName || biometricEnrollmentStatus === "Not Started") {
                              alert("Please fill name and capture both face and fingerprint.");
                              return;
                            }
                            onLogAction("New Employee Enrolled", `Enrolled ${registeredNewEmployeeName} as ${registeredNewEmployeeRole} with Biometrics.`);
                            alert(`Successfully synchronized new employee profile to cloud database! Role: ${registeredNewEmployeeRole}, Status: Sync Active.`);
                            setRegisteredNewEmployeeName("");
                            setBiometricEnrollmentStatus("Not Started");
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-[9px] uppercase cursor-pointer mt-1"
                        >
                          Sync Profile to Cloud Firestore
                        </button>
                        <p className="text-[8px] font-mono text-center text-slate-500">
                          Biometric State: <span className="text-red-400 font-bold">{biometricEnrollmentStatus}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 10: EMPLOYEE APP --- */}
                  {selectedMobileApp === "Employee App" && (
                    <div className="space-y-3 text-[10px] text-slate-300">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <p className="text-slate-400 uppercase font-black text-[9px]">My Self-Service Portal</p>
                        <p>Employee: <span className="text-white font-bold">Chala B. (Welder)</span></p>
                        <p>Registered Site: <span className="text-white">Bole Heights B1</span></p>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Payslip (July 2026)</p>
                        <div className="flex justify-between font-mono text-[9px] border-b border-slate-800 py-1">
                          <span>Basic Salary:</span>
                          <span className="text-white">ETB 24,000</span>
                        </div>
                        <div className="flex justify-between font-mono text-[9px] border-b border-slate-800 py-1">
                          <span>Overtime (14 Hrs):</span>
                          <span className="text-white">ETB 4,200</span>
                        </div>
                        <div className="flex justify-between font-mono text-[9px] pt-1">
                          <span className="font-bold">Total Payout:</span>
                          <span className="text-emerald-400 font-black">ETB 28,200</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SCREEN 11: DRONE OPERATOR APP --- */}
                  {selectedMobileApp === "Drone Operator App" && (
                    <div className="space-y-3 text-[10px]">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                        <p className="text-slate-400 uppercase font-black text-[9px]">DJI RTK Mission Control</p>
                        <div className="flex justify-between text-[9px]">
                          <span>Signal Link:</span>
                          <span className="text-emerald-400 font-bold">GPS RTK Fix (100%)</span>
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span>Battery Health:</span>
                          <span>92% Charged</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                        <p className="text-slate-400 uppercase font-black text-[9px]">Simulation Actions</p>
                        <button
                          onClick={() => {
                            setDroneFlightSimulating(true);
                            setDroneFlightStep("Mapping");
                            setTimeout(() => setDroneFlightStep("Image Processing"), 1500);
                            setTimeout(() => {
                              setDroneFlightStep("Done");
                              setDroneFlightSimulating(false);
                              setAiAnalysisResult("DRONE AI ANALYSIS: Orthomosaic mapping compiled. Found: 100% of Floor 4 formwork panels laid out, level accuracy within 1.4mm variance.");
                              alert("Drone flight mapping synchronized successfully!");
                              onLogAction("Drone Survey Flight Completed", "Simulated DJI Matrice 300 RTK flight scan across Block B1.");
                            }, 3000);
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded text-[9px] uppercase cursor-pointer"
                        >
                          {droneFlightSimulating ? "Flight active..." : "Simulate Auto-Pilot Scan"}
                        </button>
                        <p className="text-[8px] font-mono text-center text-slate-500">
                          Flight Status: <span className="text-emerald-400 font-bold">{droneFlightStep}</span>
                        </p>
                      </div>
                    </div>
                  )}

                </div>

                {/* Simulated Android Navigation Bar */}
                <div className="bg-slate-950 p-3 flex justify-around items-center border-t border-slate-900 text-slate-600 text-xs">
                  <span>◁</span>
                  <span className="w-3 h-3 rounded-full bg-slate-800 block"></span>
                  <span>▢</span>
                </div>
              </div>

              {/* Offline mode & synchronization widget */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono text-[10px] text-slate-300">
                <p className="text-red-400 uppercase font-bold text-[9px]">Offline Auto-Sync Policy</p>
                <p>Offline Caching: <span className="text-emerald-400">Enabled</span></p>
                <p>Conflict Resolution: <span className="text-white">LWW (Last Write Wins)</span></p>
                <div className="flex items-center gap-1.5 mt-1 bg-slate-900 p-1.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[9px] text-slate-400">Database Engine synced on cloud</span>
                </div>
              </div>
            </div>

            {/* Right Column - AI Construction Command Center Core (7 Cols) */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* AI CAD/Drone Analytics Engine */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Cpu size={14} className="text-red-600 animate-pulse" />
                  <span>{isAmharic ? "አይአይ ኮንስትራክሽን ትንተና ኮር" : "AI Construction Analytics Core"}</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Computer Vision Progress Check */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Computer Vision Formwork Check</p>
                    <div className="h-28 flex items-center justify-center bg-slate-950 rounded-lg text-center p-2 relative overflow-hidden">
                      {/* Grid effect inside scan */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.2)_1px,transparent_1px)] bg-[size:10px_10px] opacity-20"></div>
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 animate-scan"></div>
                      <p className="text-xs font-mono text-emerald-400 font-bold z-10 leading-snug">
                        {aiAnalysisResult || "Awaiting scan trigger from Mobile App emulator (Drone Flight / Supervisor Photo)..."}
                      </p>
                    </div>
                  </div>

                  {/* CAD Intelligent Alignment Check */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2 text-xs font-semibold">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Design deviation analytics</p>
                    <div className="space-y-1.5 font-mono text-[10px] pt-1">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-400">Design Thickness:</span>
                        <span className="text-slate-900 font-bold">120mm</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-400">Measured Slope variance:</span>
                        <span className="text-emerald-600 font-bold">-0.8mm</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-slate-400">Total Station Elevation:</span>
                        <span className="text-slate-950 font-bold">241.15m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pour Readiness Status:</span>
                        <span className="text-red-500 font-bold uppercase tracking-wider">Awaiting PM Sign-off</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Smart Concrete Readiness Checklist (Req 28) */}
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-500/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Smart Concrete Readiness Checklist (Req 28)</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      concreteReadinessChecked.engineer && concreteReadinessChecked.panels && concreteReadinessChecked.alignment
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-none"
                        : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                    }`}>
                      {concreteReadinessChecked.engineer && concreteReadinessChecked.panels && concreteReadinessChecked.alignment
                        ? "🟢 READY FOR CONCRETE POUR"
                        : "🔴 POUR BLOCKED: RESOLVE PENDING"}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[10px] font-bold">
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.survey}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, survey: e.target.checked })}
                      />
                      <span>Survey Approved</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.quality}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, quality: e.target.checked })}
                      />
                      <span>Quality Audited</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.panels}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, panels: e.target.checked })}
                      />
                      <span>Panels Approved</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.alignment}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, alignment: e.target.checked })}
                      />
                      <span>Alignment Ok</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.safety}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, safety: e.target.checked })}
                      />
                      <span>Safety Signed</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.materials}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, materials: e.target.checked })}
                      />
                      <span>Materials Ready</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.equipment}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, equipment: e.target.checked })}
                      />
                      <span>Equipment Ready</span>
                    </label>
                    <label className="flex items-center gap-1.5 bg-white p-2 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={concreteReadinessChecked.engineer}
                        onChange={(e) => setConcreteReadinessChecked({ ...concreteReadinessChecked, engineer: e.target.checked })}
                      />
                      <span>Engineer Sign-off</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* AI Voice Assistant Simulation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Mic size={14} className="text-red-600" />
                  <span>{isAmharic ? "አይአይ ድምፅ ረዳት ሲሙሌተር" : "AI Voice Assistant Simulator"}</span>
                </h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {isAmharic
                    ? "ስለ ግንባታው ሂደት፣ ስለ ሰራተኞች እና ስለ ኮንክሪት ዝግጁነት በድምፅ ወይም በፅሁፍ ይጠይቁ።"
                    : "Simulate speech assistant requests on mobile client devices to inspect real-time database state."}
                </p>

                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                  <button
                    onClick={() => setVoiceQuery("Today's attendance status")}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-1 px-2.5 rounded-full border cursor-pointer"
                  >
                    "Today's attendance status"
                  </button>
                  <button
                    onClick={() => setVoiceQuery("Is the concrete pour approved for Floor 4?")}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-1 px-2.5 rounded-full border cursor-pointer"
                  >
                    "Concrete readiness status?"
                  </button>
                  <button
                    onClick={() => setVoiceQuery("Are there any material shortages?")}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 py-1 px-2.5 rounded-full border cursor-pointer"
                  >
                    "Any material shortages?"
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voiceQuery}
                    onChange={(e) => setVoiceQuery(e.target.value)}
                    placeholder="Enter voice query or click quick buttons..."
                    className="flex-1 bg-slate-50 text-slate-900 text-xs p-3 rounded-xl border border-slate-300 outline-none font-sans font-semibold"
                  />
                  <button
                    onClick={() => {
                      if (!voiceQuery.trim()) return;
                      setIsVoiceActive(true);
                      setVoiceResponse("Processing voice token query...");
                      setTimeout(() => {
                        setIsVoiceActive(false);
                        if (voiceQuery.toLowerCase().includes("attendance")) {
                          setVoiceResponse("AI VOICE RESPONSE: Today, 65 workers are present on the Bole Heights site. 2 arrived late. No missing key time keeper records.");
                        } else if (voiceQuery.toLowerCase().includes("concrete") || voiceQuery.toLowerCase().includes("readiness")) {
                          setVoiceResponse("AI VOICE RESPONSE: Concrete readiness for Block B1 Floor 4 is at 98%. Approved by Surveyor and Safety Marshal. Awaiting Site Engineer final checkbox.");
                        } else if (voiceQuery.toLowerCase().includes("shortage") || voiceQuery.toLowerCase().includes("material")) {
                          setVoiceResponse("AI VOICE RESPONSE: Alert. Locking wedge pins are at 16,900 pieces, close to the safety threshold of 15,000. Recommend approving the pending PR-301 procurement request.");
                        } else {
                          setVoiceResponse(`AI VOICE RESPONSE: Here is the customized summary for your query '${voiceQuery}'. All sites are syncing perfectly. Weighted progress: 76.5%.`);
                        }
                        onLogAction("Voice Assistant Consulted", `Query: ${voiceQuery}`);
                      }, 1000);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <Mic size={13} className={isVoiceActive ? "animate-bounce" : ""} />
                    <span>Ask Assistant</span>
                  </button>
                </div>

                {voiceResponse && (
                  <div className="p-3.5 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-[8px] font-mono font-bold text-slate-400">VOICE SYNTHESIS AUDIO WAVE</span>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    </div>
                    {/* Simulated Voice Waveform */}
                    <div className="h-6 flex items-center justify-center gap-1">
                      <div className="w-1 h-3 bg-red-500 rounded-full animate-bounce-slow"></div>
                      <div className="w-1 h-5 bg-red-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-2 bg-red-500 rounded-full animate-bounce-slow"></div>
                      <div className="w-1 h-4 bg-red-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-6 bg-red-500 rounded-full animate-bounce-slow"></div>
                      <div className="w-1 h-1 bg-red-300 rounded-full animate-ping"></div>
                      <div className="w-1 h-4 bg-red-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-2 bg-red-500 rounded-full animate-bounce-slow"></div>
                      <div className="w-1 h-5 bg-red-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-3 bg-red-500 rounded-full animate-bounce-slow"></div>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 leading-relaxed font-sans italic text-center">
                      "{voiceResponse}"
                    </p>
                  </div>
                )}
              </div>

              {/* Firestore Collection Schema Browser (Req 23) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <HardDrive size={14} className="text-red-600" />
                    <span>{isAmharic ? "ክላውድ ፋየርቤዝ ስኬማ ብሮውዘር" : "Firestore 46 Collections Explorer (Req 23)"}</span>
                  </h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold uppercase border">
                    CLOUD BLUEPRINT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {isAmharic
                    ? "ለድርጅቱ የተነደፉት 46ቱንም የFirestore ስብስቦች (Collections) ዝርዝር እና መዋቅር እዚህ ይመርምሩ።"
                    : "Select a Firestore collection below to inspect its exact fields, document-level keys, encryption, and sync metrics."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select box for collections */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Collection Name</label>
                    <select
                      value={selectedDbCollection}
                      onChange={(e) => setSelectedDbCollection(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 font-bold text-xs p-2.5 rounded-xl border border-slate-300 outline-none cursor-pointer"
                    >
                      <optgroup label="Core Company & Structure">
                        <option value="companies">companies</option>
                        <option value="projects">projects</option>
                        <option value="sites">sites</option>
                        <option value="buildings">buildings</option>
                        <option value="towers">towers</option>
                        <option value="floors">floors</option>
                        <option value="floorZones">floorZones</option>
                      </optgroup>
                      <optgroup label="Aluminium Panel Database">
                        <option value="aluminumPanels">aluminumPanels</option>
                        <option value="beamPanels">beamPanels</option>
                        <option value="soffitPanels">soffitPanels</option>
                        <option value="bundles">bundles</option>
                      </optgroup>
                      <optgroup label="Workforce & Biometrics">
                        <option value="employees">employees</option>
                        <option value="attendance">attendance</option>
                        <option value="attendanceLogs">attendanceLogs</option>
                        <option value="faceTemplates">faceTemplates</option>
                        <option value="fingerprintTemplates">fingerprintTemplates</option>
                        <option value="payroll">payroll</option>
                        <option value="overtime">overtime</option>
                        <option value="undertime">undertime</option>
                        <option value="leaveRequests">leaveRequests</option>
                        <option value="departments">departments</option>
                      </optgroup>
                      <optgroup label="CAD & Survey Data">
                        <option value="surveyResults">surveyResults</option>
                        <option value="surveyPoints">surveyPoints</option>
                        <option value="cadDrawings">cadDrawings</option>
                        <option value="shopDrawings">shopDrawings</option>
                        <option value="droneFlights">droneFlights</option>
                        <option value="droneImages">droneImages</option>
                      </optgroup>
                      <optgroup label="Site Progress Logs">
                        <option value="dailyProgress">dailyProgress</option>
                        <option value="dailyPhotos">dailyPhotos</option>
                        <option value="dailyActivities">dailyActivities</option>
                        <option value="tomorrowPlans">tomorrowPlans</option>
                      </optgroup>
                      <optgroup label="Quality, Safety & Concrete">
                        <option value="qualityInspections">qualityInspections</option>
                        <option value="safetyInspections">safetyInspections</option>
                        <option value="concretePour">concretePour</option>
                      </optgroup>
                      <optgroup label="Materials & Warehousing">
                        <option value="materialRequests">materialRequests</option>
                        <option value="warehouse">warehouse</option>
                        <option value="equipment">equipment</option>
                        <option value="vehicles">vehicles</option>
                        <option value="suppliers">suppliers</option>
                        <option value="purchaseOrders">purchaseOrders</option>
                        <option value="deliveries">deliveries</option>
                      </optgroup>
                      <optgroup label="System Telemetry & Support">
                        <option value="notifications">notifications</option>
                        <option value="aiPredictions">aiPredictions</option>
                        <option value="aiReports">aiReports</option>
                        <option value="approvals">approvals</option>
                        <option value="auditLogs">auditLogs</option>
                        <option value="supportTickets">supportTickets</option>
                        <option value="settings">settings</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Schema details and live status */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-mono text-[10px] space-y-1">
                    <p className="text-slate-400 font-bold">Metadata Telemetry</p>
                    <p>Encryption: <span className="text-slate-900 font-bold">AES-256 On-disk</span></p>
                    <p>Indexing: <span className="text-emerald-600 font-bold">Composite Index Enabled</span></p>
                    <p>Rules: <span className="text-red-500 font-bold">Role-Based Restrictions Active</span></p>
                  </div>
                </div>

                {/* Firestore Schema Fields list */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-300">
                  <p className="text-red-400 font-bold mb-1.5 uppercase">Schema Structure for collection: {selectedDbCollection}</p>
                  
                  {/* Dynamic Fields definition map */}
                  {selectedDbCollection === "companies" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>companyId: <span className="text-blue-400">string (Primary Key)</span></li>
                      <li>companyName: <span className="text-blue-400">string (eg. Digital Construction ERP System)</span></li>
                      <li>logo: <span className="text-blue-400">string (Firebase Storage URI)</span></li>
                      <li>address: <span className="text-blue-400">string</span></li>
                      <li>status: <span className="text-emerald-400">string ("Active")</span></li>
                      <li>createdAt: <span className="text-blue-400">timestamp</span></li>
                      <li>createdBy: <span className="text-blue-400">string (Head Office Admin ID)</span></li>
                    </ul>
                  )}
                  {selectedDbCollection === "projects" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>projectId: <span className="text-blue-400">string (Primary Key)</span></li>
                      <li>companyId: <span className="text-blue-400">string (Foreign Key reference)</span></li>
                      <li>projectName: <span className="text-blue-400">string (eg. Bole Heights Phase 1)</span></li>
                      <li>location: <span className="text-blue-400">string (GPS coordinates / geofence)</span></li>
                      <li>status: <span className="text-blue-400">string ("Active")</span></li>
                      <li>startDate / endDate: <span className="text-blue-400">timestamp</span></li>
                    </ul>
                  )}
                  {selectedDbCollection === "employees" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>employeeId: <span className="text-blue-400">string (Primary Key)</span></li>
                      <li>fullName: <span className="text-blue-400">string</span></li>
                      <li>role: <span className="text-blue-400">string (Enum UserRole)</span></li>
                      <li>fingerprintRegistered: <span className="text-emerald-400">boolean</span></li>
                      <li>faceRegistered: <span className="text-emerald-400">boolean</span></li>
                      <li>teamLeaderId: <span className="text-blue-400">string</span></li>
                      <li>status: <span className="text-blue-400">string ("Active")</span></li>
                    </ul>
                  )}
                  {selectedDbCollection === "attendance" && (
                    <ul className="space-y-1 list-disc list-inside">
                      <li>attendanceId: <span className="text-blue-400">string (Primary Key)</span></li>
                      <li>employeeId: <span className="text-blue-400">string (Foreign Key)</span></li>
                      <li>date: <span className="text-blue-400">string (YYYY-MM-DD)</span></li>
                      <li>checkInTime / checkOutTime: <span className="text-blue-400">timestamp</span></li>
                      <li>gpsVerified / biometricVerified: <span className="text-emerald-400">boolean</span></li>
                      <li>overtimeHours / lateReason: <span className="text-blue-400">number / string</span></li>
                    </ul>
                  )}
                  {/* General Schema fallback for other collections */}
                  {!["companies", "projects", "employees", "attendance"].includes(selectedDbCollection) && (
                    <div className="space-y-1">
                      <p className="text-slate-400 italic">Continuous Enterprise Structure Schema keys loaded:</p>
                      <ul className="space-y-1 list-disc list-inside text-slate-300">
                        <li>createdBy: <span className="text-blue-400">string (User UID)</span></li>
                        <li>updatedBy: <span className="text-blue-400">string (User UID)</span></li>
                        <li>createdAt / updatedAt: <span className="text-blue-400">timestamp</span></li>
                        <li>companyID / projectID / siteID: <span className="text-blue-400">string (Scope Isolation Keys)</span></li>
                        <li>activeStatus: <span className="text-emerald-400">boolean (Lombard soft-delete status)</span></li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile App signed package release hub (Req 8) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                  <Smartphone size={14} className="text-red-600" />
                  <span>{isAmharic ? "ሞባይል አፕሊኬሽን ምርት ግንባታ ማዕከል" : "Flutter Mobile App Signed Release Hub (Req 8)"}</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  {/* Android Platform builds */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Android (Google Play)</span>
                      <span className="text-emerald-600 font-bold">Signed Build</span>
                    </p>
                    <div className="space-y-1.5 font-mono text-[9px]">
                      <div className="flex justify-between border-b pb-1">
                        <span>AAB Package:</span>
                        <span className="text-slate-900 font-bold">Digital Construction ERP_ERP_v2.4.aab</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>APK Signed:</span>
                        <span className="text-slate-900 font-bold">Digital Construction ERP_ERP_Production_Release.apk</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Keystore Alias:</span>
                        <span className="text-slate-950 font-bold">digital-construction-release-key</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Splash Screen:</span>
                        <span className="text-emerald-600 font-bold">Ready (G+12 Render Logo)</span>
                      </div>
                    </div>
                  </div>

                  {/* iOS Platform builds */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>iOS (Apple App Store)</span>
                      <span className="text-emerald-600 font-bold">Signed Build</span>
                    </p>
                    <div className="space-y-1.5 font-mono text-[9px]">
                      <div className="flex justify-between border-b pb-1">
                        <span>IPA Package:</span>
                        <span className="text-slate-900 font-bold">Digital Construction ERP_ERP_Release_signed.ipa</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>Certificates:</span>
                        <span className="text-slate-900 font-bold">Apple Distribution (July 2026)</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span>App Store Review:</span>
                        <span className="text-slate-950 font-bold">Pre-pour verified test account demo</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Store Screenshots:</span>
                        <span className="text-emerald-600 font-bold">Uploaded (All 11 App Roles)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- 15. USER FEEDBACK, REVIEW & CUSTOMER EXPERIENCE CORE --- */}
      {activeSubTab === "feedback" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-red-500/20 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-[10px] font-black tracking-widest uppercase">
                    {isAmharic ? "ቀጣይነት ያለው ማሻሻያ" : "CONTINUOUS IMPROVEMENT"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-green-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    {isAmharic ? "ግብረመልስ ማዕከል ክፍት ነው" : "Feedback Hub Active & Secured"}
                  </span>
                </div>
                <h3 className="text-xl font-black font-sans tracking-tight">
                  {isAmharic ? "Digital Construction ERP የግብረመልስና የደንበኛ ተሞክሮ (CX) ማዕከል" : "Digital Construction ERP Customer Experience & User Feedback System"}
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl">
                  {isAmharic
                    ? "ሰራተኞች፣ መሀንዲሶች እና ባለድርሻ አካላት ስለ ዲጂታል ኮንስትራክሽን ERP ድርጅት፣ ግንባታ ሂደቶች እና ስለ ERP አፕሊኬሽኑ አስተያየት የሚሰጡበት፣ ደረጃ የሚሰጡበት እና ችግሮች የሚፈቱበት የላቀ ሲስተም።"
                    : "A cross-organization pipeline for employees, engineers, and clients to log system issues, submit organizational reviews, upload photo/voice evidence, and trigger AI-powered sentiment & priority analysis."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center font-mono">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Average Rating</span>
                  <span className="text-xs font-black text-emerald-400">4.4 / 5.0 ⭐</span>
                </div>
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center font-mono">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Open Tickets</span>
                  <span className="text-xs font-black text-red-400">
                    {feedbacks.filter(f => f.status !== "Closed").length} Active
                  </span>
                </div>
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center font-mono">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Sentiment Health</span>
                  <span className="text-xs font-black text-blue-400">82% Positive</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg text-red-600">
                <Star size={18} className="fill-current" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{isAmharic ? "አጠቃላይ አስተያየቶች" : "Total Submissions"}</p>
                <h4 className="text-lg font-black text-slate-900">{feedbacks.length}</h4>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{isAmharic ? "ወሳኝ የሆኑ ጉዳዮች" : "Critical & High Tickets"}</p>
                <h4 className="text-lg font-black text-slate-900">
                  {feedbacks.filter(f => f.priority === "Critical" || f.priority === "High").length}
                </h4>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                <CheckCircle size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{isAmharic ? "የተፈቱ ችግሮች" : "Resolved & Closed"}</p>
                <h4 className="text-lg font-black text-slate-900">
                  {feedbacks.filter(f => f.status === "Action Taken" || f.status === "Closed").length}
                </h4>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{isAmharic ? "የአይአይ እርዳታ" : "AI Sentiment Index"}</p>
                <h4 className="text-lg font-black text-slate-900">0.81 (Good)</h4>
              </div>
            </div>
          </div>

          {/* Double Column: Left is Submission Form, Right is Admin Feedbacks List */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* Left Panel: Submission Form (5 columns) */}
            <div className="xl:col-span-5 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus size={16} className="text-red-600" />
                      <span>{isAmharic ? "አዲስ ግብረመልስ አስገባ" : "Submit New Feedback"}</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">{isAmharic ? "አስተያየትዎን፣ ጥያቄዎን ወይም ቅሬታዎን እዚህ ይሙሉ" : "Voice your ideas, concerns, or technical issues"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-mono text-slate-600">
                    ERP-CX-TICKET
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Name Input & Anonymous toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የአስተያየት ሰጪ ስም" : "Your Full Name"}</label>
                      <input
                        type="text"
                        disabled={feedbackAnonymous}
                        value={feedbackAnonymous ? (isAmharic ? "ስም-አልባ (ማንነቱ ያልታወቀ)" : "Anonymous Employee") : feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder={isAmharic ? "ሙሉ ስምዎን ያስገቡ" : "eg. Eng. Yoseph"}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500 disabled:opacity-60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "ማንነት አይታወቅ (Anonymous)" : "Anonymous Mode"}</label>
                      <div className="flex items-center h-[38px]">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-xl border border-slate-200 w-full justify-between">
                          <span className="text-[10px] font-bold text-slate-600">{feedbackAnonymous ? (isAmharic ? "በርቷል" : "On") : (isAmharic ? "ጠፍቷል" : "Off")}</span>
                          <input
                            type="checkbox"
                            checked={feedbackAnonymous}
                            onChange={(e) => {
                              setFeedbackAnonymous(e.target.checked);
                              if (e.target.checked) {
                                setFeedbackName("");
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {feedbackAnonymous && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[9px] text-amber-800 font-semibold leading-tight">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p>
                        {isAmharic
                          ? "ማስጠንቀቂያ፦ ስም-አልባ ሁነታ ሲበራ የእርስዎ ስም እና ሚና ለተራ ተጠቃሚዎች አይታይም። ነገር ግን፣ ለዋና አስተዳዳሪዎች (Head Office) ብቻ ሚስጥራዊ በሆነ መልኩ ይቀመጣል።"
                          : "Privacy Shield: Anonymous submissions mask your profile from coworkers, but maintain high-level safety traceability for Head Office Admins."}
                      </p>
                    </div>
                  )}

                  {/* Feedback Type and Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የግብረመልስ አይነት" : "Feedback Type"}</label>
                      <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value)}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500 cursor-pointer font-bold"
                      >
                        <option value="System">💻 {isAmharic ? "የሲስተም / አፕ ግብረመልስ" : "System / App Performance"}</option>
                        <option value="Organization">🏢 {isAmharic ? "የድርጅት / የስራ አካባቢ" : "Digital Construction ERP Organization"}</option>
                        <option value="Construction">🏗️ {isAmharic ? "የግንባታ ሳይት ስራ" : "Construction Site Operations"}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "ምድብ (Category)" : "Category"}</label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500 cursor-pointer font-bold"
                      >
                        <option value="Technical">{isAmharic ? "ቴክኒካል" : "Technical"}</option>
                        <option value="Management">{isAmharic ? "አመራርና አስተዳደር" : "Management"}</option>
                        <option value="Safety">{isAmharic ? "ደህንነትና ጤና" : "Safety"}</option>
                        <option value="Quality">{isAmharic ? "የጥራት ደረጃ" : "Quality"}</option>
                        <option value="Attendance">{isAmharic ? "የመገኘት ክትትል" : "Attendance"}</option>
                        <option value="Payroll">{isAmharic ? "ደመወዝ / ክፍያ" : "Payroll"}</option>
                        <option value="Materials">{isAmharic ? "ማቴሪያልና ግብዓት" : "Materials"}</option>
                        <option value="Training">{isAmharic ? "ስልጠናና ብቃት" : "Training"}</option>
                        <option value="Other">{isAmharic ? "ሌላ አስተያየት" : "Other"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject and Priority */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የጉዳዩ ርዕስ" : "Subject"}</label>
                      <input
                        type="text"
                        value={feedbackSubject}
                        onChange={(e) => setFeedbackSubject(e.target.value)}
                        placeholder={isAmharic ? "አጭር ርዕስ ያስገቡ" : "Brief headline of your feedback"}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "ቅድሚያ ደረጃ" : "Priority"}</label>
                      <select
                        value={feedbackPriority}
                        onChange={(e) => setFeedbackPriority(e.target.value)}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500 cursor-pointer font-bold"
                      >
                        <option value="Low">🟢 {isAmharic ? "ዝቅተኛ" : "Low"}</option>
                        <option value="Medium">🟡 {isAmharic ? "መካከለኛ" : "Medium"}</option>
                        <option value="High">🟠 {isAmharic ? "ከፍተኛ" : "High"}</option>
                        <option value="Critical">🔴 {isAmharic ? "ወሳኝ" : "Critical"}</option>
                      </select>
                    </div>
                  </div>

                  {/* Description text area */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "ዝርዝር መግለጫ" : "Detailed Description"}</label>
                    <textarea
                      value={feedbackDescription}
                      onChange={(e) => setFeedbackDescription(e.target.value)}
                      placeholder={isAmharic ? "ጉዳዩን በዝርዝር እዚህ ይግለጹ..." : "Please describe your observation, request, or issue clearly..."}
                      rows={3}
                      className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500 resize-none"
                    ></textarea>
                  </div>

                  {/* Interactive Star Ratings Form (1-5 Stars) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-3">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      {isAmharic ? "⭐ ዝርዝር ደረጃ ስጥ (Star Ratings)" : "⭐ Detailed Rating System"}
                    </p>
                    
                    {feedbackType === "System" ? (
                      /* Render System App Ratings fields */
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "አጠቃቀም ቀላልነት" : "Ease of Use"} ({easeOfUseRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setEaseOfUseRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= easeOfUseRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "የሲስተም ፍጥነት" : "App Speed / Latency"} ({speedRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setSpeedRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= speedRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "አስተማማኝነት" : "System Reliability"} ({reliabilityRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setReliabilityRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= reliabilityRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "የበይነገጽ ውበት (UI Design)" : "Aesthetic UI Design"} ({designRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setDesignRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= designRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-2 space-y-1 border-t pt-2 mt-1">
                          <span className="text-slate-500 block">{isAmharic ? "የአይአይና ሌሎች ባህሪያት" : "AI Features & Capabilities"} ({featuresRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setFeaturesRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= featuresRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Render Organization & Work environment Ratings fields */
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "የአመራር ጥራት" : "Leadership & Mgmt"} ({managementRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setManagementRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= managementRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "ግንኙነትና መረጃ ፍሰት" : "Team Communication"} ({communicationRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setCommunicationRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= communicationRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "ድጋፍና እገዛ" : "HQ Support & Response"} ({supportRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setSupportRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= supportRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 block">{isAmharic ? "የስራ ቦታ ድባብ" : "Workplace Environment"} ({workEnvironmentRating})</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button
                                key={val}
                                onClick={() => setWorkEnvironmentRating(val)}
                                className="text-amber-500 hover:scale-115 transition-all cursor-pointer"
                              >
                                <Star size={14} className={val <= workEnvironmentRating ? "fill-amber-400 text-amber-500" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multimedia attachments: Image and simulated voice recorder */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Simulated Voice Message Recorder */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">{isAmharic ? "🎙️ የድምፅ መልዕክት መቅጃ" : "🎙️ Voice Message Recorder"}</p>
                      
                      {isRecordingAudio ? (
                        <div className="py-1 flex items-center justify-between gap-1.5">
                          {/* Recording waves simulation */}
                          <div className="flex items-center gap-0.5 h-6">
                            <span className="w-1 h-3 bg-red-600 rounded-full animate-pulse"></span>
                            <span className="w-1 h-5 bg-red-600 rounded-full animate-bounce"></span>
                            <span className="w-1 h-4 bg-red-600 rounded-full animate-pulse"></span>
                            <span className="w-1 h-2 bg-red-600 rounded-full"></span>
                            <span className="w-1 h-5 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-1 h-3 bg-red-600 rounded-full animate-pulse"></span>
                          </div>
                          <span className="font-mono text-[10px] text-red-600 font-bold">0:{recordedAudioDuration < 10 ? `0${recordedAudioDuration}` : recordedAudioDuration}s</span>
                          <button
                            onClick={() => {
                              if (recordingIntervalId) {
                                clearInterval(recordingIntervalId);
                              }
                              setIsRecordingAudio(false);
                              setAudioSimulationAttached(true);
                              alert("Voice message recorded and encrypted in cache buffer.");
                            }}
                            className="bg-red-700 text-white font-black text-[9px] px-2 py-1 rounded cursor-pointer hover:bg-red-800"
                          >
                            Stop
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setIsRecordingAudio(true);
                              setRecordedAudioDuration(0);
                              const interval = setInterval(() => {
                                setRecordedAudioDuration(prev => {
                                  if (prev >= 59) {
                                    clearInterval(interval);
                                    setIsRecordingAudio(false);
                                    setAudioSimulationAttached(true);
                                    return 59;
                                  }
                                  return prev + 1;
                                });
                              }, 1000);
                              setRecordingIntervalId(interval);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Mic size={11} />
                            <span>{isAmharic ? "ቀዳ ጀምር" : "Record Voice"}</span>
                          </button>
                          {audioSimulationAttached && (
                            <span className="text-[9px] text-green-600 font-black">✓ Voice_0:18.mp3</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Camera Upload Attachment Simulation */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">{isAmharic ? "📷 ፎቶ/ቪዲዮ ማስረጃ ማያያዣ" : "📷 Photo/Video Attachment"}</p>
                      
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setPhotoSimulationAttached(true);
                            setPhotoPreviewName("IMG_SITE_AUDIT_7621.jpg");
                            alert("Simulated camera captures/uploads IMG_SITE_AUDIT_7621.jpg successfully.");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer w-full justify-center"
                        >
                          <Smartphone size={11} />
                          <span>{isAmharic ? "ካሜራ ክፈት" : "Simulate Capture"}</span>
                        </button>
                      </div>
                      {photoSimulationAttached && (
                        <span className="text-[8px] text-green-600 font-mono truncate block max-w-full">
                          ✓ {photoPreviewName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission triggers */}
                  <button
                    onClick={() => {
                      if (!feedbackSubject || !feedbackDescription) {
                        alert(isAmharic ? "እባክዎ የጉዳዩን ርዕስ እና ዝርዝር መግለጫ ይሙሉ" : "Please fill out both the Subject and Detailed Description.");
                        return;
                      }

                      // Dynamic NLP analysis based on subject/desc length and keywords
                      const isNeg = feedbackDescription.toLowerCase().includes("slow") || 
                                    feedbackDescription.toLowerCase().includes("danger") || 
                                    feedbackDescription.toLowerCase().includes("unsafe") || 
                                    feedbackDescription.toLowerCase().includes("delay") || 
                                    feedbackDescription.toLowerCase().includes("problem") ||
                                    feedbackDescription.toLowerCase().includes("ቅሬታ") ||
                                    feedbackDescription.toLowerCase().includes("ችግር");
                      const isPos = feedbackDescription.toLowerCase().includes("excellent") || 
                                    feedbackDescription.toLowerCase().includes("good") || 
                                    feedbackDescription.toLowerCase().includes("smooth") || 
                                    feedbackDescription.toLowerCase().includes("ምርጥ") ||
                                    feedbackDescription.toLowerCase().includes("ደስ ይላል");

                      let sentiment = "Neutral";
                      let score = 0.5;
                      if (isNeg) { sentiment = "Negative"; score = 0.21; }
                      if (isPos) { sentiment = "Positive"; score = 0.89; }

                      const calculatedRatings = feedbackType === "System" 
                        ? { easeOfUse: easeOfUseRating, speed: speedRating, reliability: reliabilityRating, design: designRating, features: featuresRating, management: 4, communication: 4, support: 4, workEnvironment: 4 }
                        : { easeOfUse: 4, speed: 4, reliability: 4, design: 4, features: 4, management: managementRating, communication: communicationRating, support: supportRating, workEnvironment: workEnvironmentRating };

                      const newTicket = {
                        id: `FB-00${feedbacks.length + 1}`,
                        userName: feedbackAnonymous ? (isAmharic ? "ስም-አልባ ሰራተኛ" : "Anonymous Employee") : (feedbackName || "Digital Construction ERP Staff Member"),
                        userRole: currentUserRole,
                        project: "Bole Heights Bloc B1",
                        site: "Bole Heights",
                        category: feedbackCategory,
                        type: feedbackType,
                        subject: feedbackSubject,
                        description: feedbackDescription,
                        priority: feedbackPriority,
                        status: "Open",
                        ratings: calculatedRatings,
                        anonymous: feedbackAnonymous,
                        assignedDepartment: "Pending HQ Assignment",
                        comments: [],
                        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
                        attachment: photoSimulationAttached ? photoPreviewName : (audioSimulationAttached ? "voice_note.wav" : ""),
                        hasAudio: audioSimulationAttached,
                        audioDuration: audioSimulationAttached ? `0:${recordedAudioDuration}` : undefined,
                        sentiment: sentiment,
                        sentimentScore: score,
                        aiAnalysis: {
                          detectedProblems: `Keywords: ${feedbackCategory}, Priority level indicated as ${feedbackPriority}.`,
                          priorityRecommendation: feedbackPriority,
                          suggestedAction: `Initialize routing to designated department based on requested Category: ${feedbackCategory}.`
                        }
                      };

                      setFeedbacks([newTicket, ...feedbacks]);
                      onLogAction("Feedback Submitted Successfully", `Ticket ${newTicket.id} with Priority ${feedbackPriority} created.`);
                      alert(isAmharic ? "ግብረመልስዎ በስኬት ተመዝግቧል! ወደ ዋናው ሰሌዳ ተልኳል።" : "Feedback ticket created successfully! Distributed to Head Office and routing pipelines.");
                      
                      // Reset Form states
                      setFeedbackSubject("");
                      setFeedbackDescription("");
                      setFeedbackName("");
                      setFeedbackAnonymous(false);
                      setAudioSimulationAttached(false);
                      setPhotoSimulationAttached(false);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer text-center"
                  >
                    {isAmharic ? "ግብረመልስ ወደ ሲስተሙ ላክ" : "Submit & Distribute Ticket"}
                  </button>
                </div>
              </div>

              {/* Active notifications triggered mockup */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-white space-y-2.5">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center justify-between">
                  <span>{isAmharic ? "የግብረመልስ ማስጠንቀቂያ ማሳወቂያዎች" : "CX Ticket Notifications"}</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-bold">📨 Head Office SMS Alert</span>
                      <span>Now</span>
                    </div>
                    <p className="text-white font-semibold">New Critical Safety Ticket created from Bole Heights B2 (Anonymous)</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-bold">🔔 System Push Notification</span>
                      <span>15m ago</span>
                    </div>
                    <p className="text-white font-semibold">System Admin replied to Leica TS16 Bluetooth latency ticket FB-001</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Tickets View & AI Analytics (7 columns) */}
            <div className="xl:col-span-7 space-y-6">
              
              {/* Toggle Admin Control View vs AI Insights */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setShowAiInsightsTab(false)}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !showAiInsightsTab 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  📂 {isAmharic ? "አጠቃላይ አስተያየቶችና አስተዳደር" : "Continuous Improvement Logs"}
                </button>
                <button
                  onClick={() => setShowAiInsightsTab(true)}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    showAiInsightsTab 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Cpu size={14} className="text-red-500 animate-pulse" />
                  <span>🤖 {isAmharic ? "የአይአይ ትንተናና የዳሰሳ ጥናት" : "AI Sentiment & CX Analytics"}</span>
                </button>
              </div>

              {!showAiInsightsTab ? (
                /* MAIN LOGS TAB */
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  
                  {/* Search and filter bar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={feedbackSearch}
                        onChange={(e) => setFeedbackSearch(e.target.value)}
                        placeholder={isAmharic ? "በቁልፍ ቃል ፈልግ..." : "Search feedbacks by keyword..."}
                        className="w-full bg-slate-50 text-slate-900 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-red-500"
                      />
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={feedbackCategoryFilter}
                        onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
                        className="bg-slate-50 text-slate-900 text-xs p-2 rounded-xl border border-slate-200 outline-none cursor-pointer font-bold"
                      >
                        <option value="All">{isAmharic ? "ሁሉም ምድብ" : "All Categories"}</option>
                        <option value="Technical">Technical</option>
                        <option value="Safety">Safety</option>
                        <option value="Materials">Materials</option>
                        <option value="Management">Management</option>
                      </select>
                      
                      <select
                        value={feedbackPriorityFilter}
                        onChange={(e) => setFeedbackPriorityFilter(e.target.value)}
                        className="bg-slate-50 text-slate-900 text-xs p-2 rounded-xl border border-slate-200 outline-none cursor-pointer font-bold"
                      >
                        <option value="All">{isAmharic ? "ሁሉም ቅድሚያ" : "All Priorities"}</option>
                        <option value="Critical">🔴 Critical</option>
                        <option value="High">🟠 High</option>
                        <option value="Medium">🟡 Medium</option>
                        <option value="Low">🟢 Low</option>
                      </select>

                      <button
                        onClick={() => {
                          const filteredFeedbacks = feedbacks.filter(f => {
                            const matchesSearch = f.subject.toLowerCase().includes(feedbackSearch.toLowerCase()) || f.description.toLowerCase().includes(feedbackSearch.toLowerCase());
                            const matchesCategory = feedbackCategoryFilter === "All" || f.category === feedbackCategoryFilter;
                            const matchesPriority = feedbackPriorityFilter === "All" || f.priority === feedbackPriorityFilter;
                            return matchesSearch && matchesCategory && matchesPriority;
                          });

                          const headers = ["Ticket ID", "Subject", "Description", "Type", "Category", "Priority", "Status", "User Name", "User Role", "Project", "Site", "Assigned Department", "Created At", "Sentiment", "Sentiment Score"];
                          const csvRows = [headers.join(",")];
                          
                          for (const f of filteredFeedbacks) {
                            const values = [
                              f.id,
                              `"${f.subject.replace(/"/g, '""')}"`,
                              `"${f.description.replace(/"/g, '""')}"`,
                              f.type,
                              f.category,
                              f.priority,
                              f.status,
                              `"${f.userName.replace(/"/g, '""')}"`,
                              `"${f.userRole.replace(/"/g, '""')}"`,
                              `"${f.project.replace(/"/g, '""')}"`,
                              `"${f.site.replace(/"/g, '""')}"`,
                              `"${f.assignedDepartment.replace(/"/g, '""')}"`,
                              f.createdAt,
                              f.sentiment,
                              f.sentimentScore
                            ];
                            csvRows.push(values.join(","));
                          }
                          
                          const csvContent = "\uFEFF" + csvRows.join("\n");
                          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.setAttribute("href", url);
                          link.setAttribute("download", `Digital Construction ERP_ERP_Feedback_Report_${new Date().toISOString().substring(0,10)}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);

                          onLogAction("Feedback Exported to CSV", `${filteredFeedbacks.length} tickets exported.`);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
                        title={isAmharic ? "ግብረመልሶችን በCSV ፋይል አውርድ" : "Export current logs to CSV file"}
                      >
                        <Download size={13} />
                        <span>{isAmharic ? "ሪፖርት አውርድ" : "Download Report"}</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Feedback Tickets */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-none pr-1">
                    {feedbacks
                      .filter(f => {
                        const matchesSearch = f.subject.toLowerCase().includes(feedbackSearch.toLowerCase()) || f.description.toLowerCase().includes(feedbackSearch.toLowerCase());
                        const matchesCategory = feedbackCategoryFilter === "All" || f.category === feedbackCategoryFilter;
                        const matchesPriority = feedbackPriorityFilter === "All" || f.priority === feedbackPriorityFilter;
                        return matchesSearch && matchesCategory && matchesPriority;
                      })
                      .map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => {
                            setSelectedFeedbackForDetails(ticket);
                            setAdminAssignedDept(ticket.assignedDepartment);
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left space-y-2.5 ${
                            selectedFeedbackForDetails?.id === ticket.id
                              ? "bg-red-50/40 border-red-200 shadow-sm"
                              : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] text-red-600 font-bold">{ticket.id}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  ticket.priority === "Critical" ? "bg-red-100 text-red-800" :
                                  ticket.priority === "High" ? "bg-amber-100 text-amber-800" :
                                  ticket.priority === "Medium" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-800"
                                }`}>
                                  {ticket.priority}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[8px] font-bold">
                                  {ticket.category}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">{ticket.createdAt}</span>
                              </div>
                              <h4 className="text-xs font-black text-slate-900">{ticket.subject}</h4>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ticket.status === "Open" ? "bg-slate-100 text-slate-800 border" :
                              ticket.status === "Assigned" ? "bg-blue-100 text-blue-800" :
                              ticket.status === "In Review" ? "bg-amber-100 text-amber-800 animate-pulse" :
                              ticket.status === "Action Taken" ? "bg-emerald-100 text-emerald-800" : "bg-emerald-200 text-emerald-900"
                            }`}>
                              {ticket.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ticket.description}</p>

                          <div className="flex justify-between items-center text-[10px] text-slate-500 border-t pt-2 border-slate-200/50">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center text-[8px] text-red-700 font-black">
                                {ticket.userName[0].toUpperCase()}
                              </span>
                              <span>{ticket.userName} ({ticket.userRole})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {ticket.hasAudio && <span className="text-red-500 font-black">🎙️ Audio Attached</span>}
                              {ticket.attachment && <span className="text-slate-400 font-mono text-[9px]">📎 {ticket.attachment}</span>}
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                ticket.sentiment === "Positive" ? "bg-emerald-100 text-emerald-700" :
                                ticket.sentiment === "Negative" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                              }`}>
                                {ticket.sentiment} ({Math.round(ticket.sentimentScore * 100)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {feedbacks.length === 0 && (
                      <p className="text-slate-400 text-xs italic text-center py-6">No feedback records found matching filters.</p>
                    )}
                  </div>

                  {/* Detailing view & Head Office response Workflow */}
                  {selectedFeedbackForDetails && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4 text-left">
                      <div className="border-b pb-3 flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            {isAmharic ? "ቲኬት አስተዳደር ማረጋገጫ" : "Detailed Ticket Information"} — <span className="font-mono">{selectedFeedbackForDetails.id}</span>
                          </p>
                          <h4 className="text-xs font-black text-slate-900">{selectedFeedbackForDetails.subject}</h4>
                          <p className="text-[10px] text-slate-500">{isAmharic ? "ከ " : "By "}<span className="text-red-600 font-bold">{selectedFeedbackForDetails.userName}</span> ({selectedFeedbackForDetails.userRole}) | Project: {selectedFeedbackForDetails.project}</p>
                        </div>
                        <button
                          onClick={() => setSelectedFeedbackForDetails(null)}
                          className="text-xs text-slate-400 hover:text-slate-900 font-black cursor-pointer"
                        >
                          ✕ Close Detail
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200/50">
                          <p className="font-bold text-[9px] uppercase text-slate-400 mb-1">{isAmharic ? "ዋና ዝርዝር መግለጫ" : "Core Description"}</p>
                          {selectedFeedbackForDetails.description}
                        </div>

                        {/* Ratings Breakdown Grid */}
                        <div className="bg-white p-3 rounded-lg border border-slate-200/50 space-y-2">
                          <p className="font-bold text-[9px] uppercase text-slate-400">{isAmharic ? "የደረጃ አሰጣጥ ውጤቶች (Ratings Detail)" : "User Sentiment Ratings Scoreboard"}</p>
                          <div className="grid grid-cols-3 gap-2.5 text-[9px] font-bold text-slate-600">
                            {selectedFeedbackForDetails.type === "System" ? (
                              <>
                                <div className="bg-slate-50 p-1.5 rounded text-center">
                                  <span className="block text-slate-400 text-[8px] uppercase">Ease of use</span>
                                  <span className="text-amber-600">⭐ {selectedFeedbackForDetails.ratings.easeOfUse} / 5</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded text-center">
                                  <span className="block text-slate-400 text-[8px] uppercase">App speed</span>
                                  <span className="text-amber-600">⭐ {selectedFeedbackForDetails.ratings.speed} / 5</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded text-center">
                                  <span className="block text-slate-400 text-[8px] uppercase">Reliability</span>
                                  <span className="text-amber-600">⭐ {selectedFeedbackForDetails.ratings.reliability} / 5</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bg-slate-50 p-1.5 rounded text-center">
                                  <span className="block text-slate-400 text-[8px] uppercase">Management</span>
                                  <span className="text-amber-600">⭐ {selectedFeedbackForDetails.ratings.management} / 5</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded text-center">
                                  <span className="block text-slate-400 text-[8px] uppercase">Communication</span>
                                  <span className="text-amber-600">⭐ {selectedFeedbackForDetails.ratings.communication} / 5</span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded text-center">
                                  <span className="block text-slate-400 text-[8px] uppercase">Support</span>
                                  <span className="text-amber-600">⭐ {selectedFeedbackForDetails.ratings.support} / 5</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Taken and Replies Log */}
                        <div className="space-y-2">
                          <p className="font-bold text-[9px] uppercase text-slate-400">{isAmharic ? "የአስተዳዳሪ ምላሾችና የጉዳዩ ሂደት" : "Admin Actions & Response Feed"}</p>
                          
                          <div className="space-y-1.5">
                            {selectedFeedbackForDetails.comments.map((c: any, index: number) => (
                              <div key={index} className="p-2.5 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-100 text-[10px] space-y-1">
                                <div className="flex justify-between font-bold">
                                  <span>💬 {c.author} ({c.role})</span>
                                  <span>{c.date}</span>
                                </div>
                                <p className="font-medium">{c.text}</p>
                              </div>
                            ))}
                            {selectedFeedbackForDetails.comments.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic">{isAmharic ? "እስካሁን ምንም ምላሽ አልተሰጠም።" : "No official management responses logged yet."}</p>
                            )}
                          </div>
                        </div>

                        {/* Head Office Action Controls panel */}
                        <div className="p-3 bg-red-50/40 border border-red-500/10 rounded-xl space-y-3 pt-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-red-700 uppercase tracking-wider">
                            <Sliders size={14} />
                            <span>{isAmharic ? "የዋና መስሪያ ቤት (HQ) የአስተዳደር መቆጣጠሪያ" : "Head Office Response Workflow"}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Responsible Department</label>
                              <select
                                value={adminAssignedDept}
                                onChange={(e) => setAdminAssignedDept(e.target.value)}
                                className="w-full bg-white text-slate-900 text-[10px] p-2 rounded-lg border outline-none font-bold cursor-pointer"
                              >
                                <option value="IT & Digital Infrastructure">IT & Digital Infrastructure</option>
                                <option value="HSE Safety Department">HSE Safety Department</option>
                                <option value="Procurement & Materials Supply">Procurement & Materials Supply</option>
                                <option value="Project Management Office">Project Management Office</option>
                                <option value="Human Resources & Payroll">Human Resources & Payroll</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Update Ticket Status</label>
                              <div className="flex gap-1.5">
                                {["Open", "Assigned", "In Review", "Action Taken", "Closed"].map((st) => (
                                  <button
                                    key={st}
                                    onClick={() => {
                                      setFeedbacks(prev => prev.map(f => {
                                        if (f.id === selectedFeedbackForDetails.id) {
                                          const updated = { ...f, status: st, assignedDepartment: adminAssignedDept };
                                          setSelectedFeedbackForDetails(updated);
                                          return updated;
                                        }
                                        return f;
                                      }));
                                      onLogAction("Ticket Status Updated", `Updated ticket ${selectedFeedbackForDetails.id} status to ${st}`);
                                    }}
                                    className={`flex-1 text-[9px] font-black py-1.5 rounded transition-all cursor-pointer ${
                                      selectedFeedbackForDetails.status === st
                                        ? "bg-red-600 text-white shadow-xs"
                                        : "bg-white text-slate-600 hover:bg-slate-100 border"
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Write Comment / Response */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Add Response / Resolution Message</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={adminCommentText}
                                onChange={(e) => setAdminCommentText(e.target.value)}
                                placeholder="Type resolution or update description..."
                                className="flex-1 bg-white text-slate-900 text-xs p-2 rounded-lg border outline-none"
                              />
                              <button
                                onClick={() => {
                                  if (!adminCommentText) return;
                                  const comment = {
                                    author: "Nuriye Ahmed Adem (HQ Lead)",
                                    role: "Super Admin",
                                    text: adminCommentText,
                                    date: new Date().toISOString().replace('T', ' ').substring(0, 16)
                                  };
                                  setFeedbacks(prev => prev.map(f => {
                                    if (f.id === selectedFeedbackForDetails.id) {
                                      const updated = {
                                        ...f,
                                        comments: [...f.comments, comment],
                                        assignedDepartment: adminAssignedDept
                                      };
                                      setSelectedFeedbackForDetails(updated);
                                      return updated;
                                    }
                                    return f;
                                  }));
                                  setAdminCommentText("");
                                  onLogAction("Admin Ticket Comment Added", `Replied to ticket ${selectedFeedbackForDetails.id}.`);
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white font-black px-3 rounded-lg text-xs cursor-pointer"
                              >
                                Send Reply
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* AI INSIGHTS & ANALYTICS TAB */
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                  <div className="border-b pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu size={16} className="text-red-600 animate-pulse" />
                        <span>{isAmharic ? "አይአይ አስተያየት ዳሰሳና ትንተና ማዕከል" : "AI Sentiment & Priorities Analyzer"}</span>
                      </h3>
                      <p className="text-[10px] text-slate-500">{isAmharic ? "በየቀኑ የሚገቡ ግብረመልሶችን በራስ-ሰር የሚተነትን የአይአይ ሞተር" : "Natural language processing & computer vision sentiment pipeline"}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-black rounded-full uppercase">
                      Gemini Cognitive Core Enabled
                    </span>
                  </div>

                  {/* Sentiment scorecard bento grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 p-3 rounded-xl space-y-1 text-center">
                      <ThumbsUp size={16} className="text-green-600 mx-auto fill-current" />
                      <span className="block text-[9px] text-green-700 font-bold uppercase">Positive Sentiment</span>
                      <span className="text-lg font-black text-green-900">
                        {Math.round((feedbacks.filter(f => f.sentiment === "Positive").length / feedbacks.length) * 100)}%
                      </span>
                    </div>
                    <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl space-y-1 text-center">
                      <Sparkles size={16} className="text-slate-600 mx-auto" />
                      <span className="block text-[9px] text-slate-500 font-bold uppercase">Neutral / Informative</span>
                      <span className="text-lg font-black text-slate-800">
                        {Math.round((feedbacks.filter(f => f.sentiment === "Neutral").length / feedbacks.length) * 100)}%
                      </span>
                    </div>
                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl space-y-1 text-center">
                      <AlertTriangle size={16} className="text-red-600 mx-auto animate-pulse" />
                      <span className="block text-[9px] text-red-700 font-bold uppercase">Negative Urgent Risk</span>
                      <span className="text-lg font-black text-red-900">
                        {Math.round((feedbacks.filter(f => f.sentiment === "Negative").length / feedbacks.length) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* AI Generated Improvement Recommendations checklist (Requirement 14) */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-red-500/10 space-y-3.5 text-white">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles size={14} />
                        <span>AI System Improvement Recommendations (Req 11, 14)</span>
                      </p>
                      <span className="text-[8px] font-mono text-slate-400">Model: Gemini 3.5 Flash</span>
                    </div>

                    <div className="space-y-3 text-xs leading-relaxed text-slate-200">
                      <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-red-400 font-black">HIGH RISK DETECTED: HSE SAFETY</span>
                          <span className="bg-red-600 text-white font-black px-1.5 py-0.5 rounded text-[8px] uppercase">Active Urgent</span>
                        </div>
                        <p className="font-semibold text-[11px] text-slate-100">Resolve Scaffolding Anchor points in Zone C immediately.</p>
                        <p className="text-[9px] text-slate-400">AI Logic detected keyword 'loose Scaffold' with negative score (0.12). Recommended action: Immediate halt of the local slab area until HSE Inspector validates anchor tension.</p>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-amber-400 font-black">TECHNICAL WORKFLOW OPTIMIZATION</span>
                          <span className="bg-amber-600 text-white font-black px-1.5 py-0.5 rounded text-[8px] uppercase">Review Suggested</span>
                        </div>
                        <p className="font-semibold text-[11px] text-slate-100">Implement Local Caching buffer in Surveyor Leica total station sync module.</p>
                        <p className="text-[9px] text-slate-400">AI extracted issue 'Bluetooth latency Floor 4' causing replication delays. Corrective action: Deploy SQLite storage buffer in Flutter app to allow localized coordinate comparison prior to background cloud push.</p>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-emerald-400 font-black">POSITIVE WORKPLACE SYNERGY DETECTED</span>
                          <span className="bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[8px] uppercase">Trend Normal</span>
                        </div>
                        <p className="font-semibold text-[11px] text-slate-100">Maintain current coordination cycle on pre-pour checklists.</p>
                        <p className="text-[9px] text-slate-400">Excellent synergy recorded between drone photogrammetry and site engineering checks. Share Bole Heights pre-pour layout protocol with G+12 Bole Airport site as regional standard.</p>
                      </div>
                    </div>
                  </div>

                  {/* AI sentiment analysis table of recent issues */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cognitive Processing Pipeline (NLP Logs)</p>
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b text-slate-500 font-black uppercase">
                            <th className="p-2.5">ID</th>
                            <th className="p-2.5">Issue Topic</th>
                            <th className="p-2.5">AI Sentiment</th>
                            <th className="p-2.5">NLP Trigger Words</th>
                            <th className="p-2.5">Auto Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700 font-medium">
                          {feedbacks.map(f => (
                            <tr key={f.id} className="hover:bg-slate-50">
                              <td className="p-2.5 font-mono text-red-600 font-bold">{f.id}</td>
                              <td className="p-2.5 truncate max-w-[150px]">{f.subject}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  f.sentiment === "Positive" ? "bg-emerald-100 text-emerald-800" :
                                  f.sentiment === "Negative" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {f.sentiment} ({Math.round(f.sentimentScore * 100)}%)
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-slate-500 text-[9px]">
                                {f.category}, {f.priority} priority
                              </td>
                              <td className="p-2.5 font-semibold text-slate-900">
                                {f.aiAnalysis.priorityRecommendation} Dispatch
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* --- PEER PERFORMANCE APPRAISAL TAB --- */}
      {activeSubTab === "peerPerformance" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-red-500/20 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-[10px] font-black tracking-widest uppercase">
                    {isAmharic ? "የሰራተኞች ብቃት መገምገሚያ" : "TEAM COMPETENCY EVALUATION"}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-green-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    {isAmharic ? "አውቶማቲክ ማስተላለፊያ ዝግጁ ነው" : "Automatic HQ Pipeline Active"}
                  </span>
                </div>
                <h3 className="text-xl font-black font-sans tracking-tight">
                  {isAmharic ? "የሳይት ሰራተኞች የእርስ በርስ ብቃት ግምገማ (Peer-to-Peer Appraisals)" : "Site-Wide Peer-to-Peer Performance Appraisal Engine"}
                </h3>
                <p className="text-xs text-slate-300 max-w-4xl">
                  {isAmharic
                    ? "የክፍል ኃላፊዎች፣ ሱፐርቫይዘሮች፣ የቡድን መሪዎች፣ ጋንግ ቺፎች፣ ታይም ኪፐሮች፣ ፕሮጀክት ማናጀሮች እና አሰባሳቢዎች እርስ በርሳቸው በታማኝነትና በቅንነት የሚገመጋገሙበት ሲስተም ነው። ውጤቱ በራስ-ሰር ተሰልቶ ወደ ዋናው መሥሪያ ቤት ይተላለፋል።"
                    : "A fully decentralized evaluation grid where Section Heads, Supervisors, Team Leaders, Gang Chiefs, Time Keepers, Project Managers, and Assemblers rate each other's operational velocity, work quality, safety protocol adherence, team synergy, and attendance metrics. Averages are recalculated in real-time and piped directly to Head Office."}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Role Averages Matrix Grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800">
                  {isAmharic ? "የካርታ ብቃት ማጠቃለያ (በየስራ መደቡ የተቀመጠ አማካይ ውጤት)" : "Site Performance Averages Matrix (Auto-Calculated)"}
                </h4>
                <p className="text-[10px] text-slate-500">{isAmharic ? "በእርስ በርስ ግምገማዎች ላይ ተመስርቶ በራስ-ሰር የሚሰላ አማካይ ብቃት" : "Real-time consolidated scorecards computed from cross-evaluations"}</p>
              </div>
              <span className="text-[9px] bg-slate-100 text-red-600 font-mono font-bold px-2 py-0.5 rounded border border-red-100">
                {isAmharic ? "አውቶማቲክ አማካይ" : "AUTO AVG ACTIVE"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {roleStats.map((stat) => {
                const avg = stat.average;
                let colorClass = "text-slate-400 bg-slate-50 border-slate-200";
                let progressColor = "bg-slate-300";
                
                if (avg >= 4.5) {
                  colorClass = "bg-emerald-50 border-emerald-100 text-emerald-800";
                  progressColor = "bg-emerald-500";
                } else if (avg >= 3.5) {
                  colorClass = "bg-blue-50 border-blue-100 text-blue-800";
                  progressColor = "bg-blue-500";
                } else if (avg > 0) {
                  colorClass = "bg-amber-50 border-amber-100 text-amber-800";
                  progressColor = "bg-amber-500";
                }

                return (
                  <div key={stat.role} className={`p-3.5 rounded-xl border flex flex-col justify-between ${colorClass} transition-all shadow-2xs`}>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-wider truncate" title={stat.role}>
                        {stat.role === "Section Head" ? (isAmharic ? "የክፍል ኃላፊ" : "Section Head") :
                         stat.role === "Supervisor" ? (isAmharic ? "ሱፐርቫይዘር" : "Supervisor") :
                         stat.role === "Team Leader" ? (isAmharic ? "የቡድን መሪ" : "Team Leader") :
                         stat.role === "Gang Chief" ? (isAmharic ? "ጋንግ ቺፍ" : "Gang Chief") :
                         stat.role === "Time Keeper" ? (isAmharic ? "ታይም ኪፐር" : "Time Keeper") :
                         stat.role === "Project Manager" ? (isAmharic ? "ፕሮጀክት ማናጀር" : "Project Manager") :
                         (isAmharic ? "አሰባሳቢ" : "Assembler")}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black">{avg > 0 ? `${avg}` : "N/A"}</span>
                        {avg > 0 && <span className="text-[9px] font-semibold">/ 5.0 ⭐</span>}
                      </div>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <div className="w-full bg-slate-200/60 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${avg > 0 ? (avg / 5) * 100 : 0}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[8px] font-mono font-bold text-slate-500">
                        <span>{stat.countReceived} {isAmharic ? "ግምገማዎች" : "Rated"}</span>
                        <span>{stat.countGiven} {isAmharic ? "ገምግሟል" : "Given"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Column A: Evaluation Submission Form */}
            <div className="xl:col-span-5 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="border-b pb-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus size={16} className="text-red-600" />
                    <span>{isAmharic ? "አዲስ የእርስ በርስ ግምገማ መዝግብ" : "Create New Evaluation Form"}</span>
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {isAmharic ? "የሳይት ስራ መደቦች እርስ በርስ የሚገመጋገሙበትን ውጤት እዚህ ይሙሉ" : "Rate site staff and automatically average the performance metrics"}
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Evaluator Fields */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                    <p className="text-[9px] font-black uppercase text-red-600 tracking-wider">
                      {isAmharic ? "ክፍል ፩፡ የገምጋሚው መረጃ" : "Part 1: Evaluator Details"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የገምጋሚው ሙሉ ስም" : "Evaluator Name"}</label>
                        <input
                          type="text"
                          value={appraisalEvName}
                          onChange={(e) => setAppraisalEvName(e.target.value)}
                          placeholder={isAmharic ? "ሙሉ ስም" : "eg. Abebe Kebede"}
                          className="w-full bg-white text-slate-900 text-xs p-2 rounded-lg border outline-none focus:border-red-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የገምጋሚው የሳይት ሚና" : "Evaluator Role"}</label>
                        <select
                          value={appraisalEvRole}
                          onChange={(e) => setAppraisalEvRole(e.target.value)}
                          className="w-full bg-white text-slate-900 text-xs p-2 rounded-lg border outline-none font-bold cursor-pointer"
                        >
                          {peerRolesList.map(r => (
                            <option key={r} value={r}>
                              {r === "Section Head" ? (isAmharic ? "የክፍል ኃላፊ (Section Head)" : "Section Head") :
                               r === "Supervisor" ? (isAmharic ? "ሱፐርቫይዘር (Supervisor)" : "Supervisor") :
                               r === "Team Leader" ? (isAmharic ? "የቡድን መሪ (Team Leader)" : "Team Leader") :
                               r === "Gang Chief" ? (isAmharic ? "ጋንግ ቺፍ (Gang Chief)" : "Gang Chief") :
                               r === "Time Keeper" ? (isAmharic ? "ታይም ኪፐር (Time Keeper)" : "Time Keeper") :
                               r === "Project Manager" ? (isAmharic ? "ፕሮጀክት ማናጀር (Project Manager)" : "Project Manager") :
                               (isAmharic ? "አሰባሳቢ (Assembler)" : "Assembler")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Target Evaluated Employee Fields */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-3">
                    <p className="text-[9px] font-black uppercase text-red-600 tracking-wider">
                      {isAmharic ? "ክፍል ፪፡ የተገምጋሚው መረጃ" : "Part 2: Target Staff Details"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የተገምጋሚው ሙሉ ስም" : "Target Staff Name"}</label>
                        <input
                          type="text"
                          value={appraisalTgtName}
                          onChange={(e) => setAppraisalTgtName(e.target.value)}
                          placeholder={isAmharic ? "ሙሉ ስም" : "eg. Chala Birru"}
                          className="w-full bg-white text-slate-900 text-xs p-2 rounded-lg border outline-none focus:border-red-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የተገምጋሚው የሳይት ሚና" : "Target Staff Role"}</label>
                        <select
                          value={appraisalTgtRole}
                          onChange={(e) => setAppraisalTgtRole(e.target.value)}
                          className="w-full bg-white text-slate-900 text-xs p-2 rounded-lg border outline-none font-bold cursor-pointer"
                        >
                          {peerRolesList.map(r => (
                            <option key={r} value={r}>
                              {r === "Section Head" ? (isAmharic ? "የክፍል ኃላፊ (Section Head)" : "Section Head") :
                               r === "Supervisor" ? (isAmharic ? "ሱፐርቫይዘር (Supervisor)" : "Supervisor") :
                               r === "Team Leader" ? (isAmharic ? "የቡድን መሪ (Team Leader)" : "Team Leader") :
                               r === "Gang Chief" ? (isAmharic ? "ጋንግ ቺፍ (Gang Chief)" : "Gang Chief") :
                               r === "Time Keeper" ? (isAmharic ? "ታይም ኪፐር (Time Keeper)" : "Time Keeper") :
                               r === "Project Manager" ? (isAmharic ? "ፕሮጀክት ማናጀር (Project Manager)" : "Project Manager") :
                               (isAmharic ? "አሰባሳቢ (Assembler)" : "Assembler")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Part 3: Ratings and Sliders */}
                  <div className="p-4 bg-red-50/20 rounded-xl border border-red-500/10 space-y-4">
                    <div className="flex justify-between items-center border-b pb-1">
                      <p className="text-[9px] font-black uppercase text-red-600 tracking-wider">
                        {isAmharic ? "ክፍል ፫፡ የብቃት መመዘኛ ነጥቦች" : "Part 3: Performance KPI Ratings"}
                      </p>
                      <div className="bg-red-600 text-white px-2 py-0.5 rounded-full font-mono text-[10px] font-black">
                        {isAmharic ? "አማካይ ውጤት" : "Live Avg"}: {((appraisalWorkQuality + appraisalSpeed + appraisalTeamWork + appraisalSafety + appraisalAttendance) / 5).toFixed(1)} ⭐
                      </div>
                    </div>

                    {/* KPI 1: Work Quality */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-700">{isAmharic ? "የስራ ጥራት" : "1. Work Quality"}</span>
                        <span className="text-red-600 font-mono">{appraisalWorkQuality} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={appraisalWorkQuality}
                        onChange={(e) => setAppraisalWorkQuality(parseInt(e.target.value))}
                        className="w-full accent-red-600 cursor-pointer"
                      />
                    </div>

                    {/* KPI 2: Speed */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-700">{isAmharic ? "ፍጥነት እና በወቅቱ ማጠናቀቅ" : "2. Velocity & Timeliness"}</span>
                        <span className="text-red-600 font-mono">{appraisalSpeed} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={appraisalSpeed}
                        onChange={(e) => setAppraisalSpeed(parseInt(e.target.value))}
                        className="w-full accent-red-600 cursor-pointer"
                      />
                    </div>

                    {/* KPI 3: Collaboration */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-700">{isAmharic ? "ትብብር እና የቡድን ስራ" : "3. Collaboration & Teamwork"}</span>
                        <span className="text-red-600 font-mono">{appraisalTeamWork} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={appraisalTeamWork}
                        onChange={(e) => setAppraisalTeamWork(parseInt(e.target.value))}
                        className="w-full accent-red-600 cursor-pointer"
                      />
                    </div>

                    {/* KPI 4: Safety */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-700">{isAmharic ? "ደህንነትና ህጎችን ማክበር" : "4. Safety Protocol Adherence"}</span>
                        <span className="text-red-600 font-mono">{appraisalSafety} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={appraisalSafety}
                        onChange={(e) => setAppraisalSafety(parseInt(e.target.value))}
                        className="w-full accent-red-600 cursor-pointer"
                      />
                    </div>

                    {/* KPI 5: Attendance */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-700">{isAmharic ? "ስነ-ስርዓትና ሰዓት ማክበር" : "5. Attendance & Discipline"}</span>
                        <span className="text-red-600 font-mono">{appraisalAttendance} / 5</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={appraisalAttendance}
                        onChange={(e) => setAppraisalAttendance(parseInt(e.target.value))}
                        className="w-full accent-red-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Project site & comments */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "የግንባታ ሳይት" : "Construction Project Site"}</label>
                      <select
                        value={appraisalProject}
                        onChange={(e) => setAppraisalProject(e.target.value)}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none cursor-pointer"
                      >
                        <option value="Bole Heights Bloc B1">Bole Heights Bloc B1</option>
                        <option value="Bole Heights Bloc B2">Bole Heights Bloc B2</option>
                        <option value="Bole Airport G+12 Site">Bole Airport G+12 Site</option>
                        <option value="Gotera Condominium Tower C">Gotera Condominium Tower C</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">{isAmharic ? "አስተያየትና ማብራሪያ (Amharic / English)" : "Evaluative Comments & Recommendations"}</label>
                      <textarea
                        value={appraisalCommentsText}
                        onChange={(e) => setAppraisalCommentsText(e.target.value)}
                        rows={3}
                        placeholder={isAmharic ? "የሰራተኛውን አጠቃላይ የስራ ብቃትና አስተያየት እዚህ ያስፍሩ..." : "Describe the reasons for your rating or operational behavior observations..."}
                        className="w-full bg-slate-50 text-slate-900 text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => {
                      if (!appraisalEvName.trim() || !appraisalTgtName.trim()) {
                        alert(isAmharic ? "እባክዎ የገምጋሚውን እና የተገምጋሚውን ስም ያስገቡ!" : "Please fill in both Evaluator and Target names!");
                        return;
                      }
                      if (appraisalEvRole === appraisalTgtRole && appraisalEvName.trim() === appraisalTgtName.trim()) {
                        alert(isAmharic ? "እባክዎ ራስዎን መገምገም አይችሉም!" : "Self-evaluation is not permitted in this decentralized operational model!");
                        return;
                      }

                      const average = parseFloat(((appraisalWorkQuality + appraisalSpeed + appraisalTeamWork + appraisalSafety + appraisalAttendance) / 5).toFixed(1));
                      const newAppraisal = {
                        id: `APP-${String(appraisals.length + 1).padStart(3, '0')}`,
                        evaluatorName: appraisalEvName,
                        evaluatorRole: appraisalEvRole,
                        targetName: appraisalTgtName,
                        targetRole: appraisalTgtRole,
                        ratings: {
                          workQuality: appraisalWorkQuality,
                          speed: appraisalSpeed,
                          teamWork: appraisalTeamWork,
                          safety: appraisalSafety,
                          attendance: appraisalAttendance
                        },
                        comments: appraisalCommentsText || (isAmharic ? "ጥሩ የስራ አፈፃፀም አሳይቷል።" : "Showed good operational performance on site."),
                        averageScore: average,
                        status: "Sent to Head Office",
                        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
                        project: appraisalProject
                      };

                      setAppraisals([newAppraisal, ...appraisals]);
                      setAppraisalEvName("");
                      setAppraisalTgtName("");
                      setAppraisalCommentsText("");
                      
                      onLogAction(
                        "Peer Appraisal Submitted",
                        `Evaluated ${appraisalTgtName} (${appraisalTgtRole}) with Average score of ${average}. Automatically sent to Head Office.`
                      );
                      
                      alert(isAmharic ? "ብቃቱ ተገምግሞ በራስ-ሰር ወደ ዋናው መሥሪያ ቤት ተልኳል!" : "Appraisal compiled. Average computed and dynamically transmitted to HO!");
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all uppercase tracking-wider font-sans text-[11px]"
                  >
                    <Send size={14} />
                    <span>{isAmharic ? "መዝግብ እና ወደ ዋና መሥሪያ ቤት ላክ" : "Submit & Send to Head Office"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column B: Live Ledger / Transmitted Appraisals Feed */}
            <div className="xl:col-span-7 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={16} className="text-red-600" />
                      <span>{isAmharic ? "ወደ ዋና መስሪያ ቤት የተላኩ የግምገማ ማህደሮች" : "Transmitted Site Appraisals Feed"}</span>
                    </h3>
                    <p className="text-[10px] text-slate-500">{isAmharic ? "በሳይት የሚሞሉ ግምገማዎች በቅጽበት ወደ ዋና መሥሪያ ቤት ይተላለፋሉ" : "Real-time stream of evaluated site appraisals archived at Head Office"}</p>
                  </div>
                  
                  <span className="bg-slate-100 text-slate-800 font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border">
                    {isAmharic ? "ጠቅላላ ግምገማዎች" : "Total Logged"}: <span className="text-red-600 font-black">{appraisals.length}</span>
                  </span>
                </div>

                {/* Search and Filters bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={appraisalSearchText}
                      onChange={(e) => setAppraisalSearchText(e.target.value)}
                      placeholder={isAmharic ? "በስም ወይም በአስተያየት ፈልግ..." : "Search by name or keywords..."}
                      className="w-full bg-slate-50 text-slate-900 text-xs pl-8 pr-3 py-2 rounded-xl border outline-none focus:border-red-500 font-semibold"
                    />
                  </div>
                  <select
                    value={appraisalFilterRole}
                    onChange={(e) => setAppraisalFilterRole(e.target.value)}
                    className="bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border outline-none font-bold cursor-pointer"
                  >
                    <option value="All">{isAmharic ? "ሁሉም የስራ መደቦች" : "All Roles Filter"}</option>
                    {peerRolesList.map(r => (
                      <option key={r} value={r}>
                        {r === "Section Head" ? (isAmharic ? "የክፍል ኃላፊ" : "Section Head") :
                         r === "Supervisor" ? (isAmharic ? "ሱፐርቫይዘር" : "Supervisor") :
                         r === "Team Leader" ? (isAmharic ? "የቡድን መሪ" : "Team Leader") :
                         r === "Gang Chief" ? (isAmharic ? "ጋንግ ቺፍ" : "Gang Chief") :
                         r === "Time Keeper" ? (isAmharic ? "ታይም ኪፐር" : "Time Keeper") :
                         r === "Project Manager" ? (isAmharic ? "ፕሮጀክት ማናጀር" : "Project Manager") :
                         (isAmharic ? "አሰባሳቢ" : "Assembler")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* appraisals list stream */}
                <div className="space-y-4 max-h-[620px] overflow-y-auto pr-1">
                  {filteredAppraisals.map((item) => {
                    return (
                      <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-red-500/30 transition-all space-y-3.5 relative overflow-hidden">
                        {/* Status watermark banner */}
                        <div className="absolute top-0 right-0 bg-emerald-600 text-white font-mono text-[8px] font-black px-2.5 py-0.5 rounded-bl uppercase tracking-widest flex items-center gap-1 shadow-xs">
                          <CheckCircle size={8} />
                          <span>{isAmharic ? "ወደ ዋና መሥሪያ ቤት ደርሷል" : "Transmitted to HO"}</span>
                        </div>

                        {/* Top Header Row */}
                        <div className="flex justify-between items-start pt-1">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{item.id}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2 font-semibold">{item.createdAt} | {item.project}</span>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-white border px-2 py-0.5 rounded-lg text-xs font-black text-slate-900">
                            <span>{item.averageScore}</span>
                            <span className="text-yellow-500">⭐</span>
                          </div>
                        </div>

                        {/* Evaluator -> Target relationship indicator */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">{isAmharic ? "ገምጋሚ" : "Evaluator Staff"}</span>
                            <p className="font-bold text-slate-900 text-xs">{item.evaluatorName}</p>
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                              {item.evaluatorRole === "Section Head" ? (isAmharic ? "የክፍል ኃላፊ" : "Section Head") :
                               item.evaluatorRole === "Supervisor" ? (isAmharic ? "ሱፐርቫይዘር" : "Supervisor") :
                               item.evaluatorRole === "Team Leader" ? (isAmharic ? "የቡድን መሪ" : "Team Leader") :
                               item.evaluatorRole === "Gang Chief" ? (isAmharic ? "ጋንግ ቺፍ" : "Gang Chief") :
                               item.evaluatorRole === "Time Keeper" ? (isAmharic ? "ታይም ኪፐር" : "Time Keeper") :
                               item.evaluatorRole === "Project Manager" ? (isAmharic ? "ፕሮጀክት ማናጀር" : "Project Manager") :
                               (isAmharic ? "አሰባሳቢ" : "Assembler")}
                            </span>
                          </div>
                          <div className="border-t sm:border-t-0 sm:border-l sm:pl-3 border-slate-100 pt-2 sm:pt-0">
                            <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest block">{isAmharic ? "የተገመገመው ሠራተኛ" : "Target Staff"}</span>
                            <p className="font-bold text-slate-900 text-xs">{item.targetName}</p>
                            <span className="text-[9px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                              {item.targetRole === "Section Head" ? (isAmharic ? "የክፍል ኃላፊ" : "Section Head") :
                               item.targetRole === "Supervisor" ? (isAmharic ? "ሱፐርቫይዘር" : "Supervisor") :
                               item.targetRole === "Team Leader" ? (isAmharic ? "የቡድን መሪ" : "Team Leader") :
                               item.targetRole === "Gang Chief" ? (isAmharic ? "ጋንግ ቺፍ" : "Gang Chief") :
                               item.targetRole === "Time Keeper" ? (isAmharic ? "ታይም ኪፐር" : "Time Keeper") :
                               item.targetRole === "Project Manager" ? (isAmharic ? "ፕሮጀክት ማናጀር" : "Project Manager") :
                               (isAmharic ? "አሰባሳቢ" : "Assembler")}
                            </span>
                          </div>
                        </div>

                        {/* Matrix Grid of individual KPIs */}
                        <div className="grid grid-cols-5 gap-1.5 text-center text-[9px]">
                          <div className="bg-white p-1 rounded border border-slate-200/60 font-semibold">
                            <span className="block text-slate-400 text-[8px] uppercase">{isAmharic ? "ጥራት" : "Quality"}</span>
                            <span className="text-slate-800 font-bold">{item.ratings.workQuality} ⭐</span>
                          </div>
                          <div className="bg-white p-1 rounded border border-slate-200/60 font-semibold">
                            <span className="block text-slate-400 text-[8px] uppercase">{isAmharic ? "ፍጥነት" : "Speed"}</span>
                            <span className="text-slate-800 font-bold">{item.ratings.speed} ⭐</span>
                          </div>
                          <div className="bg-white p-1 rounded border border-slate-200/60 font-semibold">
                            <span className="block text-slate-400 text-[8px] uppercase">{isAmharic ? "ትብብር" : "Team"}</span>
                            <span className="text-slate-800 font-bold">{item.ratings.teamWork} ⭐</span>
                          </div>
                          <div className="bg-white p-1 rounded border border-slate-200/60 font-semibold">
                            <span className="block text-slate-400 text-[8px] uppercase">{isAmharic ? "ደህንነት" : "Safety"}</span>
                            <span className="text-slate-800 font-bold">{item.ratings.safety} ⭐</span>
                          </div>
                          <div className="bg-white p-1 rounded border border-slate-200/60 font-semibold">
                            <span className="block text-slate-400 text-[8px] uppercase">{isAmharic ? "ሰዓት" : "Time"}</span>
                            <span className="text-slate-800 font-bold">{item.ratings.attendance} ⭐</span>
                          </div>
                        </div>

                        {/* Comments section */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-xs italic text-slate-700 leading-relaxed font-sans">
                          "{item.comments}"
                        </div>
                      </div>
                    );
                  })}

                  {filteredAppraisals.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed">
                      {isAmharic ? "ምንም ዓይነት የብቃት ግምገማዎች አልተገኘም!" : "No evaluation appraisal entries matched your filters!"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --- PHASE 3: WORKFORCE PERFORMANCE ANALYTICS & LEADERBOARDS --- */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 flex items-center gap-2">
                  <BarChart3 size={16} className="text-red-600" />
                  <span>{isAmharic ? "የሰራተኞች የብቃትና የአፈጻጸም ትንተና" : "Workforce Performance Analytics Dashboard"}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isAmharic 
                    ? "የመገኘት፣ የሰዓት አክብሮት፣ የአምራችነት፣ የጥራት፣ የደህንነት እና የክህሎት ውጤቶች ስብስብና ሪፖርት" 
                    : "Real-time consolidated multi-dimensional scorecards evaluating attendance, punctuality, productivity, safety, and skills."}
                </p>
              </div>
              <div className="flex bg-white p-1 rounded-lg border shadow-2xs">
                {["Daily", "Weekly", "Monthly", "Annual"].map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      setPerfReportPeriod(p);
                      onLogAction("Performance Report Filter", `Switched analytics report scope to ${p} period.`);
                    }}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      perfReportPeriod === p 
                        ? "bg-slate-900 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    {isAmharic ? (
                      p === "Daily" ? "ዕለታዊ" :
                      p === "Weekly" ? "ሳምንታዊ" :
                      p === "Monthly" ? "ወርሃዊ" : "ዓመታዊ"
                    ) : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Metrics Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden font-sans">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">{isAmharic ? "ሠራተኛ" : "Staff Member"}</th>
                      <th className="p-3 text-center">{isAmharic ? "መገኘት" : "Attendance"}</th>
                      <th className="p-3 text-center">{isAmharic ? "ሰዓት አክብሮት" : "Punctuality"}</th>
                      <th className="p-3 text-center">{isAmharic ? "አምራችነት" : "Productivity"}</th>
                      <th className="p-3 text-center">{isAmharic ? "ጥራት" : "Quality"}</th>
                      <th className="p-3 text-center">{isAmharic ? "ደህንነት" : "Safety"}</th>
                      <th className="p-3 text-center">{isAmharic ? "ቡድን ስራ" : "Teamwork"}</th>
                      <th className="p-3 text-center">{isAmharic ? "ክህሎት" : "Skill Level"}</th>
                      <th className="p-3 text-right">{isAmharic ? "ጠቅላላ ውጤት" : "Weighted KPI"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold text-[11px]">
                    {[
                      { name: "Chala Chuko", role: "Gang Chief", att: 98, punc: 96, prod: 94, qual: 95, safe: 98, team: 97, skill: 95, rating: 96.1, project: "Bole Heights", zone: "Zone A", floor: "Floor 4" },
                      { name: "Mulugeta Shiferaw", role: "Lead Assembler", att: 100, punc: 98, prod: 95, qual: 96, safe: 99, team: 98, skill: 92, rating: 97.1, project: "Bole Heights", zone: "Zone A", floor: "Floor 4" },
                      { name: "Alemayehu Kebede", role: "Site Engineer", att: 95, punc: 92, prod: 90, qual: 94, safe: 96, team: 92, skill: 94, rating: 93.3, project: "Bole Heights", zone: "Zone B", floor: "Floor 5" },
                      { name: "Zewdu Ayele", role: "Equipment Operator", att: 92, punc: 95, prod: 91, qual: 92, safe: 95, team: 88, skill: 96, rating: 92.7, project: "CMC High-Rise", zone: "Zone A", floor: "Ground" },
                      { name: "Kassahun Tsegaye", role: "Supervisor", att: 90, punc: 88, prod: 85, qual: 89, safe: 92, team: 90, skill: 89, rating: 88.7, project: "Gotera Condos", zone: "Zone C", floor: "Floor 3" },
                      { name: "Yohannes B.", role: "Lead Surveyor", att: 94, punc: 94, prod: 92, qual: 95, safe: 95, team: 91, skill: 95, rating: 93.9, project: "Bole Heights", zone: "Zone B", floor: "Floor 4" }
                    ].map(emp => {
                      let periodAtt = emp.att;
                      let periodProd = emp.prod;
                      if (perfReportPeriod === "Daily") {
                        periodAtt = emp.att >= 95 ? 100 : 90;
                        periodProd = Math.min(100, emp.prod + 2);
                      } else if (perfReportPeriod === "Weekly") {
                        periodAtt = emp.att;
                        periodProd = emp.prod;
                      } else if (perfReportPeriod === "Monthly") {
                        periodAtt = Math.max(80, emp.att - 1);
                        periodProd = Math.max(80, emp.prod - 1);
                      } else if (perfReportPeriod === "Annual") {
                        periodAtt = Math.max(85, emp.att - 2);
                        periodProd = Math.max(85, emp.prod - 2);
                      }
                      const weightedKpi = Math.round((periodAtt * 0.15 + emp.punc * 0.10 + periodProd * 0.25 + emp.qual * 0.20 + emp.safe * 0.15 + emp.team * 0.05 + emp.skill * 0.10) * 10) / 10;

                      return (
                        <tr key={emp.name} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{emp.name}</span>
                              <span className="text-[9px] text-slate-500 font-medium font-sans">{emp.role} | {emp.project}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${periodAtt >= 95 ? "text-emerald-700 bg-emerald-50" : periodAtt >= 90 ? "text-blue-700 bg-blue-50" : "text-amber-700 bg-amber-50"}`}>
                              {periodAtt}%
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono">{emp.punc}%</td>
                          <td className="p-3 text-center font-mono">{periodProd}%</td>
                          <td className="p-3 text-center font-mono">{emp.qual}%</td>
                          <td className="p-3 text-center font-mono">{emp.safe}%</td>
                          <td className="p-3 text-center font-mono">{emp.team}%</td>
                          <td className="p-3 text-center">
                            <span className="bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {emp.skill}%
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-mono font-black text-xs ${weightedKpi >= 95 ? "text-emerald-600" : weightedKpi >= 90 ? "text-blue-600" : "text-amber-600"}`}>
                              {weightedKpi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leaderboard Selector & Column */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5 font-sans">
                    <CheckSquare size={14} className="text-red-600" />
                    <span>{isAmharic ? "ከፍተኛ ውጤት ያስመዘገቡ ሰራተኞችና ቡድኖች" : "Operational Leaders Matrix"}</span>
                  </h4>
                  <div className="flex bg-slate-100 p-0.5 rounded border text-[10px]">
                    {["Team", "Floor", "Zone", "Project"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setPerfLeaderboardFilter(opt)}
                        className={`px-2.5 py-1 font-bold rounded transition-all cursor-pointer ${
                          perfLeaderboardFilter === opt 
                            ? "bg-white text-slate-900 shadow-2xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {isAmharic ? (
                          opt === "Team" ? "በቡድን" :
                          opt === "Floor" ? "በፎቅ" :
                          opt === "Zone" ? "በቀጠና" : "በፕሮጀክት"
                        ) : `By ${opt}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 font-sans">
                  {perfLeaderboardFilter === "Team" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-800">{isAmharic ? "ቁጥር 1 ምርጥ ቡድን" : "RANK 1 TEAM"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Assembly Team Alpha (Slab Setup)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Gang Chief: <strong>Chala Chuko</strong> | 8 Assemblers</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 font-mono block">96.6% Avg</span>
                          <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">102% Goal</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500">{isAmharic ? "ቁጥር 2 ምርጥ ቡድን" : "RANK 2 TEAM"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Assembly Team Beta (Shoring & Props)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Supervisor: <strong>Kassahun T.</strong> | 10 Assemblers</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-700 font-mono block">91.2% Avg</span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">95% Goal</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {perfLeaderboardFilter === "Floor" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-800">{isAmharic ? "ቁጥር 1 ምርጥ ፎቅ" : "RANK 1 FLOOR"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Floor 4 - Cycle #6</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Project: <strong>Bole Heights</strong> | Shutter cycle 4 days</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 font-mono block">94.8% Avg</span>
                          <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">Slab Casted</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500">{isAmharic ? "ቁጥር 2 ምርጥ ፎቅ" : "RANK 2 FLOOR"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Floor 5 - Cycle #1</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Project: <strong>Bole Heights</strong> | Props reinforcement active</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-700 font-mono block">89.4% Avg</span>
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">On Schedule</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {perfLeaderboardFilter === "Zone" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-800">{isAmharic ? "ቁጥር 1 ምርጥ ቀጠና" : "RANK 1 ZONE"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Zone A - Main Shutter Zone</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">High-volume modular panels | Bole Heights</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 font-mono block">95.4% Avg</span>
                          <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">Zero Defects</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500">{isAmharic ? "ቁጥር 2 ምርጥ ቀጠና" : "RANK 2 ZONE"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Zone B - Elevator Core Wall</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Complex heavy framing | Bole Heights</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-700 font-mono block">91.8% Avg</span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">Passed QC</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {perfLeaderboardFilter === "Project" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-emerald-800">{isAmharic ? "ቁጥር 1 ምርጥ ፕሮጀክት" : "RANK 1 PROJECT"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">Bole Heights Multi-Use Tower</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Digital Construction ERP Sector A | Bole Subcity</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 font-mono block">94.2% Avg</span>
                          <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">98.5% Safe</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-500">{isAmharic ? "ቁጥር 2 ምርጥ ፕሮጀክት" : "RANK 2 PROJECT"}</p>
                          <h4 className="text-xs font-black text-slate-900 mt-1">CMC High-Rise Housing</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Digital Construction ERP Sector B | Yeka Subcity</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-700 font-mono block">90.5% Avg</span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded-full uppercase mt-1 inline-block">92% Safe</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Performance Digest Card */}
              <div className="bg-slate-900 text-white p-5 rounded-xl border border-red-500/20 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-500 flex items-center gap-1.5 font-sans">
                    <Sparkles size={14} className="text-red-500" />
                    <span>{isAmharic ? "የAI አፈጻጸም ማጠቃለያ" : "AI Performance Optimization Digest"}</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {isAmharic 
                      ? "የAI ረዳቱ የሰራተኞችን ውጤቶች በመመርመር ድርጅታዊ ብቃትን ለማሳደግ የሚረዱ ምክሮችን ይሰጣል።" 
                      : "Trigger neural analysis over consolidated attendance sheets, quality tolerances, and peer ratings to generate target-centric corrective recommendations."}
                  </p>
                </div>

                {perfDigestActive && (
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed space-y-2">
                    <div className="flex justify-between items-center text-xs text-red-400 font-bold font-sans border-b border-slate-800 pb-1">
                      <span>⚡ GENERATED ACTION PLAN</span>
                      <span className="text-[9px] text-slate-500">CONFIDENCE: 98%</span>
                    </div>
                    <p className="text-slate-100">{perfDigestContent}</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setPerfDigestActive(true);
                    setPerfDigestContent(
                      isAmharic 
                        ? "በሳይት Bole Heights የሚገኘው Assembly Team Alpha ከፍተኛ የ96.6% ብቃት አሳይቷል። በሌላ በኩል በGotera ኮንዶሚኒየም የሚገኘው የKassahun T. ቡድን በሰዓት አክብሮትና በproductivity ላይ መጠነኛ ቅናሽ ስላሳየ (88% እና 85%) የክህሎት ማሻሻያ ስልጠና በፎርምወርክ መመሪያ ላይ እንዲያገኙ ይመከራል።" 
                        : "Assembly Team Alpha under Gang Chief Chala Chuko exceeds standard productivity vectors at 96.6%. Corrective training recommended for Kassahun T's crew on Floor 3 Gotera Condos to bolster concrete pour cyclical times (currently 85% velocity)."
                    );
                    onLogAction("AI Performance Digest", "Compiled multi-metric optimization directive via deep-learning model on workforce indicators.");
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider cursor-pointer font-sans"
                >
                  {isAmharic ? "የብቃት ትንተና አውጣ" : "📊 Generate AI Performance Digest"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
