import {
  BankReconciliationRecord,
  BankReconciliationStatus,
  BankStatementLineItem,
  BankTransactionRecord,
  BudgetAllocationRecord,
  CashFlowAuditEntry,
  CashFlowForecastGranularity,
  CashFlowForecastItem,
  CashFlowForecastSource,
  CashFlowForecastStatus,
  CashFlowReportTypeId,
  CashInflowCategory,
  CashOutflowCategory,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialBudgetRecord,
  FinancialInvoiceRecord,
  FinancialMenuModuleId,
  FinancialPaymentRecord,
  FinancialSettingsConfig,
  MonthlyCollectionPlan,
  MonthlyFinancialTarget,
  MonthlyPaymentPlan,
  PayrollRecord,
  ProjectBudgetPlan,
  UserRole,
} from "../types";
import { DbService } from "./db";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  getAssignedProjectsForProfile,
  isConfirmedCashStatus,
  isReversedOrRejectedStatus,
  resolveUserFinancePermissions,
  UserFinancePermissions,
} from "./financeService";
import { parseMoney, safeString } from "../utils/formatters";

export const CASH_INFLOW_CATEGORIES: CashInflowCategory[] = [
  "Client Payments",
  "Advance Payments",
  "Certified Payments",
  "Other Project Income",
];

export const CASH_OUTFLOW_CATEGORIES: CashOutflowCategory[] = [
  "Material Payments",
  "Salary and Wages",
  "Subcontractor Payments",
  "Equipment Costs",
  "Operational Expenses",
  "Tax Payments",
  "Other Expenses",
];

export const CASH_FLOW_GRANULARITIES: CashFlowForecastGranularity[] = [
  "Daily",
  "Monthly",
  "Quarterly",
  "Annual",
];

export interface Part5FilterState {
  project: string;
  bankAccountId: string;
  financialYear: string;
  granularity: CashFlowForecastGranularity;
  startDate: string;
  endDate: string;
  searchTerm: string;
}

export function generateCashFlowRef(
  prefix: "CFF" | "REC" | "BSL",
  now: Date = new Date()
): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function classifyCashInflowCategory(
  rawCategory?: string,
  description?: string
): CashInflowCategory {
  const text = `${safeString(rawCategory)} ${safeString(description)}`.toLowerCase();
  if (text.includes("advance") || text.includes("mobilization") || text.includes("down payment")) {
    return "Advance Payments";
  }
  if (text.includes("certified") || text.includes("ipc") || text.includes("certificate") || text.includes("milestone")) {
    return "Certified Payments";
  }
  if (
    text.includes("client") ||
    text.includes("contract") ||
    text.includes("retention") ||
    text.includes("variation") ||
    text.includes("invoice") ||
    text.includes("receivable")
  ) {
    return "Client Payments";
  }
  return "Other Project Income";
}

