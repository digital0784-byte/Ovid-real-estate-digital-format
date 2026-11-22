import React, { useState, useMemo, useEffect, useRef } from "react";
import { DbService } from "../services/db";
import { authFetch } from "../services/authService";
import { formatCurrency, parseMoney, safeString } from "../utils/formatters";
import {
  resolveUserFinancePermissions,
  computeFinancialDashboardState,
  DEFAULT_FINANCIAL_SETTINGS,
  exportRowsToCsv,
} from "../services/financeService";
import { FinancialFilterBar } from "./finance/FinancialFilterBar";
import { ExecutiveFinancialDashboard } from "./finance/ExecutiveFinancialDashboard";
import { TransactionLedgers } from "./finance/TransactionLedgers";
import { ReceivablesPayablesViews } from "./finance/ReceivablesPayablesViews";
import { PlanningStatementsTreasuryViews } from "./finance/PlanningStatementsTreasuryViews";
import { ReportsNotificationsSettingsViews } from "./finance/ReportsNotificationsSettingsViews";
import { BudgetControlModule } from "./finance/BudgetControlModule";
import { CashFlowForecastingModule, CashFlowSubTab } from "./finance/CashFlowForecastingModule";
import { BankManagementModule, Part6BankSubTab } from "./finance/BankManagementModule";
import { FinancialStatementsModule } from "./finance/FinancialStatementsModule";
import { GeneralLedgerCoaModule } from "./finance/GeneralLedgerCoaModule";
import { FixedAssetsDepreciationModule } from "./finance/FixedAssetsDepreciationModule";
import { TaxComplianceModule } from "./finance/TaxComplianceModule";
import { EnhancedPayrollFinanceModule } from "./finance/EnhancedPayrollFinanceModule";
import { LoanCreditManagementModule } from "./finance/LoanCreditManagementModule";
import { PettyCashControlModule } from "./finance/PettyCashControlModule";
import { FinancialAuditControlsModule } from "./finance/FinancialAuditControlsModule";
import {
  computePart4BudgetControlState,
  Part4FilterState,
} from "../services/budgetControlService";
import {
  computePart5CashFlowState,
  Part5FilterState,
} from "../services/cashFlowForecastService";
import {
  computePart6BankState,
  Part6BankFilterState,
} from "../services/bankManagementService";
import {
  computePart7FinancialStatementsState,
  PART7_REPORTING_COMPANY_DEFAULT,
  Part7StatementsFilterState,
} from "../services/financialStatementsService";
import {
  computePart8GeneralLedgerState,
  Part8GlFilterState,
} from "../services/generalLedgerService";
import { computeFixedAssetsState } from "../services/fixedAssetsService";
import { computeTaxComplianceState } from "../services/taxComplianceService";
import { computeLoanAndCreditState } from "../services/loanCreditService";
import { computePettyCashState } from "../services/pettyCashService";
import {
  computeExecutiveFinancialOverview,
  detectFinancialAnomalies,
  exportExecutiveFinancialPacketToExcel,
} from "../services/financialAuditService";
import {
  ProjectZone,
  AttendanceRecord,
  Worker,
  AluminumFormworkPanel,
  PanelRepairRecord,
  UserRole,
  Team,
  PayrollRecord,
  DailyProgressLog,
  FinancialMenuModuleId,
  FinancialFilterState,
  FinancialInvoiceRecord,
  Expense,
  FinancialPaymentRecord,
  CashTransactionRecord,
  FinancialBudgetRecord,
  MonthlyFinancialTarget,
  MonthlyCollectionPlan,
  MonthlyPaymentPlan,
  FinancialAccount,
  FinancialSettingsConfig,
  ProjectBudgetPlan,
  BudgetAllocationRecord,
  BudgetRevisionRecord,
  ActualCostEntry,
  CashFlowForecastItem,
  BankReconciliationRecord,
  BankTransactionRecord,
  ImmutableBankStatementRecord,
  ChartAccountRecord,
  JournalEntryRecord,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  FinanceFixedAssetRecord,
  FixedAssetEventRecord,
  TaxRateConfigRecord,
  TaxTransactionRecord,
  TaxReturnRecord,
  LoanFacilityRecord,
  LoanRepaymentRecord,
  CounterpartyCreditProfile,
  PettyCashFundRecord,
  PettyCashTransactionRecord,
  PettyCashReconciliationRecord,
  FinancialAuditFindingRecord,
  HrmPayrollRunRecord,
  HrmPayslipRecord,
  SalaryAdvanceLoanRecord,
  EthiopianTaxPensionConfig,
} from "../types";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Layers,
  Plus,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  Briefcase,
  Users,
  ShieldCheck,
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  Package,
  Truck,
  Building2,
  Cpu,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Lock,
  Eye,
  Shield,
  Sparkles,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  Scale,
  Bell,
  Settings,
  Receipt,
  Menu,
  X,
  BookOpen,
  Percent,
} from "lucide-react";

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
  status: string;
  date: string;
}

interface EquipmentCostRecord {
  id: string;
  equipmentName: string;
  assetCode: string;
  category: string;
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

interface GeneratedPayrollSlip {
  id: string;
  workerId: string;
  workerName: string;
  trade: string;
  department: string;
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
  status: "Approved";
  paymentMethod: string;
}

interface FinanceErpHubProps {
  isAmharic: boolean;
  currentUserRole?: UserRole;
  currentUserName?: string;
  currentUserProfile?: any;
  workers?: Worker[];
  attendance?: AttendanceRecord[];
  teams?: Team[];
  zones?: ProjectZone[];
  onLogAction?: (action: string, details: string) => void;
  onSwitchRole?: (newRole: UserRole) => void;
}

const createDefaultFilters = (): FinancialFilterState => ({
  periodPreset: "monthly",
  startDate: "",
  endDate: "",
  project: "ALL",
  department: "ALL",
  customer: "ALL",
  supplier: "ALL",
  category: "ALL",
  status: "ALL",
  searchTerm: "",
});

const createDefaultPart4Filters = (): Part4FilterState => ({
  project: "ALL",
  budgetYear: "ALL",
  budgetCategory: "ALL",
  startDate: "",
  endDate: "",
  status: "ALL",
  searchTerm: "",
});

const createDefaultPart5Filters = (): Part5FilterState => ({
  project: "ALL",
  bankAccountId: "ALL",
  financialYear: "ALL",
  granularity: "Monthly",
  startDate: "",
  endDate: "",
  searchTerm: "",
});

const createDefaultPart6Filters = (): Part6BankFilterState => ({
  accountId: "ALL",
  project: "ALL",
  transactionType: "ALL",
  approvalStatus: "ALL",
  startDate: "",
  endDate: "",
  searchTerm: "",
});

const createDefaultPart7Filters = (): Part7StatementsFilterState => ({
  reportingFrequency: "Monthly",
  financialYear: "ALL",
  project: "ALL",
  department: "ALL",
  startDate: "",
  endDate: "",
  companyName: PART7_REPORTING_COMPANY_DEFAULT,
});

const createDefaultPart8Filters = (): Part8GlFilterState => ({
  startDate: "",
  endDate: "",
  accountCode: "ALL",
  project: "ALL",
  department: "ALL",
  sourceModule: "ALL",
  entryStatus: "ALL",
  searchTerm: "",
});

export const FinanceErpHub: React.FC<FinanceErpHubProps> = ({
  isAmharic,
  currentUserRole = UserRole.FINANCE_MANAGER,
  currentUserName = "Finance Director",
  currentUserProfile,
  workers = [],
  attendance = [],
  zones = [],
  onLogAction,
  onSwitchRole,
}) => {
  const [activeTab, setActiveTab] = useState<FinancialMenuModuleId>("financial-dashboard");
  const [cashFlowSubTabIntent, setCashFlowSubTabIntent] = useState<CashFlowSubTab>("dashboard");
  const [bankSubTabIntent, setBankSubTabIntent] = useState<Part6BankSubTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filters, setFilters] = useState<FinancialFilterState>(createDefaultFilters);
  const [part4Filters, setPart4Filters] = useState<Part4FilterState>(createDefaultPart4Filters);
  const [part5Filters, setPart5Filters] = useState<Part5FilterState>(createDefaultPart5Filters);
  const [part6Filters, setPart6Filters] = useState<Part6BankFilterState>(createDefaultPart6Filters);
  const [part7Filters, setPart7Filters] = useState<Part7StatementsFilterState>(createDefaultPart7Filters);
  const [part8Filters, setPart8Filters] = useState<Part8GlFilterState>(createDefaultPart8Filters);
  const [showLegacyTargetsPanel, setShowLegacyTargetsPanel] = useState(false);

  const actorUid = safeString(currentUserProfile?.uid || currentUserProfile?.id, "USR-FIN");
  const permissions = useMemo(
    () => resolveUserFinancePermissions(currentUserRole),
    [currentUserRole]
  );

  // Role flags for ERP legacy submodules
  const isFullAccess =
    currentUserRole === UserRole.FINANCE_MANAGER ||
    currentUserRole === UserRole.SUPER_ADMIN;
  const isExecutiveReadOnly =
    currentUserRole === UserRole.HEAD_OFFICE ||
    currentUserRole === UserRole.AUDITOR;
  const isWarehouseManager =
    currentUserRole === UserRole.WAREHOUSE_MANAGER ||
    currentUserRole === UserRole.STORE_OWNER;
  const isHrManager =
    currentUserRole === UserRole.HR || currentUserRole === UserRole.HR_MANAGER;
  const isAuthorizedUser = permissions.canViewDashboard;

