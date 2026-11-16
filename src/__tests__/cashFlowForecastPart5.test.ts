import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceBankReconciliationStatus,
  advanceCashFlowForecastStatus,
  buildCashFlowReportDataset,
  CASH_INFLOW_CATEGORIES,
  CASH_OUTFLOW_CATEGORIES,
  classifyCashInflowCategory,
  classifyCashOutflowCategory,
  computeBankReconciliationSummary,
  computePart5CashFlowState,
  createCashFlowForecastItem,
  createOrSaveBankReconciliation,
  Part5FilterState,
} from "../services/cashFlowForecastService";
import { DbService } from "../services/db";
import {
  BankReconciliationRecord,
  BudgetAllocationRecord,
  CashFlowForecastItem,
  CashFlowReportTypeId,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  MonthlyCollectionPlan,
  MonthlyFinancialTarget,
  MonthlyPaymentPlan,
  PayrollRecord,
  ProjectBudgetPlan,
  UserRole,
} from "../types";

const BASE_FILTER: Part5FilterState = {
  project: "ALL",
  bankAccountId: "ALL",
  financialYear: "2026",
  granularity: "Monthly",
  startDate: "2026-07-01",
  endDate: "2026-09-30",
  searchTerm: "",
};

const REF_TODAY = "2026-07-20";

