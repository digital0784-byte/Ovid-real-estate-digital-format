import { describe, it, expect } from "vitest";
import {
  computeFinancialDashboardState,
  generateFinancialRef,
  resolveDateRange,
  resolveUserFinancePermissions,
} from "../services/financeService";
import {
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialBudgetRecord,
  FinancialFilterState,
  FinancialInvoiceRecord,
  MonthlyFinancialTarget,
  UserRole,
} from "../types";

const BASE_FILTER: FinancialFilterState = {
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
};

const REF_TODAY = "2026-07-20";

const SAMPLE_INVOICES: FinancialInvoiceRecord[] = [
  {
    id: "INV-1",
    referenceNo: "REV-20260702-1001",
    invoiceNumber: "INV-2026-101",
    project: "Bole Tower",
    department: "Contracting",
    category: "Project Revenue",
    client: "Federal Housing Corp",
    amount: 1000000,
    paidAmount: 0,
    status: "Pending",
    date: "2026-07-02",
    dueDate: "2026-07-25",
  },
  {
    id: "INV-2",
    referenceNo: "REV-20260705-1002",
    invoiceNumber: "INV-2026-102",
    project: "Yeka Villas",
    department: "Contracting",
    category: "IPC",
    client: "Addis Real Estate",
    amount: 500000,
    paidAmount: 0,
    status: "Approved",
    date: "2026-07-05",
    dueDate: "2026-06-01", // 49 days overdue relative to 2026-07-20
  },
  {
    id: "INV-3",
    referenceNo: "REV-20260510-1003",
    invoiceNumber: "INV-2026-099",
    project: "Bole Tower",
    department: "Contracting",
    category: "IPC",
    client: "Federal Housing Corp",
    amount: 400000,
    paidAmount: 0,
    status: "Approved",
    date: "2026-05-10",
    dueDate: "2026-04-01", // 110 days overdue -> 90+ Days bucket
  },
];

const SAMPLE_EXPENSES: Expense[] = [
  {
    id: "EXP-1",
    referenceNo: "EXP-20260703-2001",
    category: "Material",
    amount: 600000,
    paidAmount: 0,
    date: "2026-07-03",
    dueDate: "2026-07-30",
    vendor: "Mugher Cement",
    description: "Bulk cement",
    project: "Bole Tower",
    department: "Site Operations",
    costCenter: "CC-101",
    approvedBy: "Finance Manager",
    status: "Approved",
  },
  {
    id: "EXP-2",
    referenceNo: "EXP-20260704-2002",
    category: "Equipment",
    amount: 200000,
    paidAmount: 0,
    date: "2026-07-04",
    dueDate: "2026-06-25", // 25 days overdue -> 0-30 Days bucket
    vendor: "Potain Cranes",
    description: "Crane lease",
    project: "Yeka Villas",
    department: "Machinery",
    costCenter: "CC-102",
    approvedBy: "Finance Manager",
    status: "Approved",
  },
];

const SAMPLE_CASH_TXS: CashTransactionRecord[] = [
  {
    id: "TX-COL-1",
    referenceNo: "COL-20260706-3001",
    type: "Collection",
    date: "2026-07-06",
    amount: 250000,
    currency: "ETB",
    accountId: "ACC-BANK-1",
    accountName: "CBE Main",
    project: "Yeka Villas",
    department: "Contracting",
    category: "Receivable Settlement",
    counterparty: "Addis Real Estate",
    linkedDocumentType: "Invoice",
    linkedDocumentId: "INV-2",
    linkedReferenceNo: "INV-2026-102",
    paymentMethod: "Bank Transfer",
    status: "Posted",
    createdBy: "Accountant",
    createdById: "USR-ACC",
    createdAt: "2026-07-06T09:00:00Z",
    updatedAt: "2026-07-06T09:00:00Z",
  },
  {
    id: "TX-PAY-1",
    referenceNo: "PAY-20260708-4001",
    type: "Payment",
    date: "2026-07-08",
    amount: 100000,
    currency: "ETB",
    accountId: "ACC-CASH-1",
    accountName: "Petty Cash Safe",
    project: "Bole Tower",
    department: "Site Operations",
    category: "Payable Settlement",
    counterparty: "Mugher Cement",
    linkedDocumentType: "Expense",
    linkedDocumentId: "EXP-1",
    linkedReferenceNo: "EXP-20260703-2001",
    paymentMethod: "Cash",
    status: "Posted",
    createdBy: "Accountant",
    createdById: "USR-ACC",
    createdAt: "2026-07-08T10:00:00Z",
    updatedAt: "2026-07-08T10:00:00Z",
  },
];

