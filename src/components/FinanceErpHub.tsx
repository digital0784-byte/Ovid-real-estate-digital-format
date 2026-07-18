import React, { useState, useMemo } from "react";
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
  ShieldCheck,
  Zap,
  BarChart3,
  CreditCard,
  FileSpreadsheet
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
  Line
} from "recharts";

// Interfaces
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

interface ProjectData {
  id: string;
  name: string;
  budget: number;
}

interface FinanceErpHubProps {
  isAmharic: boolean;
  onLogAction?: (action: string, details: string) => void;
}

export const FinanceErpHub: React.FC<FinanceErpHubProps> = ({ isAmharic, onLogAction }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "budget" | "cost" | "expenses" | "invoices" | "payments" | "reports">("dashboard");

  // Bilingual UI Dictionary
  const lang = isAmharic ? "am" : "en";
  const dict: Record<string, Record<string, string>> = {
    en: {
      title: "Digital Construction ERP Finance ERP",
      subtitle: "Enterprise Budget, Cost Control, and Executive Financial Ledger System",
      overallSummary: "Financial Health Summary",
      projectCost: "Project Cost",
      materialCost: "Material Cost",
      laborCost: "Labor Cost",
      equipmentCost: "Equipment Cost",
      profitMargin: "Profit Margin",
      totalBudget: "Total Budget",
      totalInvoiced: "Total Invoiced",
      paymentsReceived: "Payments Received",
      outstandingReceivables: "Outstanding Receivables",
      actualProfit: "Actual Profit",
      budgetMgmt: "Budget Management",
      costCtrl: "Cost Control",
      expTrack: "Expense Tracking",
      invMgmt: "Invoice Management",
      payTrack: "Payment Tracking",
      plReport: "Profit & Loss",
      repGen: "Reports Generator",
      addBudget: "Add Budget Allocation",
      addExpense: "Log Actual Expense",
      createInvoice: "Raise Client Invoice",
      recordPayment: "Log Payment Received",
      category: "Category",
      amount: "Amount (ETB)",
      allocated: "Allocated",
      actual: "Actual Cost",
      variance: "Variance",
      status: "Status",
      action: "Actions",
      vendor: "Vendor/Recipient",
      project: "Project Name",
      description: "Description",
      date: "Date",
      invoiceNo: "Invoice #",
      client: "Client Name",
      dueDate: "Due Date",
      method: "Payment Method",
      refNo: "Reference #",
      reportsTitle: "ERP Report Center",
      reportsSubtitle: "Generate and audit compliance financial reports",
      dailyReport: "Daily Financial Digest",
      monthlyReport: "Monthly Performance Ledger",
      executiveReport: "Executive Board Summary",
      overrunWarning: "Overrun Warning Threshold",
      onTrack: "Under Control",
      warning: "Warning: Overallocated / Budget Overrun",
      generate: "Generate & Audit Report",
      print: "Print Ledger",
      savedAlert: "Financial record saved successfully!"
    },
    am: {
      title: "የዲጂታል ኮንስትራክሽን ERP ግንባታ ፋይናንስ ኢአርፒ (ERP)",
      subtitle: "የኩባንያው በጀት፣ የወጪ ቁጥጥር እና የቦርድ የፋይናንስ መግለጫ መከታተያ",
      overallSummary: "የፋይናንስ አጠቃላይ እይታ",
      projectCost: "አጠቃላይ የግንባታ ወጪ",
      materialCost: "የማቴሪያል ወጪ",
      laborCost: "የጉልበት ወጪ",
      equipmentCost: "የማሽነሪ ወጪ",
      profitMargin: "የትርፍ መጠን",
      totalBudget: "አጠቃላይ በጀት",
      totalInvoiced: "የተላከ ደረሰኝ",
      paymentsReceived: "የተሰበሰበ ክፍያ",
      outstandingReceivables: "ያልተሰበሰበ ሂሳብ",
      actualProfit: "የተጣራ ትርፍ",
      budgetMgmt: "የበጀት አስተዳደር",
      costCtrl: "የወጪ ወሰን ቁጥጥር",
      expTrack: "የወጪዎች መዝገብ",
      invMgmt: "ደረሰኞች አስተዳደር",
      payTrack: "ክፍያዎች ክትትል",
      plReport: "የትርፍ እና ኪሳራ መግለጫ",
      repGen: "ሪፖርት ማውጫ",
      addBudget: "በጀት መድብ",
      addExpense: "እውነተኛ ወጪ መዝግብ",
      createInvoice: "ደረሰኝ አውጣ",
      recordPayment: "ክፍያ መዝግብ",
      category: "ዓይነት",
      amount: "የገንዘብ መጠን (ETB)",
      allocated: "የተመደበ በጀት",
      actual: "እውነተኛ ወጪ",
      variance: "ልዩነት (Variance)",
      status: "ሁኔታ",
      action: "ተግባራት",
      vendor: "አቅራቢ / ተቀባይ",
      project: "የፕሮጀክቱ ስም",
      description: "መግለጫ",
      date: "ቀን",
      invoiceNo: "የደረሰኝ ቁጥር",
      client: "የደንበኛው ስም",
      dueDate: "መክፈያ ቀን",
      method: "የክፍያ ዘዴ",
      refNo: "የማጣቀሻ ቁጥር",
      reportsTitle: "የፋይናንስ ሪፖርት ማዕከል",
      reportsSubtitle: "ኦፊሴላዊ የኦዲት እና የግምገማ ሪፖርቶችን ያውጡ",
      dailyReport: "የዕለት ፋይናንስ ማጠቃለያ",
      monthlyReport: "የወርሃዊ የሂሳብ መግለጫ",
      executiveReport: "ለዋና ቦርድ የሚቀርብ ማጠቃለያ",
      overrunWarning: "ከበጀት በላይ የማስጠንቀቂያ ገደብ",
      onTrack: "በቁጥጥር ስር ያለ",
      warning: "ማስጠንቀቂያ፦ ከተመደበ በጀት በላይ ሆኗል",
      generate: "ሪፖርት አውጣ እና መርምር",
      print: "ሪፖርቱን አትም / መዝግብ",
      savedAlert: "የፋይናንስ መረጃው በተሳካ ሁኔታ ተመዝግቧል!"
    }
  };

  const t = (key: string): string => dict[lang][key] || key;

  // Static/Config Databases
  const projects: ProjectData[] = [
    { id: "PRJ-01", name: "Bole Heights Phase I", budget: 45000000 },
    { id: "PRJ-02", name: "Yeka Hills Premium Estate", budget: 180000000 },
    { id: "PRJ-03", name: "Lemi National Cement Expansion", budget: 240000000 }
  ];

  // Initial State Data
  const [budgets, setBudgets] = useState<BudgetCategory[]>([
    { id: "B-01", category: "Material", allocated: 18000000, description: "Reinforcement Steel and High-performance Concrete Work", descriptionAm: "የብረት ማጠናከሪያ እና ከፍተኛ ጥራት ያለው ኮንክሪት ስራ" },
    { id: "B-02", category: "Labor", allocated: 12000000, description: "Formwork Assembly Gangs and Skilled Site Crews", descriptionAm: "የአሉሚኒየም ፎርምወርክ ቡድን እና የባለሙያ ደመወዝ" },
    { id: "B-03", category: "Equipment", allocated: 10000000, description: "Tower Crane Leasing, Mobilization, and Heavy Scaffolding", descriptionAm: "የታወር ክሬን ኪራይ፣ ማጓጓዣ እና የማሽነሪዎች ጥገና" },
    { id: "B-04", category: "Overhead", allocated: 5000000, description: "Consulting Engineers, QA Testing, and Permits", descriptionAm: "የምህንድስና አማካሪዎች፣ ጥራት ፍተሻ እና አስተዳደራዊ ወጪ" }
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "EXP-01", category: "Material", amount: 4500000, date: "2026-07-02", vendor: "Ethio-Steel PLC", description: "Bole Heights Block B1 Column rebar re-reinforcements", project: "Bole Heights Phase I" },
    { id: "EXP-02", category: "Labor", amount: 3200000, date: "2026-07-05", vendor: "Silt'e Assembly Cooperative", description: "Formwork assembly and panel oiling wages - Level 4", project: "Bole Heights Phase I" },
    { id: "EXP-03", category: "Equipment", amount: 2800000, date: "2026-07-08", vendor: "Potain Crane Leases Ltd", description: "Monthly crawler crane & hoist rental - Bole Heights site", project: "Bole Heights Phase I" },
    { id: "EXP-04", category: "Overhead", amount: 1200000, date: "2026-07-10", vendor: "Tekle Consulting Partners", description: "Consultant verification inspection milestone signoff fee", project: "Bole Heights Phase I" },
    { id: "EXP-05", category: "Material", amount: 8000000, date: "2026-07-11", vendor: "Mugher Cement", description: "Pre-mix concrete bulk purchase C30 compressive strength", project: "Bole Heights Phase I" },
    { id: "EXP-06", category: "Labor", amount: 4500000, date: "2026-07-12", vendor: "Digital Construction ERP Payroll Account", description: "Site engineering staff salaries and overtime disbursements", project: "Bole Heights Phase I" },
    { id: "EXP-07", category: "Equipment", amount: 6500000, date: "2026-07-13", vendor: "National Excavations", description: "Excavator machinery mobilization and hydraulic system overhaul", project: "Bole Heights Phase I" }
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: "INV-01", invoiceNumber: "INV-2026-001", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 12000000, status: "Paid", date: "2026-05-15", dueDate: "2026-06-15" },
    { id: "INV-02", invoiceNumber: "INV-2026-002", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 15000000, status: "Paid", date: "2026-06-10", dueDate: "2026-07-10" },
    { id: "INV-03", invoiceNumber: "INV-2026-003", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 8000000, status: "Pending", date: "2026-07-01", dueDate: "2026-08-01" }
  ]);

  const [payments, setPayments] = useState<Payment[]>([
    { id: "PAY-01", invoiceId: "INV-01", invoiceNumber: "INV-2026-001", amount: 12000000, date: "2026-05-28", method: "Bank Transfer", reference: "CBE-TXN-90281", project: "Bole Heights Phase I" },
    { id: "PAY-02", invoiceId: "INV-02", invoiceNumber: "INV-2026-002", amount: 15000000, date: "2026-06-25", method: "Bank Transfer", reference: "AWASH-TXN-11029", project: "Bole Heights Phase I" }
  ]);

  // Form states
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: "Material" as const, allocated: 0, description: "", descriptionAm: "" });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ category: "Material" as const, amount: 0, date: "2026-07-15", vendor: "", description: "", project: "Bole Heights Phase I" });

  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoiceNumber: "", project: "Bole Heights Phase I", client: "Federal Housing Corp", amount: 0, status: "Pending" as const, date: "2026-07-15", dueDate: "2026-08-15" });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", amount: 0, date: "2026-07-15", method: "Bank Transfer", reference: "", project: "Bole Heights Phase I" });

  // Report Center state
  const [selectedReportType, setSelectedReportType] = useState<"daily" | "monthly" | "executive">("executive");
  const [auditApproved, setAuditApproved] = useState(false);
  const [simulatedPrint, setSimulatedPrint] = useState(false);

  // AUTOMATED CALCULATIONS
  const materialCost = useMemo(() => expenses.filter(e => e.category === "Material").reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const laborCost = useMemo(() => expenses.filter(e => e.category === "Labor").reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const equipmentCost = useMemo(() => expenses.filter(e => e.category === "Equipment").reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const overheadCost = useMemo(() => expenses.filter(e => e.category === "Overhead").reduce((sum, e) => sum + e.amount, 0), [expenses]);

  const totalProjectCost = useMemo(() => materialCost + laborCost + equipmentCost + overheadCost, [materialCost, laborCost, equipmentCost, overheadCost]);
  const totalAllocatedBudget = useMemo(() => budgets.reduce((sum, b) => sum + b.allocated, 0), [budgets]);

  const totalInvoicedAmount = useMemo(() => invoices.reduce((sum, i) => sum + i.amount, 0), [invoices]);
  const totalPaymentsReceived = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const outstandingReceivables = useMemo(() => totalInvoicedAmount - totalPaymentsReceived, [totalInvoicedAmount, totalPaymentsReceived]);

  const actualProfitVal = useMemo(() => totalInvoicedAmount - totalProjectCost, [totalInvoicedAmount, totalProjectCost]);
  const profitMarginPercent = useMemo(() => totalInvoicedAmount > 0 ? (actualProfitVal / totalInvoicedAmount) * 100 : 0, [actualProfitVal, totalInvoicedAmount]);

  // Handle addition callbacks
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

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedInv = invoices.find(inv => inv.id === paymentForm.invoiceId);
    const newPay: Payment = {
      id: `PAY-${Date.now()}`,
      invoiceId: paymentForm.invoiceId,
      invoiceNumber: selectedInv ? selectedInv.invoiceNumber : "N/A",
      amount: Number(paymentForm.amount),
      date: paymentForm.date,
      method: paymentForm.method,
      reference: paymentForm.reference,
      project: paymentForm.project
    };
    setPayments(prev => [newPay, ...prev]);

    // Update parent invoice status if fully paid or near paid
    if (selectedInv) {
      const sumPaidForThisInv = payments.filter(p => p.invoiceId === paymentForm.invoiceId).reduce((sum, p) => sum + p.amount, 0) + newPay.amount;
      if (sumPaidForThisInv >= selectedInv.amount) {
        setInvoices(prev => prev.map(inv => inv.id === selectedInv.id ? { ...inv, status: "Paid" as const } : inv));
      }
    }

    setShowPaymentForm(false);
    onLogAction?.("Track Payment", `Logged payment reference ${newPay.reference} of ETB ${newPay.amount}`);
  };

  // Recharts preparation data
  const comparisonData = useMemo(() => {
    return budgets.map(b => {
      const spent = expenses.filter(e => e.category === b.category).reduce((sum, e) => sum + e.amount, 0);
      return {
        name: b.category,
        Budget: b.allocated,
        Actual: spent,
        Variance: b.allocated - spent
      };
    });
  }, [budgets, expenses]);

  const categoryShareData = useMemo(() => {
    return [
      { name: isAmharic ? "ማቴሪያል (Material)" : "Material", value: materialCost, color: "#3b82f6" },
      { name: isAmharic ? "ጉልበት (Labor)" : "Labor", value: laborCost, color: "#ef4444" },
      { name: isAmharic ? "ማሽነሪ (Equipment)" : "Equipment", value: equipmentCost, color: "#f59e0b" },
      { name: isAmharic ? "አስተዳደር (Overhead)" : "Overhead", value: overheadCost, color: "#10b981" }
    ].filter(item => item.value > 0);
  }, [materialCost, laborCost, equipmentCost, overheadCost, isAmharic]);

  const timelineData = useMemo(() => {
    // Group expenses by date, sort them
    const groups: Record<string, number> = {};
    expenses.forEach(e => {
      groups[e.date] = (groups[e.date] || 0) + e.amount;
    });
    return Object.keys(groups).sort().map(d => ({
      date: d,
      "Daily Cost": groups[d]
    })).slice(-8); // take last 8 days
  }, [expenses]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl max-w-7xl mx-auto space-y-8" id="finance-erp-root">
      {/* ERP Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-500/20 text-white">
              <DollarSign size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">{t("title")}</h1>
              <p className="text-xs text-slate-400 mt-1">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Top Mini-Metrics */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setActiveTab("reports");
              setSelectedReportType("executive");
            }}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-md hover:opacity-95 transition-all"
          >
            <FileText size={14} />
            <span>{isAmharic ? "የቦርድ ሪፖርት ማመንጫ" : "Executive Report Center"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2">
        {[
          { id: "dashboard", label: isAmharic ? "አጠቃላይ ማጠቃለያ" : "Overall Summary", icon: Layers },
          { id: "budget", label: t("budgetMgmt"), icon: Briefcase },
          { id: "cost", label: t("costCtrl"), icon: AlertCircle },
          { id: "expenses", label: t("expTrack"), icon: FileSpreadsheet },
          { id: "invoices", label: t("invMgmt"), icon: FileText },
          { id: "payments", label: t("payTrack"), icon: CreditCard },
          { id: "reports", label: t("repGen"), icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSimulatedPrint(false);
              }}
              className={`px-4 py-3 flex items-center space-x-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                active ? "text-red-500 border-red-500 bg-slate-800/40" : "text-slate-400 border-transparent hover:text-white hover:bg-slate-800/10"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CORE AUTOMATED CALCULATIONS KPI BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Project Cost */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">{t("projectCost")}</span>
            <TrendingDown className="text-red-500" size={16} />
          </div>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-white">ETB {totalProjectCost.toLocaleString()}</span>
            <div className="text-[10px] text-slate-500 mt-1">
              {isAmharic ? "ከጠቅላላ በጀት " : "Allocated Budget: "}
              <span className="font-semibold text-slate-300">ETB {totalAllocatedBudget.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Material Cost */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">{t("materialCost")}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-blue-400">ETB {materialCost.toLocaleString()}</span>
            <div className="text-[10px] text-slate-500 mt-1">
              {isAmharic ? "ጠቅላላ የሲሚንቶና የብረት ወጪ" : "Concrete, steel & panel re-orders"}
            </div>
          </div>
        </div>

        {/* Labor Cost */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">{t("laborCost")}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-red-400">ETB {laborCost.toLocaleString()}</span>
            <div className="text-[10px] text-slate-500 mt-1">
              {isAmharic ? "የፎርምወርክ መገጣጠም ማካካሻ" : "Skilled assembly crew disbursements"}
            </div>
          </div>
        </div>

        {/* Equipment Cost */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">{t("equipmentCost")}</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-mono font-black text-amber-500">ETB {equipmentCost.toLocaleString()}</span>
            <div className="text-[10px] text-slate-500 mt-1">
              {isAmharic ? "የታወር ክሬንና ከባድ ማሽነሪ ኪራይ" : "Heavy crane logistics & hoist leases"}
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-widest">{t("profitMargin")}</span>
            <Percent className="text-emerald-500 animate-pulse" size={16} />
          </div>
          <div className="mt-2">
            <span className={`text-xl font-mono font-black ${profitMarginPercent >= 15 ? "text-emerald-400" : "text-amber-500"}`}>
              {profitMarginPercent.toFixed(2)}%
            </span>
            <div className="text-[10px] text-slate-500 mt-1">
              {isAmharic ? "የተጣራ ትርፍ፦ " : "Net Value: "}
              <span className="font-semibold text-emerald-500">ETB {actualProfitVal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEWPORT CONTROLLER */}
      <div className="transition-all duration-300">
        
        {/* TAB 1: OVERALL DASHBOARD & VISUALIZATIONS */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Cost Comparison Chart */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {isAmharic ? "በጀት ከእውነተኛ ወጪ ማነፃፀሪያ" : "Budget Allocation vs Actual Cost"}
                  </h3>
                  <div className="flex items-center space-x-3 text-[10px]">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                      <span className="text-slate-400">{isAmharic ? "የተመደበ በጀት" : "Allocated Budget"}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                      <span className="text-slate-400">{isAmharic ? "እውነተኛ ወጪ" : "Actual Cost"}</span>
                    </span>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155" }}
                        labelStyle={{ color: "#ffffff", fontWeight: "bold" }}
                      />
                      <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Cost Breakdown Pie Share */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {isAmharic ? "የወጪዎች ድርሻ ማጠቃለያ" : "Cost Breakdown Share"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isAmharic ? "ያለፉት ወጪዎች ምድብ መቶኛ ድርሻ" : "Percentage distribution of active construction ledger cost items"}
                  </p>
                </div>

                <div className="h-44 my-2 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryShareData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid #334155" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-800 pt-3">
                  {categoryShareData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-400 truncate max-w-[100px]">{item.name}</span>
                      <span className="font-mono font-bold text-white ml-auto">
                        {((item.value / totalProjectCost) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sub-grid of project statistics & warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase">{t("totalBudget")}</span>
                <span className="text-lg font-mono font-black text-white mt-1 block">ETB {totalAllocatedBudget.toLocaleString()}</span>
                <p className="text-[10px] text-slate-500 mt-1">{isAmharic ? "ከተመደበው አጠቃላይ የመንግስት ፈንድ" : "From federal housing master grant fund allocation"}</p>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase">{t("totalInvoiced")}</span>
                <span className="text-lg font-mono font-black text-white mt-1 block">ETB {totalInvoicedAmount.toLocaleString()}</span>
                <p className="text-[10px] text-slate-500 mt-1">{isAmharic ? "ለተቆጣጣሪው የቀረበ የተፈረመበት ዋጋ" : "Total client-signed invoice certificates"}</p>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase">{t("paymentsReceived")}</span>
                <span className="text-lg font-mono font-black text-emerald-400 mt-1 block">ETB {totalPaymentsReceived.toLocaleString()}</span>
                <p className="text-[10px] text-slate-500 mt-1">{isAmharic ? "በኢትዮጵያ ንግድ ባንክ ገቢ የተደረገ" : "Fully cleared in Commercial Bank accounts"}</p>
              </div>

              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 block uppercase">{t("outstandingReceivables")}</span>
                <span className="text-lg font-mono font-black text-amber-500 mt-1 block">ETB {outstandingReceivables.toLocaleString()}</span>
                <p className="text-[10px] text-slate-500 mt-1">{isAmharic ? "የላቀ የአካውንት ተቀባይ መዝገብ" : "Pending certificate of milestone 3 payment"}</p>
              </div>

            </div>

            {/* Bottom Alert/AI Insight */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-red-500/20 flex items-center space-x-3">
              <Zap className="text-amber-500 animate-bounce" size={20} />
              <div className="text-xs">
                <span className="font-bold text-white mr-2">Digital Construction ERP Financial Intelligence Engine AI Recommendation:</span>
                <span className="text-slate-300">
                  {isAmharic
                    ? "የማቴሪያል ወጪ ከተመደበው በጀት 82% ደርሷል። ወጪዎችን ለመቀነስ የአሉሚኒየም ፎርምወርክ መለዋወጫዎችን ከአገር ውስጥ አቅራቢዎች በቅናሽ ዋጋ ለማግኘት ይሞክሩ።"
                    : "Material cost allocation has reached 82% of assigned budget. Implement localized scrap metal panel recycling to offset the ETB 90,000 variance gap in Floor 4 columns."
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUDGET MANAGEMENT */}
        {activeTab === "budget" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">{t("budgetMgmt")}</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "የግንባታ በጀት ምደባ ማረጋገጫ" : "Configure structural cost ceilings and milestones"}</p>
              </div>
              <button
                onClick={() => setShowBudgetForm(!showBudgetForm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer hover:bg-red-700 transition"
              >
                <Plus size={14} />
                <span>{t("addBudget")}</span>
              </button>
            </div>

            {/* Budget Addition Form */}
            {showBudgetForm && (
              <form onSubmit={handleAddBudget} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 max-w-xl animate-fadeIn">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{isAmharic ? "አዲስ በጀት መድብ" : "Add Budget Allocation"}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("category")}</label>
                    <select
                      value={budgetForm.category}
                      onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    >
                      <option value="Material">Material (ማቴሪያል)</option>
                      <option value="Labor">Labor (ጉልበት)</option>
                      <option value="Equipment">Equipment (ማሽነሪ)</option>
                      <option value="Overhead">Overhead (አስተዳደራዊ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("amount")}</label>
                    <input
                      type="number"
                      required
                      value={budgetForm.allocated || ""}
                      onChange={(e) => setBudgetForm({ ...budgetForm, allocated: Number(e.target.value) })}
                      placeholder="e.g. 15000000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{isAmharic ? "መግለጫ (እንግሊዝኛ)" : "Description (English)"}</label>
                    <input
                      type="text"
                      required
                      value={budgetForm.description}
                      onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })}
                      placeholder="e.g. High Tensile Reinforcement Core"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{isAmharic ? "መግለጫ (አማርኛ)" : "Description (Amharic)"}</label>
                    <input
                      type="text"
                      value={budgetForm.descriptionAm}
                      onChange={(e) => setBudgetForm({ ...budgetForm, descriptionAm: e.target.value })}
                      placeholder="ምሳሌ፦ የብረት ማጠናከሪያ ስራ"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBudgetForm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "አስቀምጥ" : "Save Allocation"}
                  </button>
                </div>
              </form>
            )}

            {/* Budgets Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">{isAmharic ? "የበጀት ኮድ" : "Budget Code"}</th>
                    <th className="p-4">{t("category")}</th>
                    <th className="p-4">{t("description")}</th>
                    <th className="p-4 text-right">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {budgets.map(b => (
                    <tr key={b.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{b.id}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          b.category === "Material" ? "bg-blue-900/40 text-blue-400" :
                          b.category === "Labor" ? "bg-red-900/40 text-red-400" :
                          b.category === "Equipment" ? "bg-amber-900/40 text-amber-400" : "bg-emerald-900/40 text-emerald-400"
                        }`}>
                          {b.category}
                        </span>
                      </td>
                      <td className="p-4 font-sans text-xs">{isAmharic ? b.descriptionAm : b.description}</td>
                      <td className="p-4 text-right font-black text-white">ETB {b.allocated.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COST CONTROL */}
        {activeTab === "cost" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase text-white">{t("costCtrl")}</h2>
              <p className="text-xs text-slate-400">{isAmharic ? "በጀት ከእውነተኛ ወጪ ማነፃፀሪያ እና የቁጥጥር ማስጠንቀቂያ" : "Audit budget limits against active daily field costs in real-time"}</p>
            </div>

            {/* Warnings Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgets.map(b => {
                const spent = expenses.filter(e => e.category === b.category).reduce((sum, e) => sum + e.amount, 0);
                const percent = (spent / b.allocated) * 100;
                const overLimit = spent > b.allocated;

                return (
                  <div
                    key={b.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                      overLimit ? "bg-red-950/20 border-red-500/50 shadow-lg shadow-red-500/5" : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                          b.category === "Material" ? "bg-blue-900/40 text-blue-400" :
                          b.category === "Labor" ? "bg-red-900/40 text-red-400" :
                          b.category === "Equipment" ? "bg-amber-900/40 text-amber-400" : "bg-emerald-900/40 text-emerald-400"
                        }`}>
                          {b.category}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-2.5">{isAmharic ? b.descriptionAm : b.description}</h4>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{t("status")}</span>
                        <span className={`text-xs font-black uppercase mt-1 flex items-center space-x-1 ${overLimit ? "text-red-500 animate-pulse" : "text-emerald-400"}`}>
                          {overLimit ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                          <span>{overLimit ? t("warning") : t("onTrack")}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>{percent.toFixed(1)}% {isAmharic ? "ጥቅም ላይ ውሏል" : "Consumed"}</span>
                        <span>ETB {spent.toLocaleString()} / ETB {b.allocated.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${overLimit ? "bg-red-500" : "bg-gradient-to-r from-emerald-500 to-amber-500"}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Variance value and actions */}
                    <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">{isAmharic ? "ቀሪ በጀት / ልዩነት፦" : "Remaining Variance Balance:"}</span>
                      <span className={`font-mono font-black ${overLimit ? "text-red-500" : "text-emerald-400"}`}>
                        ETB {(b.allocated - spent).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: EXPENSE TRACKING */}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">{t("expTrack")}</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "ዕለታዊ ወጪዎች መመዝገቢያ ሰሌዳ" : "Log, audit, and track individual daily site expenditures"}</p>
              </div>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer hover:bg-red-700 transition"
              >
                <Plus size={14} />
                <span>{t("addExpense")}</span>
              </button>
            </div>

            {/* Expense form */}
            {showExpenseForm && (
              <form onSubmit={handleAddExpense} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 max-w-xl animate-fadeIn">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{t("addExpense")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("category")}</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    >
                      <option value="Material">Material (ማቴሪያል)</option>
                      <option value="Labor">Labor (ጉልበት)</option>
                      <option value="Equipment">Equipment (ማሽነሪ)</option>
                      <option value="Overhead">Overhead (አስተዳደራዊ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("amount")}</label>
                    <input
                      type="number"
                      required
                      value={expenseForm.amount || ""}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                      placeholder="ETB Amount"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("vendor")}</label>
                    <input
                      type="text"
                      required
                      value={expenseForm.vendor}
                      onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                      placeholder="e.g. Mugher Cement Co"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("date")}</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("project")}</label>
                    <select
                      value={expenseForm.project}
                      onChange={(e) => setExpenseForm({ ...expenseForm, project: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    >
                      {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("description")}</label>
                    <input
                      type="text"
                      required
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      placeholder="e.g. Bulk cement ready mix C30"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExpenseForm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ወጪ መዝግብ" : "Log Expense"}
                  </button>
                </div>
              </form>
            )}

            {/* Expenses Register Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">{t("date")}</th>
                    <th className="p-4">{t("category")}</th>
                    <th className="p-4">{t("vendor")}</th>
                    <th className="p-4">{t("description")}</th>
                    <th className="p-4 text-right">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{e.date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          e.category === "Material" ? "bg-blue-950 text-blue-400 border border-blue-900" :
                          e.category === "Labor" ? "bg-red-950 text-red-400 border border-red-900" :
                          e.category === "Equipment" ? "bg-amber-950 text-amber-400 border border-amber-900" : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                        }`}>
                          {e.category}
                        </span>
                      </td>
                      <td className="p-4 font-sans font-bold text-white">{e.vendor}</td>
                      <td className="p-4 font-sans text-slate-300">{e.description}</td>
                      <td className="p-4 text-right font-black text-white">ETB {e.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: INVOICE MANAGEMENT */}
        {activeTab === "invoices" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">{t("invMgmt")}</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "ለደንበኞች የቀረቡ እና የተረጋገጡ ደረሰኞች" : "Raise, authorize, and sync milestone certificates with clients"}</p>
              </div>
              <button
                onClick={() => setShowInvoiceForm(!showInvoiceForm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer hover:bg-red-700 transition"
              >
                <Plus size={14} />
                <span>{t("createInvoice")}</span>
              </button>
            </div>

            {/* Invoice Creation Form */}
            {showInvoiceForm && (
              <form onSubmit={handleCreateInvoice} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 max-w-xl animate-fadeIn">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{t("createInvoice")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("invoiceNo")}</label>
                    <input
                      type="text"
                      required
                      value={invoiceForm.invoiceNumber}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                      placeholder="e.g. INV-2026-004"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("amount")}</label>
                    <input
                      type="number"
                      required
                      value={invoiceForm.amount || ""}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                      placeholder="ETB Amount"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("client")}</label>
                    <input
                      type="text"
                      required
                      value={invoiceForm.client}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, client: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("dueDate")}</label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("date")}</label>
                    <input
                      type="date"
                      required
                      value={invoiceForm.date}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("status")}</label>
                    <select
                      value={invoiceForm.status}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    >
                      <option value="Pending">Pending (ይጠብቃል)</option>
                      <option value="Approved">Approved (ተረጋግጧል)</option>
                      <option value="Paid">Paid (ተከፍሏል)</option>
                      <option value="Draft">Draft (ረቂቅ)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceForm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ደረሰኝ አውጣ" : "Raise Invoice"}
                  </button>
                </div>
              </form>
            )}

            {/* Invoices List Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">{t("invoiceNo")}</th>
                    <th className="p-4">{t("client")}</th>
                    <th className="p-4">{t("date")}</th>
                    <th className="p-4">{t("dueDate")}</th>
                    <th className="p-4">{t("status")}</th>
                    <th className="p-4 text-right">{t("amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{inv.invoiceNumber}</td>
                      <td className="p-4 font-sans font-bold text-white">{inv.client}</td>
                      <td className="p-4 text-slate-400">{inv.date}</td>
                      <td className="p-4 text-slate-400">{inv.dueDate}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          inv.status === "Paid" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                          inv.status === "Pending" ? "bg-amber-950 text-amber-400 border border-amber-900" :
                          inv.status === "Approved" ? "bg-blue-950 text-blue-400 border border-blue-900" : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-white">ETB {inv.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: PAYMENT TRACKING */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase text-white">{t("payTrack")}</h2>
                <p className="text-xs text-slate-400">{isAmharic ? "ገቢ የተደረጉ ክፍያዎች እና የሂሳብ ተቀባይ መዝገብ" : "Track cleared financial milestones and bank deposit slips"}</p>
              </div>
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 cursor-pointer hover:bg-red-700 transition"
              >
                <Plus size={14} />
                <span>{t("recordPayment")}</span>
              </button>
            </div>

            {/* Record Payment Form */}
            {showPaymentForm && (
              <form onSubmit={handleAddPayment} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 max-w-xl animate-fadeIn">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">{t("recordPayment")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{isAmharic ? "ማገናኛ ደረሰኝ" : "Link Invoice"}</label>
                    <select
                      value={paymentForm.invoiceId}
                      required
                      onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    >
                      <option value="">-- {isAmharic ? "ደረሰኝ ይምረጡ" : "Select Client Invoice"} --</option>
                      {invoices.filter(i => i.status !== "Paid").map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.invoiceNumber} (ETB {inv.amount.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{isAmharic ? "ክፍያ የገባበት መጠን" : "Amount Paid"}</label>
                    <input
                      type="number"
                      required
                      value={paymentForm.amount || ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                      placeholder="ETB Amount"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("method")}</label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100"
                    >
                      <option value="Bank Transfer">Bank Transfer (ባንክ ማስተላለፊያ)</option>
                      <option value="Cheque">Corporate Cheque (ቼክ)</option>
                      <option value="Cash">Cash (ጥሬ ገንዘብ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black mb-1">{t("refNo")}</label>
                    <input
                      type="text"
                      required
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      placeholder="e.g. CBE-TXN-12093"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] uppercase font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሂሳብ መዝግብ" : "Record Deposit"}
                  </button>
                </div>
              </form>
            )}

            {/* Payments List Table */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4">{t("date")}</th>
                    <th className="p-4">{t("invoiceNo")}</th>
                    <th className="p-4">{t("method")}</th>
                    <th className="p-4">{t("refNo")}</th>
                    <th className="p-4 text-right">{isAmharic ? "ክፍያ የገባበት መጠን" : "Amount Deposited"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                  {payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-slate-900/40 text-slate-200">
                      <td className="p-4 text-slate-400 font-bold">{pay.date}</td>
                      <td className="p-4 text-red-400">{pay.invoiceNumber}</td>
                      <td className="p-4 font-sans font-medium text-slate-300">{pay.method}</td>
                      <td className="p-4 text-slate-400">{pay.reference}</td>
                      <td className="p-4 text-right font-black text-emerald-400">ETB {pay.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: REPORTS GENERATION HUB */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black uppercase text-white">{t("reportsTitle")}</h2>
                <p className="text-xs text-slate-400">{t("reportsSubtitle")}</p>
              </div>

              {/* Selector Buttons */}
              <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setSelectedReportType("daily");
                    setSimulatedPrint(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    selectedReportType === "daily" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("dailyReport")}
                </button>
                <button
                  onClick={() => {
                    setSelectedReportType("monthly");
                    setSimulatedPrint(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    selectedReportType === "monthly" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("monthlyReport")}
                </button>
                <button
                  onClick={() => {
                    setSelectedReportType("executive");
                    setSimulatedPrint(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                    selectedReportType === "executive" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t("executiveReport")}
                </button>
              </div>
            </div>

            {/* Generated Document Stage */}
            <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-200/90 shadow-xl max-w-4xl mx-auto space-y-6 relative overflow-hidden" id="printed-report-node">
              
              {/* Digital Construction ERP Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-950 uppercase">Digital Construction ERP GROUP</h3>
                  <p className="text-[10px] font-black tracking-widest text-red-600 uppercase">Construction & Real Estate Finance Core</p>
                  <p className="text-[9px] text-slate-500 mt-1">Digital Construction ERP Tower, Bole Road, Addis Ababa, Ethiopia | +251 11 661 2233</p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500">
                  <div>DATE: 2026-07-15</div>
                  <div>LEDFER REF: F-ERP-7781B</div>
                  <div className="text-red-600 font-bold mt-1 uppercase">INTERNAL AUDITED CONFIDENTIAL</div>
                </div>
              </div>

              {/* Report Title Banner */}
              <div className="text-center py-4 bg-slate-100 rounded-2xl border border-slate-200">
                <h4 className="text-md font-black uppercase tracking-wider text-slate-900">
                  {selectedReportType === "daily" && t("dailyReport")}
                  {selectedReportType === "monthly" && t("monthlyReport")}
                  {selectedReportType === "executive" && t("executiveReport")}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  {selectedReportType === "daily" && "Audit Scope: Today's direct cash entries, vouchers, and materials received"}
                  {selectedReportType === "monthly" && "Audit Scope: Cumulative monthly cost variance, invoice milestones, and receivables status"}
                  {selectedReportType === "executive" && "Audit Scope: High-level board summary, ROI margins, and strategic resource forecast"}
                </p>
              </div>

              {/* Dynamic Content based on report type */}
              {selectedReportType === "daily" && (
                <div className="space-y-4 text-xs text-slate-800">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Today's Materials Logged</span>
                      <span className="text-base font-mono font-black text-slate-900 mt-1 block">ETB 8,000,000</span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Bulk compressor cement and panel assemblies orders</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Labor & Daily Allowances</span>
                      <span className="text-base font-mono font-black text-slate-900 mt-1 block">ETB 4,500,000</span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Overtime payouts for Floor 4 concrete pouring speed-up</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="font-bold uppercase text-slate-900 text-[10px] tracking-wider">Today's Chronological Ledger Transactions</h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] font-mono">
                      <div className="bg-slate-100 grid grid-cols-3 p-2.5 font-bold text-[9px] uppercase border-b border-slate-200">
                        <span>Transaction</span>
                        <span>Recipient/Vendor</span>
                        <span className="text-right">Debit/Credit (ETB)</span>
                      </div>
                      <div className="grid grid-cols-3 p-2 border-b border-slate-100">
                        <span>Concrete purchase C30</span>
                        <span>Mugher Cement</span>
                        <span className="text-right text-red-600">- 8,000,000</span>
                      </div>
                      <div className="grid grid-cols-3 p-2 border-b border-slate-100">
                        <span>Engineering salaries</span>
                        <span>Digital Construction ERP Payroll</span>
                        <span className="text-right text-red-600">- 4,500,000</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span>Excavation overhaul</span>
                        <span>National Excavations</span>
                        <span className="text-right text-red-600">- 6,500,000</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportType === "monthly" && (
                <div className="space-y-4 text-xs text-slate-800">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Total Monthly Cost</span>
                      <span className="text-base font-mono font-black text-slate-900 mt-1 block">ETB {totalProjectCost.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Total Invoiced</span>
                      <span className="text-base font-mono font-black text-slate-900 mt-1 block">ETB {totalInvoicedAmount.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black uppercase text-slate-500 block">Net Monthly Margin</span>
                      <span className="text-base font-mono font-black text-emerald-600 mt-1 block">{profitMarginPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="font-bold uppercase text-slate-900 text-[10px] tracking-wider">Project Cost Allocations & Variances</h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] font-mono">
                      <div className="bg-slate-100 grid grid-cols-4 p-2.5 font-bold text-[9px] uppercase border-b border-slate-200">
                        <span>Category</span>
                        <span>Budget Allocated</span>
                        <span>Actual Cost</span>
                        <span className="text-right">Remaining Variance</span>
                      </div>
                      {budgets.map(b => {
                        const spent = expenses.filter(e => e.category === b.category).reduce((sum, e) => sum + e.amount, 0);
                        const overLimit = spent > b.allocated;
                        return (
                          <div key={b.id} className="grid grid-cols-4 p-2 border-b border-slate-100">
                            <span className="font-sans font-bold">{b.category}</span>
                            <span>{b.allocated.toLocaleString()}</span>
                            <span>{spent.toLocaleString()}</span>
                            <span className={`text-right font-bold ${overLimit ? "text-red-600" : "text-emerald-600"}`}>
                              {(b.allocated - spent).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {selectedReportType === "executive" && (
                <div className="space-y-4 text-xs text-slate-800">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-black uppercase text-slate-500 block">Master Budget</span>
                      <span className="text-sm font-mono font-black text-slate-950 mt-1 block">ETB 45.0M</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-black uppercase text-slate-500 block">Total Costs</span>
                      <span className="text-sm font-mono font-black text-slate-950 mt-1 block">ETB {(totalProjectCost/1000000).toFixed(1)}M</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-black uppercase text-slate-500 block">Invoiced Receipts</span>
                      <span className="text-sm font-mono font-black text-slate-950 mt-1 block">ETB {(totalInvoicedAmount/1000000).toFixed(1)}M</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-black uppercase text-slate-500 block">Audited Net Profit</span>
                      <span className="text-sm font-mono font-black text-emerald-600 mt-1 block">ETB {(actualProfitVal/1000000).toFixed(2)}M</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border border-slate-100 p-3.5 rounded-xl bg-slate-50">
                    <h5 className="font-bold text-slate-900 text-[10px] uppercase tracking-wider">Executive Overview & Strategic Risk Digest</h5>
                    <p className="text-[10.5px] leading-relaxed text-slate-600">
                      The Lemi National Cement and Bole Heights core projects are operating within steady margins, driven by a{" "}
                      <span className="font-bold text-slate-900">{profitMarginPercent.toFixed(1)}% gross profit margin</span>. Labor utilization efficiency is currently trending +4.2% above initial timeline parameters, offsetting structural material re-order deficits in corner panels. Risk parameters remain under tight watch.
                    </p>
                  </div>
                </div>
              )}

              {/* Signatures Footer */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200/90 text-[10px] text-slate-500">
                <div>
                  <div className="border-t border-slate-400 w-36 pt-1 text-slate-900 font-bold uppercase">Audited By</div>
                  <div>Finance Auditor Digital Construction ERP Group</div>
                  <div>Nuriye Ahmed Adem</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-t border-slate-400 w-36 pt-1 text-slate-900 font-bold uppercase">Authorized By</div>
                  <div>VP of Finance & Operations</div>
                  <div>Dr. Solomon G.</div>
                </div>
              </div>

            </div>

            {/* Reports Control panel */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  id="approve-audit"
                  checked={auditApproved}
                  onChange={(e) => setAuditApproved(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="approve-audit" className="text-slate-300 font-semibold cursor-pointer">
                  {isAmharic ? "ሂሳብ መዝገቡ በኦዲት መረጋገጡን አረጋግጣለሁ" : "I certify that this ledger report complies with Digital Construction ERP auditing guidelines"}
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSimulatedPrint(true);
                    onLogAction?.("Generate Report", `Compiled and printed official Digital Construction ERP financial report: ${selectedReportType}`);
                    setTimeout(() => setSimulatedPrint(false), 2000);
                  }}
                  disabled={!auditApproved}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all ${
                    auditApproved ? "bg-red-600 text-white cursor-pointer hover:bg-red-700" : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Printer size={14} />
                  <span>{simulatedPrint ? (isAmharic ? "በማተም ላይ..." : "Printing...") : t("print")}</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