describe("Part 5 Cash Flow Management, Forecasting & Bank Reconciliation", () => {
  let mockAccounts: FinancialAccount[];
  let mockCashTxs: CashTransactionRecord[];
  let mockInvoices: FinancialInvoiceRecord[];
  let mockExpenses: Expense[];
  let mockCollectionPlans: MonthlyCollectionPlan[];
  let mockPaymentPlans: MonthlyPaymentPlan[];
  let mockPayroll: PayrollRecord[];
  let mockBudgetPlans: ProjectBudgetPlan[];
  let mockAllocations: BudgetAllocationRecord[];
  let mockTargets: MonthlyFinancialTarget[];
  let mockForecastItems: CashFlowForecastItem[];
  let mockReconciliations: BankReconciliationRecord[];

  beforeEach(() => {
    mockAccounts = [
      {
        id: "ACC-CBE-MAIN",
        accountCode: "1010",
        accountName: "CBE Main Operating Account",
        accountType: "Bank",
        bankName: "Commercial Bank of Ethiopia",
        accountNumber: "100023456789",
        branch: "Bole Branch",
        currency: "ETB",
        openingBalance: 1000000,
        currentBalance: 1250000,
        minimumThreshold: 300000,
        project: "Corporate Treasury",
        status: "Active",
        createdAt: "2026-01-01",
        updatedAt: "2026-07-20",
      },
      {
        id: "ACC-PETTY-BOLE",
        accountCode: "1020",
        accountName: "Bole Site Petty Cash",
        accountType: "Cash",
        currency: "ETB",
        openingBalance: 100000,
        currentBalance: 150000,
        minimumThreshold: 50000,
        project: "Bole Tower",
        status: "Active",
        createdAt: "2026-01-01",
        updatedAt: "2026-07-20",
      },
    ];

    mockCashTxs = [
      {
        id: "CTX-IN-1",
        referenceNo: "COL-20260710-01",
        type: "Collection",
        date: "2026-07-10",
        amount: 500000,
        currency: "ETB",
        accountId: "ACC-CBE-MAIN",
        accountName: "CBE Main Operating Account",
        project: "Bole Tower",
        department: "Finance",
        category: "IPC Certified Certificate",
        counterparty: "Federal Housing Corp",
        paymentMethod: "Bank Transfer",
        bankReferenceNumber: "FT-9901",
        receiptNumber: "RCPT-001",
        status: "Verified & Confirmed",
        createdBy: "Finance Manager",
        createdById: "uid-fm",
        createdAt: "2026-07-10",
        updatedAt: "2026-07-10",
      },
      {
        id: "CTX-OUT-1",
        referenceNo: "PAY-20260712-01",
        type: "Payment",
        date: "2026-07-12",
        amount: 200000,
        currency: "ETB",
        accountId: "ACC-CBE-MAIN",
        accountName: "CBE Main Operating Account",
        project: "Bole Tower",
        department: "Procurement",
        category: "Cement & Steel Rebar Material",
        counterparty: "Derba Cement PLC",
        paymentMethod: "Bank Transfer",
        bankReferenceNumber: "FT-9902",
        paymentVoucherNumber: "PV-001",
        status: "Posted",
        createdBy: "Accountant",
        createdById: "uid-acc",
        createdAt: "2026-07-12",
        updatedAt: "2026-07-12",
      },
      {
        id: "CTX-TRF-1",
        referenceNo: "TRF-20260715-01",
        type: "Transfer",
        date: "2026-07-15",
        amount: 50000,
        currency: "ETB",
        accountId: "ACC-CBE-MAIN",
        accountName: "CBE Main Operating Account",
        toAccountId: "ACC-PETTY-BOLE",
        toAccountName: "Bole Site Petty Cash",
        project: "Corporate Treasury",
        department: "Treasury",
        category: "Inter-Account Transfer",
        counterparty: "Bole Site Petty Cash",
        paymentMethod: "Internal Transfer",
        bankReferenceNumber: "TRF-5501",
        status: "Posted",
        createdBy: "Finance Manager",
        createdById: "uid-fm",
        createdAt: "2026-07-15",
        updatedAt: "2026-07-15",
      },
      {
        id: "CTX-DRAFT-UNCONFIRMED",
        referenceNo: "PAY-DRAFT-99",
        type: "Payment",
        date: "2026-07-18",
        amount: 999999,
        currency: "ETB",
        accountId: "ACC-CBE-MAIN",
        accountName: "CBE Main Operating Account",
        project: "Bole Tower",
        department: "Procurement",
        category: "Equipment Costs",
        counterparty: "Unconfirmed Vendor",
        paymentMethod: "Bank Transfer",
        status: "Draft",
        createdBy: "Accountant",
        createdById: "uid-acc",
        createdAt: "2026-07-18",
        updatedAt: "2026-07-18",
      },
    ];

    // Unpaid invoice and unpaid expense must NEVER inflate actualCashInflow / actualCashOutflow
    mockInvoices = [
      {
        id: "INV-OPEN-1",
        invoiceNumber: "INV-BOLE-002",
        client: "Federal Housing Corp",
        project: "Bole Tower",
        amount: 400000,
        paidAmount: 0,
        date: "2026-07-05",
        dueDate: "2026-07-28",
        status: "Pending",
        receivableCategory: "Client Contract Receivables",
        description: "Client progress billing #2",
        createdBy: "Finance Manager",
        createdAt: "2026-07-05",
      },
      {
        id: "INV-OVERDUE-1",
        invoiceNumber: "INV-KIL-001",
        client: "Addis Municipality",
        project: "Kilinto Housing",
        amount: 250000,
        paidAmount: 0,
        date: "2026-06-01",
        dueDate: "2026-06-25",
        status: "Overdue",
        receivableCategory: "Advance Payment Receivables",
        description: "Mobilization advance receivable",
        createdBy: "Finance Manager",
        createdAt: "2026-06-01",
      },
    ];

    mockExpenses = [
      {
        id: "EXP-OPEN-1",
        billNumber: "BILL-SUB-01",
        vendor: "Ethio Electromech Subcontractor",
        project: "Bole Tower",
        category: "Subcontractor",
        payableCategory: "Subcontractor Payables",
        amount: 600000,
        paidAmount: 0,
        date: "2026-07-14",
        dueDate: "2026-07-25",
        status: "Approved",
        description: "MEP first fix subcontractor bill",
        costCenter: "CC-BOLE-01",
        approvedBy: "Finance Manager",
      },
    ];

    mockCollectionPlans = [
      {
        id: "CP-1",
        planNumber: "CPL-2026-08",
        financialYear: "2026",
        month: "2026-08",
        targetScope: "Project",
        project: "Bole Tower",
        customer: "Federal Housing Corp",
        department: "Finance",
        contractNumber: "CNT-01",
        invoiceNumber: "INV-BOLE-002", // Same invoice as open AR -> deduplicated
        plannedAmount: 400000,
        expectedDate: "2026-08-10",
        responsiblePerson: "Abebe",
        approvalStatus: "Approved",
        createdBy: "Finance Manager",
        createdById: "uid-fm",
        createdAt: "2026-07-01",
        updatedAt: "2026-07-01",
      },
      {
        id: "CP-2",
        planNumber: "CPL-2026-08B",
        financialYear: "2026",
        month: "2026-08",
        targetScope: "Project",
        project: "Bole Tower",
        customer: "Federal Housing Corp",
        department: "Finance",
        contractNumber: "CNT-01",
        invoiceNumber: "INV-BOLE-003", // New expected collection -> included
        plannedAmount: 350000,
        expectedDate: "2026-08-18",
        responsiblePerson: "Abebe",
        approvalStatus: "Approved",
        createdBy: "Finance Manager",
        createdById: "uid-fm",
        createdAt: "2026-07-01",
        updatedAt: "2026-07-01",
      },
    ];

    mockPaymentPlans = [
      {
        id: "PP-1",
        planNumber: "PPL-2026-08",
        financialYear: "2026",
        month: "2026-08",
        project: "Bole Tower",
        department: "Procurement",
        expenseCategory: "Material Payments",
        supplierOrPayee: "Mugher Cement",
        invoiceNumber: "BILL-MUGHER-88",
        plannedAmount: 180000,
        expectedDate: "2026-08-12",
        responsiblePerson: "Abebe",
        approvalStatus: "Approved",
        createdBy: "Finance Manager",
        createdById: "uid-fm",
        createdAt: "2026-07-01",
        updatedAt: "2026-07-01",
      },
    ];

    mockPayroll = [
      {
        id: "PR-2026-08",
        workerId: "WRK-01",
        workerName: "Bole Site Crew Batch",
        position: "Crew",
        department: "Site Engineering",
        team: "Team A",
        project: "Bole Tower",
        employmentType: "Permanent",
        basicSalary: 200000,
        attendanceDays: 26,
        totalWorkingHours: 208,
        overtimeHours: 0,
        overtimePayment: 0,
        undertimeHours: 0,
        undertimeDeduction: 0,
        allowances: 20000,
        deductions: 0,
        netSalary: 220000,
        status: "Approved",
        grade: "Grade B",
        period: "2026-08",
      },
    ];

    mockBudgetPlans = [
      {
        id: "BGP-1",
        budgetId: "BGT-BOLE-2026",
        projectName: "Bole Tower",
        projectCode: "PRJ-01",
        contractNumber: "CNT-01",
        clientName: "Federal Housing Corp",
        projectManager: "Eng. Dawit",
        budgetPreparationDate: "2026-01-05",
        budgetPeriod: "2026",
        budgetYear: "2026",
        projectStartDate: "2026-01-10",
        projectCompletionDate: "2026-12-31",
        originalContractAmount: 20000000,
        originalApprovedBudget: 5000000,
        approvedProjectBudget: 5000000,
        contingencyBudget: 250000,
        currency: "ETB",
        lineItems: [],
        budgetPreparedBy: "FM",
        budgetStatus: "Approved",
        workflowStage: "Budget Activation",
        auditHistory: [],
        createdBy: "FM",
        createdById: "uid-fm",
        createdAt: "2026-01-05",
        updatedAt: "2026-01-05",
      },
    ];

    mockAllocations = [
      {
        id: "BAL-2026-09",
        allocationId: "BAL-09",
        projectBudgetPlanId: "BGP-1",
        projectName: "Bole Tower",
        budgetYear: "2026",
        budgetMonth: "2026-09",
        budgetCategory: "Equipment Costs",
        allocatedAmount: 300000,
        previouslyAllocatedAmount: 0,
        remainingUnallocatedBudget: 4700000,
        preparedBy: "FM",
        approvalStatus: "Approved",
        createdAt: "2026-01-10",
        updatedAt: "2026-01-10",
      },
    ];

    mockTargets = [];

    mockForecastItems = [
      {
        id: "CFF-EXP-1",
        forecastRef: "CFF-20260720-1111",
        direction: "Outflow",
        category: "Tax Payments",
        project: "Bole Tower",
        expectedDate: "2026-09-15",
        financialYear: "2026",
        amount: 150000,
        currency: "ETB",
        counterparty: "Ministry of Revenue (VAT)",
        sourceType: "Manual Forecast",
        probabilityPct: 100,
        approvalStatus: "Approved",
        preparedBy: "Finance Manager",
        createdBy: "Finance Manager",
        createdById: "uid-fm",
        createdAt: "2026-07-20",
        updatedAt: "2026-07-20",
      },
    ];

    mockReconciliations = [];
  });

  it("exposes exact 4 cash inflow categories and 7 cash outflow categories and classifies labels accurately", () => {
    expect(CASH_INFLOW_CATEGORIES).toEqual([
      "Client Payments",
      "Advance Payments",
      "Certified Payments",
      "Other Project Income",
    ]);
    expect(CASH_OUTFLOW_CATEGORIES).toEqual([
      "Material Payments",
      "Salary and Wages",
      "Subcontractor Payments",
      "Equipment Costs",
      "Operational Expenses",
      "Tax Payments",
      "Other Expenses",
    ]);

    expect(classifyCashInflowCategory("Mobilization Advance")).toBe("Advance Payments");
    expect(classifyCashInflowCategory("IPC #4 Certified Certificate")).toBe("Certified Payments");
    expect(classifyCashInflowCategory("Client Contract Invoice")).toBe("Client Payments");
    expect(classifyCashInflowCategory("Scrap Sale")).toBe("Other Project Income");

    expect(classifyCashOutflowCategory("Rebar Steel & Cement")).toBe("Material Payments");
    expect(classifyCashOutflowCategory("Site Payroll Wages")).toBe("Salary and Wages");
    expect(classifyCashOutflowCategory("MEP Subcontractor")).toBe("Subcontractor Payments");
    expect(classifyCashOutflowCategory("Excavator Fuel & Rental")).toBe("Equipment Costs");
    expect(classifyCashOutflowCategory("Site Office Utilities")).toBe("Operational Expenses");
    expect(classifyCashOutflowCategory("VAT & Withholding Tax")).toBe("Tax Payments");
    expect(classifyCashOutflowCategory("Misc Bank Fee")).toBe("Other Expenses");
  });

  it("enforces strict cash-basis actuals (excludes unpaid invoices/bills & draft cash tx) while computing multi-source forecast without double counting", () => {
    const state = computePart5CashFlowState({
      cashTransactions: mockCashTxs,
      invoices: mockInvoices,
      expenses: mockExpenses,
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      payrollRecords: mockPayroll,
      projectBudgetPlans: mockBudgetPlans,
      budgetAllocations: mockAllocations,
      financialTargets: mockTargets,
      financialAccounts: mockAccounts,
      explicitForecastItems: mockForecastItems,
      bankReconciliations: mockReconciliations,
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    // Available cash balance = 1,250,000 + 150,000 = 1,400,000
    expect(state.kpis.availableCashBalance).toBe(1400000);
    expect(state.kpis.totalBankBalance).toBe(1250000);
    expect(state.kpis.totalPettyCashBalance).toBe(150000);

    // Consolidated ALL accounts:
    // Actual Inflow = 500,000 (CTX-IN-1 only; unpaid invoices NOT included; Transfer excluded)
    // Actual Outflow = 200,000 (CTX-OUT-1 only; unpaid bills & Draft tx NOT included; Transfer excluded)
    expect(state.kpis.actualCashInflow).toBe(500000);
    expect(state.kpis.actualCashOutflow).toBe(200000);
    expect(state.kpis.actualNetCashFlow).toBe(300000);

    // Multi-source forecast within window 2026-07-01..2026-09-30:
    // Expected Inflows:
    // - INV-OPEN-1 (400,000 due 2026-07-28); INV-OVERDUE-1 is 2026-06-25 (outside window, still counted in outstandingReceivables!)
    // - CP-1 deduplicated because INV-BOLE-002 is already covered by INV-OPEN-1!
    // - CP-2 (350,000 expected 2026-08-18)
    // Total expected inflows in window = 400,000 + 350,000 = 750,000
    expect(state.kpis.totalExpectedInflows).toBe(750000);

    // Expected Outflows in window:
    // - EXP-OPEN-1 (600,000 due 2026-07-25)
    // - PP-1 (180,000 due 2026-08-12)
    // - PR-2026-08 (220,000 due 2026-08-28)
    // - BAL-2026-09 (300,000 due 2026-09-28; Sep already has 150k tax, so incremental gap = 300k - 150k = 150k!)
    // - CFF-EXP-1 (150,000 due 2026-09-15)
    // Total = 600,000 + 180,000 + 220,000 + 150,000 + 150,000 = 1,300,000
    expect(state.kpis.totalExpectedOutflows).toBe(1300000);
    expect(state.kpis.forecastNetCashFlow).toBe(750000 - 1300000);
    expect(state.kpis.cashFlowVariance).toBe(300000 - -550000);

    // Outstanding receivables includes both INV-OPEN-1 (400k) and INV-OVERDUE-1 (250k) = 650,000
    expect(state.kpis.outstandingReceivables).toBe(650000);
    expect(state.kpis.overdueReceivables).toBe(250000);

    // Upcoming payables includes EXP-OPEN-1 (600k) + PR-2026-08 (220k) = 820,000
    expect(state.kpis.upcomingPayables).toBe(820000);

    // Net Cash Position = Available Cash (1,400,000) + Expected Inflows (750,000) - Expected Outflows (1,300,000)
    expect(state.kpis.netCashPosition).toBe(850000);

    // Opening + Net = Closing check across periodSeries
    const first = state.periodSeries[0];
    expect(first.openingBalance).toBeCloseTo(state.kpis.openingCashBalance, 2);
    const last = state.periodSeries[state.periodSeries.length - 1];
    expect(last.closingBalance).toBeCloseTo(
      state.kpis.openingCashBalance + state.kpis.actualNetCashFlow,
      2
    );
  });

  it("handles inter-account transfers neutrally at consolidated level and directionally when filtered to a single account", () => {
    const cbeOnly = computePart5CashFlowState({
      cashTransactions: mockCashTxs,
      invoices: [],
      expenses: [],
      collectionPlans: [],
      paymentPlans: [],
      payrollRecords: [],
      projectBudgetPlans: [],
      budgetAllocations: [],
      financialTargets: [],
      financialAccounts: mockAccounts,
      explicitForecastItems: [],
      bankReconciliations: [],
      filterState: { ...BASE_FILTER, bankAccountId: "ACC-CBE-MAIN" },
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });
    // CBE received 500k collection, paid 200k expense + 50k outgoing transfer = 250k outflow
    expect(cbeOnly.kpis.actualCashInflow).toBe(500000);
    expect(cbeOnly.kpis.actualCashOutflow).toBe(250000);
    expect(cbeOnly.kpis.actualNetCashFlow).toBe(250000);

    const pettyOnly = computePart5CashFlowState({
      cashTransactions: mockCashTxs,
      invoices: [],
      expenses: [],
      collectionPlans: [],
      paymentPlans: [],
      payrollRecords: [],
      projectBudgetPlans: [],
      budgetAllocations: [],
      financialTargets: [],
      financialAccounts: mockAccounts,
      explicitForecastItems: [],
      bankReconciliations: [],
      filterState: { ...BASE_FILTER, bankAccountId: "ACC-PETTY-BOLE" },
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });
    // Petty cash received 50k incoming transfer
    expect(pettyOnly.kpis.actualCashInflow).toBe(50000);
    expect(pettyOnly.kpis.actualCashOutflow).toBe(0);
    expect(pettyOnly.kpis.actualNetCashFlow).toBe(50000);
  });

  it("supports Daily, Monthly, Quarterly, and Annual forecasting horizons", () => {
    for (const granularity of ["Daily", "Monthly", "Quarterly", "Annual"] as const) {
      const state = computePart5CashFlowState({
        cashTransactions: mockCashTxs,
        invoices: mockInvoices,
        expenses: mockExpenses,
        collectionPlans: mockCollectionPlans,
        paymentPlans: mockPaymentPlans,
        payrollRecords: mockPayroll,
        projectBudgetPlans: mockBudgetPlans,
        budgetAllocations: mockAllocations,
        financialTargets: mockTargets,
        financialAccounts: mockAccounts,
        explicitForecastItems: mockForecastItems,
        bankReconciliations: mockReconciliations,
        filterState: { ...BASE_FILTER, granularity },
        userRole: UserRole.FINANCE_MANAGER,
        referenceToday: REF_TODAY,
      });

      expect(state.periodSeries.length).toBeGreaterThan(0);
      expect(state.charts.actualVsForecastCashFlow.length).toBe(state.periodSeries.length);
      expect(state.charts.monthlyClosingBalance.length).toBe(state.periodSeries.length);
    }
  });

  it("detects forecast cash shortages and generates insufficient cash, overdue collection, and 14-day obligation alerts", () => {
    const lowCashAccounts: FinancialAccount[] = [
      {
        ...mockAccounts[0],
        currentBalance: 100000, // Below 300,000 minimum threshold AND insufficient for 600k due in 5 days
        minimumThreshold: 300000,
      },
    ];

    const state = computePart5CashFlowState({
      cashTransactions: mockCashTxs,
      invoices: mockInvoices,
      expenses: mockExpenses,
      collectionPlans: [],
      paymentPlans: [],
      payrollRecords: [],
      projectBudgetPlans: [],
      budgetAllocations: [],
      financialTargets: [],
      financialAccounts: lowCashAccounts,
      explicitForecastItems: [],
      bankReconciliations: [
        {
          id: "REC-DISC-1",
          reconciliationNo: "REC-20260719-1001",
          accountId: "ACC-CBE-MAIN",
          accountName: "CBE Main Operating Account",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-19",
          statementOpeningBalance: 800000,
          statementClosingBalance: 95000,
          bookOpeningBalance: 800000,
          bookClosingBalance: 100000,
          reconciledInflowsTotal: 500000,
          reconciledOutflowsTotal: 200000,
          unreconciledBookCount: 0,
          unreconciledBookNet: 0,
          unmatchedStatementNet: -5000,
          discrepancyAmount: -5000,
          reconciledTxIds: [],
          statementLines: [],
          approvalStatus: "Disputed",
          preparedBy: "Accountant",
          createdAt: "2026-07-19",
          updatedAt: "2026-07-19",
        },
      ],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    expect(state.kpis.forecastCashShortage).toBeGreaterThan(0);
    expect(state.shortageItems.length).toBeGreaterThan(0);

    const alertTypes = state.alerts.map((a) => a.type);
    expect(alertTypes).toContain("Insufficient Cash");
    expect(alertTypes).toContain("Forecast Cash Shortage");
    expect(alertTypes).toContain("Overdue Collection");
    expect(alertTypes).toContain("Upcoming Obligation");
    expect(alertTypes).toContain("Bank Reconciliation Discrepancy");
  });

  it("auto-matches bank statement lines with ERP book transactions and computes reconciliation discrepancy", () => {
    const summary = computeBankReconciliationSummary({
      account: mockAccounts[0],
      periodStart: "2026-07-01",
      periodEnd: "2026-07-20",
      statementOpeningBalance: 1000000,
      statementClosingBalance: 1245000, // 5,000 variance vs book closing 1,250,000
      cashTransactions: mockCashTxs,
      statementLines: [
        {
          id: "BSL-1",
          statementDate: "2026-07-10",
          bankReferenceNo: "FT-9901",
          description: "Client IPC Deposit",
          direction: "Credit",
          amount: 500000,
          matchStatus: "Unmatched",
        },
        {
          id: "BSL-2",
          statementDate: "2026-07-12",
          bankReferenceNo: "FT-9902",
          description: "Derba Cement Transfer",
          direction: "Debit",
          amount: 200000,
          matchStatus: "Unmatched",
        },
        {
          id: "BSL-3",
          statementDate: "2026-07-18",
          bankReferenceNo: "CHG-01",
          description: "Unrecorded Bank Charge",
          direction: "Debit",
          amount: 5000,
          matchStatus: "Unmatched",
        },
      ],
      referenceToday: REF_TODAY,
    });

    expect(summary.bookClosingBalance).toBe(1250000);
    expect(summary.bookInflows).toBe(500000);
    expect(summary.bookOutflows).toBe(250000); // 200k payment + 50k outgoing transfer
    expect(summary.bookOpeningBalance).toBe(1000000);
    expect(summary.matchedTxIds).toContain("CTX-IN-1");
    expect(summary.matchedTxIds).toContain("CTX-OUT-1");
    expect(summary.unreconciledBookCount).toBe(1); // CTX-TRF-1 unmatched on statement
    expect(summary.unmatchedStatementNet).toBe(-5000);
    expect(summary.discrepancyAmount).toBe(-5000);
  });

  it("enforces duplicate checks, RBAC permissions, and persists forecast & bank reconciliation workflows with audit trails", async () => {
    const saveForecastSpy = vi
      .spyOn(DbService, "saveCashFlowForecastItem")
      .mockResolvedValue(undefined);
    const saveRecSpy = vi
      .spyOn(DbService, "saveBankReconciliation")
      .mockResolvedValue(undefined);
    const auditSpy = vi.spyOn(DbService, "addAuditLog").mockResolvedValue(undefined);

    // Site Engineer cannot create cash flow forecasts
    await expect(
      createCashFlowForecastItem({
        direction: "Inflow",
        category: "Client Payments",
        project: "Bole Tower",
        expectedDate: "2026-08-25",
        amount: 100000,
        counterparty: "Client",
        sourceType: "Manual Forecast",
        actorName: "Eng. Site",
        actorRole: UserRole.SITE_ENGINEER,
        actorUid: "uid-se",
      })
    ).rejects.toThrow(/permission/i);

    // Accountant creates submitted forecast -> status Submitted (needs FM/Director approval)
    const createdByAccountant = await createCashFlowForecastItem({
      direction: "Outflow",
      category: "Equipment Costs",
      project: "Bole Tower",
      expectedDate: "2026-08-25",
      amount: 125000,
      counterparty: "Tower Crane Rental",
      sourceType: "Manual Forecast",
      linkedReferenceNo: "TCR-88",
      submitForApproval: true,
      existingForecasts: [],
      actorName: "Abebe Acc",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "uid-acc",
    });
    expect(createdByAccountant.approvalStatus).toBe("Submitted");
    expect(saveForecastSpy).toHaveBeenCalledTimes(1);

    // Duplicate forecast for same reference & date blocked
    await expect(
      createCashFlowForecastItem({
        direction: "Outflow",
        category: "Equipment Costs",
        project: "Bole Tower",
        expectedDate: "2026-08-25",
        amount: 125000,
        counterparty: "Tower Crane Rental",
        sourceType: "Manual Forecast",
        linkedReferenceNo: "TCR-88",
        existingForecasts: [createdByAccountant],
        actorName: "Abebe Acc",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "uid-acc",
      })
    ).rejects.toThrow(/Duplicate forecast/i);

    // Accountant cannot approve forecast
    await expect(
      advanceCashFlowForecastStatus({
        item: createdByAccountant,
        nextStatus: "Approved",
        actorName: "Abebe Acc",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "uid-acc",
      })
    ).rejects.toThrow(/Only Finance Manager or Director/i);

    // Finance Manager approves forecast
    const approved = await advanceCashFlowForecastStatus({
      item: createdByAccountant,
      nextStatus: "Approved",
      actorName: "Sara FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "uid-fm",
    });
    expect(approved.approvalStatus).toBe("Approved");
    expect(approved.auditHistory?.length).toBe(2);

    // Bank reconciliation creation with 0 discrepancy auto-reconciles for Finance Manager
    const rec = await createOrSaveBankReconciliation({
      account: mockAccounts[0],
      periodStart: "2026-07-01",
      periodEnd: "2026-07-20",
      statementOpeningBalance: 1000000,
      statementClosingBalance: 1250000,
      cashTransactions: mockCashTxs,
      submitForSignoff: true,
      existingReconciliations: [],
      actorName: "Sara FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "uid-fm",
    });
    expect(rec.approvalStatus).toBe("Reconciled");
    expect(rec.discrepancyAmount).toBe(0);
    expect(saveRecSpy).toHaveBeenCalledTimes(1);

    // Re-reconciling exact same finalized period throws duplicate guard
    await expect(
      createOrSaveBankReconciliation({
        account: mockAccounts[0],
        periodStart: "2026-07-01",
        periodEnd: "2026-07-20",
        statementOpeningBalance: 1000000,
        statementClosingBalance: 1250000,
        cashTransactions: mockCashTxs,
        existingReconciliations: [rec],
        actorName: "Sara FM",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "uid-fm",
      })
    ).rejects.toThrow(/already exists/i);

    // Disputing reconciliation requires Finance Manager or Director
    const disputed = await advanceBankReconciliationStatus({
      record: rec,
      nextStatus: "Disputed",
      notes: "Audit review flag",
      actorName: "Director",
      actorRole: UserRole.SUPER_ADMIN,
      actorUid: "uid-dir",
    });
    expect(disputed.approvalStatus).toBe("Disputed");
    expect(auditSpy).toHaveBeenCalled();

    saveForecastSpy.mockRestore();
    saveRecSpy.mockRestore();
    auditSpy.mockRestore();
  });

  it("restricts Project Manager cash flow visibility strictly to assigned projects", () => {
    const pmState = computePart5CashFlowState({
      cashTransactions: mockCashTxs,
      invoices: mockInvoices, // Contains Bole Tower AND Kilinto Housing
      expenses: mockExpenses,
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      payrollRecords: mockPayroll,
      projectBudgetPlans: mockBudgetPlans,
      budgetAllocations: mockAllocations,
      financialTargets: mockTargets,
      financialAccounts: mockAccounts,
      explicitForecastItems: mockForecastItems,
      bankReconciliations: mockReconciliations,
      projects: [{ id: "P1", name: "Bole Tower", manager: "Eng. Dawit" }],
      filterState: BASE_FILTER,
      userRole: UserRole.PROJECT_MANAGER,
      userProfile: { name: "Eng. Dawit", assignedProject: "Bole Tower" },
      referenceToday: REF_TODAY,
    });

    expect(pmState.assignedProjects).toEqual(["Bole Tower"]);
    // Kilinto Housing overdue invoice (250k) must NOT leak into PM's receivables
    expect(pmState.kpis.outstandingReceivables).toBe(400000);
    expect(pmState.kpis.overdueReceivables).toBe(0);
  });

  it("builds all 7 Cash Flow & Bank Reconciliation reports cleanly", () => {
    const state = computePart5CashFlowState({
      cashTransactions: mockCashTxs,
      invoices: mockInvoices,
      expenses: mockExpenses,
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      payrollRecords: mockPayroll,
      projectBudgetPlans: mockBudgetPlans,
      budgetAllocations: mockAllocations,
      financialTargets: mockTargets,
      financialAccounts: [{ ...mockAccounts[0], currentBalance: 50000, minimumThreshold: 300000 }],
      explicitForecastItems: mockForecastItems,
      bankReconciliations: [
        {
          id: "REC-1",
          reconciliationNo: "REC-20260720-01",
          accountId: "ACC-CBE-MAIN",
          accountName: "CBE Main Operating Account",
          periodStart: "2026-07-01",
          periodEnd: "2026-07-20",
          statementOpeningBalance: 1000000,
          statementClosingBalance: 50000,
          bookOpeningBalance: 1000000,
          bookClosingBalance: 50000,
          reconciledInflowsTotal: 500000,
          reconciledOutflowsTotal: 200000,
          unreconciledBookCount: 0,
          unreconciledBookNet: 0,
          unmatchedStatementNet: 0,
          discrepancyAmount: 0,
          reconciledTxIds: ["CTX-IN-1", "CTX-OUT-1"],
          statementLines: [],
          approvalStatus: "Reconciled",
          preparedBy: "FM",
          createdAt: "2026-07-20",
          updatedAt: "2026-07-20",
        },
      ],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    const reportIds: CashFlowReportTypeId[] = [
      "daily-cash-flow",
      "monthly-cash-flow-statement",
      "quarterly-cash-flow",
      "annual-cash-flow",
      "cash-forecast-report",
      "bank-reconciliation-report",
      "cash-shortage-report",
    ];

    reportIds.forEach((id) => {
      const ds = buildCashFlowReportDataset(id, state);
      expect(ds.id).toBe(id);
      expect(ds.columns.length).toBeGreaterThanOrEqual(4);
      expect(ds.rows.length).toBeGreaterThan(0);
    });
  });
});
