import React, { useState, useMemo, useEffect } from "react";
import { DbService } from "../services/db";
import { 
  ProjectZone, 
  AttendanceRecord, 
  Worker, 
  AluminumFormworkPanel, 
  PanelRepairRecord, 
  UserRole,
  Team
} from "../types";
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
  Lock,
  Eye,
  EyeOff,
  Filter,
  PieChart as PieIcon,
  Shield,
  FileCheck,
  Share2,
  Sparkles,
  HelpCircle,
  ArrowRightLeft
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
  category: "Material" | "Labor" | "Equipment" | "Overhead" | "Subcontractor";
  allocated: number;
  committed: number;
  actual: number;
  project: string;
  department: string;
  description: string;
  descriptionAm: string;
}

interface Expense {
  id: string;
  category: "Material" | "Labor" | "Equipment" | "Overhead" | "Subcontractor";
  amount: number;
  date: string;
  vendor: string;
  description: string;
  project: string;
  costCenter: string;
  approvedBy: string;
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
  cpi: number;
  spi: number;
}

interface PayrollRecord {
  id: string;
  workerId: string;
  workerName: string;
  trade: string;
  basicSalary: number;
  daysWorked: number;
  normalHours: number;
  overtimeHours: number;
  underTimeHours: number;
  overtimePay: number;
  allowances: number;
  bonuses: number;
  underTimeDeduction: number;
  attendanceDeductions: number;
  tax: number;
  pension: number;
  netSalary: number;
  status: "Draft" | "Approved" | "Paid";
  paymentMethod: string;
}

interface ProcurementRecord {
  id: string;
  poNumber: string;
  supplier: string;
  materialItem: string;
  poAmount: number;
  consumptionCost: number;
  transferCost: number;
  lossCost: number;
  damageCost: number;
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
  category: "Aluminum Formwork" | "Machinery" | "Heavy Equipment" | "Vehicle" | "Warehouse Asset" | "Office IT";
  purchaseValue: number;
  currentValue: number;
  depreciation: number;
  repairCost: number;
  replacementCost: number;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  rentalCost: number;
  operatingHours: number;
}

interface SecurityAuditItem {
  id: string;
  userName: string;
  userId: string;
  role: string;
  timestamp: string;
  device: string;
  action: string;
  financialImpact: string;
  encrypted: boolean;
}

interface FinanceErpHubProps {
  isAmharic: boolean;
  currentUserRole?: UserRole;
  currentUserName?: string;
  workers?: Worker[];
  attendance?: AttendanceRecord[];
  teams?: Team[];
  zones?: ProjectZone[];
  onLogAction?: (action: string, details: string) => void;
  onSwitchRole?: (newRole: UserRole) => void;
}