const SAMPLE_ACCOUNTS: FinancialAccount[] = [
  {
    id: "ACC-BANK-1",
    accountCode: "BNK-001",
    accountName: "CBE Main",
    accountType: "Bank",
    currency: "ETB",
    openingBalance: 1000000,
    currentBalance: 1250000,
    minimumThreshold: 300000,
    project: "Corporate Treasury",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-07-08T00:00:00Z",
  },
  {
    id: "ACC-CASH-1",
    accountCode: "CSH-001",
    accountName: "Petty Cash Safe",
    accountType: "Cash",
    currency: "ETB",
    openingBalance: 500000,
    currentBalance: 400000,
    minimumThreshold: 100000,
    project: "Corporate Treasury",
    status: "Active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-07-08T00:00:00Z",
  },
];

const SAMPLE_TARGETS: MonthlyFinancialTarget[] = [
  {
    id: "TGT-2026-07",
    period: "2026-07",
    project: "Bole Tower",
    department: "Contracting",
    category: "Monthly Plan",
    plannedRevenue: 1800000,
    plannedExpense: 900000,
    plannedCollection: 700000,
    plannedPayment: 500000,
    updatedAt: "2026-07-01T00:00:00Z",
  },
];

const SAMPLE_BUDGETS: FinancialBudgetRecord[] = [
  {
    id: "BGT-1",
    project: "Bole Tower",
    department: "Site Operations",
    category: "Material",
    allocated: 1000000,
    committed: 700000,
    actual: 0,
    description: "Cement & Steel Budget",
  },
];