  // --- REAL-TIME FIRESTORE STATE (ZERO HARDCODED FINANCIAL DATA) ---
  const [invoices, setInvoices] = useState<FinancialInvoiceRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<FinancialPaymentRecord[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransactionRecord[]>([]);
  const [budgets, setBudgets] = useState<FinancialBudgetRecord[]>([]);
  const [financialTargets, setFinancialTargets] = useState<MonthlyFinancialTarget[]>([]);
  const [collectionPlans, setCollectionPlans] = useState<MonthlyCollectionPlan[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<MonthlyPaymentPlan[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettingsConfig>(
    DEFAULT_FINANCIAL_SETTINGS
  );

  // Part 4 Budget Management & Cost Control Collections
  const [projectBudgetPlans, setProjectBudgetPlans] = useState<ProjectBudgetPlan[]>([]);
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocationRecord[]>([]);
  const [budgetRevisions, setBudgetRevisions] = useState<BudgetRevisionRecord[]>([]);
  const [actualCostEntries, setActualCostEntries] = useState<ActualCostEntry[]>([]);

  // Part 5 Cash Flow Forecasting & Bank Reconciliation Collections
  const [cashFlowForecastItems, setCashFlowForecastItems] = useState<CashFlowForecastItem[]>([]);
  const [bankReconciliations, setBankReconciliations] = useState<BankReconciliationRecord[]>([]);

  // Part 6 Bank Management & Immutable Bank Statements Collections
  const [bankTransactions, setBankTransactions] = useState<BankTransactionRecord[]>([]);
  const [bankStatements, setBankStatements] = useState<ImmutableBankStatementRecord[]>([]);

  // Part 7 & Part 8 Financial Statements, Chart of Accounts, GL & Period Closing Collections
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartAccountRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntryRecord[]>([]);
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriodCloseRecord[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYearRecord[]>([]);

  // Parts 9–16 Advanced Finance & Shared HRM Collections
  const [financeFixedAssets, setFinanceFixedAssets] = useState<FinanceFixedAssetRecord[]>([]);
  const [fixedAssetEvents, setFixedAssetEvents] = useState<FixedAssetEventRecord[]>([]);
  const [taxRateConfigs, setTaxRateConfigs] = useState<TaxRateConfigRecord[]>([]);
  const [taxTransactions, setTaxTransactions] = useState<TaxTransactionRecord[]>([]);
  const [taxReturns, setTaxReturns] = useState<TaxReturnRecord[]>([]);
  const [loanFacilities, setLoanFacilities] = useState<LoanFacilityRecord[]>([]);
  const [loanRepayments, setLoanRepayments] = useState<LoanRepaymentRecord[]>([]);
  const [creditProfiles, setCreditProfiles] = useState<CounterpartyCreditProfile[]>([]);
  const [pettyCashFunds, setPettyCashFunds] = useState<PettyCashFundRecord[]>([]);
  const [pettyCashTransactions, setPettyCashTransactions] = useState<PettyCashTransactionRecord[]>([]);
  const [pettyCashReconciliations, setPettyCashReconciliations] = useState<PettyCashReconciliationRecord[]>([]);
  const [financialAuditFindings, setFinancialAuditFindings] = useState<FinancialAuditFindingRecord[]>([]);
  const [hrmPayrollRuns, setHrmPayrollRuns] = useState<HrmPayrollRunRecord[]>([]);
  const [hrmPayslips, setHrmPayslips] = useState<HrmPayslipRecord[]>([]);
  const [salaryAdvancesLoans, setSalaryAdvancesLoans] = useState<SalaryAdvanceLoanRecord[]>([]);
  const [taxPensionConfigs, setTaxPensionConfigs] = useState<EthiopianTaxPensionConfig[]>([]);

  // Master Construction ERP Linked Collections
  const [rawProjectsList, setRawProjectsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [rawProgressLogs, setRawProgressLogs] = useState<DailyProgressLog[]>([]);
  const [workersList, setWorkersList] = useState<Worker[]>(workers || []);
  const [attendanceList, setAttendanceRecordList] = useState<AttendanceRecord[]>(attendance || []);
  const [repairRecordsList, setRepairRecordsList] = useState<PanelRepairRecord[]>([]);
  const [formworkPanelsList, setFormworkPanelsList] = useState<AluminumFormworkPanel[]>([]);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<ProcurementRecord[]>([]);
  const [equipments, setEquipments] = useState<EquipmentCostRecord[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<SecurityAuditItem[]>([]);
  const [savedPayrollList, setSavedPayrollList] = useState<PayrollRecord[]>([]);
  const [loadingDbData, setLoadingDbData] = useState(true);

  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [payrollSyncStatus, setPayrollSyncStatus] = useState<string | null>(null);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<string>("all");

  // Sync worker/attendance props
  useEffect(() => {
    if (workers && workers.length > 0) setWorkersList(workers);
    if (attendance && attendance.length > 0) setAttendanceRecordList(attendance);
  }, [workers, attendance]);

  // Real-time Firestore subscriptions + ERP Master Data Fetch
  useEffect(() => {
    let active = true;

    const unsubInvoices = DbService.subscribeInvoices((items) => {
      if (active) setInvoices(items || []);
    });
    const unsubExpenses = DbService.subscribeExpenses((items) => {
      if (active) setExpenses(items || []);
    });
    const unsubPayments = DbService.subscribePaymentRecords((items) => {
      if (active) setPaymentRecords(items || []);
    });
    const unsubBudgets = DbService.subscribeProjectBudgets((items) => {
      if (active) setBudgets(items || []);
    });
    const unsubTargets = DbService.subscribeFinancialTargets((items) => {
      if (active) setFinancialTargets(items || []);
    });
    const unsubCollectionPlans = DbService.subscribeCollectionPlans((items) => {
      if (active) setCollectionPlans(items || []);
    });
    const unsubPaymentPlans = DbService.subscribePaymentPlans((items) => {
      if (active) setPaymentPlans(items || []);
    });
    const unsubAccounts = DbService.subscribeFinancialAccounts((items) => {
      if (active) setFinancialAccounts(items || []);
    });
    const unsubCashTxs = DbService.subscribeCashTransactions((items) => {
      if (active) setCashTransactions(items || []);
    });
    const unsubSettings = DbService.subscribeFinancialSettings((items) => {
      if (active && items && items.length > 0) {
        setFinancialSettings({ ...DEFAULT_FINANCIAL_SETTINGS, ...items[0] });
      }
    });
    const unsubProjects = DbService.subscribeProjects((items) => {
      if (active) setRawProjectsList(items || []);
    });
    const unsubPayroll = DbService.subscribePayrollRecords((items) => {
      if (active) setSavedPayrollList(items || []);
    });
    const unsubPart4Plans = DbService.subscribeProjectBudgetPlans((items) => {
      if (active) setProjectBudgetPlans(items || []);
    });
    const unsubPart4Allocations = DbService.subscribeBudgetAllocations((items) => {
      if (active) setBudgetAllocations(items || []);
    });
    const unsubPart4Revisions = DbService.subscribeBudgetRevisions((items) => {
      if (active) setBudgetRevisions(items || []);
    });
    const unsubPart4ActualCosts = DbService.subscribeActualCostEntries((items) => {
      if (active) setActualCostEntries(items || []);
    });
    const unsubPart5Forecasts = DbService.subscribeCashFlowForecastItems((items) => {
      if (active) setCashFlowForecastItems(items || []);
    });
    const unsubPart5Reconciliations = DbService.subscribeBankReconciliations((items) => {
      if (active) setBankReconciliations(items || []);
    });
    const unsubPart6BankTxs = DbService.subscribeBankTransactions((items) => {
      if (active) setBankTransactions(items || []);
    });
    const unsubPart6BankStatements = DbService.subscribeBankStatements((items) => {
      if (active) setBankStatements(items || []);
    });
    const unsubPart7Coa = DbService.subscribeChartOfAccounts((items) => {
      if (active) setChartOfAccounts(items || []);
    });
    const unsubPart7Journals = DbService.subscribeJournalEntries((items) => {
      if (active) setJournalEntries(items || []);
    });
    const unsubPart7Periods = DbService.subscribeFinancialPeriods((items) => {
      if (active) setFinancialPeriods(items || []);
    });
    const unsubPart8Years = DbService.subscribeFinancialYears((items) => {
      if (active) setFinancialYears(items || []);
    });
    const unsubFinanceAssets = DbService.subscribeFinanceFixedAssets((items) => {
      if (active) setFinanceFixedAssets(items || []);
    });
    const unsubAssetEvents = DbService.subscribeFixedAssetEvents((items) => {
      if (active) setFixedAssetEvents(items || []);
    });
    const unsubTaxRates = DbService.subscribeTaxRateConfigs((items) => {
      if (active) setTaxRateConfigs(items || []);
    });
    const unsubTaxTxs = DbService.subscribeTaxTransactions((items) => {
      if (active) setTaxTransactions(items || []);
    });
    const unsubTaxRets = DbService.subscribeTaxReturns((items) => {
      if (active) setTaxReturns(items || []);
    });
    const unsubLoans = DbService.subscribeLoanFacilities((items) => {
      if (active) setLoanFacilities(items || []);
    });
    const unsubLoanReps = DbService.subscribeLoanRepayments((items) => {
      if (active) setLoanRepayments(items || []);
    });
    const unsubCreditProfs = DbService.subscribeCreditProfiles((items) => {
      if (active) setCreditProfiles(items || []);
    });
    const unsubPcFunds = DbService.subscribePettyCashFunds((items) => {
      if (active) setPettyCashFunds(items || []);
    });
    const unsubPcTxs = DbService.subscribePettyCashTransactions((items) => {
      if (active) setPettyCashTransactions(items || []);
    });
    const unsubPcRecons = DbService.subscribePettyCashReconciliations((items) => {
      if (active) setPettyCashReconciliations(items || []);
    });
    const unsubAuditFindings = DbService.subscribeFinancialAuditFindings((items) => {
      if (active) setFinancialAuditFindings(items || []);
    });
    const unsubHrmRuns = DbService.subscribeHrmPayrollRuns((items) => {
      if (active) setHrmPayrollRuns(items || []);
    });
    const unsubHrmSlips = DbService.subscribeHrmPayslips((items) => {
      if (active) setHrmPayslips(items || []);
    });
    const unsubSalaryLoans = DbService.subscribeSalaryAdvancesLoans((items) => {
      if (active) setSalaryAdvancesLoans(items || []);
    });
    const unsubTaxPension = DbService.subscribeTaxPensionConfigs((items) => {
      if (active) setTaxPensionConfigs(items || []);
    });

    const loadMasterErpCollections = async () => {
      try {
        setLoadingDbData(true);
        const [
          wrk,
          att,
          repairs,
          panels,
          suppliers,
          dbProcurements,
          dbEquipments,
          dbAuditLogs,
          dbProgressLogs,
          dbMaterials,
        ] = await Promise.all([
          DbService.getWorkers(),
          DbService.getAttendance(),
          DbService.getPanelRepairRecords(),
          DbService.getFormworkPanels(),
          DbService.getSuppliers(),
          DbService.getFinanceProcurements([]),
          DbService.getFinanceEquipments([]),
          DbService.getAuditLogs(),
          DbService.getProgressLogs(),
          DbService.getMaterials([]),
        ]);

        if (!active) return;

        if (wrk && wrk.length > 0) setWorkersList(wrk);
        if (att && att.length > 0) setAttendanceRecordList(att);
        setRepairRecordsList(repairs || []);
        setFormworkPanelsList(panels || []);
        setSuppliersList(suppliers || []);
        setRawProgressLogs(dbProgressLogs || []);
        setMaterialsList(dbMaterials || []);

        if (dbProcurements && dbProcurements.length > 0) {
          const mappedProc: ProcurementRecord[] = dbProcurements.map((p: any, idx: number) => ({
            id: p.id || `PROC-${idx + 1}`,
            poNumber: p.poNumber || p.id || `PO-${idx + 1}`,
            supplier: safeString(p.supplier, "Supplier"),
            materialItem: safeString(p.materialItem || p.item, "Construction Material"),
            poAmount: parseMoney(p.poAmount ?? p.cost ?? p.amount ?? p.totalAmount) ?? 0,
            consumptionCost: parseMoney(p.consumptionCost) ?? 0,
            transferCost: parseMoney(p.transferCost) ?? 0,
            lossCost: parseMoney(p.lossCost) ?? 0,
            damageCost: parseMoney(p.damageCost) ?? 0,
            importCost: parseMoney(p.importCost) ?? 0,
            customsTax: parseMoney(p.customsTax) ?? 0,
            deliveryCost: parseMoney(p.deliveryCost) ?? 0,
            status: safeString(p.status, "Pending"),
            date: safeString(p.date, new Date().toISOString().slice(0, 10)),
          }));
          setProcurements(mappedProc);
        }

        if (dbEquipments && dbEquipments.length > 0) {
          const mappedEquip: EquipmentCostRecord[] = dbEquipments.map((e: any, idx: number) => ({
            id: e.id || `EQ-${idx + 1}`,
            equipmentName: safeString(e.equipmentName || e.name, "Equipment Asset"),
            assetCode: safeString(e.assetCode || e.id, `EQ-${idx + 1}`),
            category: safeString(e.category, "Heavy Equipment"),
            purchaseValue: parseMoney(e.purchaseValue ?? e.cost) ?? 0,
            currentValue: parseMoney(e.currentValue) ?? 0,
            depreciation: parseMoney(e.depreciation) ?? 0,
            repairCost: parseMoney(e.repairCost) ?? 0,
            replacementCost: parseMoney(e.replacementCost) ?? 0,
            fuelLiters: Number(e.fuelLiters) || 0,
            fuelCost: parseMoney(e.fuelCost) ?? 0,
            maintenanceCost: parseMoney(e.maintenanceCost) ?? 0,
            rentalCost: parseMoney(e.rentalCost) ?? 0,
            operatingHours: Number(e.operatingHours) || 0,
          }));
          setEquipments(mappedEquip);
        }

        if (dbAuditLogs && dbAuditLogs.length > 0) {
          const mappedLogs: SecurityAuditItem[] = dbAuditLogs.map((l) => ({
            id: l.id,
            userName: safeString(l.userName, "System User"),
            userId: safeString(l.userId, "USR"),
            role: safeString(l.role || l.userRole, "User"),
            timestamp: safeString(l.timestamp),
            device: safeString((l as any).device, "ERP Web Client"),
            action: safeString(l.action || l.details, "Activity"),
            financialImpact: safeString((l as any).financialImpact, l.category || "—"),
            encrypted: true,
          }));
          setAuditLogsList(mappedLogs);
        }
      } catch (err) {
        console.error("Failed loading master ERP collections for Finance:", err);
      } finally {
        if (active) setLoadingDbData(false);
      }
    };

    loadMasterErpCollections();

    return () => {
      active = false;
      unsubInvoices();
      unsubExpenses();
      unsubPayments();
      unsubBudgets();
      unsubTargets();
      unsubCollectionPlans();
      unsubPaymentPlans();
      unsubAccounts();
      unsubCashTxs();
      unsubSettings();
      unsubProjects();
      unsubPayroll();
      unsubPart4Plans();
      unsubPart4Allocations();
      unsubPart4Revisions();
      unsubPart4ActualCosts();
      unsubPart5Forecasts();
      unsubPart5Reconciliations();
      unsubPart6BankTxs();
      unsubPart6BankStatements();
      unsubPart7Coa();
      unsubPart7Journals();
      unsubPart7Periods();
      unsubPart8Years();
      unsubFinanceAssets();
      unsubAssetEvents();
      unsubTaxRates();
      unsubTaxTxs();
      unsubTaxRets();
      unsubLoans();
      unsubLoanReps();
      unsubCreditProfs();
      unsubPcFunds();
      unsubPcTxs();
      unsubPcRecons();
      unsubAuditFindings();
      unsubHrmRuns();
      unsubHrmSlips();
      unsubSalaryLoans();
      unsubTaxPension();
    };
  }, []);

  // --- COMPUTE LIVE FINANCIAL ENGINE STATE ---
  const financeState = useMemo(
    () =>
      computeFinancialDashboardState({
        invoices,
        expenses,
        cashTransactions,
        paymentRecords,
        financialTargets,
        collectionPlans,
        paymentPlans,
        financialAccounts,
        projectBudgets: budgets,
        suppliers: suppliersList,
        projects: rawProjectsList,
        filterState: filters,
        userRole: currentUserRole,
        userProfile: currentUserProfile,
        settings: financialSettings,
      }),
    [
      invoices,
      expenses,
      cashTransactions,
      paymentRecords,
      financialTargets,
      collectionPlans,
      paymentPlans,
      financialAccounts,
      budgets,
      suppliersList,
      rawProjectsList,
      filters,
      currentUserRole,
      currentUserProfile,
      financialSettings,
    ]
  );

  // --- COMPUTE PART 4 BUDGET MANAGEMENT & COST CONTROL STATE ---
  const part4BudgetState = useMemo(
    () =>
      computePart4BudgetControlState({
        budgetPlans: projectBudgetPlans,
        legacyBudgets: budgets,
        allocations: budgetAllocations,
        revisions: budgetRevisions,
        actualCostEntries,
        expenses,
        cashTransactions,
        invoices,
        payrollRecords: savedPayrollList,
        procurements,
        equipments,
        projects: rawProjectsList,
        filterState: part4Filters,
        userRole: currentUserRole,
        userProfile: currentUserProfile,
      }),
    [
      projectBudgetPlans,
      budgets,
      budgetAllocations,
      budgetRevisions,
      actualCostEntries,
      expenses,
      cashTransactions,
      invoices,
      savedPayrollList,
      procurements,
      equipments,
      rawProjectsList,
      part4Filters,
      currentUserRole,
      currentUserProfile,
    ]
  );

  // --- COMPUTE PART 5 CASH FLOW MANAGEMENT & FORECASTING STATE ---
  const part5CashFlowState = useMemo(
    () =>
      computePart5CashFlowState({
        cashTransactions,
        paymentRecords,
        invoices,
        expenses,
        collectionPlans,
        paymentPlans,
        payrollRecords: savedPayrollList,
        projectBudgetPlans,
        legacyBudgets: budgets,
        budgetAllocations,
        financialTargets,
        financialAccounts,
        explicitForecastItems: cashFlowForecastItems,
        bankReconciliations,
        bankTransactions,
        projects: rawProjectsList,
        filterState: part5Filters,
        userRole: currentUserRole,
        userProfile: currentUserProfile,
        settings: financialSettings,
      }),
    [
      cashTransactions,
      paymentRecords,
      invoices,
      expenses,
      collectionPlans,
      paymentPlans,
      savedPayrollList,
      projectBudgetPlans,
      budgets,
      budgetAllocations,
      financialTargets,
      financialAccounts,
      cashFlowForecastItems,
      bankReconciliations,
      bankTransactions,
      rawProjectsList,
      part5Filters,
      currentUserRole,
      currentUserProfile,
      financialSettings,
    ]
  );

  // --- COMPUTE PART 6 BANK MANAGEMENT & BANK RECONCILIATION STATE ---
  const part6BankState = useMemo(
    () =>
      computePart6BankState({
        financialAccounts,
        bankTransactions,
        cashTransactions,
        bankReconciliations,
        bankStatements,
        projects: rawProjectsList,
        filterState: part6Filters,
        userRole: currentUserRole,
        userProfile: currentUserProfile,
        settings: financialSettings,
      }),
    [
      financialAccounts,
      bankTransactions,
      cashTransactions,
      bankReconciliations,
      bankStatements,
      rawProjectsList,
      part6Filters,
      currentUserRole,
      currentUserProfile,
      financialSettings,
    ]
  );

  // --- COMPUTE PART 7 FINANCIAL STATEMENTS & DOUBLE-ENTRY LEDGER STATE ---
  const part7StatementsState = useMemo(
    () =>
      computePart7FinancialStatementsState({
        chartOfAccounts,
        journalEntries,
        financialPeriods,
        invoices,
        expenses,
        cashTransactions,
        bankTransactions,
        paymentRecords,
        financialAccounts,
        payrollRecords: savedPayrollList,
        actualCostEntries,
        procurements,
        projects: rawProjectsList,
        filterState: part7Filters,
        userRole: currentUserRole,
        userProfile: currentUserProfile,
        settings: financialSettings,
      }),
    [
      chartOfAccounts,
      journalEntries,
      financialPeriods,
      invoices,
      expenses,
      cashTransactions,
      bankTransactions,
      paymentRecords,
      financialAccounts,
      savedPayrollList,
      actualCostEntries,
      procurements,
      rawProjectsList,
      part7Filters,
      currentUserRole,
      currentUserProfile,
      financialSettings,
    ]
  );

  // --- COMPUTE PART 8 GENERAL LEDGER & CHART OF ACCOUNTS STATE ---
  const part8GlState = useMemo(
    () =>
      computePart8GeneralLedgerState({
        statementsState: part7StatementsState,
        rawJournalEntries: journalEntries,
        financialPeriods,
        financialYears,
        filterState: part8Filters,
      }),
    [part7StatementsState, journalEntries, financialPeriods, financialYears, part8Filters]
  );

  // --- COMPUTE PARTS 9–16 ADVANCED FINANCE STATES ---
  const fixedAssetsState = useMemo(
    () =>
      computeFixedAssetsState({
        assets: financeFixedAssets,
        events: fixedAssetEvents,
        projectFilter: filters.project,
      }),
    [financeFixedAssets, fixedAssetEvents, filters.project]
  );

  const taxComplianceState = useMemo(
    () =>
      computeTaxComplianceState({
        taxRates: taxRateConfigs,
        taxTransactions,
        taxReturns,
        invoices,
        expenses,
        hrmPayrollRuns,
        statementsState: part7StatementsState,
      }),
    [taxRateConfigs, taxTransactions, taxReturns, invoices, expenses, hrmPayrollRuns, part7StatementsState]
  );

  const loanCreditState = useMemo(
    () =>
      computeLoanAndCreditState({
        loans: loanFacilities,
        repayments: loanRepayments,
        creditProfiles,
        invoices,
        expenses,
      }),
    [loanFacilities, loanRepayments, creditProfiles, invoices, expenses]
  );

  const pettyCashState = useMemo(
    () =>
      computePettyCashState({
        funds: pettyCashFunds,
        transactions: pettyCashTransactions,
        reconciliations: pettyCashReconciliations,
        projectFilter: filters.project,
      }),
    [pettyCashFunds, pettyCashTransactions, pettyCashReconciliations, filters.project]
  );

  const detectedAnomalies = useMemo(
    () =>
      detectFinancialAnomalies({
        invoices,
        expenses,
        cashTransactions,
        bankTransactions,
        journalEntries,
        pettyCashTransactions,
        pettyCashReconciliations,
        projectBudgetPlans,
        hrmPayrollRuns,
        attendance: attendanceList,
        creditBreachesCount: loanCreditState.kpis.creditLimitBreachesCount,
        settings: financialSettings,
      }),
    [
      invoices,
      expenses,
      cashTransactions,
      bankTransactions,
      journalEntries,
      pettyCashTransactions,
      pettyCashReconciliations,
      projectBudgetPlans,
      hrmPayrollRuns,
      attendanceList,
      loanCreditState.kpis.creditLimitBreachesCount,
      financialSettings,
    ]
  );

  // Dispatch critical financial & budget alerts to Directors & Finance Manager (deduplicated per session)
  const dispatchedAlertIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!financialSettings.enableCriticalAlerts) return;
    const nowIso = new Date().toISOString();

    financeState.alerts
      .filter((a) => a.severity === "CRITICAL")
      .forEach((alertItem) => {
        if (dispatchedAlertIdsRef.current.has(alertItem.id)) return;
        dispatchedAlertIdsRef.current.add(alertItem.id);
        DbService.addNotification({
          id: `FIN-AUTO-${alertItem.id}-${nowIso.slice(0, 10)}`,
          type: "Financial Alert",
          title: alertItem.title,
          titleAm: alertItem.titleAm,
          message: alertItem.description,
          description: alertItem.description,
          descriptionAm: alertItem.descriptionAm,
          category: "Finance Notifications",
          priority: "Critical",
          status: "Unread",
          projectName: alertItem.project || "Corporate Finance",
          sender: "Financial Control Engine",
          senderRole: "System",
          receiver: "Director & Finance Manager",
          targetRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.HEAD_OFFICE,
            UserRole.FINANCE_MANAGER,
          ],
          date: nowIso.slice(0, 10),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          read: false,
          actionTab: "financeErp",
        }).catch(() => {});
      });

    part4BudgetState.alerts
      .filter((a) => a.severity === "CRITICAL")
      .forEach((alertItem) => {
        const key = `P4-${alertItem.id}`;
        if (dispatchedAlertIdsRef.current.has(key)) return;
        dispatchedAlertIdsRef.current.add(key);
        DbService.addNotification({
          id: `FIN-P4-${alertItem.id}-${nowIso.slice(0, 10)}`,
          type: "Budget Control Alert",
          title: alertItem.title,
          titleAm: alertItem.titleAm,
          message: alertItem.description,
          description: alertItem.description,
          descriptionAm: alertItem.descriptionAm,
          category: "Finance Notifications",
          priority: "Critical",
          status: "Unread",
          projectName: alertItem.project || "Project Budget Control",
          sender: "Budget & Cost Control Engine",
          senderRole: "System",
          receiver: "Director, Finance & Project Manager",
          targetRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.HEAD_OFFICE,
            UserRole.FINANCE_MANAGER,
            UserRole.PROJECT_MANAGER,
          ],
          date: nowIso.slice(0, 10),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          read: false,
          actionTab: "financeErp",
        }).catch(() => {});
      });

    part5CashFlowState.alerts
      .filter((a) => a.severity === "CRITICAL")
      .forEach((alertItem) => {
        const key = `P5-${alertItem.id}`;
        if (dispatchedAlertIdsRef.current.has(key)) return;
        dispatchedAlertIdsRef.current.add(key);
        DbService.addNotification({
          id: `FIN-P5-${alertItem.id}-${nowIso.slice(0, 10)}`,
          type: "Cash Flow Shortage Alert",
          title: alertItem.title,
          titleAm: alertItem.titleAm,
          message: alertItem.description,
          description: alertItem.description,
          descriptionAm: alertItem.descriptionAm,
          category: "Finance Notifications",
          priority: "Critical",
          status: "Unread",
          projectName: alertItem.project || "Corporate Cash Flow",
          sender: "Cash Flow Forecasting Engine",
          senderRole: "System",
          receiver: "Director & Finance Manager",
          targetRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.HEAD_OFFICE,
            UserRole.FINANCE_MANAGER,
          ],
          date: nowIso.slice(0, 10),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          read: false,
          actionTab: "financeErp",
        }).catch(() => {});
      });

    taxComplianceState.returns
      .filter((r) => r.status !== "Paid" && r.filingDeadline < nowIso.slice(0, 10))
      .forEach((ret) => {
        const key = `TAX-OVERDUE-${ret.id}`;
        if (dispatchedAlertIdsRef.current.has(key)) return;
        dispatchedAlertIdsRef.current.add(key);
        DbService.addNotification({
          id: `FIN-${key}-${nowIso.slice(0, 10)}`,
          type: "Tax Compliance Alert",
          title: `Overdue ${ret.taxType} Return (${ret.periodMonth})`,
          message: `Return ${ret.returnNumber} exceeded deadline ${ret.filingDeadline} with net payable ETB ${ret.netTaxPayable.toLocaleString()}.`,
          description: `Return ${ret.returnNumber} exceeded deadline ${ret.filingDeadline}.`,
          category: "Finance Notifications",
          priority: "Critical",
          status: "Unread",
          projectName: "Corporate Tax Compliance",
          sender: "Tax Compliance Engine",
          senderRole: "System",
          receiver: "Director & Finance Manager",
          targetRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.HEAD_OFFICE,
            UserRole.FINANCE_MANAGER,
          ],
          date: nowIso.slice(0, 10),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          read: false,
          actionTab: "financeErp",
        }).catch(() => {});
      });

    pettyCashState.shortageOrExcessRecons
      .filter((rec) => rec.varianceClassification === "Cash Shortage")
      .forEach((rec) => {
      const key = `PC-SHORTAGE-${rec.id}`;
      if (dispatchedAlertIdsRef.current.has(key)) return;
      dispatchedAlertIdsRef.current.add(key);
      DbService.addNotification({
        id: `FIN-${key}-${nowIso.slice(0, 10)}`,
        type: "Petty Cash Shortage Alert",
        title: `Petty Cash Shortage Detected (${rec.fundName})`,
        message: `Reconciliation ${rec.reconciliationNo} flagged a shortage of ETB ${Math.abs(rec.varianceAmount).toLocaleString()}.`,
        description: `Reconciliation ${rec.reconciliationNo} shortage.`,
        category: "Finance Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: rec.project || "Petty Cash Control",
        sender: "Petty Cash Control Engine",
        senderRole: "System",
        receiver: "Director, Finance Manager & Auditor",
        targetRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.HEAD_OFFICE,
          UserRole.FINANCE_MANAGER,
          UserRole.AUDITOR,
        ],
        date: nowIso.slice(0, 10),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now(),
        read: false,
        actionTab: "financeErp",
      }).catch(() => {});
    });

