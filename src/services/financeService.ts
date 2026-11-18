import {
  AgingBucketRow,
  AgingCategoryLabel,
  AgingPerformanceColor,
  AgingPerformanceIndicator,
  AgingPerformanceTier,
  ArApAuditEntry,
  ArApReportTypeId,
  CashReportTypeId,
  CashTransactionApprovalEntry,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialAlertItem,
  FinancialBudgetRecord,
  FinancialDashboardMetrics,
  FinancialFilterState,
  FinancialInvoiceRecord,
  FinancialPaymentRecord,
  FinancialPeriodPreset,
  FinancialSettingsConfig,
  MonthlyCollectionPlan,
  MonthlyFinancialTarget,
  MonthlyPaymentPlan,
  PayableCategory,
  PayableLifecycleStatus,
  PayableWorkflowStage,
  PaymentPlanningCategory,
  ReceivableCategory,
  ReceivableLifecycleStatus,
  ReceivableWorkflowStage,
  SupportingDocMeta,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { parseMoney, safeString } from "../utils/formatters";

export const RECEIVABLE_CATEGORIES: ReceivableCategory[] = [
  "Client Contract Receivables",
  "Certified Payment Receivables",
  "Retention Money Receivables",
  "Advance Payment Receivables",
  "Variation Order Receivables",
  "Other Receivables",
];

export const PAYABLE_CATEGORIES: PayableCategory[] = [
  "Material Supplier Payables",
  "Subcontractor Payables",
  "Consultant Payables",
  "Equipment Rental Payables",
  "Employee Payables",
  "Operational Expenses",
  "Tax Payables",
  "Other Payables",
];

export const PAYMENT_TERMS_OPTIONS: string[] = [
  "Due on Receipt",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Milestone Based",
  "Custom",
];

export const AGING_BUCKET_LABELS: AgingCategoryLabel[] = [
  "Not Yet Due",
  "1–30 Days Overdue",
  "31–60 Days Overdue",
  "61–90 Days Overdue",
  "Above 90 Days Overdue",
];

export const PAYMENT_PLANNING_CATEGORIES: PaymentPlanningCategory[] = [
  "Supplier Payments",
  "Material Suppliers",
  "Vehicle Rental",
  "Equipment Rental",
  "Restaurant and Food",
  "Labor Payments",
  "Salary Payments",
  "Transportation",
  "Tax Payments",
  "Administration",
  "Other Payments",
];

export const COLLECTION_PAYMENT_METHODS: string[] = [
  "Cash",
  "Bank Transfer",
  "Mobile Banking",
  "Cheque",
  "Telebirr",
  "CBE Birr",
  "CPO",
  "Other",
];

export function isConfirmedCashStatus(status?: string): boolean {
  const s = safeString(status).toLowerCase();
  return (
    s === "posted" ||
    s === "confirmed" ||
    s === "verified" ||
    s === "verified & confirmed" ||
    s === "confirmed & paid"
  );
}

export function isPendingCashStatus(status?: string): boolean {
  const s = safeString(status).toLowerCase();
  return (
    s === "pending" ||
    s === "pending verification" ||
    s === "pending approval" ||
    s === "director approval required"
  );
}

export function isReversedOrRejectedStatus(status?: string): boolean {
  const s = safeString(status).toLowerCase();
  return s === "rejected" || s === "reversed" || s === "cancelled";
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettingsConfig = {
  id: "FIN-SETTINGS-GLOBAL",
  defaultCurrency: "ETB",
  fiscalYearStartMonth: 7,
  defaultPaymentTermsDays: 30,
  lowCashAlertThresholdEtb: 1000000,
  budgetOverrunAlertPct: 100,
  overdueAlertGraceDays: 0,
  requireDirectorApprovalAboveEtb: 500000,
  enableCriticalAlerts: true,
};

export interface UserFinancePermissions {
  canViewDashboard: boolean;
  canViewAllProjects: boolean;
  isProjectScopedOnly: boolean;
  isDirector: boolean;
  isFinanceManager: boolean;
  isAccountant: boolean;
  isReadOnly: boolean;
  isWarehouseLimited: boolean;
  canManageTransactions: boolean;
  canManageBudgets: boolean;
  canManageTargets: boolean;
  canManageAccounts: boolean;
  canManageSettings: boolean;
  canApproveTransactions: boolean;
  canDeleteTransactions: boolean;
  canAcknowledgeAlerts: boolean;
  // Part 2 Granular Cash Collection & Payment Workflow Permissions
  canManageCollectionPaymentPlans: boolean;
  canVerifyCollections: boolean;
  canApproveStandardPayments: boolean;
  canApproveHighValuePayments: boolean;
  canReverseCashTransactions: boolean;
}

export function resolveUserFinancePermissions(role?: UserRole | string): UserFinancePermissions {
  const r = String(role || "");
  const isSuperAdmin = r === UserRole.SUPER_ADMIN;
  const isHeadOffice = r === UserRole.HEAD_OFFICE || r === UserRole.DIRECTOR || r === UserRole.DIRECTORY;
  const isFinanceManager = r === UserRole.FINANCE_MANAGER;
  const isAccountant = r === UserRole.ACCOUNTANT;
  const isProjectManager = r === UserRole.PROJECT_MANAGER;
  const isAuditor = r === UserRole.AUDITOR;
  const isWarehouse = r === UserRole.WAREHOUSE_MANAGER || r === UserRole.STORE_OWNER;
  const isHr = r === UserRole.HR || r === UserRole.HR_MANAGER;

  const isDirector = isSuperAdmin || isHeadOffice;

  if (isSuperAdmin) {
    return {
      canViewDashboard: true,
      canViewAllProjects: true,
      isProjectScopedOnly: false,
      isDirector: true,
      isFinanceManager: true,
      isAccountant: false,
      isReadOnly: false,
      isWarehouseLimited: false,
      canManageTransactions: true,
      canManageBudgets: true,
      canManageTargets: true,
      canManageAccounts: true,
      canManageSettings: true,
      canApproveTransactions: true,
      canDeleteTransactions: true,
      canAcknowledgeAlerts: true,
      canManageCollectionPaymentPlans: true,
      canVerifyCollections: true,
      canApproveStandardPayments: true,
      canApproveHighValuePayments: true,
      canReverseCashTransactions: true,
    };
  }

  if (isFinanceManager) {
    return {
      canViewDashboard: true,
      canViewAllProjects: true,
      isProjectScopedOnly: false,
      isDirector: false,
      isFinanceManager: true,
      isAccountant: false,
      isReadOnly: false,
      isWarehouseLimited: false,
      canManageTransactions: true,
      canManageBudgets: true,
      canManageTargets: true,
      canManageAccounts: true,
      canManageSettings: true,
      canApproveTransactions: true,
      canDeleteTransactions: true,
      canAcknowledgeAlerts: true,
      canManageCollectionPaymentPlans: true,
      canVerifyCollections: true,
      canApproveStandardPayments: true,
      canApproveHighValuePayments: false,
      canReverseCashTransactions: true,
    };
  }

  if (isHeadOffice) {
    return {
      canViewDashboard: true,
      canViewAllProjects: true,
      isProjectScopedOnly: false,
      isDirector: true,
      isFinanceManager: false,
      isAccountant: false,
      isReadOnly: false,
      isWarehouseLimited: false,
      canManageTransactions: false,
      canManageBudgets: true,
      canManageTargets: true,
      canManageAccounts: false,
      canManageSettings: true,
      canApproveTransactions: true,
      canDeleteTransactions: false,
      canAcknowledgeAlerts: true,
      canManageCollectionPaymentPlans: true,
      canVerifyCollections: true,
      canApproveStandardPayments: true,
      canApproveHighValuePayments: true,
      canReverseCashTransactions: true,
    };
  }

  if (isAccountant) {
    return {
      canViewDashboard: true,
      canViewAllProjects: true,
      isProjectScopedOnly: false,
      isDirector: false,
      isFinanceManager: false,
      isAccountant: true,
      isReadOnly: false,
      isWarehouseLimited: false,
      canManageTransactions: true,
      canManageBudgets: false,
      canManageTargets: false,
      canManageAccounts: true,
      canManageSettings: false,
      canApproveTransactions: false,
      canDeleteTransactions: false,
      canAcknowledgeAlerts: true,
      canManageCollectionPaymentPlans: false,
      canVerifyCollections: false,
      canApproveStandardPayments: false,
      canApproveHighValuePayments: false,
      canReverseCashTransactions: false,
    };
  }

  if (isProjectManager) {
    return {
      canViewDashboard: true,
      canViewAllProjects: false,
      isProjectScopedOnly: true,
      isDirector: false,
      isFinanceManager: false,
      isAccountant: false,
      isReadOnly: false,
      isWarehouseLimited: false,
      canManageTransactions: false,
      canManageBudgets: false,
      canManageTargets: false,
      canManageAccounts: false,
      canManageSettings: false,
      canApproveTransactions: false,
      canDeleteTransactions: false,
      canAcknowledgeAlerts: false,
      canManageCollectionPaymentPlans: false,
      canVerifyCollections: false,
      canApproveStandardPayments: false,
      canApproveHighValuePayments: false,
      canReverseCashTransactions: false,
    };
  }

  if (isAuditor) {
    return {
      canViewDashboard: true,
      canViewAllProjects: true,
      isProjectScopedOnly: false,
      isDirector: false,
      isFinanceManager: false,
      isAccountant: false,
      isReadOnly: true,
      isWarehouseLimited: false,
      canManageTransactions: false,
      canManageBudgets: false,
      canManageTargets: false,
      canManageAccounts: false,
      canManageSettings: false,
      canApproveTransactions: false,
      canDeleteTransactions: false,
      canAcknowledgeAlerts: false,
      canManageCollectionPaymentPlans: false,
      canVerifyCollections: false,
      canApproveStandardPayments: false,
      canApproveHighValuePayments: false,
      canReverseCashTransactions: false,
    };
  }

  return {
    canViewDashboard: isWarehouse || isHr,
    canViewAllProjects: false,
    isProjectScopedOnly: false,
    isDirector: false,
    isFinanceManager: false,
    isAccountant: false,
    isReadOnly: true,
    isWarehouseLimited: isWarehouse,
    canManageTransactions: false,
    canManageBudgets: false,
    canManageTargets: false,
    canManageAccounts: false,
    canManageSettings: false,
    canApproveTransactions: false,
    canDeleteTransactions: false,
    canAcknowledgeAlerts: false,
    canManageCollectionPaymentPlans: false,
    canVerifyCollections: false,
    canApproveStandardPayments: false,
    canApproveHighValuePayments: false,
    canReverseCashTransactions: false,
  };
}

export function generateFinancialRef(
  prefix: "REV" | "EXP" | "COL" | "PAY" | "BGT" | "ACC" | "TGT" | "TRF" | "CPL" | "PPL" | "RCP" | "PVC" | "AR" | "AP",
  now: Date = new Date()
): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function getAssignedProjectsForProfile(profile: any, projectsList: any[]): string[] {
  if (!profile) return [];
  const assigned = new Set<string>();
  const single = safeString(profile.assignedProject || profile.project);
  if (single) assigned.add(single);
  const site = safeString(profile.assignedSite || profile.site);
  if (site) assigned.add(site);
  if (Array.isArray(profile.assignedProjects)) {
    profile.assignedProjects.forEach((p: unknown) => {
      const s = safeString(p);
      if (s) assigned.add(s);
    });
  }
  const uid = safeString(profile.uid);
  const displayName = safeString(profile.displayName || profile.name).toLowerCase();
  projectsList.forEach((p) => {
    const pMgrId = safeString(p?.managerId || p?.pmUid);
    const pMgrName = safeString(p?.managerName || p?.siteManager || p?.projectManager).toLowerCase();
    const matchByUid = uid && pMgrId && pMgrId === uid;
    const matchByName = displayName && pMgrName && pMgrName === displayName;
    if (matchByUid || matchByName) {
      const pName = safeString(p?.name || p?.projectName || p?.title);
      const pId = safeString(p?.id);
      if (pName) assigned.add(pName);
      if (pId) assigned.add(pId);
    }
  });
  return Array.from(assigned);
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

function enumerateMonthKeys(startDate: string, endDate: string): string[] {
  const s = parseIsoDate(startDate);
  const e = parseIsoDate(endDate);
  if (!s || !e || s > e) return [startDate.slice(0, 7)];
  const months: string[] = [];
  const cursor = new Date(s.getFullYear(), s.getMonth(), 1);
  const endMonth = new Date(e.getFullYear(), e.getMonth(), 1);
  let guard = 0;
  while (cursor <= endMonth && guard < 36) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
    guard++;
  }
  return months;
}

export interface ResolvedDateRange {
  startDate: string;
  endDate: string;
  months: string[];
  granularity: "day" | "month";
  label: string;
}

export function resolveDateRange(
  preset: FinancialPeriodPreset,
  customStart?: string,
  customEnd?: string,
  referenceDateStr?: string
): ResolvedDateRange {
  const today = parseIsoDate(referenceDateStr) || new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  let start: Date;
  let end: Date;
  let granularity: "day" | "month" = "month";
  let label = "Monthly";

  switch (preset) {
    case "daily": {
      start = new Date(y, m, today.getDate());
      end = new Date(y, m, today.getDate());
      granularity = "day";
      label = "Daily";
      break;
    }
    case "weekly": {
      end = new Date(y, m, today.getDate());
      start = new Date(y, m, today.getDate() - 6);
      granularity = "day";
      label = "Last 7 Days";
      break;
    }
    case "monthly": {
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0);
      granularity = "day";
      label = "Monthly";
      break;
    }
    case "bimonthly": {
      start = new Date(y, m - 1, 1);
      end = new Date(y, m + 1, 0);
      granularity = "month";
      label = "Every Two Months";
      break;
    }
    case "quarterly": {
      const qStartMonth = Math.floor(m / 3) * 3;
      start = new Date(y, qStartMonth, 1);
      end = new Date(y, qStartMonth + 3, 0);
      granularity = "month";
      label = "Quarterly";
      break;
    }
    case "semiannual": {
      const sStartMonth = m < 6 ? 0 : 6;
      start = new Date(y, sStartMonth, 1);
      end = new Date(y, sStartMonth + 6, 0);
      granularity = "month";
      label = "Semi-Annual";
      break;
    }
    case "annual": {
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31);
      granularity = "month";
      label = "Annual";
      break;
    }
    case "custom": {
      const parsedS = parseIsoDate(customStart) || new Date(y, m, 1);
      const parsedE = parseIsoDate(customEnd) || new Date(y, m + 1, 0);
      start = parsedS <= parsedE ? parsedS : parsedE;
      end = parsedS <= parsedE ? parsedE : parsedS;
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
      granularity = diffDays <= 45 ? "day" : "month";
      label = `${toIsoDate(start)} → ${toIsoDate(end)}`;
      break;
    }
  }

  const startDate = toIsoDate(start);
  const endDate = toIsoDate(end);
  return {
    startDate,
    endDate,
    months: enumerateMonthKeys(startDate, endDate),
    granularity,
    label,
  };
}

export interface NormalizedInvoice extends FinancialInvoiceRecord {
  normalizedClient: string;
  normalizedDepartment: string;
  normalizedCategory: string;
  normalizedReceivableCategory: ReceivableCategory | string;
  collectedAmount: number;
  outstandingAmount: number;
  arLifecycleStatus: ReceivableLifecycleStatus;
  agingCategory: AgingCategoryLabel;
  effectiveWorkflowStage: ReceivableWorkflowStage;
  isOverdue: boolean;
  daysOverdue: number;
  isCancelledOrRejected: boolean;
}

export interface NormalizedExpense extends Expense {
  normalizedSupplier: string;
  normalizedDepartment: string;
  normalizedCategory: string;
  normalizedPayableCategory: PayableCategory | string;
  normalizedStatus: string;
  apLifecycleStatus: PayableLifecycleStatus;
  agingCategory: AgingCategoryLabel;
  effectiveWorkflowStage: PayableWorkflowStage;
  paidCashAmount: number;
  outstandingAmount: number;
  isOverdue: boolean;
  daysOverdue: number;
  isCancelledOrRejected: boolean;
}

export interface NormalizedCashTx extends CashTransactionRecord {
  isLegacyMigrated?: boolean;
}

export interface ComputedFinancialState {
  permissions: UserFinancePermissions;
  resolvedRange: ResolvedDateRange;
  assignedProjects: string[];
  settings: FinancialSettingsConfig;
  // Filter option catalogs extracted from live records
  filterOptions: {
    projects: string[];
    departments: string[];
    customers: string[];
    suppliers: string[];
    categories: string[];
    statuses: string[];
  };
  // Filtered & enriched entities
  scopedInvoices: NormalizedInvoice[];
  scopedExpenses: NormalizedExpense[];
  allDimInvoices: NormalizedInvoice[];
  allDimExpenses: NormalizedExpense[];
  scopedCashTransactions: NormalizedCashTx[];
  allRoleCashTransactions: NormalizedCashTx[];
  scopedBudgets: FinancialBudgetRecord[];
  scopedTargets: MonthlyFinancialTarget[];
  scopedCollectionPlans: MonthlyCollectionPlan[];
  scopedPaymentPlans: MonthlyPaymentPlan[];
  allRoleCollectionPlans: MonthlyCollectionPlan[];
  allRolePaymentPlans: MonthlyPaymentPlan[];
  pendingApprovalTransactions: NormalizedCashTx[];
  upcomingScheduledPayments: {
    id: string;
    source: "Payment Plan" | "Payable Bill";
    reference: string;
    supplierOrPayee: string;
    project: string;
    category: string;
    dueDate: string;
    amount: number;
    status: string;
  }[];
  scopedAccounts: FinancialAccount[];
  // All-time (project/dimension scoped without date clip for open AR/AP/Account balances when viewing open positions)
  openReceivablesInvoices: NormalizedInvoice[];
  openPayablesExpenses: NormalizedExpense[];
  agingReceivables: AgingBucketRow[];
  agingPayables: AgingBucketRow[];
  // Dashboard KPI Metrics
  metrics: FinancialDashboardMetrics;
  // 9 Interactive Chart Datasets
  charts: {
    revenuePlanVsActual: { periodLabel: string; plannedRevenue: number; actualRevenue: number }[];
    expensePlanVsActual: { periodLabel: string; plannedExpenses: number; actualExpenses: number }[];
    collectionPlanVsActual: { periodLabel: string; plannedCollection: number; actualCollection: number }[];
    paymentPlanVsActual: { periodLabel: string; plannedPayment: number; actualPayment: number }[];
    arTrends: { periodLabel: string; billedRevenue: number; collected: number; outstandingAR: number; overdueAR: number }[];
    apTrends: { periodLabel: string; incurredExpenses: number; paid: number; outstandingAP: number; overdueAP: number }[];
    profitLossTrends: { periodLabel: string; plannedProfit: number; actualProfit: number }[];
    cashFlowTrends: { periodLabel: string; cashInflow: number; cashOutflow: number; netCashFlow: number; cumulativeNetCashFlow: number }[];
    budgetVsActual: { name: string; allocated: number; committed: number; actual: number; remaining: number }[];
  };
  // Live financial notifications / alerts
  alerts: FinancialAlertItem[];
  referenceToday: string;
}