describe("Financial Management Engine Calculations", () => {
  it("enforces strict accrual vs cash separation: unpaid invoices do NOT count as cash collected", () => {
    const state = computeFinancialDashboardState({
      invoices: SAMPLE_INVOICES,
      expenses: SAMPLE_EXPENSES,
      cashTransactions: SAMPLE_CASH_TXS,
      financialTargets: SAMPLE_TARGETS,
      financialAccounts: SAMPLE_ACCOUNTS,
      projectBudgets: SAMPLE_BUDGETS,
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    // Monthly actual revenue = INV-1 (1,000,000) + INV-2 (500,000) = 1,500,000 (INV-3 is May)
    expect(state.metrics.actualRevenue).toBe(1500000);
    // Monthly actual expenses = EXP-1 (600,000) + EXP-2 (200,000) = 800,000
    expect(state.metrics.actualExpenses).toBe(800000);
    // Strict cash collection = ONLY posted TX-COL-1 (250,000), NEVER unpaid INV-1 (1,000,000)
    expect(state.metrics.actualCashCollection).toBe(250000);
    // Strict cash payment = ONLY posted TX-PAY-1 (100,000), NEVER unpaid EXP-2 (200,000)
    expect(state.metrics.actualCashPayment).toBe(100000);
    expect(state.metrics.netCashFlow).toBe(150000);

    // Profit & Loss
    expect(state.metrics.plannedRevenue).toBe(1800000);
    expect(state.metrics.plannedProfit).toBe(900000);
    expect(state.metrics.actualProfitOrLoss).toBe(700000);
    expect(state.metrics.profitMarginPct).toBeCloseTo(46.67, 1);

    // Receivables: INV-1 (1,000,000) + INV-2 (250,000 remaining) + INV-3 (400,000) = 1,650,000 outstanding
    expect(state.metrics.totalReceivables).toBe(1900000);
    expect(state.metrics.outstandingReceivables).toBe(1650000);
    // Overdue AR: INV-2 (250,000) + INV-3 (400,000) = 650,000
    expect(state.metrics.overdueReceivables).toBe(650000);

    // Payables: EXP-1 (500,000 remaining) + EXP-2 (200,000) = 700,000 outstanding
    expect(state.metrics.totalPayables).toBe(800000);
    expect(state.metrics.outstandingPayables).toBe(700000);
    expect(state.metrics.overduePayables).toBe(200000);

    // Liquidity Position
    expect(state.metrics.availableCashBalance).toBe(400000);
    expect(state.metrics.totalBankBalance).toBe(1250000);
    expect(state.metrics.currentLiquidityPosition).toBe(1650000);
    // Net working liquidity = 1,650,000 + 1,650,000 - 700,000 = 2,600,000
    expect(state.metrics.netWorkingLiquidity).toBe(2600000);
  });

  it("categorizes aging buckets accurately for AR and AP", () => {
    const state = computeFinancialDashboardState({
      invoices: SAMPLE_INVOICES,
      expenses: SAMPLE_EXPENSES,
      cashTransactions: SAMPLE_CASH_TXS,
      financialTargets: SAMPLE_TARGETS,
      financialAccounts: SAMPLE_ACCOUNTS,
      projectBudgets: SAMPLE_BUDGETS,
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    const arByLabel = Object.fromEntries(
      state.agingReceivables.map((b) => [b.label, b])
    );
    expect(arByLabel["Not Yet Due"].amount).toBe(1000000); // INV-1 due 2026-07-25
    expect(arByLabel["31–60 Days Overdue"].amount).toBe(250000); // INV-2 49 days overdue
    expect(arByLabel["Above 90 Days Overdue"].amount).toBe(400000); // INV-3 110 days overdue

    const apByLabel = Object.fromEntries(
      state.agingPayables.map((b) => [b.label, b])
    );
    expect(apByLabel["Not Yet Due"].amount).toBe(500000); // EXP-1 due 2026-07-30
    expect(apByLabel["1–30 Days Overdue"].amount).toBe(200000); // EXP-2 25 days overdue
  });

  it("resolves all 8 period presets cleanly", () => {
    expect(resolveDateRange("daily", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-07-20",
      endDate: "2026-07-20",
      granularity: "day",
    });
    expect(resolveDateRange("weekly", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-07-14",
      endDate: "2026-07-20",
    });
    expect(resolveDateRange("monthly", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(resolveDateRange("bimonthly", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-06-01",
      endDate: "2026-07-31",
      months: ["2026-06", "2026-07"],
    });
    expect(resolveDateRange("quarterly", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-09-30",
      months: ["2026-07", "2026-08", "2026-09"],
    });
    expect(resolveDateRange("semiannual", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-12-31",
    });
    expect(resolveDateRange("annual", "", "", REF_TODAY)).toMatchObject({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(
      resolveDateRange("custom", "2026-05-01", "2026-07-31", REF_TODAY)
    ).toMatchObject({
      startDate: "2026-05-01",
      endDate: "2026-07-31",
      months: ["2026-05", "2026-06", "2026-07"],
    });
  });

  it("restricts Project Manager strictly to assigned projects", () => {
    const state = computeFinancialDashboardState({
      invoices: SAMPLE_INVOICES,
      expenses: SAMPLE_EXPENSES,
      cashTransactions: SAMPLE_CASH_TXS,
      financialTargets: SAMPLE_TARGETS,
      financialAccounts: SAMPLE_ACCOUNTS,
      projectBudgets: SAMPLE_BUDGETS,
      filterState: BASE_FILTER,
      userRole: UserRole.PROJECT_MANAGER,
      userProfile: { uid: "PM-1", assignedProject: "Bole Tower" },
      referenceToday: REF_TODAY,
    });

    expect(state.permissions.isProjectScopedOnly).toBe(true);
    expect(state.assignedProjects).toEqual(["Bole Tower"]);
    // Only Bole Tower INV-1 is visible in July; Yeka Villas INV-2 is filtered out
    expect(state.metrics.actualRevenue).toBe(1000000);
    expect(state.metrics.actualExpenses).toBe(600000);
    expect(state.metrics.actualCashCollection).toBe(0);
    expect(state.metrics.actualCashPayment).toBe(100000);
  });

  it("applies dimension filters (project, category, supplier) and builds all 9 charts", () => {
    const state = computeFinancialDashboardState({
      invoices: SAMPLE_INVOICES,
      expenses: SAMPLE_EXPENSES,
      cashTransactions: SAMPLE_CASH_TXS,
      financialTargets: SAMPLE_TARGETS,
      financialAccounts: SAMPLE_ACCOUNTS,
      projectBudgets: SAMPLE_BUDGETS,
      filterState: { ...BASE_FILTER, periodPreset: "quarterly", supplier: "Mugher Cement" },
      userRole: UserRole.ACCOUNTANT,
      referenceToday: REF_TODAY,
    });

    expect(state.metrics.actualRevenue).toBe(0); // Customer invoices excluded when supplier filter active
    expect(state.metrics.actualExpenses).toBe(600000);
    expect(state.metrics.actualCashPayment).toBe(100000);

    // Verify all 9 chart series arrays exist and are populated
    expect(state.charts.revenuePlanVsActual.length).toBe(3);
    expect(state.charts.expensePlanVsActual.length).toBe(3);
    expect(state.charts.collectionPlanVsActual.length).toBe(3);
    expect(state.charts.paymentPlanVsActual.length).toBe(3);
    expect(state.charts.arTrends.length).toBe(3);
    expect(state.charts.apTrends.length).toBe(3);
    expect(state.charts.profitLossTrends.length).toBe(3);
    expect(state.charts.cashFlowTrends.length).toBe(3);
    expect(state.charts.budgetVsActual.length).toBe(1);
  });

  it("enforces RBAC permissions matrix accurately and formats reference codes", () => {
    expect(resolveUserFinancePermissions(UserRole.FINANCE_MANAGER).canDeleteTransactions).toBe(true);
    expect(resolveUserFinancePermissions(UserRole.ACCOUNTANT).canManageTransactions).toBe(true);
    expect(resolveUserFinancePermissions(UserRole.ACCOUNTANT).canManageSettings).toBe(false);
    expect(resolveUserFinancePermissions(UserRole.ACCOUNTANT).canDeleteTransactions).toBe(false);
    expect(resolveUserFinancePermissions(UserRole.AUDITOR).isReadOnly).toBe(true);
    expect(resolveUserFinancePermissions(UserRole.WORKER).canViewDashboard).toBe(false);

    const ref = generateFinancialRef("COL", new Date(2026, 6, 20));
    expect(ref).toMatch(/^COL-20260720-\d{4}$/);
  });
});