    detectedAnomalies
      .filter((a) => a.severity === "CRITICAL")
      .forEach((anomaly) => {
        const key = `AUDIT-${anomaly.id}`;
        if (dispatchedAlertIdsRef.current.has(key)) return;
        dispatchedAlertIdsRef.current.add(key);
        DbService.addNotification({
          id: `FIN-${key}-${nowIso.slice(0, 10)}`,
          type: "Audit & Internal Control Anomaly",
          title: anomaly.title,
          message: anomaly.description,
          description: anomaly.description,
          category: "Finance Notifications",
          priority: "Critical",
          status: "Unread",
          projectName: anomaly.project || "Internal Audit",
          sender: "Financial Audit Control Engine",
          senderRole: "System",
          receiver: "Auditor, Director & Finance Manager",
          targetRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.HEAD_OFFICE,
            UserRole.FINANCE_MANAGER,
            UserRole.AUDITOR,
          ],
          date: nowIso.slice(0, 10),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: Date.now(),
          read: false,
          actionTab: "financeErp",
        }).catch(() => {});
      });
  }, [
    financeState.alerts,
    part4BudgetState.alerts,
    part5CashFlowState.alerts,
    taxComplianceState.returns,
    pettyCashState.shortageOrExcessRecons,
    detectedAnomalies,
    financialSettings.enableCriticalAlerts,
  ]);

  // --- CONSTRUCTION ERP SUB-MODULE CALCULATIONS (ALL FROM REAL DATA) ---
  const projectsEvm: ProjectEvmData[] = useMemo(() => {
    const visibleProjects = financeState.permissions.isProjectScopedOnly
      ? rawProjectsList.filter((prj) => {
          const pName = safeString(prj?.name || prj?.id).toLowerCase();
          return financeState.assignedProjects.some(
            (ap) => pName === ap.toLowerCase() || pName.includes(ap.toLowerCase())
          );
        })
      : rawProjectsList;

    return visibleProjects.map((prj) => {
      const prjName = safeString(prj.name || prj.id, "Project");
      const matchingBudgets = budgets.filter(
        (b) => b.project === prjName || b.project === prj.id
      );
      let budgetNum = 0;
      if (matchingBudgets.length > 0) {
        budgetNum = matchingBudgets.reduce((sum, b) => sum + (parseMoney(b.allocated) ?? 0), 0);
      } else if (typeof prj.budget === "number") {
        budgetNum = prj.budget;
      } else if (typeof prj.budget === "string") {
        const parsed = parseFloat(prj.budget.replace(/[^0-9.]/g, ""));
        if (!isNaN(parsed)) {
          budgetNum = prj.budget.toUpperCase().includes("M") ? parsed * 1_000_000 : parsed;
        }
      }

      const actualCost = expenses
        .filter((e) => e.project === prjName || e.project === prj.id)
        .reduce((sum, e) => sum + (parseMoney(e.amount) ?? 0), 0);

      let progressPercent = typeof prj.progress === "number" ? prj.progress : 0;
      const matchingLogs = rawProgressLogs.filter(
        (l) => (l.building && l.building.includes(prjName)) || l.building === prj.id
      );
      if (matchingLogs.length > 0 && progressPercent === 0) {
        progressPercent = Math.min(100, matchingLogs.length * 10);
      }

      const earnedValue = Math.round(budgetNum * (progressPercent / 100));
      const plannedValue = Math.round(budgetNum * (Math.min(100, progressPercent) / 100));
      const cpi = actualCost > 0 ? Number((earnedValue / actualCost).toFixed(2)) : 1.0;
      const spi = plannedValue > 0 ? Number((earnedValue / plannedValue).toFixed(2)) : 1.0;
      const forecastCost = cpi > 0 ? Math.round(budgetNum / cpi) : budgetNum;
      const scheduleVarianceDays =
        spi < 1.0 ? -Math.round((1.0 - spi) * 30) : spi > 1.0 ? 2 : 0;

      return {
        id: safeString(prj.id, prjName),
        name: prjName,
        budget: budgetNum,
        approvedBudget: budgetNum,
        actualCost,
        earnedValue,
        plannedValue,
        forecastCost,
        scheduleVarianceDays,
        cpi,
        spi,
      };
    });
  }, [rawProjectsList, budgets, expenses, rawProgressLogs, financeState.permissions.isProjectScopedOnly, financeState.assignedProjects]);

  const executiveOverview = useMemo(
    () =>
      computeExecutiveFinancialOverview({
        financeState,
        statementsState: part7StatementsState,
        fixedAssetsState,
        taxState: taxComplianceState,
        loanState: loanCreditState,
        pettyCashState,
        projectsEvm: projectsEvm.map((p) => ({ name: p.name, budget: p.budget, actualCost: p.actualCost })),
      }),
    [financeState, part7StatementsState, fixedAssetsState, taxComplianceState, loanCreditState, pettyCashState, projectsEvm]
  );

  const handleExportExecutiveExcel = () => {
    exportExecutiveFinancialPacketToExcel({
      companyName: part7StatementsState.reportingCompanyName,
      overview: executiveOverview,
      fixedAssets: fixedAssetsState,
      tax: taxComplianceState,
      loans: loanCreditState,
      pettyCash: pettyCashState,
      anomalies: detectedAnomalies,
    });
    onLogAction?.("Export Executive Excel Packet", "Downloaded consolidated multi-sheet executive financial report");
  };

  // Pay periods from real attendance logs
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    periods.add(new Date().toISOString().substring(0, 7));
    attendanceList.forEach((a) => {
      if (a?.date && a.date.length >= 7) {
        periods.add(a.date.substring(0, 7));
      }
    });
    return Array.from(periods).sort().reverse();
  }, [attendanceList]);

  // Attendance-driven payroll calculation
  const generatedPayroll: GeneratedPayrollSlip[] = useMemo(() => {
    const targetWorkers = workersList.filter((w) => {
      if (!w || !w.id) return false;
      const workerAtt = attendanceList.filter((a) => {
        if (!a) return false;
        const matchId =
          (a.workerId &&
            (a.workerId === w.id || a.workerId === (w as any).employeeId)) ||
          ((a as any).employeeId && (a as any).employeeId === w.id);
        const matchName =
          a.workerName &&
          w.name &&
          a.workerName.trim().toLowerCase() === w.name.trim().toLowerCase();
        if (!matchId && !matchName) return false;
        if (selectedPayPeriod && selectedPayPeriod !== "all") {
          return Boolean(a.date && a.date.startsWith(selectedPayPeriod));
        }
        return true;
      });
      return workerAtt.length > 0;
    });

    return targetWorkers.map((w) => {
      const workerAtt = attendanceList.filter((a) => {
        if (!a) return false;
        const matchId =
          (a.workerId &&
            (a.workerId === w.id || a.workerId === (w as any).employeeId)) ||
          ((a as any).employeeId && (a as any).employeeId === w.id);
        const matchName =
          a.workerName &&
          w.name &&
          a.workerName.trim().toLowerCase() === w.name.trim().toLowerCase();
        if (!matchId && !matchName) return false;
        if (selectedPayPeriod && selectedPayPeriod !== "all") {
          return Boolean(a.date && a.date.startsWith(selectedPayPeriod));
        }
        return true;
      });

      const daysWorked =
        workerAtt.filter(
          (a) => a.status === "Present" || a.status === "Late" || Boolean(a.checkIn)
        ).length || workerAtt.length;
      const normalHours = workerAtt.reduce(
        (sum, a) => sum + (Number(a.workingHours) || 8),
        0
      );
      const totalOvertimeHrs = workerAtt.reduce(
        (sum, a) => sum + (Number(a.overtime) || 0),
        0
      );
      const totalUnderTimeHrs = workerAtt.reduce(
        (sum, a) => sum + (Number(a.underTime) || 0),
        0
      );

      const basicSalary =
        Number(w.basicMonthlySalary) ||
        (w.hourlyRate ? w.hourlyRate * 208 : 0) ||
        (w.employmentType?.toLowerCase().includes("daily") ? 650 * 26 : 0);
      const dailyRate = Math.round((basicSalary / 26) * 100) / 100;
      const hourlyRate = w.hourlyRate || Math.round((dailyRate / 8) * 100) / 100;

      const basePayForDaysWorked =
        daysWorked >= 24 ? basicSalary : Math.round(dailyRate * daysWorked);
      const overtimePay = Math.round(totalOvertimeHrs * hourlyRate * 1.5);
      const allowances =
        Number((w as any).allowance) ||
        Number((w as any).allowances) ||
        0;
      const underTimeDeduction = Math.round(totalUnderTimeHrs * hourlyRate);
      const grossEarned =
        basePayForDaysWorked + overtimePay + allowances - underTimeDeduction;
      const tax = Math.round(grossEarned * 0.15);
      const pension = Math.round(basePayForDaysWorked * 0.07);
      const netSalary = Math.max(0, grossEarned - (tax + pension));

      return {
        id: `PR-${w.id}-${selectedPayPeriod !== "all" ? selectedPayPeriod : "global"}`,
        workerId: w.id,
        workerName: w.name,
        trade: w.trade || w.position || "Site Technician",
        department: w.department || "Operations",
        basicSalary,
        daysWorked,
        normalHours,
        overtimeHours: totalOvertimeHrs,
        underTimeHours: totalUnderTimeHrs,
        overtimePay,
        allowances,
        bonuses: 0,
        underTimeDeduction,
        attendanceDeductions: underTimeDeduction,
        tax,
        pension,
        netSalary,
        status: "Approved",
        paymentMethod: w.bankName
          ? `${w.bankName} (${w.bankAccountNumber || "Direct"})`
          : w.mobileMoneyType
          ? `${w.mobileMoneyType} (${w.mobileMoneyNumber || w.phoneNumber || "Mobile"})`
          : "Bank Direct Deposit",
      };
    });
  }, [workersList, attendanceList, selectedPayPeriod]);

  const handleSavePayrollToFirestore = async () => {
    if (generatedPayroll.length === 0 || !permissions.canManageTransactions) return;
    setIsSavingPayroll(true);
    try {
      const periodStr =
        selectedPayPeriod !== "all"
          ? selectedPayPeriod
          : new Date().toISOString().substring(0, 7);
      const recordsToPersist: PayrollRecord[] = generatedPayroll.map((p) => ({
        id: p.id,
        workerId: p.workerId,
        employeeId: p.workerId,
        workerName: p.workerName,
        position: p.trade,
        department: p.department || "Operations",
        team: "Site Team",
        project: financeState.assignedProjects[0] || rawProjectsList[0]?.name || "General",
        employmentType: "Permanent",
        basicSalary: p.basicSalary,
        attendanceDays: p.daysWorked,
        totalWorkingHours: p.normalHours + p.overtimeHours,
        overtimeHours: p.overtimeHours,
        overtimePayment: p.overtimePay,
        undertimeHours: p.underTimeHours,
        undertimeDeduction: p.underTimeDeduction,
        allowances: p.allowances,
        deductions: p.attendanceDeductions + p.underTimeDeduction + p.tax + p.pension,
        netSalary: p.netSalary,
        status: "Approved",
        grade: "Grade A",
        period: periodStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await DbService.savePayrollRecords(recordsToPersist);
      setSavedPayrollList(recordsToPersist);
      setPayrollSyncStatus(
        isAmharic
          ? `${recordsToPersist.length} የደሞዝ መዝገቦች ወደ Firestore ተቀምጠዋል።`
          : `Synchronized ${recordsToPersist.length} payroll records to Firestore.`
      );
      onLogAction?.(
        "Process Payroll Batch",
        `Saved ${recordsToPersist.length} payroll records to Firestore`
      );
      setTimeout(() => setPayrollSyncStatus(null), 4000);
    } catch (err) {
      console.error("Failed to save payroll:", err);
    } finally {
      setIsSavingPayroll(false);
    }
  };

  // Real-data Asset & Construction Cost Metrics
  const formworkAssetVal = useMemo(() => {
    return formworkPanelsList.reduce(
      (sum, panel) =>
        sum + (Number(panel.quantity) || 1) * (Number(panel.unitPriceEtb) || 12500),
      0
    );
  }, [formworkPanelsList]);

  const formworkDepreciation = useMemo(
    () =>
      equipments
        .filter((e) => e.category === "Aluminum Formwork")
        .reduce((s, e) => s + (e.depreciation || 0), 0),
    [equipments]
  );

  const maintenanceCost = useMemo(
    () =>
      equipments.reduce((s, e) => s + (e.maintenanceCost || 0) + (e.repairCost || 0), 0) +
      repairRecordsList.reduce((s, r) => s + (Number(r.cost) || 0), 0),
    [equipments, repairRecordsList]
  );

  const warehouseInventoryVal = useMemo(() => {
    const matVal = materialsList.reduce(
      (s, m) => s + (parseMoney(m.totalValue ?? m.value) ?? (Number(m.quantity) || 0) * (parseMoney(m.unitCost ?? m.unitPrice) ?? 0)),
      0
    );
    const whEquipVal = equipments
      .filter((e) => e.category === "Warehouse Asset")
      .reduce((s, e) => s + (e.currentValue || 0), 0);
    return matVal + whEquipVal;
  }, [materialsList, equipments]);

  const warehouseTransferCost = useMemo(
    () => procurements.reduce((s, p) => s + (p.transferCost || 0), 0),
    [procurements]
  );

  const warehouseWastageCost = useMemo(
    () => procurements.reduce((s, p) => s + (p.lossCost || 0) + (p.damageCost || 0), 0),
    [procurements]
  );

  // AI Risk Analytics
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<any>(null);
  const handleRunAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const response = await authFetch("/api/finance/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetData: financeState.scopedBudgets,
          expenseData: financeState.scopedExpenses,
          payrollData: generatedPayroll,
          procurementData: procurements,
          assetData: equipments,
          projectsData: projectsEvm,
        }),
      });
      const resData = await response.json();
      if (resData.success && resData.data) {
        setAiData(resData.data);
        onLogAction?.(
          "Run AI Financial Analysis",
          "Generated predictive cash flow and anomaly analysis"
        );
      }
    } catch (err) {
      console.error("AI Analysis fetch error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  // --- 17 CORE FINANCIAL MANAGEMENT MODULES + EXTENDED ERP TOOLS ---
  const rawCoreMenuModules: {
    id: FinancialMenuModuleId;
    num: number;
    labelEn: string;
    labelAm: string;
    icon: React.FC<{ size?: number; className?: string }>;
    badgeCount?: number;
    allowed: boolean;
  }[] = [
    {
      id: "financial-dashboard",
      num: 1,
      labelEn: "Financial Dashboard",
      labelAm: "የፋይናንስ ዳሽቦርድ",
      icon: Layers,
      allowed: true,
    },
    {
      id: "revenue-management",
      num: 2,
      labelEn: "Revenue Management",
      labelAm: "የገቢ አስተዳደር",
      icon: TrendingUp,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "expense-management",
      num: 3,
      labelEn: "Expense Management",
      labelAm: "የወጪ አስተዳደር",
      icon: TrendingDown,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "cash-collection",
      num: 4,
      labelEn: "Cash Collection",
      labelAm: "የጥሬ ገንዘብ መሰብሰብ",
      icon: ArrowDownLeft,
      badgeCount: financeState.pendingApprovalTransactions.filter((t) => t.type === "Collection").length,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "cash-payment",
      num: 5,
      labelEn: "Cash Payment",
      labelAm: "የጥሬ ገንዘብ ክፍያ",
      icon: ArrowUpRight,
      badgeCount: financeState.pendingApprovalTransactions.filter((t) => t.type === "Payment").length,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "accounts-receivable",
      num: 6,
      labelEn: "Accounts Receivable",
      labelAm: "የሚሰበሰብ ሂሳብ (AR)",
      icon: Receipt,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "accounts-payable",
      num: 7,
      labelEn: "Accounts Payable",
      labelAm: "የሚከፈል ሂሳብ (AP)",
      icon: CreditCard,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "aging-receivables",
      num: 8,
      labelEn: "Aging Receivables",
      labelAm: "የሚሰበሰብ ዕድሜ ትንተና",
      icon: Clock,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "aging-payables",
      num: 9,
      labelEn: "Aging Payables",
      labelAm: "የሚከፈል ዕድሜ ትንተና",
      icon: Clock,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "budget-management",
      num: 10,
      labelEn: "Budget Management",
      labelAm: "የበጀት አስተዳደር",
      icon: Briefcase,
      badgeCount: part4BudgetState.alerts.length,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "general-ledger",
      num: 11,
      labelEn: "General Ledger & COA",
      labelAm: "ጠቅላላ የሂሳብ መዝገብ (GL/COA)",
      icon: BookOpen,
      badgeCount: part8GlState.kpis.pendingJournalEntries,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "profit-and-loss",
      num: 12,
      labelEn: "Financial Statements & P&L",
      labelAm: "የፋይናንስ መግለጫዎች እና ትርፍ/ኪሳራ",
      icon: BarChart3,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "cash-flow",
      num: 13,
      labelEn: "Cash Flow Management",
      labelAm: "የገንዘብ ፍሰት አስተዳደር",
      icon: RefreshCw,
      badgeCount: part5CashFlowState.alerts.length,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "cash-and-bank",
      num: 14,
      labelEn: "Bank & Reconciliation",
      labelAm: "ባንክ እና የባንክ ማስታረቂያ",
      icon: Landmark,
      badgeCount: part6BankState.kpis.pendingApprovalCount + part6BankState.alerts.length,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "liquidity-management",
      num: 15,
      labelEn: "Liquidity Management",
      labelAm: "የፈሳሽ ገንዘብ (Liquidity)",
      icon: Scale,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "fixed-assets-depreciation",
      num: 16,
      labelEn: "Fixed Assets & Depreciation",
      labelAm: "ቋሚ ንብረቶች እና እርጅና",
      icon: Truck,
      allowed: !isHrManager,
    },
    {
      id: "tax-compliance",
      num: 17,
      labelEn: "Tax Management & Compliance",
      labelAm: "የግብር እና ህግ ተገዢነት",
      icon: Percent,
      badgeCount: taxComplianceState.kpis.overdueReturnsCount,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "loan-credit",
      num: 18,
      labelEn: "Loan, Credit & Financing",
      labelAm: "ብድር፣ ክሬዲት እና ፋይናንሲንግ",
      icon: Landmark,
      badgeCount: loanCreditState.kpis.creditLimitBreachesCount,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "petty-cash",
      num: 19,
      labelEn: "Petty Cash & Expense Control",
      labelAm: "ፔቲ ካሽ እና ወጪ ቁጥጥር",
      icon: Wallet,
      badgeCount: pettyCashState.kpis.pendingApprovalCount + pettyCashState.kpis.openShortageCount,
      allowed: !isHrManager,
    },
    {
      id: "financial-audit",
      num: 20,
      labelEn: "Audit & Internal Controls",
      labelAm: "ኦዲት እና የውስጥ ቁጥጥር",
      icon: ShieldAlert,
      badgeCount: detectedAnomalies.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "financial-reports",
      num: 21,
      labelEn: "Financial Reports",
      labelAm: "የፋይናንስ ሪፖርቶች",
      icon: FileText,
      allowed: !isWarehouseManager,
    },
    {
      id: "financial-notifications",
      num: 22,
      labelEn: "Financial Notifications",
      labelAm: "የፋይናንስ ማስጠንቀቂያዎች",
      icon: Bell,
      badgeCount:
        financeState.alerts.length +
        part4BudgetState.alerts.length +
        part5CashFlowState.alerts.length +
        part6BankState.alerts.length +
        taxComplianceState.kpis.overdueReturnsCount +
        pettyCashState.kpis.openShortageCount +
        detectedAnomalies.filter((a) => a.severity === "CRITICAL").length,
      allowed: !isWarehouseManager,
    },
    {
      id: "financial-settings",
      num: 23,
      labelEn: "Financial Settings",
      labelAm: "የፋይናንስ ቅንብሮች",
      icon: Settings,
      allowed: permissions.isDirector || permissions.isFinanceManager || isExecutiveReadOnly,
    },
  ];
  const coreMenuModules = rawCoreMenuModules.filter((m) => m.allowed);

  const rawExtendedErpModules: {
    id: FinancialMenuModuleId;
    labelEn: string;
    labelAm: string;
    icon: React.FC<{ size?: number; className?: string }>;
    allowed: boolean;
  }[] = [
    {
      id: "project-mgmt",
      labelEn: "Project EVM Control",
      labelAm: "የፕሮጀክት EVM ወጪ",
      icon: Briefcase,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "payroll-mgmt",
      labelEn: "Payroll System",
      labelAm: "የደሞዝ አስተዳደር",
      icon: Users,
      allowed: isFullAccess || isExecutiveReadOnly || isHrManager,
    },
    {
      id: "formwork-assets",
      labelEn: "Formwork Accounting",
      labelAm: "የፎርምወርክ ሀብት",
      icon: Package,
      allowed: !isHrManager,
    },
    {
      id: "warehouse-cost",
      labelEn: "Warehouse Cost",
      labelAm: "የመጋዘን ወጪ",
      icon: Building2,
      allowed: !isHrManager,
    },
    {
      id: "procurement-cost",
      labelEn: "Procurement Cost",
      labelAm: "የግዢና ጉምሩክ ወጪ",
      icon: CreditCard,
      allowed: !isHrManager,
    },
    {
      id: "equipment-cost",
      labelEn: "Equipment & Fuel",
      labelAm: "የማሽነሪና ነዳጅ ወጪ",
      icon: Truck,
      allowed: !isHrManager,
    },
    {
      id: "ai-analytics",
      labelEn: "AI Risk Analytics",
      labelAm: "AI የፋይናንስ ትንበያ",
      icon: Cpu,
      allowed: !isWarehouseManager && !isHrManager,
    },
    {
      id: "integrations",
      labelEn: "ERP Sync Matrix",
      labelAm: "የስርዓት ትስስር",
      icon: Wallet,
      allowed: true,
    },
  ];
  const extendedErpModules = rawExtendedErpModules.filter((m) => m.allowed);

  const handleSelectModule = (id: FinancialMenuModuleId) => {
    setCashFlowSubTabIntent("dashboard");
    setBankSubTabIntent("dashboard");
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  // --- RESTRICTED ACCESS VIEW ---
  if (!isAuthorizedUser) {
    return (
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-slate-100 shadow-2xl max-w-4xl mx-auto space-y-6 my-8 text-center"
        id="finance-erp-unauthorized"
      >
        <div className="w-16 h-16 bg-red-950/80 border border-red-500/40 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert size={34} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-white">
            {isAmharic
              ? "መዳረሻ ተከልክሏል – የፋይናንስ ERP ፈቃድ ያስፈልጋል"
              : "Access Restricted – Financial Management Authorization Required"}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
            {isAmharic
              ? "የአሁኑ የተጠቃሚ ሚናዎ የድርጅቱን የፋይናንስ መዝገቦች ለማየት ፈቃድ የለውም።"
              : "Your current role does not hold permissions for the Corporate Financial Management system."}
          </p>
        </div>

        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left grid grid-cols-1 md:grid-cols-2 gap-3 text-xs max-w-2xl mx-auto">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">
              Director & Finance Manager:
            </span>
            <span className="text-slate-300">
              Super Admin, Head Office, Finance Manager
            </span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-blue-400 block mb-1">Accountant:</span>
            <span className="text-slate-300">
              Revenue, Expense, Cash Collections, Payments & Bank Ledger
            </span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-amber-400 block mb-1">Project Manager:</span>
            <span className="text-slate-300">Assigned Project Financial Data Only</span>
          </div>
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
            <span className="font-bold text-slate-300 block mb-1">Auditor / Warehouse:</span>
            <span className="text-slate-400">Read-Only Audit / Warehouse Valuation</span>
          </div>
        </div>

        {onSwitchRole && (
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => onSwitchRole(UserRole.FINANCE_MANAGER)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Finance Manager
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole(UserRole.ACCOUNTANT)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Accountant
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole(UserRole.HEAD_OFFICE)}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Head Office (Director)
            </button>
            <button
              type="button"
              onClick={() => onSwitchRole(UserRole.PROJECT_MANAGER)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Project Manager
            </button>
          </div>
        )}
      </div>
    );
  }

  const showFilterBar =
    activeTab !== "financial-settings" &&
    activeTab !== "integrations" &&
    activeTab !== "budget-management" &&
    activeTab !== "general-ledger" &&
    activeTab !== "profit-and-loss";

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 shadow-2xl max-w-[1600px] mx-auto overflow-hidden"
      id="finance-erp-root"
    >
      {/* TOP BAR HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 bg-slate-950/70 px-4 sm:px-6 py-4 gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Toggle Financial Menu"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="p-2.5 bg-red-600 rounded-xl text-white">
            <DollarSign size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {isAmharic
                  ? "ዲጂታል ኮንስትራክሽን ERP — የፋይናንስ አስተዳደር"
                  : "Digital Construction ERP — Financial Management"}
              </h1>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                  permissions.isDirector || permissions.isFinanceManager
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                    : permissions.isAccountant
                    ? "bg-blue-950 text-blue-400 border-blue-800"
                    : permissions.isProjectScopedOnly
                    ? "bg-amber-950 text-amber-400 border-amber-800"
                    : "bg-slate-800 text-slate-300 border-slate-700"
                }`}
              >
                {currentUserRole}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAmharic
                ? "ቀጥተኛ የFirestore የሂሳብ መዝገብ፣ የገቢና ወጪ ቁጥጥር፣ የጥሬ ገንዘብ ፍሰት፣ AR/AP እና የአመራር ዳሽቦርድ"
                : "Live Firestore General Ledger, Revenue & Expense Control, Treasury, AR/AP Aging & Executive Dashboard"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.isProjectScopedOnly && (
            <div className="bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-800/80 flex items-center gap-1.5 text-amber-300 text-[11px] font-bold">
              <Lock size={13} />
              <span>
                {isAmharic
                  ? `የተመደቡ ፕሮጀክቶች (${financeState.assignedProjects.length})`
                  : `Project Scope (${financeState.assignedProjects.length})`}
              </span>
            </div>
          )}

          {permissions.isReadOnly && (
            <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 text-slate-300 text-[11px] font-bold">
              <Eye size={13} />
              <span>{isAmharic ? "ንባብ ብቻ" : "Read-Only"}</span>
            </div>
          )}

          {onSwitchRole && (
            <div className="relative group">
              <button
                type="button"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft size={13} />
                <span>{isAmharic ? "ሚና ቀይር" : "Switch Role"}</span>
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => onSwitchRole(UserRole.FINANCE_MANAGER)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg font-bold text-emerald-400 cursor-pointer"
                >
                  Finance Manager
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole(UserRole.HEAD_OFFICE)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg font-bold text-cyan-400 cursor-pointer"
                >
                  Head Office (Director)
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole(UserRole.ACCOUNTANT)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg font-bold text-blue-400 cursor-pointer"
                >
                  Accountant
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole(UserRole.PROJECT_MANAGER)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg font-bold text-amber-400 cursor-pointer"
                >
                  Project Manager
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole(UserRole.AUDITOR)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg font-bold text-slate-300 cursor-pointer"
                >
                  Auditor (Read-Only)
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchRole(UserRole.WAREHOUSE_MANAGER)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 rounded-lg font-bold text-purple-400 cursor-pointer"
                >
                  Warehouse Manager
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleSelectModule("financial-notifications")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
              financeState.alerts.length +
                part4BudgetState.alerts.length +
                part5CashFlowState.alerts.length +
                part6BankState.alerts.length >
              0
                ? "bg-red-950/70 border-red-800 text-red-300 hover:bg-red-950"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Bell size={13} />
            <span className="tabular-nums">
              {financeState.alerts.length +
                part4BudgetState.alerts.length +
                part5CashFlowState.alerts.length +
                part6BankState.alerts.length}
            </span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-PANE WORKSPACE: SIDEBAR MENU (1-17) + MODULE VIEWPORT */}
      <div className="flex flex-col lg:flex-row">
        {/* LEFT SIDEBAR NAVIGATION (17 Core Modules + Construction ERP Finance) */}
        <aside
          className={`${
            mobileMenuOpen ? "block" : "hidden"
          } lg:block w-full lg:w-64 xl:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/60 p-3 space-y-5 max-h-none lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto`}
          aria-label="Financial Management Main Menu"
        >
          <div>
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isAmharic ? "የፋይናንስ አስተዳደር ዋና ዝርዝር (1-17)" : "Financial Management Menu (1–17)"}
            </div>
            <nav className="space-y-1">
              {coreMenuModules.map((mod) => {
                const Icon = mod.icon;
                const active = activeTab === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => handleSelectModule(mod.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                      active
                        ? "bg-red-600 text-white border-red-500"
                        : "bg-transparent text-slate-300 border-transparent hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-mono w-4 shrink-0 ${
                          active ? "text-white/90" : "text-slate-500"
                        }`}
                      >
                        {mod.num}.
                      </span>
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate">
                        {isAmharic ? mod.labelAm : mod.labelEn}
                      </span>
                    </span>
                    {mod.badgeCount !== undefined && mod.badgeCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded tabular-nums ${
                          active
                            ? "bg-slate-950/40 text-white"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {mod.badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {extendedErpModules.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isAmharic ? "ተጨማሪ የኮንስትራክሽን ERP ሞጁሎች" : "Construction ERP Finance"}
              </div>
              <nav className="space-y-1">
                {extendedErpModules.map((mod) => {
                  const Icon = mod.icon;
                  const active = activeTab === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => handleSelectModule(mod.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                        active
                          ? "bg-red-600 text-white border-red-500"
                          : "bg-transparent text-slate-400 border-transparent hover:bg-slate-900 hover:text-white"
                      }`}
                    >
                      <Icon size={14} className="shrink-0" />
                      <span className="truncate">
                        {isAmharic ? mod.labelAm : mod.labelEn}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </aside>

        {/* RIGHT MAIN CONTENT WORKSPACE */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 space-y-5">
          {/* Dynamic Period & Dimension Filter Bar */}
          {showFilterBar && (
            <FinancialFilterBar
              isAmharic={isAmharic}
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(createDefaultFilters())}
              options={financeState.filterOptions}
              isProjectScopedOnly={financeState.permissions.isProjectScopedOnly}
              assignedProjects={financeState.assignedProjects}
              resolvedPeriodLabel={financeState.resolvedRange.label}
              resolvedRangeDates={{
                startDate: financeState.resolvedRange.startDate,
                endDate: financeState.resolvedRange.endDate,
              }}
            />
          )}

          {/* 1. EXECUTIVE FINANCIAL DASHBOARD */}
          {activeTab === "financial-dashboard" && (
            <ExecutiveFinancialDashboard
              isAmharic={isAmharic}
              state={financeState}
              advancedOverview={executiveOverview}
              onExportExecutiveExcel={handleExportExecutiveExcel}
              onNavigateModule={handleSelectModule}
            />
          )}

          {/* 2–5. TRANSACTION LEDGERS (Revenue, Expense, Cash Collection, Cash Payment) */}
          {(activeTab === "revenue-management" ||
            activeTab === "expense-management" ||
            activeTab === "cash-collection" ||
            activeTab === "cash-payment") && (
            <TransactionLedgers
              mode={activeTab}
              isAmharic={isAmharic}
              state={financeState}
              rawInvoices={invoices}
              rawExpenses={expenses}
              rawAccounts={financialAccounts}
              rawCashTransactions={cashTransactions}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* 6–9. ACCOUNTS RECEIVABLE, PAYABLE & AGING SCHEDULES */}
          {(activeTab === "accounts-receivable" ||
            activeTab === "accounts-payable" ||
            activeTab === "aging-receivables" ||
            activeTab === "aging-payables") && (
            <ReceivablesPayablesViews
              mode={activeTab}
              isAmharic={isAmharic}
              state={financeState}
              rawInvoices={invoices}
              rawExpenses={expenses}
              rawAccounts={financialAccounts}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* 10. PART 4 BUDGET MANAGEMENT & COST CONTROL + LEGACY MONTHLY TARGETS ACCESS */}
          {activeTab === "budget-management" && (
            <div className="space-y-4">
              <BudgetControlModule
                isAmharic={isAmharic}
                budgetState={part4BudgetState}
                filterState={part4Filters}
                onFilterChange={setPart4Filters}
                onResetFilters={() => setPart4Filters(createDefaultPart4Filters())}
                rawBudgetPlans={projectBudgetPlans}
                rawAllocations={budgetAllocations}
                rawRevisions={budgetRevisions}
                rawActualCosts={actualCostEntries}
                projectsList={rawProjectsList}
                currency={financialSettings.defaultCurrency || "ETB"}
                actorName={currentUserName}
                actorRole={currentUserRole}
                actorUid={actorUid}
                onLogAction={onLogAction}
              />

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-200">
                      {isAmharic
                        ? "ወርሃዊ የፋይናንስ እቅዶች እና ቀደምት የወጪ ማዕከላት (Part 1 Targets)"
                        : "Monthly Financial Targets & Legacy Cost Center Budgets"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isAmharic
                        ? "የExecutive Dashboard ወርሃዊ የገቢ፣ የወጪ እና የጥሬ ገንዘብ እቅዶችን ያስተዳድሩ"
                        : "Manage monthly Planned Revenue, Expenses, Collection, and Payment targets linked to the Executive Financial Dashboard."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLegacyTargetsPanel((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    {showLegacyTargetsPanel
                      ? isAmharic
                        ? "ዝርዝሩን ደብቅ"
                        : "Hide Monthly Targets"
                      : isAmharic
                      ? "ወርሃዊ እቅዶችን ክፈት"
                      : "Open Monthly Targets & Cost Centers"}
                  </button>
                </div>

                {showLegacyTargetsPanel && (
                  <PlanningStatementsTreasuryViews
                    mode="budget-management"
                    isAmharic={isAmharic}
                    state={financeState}
                    rawAccounts={financialAccounts}
                    actorName={currentUserName}
                    actorRole={currentUserRole}
                    actorUid={actorUid}
                    onLogAction={onLogAction}
                  />
                )}
              </div>
            </div>
          )}

          {/* 12. PART 5 CASH FLOW MANAGEMENT & FINANCIAL FORECASTING */}
          {activeTab === "cash-flow" && (
            <CashFlowForecastingModule
              key={cashFlowSubTabIntent}
              isAmharic={isAmharic}
              cashFlowState={part5CashFlowState}
              filterState={part5Filters}
              onFilterChange={setPart5Filters}
              onResetFilters={() => setPart5Filters(createDefaultPart5Filters())}
              rawAccounts={financialAccounts}
              rawCashTransactions={cashTransactions}
              rawForecastItems={cashFlowForecastItems}
              rawReconciliations={bankReconciliations}
              defaultSubTab={cashFlowSubTabIntent}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onNavigateModule={handleSelectModule}
              onLogAction={onLogAction}
            />
          )}

          {/* 13. PART 6 BANK MANAGEMENT & BANK RECONCILIATION */}
          {activeTab === "cash-and-bank" && (
            <BankManagementModule
              key={bankSubTabIntent}
              isAmharic={isAmharic}
              bankState={part6BankState}
              filterState={part6Filters}
              onFilterChange={setPart6Filters}
              onResetFilters={() => setPart6Filters(createDefaultPart6Filters())}
              rawAccounts={financialAccounts}
              rawBankTransactions={bankTransactions}
              rawCashTransactions={cashTransactions}
              rawStatements={bankStatements}
              rawReconciliations={bankReconciliations}
              rawInvoices={invoices}
              rawExpenses={expenses}
              rawPayroll={savedPayrollList}
              defaultSubTab={bankSubTabIntent}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* 11. PART 8 GENERAL LEDGER (GL) & CHART OF ACCOUNTS (COA) */}
          {activeTab === "general-ledger" && (
            <GeneralLedgerCoaModule
              isAmharic={isAmharic}
              glState={part8GlState}
              statementsState={part7StatementsState}
              filterState={part8Filters}
              onFilterChange={setPart8Filters}
              onResetFilters={() => setPart8Filters(createDefaultPart8Filters())}
              rawJournalEntries={journalEntries}
              rawPeriods={financialPeriods}
              rawFinancialYears={financialYears}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* 12. PART 7 FINANCIAL STATEMENTS, DOUBLE-ENTRY LEDGER & REPORTING */}
          {activeTab === "profit-and-loss" && (
            <FinancialStatementsModule
              isAmharic={isAmharic}
              statementsState={part7StatementsState}
              filterState={part7Filters}
              onFilterChange={setPart7Filters}
              onResetFilters={() => setPart7Filters(createDefaultPart7Filters())}
              rawJournalEntries={journalEntries}
              rawPeriods={financialPeriods}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* 14. LIQUIDITY & TREASURY MANAGEMENT */}
          {activeTab === "liquidity-management" && (
            <PlanningStatementsTreasuryViews
              mode="liquidity-management"
              isAmharic={isAmharic}
              state={financeState}
              rawAccounts={financialAccounts}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onOpenReconciliation={() => {
                setBankSubTabIntent("reconciliation");
                setActiveTab("cash-and-bank");
                setMobileMenuOpen(false);
              }}
              onLogAction={onLogAction}
            />
          )}

          {/* 16–20. FIXED ASSETS, TAX, LOANS, PETTY CASH & AUDIT CONTROLS */}
          {activeTab === "fixed-assets-depreciation" && (
            <FixedAssetsDepreciationModule
              isAmharic={isAmharic}
              assets={financeFixedAssets}
              events={fixedAssetEvents}
              accounts={financialAccounts}
              journals={journalEntries}
              periods={financialPeriods}
              financialYears={financialYears}
              projectsList={rawProjectsList}
              currency={financialSettings.defaultCurrency || "ETB"}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {activeTab === "tax-compliance" && (
            <TaxComplianceModule
              isAmharic={isAmharic}
              taxRates={taxRateConfigs}
              taxTransactions={taxTransactions}
              taxReturns={taxReturns}
              invoices={invoices}
              expenses={expenses}
              hrmPayrollRuns={hrmPayrollRuns}
              accounts={financialAccounts}
              statementsState={part7StatementsState}
              periods={financialPeriods}
              financialYears={financialYears}
              currency={financialSettings.defaultCurrency || "ETB"}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {activeTab === "loan-credit" && (
            <LoanCreditManagementModule
              isAmharic={isAmharic}
              loans={loanFacilities}
              repayments={loanRepayments}
              creditProfiles={creditProfiles}
              invoices={invoices}
              expenses={expenses}
              accounts={financialAccounts}
              periods={financialPeriods}
              financialYears={financialYears}
              projectsList={rawProjectsList}
              currency={financialSettings.defaultCurrency || "ETB"}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {activeTab === "petty-cash" && (
            <PettyCashControlModule
              isAmharic={isAmharic}
              funds={pettyCashFunds}
              transactions={pettyCashTransactions}
              reconciliations={pettyCashReconciliations}
              accounts={financialAccounts}
              periods={financialPeriods}
              financialYears={financialYears}
              projectsList={rawProjectsList}
              currency={financialSettings.defaultCurrency || "ETB"}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {activeTab === "financial-audit" && (
            <FinancialAuditControlsModule
              isAmharic={isAmharic}
              anomalies={detectedAnomalies}
              findings={financialAuditFindings}
              auditLogs={auditLogsList}
              currency={financialSettings.defaultCurrency || "ETB"}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* 21–23. REPORTS, NOTIFICATIONS & SETTINGS */}
          {(activeTab === "financial-reports" ||
            activeTab === "financial-notifications" ||
            activeTab === "financial-settings") && (
            <ReportsNotificationsSettingsViews
              mode={activeTab}
              isAmharic={isAmharic}
              state={financeState}
              budgetState={part4BudgetState}
              cashFlowState={part5CashFlowState}
              bankState={part6BankState}
              statementsState={part7StatementsState}
              fixedAssetsState={fixedAssetsState}
              taxState={taxComplianceState}
              loanState={loanCreditState}
              pettyCashState={pettyCashState}
              anomalies={detectedAnomalies}
              executiveOverview={executiveOverview}
              onExportExecutiveExcel={handleExportExecutiveExcel}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onNavigateModule={handleSelectModule}
              onLogAction={onLogAction}
            />
          )}

          {/* EXTENDED 1: PROJECT EVM COST CONTROL */}
          {activeTab === "project-mgmt" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase size={20} className="text-blue-400" />
                    <span>
                      {isAmharic
                        ? "የፕሮጀክት የተገኘ ዋጋ (EVM) እና የወጪ ቁጥጥር"
                        : "Project Earned Value Management (EVM) & Cost Control"}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAmharic
                      ? "ከFirestore ፕሮጀክቶች፣ በጀቶች እና ወጪዎች በቀጥታ የተሰላ CPI እና SPI"
                      : "Derived live from Firestore Projects, Budgets, Expenses, and Progress Logs"}
                  </p>
                </div>
                {permissions.canManageBudgets && (
                  <button
                    type="button"
                    onClick={() => handleSelectModule("budget-management")}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>{isAmharic ? "በጀት አስተዳድር" : "Manage Project Budgets"}</span>
                  </button>
                )}
              </div>

              {projectsEvm.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-400">
                  {loadingDbData
                    ? isAmharic
                      ? "የፕሮጀክት መረጃ በመጫን ላይ..."
                      : "Loading project EVM records..."
                    : isAmharic
                    ? "በFirestore ውስጥ የተመዘገቡ ፕሮጀክቶች የሉም።"
                    : "No registered projects found in Firestore yet."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectsEvm.map((prj) => {
                    const cpiStatus = prj.cpi >= 1.0 ? "text-emerald-400" : "text-red-400";
                    const spiStatus = prj.spi >= 1.0 ? "text-emerald-400" : "text-amber-400";
                    return (
                      <div
                        key={prj.id}
                        className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4"
                      >
                        <div className="flex justify-between items-start border-b border-slate-900 pb-3">
                          <div>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">
                              {prj.id}
                            </span>
                            <h3 className="font-bold text-white text-sm">{prj.name}</h3>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-blue-400 border border-slate-800">
                            {prj.cpi >= 1 ? "On Budget" : "Watch"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">CPI</span>
                            <span className={`text-base font-mono font-bold tabular-nums ${cpiStatus}`}>
                              {prj.cpi.toFixed(2)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 block">SPI</span>
                            <span className={`text-base font-mono font-bold tabular-nums ${spiStatus}`}>
                              {prj.spi.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs border-t border-slate-900 pt-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Approved Budget</span>
                            <span className="font-mono tabular-nums text-slate-200">
                              {formatCurrency(prj.approvedBudget)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Actual Cost (AC)</span>
                            <span className="font-mono tabular-nums text-red-400">
                              {formatCurrency(prj.actualCost)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Earned Value (EV)</span>
                            <span className="font-mono tabular-nums text-emerald-400">
                              {formatCurrency(prj.earnedValue)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-300">Forecast (EAC)</span>
                            <span className="font-mono tabular-nums text-amber-400">
                              {formatCurrency(prj.forecastCost)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EXTENDED 2: UNIFIED HRM + ATTENDANCE PAYROLL & LOAN RECOVERY */}
          {activeTab === "payroll-mgmt" && (
            <EnhancedPayrollFinanceModule
              isAmharic={isAmharic}
              hrmPayrollRuns={hrmPayrollRuns}
              hrmPayslips={hrmPayslips}
              salaryLoans={salaryAdvancesLoans}
              taxPensionConfigs={taxPensionConfigs}
              accounts={financialAccounts}
              workers={workersList}
              attendance={attendanceList}
              generatedPayroll={generatedPayroll.map((p) => ({
                ...p,
                employerPension: Math.round(p.basicSalary * 0.11),
                loanDeduction: 0,
              }))}
              availablePeriods={availablePeriods}
              selectedPayPeriod={selectedPayPeriod}
              onSelectPayPeriod={setSelectedPayPeriod}
              onSavePayrollBatch={handleSavePayrollToFirestore}
              isSavingPayroll={isSavingPayroll}
              payrollSyncStatus={payrollSyncStatus}
              currency={financialSettings.defaultCurrency || "ETB"}
              actorName={currentUserName}
              actorRole={currentUserRole}
              actorUid={actorUid}
              onLogAction={onLogAction}
            />
          )}

          {/* EXTENDED 3: FORMWORK ASSET ACCOUNTING */}
          {activeTab === "formwork-assets" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package size={20} className="text-amber-400" />
                  <span>
                    {isAmharic
                      ? "የአሉሚኒየም ፎርምወርክ ፓነል ሀብት ግምት"
                      : "Aluminum Formwork Valuation & Asset Depreciation"}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {isAmharic ? "የፎርምወርክ ሀብት ዋጋ" : "Formwork Asset Value"}
                  </span>
                  <span className="text-2xl font-black text-amber-400 block font-mono tabular-nums">
                    {formatCurrency(formworkAssetVal)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formworkPanelsList.length} {isAmharic ? "የተመዘገቡ ፓነሎች" : "registered panels"}
                  </span>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {isAmharic ? "የእርጅና ቅናሽ" : "Cumulative Depreciation"}
                  </span>
                  <span className="text-2xl font-black text-red-400 block font-mono tabular-nums">
                    {formatCurrency(formworkDepreciation)}
                  </span>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {isAmharic ? "የጥገና ወጪ" : "Maintenance & Repairs"}
                  </span>
                  <span className="text-2xl font-black text-blue-400 block font-mono tabular-nums">
                    {formatCurrency(maintenanceCost)}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Asset Code</th>
                      <th className="py-3 px-3">Item</th>
                      <th className="py-3 px-3">Purchase</th>
                      <th className="py-3 px-3">Current</th>
                      <th className="py-3 px-3">Depreciation</th>
                      <th className="py-3 px-3">Repair Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {equipments.filter((e) => e.category === "Aluminum Formwork").length > 0 ? (
                      equipments
                        .filter((e) => e.category === "Aluminum Formwork")
                        .map((eq) => (
                          <tr key={eq.id} className="hover:bg-slate-900/50">
                            <td className="py-3 px-3 font-mono font-bold text-amber-400">
                              {eq.assetCode}
                            </td>
                            <td className="py-3 px-3 font-bold text-white">{eq.equipmentName}</td>
                            <td className="py-3 px-3 font-mono tabular-nums">
                              {formatCurrency(eq.purchaseValue)}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-emerald-400">
                              {formatCurrency(eq.currentValue)}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-red-400">
                              {formatCurrency(eq.depreciation)}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-blue-400">
                              {formatCurrency(eq.repairCost)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No formwork equipment valuation records in Firestore yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXTENDED 4: WAREHOUSE COST */}
          {activeTab === "warehouse-cost" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 size={20} className="text-purple-400" />
                  <span>
                    {isAmharic
                      ? "የመጋዘን ክምችት ግምት እና የዝውውር ወጪ"
                      : "Warehouse Inventory Valuation & Transfer Costs"}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Warehouse Material & Asset Value
                  </span>
                  <span className="text-2xl font-black text-purple-400 font-mono tabular-nums block">
                    {formatCurrency(warehouseInventoryVal)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {materialsList.length} material items tracked
                  </span>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Inter-Site Transfer Cost
                  </span>
                  <span className="text-2xl font-black text-blue-400 font-mono tabular-nums block">
                    {formatCurrency(warehouseTransferCost)}
                  </span>
                </div>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Wastage & Damage Loss
                  </span>
                  <span className="text-2xl font-black text-red-400 font-mono tabular-nums block">
                    {formatCurrency(warehouseWastageCost)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* EXTENDED 5: PROCUREMENT COST */}
          {activeTab === "procurement-cost" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-400" />
                  <span>
                    {isAmharic
                      ? "የግዢ እና የጉምሩክ ወጪ ማዕከል"
                      : "Procurement, Purchase Orders & Customs Cost Center"}
                  </span>
                </h2>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">PO Number</th>
                      <th className="py-3 px-3">Supplier</th>
                      <th className="py-3 px-3">Material</th>
                      <th className="py-3 px-3">PO Amount</th>
                      <th className="py-3 px-3">Customs Tax</th>
                      <th className="py-3 px-3">Freight</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {procurements.length > 0 ? (
                      procurements.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-3 font-mono font-bold text-blue-400">
                            {p.poNumber}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{p.supplier}</td>
                          <td className="py-3 px-3">{p.materialItem}</td>
                          <td className="py-3 px-3 font-mono tabular-nums text-emerald-400">
                            {formatCurrency(p.poAmount)}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-red-400">
                            {formatCurrency(p.customsTax)}
                          </td>
                          <td className="py-3 px-3 font-mono tabular-nums text-amber-400">
                            {formatCurrency(p.deliveryCost)}
                          </td>
                          <td className="py-3 px-3">{p.status}</td>
                          <td className="py-3 px-3 text-slate-400">{p.date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          No procurement financial records in Firestore yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXTENDED 6: EQUIPMENT & FUEL COST */}
          {activeTab === "equipment-cost" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Truck size={20} className="text-amber-400" />
                  <span>
                    {isAmharic
                      ? "የማሽነሪዎች እና የነዳጅ ወጪ ቁጥጥር"
                      : "Heavy Machinery & Fuel Expense Control"}
                  </span>
                </h2>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Asset Code</th>
                      <th className="py-3 px-3">Equipment Name</th>
                      <th className="py-3 px-3">Hours</th>
                      <th className="py-3 px-3">Fuel (L)</th>
                      <th className="py-3 px-3">Fuel Cost</th>
                      <th className="py-3 px-3">Maintenance</th>
                      <th className="py-3 px-3">Rental</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {equipments.filter(
                      (e) =>
                        e.category !== "Aluminum Formwork" &&
                        e.category !== "Warehouse Asset"
                    ).length > 0 ? (
                      equipments
                        .filter(
                          (e) =>
                            e.category !== "Aluminum Formwork" &&
                            e.category !== "Warehouse Asset"
                        )
                        .map((eq) => (
                          <tr key={eq.id} className="hover:bg-slate-900/50">
                            <td className="py-3 px-3 font-mono font-bold text-amber-400">
                              {eq.assetCode}
                            </td>
                            <td className="py-3 px-3 font-bold text-white">
                              {eq.equipmentName}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums">
                              {eq.operatingHours} hrs
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-amber-400">
                              {eq.fuelLiters} L
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-red-400">
                              {formatCurrency(eq.fuelCost)}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-blue-400">
                              {formatCurrency(eq.maintenanceCost)}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums">
                              {formatCurrency(eq.rentalCost)}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No machinery cost records in Firestore yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EXTENDED 7: AI RISK ANALYTICS */}
          {activeTab === "ai-analytics" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Cpu size={20} className="text-amber-400" />
                    <span>
                      {isAmharic
                        ? "AI የፋይናንስ ትንበያ እና አጠራጣሪ ወጪ መለያ"
                        : "AI Financial Forecast & Anomaly Detection"}
                    </span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={15} />
                  <span>
                    {aiLoading
                      ? isAmharic
                        ? "AI በመተንተን ላይ..."
                        : "Running AI Audit..."
                      : isAmharic
                      ? "የAI ኦዲት አስጀምር"
                      : "Run AI Audit Engine"}
                  </span>
                </button>
              </div>

              {aiData ? (
                <div className="space-y-4">
                  <div className="bg-amber-950/30 border border-amber-800/70 p-5 rounded-2xl space-y-2">
                    <div className="text-xs font-bold text-amber-400 uppercase">
                      AI Executive Intelligence Summary
                    </div>
                    <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                      {aiData.executiveSummaryMarkdown}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-red-400" />
                        <span>Spending Anomalies</span>
                      </h3>
                      {(aiData.unusualSpendingAlerts || []).map((a: any, i: number) => (
                        <div
                          key={a.id || i}
                          className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs"
                        >
                          <div className="font-bold text-white">{a.category}</div>
                          <div className="text-slate-400">{a.reason}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Users size={14} className="text-amber-400" />
                        <span>Payroll Anomalies</span>
                      </h3>
                      {(aiData.payrollAnomalies || []).map((p: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs"
                        >
                          <div className="font-bold text-white">
                            {p.name} ({p.workerId})
                          </div>
                          <div className="text-slate-400">{p.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-10 rounded-2xl border border-slate-800 text-center space-y-2">
                  <Sparkles size={28} className="mx-auto text-amber-400" />
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isAmharic
                      ? "የFirestore የሂሳብ መረጃን መሰረት በማድረግ ትንበያ ለማግኘት ከላይ ያለውን አዝራር ይጫኑ።"
                      : "Click Run AI Audit Engine to analyze live Firestore budgets, expenses, cash flow, and payroll."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* EXTENDED 8: ERP SYNC MATRIX & AUDIT TRAIL */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Shield size={20} className="text-emerald-400" />
                  <span>
                    {isAmharic
                      ? "የERP ስርዓት ትስስር እና የፋይናንስ ኦዲት መዝገብ"
                      : "Enterprise ERP Sync Matrix & Financial Audit Ledger"}
                  </span>
                </h2>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-3">Audit ID</th>
                      <th className="py-3 px-3">User</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-3">Timestamp</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Impact / Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {auditLogsList.length > 0 ? (
                      auditLogsList.slice(0, 50).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                            {log.id}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{log.userName}</td>
                          <td className="py-3 px-3 text-slate-300">{log.role}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{log.timestamp}</td>
                          <td className="py-3 px-3 text-slate-200">{log.action}</td>
                          <td className="py-3 px-3 font-mono text-amber-400">
                            {log.financialImpact}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No security audit entries recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
