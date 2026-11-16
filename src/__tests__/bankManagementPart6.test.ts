import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import {
  approveBankTransaction,
  autoMatchStatementLines,
  BANK_TRANSACTION_TYPES,
  buildPart6BankReportDataset,
  computePart6BankState,
  computePart6ReconciliationAnalysis,
  createBankTransaction,
  manualMatchStatementLine,
  parseCsvBankStatement,
  parseExcelBankStatement,
  parsePdfBankStatement,
  registerBankAccount,
  saveImmutableBankStatementAndImport,
  saveOrSubmitBankReconciliation,
  updateBankAccountStatus,
} from "../services/bankManagementService";
import { computePart5CashFlowState } from "../services/cashFlowForecastService";
import { DbService } from "../services/db";
import {
  BankReconciliationRecord,
  BankTransactionRecord,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  ImmutableBankStatementRecord,
  Part6BankReportTypeId,
  PayrollRecord,
  UserRole,
} from "../types";

// In-memory store backing mocked DbService calls
let memAccounts: FinancialAccount[] = [];
let memBankTxs: BankTransactionRecord[] = [];
let memStatements: ImmutableBankStatementRecord[] = [];
let memReconciliations: BankReconciliationRecord[] = [];
let memInvoices: FinancialInvoiceRecord[] = [];
let memExpenses: Expense[] = [];
let memPayroll: PayrollRecord[] = [];

beforeEach(() => {
  memAccounts = [
    {
      id: "ACC-BNK-1",
      accountCode: "BANK-101",
      accountName: "CBE Main Operating",
      accountType: "Bank",
      bankAccountSubtype: "Checking",
      bankName: "Commercial Bank of Ethiopia",
      accountNumber: "1000112233445",
      branch: "Bole Branch",
      currency: "ETB",
      openingBalance: 1000000,
      currentBalance: 1000000,
      minimumThreshold: 200000,
      project: "Corporate Treasury",
      status: "Active",
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    },
    {
      id: "ACC-BNK-2",
      accountCode: "BANK-102",
      accountName: "Awash Escrow Account",
      accountType: "Bank",
      bankAccountSubtype: "Project Escrow",
      bankName: "Awash Bank",
      accountNumber: "013200445566",
      branch: "Kazanchis",
      currency: "ETB",
      openingBalance: 500000,
      currentBalance: 500000,
      minimumThreshold: 100000,
      project: "Bole Tower B",
      status: "Active",
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    },
    {
      id: "ACC-CSH-1",
      accountCode: "CASH-101",
      accountName: "Head Office Petty Cash Vault",
      accountType: "Cash",
      bankAccountSubtype: "Cash Vault",
      currency: "ETB",
      openingBalance: 75000,
      currentBalance: 75000,
      minimumThreshold: 20000,
      project: "Corporate Treasury",
      status: "Active",
      createdAt: "2026-07-01T08:00:00.000Z",
      updatedAt: "2026-07-01T08:00:00.000Z",
    },
  ];
  memBankTxs = [];
  memStatements = [];
  memReconciliations = [];
  memInvoices = [
    {
      id: "INV-AR-1",
      invoiceNumber: "INV-2026-001",
      project: "Bole Tower B",
      client: "Oromia Housing",
      clientName: "Oromia Housing",
      amount: 300000,
      paidAmount: 0,
      status: "Approved",
      date: "2026-07-02",
      dueDate: "2026-07-30",
    },
  ];
  memExpenses = [
    {
      id: "EXP-AP-1",
      billNumber: "BILL-2026-09",
      project: "Bole Tower B",
      vendor: "Dangote Cement",
      category: "Material",
      amount: 120000,
      paidAmount: 0,
      status: "Approved",
      date: "2026-07-03",
      dueDate: "2026-07-25",
      description: "Cement batch",
      costCenter: "CC-BOLE-B",
      approvedBy: "Finance Manager",
    },
  ];
  memPayroll = [
    {
      id: "PAY-1",
      workerId: "WRK-1",
      workerName: "Abebe Bikila",
      position: "Foreman",
      department: "Site Operations",
      team: "Structural Team",
      project: "Bole Tower B",
      employmentType: "Permanent",
      period: "2026-07",
      basicSalary: 25000,
      attendanceDays: 26,
      totalWorkingHours: 208,
      overtimeHours: 0,
      overtimePayment: 0,
      undertimeHours: 0,
      undertimeDeduction: 0,
      allowances: 0,
      deductions: 0,
      netSalary: 25000,
      status: "Approved",
      grade: "Grade B",
    },
  ];

  vi.restoreAllMocks();

  vi.spyOn(DbService, "addAuditLog").mockResolvedValue(undefined);
  vi.spyOn(DbService, "saveFinancialAccount").mockImplementation(async (acc) => {
    const idx = memAccounts.findIndex((a) => a.id === acc.id);
    if (idx >= 0) memAccounts[idx] = acc;
    else memAccounts.push(acc);
  });
  vi.spyOn(DbService, "saveBankTransaction").mockImplementation(async (tx) => {
    const idx = memBankTxs.findIndex((t) => t.id === tx.id);
    if (idx >= 0) memBankTxs[idx] = tx;
    else memBankTxs.push(tx);
  });
  vi.spyOn(DbService, "createImmutableBankStatement").mockImplementation(async (stmt) => {
    if (memStatements.some((s) => s.id === stmt.id)) {
      throw new Error("Original bank statements are immutable and cannot be overwritten.");
    }
    memStatements.push(stmt);
  });
  vi.spyOn(DbService, "saveBankReconciliation").mockImplementation(async (rec) => {
    const idx = memReconciliations.findIndex((r) => r.id === rec.id);
    if (idx >= 0) memReconciliations[idx] = rec;
    else memReconciliations.push(rec);
  });
  vi.spyOn(DbService, "applyBankTransactionAtomic").mockImplementation(async (params) => {
    const tIdx = memBankTxs.findIndex((t) => t.id === params.tx.id);
    if (tIdx >= 0) memBankTxs[tIdx] = params.tx;
    else memBankTxs.push(params.tx);

    if (params.account && params.accountDelta !== 0) {
      const a = memAccounts.find((x) => x.id === params.account!.id);
      if (a) a.currentBalance += params.accountDelta;
    }
    if (params.toAccount && params.toAccountDelta) {
      const ta = memAccounts.find((x) => x.id === params.toAccount!.id);
      if (ta) ta.currentBalance += params.toAccountDelta;
    }
    if (params.linkedInvoice && params.invoicePaidDelta) {
      const inv = memInvoices.find((i) => i.id === params.linkedInvoice!.id);
      if (inv) {
        inv.paidAmount = (inv.paidAmount || 0) + params.invoicePaidDelta;
        inv.status = inv.paidAmount >= inv.amount ? "Paid" : "Partially Paid";
      }
    }
    if (params.linkedExpense && params.expensePaidDelta) {
      const exp = memExpenses.find((e) => e.id === params.linkedExpense!.id);
      if (exp) {
        exp.paidAmount = (exp.paidAmount || 0) + params.expensePaidDelta;
        exp.status = exp.paidAmount >= exp.amount ? "Paid" : "Partially Paid";
      }
    }
    if (params.linkedPayroll && params.payrollNextStatus) {
      const pr = memPayroll.find((p) => p.id === params.linkedPayroll!.id);
      if (pr) pr.status = params.payrollNextStatus;
    }
  });
});

