import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveAndPostJournalEntry,
  buildPart7ExcelWorkbook,
  computePart7FinancialStatementsState,
  createDoubleEntryJournalVoucher,
  isDateInClosedPeriod,
  Part7StatementsFilterState,
  prepareAndCloseFinancialPeriod,
  rejectJournalEntry,
  reopenClosedFinancialPeriod,
  saveChartAccountMutation,
  validateJournalEntryLines,
} from "../services/financialStatementsService";
import { DbService } from "../services/db";
import {
  ActualCostEntry,
  BankTransactionRecord,
  CashTransactionRecord,
  ChartAccountRecord,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  FinancialPeriodCloseRecord,
  JournalEntryRecord,
  PayrollRecord,
  UserRole,
} from "../types";

let memCoa: ChartAccountRecord[] = [];
let memJournals: JournalEntryRecord[] = [];
let memPeriods: FinancialPeriodCloseRecord[] = [];

const baseFilters: Part7StatementsFilterState = {
  reportingFrequency: "Monthly",
  financialYear: "2026",
  project: "ALL",
  department: "ALL",
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  companyName: "Ovid Construction PLC",
};

beforeEach(() => {
  memCoa = [];
  memJournals = [];
  memPeriods = [];

  vi.spyOn(DbService, "saveChartAccount").mockImplementation(async (acc) => {
    memCoa = [...memCoa.filter((a) => a.id !== acc.id), acc];
  });
  vi.spyOn(DbService, "saveJournalEntry").mockImplementation(async (entry) => {
    memJournals = [...memJournals.filter((j) => j.id !== entry.id), entry];
  });
  vi.spyOn(DbService, "saveFinancialPeriod").mockImplementation(async (period) => {
    memPeriods = [...memPeriods.filter((p) => p.id !== period.id), period];
  });
  vi.spyOn(DbService, "closeFinancialPeriodAtomic").mockImplementation(
    async ({ period, closingEntry }) => {
      memPeriods = [...memPeriods.filter((p) => p.id !== period.id), period];
      if (closingEntry) {
        memJournals = [...memJournals.filter((j) => j.id !== closingEntry.id), closingEntry];
      }
    }
  );
  vi.spyOn(DbService, "addAuditLog").mockResolvedValue(undefined as any);
});