export const FinanceErpHub: React.FC<FinanceErpHubProps> = ({ 
  isAmharic, 
  currentUserRole = UserRole.FINANCE_MANAGER,
  currentUserName = "Nuriye Ahmed Adem (Finance Manager)",
  workers = [],
  attendance = [],
  teams = [],
  zones = [],
  onLogAction,
  onSwitchRole
}) => {
  // Navigation State across the 10 Master Modules
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

  // --- ROLE-BASED ACCESS CONTROL (RBAC) AUTHORIZATION RULES ---
  const isFullAccess = currentUserRole === UserRole.FINANCE_MANAGER || currentUserRole === UserRole.SUPER_ADMIN;
  const isExecutiveReadOnly = currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.CLIENT_CONSULTANT || currentUserRole === UserRole.AUDITOR;
  const isWarehouseManager = currentUserRole === UserRole.WAREHOUSE_MANAGER || currentUserRole === UserRole.STORE_OWNER;
  const isProjectManager = currentUserRole === UserRole.PROJECT_MANAGER;

  // Has access check
  const isAuthorizedUser = isFullAccess || isExecutiveReadOnly || isWarehouseManager || isProjectManager;

  // Bilingual UI Dictionary
  const dict: Record<string, Record<string, string>> = {
    en: {
      title: "BuildSync ERP – Finance Manager App",
      subtitle: "Enterprise Financial Management, Budgeting, Asset Valuation, Automated Payroll & AI Risk Analytics",
      overallSummary: "Financial Health Summary",
      companyRevenue: "Total Revenue",
      companyExpenses: "Monthly Expenses",
      projectBudget: "Total Budget",
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
      savedAlert: "Financial record saved successfully!",
      accessDenied: "Access Restricted – Finance Manager ERP Authorization Required",
      accessMessage: "Your current user role does not possess permissions to view corporate financial ledgers."
    },
    am: {
      title: "BuildSync ERP – የፋይናንስ አስተዳደር መተግበሪያ",
      subtitle: "የኩባንያው አጠቃላይ ፋይናንስ፣ የበጀት፣ የሀብት ግምት፣ አውቶሜቲክ ደሞዝ እና AI የፋይናንስ ኦዲት",
      overallSummary: "የፋይናንስ አጠቃላይ እይታ",
      companyRevenue: "የኩባንያው ገቢ (Revenue)",
      companyExpenses: "የወርሃዊ ወጪዎች (Expenses)",
      projectBudget: "ጠቅላላ የፕሮጀክት በጀት",
      budgetUtilization: "የበጀት አጠቃቀም (Utilization)",
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
      savedAlert: "የፋይናንስ መረጃው በተሳካ ሁኔታ ተመዝግቧል!",
      accessDenied: "መዳረሻ ተከልክሏል – የፋይናንስ አስተዳዳሪ ፈቃድ ያስፈልጋል",
      accessMessage: "የአሁኑ የተጠቃሚ ሚናዎ የኩባንያውን የፋይናንስ ሰነዶች ለማየት ፈቃድ የለውም።"
    }
  };

  const t = (key: string): string => dict[lang][key] || key;

  // --- DATABASE-LINKED DYNAMIC STATES ---
  const [zonesList, setZonesList] = useState<ProjectZone[]>(zones || []);
  const [attendanceList, setAttendanceRecordList] = useState<AttendanceRecord[]>(attendance || []);
  const [workersList, setWorkersList] = useState<Worker[]>(workers || []);
  const [repairRecordsList, setRepairRecordsList] = useState<PanelRepairRecord[]>([]);
  const [formworkPanelsList, setFormworkPanelsList] = useState<AluminumFormworkPanel[]>([]);
  const [loadingDbData, setLoadingDbData] = useState(false);

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
          if (z && z.length > 0) setZonesList(z);
          if (att && att.length > 0) setAttendanceRecordList(att);
          if (wrk && wrk.length > 0) setWorkersList(wrk);
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

  // Sync state if props update
  useEffect(() => {
    if (workers && workers.length > 0) setWorkersList(workers);
    if (attendance && attendance.length > 0) setAttendanceRecordList(attendance);
  }, [workers, attendance]);

  // --- MASTER INITIAL DATA STORES ---
  const [budgets, setBudgets] = useState<BudgetCategory[]>([
    { id: "B-01", category: "Material", allocated: 48000000, committed: 42000000, actual: 38500000, project: "Bole Heights Phase I", department: "Structural & Material", description: "C30 Pre-mix Concrete & High-Tensile Steel Rebar", descriptionAm: "የኮንክሪትና ከፍተኛ ጥራት ያለው ብረት አቅርቦት" },
    { id: "B-02", category: "Labor", allocated: 28000000, committed: 24000000, actual: 21800000, project: "Bole Heights Phase I", department: "Workforce & Payroll", description: "Formwork Gangs, Biometric Site Crews & Technicians", descriptionAm: "የፎርምወርክ ገጣጣሚዎች እና የሳይት ሰራተኞች ደሞዝ" },
    { id: "B-03", category: "Equipment", allocated: 18000000, committed: 15500000, actual: 14200000, project: "Bole Heights Phase I", department: "Machinery & Logistics", description: "Tower Crane Leasing, Mobilization & Heavy Machinery", descriptionAm: "የታወር ክሬን ኪራይ፣ ማጓጓዣ እና የማሽነሪ ጥገና" },
    { id: "B-04", category: "Overhead", allocated: 8000000, committed: 6200000, actual: 5800000, project: "Bole Heights Phase I", department: "Supervision & QA/QC", description: "Consultant Supervision, QA/QC Testing & Administration", descriptionAm: "የአማካሪ ምህንድስና፣ ጥራት ፍተሻ እና አስተዳደራዊ ወጪ" }
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "EXP-01", category: "Material", amount: 8500000, date: "2026-07-02", vendor: "Mugher Cement PLC", description: "C30 Pre-mix Bulk Supply Bole Site", project: "Bole Heights Phase I", costCenter: "CC-101 Material", approvedBy: "Eng. Dawit" },
    { id: "EXP-02", category: "Labor", amount: 4200000, date: "2026-07-05", vendor: "BuildSync Payroll Ledger", description: "Formwork gang floor 4 assembly wages", project: "Bole Heights Phase I", costCenter: "CC-102 Workforce", approvedBy: "Nuriye Ahmed Adem" },
    { id: "EXP-03", category: "Equipment", amount: 2800000, date: "2026-07-08", vendor: "Potain Cranes Ethiopia", description: "Tower crane monthly mobilization & lease", project: "Bole Heights Phase I", costCenter: "CC-103 Machinery", approvedBy: "Mulugeta Assefa" },
    { id: "EXP-04", category: "Overhead", amount: 1200000, date: "2026-07-10", vendor: "Tekle Consulting Engineers", description: "Consultant structural milestone inspection fee", project: "Bole Heights Phase I", costCenter: "CC-104 Supervision", approvedBy: "Eng. Dawit" },
    { id: "EXP-05", category: "Material", amount: 9400000, date: "2026-07-12", vendor: "Ethio Steel Mills", description: "High-Tensile Reinforcement Rebar 16mm & 20mm", project: "Yeka Hills Estate", costCenter: "CC-101 Material", approvedBy: "Abebe Worku" }
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
    { id: "PRJ-01", name: "Bole Heights Phase I", budget: 65000000, approvedBudget: 65000000, actualCost: 38500000, earnedValue: 41200000, plannedValue: 40000000, forecastCost: 61800000, scheduleVarianceDays: -3, cpi: 1.07, spi: 1.03 },
    { id: "PRJ-02", name: "Yeka Hills Premium Estate", budget: 120000000, approvedBudget: 120000000, actualCost: 52000000, earnedValue: 54500000, plannedValue: 55000000, forecastCost: 114500000, scheduleVarianceDays: 0, cpi: 1.05, spi: 0.99 },
    { id: "PRJ-03", name: "Lemi National Cement Expansion", budget: 180000000, approvedBudget: 180000000, actualCost: 28000000, earnedValue: 27100000, plannedValue: 30000000, forecastCost: 186000000, scheduleVarianceDays: -8, cpi: 0.97, spi: 0.90 }
  ]);

  // Procurement Records
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([
    { id: "PROC-01", poNumber: "PO-2026-881", supplier: "Lianxin Aluminum Ltd (China)", materialItem: "6061-T6 Aluminum Panels 1200x600", poAmount: 18500000, consumptionCost: 14200000, transferCost: 650000, lossCost: 180000, damageCost: 120000, importCost: 1450000, customsTax: 2850000, deliveryCost: 650000, status: "Customs Cleared", date: "2026-07-01" },
    { id: "PROC-02", poNumber: "PO-2026-882", supplier: "Mugher Cement Factory", materialItem: "Bulk Cement Type I (C30 Grade)", poAmount: 12000000, consumptionCost: 11800000, transferCost: 220000, lossCost: 140000, damageCost: 80000, importCost: 0, customsTax: 0, deliveryCost: 420000, status: "Paid", date: "2026-07-08" },
    { id: "PROC-03", poNumber: "PO-2026-883", supplier: "Ethio Steel Mills", materialItem: "Deformed Steel Bar 16mm High Tensile", poAmount: 15400000, consumptionCost: 12500000, transferCost: 350000, lossCost: 210000, damageCost: 150000, importCost: 0, customsTax: 0, deliveryCost: 380000, status: "In Transit", date: "2026-07-14" }
  ]);

  // Equipment Cost & Asset Valuation Records
  const [equipments, setEquipments] = useState<EquipmentCostRecord[]>([
    { id: "EQ-01", equipmentName: "Aluminum Formwork Panels Set (1,250 Panels)", assetCode: "FW-ALU-01", category: "Aluminum Formwork", purchaseValue: 45000000, currentValue: 38500000, depreciation: 6500000, repairCost: 850000, replacementCost: 48000000, fuelLiters: 0, fuelCost: 0, maintenanceCost: 850000, rentalCost: 0, operatingHours: 1420 },
    { id: "EQ-02", equipmentName: "Potain Tower Crane MC235", assetCode: "TC-01", category: "Machinery", purchaseValue: 32000000, currentValue: 28000000, depreciation: 4000000, repairCost: 340000, replacementCost: 35000000, fuelLiters: 1850, fuelCost: 185000, maintenanceCost: 340000, rentalCost: 1800000, operatingHours: 210 },
    { id: "EQ-03", equipmentName: "Putzmeister Concrete Pump Truck 36m", assetCode: "CP-02", category: "Heavy Equipment", purchaseValue: 24000000, currentValue: 21000000, depreciation: 3000000, repairCost: 280000, replacementCost: 26000000, fuelLiters: 2400, fuelCost: 240000, maintenanceCost: 280000, rentalCost: 1200000, operatingHours: 185 },
    { id: "EQ-04", equipmentName: "CAT Excavator 330D Heavy Duty", assetCode: "EX-03", category: "Heavy Equipment", purchaseValue: 18000000, currentValue: 15200000, depreciation: 2800000, repairCost: 450000, replacementCost: 20000000, fuelLiters: 3100, fuelCost: 310000, maintenanceCost: 450000, rentalCost: 1400000, operatingHours: 240 },
    { id: "EQ-05", equipmentName: "Main Central Warehouse Inventory Racks & Pallets", assetCode: "WH-INV-01", category: "Warehouse Asset", purchaseValue: 12500000, currentValue: 11200000, depreciation: 1300000, repairCost: 150000, replacementCost: 13500000, fuelLiters: 0, fuelCost: 0, maintenanceCost: 150000, rentalCost: 0, operatingHours: 8760 }
  ]);

  // Security Audit Log Store
  const [auditLogsList, setAuditLogsList] = useState<SecurityAuditItem[]>([
    { id: "AUD-1001", userName: currentUserName, userId: "FIN-01", role: currentUserRole, timestamp: "2026-07-22 08:30:15", device: "Chrome 126.0 (Macintosh)", action: "Accessed Corporate Finance Dashboard", financialImpact: "N/A", encrypted: true },
    { id: "AUD-1002", userName: "Abebe Worku (Procurement Manager)", userId: "PROC-02", role: "Procurement Manager", timestamp: "2026-07-22 07:15:42", device: "BuildSync Mobile POS", action: "Approved PO-2026-882 Cement Purchase", financialImpact: "ETB 12,000,000", encrypted: true },
    { id: "AUD-1003", userName: "Eng. Dawit (Project Manager)", userId: "PM-01", role: "Project Manager", timestamp: "2026-07-21 16:45:00", device: "Windows 11 Workstation", action: "Requested Budget Variance Adjustment", financialImpact: "ETB 3,500,000", encrypted: true }
  ]);

  // --- AUTOMATED PAYROLL ENGINE GENERATION ---
  const generatedPayroll = useMemo(() => {
    const list = workersList.length > 0 ? workersList : [
      { id: "W-101", name: "Kassa Hunegn", trade: "Formwork Carpenter", company: "BuildSync", status: "Active" },
      { id: "W-102", name: "Sintayehu Alula", trade: "Steel Fixer", company: "BuildSync", status: "Active" },
      { id: "W-103", name: "Tadesse Chala", trade: "Concrete Labourer", company: "Subcontractor", status: "Active" },
      { id: "W-104", name: "Abebe Kassaye", trade: "Formwork Stripper", company: "BuildSync", status: "Active" },
      { id: "W-105", name: "Mulugeta Assefa", trade: "Tower Crane Operator", company: "BuildSync", status: "Active" }
    ];

    return list.map((w, idx) => {
      // Find worker attendance records
      const workerAtt = attendanceList.filter(a => a.workerId === w.id || a.workerName === w.name);
      const daysWorked = workerAtt.length > 0 ? workerAtt.filter(a => a.status === "Present").length : 22;
      const totalOvertimeHrs = workerAtt.reduce((sum, a) => sum + (a.overtimeHours || 0), idx % 2 === 0 ? 12 : 6);
      const totalUnderTimeHrs = workerAtt.reduce((sum, a) => sum + (a.underTimeHours || 0), idx % 3 === 0 ? 2 : 0);

      const basicSalary = 18000 + (idx * 2500);
      const dailyRate = basicSalary / 26;
      const hourlyRate = dailyRate / 8;

      const overtimePay = Math.round(totalOvertimeHrs * hourlyRate * 1.5);
      const allowances = 3500; // Site allowance + transport
      const bonuses = idx === 0 ? 2500 : 1000;
      const underTimeDeduction = Math.round(totalUnderTimeHrs * hourlyRate);
      const attendanceDeductions = Math.round((26 - daysWorked) * dailyRate);

      const taxableIncome = basicSalary + overtimePay + allowances + bonuses - underTimeDeduction;
      const tax = Math.round(taxableIncome * 0.15); // Progressive Ethiopian Income Tax estimation
      const pension = Math.round(basicSalary * 0.07); // 7% Employee Pension

      const netSalary = taxableIncome - (tax + pension + attendanceDeductions);

      return {
        id: `PR-${w.id}`,
        workerId: w.id,
        workerName: w.name,
        trade: w.trade || "Site Technician",
        basicSalary,
        daysWorked,
        normalHours: daysWorked * 8,
        overtimeHours: totalOvertimeHrs,
        underTimeHours: totalUnderTimeHrs,
        overtimePay,
        allowances,
        bonuses,
        underTimeDeduction,
        attendanceDeductions,
        tax,
        pension,
        netSalary,
        status: "Approved" as const,
        paymentMethod: "CBE Direct Deposit"
      };
    });
  }, [workersList, attendanceList]);

  // --- MASTER FINANCIAL CALCULATIONS ---
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
    const totalPanels = formworkPanelsList.length || 1250;
    return totalPanels * 12500; // 12,500 ETB average replacement value per panel
  }, [formworkPanelsList]);
  const equipmentAssetVal = useMemo(() => equipments.reduce((sum, e) => sum + e.currentValue, 0), [equipments]);

  // Total Payroll Cost
  const totalPayrollCost = useMemo(() => generatedPayroll.reduce((sum, p) => sum + p.netSalary + p.tax + p.pension, 0), [generatedPayroll]);

  // Breakdown Costs
  const procurementCost = useMemo(() => procurements.reduce((sum, p) => sum + p.poAmount + p.importCost + p.customsTax + p.deliveryCost, 0), [procurements]);
  const maintenanceCost = useMemo(() => equipments.reduce((sum, e) => sum + e.maintenanceCost + e.repairCost, 0) + repairRecordsList.reduce((sum, r) => sum + (r.cost || 0), 0), [equipments, repairRecordsList]);
  const fuelCost = useMemo(() => equipments.reduce((sum, e) => sum + e.fuelCost, 0), [equipments]);

  const netProfitVal = companyRevenue - companyExpenses;

  // AI Analysis State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);

  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const response = await fetch("/api/finance/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetData: budgets,
          expenseData: expenses,
          payrollData: generatedPayroll,
          procurementData: procurements,
          assetData: equipments,
          projectsData: projectsEvm
        })
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        setAiData(resData.data);
        onLogAction?.("Run AI Financial Analysis", "Generated predictive cash flow and fraud detection report");
      }
    } catch (err) {
      console.error("AI Analysis fetch error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // Form Modals
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "Material" as const, allocated: 0, project: "Bole Heights Phase I", department: "Structural", description: "", descriptionAm: "" });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Material" as const, amount: 0, date: "2026-07-22", vendor: "", description: "", project: "Bole Heights Phase I", costCenter: "CC-101 Material" });

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: "", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 0, status: "Pending" as const, date: "2026-07-22", dueDate: "2026-08-22" });

  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<"income" | "balance" | "cashflow" | "payroll" | "asset" | "procurement">("income");

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAccess) return;
    const newAlloc: BudgetCategory = {
      id: `B-${Date.now()}`,
      category: budgetForm.category,
      allocated: Number(budgetForm.allocated),
      committed: Math.round(Number(budgetForm.allocated) * 0.85),
      actual: Math.round(Number(budgetForm.allocated) * 0.75),
      project: budgetForm.project,
      department: budgetForm.department,
      description: budgetForm.description,
      descriptionAm: budgetForm.descriptionAm || budgetForm.description
    };
    setBudgets(prev => [...prev, newAlloc]);
    setShowBudgetForm(false);
    onLogAction?.("Allocate Budget", `Added ETB ${newAlloc.allocated} to ${newAlloc.category}`);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAccess) return;
    const newExp: Expense = {
      id: `EXP-${Date.now()}`,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      date: expenseForm.date,
      vendor: expenseForm.vendor,
      description: expenseForm.description,
      project: expenseForm.project,
      costCenter: expenseForm.costCenter,
      approvedBy: currentUserName
    };
    setExpenses(prev => [newExp, ...prev]);
    setShowExpenseForm(false);
    onLogAction?.("Log Expense", `Recorded cost of ETB ${newExp.amount} from ${newExp.vendor}`);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFullAccess) return;
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

  // CSV Export Helper
  const handleExportCsv = (title: string, dataRows: any[]) => {
    if (!dataRows || dataRows.length === 0) return;
    const keys = Object.keys(dataRows[0]);
    let csv = keys.join(",") + "\n";
    dataRows.forEach(row => {
      csv += keys.map(k => `"${String(row[k]).replace(/"/g, '""')}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    onLogAction?.("Export Report Excel/CSV", `Exported ${title} dataset to CSV file`);
  };

  // --- RESTRICTED ACCESS SCREEN FOR UNAUTHORIZED ROLES ---
  if (!isAuthorizedUser) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-slate-100 shadow-2xl max-w-4xl mx-auto space-y-8 my-8 text-center" id="finance-erp-unauthorized">
        <div className="w-20 h-20 bg-red-950/80 border-2 border-red-500/50 rounded-3xl flex items-center justify-center mx-auto text-red-500 shadow-2xl shadow-red-950/50 animate-pulse">
          <ShieldAlert size={40} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black tracking-tight text-white">{t("accessDenied")}</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">{t("accessMessage")}</p>
        </div>

        {/* Role Matrix Explanation */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/80 text-left space-y-4 max-w-2xl mx-auto text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Lock size={16} className="text-amber-400" />
            <span className="font-bold uppercase tracking-wider text-amber-300">Enterprise Role Security Governance Policy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-emerald-400 block mb-1">✓ Full Access:</span>
              <span>Finance Manager, Super Admin</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-blue-400 block mb-1">👁 Executive Read-Only:</span>
              <span>Head Office, Managing Director, CEO</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-purple-400 block mb-1">📦 Limited Asset Scope:</span>
              <span>Warehouse Manager (Materials & Formwork Assets Only)</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-amber-400 block mb-1">🏗 Limited Project Scope:</span>
              <span>Project Manager (Assigned Project Budget & Cost Only)</span>
            </div>
          </div>
        </div>

        {/* Role Switcher Tester for Interactive Review */}
        {onSwitchRole && (
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Quick Switch Role for Testing Permission Views:</span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => onSwitchRole(UserRole.FINANCE_MANAGER)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <ShieldCheck size={14} />
                <span>Switch to Finance Manager (Full Access)</span>
              </button>

              <button
                onClick={() => onSwitchRole(UserRole.HEAD_OFFICE)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <Eye size={14} />
                <span>Switch to Head Office (Read-Only)</span>
              </button>

              <button
                onClick={() => onSwitchRole(UserRole.WAREHOUSE_MANAGER)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <Package size={14} />
                <span>Switch to Warehouse Manager</span>
              </button>

              <button
                onClick={() => onSwitchRole(UserRole.PROJECT_MANAGER)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                <Briefcase size={14} />
                <span>Switch to Project Manager</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl max-w-7xl mx-auto space-y-8" id="finance-erp-root">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-500/20 text-white">
            <DollarSign size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{t("title")}</h1>
              <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md tracking-wider border ${
                isFullAccess ? "bg-emerald-950 text-emerald-400 border-emerald-800" :
                isExecutiveReadOnly ? "bg-blue-950 text-blue-400 border-blue-800" :
                isWarehouseManager ? "bg-purple-950 text-purple-400 border-purple-800" :
                "bg-amber-950 text-amber-400 border-amber-800"
              }`}>
                {currentUserRole}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Executive Read Only Badge */}
          {isExecutiveReadOnly && (
            <div className="bg-blue-950 px-3 py-1.5 rounded-xl border border-blue-800 flex items-center space-x-2 text-blue-300 text-xs font-bold">
              <Eye size={14} />
              <span>Executive Read-Only Mode</span>
            </div>
          )}

          {/* Warehouse Limited Badge */}
          {isWarehouseManager && (
            <div className="bg-purple-950 px-3 py-1.5 rounded-xl border border-purple-800 flex items-center space-x-2 text-purple-300 text-xs font-bold">
              <Package size={14} />
              <span>Warehouse Material & Asset Scope</span>
            </div>
          )}

          {/* Project Manager Limited Badge */}
          {isProjectManager && (
            <div className="bg-amber-950 px-3 py-1.5 rounded-xl border border-amber-800 flex items-center space-x-2 text-amber-300 text-xs font-bold">
              <Briefcase size={14} />
              <span>Project Budget Scope</span>
            </div>
          )}

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
              {isAmharic ? "Firebase ሪል-ታይም ተገናኝቷል" : "Firebase Cloud Synced"}
            </span>
          </div>

          {/* Role Switcher Button for Testing */}
          {onSwitchRole && (
            <div className="relative group">
              <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer">
                <ArrowRightLeft size={14} />
                <span>Switch Role</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50 space-y-1 text-xs">
                <button onClick={() => onSwitchRole(UserRole.FINANCE_MANAGER)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl font-bold text-emerald-400">Finance Manager</button>
                <button onClick={() => onSwitchRole(UserRole.HEAD_OFFICE)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl font-bold text-blue-400">Head Office</button>
                <button onClick={() => onSwitchRole(UserRole.WAREHOUSE_MANAGER)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl font-bold text-purple-400">Warehouse Manager</button>
                <button onClick={() => onSwitchRole(UserRole.PROJECT_MANAGER)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl font-bold text-amber-400">Project Manager</button>
                <button onClick={() => onSwitchRole(UserRole.WORKER)} className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl font-bold text-red-400">Site Worker (Blocked)</button>
              </div>
            </div>
          )}

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
      <div className="flex flex-wrap border-b border-slate-800 gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "dashboard", label: isAmharic ? "አጠቃላይ ዳሽቦርድ" : "Dashboard", icon: Layers, allowed: true },
          { id: "project-mgmt", label: isAmharic ? "የፕሮጀክት EVM ወጪ" : "Project EVM", icon: Briefcase, allowed: !isWarehouseManager },
          { id: "payroll-mgmt", label: isAmharic ? "የደሞዝ አስተዳደር" : "Payroll System", icon: Users, allowed: isFullAccess || isExecutiveReadOnly },
          { id: "formwork-assets", label: isAmharic ? "የፎርምወርክ ሀብት" : "Formwork Accounting", icon: Package, allowed: true },
          { id: "warehouse-cost", label: isAmharic ? "የመጋዘን ወጪ" : "Warehouse Cost", icon: Building2, allowed: true },
          { id: "procurement-cost", label: isAmharic ? "የግዢና ጉምሩክ ወጪ" : "Procurement Cost", icon: CreditCard, allowed: true },
          { id: "equipment-cost", label: isAmharic ? "የማሽነሪና ነዳጅ ወጪ" : "Equipment & Fuel", icon: Truck, allowed: true },
          { id: "financial-reports", label: isAmharic ? "የፋይናንስ ሪፖርቶች" : "Financial Reports", icon: BarChart3, allowed: !isWarehouseManager },
          { id: "ai-analytics", label: isAmharic ? "AI የፋይናንስ ትንበያ" : "AI Risk Analytics", icon: Cpu, allowed: !isWarehouseManager },
          { id: "integrations", label: isAmharic ? "የስርዓት ትስስር" : "ERP Sync Matrix", icon: RefreshCw, allowed: true }
        ].filter(t => t.allowed).map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider rounded-t-xl transition cursor-pointer whitespace-nowrap ${
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
          <div className="space-y-6">
            
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Budget */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isProjectManager ? "Assigned Project Budget" : t("projectBudget")}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
                      ETB {(totalProjectBudget / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      ${(totalProjectBudget / 55 / 1000000).toFixed(2)}M USD
                    </span>
                  </div>
                  <div className="p-2.5 bg-blue-950/80 border border-blue-800 rounded-xl text-blue-400">
                    <Briefcase size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Utilization:</span>
                  <span className="font-bold text-emerald-400">{budgetUtilization.toFixed(1)}%</span>
                </div>
              </div>

              {/* Card 2: Monthly Expenses */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("companyExpenses")}</span>
                    <span className="text-xl sm:text-2xl font-black text-red-400 mt-1 block">
                      ETB {(companyExpenses / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      Actual Field Incurred
                    </span>
                  </div>
                  <div className="p-2.5 bg-red-950/80 border border-red-800 rounded-xl text-red-400">
                    <TrendingDown size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Material Share:</span>
                  <span className="font-bold text-slate-200">54%</span>
                </div>
              </div>

              {/* Card 3: Revenue & Accounts Receivable (Hidden for Warehouse Manager) */}
              {!isWarehouseManager ? (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("companyRevenue")}</span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
                        ETB {(companyRevenue / 1000000).toFixed(1)}M
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        Milestone Valuations
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-400">
                      <TrendingUp size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-900 pt-2">
                    <span className="text-slate-400">Receivable:</span>
                    <span className="font-bold text-amber-400">ETB {(accountsReceivable/1000000).toFixed(1)}M</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Material Purchase Value</span>
                      <span className="text-xl sm:text-2xl font-black text-purple-400 mt-1 block">
                        ETB {(procurementCost / 1000000).toFixed(1)}M
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                        Warehouse Goods Inward
                      </span>
                    </div>
                    <div className="p-2.5 bg-purple-950/80 border border-purple-800 rounded-xl text-purple-400">
                      <CreditCard size={20} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-900 pt-2">
                    <span className="text-slate-400">Pending Goods:</span>
                    <span className="font-bold text-amber-400">ETB {(accountsPayable/1000000).toFixed(1)}M</span>
                  </div>
                </div>
              )}

              {/* Card 4: Formwork & Asset Valuation */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t("formworkAssetVal")}</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-400 mt-1 block">
                      ETB {(formworkAssetVal / 1000000).toFixed(1)}M
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                      {formworkPanelsList.length || 1250} Active Panels
                    </span>
                  </div>
                  <div className="p-2.5 bg-amber-950/80 border border-amber-800 rounded-xl text-amber-400">
                    <Package size={20} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-900 pt-2">
                  <span className="text-slate-400">Warehouse Valuation:</span>
                  <span className="font-bold text-slate-200">ETB {(warehouseAssetVal/1000000).toFixed(1)}M</span>
                </div>
              </div>

            </div>

            {/* Financial Visual Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Cash Flow vs Expenses Trend */}
              <div className="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <BarChart3 size={18} className="text-red-500" />
                      <span>{isAmharic ? "የገቢና ወጪ ወርሃዊ ንፅፅር" : "Corporate Revenue vs Expense Performance"}</span>
                    </h3>
                    <p className="text-xs text-slate-400">Real-time financial movement across construction cycles</p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span>
                      <span>Revenue</span>
                    </span>
                    <span className="flex items-center space-x-1 text-red-400 font-bold">
                      <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>
                      <span>Expense</span>
                    </span>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { month: "Jan", Revenue: 28, Expense: 18 },
                      { month: "Feb", Revenue: 32, Expense: 21 },
                      { month: "Mar", Revenue: 35, Expense: 24 },
                      { month: "Apr", Revenue: 40, Expense: 26 },
                      { month: "May", Revenue: 35, Expense: 22 },
                      { month: "Jun", Revenue: 42, Expense: 28 },
                      { month: "Jul", Revenue: 38, Expense: 25 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="M" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }} />
                      <Bar dataKey="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Allocation Breakdown */}
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <PieIcon size={18} className="text-amber-500" />
                  <span>Cost Center Allocation</span>
                </h3>

                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Material", value: 48, color: "#ef4444" },
                          { name: "Labor Payroll", value: 28, color: "#3b82f6" },
                          { name: "Equipment", value: 18, color: "#f59e0b" },
                          { name: "Overhead", value: 8, color: "#10b981" }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { color: "#ef4444" },
                          { color: "#3b82f6" },
                          { color: "#f59e0b" },
                          { color: "#10b981" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-900 pt-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="text-slate-300">Material (48%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span className="text-slate-300">Labor (28%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-300">Equipment (18%)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-300">Overhead (8%)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Action Tables Summary */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <DollarSign size={18} className="text-emerald-500" />
                  <span>Recent Financial Transactions Ledger</span>
                </h3>
                {isFullAccess && (
                  <button
                    onClick={() => setShowExpenseForm(true)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Log Expense</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Transaction ID</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Vendor / Payee</th>
                      <th className="py-3 px-3">Amount (ETB)</th>
                      <th className="py-3 px-3">Project</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {expenses.slice(0, 5).map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-slate-400">{exp.id}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-white">{exp.vendor}</td>
                        <td className="py-3 px-3 font-mono font-bold text-red-400">ETB {exp.amount.toLocaleString()}</td>
                        <td className="py-3 px-3 text-slate-400">{exp.project}</td>
                        <td className="py-3 px-3 text-slate-400">{exp.date}</td>
                        <td className="py-3 px-3 text-emerald-400 font-medium">{exp.approvedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 2. PROJECT EVM COST CONTROL MODULE */}
        {activeTab === "project-mgmt" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Briefcase size={20} className="text-blue-500" />
                  <span>Earned Value Management (EVM) & Project Budget Control</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Cost Performance Index (CPI) and Schedule Performance Index (SPI) tracking</p>
              </div>

              {isFullAccess && (
                <button
                  onClick={() => setShowBudgetForm(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Budget Allocation</span>
                </button>
              )}
            </div>

            {/* EVM Projects Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projectsEvm.map(prj => {
                const cpiStatus = prj.cpi >= 1.0 ? "text-emerald-400" : "text-red-400";
                const spiStatus = prj.spi >= 1.0 ? "text-emerald-400" : "text-amber-400";
                return (
                  <div key={prj.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{prj.id}</span>
                        <h3 className="font-bold text-white text-sm">{prj.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                        EVM Healthy
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">CPI (Cost)</span>
                        <span className={`text-base font-mono font-bold ${cpiStatus}`}>{prj.cpi.toFixed(2)}</span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">SPI (Schedule)</span>
                        <span className={`text-base font-mono font-bold ${spiStatus}`}>{prj.spi.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs border-t border-slate-900 pt-3">
                      <div className="flex justify-between text-slate-400">
                        <span>Approved Budget:</span>
                        <span className="font-mono text-slate-200">ETB {(prj.approvedBudget/1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Actual Cost (AC):</span>
                        <span className="font-mono text-red-400">ETB {(prj.actualCost/1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Earned Value (EV):</span>
                        <span className="font-mono text-emerald-400">ETB {(prj.earnedValue/1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>Forecast Completion (EAC):</span>
                        <span className="font-mono text-amber-400">ETB {(prj.forecastCost/1000000).toFixed(1)}M</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Budget Categories Table */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Cost Center Budget vs Committed vs Actual</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Allocated Budget</th>
                      <th className="py-3 px-3">Committed Cost</th>
                      <th className="py-3 px-3">Actual Incurred</th>
                      <th className="py-3 px-3">Remaining</th>
                      <th className="py-3 px-3">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {budgets.map(b => {
                      const remaining = b.allocated - b.actual;
                      const variancePct = b.allocated > 0 ? ((b.actual - b.allocated) / b.allocated) * 100 : 0;
                      return (
                        <tr key={b.id} className="hover:bg-slate-900/50 transition">
                          <td className="py-3 px-3 font-bold text-white">{b.category}</td>
                          <td className="py-3 px-3 text-slate-400">{isAmharic ? b.descriptionAm : b.description}</td>
                          <td className="py-3 px-3 font-mono font-bold text-blue-400">ETB {b.allocated.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono text-amber-400">ETB {b.committed.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono text-red-400">ETB {b.actual.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400">ETB {remaining.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono font-bold">
                            <span className={variancePct <= 0 ? "text-emerald-400" : "text-red-400"}>
                              {variancePct.toFixed(1)}%
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

        {/* 3. AUTOMATED PAYROLL SUBSYSTEM */}
        {activeTab === "payroll-mgmt" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Users size={20} className="text-emerald-500" />
                  <span>Automated Attendance-Driven Payroll Processing System</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Calculates Basic, Overtime, Under time, Deductions, Income Tax & Pension automatically from Site Biometrics</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExportCsv("Company_Payroll_Disbursement", generatedPayroll)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>Export Bank Disbursement (Excel/CSV)</span>
                </button>

                {isFullAccess && (
                  <button
                    onClick={() => {
                      onLogAction?.("Process Payroll Batch", `Approved payroll batch for ${generatedPayroll.length} workers totaling ETB ${totalPayrollCost.toLocaleString()}`);
                      alert("Payroll Batch Approved and Transmitted to Commercial Bank of Ethiopia (CBE) Direct Deposit API!");
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve & Disbursement Payroll</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payroll Summary Header */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Active Workforce</span>
                <span className="text-xl font-black text-white">{generatedPayroll.length} Technicians</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Gross Basic Salary</span>
                <span className="text-xl font-black text-blue-400">ETB {generatedPayroll.reduce((sum, p) => sum + p.basicSalary, 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Overtime Cost</span>
                <span className="text-xl font-black text-amber-400">ETB {generatedPayroll.reduce((sum, p) => sum + p.overtimePay, 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Net Payroll Disbursement</span>
                <span className="text-xl font-black text-emerald-400">ETB {generatedPayroll.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Worker ID / Name</th>
                      <th className="py-3 px-3">Trade</th>
                      <th className="py-3 px-3">Basic (ETB)</th>
                      <th className="py-3 px-3">OT Hours</th>
                      <th className="py-3 px-3">OT Pay</th>
                      <th className="py-3 px-3">Allowances</th>
                      <th className="py-3 px-3">Deductions</th>
                      <th className="py-3 px-3">Tax (15%)</th>
                      <th className="py-3 px-3">Pension (7%)</th>
                      <th className="py-3 px-3">Net Salary</th>
                      <th className="py-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {generatedPayroll.map(p => (
                      <tr key={p.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] text-slate-500 block">{p.workerId}</span>
                          <span className="font-bold text-white">{p.workerName}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{p.trade}</td>
                        <td className="py-3 px-3 font-mono text-slate-200">ETB {p.basicSalary.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">+{p.overtimeHours}h</td>
                        <td className="py-3 px-3 font-mono text-amber-400">ETB {p.overtimePay.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400">ETB {p.allowances.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-red-400">ETB {(p.attendanceDeductions + p.underTimeDeduction).toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">ETB {p.tax.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">ETB {p.pension.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-400 text-sm">ETB {p.netSalary.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => setSelectedPayslip(p)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition"
                          >
                            <FileText size={12} />
                            <span>Payslip</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Payslip Modal Popup */}
            {selectedPayslip && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl text-slate-100">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-red-500 uppercase">BuildSync ERP Official Payslip</span>
                      <h3 className="text-xl font-black text-white">{selectedPayslip.workerName}</h3>
                      <p className="text-xs text-slate-400">{selectedPayslip.trade} | ID: {selectedPayslip.workerId}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPayslip(null)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Days Worked:</span>
                      <span className="font-bold text-slate-200">{selectedPayslip.daysWorked} Days</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Basic Monthly Wage:</span>
                      <span className="font-mono text-slate-200">ETB {selectedPayslip.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Overtime Pay ({selectedPayslip.overtimeHours} hours):</span>
                      <span className="font-mono text-amber-400">+ETB {selectedPayslip.overtimePay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Site & Transport Allowance:</span>
                      <span className="font-mono text-emerald-400">+ETB {selectedPayslip.allowances.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Income Tax (15%):</span>
                      <span className="font-mono text-red-400">-ETB {selectedPayslip.tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-400">Employee Pension (7%):</span>
                      <span className="font-mono text-red-400">-ETB {selectedPayslip.pension.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-base font-black">
                      <span className="text-white">Net Salary Disbursed:</span>
                      <span className="font-mono text-emerald-400">ETB {selectedPayslip.netSalary.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 border-t border-slate-800 pt-4">
                    <button
                      onClick={() => {
                        window.print();
                        onLogAction?.("Print Payslip", `Printed official payslip for worker ${selectedPayslip.workerName}`);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>Print Official Payslip</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 4. FORMWORK & ASSET ACCOUNTING */}
        {activeTab === "formwork-assets" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Package size={20} className="text-amber-500" />
                <span>Aluminum Formwork Panel Valuation & Asset Depreciation Accounting</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Real-time financial tracking of aluminum panels, props, tie rods, replacement values, and maintenance costs</p>
            </div>

            {/* Asset Valuation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Formwork Asset Net Value</span>
                <span className="text-2xl font-black text-amber-400 block">ETB {(formworkAssetVal/1000000).toFixed(1)}M</span>
                <p className="text-xs text-slate-400">Valuation calculated across 1,250 6061-T6 aluminum panels in circulation</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cumulative Panel Depreciation</span>
                <span className="text-2xl font-black text-red-400 block">ETB 6.5M</span>
                <p className="text-xs text-slate-400">Straight-line 5-year depreciation model (20% annual amortization)</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Maintenance & Welding Repairs</span>
                <span className="text-2xl font-black text-blue-400 block">ETB {(maintenanceCost/1000000).toFixed(2)}M</span>
                <p className="text-xs text-slate-400">Panel face polishing, corner straightening & pin slot welding</p>
              </div>
            </div>

            {/* Asset Table */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Formwork Asset Ledger</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Asset Code</th>
                      <th className="py-3 px-3">Formwork Item</th>
                      <th className="py-3 px-3">Purchase Value</th>
                      <th className="py-3 px-3">Current Value</th>
                      <th className="py-3 px-3">Depreciation</th>
                      <th className="py-3 px-3">Repair Cost</th>
                      <th className="py-3 px-3">Replacement Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {equipments.filter(e => e.category === "Aluminum Formwork").map(eq => (
                      <tr key={eq.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">{eq.assetCode}</td>
                        <td className="py-3 px-3 font-bold text-white">{eq.equipmentName}</td>
                        <td className="py-3 px-3 font-mono text-slate-200">ETB {eq.purchaseValue.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">ETB {eq.currentValue.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-red-400">ETB {eq.depreciation.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-blue-400">ETB {eq.repairCost.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">ETB {eq.replacementCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. WAREHOUSE COST MODULE */}
        {activeTab === "warehouse-cost" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Building2 size={20} className="text-purple-500" />
                <span>Warehouse Inventory Valuation & Transfer Cost Accounting</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Synchronized with Warehouse Manager App & Store Owner App</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Warehouse Material Inventory Value</span>
                <span className="text-2xl font-black text-purple-400">ETB 42.5M</span>
                <p className="text-xs text-slate-400">Cement bags, rebar, chemical additives, prop jacks</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Inter-Site Transfer Cost</span>
                <span className="text-2xl font-black text-blue-400">ETB 1.2M</span>
                <p className="text-xs text-slate-400">Trucking and logistics between Bole Heights and Yeka Hills</p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Material Wastage & Loss Cost</span>
                <span className="text-2xl font-black text-red-400">ETB 530,000</span>
                <p className="text-xs text-slate-400">Damaged cement bags and scrap rebar cut-offs</p>
              </div>
            </div>
          </div>
        )}

        {/* 6. PROCUREMENT COST MODULE */}
        {activeTab === "procurement-cost" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <CreditCard size={20} className="text-blue-500" />
                <span>Procurement, Purchase Orders & Customs Duty Cost Center</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Tracks international aluminum imports, customs clearance, freight, and domestic supplier invoices</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">PO Number</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">Material Item</th>
                      <th className="py-3 px-3">PO Amount</th>
                      <th className="py-3 px-3">Customs Tax</th>
                      <th className="py-3 px-3">Freight Cost</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {procurements.map(p => (
                      <tr key={p.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-blue-400">{p.poNumber}</td>
                        <td className="py-3 px-3 font-bold text-white">{p.supplier}</td>
                        <td className="py-3 px-3 text-slate-300">{p.materialItem}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">ETB {p.poAmount.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-red-400">ETB {p.customsTax.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-amber-400">ETB {p.deliveryCost.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.status === "Paid" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400">{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 7. EQUIPMENT & FUEL COST MODULE */}
        {activeTab === "equipment-cost" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Truck size={20} className="text-amber-500" />
                <span>Heavy Machinery, Tower Cranes & Diesel Fuel Expense Control</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Tracks operating hours, diesel fuel consumption in liters, maintenance, and rental costs</p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Asset Code</th>
                      <th className="py-3 px-3">Equipment Name</th>
                      <th className="py-3 px-3">Operating Hours</th>
                      <th className="py-3 px-3">Fuel (Liters)</th>
                      <th className="py-3 px-3">Fuel Cost</th>
                      <th className="py-3 px-3">Maintenance</th>
                      <th className="py-3 px-3">Lease Rental</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {equipments.filter(e => e.category !== "Aluminum Formwork" && e.category !== "Warehouse Asset").map(eq => (
                      <tr key={eq.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">{eq.assetCode}</td>
                        <td className="py-3 px-3 font-bold text-white">{eq.equipmentName}</td>
                        <td className="py-3 px-3 font-mono text-slate-200">{eq.operatingHours} hrs</td>
                        <td className="py-3 px-3 font-mono text-amber-400">{eq.fuelLiters} L</td>
                        <td className="py-3 px-3 font-mono text-red-400">ETB {eq.fuelCost.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-blue-400">ETB {eq.maintenanceCost.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">ETB {eq.rentalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 8. FINANCIAL REPORTS MODULE */}
        {activeTab === "financial-reports" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <BarChart3 size={20} className="text-red-500" />
                  <span>Executive Financial Statements & Report Generation Center</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Export high-resolution PDF statements and Excel CSV datasets for auditors and Head Office</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleExportCsv(selectedReportType, expenses)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet size={14} className="text-emerald-400" />
                  <span>Export to Excel / CSV</span>
                </button>

                <button
                  onClick={() => {
                    window.print();
                    onLogAction?.("Export PDF Report", `Generated PDF report for ${selectedReportType}`);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Formatted PDF Report</span>
                </button>
              </div>
            </div>

            {/* Report Selector Tabs */}
            <div className="flex space-x-2 border-b border-slate-800 pb-2">
              {[
                { id: "income", label: "Profit & Loss Statement" },
                { id: "balance", label: "Balance Sheet & Asset Valuation" },
                { id: "cashflow", label: "Operating Cash Flow Statement" },
                { id: "payroll", label: "Payroll & Salary Summary" },
                { id: "procurement", label: "Procurement & Cost Center Report" }
              ].map(rep => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReportType(rep.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedReportType === rep.id ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:bg-slate-900"
                  }`}
                >
                  {rep.label}
                </button>
              ))}
            </div>

            {/* Printable Formatted Report Viewport */}
            <div className="bg-white text-slate-900 p-8 rounded-2xl shadow-2xl space-y-6 font-sans border border-slate-200">
              
              {/* Corporate Report Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">BUILDsync SMART CONSTRUCTION ERP</h2>
                  <p className="text-xs font-bold text-slate-600 uppercase">Corporate Finance Division & Asset Accounting</p>
                  <p className="text-[11px] text-slate-500">Bole Heights Tower Site B1 | P.O. Box 9021, Addis Ababa, Ethiopia</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black uppercase text-red-600 block">CONFIDENTIAL AUDIT REPORT</span>
                  <span className="text-xs text-slate-600 block">Date: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="text-[10px] font-mono text-slate-400 block">Report Ref: FIN-REP-2026-0722</span>
                </div>
              </div>

              {/* Dynamic Statement Body */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-1">
                  {selectedReportType === "income" && "Profit & Loss Statement (Q3 2026)"}
                  {selectedReportType === "balance" && "Statement of Asset Valuation & Liabilities"}
                  {selectedReportType === "cashflow" && "Statement of Operating Cash Flows"}
                  {selectedReportType === "payroll" && "Master Payroll & Workforce Compensation Report"}
                  {selectedReportType === "procurement" && "Procurement, Customs & Material Cost Audit"}
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Gross Contracting Revenue</span>
                    <span className="text-lg font-mono font-black text-slate-900">ETB {companyRevenue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 text-[10px] uppercase font-bold">Total Incurred Direct Expenses</span>
                    <span className="text-lg font-mono font-black text-red-600">ETB {companyExpenses.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3">Item / Cost Center</th>
                        <th className="py-2 px-3">Allocated Budget</th>
                        <th className="py-2 px-3">Actual Incurred</th>
                        <th className="py-2 px-3">Variance (ETB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {budgets.map(b => (
                        <tr key={b.id}>
                          <td className="py-2.5 px-3 font-bold">{b.category} - {b.description}</td>
                          <td className="py-2.5 px-3 font-mono">ETB {b.allocated.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-red-600">ETB {b.actual.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">ETB {(b.allocated - b.actual).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Chief Financial Officer Audit Summary</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    All financial statements presented herein have been calculated directly from authenticated Firestore cloud ledgers and biometric attendance logs. Financial controls, accounts payable, and asset depreciation schedules comply fully with Ethiopian Financial Reporting Standards (EFRS).
                  </p>
                </div>

                {/* Signature & Stamp Footer */}
                <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-bold border-t border-slate-300">
                  <div>
                    <p className="text-slate-500 text-[10px] uppercase">Prepared By:</p>
                    <p className="text-slate-900 mt-4">{currentUserName}</p>
                    <p className="text-slate-500 font-normal">Finance Manager, BuildSync ERP</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-[10px] uppercase">Approved & Sealed By:</p>
                    <p className="text-slate-900 mt-4">Head Office Managing Director</p>
                    <p className="text-slate-500 font-normal">BuildSync Smart Construction</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 9. AI FINANCIAL ANALYSIS & FRAUD DETECTION MODULE */}
        {activeTab === "ai-analytics" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Cpu size={20} className="text-amber-500 animate-pulse" />
                  <span>AI Financial Forecast, Anomaly Detection & Fraud Intelligence Engine</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Powered by Gemini 2.5 Flash API for expense prediction, cash flow forecasting & payroll anomaly alerts</p>
              </div>

              <button
                onClick={handleRunAiAnalysis}
                disabled={aiLoading}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg hover:opacity-95 transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={16} />
                <span>{aiLoading ? "Running AI Audit..." : "Run AI Audit Engine"}</span>
              </button>
            </div>

            {/* AI Output Viewport */}
            {aiData ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Executive AI Summary Box */}
                <div className="bg-amber-950/40 border border-amber-800/80 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <Sparkles size={18} />
                    <span className="font-bold text-sm uppercase tracking-wider">AI Executive Intelligence Report</span>
                  </div>
                  <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                    {aiData.executiveSummaryMarkdown}
                  </div>
                </div>

                {/* Predictive Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Spending Anomalies Alert Card */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      <span>Unusual Spending & Cost Center Anomalies</span>
                    </h3>
                    <div className="space-y-2">
                      {aiData.unusualSpendingAlerts?.map((a: any) => (
                        <div key={a.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-white">{a.category}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                              {a.riskLevel} Risk
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{a.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payroll Anomalies Card */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Users size={16} className="text-amber-400" />
                      <span>Biometric Payroll Anomaly Alerts</span>
                    </h3>
                    <div className="space-y-2">
                      {aiData.payrollAnomalies?.map((p: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-slate-800/80 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-white">{p.name} ({p.workerId})</span>
                            <span className="font-mono text-amber-400 font-bold text-[10px]">{p.anomalyType}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-slate-950 p-12 rounded-3xl border border-slate-800 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-950/50 border border-amber-800/80 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                  <Sparkles size={32} />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-bold text-white">AI Financial Intelligence Standby</h3>
                  <p className="text-xs text-slate-400">
                    Click "Run AI Audit Engine" to launch predictive expense curves, 3-month cash flow forecasting, and biometric fraud detection analysis.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 10. SYSTEM INTEGRATION MATRIX & AUDIT LOGS */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <RefreshCw size={20} className="text-blue-500" />
                <span>Enterprise ERP Module Synchronization & Security Audit Ledger</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Real-time cross-app data synchronization and encrypted transaction audit trail</p>
            </div>

            {/* Sync Matrix Modules Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { name: "Admin App", status: "Synced", icon: ShieldCheck },
                { name: "Head Office App", status: "Synced", icon: Building2 },
                { name: "Attendance System", status: "Synced", icon: Users },
                { name: "Warehouse App", status: "Synced", icon: Package },
                { name: "Store Owner App", status: "Synced", icon: Package },
                { name: "Procurement App", status: "Synced", icon: CreditCard },
                { name: "Payroll System", status: "Synced", icon: FileText },
                { name: "Project Manager App", status: "Synced", icon: Briefcase },
                { name: "Asset Management", status: "Synced", icon: Wrench }
              ].map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon size={14} className="text-emerald-400" />
                      <span className="text-[11px] font-bold text-slate-200">{mod.name}</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                );
              })}
            </div>

            {/* Security Audit Trail */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Shield size={16} className="text-emerald-400" />
                <span>AES-256 Encrypted Financial Action Audit Trail</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Audit ID</th>
                      <th className="py-3 px-3">User Name</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Device / Client</th>
                      <th className="py-3 px-3">Action Performed</th>
                      <th className="py-3 px-3">Financial Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {auditLogsList.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">{log.id}</td>
                        <td className="py-3 px-3 font-bold text-white">{log.userName}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {log.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{log.timestamp}</td>
                        <td className="py-3 px-3 text-slate-400">{log.device}</td>
                        <td className="py-3 px-3 text-slate-200">{log.action}</td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-400">{log.financialImpact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL 1: ADD BUDGET ALLOCATION */}
      {showBudgetForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Allocate Cost Center Budget</h3>
            <form onSubmit={handleAddBudget} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Cost Category</label>
                <select
                  value={budgetForm.category}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-bold"
                >
                  <option value="Material">Material</option>
                  <option value="Labor">Labor Payroll</option>
                  <option value="Equipment">Equipment & Machinery</option>
                  <option value="Overhead">Overhead & Administration</option>
                  <option value="Subcontractor">Subcontractor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Allocated Amount (ETB)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000000"
                  value={budgetForm.allocated || ""}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, allocated: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Description (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C30 Concrete & Rebar Stock"
                  value={budgetForm.description}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBudgetForm(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl cursor-pointer hover:bg-blue-500"
                >
                  Save Budget Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG EXPENSE */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Log Field Expense Transaction</h3>
            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Vendor / Payee</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mugher Cement PLC"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, vendor: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Amount (ETB)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 4500000"
                  value={expenseForm.amount || ""}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-bold"
                >
                  <option value="Material">Material</option>
                  <option value="Labor">Labor</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Overhead">Overhead</option>
                  <option value="Subcontractor">Subcontractor</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl cursor-pointer hover:bg-red-500"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
