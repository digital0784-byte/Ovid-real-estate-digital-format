import React, { useState, useMemo, useEffect } from "react";
import { DbService } from "../services/db";
import { ProjectZone, AttendanceRecord, Worker, AluminumFormworkPanel, PanelRepairRecord } from "../types";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Layers,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Calendar,
  ArrowUpRight,
  Percent,
  Printer,
  Clock,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  User,
  Users,
  ShieldCheck,
  Zap,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Sliders,
  Package,
  Truck,
  Building2,
  Wrench,
  Fuel,
  Cpu,
  Download,
  ShieldAlert,
  Database,
  RefreshCw,
  Activity,
  Award,
  CheckCircle2,
  FileDown,
  PieChart as PieIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";

// --- INTERFACES & TYPES ---
interface BudgetCategory {
  id: string;
  category: "Material" | "Labor" | "Equipment" | "Overhead";
  allocated: number;
  description: string;
  descriptionAm: string;
}

interface Expense {
  id: string;
  category: "Material" | "Labor" | "Equipment" | "Overhead";
  amount: number;
  date: string;
  vendor: string;
  description: string;
  project: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  project: string;
  client: string;
  amount: number;
  status: "Draft" | "Pending" | "Approved" | "Paid" | "Rejected";
  date: string;
  dueDate: string;
}

interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  project: string;
}

interface ProjectEvmData {
  id: string;
  name: string;
  budget: number;
  approvedBudget: number;
  actualCost: number;
  earnedValue: number;
  plannedValue: number;
  forecastCost: number;
  scheduleVarianceDays: number;
}

interface PayrollRecord {
  id: string;
  workerName: string;
  trade: string;
  basicSalary: number;
  normalHours: number;
  overtimeHours: number;
  underTimeHours: number;
  nightShiftHours: number;
  holidayHours: number;
  allowances: number;
  bonuses: number;
  deductions: number;
  tax: number;
  pension: number;
  netSalary: number;
}

interface ProcurementRecord {
  id: string;
  poNumber: string;
  supplier: string;
  materialItem: string;
  poAmount: number;
  importCost: number;
  customsTax: number;
  deliveryCost: number;
  status: "PO Raised" | "In Transit" | "Customs Cleared" | "Paid";
  date: string;
}

interface EquipmentCostRecord {
  id: string;
  equipmentName: string;
  assetCode: string;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  sparePartsCost: number;
  rentalCost: number;
  operatingHours: number;
}

interface FinanceErpHubProps {
  isAmharic: boolean;
  onLogAction?: (action: string, details: string) => void;
}