export function classifyCashOutflowCategory(
  rawCategory?: string,
  description?: string
): CashOutflowCategory {
  const text = `${safeString(rawCategory)} ${safeString(description)}`.toLowerCase();
  if (
    text.includes("salary") ||
    text.includes("wage") ||
    text.includes("payroll") ||
    text.includes("labor") ||
    text.includes("employee") ||
    text.includes("staff") ||
    text.includes("allowance")
  ) {
    return "Salary and Wages";
  }
  if (text.includes("subcontractor") || text.includes("consultant")) {
    return "Subcontractor Payments";
  }
  if (
    text.includes("material") ||
    text.includes("cement") ||
    text.includes("rebar") ||
    text.includes("steel") ||
    text.includes("formwork") ||
    text.includes("supplier") ||
    text.includes("aggregate")
  ) {
    return "Material Payments";
  }
  if (
    text.includes("equipment") ||
    text.includes("machinery") ||
    text.includes("vehicle") ||
    text.includes("fuel") ||
    text.includes("rental") ||
    text.includes("crane") ||
    text.includes("excavator")
  ) {
    return "Equipment Costs";
  }
  if (
    text.includes("tax") ||
    text.includes("vat") ||
    text.includes("withholding") ||
    text.includes("customs") ||
    text.includes("duty") ||
    text.includes("pension")
  ) {
    return "Tax Payments";
  }
  if (
    text.includes("operational") ||
    text.includes("admin") ||
    text.includes("utility") ||
    text.includes("electricity") ||
    text.includes("water") ||
    text.includes("transport") ||
    text.includes("overhead") ||
    text.includes("restaurant") ||
    text.includes("food") ||
    text.includes("office")
  ) {
    return "Operational Expenses";
  }
  return "Other Expenses";
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const clean = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null;
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(laterIso: string, earlierIso: string): number {
  const a = parseIsoDate(laterIso);
  const b = parseIsoDate(earlierIso);
  if (!a || !b) return 0;
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function addDaysIso(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate) || new Date();
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function getBucketKey(dateIso: string, granularity: CashFlowForecastGranularity): string {
  const clean = safeString(dateIso).slice(0, 10);
  if (clean.length < 7) return clean || "Unknown";
  if (granularity === "Daily") return clean;
  if (granularity === "Monthly") return clean.slice(0, 7);
  if (granularity === "Quarterly") {
    const yr = clean.slice(0, 4);
    const mo = Number(clean.slice(5, 7)) || 1;
    const q = Math.floor((mo - 1) / 3) + 1;
    return `${yr}-Q${q}`;
  }
  return clean.slice(0, 4);
}

function generateHorizonBucketKeys(
  startIso: string,
  endIso: string,
  granularity: CashFlowForecastGranularity
): string[] {
  const start = parseIsoDate(startIso) || new Date();
  const end = parseIsoDate(endIso) || new Date();
  const safeStart = start <= end ? start : end;
  const safeEnd = start <= end ? end : start;

  const keys: string[] = [];
  const seen = new Set<string>();

  if (granularity === "Daily") {
    const cursor = new Date(safeStart);
    let guard = 0;
    while (cursor <= safeEnd && guard < 120) {
      const k = toIsoDate(cursor);
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    return keys;
  }

  if (granularity === "Monthly") {
    const cursor = new Date(safeStart.getFullYear(), safeStart.getMonth(), 1);
    const endMonth = new Date(safeEnd.getFullYear(), safeEnd.getMonth(), 1);
    let guard = 0;
    while (cursor <= endMonth && guard < 48) {
      const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
      cursor.setMonth(cursor.getMonth() + 1);
      guard++;
    }
    return keys;
  }

  if (granularity === "Quarterly") {
    const cursor = new Date(safeStart.getFullYear(), Math.floor(safeStart.getMonth() / 3) * 3, 1);
    const endQ = new Date(safeEnd.getFullYear(), Math.floor(safeEnd.getMonth() / 3) * 3, 1);
    let guard = 0;
    while (cursor <= endQ && guard < 24) {
      const q = Math.floor(cursor.getMonth() / 3) + 1;
      const k = `${cursor.getFullYear()}-Q${q}`;
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
      cursor.setMonth(cursor.getMonth() + 3);
      guard++;
    }
    return keys;
  }

  const sYear = safeStart.getFullYear();
  const eYear = safeEnd.getFullYear();
  for (let yr = sYear; yr <= eYear && yr - sYear < 15; yr++) {
    keys.push(String(yr));
  }
  return keys;
}

function matchesProjectScope(itemProject: string | undefined, assignedProjects: string[]): boolean {
  if (assignedProjects.length === 0) return false;
  const p = safeString(itemProject).toLowerCase();
  if (!p) return false;
  return assignedProjects.some((ap) => {
    const target = ap.toLowerCase();
    return p === target || p.includes(target) || target.includes(p);
  });
}

export interface ActualCashFlowEntry {
  id: string;
  referenceNo: string;
  date: string;
  direction: "Inflow" | "Outflow";
  category: CashInflowCategory | CashOutflowCategory;
  project: string;
  accountId: string;
  accountName: string;
  counterparty: string;
  amount: number;
  bankReferenceNumber?: string;
  receiptOrVoucherNo?: string;
  paymentMethod: string;
  linkedDocumentType?: string;
  linkedDocumentId?: string;
  isTransferComponent?: boolean;
}

export interface ProjectedCashFlowLine {
  id: string;
  referenceNo: string;
  expectedDate: string;
  direction: "Inflow" | "Outflow";
  category: CashInflowCategory | CashOutflowCategory;
  project: string;
  accountId?: string;
  accountName?: string;
  counterparty: string;
  amount: number;
  sourceType: CashFlowForecastSource;
  linkedDocumentId?: string;
  confidencePct: number;
  isOverdue: boolean;
  daysUntilDue: number;
  status: string;
}

export interface CashFlowPeriodRow {
  periodKey: string;
  periodLabel: string;
  openingBalance: number;
  actualInflow: number;
  actualOutflow: number;
  actualNetCashFlow: number;
  forecastInflow: number;
  forecastOutflow: number;
  forecastNetCashFlow: number;
  cashFlowVariance: number;
  closingBalance: number;
  projectedClosingBalance: number;
  minimumThreshold: number;
  shortageAmount: number;
  isShortage: boolean;
  isFuturePeriod: boolean;
}

export interface CashFlowShortageItem {
  id: string;
  periodKey: string;
  project: string;
  accountName: string;
  projectedOpeningBalance: number;
  expectedInflows: number;
  expectedOutflows: number;
  projectedClosingBalance: number;
  requiredBufferThreshold: number;
  shortageAmount: number;
  severity: "CRITICAL" | "WARNING";
  recommendedAction: string;
  recommendedActionAm: string;
}

export interface Part5CashFlowAlert {
  id: string;
  severity: "CRITICAL" | "WARNING";
  type: "Insufficient Cash" | "Forecast Cash Shortage" | "Overdue Collection" | "Upcoming Obligation" | "Bank Reconciliation Discrepancy";
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  project?: string;
  amount: number;
  moduleTarget: FinancialMenuModuleId;
}

export interface Part5CashFlowState {
  permissions: UserFinancePermissions;
  referenceToday: string;
  currency: string;
  settings: FinancialSettingsConfig;
  assignedProjects: string[];
  filterOptions: {
    projects: string[];
    financialYears: string[];
    accounts: FinancialAccount[];
  };
  kpis: {
    availableCashBalance: number;
    totalBankBalance: number;
    totalPettyCashBalance: number;
    actualCashInflow: number;
    actualCashOutflow: number;
    actualNetCashFlow: number;
    totalExpectedInflows: number;
    totalExpectedOutflows: number;
    forecastNetCashFlow: number;
    projectedClosingBalance: number;
    netCashPosition: number;
    forecastCashShortage: number;
    outstandingReceivables: number;
    overdueReceivables: number;
    upcomingPayables: number;
    overduePayables: number;
    cashFlowVariance: number;
    openingCashBalance: number;
    closingCashBalance: number;
    minimumBufferThreshold: number;
  };
  actualEntries: ActualCashFlowEntry[];
  inflowCategoryTotals: { category: CashInflowCategory; actual: number; forecast: number }[];
  outflowCategoryTotals: { category: CashOutflowCategory; actual: number; forecast: number }[];
  projectedLines: ProjectedCashFlowLine[];
  explicitForecastItems: CashFlowForecastItem[];
  periodSeries: CashFlowPeriodRow[];
  charts: {
    monthlyInflowVsOutflow: { label: string; actualInflow: number; actualOutflow: number; netCashFlow: number }[];
    actualVsForecastCashFlow: { label: string; actualNetCashFlow: number; forecastNetCashFlow: number; variance: number }[];
    projectCashFlow: { project: string; actualInflow: number; actualOutflow: number; netCashFlow: number; expectedInflow: number; expectedOutflow: number }[];
    bankBalances: { accountId: string; accountName: string; accountType: string; currentBalance: number; minimumThreshold: number; isBelowThreshold: boolean }[];
    monthlyClosingBalance: { label: string; closingBalance: number; projectedClosingBalance: number; threshold: number }[];
  };
  scopedAccounts: FinancialAccount[];
  scopedCashTransactions: CashTransactionRecord[];
  scopedReconciliations: BankReconciliationRecord[];
  shortageItems: CashFlowShortageItem[];
  alerts: Part5CashFlowAlert[];
}

export interface ComputePart5CashFlowInput {
  cashTransactions: CashTransactionRecord[];
  paymentRecords?: FinancialPaymentRecord[];
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  collectionPlans: MonthlyCollectionPlan[];
  paymentPlans: MonthlyPaymentPlan[];
  payrollRecords: PayrollRecord[];
  projectBudgetPlans: ProjectBudgetPlan[];
  legacyBudgets?: FinancialBudgetRecord[];
  budgetAllocations: BudgetAllocationRecord[];
  financialTargets: MonthlyFinancialTarget[];
  financialAccounts: FinancialAccount[];
  explicitForecastItems: CashFlowForecastItem[];
  bankReconciliations: BankReconciliationRecord[];
  bankTransactions?: BankTransactionRecord[];
  projects?: any[];
  filterState: Part5FilterState;
  userRole?: UserRole | string;
  userProfile?: any;
  settings?: FinancialSettingsConfig | null;
  referenceToday?: string;
}

export function computePart5CashFlowState(input: ComputePart5CashFlowInput): Part5CashFlowState {
  const referenceToday = safeString(input.referenceToday, toIsoDate(new Date())).slice(0, 10);
  const settings: FinancialSettingsConfig = {
    ...DEFAULT_FINANCIAL_SETTINGS,
    ...(input.settings || {}),
  };
  const currency = settings.defaultCurrency || "ETB";
  const permissions = resolveUserFinancePermissions(input.userRole);
  const assignedProjects = permissions.isProjectScopedOnly
    ? getAssignedProjectsForProfile(input.userProfile, input.projects || [])
    : [];

  const scopeMatchesProject = (proj?: string) => {
    if (!permissions.isProjectScopedOnly) return true;
    return matchesProjectScope(proj, assignedProjects);
  };

  // Merge non-duplicate confirmed + all cash transactions
  const seenIds = new Set<string>();
  const seenRefs = new Set<string>();
  const mergedCashTxs: CashTransactionRecord[] = [];

  (input.cashTransactions || []).forEach((tx) => {
    if (!tx || !tx.id) return;
    seenIds.add(tx.id);
    if (tx.referenceNo) seenRefs.add(tx.referenceNo);
    mergedCashTxs.push({
      ...tx,
      amount: parseMoney(tx.amount) ?? 0,
      date: safeString(tx.date, referenceToday).slice(0, 10),
      project: safeString(tx.project, "General"),
      category: safeString(tx.category),
      counterparty: safeString(tx.counterparty, "Counterparty"),
    });
  });

  (input.paymentRecords || []).forEach((p) => {
    if (!p || !p.id) return;
    const ref = safeString(p.referenceNo || p.reference);
    if (seenIds.has(p.id) || (ref && seenRefs.has(ref))) return;
    const txType: "Collection" | "Payment" = p.type === "Payment" ? "Payment" : "Collection";
    mergedCashTxs.push({
      id: p.id,
      referenceNo: ref || p.id,
      type: txType,
      date: safeString(p.date, referenceToday).slice(0, 10),
      amount: parseMoney(p.amount) ?? 0,
      currency,
      accountId: safeString(p.accountId),
      accountName: safeString(p.method, "Bank Account"),
      project: safeString(p.project, "General"),
      department: safeString(p.department, "Project Finance"),
      category: txType === "Collection" ? "Client Payments" : "Operational Expenses",
      counterparty: safeString(p.counterparty || p.invoiceNumber, "Counterparty"),
      linkedDocumentType: p.expenseId ? "Expense" : p.invoiceId ? "Invoice" : "Direct",
      linkedDocumentId: p.expenseId || p.invoiceId,
      paymentMethod: safeString(p.method, "Bank Transfer"),
      status: safeString(p.status, "Posted"),
      createdBy: safeString(p.createdBy, "Ledger"),
      createdById: "",
      createdAt: safeString(p.createdAt, p.date),
      updatedAt: safeString(p.createdAt, p.date),
    });
  });

  // Merge Approved Part 6 Bank Transactions that are NOT already represented by a cashTransaction
  (input.bankTransactions || []).forEach((bt) => {
    if (!bt || !bt.id || bt.approvalStatus !== "Approved") return;
    if (bt.linkedCashTxId && seenIds.has(bt.linkedCashTxId)) return;
    if (seenIds.has(bt.id) || (bt.referenceNo && seenRefs.has(bt.referenceNo))) return;
    seenIds.add(bt.id);
    if (bt.referenceNo) seenRefs.add(bt.referenceNo);
    const txType: "Collection" | "Payment" | "Transfer" =
      bt.transactionType === "Bank Transfers"
        ? "Transfer"
        : bt.direction === "Credit"
        ? "Collection"
        : "Payment";
    mergedCashTxs.push({
      id: bt.id,
      referenceNo: bt.referenceNo || bt.transactionNo,
      type: txType,
      date: safeString(bt.transactionDate, referenceToday).slice(0, 10),
      amount: parseMoney(bt.amount) ?? 0,
      currency: bt.currency || currency,
      accountId: bt.accountId,
      accountName: bt.accountName,
      toAccountId: bt.toAccountId,
      toAccountName: bt.toAccountName,
      project: safeString(bt.project, "Corporate Treasury"),
      department: safeString(bt.department, "Treasury & Banking"),
      category: bt.transactionType,
      counterparty: safeString(bt.counterparty, bt.description || "Bank Counterparty"),
      bankReferenceNumber: bt.referenceNo,
      linkedDocumentType:
        bt.linkedDocumentType === "Invoice" || bt.linkedDocumentType === "Expense" || bt.linkedDocumentType === "Payroll"
          ? bt.linkedDocumentType
          : "Direct",
      linkedDocumentId: bt.linkedDocumentId,
      linkedReferenceNo: bt.linkedReferenceNo,
      paymentMethod: bt.paymentMethod || "Bank Transfer",
      status: "Posted",
      description: bt.description,
      createdBy: bt.recordedBy || bt.createdBy,
      createdById: bt.createdById,
      createdAt: bt.createdAt,
      updatedAt: bt.updatedAt,
    });
  });

  // Collect Role-Scoped Data
  const roleAccounts = (input.financialAccounts || []).filter(
    (a) =>
      a.status !== "Inactive" &&
      (!permissions.isProjectScopedOnly ||
        !a.project ||
        a.project === "Corporate Treasury" ||
        matchesProjectScope(a.project, assignedProjects))
  );
  const roleCashTxs = mergedCashTxs.filter((tx) => scopeMatchesProject(tx.project));
  const roleInvoices = (input.invoices || []).filter((inv) => scopeMatchesProject(inv.project));
  const roleExpenses = (input.expenses || []).filter((exp) => scopeMatchesProject(exp.project));
  const roleColPlans = (input.collectionPlans || []).filter(
    (cp) => cp.targetScope === "Company" || scopeMatchesProject(cp.project)
  );
  const rolePayPlans = (input.paymentPlans || []).filter((pp) => scopeMatchesProject(pp.project));
  const rolePayroll = (input.payrollRecords || []).filter((pr) =>
    !permissions.isProjectScopedOnly ? true : scopeMatchesProject(pr.project)
  );
  const roleExplicitForecasts = (input.explicitForecastItems || []).filter((f) =>
    scopeMatchesProject(f.project)
  );
  const roleReconciliations = (input.bankReconciliations || []).filter((rec) =>
    roleAccounts.length === 0 || roleAccounts.some((a) => a.id === rec.accountId)
  );

  // Filter options
  const projectSet = new Set<string>();
  const yearSet = new Set<string>([referenceToday.slice(0, 4)]);
  if (!permissions.isProjectScopedOnly) {
    (input.projects || []).forEach((p) => {
      const n = safeString(p?.name || p?.projectName);
      if (n) projectSet.add(n);
    });
  } else {
    assignedProjects.forEach((p) => projectSet.add(p));
  }
  roleCashTxs.forEach((t) => {
    if (t.project) projectSet.add(t.project);
    if (t.date?.length >= 4) yearSet.add(t.date.slice(0, 4));
  });
  roleInvoices.forEach((i) => {
    if (i.project) projectSet.add(i.project);
    if (i.dueDate?.length >= 4) yearSet.add(i.dueDate.slice(0, 4));
  });
  roleExpenses.forEach((e) => {
    if (e.project) projectSet.add(e.project);
    if (e.date?.length >= 4) yearSet.add(e.date.slice(0, 4));
  });
  roleExplicitForecasts.forEach((f) => {
    if (f.project) projectSet.add(f.project);
    if (f.financialYear) yearSet.add(f.financialYear);
  });

  // Resolve Filter Window
  const f = input.filterState;
  const activeYear = f.financialYear && f.financialYear !== "ALL" ? f.financialYear : "";
  const defaultStart = activeYear
    ? `${activeYear}-01-01`
    : f.granularity === "Daily"
    ? addDaysIso(referenceToday, -14)
    : f.granularity === "Annual"
    ? `${Number(referenceToday.slice(0, 4)) - 1}-01-01`
    : `${referenceToday.slice(0, 4)}-01-01`;
  const defaultEnd = activeYear
    ? `${activeYear}-12-31`
    : f.granularity === "Daily"
    ? addDaysIso(referenceToday, 30)
    : f.granularity === "Annual"
    ? `${Number(referenceToday.slice(0, 4)) + 2}-12-31`
    : `${referenceToday.slice(0, 4)}-12-31`;

  const startDate = safeString(f.startDate, defaultStart).slice(0, 10);
  const endDate = safeString(f.endDate, defaultEnd).slice(0, 10);
  const windowStart = startDate <= endDate ? startDate : endDate;
  const windowEnd = startDate <= endDate ? endDate : startDate;

  const q = safeString(f.searchTerm).toLowerCase();
  const matchesFilterProject = (proj?: string) =>
    f.project === "ALL" || safeString(proj) === f.project;
  const matchesFilterYear = (dateIso?: string, explicitYr?: string) =>
    !activeYear ||
    safeString(explicitYr) === activeYear ||
    safeString(dateIso).startsWith(activeYear);
  const matchesSearch = (blob: string) => !q || blob.toLowerCase().includes(q);
  const inDateRange = (dateIso: string) =>
    dateIso >= windowStart && dateIso <= windowEnd;

  // Accounts filtered by project & bankAccountId
  const scopedAccounts = roleAccounts.filter((acc) => {
    if (f.bankAccountId !== "ALL" && acc.id !== f.bankAccountId) return false;
    if (f.project !== "ALL" && acc.project && acc.project !== "Corporate Treasury" && acc.project !== f.project) {
      return false;
    }
    return true;
  });

  const availableCashBalance = scopedAccounts.reduce(
    (s, a) => s + (parseMoney(a.currentBalance) ?? 0),
    0
  );
  const totalBankBalance = scopedAccounts
    .filter((a) => a.accountType === "Bank")
    .reduce((s, a) => s + (parseMoney(a.currentBalance) ?? 0), 0);
  const totalPettyCashBalance = scopedAccounts
    .filter((a) => a.accountType === "Cash")
    .reduce((s, a) => s + (parseMoney(a.currentBalance) ?? 0), 0);
  const accountsThresholdSum = scopedAccounts.reduce(
    (s, a) => s + (parseMoney(a.minimumThreshold) ?? 0),
    0
  );
  const minimumBufferThreshold =
    f.bankAccountId !== "ALL" && scopedAccounts.length > 0
      ? accountsThresholdSum
      : Math.max(settings.lowCashAlertThresholdEtb, accountsThresholdSum);

  // =========================================================================
  // 1. STRICT CASH-BASIS ACTUAL CASH MOVEMENTS
  //    CRITICAL RULE: NEVER include unpaid invoices or unpaid bills here.
  // =========================================================================
  const invoiceCategoryMap = new Map<string, string>();
  roleInvoices.forEach((inv) => {
    invoiceCategoryMap.set(inv.id, safeString(inv.receivableCategory || inv.category));
  });
  const expenseCategoryMap = new Map<string, string>();
  roleExpenses.forEach((exp) => {
    expenseCategoryMap.set(exp.id, safeString(exp.payableCategory || exp.category));
  });

  // Index confirmed cash linked to invoices/expenses/payroll to compute remaining open AR/AP accurately
  const confirmedCollectedByInvId = new Map<string, number>();
  const confirmedPaidByExpId = new Map<string, number>();
  const confirmedPaidPayrollIds = new Set<string>();

  roleCashTxs.forEach((tx) => {
    if (!isConfirmedCashStatus(tx.status)) return;
    const amt = parseMoney(tx.amount) ?? 0;
    if (tx.type === "Collection" && tx.linkedDocumentId) {
      confirmedCollectedByInvId.set(
        tx.linkedDocumentId,
        (confirmedCollectedByInvId.get(tx.linkedDocumentId) || 0) + amt
      );
    }
    if (tx.type === "Payment" && tx.linkedDocumentId) {
      confirmedPaidByExpId.set(
        tx.linkedDocumentId,
        (confirmedPaidByExpId.get(tx.linkedDocumentId) || 0) + amt
      );
      if (tx.linkedDocumentType === "Payroll") {
        confirmedPaidPayrollIds.add(tx.linkedDocumentId);
      }
    }
  });

  const allConfirmedEntriesForBalance: ActualCashFlowEntry[] = [];
  const filteredActualEntries: ActualCashFlowEntry[] = [];

  roleCashTxs.forEach((tx) => {
    if (!isConfirmedCashStatus(tx.status)) return;
    const amt = parseMoney(tx.amount) ?? 0;
    if (amt <= 0) return;

    const selectedAccountFilter = f.bankAccountId !== "ALL" ? f.bankAccountId : null;

    if (tx.type === "Transfer") {
      // Inter-account transfer:
      // At consolidated company level (ALL accounts), net company cash flow impact is 0 -> excluded from company Inflow/Outflow totals.
      // When inspecting a SPECIFIC bank/cash account, outgoing transfer = Outflow and incoming transfer = Inflow for that account.
      if (!selectedAccountFilter) return;
      const isOutgoing = tx.accountId === selectedAccountFilter;
      const isIncoming = tx.toAccountId === selectedAccountFilter;
      if (!isOutgoing && !isIncoming) return;

      const entry: ActualCashFlowEntry = {
        id: tx.id,
        referenceNo: tx.referenceNo,
        date: tx.date,
        direction: isIncoming ? "Inflow" : "Outflow",
        category: isIncoming ? "Other Project Income" : "Other Expenses",
        project: tx.project || "Corporate Treasury",
        accountId: selectedAccountFilter,
        accountName: isIncoming ? safeString(tx.toAccountName, tx.accountName) : tx.accountName,
        counterparty: isIncoming ? `Transfer from ${tx.accountName}` : `Transfer to ${safeString(tx.toAccountName, "Account")}`,
        amount: amt,
        bankReferenceNumber: tx.bankReferenceNumber,
        receiptOrVoucherNo: tx.referenceNo,
        paymentMethod: tx.paymentMethod,
        linkedDocumentType: "Transfer",
        linkedDocumentId: tx.linkedDocumentId,
        isTransferComponent: true,
      };
      allConfirmedEntriesForBalance.push(entry);
      if (
        matchesFilterProject(entry.project) &&
        matchesFilterYear(entry.date) &&
        inDateRange(entry.date) &&
        matchesSearch(`${entry.referenceNo} ${entry.counterparty} ${entry.project} ${entry.category}`)
      ) {
        filteredActualEntries.push(entry);
      }
      return;
    }

    if (selectedAccountFilter && tx.accountId !== selectedAccountFilter) return;

    const direction: "Inflow" | "Outflow" = tx.type === "Collection" ? "Inflow" : "Outflow";
    const linkedRawCat =
      direction === "Inflow" && tx.linkedDocumentId
        ? invoiceCategoryMap.get(tx.linkedDocumentId)
        : direction === "Outflow" && tx.linkedDocumentId
        ? expenseCategoryMap.get(tx.linkedDocumentId)
        : "";
    const category =
      direction === "Inflow"
        ? classifyCashInflowCategory(linkedRawCat || tx.category, tx.description || tx.notes)
        : classifyCashOutflowCategory(linkedRawCat || tx.category, tx.description || tx.notes);

    const entry: ActualCashFlowEntry = {
      id: tx.id,
      referenceNo: tx.referenceNo,
      date: tx.date,
      direction,
      category,
      project: tx.project || "General",
      accountId: tx.accountId,
      accountName: tx.accountName || "Cash / Bank Account",
      counterparty: tx.counterparty || "Counterparty",
      amount: amt,
      bankReferenceNumber: tx.bankReferenceNumber,
      receiptOrVoucherNo: tx.receiptNumber || tx.paymentVoucherNumber || tx.referenceNo,
      paymentMethod: tx.paymentMethod || "Bank Transfer",
      linkedDocumentType: tx.linkedDocumentType,
      linkedDocumentId: tx.linkedDocumentId,
    };

    allConfirmedEntriesForBalance.push(entry);

    if (
      matchesFilterProject(entry.project) &&
      matchesFilterYear(entry.date) &&
      inDateRange(entry.date) &&
      matchesSearch(
        `${entry.referenceNo} ${entry.counterparty} ${entry.project} ${entry.category} ${entry.accountName} ${entry.bankReferenceNumber || ""}`
      )
    ) {
      filteredActualEntries.push(entry);
    }
  });

  filteredActualEntries.sort((a, b) => b.date.localeCompare(a.date));

  const actualCashInflow = filteredActualEntries
    .filter((e) => e.direction === "Inflow")
    .reduce((s, e) => s + e.amount, 0);
  const actualCashOutflow = filteredActualEntries
    .filter((e) => e.direction === "Outflow")
    .reduce((s, e) => s + e.amount, 0);
  const actualNetCashFlow = actualCashInflow - actualCashOutflow;

  // =========================================================================
  // 2. MULTI-SOURCE CASH FLOW FORECAST AGGREGATION (No Double Counting)
  //    Sources:
  //    a) Explicit Approved CashFlowForecastItems
  //    b) Outstanding Receivables (invoices)
  //    c) Expected Client Collections (approved collectionPlans not covered by open AR)
  //    d) Scheduled Supplier Payments / Open Payables (expenses)
  //    e) Approved Payment Plans (not duplicating open AP)
  //    f) Unpaid Payroll Obligations (payrollRecords)
  //    g) Remaining Approved Project Budget Allocations / Planned Expenditures
  // =========================================================================
  const projectedLines: ProjectedCashFlowLine[] = [];
  const coveredDocIds = new Set<string>();
  const coveredInvoiceRefs = new Set<string>();
  const coveredBillRefs = new Set<string>();

  // 2a) Explicit Approved Forecast Items
  roleExplicitForecasts.forEach((item) => {
    if (item.approvalStatus !== "Approved") return;
    if (f.bankAccountId !== "ALL" && item.accountId && item.accountId !== f.bankAccountId) return;
    if (!matchesFilterProject(item.project)) return;
    if (!matchesFilterYear(item.expectedDate, item.financialYear)) return;
    if (item.linkedDocumentId) coveredDocIds.add(item.linkedDocumentId);
    if (item.linkedReferenceNo) {
      if (item.direction === "Inflow") coveredInvoiceRefs.add(item.linkedReferenceNo.toLowerCase());
      else coveredBillRefs.add(item.linkedReferenceNo.toLowerCase());
    }

    const expDate = safeString(item.expectedDate, referenceToday).slice(0, 10);
    if (!inDateRange(expDate)) return;
    if (!matchesSearch(`${item.forecastRef} ${item.counterparty} ${item.project} ${item.category}`)) return;

    const daysDiff = diffDays(expDate, referenceToday);
    projectedLines.push({
      id: `EXP-FC-${item.id}`,
      referenceNo: item.forecastRef,
      expectedDate: expDate,
      direction: item.direction,
      category: item.category,
      project: item.project,
      accountId: item.accountId,
      accountName: item.accountName,
      counterparty: item.counterparty,
      amount: parseMoney(item.amount) ?? 0,
      sourceType: item.sourceType || "Manual Forecast",
      linkedDocumentId: item.linkedDocumentId,
      confidencePct: item.probabilityPct ?? 90,
      isOverdue: daysDiff < 0,
      daysUntilDue: daysDiff,
      status: item.approvalStatus,
    });
  });

  // 2b) Outstanding Receivables (AR Invoices)
  let totalOutstandingReceivables = 0;
  let totalOverdueReceivables = 0;
  let totalOutstandingPayables = 0;
  let totalOverduePayables = 0;

  roleInvoices.forEach((inv) => {
    if (!matchesFilterProject(inv.project)) return;
    const statusRaw = safeString(inv.status, "Pending");
    if (statusRaw === "Cancelled" || statusRaw === "Rejected" || Boolean(inv.isDisputed) || statusRaw.toLowerCase() === "disputed") {
      return;
    }
    const amt = parseMoney(inv.amount) ?? 0;
    const paid = Math.max(
      confirmedCollectedByInvId.get(inv.id) || 0,
      parseMoney(inv.paidAmount) ?? 0,
      statusRaw === "Paid" && (parseMoney(inv.paidAmount) ?? 0) === 0 ? amt : 0
    );
    const outstanding = Math.max(0, amt - paid);
    if (outstanding <= 0) return;

    const dueDate = safeString(inv.dueDate, inv.date || referenceToday).slice(0, 10);
    const daysPastDue = Math.max(0, diffDays(referenceToday, dueDate) - settings.overdueAlertGraceDays);

    totalOutstandingReceivables += outstanding;
    if (daysPastDue > 0) totalOverdueReceivables += outstanding;

    if (inv.invoiceNumber) coveredInvoiceRefs.add(inv.invoiceNumber.toLowerCase());
    if (coveredDocIds.has(inv.id)) return;
    if (!matchesFilterYear(dueDate)) return;
    if (!inDateRange(dueDate)) return;
    if (!matchesSearch(`${inv.invoiceNumber} ${inv.client || inv.clientName || ""} ${inv.project}`)) return;

    projectedLines.push({
      id: `AR-FC-${inv.id}`,
      referenceNo: inv.invoiceNumber || inv.receivableId || inv.id,
      expectedDate: dueDate,
      direction: "Inflow",
      category: classifyCashInflowCategory(inv.receivableCategory || inv.category, inv.description),
      project: safeString(inv.project, "General"),
      counterparty: safeString(inv.client || inv.clientName, "Client"),
      amount: outstanding,
      sourceType: "Outstanding Receivable",
      linkedDocumentId: inv.id,
      confidencePct: daysPastDue > 60 ? 70 : daysPastDue > 0 ? 85 : 95,
      isOverdue: daysPastDue > 0,
      daysUntilDue: diffDays(dueDate, referenceToday),
      status: daysPastDue > 0 ? "Overdue AR" : "Open Receivable",
    });
  });

  // 2c) Expected Client Collections (Approved collectionPlans not already covered by open invoice)
  roleColPlans.forEach((cp) => {
    if (cp.approvalStatus !== "Approved") return;
    if (!matchesFilterProject(cp.project)) return;
    const invKey = safeString(cp.invoiceNumber).toLowerCase();
    if (invKey && coveredInvoiceRefs.has(invKey)) return;
    const expDate = safeString(cp.expectedDate, `${cp.month}-15`).slice(0, 10);
    if (!matchesFilterYear(expDate, cp.financialYear)) return;
    if (!inDateRange(expDate)) return;
    const planned = parseMoney(cp.plannedAmount) ?? 0;
    if (planned <= 0) return;
    if (!matchesSearch(`${cp.planNumber} ${cp.customer} ${cp.project}`)) return;

    projectedLines.push({
      id: `CPL-FC-${cp.id}`,
      referenceNo: cp.planNumber || cp.id,
      expectedDate: expDate,
      direction: "Inflow",
      category: "Client Payments",
      project: safeString(cp.project, "General"),
      counterparty: safeString(cp.customer, "Planned Client"),
      amount: planned,
      sourceType: "Expected Client Collection",
      confidencePct: 90,
      isOverdue: diffDays(referenceToday, expDate) > 0,
      daysUntilDue: diffDays(expDate, referenceToday),
      status: cp.approvalStatus,
    });
  });

  // 2d) Open Accounts Payable / Supplier Expenses (AP)
  roleExpenses.forEach((exp) => {
    if (!matchesFilterProject(exp.project)) return;
    const statusRaw = safeString(exp.status, "Approved");
    if (statusRaw === "Cancelled" || statusRaw === "Rejected" || Boolean(exp.isDisputed) || statusRaw.toLowerCase() === "disputed") {
      return;
    }
    const amt = parseMoney(exp.amount) ?? 0;
    const paid = Math.max(confirmedPaidByExpId.get(exp.id) || 0, parseMoney(exp.paidAmount) ?? 0);
    const outstanding = Math.max(0, amt - paid);
    if (outstanding <= 0) return;

    const dueDate = safeString(exp.dueDate || exp.date, referenceToday).slice(0, 10);
    const daysPastDue = Math.max(0, diffDays(referenceToday, dueDate) - settings.overdueAlertGraceDays);

    totalOutstandingPayables += outstanding;
    if (daysPastDue > 0) totalOverduePayables += outstanding;

    if (exp.billNumber) coveredBillRefs.add(exp.billNumber.toLowerCase());
    if (coveredDocIds.has(exp.id)) return;
    if (!matchesFilterYear(dueDate)) return;
    if (!inDateRange(dueDate)) return;
    if (!matchesSearch(`${exp.billNumber || exp.id} ${exp.vendor || exp.supplier || ""} ${exp.project}`)) return;

    projectedLines.push({
      id: `AP-FC-${exp.id}`,
      referenceNo: exp.billNumber || exp.payableId || exp.id,
      expectedDate: dueDate,
      direction: "Outflow",
      category: classifyCashOutflowCategory(exp.payableCategory || exp.category, exp.description),
      project: safeString(exp.project, "General"),
      counterparty: safeString(exp.vendor || exp.supplier, "Supplier"),
      amount: outstanding,
      sourceType: "Scheduled Supplier Payment",
      linkedDocumentId: exp.id,
      confidencePct: 100,
      isOverdue: daysPastDue > 0,
      daysUntilDue: diffDays(dueDate, referenceToday),
      status: daysPastDue > 0 ? "Overdue AP" : "Open Payable",
    });
  });

  // 2e) Approved Monthly Payment Plans (not already covered by open AP bill)
  const scheduledPlanByProjectMonth = new Map<string, number>();
  rolePayPlans.forEach((pp) => {
    if (pp.approvalStatus !== "Approved") return;
    if (!matchesFilterProject(pp.project)) return;
    const invKey = safeString(pp.invoiceNumber).toLowerCase();
    if (invKey && coveredBillRefs.has(invKey)) return;
    const expDate = safeString(pp.expectedDate, `${pp.month}-25`).slice(0, 10);
    if (!matchesFilterYear(expDate, pp.financialYear)) return;
    if (!inDateRange(expDate)) return;
    const planned = parseMoney(pp.plannedAmount) ?? 0;
    if (planned <= 0) return;

    const pmKey = `${pp.project}|${expDate.slice(0, 7)}`;
    scheduledPlanByProjectMonth.set(pmKey, (scheduledPlanByProjectMonth.get(pmKey) || 0) + planned);

    if (!matchesSearch(`${pp.planNumber} ${pp.supplierOrPayee} ${pp.project} ${pp.expenseCategory}`)) return;

    projectedLines.push({
      id: `PPL-FC-${pp.id}`,
      referenceNo: pp.planNumber || pp.id,
      expectedDate: expDate,
      direction: "Outflow",
      category: classifyCashOutflowCategory(pp.expenseCategory, pp.notes),
      project: safeString(pp.project, "General"),
      counterparty: safeString(pp.supplierOrPayee, "Planned Supplier"),
      amount: planned,
      sourceType: "Scheduled Supplier Payment",
      confidencePct: 95,
      isOverdue: diffDays(referenceToday, expDate) > 0,
      daysUntilDue: diffDays(expDate, referenceToday),
      status: pp.approvalStatus,
    });
  });

  // 2f) Unpaid Payroll Obligations
  rolePayroll.forEach((pr) => {
    const statusLower = safeString(pr.status).toLowerCase();
    if (statusLower === "paid" || statusLower === "cancelled" || statusLower === "rejected") return;
    if (confirmedPaidPayrollIds.has(pr.id) || coveredDocIds.has(pr.id)) return;
    const proj = safeString(pr.project, "Corporate Payroll");
    if (!matchesFilterProject(proj)) return;
    const net = parseMoney(pr.netSalary) ?? 0;
    if (net <= 0) return;
    const periodStr = safeString(pr.period, referenceToday.slice(0, 7)).slice(0, 7);
    const expDate = `${periodStr}-28`;
    if (!matchesFilterYear(expDate)) return;
    if (!inDateRange(expDate)) return;
    if (!matchesSearch(`${pr.id} ${pr.workerName} ${proj}`)) return;

    totalOutstandingPayables += net;
    projectedLines.push({
      id: `PAY-FC-${pr.id}`,
      referenceNo: pr.id,
      expectedDate: expDate,
      direction: "Outflow",
      category: "Salary and Wages",
      project: proj,
      counterparty: pr.workerName || "Payroll Batch",
      amount: net,
      sourceType: "Payroll Obligation",
      linkedDocumentId: pr.id,
      confidencePct: 100,
      isOverdue: diffDays(referenceToday, expDate) > 0,
      daysUntilDue: diffDays(expDate, referenceToday),
      status: pr.status || "Pending Payroll",
    });
  });

  // 2g) Approved Project Budget Allocations & Planned Expenditures (Gap only — avoids double counting AP/PaymentPlans)
  const approvedPlanIds = new Set(
    (input.projectBudgetPlans || [])
      .filter((bp) => bp.budgetStatus === "Approved" || bp.budgetStatus === "Revised")
      .map((bp) => bp.id)
  );

  // Sum existing projected outflows per project-month so budget allocations only add remaining unplanned headroom
  const existingOutflowByProjMonth = new Map<string, number>();
  projectedLines
    .filter((l) => l.direction === "Outflow")
    .forEach((l) => {
      const k = `${l.project}|${l.expectedDate.slice(0, 7)}`;
      existingOutflowByProjMonth.set(k, (existingOutflowByProjMonth.get(k) || 0) + l.amount);
    });

  (input.budgetAllocations || []).forEach((alloc) => {
    if (alloc.approvalStatus !== "Approved") return;
    if (!approvedPlanIds.has(alloc.projectBudgetPlanId)) return;
    if (!scopeMatchesProject(alloc.projectName) || !matchesFilterProject(alloc.projectName)) return;
    const expDate = `${safeString(alloc.budgetMonth, referenceToday.slice(0, 7)).slice(0, 7)}-28`;
    if (!matchesFilterYear(expDate, alloc.budgetYear)) return;
    if (!inDateRange(expDate) || expDate < referenceToday) return; // Forward planned expenditure only

    const allocAmt = parseMoney(alloc.allocatedAmount) ?? 0;
    const pmKey = `${alloc.projectName}|${expDate.slice(0, 7)}`;
    const alreadyScheduled = existingOutflowByProjMonth.get(pmKey) || 0;
    const incrementalGap = Math.max(0, allocAmt - alreadyScheduled);
    if (incrementalGap <= 0) return;

    existingOutflowByProjMonth.set(pmKey, alreadyScheduled + incrementalGap);
    if (!matchesSearch(`${alloc.allocationId} ${alloc.projectName} ${alloc.budgetCategory}`)) return;

    projectedLines.push({
      id: `BGT-FC-${alloc.id}`,
      referenceNo: alloc.allocationId || alloc.id,
      expectedDate: expDate,
      direction: "Outflow",
      category: classifyCashOutflowCategory(alloc.budgetCategory),
      project: alloc.projectName,
      counterparty: `Budgeted: ${alloc.budgetCategory}`,
      amount: incrementalGap,
      sourceType: "Approved Project Budget",
      linkedDocumentId: alloc.id,
      confidencePct: 85,
      isOverdue: false,
      daysUntilDue: diffDays(expDate, referenceToday),
      status: "Approved Allocation",
    });
  });

  // Also include Monthly Financial Targets (Planned Project Expenditure / Collection) only when no project allocations/plans already cover that project-month
  const coveredInflowProjMonth = new Set(
    projectedLines
      .filter((l) => l.direction === "Inflow")
      .map((l) => `${l.project}|${l.expectedDate.slice(0, 7)}`)
  );
  (input.financialTargets || []).forEach((tgt) => {
    if (!scopeMatchesProject(tgt.project) || !matchesFilterProject(tgt.project)) return;
    const monthStr = safeString(tgt.period).slice(0, 7);
    if (!monthStr) return;
    const expDate = `${monthStr}-20`;
    if (!matchesFilterYear(expDate)) return;
    if (!inDateRange(expDate)) return;
    const pmKey = `${tgt.project}|${monthStr}`;

    const plannedCol = parseMoney(tgt.plannedCollection) ?? 0;
    if (plannedCol > 0 && !coveredInflowProjMonth.has(pmKey)) {
      coveredInflowProjMonth.add(pmKey);
      projectedLines.push({
        id: `TGT-IN-${tgt.id}`,
        referenceNo: `TGT-${monthStr}`,
        expectedDate: expDate,
        direction: "Inflow",
        category: classifyCashInflowCategory(tgt.category),
        project: tgt.project,
        counterparty: `${tgt.project} Target Collection`,
        amount: plannedCol,
        sourceType: "Expected Client Collection",
        confidencePct: 80,
        isOverdue: diffDays(referenceToday, expDate) > 0,
        daysUntilDue: diffDays(expDate, referenceToday),
        status: "Planned Target",
      });
    }

    const plannedPay = parseMoney(tgt.plannedPayment) ?? 0;
    if (plannedPay > 0 && !existingOutflowByProjMonth.has(pmKey) && !scheduledPlanByProjectMonth.has(pmKey)) {
      existingOutflowByProjMonth.set(pmKey, plannedPay);
      projectedLines.push({
        id: `TGT-OUT-${tgt.id}`,
        referenceNo: `TGT-${monthStr}`,
        expectedDate: expDate,
        direction: "Outflow",
        category: classifyCashOutflowCategory(tgt.category),
        project: tgt.project,
        counterparty: `${tgt.project} Planned Expenditure`,
        amount: plannedPay,
        sourceType: "Planned Project Expenditure",
        confidencePct: 80,
        isOverdue: diffDays(referenceToday, expDate) > 0,
        daysUntilDue: diffDays(expDate, referenceToday),
        status: "Planned Target",
      });
    }
  });

  projectedLines.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

  const totalExpectedInflows = projectedLines
    .filter((l) => l.direction === "Inflow")
    .reduce((s, l) => s + l.amount, 0);
  const totalExpectedOutflows = projectedLines
    .filter((l) => l.direction === "Outflow")
    .reduce((s, l) => s + l.amount, 0);
  const forecastNetCashFlow = totalExpectedInflows - totalExpectedOutflows;

  // Category Breakdowns
  const inflowCategoryTotals = CASH_INFLOW_CATEGORIES.map((category) => ({
    category,
    actual: filteredActualEntries
      .filter((e) => e.direction === "Inflow" && e.category === category)
      .reduce((s, e) => s + e.amount, 0),
    forecast: projectedLines
      .filter((l) => l.direction === "Inflow" && l.category === category)
      .reduce((s, l) => s + l.amount, 0),
  }));

  const outflowCategoryTotals = CASH_OUTFLOW_CATEGORIES.map((category) => ({
    category,
    actual: filteredActualEntries
      .filter((e) => e.direction === "Outflow" && e.category === category)
      .reduce((s, e) => s + e.amount, 0),
    forecast: projectedLines
      .filter((l) => l.direction === "Outflow" && l.category === category)
      .reduce((s, l) => s + l.amount, 0),
  }));

  // =========================================================================
  // 3. CHRONOLOGICAL PERIOD SERIES (Opening + Net = Closing Cash Balance)
  //    Back-compute exact openingBalance at windowStart using availableCashBalance
  //    minus net confirmed movements >= windowStart up to referenceToday.
  // =========================================================================
  const postWindowStartConfirmedNet = allConfirmedEntriesForBalance
    .filter((e) => matchesFilterProject(e.project) && e.date >= windowStart && e.date <= referenceToday)
    .reduce((s, e) => s + (e.direction === "Inflow" ? e.amount : -e.amount), 0);

  const windowOpeningCashBalance = availableCashBalance - postWindowStartConfirmedNet;

  const bucketKeysSet = new Set<string>(
    generateHorizonBucketKeys(windowStart, windowEnd, f.granularity)
  );
  filteredActualEntries.forEach((e) => bucketKeysSet.add(getBucketKey(e.date, f.granularity)));
  projectedLines.forEach((l) => bucketKeysSet.add(getBucketKey(l.expectedDate, f.granularity)));
  const bucketKeys = Array.from(bucketKeysSet).sort();

  const currentBucketKey = getBucketKey(referenceToday, f.granularity);

  let runningActualBalance = windowOpeningCashBalance;
  let runningProjectedBalance = windowOpeningCashBalance;
  const shortageItems: CashFlowShortageItem[] = [];

  const periodSeries: CashFlowPeriodRow[] = bucketKeys.map((bk) => {
    const isFuturePeriod = bk > currentBucketKey;
    const periodActualIn = filteredActualEntries
      .filter((e) => e.direction === "Inflow" && getBucketKey(e.date, f.granularity) === bk)
      .reduce((s, e) => s + e.amount, 0);
    const periodActualOut = filteredActualEntries
      .filter((e) => e.direction === "Outflow" && getBucketKey(e.date, f.granularity) === bk)
      .reduce((s, e) => s + e.amount, 0);
    const periodActualNet = periodActualIn - periodActualOut;

    const periodForecastIn = projectedLines
      .filter((l) => l.direction === "Inflow" && getBucketKey(l.expectedDate, f.granularity) === bk)
      .reduce((s, l) => s + l.amount, 0);
    const periodForecastOut = projectedLines
      .filter((l) => l.direction === "Outflow" && getBucketKey(l.expectedDate, f.granularity) === bk)
      .reduce((s, l) => s + l.amount, 0);
    const periodForecastNet = periodForecastIn - periodForecastOut;

    const openingBalance = runningProjectedBalance;
    const closingActual = runningActualBalance + periodActualNet;

    // For completed historical periods, closing follows actuals; for current/future periods, roll expected remaining forecast!
    const periodNetForProjection =
      bk < currentBucketKey
        ? periodActualNet
        : bk === currentBucketKey
        ? periodActualNet + periodForecastNet
        : periodForecastNet;
    const projectedClosingBalance = openingBalance + periodNetForProjection;

    runningActualBalance = closingActual;
    runningProjectedBalance = projectedClosingBalance;

    const shortageAmount =
      projectedClosingBalance < minimumBufferThreshold
        ? Math.max(0, minimumBufferThreshold - projectedClosingBalance)
        : 0;
    const isShortage = projectedClosingBalance < 0 || shortageAmount > 0;

    if ((bk >= currentBucketKey) && isShortage) {
      const isNegative = projectedClosingBalance < 0;
      shortageItems.push({
        id: `SHORT-${bk}`,
        periodKey: bk,
        project: f.project === "ALL" ? "All Projects" : f.project,
        accountName:
          f.bankAccountId === "ALL"
            ? "Consolidated Cash & Bank"
            : scopedAccounts[0]?.accountName || "Selected Account",
        projectedOpeningBalance: openingBalance,
        expectedInflows: periodForecastIn,
        expectedOutflows: periodForecastOut,
        projectedClosingBalance,
        requiredBufferThreshold: minimumBufferThreshold,
        shortageAmount: isNegative ? Math.abs(projectedClosingBalance) : shortageAmount,
        severity: isNegative ? "CRITICAL" : "WARNING",
        recommendedAction: isNegative
          ? "Accelerate AR collections, defer non-critical supplier outflows, or arrange short-term credit facility."
          : "Projected balance dips below minimum cash buffer. Prioritize overdue receivable follow-ups.",
        recommendedActionAm: isNegative
          ? "የደንበኞችን ተሰብሳቢ ገንዘብ ማሰባሰብን ያፋጥኑ ወይም አስቸኳይ ያልሆኑ ክፍያዎችን ያሸጋግሩ።"
          : "የሚጠበቀው ቀሪ ገንዘብ ከዝቅተኛው የመጠባበቂያ ገደብ በታች ይወርዳል፤ ክትትል ያድርጉ።",
      });
    }

    return {
      periodKey: bk,
      periodLabel: bk,
      openingBalance,
      actualInflow: periodActualIn,
      actualOutflow: periodActualOut,
      actualNetCashFlow: periodActualNet,
      forecastInflow: periodForecastIn,
      forecastOutflow: periodForecastOut,
      forecastNetCashFlow: periodForecastNet,
      cashFlowVariance: periodActualNet - periodForecastNet,
      closingBalance: closingActual,
      projectedClosingBalance,
      minimumThreshold: minimumBufferThreshold,
      shortageAmount,
      isShortage,
      isFuturePeriod,
    };
  });

  // =========================================================================
  // 4. CHART DATASETS (5 REQUIRED INTERACTIVE CHARTS)
  // =========================================================================
  const monthlyBucketKeys = Array.from(
    new Set([
      ...generateHorizonBucketKeys(windowStart, windowEnd, "Monthly"),
      ...filteredActualEntries.map((e) => e.date.slice(0, 7)),
      ...projectedLines.map((l) => l.expectedDate.slice(0, 7)),
    ])
  ).sort();

  const monthlyInflowVsOutflow = monthlyBucketKeys.map((mk) => {
    const actualIn = filteredActualEntries
      .filter((e) => e.direction === "Inflow" && e.date.startsWith(mk))
      .reduce((s, e) => s + e.amount, 0);
    const actualOut = filteredActualEntries
      .filter((e) => e.direction === "Outflow" && e.date.startsWith(mk))
      .reduce((s, e) => s + e.amount, 0);
    return {
      label: mk,
      actualInflow: actualIn,
      actualOutflow: actualOut,
      netCashFlow: actualIn - actualOut,
    };
  });

  const actualVsForecastCashFlow = periodSeries.map((p) => ({
    label: p.periodLabel,
    actualNetCashFlow: p.actualNetCashFlow,
    forecastNetCashFlow: p.forecastNetCashFlow,
    variance: p.cashFlowVariance,
  }));

  const projMap = new Map<
    string,
    { project: string; actualInflow: number; actualOutflow: number; netCashFlow: number; expectedInflow: number; expectedOutflow: number }
  >();
  filteredActualEntries.forEach((e) => {
    const k = e.project || "General";
    const row = projMap.get(k) || {
      project: k,
      actualInflow: 0,
      actualOutflow: 0,
      netCashFlow: 0,
      expectedInflow: 0,
      expectedOutflow: 0,
    };
    if (e.direction === "Inflow") row.actualInflow += e.amount;
    else row.actualOutflow += e.amount;
    row.netCashFlow = row.actualInflow - row.actualOutflow;
    projMap.set(k, row);
  });
  projectedLines.forEach((l) => {
    const k = l.project || "General";
    const row = projMap.get(k) || {
      project: k,
      actualInflow: 0,
      actualOutflow: 0,
      netCashFlow: 0,
      expectedInflow: 0,
      expectedOutflow: 0,
    };
    if (l.direction === "Inflow") row.expectedInflow += l.amount;
    else row.expectedOutflow += l.amount;
    projMap.set(k, row);
  });
  const projectCashFlow = Array.from(projMap.values()).sort(
    (a, b) => Math.abs(b.netCashFlow) - Math.abs(a.netCashFlow)
  );

  const bankBalances = scopedAccounts.map((a) => ({
    accountId: a.id,
    accountName: a.accountName,
    accountType: a.accountType,
    currentBalance: parseMoney(a.currentBalance) ?? 0,
    minimumThreshold: parseMoney(a.minimumThreshold) ?? 0,
    isBelowThreshold: (parseMoney(a.currentBalance) ?? 0) < (parseMoney(a.minimumThreshold) ?? 0),
  }));

  const monthlyClosingBalance = periodSeries.map((p) => ({
    label: p.periodLabel,
    closingBalance: p.closingBalance,
    projectedClosingBalance: p.projectedClosingBalance,
    threshold: p.minimumThreshold,
  }));

  // =========================================================================
  // 5. KPI SUMMARY & AUTOMATED CASH FLOW ALERTS
  // =========================================================================
  const netCashPosition = availableCashBalance + totalExpectedInflows - totalExpectedOutflows;
  const forecastCashShortage = shortageItems.reduce(
    (max, item) => Math.max(max, item.shortageAmount),
    0
  );
  const closingCashBalance =
    periodSeries.length > 0 ? periodSeries[periodSeries.length - 1].closingBalance : availableCashBalance;
  const projectedClosingBalance =
    periodSeries.length > 0 ? periodSeries[periodSeries.length - 1].projectedClosingBalance : netCashPosition;

  const alerts: Part5CashFlowAlert[] = [];

  if (availableCashBalance < minimumBufferThreshold) {
    alerts.push({
      id: "CF-INSUFFICIENT-CASH",
      severity: availableCashBalance <= 0 ? "CRITICAL" : "WARNING",
      type: "Insufficient Cash",
      title: `Available Cash Below Liquidity Buffer (${currency} ${availableCashBalance.toLocaleString()})`,
      titleAm: `ያለው ጥሬ ገንዘብ ከዝቅተኛው የመጠባበቂያ ገደብ በታች ነው (${currency} ${availableCashBalance.toLocaleString()})`,
      description: `Current cash & bank balance is below minimum buffer (${currency} ${minimumBufferThreshold.toLocaleString()}).`,
      descriptionAm: `የአሁኑ የጥሬ ገንዘብና የባንክ ቀሪ ከዝቅተኛው ገደብ (${currency} ${minimumBufferThreshold.toLocaleString()}) በታች ወርዷል።`,
      amount: Math.max(0, minimumBufferThreshold - availableCashBalance),
      moduleTarget: "cash-and-bank",
    });
  }

  if (shortageItems.length > 0) {
    const worst = shortageItems.reduce((a, b) => (b.shortageAmount > a.shortageAmount ? b : a), shortageItems[0]);
    alerts.push({
      id: `CF-SHORTAGE-${worst.periodKey}`,
      severity: worst.severity,
      type: "Forecast Cash Shortage",
      title: `Projected Cash Shortage in ${worst.periodKey} (${currency} ${worst.shortageAmount.toLocaleString()})`,
      titleAm: `በ ${worst.periodKey} የሚጠበቅ የጥሬ ገንዘብ እጥረት (${currency} ${worst.shortageAmount.toLocaleString()})`,
      description: worst.recommendedAction,
      descriptionAm: worst.recommendedActionAm,
      project: worst.project,
      amount: worst.shortageAmount,
      moduleTarget: "cash-flow",
    });
  }

  if (totalOverdueReceivables > 0) {
    alerts.push({
      id: "CF-OVERDUE-COLLECTIONS",
      severity: totalOverdueReceivables > availableCashBalance ? "CRITICAL" : "WARNING",
      type: "Overdue Collection",
      title: `Overdue Client Collections Impacting Cash Flow (${currency} ${totalOverdueReceivables.toLocaleString()})`,
      titleAm: `ጊዜው ያለፈባቸው የደንበኞች ክፍያዎች (${currency} ${totalOverdueReceivables.toLocaleString()})`,
      description: `Uncollected past-due receivables require immediate collection follow-up to protect cash flow.`,
      descriptionAm: `ጊዜው ያለፈባቸው ያልተሰበሰቡ ገቢዎች በአስቸኳይ ክትትል ያስፈልጋቸዋል።`,
      amount: totalOverdueReceivables,
      moduleTarget: "accounts-receivable",
    });
  }

  const next14DaysObligations = projectedLines
    .filter((l) => l.direction === "Outflow" && l.daysUntilDue >= 0 && l.daysUntilDue <= 14)
    .reduce((s, l) => s + l.amount, 0);

  if (next14DaysObligations > 0) {
    alerts.push({
      id: "CF-UPCOMING-PAYMENTS-14D",
      severity: next14DaysObligations > availableCashBalance ? "CRITICAL" : "WARNING",
      type: "Upcoming Obligation",
      title: `Upcoming 14-Day Payment Obligations (${currency} ${next14DaysObligations.toLocaleString()})`,
      titleAm: `በሚቀጥሉት 14 ቀናት ውስጥ የሚከፈሉ ክፍያዎች (${currency} ${next14DaysObligations.toLocaleString()})`,
      description:
        next14DaysObligations > availableCashBalance
          ? `14-day obligations exceed current cash balance (${currency} ${availableCashBalance.toLocaleString()}).`
          : `Scheduled supplier, subcontractor, and payroll obligations due within 14 days.`,
      descriptionAm:
        next14DaysObligations > availableCashBalance
          ? `በ14 ቀናት ውስጥ የሚከፈሉ ግዴታዎች አሁን ካለው ጥሬ ገንዘብ ይበልጣሉ።`
          : `በሚቀጥሉት 14 ቀናት ውስጥ የታቀዱ የአቅራቢና የደሞዝ ክፍያዎች አሉ።`,
      amount: next14DaysObligations,
      moduleTarget: "cash-payment",
    });
  }

  roleReconciliations
    .filter((r) => Math.abs(r.discrepancyAmount) > 0.01 || r.approvalStatus === "Disputed")
    .forEach((rec) => {
      alerts.push({
        id: `CF-BANK-REC-${rec.id}`,
        severity: rec.approvalStatus === "Disputed" ? "CRITICAL" : "WARNING",
        type: "Bank Reconciliation Discrepancy",
        title: `Bank Reconciliation Variance on ${rec.accountName} (${currency} ${Math.abs(rec.discrepancyAmount).toLocaleString()})`,
        titleAm: `በባንክ ሂሳብ ማመሳከሪያ ላይ ልዩነት ተገኝቷል: ${rec.accountName}`,
        description: `Statement ${rec.reconciliationNo} (${rec.periodStart} → ${rec.periodEnd}) shows statement vs book variance.`,
        descriptionAm: `የባንክ መግለጫ ${rec.reconciliationNo} ከሲስተም ቀሪ ጋር ልዩነት አሳይቷል።`,
        amount: Math.abs(rec.discrepancyAmount),
        moduleTarget: "cash-and-bank",
      });
    });

  return {
    permissions,
    referenceToday,
    currency,
    settings,
    assignedProjects,
    filterOptions: {
      projects: Array.from(projectSet).sort(),
      financialYears: Array.from(yearSet).sort().reverse(),
      accounts: roleAccounts,
    },
    kpis: {
      availableCashBalance,
      totalBankBalance,
      totalPettyCashBalance,
      actualCashInflow,
      actualCashOutflow,
      actualNetCashFlow,
      totalExpectedInflows,
      totalExpectedOutflows,
      forecastNetCashFlow,
      projectedClosingBalance,
      netCashPosition,
      forecastCashShortage,
      outstandingReceivables: totalOutstandingReceivables,
      overdueReceivables: totalOverdueReceivables,
      upcomingPayables: totalOutstandingPayables,
      overduePayables: totalOverduePayables,
      cashFlowVariance: actualNetCashFlow - forecastNetCashFlow,
      openingCashBalance: windowOpeningCashBalance,
      closingCashBalance,
      minimumBufferThreshold,
    },
    actualEntries: filteredActualEntries,
    inflowCategoryTotals,
    outflowCategoryTotals,
    projectedLines,
    explicitForecastItems: roleExplicitForecasts,
    periodSeries,
    charts: {
      monthlyInflowVsOutflow,
      actualVsForecastCashFlow,
      projectCashFlow,
      bankBalances,
      monthlyClosingBalance,
    },
    scopedAccounts,
    scopedCashTransactions: roleCashTxs,
    scopedReconciliations: roleReconciliations,
    shortageItems,
    alerts,
  };
}

// ============================================================================
// EXPLICIT FORECAST CRUD & APPROVAL WORKFLOWS
// ============================================================================

export async function createCashFlowForecastItem(params: {
  direction: "Inflow" | "Outflow";
  category: CashInflowCategory | CashOutflowCategory;
  project: string;
  accountId?: string;
  accountName?: string;
  expectedDate: string;
  amount: number;
  counterparty: string;
  sourceType: CashFlowForecastSource;
  probabilityPct?: number;
  linkedDocumentId?: string;
  linkedReferenceNo?: string;
  notes?: string;
  submitForApproval?: boolean;
  existingForecasts?: CashFlowForecastItem[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashFlowForecastItem> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.canManageBudgets && !perms.isDirector) {
    throw new Error("Role does not have permission to create cash flow forecasts.");
  }
  if (!safeString(params.project).trim()) throw new Error("Project is required.");
  if (!safeString(params.expectedDate).trim()) throw new Error("Expected Date is required.");
  if (!safeString(params.counterparty).trim()) throw new Error("Counterparty is required.");
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("Forecast Amount must be greater than zero.");
  }

  // Prevent duplicate forecast for same linked reference/date/counterparty
  if (params.linkedReferenceNo) {
    const dup = (params.existingForecasts || []).find(
      (f) =>
        f.approvalStatus !== "Rejected" &&
        safeString(f.linkedReferenceNo).toLowerCase() === safeString(params.linkedReferenceNo).toLowerCase() &&
        f.expectedDate === params.expectedDate
    );
    if (dup) {
      throw new Error(`Duplicate forecast already exists for reference "${params.linkedReferenceNo}" (${dup.forecastRef}).`);
    }
  }

  const nowIso = new Date().toISOString();
  const forecastRef = generateCashFlowRef("CFF");
  const canAutoApprove = perms.canApproveTransactions || perms.isFinanceManager || perms.isDirector;
  const approvalStatus: CashFlowForecastStatus = params.submitForApproval
    ? canAutoApprove
      ? "Approved"
      : "Submitted"
    : "Draft";

  const record: CashFlowForecastItem = {
    id: `CFF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    forecastRef,
    direction: params.direction,
    category: params.category,
    project: safeString(params.project),
    accountId: params.accountId,
    accountName: params.accountName,
    expectedDate: params.expectedDate.slice(0, 10),
    financialYear: params.expectedDate.slice(0, 4),
    amount: Number(params.amount.toFixed(2)),
    currency: "ETB",
    counterparty: safeString(params.counterparty),
    sourceType: params.sourceType,
    linkedDocumentId: params.linkedDocumentId,
    linkedReferenceNo: params.linkedReferenceNo,
    probabilityPct: Math.min(100, Math.max(10, Number(params.probabilityPct ?? 90))),
    approvalStatus,
    notes: safeString(params.notes),
    preparedBy: params.actorName,
    approvedBy: approvalStatus === "Approved" ? params.actorName : undefined,
    approvedAt: approvalStatus === "Approved" ? nowIso : undefined,
    auditHistory: [
      {
        timestamp: nowIso,
        action: `Created Cash Flow Forecast (${approvalStatus})`,
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `${params.direction} ${params.category}: ETB ${params.amount.toLocaleString()} for ${params.project}`,
      },
    ],
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveCashFlowForecastItem(record);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Create Cash Flow Forecast",
    category: "Finance",
    severity: "INFO",
    details: `${forecastRef} (${record.direction} · ${record.category}) ETB ${record.amount.toLocaleString()} on ${record.expectedDate} [${approvalStatus}].`,
  });

  return record;
}

export async function advanceCashFlowForecastStatus(params: {
  item: CashFlowForecastItem;
  nextStatus: CashFlowForecastStatus;
  reason?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashFlowForecastItem> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (
    (params.nextStatus === "Approved" || params.nextStatus === "Rejected") &&
    !perms.canApproveTransactions &&
    !perms.isFinanceManager &&
    !perms.isDirector
  ) {
    throw new Error("Only Finance Manager or Director can approve or reject cash flow forecasts.");
  }

  const nowIso = new Date().toISOString();
  const auditEntry: CashFlowAuditEntry = {
    timestamp: nowIso,
    action: `Forecast ${params.nextStatus}`,
    actorName: params.actorName,
    actorRole: params.actorRole,
    notes: params.reason || `Forecast transitioned to ${params.nextStatus}.`,
  };

  const updated: CashFlowForecastItem = {
    ...params.item,
    approvalStatus: params.nextStatus,
    approvedBy: params.nextStatus === "Approved" ? params.actorName : params.item.approvedBy,
    approvedAt: params.nextStatus === "Approved" ? nowIso : params.item.approvedAt,
    rejectedReason: params.nextStatus === "Rejected" ? safeString(params.reason, "Rejected") : params.item.rejectedReason,
    auditHistory: [...(params.item.auditHistory || []), auditEntry],
    updatedAt: nowIso,
  };

  await DbService.saveCashFlowForecastItem(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Cash Forecast ${params.nextStatus}`,
    category: "Finance",
    severity: params.nextStatus === "Rejected" ? "WARNING" : "INFO",
    details: `${updated.forecastRef} marked ${params.nextStatus} by ${params.actorName}.`,
  });

  return updated;
}

// ============================================================================
// BANK RECONCILIATION COMPUTATION & WORKFLOW
// ============================================================================

export interface BankReconciliationComputation {
  accountCashTxs: CashTransactionRecord[];
  matchedTxIds: string[];
  bookOpeningBalance: number;
  bookInflows: number;
  bookOutflows: number;
  bookClosingBalance: number;
  reconciledInflowsTotal: number;
  reconciledOutflowsTotal: number;
  unreconciledBookCount: number;
  unreconciledBookNet: number;
  unmatchedStatementNet: number;
  discrepancyAmount: number;
  reconciledStatementLines: BankStatementLineItem[];
}

export function computeBankReconciliationSummary(params: {
  account: FinancialAccount;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  cashTransactions: CashTransactionRecord[];
  manualMatchedTxIds?: string[];
  statementLines?: BankStatementLineItem[];
  referenceToday?: string;
}): BankReconciliationComputation {
  const { account, periodStart, periodEnd } = params;
  const refToday = safeString(params.referenceToday, toIsoDate(new Date())).slice(0, 10);

  // Gather confirmed cash transactions affecting this bank/cash account
  const confirmedForAccount = (params.cashTransactions || []).filter(
    (tx) =>
      isConfirmedCashStatus(tx.status) &&
      !isReversedOrRejectedStatus(tx.status) &&
      (tx.accountId === account.id || (tx.type === "Transfer" && tx.toAccountId === account.id))
  );

  const inPeriodTxs = confirmedForAccount
    .filter((tx) => tx.date >= periodStart && tx.date <= periodEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  const txSignedDelta = (tx: CashTransactionRecord) => {
    const amt = parseMoney(tx.amount) ?? 0;
    if (tx.type === "Collection") return amt;
    if (tx.type === "Payment") return -amt;
    // Transfer
    return tx.toAccountId === account.id ? amt : -amt;
  };

  // Back-calculate exact bookClosingBalance at periodEnd from live account.currentBalance
  const netAfterPeriodEnd = confirmedForAccount
    .filter((tx) => tx.date > periodEnd && tx.date <= refToday)
    .reduce((s, tx) => s + txSignedDelta(tx), 0);

  const bookClosingBalance = (parseMoney(account.currentBalance) ?? 0) - netAfterPeriodEnd;
  const bookInflows = inPeriodTxs
    .filter((tx) => txSignedDelta(tx) > 0)
    .reduce((s, tx) => s + Math.abs(txSignedDelta(tx)), 0);
  const bookOutflows = inPeriodTxs
    .filter((tx) => txSignedDelta(tx) < 0)
    .reduce((s, tx) => s + Math.abs(txSignedDelta(tx)), 0);
  const bookOpeningBalance = bookClosingBalance - (bookInflows - bookOutflows);

  // Auto-match statement lines with in-period book transactions by Bank Reference or Reference No or exact Amount & Direction
  const matchedSet = new Set<string>(params.manualMatchedTxIds || []);
  const reconciledStatementLines: BankStatementLineItem[] = (params.statementLines || []).map((line) => {
    if (line.matchedCashTxId && inPeriodTxs.some((tx) => tx.id === line.matchedCashTxId)) {
      matchedSet.add(line.matchedCashTxId);
      return { ...line, matchStatus: "Matched" };
    }
    const lineRefLower = safeString(line.bankReferenceNo).trim().toLowerCase();
    const match = inPeriodTxs.find((tx) => {
      if (matchedSet.has(tx.id)) return false;
      const delta = txSignedDelta(tx);
      const isCredit = delta > 0;
      if ((line.direction === "Credit") !== isCredit) return false;
      if (Math.abs(Math.abs(delta) - line.amount) > 0.01) return false;
      const txBankRef = safeString(tx.bankReferenceNumber).trim().toLowerCase();
      const txRef = safeString(tx.referenceNo).trim().toLowerCase();
      if (lineRefLower && (lineRefLower === txBankRef || lineRefLower === txRef)) return true;
      return diffDays(line.statementDate, tx.date) >= -3 && diffDays(line.statementDate, tx.date) <= 3;
    });

    if (match) {
      matchedSet.add(match.id);
      return {
        ...line,
        matchedCashTxId: match.id,
        matchedCashTxRef: match.referenceNo,
        matchStatus: "Matched",
      };
    }
    return { ...line, matchStatus: "Unmatched" };
  });

  const matchedTxs = inPeriodTxs.filter((tx) => matchedSet.has(tx.id));
  const unmatchedTxs = inPeriodTxs.filter((tx) => !matchedSet.has(tx.id));

  const reconciledInflowsTotal = matchedTxs
    .filter((tx) => txSignedDelta(tx) > 0)
    .reduce((s, tx) => s + Math.abs(txSignedDelta(tx)), 0);
  const reconciledOutflowsTotal = matchedTxs
    .filter((tx) => txSignedDelta(tx) < 0)
    .reduce((s, tx) => s + Math.abs(txSignedDelta(tx)), 0);

  const unreconciledBookNet = unmatchedTxs.reduce((s, tx) => s + txSignedDelta(tx), 0);
  const unmatchedStatementNet = reconciledStatementLines
    .filter((l) => l.matchStatus === "Unmatched")
    .reduce((s, l) => s + (l.direction === "Credit" ? l.amount : -l.amount), 0);

  const discrepancyAmount = Number((params.statementClosingBalance - bookClosingBalance).toFixed(2));

  return {
    accountCashTxs: inPeriodTxs,
    matchedTxIds: Array.from(matchedSet),
    bookOpeningBalance: Number(bookOpeningBalance.toFixed(2)),
    bookInflows: Number(bookInflows.toFixed(2)),
    bookOutflows: Number(bookOutflows.toFixed(2)),
    bookClosingBalance: Number(bookClosingBalance.toFixed(2)),
    reconciledInflowsTotal: Number(reconciledInflowsTotal.toFixed(2)),
    reconciledOutflowsTotal: Number(reconciledOutflowsTotal.toFixed(2)),
    unreconciledBookCount: unmatchedTxs.length,
    unreconciledBookNet: Number(unreconciledBookNet.toFixed(2)),
    unmatchedStatementNet: Number(unmatchedStatementNet.toFixed(2)),
    discrepancyAmount,
    reconciledStatementLines,
  };
}

export async function createOrSaveBankReconciliation(params: {
  account: FinancialAccount;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  cashTransactions: CashTransactionRecord[];
  manualMatchedTxIds?: string[];
  statementLines?: BankStatementLineItem[];
  notes?: string;
  submitForSignoff?: boolean;
  existingReconciliations?: BankReconciliationRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BankReconciliationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageAccounts && !perms.canManageTransactions && !perms.isDirector) {
    throw new Error("Role does not have permission to create bank reconciliations.");
  }
  if (params.periodStart > params.periodEnd) {
    throw new Error("Period Start Date cannot be after Period End Date.");
  }

  // Prevent duplicate reconciled statement for exact same account & overlapping period
  const duplicate = (params.existingReconciliations || []).find(
    (r) =>
      r.accountId === params.account.id &&
      r.periodStart === params.periodStart &&
      r.periodEnd === params.periodEnd &&
      r.approvalStatus === "Reconciled"
  );
  if (duplicate) {
    throw new Error(
      `A finalized Bank Reconciliation (${duplicate.reconciliationNo}) already exists for ${params.account.accountName} (${params.periodStart} → ${params.periodEnd}).`
    );
  }

  const computed = computeBankReconciliationSummary({
    account: params.account,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    statementOpeningBalance: params.statementOpeningBalance,
    statementClosingBalance: params.statementClosingBalance,
    cashTransactions: params.cashTransactions,
    manualMatchedTxIds: params.manualMatchedTxIds,
    statementLines: params.statementLines,
  });

  const nowIso = new Date().toISOString();
  const canAutoFinalize = perms.canApproveTransactions || perms.isFinanceManager || perms.isDirector;
  let approvalStatus: BankReconciliationStatus = "Draft";
  if (params.submitForSignoff) {
    if (Math.abs(computed.discrepancyAmount) > 0.01) {
      approvalStatus = "Disputed";
    } else {
      approvalStatus = canAutoFinalize ? "Reconciled" : "Submitted";
    }
  }

  const record: BankReconciliationRecord = {
    id: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reconciliationNo: generateCashFlowRef("REC"),
    accountId: params.account.id,
    accountName: params.account.accountName,
    accountCode: params.account.accountCode,
    bankName: params.account.bankName,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    statementOpeningBalance: params.statementOpeningBalance,
    statementClosingBalance: params.statementClosingBalance,
    bookOpeningBalance: computed.bookOpeningBalance,
    bookClosingBalance: computed.bookClosingBalance,
    reconciledInflowsTotal: computed.reconciledInflowsTotal,
    reconciledOutflowsTotal: computed.reconciledOutflowsTotal,
    unreconciledBookCount: computed.unreconciledBookCount,
    unreconciledBookNet: computed.unreconciledBookNet,
    unmatchedStatementNet: computed.unmatchedStatementNet,
    discrepancyAmount: computed.discrepancyAmount,
    reconciledTxIds: computed.matchedTxIds,
    statementLines: computed.reconciledStatementLines,
    approvalStatus,
    preparedBy: params.actorName,
    approvedBy: approvalStatus === "Reconciled" ? params.actorName : undefined,
    approvedAt: approvalStatus === "Reconciled" ? nowIso : undefined,
    notes: safeString(params.notes),
    auditHistory: [
      {
        timestamp: nowIso,
        action: `Created Bank Reconciliation (${approvalStatus})`,
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `Statement Closing: ETB ${params.statementClosingBalance.toLocaleString()} vs Book Closing: ETB ${computed.bookClosingBalance.toLocaleString()} (Variance: ETB ${computed.discrepancyAmount.toLocaleString()}).`,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveBankReconciliation(record);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Statement Reconciliation",
    category: "Finance",
    severity: approvalStatus === "Disputed" ? "WARNING" : "INFO",
    details: `${record.reconciliationNo} on ${record.accountName} (${record.periodStart} → ${record.periodEnd}): ${approvalStatus}, Discrepancy ETB ${record.discrepancyAmount.toLocaleString()}.`,
  });

  return record;
}

export async function advanceBankReconciliationStatus(params: {
  record: BankReconciliationRecord;
  nextStatus: BankReconciliationStatus;
  notes?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BankReconciliationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (
    (params.nextStatus === "Reconciled" || params.nextStatus === "Disputed") &&
    !perms.canApproveTransactions &&
    !perms.isFinanceManager &&
    !perms.isDirector
  ) {
    throw new Error("Only Finance Manager or Director can sign off or dispute Bank Reconciliations.");
  }

  const nowIso = new Date().toISOString();
  const updated: BankReconciliationRecord = {
    ...params.record,
    approvalStatus: params.nextStatus,
    approvedBy: params.nextStatus === "Reconciled" ? params.actorName : params.record.approvedBy,
    approvedAt: params.nextStatus === "Reconciled" ? nowIso : params.record.approvedAt,
    notes: params.notes ? `${params.record.notes ? params.record.notes + " | " : ""}${params.notes}` : params.record.notes,
    auditHistory: [
      ...(params.record.auditHistory || []),
      {
        timestamp: nowIso,
        action: `Reconciliation ${params.nextStatus}`,
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.notes || `Status updated to ${params.nextStatus}.`,
      },
    ],
    updatedAt: nowIso,
  };

  await DbService.saveBankReconciliation(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Bank Reconciliation ${params.nextStatus}`,
    category: "Finance",
    severity: params.nextStatus === "Disputed" ? "WARNING" : "INFO",
    details: `${updated.reconciliationNo} (${updated.accountName}) updated to ${params.nextStatus} by ${params.actorName}.`,
  });

  return updated;
}

// ============================================================================
// PART 5: 7 CASH FLOW & RECONCILIATION REPORT BUILDERS
// ============================================================================

export interface GeneratedCashFlowReportDataset {
  id: CashFlowReportTypeId;
  title: string;
  titleAm: string;
  subtitle: string;
  columns: { key: string; label: string; isNumeric?: boolean }[];
  rows: Record<string, any>[];
  summaryTotals: { label: string; value: number | string }[];
}

export function buildCashFlowReportDataset(
  reportType: CashFlowReportTypeId,
  state: Part5CashFlowState
): GeneratedCashFlowReportDataset {
  const cur = state.currency || "ETB";

  switch (reportType) {
    case "daily-cash-flow": {
      const dailyMap = new Map<
        string,
        { date: string; inflow: number; outflow: number; net: number; txCount: number }
      >();
      state.actualEntries.forEach((e) => {
        const prev = dailyMap.get(e.date) || { date: e.date, inflow: 0, outflow: 0, net: 0, txCount: 0 };
        if (e.direction === "Inflow") prev.inflow += e.amount;
        else prev.outflow += e.amount;
        prev.net = prev.inflow - prev.outflow;
        prev.txCount += 1;
        dailyMap.set(e.date, prev);
      });
      const sortedDates = Array.from(dailyMap.keys()).sort();
      let running = state.kpis.openingCashBalance;
      const rows = sortedDates.map((dt) => {
        const r = dailyMap.get(dt)!;
        const opening = running;
        const closing = opening + r.net;
        running = closing;
        return {
          date: dt,
          txCount: r.txCount,
          openingBalance: opening,
          inflow: r.inflow,
          outflow: r.outflow,
          netCashFlow: r.net,
          closingBalance: closing,
        };
      });
      return {
        id: reportType,
        title: "1. Daily Cash Flow Report",
        titleAm: "1. ዕለታዊ የጥሬ ገንዘብ ፍሰት ሪፖርት",
        subtitle: "Daily verified cash inflows, outflows, net movement, and running cash balance.",
        columns: [
          { key: "date", label: "Date" },
          { key: "txCount", label: "Transactions", isNumeric: true },
          { key: "openingBalance", label: `Opening (${cur})`, isNumeric: true },
          { key: "inflow", label: `Cash Inflow (${cur})`, isNumeric: true },
          { key: "outflow", label: `Cash Outflow (${cur})`, isNumeric: true },
          { key: "netCashFlow", label: `Net Cash Flow (${cur})`, isNumeric: true },
          { key: "closingBalance", label: `Closing Balance (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Actual Inflow", value: state.kpis.actualCashInflow },
          { label: "Total Actual Outflow", value: state.kpis.actualCashOutflow },
          { label: "Net Cash Flow", value: state.kpis.actualNetCashFlow },
        ],
      };
    }

    case "monthly-cash-flow-statement": {
      const monthKeys = Array.from(new Set(state.actualEntries.map((e) => e.date.slice(0, 7)))).sort();
      let running = state.kpis.openingCashBalance;
      const rows = monthKeys.map((mk) => {
        const inflow = state.actualEntries
          .filter((e) => e.direction === "Inflow" && e.date.startsWith(mk))
          .reduce((s, e) => s + e.amount, 0);
        const outflow = state.actualEntries
          .filter((e) => e.direction === "Outflow" && e.date.startsWith(mk))
          .reduce((s, e) => s + e.amount, 0);
        const net = inflow - outflow;
        const opening = running;
        const closing = opening + net;
        running = closing;
        return {
          month: mk,
          openingBalance: opening,
          inflow,
          outflow,
          netCashFlow: net,
          closingBalance: closing,
        };
      });
      return {
        id: reportType,
        title: "2. Monthly Cash Flow Statement",
        titleAm: "2. ወርሃዊ የገንዘብ ፍሰት መግለጫ",
        subtitle: "Monthly statement of verified cash receipts, cash disbursements, and closing liquidity.",
        columns: [
          { key: "month", label: "Month" },
          { key: "openingBalance", label: `Opening Cash (${cur})`, isNumeric: true },
          { key: "inflow", label: `Cash Inflows (${cur})`, isNumeric: true },
          { key: "outflow", label: `Cash Outflows (${cur})`, isNumeric: true },
          { key: "netCashFlow", label: `Net Cash Flow (${cur})`, isNumeric: true },
          { key: "closingBalance", label: `Closing Cash (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Opening Balance", value: state.kpis.openingCashBalance },
          { label: "Net Cash Flow", value: state.kpis.actualNetCashFlow },
          { label: "Available Cash Balance", value: state.kpis.availableCashBalance },
        ],
      };
    }

    case "quarterly-cash-flow": {
      const qKeys = Array.from(
        new Set([
          ...state.actualEntries.map((e) => getBucketKey(e.date, "Quarterly")),
          ...state.projectedLines.map((l) => getBucketKey(l.expectedDate, "Quarterly")),
        ])
      ).sort();
      const rows = qKeys.map((qk) => {
        const actualIn = state.actualEntries
          .filter((e) => e.direction === "Inflow" && getBucketKey(e.date, "Quarterly") === qk)
          .reduce((s, e) => s + e.amount, 0);
        const actualOut = state.actualEntries
          .filter((e) => e.direction === "Outflow" && getBucketKey(e.date, "Quarterly") === qk)
          .reduce((s, e) => s + e.amount, 0);
        const fcIn = state.projectedLines
          .filter((l) => l.direction === "Inflow" && getBucketKey(l.expectedDate, "Quarterly") === qk)
          .reduce((s, l) => s + l.amount, 0);
        const fcOut = state.projectedLines
          .filter((l) => l.direction === "Outflow" && getBucketKey(l.expectedDate, "Quarterly") === qk)
          .reduce((s, l) => s + l.amount, 0);
        const actualNet = actualIn - actualOut;
        const fcNet = fcIn - fcOut;
        return {
          quarter: qk,
          actualInflow: actualIn,
          actualOutflow: actualOut,
          actualNet,
          forecastNet: fcNet,
          variance: actualNet - fcNet,
        };
      });
      return {
        id: reportType,
        title: "3. Quarterly Cash Flow Report",
        titleAm: "3. የሩብ ዓመት የገንዘብ ፍሰት ሪፖርት",
        subtitle: "Quarterly cash inflows, outflows, and actual vs forecast variance across construction quarters.",
        columns: [
          { key: "quarter", label: "Quarter" },
          { key: "actualInflow", label: `Actual Inflow (${cur})`, isNumeric: true },
          { key: "actualOutflow", label: `Actual Outflow (${cur})`, isNumeric: true },
          { key: "actualNet", label: `Actual Net (${cur})`, isNumeric: true },
          { key: "forecastNet", label: `Forecast Net (${cur})`, isNumeric: true },
          { key: "variance", label: `Variance (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Actual Net Cash Flow", value: state.kpis.actualNetCashFlow },
          { label: "Forecast Net Cash Flow", value: state.kpis.forecastNetCashFlow },
          { label: "Cash Flow Variance", value: state.kpis.cashFlowVariance },
        ],
      };
    }

    case "annual-cash-flow": {
      const yKeys = Array.from(
        new Set([
          ...state.actualEntries.map((e) => e.date.slice(0, 4)),
          ...state.projectedLines.map((l) => l.expectedDate.slice(0, 4)),
        ])
      ).sort();
      const rows = yKeys.map((yk) => {
        const actualIn = state.actualEntries
          .filter((e) => e.direction === "Inflow" && e.date.startsWith(yk))
          .reduce((s, e) => s + e.amount, 0);
        const actualOut = state.actualEntries
          .filter((e) => e.direction === "Outflow" && e.date.startsWith(yk))
          .reduce((s, e) => s + e.amount, 0);
        const fcIn = state.projectedLines
          .filter((l) => l.direction === "Inflow" && l.expectedDate.startsWith(yk))
          .reduce((s, l) => s + l.amount, 0);
        const fcOut = state.projectedLines
          .filter((l) => l.direction === "Outflow" && l.expectedDate.startsWith(yk))
          .reduce((s, l) => s + l.amount, 0);
        return {
          year: yk,
          actualInflow: actualIn,
          actualOutflow: actualOut,
          actualNet: actualIn - actualOut,
          expectedInflow: fcIn,
          expectedOutflow: fcOut,
          forecastNet: fcIn - fcOut,
        };
      });
      return {
        id: reportType,
        title: "4. Annual Cash Flow Report",
        titleAm: "4. ዓመታዊ የገንዘብ ፍሰት ሪፖርት",
        subtitle: "Fiscal year cash position summary comparing actual cash flows against projected inflows/outflows.",
        columns: [
          { key: "year", label: "Financial Year" },
          { key: "actualInflow", label: `Actual Inflow (${cur})`, isNumeric: true },
          { key: "actualOutflow", label: `Actual Outflow (${cur})`, isNumeric: true },
          { key: "actualNet", label: `Actual Net (${cur})`, isNumeric: true },
          { key: "expectedInflow", label: `Expected Inflow (${cur})`, isNumeric: true },
          { key: "expectedOutflow", label: `Expected Outflow (${cur})`, isNumeric: true },
          { key: "forecastNet", label: `Projected Net (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Available Cash Balance", value: state.kpis.availableCashBalance },
          { label: "Net Cash Position", value: state.kpis.netCashPosition },
        ],
      };
    }

    case "cash-forecast-report": {
      const rows = state.projectedLines.map((l) => ({
        referenceNo: l.referenceNo,
        expectedDate: l.expectedDate,
        direction: l.direction,
        category: l.category,
        project: l.project,
        counterparty: l.counterparty,
        sourceType: l.sourceType,
        confidencePct: `${l.confidencePct}%`,
        amount: l.amount,
        status: l.status,
      }));
      return {
        id: reportType,
        title: "5. Cash Forecast Report",
        titleAm: "5. የገንዘብ ፍሰት ትንበያ ሪፖርት",
        subtitle: "Line-item cash inflows and outflows projected from AR, AP, Payroll, Collection/Payment Plans, and Budgets.",
        columns: [
          { key: "referenceNo", label: "Ref #" },
          { key: "expectedDate", label: "Expected Date" },
          { key: "direction", label: "Direction" },
          { key: "category", label: "Cash Category" },
          { key: "project", label: "Project" },
          { key: "counterparty", label: "Counterparty" },
          { key: "sourceType", label: "ERP Source" },
          { key: "confidencePct", label: "Prob." },
          { key: "amount", label: `Amount (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Expected Inflows", value: state.kpis.totalExpectedInflows },
          { label: "Total Expected Outflows", value: state.kpis.totalExpectedOutflows },
          { label: "Net Forecast Flow", value: state.kpis.forecastNetCashFlow },
        ],
      };
    }

    case "bank-reconciliation-report": {
      const rows = state.scopedReconciliations.map((rec) => ({
        reconciliationNo: rec.reconciliationNo,
        accountName: rec.accountName,
        period: `${rec.periodStart} → ${rec.periodEnd}`,
        bookClosingBalance: rec.bookClosingBalance,
        statementClosingBalance: rec.statementClosingBalance,
        reconciledCount: rec.reconciledTxIds.length,
        unreconciledBookCount: rec.unreconciledBookCount,
        discrepancyAmount: rec.discrepancyAmount,
        approvalStatus: rec.approvalStatus,
      }));
      return {
        id: reportType,
        title: "6. Bank Reconciliation Report",
        titleAm: "6. የባንክ ሂሳብ ማመሳከሪያ ሪፖርት",
        subtitle: "Audit summary of bank statement closing balances compared against ERP ledger balances.",
        columns: [
          { key: "reconciliationNo", label: "Reconciliation #" },
          { key: "accountName", label: "Bank / Cash Account" },
          { key: "period", label: "Statement Period" },
          { key: "bookClosingBalance", label: `Book Balance (${cur})`, isNumeric: true },
          { key: "statementClosingBalance", label: `Statement Balance (${cur})`, isNumeric: true },
          { key: "reconciledCount", label: "Matched Tx", isNumeric: true },
          { key: "unreconciledBookCount", label: "Unmatched", isNumeric: true },
          { key: "discrepancyAmount", label: `Variance (${cur})`, isNumeric: true },
          { key: "approvalStatus", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Reconciliations", value: rows.length },
          {
            label: "Total Discrepancy",
            value: rows.reduce((s, r) => s + Math.abs(Number(r.discrepancyAmount || 0)), 0),
          },
        ],
      };
    }

    case "cash-shortage-report": {
      const rows = state.shortageItems.map((s) => ({
        periodKey: s.periodKey,
        project: s.project,
        accountName: s.accountName,
        projectedOpeningBalance: s.projectedOpeningBalance,
        expectedInflows: s.expectedInflows,
        expectedOutflows: s.expectedOutflows,
        projectedClosingBalance: s.projectedClosingBalance,
        requiredBufferThreshold: s.requiredBufferThreshold,
        shortageAmount: s.shortageAmount,
        severity: s.severity,
      }));
      return {
        id: reportType,
        title: "7. Cash Shortage Report",
        titleAm: "7. የጥሬ ገንዘብ እጥረት ትንበያ ሪፖርት",
        subtitle: "Forecast horizon periods where projected cash balance falls below zero or minimum liquidity threshold.",
        columns: [
          { key: "periodKey", label: "Period" },
          { key: "project", label: "Project Scope" },
          { key: "accountName", label: "Account" },
          { key: "projectedOpeningBalance", label: `Opening (${cur})`, isNumeric: true },
          { key: "expectedInflows", label: `Exp. Inflow (${cur})`, isNumeric: true },
          { key: "expectedOutflows", label: `Exp. Outflow (${cur})`, isNumeric: true },
          { key: "projectedClosingBalance", label: `Proj. Closing (${cur})`, isNumeric: true },
          { key: "shortageAmount", label: `Shortfall (${cur})`, isNumeric: true },
          { key: "severity", label: "Severity" },
        ],
        rows,
        summaryTotals: [
          { label: "Shortage Periods", value: rows.length },
          { label: "Peak Forecast Shortage", value: state.kpis.forecastCashShortage },
        ],
      };
    }
  }
}
