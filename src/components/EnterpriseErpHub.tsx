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
  Maximize2
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
    { id: "MTS-501", name: "MethodStatement_HighRiseFormwork_OVID.pdf", type: "Method Statement", ver: "v3.0", syncDate: "2026-06-15", approval: "Lead Admin Signed" },
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

  const handleAddProcurement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrItem.item) return;
    const newPr = {
      id: `PR-${Date.now().toString().slice(-3)}`,
      item: newPrItem.item,
      qty: newPrItem.qty || "100 Pcs",
      cost: newPrItem.cost || "ETB 50,000",
      supplier: newPrItem.supplier || "Local Provider",
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
            {isAmharic ? "OVID አልሙኒየም ፎርምወርክ ኢንተርፕራይዝ ሲስተም" : "OVID Aluminum Formwork Enterprise ERP"}
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

      {/* Enterprise Sub-Navigation Grid (13 Enterprise Requirements) */}
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
                    placeholder="Provide precise location, time, and severity of hazard..."
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
                  <textarea rows={3} placeholder="Provide specific directives or tolerances to adjust..." className="w-full mt-1 border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none" />
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

    </div>
  );
};