export const FinanceErpHub: React.FC<FinanceErpHubProps> = ({ isAmharic, onLogAction }) => {
  // Navigation State across the 10 Master Prompt Modules
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "project-mgmt"
    | "payroll-mgmt"
    | "formwork-assets"
    | "warehouse-cost"
    | "procurement-cost"
    | "equipment-cost"
    | "financial-reports"
    | "ai-analytics"
    | "integrations"
  >("dashboard");

  const lang = isAmharic ? "am" : "en";

  // Bilingual UI Dictionary
  const dict: Record<string, Record<string, string>> = {
    en: {
      title: "BuildSync ERP – Finance Manager App",
      subtitle: "Enterprise Finance, EVM Project Accounting, Automated Payroll & AI Risk Intelligence Engine",
      overallSummary: "Financial Health Summary",
      companyRevenue: "Company Revenue",
      companyExpenses: "Company Expenses",
      projectBudget: "Total Project Budget",
      budgetUtilization: "Budget Utilization",
      cashFlow: "Operating Cash Flow",
      receivables: "Accounts Receivable",
      payables: "Accounts Payable",
      warehouseAssetVal: "Warehouse Asset Value",
      formworkAssetVal: "Formwork Asset Value",
      equipmentAssetVal: "Equipment Asset Value",
      payrollCost: "Payroll Cost",
      overtimeCost: "Overtime Cost",
      procurementCost: "Procurement Cost",
      maintenanceCost: "Maintenance Cost",
      fuelCost: "Fuel Cost",
      transportCost: "Transportation Cost",
      profitLoss: "Net Profit & Loss",
      financialKpis: "Financial KPIs",
      savedAlert: "Financial record saved successfully!"
    },
    am: {
      title: "BuildSync ERP – የፋይናንስ አስተዳደር መተግበሪያ",
      subtitle: "የኩባንያው አጠቃላይ ፋይናንስ፣ የፕሮጀክት EVM ወጪ፣ አውቶሜቲክ ደሞዝ እና AI የፋይናንስ ኦዲት",
      overallSummary: "የፋይናንስ አጠቃላይ እይታ",
      companyRevenue: "የኩባንያው ገቢ (Revenue)",
      companyExpenses: "የኩባንያው ወጪ (Expenses)",
      projectBudget: "ጠቅላላ የፕሮጀክት በጀት",
      budgetUtilization: "የበጀት பயன்பாடு (Utilization)",
      cashFlow: "የጥሬ ገንዘብ ዝውውር (Cash Flow)",
      receivables: "የሚሰበሰብ ሂሳብ (Receivables)",
      payables: "የሚከፈል ሂሳብ (Payables)",
      warehouseAssetVal: "የወርሃዊ መጋዘን ሀብት ዋጋ",
      formworkAssetVal: "የፎርምወርክ ፓነል ሀብት ዋጋ",
      equipmentAssetVal: "የማሽነሪዎች ሀብት ዋጋ",
      payrollCost: "የሰራተኛ ደሞዝ ወጪ",
      overtimeCost: "የትርፍ ሰዓት ወጪ",
      procurementCost: "የግዢ ወጪ",
      maintenanceCost: "የጥገና ወጪ",
      fuelCost: "የነዳጅ ወጪ",
      transportCost: "የማጓጓዣ ወጪ",
      profitLoss: "የተጣራ ትርፍ እና ኪሳራ",
      financialKpis: "የፋይናንስ መለኪያዎች (KPIs)",
      savedAlert: "የፋይናንስ መረጃው በተሳካ ሁኔታ ተመዝግቧል!"
    }
  };

  const t = (key: string): string => dict[lang][key] || key;

  // --- DATABASE-LINKED DYNAMIC STATES ---
  const [zonesList, setZonesList] = useState<ProjectZone[]>([]);
  const [attendanceList, setAttendanceRecordList] = useState<AttendanceRecord[]>([]);
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [repairRecordsList, setRepairRecordsList] = useState<PanelRepairRecord[]>([]);
  const [formworkPanelsList, setFormworkPanelsList] = useState<AluminumFormworkPanel[]>([]);
  const [loadingDbData, setLoadingDbData] = useState(true);

  // Dynamic cost tracking mode ("ledger" expenses vs "realtime" field-linked costs)
  const [costCalculationMode, setCostCalculationMode] = useState<"ledger" | "realtime">("realtime");

  // Fetch linked database files from DbService
  useEffect(() => {
    let active = true;
    const fetchAllData = async () => {
      try {
        setLoadingDbData(true);
        const [z, att, wrk, repairs, panels] = await Promise.all([
          DbService.getZones(),
          DbService.getAttendance(),
          DbService.getWorkers(),
          DbService.getPanelRepairRecords(),
          DbService.getFormworkPanels()
        ]);
        if (active) {
          setZonesList(z || []);
          setAttendanceRecordList(att || []);
          setWorkersList(wrk || []);
          setRepairRecordsList(repairs || []);
          setFormworkPanelsList(panels || []);
          setLoadingDbData(false);
        }
      } catch (err) {
        console.error("Failure loading master ERP databases in Finance Module:", err);
        if (active) setLoadingDbData(false);
      }
    };
    fetchAllData();
    return () => {
      active = false;
    };
  }, []);

  // --- MASTER INITIAL DATA STORES ---
  const [budgets, setBudgets] = useState<BudgetCategory[]>([
    { id: "B-01", category: "Material", allocated: 48000000, description: "C30 Pre-mix Concrete & High-Tensile Steel Rebar", descriptionAm: "የኮንክሪትና ከፍተኛ ጥራት ያለው ብረት አቅርቦት" },
    { id: "B-02", category: "Labor", allocated: 28000000, description: "Formwork Gangs, Biometric Site Crews & Technicians", descriptionAm: "የፎርምወርክ ገጣጣሚዎች እና የሳይት ሰራተኞች ደሞዝ" },
    { id: "B-03", category: "Equipment", allocated: 18000000, description: "Tower Crane Leasing, Mobilization & Heavy Machinery", descriptionAm: "የታወር ክሬን ኪራይ፣ ማጓጓዣ እና የማሽነሪ ጥገና" },
    { id: "B-04", category: "Overhead", allocated: 8000000, description: "Consultant Supervision, QA/QC Testing & Administration", descriptionAm: "የአማካሪ ምህንድስና፣ ጥራት ፍተሻ እና አስተዳደራዊ ወጪ" }
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "EXP-01", category: "Material", amount: 8500000, date: "2026-07-02", vendor: "Mugher Cement PLC", description: "C30 Pre-mix Bulk Supply Bole Site", project: "Bole Heights Phase I" },
    { id: "EXP-02", category: "Labor", amount: 4200000, date: "2026-07-05", vendor: "BuildSync Payroll Ledger", description: "Formwork gang floor 4 assembly wages", project: "Bole Heights Phase I" },
    { id: "EXP-03", category: "Equipment", amount: 2800000, date: "2026-07-08", vendor: "Potain Cranes Ethiopia", description: "Tower crane monthly mobilization & lease", project: "Bole Heights Phase I" },
    { id: "EXP-04", category: "Overhead", amount: 1200000, date: "2026-07-10", vendor: "Tekle Consulting Engineers", description: "Consultant structural milestone inspection fee", project: "Bole Heights Phase I" },
    { id: "EXP-05", category: "Material", amount: 9400000, date: "2026-07-12", vendor: "Ethio Steel Mills", description: "High-Tensile Reinforcement Rebar 16mm & 20mm", project: "Yeka Hills Estate" }
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "INV-01", invoiceNumber: "INV-2026-001", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 35000000, status: "Paid", date: "2026-05-15", dueDate: "2026-06-15" },
    { id: "INV-02", invoiceNumber: "INV-2026-002", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 42000000, status: "Paid", date: "2026-06-10", dueDate: "2026-07-10" },
    { id: "INV-03", invoiceNumber: "INV-2026-003", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 28000000, status: "Pending", date: "2026-07-01", dueDate: "2026-08-01" },
    { id: "INV-04", invoiceNumber: "INV-2026-004", project: "Yeka Hills Estate", client: "Addis Real Estate Ltd", amount: 40000000, status: "Approved", date: "2026-07-05", dueDate: "2026-08-05" }
  ]);

  const [payments, setPayments] = useState<Payment[]>([
    { id: "PAY-01", invoiceId: "INV-01", invoiceNumber: "INV-2026-001", amount: 35000000, date: "2026-05-28", method: "Bank Transfer", reference: "CBE-TXN-90281", project: "Bole Heights Phase I" },
    { id: "PAY-02", invoiceId: "INV-02", invoiceNumber: "INV-2026-002", amount: 42000000, date: "2026-06-25", method: "Bank Transfer", reference: "AWASH-TXN-11029", project: "Bole Heights Phase I" }
  ]);

  // Project EVM List
  const [projectsEvm, setProjectsEvm] = useState<ProjectEvmData[]>([
    { id: "PRJ-01", name: "Bole Heights Phase I", budget: 65000000, approvedBudget: 65000000, actualCost: 38500000, earnedValue: 41200000, plannedValue: 40000000, forecastCost: 61800000, scheduleVarianceDays: -3 },
    { id: "PRJ-02", name: "Yeka Hills Premium Estate", budget: 120000000, approvedBudget: 120000000, actualCost: 52000000, earnedValue: 54500000, plannedValue: 55000000, forecastCost: 114500000, scheduleVarianceDays: 0 },
    { id: "PRJ-03", name: "Lemi National Cement Expansion", budget: 180000000, approvedBudget: 180000000, actualCost: 28000000, earnedValue: 27100000, plannedValue: 30000000, forecastCost: 186000000, scheduleVarianceDays: -8 }
  ]);

  // Procurement Records
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([
    { id: "PROC-01", poNumber: "PO-2026-881", supplier: "Lianxin Aluminum Ltd (China)", materialItem: "6061-T6 Aluminum Panels 1200x600", poAmount: 18500000, importCost: 1450000, customsTax: 2850000, deliveryCost: 650000, status: "Customs Cleared", date: "2026-07-01" },
    { id: "PROC-02", poNumber: "PO-2026-882", supplier: "Mugher Cement Factory", materialItem: "Bulk Cement Type I (C30 Grade)", poAmount: 12000000, importCost: 0, customsTax: 0, deliveryCost: 420000, status: "Paid", date: "2026-07-08" },
    { id: "PROC-03", poNumber: "PO-2026-883", supplier: "Ethio Steel Mills", materialItem: "Deformed Steel Bar 16mm High Tensile", poAmount: 15400000, importCost: 0, customsTax: 0, deliveryCost: 380000, status: "In Transit", date: "2026-07-14" }
  ]);

  // Equipment Cost Records
  const [equipments, setEquipments] = useState<EquipmentCostRecord[]>([
    { id: "EQ-01", equipmentName: "Potain Tower Crane MC235", assetCode: "TC-01", fuelLiters: 1850, fuelCost: 185000, maintenanceCost: 340000, sparePartsCost: 120000, rentalCost: 1800000, operatingHours: 210 },
    { id: "EQ-02", equipmentName: "Putzmeister Concrete Pump Truck 36m", assetCode: "CP-02", fuelLiters: 2400, fuelCost: 240000, maintenanceCost: 280000, sparePartsCost: 95000, rentalCost: 1200000, operatingHours: 185 },
    { id: "EQ-03", equipmentName: "CAT Excavator 330D Heavy Duty", assetCode: "EX-03", fuelLiters: 3100, fuelCost: 310000, maintenanceCost: 450000, sparePartsCost: 210000, rentalCost: 1400000, operatingHours: 240 }
  ]);

  // --- AUTOMATED MASTER COMPUTATIONS ---
  const companyRevenue = useMemo(() => invoices.reduce((sum, i) => sum + i.amount, 0), [invoices]);
  const companyExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const totalProjectBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.allocated, 0), [budgets]);
  const budgetUtilization = useMemo(() => totalProjectBudget > 0 ? (companyExpenses / totalProjectBudget) * 100 : 0, [companyExpenses, totalProjectBudget]);
  
  const accountsReceivable = useMemo(() => {
    const paidSum = payments.reduce((sum, p) => sum + p.amount, 0);
    return companyRevenue - paidSum;
  }, [companyRevenue, payments]);

  const accountsPayable = useMemo(() => {
    return procurements.filter(p => p.status !== "Paid").reduce((sum, p) => sum + p.poAmount + p.customsTax + p.deliveryCost, 0);
  }, [procurements]);

  // Asset Values
  const warehouseAssetVal = 42500000;
  const formworkAssetVal = useMemo(() => {
    const totalPanels = formworkPanelsList.length || 850;
    return totalPanels * 12500; // 12,500 ETB average asset replacement value per panel
  }, [formworkPanelsList]);
  const equipmentAssetVal = 55000000;

  // Breakdown Costs
  const payrollCost = 18400000;
  const overtimeCost = 3200000;
  const procurementCost = useMemo(() => procurements.reduce((sum, p) => sum + p.poAmount + p.importCost + p.customsTax + p.deliveryCost, 0), [procurements]);
  const maintenanceCost = useMemo(() => equipments.reduce((sum, e) => sum + e.maintenanceCost + e.sparePartsCost, 0) + repairRecordsList.reduce((sum, r) => sum + (r.cost || 0), 0), [equipments, repairRecordsList]);
  const fuelCost = useMemo(() => equipments.reduce((sum, e) => sum + e.fuelCost, 0), [equipments]);
  const transportCost = useMemo(() => procurements.reduce((sum, p) => sum + p.deliveryCost, 0) + 1200000, [procurements]);

  const netProfitVal = companyRevenue - companyExpenses;
  const grossProfitMargin = companyRevenue > 0 ? (netProfitVal / companyRevenue) * 100 : 0;

  // Report Center State
  const [selectedReportType, setSelectedReportType] = useState<"income" | "balance" | "cashflow" | "payroll" | "asset" | "procurement">("income");
  const [auditApproved, setAuditApproved] = useState(false);
  const [simulatedPrint, setSimulatedPrint] = useState(false);

  // Form Modals Toggles
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "Material" as const, allocated: 0, description: "", descriptionAm: "" });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Material" as const, amount: 0, date: "2026-07-21", vendor: "", description: "", project: "Bole Heights Phase I" });

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: "", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 0, status: "Pending" as const, date: "2026-07-21", dueDate: "2026-08-21" });

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlloc: BudgetCategory = {
      id: `B-${Date.now()}`,
      category: budgetForm.category,
      allocated: Number(budgetForm.allocated),
      description: budgetForm.description,
      descriptionAm: budgetForm.descriptionAm || budgetForm.description
    };
    setBudgets(prev => [...prev, newAlloc]);
    setShowBudgetForm(false);
    onLogAction?.("Allocate Budget", `Added ETB ${newAlloc.allocated} to ${newAlloc.category}`);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp: Expense = {
      id: `EXP-${Date.now()}`,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      vendor: expenseForm.vendor,
      description: expenseForm.description,
      project: expenseForm.project
    };
    setExpenses(prev => [newExp, ...prev]);
    setShowExpenseForm(false);
    onLogAction?.("Log Expense", `Recorded cost of ETB ${newExp.amount} from ${newExp.vendor}`);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const newInv: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: invoiceForm.invoiceNumber,
      project: invoiceForm.project,
      client: invoiceForm.client,
      amount: Number(invoiceForm.amount),
      status: invoiceForm.status,
      date: invoiceForm.date,
      dueDate: invoiceForm.dueDate
    };
    setInvoices(prev => [newInv, ...prev]);
    setShowInvoiceForm(false);
    onLogAction?.("Generate Invoice", `Created invoice ${newInv.invoiceNumber} for ETB ${newInv.amount}`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl max-w-7xl mx-auto space-y-8" id="finance-erp-root">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-500/20 text-white">
            <DollarSign size={26} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">{t("title")}</h1>
            <p className="text-xs text-slate-400 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
              {isAmharic ? "Firebase ሪል-ታይም ተገናኝቷል" : "Firebase Cloud Real-time Synced"}
            </span>
          </div>

          <button
            onClick={() => setActiveTab("financial-reports")}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md hover:opacity-95 transition cursor-pointer"
          >
            <Printer size={14} />
            <span>{isAmharic ? "የፋይናንስ ሪፖርት ማውጫ" : "Reports Center"}</span>
          </button>
        </div>
      </div>

      {/* TOP NAVIGATION TABS (10 MASTER MODULES) */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1.5">
        {[
          { id: "dashboard", label: isAmharic ? "አጠቃላይ ዳሽቦርድ" : "Dashboard", icon: Layers },
          { id: "project-mgmt", label: isAmharic ? "የፕሮጀክት EVM ወጪ" : "Project EVM", icon: Briefcase },
          { id: "payroll-mgmt", label: isAmharic ? "የደሞዝ አስተዳደር" : "Payroll System", icon: Users },
          { id: "formwork-assets", label: isAmharic ? "የፎርምወርክ ሀብት" : "Formwork Accounting", icon: Package },
          { id: "warehouse-cost", label: isAmharic ? "የመጋዘን ወጪ" : "Warehouse Cost", icon: Building2 },
          { id: "procurement-cost", label: isAmharic ? "የግዢና ጉምሩክ ወጪ" : "Procurement Cost", icon: CreditCard },
          { id: "equipment-cost", label: isAmharic ? "የማሽነሪና ነዳጅ ወጪ" : "Equipment & Fuel", icon: Truck },
          { id: "financial-reports", label: isAmharic ? "የፋይናንስ ሪፖርቶች" : "Financial Reports", icon: BarChart3 },
          { id: "ai-analytics", label: isAmharic ? "AI የፋይናንስ ትንበያ" : "AI Analytics", icon: Cpu },
          { id: "integrations", label: isAmharic ? "የስርዓት ትስስር" : "ERP Sync Matrix", icon: RefreshCw }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-t-xl transition cursor-pointer ${
                active
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
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

        {/* 1. EXECUTIVE DASHBOARD MODULE */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("companyRevenue")}</span>
                  <TrendingUp className="text-emerald-400" size={16} />
                </div>
                <div className="mt-2">
                  <span className="text-xl font-mono font-black text-white">ETB {companyRevenue.toLocaleString()}</span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {isAmharic ? "የተላኩና የተረጋገጡ ደረሰኞች" : "Invoiced client certificates"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("companyExpenses")}</span>
                  <TrendingDown className="text-red-400" size={16} />
                </div>
                <div className="mt-2">
                  <span className="text-xl font-mono font-black text-red-400">ETB {companyExpenses.toLocaleString()}</span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {isAmharic ? "የተመዘገቡ ወጪዎች" : "Logged construction expenditures"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("profitLoss")}</span>
                  <Percent className="text-emerald-400" size={16} />
                </div>
                <div className="mt-2">
                  <span className="text-xl font-mono font-black text-emerald-400">ETB {netProfitVal.toLocaleString()}</span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {isAmharic ? "የትርፍ መጠን፦ " : "Gross Margin: "}
                    <span className="font-bold text-emerald-400">{grossProfitMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-widest">{t("budgetUtilization")}</span>
                  <Zap className="text-amber-400" size={16} />
                </div>
                <div className="mt-2">
                  <span className="text-xl font-mono font-black text-amber-400">{budgetUtilization.toFixed(1)}%</span>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(budgetUtilization, 100)}%` }} />
                  </div>
                </div>
              </div>

            </div>

            {/* Asset Values & Liabilities Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
                  <span>{t("warehouseAssetVal")}</span>
                  <Building2 size={14} className="text-blue-400" />
                </div>
                <span className="text-lg font-mono font-black text-white block mt-2">ETB {warehouseAssetVal.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Stocked materials & raw hardware</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
                  <span>{t("formworkAssetVal")}</span>
                  <Layers size={14} className="text-emerald-400" />
                </div>
                <span className="text-lg font-mono font-black text-emerald-400 block mt-2">ETB {formworkAssetVal.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block mt-1">{formworkPanelsList.length || 850} Aluminum Panels @ 12.5k ETB/pc</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase">
                  <span>{t("equipmentAssetVal")}</span>
                  <Truck size={14} className="text-amber-400" />
                </div>
                <span className="text-lg font-mono font-black text-amber-400 block mt-2">ETB {equipmentAssetVal.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Tower cranes, excavators & pumps fleet</span>
              </div>

            </div>

            {/* Comprehensive Cost Breakdown Grid */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center space-x-2">
                <Sliders size={14} className="text-red-500" />
                <span>{isAmharic ? "የወጪዎች ክፍፍል ማጠቃለያ" : "Comprehensive Operational Cost Breakdown"}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("payrollCost")}</span>
                  <span className="text-sm font-black text-slate-100 mt-1 block">ETB {(payrollCost/1000000).toFixed(2)}M</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("overtimeCost")}</span>
                  <span className="text-sm font-black text-amber-400 mt-1 block">ETB {(overtimeCost/1000000).toFixed(2)}M</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("procurementCost")}</span>
                  <span className="text-sm font-black text-blue-400 mt-1 block">ETB {(procurementCost/1000000).toFixed(2)}M</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("maintenanceCost")}</span>
                  <span className="text-sm font-black text-purple-400 mt-1 block">ETB {(maintenanceCost/1000000).toFixed(2)}M</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("fuelCost")}</span>
                  <span className="text-sm font-black text-emerald-400 mt-1 block">ETB {(fuelCost/1000000).toFixed(2)}M</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">{t("transportCost")}</span>
                  <span className="text-sm font-black text-slate-300 mt-1 block">ETB {(transportCost/1000000).toFixed(2)}M</span>
                </div>
              </div>
            </div>

            {/* Quick Receivables & Payables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">{t("receivables")}</span>
                  <span className="text-xl font-mono font-black text-amber-400 block mt-1">ETB {accountsReceivable.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500">Uncollected client milestone certificates</span>
                </div>
                <CreditCard className="text-amber-500" size={28} />
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">{t("payables")}</span>
                  <span className="text-xl font-mono font-black text-red-400 block mt-1">ETB {accountsPayable.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-500">Outstanding supplier & import duty obligations</span>
                </div>
                <FileSpreadsheet className="text-red-400" size={28} />
              </div>
            </div>

          </div>
        )}

        {/* 2. PROJECT FINANCIAL MANAGEMENT (EVM) */}
        {activeTab === "project-mgmt" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Project Financial Management (EVM)</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "Earned Value Management - የፕሮጀክቶች በጀት፣ እውነተኛ ወጪ እና ልዩነት" : "Track CPI, SPI, Cost Variance (CV) & Schedule Variance (SV)"}</p>
              </div>
            </div>

            {/* EVM Projects Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-4">Project Name</th>
                      <th className="p-4">Approved Budget</th>
                      <th className="p-4">Actual Cost (AC)</th>
                      <th className="p-4">Earned Value (EV)</th>
                      <th className="p-4">Cost Variance (CV)</th>
                      <th className="p-4">CPI (EV/AC)</th>
                      <th className="p-4">Forecast Cost</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {projectsEvm.map(p => {
                      const cv = p.earnedValue - p.actualCost;
                      const cpi = p.actualCost > 0 ? p.earnedValue / p.actualCost : 1;
                      const cpiGood = cpi >= 1.0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-900/40 text-slate-200">
                          <td className="p-4 font-sans font-bold text-white">{p.name}</td>
                          <td className="p-4">ETB {(p.approvedBudget/1000000).toFixed(1)}M</td>
                          <td className="p-4 font-black text-red-400">ETB {(p.actualCost/1000000).toFixed(1)}M</td>
                          <td className="p-4 font-black text-emerald-400">ETB {(p.earnedValue/1000000).toFixed(1)}M</td>
                          <td className={`p-4 font-black ${cv >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ETB {(cv/1000000).toFixed(2)}M
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${cpiGood ? "bg-emerald-950 text-emerald-400 border border-emerald-900" : "bg-red-950 text-red-400 border border-red-900"}`}>
                              {cpi.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300">ETB {(p.forecastCost/1000000).toFixed(1)}M</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.scheduleVarianceDays <= 0 ? "text-emerald-400 bg-emerald-950/40" : "text-amber-400 bg-amber-950/40"}`}>
                              {p.scheduleVarianceDays <= 0 ? "On Schedule" : `${p.scheduleVarianceDays} Days Delayed`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. PAYROLL MANAGEMENT MODULE */}
        {activeTab === "payroll-mgmt" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Payroll Management & Attendance Integration</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "ከባዮሜትሪክስ የተገኘ የሰራተኞች ደሞዝ፣ አበል፣ ታክስ እና ፔንሲዮን ስሌት" : "Automated wages based on biometric attendance clock-ins"}</p>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="p-3">Worker Name</th>
                      <th className="p-3">Trade</th>
                      <th className="p-3">Basic Salary</th>
                      <th className="p-3">Overtime (1.5x)</th>
                      <th className="p-3">Allowances</th>
                      <th className="p-3">Tax (Income)</th>
                      <th className="p-3">Pension (7%)</th>
                      <th className="p-3 text-right">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {[
                      { name: "Abebe Bikila", trade: "Formwork Gang Chief", basic: 18500, ot: 3200, allow: 2500, tax: 3800, pension: 1295, net: 19105 },
                      { name: "Mulugeta Tadesse", trade: "Welder Master", basic: 16000, ot: 2400, allow: 2000, tax: 3100, pension: 1120, net: 16180 },
                      { name: "Tigist Haile", trade: "Site Engineer", basic: 24000, ot: 1800, allow: 3500, tax: 5600, pension: 1680, net: 22020 },
                      { name: "Kassaye Belay", trade: "Daily Assembly Craftsman", basic: 9500, ot: 1200, allow: 1000, tax: 1400, pension: 665, net: 9635 }
                    ].map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 text-slate-200">
                        <td className="p-3 font-sans font-bold text-white">{w.name}</td>
                        <td className="p-3 text-slate-400">{w.trade}</td>
                        <td className="p-3">ETB {w.basic.toLocaleString()}</td>
                        <td className="p-3 text-amber-400">+ ETB {w.ot.toLocaleString()}</td>
                        <td className="p-3 text-emerald-400">+ ETB {w.allow.toLocaleString()}</td>
                        <td className="p-3 text-red-400">- ETB {w.tax.toLocaleString()}</td>
                        <td className="p-3 text-slate-400">- ETB {w.pension.toLocaleString()}</td>
                        <td className="p-3 text-right font-black text-emerald-400">ETB {w.net.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. FORMWORK ASSET ACCOUNTING MODULE */}
        {activeTab === "formwork-assets" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Aluminum Formwork Asset Accounting</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "የአሉሚኒየም ፎርምወርክ ፓነሎች የግዢ ዋጋ፣ የእርጅና ቅናሽ እና የጥገና ሂሳብ" : "Track panel asset depreciation across 300 concrete casting usage cycles"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Initial Purchase Cost</span>
                <span className="text-lg font-black text-white mt-1 block">ETB 14,800,000</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Asset Book Value</span>
                <span className="text-lg font-black text-emerald-400 mt-1 block">ETB 11,200,000</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Amortization / Depreciation</span>
                <span className="text-lg font-black text-amber-400 mt-1 block">ETB 3,600,000</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Maintenance & Repair</span>
                <span className="text-lg font-black text-purple-400 mt-1 block">ETB 840,000</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. WAREHOUSE COST MANAGEMENT MODULE */}
        {activeTab === "warehouse-cost" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Warehouse Cost Management</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "የመጋዘን እቃዎች ሀብት ዋጋ፣ የጉዳት ወጪ እና የትራንስፖርት ሂሳብ" : "Real-time stock valuation and material loss cost accounting"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400">Total Stock Inventory Value</span>
                <span className="text-xl font-mono font-black text-white block mt-1">ETB 42,500,000</span>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400">Damaged & Missing Panel Exposure</span>
                <span className="text-xl font-mono font-black text-red-400 block mt-1">ETB 1,850,000</span>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400">Inter-Site Transport Expenses</span>
                <span className="text-xl font-mono font-black text-amber-400 block mt-1">ETB 940,000</span>
              </div>
            </div>
          </div>
        )}

        {/* 6. PROCUREMENT COST MODULE */}
        {activeTab === "procurement-cost" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Procurement & Import Cost Tracking</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "የቀጥታ ግዢ ትዕዛዞች፣ የባህር ማዶ ጭነት፣ የጉምሩክ ቀረጥና ታክስ" : "Track Purchase Orders (POs), supplier invoices, customs duty & delivery fees"}</p>
              </div>
            </div>

            {/* Procurement Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">PO Number</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4">Material Item</th>
                    <th className="p-4">PO Amount</th>
                    <th className="p-4">Customs Duties</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {procurements.map(proc => (
                    <tr key={proc.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{proc.poNumber}</td>
                      <td className="p-4 font-sans font-bold text-white">{proc.supplier}</td>
                      <td className="p-4 font-sans text-slate-300">{proc.materialItem}</td>
                      <td className="p-4 font-black text-white">ETB {proc.poAmount.toLocaleString()}</td>
                      <td className="p-4 text-emerald-400">ETB {proc.customsTax.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${proc.status === "Paid" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                          {proc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. EQUIPMENT COST MODULE */}
        {activeTab === "equipment-cost" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Equipment Operating & Fuel Cost</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "የከባድ ማሽነሪዎች የነዳጅ ፍጆታ፣ የኪራይና የጥገና ሂሳብ" : "Monitor fuel consumption, leasing fees & operating costs per hour"}</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">Equipment Name</th>
                    <th className="p-4">Asset Code</th>
                    <th className="p-4">Fuel (Liters)</th>
                    <th className="p-4">Fuel Cost</th>
                    <th className="p-4">Maintenance Cost</th>
                    <th className="p-4">Rental Lease Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {equipments.map(eq => (
                    <tr key={eq.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 font-sans font-bold text-white">{eq.equipmentName}</td>
                      <td className="p-4 text-slate-400">{eq.assetCode}</td>
                      <td className="p-4 font-bold text-blue-400">{eq.fuelLiters.toLocaleString()} L</td>
                      <td className="p-4 text-emerald-400">ETB {eq.fuelCost.toLocaleString()}</td>
                      <td className="p-4 text-purple-400">ETB {eq.maintenanceCost.toLocaleString()}</td>
                      <td className="p-4 text-amber-400">ETB {eq.rentalCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. FINANCIAL REPORTS MODULE */}
        {activeTab === "financial-reports" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Official Financial Statements & Audit Reports</h2>
                <p className="text-xs text-slate-400">Generate Income Statements, Balance Sheets, Cash Flow & Payroll Registers</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    alert("Official ERP Financial Statement exported as PDF!");
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md cursor-pointer hover:bg-red-700 transition"
                >
                  <FileDown size={14} />
                  <span>Export PDF / Excel</span>
                </button>
              </div>
            </div>

            {/* Simulated Printed Document */}
            <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-200 shadow-xl max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">BuildSync ERP Financial Statement</h3>
                  <p className="text-xs font-bold text-red-600 uppercase">Executive Financial Ledger & Audit Summary</p>
                </div>
                <div className="text-right text-xs font-mono text-slate-600">
                  <div>Date: 2026-07-21</div>
                  <div>Ref: BS-FIN-2026-901</div>
                </div>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-sans font-bold">Total Invoiced Revenue:</span>
                  <span className="font-bold text-emerald-700">ETB {companyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-sans font-bold">Total Direct Construction Costs:</span>
                  <span className="font-bold text-red-700">ETB {companyExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-sm font-black">
                  <span className="font-sans">Net Operating Profit:</span>
                  <span className="text-emerald-700">ETB {netProfitVal.toLocaleString()} ({grossProfitMargin.toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. AI FINANCIAL ANALYTICS MODULE */}
        {activeTab === "ai-analytics" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white flex items-center space-x-2">
                <Cpu className="text-red-500" size={20} />
                <span>AI Financial Analytics & Fraud Prevention</span>
              </h2>
              <p className="text-xs text-slate-400">Predictive cost modeling, cash flow forecasts, and anomaly detection</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase">
                  <ShieldAlert size={16} />
                  <span>Abnormal Spending Detection</span>
                </div>
                <p className="text-xs text-slate-300">
                  AI detected a +18% variance in fuel expenditure for CAT Excavator EX-03 compared to operating hours logged by timekeepers.
                </p>
              </div>

              <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase">
                  <TrendingUp size={16} />
                  <span>90-Day Cash Flow Forecast</span>
                </div>
                <p className="text-xs text-slate-300">
                  Projected positive net inflow of +ETB 34.5M over the next 90 days following milestone 3 certification clearance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 10. ERP INTEGRATIONS MATRIX MODULE */}
        {activeTab === "integrations" && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-lg font-black uppercase text-white flex items-center space-x-2">
                <RefreshCw className="text-emerald-400 animate-spin" size={20} />
                <span>Cross-ERP Module Synchronization Matrix</span>
              </h2>
              <p className="text-xs text-slate-400">Real-time bi-directional data flow with all BuildSync ERP sub-applications</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono text-xs">
              {[
                "Head Office App",
                "Admin App",
                "Warehouse Manager",
                "Procurement App",
                "Project Manager App",
                "Site Engineer App",
                "Supervisor App",
                "Team Leader App",
                "Gang Chief App",
                "Biometric Attendance",
                "CAD Drawing Module",
                "AI Digital Twin"
              ].map((mod, idx) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="font-sans font-bold text-slate-200">{mod}</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
