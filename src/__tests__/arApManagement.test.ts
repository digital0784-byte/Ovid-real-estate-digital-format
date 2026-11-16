import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advancePayableWorkflow,
  advanceReceivableWorkflow,
  AGING_BUCKET_LABELS,
  buildArApReportDataset,
  classifyAgingCategory,
  classifyAgingPerformanceThreshold,
  computeAgingPerformanceIndicator,
  computeFinancialDashboardState,
  PAYABLE_CATEGORIES,
  RECEIVABLE_CATEGORIES,
  recordCashCollection,
  recordCashPayment,
  registerPayable,
  registerReceivable,
  togglePayableDispute,
  toggleReceivableDispute,
} from "../services/financeService";
import { DbService } from "../services/db";
import {
  ArApReportTypeId,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialFilterState,
  FinancialInvoiceRecord,
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

describe("Part 3 Accounts Receivable (AR) & Accounts Payable (AP) Management Suite", () => {
  let mockAccounts: FinancialAccount[];
  let mockInvoices: FinancialInvoiceRecord[];
  let mockExpenses: Expense[];
  let mockTxs: CashTransactionRecord[];

  beforeEach(() => {
    mockAccounts = [
      {
        id: "ACC-BANK-1",
        accountCode: "BNK-001",
        accountName: "CBE Corporate Account",
        accountType: "Bank",
        currency: "ETB",
        openingBalance: 2500000,
        currentBalance: 2500000,
        minimumThreshold: 200000,
        project: "Corporate Treasury",
        status: "Active",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
    ];

    mockInvoices = [
      {
        id: "INV-AR-1",
        receivableId: "AR-20260701-0001",
        invoiceNumber: "INV-2026-001",
        contractNumber: "CNT-BOLE-01",
        project: "Bole Tower",
        department: "Contracting",
        receivableCategory: "Certified Payment Receivables",
        client: "Federal Housing Corp",
        subtotalAmount: 1000000,
        taxAmount: 150000,
        amount: 1150000,
        paidAmount: 0,
        status: "Approved",
        workflowStage: "Verified",
        date: "2026-06-01",
        dueDate: "2026-07-28", // Not Yet Due
      },
      {
        id: "INV-AR-2",
        receivableId: "AR-20260601-0002",
        invoiceNumber: "INV-2026-002",
        contractNumber: "CNT-BOLE-02",
        project: "Bole Tower",
        department: "Contracting",
        receivableCategory: "Retention Money Receivables",
        client: "Addis Real Estate",
        subtotalAmount: 400000,
        taxAmount: 0,
        amount: 400000,
        paidAmount: 100000,
        status: "Partially Paid",
        workflowStage: "Verified",
        date: "2026-05-01",
        dueDate: "2026-06-01", // 49 days overdue -> 31-60 Days Overdue
      },
      {
        id: "INV-AR-3",
        receivableId: "AR-20260720-0003",
        invoiceNumber: "INV-2026-003",
        project: "Yeka Villas",
        receivableCategory: "Variation Order Receivables",
        client: "Ovid Holdings",
        amount: 200000,
        paidAmount: 0,
        status: "Approved",
        date: "2026-07-10",
        dueDate: REF_TODAY, // Due Today
      },
      {
        id: "INV-AR-4",
        receivableId: "AR-20260301-0004",
        invoiceNumber: "INV-2026-004",
        project: "Yeka Villas",
        receivableCategory: "Client Contract Receivables",
        client: "Ovid Holdings",
        amount: 300000,
        paidAmount: 300000,
        status: "Paid",
        date: "2026-03-01",
        dueDate: "2026-04-01", // Fully Collected
      },
      {
        id: "INV-AR-5",
        receivableId: "AR-20260615-0005",
        invoiceNumber: "INV-2026-005",
        project: "Bole Tower",
        receivableCategory: "Other Receivables",
        client: "Federal Housing Corp",
        amount: 150000,
        paidAmount: 0,
        isDisputed: true,
        disputeReason: "Pending quantity re-measurement",
        status: "Pending",
        date: "2026-06-15",
        dueDate: "2026-07-05", // Disputed takes precedence
      },
    ];

    mockExpenses = [
      {
        id: "EXP-AP-1",
        payableId: "AP-20260705-0001",
        referenceNo: "AP-20260705-0001",
        billNumber: "SUP-INV-101",
        purchaseOrderNumber: "PO-2026-101",
        category: "Material Supplier Payables",
        payableCategory: "Material Supplier Payables",
        amount: 500000,
        paidAmount: 0,
        date: "2026-06-10",
        dueDate: "2026-07-30", // Not Yet Due
        vendor: "Ethio Cement Corp",
        description: "Cement delivery batch A",
        project: "Bole Tower",
        costCenter: "Materials",
        approvedBy: "Finance Manager",
        status: "Approved",
      },
      {
        id: "EXP-AP-2",
        payableId: "AP-20260610-0002",
        referenceNo: "AP-20260610-0002",
        billNumber: "SUP-INV-102",
        purchaseOrderNumber: "PO-2026-102",
        category: "Subcontractor Payables",
        payableCategory: "Subcontractor Payables",
        amount: 300000,
        paidAmount: 100000,
        date: "2026-05-20",
        dueDate: "2026-06-25", // 25 days overdue -> 1-30 Days Overdue
        vendor: "Habesha Rebar Works",
        description: "Steel rebar fixing",
        project: "Bole Tower",
        costCenter: "Subcontractors",
        approvedBy: "Finance Manager",
        status: "Partially Paid",
      },
      {
        id: "EXP-AP-3",
        payableId: "AP-20260301-0003",
        referenceNo: "AP-20260301-0003",
        billNumber: "SUP-INV-103",
        category: "Equipment Rental Payables",
        payableCategory: "Equipment Rental Payables",
        amount: 250000,
        paidAmount: 0,
        date: "2026-03-01",
        dueDate: "2026-04-01", // >90 Days Overdue
        vendor: "Addis Crane Rentals",
        description: "Tower crane monthly hire",
        project: "Yeka Villas",
        costCenter: "Equipment",
        approvedBy: "Finance Manager",
        status: "Approved",
      },
    ];

    mockTxs = [];

    vi.spyOn(DbService, "addInvoice").mockImplementation(async (inv) => {
      mockInvoices.push(inv);
    });
    vi.spyOn(DbService, "updateInvoice").mockImplementation(async (inv) => {
      const idx = mockInvoices.findIndex((i) => i.id === inv.id);
      if (idx >= 0) mockInvoices[idx] = inv;
    });
    vi.spyOn(DbService, "addExpense").mockImplementation(async (exp) => {
      mockExpenses.push(exp);
    });
    vi.spyOn(DbService, "updateExpense").mockImplementation(async (exp) => {
      const idx = mockExpenses.findIndex((e) => e.id === exp.id);
      if (idx >= 0) mockExpenses[idx] = exp;
    });
    vi.spyOn(DbService, "addAuditLog").mockResolvedValue(undefined);
    vi.spyOn(DbService, "applyCashLedgerAtomic").mockImplementation(async (params) => {
      const idx = mockTxs.findIndex((t) => t.id === params.tx.id);
      if (idx >= 0) mockTxs[idx] = params.tx;
      else mockTxs.push(params.tx);

      if (params.account && params.accountDelta) {
        const acc = mockAccounts.find((a) => a.id === params.account!.id);
        if (acc) acc.currentBalance += params.accountDelta;
      }
      if (params.linkedInvoice && params.invoicePaidDelta) {
        const inv = mockInvoices.find((i) => i.id === params.linkedInvoice!.id);
        if (inv) {
          inv.paidAmount = (inv.paidAmount || 0) + params.invoicePaidDelta;
          inv.status = inv.paidAmount >= inv.amount ? "Paid" : "Partially Paid";
        }
      }
      if (params.linkedExpense && params.expensePaidDelta) {
        const exp = mockExpenses.find((e) => e.id === params.linkedExpense!.id);
        if (exp) {
          exp.paidAmount = (exp.paidAmount || 0) + params.expensePaidDelta;
          exp.status = exp.paidAmount >= exp.amount ? "Paid" : "Partially Paid";
        }
      }
    });
  });

  it("supports all 6 Receivable Categories and 8 Payable Categories with duplicate invoice protection", async () => {
    expect(RECEIVABLE_CATEGORIES).toHaveLength(6);
    expect(PAYABLE_CATEGORIES).toHaveLength(8);

    const createdAr = await registerReceivable({
      project: "Bole Tower",
      client: "Federal Housing Corp",
      contractNumber: "CNT-99",
      invoiceNumber: "INV-NEW-900",
      invoiceDate: "2026-07-15",
      dueDate: "2026-08-15",
      subtotalAmount: 200000,
      taxAmount: 30000,
      receivableCategory: "Advance Payment Receivables",
      paymentTerms: "Net 30",
      existingInvoices: mockInvoices,
      actorName: "Accountant Sara",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });

    expect(createdAr.receivableId).toMatch(/^AR-\d{8}-\d{4}$/);
    expect(createdAr.amount).toBe(230000);
    expect(createdAr.workflowStage).toBe("Registered");
    expect(createdAr.auditHistory).toHaveLength(1);

    await expect(
      registerReceivable({
        project: "Bole Tower",
        client: "Federal Housing Corp",
        invoiceNumber: "INV-NEW-900", // duplicate
        invoiceDate: "2026-07-15",
        dueDate: "2026-08-15",
        subtotalAmount: 100000,
        receivableCategory: "Client Contract Receivables",
        existingInvoices: mockInvoices,
        actorName: "Finance Mgr",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "U-FM",
      })
    ).rejects.toThrow(/Duplicate Invoice Number/i);

    const createdAp = await registerPayable({
      project: "Yeka Villas",
      vendor: "Ethio Steel",
      payableCategory: "Tax Payables",
      purchaseOrderNumber: "PO-777",
      contractNumber: "CNT-77",
      billNumber: "TAX-BILL-2026",
      invoiceDate: "2026-07-16",
      dueDate: "2026-08-16",
      subtotalAmount: 85000,
      taxAmount: 0,
      description: "Withholding tax settlement",
      existingExpenses: mockExpenses,
      actorName: "Finance Mgr",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    expect(createdAp.payableId).toMatch(/^AP-\d{8}-\d{4}$/);
    expect(createdAp.workflowStage).toBe("Approved");
  });

  it("classifies all 6 AR lifecycle statuses and all 5 Part 3 aging buckets accurately", () => {
    expect(AGING_BUCKET_LABELS).toEqual([
      "Not Yet Due",
      "1–30 Days Overdue",
      "31–60 Days Overdue",
      "61–90 Days Overdue",
      "Above 90 Days Overdue",
    ]);

    expect(classifyAgingCategory(-5)).toBe("Not Yet Due");
    expect(classifyAgingCategory(0)).toBe("Not Yet Due");
    expect(classifyAgingCategory(1)).toBe("1–30 Days Overdue");
    expect(classifyAgingCategory(45)).toBe("31–60 Days Overdue");
    expect(classifyAgingCategory(80)).toBe("61–90 Days Overdue");
    expect(classifyAgingCategory(110)).toBe("Above 90 Days Overdue");

    const state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      financialTargets: [],
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    const byInv = Object.fromEntries(state.allDimInvoices.map((i) => [i.id, i]));
    expect(byInv["INV-AR-1"].arLifecycleStatus).toBe("Not Yet Due");
    expect(byInv["INV-AR-2"].arLifecycleStatus).toBe("Overdue"); // Past due with partial payment remains Overdue
    expect(byInv["INV-AR-3"].arLifecycleStatus).toBe("Due Today");
    expect(byInv["INV-AR-4"].arLifecycleStatus).toBe("Fully Collected");
    expect(byInv["INV-AR-5"].arLifecycleStatus).toBe("Disputed");

    // Non-overdue invoice with partial collection resolves to Partially Collected
    const partialState = computeFinancialDashboardState({
      invoices: [{ ...mockInvoices[0], paidAmount: 250000 }],
      expenses: [],
      cashTransactions: [],
      financialTargets: [],
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });
    expect(partialState.allDimInvoices[0].arLifecycleStatus).toBe("Partially Collected");

    // Check Executive Dashboard AR/AP Metrics
    expect(state.metrics.totalReceivables).toBe(2200000);
    expect(state.metrics.totalCollectedReceivables).toBe(400000);
    expect(state.metrics.outstandingReceivables).toBe(1800000);
    expect(state.metrics.receivablesDueThisMonth).toBe(1500000); // INV-1 (1.15M) + INV-3 (200K) + INV-5 (150K)
    expect(state.metrics.netReceivablePosition).toBe(1800000 - 950000);
  });

  it("evaluates all 5 non-overlapping Aging Performance Indicator thresholds with negative & liquidity safeguards", () => {
    expect(classifyAgingPerformanceThreshold(25)).toMatchObject({ color: "Green", tier: "Above +20%" });
    expect(classifyAgingPerformanceThreshold(18)).toMatchObject({ color: "Yellow", tier: "+15% to +20%" });
    expect(classifyAgingPerformanceThreshold(10)).toMatchObject({ color: "Yellow", tier: "0% to +15%" });
    expect(classifyAgingPerformanceThreshold(0)).toMatchObject({ color: "Yellow", tier: "0% to +15%" });
    expect(classifyAgingPerformanceThreshold(-10)).toMatchObject({ color: "Red", tier: "0% to -20%" });
    expect(classifyAgingPerformanceThreshold(-35)).toMatchObject({ color: "Red", tier: "Below -20%" });

    // Negative / invalid balance safety guard -> must NEVER classify Green
    const negGuard = computeAgingPerformanceIndicator({
      domain: "AP",
      currentOverdueAmount: -5000,
      previousOverdueAmount: 100000,
      currentOutstandingAmount: 50000,
      previousOutstandingAmount: 100000,
      availableLiquidity: 500000,
    });
    expect(negGuard.color).toBe("Red");

    // AP Liquidity Safeguard -> high overdue AP reduction when cash < outstanding AP must downgrade Green to Yellow + liquidityWarning
    const apLiquidityShort = computeAgingPerformanceIndicator({
      domain: "AP",
      currentOverdueAmount: 100000,
      previousOverdueAmount: 500000, // +80% reduction
      currentOutstandingAmount: 900000,
      previousOutstandingAmount: 1000000,
      availableLiquidity: 200000, // < 900,000 open AP
    });
    expect(apLiquidityShort.liquidityWarning).toBe(true);
    expect(apLiquidityShort.color).toBe("Yellow");
  });

  it("enforces over-collection guard unless Finance Manager / Director supplies Authorized Adjustment with reason", async () => {
    const inv = mockInvoices[2]; // INV-AR-3, open = 200,000

    await expect(
      recordCashCollection({
        tx: {
          date: REF_TODAY,
          amount: 250000,
          accountId: "ACC-BANK-1",
          accountName: "CBE Corporate Account",
          project: "Yeka Villas",
          department: "Contracting",
          category: "Variation Order Receivables",
          counterparty: "Ovid Holdings",
          linkedDocumentType: "Invoice",
          linkedDocumentId: inv.id,
          paymentMethod: "Bank Transfer",
          status: "Verified & Confirmed",
          createdBy: "Accountant",
          createdById: "U-ACC",
        },
        targetAccount: mockAccounts[0],
        linkedInvoice: inv,
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/exceeds open invoice balance/i);

    // Finance Manager with Authorized Adjustment + reason succeeds
    const adjustedTx = await recordCashCollection({
      tx: {
        date: REF_TODAY,
        amount: 220000,
        accountId: "ACC-BANK-1",
        accountName: "CBE Corporate Account",
        project: "Yeka Villas",
        department: "Contracting",
        category: "Variation Order Receivables",
        counterparty: "Ovid Holdings",
        linkedDocumentType: "Invoice",
        linkedDocumentId: inv.id,
        paymentMethod: "Bank Transfer",
        status: "Verified & Confirmed",
        isAuthorizedAdjustment: true,
        adjustmentReason: "Includes agreed late-payment penalty adjustment",
        createdBy: "Finance Manager",
        createdById: "U-FM",
      },
      targetAccount: mockAccounts[0],
      linkedInvoice: inv,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    expect(adjustedTx.isAuthorizedAdjustment).toBe(true);
    expect(mockAccounts[0].currentBalance).toBe(2720000);
  });

  it("enforces AP Director approval threshold & multi-stage AR/AP workflows + Dispute toggling", async () => {
    const exp = mockExpenses[0]; // 500,000 open
    const payment = await recordCashPayment({
      tx: {
        date: REF_TODAY,
        amount: 350000,
        accountId: "ACC-BANK-1",
        accountName: "CBE Corporate Account",
        project: "Bole Tower",
        department: "Procurement",
        category: "Material Supplier Payables",
        counterparty: "Ethio Cement Corp",
        linkedDocumentType: "Expense",
        linkedDocumentId: exp.id,
        paymentMethod: "Bank Transfer",
        status: "Confirmed & Paid",
        createdBy: "Finance Manager",
        createdById: "U-FM",
      },
      sourceAccount: mockAccounts[0],
      linkedExpense: exp,
      directorApprovalThresholdEtb: 300000, // 350k > 300k -> requires Director
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    expect(payment.status).toBe("Director Approval Required");
    expect(mockAccounts[0].currentBalance).toBe(2500000); // Not deducted yet

    // Advance AR & AP Workflow Stages & Disputes
    const arRec = await registerReceivable({
      project: "Bole Tower",
      client: "Federal Housing Corp",
      invoiceNumber: "INV-WF-1",
      invoiceDate: "2026-07-18",
      dueDate: "2026-08-18",
      subtotalAmount: 100000,
      receivableCategory: "Client Contract Receivables",
      existingInvoices: mockInvoices,
      actorName: "Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });

    const arReviewed = await advanceReceivableWorkflow({
      invoice: arRec,
      targetStage: "Finance Review",
      actorName: "Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });
    expect(arReviewed.workflowStage).toBe("Finance Review");

    await expect(
      advanceReceivableWorkflow({
        invoice: arReviewed,
        targetStage: "Verified",
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Only Finance Manager or Director/i);

    const arVerified = await advanceReceivableWorkflow({
      invoice: arReviewed,
      targetStage: "Verified",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(arVerified.workflowStage).toBe("Verified");

    const arDisputed = await toggleReceivableDispute({
      invoice: arVerified,
      disputed: true,
      reason: "Client contested steel tonnage",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(arDisputed.isDisputed).toBe(true);

    const apUpdated = await advancePayableWorkflow({
      expense: mockExpenses[1],
      targetStage: "Supporting Docs Verified",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(apUpdated.workflowStage).toBe("Supporting Docs Verified");

    const apDisputed = await togglePayableDispute({
      expense: apUpdated,
      disputed: true,
      reason: "GRN quantity mismatch",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(apDisputed.isDisputed).toBe(true);
  });

  it("generates all 12 AR & AP reports and filters accurately by Project, Client, Supplier, Aging & Category", () => {
    const state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      financialTargets: [],
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    const reportIds: ArApReportTypeId[] = [
      "accounts-receivable-report",
      "accounts-payable-report",
      "client-outstanding-balance-report",
      "supplier-outstanding-balance-report",
      "project-receivable-report",
      "project-payable-report",
      "aging-receivable-report",
      "aging-payable-report",
      "monthly-collection-report",
      "monthly-payment-report",
      "overdue-receivable-report",
      "overdue-payable-report",
    ];

    reportIds.forEach((id) => {
      const ds = buildArApReportDataset(id, state);
      expect(ds.id).toBe(id);
      expect(ds.columns.length).toBeGreaterThan(0);
    });

    const filteredBoleAr = buildArApReportDataset("accounts-receivable-report", state, {
      project: "Bole Tower",
      agingCategory: "31–60 Days Overdue",
    });
    expect(filteredBoleAr.rows).toHaveLength(1);
    expect(filteredBoleAr.rows[0].invoiceNumber).toBe("INV-2026-002");

    const overdueAp = buildArApReportDataset("overdue-payable-report", state, {
      supplier: "Addis Crane Rentals",
    });
    expect(overdueAp.rows).toHaveLength(1);
    expect(overdueAp.rows[0].outstanding).toBe(250000);
  });
});
