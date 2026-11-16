import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveAndConfirmPayment,
  buildCashCollectionPaymentAnalytics,
  buildCashReportDataset,
  computeFinancialDashboardState,
  PAYMENT_PLANNING_CATEGORIES,
  recordCashCollection,
  recordCashPayment,
  rejectCashTransaction,
  resolveUserFinancePermissions,
  reverseConfirmedCashTransaction,
  validateCashTransactionCandidate,
  verifyAndConfirmCollection,
} from "../services/financeService";
import { DbService } from "../services/db";
import {
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialFilterState,
  FinancialInvoiceRecord,
  MonthlyCollectionPlan,
  MonthlyPaymentPlan,
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
const META_FIELDS = {
  createdBy: "System Test",
  createdById: "USR-TEST",
  createdAt: "2026-07-01T08:00:00.000Z",
  updatedAt: "2026-07-01T08:00:00.000Z",
};

describe("Part 2 Cash Collection & Cash Payment Management Acceptance Suite", () => {
  let mockAccounts: FinancialAccount[];
  let mockInvoices: FinancialInvoiceRecord[];
  let mockExpenses: Expense[];
  let mockTxs: CashTransactionRecord[];
  let mockCollectionPlans: MonthlyCollectionPlan[];
  let mockPaymentPlans: MonthlyPaymentPlan[];

  beforeEach(() => {
    mockAccounts = [
      {
        id: "ACC-CBE",
        accountCode: "BNK-001",
        accountName: "CBE Corporate Account",
        accountType: "Bank",
        bankName: "Commercial Bank of Ethiopia",
        currency: "ETB",
        openingBalance: 1000000,
        currentBalance: 1000000,
        minimumThreshold: 100000,
        project: "Corporate Treasury",
        status: "Active",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
      {
        id: "ACC-PETTY",
        accountCode: "CSH-001",
        accountName: "Head Office Petty Cash",
        accountType: "Cash",
        currency: "ETB",
        openingBalance: 150000,
        currentBalance: 150000,
        minimumThreshold: 25000,
        project: "Corporate Treasury",
        status: "Active",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
    ];

    mockInvoices = [
      {
        id: "INV-101",
        referenceNo: "REV-20260701-1001",
        invoiceNumber: "INV-2026-101",
        contractNumber: "CTR-BOLE-01",
        project: "Bole Tower",
        department: "Contracting",
        category: "IPC",
        client: "Federal Housing Corp",
        amount: 1000000,
        paidAmount: 0,
        status: "Approved",
        date: "2026-07-01",
        dueDate: "2026-07-25",
      },
      {
        id: "INV-102",
        referenceNo: "REV-20260702-1002",
        invoiceNumber: "INV-2026-102",
        contractNumber: "CTR-YEKA-02",
        project: "Yeka Villas",
        department: "Contracting",
        category: "Milestone",
        client: "Addis Real Estate",
        amount: 400000,
        paidAmount: 0,
        status: "Approved",
        date: "2026-07-02",
        dueDate: "2026-06-15",
      },
    ];

    mockExpenses = [
      {
        id: "EXP-201",
        referenceNo: "EXP-20260702-2001",
        billNumber: "BILL-CEM-01",
        category: "Material Suppliers",
        amount: 600000,
        paidAmount: 0,
        date: "2026-07-02",
        dueDate: "2026-07-28",
        vendor: "Mugher Cement Factory",
        description: "Bulk OPC cement",
        project: "Bole Tower",
        department: "Procurement",
        costCenter: "CC-101",
        approvedBy: "Finance Manager",
        status: "Approved",
      },
      {
        id: "EXP-202",
        referenceNo: "EXP-20260705-2002",
        billNumber: "BILL-EQP-02",
        category: "Equipment Rental",
        amount: 800000,
        paidAmount: 0,
        date: "2026-07-05",
        dueDate: "2026-08-05",
        vendor: "Heavy Crane Leasing",
        description: "Tower crane monthly rental",
        project: "Yeka Villas",
        department: "Machinery",
        costCenter: "CC-105",
        approvedBy: "Director",
        status: "Approved",
      },
    ];

    mockTxs = [];

    mockCollectionPlans = [
      {
        id: "CPL-1",
        planNumber: "CPL-202607-001",
        financialYear: "2026",
        month: "2026-07",
        targetScope: "Project",
        project: "Bole Tower",
        customer: "Federal Housing Corp",
        department: "Contracting",
        contractNumber: "CTR-BOLE-01",
        invoiceNumber: "INV-2026-101",
        plannedAmount: 800000,
        expectedDate: "2026-07-15",
        responsiblePerson: "Selamawit (Finance Manager)",
        approvalStatus: "Approved",
        ...META_FIELDS,
      },
      {
        id: "CPL-2",
        planNumber: "CPL-202607-002",
        financialYear: "2026",
        month: "2026-07",
        targetScope: "Customer",
        project: "Yeka Villas",
        customer: "Addis Real Estate",
        department: "Contracting",
        contractNumber: "CTR-YEKA-02",
        invoiceNumber: "INV-2026-102",
        plannedAmount: 400000,
        expectedDate: "2026-07-28",
        responsiblePerson: "Selamawit (Finance Manager)",
        approvalStatus: "Approved",
        ...META_FIELDS,
      },
      {
        id: "CPL-3-DRAFT",
        planNumber: "CPL-202607-003",
        financialYear: "2026",
        month: "2026-07",
        targetScope: "Company",
        project: "All Projects",
        customer: "All Customers",
        department: "All Departments",
        contractNumber: "",
        invoiceNumber: "",
        plannedAmount: 9999999,
        expectedDate: "2026-07-30",
        responsiblePerson: "Draft Only",
        approvalStatus: "Draft", // Must NOT count toward approved planned cash collection
        ...META_FIELDS,
      },
    ];

    mockPaymentPlans = [
      {
        id: "PPL-1",
        planNumber: "PPL-202607-001",
        financialYear: "2026",
        month: "2026-07",
        project: "Bole Tower",
        department: "Procurement",
        supplierOrPayee: "Mugher Cement Factory",
        expenseCategory: "Material Suppliers",
        invoiceNumber: "BILL-CEM-01",
        plannedAmount: 500000,
        expectedDate: "2026-07-22",
        responsiblePerson: "Abebe (Accountant)",
        approvalStatus: "Approved",
        ...META_FIELDS,
      },
      {
        id: "PPL-2",
        planNumber: "PPL-202607-002",
        financialYear: "2026",
        month: "2026-07",
        project: "Yeka Villas",
        department: "Machinery",
        supplierOrPayee: "Heavy Crane Leasing",
        expenseCategory: "Equipment Rental",
        invoiceNumber: "BILL-EQP-02",
        plannedAmount: 300000,
        expectedDate: "2026-07-25",
        responsiblePerson: "Abebe (Accountant)",
        approvalStatus: "Approved",
        ...META_FIELDS,
      },
    ];

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
          inv.paidAmount = Math.max(0, (inv.paidAmount || 0) + params.invoicePaidDelta);
          inv.status = inv.paidAmount >= inv.amount ? "Paid" : inv.paidAmount > 0 ? "Partial" : "Approved";
        }
      }
      if (params.linkedExpense && params.expensePaidDelta) {
        const exp = mockExpenses.find((e) => e.id === params.linkedExpense!.id);
        if (exp) {
          exp.paidAmount = Math.max(0, (exp.paidAmount || 0) + params.expensePaidDelta);
          exp.status = exp.paidAmount >= exp.amount ? "Paid" : exp.paidAmount > 0 ? "Partial" : "Approved";
        }
      }
    });

    vi.spyOn(DbService, "saveCashTransaction").mockImplementation(async (tx) => {
      const idx = mockTxs.findIndex((t) => t.id === tx.id);
      if (idx >= 0) mockTxs[idx] = tx;
      else mockTxs.push(tx);
    });

    vi.spyOn(DbService, "addAuditLog").mockResolvedValue(undefined);
  });

  it("Test 1 & 4: Incorporates approved monthly collection & payment plans (including all 11 categories) and excludes Draft plans", () => {
    expect(PAYMENT_PLANNING_CATEGORIES).toHaveLength(11);
    expect(PAYMENT_PLANNING_CATEGORIES).toContain("Restaurant and Food");
    expect(PAYMENT_PLANNING_CATEGORIES).toContain("Vehicle Rental");
    expect(PAYMENT_PLANNING_CATEGORIES).toContain("Equipment Rental");

    const state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    expect(state.metrics.plannedCashCollection).toBe(1200000);
    expect(state.metrics.plannedCashPayment).toBe(800000);
  });

  it("Test 2, 7 & 9: Pending customer collection does NOT alter Cash/Bank, Cash Flow, or AR until Finance Manager verifies & confirms", async () => {
    const pendingCol = await recordCashCollection({
      tx: {
        date: "2026-07-10",
        amount: 300000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE Corporate Account",
        project: "Bole Tower",
        department: "Treasury",
        category: "Milestone Collection",
        counterparty: "Federal Housing Corp",
        linkedDocumentType: "Invoice",
        linkedDocumentId: "INV-101",
        linkedReferenceNo: "INV-2026-101",
        invoiceNumber: "INV-2026-101",
        contractNumber: "CTR-BOLE-01",
        paymentMethod: "Bank Transfer",
        bankReferenceNumber: "CBE-FT-9001",
        receiptNumber: "RCP-7001",
        status: "Verified & Confirmed",
        createdBy: "Abebe Accountant",
        createdById: "USR-ACC",
      },
      targetAccount: mockAccounts[0],
      linkedInvoice: mockInvoices[0],
      existingTransactions: mockTxs,
      actorName: "Abebe Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "USR-ACC",
    });

    expect(pendingCol.status).toBe("Pending Verification");
    expect(mockAccounts[0].currentBalance).toBe(1000000);
    expect(mockInvoices[0].paidAmount).toBe(0);

    let state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });
    expect(state.metrics.actualCashCollection).toBe(0);
    expect(state.metrics.outstandingReceivables).toBe(1400000);
    expect(state.pendingApprovalTransactions).toHaveLength(1);

    const confirmedCol = await verifyAndConfirmCollection({
      tx: pendingCol,
      targetAccount: mockAccounts[0],
      linkedInvoice: mockInvoices[0],
      actorName: "Selamawit FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "USR-FM",
    });

    expect(confirmedCol.status).toBe("Verified & Confirmed");
    expect(mockAccounts[0].currentBalance).toBe(1300000);
    expect(mockInvoices[0].paidAmount).toBe(300000);

    state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    expect(state.metrics.actualCashCollection).toBe(300000);
    expect(state.metrics.outstandingReceivables).toBe(1100000);
    expect(state.metrics.totalBankBalance).toBe(1300000);
    expect(state.metrics.netCashFlow).toBe(300000);
    expect(state.metrics.collectionAchievementPct).toBe(25);
    expect(state.metrics.outstandingCollectionTarget).toBe(900000);
  });

  it("Test 3: Supports partial & multiple customer payments against a single invoice and guards against over-collection", async () => {
    await recordCashCollection({
      tx: {
        date: "2026-07-08",
        amount: 250000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE Corporate Account",
        project: "Bole Tower",
        department: "Treasury",
        category: "Milestone Collection",
        counterparty: "Federal Housing Corp",
        linkedDocumentType: "Invoice",
        linkedDocumentId: "INV-101",
        invoiceNumber: "INV-2026-101",
        paymentMethod: "Bank Transfer",
        bankReferenceNumber: "FT-100",
        receiptNumber: "RCP-100",
        status: "Verified & Confirmed",
        createdBy: "Selamawit FM",
        createdById: "USR-FM",
      },
      targetAccount: mockAccounts[0],
      linkedInvoice: mockInvoices[0],
      existingTransactions: mockTxs,
      actorName: "Selamawit FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "USR-FM",
    });

    await recordCashCollection({
      tx: {
        date: "2026-07-12",
        amount: 350000,
        currency: "ETB",
        accountId: "ACC-PETTY",
        accountName: "Head Office Petty Cash",
        project: "Bole Tower",
        department: "Treasury",
        category: "Milestone Collection",
        counterparty: "Federal Housing Corp",
        linkedDocumentType: "Invoice",
        linkedDocumentId: "INV-101",
        invoiceNumber: "INV-2026-101",
        paymentMethod: "Mobile Banking",
        bankReferenceNumber: "FT-101",
        receiptNumber: "RCP-101",
        status: "Verified & Confirmed",
        createdBy: "Selamawit FM",
        createdById: "USR-FM",
      },
      targetAccount: mockAccounts[1],
      linkedInvoice: mockInvoices[0],
      existingTransactions: mockTxs,
      actorName: "Selamawit FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "USR-FM",
    });

    expect(mockInvoices[0].paidAmount).toBe(600000);
    expect(mockInvoices[0].status).toBe("Partial");

    await expect(
      recordCashCollection({
        tx: {
          date: "2026-07-14",
          amount: 450000,
          currency: "ETB",
          accountId: "ACC-CBE",
          accountName: "CBE Corporate Account",
          project: "Bole Tower",
          department: "Treasury",
          category: "Final Payment",
          counterparty: "Federal Housing Corp",
          linkedDocumentType: "Invoice",
          linkedDocumentId: "INV-101",
          invoiceNumber: "INV-2026-101",
          paymentMethod: "Bank Transfer",
          bankReferenceNumber: "FT-102",
          receiptNumber: "RCP-102",
          status: "Verified & Confirmed",
          createdBy: "Selamawit FM",
          createdById: "USR-FM",
        },
        targetAccount: mockAccounts[0],
        linkedInvoice: mockInvoices[0],
        existingTransactions: mockTxs,
        actorName: "Selamawit FM",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "USR-FM",
      })
    ).rejects.toThrow(/exceeds open invoice balance/i);
  });

  it("Test 5, 6, 8, 10 & 13: Supplier partial payment, Director threshold approval (>500K ETB), AP reduction & Reversal", async () => {
    const pay1 = await recordCashPayment({
      tx: {
        date: "2026-07-11",
        amount: 200000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE Corporate Account",
        project: "Bole Tower",
        department: "Procurement",
        category: "Material Suppliers",
        counterparty: "Mugher Cement Factory",
        linkedDocumentType: "Expense",
        linkedDocumentId: "EXP-201",
        invoiceNumber: "BILL-CEM-01",
        paymentMethod: "Bank Transfer",
        bankReferenceNumber: "PAY-REF-01",
        paymentVoucherNumber: "PVC-001",
        status: "Confirmed & Paid",
        createdBy: "Selamawit FM",
        createdById: "USR-FM",
      },
      sourceAccount: mockAccounts[0],
      linkedExpense: mockExpenses[0],
      existingTransactions: mockTxs,
      directorApprovalThresholdEtb: 500000,
      actorName: "Selamawit FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "USR-FM",
    });

    expect(pay1.status).toBe("Confirmed & Paid");
    expect(mockAccounts[0].currentBalance).toBe(800000);
    expect(mockExpenses[0].paidAmount).toBe(200000);
    expect(mockExpenses[0].status).toBe("Partial");

    const highValPay = await recordCashPayment({
      tx: {
        date: "2026-07-12",
        amount: 750000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE Corporate Account",
        project: "Yeka Villas",
        department: "Machinery",
        category: "Equipment Rental",
        counterparty: "Heavy Crane Leasing",
        linkedDocumentType: "Expense",
        linkedDocumentId: "EXP-202",
        invoiceNumber: "BILL-EQP-02",
        paymentMethod: "Bank Transfer",
        bankReferenceNumber: "PAY-REF-02",
        paymentVoucherNumber: "PVC-002",
        status: "Confirmed & Paid",
        createdBy: "Selamawit FM",
        createdById: "USR-FM",
      },
      sourceAccount: mockAccounts[0],
      linkedExpense: mockExpenses[1],
      existingTransactions: mockTxs,
      directorApprovalThresholdEtb: 500000,
      actorName: "Selamawit FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "USR-FM",
    });

    expect(highValPay.status).toBe("Director Approval Required");
    expect(highValPay.requiresDirectorApproval).toBe(true);
    expect(mockAccounts[0].currentBalance).toBe(800000);

    await expect(
      approveAndConfirmPayment({
        tx: highValPay,
        sourceAccount: mockAccounts[0],
        linkedExpense: mockExpenses[1],
        directorApprovalThresholdEtb: 500000,
        actorName: "Selamawit FM",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "USR-FM",
      })
    ).rejects.toThrow(/Director .* approval is required/i);

    const dirApproved = await approveAndConfirmPayment({
      tx: highValPay,
      sourceAccount: mockAccounts[0],
      linkedExpense: mockExpenses[1],
      directorApprovalThresholdEtb: 500000,
      actorName: "General Director",
      actorRole: UserRole.HEAD_OFFICE,
      actorUid: "USR-DIR",
    });

    expect(dirApproved.status).toBe("Confirmed & Paid");
    expect(mockAccounts[0].currentBalance).toBe(50000);
    expect(mockExpenses[1].paidAmount).toBe(750000);

    let state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.HEAD_OFFICE,
      referenceToday: REF_TODAY,
    });

    expect(state.metrics.actualCashPayment).toBe(950000);
    expect(state.metrics.outstandingPayables).toBe(450000);
    expect(state.metrics.netCashFlow).toBe(-950000);

    const reversed = await reverseConfirmedCashTransaction({
      tx: dirApproved,
      account: mockAccounts[0],
      linkedExpense: mockExpenses[1],
      reason: "Wrong bank beneficiary",
      actorName: "General Director",
      actorRole: UserRole.HEAD_OFFICE,
      actorUid: "USR-DIR",
    });

    expect(reversed.status).toBe("Reversed");
    expect(mockAccounts[0].currentBalance).toBe(800000);
    expect(mockExpenses[1].paidAmount).toBe(0);

    state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: mockTxs,
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.HEAD_OFFICE,
      referenceToday: REF_TODAY,
    });
    expect(state.metrics.actualCashPayment).toBe(200000);
    expect(state.metrics.outstandingPayables).toBe(1200000);
  });

  it("Test 11: Prevents duplicate receipt number, duplicate voucher number, and duplicate bank reference", () => {
    const existing: CashTransactionRecord[] = [
      {
        id: "CTX-1",
        referenceNo: "COL-20260710-1",
        receiptNumber: "RCP-DUP-1",
        bankReferenceNumber: "FT-DUP-99",
        type: "Collection",
        date: "2026-07-10",
        amount: 50000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE",
        project: "Bole Tower",
        department: "Treasury",
        category: "Milestone",
        counterparty: "Client A",
        linkedDocumentType: "Direct",
        paymentMethod: "Bank Transfer",
        status: "Verified & Confirmed",
        ...META_FIELDS,
      },
    ];

    const dupReceipt = validateCashTransactionCandidate({
      type: "Collection",
      amount: 10000,
      account: mockAccounts[0],
      counterparty: "Client B",
      project: "Bole Tower",
      receiptNumber: "rcp-dup-1",
      existingTransactions: existing,
    });
    expect(dupReceipt.valid).toBe(false);
    expect(dupReceipt.error).toMatch(/Duplicate Receipt Number/i);

    const dupBank = validateCashTransactionCandidate({
      type: "Payment",
      amount: 10000,
      account: mockAccounts[0],
      counterparty: "Supplier B",
      project: "Bole Tower",
      paymentVoucherNumber: "PVC-UNIQUE",
      bankReferenceNumber: "FT-DUP-99",
      existingTransactions: existing,
    });
    expect(dupBank.valid).toBe(false);
    expect(dupBank.error).toMatch(/Duplicate Bank Reference Number/i);
  });

  it("Test 12: Builds daily/weekly/monthly analytics charts and all 14 specialized Cash Collection & Payment reports", () => {
    const confirmedTxs: CashTransactionRecord[] = [
      {
        id: "CTX-C1",
        referenceNo: "COL-01",
        receiptNumber: "RCP-01",
        type: "Collection",
        date: "2026-07-19",
        amount: 500000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE",
        project: "Bole Tower",
        department: "Treasury",
        category: "IPC",
        counterparty: "Federal Housing Corp",
        contractNumber: "CTR-BOLE-01",
        invoiceNumber: "INV-2026-101",
        linkedDocumentType: "Invoice",
        paymentMethod: "Bank Transfer",
        status: "Verified & Confirmed",
        ...META_FIELDS,
      },
      {
        id: "CTX-P1",
        referenceNo: "PAY-01",
        paymentVoucherNumber: "PVC-01",
        type: "Payment",
        date: "2026-07-20",
        amount: 250000,
        currency: "ETB",
        accountId: "ACC-CBE",
        accountName: "CBE",
        project: "Bole Tower",
        department: "Procurement",
        category: "Material Suppliers",
        counterparty: "Mugher Cement Factory",
        invoiceNumber: "BILL-CEM-01",
        linkedDocumentType: "Expense",
        paymentMethod: "Bank Transfer",
        status: "Confirmed & Paid",
        ...META_FIELDS,
      },
    ];

    const state = computeFinancialDashboardState({
      invoices: mockInvoices,
      expenses: mockExpenses,
      cashTransactions: confirmedTxs,
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: mockCollectionPlans,
      paymentPlans: mockPaymentPlans,
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    const analytics = buildCashCollectionPaymentAnalytics(state);
    expect(analytics.charts.dailyCollections).toHaveLength(14);
    expect(analytics.charts.weeklyCollections).toHaveLength(4);
    expect(analytics.charts.monthlyCollections.length).toBeGreaterThan(0);
    expect(analytics.charts.dailyPayments).toHaveLength(14);
    expect(analytics.charts.weeklyPayments).toHaveLength(4);
    expect(analytics.charts.monthlyPayments.length).toBeGreaterThan(0);
    expect(analytics.charts.plannedVsActualComparison.length).toBeGreaterThan(0);

    const reportIds = [
      "daily-cash-collection",
      "weekly-cash-collection",
      "monthly-cash-collection",
      "daily-cash-payment",
      "weekly-cash-payment",
      "monthly-cash-payment",
      "project-wise-collection",
      "project-wise-payment",
      "customer-wise-collection",
      "supplier-wise-payment",
      "collection-variance",
      "payment-variance",
      "outstanding-collection",
      "upcoming-payment",
    ] as const;

    reportIds.forEach((rid) => {
      const ds = buildCashReportDataset(rid, state, REF_TODAY);
      expect(ds.id).toBe(rid);
      expect(ds.columns.length).toBeGreaterThan(0);
    });

    const projectCol = buildCashReportDataset("project-wise-collection", state, REF_TODAY);
    expect(projectCol.rows.some((r) => r.project === "Bole Tower" && r.actual === 500000)).toBe(true);

    const supplierPay = buildCashReportDataset("supplier-wise-payment", state, REF_TODAY);
    expect(supplierPay.rows.some((r) => r.supplier === "Mugher Cement Factory" && r.paid === 250000)).toBe(true);

    const colVar = buildCashReportDataset("collection-variance", state, REF_TODAY);
    const plannedTotal = colVar.summaryTotals?.find((s) => s.label === "Planned Target");
    const actualTotal = colVar.summaryTotals?.find((s) => s.label === "Actual Collected");
    expect(plannedTotal?.value).toBe(1200000);
    expect(actualTotal?.value).toBe(500000);
  });

  it("Test 13 & 14: RBAC matrix enforces strict privileges & handles zero target division safely", async () => {
    const accPerms = resolveUserFinancePermissions(UserRole.ACCOUNTANT);
    expect(accPerms.canManageTransactions).toBe(true);
    expect(accPerms.canVerifyCollections).toBe(false);
    expect(accPerms.canApproveStandardPayments).toBe(false);
    expect(accPerms.canApproveHighValuePayments).toBe(false);
    expect(accPerms.canReverseCashTransactions).toBe(false);

    const fmPerms = resolveUserFinancePermissions(UserRole.FINANCE_MANAGER);
    expect(fmPerms.canManageCollectionPaymentPlans).toBe(true);
    expect(fmPerms.canVerifyCollections).toBe(true);
    expect(fmPerms.canApproveStandardPayments).toBe(true);
    expect(fmPerms.canApproveHighValuePayments).toBe(false);
    expect(fmPerms.canReverseCashTransactions).toBe(true);

    const dirPerms = resolveUserFinancePermissions(UserRole.HEAD_OFFICE);
    expect(dirPerms.canApproveHighValuePayments).toBe(true);
    expect(dirPerms.canReverseCashTransactions).toBe(true);

    await expect(
      rejectCashTransaction({
        tx: {
          id: "TX-P",
          referenceNo: "COL-X",
          type: "Collection",
          date: "2026-07-10",
          amount: 1000,
          currency: "ETB",
          accountId: "ACC-CBE",
          accountName: "CBE",
          project: "Bole Tower",
          department: "Treasury",
          category: "IPC",
          counterparty: "Client",
          linkedDocumentType: "Direct",
          paymentMethod: "Cash",
          status: "Pending Verification",
          ...META_FIELDS,
        },
        reason: "Bad slip",
        actorName: "Abebe Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "USR-ACC",
      })
    ).rejects.toThrow();

    const zeroPlanState = computeFinancialDashboardState({
      invoices: [],
      expenses: [],
      cashTransactions: [],
      paymentRecords: [],
      financialTargets: [],
      collectionPlans: [],
      paymentPlans: [],
      financialAccounts: mockAccounts,
      projectBudgets: [],
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });
    expect(zeroPlanState.metrics.collectionAchievementPct).toBe(0);
    expect(zeroPlanState.metrics.paymentAchievementPct).toBe(0);
    expect(Number.isFinite(zeroPlanState.metrics.collectionAchievementPct)).toBe(true);
    expect(Number.isFinite(zeroPlanState.metrics.paymentAchievementPct)).toBe(true);
  });
});