describe("Part 6: Bank Management & Bank Reconciliation Engine", () => {
  it("supports all 9 bank transaction categories, duplicate account prevention, and status updates", async () => {
    expect(BANK_TRANSACTION_TYPES).toEqual([
      "Deposits",
      "Withdrawals",
      "Client Payments",
      "Supplier Payments",
      "Salary Payments",
      "Bank Transfers",
      "Bank Charges",
      "Interest Income",
      "Other Transactions",
    ]);

    const newAcc = await registerBankAccount({
      bankName: "Dashen Bank",
      accountName: "Payroll Account",
      accountNumber: "50099887766",
      bankAccountSubtype: "Payroll",
      currency: "ETB",
      branch: "Piassa",
      openingBalance: 250000,
      minimumThreshold: 50000,
      existingAccounts: memAccounts,
      actorName: "Finance Director",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    expect(newAcc.currentBalance).toBe(250000);
    expect(memAccounts).toHaveLength(4);

    // Duplicate account number at same bank must be rejected
    await expect(
      registerBankAccount({
        bankName: "Dashen Bank",
        accountName: "Duplicate Payroll",
        accountNumber: "50099887766",
        bankAccountSubtype: "Payroll",
        currency: "ETB",
        branch: "Piassa",
        openingBalance: 1000,
        minimumThreshold: 0,
        existingAccounts: memAccounts,
        actorName: "Finance Director",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "U-FM",
      })
    ).rejects.toThrow(/already exists/i);

    const frozen = await updateBankAccountStatus({
      account: newAcc,
      nextStatus: "Frozen",
      actorName: "Finance Director",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(frozen.status).toBe("Frozen");
  });

  it("never updates bank balances until approved, blocks duplicates, and atomically updates AR/AP/Payroll & transfers on approval", async () => {
    const cbe = memAccounts[0];
    const awash = memAccounts[1];

    // 1. Client payment linked to AR invoice starts as Pending Approval & balance does NOT change yet
    const clientPay = await createBankTransaction({
      account: cbe,
      transactionType: "Client Payments",
      transactionDate: "2026-07-05",
      amount: 300000,
      referenceNo: "FT-CLI-901",
      project: "Bole Tower B",
      counterparty: "Oromia Housing",
      description: "IPC-1 Settlement",
      linkedDocumentType: "Invoice",
      linkedDocumentId: "INV-AR-1",
      existingBankTxs: memBankTxs,
      actorName: "Site Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });

    expect(clientPay.approvalStatus).toBe("Pending Approval");
    expect(cbe.currentBalance).toBe(1000000); // Unchanged!
    expect(memInvoices[0].paidAmount).toBe(0);

    // Duplicate reference + date + amount prevented
    await expect(
      createBankTransaction({
        account: cbe,
        transactionType: "Client Payments",
        transactionDate: "2026-07-05",
        amount: 300000,
        referenceNo: "FT-CLI-901",
        project: "Bole Tower B",
        counterparty: "Oromia Housing",
        description: "IPC-1 Settlement",
        existingBankTxs: memBankTxs,
        actorName: "Site Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/duplicate/i);

    // Accountant CANNOT approve
    await expect(
      approveBankTransaction({
        tx: clientPay,
        accounts: memAccounts,
        invoices: memInvoices,
        actorName: "Site Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Finance Manager or Director/i);

    // Finance Manager approves -> balance & AR invoice update atomically
    await approveBankTransaction({
      tx: clientPay,
      accounts: memAccounts,
      invoices: memInvoices,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(cbe.currentBalance).toBe(1300000);
    expect(memInvoices[0].paidAmount).toBe(300000);
    expect(memInvoices[0].status).toBe("Paid");

    // 2. Supplier Payment linked to AP Expense + Bank Transfer between CBE and Awash + Salary Payment
    const supPay = await createBankTransaction({
      account: cbe,
      transactionType: "Supplier Payments",
      transactionDate: "2026-07-06",
      amount: 120000,
      referenceNo: "CHQ-4001",
      chequeNumber: "CHQ-4001",
      paymentMethod: "Cheque",
      project: "Bole Tower B",
      counterparty: "Dangote Cement",
      description: "Supplier Cement Payment",
      linkedDocumentType: "Expense",
      linkedDocumentId: "EXP-AP-1",
      existingBankTxs: memBankTxs,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: supPay,
      accounts: memAccounts,
      expenses: memExpenses,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(cbe.currentBalance).toBe(1180000);
    expect(memExpenses[0].status).toBe("Paid");

    const trf = await createBankTransaction({
      account: cbe,
      toAccount: awash,
      transactionType: "Bank Transfers",
      transactionDate: "2026-07-07",
      amount: 100000,
      referenceNo: "TRF-7788",
      project: "Corporate Treasury",
      counterparty: "Awash Escrow Account",
      description: "Inter-bank funding",
      existingBankTxs: memBankTxs,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: trf,
      accounts: memAccounts,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(cbe.currentBalance).toBe(1080000);
    expect(awash.currentBalance).toBe(600000);

    const sal = await createBankTransaction({
      account: cbe,
      transactionType: "Salary Payments",
      transactionDate: "2026-07-08",
      amount: 25000,
      referenceNo: "PAY-701",
      project: "Bole Tower B",
      counterparty: "Abebe Bikila",
      description: "July Foreman Payroll",
      linkedDocumentType: "Payroll",
      linkedDocumentId: "PAY-1",
      existingBankTxs: memBankTxs,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: sal,
      accounts: memAccounts,
      payrollRecords: memPayroll,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(cbe.currentBalance).toBe(1055000);
    expect(memPayroll[0].status).toBe("Paid");
  });

  it("parses CSV, Excel (.xlsx), and PDF statements, archives immutably, and imports transactions as Pending Verification (never auto-approved)", async () => {
    // 1. CSV parse
    const csvSample = [
      "Date,Description,Reference,Deposit,Withdrawal,Balance",
      "2026-07-05,Client IPC-1 Payment,FT-CLI-901,300000,0,1300000",
      "2026-07-10,Monthly SMS & Service Bank Charge,CHG-001,0,1500,1298500",
    ].join("\n");
    const csvPreview = parseCsvBankStatement(csvSample, "cbe-july.csv");
    expect(csvPreview.fileFormat).toBe("CSV");
    expect(csvPreview.lines).toHaveLength(2);
    expect(csvPreview.lines[0].depositAmount).toBe(300000);
    expect(csvPreview.lines[1].suggestedTxType).toBe("Bank Charges");

    // 2. Excel (.xlsx) parse
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "Description", "Reference", "Deposit", "Withdrawal", "Balance"],
      ["2026-07-05", "Deposit From Client", "XLS-101", 150000, 0, 1150000],
      ["2026-07-11", "Bank Commission Fee", "XLS-102", 0, 2200, 1147800],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Statement");
    const xlsxBytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const excelPreview = parseExcelBankStatement(xlsxBytes, "awash-july.xlsx");
    expect(excelPreview.fileFormat).toBe("Excel");
    expect(excelPreview.lines).toHaveLength(2);
    expect(excelPreview.lines[0].amount).toBe(150000);
    expect(excelPreview.lines[1].suggestedTxType).toBe("Bank Charges");

    // 3. PDF parse (synthetic minimal valid PDF text stream)
    const pdfPayload =
      "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n" +
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n" +
      "3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj\n" +
      "4 0 obj << /Length 90 >> stream\n" +
      "BT (2026-07-12 Bank Transfer Fee REF990 0.00 850.00 999150.00) Tj ET\n" +
      "endstream endobj\n%%EOF";
    const pdfBytes = new TextEncoder().encode(pdfPayload);
    const pdfPreview = await parsePdfBankStatement(pdfBytes, "cbe-july.pdf");
    expect(pdfPreview.fileFormat).toBe("PDF");
    expect(pdfPreview.lines.length).toBeGreaterThanOrEqual(1);
    expect(pdfPreview.lines[0].withdrawalAmount).toBe(850);

    // 4. Manual correction + Immutable save -> NEVER auto-approved!
    const correctedLines = csvPreview.lines.map((l, idx) =>
      idx === 1 ? { ...l, description: "CBE Maintenance & SMS Charge", wasManuallyCorrected: true } : l
    );

    const cbe = memAccounts[0];
    const balBefore = cbe.currentBalance;
    const importedResult = await saveImmutableBankStatementAndImport({
      account: cbe,
      preview: csvPreview,
      verifiedLines: correctedLines,
      openingBalance: 1000000,
      closingBalance: 1298500,
      existingStatements: memStatements,
      existingBankTxs: memBankTxs,
      actorName: "Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });

    expect(importedResult.statement.isImmutable).toBe(true);
    expect(importedResult.importedTransactions.length).toBe(2);
    importedResult.importedTransactions.forEach((tx) => {
      expect(tx.approvalStatus).toBe("Pending Verification"); // NEVER auto-approved!
    });
    expect(cbe.currentBalance).toBe(balBefore); // Balance untouched by import!

    // Overwriting existing immutable statement must throw
    await expect(DbService.createImmutableBankStatement(importedResult.statement)).rejects.toThrow(
      /immutable/i
    );
  });

  it("identifies all 7 reconciliation classifications, supports auto & manual matching, enforces 6-stage workflow & RBAC, and generates KPIs + 7 reports", async () => {
    const cbe = memAccounts[0];

    // Seed approved ERP transactions on CBE:
    // 1) Matched Client Deposit 300,000 (FT-CLI-901)
    const tx1 = await createBankTransaction({
      account: cbe,
      transactionType: "Client Payments",
      transactionDate: "2026-07-05",
      amount: 300000,
      referenceNo: "FT-CLI-901",
      project: "Bole Tower B",
      counterparty: "Oromia Housing",
      description: "Client Payment FT-CLI-901",
      existingBankTxs: memBankTxs,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: tx1,
      accounts: memAccounts,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    // 2) Outstanding Deposit recorded in ERP on 2026-07-29 (not on statement yet): 90,000
    const txOutDep = await createBankTransaction({
      account: cbe,
      transactionType: "Deposits",
      transactionDate: "2026-07-29",
      amount: 90000,
      referenceNo: "DEP-IN-TRANSIT",
      project: "Bole Tower B",
      counterparty: "Cash Deposit",
      description: "Evening cheque deposit",
      existingBankTxs: memBankTxs,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: txOutDep,
      accounts: memAccounts,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    // 3) Unpresented Cheque issued in ERP on 2026-07-28 (not cleared on bank yet): 45,000
    const txUnpresChq = await createBankTransaction({
      account: cbe,
      transactionType: "Supplier Payments",
      transactionDate: "2026-07-28",
      amount: 45000,
      referenceNo: "CHQ-8822",
      chequeNumber: "CHQ-8822",
      paymentMethod: "Cheque",
      project: "Bole Tower B",
      counterparty: "Steel Vendor",
      description: "Rebar cheque",
      existingBankTxs: memBankTxs,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: txUnpresChq,
      accounts: memAccounts,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    // 4) Unreconciled wire ready for manual match: 55,000
    const txManualTarget = await createBankTransaction({
      account: cbe,
      transactionType: "Withdrawals",
      transactionDate: "2026-07-14",
      amount: 55000,
      referenceNo: "WDR-ERP-ONLY",
      project: "Corporate Treasury",
      counterparty: "Site Petty Cash",
      description: "Site replenishment",
      existingBankTxs: memBankTxs,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    await approveBankTransaction({
      tx: txManualTarget,
      accounts: memAccounts,
      actorName: "FM",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    const cashTxs: CashTransactionRecord[] = [];
    const filter = {
      accountId: "ALL",
      project: "ALL",
      transactionType: "ALL",
      approvalStatus: "ALL",
      startDate: "",
      endDate: "",
      searchTerm: "",
    };

    const state = computePart6BankState({
      financialAccounts: memAccounts,
      bankTransactions: memBankTxs,
      cashTransactions: cashTxs,
      bankReconciliations: memReconciliations,
      bankStatements: memStatements,
      filterState: filter,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-31",
    });

    const cbeRows = state.ledgerRows.filter((r) => r.accountId === cbe.id);

    // Statement lines include:
    // - Matched line (FT-CLI-901)
    // - Duplicate of FT-CLI-901
    // - Missing in ERP line (20,000 unknown deposit)
    // - Bank Charge Not Recorded (1,250)
    // - Line for manual matching (55,000 with altered ref)
    const rawStmtLines = [
      {
        id: "SL-1",
        statementDate: "2026-07-05",
        bankReferenceNo: "FT-CLI-901",
        description: "Client Payment FT-CLI-901",
        direction: "Credit" as const,
        amount: 300000,
        matchStatus: "Unmatched" as const,
      },
      {
        id: "SL-2",
        statementDate: "2026-07-05",
        bankReferenceNo: "FT-CLI-901",
        description: "Client Payment FT-CLI-901",
        direction: "Credit" as const,
        amount: 300000,
        matchStatus: "Unmatched" as const,
      },
      {
        id: "SL-3",
        statementDate: "2026-07-15",
        bankReferenceNo: "UNKNOWN-DEP-2",
        description: "Unidentified Bank Credit",
        direction: "Credit" as const,
        amount: 20000,
        matchStatus: "Unmatched" as const,
      },
      {
        id: "SL-4",
        statementDate: "2026-07-20",
        bankReferenceNo: "FEE-JUL-20",
        description: "Monthly Bank Service Charge & Commission",
        direction: "Debit" as const,
        amount: 1250,
        matchStatus: "Unmatched" as const,
      },
      {
        id: "SL-5",
        statementDate: "2026-07-22",
        bankReferenceNo: "ALT-REF-99",
        description: "Vault Cash Withdrawal",
        direction: "Debit" as const,
        amount: 55000,
        matchStatus: "Unmatched" as const,
      },
    ];

    const autoMatched = autoMatchStatementLines(rawStmtLines, cbeRows);
    expect(autoMatched.find((l) => l.id === "SL-1")?.matchStatus).toBe("Matched");
    expect(autoMatched.find((l) => l.id === "SL-2")?.matchStatus).toBe("Duplicate");
    expect(autoMatched.find((l) => l.id === "SL-3")?.matchStatus).toBe("Missing in ERP");
    expect(autoMatched.find((l) => l.id === "SL-4")?.matchStatus).toBe("Bank Charge Not Recorded");
    expect(autoMatched.find((l) => l.id === "SL-5")?.matchStatus).toBe("Missing in ERP");

    // Manual match SL-5 -> txManualTarget
    const manualRow = cbeRows.find((r) => r.id === txManualTarget.id)!;
    const afterManual = manualMatchStatementLine(autoMatched, "SL-5", manualRow);
    expect(afterManual.find((l) => l.id === "SL-5")?.matchStatus).toBe("Matched");
    expect(afterManual.find((l) => l.id === "SL-5")?.matchType).toBe("Manual");

    const analysis = computePart6ReconciliationAnalysis({
      account: cbe,
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      statementOpeningBalance: 1000000,
      statementClosingBalance: 1263750,
      statementLines: afterManual,
      ledgerRows: state.ledgerRows,
    });

    expect(analysis.matchedLines).toHaveLength(2);
    expect(analysis.duplicateStatementLines).toHaveLength(1);
    expect(analysis.bankChargesNotRecordedLines).toHaveLength(1);
    expect(analysis.bankChargesNotRecordedTotal).toBe(1250);
    expect(analysis.missingInErpLines).toHaveLength(2);
    expect(analysis.outstandingDepositsErp).toHaveLength(1);
    expect(analysis.outstandingDepositsTotal).toBe(90000);
    expect(analysis.unpresentedChequesErp).toHaveLength(1);
    expect(analysis.unpresentedChequesTotal).toBe(45000);

    // Accountant CANNOT finalize/approve Reconciliation
    await expect(
      saveOrSubmitBankReconciliation({
        account: cbe,
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        statementOpeningBalance: 1000000,
        statementClosingBalance: 1263750,
        statementLines: afterManual,
        ledgerRows: state.ledgerRows,
        workflowStage: "Reconciliation Approval",
        approvalStatus: "Reconciled",
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Finance Manager or Director/i);

    // Finance Manager approves Reconciliation & stamps account lastReconciledDate
    const approvedRec = await saveOrSubmitBankReconciliation({
      account: cbe,
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      statementOpeningBalance: 1000000,
      statementClosingBalance: 1263750,
      statementLines: afterManual,
      ledgerRows: state.ledgerRows,
      workflowStage: "Final Report",
      approvalStatus: "Reconciled",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });

    expect(approvedRec.approvalStatus).toBe("Reconciled");
    expect(memAccounts[0].lastReconciledDate).toBe("2026-07-31");

    // Recompute Dashboard KPIs & verify all 7 Reports + Part 5 Cash Flow integration
    const postState = computePart6BankState({
      financialAccounts: memAccounts,
      bankTransactions: memBankTxs,
      cashTransactions: cashTxs,
      bankReconciliations: memReconciliations,
      bankStatements: memStatements,
      filterState: filter,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-31",
    });

    expect(postState.kpis.totalBankBalance).toBe(1290000 + 500000);
    expect(postState.kpis.totalDeposits).toBe(390000);
    expect(postState.kpis.totalWithdrawals).toBe(100000);
    expect(postState.kpis.lastReconciliationDate).toBe("2026-07-31");

    const reportIds: Part6BankReportTypeId[] = [
      "bank-account-report",
      "bank-transaction-report",
      "monthly-bank-statement",
      "bank-reconciliation-report",
      "unmatched-transaction-report",
      "bank-charges-report",
      "cash-and-bank-position-report",
    ];
    reportIds.forEach((rid) => {
      const ds = buildPart6BankReportDataset(rid, postState, approvedRec);
      expect(ds.columns.length).toBeGreaterThan(0);
      expect(ds.summaryTotals.length).toBeGreaterThan(0);
    });

    // Verify Part 5 Cash Flow picks up approved Part 6 bank transactions cleanly
    const part5 = computePart5CashFlowState({
      cashTransactions: [],
      invoices: memInvoices,
      expenses: memExpenses,
      collectionPlans: [],
      paymentPlans: [],
      payrollRecords: memPayroll,
      projectBudgetPlans: [],
      budgetAllocations: [],
      financialTargets: [],
      financialAccounts: memAccounts,
      explicitForecastItems: [],
      bankReconciliations: memReconciliations,
      bankTransactions: memBankTxs,
      filterState: {
        project: "ALL",
        bankAccountId: "ALL",
        financialYear: "2026",
        granularity: "Monthly",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        searchTerm: "",
      },
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-31",
    });
    expect(part5.kpis.actualCashInflow).toBe(390000);
    expect(part5.kpis.actualCashOutflow).toBe(100000);
  });
});