function diffDays(laterIso: string, earlierIso: string): number {
  const a = parseIsoDate(laterIso);
  const b = parseIsoDate(earlierIso);
  if (!a || !b) return 0;
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export function classifyAgingCategory(daysPastDue: number): AgingCategoryLabel {
  if (daysPastDue <= 0) return "Not Yet Due";
  if (daysPastDue <= 30) return "1–30 Days Overdue";
  if (daysPastDue <= 60) return "31–60 Days Overdue";
  if (daysPastDue <= 90) return "61–90 Days Overdue";
  return "Above 90 Days Overdue";
}

export function buildAgingBuckets(
  items: { outstandingAmount: number; dueDate?: string; date?: string }[],
  referenceToday: string,
  graceDays = 0
): AgingBucketRow[] {
  const buckets: AgingBucketRow[] = [
    { label: "Not Yet Due", count: 0, amount: 0 },
    { label: "1–30 Days Overdue", count: 0, amount: 0 },
    { label: "31–60 Days Overdue", count: 0, amount: 0 },
    { label: "61–90 Days Overdue", count: 0, amount: 0 },
    { label: "Above 90 Days Overdue", count: 0, amount: 0 },
  ];

  items.forEach((item) => {
    if (item.outstandingAmount <= 0) return;
    const refDue = safeString(item.dueDate) || safeString(item.date) || referenceToday;
    const daysPastDue = diffDays(referenceToday, refDue) - graceDays;
    if (daysPastDue <= 0) {
      buckets[0].count += 1;
      buckets[0].amount += item.outstandingAmount;
    } else if (daysPastDue <= 30) {
      buckets[1].count += 1;
      buckets[1].amount += item.outstandingAmount;
    } else if (daysPastDue <= 60) {
      buckets[2].count += 1;
      buckets[2].amount += item.outstandingAmount;
    } else if (daysPastDue <= 90) {
      buckets[3].count += 1;
      buckets[3].amount += item.outstandingAmount;
    } else {
      buckets[4].count += 1;
      buckets[4].amount += item.outstandingAmount;
    }
  });

  return buckets;
}

export function classifyAgingPerformanceThreshold(percentageChange: number): {
  color: AgingPerformanceColor;
  tier: AgingPerformanceTier;
  statusLabel: string;
  statusLabelAm: string;
} {
  if (percentageChange > 20) {
    return {
      color: "Green",
      tier: "Above +20%",
      statusLabel: "Above +20% (Strong Improvement)",
      statusLabelAm: "ከ +20% በላይ (ጠንካራ መሻሻል)",
    };
  }
  if (percentageChange >= 15) {
    return {
      color: "Yellow",
      tier: "+15% to +20%",
      statusLabel: "+15% to +20% (Moderate Watch)",
      statusLabelAm: "ከ +15% እስከ +20% (መካከለኛ ክትትል)",
    };
  }
  if (percentageChange >= 0) {
    return {
      color: "Yellow",
      tier: "0% to +15%",
      statusLabel: "0% to +15% (Caution Watch)",
      statusLabelAm: "ከ 0% እስከ +15% (ጥንቃቄ ክትትል)",
    };
  }
  if (percentageChange >= -20) {
    return {
      color: "Red",
      tier: "0% to -20%",
      statusLabel: "0% to -20% (Overdue Risk)",
      statusLabelAm: "ከ 0% እስከ -20% (ጊዜው ያለፈበት ስጋት)",
    };
  }
  return {
    color: "Red",
    tier: "Below -20%",
    statusLabel: "Below -20% (Critical Alert)",
    statusLabelAm: "ከ -20% በታች (አስቸኳይ ማንቂያ)",
  };
}

export function computeAgingPerformanceIndicator(params: {
  domain: "AR" | "AP";
  currentOverdueAmount: number;
  previousOverdueAmount: number;
  currentOutstandingAmount: number;
  previousOutstandingAmount: number;
  availableLiquidity: number;
}): AgingPerformanceIndicator {
  const { domain, currentOverdueAmount, previousOverdueAmount, currentOutstandingAmount, previousOutstandingAmount, availableLiquidity } =
    params;
  const curOverdue = Math.max(0, currentOverdueAmount);
  const prevOverdue = Math.max(0, previousOverdueAmount);
  const curOut = Math.max(0, currentOutstandingAmount);
  const prevOut = Math.max(0, previousOutstandingAmount);

  let rawPct = 0;
  // Guard against negative outstanding or overdue balances: never treat negative anomalies as Green improvement
  if (
    currentOutstandingAmount < 0 ||
    previousOutstandingAmount < 0 ||
    currentOverdueAmount < 0 ||
    previousOverdueAmount < 0
  ) {
    rawPct = -25;
  } else if (prevOverdue > 0) {
    rawPct = Number((((prevOverdue - curOverdue) / prevOverdue) * 100).toFixed(1));
  } else if (curOverdue > 0) {
    rawPct = -100;
  } else if (prevOut > 0 && curOut < prevOut) {
    // No overdue obligations in either period, and open balance was actively collected/settled
    rawPct = Number((((prevOut - curOut) / prevOut) * 100).toFixed(1));
  } else if (domain === "AP" && curOut > prevOut && availableLiquidity < curOut) {
    // Rising unpaid payables without sufficient cash/bank liquidity must never read positive/green
    rawPct = prevOut > 0 ? -Math.min(100, Number((((curOut - prevOut) / prevOut) * 100).toFixed(1))) : -10;
  } else {
    rawPct = 0;
  }

  const curRatio = curOut > 0 ? Number(((curOverdue / curOut) * 100).toFixed(1)) : 0;
  const prevRatio = prevOut > 0 ? Number(((prevOverdue / prevOut) * 100).toFixed(1)) : 0;

  const liquidityWarning =
    domain === "AP"
      ? (curOverdue > 0 && availableLiquidity < curOverdue) || (curOut > 0 && availableLiquidity < curOut * 0.25)
      : curOverdue > 0 && curRatio > 50;

  const baseClassified = classifyAgingPerformanceThreshold(rawPct);

  // Enforce strict financial safety: if negative variance OR liquidity shortfall on overdue AP, never mark Green
  let finalColor = baseClassified.color;
  let finalTier = baseClassified.tier;
  let finalStatusLabel = baseClassified.statusLabel;
  let finalStatusLabelAm = baseClassified.statusLabelAm;

  if (finalColor === "Green" && domain === "AP" && liquidityWarning) {
    finalColor = "Yellow";
    finalStatusLabel = "Overdue AP Improved — Liquidity Constrained";
    finalStatusLabelAm = "የAP ዕድሜ ተሻሽሏል — የገንዘብ ክምችት ውስን ነው";
  }

  const metricWord = domain === "AR" ? "overdue receivables" : "overdue payables";
  const narrative =
    prevOverdue === 0 && curOverdue === 0
      ? domain === "AP" && liquidityWarning
        ? `No overdue payables, but open AP (ETB ${curOut.toLocaleString()}) strains available cash & bank liquidity (ETB ${availableLiquidity.toLocaleString()}).`
        : `No overdue ${domain === "AR" ? "client receivables" : "supplier payables"} in current or prior period.`
      : rawPct >= 0
      ? `Overdue ${metricWord} improved by +${rawPct.toFixed(1)}% (ETB ${prevOverdue.toLocaleString()} → ETB ${curOverdue.toLocaleString()}).${
          liquidityWarning ? ` Cash & bank liquidity (ETB ${availableLiquidity.toLocaleString()}) requires close attention.` : ""
        }`
      : `Overdue ${metricWord} worsened by ${rawPct.toFixed(1)}% (ETB ${prevOverdue.toLocaleString()} → ETB ${curOverdue.toLocaleString()}).`;

  const narrativeAm =
    prevOverdue === 0 && curOverdue === 0
      ? domain === "AP" && liquidityWarning
        ? `ጊዜው ያለፈበት ተከፋይ ባይኖርም ቀሪው AP ከጥሬ ገንዘብ ክምችት አንጻር ጥንቃቄ ይፈልጋል።`
        : `በዚህም ሆነ ባለፈው ወቅት ጊዜው ያለፈበት ሂሳብ የለም።`
      : rawPct >= 0
      ? `ጊዜው ያለፈበት ሂሳብ በ +${rawPct.toFixed(1)}% ተሻሽሏል (ETB ${prevOverdue.toLocaleString()} → ETB ${curOverdue.toLocaleString()})።`
      : `ጊዜው ያለፈበት ሂሳብ በ ${rawPct.toFixed(1)}% ጨምሯል (ETB ${prevOverdue.toLocaleString()} → ETB ${curOverdue.toLocaleString()})።`;

  return {
    domain,
    percentageChange: rawPct,
    color: finalColor,
    tier: finalTier,
    statusLabel: finalStatusLabel,
    statusLabelAm: finalStatusLabelAm,
    currentOverdueAmount: curOverdue,
    previousOverdueAmount: prevOverdue,
    currentOutstandingAmount: curOut,
    previousOutstandingAmount: prevOut,
    currentOverdueRatioPct: curRatio,
    previousOverdueRatioPct: prevRatio,
    liquidityWarning,
    narrative,
    narrativeAm,
  };
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

function matchesDimensionFilters(
  fields: {
    project?: string;
    department?: string;
    customer?: string;
    supplier?: string;
    category?: string;
    status?: string;
    searchBlob?: string;
  },
  filter: FinancialFilterState
): boolean {
  if (filter.project !== "ALL" && safeString(fields.project) !== filter.project) return false;
  if (filter.department !== "ALL" && safeString(fields.department) !== filter.department) return false;
  if (filter.customer !== "ALL" && fields.customer !== undefined && safeString(fields.customer) !== filter.customer) return false;
  if (filter.supplier !== "ALL" && fields.supplier !== undefined && safeString(fields.supplier) !== filter.supplier) return false;
  if (filter.category !== "ALL" && safeString(fields.category) !== filter.category) return false;
  if (filter.status !== "ALL" && fields.status !== undefined && safeString(fields.status) !== filter.status) return false;

  const q = safeString(filter.searchTerm).toLowerCase();
  if (q && fields.searchBlob && !fields.searchBlob.toLowerCase().includes(q)) return false;

  return true;
}

export interface ComputeFinanceInput {
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  cashTransactions: CashTransactionRecord[];
  paymentRecords?: FinancialPaymentRecord[];
  financialTargets: MonthlyFinancialTarget[];
  collectionPlans?: MonthlyCollectionPlan[];
  paymentPlans?: MonthlyPaymentPlan[];
  financialAccounts: FinancialAccount[];
  projectBudgets: FinancialBudgetRecord[];
  suppliers?: any[];
  projects?: any[];
  contracts?: any[];
  filterState: FinancialFilterState;
  userRole?: UserRole | string;
  userProfile?: any;
  settings?: FinancialSettingsConfig | null;
  referenceToday?: string;
}

export function computeFinancialDashboardState(input: ComputeFinanceInput): ComputedFinancialState {
  const referenceToday = input.referenceToday || toIsoDate(new Date());
  const permissions = resolveUserFinancePermissions(input.userRole);
  const settings: FinancialSettingsConfig = {
    ...DEFAULT_FINANCIAL_SETTINGS,
    ...(input.settings || {}),
  };

  const resolvedRange = resolveDateRange(
    input.filterState.periodPreset,
    input.filterState.startDate,
    input.filterState.endDate,
    referenceToday
  );

  const assignedProjects = permissions.isProjectScopedOnly
    ? getAssignedProjectsForProfile(input.userProfile, input.projects || [])
    : [];

  // 1. Merge cashTransactions and non-duplicate legacy paymentRecords
  const seenCashIds = new Set<string>();
  const seenCashRefs = new Set<string>();
  const allCashTxs: NormalizedCashTx[] = [];

  (input.cashTransactions || []).forEach((tx) => {
    if (!tx || !tx.id) return;
    seenCashIds.add(tx.id);
    if (tx.referenceNo) seenCashRefs.add(tx.referenceNo);
    allCashTxs.push({
      ...tx,
      amount: parseMoney(tx.amount) ?? 0,
      date: safeString(tx.date, referenceToday).slice(0, 10),
      project: safeString(tx.project, "General"),
      department: safeString(tx.department, "General Finance"),
      category: safeString(tx.category, tx.type === "Collection" ? "Client Milestone" : "Operational"),
      counterparty: safeString(tx.counterparty, "Unspecified"),
      status: safeString(tx.status, "Posted"),
    });
  });

  (input.paymentRecords || []).forEach((p) => {
    if (!p || !p.id) return;
    const ref = safeString(p.referenceNo || p.reference);
    if (seenCashIds.has(p.id) || (ref && seenCashRefs.has(ref))) return;
    const txType: "Collection" | "Payment" = p.type === "Payment" ? "Payment" : "Collection";
    allCashTxs.push({
      id: p.id,
      referenceNo: ref || p.id,
      type: txType,
      date: safeString(p.date, referenceToday).slice(0, 10),
      amount: parseMoney(p.amount) ?? 0,
      currency: "ETB",
      accountId: safeString(p.accountId),
      accountName: safeString(p.method, "Bank Transfer"),
      project: safeString(p.project, "General"),
      department: safeString(p.department, "Project Finance"),
      category: txType === "Collection" ? "Client Receipt" : "Vendor Payment",
      counterparty: safeString(p.counterparty || p.invoiceNumber, "Counterparty"),
      linkedDocumentType: p.expenseId ? "Expense" : p.invoiceId ? "Invoice" : "Direct",
      linkedDocumentId: p.expenseId || p.invoiceId,
      linkedReferenceNo: p.invoiceNumber,
      paymentMethod: safeString(p.method, "Bank Transfer"),
      status: safeString(p.status, "Posted"),
      createdBy: safeString(p.createdBy, "Legacy Ledger"),
      createdById: "",
      createdAt: safeString(p.createdAt, p.date),
      updatedAt: safeString(p.createdAt, p.date),
      isLegacyMigrated: true,
    });
  });

  // Index ONLY confirmed/verified cash collections & payments so pending/rejected/reversed NEVER reduce AR/AP
  const collectedByInvoiceId = new Map<string, number>();
  const paidByExpenseId = new Map<string, number>();

  allCashTxs.forEach((tx) => {
    if (!isConfirmedCashStatus(tx.status)) return;
    if (tx.type === "Collection" && tx.linkedDocumentId) {
      collectedByInvoiceId.set(
        tx.linkedDocumentId,
        (collectedByInvoiceId.get(tx.linkedDocumentId) || 0) + tx.amount
      );
    }
    if (tx.type === "Payment" && tx.linkedDocumentId) {
      paidByExpenseId.set(
        tx.linkedDocumentId,
        (paidByExpenseId.get(tx.linkedDocumentId) || 0) + tx.amount
      );
    }
  });

  // 2. Normalize Invoices (Accrual Revenue & AR — NEVER automatically treated as Cash Collected unless linked/paidAmount)
  const normalizedInvoices: NormalizedInvoice[] = (input.invoices || []).map((inv) => {
    const amount = parseMoney(inv.amount) ?? 0;
    const statusRaw = safeString(inv.status, "Pending");
    const isCancelledOrRejected = statusRaw === "Cancelled" || statusRaw === "Rejected";
    const linkedCollected = collectedByInvoiceId.get(inv.id) || 0;
    const explicitPaid = parseMoney(inv.paidAmount) ?? 0;
    // If legacy doc says status === "Paid" and neither paidAmount nor linked tx recorded yet, honor paidAmount/linkedCollected first
    const legacyPaidFallback =
      statusRaw === "Paid" && explicitPaid === 0 && linkedCollected === 0 ? amount : 0;
    const rawCollected = Math.max(linkedCollected, explicitPaid, legacyPaidFallback);
    const collectedAmount = inv.authorizedAdjustmentAmount ? rawCollected : Math.min(amount, rawCollected);
    const outstandingAmount = isCancelledOrRejected ? 0 : Math.max(0, amount - collectedAmount);
    const dueDate = safeString(inv.dueDate, inv.date || referenceToday).slice(0, 10);
    const rawDaysPastDue = dueDate ? diffDays(referenceToday, dueDate) - settings.overdueAlertGraceDays : 0;
    const daysOverdue = outstandingAmount > 0 ? Math.max(0, rawDaysPastDue) : 0;
    const isOverdue = outstandingAmount > 0 && daysOverdue > 0;
    const isDisputed = Boolean(inv.isDisputed) || statusRaw.toLowerCase() === "disputed";
    const normalizedStatus =
      isCancelledOrRejected
        ? statusRaw
        : isDisputed
        ? "Disputed"
        : outstandingAmount === 0 && amount > 0
        ? "Paid"
        : isOverdue
        ? "Overdue"
        : collectedAmount > 0
        ? "Partially Paid"
        : statusRaw;

    const arLifecycleStatus: ReceivableLifecycleStatus = isDisputed
      ? "Disputed"
      : outstandingAmount === 0 && amount > 0
      ? "Fully Collected"
      : isOverdue
      ? "Overdue"
      : collectedAmount > 0
      ? "Partially Collected"
      : dueDate === referenceToday
      ? "Due Today"
      : "Not Yet Due";

    const agingCategory = classifyAgingCategory(daysOverdue);
    const effectiveWorkflowStage: ReceivableWorkflowStage =
      outstandingAmount === 0 && amount > 0
        ? "Completed"
        : inv.workflowStage || (statusRaw === "Approved" || statusRaw === "Paid" || statusRaw === "Partially Paid" ? "Verified" : "Registered");

    return {
      ...inv,
      receivableId: inv.receivableId || inv.id,
      amount,
      date: safeString(inv.date, referenceToday).slice(0, 10),
      dueDate,
      project: safeString(inv.project, "Unassigned Project"),
      client: safeString(inv.client || inv.clientName, "Client"),
      normalizedClient: safeString(inv.client || inv.clientName, "Client"),
      normalizedDepartment: safeString(inv.department, "Contracting & Billing"),
      normalizedCategory: safeString(inv.receivableCategory || inv.category, "Client Contract Receivables"),
      normalizedReceivableCategory: safeString(inv.receivableCategory || inv.category, "Client Contract Receivables"),
      status: normalizedStatus,
      paidAmount: collectedAmount,
      collectedAmount,
      outstandingAmount,
      arLifecycleStatus,
      agingCategory,
      effectiveWorkflowStage,
      isOverdue,
      daysOverdue,
      isCancelledOrRejected,
    };
  });

  // 3. Normalize Expenses (Accrual Expenses & AP — NEVER treated as Cash Paid unless actual Cash Payment tx exists)
  const normalizedExpenses: NormalizedExpense[] = (input.expenses || []).map((exp) => {
    const amount = parseMoney(exp.amount) ?? 0;
    const statusRaw = safeString(exp.status, "Approved");
    const isCancelledOrRejected = statusRaw === "Cancelled" || statusRaw === "Rejected";
    const linkedPaid = paidByExpenseId.get(exp.id) || 0;
    const explicitPaid = parseMoney(exp.paidAmount) ?? 0;
    const rawPaid = Math.max(linkedPaid, explicitPaid);
    const paidCashAmount = exp.authorizedAdjustmentAmount ? rawPaid : Math.min(amount, rawPaid);
    const outstandingAmount = isCancelledOrRejected ? 0 : Math.max(0, amount - paidCashAmount);
    const dueDate = safeString(exp.dueDate || exp.date, referenceToday).slice(0, 10);
    const rawDaysPastDue = dueDate ? diffDays(referenceToday, dueDate) - settings.overdueAlertGraceDays : 0;
    const daysOverdue = outstandingAmount > 0 ? Math.max(0, rawDaysPastDue) : 0;
    const isOverdue = outstandingAmount > 0 && daysOverdue > 0;
    const isDisputed = Boolean(exp.isDisputed) || statusRaw.toLowerCase() === "disputed";
    const normalizedStatus =
      isCancelledOrRejected
        ? statusRaw
        : isDisputed
        ? "Disputed"
        : paidCashAmount >= amount && amount > 0
        ? "Paid"
        : isOverdue
        ? "Overdue"
        : paidCashAmount > 0
        ? "Partially Paid"
        : statusRaw;

    const apLifecycleStatus: PayableLifecycleStatus = isDisputed
      ? "Disputed"
      : outstandingAmount === 0 && amount > 0
      ? "Fully Paid"
      : isOverdue
      ? "Overdue"
      : paidCashAmount > 0
      ? "Partially Paid"
      : dueDate === referenceToday
      ? "Due Today"
      : "Not Yet Due";

    const agingCategory = classifyAgingCategory(daysOverdue);
    const effectiveWorkflowStage: PayableWorkflowStage =
      outstandingAmount === 0 && amount > 0
        ? "Paid"
        : exp.workflowStage || (statusRaw === "Approved" || statusRaw === "Paid" || statusRaw === "Partially Paid" ? "Approved" : "Registered");

    return {
      ...exp,
      payableId: exp.payableId || exp.id,
      amount,
      date: safeString(exp.date, referenceToday).slice(0, 10),
      dueDate,
      project: safeString(exp.project, "Unassigned Project"),
      vendor: safeString(exp.vendor || exp.supplier, "Supplier"),
      normalizedSupplier: safeString(exp.vendor || exp.supplier, "Supplier"),
      normalizedDepartment: safeString(exp.department || exp.costCenter, "Operations"),
      normalizedCategory: safeString(exp.payableCategory || exp.category, "Material Supplier Payables"),
      normalizedPayableCategory: safeString(exp.payableCategory || exp.category, "Material Supplier Payables"),
      normalizedStatus,
      status: normalizedStatus,
      apLifecycleStatus,
      agingCategory,
      effectiveWorkflowStage,
      paidAmount: paidCashAmount,
      paidCashAmount,
      outstandingAmount,
      isOverdue,
      daysOverdue,
      isCancelledOrRejected,
    };
  });

  // 4. Apply Role Project Scoping before extracting filter options
  const roleScopedInvoices = permissions.isProjectScopedOnly
    ? normalizedInvoices.filter((i) => matchesProjectScope(i.project, assignedProjects))
    : normalizedInvoices;

  const roleScopedExpenses = permissions.isProjectScopedOnly
    ? normalizedExpenses.filter((e) => matchesProjectScope(e.project, assignedProjects))
    : normalizedExpenses;

  const roleScopedCashTxs = permissions.isProjectScopedOnly
    ? allCashTxs.filter((tx) => matchesProjectScope(tx.project, assignedProjects))
    : allCashTxs;

  const roleScopedBudgets = permissions.isProjectScopedOnly
    ? (input.projectBudgets || []).filter((b) => matchesProjectScope(b.project, assignedProjects))
    : input.projectBudgets || [];

  const roleScopedTargets = permissions.isProjectScopedOnly
    ? (input.financialTargets || []).filter((t) => matchesProjectScope(t.project, assignedProjects))
    : input.financialTargets || [];

  const allRoleCollectionPlans = permissions.isProjectScopedOnly
    ? (input.collectionPlans || []).filter((cp) => cp.targetScope === "Company" || matchesProjectScope(cp.project, assignedProjects))
    : input.collectionPlans || [];

  const allRolePaymentPlans = permissions.isProjectScopedOnly
    ? (input.paymentPlans || []).filter((pp) => matchesProjectScope(pp.project, assignedProjects))
    : input.paymentPlans || [];

  const roleScopedAccounts = permissions.isProjectScopedOnly
    ? (input.financialAccounts || []).filter(
        (a) => !a.project || a.project === "Corporate Treasury" || matchesProjectScope(a.project, assignedProjects)
      )
    : input.financialAccounts || [];

  // 5. Build distinct filter dropdown options from live role-scoped data & master lists
  const projectSet = new Set<string>();
  const deptSet = new Set<string>();
  const customerSet = new Set<string>();
  const supplierSet = new Set<string>();
  const categorySet = new Set<string>();
  const statusSet = new Set<string>();

  if (!permissions.isProjectScopedOnly) {
    (input.projects || []).forEach((p) => {
      const name = safeString(p?.name || p?.projectName);
      if (name) projectSet.add(name);
    });
    (input.suppliers || []).forEach((s) => {
      const name = safeString(s?.supplierName || s?.name || s?.company);
      if (name) supplierSet.add(name);
    });
  } else {
    assignedProjects.forEach((p) => projectSet.add(p));
  }

  roleScopedInvoices.forEach((i) => {
    if (i.project) projectSet.add(i.project);
    if (i.normalizedDepartment) deptSet.add(i.normalizedDepartment);
    if (i.normalizedClient) customerSet.add(i.normalizedClient);
    if (i.normalizedCategory) categorySet.add(i.normalizedCategory);
    if (i.status) statusSet.add(String(i.status));
  });
  roleScopedExpenses.forEach((e) => {
    if (e.project) projectSet.add(e.project);
    if (e.normalizedDepartment) deptSet.add(e.normalizedDepartment);
    if (e.normalizedSupplier) supplierSet.add(e.normalizedSupplier);
    if (e.normalizedCategory) categorySet.add(e.normalizedCategory);
    if (e.normalizedStatus) statusSet.add(e.normalizedStatus);
  });
  roleScopedCashTxs.forEach((tx) => {
    if (tx.project) projectSet.add(tx.project);
    if (tx.department) deptSet.add(tx.department);
    if (tx.category) categorySet.add(tx.category);
    if (tx.status) statusSet.add(tx.status);
    if (tx.type === "Collection" && tx.counterparty) customerSet.add(tx.counterparty);
    if (tx.type === "Payment" && tx.counterparty) supplierSet.add(tx.counterparty);
  });
  roleScopedBudgets.forEach((b) => {
    if (b.project) projectSet.add(b.project);
    if (b.department) deptSet.add(b.department);
    if (b.category) categorySet.add(b.category);
  });
  allRoleCollectionPlans.forEach((cp) => {
    if (cp.project && cp.project !== "All Projects") projectSet.add(cp.project);
    if (cp.department && cp.department !== "All Departments") deptSet.add(cp.department);
    if (cp.customer && cp.customer !== "All Customers") customerSet.add(cp.customer);
  });
  allRolePaymentPlans.forEach((pp) => {
    if (pp.project && pp.project !== "All Projects") projectSet.add(pp.project);
    if (pp.department && pp.department !== "All Departments") deptSet.add(pp.department);
    if (pp.supplierOrPayee) supplierSet.add(pp.supplierOrPayee);
    if (pp.expenseCategory) categorySet.add(pp.expenseCategory);
  });

  // 6. Apply active filters (dimension + period)
  const inDateRange = (isoDate: string) =>
    isoDate >= resolvedRange.startDate && isoDate <= resolvedRange.endDate;

  const dimScopedInvoices = roleScopedInvoices.filter((i) =>
    matchesDimensionFilters(
      {
        project: i.project,
        department: i.normalizedDepartment,
        customer: i.normalizedClient,
        category: i.normalizedCategory,
        status: String(i.status),
        searchBlob: `${i.invoiceNumber} ${i.referenceNo || ""} ${i.client} ${i.project} ${i.description || ""}`,
      },
      input.filterState
    )
  );
  // If supplier filter is exclusively chosen, don't let invoices appear as supplier items unless ALL
  const filteredDimInvoices =
    input.filterState.supplier === "ALL" ? dimScopedInvoices : [];

  const filteredDimExpenses =
    input.filterState.customer === "ALL"
      ? roleScopedExpenses.filter((e) =>
          matchesDimensionFilters(
            {
              project: e.project,
              department: e.normalizedDepartment,
              supplier: e.normalizedSupplier,
              category: e.normalizedCategory,
              status: e.normalizedStatus,
              searchBlob: `${e.id} ${e.referenceNo || ""} ${e.billNumber || ""} ${e.vendor} ${e.project} ${e.description}`,
            },
            input.filterState
          )
        )
      : [];

  const scopedInvoices = filteredDimInvoices.filter((i) => inDateRange(i.date));
  const scopedExpenses = filteredDimExpenses.filter((e) => inDateRange(e.date));

  const scopedCashTransactions = roleScopedCashTxs.filter((tx) => {
    if (!inDateRange(tx.date)) return false;
    if (input.filterState.customer !== "ALL" && tx.type === "Collection" && tx.counterparty !== input.filterState.customer)
      return false;
    if (input.filterState.customer !== "ALL" && tx.type !== "Collection") return false;
    if (input.filterState.supplier !== "ALL" && tx.type === "Payment" && tx.counterparty !== input.filterState.supplier)
      return false;
    if (input.filterState.supplier !== "ALL" && tx.type !== "Payment") return false;
    return matchesDimensionFilters(
      {
        project: tx.project,
        department: tx.department,
        category: tx.category,
        status: tx.status,
        searchBlob: `${tx.referenceNo} ${tx.counterparty} ${tx.accountName} ${tx.project} ${tx.notes || ""}`,
      },
      input.filterState
    );
  });

  const scopedBudgets = roleScopedBudgets.filter((b) =>
    matchesDimensionFilters(
      {
        project: b.project,
        department: b.department,
        category: b.category,
        searchBlob: `${b.project} ${b.department} ${b.category} ${b.description}`,
      },
      { ...input.filterState, customer: "ALL", supplier: "ALL", status: "ALL" }
    )
  );

  const monthSet = new Set(resolvedRange.months);
  const scopedTargets = roleScopedTargets.filter((t) => {
    if (!monthSet.has(safeString(t.period).slice(0, 7))) return false;
    return matchesDimensionFilters(
      {
        project: t.project,
        department: t.department,
        category: t.category,
      },
      { ...input.filterState, customer: "ALL", supplier: "ALL", status: "ALL" }
    );
  });

  const scopedCollectionPlans = allRoleCollectionPlans.filter((cp) => {
    if (!monthSet.has(safeString(cp.month).slice(0, 7))) return false;
    return matchesDimensionFilters(
      {
        project: cp.project === "All Projects" ? undefined : cp.project,
        department: cp.department === "All Departments" ? undefined : cp.department,
        customer: cp.customer === "All Customers" ? undefined : cp.customer,
        searchBlob: `${cp.planNumber} ${cp.project} ${cp.customer} ${cp.contractNumber} ${cp.invoiceNumber}`,
      },
      {
        ...input.filterState,
        project: cp.targetScope === "Company" && input.filterState.project === "ALL" ? "ALL" : input.filterState.project,
        supplier: "ALL",
        category: "ALL",
        status: "ALL",
      }
    );
  });

  const scopedPaymentPlans = allRolePaymentPlans.filter((pp) => {
    if (!monthSet.has(safeString(pp.month).slice(0, 7))) return false;
    return matchesDimensionFilters(
      {
        project: pp.project === "All Projects" ? undefined : pp.project,
        department: pp.department === "All Departments" ? undefined : pp.department,
        supplier: pp.supplierOrPayee,
        category: pp.expenseCategory,
        searchBlob: `${pp.planNumber} ${pp.project} ${pp.supplierOrPayee} ${pp.expenseCategory} ${pp.invoiceNumber}`,
      },
      { ...input.filterState, customer: "ALL", status: "ALL" }
    );
  });

  const scopedAccounts = roleScopedAccounts.filter((a) => {
    if (input.filterState.project !== "ALL" && a.project && a.project !== "Corporate Treasury" && a.project !== input.filterState.project) {
      return false;
    }
    return true;
  });

  // 7. Compute Strict Accrual vs. Cash KPIs
  const plannedRevenue = scopedTargets.reduce((s, t) => s + (parseMoney(t.plannedRevenue) ?? 0), 0);
  const actualRevenue = scopedInvoices
    .filter((i) => !i.isCancelledOrRejected)
    .reduce((s, i) => s + i.amount, 0);
  const revenueDifference = actualRevenue - plannedRevenue;

  const plannedExpenses = scopedTargets.reduce((s, t) => s + (parseMoney(t.plannedExpense) ?? 0), 0);
  const actualExpenses = scopedExpenses
    .filter((e) => !e.isCancelledOrRejected)
    .reduce((s, e) => s + e.amount, 0);
  const expenseDifference = actualExpenses - plannedExpenses;

  // Planned Cash Collection: use Approved Part 2 Collection Plans if defined for those months, otherwise fallback to Part 1 Targets per month
  const approvedCollectionPlans = scopedCollectionPlans.filter((cp) => cp.approvalStatus === "Approved");
  const monthsWithCollectionPlans = new Set(approvedCollectionPlans.map((cp) => safeString(cp.month).slice(0, 7)));
  const plannedCollectionFromPlans = approvedCollectionPlans.reduce((s, cp) => s + (parseMoney(cp.plannedAmount) ?? 0), 0);
  const plannedCollectionFromTargets = scopedTargets
    .filter((t) => !monthsWithCollectionPlans.has(safeString(t.period).slice(0, 7)))
    .reduce((s, t) => s + (parseMoney(t.plannedCollection) ?? 0), 0);
  const plannedCashCollection = plannedCollectionFromPlans + plannedCollectionFromTargets;

  // STRICT RULE: Only Verified & Confirmed / Posted Cash Collection transactions count as Actual Cash Collection!
  const actualCashCollection = scopedCashTransactions
    .filter((tx) => tx.type === "Collection" && isConfirmedCashStatus(tx.status))
    .reduce((s, tx) => s + tx.amount, 0);
  const collectionDifference = actualCashCollection - plannedCashCollection;
  const collectionAchievementPct =
    plannedCashCollection > 0
      ? Number(((actualCashCollection / plannedCashCollection) * 100).toFixed(1))
      : 0;
  const outstandingCollectionTarget = Math.max(0, plannedCashCollection - actualCashCollection);

  // Planned Cash Payment: Approved Part 2 Payment Plans per month + Part 1 Targets fallback
  const approvedPaymentPlans = scopedPaymentPlans.filter((pp) => pp.approvalStatus === "Approved");
  const monthsWithPaymentPlans = new Set(approvedPaymentPlans.map((pp) => safeString(pp.month).slice(0, 7)));
  const plannedPaymentFromPlans = approvedPaymentPlans.reduce((s, pp) => s + (parseMoney(pp.plannedAmount) ?? 0), 0);
  const plannedPaymentFromTargets = scopedTargets
    .filter((t) => !monthsWithPaymentPlans.has(safeString(t.period).slice(0, 7)))
    .reduce((s, t) => s + (parseMoney(t.plannedPayment) ?? 0), 0);
  const plannedCashPayment = plannedPaymentFromPlans + plannedPaymentFromTargets;

  // STRICT RULE: Only Confirmed & Paid / Posted Cash Payment transactions count as Actual Cash Payment!
  const actualCashPayment = scopedCashTransactions
    .filter((tx) => tx.type === "Payment" && isConfirmedCashStatus(tx.status))
    .reduce((s, tx) => s + tx.amount, 0);
  const paymentDifference = actualCashPayment - plannedCashPayment;
  const paymentAchievementPct =
    plannedCashPayment > 0
      ? Number(((actualCashPayment / plannedCashPayment) * 100).toFixed(1))
      : 0;
  const outstandingPlannedPayments = Math.max(0, plannedCashPayment - actualCashPayment);

  // AR & AP (reflect live open receivables/payables within dimension filters)
  const validDimInvoices = filteredDimInvoices.filter((i) => !i.isCancelledOrRejected);
  const totalReceivables = validDimInvoices.reduce((s, i) => s + i.amount, 0);
  const totalCollectedReceivables = validDimInvoices.reduce((s, i) => s + i.collectedAmount, 0);
  const openReceivablesInvoices = validDimInvoices.filter((i) => i.outstandingAmount > 0);
  const outstandingReceivables = openReceivablesInvoices.reduce((s, i) => s + i.outstandingAmount, 0);
  const overdueReceivables = openReceivablesInvoices
    .filter((i) => i.isOverdue)
    .reduce((s, i) => s + i.outstandingAmount, 0);
  const activeMonthPrefix = referenceToday.slice(0, 7);
  const receivablesDueThisMonth = openReceivablesInvoices
    .filter((i) => i.dueDate.startsWith(activeMonthPrefix))
    .reduce((s, i) => s + i.outstandingAmount, 0);
  const collectionRatePct =
    totalReceivables > 0 ? Number(((totalCollectedReceivables / totalReceivables) * 100).toFixed(1)) : 0;

  const validDimExpenses = filteredDimExpenses.filter((e) => !e.isCancelledOrRejected);
  const totalPayables = validDimExpenses.reduce((s, e) => s + e.amount, 0);
  const totalPaidPayables = validDimExpenses.reduce((s, e) => s + e.paidCashAmount, 0);
  const openPayablesExpenses = validDimExpenses.filter((e) => e.outstandingAmount > 0);
  const outstandingPayables = openPayablesExpenses.reduce((s, e) => s + e.outstandingAmount, 0);
  const overduePayables = openPayablesExpenses
    .filter((e) => e.isOverdue)
    .reduce((s, e) => s + e.outstandingAmount, 0);
  const payablesDueThisMonth = openPayablesExpenses
    .filter((e) => e.dueDate.startsWith(activeMonthPrefix))
    .reduce((s, e) => s + e.outstandingAmount, 0);
  const paymentRatePct =
    totalPayables > 0 ? Number(((totalPaidPayables / totalPayables) * 100).toFixed(1)) : 0;

  const agingReceivables = buildAgingBuckets(openReceivablesInvoices, referenceToday, settings.overdueAlertGraceDays);
  const agingPayables = buildAgingBuckets(openPayablesExpenses, referenceToday, settings.overdueAlertGraceDays);

  // Cash & Liquidity (needed before Aging Performance Indicator safety check)
  const activeAccounts = scopedAccounts.filter((a) => a.status !== "Inactive");
  const availableCashBalance = activeAccounts
    .filter((a) => a.accountType === "Cash")
    .reduce((s, a) => s + (parseMoney(a.currentBalance) ?? 0), 0);
  const totalBankBalance = activeAccounts
    .filter((a) => a.accountType === "Bank")
    .reduce((s, a) => s + (parseMoney(a.currentBalance) ?? 0), 0);

  const netCashFlow = actualCashCollection - actualCashPayment;
  const currentLiquidityPosition = availableCashBalance + totalBankBalance;
  const netReceivablePosition = outstandingReceivables - outstandingPayables;
  const netWorkingLiquidity = currentLiquidityPosition + outstandingReceivables - outstandingPayables;
  const liquidityRatio =
    outstandingPayables > 0
      ? Number(((currentLiquidityPosition + outstandingReceivables) / outstandingPayables).toFixed(2))
      : null;

  // Previous Period Aging Snapshot (using records & confirmed cash settlements dated <= prevCutoffDate)
  const prevRefDateObj = parseIsoDate(resolvedRange.startDate) || parseIsoDate(referenceToday) || new Date();
  prevRefDateObj.setDate(prevRefDateObj.getDate() - 1);
  const prevCutoffDate = toIsoDate(prevRefDateObj);

  const prevCollectedByInvId = new Map<string, number>();
  const prevPaidByExpId = new Map<string, number>();
  allCashTxs.forEach((tx) => {
    if (!isConfirmedCashStatus(tx.status) || tx.date > prevCutoffDate) return;
    if (tx.type === "Collection" && tx.linkedDocumentId) {
      prevCollectedByInvId.set(tx.linkedDocumentId, (prevCollectedByInvId.get(tx.linkedDocumentId) || 0) + tx.amount);
    }
    if (tx.type === "Payment" && tx.linkedDocumentId) {
      prevPaidByExpId.set(tx.linkedDocumentId, (prevPaidByExpId.get(tx.linkedDocumentId) || 0) + tx.amount);
    }
  });

  let prevOutstandingAR = 0;
  let prevOverdueAR = 0;
  validDimInvoices.forEach((inv) => {
    if (inv.date > prevCutoffDate) return;
    const prevCol = prevCollectedByInvId.get(inv.id) || 0;
    const prevRem = Math.max(0, inv.amount - prevCol);
    if (prevRem <= 0) return;
    prevOutstandingAR += prevRem;
    if (diffDays(prevCutoffDate, inv.dueDate || inv.date) - settings.overdueAlertGraceDays > 0) {
      prevOverdueAR += prevRem;
    }
  });

  let prevOutstandingAP = 0;
  let prevOverdueAP = 0;
  validDimExpenses.forEach((exp) => {
    if (exp.date > prevCutoffDate) return;
    const prevPaid = prevPaidByExpId.get(exp.id) || 0;
    const prevRem = Math.max(0, exp.amount - prevPaid);
    if (prevRem <= 0) return;
    prevOutstandingAP += prevRem;
    if (diffDays(prevCutoffDate, exp.dueDate || exp.date) - settings.overdueAlertGraceDays > 0) {
      prevOverdueAP += prevRem;
    }
  });

  const arAgingPerformance = computeAgingPerformanceIndicator({
    domain: "AR",
    currentOverdueAmount: overdueReceivables,
    previousOverdueAmount: prevOverdueAR,
    currentOutstandingAmount: outstandingReceivables,
    previousOutstandingAmount: prevOutstandingAR,
    availableLiquidity: currentLiquidityPosition,
  });

  const apAgingPerformance = computeAgingPerformanceIndicator({
    domain: "AP",
    currentOverdueAmount: overduePayables,
    previousOverdueAmount: prevOverdueAP,
    currentOutstandingAmount: outstandingPayables,
    previousOutstandingAmount: prevOutstandingAP,
    availableLiquidity: currentLiquidityPosition,
  });

  // Profit & Loss
  const plannedProfit = plannedRevenue - plannedExpenses;
  const actualProfitOrLoss = actualRevenue - actualExpenses;
  const profitMarginPct = actualRevenue > 0 ? Number(((actualProfitOrLoss / actualRevenue) * 100).toFixed(2)) : 0;

  // Budgets
  const totalBudgetAllocated = scopedBudgets.reduce((s, b) => s + (parseMoney(b.allocated) ?? 0), 0);
  const totalBudgetActual = scopedBudgets.reduce((s, b) => {
    // Derive live actual expenses matching budget category/project if expenses exist
    const matchedExp = filteredDimExpenses
      .filter(
        (e) =>
          !e.isCancelledOrRejected &&
          safeString(e.category).toLowerCase() === safeString(b.category).toLowerCase() &&
          (!b.project || safeString(e.project).toLowerCase() === safeString(b.project).toLowerCase())
      )
      .reduce((acc, e) => acc + e.amount, 0);
    return s + (matchedExp > 0 ? matchedExp : parseMoney(b.actual) ?? 0);
  }, 0);
  const budgetUtilizationPct =
    totalBudgetAllocated > 0 ? Number(((totalBudgetActual / totalBudgetAllocated) * 100).toFixed(1)) : 0;

  const metrics: FinancialDashboardMetrics = {
    plannedRevenue,
    actualRevenue,
    revenueDifference,
    plannedExpenses,
    actualExpenses,
    expenseDifference,
    plannedCashCollection,
    actualCashCollection,
    collectionDifference,
    collectionAchievementPct,
    outstandingCollectionTarget,
    plannedCashPayment,
    actualCashPayment,
    paymentDifference,
    paymentAchievementPct,
    outstandingPlannedPayments,
    totalReceivables,
    totalCollectedReceivables,
    outstandingReceivables,
    overdueReceivables,
    receivablesDueThisMonth,
    collectionRatePct,
    totalPayables,
    totalPaidPayables,
    outstandingPayables,
    overduePayables,
    payablesDueThisMonth,
    paymentRatePct,
    totalOverdueAmount: overdueReceivables + overduePayables,
    netReceivablePosition,
    arAgingPerformance,
    apAgingPerformance,
    plannedProfit,
    actualProfitOrLoss,
    profitMarginPct,
    availableCashBalance,
    totalBankBalance,
    netCashFlow,
    currentLiquidityPosition,
    netWorkingLiquidity,
    liquidityRatio,
    totalBudgetAllocated,
    budgetUtilizationPct,
  };

  // Pending Approvals & Upcoming Payments Queue
  const pendingApprovalTransactions = roleScopedCashTxs
    .filter((tx) => isPendingCashStatus(tx.status))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const upcomingScheduledPayments: ComputedFinancialState["upcomingScheduledPayments"] = [
    ...allRolePaymentPlans
      .filter((pp) => pp.approvalStatus === "Approved" && pp.expectedDate >= referenceToday)
      .map((pp) => ({
        id: pp.id,
        source: "Payment Plan" as const,
        reference: pp.planNumber,
        supplierOrPayee: pp.supplierOrPayee,
        project: pp.project,
        category: pp.expenseCategory,
        dueDate: pp.expectedDate,
        amount: pp.plannedAmount,
        status: pp.approvalStatus,
      })),
    ...openPayablesExpenses
      .filter((ex) => !ex.isOverdue)
      .map((ex) => ({
        id: ex.id,
        source: "Payable Bill" as const,
        reference: ex.referenceNo || ex.billNumber || ex.id,
        supplierOrPayee: ex.normalizedSupplier,
        project: ex.project,
        category: ex.normalizedCategory,
        dueDate: ex.dueDate || referenceToday,
        amount: ex.outstandingAmount,
        status: ex.normalizedStatus,
      })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // 8. Build Time Buckets for the 9 Interactive Charts
  const bucketKeys: string[] = [];
  if (resolvedRange.granularity === "day") {
    const startObj = parseIsoDate(resolvedRange.startDate) || new Date();
    const endObj = parseIsoDate(resolvedRange.endDate) || new Date();
    const cur = new Date(startObj);
    let guard = 0;
    while (cur <= endObj && guard < 46) {
      bucketKeys.push(toIsoDate(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
  } else {
    bucketKeys.push(...resolvedRange.months);
  }

  const bucketForDate = (isoDate: string): string =>
    resolvedRange.granularity === "day" ? isoDate.slice(0, 10) : isoDate.slice(0, 7);

  const revenuePlanVsActual: ComputedFinancialState["charts"]["revenuePlanVsActual"] = [];
  const expensePlanVsActual: ComputedFinancialState["charts"]["expensePlanVsActual"] = [];
  const collectionPlanVsActual: ComputedFinancialState["charts"]["collectionPlanVsActual"] = [];
  const paymentPlanVsActual: ComputedFinancialState["charts"]["paymentPlanVsActual"] = [];
  const arTrends: ComputedFinancialState["charts"]["arTrends"] = [];
  const apTrends: ComputedFinancialState["charts"]["apTrends"] = [];
  const profitLossTrends: ComputedFinancialState["charts"]["profitLossTrends"] = [];
  const cashFlowTrends: ComputedFinancialState["charts"]["cashFlowTrends"] = [];

  let cumulativeNetCash = 0;
  const daysInMonthCache = new Map<string, number>();
  const getDaysInMonth = (ym: string) => {
    if (daysInMonthCache.has(ym)) return daysInMonthCache.get(ym)!;
    const [yy, mm] = ym.split("-").map(Number);
    const days = new Date(yy, mm, 0).getDate() || 30;
    daysInMonthCache.set(ym, days);
    return days;
  };

  bucketKeys.forEach((bKey) => {
    const label =
      resolvedRange.granularity === "day" ? bKey.slice(5) : bKey; // MM-DD for daily, YYYY-MM for monthly

    const invInBucket = scopedInvoices.filter((i) => !i.isCancelledOrRejected && bucketForDate(i.date) === bKey);
    const expInBucket = scopedExpenses.filter((e) => !e.isCancelledOrRejected && bucketForDate(e.date) === bKey);
    const colInBucket = scopedCashTransactions.filter(
      (tx) => tx.type === "Collection" && isConfirmedCashStatus(tx.status) && bucketForDate(tx.date) === bKey
    );
    const payInBucket = scopedCashTransactions.filter(
      (tx) => tx.type === "Payment" && isConfirmedCashStatus(tx.status) && bucketForDate(tx.date) === bKey
    );

    const monthKey = bKey.slice(0, 7);
    const monthTargets = scopedTargets.filter((t) => safeString(t.period).slice(0, 7) === monthKey);
    const monthColPlans = approvedCollectionPlans.filter((cp) => safeString(cp.month).slice(0, 7) === monthKey);
    const monthPayPlans = approvedPaymentPlans.filter((pp) => safeString(pp.month).slice(0, 7) === monthKey);
    const divisor = resolvedRange.granularity === "day" ? getDaysInMonth(monthKey) : 1;

    const pRev = Math.round(monthTargets.reduce((s, t) => s + (parseMoney(t.plannedRevenue) ?? 0), 0) / divisor);
    const pExp = Math.round(monthTargets.reduce((s, t) => s + (parseMoney(t.plannedExpense) ?? 0), 0) / divisor);
    const pColRaw =
      monthColPlans.length > 0
        ? monthColPlans.reduce((s, cp) => s + (parseMoney(cp.plannedAmount) ?? 0), 0)
        : monthTargets.reduce((s, t) => s + (parseMoney(t.plannedCollection) ?? 0), 0);
    const pPayRaw =
      monthPayPlans.length > 0
        ? monthPayPlans.reduce((s, pp) => s + (parseMoney(pp.plannedAmount) ?? 0), 0)
        : monthTargets.reduce((s, t) => s + (parseMoney(t.plannedPayment) ?? 0), 0);
    const pCol = Math.round(pColRaw / divisor);
    const pPay = Math.round(pPayRaw / divisor);

    const aRev = invInBucket.reduce((s, i) => s + i.amount, 0);
    const aExp = expInBucket.reduce((s, e) => s + e.amount, 0);
    const aCol = colInBucket.reduce((s, tx) => s + tx.amount, 0);
    const aPay = payInBucket.reduce((s, tx) => s + tx.amount, 0);

    const bucketArOut = invInBucket.reduce((s, i) => s + i.outstandingAmount, 0);
    const bucketArOverdue = invInBucket.filter((i) => i.isOverdue).reduce((s, i) => s + i.outstandingAmount, 0);
    const bucketApOut = expInBucket.reduce((s, e) => s + e.outstandingAmount, 0);
    const bucketApOverdue = expInBucket.filter((e) => e.isOverdue).reduce((s, e) => s + e.outstandingAmount, 0);

    const net = aCol - aPay;
    cumulativeNetCash += net;

    revenuePlanVsActual.push({ periodLabel: label, plannedRevenue: pRev, actualRevenue: aRev });
    expensePlanVsActual.push({ periodLabel: label, plannedExpenses: pExp, actualExpenses: aExp });
    collectionPlanVsActual.push({ periodLabel: label, plannedCollection: pCol, actualCollection: aCol });
    paymentPlanVsActual.push({ periodLabel: label, plannedPayment: pPay, actualPayment: aPay });
    arTrends.push({
      periodLabel: label,
      billedRevenue: aRev,
      collected: aCol,
      outstandingAR: bucketArOut,
      overdueAR: bucketArOverdue,
    });
    apTrends.push({
      periodLabel: label,
      incurredExpenses: aExp,
      paid: aPay,
      outstandingAP: bucketApOut,
      overdueAP: bucketApOverdue,
    });
    profitLossTrends.push({
      periodLabel: label,
      plannedProfit: pRev - pExp,
      actualProfit: aRev - aExp,
    });
    cashFlowTrends.push({
      periodLabel: label,
      cashInflow: aCol,
      cashOutflow: aPay,
      netCashFlow: net,
      cumulativeNetCashFlow: cumulativeNetCash,
    });
  });

  // Chart 9: Budget vs Actual Performance (grouped by Category/Project)
  const budgetVsActual: ComputedFinancialState["charts"]["budgetVsActual"] = scopedBudgets.map((b) => {
    const matchedExpensesSum = filteredDimExpenses
      .filter(
        (e) =>
          !e.isCancelledOrRejected &&
          safeString(e.category).toLowerCase() === safeString(b.category).toLowerCase() &&
          (!b.project || safeString(e.project).toLowerCase() === safeString(b.project).toLowerCase())
      )
      .reduce((sum, e) => sum + e.amount, 0);
    const allocated = parseMoney(b.allocated) ?? 0;
    const committed = parseMoney(b.committed) ?? 0;
    const actual = matchedExpensesSum > 0 ? matchedExpensesSum : parseMoney(b.actual) ?? 0;
    return {
      name: b.project ? `${b.category} (${b.project.slice(0, 14)})` : b.category,
      allocated,
      committed,
      actual,
      remaining: Math.max(0, allocated - actual),
    };
  });

  // 9. Critical Financial Alerts Evaluation
  const alerts: FinancialAlertItem[] = evaluateFinancialAlerts({
    metrics,
    budgets: scopedBudgets,
    accounts: scopedAccounts,
    overdueInvoicesCount: openReceivablesInvoices.filter((i) => i.isOverdue).length,
    overdueExpensesCount: openPayablesExpenses.filter((e) => e.isOverdue).length,
    settings,
    referenceToday,
    expenses: filteredDimExpenses,
  });

  return {
    permissions,
    resolvedRange,
    assignedProjects,
    settings,
    filterOptions: {
      projects: Array.from(projectSet).sort(),
      departments: Array.from(deptSet).sort(),
      customers: Array.from(customerSet).sort(),
      suppliers: Array.from(supplierSet).sort(),
      categories: Array.from(categorySet).sort(),
      statuses: Array.from(statusSet).sort(),
    },
    scopedInvoices,
    scopedExpenses,
    allDimInvoices: filteredDimInvoices,
    allDimExpenses: filteredDimExpenses,
    scopedCashTransactions,
    allRoleCashTransactions: roleScopedCashTxs,
    scopedBudgets,
    scopedTargets,
    scopedCollectionPlans,
    scopedPaymentPlans,
    allRoleCollectionPlans,
    allRolePaymentPlans,
    pendingApprovalTransactions,
    upcomingScheduledPayments,
    scopedAccounts,
    openReceivablesInvoices,
    openPayablesExpenses,
    agingReceivables,
    agingPayables,
    metrics,
    charts: {
      revenuePlanVsActual,
      expensePlanVsActual,
      collectionPlanVsActual,
      paymentPlanVsActual,
      arTrends,
      apTrends,
      profitLossTrends,
      cashFlowTrends,
      budgetVsActual,
    },
    alerts,
    referenceToday,
  };
}

export function evaluateFinancialAlerts(params: {
  metrics: FinancialDashboardMetrics;
  budgets: FinancialBudgetRecord[];
  accounts: FinancialAccount[];
  overdueInvoicesCount: number;
  overdueExpensesCount: number;
  settings: FinancialSettingsConfig;
  referenceToday: string;
  expenses: NormalizedExpense[];
}): FinancialAlertItem[] {
  const { metrics, budgets, accounts, overdueInvoicesCount, overdueExpensesCount, settings, referenceToday, expenses } = params;
  const alerts: FinancialAlertItem[] = [];

  if (!settings.enableCriticalAlerts) return alerts;

  if (metrics.overdueReceivables > 0) {
    alerts.push({
      id: `FIN-ALERT-AR-${overdueInvoicesCount}-${Math.round(metrics.overdueReceivables)}`,
      title: `Overdue Receivables: ${overdueInvoicesCount} Invoice(s)`,
      titleAm: `ጊዜው ያለፈበት ተሰብሳቢ ሂሳብ (${overdueInvoicesCount} ደረሰኞች)`,
      description: `Total overdue client receivables reached ETB ${metrics.overdueReceivables.toLocaleString()}. Immediate collection follow-up required.`,
      descriptionAm: `ጊዜው ያለፈበት ከደንበኞች የሚሰበሰብ ሂሳብ ETB ${metrics.overdueReceivables.toLocaleString()} ደርሷል። አስቸኳይ ክትትል ያስፈልጋል።`,
      severity: "CRITICAL",
      moduleTarget: "aging-receivables",
      amountEtb: metrics.overdueReceivables,
      timestamp: referenceToday,
    });
  }

  if (metrics.overduePayables > 0) {
    alerts.push({
      id: `FIN-ALERT-AP-${overdueExpensesCount}-${Math.round(metrics.overduePayables)}`,
      title: `Overdue Supplier Payables: ${overdueExpensesCount} Bill(s)`,
      titleAm: `ጊዜው ያለፈበት የሚከፈል ሂሳብ (${overdueExpensesCount} ክፍያዎች)`,
      description: `Outstanding overdue vendor bills total ETB ${metrics.overduePayables.toLocaleString()}. Schedule disbursement to protect supplier credit.`,
      descriptionAm: `ጊዜው ያለፈበት ለአቅራቢዎች የሚከፈል ሂሳብ ETB ${metrics.overduePayables.toLocaleString()} ደርሷል።`,
      severity: "CRITICAL",
      moduleTarget: "aging-payables",
      amountEtb: metrics.overduePayables,
      timestamp: referenceToday,
    });
  }

  if (accounts.length > 0 && metrics.currentLiquidityPosition < settings.lowCashAlertThresholdEtb) {
    alerts.push({
      id: `FIN-ALERT-LIQ-${Math.round(metrics.currentLiquidityPosition)}`,
      title: "Low Cash & Bank Liquidity Alert",
      titleAm: "ዝቅተኛ የጥሬ ገንዘብ እና የባንክ ክምችት ማስጠንቀቂያ",
      description: `Combined Cash & Bank balance (ETB ${metrics.currentLiquidityPosition.toLocaleString()}) is below configured minimum threshold (ETB ${settings.lowCashAlertThresholdEtb.toLocaleString()}).`,
      descriptionAm: `አጠቃላይ የጥሬ ገንዘብና የባንክ ቀሪ ሂሳብ (ETB ${metrics.currentLiquidityPosition.toLocaleString()}) ከተቀመጠው ዝቅተኛ ወሰን በታች ወርዷል።`,
      severity: "CRITICAL",
      moduleTarget: "liquidity-management",
      amountEtb: metrics.currentLiquidityPosition,
      timestamp: referenceToday,
    });
  }

  budgets.forEach((b) => {
    const matchedExp = expenses
      .filter(
        (e) =>
          !e.isCancelledOrRejected &&
          safeString(e.category).toLowerCase() === safeString(b.category).toLowerCase() &&
          (!b.project || safeString(e.project).toLowerCase() === safeString(b.project).toLowerCase())
      )
      .reduce((s, e) => s + e.amount, 0);
    const actual = matchedExp > 0 ? matchedExp : parseMoney(b.actual) ?? 0;
    const allocated = parseMoney(b.allocated) ?? 0;
    if (allocated > 0 && (actual / allocated) * 100 >= settings.budgetOverrunAlertPct) {
      const pct = ((actual / allocated) * 100).toFixed(1);
      alerts.push({
        id: `FIN-ALERT-BGT-${b.id}-${Math.round(actual)}`,
        title: `Budget Threshold Exceeded: ${b.category} (${b.project})`,
        titleAm: `የበጀት ወሰን አልፏል: ${b.category} (${b.project})`,
        description: `Actual spend (ETB ${actual.toLocaleString()}) reached ${pct}% of allocated budget (ETB ${allocated.toLocaleString()}).`,
        descriptionAm: `ትክክለኛው ወጪ (ETB ${actual.toLocaleString()}) ከተመደበው በጀት ${pct}% ደርሷል።`,
        severity: actual > allocated ? "CRITICAL" : "WARNING",
        moduleTarget: "budget-management",
        project: b.project,
        amountEtb: actual,
        timestamp: referenceToday,
      });
    }
  });

  if (metrics.netCashFlow < 0) {
    alerts.push({
      id: `FIN-ALERT-NCF-${Math.round(metrics.netCashFlow)}`,
      title: "Negative Operating Net Cash Flow",
      titleAm: "አሉታዊ የተጣራ የጥሬ ገንዘብ ፍሰት",
      description: `Cash payments exceeded cash collections by ETB ${Math.abs(metrics.netCashFlow).toLocaleString()} in the selected period.`,
      descriptionAm: `በተመረጠው ወቅት የጥሬ ገንዘብ ወጪ ከገቢ በ ETB ${Math.abs(metrics.netCashFlow).toLocaleString()} በልጧል።`,
      severity: "WARNING",
      moduleTarget: "cash-flow",
      amountEtb: metrics.netCashFlow,
      timestamp: referenceToday,
    });
  }

  return alerts;
}

// ============================================================================
// VALIDATION, DUPLICATE GUARD & TRANSACTIONAL PERSISTENCE COORDINATORS
// ============================================================================

export function validateCashTransactionCandidate(params: {
  type: "Collection" | "Payment";
  amount: number;
  account?: FinancialAccount;
  counterparty?: string;
  project?: string;
  referenceNo?: string;
  receiptNumber?: string;
  paymentVoucherNumber?: string;
  bankReferenceNumber?: string;
  linkedInvoice?: FinancialInvoiceRecord;
  linkedExpense?: Expense;
  existingTransactions?: CashTransactionRecord[];
  isAuthorizedAdjustment?: boolean;
  adjustmentReason?: string;
  actorRole?: string;
}): { valid: boolean; error?: string } {
  if (!params.account || params.account.status === "Inactive") {
    return { valid: false, error: "An active Cash or Bank account is required." };
  }
  if (!safeString(params.counterparty)) {
    return { valid: false, error: params.type === "Collection" ? "Customer / Payer name is required." : "Supplier / Payee name is required." };
  }
  if (!safeString(params.project)) {
    return { valid: false, error: "Project name is required." };
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    return { valid: false, error: "Transaction amount must be greater than zero." };
  }

  const activeTxs = (params.existingTransactions || []).filter(
    (t) => !isReversedOrRejectedStatus(t.status)
  );

  const checkDup = (val: string | undefined, getter: (t: CashTransactionRecord) => string | undefined, label: string) => {
    const clean = safeString(val).trim().toLowerCase();
    if (!clean) return null;
    const hit = activeTxs.find((t) => safeString(getter(t)).trim().toLowerCase() === clean);
    return hit ? `Duplicate ${label} "${val}" already exists (${hit.referenceNo}).` : null;
  };

  const dupRef = checkDup(params.referenceNo, (t) => t.referenceNo, "Transaction Reference");
  if (dupRef) return { valid: false, error: dupRef };

  if (params.type === "Collection") {
    const dupRcpt = checkDup(params.receiptNumber, (t) => t.receiptNumber, "Receipt Number");
    if (dupRcpt) return { valid: false, error: dupRcpt };
  } else {
    const dupVch = checkDup(params.paymentVoucherNumber, (t) => t.paymentVoucherNumber, "Payment Voucher Number");
    if (dupVch) return { valid: false, error: dupVch };
  }

  const dupBank = checkDup(params.bankReferenceNumber, (t) => t.bankReferenceNumber, "Bank Reference Number");
  if (dupBank) return { valid: false, error: dupBank };

  const perms = resolveUserFinancePermissions(params.actorRole);
  const canOverrideOverbalance =
    Boolean(params.isAuthorizedAdjustment) &&
    Boolean(safeString(params.adjustmentReason)) &&
    (perms.isFinanceManager || perms.isDirector);

  if (params.type === "Collection" && params.linkedInvoice) {
    const alreadyPaid = parseMoney(params.linkedInvoice.paidAmount) ?? 0;
    const openBalance = Math.max(0, params.linkedInvoice.amount - alreadyPaid);
    if (params.amount > openBalance + 0.01 && !canOverrideOverbalance) {
      return {
        valid: false,
        error: `Collection amount (ETB ${params.amount.toLocaleString()}) exceeds open invoice balance (ETB ${openBalance.toLocaleString()}).`,
      };
    }
  }

  if (params.type === "Payment" && params.linkedExpense) {
    const alreadyPaid = parseMoney(params.linkedExpense.paidAmount) ?? 0;
    const openBalance = Math.max(0, params.linkedExpense.amount - alreadyPaid);
    if (params.amount > openBalance + 0.01 && !canOverrideOverbalance) {
      return {
        valid: false,
        error: `Payment amount (ETB ${params.amount.toLocaleString()}) exceeds open payable balance (ETB ${openBalance.toLocaleString()}).`,
      };
    }
  }

  return { valid: true };
}

export async function recordCashCollection(params: {
  tx: Omit<CashTransactionRecord, "id" | "referenceNo" | "type" | "createdAt" | "updatedAt"> & {
    referenceNo?: string;
  };
  targetAccount?: FinancialAccount;
  linkedInvoice?: FinancialInvoiceRecord;
  existingTransactions?: CashTransactionRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.isDirector) {
    throw new Error("Role does not have permission to record cash collections.");
  }

  const receiptNo = params.tx.receiptNumber || generateFinancialRef("RCP");
  const validation = validateCashTransactionCandidate({
    type: "Collection",
    amount: params.tx.amount,
    account: params.targetAccount,
    counterparty: params.tx.counterparty,
    project: params.tx.project,
    referenceNo: params.tx.referenceNo,
    receiptNumber: receiptNo,
    bankReferenceNumber: params.tx.bankReferenceNumber,
    linkedInvoice: params.linkedInvoice,
    existingTransactions: params.existingTransactions,
    isAuthorizedAdjustment: params.tx.isAuthorizedAdjustment,
    adjustmentReason: params.tx.adjustmentReason,
    actorRole: params.actorRole,
  });
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid cash collection transaction.");
  }

  const nowIso = new Date().toISOString();
  const id = `CTX-COL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Accountant submits for verification; Finance Manager/Director can confirm immediately or submit as pending
  const requestedConfirmed = isConfirmedCashStatus(params.tx.status);
  const resolvedStatus =
    requestedConfirmed && perms.canVerifyCollections
      ? params.tx.status === "Posted"
        ? "Posted"
        : "Verified & Confirmed"
      : isPendingCashStatus(params.tx.status)
      ? params.tx.status
      : "Pending Verification";

  const willAffectBalance = isConfirmedCashStatus(resolvedStatus);
  const history: CashTransactionApprovalEntry[] = [
    {
      timestamp: nowIso,
      action: willAffectBalance ? "Verified" : "Submitted",
      actorName: params.actorName,
      actorRole: params.actorRole,
      notes: willAffectBalance ? "Recorded and confirmed directly." : "Submitted for Finance Manager verification.",
    },
  ];

  const prevCollected = params.linkedInvoice ? parseMoney(params.linkedInvoice.paidAmount) ?? 0 : 0;
  const openBefore = params.linkedInvoice ? Math.max(0, params.linkedInvoice.amount - prevCollected) : params.tx.amount;
  const remainingAfter = Math.max(0, openBefore - (willAffectBalance ? params.tx.amount : 0));

  const fullTx: CashTransactionRecord = {
    ...params.tx,
    id,
    referenceNo: params.tx.referenceNo || generateFinancialRef("COL"),
    receiptNumber: receiptNo,
    invoiceNumber: params.tx.invoiceNumber || params.linkedInvoice?.invoiceNumber || params.tx.linkedReferenceNo,
    contractNumber: params.tx.contractNumber || params.linkedInvoice?.contractNumber,
    expectedAmount: params.tx.expectedAmount ?? openBefore,
    previouslyPaidAmount: params.tx.previouslyPaidAmount ?? prevCollected,
    remainingBalanceAfter: remainingAfter,
    recordedBy: params.tx.recordedBy || params.actorName,
    verifiedBy: willAffectBalance ? params.actorName : undefined,
    verifiedAt: willAffectBalance ? nowIso : undefined,
    type: "Collection",
    status: resolvedStatus,
    approvalHistory: [...(params.tx.approvalHistory || []), ...history],
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.applyCashLedgerAtomic({
    tx: fullTx,
    account: willAffectBalance ? params.targetAccount : undefined,
    accountDelta: willAffectBalance ? fullTx.amount : 0,
    linkedInvoice: willAffectBalance ? params.linkedInvoice : undefined,
    invoicePaidDelta: willAffectBalance ? fullTx.amount : 0,
    allowAuthorizedAdjustment: Boolean(params.tx.isAuthorizedAdjustment),
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: willAffectBalance ? "Verified Cash Collection" : "Submit Cash Collection",
    category: "Finance",
    severity: "INFO",
    details: `${willAffectBalance ? "Confirmed" : "Submitted"} Cash Collection ${fullTx.referenceNo} (${fullTx.receiptNumber}) of ETB ${fullTx.amount.toLocaleString()} from ${fullTx.counterparty} into ${fullTx.accountName}.`,
  });

  return fullTx;
}

export async function recordCashPayment(params: {
  tx: Omit<CashTransactionRecord, "id" | "referenceNo" | "type" | "createdAt" | "updatedAt"> & {
    referenceNo?: string;
  };
  sourceAccount?: FinancialAccount;
  linkedExpense?: Expense;
  existingTransactions?: CashTransactionRecord[];
  directorApprovalThresholdEtb?: number;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.isDirector) {
    throw new Error("Role does not have permission to record cash payments.");
  }

  const voucherNo = params.tx.paymentVoucherNumber || generateFinancialRef("PVC");
  const validation = validateCashTransactionCandidate({
    type: "Payment",
    amount: params.tx.amount,
    account: params.sourceAccount,
    counterparty: params.tx.counterparty,
    project: params.tx.project,
    referenceNo: params.tx.referenceNo,
    paymentVoucherNumber: voucherNo,
    bankReferenceNumber: params.tx.bankReferenceNumber,
    linkedExpense: params.linkedExpense,
    existingTransactions: params.existingTransactions,
    isAuthorizedAdjustment: params.tx.isAuthorizedAdjustment,
    adjustmentReason: params.tx.adjustmentReason,
    actorRole: params.actorRole,
  });
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid cash payment transaction.");
  }

  const nowIso = new Date().toISOString();
  const id = `CTX-PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const threshold = params.directorApprovalThresholdEtb ?? DEFAULT_FINANCIAL_SETTINGS.requireDirectorApprovalAboveEtb;
  const requiresDirectorApproval = params.tx.amount > threshold;

  let resolvedStatus: string = "Pending Approval";
  const requestedConfirmed = isConfirmedCashStatus(params.tx.status);

  if (requiresDirectorApproval) {
    if (requestedConfirmed && perms.canApproveHighValuePayments) {
      resolvedStatus = params.tx.status === "Posted" ? "Posted" : "Confirmed & Paid";
    } else {
      resolvedStatus = "Director Approval Required";
    }
  } else {
    if (requestedConfirmed && perms.canApproveStandardPayments) {
      resolvedStatus = params.tx.status === "Posted" ? "Posted" : "Confirmed & Paid";
    } else {
      resolvedStatus = isPendingCashStatus(params.tx.status) ? params.tx.status : "Pending Approval";
    }
  }

  const willAffectBalance = isConfirmedCashStatus(resolvedStatus);
  const history: CashTransactionApprovalEntry[] = [
    {
      timestamp: nowIso,
      action: willAffectBalance ? (requiresDirectorApproval ? "Director Approved" : "Approved") : "Submitted",
      actorName: params.actorName,
      actorRole: params.actorRole,
      notes: willAffectBalance
        ? "Payment authorized and disbursed."
        : requiresDirectorApproval
        ? `Exceeds ETB ${threshold.toLocaleString()} threshold — Director approval required.`
        : "Submitted for Finance Manager approval.",
    },
  ];

  const prevPaid = params.linkedExpense ? parseMoney(params.linkedExpense.paidAmount) ?? 0 : 0;
  const openBefore = params.linkedExpense ? Math.max(0, params.linkedExpense.amount - prevPaid) : params.tx.amount;
  const remainingAfter = Math.max(0, openBefore - (willAffectBalance ? params.tx.amount : 0));

  const fullTx: CashTransactionRecord = {
    ...params.tx,
    id,
    referenceNo: params.tx.referenceNo || generateFinancialRef("PAY"),
    paymentVoucherNumber: voucherNo,
    invoiceNumber: params.tx.invoiceNumber || params.linkedExpense?.billNumber || params.linkedExpense?.referenceNo || params.tx.linkedReferenceNo,
    expectedAmount: params.tx.expectedAmount ?? openBefore,
    previouslyPaidAmount: params.tx.previouslyPaidAmount ?? prevPaid,
    remainingBalanceAfter: remainingAfter,
    recordedBy: params.tx.recordedBy || params.actorName,
    approvedBy: willAffectBalance ? params.actorName : undefined,
    approvedAt: willAffectBalance ? nowIso : undefined,
    requiresDirectorApproval,
    type: "Payment",
    status: resolvedStatus,
    approvalHistory: [...(params.tx.approvalHistory || []), ...history],
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.applyCashLedgerAtomic({
    tx: fullTx,
    account: willAffectBalance ? params.sourceAccount : undefined,
    accountDelta: willAffectBalance ? -fullTx.amount : 0,
    linkedExpense: willAffectBalance ? params.linkedExpense : undefined,
    expensePaidDelta: willAffectBalance ? fullTx.amount : 0,
    allowAuthorizedAdjustment: Boolean(params.tx.isAuthorizedAdjustment),
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: willAffectBalance ? "Approved Cash Payment" : "Submit Cash Payment",
    category: "Finance",
    severity: requiresDirectorApproval ? "WARNING" : "INFO",
    details: `${resolvedStatus}: Cash Payment ${fullTx.referenceNo} (${fullTx.paymentVoucherNumber}) of ETB ${fullTx.amount.toLocaleString()} to ${fullTx.counterparty} from ${fullTx.accountName}.`,
  });

  return fullTx;
}

export async function verifyAndConfirmCollection(params: {
  tx: CashTransactionRecord;
  targetAccount?: FinancialAccount;
  linkedInvoice?: FinancialInvoiceRecord;
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<CashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canVerifyCollections) {
    throw new Error("Only Finance Manager or Director can verify and confirm cash collections.");
  }
  if (params.tx.type !== "Collection") {
    throw new Error("Transaction is not a Cash Collection.");
  }
  if (isConfirmedCashStatus(params.tx.status)) {
    throw new Error("Collection is already verified and confirmed.");
  }
  if (isReversedOrRejectedStatus(params.tx.status)) {
    throw new Error("Cannot verify a rejected or reversed transaction.");
  }
  if (params.linkedInvoice) {
    const alreadyPaid = parseMoney(params.linkedInvoice.paidAmount) ?? 0;
    const openBalance = Math.max(0, params.linkedInvoice.amount - alreadyPaid);
    if (params.tx.amount > openBalance + 0.01) {
      throw new Error(`Cannot confirm collection: amount exceeds open invoice balance (ETB ${openBalance.toLocaleString()}).`);
    }
  }

  const nowIso = new Date().toISOString();
  const updatedTx: CashTransactionRecord = {
    ...params.tx,
    status: "Verified & Confirmed",
    verifiedBy: params.actorName,
    verifiedAt: nowIso,
    updatedAt: nowIso,
    approvalHistory: [
      ...(params.tx.approvalHistory || []),
      {
        timestamp: nowIso,
        action: "Verified",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.notes || "Verified receipt and credited cash/bank balance.",
      },
    ],
  };

  await DbService.applyCashLedgerAtomic({
    tx: updatedTx,
    account: params.targetAccount,
    accountDelta: updatedTx.amount,
    linkedInvoice: params.linkedInvoice,
    invoicePaidDelta: updatedTx.amount,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Verify & Confirm Cash Collection",
    category: "Finance",
    severity: "INFO",
    details: `Verified collection ${updatedTx.referenceNo} (${updatedTx.receiptNumber || "N/A"}) for ETB ${updatedTx.amount.toLocaleString()}. Credited ${updatedTx.accountName}.`,
  });

  return updatedTx;
}

export async function approveAndConfirmPayment(params: {
  tx: CashTransactionRecord;
  sourceAccount?: FinancialAccount;
  linkedExpense?: Expense;
  directorApprovalThresholdEtb?: number;
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<CashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  const threshold = params.directorApprovalThresholdEtb ?? DEFAULT_FINANCIAL_SETTINGS.requireDirectorApprovalAboveEtb;
  const needsDirector = params.tx.requiresDirectorApproval || params.tx.amount > threshold;

  if (params.tx.type !== "Payment") {
    throw new Error("Transaction is not a Cash Payment.");
  }
  if (isConfirmedCashStatus(params.tx.status)) {
    throw new Error("Payment is already confirmed and paid.");
  }
  if (isReversedOrRejectedStatus(params.tx.status)) {
    throw new Error("Cannot approve a rejected or reversed payment.");
  }
  if (needsDirector && !perms.canApproveHighValuePayments) {
    throw new Error(`Payment exceeds ETB ${threshold.toLocaleString()} threshold — Director (Head Office / Super Admin) approval is required.`);
  }
  if (!needsDirector && !perms.canApproveStandardPayments && !perms.canApproveHighValuePayments) {
    throw new Error("Only Finance Manager or Director can approve cash payments.");
  }
  if (params.linkedExpense) {
    const alreadyPaid = parseMoney(params.linkedExpense.paidAmount) ?? 0;
    const openBalance = Math.max(0, params.linkedExpense.amount - alreadyPaid);
    if (params.tx.amount > openBalance + 0.01) {
      throw new Error(`Cannot approve payment: amount exceeds open payable balance (ETB ${openBalance.toLocaleString()}).`);
    }
  }

  const nowIso = new Date().toISOString();
  const updatedTx: CashTransactionRecord = {
    ...params.tx,
    status: "Confirmed & Paid",
    approvedBy: params.actorName,
    approvedAt: nowIso,
    updatedAt: nowIso,
    approvalHistory: [
      ...(params.tx.approvalHistory || []),
      {
        timestamp: nowIso,
        action: needsDirector ? "Director Approved" : "Approved",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.notes || "Authorized payment voucher and deducted cash/bank balance.",
      },
    ],
  };

  await DbService.applyCashLedgerAtomic({
    tx: updatedTx,
    account: params.sourceAccount,
    accountDelta: -updatedTx.amount,
    linkedExpense: params.linkedExpense,
    expensePaidDelta: updatedTx.amount,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Approve & Pay Cash Payment",
    category: "Finance",
    severity: needsDirector ? "WARNING" : "INFO",
    details: `Approved payment ${updatedTx.referenceNo} (${updatedTx.paymentVoucherNumber || "N/A"}) for ETB ${updatedTx.amount.toLocaleString()} to ${updatedTx.counterparty}. Deducted ${updatedTx.accountName}.`,
  });

  return updatedTx;
}

export async function rejectCashTransaction(params: {
  tx: CashTransactionRecord;
  reason: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canVerifyCollections && !perms.canApproveStandardPayments && !perms.canApproveHighValuePayments) {
    throw new Error("Role cannot reject cash transactions.");
  }
  if (isConfirmedCashStatus(params.tx.status)) {
    throw new Error("Confirmed transactions cannot be rejected directly; use Reversal instead.");
  }

  const nowIso = new Date().toISOString();
  const updatedTx: CashTransactionRecord = {
    ...params.tx,
    status: "Rejected",
    rejectedBy: params.actorName,
    rejectedReason: params.reason.trim() || "Rejected during financial review",
    updatedAt: nowIso,
    approvalHistory: [
      ...(params.tx.approvalHistory || []),
      {
        timestamp: nowIso,
        action: "Rejected",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.reason.trim() || "Rejected during financial review",
      },
    ],
  };

  await DbService.saveCashTransaction(updatedTx);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Reject Cash ${params.tx.type}`,
    category: "Finance",
    severity: "WARNING",
    details: `Rejected ${params.tx.referenceNo} (ETB ${params.tx.amount.toLocaleString()}). Reason: ${updatedTx.rejectedReason}`,
  });

  return updatedTx;
}

export async function reverseConfirmedCashTransaction(params: {
  tx: CashTransactionRecord;
  account?: FinancialAccount;
  linkedInvoice?: FinancialInvoiceRecord;
  linkedExpense?: Expense;
  reason: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canReverseCashTransactions) {
    throw new Error("Only Finance Manager or Director can reverse confirmed cash transactions.");
  }
  if (!isConfirmedCashStatus(params.tx.status)) {
    throw new Error("Only confirmed transactions can be reversed.");
  }

  const nowIso = new Date().toISOString();
  const updatedTx: CashTransactionRecord = {
    ...params.tx,
    status: "Reversed",
    reversedBy: params.actorName,
    reversedAt: nowIso,
    reversalReason: params.reason.trim() || "Transaction reversed by Finance governance",
    updatedAt: nowIso,
    approvalHistory: [
      ...(params.tx.approvalHistory || []),
      {
        timestamp: nowIso,
        action: "Reversed",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.reason.trim() || "Reversed cash impact and restored open AR/AP balance.",
      },
    ],
  };

  const accountDelta = params.tx.type === "Collection" ? -params.tx.amount : params.tx.type === "Payment" ? params.tx.amount : 0;

  await DbService.applyCashLedgerAtomic({
    tx: updatedTx,
    account: params.account,
    accountDelta,
    linkedInvoice: params.tx.type === "Collection" ? params.linkedInvoice : undefined,
    invoicePaidDelta: params.tx.type === "Collection" && params.linkedInvoice ? -params.tx.amount : 0,
    linkedExpense: params.tx.type === "Payment" ? params.linkedExpense : undefined,
    expensePaidDelta: params.tx.type === "Payment" && params.linkedExpense ? -params.tx.amount : 0,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Reverse Cash ${params.tx.type}`,
    category: "Finance",
    severity: "CRITICAL",
    details: `Reversed confirmed ${params.tx.type} ${params.tx.referenceNo} (ETB ${params.tx.amount.toLocaleString()}). Reason: ${updatedTx.reversalReason}`,
  });

  return updatedTx;
}

export async function transferBetweenCashBankAccounts(params: {
  fromAccount: FinancialAccount;
  toAccount: FinancialAccount;
  amount: number;
  date: string;
  project: string;
  notes?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<CashTransactionRecord> {
  const nowIso = new Date().toISOString();
  const id = `CTX-TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const fullTx: CashTransactionRecord = {
    id,
    referenceNo: generateFinancialRef("TRF"),
    type: "Transfer",
    date: params.date,
    amount: params.amount,
    currency: "ETB",
    accountId: params.fromAccount.id,
    accountName: params.fromAccount.accountName,
    toAccountId: params.toAccount.id,
    toAccountName: params.toAccount.accountName,
    project: params.project || "Corporate Treasury",
    department: "Treasury & Cash",
    category: "Internal Transfer",
    counterparty: params.toAccount.accountName,
    linkedDocumentType: "Direct",
    paymentMethod: "Bank Transfer",
    status: "Posted",
    notes: params.notes || `Transfer from ${params.fromAccount.accountName} to ${params.toAccount.accountName}`,
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveCashTransaction(fullTx);
  await DbService.saveFinancialAccount({
    ...params.fromAccount,
    currentBalance: (parseMoney(params.fromAccount.currentBalance) ?? 0) - params.amount,
    updatedBy: params.actorName,
    updatedAt: nowIso,
  });
  await DbService.saveFinancialAccount({
    ...params.toAccount,
    currentBalance: (parseMoney(params.toAccount.currentBalance) ?? 0) + params.amount,
    updatedBy: params.actorName,
    updatedAt: nowIso,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Cash & Bank Account Transfer",
    category: "Finance",
    severity: "INFO",
    details: `Transferred ETB ${params.amount.toLocaleString()} from ${params.fromAccount.accountName} to ${params.toAccount.accountName} (${fullTx.referenceNo}).`,
  });

  return fullTx;
}

// ============================================================================
// PART 2: DEDICATED CASH COLLECTION & PAYMENT CHARTS (7) & REPORTS (14)
// ============================================================================

export interface CashCollectionPaymentAnalytics {
  collectionKpis: {
    monthlyTarget: number;
    actualCollected: number;
    collectionDifference: number;
    achievementPct: number;
    outstandingTarget: number;
    outstandingReceivables: number;
    overdueCollections: number;
    confirmedCount: number;
    pendingCount: number;
  };
  paymentKpis: {
    monthlyBudget: number;
    actualPaid: number;
    paymentDifference: number;
    achievementPct: number;
    outstandingPlanned: number;
    outstandingPayables: number;
    upcomingPaymentsTotal: number;
    upcomingPaymentsCount: number;
    confirmedCount: number;
    pendingCount: number;
  };
  charts: {
    dailyCollections: { label: string; planned: number; actual: number }[];
    weeklyCollections: { label: string; planned: number; actual: number }[];
    monthlyCollections: { label: string; planned: number; actual: number }[];
    dailyPayments: { label: string; planned: number; actual: number }[];
    weeklyPayments: { label: string; planned: number; actual: number }[];
    monthlyPayments: { label: string; planned: number; actual: number }[];
    plannedVsActualComparison: { label: string; plannedCollection: number; actualCollection: number; plannedPayment: number; actualPayment: number }[];
  };
}

function getIsoWeekKey(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  if (!d) return "W1";
  const dayNum = d.getDate();
  const weekOfMonth = Math.min(5, Math.floor((dayNum - 1) / 7) + 1);
  return `${isoDate.slice(0, 7)} W${weekOfMonth}`;
}

export function buildCashCollectionPaymentAnalytics(state: ComputedFinancialState): CashCollectionPaymentAnalytics {
  const { metrics, scopedCashTransactions, scopedCollectionPlans, scopedPaymentPlans, upcomingScheduledPayments, referenceToday } = state;

  const confirmedCollections = scopedCashTransactions.filter((t) => t.type === "Collection" && isConfirmedCashStatus(t.status));
  const pendingCollections = scopedCashTransactions.filter((t) => t.type === "Collection" && isPendingCashStatus(t.status));
  const confirmedPayments = scopedCashTransactions.filter((t) => t.type === "Payment" && isConfirmedCashStatus(t.status));
  const pendingPayments = scopedCashTransactions.filter((t) => t.type === "Payment" && isPendingCashStatus(t.status));

  // Build 14-day daily window ending on endDate/referenceToday
  const endObj = parseIsoDate(state.resolvedRange.endDate) || parseIsoDate(referenceToday) || new Date();
  const dailyKeys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(endObj);
    dt.setDate(endObj.getDate() - i);
    dailyKeys.push(toIsoDate(dt));
  }

  const dailyCollections = dailyKeys.map((dk) => {
    const actual = confirmedCollections.filter((t) => t.date === dk).reduce((s, t) => s + t.amount, 0);
    const planned = scopedCollectionPlans
      .filter((p) => p.approvalStatus === "Approved" && p.expectedDate === dk)
      .reduce((s, p) => s + (parseMoney(p.plannedAmount) ?? 0), 0);
    return { label: dk.slice(5), planned, actual };
  });

  const dailyPayments = dailyKeys.map((dk) => {
    const actual = confirmedPayments.filter((t) => t.date === dk).reduce((s, t) => s + t.amount, 0);
    const planned = scopedPaymentPlans
      .filter((p) => p.approvalStatus === "Approved" && p.expectedDate === dk)
      .reduce((s, p) => s + (parseMoney(p.plannedAmount) ?? 0), 0);
    return { label: dk.slice(5), planned, actual };
  });

  // Weekly buckets across current months
  const weekSet = new Set<string>();
  const refMonth = referenceToday.slice(0, 7);
  [1, 2, 3, 4].forEach((w) => weekSet.add(`${refMonth} W${w}`));
  confirmedCollections.forEach((t) => weekSet.add(getIsoWeekKey(t.date)));
  confirmedPayments.forEach((t) => weekSet.add(getIsoWeekKey(t.date)));
  const weekKeys = Array.from(weekSet).sort().slice(-6);

  const weeklyCollections = weekKeys.map((wk) => ({
    label: wk.slice(5),
    planned: scopedCollectionPlans
      .filter((p) => p.approvalStatus === "Approved" && getIsoWeekKey(p.expectedDate) === wk)
      .reduce((s, p) => s + (parseMoney(p.plannedAmount) ?? 0), 0),
    actual: confirmedCollections.filter((t) => getIsoWeekKey(t.date) === wk).reduce((s, t) => s + t.amount, 0),
  }));

  const weeklyPayments = weekKeys.map((wk) => ({
    label: wk.slice(5),
    planned: scopedPaymentPlans
      .filter((p) => p.approvalStatus === "Approved" && getIsoWeekKey(p.expectedDate) === wk)
      .reduce((s, p) => s + (parseMoney(p.plannedAmount) ?? 0), 0),
    actual: confirmedPayments.filter((t) => getIsoWeekKey(t.date) === wk).reduce((s, t) => s + t.amount, 0),
  }));

  // 6-month trend ending at referenceToday month
  const refDateObj = parseIsoDate(referenceToday) || new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const mObj = new Date(refDateObj.getFullYear(), refDateObj.getMonth() - i, 1);
    monthKeys.push(`${mObj.getFullYear()}-${String(mObj.getMonth() + 1).padStart(2, "0")}`);
  }

  const allColAllTime = state.scopedCashTransactions.length > 0 ? confirmedCollections : [];
  const monthlyCollections = monthKeys.map((mk) => {
    const plannedFromPlans = state.allRoleCollectionPlans
      .filter((p) => p.approvalStatus === "Approved" && safeString(p.month).slice(0, 7) === mk)
      .reduce((s, p) => s + (parseMoney(p.plannedAmount) ?? 0), 0);
    const plannedFromTargets = state.scopedTargets
      .filter((t) => safeString(t.period).slice(0, 7) === mk)
      .reduce((s, t) => s + (parseMoney(t.plannedCollection) ?? 0), 0);
    return {
      label: mk,
      planned: plannedFromPlans > 0 ? plannedFromPlans : plannedFromTargets,
      actual: allColAllTime.filter((t) => t.date.slice(0, 7) === mk).reduce((s, t) => s + t.amount, 0),
    };
  });

  const monthlyPayments = monthKeys.map((mk) => {
    const plannedFromPlans = state.allRolePaymentPlans
      .filter((p) => p.approvalStatus === "Approved" && safeString(p.month).slice(0, 7) === mk)
      .reduce((s, p) => s + (parseMoney(p.plannedAmount) ?? 0), 0);
    const plannedFromTargets = state.scopedTargets
      .filter((t) => safeString(t.period).slice(0, 7) === mk)
      .reduce((s, t) => s + (parseMoney(t.plannedPayment) ?? 0), 0);
    return {
      label: mk,
      planned: plannedFromPlans > 0 ? plannedFromPlans : plannedFromTargets,
      actual: confirmedPayments.filter((t) => t.date.slice(0, 7) === mk).reduce((s, t) => s + t.amount, 0),
    };
  });

  const plannedVsActualComparison = monthKeys.map((mk, idx) => ({
    label: mk,
    plannedCollection: monthlyCollections[idx].planned,
    actualCollection: monthlyCollections[idx].actual,
    plannedPayment: monthlyPayments[idx].planned,
    actualPayment: monthlyPayments[idx].actual,
  }));

  return {
    collectionKpis: {
      monthlyTarget: metrics.plannedCashCollection,
      actualCollected: metrics.actualCashCollection,
      collectionDifference: metrics.collectionDifference,
      achievementPct: metrics.collectionAchievementPct,
      outstandingTarget: metrics.outstandingCollectionTarget,
      outstandingReceivables: metrics.outstandingReceivables,
      overdueCollections: metrics.overdueReceivables,
      confirmedCount: confirmedCollections.length,
      pendingCount: pendingCollections.length,
    },
    paymentKpis: {
      monthlyBudget: metrics.plannedCashPayment,
      actualPaid: metrics.actualCashPayment,
      paymentDifference: metrics.paymentDifference,
      achievementPct: metrics.paymentAchievementPct,
      outstandingPlanned: metrics.outstandingPlannedPayments,
      outstandingPayables: metrics.outstandingPayables,
      upcomingPaymentsTotal: upcomingScheduledPayments.reduce((s, u) => s + u.amount, 0),
      upcomingPaymentsCount: upcomingScheduledPayments.length,
      confirmedCount: confirmedPayments.length,
      pendingCount: pendingPayments.length,
    },
    charts: {
      dailyCollections,
      weeklyCollections,
      monthlyCollections,
      dailyPayments,
      weeklyPayments,
      monthlyPayments,
      plannedVsActualComparison,
    },
  };
}

export interface GeneratedCashReportDataset {
  id: CashReportTypeId;
  title: string;
  titleAm: string;
  subtitle: string;
  columns: { key: string; label: string; isNumeric?: boolean }[];
  rows: Record<string, any>[];
  summaryTotals: { label: string; value: number | string }[];
}

export function buildCashReportDataset(
  reportType: CashReportTypeId,
  state: ComputedFinancialState,
  referenceTodayInput?: string
): GeneratedCashReportDataset {
  const refToday = referenceTodayInput || state.referenceToday;
  const cur = state.settings.defaultCurrency || "ETB";

  const confirmedCollections = state.scopedCashTransactions.filter(
    (t) => t.type === "Collection" && isConfirmedCashStatus(t.status)
  );
  const confirmedPayments = state.scopedCashTransactions.filter(
    (t) => t.type === "Payment" && isConfirmedCashStatus(t.status)
  );

  const weekStartDt = parseIsoDate(refToday) || new Date();
  weekStartDt.setDate(weekStartDt.getDate() - 6);
  const weekStartIso = toIsoDate(weekStartDt);
  const monthKey = refToday.slice(0, 7);

  const txCols = (isCollection: boolean) => [
    { key: "referenceNo", label: "Tx Ref" },
    { key: isCollection ? "receiptNumber" : "paymentVoucherNumber", label: isCollection ? "Receipt #" : "Voucher #" },
    { key: "date", label: "Date" },
    { key: "project", label: "Project" },
    { key: "counterparty", label: isCollection ? "Customer" : "Supplier / Payee" },
    { key: "category", label: "Category" },
    { key: "paymentMethod", label: "Method" },
    { key: "accountName", label: "Cash / Bank Account" },
    { key: "status", label: "Status" },
    { key: "amount", label: `Amount (${cur})`, isNumeric: true },
  ];

  const mapTxRow = (t: CashTransactionRecord) => ({
    referenceNo: t.referenceNo,
    receiptNumber: t.receiptNumber || "—",
    paymentVoucherNumber: t.paymentVoucherNumber || "—",
    date: t.date,
    project: t.project,
    counterparty: t.counterparty,
    category: t.category,
    paymentMethod: t.paymentMethod,
    accountName: t.accountName,
    status: t.status,
    amount: t.amount,
  });

  switch (reportType) {
    case "daily-cash-collection": {
      const rows = confirmedCollections.filter((t) => t.date === refToday).map(mapTxRow);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return {
        id: reportType,
        title: `1. Daily Cash Collection Report (${refToday})`,
        titleAm: `1. ዕለታዊ የጥሬ ገንዘብ መሰብሰብ ሪፖርት (${refToday})`,
        subtitle: "Verified & confirmed customer collections received today.",
        columns: txCols(true),
        rows,
        summaryTotals: [
          { label: "Transactions", value: rows.length },
          { label: "Total Collected Today", value: total },
        ],
      };
    }
    case "weekly-cash-collection": {
      const rows = confirmedCollections.filter((t) => t.date >= weekStartIso && t.date <= refToday).map(mapTxRow);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return {
        id: reportType,
        title: `2. Weekly Cash Collection Report (${weekStartIso} → ${refToday})`,
        titleAm: "2. ሳምንታዊ የጥሬ ገንዘብ መሰብሰብ ሪፖርት",
        subtitle: "Trailing 7-day confirmed collections across all projects & accounts.",
        columns: txCols(true),
        rows,
        summaryTotals: [
          { label: "Transactions", value: rows.length },
          { label: "Weekly Total Collected", value: total },
        ],
      };
    }
    case "monthly-cash-collection": {
      const rows = confirmedCollections.filter((t) => t.date.startsWith(monthKey)).map(mapTxRow);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return {
        id: reportType,
        title: `3. Monthly Cash Collection Report (${monthKey})`,
        titleAm: `3. ወርሃዊ የጥሬ ገንዘብ መሰብሰብ ሪፖርት (${monthKey})`,
        subtitle: "All confirmed collections posted within the current fiscal month.",
        columns: txCols(true),
        rows,
        summaryTotals: [
          { label: "Transactions", value: rows.length },
          { label: "Monthly Total Collected", value: total },
        ],
      };
    }
    case "daily-cash-payment": {
      const rows = confirmedPayments.filter((t) => t.date === refToday).map(mapTxRow);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return {
        id: reportType,
        title: `4. Daily Cash Payment Report (${refToday})`,
        titleAm: `4. ዕለታዊ የጥሬ ገንዘብ ክፍያ ሪፖርት (${refToday})`,
        subtitle: "Approved & paid disbursements executed today.",
        columns: txCols(false),
        rows,
        summaryTotals: [
          { label: "Payments", value: rows.length },
          { label: "Total Paid Today", value: total },
        ],
      };
    }
    case "weekly-cash-payment": {
      const rows = confirmedPayments.filter((t) => t.date >= weekStartIso && t.date <= refToday).map(mapTxRow);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return {
        id: reportType,
        title: `5. Weekly Cash Payment Report (${weekStartIso} → ${refToday})`,
        titleAm: "5. ሳምንታዊ የጥሬ ገንዘብ ክፍያ ሪፖርት",
        subtitle: "Trailing 7-day confirmed disbursements across all projects & categories.",
        columns: txCols(false),
        rows,
        summaryTotals: [
          { label: "Payments", value: rows.length },
          { label: "Weekly Total Paid", value: total },
        ],
      };
    }
    case "monthly-cash-payment": {
      const rows = confirmedPayments.filter((t) => t.date.startsWith(monthKey)).map(mapTxRow);
      const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
      return {
        id: reportType,
        title: `6. Monthly Cash Payment Report (${monthKey})`,
        titleAm: `6. ወርሃዊ የጥሬ ገንዘብ ክፍያ ሪፖርት (${monthKey})`,
        subtitle: "All confirmed disbursements executed within the current month.",
        columns: txCols(false),
        rows,
        summaryTotals: [
          { label: "Payments", value: rows.length },
          { label: "Monthly Total Paid", value: total },
        ],
      };
    }
    case "project-wise-collection": {
      const map = new Map<string, { project: string; planned: number; actual: number; count: number }>();
      state.scopedCollectionPlans
        .filter((p) => p.approvalStatus === "Approved")
        .forEach((p) => {
          const k = p.project || "Unassigned";
          const prev = map.get(k) || { project: k, planned: 0, actual: 0, count: 0 };
          prev.planned += parseMoney(p.plannedAmount) ?? 0;
          map.set(k, prev);
        });
      confirmedCollections.forEach((t) => {
        const k = t.project || "Unassigned";
        const prev = map.get(k) || { project: k, planned: 0, actual: 0, count: 0 };
        prev.actual += t.amount;
        prev.count += 1;
        map.set(k, prev);
      });
      const rows = Array.from(map.values()).map((r) => ({
        project: r.project,
        txCount: r.count,
        planned: r.planned,
        actual: r.actual,
        variance: r.actual - r.planned,
        achievementPct: r.planned > 0 ? `${((r.actual / r.planned) * 100).toFixed(1)}%` : "0.0%",
      }));
      return {
        id: reportType,
        title: "7. Project-wise Collection Report",
        titleAm: "7. በፕሮጀክት የተከፋፈለ የገንዘብ መሰብሰብ ሪፖርት",
        subtitle: "Collection plan vs confirmed cash receipts aggregated per construction project.",
        columns: [
          { key: "project", label: "Project" },
          { key: "txCount", label: "Receipts", isNumeric: true },
          { key: "planned", label: `Planned (${cur})`, isNumeric: true },
          { key: "actual", label: `Actual (${cur})`, isNumeric: true },
          { key: "variance", label: `Difference (${cur})`, isNumeric: true },
          { key: "achievementPct", label: "Achievement %" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Planned", value: rows.reduce((s, r) => s + r.planned, 0) },
          { label: "Total Collected", value: rows.reduce((s, r) => s + r.actual, 0) },
        ],
      };
    }
    case "project-wise-payment": {
      const map = new Map<string, { project: string; planned: number; actual: number; count: number }>();
      state.scopedPaymentPlans
        .filter((p) => p.approvalStatus === "Approved")
        .forEach((p) => {
          const k = p.project || "Unassigned";
          const prev = map.get(k) || { project: k, planned: 0, actual: 0, count: 0 };
          prev.planned += parseMoney(p.plannedAmount) ?? 0;
          map.set(k, prev);
        });
      confirmedPayments.forEach((t) => {
        const k = t.project || "Unassigned";
        const prev = map.get(k) || { project: k, planned: 0, actual: 0, count: 0 };
        prev.actual += t.amount;
        prev.count += 1;
        map.set(k, prev);
      });
      const rows = Array.from(map.values()).map((r) => ({
        project: r.project,
        txCount: r.count,
        planned: r.planned,
        actual: r.actual,
        variance: r.actual - r.planned,
        achievementPct: r.planned > 0 ? `${((r.actual / r.planned) * 100).toFixed(1)}%` : "0.0%",
      }));
      return {
        id: reportType,
        title: "8. Project-wise Payment Report",
        titleAm: "8. በፕሮጀክት የተከፋፈለ የገንዘብ ክፍያ ሪፖርት",
        subtitle: "Payment budget vs confirmed cash disbursements aggregated per project.",
        columns: [
          { key: "project", label: "Project" },
          { key: "txCount", label: "Vouchers", isNumeric: true },
          { key: "planned", label: `Budget (${cur})`, isNumeric: true },
          { key: "actual", label: `Paid (${cur})`, isNumeric: true },
          { key: "variance", label: `Difference (${cur})`, isNumeric: true },
          { key: "achievementPct", label: "Utilization %" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Planned Budget", value: rows.reduce((s, r) => s + r.planned, 0) },
          { label: "Total Paid", value: rows.reduce((s, r) => s + r.actual, 0) },
        ],
      };
    }
    case "customer-wise-collection": {
      const map = new Map<string, { customer: string; collected: number; outstanding: number; count: number }>();
      confirmedCollections.forEach((t) => {
        const k = t.counterparty || "Client";
        const prev = map.get(k) || { customer: k, collected: 0, outstanding: 0, count: 0 };
        prev.collected += t.amount;
        prev.count += 1;
        map.set(k, prev);
      });
      state.openReceivablesInvoices.forEach((inv) => {
        const k = inv.normalizedClient || "Client";
        const prev = map.get(k) || { customer: k, collected: 0, outstanding: 0, count: 0 };
        prev.outstanding += inv.outstandingAmount;
        map.set(k, prev);
      });
      const rows = Array.from(map.values());
      return {
        id: reportType,
        title: "9. Customer-wise Collection Report",
        titleAm: "9. በደንበኛ የተከፋፈለ የገንዘብ መሰብሰብ ሪፖርት",
        subtitle: "Customer payment totals paired with remaining open Accounts Receivable balances.",
        columns: [
          { key: "customer", label: "Customer" },
          { key: "count", label: "Confirmed Receipts", isNumeric: true },
          { key: "collected", label: `Collected (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Open AR (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Collected", value: rows.reduce((s, r) => s + r.collected, 0) },
          { label: "Total Open AR", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }
    case "supplier-wise-payment": {
      const map = new Map<string, { supplier: string; paid: number; outstanding: number; count: number }>();
      confirmedPayments.forEach((t) => {
        const k = t.counterparty || "Supplier";
        const prev = map.get(k) || { supplier: k, paid: 0, outstanding: 0, count: 0 };
        prev.paid += t.amount;
        prev.count += 1;
        map.set(k, prev);
      });
      state.openPayablesExpenses.forEach((ex) => {
        const k = ex.normalizedSupplier || "Supplier";
        const prev = map.get(k) || { supplier: k, paid: 0, outstanding: 0, count: 0 };
        prev.outstanding += ex.outstandingAmount;
        map.set(k, prev);
      });
      const rows = Array.from(map.values());
      return {
        id: reportType,
        title: "10. Supplier-wise Payment Report",
        titleAm: "10. በአቅራቢ የተከፋፈለ የገንዘብ ክፍያ ሪፖርት",
        subtitle: "Supplier/payee disbursements paired with remaining open Accounts Payable balances.",
        columns: [
          { key: "supplier", label: "Supplier / Payee" },
          { key: "count", label: "Confirmed Vouchers", isNumeric: true },
          { key: "paid", label: `Total Paid (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Open AP (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Paid", value: rows.reduce((s, r) => s + r.paid, 0) },
          { label: "Total Open AP", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }
    case "collection-variance": {
      const rows = state.scopedCollectionPlans.map((cp) => {
        const actualMatched = confirmedCollections
          .filter(
            (t) =>
              t.date.startsWith(safeString(cp.month).slice(0, 7)) &&
              (cp.project === "All Projects" || t.project === cp.project) &&
              (cp.customer === "All Customers" || t.counterparty === cp.customer)
          )
          .reduce((s, t) => s + t.amount, 0);
        const planned = parseMoney(cp.plannedAmount) ?? 0;
        return {
          planNumber: cp.planNumber,
          month: cp.month,
          project: cp.project,
          customer: cp.customer,
          planned,
          actual: actualMatched,
          variance: actualMatched - planned,
          achievementPct: planned > 0 ? `${((actualMatched / planned) * 100).toFixed(1)}%` : "0.0%",
          status: cp.approvalStatus,
        };
      });
      return {
        id: reportType,
        title: "11. Collection Variance Report",
        titleAm: "11. የገንዘብ መሰብሰብ ልዩነት (Variance) ሪፖርት",
        subtitle: "Monthly collection plans compared against actual verified cash collections.",
        columns: [
          { key: "planNumber", label: "Plan #" },
          { key: "month", label: "Month" },
          { key: "project", label: "Project" },
          { key: "customer", label: "Customer" },
          { key: "planned", label: `Planned (${cur})`, isNumeric: true },
          { key: "actual", label: `Actual (${cur})`, isNumeric: true },
          { key: "variance", label: `Difference (${cur})`, isNumeric: true },
          { key: "achievementPct", label: "Achievement %" },
          { key: "status", label: "Plan Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Planned Target", value: state.metrics.plannedCashCollection },
          { label: "Actual Collected", value: state.metrics.actualCashCollection },
          { label: "Net Variance", value: state.metrics.collectionDifference },
        ],
      };
    }
    case "payment-variance": {
      const rows = state.scopedPaymentPlans.map((pp) => {
        const actualMatched = confirmedPayments
          .filter(
            (t) =>
              t.date.startsWith(safeString(pp.month).slice(0, 7)) &&
              (pp.project === "All Projects" || t.project === pp.project) &&
              t.counterparty === pp.supplierOrPayee
          )
          .reduce((s, t) => s + t.amount, 0);
        const planned = parseMoney(pp.plannedAmount) ?? 0;
        return {
          planNumber: pp.planNumber,
          month: pp.month,
          project: pp.project,
          category: pp.expenseCategory,
          supplierOrPayee: pp.supplierOrPayee,
          planned,
          actual: actualMatched,
          variance: actualMatched - planned,
          achievementPct: planned > 0 ? `${((actualMatched / planned) * 100).toFixed(1)}%` : "0.0%",
          status: pp.approvalStatus,
        };
      });
      return {
        id: reportType,
        title: "12. Payment Variance Report",
        titleAm: "12. የገንዘብ ክፍያ ልዩነት (Variance) ሪፖርት",
        subtitle: "Monthly approved payment budgets compared against actual paid disbursements.",
        columns: [
          { key: "planNumber", label: "Plan #" },
          { key: "month", label: "Month" },
          { key: "project", label: "Project" },
          { key: "category", label: "Category" },
          { key: "supplierOrPayee", label: "Supplier / Payee" },
          { key: "planned", label: `Planned (${cur})`, isNumeric: true },
          { key: "actual", label: `Paid (${cur})`, isNumeric: true },
          { key: "variance", label: `Difference (${cur})`, isNumeric: true },
          { key: "achievementPct", label: "Achievement %" },
        ],
        rows,
        summaryTotals: [
          { label: "Planned Budget", value: state.metrics.plannedCashPayment },
          { label: "Actual Paid", value: state.metrics.actualCashPayment },
          { label: "Net Variance", value: state.metrics.paymentDifference },
        ],
      };
    }
    case "outstanding-collection": {
      const rows = state.openReceivablesInvoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        project: inv.project,
        customer: inv.normalizedClient,
        dueDate: inv.dueDate,
        daysOverdue: inv.daysOverdue,
        billed: inv.amount,
        collected: inv.collectedAmount,
        outstanding: inv.outstandingAmount,
        status: inv.status,
      }));
      return {
        id: reportType,
        title: "13. Outstanding Collection Report",
        titleAm: "13. ያልተሰበሰበ ቀሪ ገንዘብ ሪፖርት",
        subtitle: "Open customer invoices with uncollected balances & overdue exposure.",
        columns: [
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "project", label: "Project" },
          { key: "customer", label: "Customer" },
          { key: "dueDate", label: "Due Date" },
          { key: "daysOverdue", label: "Days Past Due", isNumeric: true },
          { key: "billed", label: `Billed (${cur})`, isNumeric: true },
          { key: "collected", label: `Collected (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Open Invoices", value: rows.length },
          { label: "Total Outstanding AR", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }
    case "upcoming-payment": {
      const rows = state.upcomingScheduledPayments.map((u) => ({
        source: u.source,
        reference: u.reference,
        supplierOrPayee: u.supplierOrPayee,
        project: u.project,
        category: u.category,
        dueDate: u.dueDate,
        amount: u.amount,
        status: u.status,
      }));
      return {
        id: reportType,
        title: "14. Upcoming Payment Report",
        titleAm: "14. መጪ የክፍያ መርሃ-ግብር ሪፖርት",
        subtitle: "Approved future payment plans and upcoming supplier payable due dates.",
        columns: [
          { key: "source", label: "Source" },
          { key: "reference", label: "Reference / Plan #" },
          { key: "supplierOrPayee", label: "Supplier / Payee" },
          { key: "project", label: "Project" },
          { key: "category", label: "Expense Category" },
          { key: "dueDate", label: "Expected / Due Date" },
          { key: "amount", label: `Amount (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Upcoming Items", value: rows.length },
          { label: "Total Upcoming Cash Need", value: rows.reduce((s, r) => s + r.amount, 0) },
        ],
      };
    }
  }
}

export function exportRowsToCsv(filenamePrefix: string, rows: Record<string, any>[]): void {
  if (!rows || rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const lines = [
    keys.join(","),
    ...rows.map((r) =>
      keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// PART 3: ACCOUNTS RECEIVABLE & ACCOUNTS PAYABLE REGISTRATION, WORKFLOWS & 12 REPORTS
// ============================================================================

export async function registerReceivable(params: {
  project: string;
  projectId?: string;
  department?: string;
  client: string;
  contractNumber?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotalAmount: number;
  taxAmount?: number;
  receivableCategory: ReceivableCategory | string;
  paymentTerms?: string;
  description?: string;
  supportingDocuments?: SupportingDocMeta[];
  responsibleOfficer?: string;
  existingInvoices?: FinancialInvoiceRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<FinancialInvoiceRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.isDirector) {
    throw new Error("Role does not have permission to register receivables.");
  }

  const cleanInvNo = safeString(params.invoiceNumber).trim();
  if (!cleanInvNo) throw new Error("Invoice Number is required.");
  if (!safeString(params.project).trim()) throw new Error("Project Name is required.");
  if (!safeString(params.client).trim()) throw new Error("Client Name is required.");
  if (!Number.isFinite(params.subtotalAmount) || params.subtotalAmount <= 0) {
    throw new Error("Invoice Amount must be greater than zero.");
  }
  const tax = Math.max(0, Number(params.taxAmount || 0));
  const totalAmount = Number((params.subtotalAmount + tax).toFixed(2));

  const dup = (params.existingInvoices || []).find(
    (inv) =>
      inv.status !== "Cancelled" &&
      inv.status !== "Rejected" &&
      safeString(inv.invoiceNumber).trim().toLowerCase() === cleanInvNo.toLowerCase()
  );
  if (dup) {
    throw new Error(`Duplicate Invoice Number "${cleanInvNo}" already exists (${dup.receivableId || dup.id}).`);
  }

  const nowIso = new Date().toISOString();
  const receivableId = generateFinancialRef("AR");
  const auditEntry: ArApAuditEntry = {
    timestamp: nowIso,
    action: "Registered Receivable",
    actorName: params.actorName,
    actorRole: params.actorRole,
    stage: "Registered",
    notes: `Registered ${params.receivableCategory} receivable for ${params.client} (ETB ${totalAmount.toLocaleString()}).`,
  };

  const record: FinancialInvoiceRecord = {
    id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    receivableId,
    referenceNo: receivableId,
    invoiceNumber: cleanInvNo,
    contractNumber: safeString(params.contractNumber),
    project: safeString(params.project),
    projectId: params.projectId,
    department: safeString(params.department, "Contracting & Billing"),
    category: safeString(params.receivableCategory, "Client Contract Receivables"),
    receivableCategory: safeString(params.receivableCategory, "Client Contract Receivables"),
    client: safeString(params.client),
    clientName: safeString(params.client),
    description: safeString(params.description),
    subtotalAmount: params.subtotalAmount,
    taxAmount: tax,
    amount: totalAmount,
    paidAmount: 0,
    currency: "ETB",
    paymentTerms: safeString(params.paymentTerms, "Net 30"),
    responsibleOfficer: safeString(params.responsibleOfficer, params.actorName),
    supportingDocuments: params.supportingDocuments || [],
    workflowStage: perms.canVerifyCollections ? "Verified" : "Registered",
    verifiedBy: perms.canVerifyCollections ? params.actorName : undefined,
    verifiedAt: perms.canVerifyCollections ? nowIso : undefined,
    isDisputed: false,
    auditHistory: [auditEntry],
    status: perms.canVerifyCollections ? "Approved" : "Pending",
    date: params.invoiceDate,
    dueDate: params.dueDate,
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.addInvoice(record);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Register Receivable (AR)",
    category: "Finance",
    severity: "INFO",
    details: `Registered AR ${receivableId} (${cleanInvNo}) for ${record.client} — ${record.project}, Total ETB ${totalAmount.toLocaleString()}.`,
  });

  return record;
}

export async function advanceReceivableWorkflow(params: {
  invoice: FinancialInvoiceRecord;
  targetStage: "Finance Review" | "Verified";
  notes?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<FinancialInvoiceRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (params.targetStage === "Verified" && !perms.canVerifyCollections) {
    throw new Error("Only Finance Manager or Director can verify Accounts Receivable.");
  }
  if (!perms.canManageTransactions && !perms.canVerifyCollections && !perms.isDirector) {
    throw new Error("Role cannot advance receivable workflow.");
  }

  const nowIso = new Date().toISOString();
  const auditEntry: ArApAuditEntry = {
    timestamp: nowIso,
    action: params.targetStage === "Verified" ? "Verified Receivable" : "Finance Review",
    actorName: params.actorName,
    actorRole: params.actorRole,
    stage: params.targetStage,
    notes: params.notes || `Moved receivable to ${params.targetStage}.`,
  };

  const updated: FinancialInvoiceRecord = {
    ...params.invoice,
    workflowStage: params.targetStage,
    reviewedBy: params.targetStage === "Finance Review" ? params.actorName : params.invoice.reviewedBy,
    reviewedAt: params.targetStage === "Finance Review" ? nowIso : params.invoice.reviewedAt,
    verifiedBy: params.targetStage === "Verified" ? params.actorName : params.invoice.verifiedBy,
    verifiedAt: params.targetStage === "Verified" ? nowIso : params.invoice.verifiedAt,
    status: params.targetStage === "Verified" && params.invoice.status === "Pending" ? "Approved" : params.invoice.status,
    auditHistory: [...(params.invoice.auditHistory || []), auditEntry],
    updatedAt: nowIso,
  };

  await DbService.updateInvoice(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `AR Workflow: ${params.targetStage}`,
    category: "Finance",
    severity: "INFO",
    details: `${updated.receivableId || updated.invoiceNumber} transitioned to ${params.targetStage} by ${params.actorName}.`,
  });

  return updated;
}

export async function toggleReceivableDispute(params: {
  invoice: FinancialInvoiceRecord;
  disputed: boolean;
  reason?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<FinancialInvoiceRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.canVerifyCollections && !perms.isDirector) {
    throw new Error("Role cannot flag or resolve receivable disputes.");
  }

  const nowIso = new Date().toISOString();
  const auditEntry: ArApAuditEntry = {
    timestamp: nowIso,
    action: params.disputed ? "Flagged Disputed" : "Resolved Dispute",
    actorName: params.actorName,
    actorRole: params.actorRole,
    stage: params.invoice.workflowStage || "Registered",
    notes: params.reason || (params.disputed ? "Marked as disputed by Finance." : "Dispute cleared."),
  };

  const updated: FinancialInvoiceRecord = {
    ...params.invoice,
    isDisputed: params.disputed,
    disputeReason: params.disputed ? safeString(params.reason, "Client dispute under review") : "",
    status: params.disputed ? "Pending" : (Number(params.invoice.paidAmount || 0) > 0 ? "Partially Paid" : "Approved"),
    auditHistory: [...(params.invoice.auditHistory || []), auditEntry],
    updatedAt: nowIso,
  };

  await DbService.updateInvoice(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: params.disputed ? "Flag AR Disputed" : "Resolve AR Dispute",
    category: "Finance",
    severity: "WARNING",
    details: `${updated.invoiceNumber}: ${auditEntry.notes}`,
  });

  return updated;
}

export async function registerPayable(params: {
  project: string;
  projectId?: string;
  department?: string;
  vendor: string;
  payableCategory: PayableCategory | string;
  purchaseOrderNumber?: string;
  contractNumber?: string;
  billNumber: string;
  invoiceDate: string;
  dueDate: string;
  subtotalAmount: number;
  taxAmount?: number;
  paymentTerms?: string;
  description: string;
  supportingDocuments?: SupportingDocMeta[];
  responsibleOfficer?: string;
  existingExpenses?: Expense[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<Expense> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.isDirector) {
    throw new Error("Role does not have permission to register payables.");
  }

  const cleanBillNo = safeString(params.billNumber).trim();
  if (!cleanBillNo) throw new Error("Supplier Invoice Number is required.");
  if (!safeString(params.project).trim()) throw new Error("Project Name is required.");
  if (!safeString(params.vendor).trim()) throw new Error("Supplier / Subcontractor Name is required.");
  if (!Number.isFinite(params.subtotalAmount) || params.subtotalAmount <= 0) {
    throw new Error("Invoice Amount must be greater than zero.");
  }
  const tax = Math.max(0, Number(params.taxAmount || 0));
  const totalAmount = Number((params.subtotalAmount + tax).toFixed(2));

  const dup = (params.existingExpenses || []).find(
    (ex) =>
      ex.status !== "Cancelled" &&
      ex.status !== "Rejected" &&
      safeString(ex.billNumber).trim().toLowerCase() === cleanBillNo.toLowerCase()
  );
  if (dup) {
    throw new Error(`Duplicate Supplier Invoice Number "${cleanBillNo}" already exists (${dup.payableId || dup.id}).`);
  }

  const nowIso = new Date().toISOString();
  const payableId = generateFinancialRef("AP");
  const auditEntry: ArApAuditEntry = {
    timestamp: nowIso,
    action: "Registered Payable",
    actorName: params.actorName,
    actorRole: params.actorRole,
    stage: "Registered",
    notes: `Registered ${params.payableCategory} payable to ${params.vendor} (ETB ${totalAmount.toLocaleString()}).`,
  };

  const expenseRecord: Expense = {
    id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    payableId,
    referenceNo: payableId,
    billNumber: cleanBillNo,
    purchaseOrderNumber: safeString(params.purchaseOrderNumber),
    contractNumber: safeString(params.contractNumber),
    category: safeString(params.payableCategory, "Material Supplier Payables"),
    payableCategory: safeString(params.payableCategory, "Material Supplier Payables"),
    subtotalAmount: params.subtotalAmount,
    taxAmount: tax,
    amount: totalAmount,
    paidAmount: 0,
    date: params.invoiceDate,
    invoiceDate: params.invoiceDate,
    dueDate: params.dueDate,
    paymentTerms: safeString(params.paymentTerms, "Net 30"),
    vendor: safeString(params.vendor),
    supplier: safeString(params.vendor),
    description: safeString(params.description, `${params.payableCategory} - ${cleanBillNo}`),
    project: safeString(params.project),
    projectId: params.projectId,
    department: safeString(params.department, "Procurement & Site Ops"),
    costCenter: safeString(params.department, "Site Operations"),
    responsibleOfficer: safeString(params.responsibleOfficer, params.actorName),
    supportingDocuments: params.supportingDocuments || [],
    workflowStage: perms.canApproveTransactions ? "Approved" : "Registered",
    approvedBy: perms.canApproveTransactions ? params.actorName : "Pending Approval",
    approvedAt: perms.canApproveTransactions ? nowIso : undefined,
    isDisputed: false,
    auditHistory: [auditEntry],
    status: perms.canApproveTransactions ? "Approved" : "Pending",
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.addExpense(expenseRecord);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Register Payable (AP)",
    category: "Finance",
    severity: "INFO",
    details: `Registered AP ${payableId} (${cleanBillNo}) for ${expenseRecord.vendor} — ${expenseRecord.project}, Total ETB ${totalAmount.toLocaleString()}.`,
  });

  return expenseRecord;
}

export async function advancePayableWorkflow(params: {
  expense: Expense;
  targetStage: "Finance Review" | "Supporting Docs Verified" | "Approved";
  notes?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<Expense> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (params.targetStage === "Approved" && !perms.canApproveTransactions) {
    throw new Error("Only Finance Manager or Director can approve Accounts Payable for payment.");
  }
  if (!perms.canManageTransactions && !perms.canApproveTransactions && !perms.isDirector) {
    throw new Error("Role cannot advance payable workflow.");
  }

  const nowIso = new Date().toISOString();
  const auditEntry: ArApAuditEntry = {
    timestamp: nowIso,
    action:
      params.targetStage === "Approved"
        ? "Approved Payable"
        : params.targetStage === "Supporting Docs Verified"
        ? "Verified Supporting Docs"
        : "Finance Review",
    actorName: params.actorName,
    actorRole: params.actorRole,
    stage: params.targetStage,
    notes: params.notes || `Moved payable to ${params.targetStage}.`,
  };

  const updated: Expense = {
    ...params.expense,
    workflowStage: params.targetStage,
    reviewedBy: params.targetStage === "Finance Review" ? params.actorName : params.expense.reviewedBy,
    reviewedAt: params.targetStage === "Finance Review" ? nowIso : params.expense.reviewedAt,
    docsVerifiedBy: params.targetStage === "Supporting Docs Verified" ? params.actorName : params.expense.docsVerifiedBy,
    docsVerifiedAt: params.targetStage === "Supporting Docs Verified" ? nowIso : params.expense.docsVerifiedAt,
    approvedBy: params.targetStage === "Approved" ? params.actorName : params.expense.approvedBy,
    approvedAt: params.targetStage === "Approved" ? nowIso : params.expense.approvedAt,
    status: params.targetStage === "Approved" && (params.expense.status === "Pending" || params.expense.status === "Draft") ? "Approved" : params.expense.status,
    auditHistory: [...(params.expense.auditHistory || []), auditEntry],
    updatedAt: nowIso,
  };

  await DbService.updateExpense(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `AP Workflow: ${params.targetStage}`,
    category: "Finance",
    severity: "INFO",
    details: `${updated.payableId || updated.billNumber || updated.id} transitioned to ${params.targetStage} by ${params.actorName}.`,
  });

  return updated;
}

export async function togglePayableDispute(params: {
  expense: Expense;
  disputed: boolean;
  reason?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<Expense> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.canApproveTransactions && !perms.isDirector) {
    throw new Error("Role cannot flag or resolve payable disputes.");
  }

  const nowIso = new Date().toISOString();
  const auditEntry: ArApAuditEntry = {
    timestamp: nowIso,
    action: params.disputed ? "Flagged Disputed" : "Resolved Dispute",
    actorName: params.actorName,
    actorRole: params.actorRole,
    stage: params.expense.workflowStage || "Registered",
    notes: params.reason || (params.disputed ? "Marked as disputed by Finance." : "Dispute resolved."),
  };

  const updated: Expense = {
    ...params.expense,
    isDisputed: params.disputed,
    disputeReason: params.disputed ? safeString(params.reason, "Supplier invoice dispute under review") : "",
    status: params.disputed ? "Pending" : (Number(params.expense.paidAmount || 0) > 0 ? "Partially Paid" : "Approved"),
    auditHistory: [...(params.expense.auditHistory || []), auditEntry],
    updatedAt: nowIso,
  };

  await DbService.updateExpense(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: params.disputed ? "Flag AP Disputed" : "Resolve AP Dispute",
    category: "Finance",
    severity: "WARNING",
    details: `${updated.billNumber || updated.id}: ${auditEntry.notes}`,
  });

  return updated;
}

export interface ArApReportFilters {
  project?: string;
  client?: string;
  supplier?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  agingCategory?: string;
  transactionCategory?: string;
}

export interface GeneratedArApReportDataset {
  id: ArApReportTypeId;
  title: string;
  titleAm: string;
  subtitle: string;
  columns: { key: string; label: string; isNumeric?: boolean }[];
  rows: Record<string, any>[];
  summaryTotals: { label: string; value: number | string }[];
}

export function buildArApReportDataset(
  reportType: ArApReportTypeId,
  state: ComputedFinancialState,
  filters: ArApReportFilters = {}
): GeneratedArApReportDataset {
  const cur = state.settings.defaultCurrency || "ETB";
  const matchDate = (d: string) => {
    if (filters.startDate && d < filters.startDate) return false;
    if (filters.endDate && d > filters.endDate) return false;
    return true;
  };

  const filterInvoices = (list: NormalizedInvoice[]) =>
    list.filter((inv) => {
      if (inv.isCancelledOrRejected) return false;
      if (filters.project && filters.project !== "ALL" && inv.project !== filters.project) return false;
      if (filters.client && filters.client !== "ALL" && inv.normalizedClient !== filters.client) return false;
      if (filters.paymentStatus && filters.paymentStatus !== "ALL" && inv.arLifecycleStatus !== filters.paymentStatus) return false;
      if (filters.agingCategory && filters.agingCategory !== "ALL" && inv.agingCategory !== filters.agingCategory) return false;
      if (filters.transactionCategory && filters.transactionCategory !== "ALL" && inv.normalizedReceivableCategory !== filters.transactionCategory)
        return false;
      if (!matchDate(inv.date)) return false;
      return true;
    });

  const filterExpenses = (list: NormalizedExpense[]) =>
    list.filter((exp) => {
      if (exp.isCancelledOrRejected) return false;
      if (filters.project && filters.project !== "ALL" && exp.project !== filters.project) return false;
      if (filters.supplier && filters.supplier !== "ALL" && exp.normalizedSupplier !== filters.supplier) return false;
      if (filters.paymentStatus && filters.paymentStatus !== "ALL" && exp.apLifecycleStatus !== filters.paymentStatus) return false;
      if (filters.agingCategory && filters.agingCategory !== "ALL" && exp.agingCategory !== filters.agingCategory) return false;
      if (filters.transactionCategory && filters.transactionCategory !== "ALL" && exp.normalizedPayableCategory !== filters.transactionCategory)
        return false;
      if (!matchDate(exp.date)) return false;
      return true;
    });

  const invs = filterInvoices(state.allDimInvoices);
  const exps = filterExpenses(state.allDimExpenses);

  switch (reportType) {
    case "accounts-receivable-report": {
      const rows = invs.map((i) => ({
        receivableId: i.receivableId || i.id,
        invoiceNumber: i.invoiceNumber,
        project: i.project,
        client: i.normalizedClient,
        category: i.normalizedReceivableCategory,
        invoiceDate: i.date,
        dueDate: i.dueDate,
        totalAmount: i.amount,
        collected: i.collectedAmount,
        outstanding: i.outstandingAmount,
        aging: i.agingCategory,
        status: i.arLifecycleStatus,
      }));
      return {
        id: reportType,
        title: "1. Accounts Receivable Report",
        titleAm: "1. የተሰብሳቢ ሂሳቦች (AR) ሪፖርት",
        subtitle: "Complete register of client receivables, collected totals, and outstanding balances.",
        columns: [
          { key: "receivableId", label: "Receivable ID" },
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "project", label: "Project" },
          { key: "client", label: "Client" },
          { key: "category", label: "Category" },
          { key: "dueDate", label: "Due Date" },
          { key: "totalAmount", label: `Total (${cur})`, isNumeric: true },
          { key: "collected", label: `Collected (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "aging", label: "Aging Bucket" },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Receivables", value: rows.reduce((s, r) => s + r.totalAmount, 0) },
          { label: "Total Collected", value: rows.reduce((s, r) => s + r.collected, 0) },
          { label: "Outstanding AR", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }

    case "accounts-payable-report": {
      const rows = exps.map((e) => ({
        payableId: e.payableId || e.id,
        billNumber: e.billNumber || e.referenceNo || e.id,
        project: e.project,
        supplier: e.normalizedSupplier,
        category: e.normalizedPayableCategory,
        dueDate: e.dueDate,
        totalAmount: e.amount,
        paid: e.paidCashAmount,
        outstanding: e.outstandingAmount,
        aging: e.agingCategory,
        status: e.apLifecycleStatus,
      }));
      return {
        id: reportType,
        title: "2. Accounts Payable Report",
        titleAm: "2. የተከፋይ ሂሳቦች (AP) ሪፖርት",
        subtitle: "Complete register of supplier, subcontractor, and operational liabilities.",
        columns: [
          { key: "payableId", label: "Payable ID" },
          { key: "billNumber", label: "Invoice / Bill #" },
          { key: "project", label: "Project" },
          { key: "supplier", label: "Supplier / Creditor" },
          { key: "category", label: "Category" },
          { key: "dueDate", label: "Due Date" },
          { key: "totalAmount", label: `Total (${cur})`, isNumeric: true },
          { key: "paid", label: `Paid (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "aging", label: "Aging Bucket" },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Payables", value: rows.reduce((s, r) => s + r.totalAmount, 0) },
          { label: "Total Paid", value: rows.reduce((s, r) => s + r.paid, 0) },
          { label: "Outstanding AP", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }

    case "client-outstanding-balance-report": {
      const map = new Map<string, { client: string; invoiceCount: number; totalBilled: number; collected: number; outstanding: number; overdue: number }>();
      invs.forEach((i) => {
        const k = i.normalizedClient;
        const curRow = map.get(k) || { client: k, invoiceCount: 0, totalBilled: 0, collected: 0, outstanding: 0, overdue: 0 };
        curRow.invoiceCount += 1;
        curRow.totalBilled += i.amount;
        curRow.collected += i.collectedAmount;
        curRow.outstanding += i.outstandingAmount;
        if (i.isOverdue) curRow.overdue += i.outstandingAmount;
        map.set(k, curRow);
      });
      const rows = Array.from(map.values()).map((r) => ({
        ...r,
        collectionRate: r.totalBilled > 0 ? `${((r.collected / r.totalBilled) * 100).toFixed(1)}%` : "0.0%",
      }));
      return {
        id: reportType,
        title: "3. Client Outstanding Balance Report",
        titleAm: "3. የደንበኞች ቀሪ ሂሳብ ሪፖርት",
        subtitle: "Receivables, collections, and overdue exposure grouped by client.",
        columns: [
          { key: "client", label: "Client Name" },
          { key: "invoiceCount", label: "Invoices", isNumeric: true },
          { key: "totalBilled", label: `Total Billed (${cur})`, isNumeric: true },
          { key: "collected", label: `Collected (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "overdue", label: `Overdue (${cur})`, isNumeric: true },
          { key: "collectionRate", label: "Collection %" },
        ],
        rows,
        summaryTotals: [
          { label: "Clients", value: rows.length },
          { label: "Total Outstanding", value: rows.reduce((s, r) => s + r.outstanding, 0) },
          { label: "Total Overdue", value: rows.reduce((s, r) => s + r.overdue, 0) },
        ],
      };
    }

    case "supplier-outstanding-balance-report": {
      const map = new Map<string, { supplier: string; billCount: number; totalBilled: number; paid: number; outstanding: number; overdue: number }>();
      exps.forEach((e) => {
        const k = e.normalizedSupplier;
        const curRow = map.get(k) || { supplier: k, billCount: 0, totalBilled: 0, paid: 0, outstanding: 0, overdue: 0 };
        curRow.billCount += 1;
        curRow.totalBilled += e.amount;
        curRow.paid += e.paidCashAmount;
        curRow.outstanding += e.outstandingAmount;
        if (e.isOverdue) curRow.overdue += e.outstandingAmount;
        map.set(k, curRow);
      });
      const rows = Array.from(map.values()).map((r) => ({
        ...r,
        paymentRate: r.totalBilled > 0 ? `${((r.paid / r.totalBilled) * 100).toFixed(1)}%` : "0.0%",
      }));
      return {
        id: reportType,
        title: "4. Supplier Outstanding Balance Report",
        titleAm: "4. የአቅራቢዎች ቀሪ ተከፋይ ሂሳብ ሪፖርት",
        subtitle: "Payables, disbursements, and overdue exposure grouped by supplier/creditor.",
        columns: [
          { key: "supplier", label: "Supplier / Subcontractor" },
          { key: "billCount", label: "Bills", isNumeric: true },
          { key: "totalBilled", label: `Total Payables (${cur})`, isNumeric: true },
          { key: "paid", label: `Paid (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "overdue", label: `Overdue (${cur})`, isNumeric: true },
          { key: "paymentRate", label: "Payment %" },
        ],
        rows,
        summaryTotals: [
          { label: "Suppliers", value: rows.length },
          { label: "Total Outstanding", value: rows.reduce((s, r) => s + r.outstanding, 0) },
          { label: "Total Overdue", value: rows.reduce((s, r) => s + r.overdue, 0) },
        ],
      };
    }

    case "project-receivable-report": {
      const map = new Map<string, { project: string; invoices: number; totalReceivable: number; collected: number; outstanding: number; overdue: number }>();
      invs.forEach((i) => {
        const k = i.project;
        const curRow = map.get(k) || { project: k, invoices: 0, totalReceivable: 0, collected: 0, outstanding: 0, overdue: 0 };
        curRow.invoices += 1;
        curRow.totalReceivable += i.amount;
        curRow.collected += i.collectedAmount;
        curRow.outstanding += i.outstandingAmount;
        if (i.isOverdue) curRow.overdue += i.outstandingAmount;
        map.set(k, curRow);
      });
      const rows = Array.from(map.values());
      return {
        id: reportType,
        title: "5. Project Receivable Report",
        titleAm: "5. በፕሮጀክት የተከፋፈለ የተሰብሳቢ ሂሳብ ሪፖርት",
        subtitle: "Contract receivables and cash realization aggregated per construction project.",
        columns: [
          { key: "project", label: "Project" },
          { key: "invoices", label: "Invoices", isNumeric: true },
          { key: "totalReceivable", label: `Total AR (${cur})`, isNumeric: true },
          { key: "collected", label: `Collected (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "overdue", label: `Overdue (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Project AR", value: rows.reduce((s, r) => s + r.totalReceivable, 0) },
          { label: "Open Project AR", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }

    case "project-payable-report": {
      const map = new Map<string, { project: string; bills: number; totalPayable: number; paid: number; outstanding: number; overdue: number }>();
      exps.forEach((e) => {
        const k = e.project;
        const curRow = map.get(k) || { project: k, bills: 0, totalPayable: 0, paid: 0, outstanding: 0, overdue: 0 };
        curRow.bills += 1;
        curRow.totalPayable += e.amount;
        curRow.paid += e.paidCashAmount;
        curRow.outstanding += e.outstandingAmount;
        if (e.isOverdue) curRow.overdue += e.outstandingAmount;
        map.set(k, curRow);
      });
      const rows = Array.from(map.values());
      return {
        id: reportType,
        title: "6. Project Payable Report",
        titleAm: "6. በፕሮጀክት የተከፋፈለ የተከፋይ ሂሳብ ሪፖርት",
        subtitle: "Vendor bills, disbursements, and unpaid obligations aggregated per project.",
        columns: [
          { key: "project", label: "Project" },
          { key: "bills", label: "Bills", isNumeric: true },
          { key: "totalPayable", label: `Total AP (${cur})`, isNumeric: true },
          { key: "paid", label: `Paid (${cur})`, isNumeric: true },
          { key: "outstanding", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "overdue", label: `Overdue (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Project AP", value: rows.reduce((s, r) => s + r.totalPayable, 0) },
          { label: "Open Project AP", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }

    case "aging-receivable-report": {
      const openInvs = invs.filter((i) => i.outstandingAmount > 0);
      const buckets = buildAgingBuckets(openInvs, state.referenceToday, state.settings.overdueAlertGraceDays);
      const totalOpen = buckets.reduce((s, b) => s + b.amount, 0);
      const rows = buckets.map((b) => ({
        agingBucket: b.label,
        count: b.count,
        amount: b.amount,
        sharePct: totalOpen > 0 ? `${((b.amount / totalOpen) * 100).toFixed(1)}%` : "0.0%",
      }));
      return {
        id: reportType,
        title: "7. Aging Receivable Report",
        titleAm: "7. የተሰብሳቢ ሂሳቦች ዕድሜ (Aging) ሪፖርት",
        subtitle: `Receivable aging schedule across the 5 standard buckets. Performance: ${state.metrics.arAgingPerformance.statusLabel}`,
        columns: [
          { key: "agingBucket", label: "Aging Category" },
          { key: "count", label: "Open Invoices", isNumeric: true },
          { key: "amount", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "sharePct", label: "Portfolio %" },
        ],
        rows,
        summaryTotals: [
          { label: "Open AR", value: totalOpen },
          { label: "Aging Trend", value: `${state.metrics.arAgingPerformance.percentageChange >= 0 ? "+" : ""}${state.metrics.arAgingPerformance.percentageChange.toFixed(1)}% (${state.metrics.arAgingPerformance.color})` },
        ],
      };
    }

    case "aging-payable-report": {
      const openExps = exps.filter((e) => e.outstandingAmount > 0);
      const buckets = buildAgingBuckets(openExps, state.referenceToday, state.settings.overdueAlertGraceDays);
      const totalOpen = buckets.reduce((s, b) => s + b.amount, 0);
      const rows = buckets.map((b) => ({
        agingBucket: b.label,
        count: b.count,
        amount: b.amount,
        sharePct: totalOpen > 0 ? `${((b.amount / totalOpen) * 100).toFixed(1)}%` : "0.0%",
      }));
      return {
        id: reportType,
        title: "8. Aging Payable Report",
        titleAm: "8. የተከፋይ ሂሳቦች ዕድሜ (Aging) ሪፖርት",
        subtitle: `Payable aging schedule across the 5 standard buckets. Performance: ${state.metrics.apAgingPerformance.statusLabel}`,
        columns: [
          { key: "agingBucket", label: "Aging Category" },
          { key: "count", label: "Open Bills", isNumeric: true },
          { key: "amount", label: `Outstanding (${cur})`, isNumeric: true },
          { key: "sharePct", label: "Liability %" },
        ],
        rows,
        summaryTotals: [
          { label: "Open AP", value: totalOpen },
          { label: "Aging Trend", value: `${state.metrics.apAgingPerformance.percentageChange >= 0 ? "+" : ""}${state.metrics.apAgingPerformance.percentageChange.toFixed(1)}% (${state.metrics.apAgingPerformance.color})` },
        ],
      };
    }

    case "monthly-collection-report": {
      const cols = state.allRoleCashTransactions.filter((t) => {
        if (t.type !== "Collection" || !isConfirmedCashStatus(t.status)) return false;
        if (filters.project && filters.project !== "ALL" && t.project !== filters.project) return false;
        if (filters.client && filters.client !== "ALL" && t.counterparty !== filters.client) return false;
        if (!matchDate(t.date)) return false;
        return true;
      });
      const rows = cols.map((c) => ({
        referenceNo: c.referenceNo,
        receiptNumber: c.receiptNumber || "—",
        invoiceNumber: c.invoiceNumber || c.linkedReferenceNo || "—",
        date: c.date,
        project: c.project,
        client: c.counterparty,
        paymentMethod: c.paymentMethod,
        accountName: c.accountName,
        amount: c.amount,
        verifiedBy: c.verifiedBy || c.recordedBy || "—",
      }));
      return {
        id: reportType,
        title: "9. Monthly Collection Report",
        titleAm: "9. ወርሃዊ የገንዘብ መሰብሰብ ሪፖርት",
        subtitle: "Verified & confirmed AR collections credited to Cash and Bank accounts.",
        columns: [
          { key: "referenceNo", label: "Collection ID" },
          { key: "receiptNumber", label: "Receipt #" },
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "date", label: "Collection Date" },
          { key: "project", label: "Project" },
          { key: "client", label: "Client" },
          { key: "paymentMethod", label: "Method" },
          { key: "accountName", label: "Bank / Cash Account" },
          { key: "amount", label: `Collected (${cur})`, isNumeric: true },
          { key: "verifiedBy", label: "Verified By" },
        ],
        rows,
        summaryTotals: [
          { label: "Confirmed Collections", value: rows.length },
          { label: "Total Collected", value: rows.reduce((s, r) => s + r.amount, 0) },
        ],
      };
    }

    case "monthly-payment-report": {
      const pays = state.allRoleCashTransactions.filter((t) => {
        if (t.type !== "Payment" || !isConfirmedCashStatus(t.status)) return false;
        if (filters.project && filters.project !== "ALL" && t.project !== filters.project) return false;
        if (filters.supplier && filters.supplier !== "ALL" && t.counterparty !== filters.supplier) return false;
        if (!matchDate(t.date)) return false;
        return true;
      });
      const rows = pays.map((p) => ({
        referenceNo: p.referenceNo,
        paymentVoucherNumber: p.paymentVoucherNumber || "—",
        invoiceNumber: p.invoiceNumber || p.linkedReferenceNo || "—",
        date: p.date,
        project: p.project,
        supplier: p.counterparty,
        paymentMethod: p.paymentMethod,
        accountName: p.accountName,
        amount: p.amount,
        approvedBy: p.approvedBy || "—",
      }));
      return {
        id: reportType,
        title: "10. Monthly Payment Report",
        titleAm: "10. ወርሃዊ የገንዘብ ክፍያ ሪፖርት",
        subtitle: "Approved & executed AP payments disbursed from Cash and Bank accounts.",
        columns: [
          { key: "referenceNo", label: "Payment ID" },
          { key: "paymentVoucherNumber", label: "Voucher #" },
          { key: "invoiceNumber", label: "Bill / Invoice #" },
          { key: "date", label: "Payment Date" },
          { key: "project", label: "Project" },
          { key: "supplier", label: "Supplier" },
          { key: "paymentMethod", label: "Method" },
          { key: "accountName", label: "Bank / Cash Account" },
          { key: "amount", label: `Paid (${cur})`, isNumeric: true },
          { key: "approvedBy", label: "Approved By" },
        ],
        rows,
        summaryTotals: [
          { label: "Confirmed Payments", value: rows.length },
          { label: "Total Paid", value: rows.reduce((s, r) => s + r.amount, 0) },
        ],
      };
    }

    case "overdue-receivable-report": {
      const rows = invs
        .filter((i) => i.isOverdue && i.outstandingAmount > 0)
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .map((i) => ({
          receivableId: i.receivableId || i.id,
          invoiceNumber: i.invoiceNumber,
          client: i.normalizedClient,
          project: i.project,
          dueDate: i.dueDate,
          daysOverdue: i.daysOverdue,
          aging: i.agingCategory,
          outstanding: i.outstandingAmount,
          officer: i.responsibleOfficer || "—",
        }));
      return {
        id: reportType,
        title: "11. Overdue Receivable Report",
        titleAm: "11. ጊዜው ያለፈበት የተሰብሳቢ ሂሳብ ሪፖርት",
        subtitle: "Past-due customer invoices requiring immediate collection escalation.",
        columns: [
          { key: "receivableId", label: "Receivable ID" },
          { key: "invoiceNumber", label: "Invoice #" },
          { key: "client", label: "Client" },
          { key: "project", label: "Project" },
          { key: "dueDate", label: "Due Date" },
          { key: "daysOverdue", label: "Days Overdue", isNumeric: true },
          { key: "aging", label: "Aging Bucket" },
          { key: "outstanding", label: `Overdue Balance (${cur})`, isNumeric: true },
          { key: "officer", label: "Finance Officer" },
        ],
        rows,
        summaryTotals: [
          { label: "Overdue Invoices", value: rows.length },
          { label: "Total Overdue AR", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }

    case "overdue-payable-report": {
      const rows = exps
        .filter((e) => e.isOverdue && e.outstandingAmount > 0)
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .map((e) => ({
          payableId: e.payableId || e.id,
          billNumber: e.billNumber || e.referenceNo || e.id,
          supplier: e.normalizedSupplier,
          project: e.project,
          dueDate: e.dueDate,
          daysOverdue: e.daysOverdue,
          aging: e.agingCategory,
          outstanding: e.outstandingAmount,
          officer: e.responsibleOfficer || "—",
        }));
      return {
        id: reportType,
        title: "12. Overdue Payable Report",
        titleAm: "12. ጊዜው ያለፈበት የተከፋይ ሂሳብ ሪፖርት",
        subtitle: "Past-due supplier/subcontractor obligations prioritized for treasury settlement.",
        columns: [
          { key: "payableId", label: "Payable ID" },
          { key: "billNumber", label: "Bill #" },
          { key: "supplier", label: "Supplier / Subcontractor" },
          { key: "project", label: "Project" },
          { key: "dueDate", label: "Due Date" },
          { key: "daysOverdue", label: "Days Overdue", isNumeric: true },
          { key: "aging", label: "Aging Bucket" },
          { key: "outstanding", label: `Overdue Balance (${cur})`, isNumeric: true },
          { key: "officer", label: "Finance Officer" },
        ],
        rows,
        summaryTotals: [
          { label: "Overdue Bills", value: rows.length },
          { label: "Total Overdue AP", value: rows.reduce((s, r) => s + r.outstanding, 0) },
        ],
      };
    }
  }
}