function sampleTreasuryAccounts(): FinancialAccount[] {
  return [
    {
      id: "ACC-BNK-1",
      accountCode: "BANK-101",
      accountName: "CBE Main Operating",
      accountType: "Bank",
      bankAccountSubtype: "Checking",
      bankName: "Commercial Bank of Ethiopia",
      accountNumber: "100011223344",
      currency: "ETB",
      openingBalance: 1000000,
      currentBalance: 1000000,
      minimumThreshold: 100000,
      project: "Bole Tower B",
      department: "Finance",
      status: "Active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "ACC-CSH-1",
      accountCode: "CASH-101",
      accountName: "Head Office Petty Cash",
      accountType: "Cash",
      bankAccountSubtype: "Cash Vault",
      currency: "ETB",
      openingBalance: 100000,
      currentBalance: 100000,
      minimumThreshold: 20000,
      project: "Bole Tower B",
      department: "Operations",
      status: "Active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    },
  ];
}

describe("Part 7: Financial Statements, Double-Entry Ledger & Period Closing", () => {
  it("excludes unpaid invoices from Cash Flow while accruing Revenue/AR, and avoids double-counting on collection", () => {
    const accounts = sampleTreasuryAccounts();
    const unpaidInvoice: FinancialInvoiceRecord = {
      id: "INV-1",
      invoiceNumber: "INV-2026-101",
      project: "Bole Tower B",
      department: "Engineering",
      client: "Oromia Housing",
      clientName: "Oromia Housing",
      amount: 500000,
      paidAmount: 0,
      status: "Approved",
      date: "2026-07-05",
      dueDate: "2026-07-25",
    };

    // 1. Before any cash collection
    const beforeCash = computePart7FinancialStatementsState({
      financialAccounts: accounts,
      invoices: [unpaidInvoice],
      filterState: baseFilters,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-20",
    });

    expect(beforeCash.incomeStatement.projectRevenue).toBe(500000);
    expect(beforeCash.cashFlowStatement.openingCashBalance).toBe(1100000);
    expect(beforeCash.cashFlowStatement.totalCashInflows).toBe(0);
    expect(beforeCash.cashFlowStatement.closingCashBalance).toBe(1100000);
    expect(beforeCash.arReport.totalOutstanding).toBe(500000);
    expect(beforeCash.balanceSheet.isBalanced).toBe(true);
    expect(beforeCash.trialBalance.isBalanced).toBe(true);

    // 2. Partial cash collection (200,000 ETB) against INV-1
    const partialCollection: CashTransactionRecord = {
      id: "CASH-COL-1",
      referenceNo: "CRV-2026-001",
      type: "Collection",
      category: "Client Contract Receipt",
      amount: 200000,
      date: "2026-07-10",
      project: "Bole Tower B",
      department: "Finance",
      accountId: "ACC-BNK-1",
      accountName: "CBE Main Operating",
      counterparty: "Oromia Housing",
      linkedDocumentId: "INV-1",
      linkedDocumentType: "Invoice",
      invoiceNumber: "INV-2026-101",
      paymentMethod: "Bank Transfer",
      createdBy: "Cashier",
      createdById: "CSH-1",
      status: "Posted",
      createdAt: "2026-07-10T09:00:00.000Z",
      updatedAt: "2026-07-10T09:00:00.000Z",
    };

    const afterCollection = computePart7FinancialStatementsState({
      financialAccounts: accounts,
      invoices: [{ ...unpaidInvoice, paidAmount: 200000, status: "Partially Paid" }],
      cashTransactions: [partialCollection],
      filterState: baseFilters,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-20",
    });

    // Revenue must NOT be double counted (remains 500,000)
    expect(afterCollection.incomeStatement.projectRevenue).toBe(500000);
    expect(afterCollection.cashFlowStatement.totalCashInflows).toBe(200000);
    expect(afterCollection.cashFlowStatement.closingCashBalance).toBe(1300000);
    expect(afterCollection.arReport.totalOutstanding).toBe(300000);
    expect(afterCollection.balanceSheet.isBalanced).toBe(true);
    expect(afterCollection.trialBalance.isBalanced).toBe(true);
  });

  it("prevents duplicate documents, filters unverified Draft/Pending/Rejected records, and maintains A = L + E across all ERP modules", () => {
    const accounts = sampleTreasuryAccounts();

    const invoices: FinancialInvoiceRecord[] = [
      {
        id: "INV-1",
        invoiceNumber: "INV-001",
        project: "Bole Tower B",
        department: "Engineering",
        client: "Client A",
        amount: 800000,
        paidAmount: 0,
        status: "Approved",
        date: "2026-07-03",
        dueDate: "2026-07-28",
      },
      {
        // Duplicate invoiceNumber
        id: "INV-1-DUP",
        invoiceNumber: "INV-001",
        project: "Bole Tower B",
        department: "Engineering",
        client: "Client A",
        amount: 800000,
        paidAmount: 0,
        status: "Approved",
        date: "2026-07-03",
        dueDate: "2026-07-28",
      },
      {
        // Unverified Draft
        id: "INV-DRAFT",
        invoiceNumber: "INV-DRAFT-1",
        project: "Bole Tower B",
        client: "Client B",
        amount: 250000,
        paidAmount: 0,
        status: "Draft",
        date: "2026-07-04",
        dueDate: "2026-07-28",
      },
    ];

    const expenses: Expense[] = [
      {
        id: "EXP-1",
        billNumber: "BILL-001",
        project: "Bole Tower B",
        costCenter: "Site Construction",
        department: "Procurement",
        category: "Materials",
        vendor: "Dangote Cement",
        description: "Cement supply",
        amount: 200000,
        paidAmount: 0,
        date: "2026-07-06",
        dueDate: "2026-07-29",
        status: "Approved",
        approvedBy: "Finance Manager",
      },
      {
        id: "EXP-2",
        billNumber: "BILL-002",
        project: "Bole Tower B",
        costCenter: "Head Office",
        department: "Finance",
        category: "Administrative Expenses",
        vendor: "Office Rent",
        description: "Head office rent",
        amount: 50000,
        paidAmount: 50000,
        date: "2026-07-08",
        dueDate: "2026-07-15",
        status: "Paid",
        approvedBy: "Finance Manager",
      },
      {
        id: "EXP-REJ",
        billNumber: "BILL-REJ",
        project: "Bole Tower B",
        costCenter: "Site Construction",
        category: "Materials",
        vendor: "Rejected Vendor",
        description: "Rejected claim",
        amount: 99000,
        paidAmount: 0,
        date: "2026-07-09",
        dueDate: "2026-07-20",
        status: "Rejected",
        approvedBy: "",
      },
    ];

    const cashTxs: CashTransactionRecord[] = [
      {
        id: "CASH-1",
        referenceNo: "CPV-002",
        type: "Payment",
        category: "Administrative Expenses",
        amount: 50000,
        date: "2026-07-09",
        project: "Bole Tower B",
        department: "Finance",
        accountId: "ACC-CSH-1",
        accountName: "Head Office Petty Cash",
        counterparty: "Office Rent",
        linkedDocumentId: "EXP-2",
        linkedDocumentType: "Expense",
        paymentMethod: "Cash",
        createdBy: "Cashier",
        createdById: "CSH-1",
        status: "Posted",
        createdAt: "2026-07-09T09:00:00.000Z",
        updatedAt: "2026-07-09T09:00:00.000Z",
      },
    ];

    // Mirrored Bank Transaction from Cash Module must be deduplicated cleanly
    const bankTxs: BankTransactionRecord[] = [
      {
        id: "BTX-DUP-MIRROR",
        transactionNo: "BNK-001",
        accountId: "ACC-CSH-1",
        accountName: "Head Office Petty Cash",
        transactionType: "Other Transactions",
        direction: "Debit",
        amount: 50000,
        currency: "ETB",
        transactionDate: "2026-07-09",
        referenceNo: "CPV-002",
        counterparty: "Office Rent",
        description: "Mirrored from Cash Module",
        project: "Bole Tower B",
        department: "Finance",
        approvalStatus: "Approved",
        sourceChannel: "Cash Module",
        linkedCashTxId: "CASH-1",
        reconciliationStatus: "Unreconciled",
        recordedBy: "System",
        createdBy: "System",
        createdById: "SYS",
        createdAt: "2026-07-09T09:00:00.000Z",
        updatedAt: "2026-07-09T09:00:00.000Z",
      },
      {
        id: "BTX-BANK-FEE",
        transactionNo: "BNK-002",
        accountId: "ACC-BNK-1",
        accountName: "CBE Main Operating",
        transactionType: "Bank Charges",
        direction: "Debit",
        amount: 5000,
        currency: "ETB",
        transactionDate: "2026-07-12",
        referenceNo: "FEE-0712",
        counterparty: "CBE",
        description: "Monthly transfer fees",
        project: "Bole Tower B",
        department: "Finance",
        approvalStatus: "Approved",
        sourceChannel: "Manual",
        reconciliationStatus: "Unreconciled",
        recordedBy: "Accountant",
        createdBy: "Accountant",
        createdById: "ACC-1",
        createdAt: "2026-07-12T10:00:00.000Z",
        updatedAt: "2026-07-12T10:00:00.000Z",
      },
    ];

    const payrollRecords: PayrollRecord[] = [
      {
        id: "PAY-1",
        workerId: "WRK-1",
        employeeId: "EMP-1",
        workerName: "Abebe Kebede",
        position: "Site Engineer",
        department: "Engineering",
        team: "Site A",
        project: "Bole Tower B",
        employmentType: "Permanent",
        basicSalary: 40000,
        attendanceDays: 26,
        totalWorkingHours: 208,
        overtimeHours: 0,
        overtimePayment: 0,
        undertimeHours: 0,
        undertimeDeduction: 0,
        allowances: 0,
        deductions: 0,
        netSalary: 40000,
        status: "Approved",
        grade: "Grade A",
        period: "2026-07",
        createdAt: "2026-07-15T00:00:00.000Z",
        updatedAt: "2026-07-15T00:00:00.000Z",
      },
    ];

    const actualCostEntries: ActualCostEntry[] = [
      {
        id: "COST-1",
        costTransactionId: "CST-001",
        projectName: "Bole Tower B",
        transactionDate: "2026-07-14",
        budgetCategory: "Equipment Costs",
        costDescription: "Excavator fuel & servicing",
        quantity: 1,
        unitPrice: 30000,
        totalCost: 30000,
        supplierOrPayee: "NOC Ethiopia",
        sourceModule: "Equipment Management",
        verificationStatus: "Validated",
        recordedBy: "Site Accountant",
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ];

    const procurements = [
      {
        id: "PO-10",
        poNumber: "PO-2026-10",
        supplier: "Steel Mill PLC",
        materialItem: "Rebar 16mm",
        poAmount: 75000,
        customsTax: 5000,
        deliveryCost: 0,
        status: "Approved",
        date: "2026-07-16",
        project: "Bole Tower B",
      },
    ];

    const state = computePart7FinancialStatementsState({
      financialAccounts: accounts,
      invoices,
      expenses,
      cashTransactions: cashTxs,
      bankTransactions: bankTxs,
      payrollRecords,
      actualCostEntries,
      procurements,
      filterState: baseFilters,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-25",
    });

    // Duplicate warning captured
    expect(state.auditWarnings.some((w) => w.includes("Duplicate invoice"))).toBe(true);

    // Revenue = 800,000 only (Draft & duplicate excluded)
    expect(state.incomeStatement.projectRevenue).toBe(800000);
    // Direct costs = 200k (Materials EXP-1) + 40k (Payroll) + 30k (Equipment ActualCost) + 80k (Procurement) = 350,000
    expect(state.incomeStatement.directConstructionCosts).toBe(350000);
    // Gross Profit = 800,000 - 350,000 = 450,000
    expect(state.incomeStatement.grossProfit).toBe(450000);
    // Op & Admin expenses = 50,000 (Admin EXP-2) + 5,000 (Bank charge BTX-BANK-FEE; mirrored cash tx excluded)
    expect(state.incomeStatement.operatingExpenses).toBe(5000);
    expect(state.incomeStatement.administrativeExpenses).toBe(50000);
    // Net Profit = 450,000 - 55,000 = 395,000
    expect(state.incomeStatement.netProfitLoss).toBe(395000);

    // Trial Balance & Balance Sheet strictly balanced
    expect(state.trialBalance.isBalanced).toBe(true);
    expect(state.trialBalance.totalEndingDebit).toBe(state.trialBalance.totalEndingCredit);
    expect(state.balanceSheet.isBalanced).toBe(true);
    expect(state.balanceSheet.totalAssets).toBe(state.balanceSheet.totalLiabilitiesAndEquity);

    // Closing Cash = 1,100,000 - 50,000 (Rent) - 5,000 (Bank fee) = 1,045,000
    expect(state.cashFlowStatement.closingCashBalance).toBe(1045000);
  });

  it("classifies Operating, Investing & Financing Cash Flows and calculates all 7 Financial Analysis Ratios accurately", () => {
    const accounts = sampleTreasuryAccounts();

    // Equipment purchase (Investing outflow 200k) + Long-term Loan receipt (Financing inflow 500k)
    const manualJournals: JournalEntryRecord[] = [
      {
        id: "JE-INV-EQ",
        journalNo: "JE-20260710-1001",
        entryDate: "2026-07-10",
        fiscalYear: "2026",
        periodMonth: "2026-07",
        project: "Bole Tower B",
        department: "Engineering",
        referenceNo: "EQ-PUR-01",
        description: "Purchase aluminum formwork system by bank transfer",
        entryType: "Standard",
        sourceModule: "Manual Journal",
        lines: [
          {
            lineNo: 1,
            accountCode: "1510",
            accountName: "Aluminum Formwork & Construction Equipment",
            accountType: "Asset",
            subType: "Non-Current Asset",
            debit: 200000,
            credit: 0,
          },
          {
            lineNo: 2,
            accountCode: "1020",
            accountName: "Cash in Commercial Banks",
            accountType: "Asset",
            subType: "Current Asset",
            debit: 0,
            credit: 200000,
          },
        ],
        totalDebit: 200000,
        totalCredit: 200000,
        isBalanced: true,
        status: "Posted",
        preparedBy: "Accountant",
        preparedById: "ACC",
        approvedBy: "Finance Manager",
        createdAt: "2026-07-10T10:00:00.000Z",
        updatedAt: "2026-07-10T10:00:00.000Z",
      },
      {
        id: "JE-FIN-LOAN",
        journalNo: "JE-20260711-1002",
        entryDate: "2026-07-11",
        fiscalYear: "2026",
        periodMonth: "2026-07",
        project: "Corporate Treasury",
        department: "Finance",
        referenceNo: "LN-01",
        description: "Long-term equipment loan drawdown",
        entryType: "Standard",
        sourceModule: "Manual Journal",
        lines: [
          {
            lineNo: 1,
            accountCode: "1020",
            accountName: "Cash in Commercial Banks",
            accountType: "Asset",
            subType: "Current Asset",
            debit: 500000,
            credit: 0,
          },
          {
            lineNo: 2,
            accountCode: "2510",
            accountName: "Long-Term Loans & Equipment Financing",
            accountType: "Liability",
            subType: "Non-Current Liability",
            debit: 0,
            credit: 500000,
          },
        ],
        totalDebit: 500000,
        totalCredit: 500000,
        isBalanced: true,
        status: "Posted",
        preparedBy: "Accountant",
        preparedById: "ACC",
        approvedBy: "Finance Manager",
        createdAt: "2026-07-11T10:00:00.000Z",
        updatedAt: "2026-07-11T10:00:00.000Z",
      },
    ];

    const invoices: FinancialInvoiceRecord[] = [
      {
        id: "INV-10",
        invoiceNumber: "INV-10",
        project: "Bole Tower B",
        client: "Client X",
        amount: 1000000,
        paidAmount: 0,
        status: "Approved",
        date: "2026-07-05",
        dueDate: "2026-07-30",
      },
    ];

    const expenses: Expense[] = [
      {
        id: "EXP-10",
        billNumber: "BILL-10",
        project: "Bole Tower B",
        costCenter: "Site Construction",
        category: "Materials",
        vendor: "Supplier Y",
        description: "Concrete mix",
        amount: 600000,
        paidAmount: 0,
        date: "2026-07-06",
        dueDate: "2026-07-30",
        status: "Approved",
        approvedBy: "Finance Manager",
      },
    ];

    const state = computePart7FinancialStatementsState({
      financialAccounts: accounts,
      invoices,
      expenses,
      journalEntries: manualJournals,
      filterState: baseFilters,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-25",
    });

    // Cash Flow Check: Opening 1,100,000 + Financing (+500,000) + Investing (-200,000) = 1,400,000
    expect(state.cashFlowStatement.netInvestingCashFlow).toBe(-200000);
    expect(state.cashFlowStatement.netFinancingCashFlow).toBe(500000);
    expect(state.cashFlowStatement.netCashFlow).toBe(300000);
    expect(state.cashFlowStatement.closingCashBalance).toBe(1400000);

    // Balance Sheet & Equity Continuity
    expect(state.balanceSheet.isBalanced).toBe(true);
    expect(state.changesInEquity.closingTotalEquity).toBe(state.balanceSheet.totalEquity);

    // Verify all 7 Ratios exist and calculate expected numbers
    // Revenue = 1M, Direct Cost = 600k => Gross Profit = 400k (40%), Net Profit = 400k (40%)
    // Current Assets = Cash (1.4M) + AR (1M) = 2.4M; Current Liabilities = 600k => Current Ratio = 4.00x, Quick Ratio = 4.00x
    // Total Liabilities = 600k + 500k = 1.1M; Equity = 1.1M + 400k = 1.5M => Debt-to-Equity = 0.73x
    const byId = Object.fromEntries(state.ratios.map((r) => [r.id, r]));
    expect(state.ratios).toHaveLength(7);
    expect(byId["gross-profit-margin"].value).toBe(40);
    expect(byId["net-profit-margin"].value).toBe(40);
    expect(byId["current-ratio"].value).toBe(4);
    expect(byId["quick-ratio"].value).toBe(4);
    expect(byId["debt-to-equity"].value).toBe(0.73);
    expect(byId["roa"].value).not.toBeNull();
    expect(byId["roe"].value).not.toBeNull();
  });

  it("enforces double-entry balancing, RBAC permissions, atomic Period Closing lock & Reopen reversal, and 9-sheet Excel export", async () => {
    // 1. Double-Entry Validation rejects unbalanced lines
    const badCheck = validateJournalEntryLines([
      {
        lineNo: 1,
        accountCode: "1020",
        accountName: "Cash in Commercial Banks",
        accountType: "Asset",
        debit: 1000,
        credit: 0,
      },
      {
        lineNo: 2,
        accountCode: "4010",
        accountName: "Revenue",
        accountType: "Revenue",
        debit: 0,
        credit: 900,
      },
    ]);
    expect(badCheck.isValid).toBe(false);
    expect(badCheck.difference).toBe(100);

    // Reject creation of unbalanced journal
    await expect(
      createDoubleEntryJournalVoucher({
        entryDate: "2026-07-15",
        project: "Bole Tower B",
        department: "Finance",
        referenceNo: "BAD-01",
        description: "Unbalanced voucher",
        entryType: "Standard",
        lines: [
          {
            lineNo: 1,
            accountCode: "1020",
            accountName: "Cash in Commercial Banks",
            accountType: "Asset",
            debit: 500,
            credit: 0,
          },
          {
            lineNo: 2,
            accountCode: "3010",
            accountName: "Owner Capital",
            accountType: "Equity",
            debit: 0,
            credit: 400,
          },
        ],
        existingPeriods: memPeriods,
        actorName: "Finance Mgr",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "FM-1",
      })
    ).rejects.toThrow(/Debit.*Credit/i);

    // 2. Accountant creates & submits balanced voucher -> Finance Manager approves & posts
    const draftJe = await createDoubleEntryJournalVoucher({
      entryDate: "2026-07-18",
      project: "Bole Tower B",
      department: "Finance",
      referenceNo: "JV-18",
      description: "Owner capital injection",
      entryType: "Standard",
      lines: [
        {
          lineNo: 1,
          accountCode: "1020",
          accountName: "Cash in Commercial Banks",
          accountType: "Asset",
          debit: 250000,
          credit: 0,
        },
        {
          lineNo: 2,
          accountCode: "3010",
          accountName: "Owner's Paid-In Capital",
          accountType: "Equity",
          debit: 0,
          credit: 250000,
        },
      ],
      existingPeriods: memPeriods,
      submitImmediately: true,
      actorName: "Site Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "ACC-1",
    });
    expect(draftJe.status).toBe("Submitted");

    // Accountant cannot approve/post or reject
    await expect(
      approveAndPostJournalEntry({
        entry: draftJe,
        existingPeriods: memPeriods,
        actorName: "Site Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "ACC-1",
      })
    ).rejects.toThrow(/RBAC Denied/i);

    await expect(
      rejectJournalEntry({
        entry: draftJe,
        reason: "Not allowed",
        actorName: "Site Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "ACC-1",
      })
    ).rejects.toThrow();

    const postedJe = await approveAndPostJournalEntry({
      entry: draftJe,
      existingPeriods: memPeriods,
      actorName: "Finance Director",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
    });
    expect(postedJe.status).toBe("Posted");

    // 3. Custom Chart Account addition
    const customAcc = await saveChartAccountMutation({
      accountCode: "1520",
      accountName: "Tower Crane Fleet",
      accountType: "Asset",
      subType: "Non-Current Asset",
      normalBalance: "Debit",
      cashFlowSection: "Investing",
      currency: "ETB",
      actorName: "Finance Director",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
    });
    expect(customAcc.id).toBe("COA-1520");

    // 4. Compute pre-close state with Revenue + Expense so closing entry transfers Net Profit to Retained Earnings
    const preCloseState = computePart7FinancialStatementsState({
      chartOfAccounts: memCoa,
      financialAccounts: sampleTreasuryAccounts(),
      journalEntries: memJournals,
      financialPeriods: memPeriods,
      invoices: [
        {
          id: "INV-CLOSE-1",
          invoiceNumber: "INV-C1",
          project: "Bole Tower B",
          client: "Client Close",
          amount: 400000,
          paidAmount: 0,
          status: "Approved",
          date: "2026-07-12",
          dueDate: "2026-07-30",
        },
      ],
      expenses: [
        {
          id: "EXP-CLOSE-1",
          billNumber: "BILL-C1",
          project: "Bole Tower B",
          costCenter: "Site Construction",
          category: "Materials",
          vendor: "Vendor Close",
          description: "Materials",
          amount: 150000,
          paidAmount: 0,
          date: "2026-07-14",
          dueDate: "2026-07-30",
          status: "Approved",
          approvedBy: "Finance Manager",
        },
      ],
      filterState: baseFilters,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-31",
    });

    // Accountant cannot CloseAndLock period
    await expect(
      prepareAndCloseFinancialPeriod({
        state: preCloseState,
        periodType: "Monthly",
        action: "CloseAndLock",
        actorName: "Site Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "ACC-1",
      })
    ).rejects.toThrow(/RBAC Denied/i);

    // Finance Manager Closes & Locks Period atomically
    const { period: closedPeriod, closingEntry } = await prepareAndCloseFinancialPeriod({
      state: preCloseState,
      periodType: "Monthly",
      action: "CloseAndLock",
      notes: "July 2026 books audited & locked",
      actorName: "Finance Director",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
    });

    expect(closedPeriod.status).toBe("Closed");
    expect(closingEntry).toBeDefined();
    expect(closingEntry!.isBalanced).toBe(true);
    expect(isDateInClosedPeriod("2026-07-20", memPeriods)?.id).toBe(closedPeriod.id);

    // Creating a journal inside the closed period must be blocked
    await expect(
      createDoubleEntryJournalVoucher({
        entryDate: "2026-07-20",
        project: "Bole Tower B",
        department: "Finance",
        referenceNo: "LOCKED-TEST",
        description: "Backdated entry in closed period",
        entryType: "Standard",
        lines: draftJe.lines,
        existingPeriods: memPeriods,
        actorName: "Finance Director",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "FM-1",
      })
    ).rejects.toThrow(/Period Locked/i);

    // Recompute statements after period close: historical Income Statement & Balance Sheet stay intact and balanced
    const postCloseState = computePart7FinancialStatementsState({
      chartOfAccounts: memCoa,
      financialAccounts: sampleTreasuryAccounts(),
      journalEntries: memJournals,
      financialPeriods: memPeriods,
      invoices: [
        {
          id: "INV-CLOSE-1",
          invoiceNumber: "INV-C1",
          project: "Bole Tower B",
          client: "Client Close",
          amount: 400000,
          paidAmount: 0,
          status: "Approved",
          date: "2026-07-12",
          dueDate: "2026-07-30",
        },
      ],
      expenses: [
        {
          id: "EXP-CLOSE-1",
          billNumber: "BILL-C1",
          project: "Bole Tower B",
          costCenter: "Site Construction",
          category: "Materials",
          vendor: "Vendor Close",
          description: "Materials",
          amount: 150000,
          paidAmount: 0,
          date: "2026-07-14",
          dueDate: "2026-07-30",
          status: "Approved",
          approvedBy: "Finance Manager",
        },
      ],
      filterState: baseFilters,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-31",
    });

    expect(postCloseState.isCurrentPeriodClosed).toBe(true);
    expect(postCloseState.incomeStatement.netProfitLoss).toBe(250000);
    expect(postCloseState.balanceSheet.isBalanced).toBe(true);
    expect(postCloseState.trialBalance.isBalanced).toBe(true);

    // Build complete 8-statement + Financial Ratios Excel Workbook
    const wb = buildPart7ExcelWorkbook({
      state: postCloseState,
      preparedBy: "Finance Director",
      reviewedBy: "Finance Manager",
      approvedBy: "Managing Director",
    });
    expect(wb.SheetNames).toEqual([
      "Income Statement",
      "Balance Sheet",
      "Cash Flow",
      "Changes in Equity",
      "Trial Balance",
      "General Ledger",
      "AR Report",
      "AP Report",
      "Financial Ratios",
    ]);

    // 5. Reopen closed period reverses closing entry and unlocks period
    const reopened = await reopenClosedFinancialPeriod({
      period: closedPeriod,
      closingEntry,
      reason: "Post-audit accrual adjustment",
      actorName: "Finance Director",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
    });
    expect(reopened.status).toBe("Reopened");
    expect(isDateInClosedPeriod("2026-07-20", memPeriods)).toBeNull();
    const reversedCloseJe = memJournals.find((j) => j.id === closingEntry!.id);
    expect(reversedCloseJe?.status).toBe("Reversed");
  });
});
