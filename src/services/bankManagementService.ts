import * as XLSX from "xlsx";
import {
  BankAccountSubtype,
  BankReconciliationRecord,
  BankReconciliationStatus,
  BankReconciliationWorkflowStage,
  BankStatementLineItem,
  BankStatementMatchStatus,
  BankTransactionApprovalStatus,
  BankTransactionRecord,
  BankTransactionType,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialAlertItem,
  FinancialInvoiceRecord,
  FinancialSettingsConfig,
  ImmutableBankStatementLine,
  ImmutableBankStatementRecord,
  Part6BankReportTypeId,
  PayrollRecord,
  UserRole,
} from "../types";
import { DbService } from "./db";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  getAssignedProjectsForProfile,
  isConfirmedCashStatus,
  isPendingCashStatus,
  isReversedOrRejectedStatus,
  resolveUserFinancePermissions,
  UserFinancePermissions,
} from "./financeService";
import { parseMoney, safeString } from "../utils/formatters";

// ============================================================================
// PART 6: CONSTANTS & TAXONOMY
// ============================================================================

export const BANK_TRANSACTION_TYPES: BankTransactionType[] = [
  "Deposits",
  "Withdrawals",
  "Client Payments",
  "Supplier Payments",
  "Salary Payments",
  "Bank Transfers",
  "Bank Charges",
  "Interest Income",
  "Other Transactions",
];

export const BANK_ACCOUNT_SUBTYPES: BankAccountSubtype[] = [
  "Checking",
  "Savings",
  "Project Escrow",
  "Payroll",
  "Overdraft",
];

export const RECONCILIATION_WORKFLOW_STAGES: BankReconciliationWorkflowStage[] = [
  "Statement Upload",
  "Transaction Matching",
  "Difference Identification",
  "Finance Review",
  "Reconciliation Approval",
  "Final Report",
];

export interface Part6BankFilterState {
  accountId: string;
  project: string;
  transactionType: string;
  approvalStatus: string;
  startDate: string;
  endDate: string;
  searchTerm: string;
}

export function generateBankRef(
  prefix: "BNK" | "BTX" | "BST" | "REC" | "BSL",
  now: Date = new Date()
): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function getDefaultDirectionForBankTxType(
  txType: BankTransactionType,
  explicitDirection?: "Credit" | "Debit"
): "Credit" | "Debit" {
  if (txType === "Deposits" || txType === "Client Payments" || txType === "Interest Income") {
    return "Credit";
  }
  if (
    txType === "Withdrawals" ||
    txType === "Supplier Payments" ||
    txType === "Salary Payments" ||
    txType === "Bank Transfers" ||
    txType === "Bank Charges"
  ) {
    return "Debit";
  }
  return explicitDirection || "Debit";
}

export function mapCashTxToBankTransactionType(tx: CashTransactionRecord): BankTransactionType {
  const cat = `${safeString(tx.category)} ${safeString(tx.description)}`.toLowerCase();
  if (tx.type === "Transfer") return "Bank Transfers";
  if (tx.type === "Collection") {
    if (cat.includes("interest")) return "Interest Income";
    if (tx.linkedDocumentType === "Invoice" || cat.includes("client") || cat.includes("invoice")) {
      return "Client Payments";
    }
    return "Deposits";
  }
  if (tx.linkedDocumentType === "Payroll" || cat.includes("salary") || cat.includes("payroll") || cat.includes("wage")) {
    return "Salary Payments";
  }
  if (cat.includes("bank charge") || cat.includes("bank fee") || cat.includes("commission")) {
    return "Bank Charges";
  }
  if (tx.linkedDocumentType === "Expense" || cat.includes("supplier") || cat.includes("material") || cat.includes("subcontractor")) {
    return "Supplier Payments";
  }
  return "Withdrawals";
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

function diffDaysAbs(aIso: string, bIso: string): number {
  const a = parseIsoDate(aIso);
  const b = parseIsoDate(bIso);
  if (!a || !b) return 9999;
  return Math.abs(Math.floor((a.getTime() - b.getTime()) / 86400000));
}

function normalizeTokenText(raw?: string): string {
  return safeString(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenOverlapScore(a?: string, b?: string): number {
  const ta = new Set(normalizeTokenText(a).split(" ").filter((t) => t.length >= 3));
  const tb = new Set(normalizeTokenText(b).split(" ").filter((t) => t.length >= 3));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  ta.forEach((t) => {
    if (tb.has(t)) hits++;
  });
  return hits / Math.max(ta.size, tb.size);
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

function isBankChargeText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("bank charge") ||
    lower.includes("service charge") ||
    lower.includes("commission") ||
    lower.includes("ledger fee") ||
    lower.includes("transfer fee") ||
    lower.includes("sms alert") ||
    lower.includes("stamp duty") ||
    lower.includes("maintenance fee") ||
    lower.includes("swift fee") ||
    lower.includes("cheque book fee")
  );
}

// ============================================================================
// UNIFIED BANK LEDGER & DASHBOARD COMPUTATION
// ============================================================================

export interface UnifiedBankLedgerRow {
  id: string;
  transactionNo: string;
  sourceCollection: "bankTransactions" | "cashTransactions";
  accountId: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  toAccountId?: string;
  toAccountName?: string;
  transactionType: BankTransactionType;
  direction: "Credit" | "Debit";
  transactionDate: string;
  amount: number;
  currency: string;
  referenceNo: string;
  chequeNumber?: string;
  project: string;
  department?: string;
  counterparty: string;
  description: string;
  paymentMethod: string;
  linkedDocumentType?: string;
  linkedDocumentId?: string;
  linkedReferenceNo?: string;
  sourceChannel: string;
  approvalStatus: BankTransactionApprovalStatus | string;
  isApproved: boolean;
  isPending: boolean;
  isRejectedOrReversed: boolean;
  reconciliationStatus: "Unreconciled" | "Matched" | "Reconciled";
  reconciliationId?: string;
  isDuplicateFlag?: boolean;
  recordedBy: string;
  approvedBy?: string;
  rawBankTx?: BankTransactionRecord;
  rawCashTx?: CashTransactionRecord;
}

export interface Part6BankDashboardState {
  permissions: UserFinancePermissions;
  referenceToday: string;
  currency: string;
  settings: FinancialSettingsConfig;
  assignedProjects: string[];
  allAccounts: FinancialAccount[];
  bankAccounts: FinancialAccount[];
  cashAccounts: FinancialAccount[];
  ledgerRows: UnifiedBankLedgerRow[];
  filteredLedgerRows: UnifiedBankLedgerRow[];
  reconciliations: BankReconciliationRecord[];
  statements: ImmutableBankStatementRecord[];
  filterOptions: {
    projects: string[];
    accounts: FinancialAccount[];
  };
  kpis: {
    totalBankBalance: number;
    totalCashBalance: number;
    totalCashAndBankPosition: number;
    bankBalancesByAccount: {
      accountId: string;
      accountCode: string;
      accountName: string;
      bankName: string;
      accountNumber: string;
      subtype: string;
      currency: string;
      openingBalance: number;
      currentBalance: number;
      minimumThreshold: number;
      status: string;
      lastReconciledDate?: string;
      lastReconciledBalance?: number;
      isBelowThreshold: boolean;
    }[];
    totalDeposits: number;
    totalWithdrawals: number;
    netBankFlow: number;
    unreconciledTransactionsCount: number;
    unreconciledTransactionsAmount: number;
    reconciliationDifferencesTotal: number;
    lastReconciliationDate: string;
    pendingApprovalCount: number;
    pendingApprovalAmount: number;
    totalBankCharges: number;
    totalInterestIncome: number;
  };
  charts: {
    bankBalanceByAccount: { name: string; bankName: string; currentBalance: number; threshold: number }[];
    depositsVsWithdrawals: { period: string; deposits: number; withdrawals: number; net: number }[];
    transactionTypeBreakdown: { type: BankTransactionType; credits: number; debits: number; count: number }[];
  };
  alerts: FinancialAlertItem[];
}

export interface ComputePart6BankInput {
  financialAccounts: FinancialAccount[];
  bankTransactions: BankTransactionRecord[];
  cashTransactions: CashTransactionRecord[];
  bankReconciliations: BankReconciliationRecord[];
  bankStatements: ImmutableBankStatementRecord[];
  projects?: any[];
  filterState: Part6BankFilterState;
  userRole?: UserRole | string;
  userProfile?: any;
  settings?: FinancialSettingsConfig | null;
  referenceToday?: string;
}

export function computePart6BankState(input: ComputePart6BankInput): Part6BankDashboardState {
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

  const allAccounts = (input.financialAccounts || []).filter(
    (a) =>
      !permissions.isProjectScopedOnly ||
      !a.project ||
      a.project === "Corporate Treasury" ||
      matchesProjectScope(a.project, assignedProjects)
  );
  const bankAccounts = allAccounts.filter((a) => a.accountType === "Bank");
  const cashAccounts = allAccounts.filter((a) => a.accountType === "Cash");

  const accountById = new Map<string, FinancialAccount>();
  allAccounts.forEach((a) => accountById.set(a.id, a));
  const bankAccountIdSet = new Set(bankAccounts.map((a) => a.id));

  // Build Reconciled Tx ID set from approved reconciliations
  const reconciledTxIdMap = new Map<string, string>();
  const matchedTxIdMap = new Map<string, string>();
  (input.bankReconciliations || []).forEach((rec) => {
    const isFinal = rec.approvalStatus === "Reconciled";
    (rec.reconciledTxIds || []).forEach((txId) => {
      if (isFinal) {
        reconciledTxIdMap.set(txId, rec.reconciliationNo);
      } else {
        matchedTxIdMap.set(txId, rec.reconciliationNo);
      }
    });
    (rec.statementLines || []).forEach((line) => {
      const targetId = line.matchedBankTxId || line.matchedCashTxId;
      if (!targetId) return;
      if (isFinal) {
        reconciledTxIdMap.set(targetId, rec.reconciliationNo);
      } else if (!reconciledTxIdMap.has(targetId)) {
        matchedTxIdMap.set(targetId, rec.reconciliationNo);
      }
    });
  });

  // Unify bankTransactions + bank-account cashTransactions without double counting
  const ledgerRows: UnifiedBankLedgerRow[] = [];
  const linkedCashTxIds = new Set<string>();
  const seenRefs = new Set<string>();

  (input.bankTransactions || []).forEach((bt) => {
    if (!bt || !bt.id) return;
    if (!scopeMatchesProject(bt.project)) return;
    const acc = accountById.get(bt.accountId);
    if (bt.linkedCashTxId) linkedCashTxIds.add(bt.linkedCashTxId);
    if (bt.referenceNo) seenRefs.add(bt.referenceNo.toLowerCase());

    const isApproved = bt.approvalStatus === "Approved";
    const isRejectedOrReversed = bt.approvalStatus === "Rejected" || bt.approvalStatus === "Reversed";
    const isPending = !isApproved && !isRejectedOrReversed;
    const reconNo = reconciledTxIdMap.get(bt.id) || matchedTxIdMap.get(bt.id) || bt.reconciliationId;
    const reconStatus: "Unreconciled" | "Matched" | "Reconciled" =
      bt.reconciliationStatus === "Reconciled" || reconciledTxIdMap.has(bt.id)
        ? "Reconciled"
        : bt.reconciliationStatus === "Matched" || matchedTxIdMap.has(bt.id)
        ? "Matched"
        : "Unreconciled";

    ledgerRows.push({
      id: bt.id,
      transactionNo: bt.transactionNo,
      sourceCollection: "bankTransactions",
      accountId: bt.accountId,
      accountName: acc?.accountName || bt.accountName || "Bank Account",
      bankName: acc?.bankName || bt.bankName || "Bank",
      accountNumber: acc?.accountNumber || bt.accountNumber || "-",
      toAccountId: bt.toAccountId,
      toAccountName: bt.toAccountName,
      transactionType: bt.transactionType,
      direction: bt.direction,
      transactionDate: safeString(bt.transactionDate, referenceToday).slice(0, 10),
      amount: parseMoney(bt.amount) ?? 0,
      currency: bt.currency || acc?.currency || currency,
      referenceNo: safeString(bt.referenceNo, bt.transactionNo),
      chequeNumber: bt.chequeNumber,
      project: safeString(bt.project, "Corporate Treasury"),
      department: bt.department,
      counterparty: safeString(bt.counterparty, "-"),
      description: safeString(bt.description, bt.transactionType),
      paymentMethod: safeString(bt.paymentMethod, "Bank Transfer"),
      linkedDocumentType: bt.linkedDocumentType,
      linkedDocumentId: bt.linkedDocumentId,
      linkedReferenceNo: bt.linkedReferenceNo,
      sourceChannel: bt.sourceChannel,
      approvalStatus: bt.approvalStatus,
      isApproved,
      isPending,
      isRejectedOrReversed,
      reconciliationStatus: reconStatus,
      reconciliationId: reconNo,
      isDuplicateFlag: bt.isDuplicateFlag,
      recordedBy: bt.recordedBy,
      approvedBy: bt.approvedBy,
      rawBankTx: bt,
    });
  });

  // Merge existing bank-account cashTransactions (Part 1-5 payments/collections/transfers)
  (input.cashTransactions || []).forEach((ct) => {
    if (!ct || !ct.id) return;
    if (linkedCashTxIds.has(ct.id)) return;
    if (ct.referenceNo && seenRefs.has(ct.referenceNo.toLowerCase())) return;
    const primaryIsBank = bankAccountIdSet.has(ct.accountId);
    const destIsBank = ct.toAccountId ? bankAccountIdSet.has(ct.toAccountId) : false;
    if (!primaryIsBank && !destIsBank) return;
    if (!scopeMatchesProject(ct.project)) return;

    const targetAccountId = primaryIsBank ? ct.accountId : ct.toAccountId!;
    const acc = accountById.get(targetAccountId);
    const txType = mapCashTxToBankTransactionType(ct);
    const direction: "Credit" | "Debit" =
      ct.type === "Collection"
        ? "Credit"
        : ct.type === "Transfer" && !primaryIsBank && destIsBank
        ? "Credit"
        : "Debit";

    const isApproved = isConfirmedCashStatus(ct.status);
    const isRejectedOrReversed = isReversedOrRejectedStatus(ct.status);
    const isPending = isPendingCashStatus(ct.status) || (!isApproved && !isRejectedOrReversed);
    const reconStatus: "Unreconciled" | "Matched" | "Reconciled" = reconciledTxIdMap.has(ct.id)
      ? "Reconciled"
      : matchedTxIdMap.has(ct.id)
      ? "Matched"
      : "Unreconciled";

    ledgerRows.push({
      id: ct.id,
      transactionNo: ct.referenceNo,
      sourceCollection: "cashTransactions",
      accountId: targetAccountId,
      accountName: acc?.accountName || ct.accountName || "Bank Account",
      bankName: acc?.bankName || "Bank",
      accountNumber: acc?.accountNumber || "-",
      toAccountId: ct.toAccountId,
      toAccountName: ct.toAccountName,
      transactionType: txType,
      direction,
      transactionDate: safeString(ct.date, referenceToday).slice(0, 10),
      amount: parseMoney(ct.amount) ?? 0,
      currency: ct.currency || acc?.currency || currency,
      referenceNo: safeString(ct.bankReferenceNumber || ct.referenceNo, ct.id),
      project: safeString(ct.project, "Corporate Treasury"),
      department: ct.department,
      counterparty: safeString(ct.counterparty, "-"),
      description: safeString(ct.description || ct.notes, `${ct.type} - ${ct.counterparty}`),
      paymentMethod: safeString(ct.paymentMethod, "Bank Transfer"),
      linkedDocumentType: ct.linkedDocumentType,
      linkedDocumentId: ct.linkedDocumentId,
      linkedReferenceNo: ct.linkedReferenceNo,
      sourceChannel: "Cash Module",
      approvalStatus: ct.status,
      isApproved,
      isPending,
      isRejectedOrReversed,
      reconciliationStatus: reconStatus,
      reconciliationId: reconciledTxIdMap.get(ct.id) || matchedTxIdMap.get(ct.id),
      recordedBy: safeString(ct.recordedBy || ct.createdBy, "Finance Officer"),
      approvedBy: ct.approvedBy,
      rawCashTx: ct,
    });
  });

  ledgerRows.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));

  // Filter options
  const projectSet = new Set<string>();
  (input.projects || []).forEach((p) => {
    const n = safeString(p?.name || p?.projectName);
    if (n && (!permissions.isProjectScopedOnly || matchesProjectScope(n, assignedProjects))) {
      projectSet.add(n);
    }
  });
  ledgerRows.forEach((r) => {
    if (r.project) projectSet.add(r.project);
  });

  // Apply Filter State
  const f = input.filterState;
  const q = safeString(f.searchTerm).toLowerCase();
  const filteredLedgerRows = ledgerRows.filter((row) => {
    if (f.accountId && f.accountId !== "ALL" && row.accountId !== f.accountId && row.toAccountId !== f.accountId) {
      return false;
    }
    if (f.project && f.project !== "ALL" && row.project !== f.project) return false;
    if (f.transactionType && f.transactionType !== "ALL" && row.transactionType !== f.transactionType) {
      return false;
    }
    if (f.approvalStatus && f.approvalStatus !== "ALL" && row.approvalStatus !== f.approvalStatus) {
      return false;
    }
    if (f.startDate && row.transactionDate < f.startDate) return false;
    if (f.endDate && row.transactionDate > f.endDate) return false;
    if (q) {
      const blob = `${row.transactionNo} ${row.referenceNo} ${row.accountName} ${row.bankName} ${row.counterparty} ${row.description} ${row.project}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });

  // Scoped Bank Reconciliations & Statements
  const scopedBankIdSet = new Set(
    f.accountId && f.accountId !== "ALL" ? [f.accountId] : bankAccounts.map((a) => a.id)
  );
  const scopedReconciliations = (input.bankReconciliations || [])
    .filter((r) => scopedBankIdSet.size === 0 || scopedBankIdSet.has(r.accountId))
    .sort((a, b) => (b.periodEnd || b.createdAt).localeCompare(a.periodEnd || a.createdAt));

  const scopedStatements = (input.bankStatements || [])
    .filter((s) => scopedBankIdSet.size === 0 || scopedBankIdSet.has(s.accountId))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  // Last Reconciliation Date per account
  const lastReconByAccount = new Map<string, BankReconciliationRecord>();
  scopedReconciliations.forEach((r) => {
    if (r.approvalStatus !== "Reconciled") return;
    const prev = lastReconByAccount.get(r.accountId);
    const rDate = r.periodEnd || r.approvedAt?.slice(0, 10) || "";
    const pDate = prev ? prev.periodEnd || prev.approvedAt?.slice(0, 10) || "" : "";
    if (!prev || rDate > pDate) {
      lastReconByAccount.set(r.accountId, r);
    }
  });

  // KPIs
  const scopedBankAccounts = bankAccounts.filter(
    (a) => (!f.accountId || f.accountId === "ALL" || a.id === f.accountId) && a.status !== "Closed"
  );
  const totalBankBalance = scopedBankAccounts.reduce((s, a) => s + (parseMoney(a.currentBalance) ?? 0), 0);
  const totalCashBalance = cashAccounts
    .filter((a) => a.status === "Active")
    .reduce((s, a) => s + (parseMoney(a.currentBalance) ?? 0), 0);
  const totalCashAndBankPosition = totalBankBalance + totalCashBalance;

  const bankBalancesByAccount = bankAccounts.map((a) => {
    const rec = lastReconByAccount.get(a.id);
    const bal = parseMoney(a.currentBalance) ?? 0;
    const thr = parseMoney(a.minimumThreshold) ?? 0;
    return {
      accountId: a.id,
      accountCode: safeString(a.accountCode, a.id),
      accountName: a.accountName,
      bankName: safeString(a.bankName, "Commercial Bank"),
      accountNumber: safeString(a.accountNumber, "-"),
      subtype: safeString(a.bankAccountSubtype, "Checking"),
      currency: a.currency || currency,
      openingBalance: parseMoney(a.openingBalance) ?? 0,
      currentBalance: bal,
      minimumThreshold: thr,
      status: a.status,
      lastReconciledDate: a.lastReconciledDate || rec?.periodEnd || rec?.approvedAt?.slice(0, 10),
      lastReconciledBalance: a.lastReconciledBalance ?? rec?.statementClosingBalance,
      isBelowThreshold: a.status === "Active" && thr > 0 && bal < thr,
    };
  });

  const approvedRows = filteredLedgerRows.filter((r) => r.isApproved);
  const pendingRows = filteredLedgerRows.filter((r) => r.isPending);
  const totalDeposits = approvedRows
    .filter((r) => r.direction === "Credit")
    .reduce((s, r) => s + r.amount, 0);
  const totalWithdrawals = approvedRows
    .filter((r) => r.direction === "Debit")
    .reduce((s, r) => s + r.amount, 0);
  const unreconciledRows = approvedRows.filter((r) => r.reconciliationStatus !== "Reconciled");
  const unreconciledTransactionsCount = unreconciledRows.length;
  const unreconciledTransactionsAmount = unreconciledRows.reduce((s, r) => s + r.amount, 0);

  // Sum latest unresolved differences per account (or active disputed/draft reconciliations)
  const latestRecPerAccount = new Map<string, BankReconciliationRecord>();
  scopedReconciliations.forEach((rec) => {
    if (!latestRecPerAccount.has(rec.accountId)) {
      latestRecPerAccount.set(rec.accountId, rec);
    }
  });
  const reconciliationDifferencesTotal = Array.from(latestRecPerAccount.values()).reduce(
    (s, r) => s + Math.abs(parseMoney(r.discrepancyAmount) ?? 0),
    0
  );

  const lastReconciledRecords = scopedReconciliations.filter((r) => r.approvalStatus === "Reconciled");
  const lastReconciliationDate =
    lastReconciledRecords[0]?.periodEnd ||
    lastReconciledRecords[0]?.approvedAt?.slice(0, 10) ||
    bankBalancesByAccount
      .map((b) => b.lastReconciledDate || "")
      .filter(Boolean)
      .sort()
      .reverse()[0] ||
    "—";

  const totalBankCharges = approvedRows
    .filter((r) => r.transactionType === "Bank Charges")
    .reduce((s, r) => s + r.amount, 0);
  const totalInterestIncome = approvedRows
    .filter((r) => r.transactionType === "Interest Income")
    .reduce((s, r) => s + r.amount, 0);

  // Charts
  const bankBalanceByAccount = bankBalancesByAccount
    .filter((a) => a.status !== "Closed")
    .map((a) => ({
      name: a.accountName,
      bankName: a.bankName,
      currentBalance: a.currentBalance,
      threshold: a.minimumThreshold,
    }));

  const monthFlowMap = new Map<string, { deposits: number; withdrawals: number }>();
  approvedRows.forEach((r) => {
    const key = r.transactionDate.slice(0, 7);
    const cur = monthFlowMap.get(key) || { deposits: 0, withdrawals: 0 };
    if (r.direction === "Credit") cur.deposits += r.amount;
    else cur.withdrawals += r.amount;
    monthFlowMap.set(key, cur);
  });
  const depositsVsWithdrawals = Array.from(monthFlowMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, val]) => ({
      period,
      deposits: val.deposits,
      withdrawals: val.withdrawals,
      net: val.deposits - val.withdrawals,
    }));

  const transactionTypeBreakdown = BANK_TRANSACTION_TYPES.map((t) => {
    const matching = approvedRows.filter((r) => r.transactionType === t);
    return {
      type: t,
      credits: matching.filter((m) => m.direction === "Credit").reduce((s, m) => s + m.amount, 0),
      debits: matching.filter((m) => m.direction === "Debit").reduce((s, m) => s + m.amount, 0),
      count: matching.length,
    };
  });

  // Alerts
  const alerts: FinancialAlertItem[] = [];
  bankBalancesByAccount.forEach((b) => {
    if (b.isBelowThreshold) {
      alerts.push({
        id: `BNK-LOW-${b.accountId}`,
        title: `Low Bank Balance: ${b.accountName}`,
        titleAm: `ዝቅተኛ የባንክ ሂሳብ ቀሪ: ${b.accountName}`,
        description: `${b.bankName} balance (${b.currency} ${b.currentBalance.toLocaleString()}) is below minimum threshold (${b.currency} ${b.minimumThreshold.toLocaleString()}).`,
        descriptionAm: `የ${b.bankName} ቀሪ (${b.currency} ${b.currentBalance.toLocaleString()}) ከዝቅተኛው ገደብ (${b.currency} ${b.minimumThreshold.toLocaleString()}) በታች ነው።`,
        severity: b.currentBalance <= 0 ? "CRITICAL" : "WARNING",
        moduleTarget: "cash-and-bank",
        amountEtb: b.currentBalance,
        timestamp: referenceToday,
      });
    }
  });
  if (pendingRows.length > 0) {
    const pTotal = pendingRows.reduce((s, r) => s + r.amount, 0);
    alerts.push({
      id: "BNK-PENDING-TX",
      title: `${pendingRows.length} Bank Transaction(s) Pending Approval`,
      titleAm: `${pendingRows.length} የባንክ ግብይቶች ማረጋገጫ ይጠብቃሉ`,
      description: `Imported or manually entered bank transactions totaling ${currency} ${pTotal.toLocaleString()} have not been approved and do not affect bank balances yet.`,
      descriptionAm: `ጠቅላላ ${currency} ${pTotal.toLocaleString()} የባንክ ግብይቶች ገና አልጸደቁም።`,
      severity: "WARNING",
      moduleTarget: "cash-and-bank",
      amountEtb: pTotal,
      timestamp: referenceToday,
    });
  }
  scopedReconciliations
    .filter((r) => Math.abs(r.discrepancyAmount) > 0.01 && r.approvalStatus !== "Reconciled")
    .forEach((r) => {
      alerts.push({
        id: `BNK-REC-DIFF-${r.id}`,
        title: `Reconciliation Discrepancy: ${r.reconciliationNo}`,
        titleAm: `የባንክ ማስታረቂያ ልዩነት: ${r.reconciliationNo}`,
        description: `${r.accountName} has a reconciliation difference of ${currency} ${Math.abs(r.discrepancyAmount).toLocaleString()} (${r.periodStart} → ${r.periodEnd}).`,
        descriptionAm: `${r.accountName} ላይ ${currency} ${Math.abs(r.discrepancyAmount).toLocaleString()} ልዩነት ተገኝቷል።`,
        severity: Math.abs(r.discrepancyAmount) > 50000 ? "CRITICAL" : "WARNING",
        moduleTarget: "cash-and-bank",
        amountEtb: Math.abs(r.discrepancyAmount),
        timestamp: r.periodEnd || referenceToday,
      });
    });

  return {
    permissions,
    referenceToday,
    currency,
    settings,
    assignedProjects,
    allAccounts,
    bankAccounts,
    cashAccounts,
    ledgerRows,
    filteredLedgerRows,
    reconciliations: scopedReconciliations,
    statements: scopedStatements,
    filterOptions: {
      projects: Array.from(projectSet).sort(),
      accounts: allAccounts,
    },
    kpis: {
      totalBankBalance,
      totalCashBalance,
      totalCashAndBankPosition,
      bankBalancesByAccount,
      totalDeposits,
      totalWithdrawals,
      netBankFlow: totalDeposits - totalWithdrawals,
      unreconciledTransactionsCount,
      unreconciledTransactionsAmount,
      reconciliationDifferencesTotal,
      lastReconciliationDate,
      pendingApprovalCount: pendingRows.length,
      pendingApprovalAmount: pendingRows.reduce((s, r) => s + r.amount, 0),
      totalBankCharges,
      totalInterestIncome,
    },
    charts: {
      bankBalanceByAccount,
      depositsVsWithdrawals,
      transactionTypeBreakdown,
    },
    alerts,
  };
}

// ============================================================================
// BANK ACCOUNT REGISTRATION & STATUS MANAGEMENT
// ============================================================================

export async function registerBankAccount(params: {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankAccountSubtype: BankAccountSubtype;
  currency: string;
  branch: string;
  openingBalance: number;
  minimumThreshold: number;
  project?: string;
  department?: string;
  swiftOrIban?: string;
  status?: "Active" | "Inactive" | "Frozen";
  existingAccounts: FinancialAccount[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<FinancialAccount> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageAccounts && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Only Finance Manager, Accountant, or Director can register company bank accounts.");
  }

  const accNumClean = safeString(params.accountNumber).trim();
  const bankNameClean = safeString(params.bankName).trim();
  const accNameClean = safeString(params.accountName).trim();
  if (!bankNameClean || !accNameClean || !accNumClean) {
    throw new Error("Bank Name, Account Name, and Account Number are required.");
  }

  const duplicate = (params.existingAccounts || []).find(
    (a) =>
      a.accountType === "Bank" &&
      a.status !== "Closed" &&
      safeString(a.accountNumber).replace(/\s+/g, "").toLowerCase() ===
        accNumClean.replace(/\s+/g, "").toLowerCase() &&
      safeString(a.bankName).toLowerCase() === bankNameClean.toLowerCase()
  );
  if (duplicate) {
    throw new Error(`Bank account number ${accNumClean} at ${bankNameClean} already exists (${duplicate.accountName}).`);
  }

  const nowIso = new Date().toISOString();
  const opening = Math.max(0, Number(params.openingBalance) || 0);
  const newAccount: FinancialAccount = {
    id: generateBankRef("BNK"),
    accountCode: `BANK-${String((params.existingAccounts || []).length + 101)}`,
    accountName: accNameClean,
    accountType: "Bank",
    bankAccountSubtype: params.bankAccountSubtype || "Checking",
    bankName: bankNameClean,
    accountNumber: accNumClean,
    branch: safeString(params.branch, "Main Branch"),
    swiftOrIban: safeString(params.swiftOrIban),
    currency: safeString(params.currency, "ETB"),
    openingBalance: opening,
    currentBalance: opening,
    minimumThreshold: Math.max(0, Number(params.minimumThreshold) || 0),
    project: safeString(params.project, "Corporate Treasury"),
    department: safeString(params.department, "Treasury & Banking"),
    status: params.status || "Active",
    createdBy: params.actorName,
    updatedBy: params.actorName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveFinancialAccount(newAccount);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Account Registered",
    category: "Finance",
    severity: "INFO",
    details: `Registered ${newAccount.bankName} — ${newAccount.accountName} (${newAccount.accountNumber}, ${newAccount.bankAccountSubtype}) with opening balance ${newAccount.currency} ${opening.toLocaleString()}.`,
  });
  return newAccount;
}

export async function updateBankAccountStatus(params: {
  account: FinancialAccount;
  nextStatus: "Active" | "Inactive" | "Frozen" | "Closed";
  reason?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<FinancialAccount> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageAccounts && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Unauthorized to update bank account status.");
  }
  const nowIso = new Date().toISOString();
  const updated: FinancialAccount = {
    ...params.account,
    status: params.nextStatus,
    updatedBy: params.actorName,
    updatedAt: nowIso,
  };
  await DbService.saveFinancialAccount(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Account Status Updated",
    category: "Finance",
    severity: params.nextStatus === "Frozen" || params.nextStatus === "Closed" ? "WARNING" : "INFO",
    details: `${updated.accountName} (${updated.accountNumber || updated.accountCode}) set to ${params.nextStatus}. ${params.reason || ""}`,
  });
  return updated;
}

// ============================================================================
// BANK TRANSACTIONS (DUPLICATE GUARD + APPROVAL-GATED BALANCE UPDATES)
// ============================================================================

export function detectDuplicateBankTransaction(
  candidate: {
    accountId: string;
    transactionDate: string;
    direction: "Credit" | "Debit";
    amount: number;
    referenceNo?: string;
    description?: string;
    importedStatementId?: string;
    importedStatementLineId?: string;
  },
  existingBankTxs: BankTransactionRecord[],
  existingCashTxs: CashTransactionRecord[] = []
): { isDuplicate: boolean; reason?: string; existingRef?: string } {
  const normRef = safeString(candidate.referenceNo).trim().toLowerCase();
  const normDesc = normalizeTokenText(candidate.description);
  const amt = Math.round((Number(candidate.amount) || 0) * 100) / 100;

  for (const bt of existingBankTxs || []) {
    if (bt.approvalStatus === "Rejected" || bt.approvalStatus === "Reversed") continue;
    if (
      candidate.importedStatementId &&
      candidate.importedStatementLineId &&
      bt.importedStatementId === candidate.importedStatementId &&
      bt.importedStatementLineId === candidate.importedStatementLineId
    ) {
      return {
        isDuplicate: true,
        reason: `Statement line already imported as ${bt.transactionNo}.`,
        existingRef: bt.transactionNo,
      };
    }
    if (
      normRef &&
      normRef.length >= 4 &&
      !normRef.startsWith("auto") &&
      bt.accountId === candidate.accountId &&
      safeString(bt.referenceNo).trim().toLowerCase() === normRef &&
      Math.abs((Number(bt.amount) || 0) - amt) < 0.01 &&
      bt.transactionDate === candidate.transactionDate
    ) {
      return {
        isDuplicate: true,
        reason: `Duplicate reference ${bt.referenceNo} with same date and amount (${bt.transactionNo}).`,
        existingRef: bt.transactionNo,
      };
    }
    if (
      bt.accountId === candidate.accountId &&
      bt.transactionDate === candidate.transactionDate &&
      bt.direction === candidate.direction &&
      Math.abs((Number(bt.amount) || 0) - amt) < 0.01 &&
      normDesc &&
      normalizeTokenText(bt.description) === normDesc
    ) {
      return {
        isDuplicate: true,
        reason: `Exact duplicate transaction (${bt.transactionNo}) on ${bt.transactionDate} for ${amt.toLocaleString()}.`,
        existingRef: bt.transactionNo,
      };
    }
  }

  for (const ct of existingCashTxs || []) {
    if (isReversedOrRejectedStatus(ct.status)) continue;
    if (
      normRef &&
      normRef.length >= 4 &&
      ct.accountId === candidate.accountId &&
      safeString(ct.bankReferenceNumber || ct.referenceNo).trim().toLowerCase() === normRef &&
      Math.abs((Number(ct.amount) || 0) - amt) < 0.01 &&
      ct.date === candidate.transactionDate
    ) {
      return {
        isDuplicate: true,
        reason: `Already recorded in Cash Module (${ct.referenceNo}).`,
        existingRef: ct.referenceNo,
      };
    }
  }

  return { isDuplicate: false };
}

export async function createBankTransaction(params: {
  account: FinancialAccount;
  toAccount?: FinancialAccount;
  transactionType: BankTransactionType;
  direction?: "Credit" | "Debit";
  transactionDate: string;
  amount: number;
  referenceNo: string;
  chequeNumber?: string;
  project: string;
  department?: string;
  counterparty: string;
  description: string;
  paymentMethod?: string;
  linkedDocumentType?: "Invoice" | "Expense" | "Payroll" | "CashTransaction" | "Direct";
  linkedDocumentId?: string;
  linkedReferenceNo?: string;
  sourceChannel?: "Manual" | "Statement Import" | "Cash Module" | "AR" | "AP" | "Payroll";
  importedStatementId?: string;
  importedStatementLineId?: string;
  existingBankTxs: BankTransactionRecord[];
  existingCashTxs?: CashTransactionRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BankTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Unauthorized to record bank transactions.");
  }
  if (params.account.status === "Frozen" || params.account.status === "Closed") {
    throw new Error(`Cannot post transactions on ${params.account.status} bank account ${params.account.accountName}.`);
  }

  const amount = Number(params.amount) || 0;
  if (amount <= 0) {
    throw new Error("Transaction amount must be greater than zero.");
  }
  if (params.transactionType === "Bank Transfers") {
    if (!params.toAccount || params.toAccount.id === params.account.id) {
      throw new Error("Bank Transfers require a different destination account.");
    }
  }

  const direction = getDefaultDirectionForBankTxType(params.transactionType, params.direction);
  const dup = detectDuplicateBankTransaction(
    {
      accountId: params.account.id,
      transactionDate: params.transactionDate,
      direction,
      amount,
      referenceNo: params.referenceNo,
      description: params.description,
      importedStatementId: params.importedStatementId,
      importedStatementLineId: params.importedStatementLineId,
    },
    params.existingBankTxs,
    params.existingCashTxs
  );
  if (dup.isDuplicate) {
    throw new Error(dup.reason || "Duplicate bank transaction prevented.");
  }

  const nowIso = new Date().toISOString();
  const txNo = generateBankRef("BTX");
  const initialStatus: BankTransactionApprovalStatus =
    params.sourceChannel === "Statement Import" ? "Pending Verification" : "Pending Approval";

  // IMPORTANT RULE: Created bank transactions NEVER update account balance immediately;
  // balances are updated ONLY after authorized approval.
  const record: BankTransactionRecord = {
    id: txNo,
    transactionNo: txNo,
    accountId: params.account.id,
    accountName: params.account.accountName,
    bankName: params.account.bankName,
    accountNumber: params.account.accountNumber,
    toAccountId: params.toAccount?.id,
    toAccountName: params.toAccount?.accountName,
    transactionType: params.transactionType,
    direction,
    transactionDate: params.transactionDate.slice(0, 10),
    amount,
    currency: params.account.currency || "ETB",
    referenceNo: safeString(params.referenceNo, txNo),
    chequeNumber: safeString(params.chequeNumber),
    project: safeString(params.project, "Corporate Treasury"),
    department: safeString(params.department, "Treasury & Banking"),
    counterparty: safeString(params.counterparty, params.account.bankName || "Counterparty"),
    description: safeString(params.description, params.transactionType),
    paymentMethod: safeString(params.paymentMethod, params.chequeNumber ? "Cheque" : "Bank Transfer"),
    linkedDocumentType: params.linkedDocumentType || "Direct",
    linkedDocumentId: params.linkedDocumentId,
    linkedReferenceNo: params.linkedReferenceNo,
    sourceChannel: params.sourceChannel || "Manual",
    importedStatementId: params.importedStatementId,
    importedStatementLineId: params.importedStatementLineId,
    approvalStatus: initialStatus,
    reconciliationStatus: "Unreconciled",
    recordedBy: params.actorName,
    auditHistory: [
      {
        timestamp: nowIso,
        action: "Submitted",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `${params.transactionType} (${direction}) ETB ${amount.toLocaleString()} queued as ${initialStatus}.`,
      },
    ],
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveBankTransaction(record);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Transaction Recorded",
    category: "Finance",
    severity: "INFO",
    details: `${record.transactionNo} (${record.transactionType}, ${record.direction}) on ${record.accountName} for ${record.currency} ${amount.toLocaleString()} [${initialStatus}].`,
  });

  return record;
}

export async function approveBankTransaction(params: {
  tx: BankTransactionRecord;
  accounts: FinancialAccount[];
  invoices?: FinancialInvoiceRecord[];
  expenses?: Expense[];
  payrollRecords?: PayrollRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<BankTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canApproveTransactions && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Only Finance Manager or Director can approve bank transactions and post balance updates.");
  }
  if (params.tx.approvalStatus === "Approved") {
    throw new Error(`Transaction ${params.tx.transactionNo} is already Approved.`);
  }
  if (params.tx.approvalStatus === "Rejected" || params.tx.approvalStatus === "Reversed") {
    throw new Error(`Cannot approve a ${params.tx.approvalStatus} transaction.`);
  }

  const account = (params.accounts || []).find((a) => a.id === params.tx.accountId);
  if (!account) {
    throw new Error(`Bank account ${params.tx.accountName} not found.`);
  }
  const toAccount =
    params.tx.transactionType === "Bank Transfers" && params.tx.toAccountId
      ? (params.accounts || []).find((a) => a.id === params.tx.toAccountId)
      : undefined;

  const accountDelta = params.tx.direction === "Credit" ? params.tx.amount : -params.tx.amount;
  const toAccountDelta = toAccount ? params.tx.amount : 0;

  const linkedInvoice =
    params.tx.linkedDocumentType === "Invoice" && params.tx.linkedDocumentId
      ? (params.invoices || []).find((i) => i.id === params.tx.linkedDocumentId)
      : undefined;
  const linkedExpense =
    params.tx.linkedDocumentType === "Expense" && params.tx.linkedDocumentId
      ? (params.expenses || []).find((e) => e.id === params.tx.linkedDocumentId)
      : undefined;
  const linkedPayroll =
    params.tx.linkedDocumentType === "Payroll" && params.tx.linkedDocumentId
      ? (params.payrollRecords || []).find((p) => p.id === params.tx.linkedDocumentId)
      : undefined;

  const nowIso = new Date().toISOString();
  const approvedTx: BankTransactionRecord = {
    ...params.tx,
    approvalStatus: "Approved",
    verifiedBy: params.tx.verifiedBy || params.actorName,
    verifiedAt: params.tx.verifiedAt || nowIso,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    auditHistory: [
      ...(params.tx.auditHistory || []),
      {
        timestamp: nowIso,
        action: "Approved",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.notes || `Approved and posted balance change (${accountDelta >= 0 ? "+" : ""}${accountDelta.toLocaleString()}).`,
      },
    ],
    updatedAt: nowIso,
  };

  await DbService.applyBankTransactionAtomic({
    tx: approvedTx,
    account,
    accountDelta,
    toAccount,
    toAccountDelta,
    linkedInvoice,
    invoicePaidDelta: linkedInvoice && params.tx.direction === "Credit" ? params.tx.amount : 0,
    linkedExpense,
    expensePaidDelta: linkedExpense && params.tx.direction === "Debit" ? params.tx.amount : 0,
    linkedPayroll,
    payrollNextStatus: linkedPayroll ? "Paid" : undefined,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Transaction Approved",
    category: "Finance",
    severity: "INFO",
    details: `${approvedTx.transactionNo} approved by ${params.actorName}. ${account.accountName} updated by ${accountDelta >= 0 ? "+" : ""}${accountDelta.toLocaleString()} ${approvedTx.currency}.`,
  });

  return approvedTx;
}

export async function rejectBankTransaction(params: {
  tx: BankTransactionRecord;
  reason: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BankTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canApproveTransactions && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Only Finance Manager or Director can reject bank transactions.");
  }
  if (params.tx.approvalStatus === "Approved") {
    throw new Error("Approved transactions cannot be rejected directly; use Reverse instead.");
  }
  const nowIso = new Date().toISOString();
  const updated: BankTransactionRecord = {
    ...params.tx,
    approvalStatus: "Rejected",
    rejectedBy: params.actorName,
    rejectedReason: safeString(params.reason, "Rejected during review"),
    auditHistory: [
      ...(params.tx.auditHistory || []),
      {
        timestamp: nowIso,
        action: "Rejected",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.reason,
      },
    ],
    updatedAt: nowIso,
  };
  await DbService.saveBankTransaction(updated);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Transaction Rejected",
    category: "Finance",
    severity: "WARNING",
    details: `${updated.transactionNo} rejected by ${params.actorName}: ${updated.rejectedReason}`,
  });
  return updated;
}

export async function reverseBankTransaction(params: {
  tx: BankTransactionRecord;
  reason: string;
  accounts: FinancialAccount[];
  invoices?: FinancialInvoiceRecord[];
  expenses?: Expense[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BankTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canReverseCashTransactions && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Only Finance Manager or Director can reverse approved bank transactions.");
  }
  if (params.tx.approvalStatus !== "Approved") {
    throw new Error("Only Approved bank transactions can be reversed.");
  }
  const account = (params.accounts || []).find((a) => a.id === params.tx.accountId);
  if (!account) {
    throw new Error("Associated bank account not found.");
  }
  const toAccount =
    params.tx.transactionType === "Bank Transfers" && params.tx.toAccountId
      ? (params.accounts || []).find((a) => a.id === params.tx.toAccountId)
      : undefined;

  // Negate previous balance effect
  const accountDelta = params.tx.direction === "Credit" ? -params.tx.amount : params.tx.amount;
  const toAccountDelta = toAccount ? -params.tx.amount : 0;
  const linkedInvoice =
    params.tx.linkedDocumentType === "Invoice" && params.tx.linkedDocumentId
      ? (params.invoices || []).find((i) => i.id === params.tx.linkedDocumentId)
      : undefined;
  const linkedExpense =
    params.tx.linkedDocumentType === "Expense" && params.tx.linkedDocumentId
      ? (params.expenses || []).find((e) => e.id === params.tx.linkedDocumentId)
      : undefined;

  const nowIso = new Date().toISOString();
  const reversed: BankTransactionRecord = {
    ...params.tx,
    approvalStatus: "Reversed",
    reversedBy: params.actorName,
    reversedAt: nowIso,
    reversalReason: safeString(params.reason, "Transaction reversal"),
    auditHistory: [
      ...(params.tx.auditHistory || []),
      {
        timestamp: nowIso,
        action: "Reversed",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: params.reason,
      },
    ],
    updatedAt: nowIso,
  };

  await DbService.applyBankTransactionAtomic({
    tx: reversed,
    account,
    accountDelta,
    toAccount,
    toAccountDelta,
    linkedInvoice,
    invoicePaidDelta: linkedInvoice && params.tx.direction === "Credit" ? -params.tx.amount : 0,
    linkedExpense,
    expensePaidDelta: linkedExpense && params.tx.direction === "Debit" ? -params.tx.amount : 0,
  });

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Bank Transaction Reversed",
    category: "Finance",
    severity: "WARNING",
    details: `${reversed.transactionNo} reversed by ${params.actorName} (${reversed.reversalReason}).`,
  });

  return reversed;
}

// ============================================================================
// BANK STATEMENT PARSER (EXCEL, CSV, PDF) & IMMUTABLE IMPORT
// ============================================================================

export interface ParsedStatementLineDraft extends ImmutableBankStatementLine {
  suggestedTxType: BankTransactionType;
  skipImport?: boolean;
  isDuplicateInSystem?: boolean;
  duplicateReason?: string;
}

export interface ParsedStatementPreview {
  fileName: string;
  fileFormat: "Excel" | "CSV" | "PDF";
  fileSizeBytes: number;
  fileChecksum: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  lines: ParsedStatementLineDraft[];
  parserWarnings: string[];
}

export function computeSimpleChecksum(textOrBytes: string | Uint8Array): string {
  let hash = 2166136261;
  if (typeof textOrBytes === "string") {
    for (let i = 0; i < textOrBytes.length; i++) {
      hash ^= textOrBytes.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  } else {
    for (let i = 0; i < textOrBytes.length; i++) {
      hash ^= textOrBytes[i];
      hash = Math.imul(hash, 16777619);
    }
  }
  return `SHA-${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function normalizeStatementDate(raw: any): string {
  if (!raw) return "";
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return toIsoDate(raw);
  }
  if (typeof raw === "number" && raw > 25000 && raw < 70000) {
    // Excel serial date
    const utcDays = Math.floor(raw - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return toIsoDate(d);
  }
  const str = String(raw).trim();
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const first = Number(dmyMatch[1]);
    const second = Number(dmyMatch[2]);
    // Assume DD/MM/YYYY unless second > 12
    const day = second > 12 ? first : first;
    const month = second > 12 ? first : second;
    const dVal = second > 12 ? second : day;
    return `${dmyMatch[3]}-${String(month).padStart(2, "0")}-${String(dVal).padStart(2, "0")}`;
  }
  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const dMonY = str.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})/);
  if (dMonY) {
    const mo = monthNames[dMonY[2].toLowerCase()];
    const yr = dMonY[3].length === 2 ? `20${dMonY[3]}` : dMonY[3];
    if (mo) return `${yr}-${mo}-${dMonY[1].padStart(2, "0")}`;
  }
  return "";
}

function parseStatementMoney(raw: any): number {
  if (typeof raw === "number") return isFinite(raw) ? raw : 0;
  const cleaned = String(raw ?? "")
    .replace(/ETB|USD|EUR|Birr|,/gi, "")
    .replace(/\(([^)]+)\)/, "-$1")
    .trim();
  const num = Number(cleaned);
  return isFinite(num) ? num : 0;
}

export function inferBankTransactionTypeFromNarrative(
  narrative: string,
  direction: "Credit" | "Debit"
): BankTransactionType {
  const lower = narrative.toLowerCase();
  if (isBankChargeText(lower)) return "Bank Charges";
  if (lower.includes("interest") && direction === "Credit") return "Interest Income";
  if (lower.includes("salary") || lower.includes("payroll") || lower.includes("wage")) {
    return "Salary Payments";
  }
  if (lower.includes("transfer") || lower.includes("trf") || lower.includes("rtgs") || lower.includes("sweep")) {
    return "Bank Transfers";
  }
  if (direction === "Credit") {
    if (lower.includes("client") || lower.includes("invoice") || lower.includes("ipc") || lower.includes("payment from")) {
      return "Client Payments";
    }
    return "Deposits";
  }
  if (lower.includes("supplier") || lower.includes("vendor") || lower.includes("cement") || lower.includes("rebar") || lower.includes("subcontract")) {
    return "Supplier Payments";
  }
  return "Withdrawals";
}

function splitCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "," || ch === ";") && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function buildPreviewFromTableRows(params: {
  rows: any[][];
  fileName: string;
  fileFormat: "Excel" | "CSV" | "PDF";
  fileSizeBytes: number;
  fileChecksum: string;
  warnings?: string[];
}): ParsedStatementPreview {
  const warnings = [...(params.warnings || [])];
  const nonEmptyRows = params.rows.filter(
    (r) => Array.isArray(r) && r.some((cell) => safeString(cell).trim() !== "")
  );

  let headerIdx = -1;
  let colMap = {
    date: 0,
    description: 1,
    reference: 2,
    cheque: -1,
    deposit: 3,
    withdrawal: 4,
    amount: -1,
    direction: -1,
    balance: 5,
  };

  for (let i = 0; i < Math.min(nonEmptyRows.length, 15); i++) {
    const rowLower = nonEmptyRows[i].map((c) => safeString(c).toLowerCase().trim());
    const hasDate = rowLower.some((c) => c.includes("date") || c.includes("txn date") || c.includes("value"));
    const hasMoney = rowLower.some(
      (c) =>
        c.includes("deposit") ||
        c.includes("credit") ||
        c.includes("withdrawal") ||
        c.includes("debit") ||
        c.includes("amount") ||
        c.includes("balance")
    );
    if (hasDate && hasMoney) {
      headerIdx = i;
      const findIdx = (preds: ((s: string) => boolean)[]) => {
        for (const fn of preds) {
          const idx = rowLower.findIndex((c) => fn(c));
          if (idx >= 0) return idx;
        }
        return -1;
      };
      const dateCol = findIdx([
        (s) => s === "date" || s.includes("transaction date") || s.includes("posting date") || s.includes("stmt date"),
        (s) => s.includes("date"),
      ]);
      const descCol = findIdx([
        (s) => s.includes("description") || s.includes("narrative") || s.includes("particular") || s.includes("details") || s.includes("memo"),
      ]);
      const refCol = findIdx([
        (s) => s === "reference" || s === "ref" || s.includes("reference no") || s.includes("voucher") || s.includes("tran id") || s.includes("doc no"),
        (s) => s.includes("ref"),
      ]);
      const chqCol = findIdx([(s) => s.includes("cheque") || s.includes("check") || s.includes("chq")]);
      const depCol = findIdx([
        (s) => s === "deposit" || s === "deposits" || s === "credit" || s === "cr" || s.includes("deposit") || s.includes("credit amt") || s.includes("inflow"),
      ]);
      const wdrCol = findIdx([
        (s) => s === "withdrawal" || s === "withdrawals" || s === "debit" || s === "dr" || s.includes("withdraw") || s.includes("debit amt") || s.includes("outflow"),
      ]);
      const amtCol = findIdx([(s) => s === "amount" || s.includes("transaction amount")]);
      const dirCol = findIdx([(s) => s.includes("direction") || s === "type" || s === "dr/cr"]);
      const balCol = findIdx([(s) => s === "balance" || s.includes("running balance") || s.includes("closing balance"), (s) => s.includes("balance")]);

      colMap = {
        date: dateCol >= 0 ? dateCol : 0,
        description: descCol >= 0 ? descCol : 1,
        reference: refCol >= 0 ? refCol : 2,
        cheque: chqCol,
        deposit: depCol,
        withdrawal: wdrCol,
        amount: amtCol,
        direction: dirCol,
        balance: balCol,
      };
      break;
    }
  }

  const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
  if (headerIdx < 0) {
    warnings.push("Header row auto-inferred as positional columns (Date, Description, Reference, Deposit, Withdrawal, Balance). Please verify before importing.");
  }

  const lines: ParsedStatementLineDraft[] = [];
  for (let i = startIdx; i < nonEmptyRows.length; i++) {
    const r = nonEmptyRows[i];
    const dateIso = normalizeStatementDate(r[colMap.date]);
    if (!dateIso) continue;

    const description = safeString(r[colMap.description], "Bank Statement Entry").trim();
    if (/^(opening balance|closing balance|total|balance brought forward)/i.test(description)) {
      continue;
    }
    const referenceNo = safeString(r[colMap.reference], `STMT-${i + 1}`).trim();
    const chequeNumber = colMap.cheque >= 0 ? safeString(r[colMap.cheque]).trim() : "";

    let depositAmount = colMap.deposit >= 0 ? Math.max(0, parseStatementMoney(r[colMap.deposit])) : 0;
    let withdrawalAmount = colMap.withdrawal >= 0 ? Math.max(0, parseStatementMoney(r[colMap.withdrawal])) : 0;

    if (depositAmount === 0 && withdrawalAmount === 0 && colMap.amount >= 0) {
      const amtVal = parseStatementMoney(r[colMap.amount]);
      const dirRaw = colMap.direction >= 0 ? safeString(r[colMap.direction]).toLowerCase() : "";
      if (dirRaw.includes("cr") || dirRaw.includes("dep") || dirRaw.includes("in") || (dirRaw === "" && amtVal > 0)) {
        depositAmount = Math.abs(amtVal);
      } else {
        withdrawalAmount = Math.abs(amtVal);
      }
    }

    const amount = depositAmount > 0 ? depositAmount : withdrawalAmount;
    if (amount <= 0) continue;

    const direction: "Credit" | "Debit" = depositAmount > 0 ? "Credit" : "Debit";
    const runningBalance = colMap.balance >= 0 && r[colMap.balance] !== undefined && safeString(r[colMap.balance]).trim() !== ""
      ? parseStatementMoney(r[colMap.balance])
      : undefined;

    lines.push({
      id: generateBankRef("BSL") + `-${lines.length + 1}`,
      lineNumber: lines.length + 1,
      transactionDate: dateIso,
      description,
      referenceNo,
      chequeNumber: chequeNumber || undefined,
      depositAmount,
      withdrawalAmount,
      runningBalance,
      direction,
      amount,
      wasManuallyCorrected: false,
      originalRawText: r.map((c) => safeString(c)).join(" | "),
      suggestedTxType: inferBankTransactionTypeFromNarrative(description, direction),
    });
  }

  const sortedDates = lines.map((l) => l.transactionDate).filter(Boolean).sort();
  const totalDeposits = lines.reduce((s, l) => s + l.depositAmount, 0);
  const totalWithdrawals = lines.reduce((s, l) => s + l.withdrawalAmount, 0);
  const lastBalance = lines.length > 0 && lines[lines.length - 1].runningBalance !== undefined
    ? lines[lines.length - 1].runningBalance!
    : totalDeposits - totalWithdrawals;
  const firstLine = lines[0];
  const openingBalance =
    firstLine && firstLine.runningBalance !== undefined
      ? firstLine.runningBalance - firstLine.depositAmount + firstLine.withdrawalAmount
      : 0;

  return {
    fileName: params.fileName,
    fileFormat: params.fileFormat,
    fileSizeBytes: params.fileSizeBytes,
    fileChecksum: params.fileChecksum,
    periodStart: sortedDates[0] || toIsoDate(new Date()),
    periodEnd: sortedDates[sortedDates.length - 1] || toIsoDate(new Date()),
    openingBalance,
    closingBalance: lastBalance,
    totalDeposits,
    totalWithdrawals,
    lines,
    parserWarnings: warnings,
  };
}

export function parseCsvBankStatement(
  csvText: string,
  fileName: string = "statement.csv"
): ParsedStatementPreview {
  const rawLines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const rows = rawLines.map(splitCsvRow);
  return buildPreviewFromTableRows({
    rows,
    fileName,
    fileFormat: "CSV",
    fileSizeBytes: csvText.length,
    fileChecksum: computeSimpleChecksum(csvText),
  });
}

export function parseExcelBankStatement(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string = "statement.xlsx"
): ParsedStatementPreview {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Uploaded Excel workbook has no worksheets.");
  }
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: "" });
  return buildPreviewFromTableRows({
    rows,
    fileName,
    fileFormat: "Excel",
    fileSizeBytes: bytes.byteLength,
    fileChecksum: computeSimpleChecksum(bytes),
  });
}

function extractTextLinesFromRawPdfFallback(bytes: Uint8Array): string[] {
  const latin = new TextDecoder("latin1").decode(bytes);
  const lines: string[] = [];
  // Extract PDF literal text operators (...) Tj / TJ
  const regex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*T[jJ]/g;
  let m: RegExpExecArray | null;
  let currentLine = "";
  while ((m = regex.exec(latin)) !== null) {
    const chunk = m[1]
      .replace(/\\n/g, "\n")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\");
    if (chunk.includes("\n")) {
      const parts = chunk.split("\n");
      parts.forEach((p, idx) => {
        if (idx === 0) {
          currentLine += p;
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = "";
        } else if (idx === parts.length - 1) {
          currentLine = p;
        } else if (p.trim()) {
          lines.push(p.trim());
        }
      });
    } else {
      currentLine += (currentLine ? " " : "") + chunk;
      // Check if next TJ/Td breaks line roughly
      if (/^(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/.test(chunk.trim()) && currentLine !== chunk) {
        lines.push(currentLine.slice(0, currentLine.length - chunk.length).trim());
        currentLine = chunk;
      }
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  // Also scan plain embedded text lines that begin with dates
  if (lines.length === 0) {
    latin
      .replace(/\r/g, "\n")
      .split("\n")
      .forEach((raw) => {
        const clean = raw.replace(/[()]/g, "").trim();
        if (/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/.test(clean)) {
          lines.push(clean);
        }
      });
  }
  return lines;
}

export function parsePdfTextLinesIntoRows(textLines: string[]): any[][] {
  const rows: any[][] = [
    ["Date", "Description", "Reference", "Deposit", "Withdrawal", "Balance"],
  ];

  for (const rawLine of textLines) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    const dateMatch = line.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4})\s+(.+)$/);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const rest = dateMatch[2];
    // Extract trailing numeric columns (amounts / balance)
    const moneyTokens = Array.from(rest.matchAll(/(?:^|\s)(-?\(?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\)?|-?\d+\.\d{2})(?=\s|$)/g));
    if (moneyTokens.length === 0) continue;

    const firstMoneyIdx = moneyTokens[0].index ?? rest.length;
    const textPart = rest.slice(0, firstMoneyIdx).trim();
    const refMatch = textPart.match(/\b([A-Z]{2,5}[-/]?\d{3,}|CHQ[-/]?\d+|REF[-/]?\d+)\b/i);
    const refNo = refMatch ? refMatch[1] : `PDF-${rows.length}`;
    const desc = textPart.replace(refNo, "").trim() || textPart || "PDF Bank Entry";

    const nums = moneyTokens.map((t) => parseStatementMoney(t[1]));
    let deposit = 0;
    let withdrawal = 0;
    let balance: number | string = "";

    const lower = line.toLowerCase();
    if (nums.length >= 3) {
      deposit = Math.max(0, nums[nums.length - 3]);
      withdrawal = Math.max(0, nums[nums.length - 2]);
      balance = nums[nums.length - 1];
    } else if (nums.length === 2) {
      const txAmt = nums[0];
      balance = nums[1];
      if (lower.includes(" cr") || lower.includes("deposit") || lower.includes("credit") || lower.includes("client") || lower.includes("interest")) {
        deposit = Math.abs(txAmt);
      } else if (lower.includes(" dr") || lower.includes("withdraw") || lower.includes("debit") || lower.includes("charge") || lower.includes("fee") || lower.includes("cheque") || lower.includes("payment")) {
        withdrawal = Math.abs(txAmt);
      } else if (txAmt >= 0) {
        deposit = txAmt;
      } else {
        withdrawal = Math.abs(txAmt);
      }
    } else {
      const txAmt = nums[0];
      if (txAmt >= 0 && !lower.includes("dr") && !lower.includes("debit") && !lower.includes("charge") && !lower.includes("withdraw")) {
        deposit = txAmt;
      } else {
        withdrawal = Math.abs(txAmt);
      }
    }

    rows.push([dateStr, desc, refNo, deposit || "", withdrawal || "", balance]);
  }

  return rows;
}

export async function parsePdfBankStatement(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string = "statement.pdf"
): Promise<ParsedStatementPreview> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const warnings: string[] = [];
  let extractedLines: string[] = [];

  try {
    const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }
    const loadingTask = pdfjsLib.getDocument({
      data: bytes,
      disableWorker: true,
      useSystemFonts: true,
      verbosity: 0,
    });
    const pdfDoc = await loadingTask.promise;
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      const page = await pdfDoc.getPage(p);
      const content = await page.getTextContent();
      const rowBuckets = new Map<number, { x: number; text: string }[]>();
      (content.items || []).forEach((item: any) => {
        const str = safeString(item?.str).trim();
        if (!str) return;
        const y = Math.round((item?.transform?.[5] ?? 0) / 3) * 3;
        const x = item?.transform?.[4] ?? 0;
        const arr = rowBuckets.get(y) || [];
        arr.push({ x, text: str });
        rowBuckets.set(y, arr);
      });
      const sortedYs = Array.from(rowBuckets.keys()).sort((a, b) => b - a);
      sortedYs.forEach((y) => {
        const parts = (rowBuckets.get(y) || []).sort((a, b) => a.x - b.x).map((p) => p.text);
        extractedLines.push(parts.join(" "));
      });
    }
  } catch {
    warnings.push("PDF layout engine fell back to stream text extraction; verify parsed amounts carefully.");
  }

  if (extractedLines.length === 0) {
    extractedLines = extractTextLinesFromRawPdfFallback(bytes);
  }

  const rows = parsePdfTextLinesIntoRows(extractedLines);
  if (rows.length <= 1) {
    warnings.push("No structured transaction rows detected in PDF. Use manual line entry or CSV/Excel if scanned image.");
  }

  return buildPreviewFromTableRows({
    rows,
    fileName,
    fileFormat: "PDF",
    fileSizeBytes: bytes.byteLength,
    fileChecksum: computeSimpleChecksum(bytes),
    warnings,
  });
}

export async function parseBankStatementFile(
  file: File,
  existingBankTxs: BankTransactionRecord[] = [],
  existingCashTxs: CashTransactionRecord[] = [],
  accountId?: string
): Promise<ParsedStatementPreview> {
  const lowerName = file.name.toLowerCase();
  let preview: ParsedStatementPreview;

  if (lowerName.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    preview = parseCsvBankStatement(text, file.name);
  } else if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    preview = parseExcelBankStatement(buf, file.name);
  } else if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    const buf = await file.arrayBuffer();
    preview = await parsePdfBankStatement(buf, file.name);
  } else {
    throw new Error("Unsupported file format. Please upload Excel (.xlsx/.xls), CSV (.csv), or PDF (.pdf).");
  }

  if (accountId) {
    preview.lines = preview.lines.map((line) => {
      const dup = detectDuplicateBankTransaction(
        {
          accountId,
          transactionDate: line.transactionDate,
          direction: line.direction,
          amount: line.amount,
          referenceNo: line.referenceNo,
          description: line.description,
        },
        existingBankTxs,
        existingCashTxs
      );
      return {
        ...line,
        isDuplicateInSystem: dup.isDuplicate,
        duplicateReason: dup.reason,
        skipImport: dup.isDuplicate,
      };
    });
  }

  return preview;
}

export async function saveImmutableBankStatementAndImport(params: {
  account: FinancialAccount;
  preview: ParsedStatementPreview;
  verifiedLines: ParsedStatementLineDraft[];
  openingBalance: number;
  closingBalance: number;
  project?: string;
  notes?: string;
  existingStatements: ImmutableBankStatementRecord[];
  existingBankTxs: BankTransactionRecord[];
  existingCashTxs?: CashTransactionRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<{
  statement: ImmutableBankStatementRecord;
  importedTransactions: BankTransactionRecord[];
  skippedDuplicates: number;
}> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTransactions && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Unauthorized to import bank statements.");
  }
  if (params.verifiedLines.length === 0) {
    throw new Error("Cannot save an empty bank statement.");
  }

  // Prevent exact duplicate statement file checksum for the same account & period
  const dupStmt = (params.existingStatements || []).find(
    (s) =>
      s.accountId === params.account.id &&
      s.fileChecksum === params.preview.fileChecksum &&
      s.periodStart === params.preview.periodStart &&
      s.periodEnd === params.preview.periodEnd
  );
  if (dupStmt) {
    throw new Error(`Statement ${dupStmt.statementNo} (${dupStmt.fileName}) was already uploaded and archived immutably.`);
  }

  const nowIso = new Date().toISOString();
  const statementId = generateBankRef("BST");
  const sortedDates = params.verifiedLines.map((l) => l.transactionDate).filter(Boolean).sort();
  const totalDeposits = params.verifiedLines.reduce((s, l) => s + (Number(l.depositAmount) || 0), 0);
  const totalWithdrawals = params.verifiedLines.reduce((s, l) => s + (Number(l.withdrawalAmount) || 0), 0);

  const immutableLines: ImmutableBankStatementLine[] = params.verifiedLines.map((l, idx) => ({
    id: l.id || `${statementId}-L${idx + 1}`,
    lineNumber: idx + 1,
    transactionDate: l.transactionDate,
    description: safeString(l.description, "Bank Entry"),
    referenceNo: safeString(l.referenceNo, `${statementId}-${idx + 1}`),
    chequeNumber: l.chequeNumber,
    depositAmount: Number(l.depositAmount) || 0,
    withdrawalAmount: Number(l.withdrawalAmount) || 0,
    runningBalance: l.runningBalance,
    direction: l.direction,
    amount: Number(l.amount) || 0,
    wasManuallyCorrected: !!l.wasManuallyCorrected,
    originalRawText: l.originalRawText,
  }));

  const statement: ImmutableBankStatementRecord = {
    id: statementId,
    statementNo: statementId,
    accountId: params.account.id,
    accountName: params.account.accountName,
    bankName: safeString(params.account.bankName, "Bank"),
    accountNumber: safeString(params.account.accountNumber, "-"),
    currency: params.account.currency || "ETB",
    fileName: params.preview.fileName,
    fileFormat: params.preview.fileFormat,
    fileSizeBytes: params.preview.fileSizeBytes,
    fileChecksum: params.preview.fileChecksum,
    periodStart: sortedDates[0] || params.preview.periodStart,
    periodEnd: sortedDates[sortedDates.length - 1] || params.preview.periodEnd,
    openingBalance: Number(params.openingBalance) || 0,
    closingBalance: Number(params.closingBalance) || 0,
    totalDeposits,
    totalWithdrawals,
    lineCount: immutableLines.length,
    isImmutable: true,
    originalLines: immutableLines,
    uploadedBy: params.actorName,
    uploadedById: params.actorUid,
    uploadedByRole: params.actorRole,
    uploadedAt: nowIso,
    notes: safeString(params.notes),
  };

  // Persist immutable statement (throws if ID already exists; never overwrites)
  await DbService.createImmutableBankStatement(statement);

  // Import non-skipped non-duplicate lines strictly as "Pending Verification" (NEVER auto-approved!)
  const importedTransactions: BankTransactionRecord[] = [];
  let skippedDuplicates = 0;
  const workingExisting = [...(params.existingBankTxs || [])];

  for (let i = 0; i < params.verifiedLines.length; i++) {
    const line = params.verifiedLines[i];
    if (line.skipImport) {
      skippedDuplicates++;
      continue;
    }
    const dupCheck = detectDuplicateBankTransaction(
      {
        accountId: params.account.id,
        transactionDate: line.transactionDate,
        direction: line.direction,
        amount: line.amount,
        referenceNo: line.referenceNo,
        description: line.description,
        importedStatementId: statement.id,
        importedStatementLineId: line.id,
      },
      workingExisting,
      params.existingCashTxs
    );
    if (dupCheck.isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    const txNo = `${generateBankRef("BTX")}-${i + 1}`;
    const importedTx: BankTransactionRecord = {
      id: txNo,
      transactionNo: txNo,
      accountId: params.account.id,
      accountName: params.account.accountName,
      bankName: params.account.bankName,
      accountNumber: params.account.accountNumber,
      transactionType: line.suggestedTxType || inferBankTransactionTypeFromNarrative(line.description, line.direction),
      direction: line.direction,
      transactionDate: line.transactionDate,
      amount: line.amount,
      currency: params.account.currency || "ETB",
      referenceNo: line.referenceNo,
      chequeNumber: line.chequeNumber,
      project: safeString(params.project, params.account.project || "Corporate Treasury"),
      department: params.account.department || "Treasury & Banking",
      counterparty: params.account.bankName || "Bank Statement Entry",
      description: line.description,
      paymentMethod: line.chequeNumber ? "Cheque" : "Bank Transfer",
      linkedDocumentType: "Direct",
      sourceChannel: "Statement Import",
      importedStatementId: statement.id,
      importedStatementLineId: immutableLines[i].id,
      approvalStatus: "Pending Verification", // NEVER auto-approve imported transactions
      reconciliationStatus: "Unreconciled",
      recordedBy: params.actorName,
      auditHistory: [
        {
          timestamp: nowIso,
          action: "Submitted",
          actorName: params.actorName,
          actorRole: params.actorRole,
          notes: `Imported from immutable statement ${statement.statementNo} (${statement.fileName}) as Pending Verification.`,
        },
      ],
      createdBy: params.actorName,
      createdById: params.actorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await DbService.saveBankTransaction(importedTx);
    importedTransactions.push(importedTx);
    workingExisting.push(importedTx);
  }

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Immutable Bank Statement Uploaded",
    category: "Finance",
    severity: "INFO",
    details: `${statement.statementNo} (${statement.fileFormat}: ${statement.fileName}) archived immutably for ${params.account.accountName}. Imported ${importedTransactions.length} pending transaction(s), skipped ${skippedDuplicates} duplicate(s).`,
  });

  return { statement, importedTransactions, skippedDuplicates };
}

// ============================================================================
// PART 6 ADVANCED BANK RECONCILIATION ENGINE (7 CLASSIFICATIONS + 6-STAGE WORKFLOW)
// ============================================================================

export interface Part6ReconciliationAnalysis {
  accountId: string;
  accountName: string;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  bookOpeningBalance: number;
  bookClosingBalance: number;
  matchedLines: BankStatementLineItem[];
  unmatchedStatementLines: BankStatementLineItem[];
  missingInErpLines: BankStatementLineItem[];
  duplicateStatementLines: BankStatementLineItem[];
  bankChargesNotRecordedLines: BankStatementLineItem[];
  unmatchedErpEntries: UnifiedBankLedgerRow[];
  outstandingDepositsErp: UnifiedBankLedgerRow[];
  unpresentedChequesErp: UnifiedBankLedgerRow[];
  duplicateErpEntries: UnifiedBankLedgerRow[];
  reconciledInflowsTotal: number;
  reconciledOutflowsTotal: number;
  outstandingDepositsTotal: number;
  unpresentedChequesTotal: number;
  bankChargesNotRecordedTotal: number;
  adjustedStatementBalance: number;
  adjustedBookBalance: number;
  unreconciledBookCount: number;
  unreconciledBookNet: number;
  unmatchedStatementNet: number;
  discrepancyAmount: number;
  reconciledTxIds: string[];
}

export function autoMatchStatementLines(
  statementLines: BankStatementLineItem[],
  erpBankEntries: UnifiedBankLedgerRow[]
): BankStatementLineItem[] {
  const eligibleErp = erpBankEntries.filter((e) => !e.isRejectedOrReversed);
  const usedErpIds = new Set<string>();
  const seenLineSignatures = new Set<string>();

  // Preserve pre-existing manual matches first
  statementLines.forEach((line) => {
    const eid = line.matchedBankTxId || line.matchedCashTxId;
    if (line.matchStatus === "Matched" && eid) {
      usedErpIds.add(eid);
    }
  });

  return statementLines.map((line) => {
    const sig = `${line.statementDate}|${line.direction}|${(Number(line.amount) || 0).toFixed(2)}|${normalizeTokenText(line.bankReferenceNo)}`;
    const isDuplicateLine = seenLineSignatures.has(sig);
    seenLineSignatures.add(sig);

    const existingMatchId = line.matchedBankTxId || line.matchedCashTxId;
    if (line.matchStatus === "Matched" && existingMatchId) {
      return line;
    }
    if (isDuplicateLine) {
      return {
        ...line,
        matchStatus: "Duplicate",
        classificationNote: "Duplicate statement line detected (matching date, direction, amount & reference).",
      };
    }

    const refClean = safeString(line.bankReferenceNo).trim().toLowerCase();
    const chqClean = safeString(line.chequeNumber).trim().toLowerCase();

    // Pass 1: Exact Reference or Cheque Number + exact amount + direction
    let match = eligibleErp.find((e) => {
      if (usedErpIds.has(e.id)) return false;
      if (e.direction !== line.direction) return false;
      if (Math.abs(e.amount - line.amount) > 0.01) return false;
      const eRef = safeString(e.referenceNo).trim().toLowerCase();
      const eChq = safeString(e.chequeNumber).trim().toLowerCase();
      return (
        (refClean.length >= 3 && eRef === refClean) ||
        (chqClean.length >= 3 && eChq === chqClean)
      );
    });

    // Pass 2: Same direction + exact amount + date within ±3 days + reasonable text match or unique match
    if (!match) {
      const candidates = eligibleErp.filter(
        (e) =>
          !usedErpIds.has(e.id) &&
          e.direction === line.direction &&
          Math.abs(e.amount - line.amount) <= 0.01 &&
          diffDaysAbs(e.transactionDate, line.statementDate) <= 3
      );
      if (candidates.length === 1) {
        match = candidates[0];
      } else if (candidates.length > 1) {
        candidates.sort(
          (a, b) =>
            tokenOverlapScore(b.description + " " + b.counterparty, line.description) -
            tokenOverlapScore(a.description + " " + a.counterparty, line.description)
        );
        match = candidates[0];
      }
    }

    if (match) {
      usedErpIds.add(match.id);
      return {
        ...line,
        matchedBankTxId: match.sourceCollection === "bankTransactions" ? match.id : undefined,
        matchedBankTxRef: match.transactionNo,
        matchedCashTxId: match.sourceCollection === "cashTransactions" ? match.id : match.id,
        matchedCashTxRef: match.transactionNo,
        matchType: "Auto",
        matchStatus: "Matched",
        classificationNote: `Auto-matched to ${match.transactionNo} (${match.approvalStatus}).`,
      };
    }

    // Unmatched classification hints
    if (line.direction === "Debit" && isBankChargeText(line.description)) {
      return {
        ...line,
        matchStatus: "Bank Charge Not Recorded",
        classificationNote: "Bank fee/charge present on statement but missing from ERP ledger.",
      };
    }

    return {
      ...line,
      matchStatus: "Missing in ERP",
      classificationNote: "Present on bank statement; no matching ERP ledger transaction found.",
    };
  });
}

export function manualMatchStatementLine(
  statementLines: BankStatementLineItem[],
  statementLineId: string,
  erpEntry: UnifiedBankLedgerRow
): BankStatementLineItem[] {
  return statementLines.map((line) => {
    if (line.id !== statementLineId) return line;
    return {
      ...line,
      matchedBankTxId: erpEntry.sourceCollection === "bankTransactions" ? erpEntry.id : undefined,
      matchedBankTxRef: erpEntry.transactionNo,
      matchedCashTxId: erpEntry.id,
      matchedCashTxRef: erpEntry.transactionNo,
      matchType: "Manual",
      matchStatus: "Matched",
      classificationNote: `Manually matched to ${erpEntry.transactionNo} (${erpEntry.counterparty}).`,
    };
  });
}

export function unmatchStatementLine(
  statementLines: BankStatementLineItem[],
  statementLineId: string
): BankStatementLineItem[] {
  return statementLines.map((line) => {
    if (line.id !== statementLineId) return line;
    const isCharge = line.direction === "Debit" && isBankChargeText(line.description);
    return {
      ...line,
      matchedBankTxId: undefined,
      matchedBankTxRef: undefined,
      matchedCashTxId: undefined,
      matchedCashTxRef: undefined,
      matchType: undefined,
      matchStatus: isCharge ? "Bank Charge Not Recorded" : "Unmatched",
      classificationNote: isCharge
        ? "Bank fee/charge present on statement but unrecorded in ERP."
        : "Unmatched manually.",
    };
  });
}

export function computePart6ReconciliationAnalysis(params: {
  account: FinancialAccount;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  statementLines: BankStatementLineItem[];
  ledgerRows: UnifiedBankLedgerRow[];
}): Part6ReconciliationAnalysis {
  const accountRows = (params.ledgerRows || []).filter(
    (r) =>
      (r.accountId === params.account.id || r.toAccountId === params.account.id) &&
      !r.isRejectedOrReversed &&
      r.isApproved
  );

  // Opening Book Balance before periodStart
  let bookOpeningBalance = parseMoney(params.account.openingBalance) ?? 0;
  accountRows.forEach((r) => {
    if (r.transactionDate < params.periodStart) {
      const signed = r.toAccountId === params.account.id && r.accountId !== params.account.id
        ? r.amount
        : r.direction === "Credit"
        ? r.amount
        : -r.amount;
      bookOpeningBalance += signed;
    }
  });

  const periodRows = accountRows
    .filter((r) => r.transactionDate >= params.periodStart && r.transactionDate <= params.periodEnd)
    .map((r) => {
      if (r.toAccountId === params.account.id && r.accountId !== params.account.id) {
        return { ...r, direction: "Credit" as const };
      }
      return r;
    });

  const bookNetInPeriod = periodRows.reduce(
    (s, r) => s + (r.direction === "Credit" ? r.amount : -r.amount),
    0
  );
  const bookClosingBalance = bookOpeningBalance + bookNetInPeriod;

  // Duplicate detection in ERP entries
  const erpSigSeen = new Map<string, UnifiedBankLedgerRow>();
  const duplicateErpEntries: UnifiedBankLedgerRow[] = [];
  periodRows.forEach((r) => {
    const sig = `${r.transactionDate}|${r.direction}|${r.amount.toFixed(2)}|${normalizeTokenText(r.referenceNo)}`;
    if (erpSigSeen.has(sig)) {
      duplicateErpEntries.push(r);
    } else {
      erpSigSeen.set(sig, r);
    }
  });

  // Classify statement lines
  const matchedLines: BankStatementLineItem[] = [];
  const unmatchedStatementLines: BankStatementLineItem[] = [];
  const missingInErpLines: BankStatementLineItem[] = [];
  const duplicateStatementLines: BankStatementLineItem[] = [];
  const bankChargesNotRecordedLines: BankStatementLineItem[] = [];

  const matchedErpIds = new Set<string>();

  (params.statementLines || []).forEach((line) => {
    if (line.matchStatus === "Matched") {
      matchedLines.push(line);
      if (line.matchedBankTxId) matchedErpIds.add(line.matchedBankTxId);
      if (line.matchedCashTxId) matchedErpIds.add(line.matchedCashTxId);
      return;
    }
    unmatchedStatementLines.push(line);
    if (line.matchStatus === "Duplicate") {
      duplicateStatementLines.push(line);
    } else if (line.matchStatus === "Bank Charge Not Recorded" || (line.direction === "Debit" && isBankChargeText(line.description))) {
      bankChargesNotRecordedLines.push(line);
      missingInErpLines.push(line);
    } else {
      missingInErpLines.push(line);
    }
  });

  // Classify unmatched ERP entries into Outstanding Deposits vs Unpresented Cheques
  const unmatchedErpEntries = periodRows.filter((r) => !matchedErpIds.has(r.id));
  const outstandingDepositsErp = unmatchedErpEntries.filter((r) => r.direction === "Credit");
  const unpresentedChequesErp = unmatchedErpEntries.filter(
    (r) =>
      r.direction === "Debit" &&
      (r.paymentMethod.toLowerCase().includes("cheque") ||
        r.paymentMethod.toLowerCase().includes("cpo") ||
        Boolean(r.chequeNumber) ||
        r.transactionType === "Supplier Payments" ||
        r.transactionType === "Withdrawals")
  );

  const reconciledInflowsTotal = matchedLines
    .filter((l) => l.direction === "Credit")
    .reduce((s, l) => s + l.amount, 0);
  const reconciledOutflowsTotal = matchedLines
    .filter((l) => l.direction === "Debit")
    .reduce((s, l) => s + l.amount, 0);

  const outstandingDepositsTotal = outstandingDepositsErp.reduce((s, r) => s + r.amount, 0);
  const unpresentedChequesTotal = unpresentedChequesErp.reduce((s, r) => s + r.amount, 0);
  const bankChargesNotRecordedTotal = bankChargesNotRecordedLines.reduce((s, l) => s + l.amount, 0);

  const unreconciledBookNet = unmatchedErpEntries.reduce(
    (s, r) => s + (r.direction === "Credit" ? r.amount : -r.amount),
    0
  );
  const unmatchedStatementNet = unmatchedStatementLines.reduce(
    (s, l) => s + (l.direction === "Credit" ? l.amount : -l.amount),
    0
  );

  // Classic Bank Reconciliation formula:
  // Adjusted Statement Balance = Statement Closing + Outstanding Deposits - Unpresented Cheques
  // Adjusted Book Balance = Book Closing - Bank Charges Not Recorded
  const adjustedStatementBalance =
    params.statementClosingBalance + outstandingDepositsTotal - unpresentedChequesTotal;
  const adjustedBookBalance = bookClosingBalance - bankChargesNotRecordedTotal;
  const discrepancyAmount = Number((params.statementClosingBalance - bookClosingBalance).toFixed(2));

  return {
    accountId: params.account.id,
    accountName: params.account.accountName,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    statementOpeningBalance: params.statementOpeningBalance,
    statementClosingBalance: params.statementClosingBalance,
    bookOpeningBalance,
    bookClosingBalance,
    matchedLines,
    unmatchedStatementLines,
    missingInErpLines,
    duplicateStatementLines,
    bankChargesNotRecordedLines,
    unmatchedErpEntries,
    outstandingDepositsErp,
    unpresentedChequesErp,
    duplicateErpEntries,
    reconciledInflowsTotal,
    reconciledOutflowsTotal,
    outstandingDepositsTotal,
    unpresentedChequesTotal,
    bankChargesNotRecordedTotal,
    adjustedStatementBalance,
    adjustedBookBalance,
    unreconciledBookCount: unmatchedErpEntries.length,
    unreconciledBookNet,
    unmatchedStatementNet,
    discrepancyAmount,
    reconciledTxIds: Array.from(matchedErpIds),
  };
}

export async function saveOrSubmitBankReconciliation(params: {
  existingRecord?: BankReconciliationRecord;
  account: FinancialAccount;
  statementId?: string;
  statementNo?: string;
  periodStart: string;
  periodEnd: string;
  statementOpeningBalance: number;
  statementClosingBalance: number;
  statementLines: BankStatementLineItem[];
  ledgerRows: UnifiedBankLedgerRow[];
  workflowStage: BankReconciliationWorkflowStage;
  approvalStatus: BankReconciliationStatus;
  notes?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BankReconciliationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (
    (params.approvalStatus === "Reconciled" || params.approvalStatus === "Disputed") &&
    !perms.canApproveTransactions &&
    !perms.isFinanceManager &&
    !perms.isDirector
  ) {
    throw new Error("Only Finance Manager or Director can approve or dispute Bank Reconciliations.");
  }
  if (!perms.canManageTransactions && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Unauthorized to create or update bank reconciliations.");
  }

  const analysis = computePart6ReconciliationAnalysis({
    account: params.account,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    statementOpeningBalance: params.statementOpeningBalance,
    statementClosingBalance: params.statementClosingBalance,
    statementLines: params.statementLines,
    ledgerRows: params.ledgerRows,
  });

  const nowIso = new Date().toISOString();
  const isFinalApproval = params.approvalStatus === "Reconciled";
  const isReview = params.approvalStatus === "Finance Review";

  const record: BankReconciliationRecord = {
    id: params.existingRecord?.id || generateBankRef("REC"),
    reconciliationNo: params.existingRecord?.reconciliationNo || generateBankRef("REC"),
    accountId: params.account.id,
    accountName: params.account.accountName,
    accountCode: params.account.accountCode,
    bankName: params.account.bankName,
    accountNumber: params.account.accountNumber,
    statementId: params.statementId || params.existingRecord?.statementId,
    statementNo: params.statementNo || params.existingRecord?.statementNo,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    statementOpeningBalance: params.statementOpeningBalance,
    statementClosingBalance: params.statementClosingBalance,
    bookOpeningBalance: analysis.bookOpeningBalance,
    bookClosingBalance: analysis.bookClosingBalance,
    reconciledInflowsTotal: analysis.reconciledInflowsTotal,
    reconciledOutflowsTotal: analysis.reconciledOutflowsTotal,
    unreconciledBookCount: analysis.unreconciledBookCount,
    unreconciledBookNet: analysis.unreconciledBookNet,
    unmatchedStatementNet: analysis.unmatchedStatementNet,
    discrepancyAmount: analysis.discrepancyAmount,
    outstandingDepositsTotal: analysis.outstandingDepositsTotal,
    unpresentedChequesTotal: analysis.unpresentedChequesTotal,
    bankChargesNotRecordedTotal: analysis.bankChargesNotRecordedTotal,
    duplicateCount: analysis.duplicateStatementLines.length + analysis.duplicateErpEntries.length,
    missingInErpCount: analysis.missingInErpLines.length,
    matchedCount: analysis.matchedLines.length,
    unmatchedCount: analysis.unmatchedStatementLines.length,
    reconciledTxIds: analysis.reconciledTxIds,
    statementLines: params.statementLines,
    workflowStage: params.workflowStage,
    approvalStatus: params.approvalStatus,
    preparedBy: params.existingRecord?.preparedBy || params.actorName,
    reviewedBy: isReview || isFinalApproval ? params.existingRecord?.reviewedBy || params.actorName : params.existingRecord?.reviewedBy,
    reviewedAt: isReview || isFinalApproval ? params.existingRecord?.reviewedAt || nowIso : params.existingRecord?.reviewedAt,
    approvedBy: isFinalApproval ? params.actorName : params.existingRecord?.approvedBy,
    approvedAt: isFinalApproval ? nowIso : params.existingRecord?.approvedAt,
    notes: safeString(params.notes, params.existingRecord?.notes),
    auditHistory: [
      ...(params.existingRecord?.auditHistory || []),
      {
        timestamp: nowIso,
        action: `Stage: ${params.workflowStage} (${params.approvalStatus})`,
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `Matched: ${analysis.matchedLines.length}, Unmatched: ${analysis.unmatchedStatementLines.length}, Variance: ETB ${analysis.discrepancyAmount.toLocaleString()}.`,
      },
    ],
    createdAt: params.existingRecord?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveBankReconciliation(record);

  // If Approved ("Reconciled"), stamp account's lastReconciledDate & balance
  if (isFinalApproval) {
    await DbService.saveFinancialAccount({
      ...params.account,
      lastReconciledDate: params.periodEnd,
      lastReconciledBalance: params.statementClosingBalance,
      updatedBy: params.actorName,
      updatedAt: nowIso,
    });
    // Mark matched BankTransactionRecords as Reconciled
    for (const row of params.ledgerRows) {
      if (row.sourceCollection === "bankTransactions" && row.rawBankTx && analysis.reconciledTxIds.includes(row.id)) {
        if (row.rawBankTx.reconciliationStatus !== "Reconciled") {
          await DbService.saveBankTransaction({
            ...row.rawBankTx,
            reconciliationStatus: "Reconciled",
            reconciliationId: record.reconciliationNo,
            updatedAt: nowIso,
          });
        }
      }
    }
  }

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Bank Reconciliation (${params.workflowStage})`,
    category: "Finance",
    severity: params.approvalStatus === "Disputed" ? "WARNING" : "INFO",
    details: `${record.reconciliationNo} (${record.accountName}) moved to ${params.workflowStage} [${params.approvalStatus}], discrepancy ETB ${record.discrepancyAmount.toLocaleString()}.`,
  });

  return record;
}

// ============================================================================
// PART 6: 7 EXPORTABLE BANK REPORTS + EXCEL (.XLSX) GENERATOR
// ============================================================================

export interface GeneratedPart6BankReportDataset {
  id: Part6BankReportTypeId;
  title: string;
  titleAm: string;
  subtitle: string;
  columns: { key: string; label: string; isNumeric?: boolean }[];
  rows: Record<string, any>[];
  summaryTotals: { label: string; value: number | string }[];
}

export function buildPart6BankReportDataset(
  reportType: Part6BankReportTypeId,
  state: Part6BankDashboardState,
  selectedReconciliation?: BankReconciliationRecord | null
): GeneratedPart6BankReportDataset {
  const cur = state.currency || "ETB";

  switch (reportType) {
    case "bank-account-report": {
      const rows = state.kpis.bankBalancesByAccount.map((a) => ({
        code: a.accountCode,
        bankName: a.bankName,
        accountName: a.accountName,
        accountNumber: a.accountNumber,
        subtype: a.subtype,
        currency: a.currency,
        openingBalance: a.openingBalance,
        currentBalance: a.currentBalance,
        minimumThreshold: a.minimumThreshold,
        lastReconciledDate: a.lastReconciledDate || "Never",
        status: a.status,
      }));
      return {
        id: reportType,
        title: "Bank Account Report",
        titleAm: "የባንክ ሂሳቦች ሪፖርት",
        subtitle: "Registered company bank accounts, subtypes, balances, thresholds, and reconciliation dates",
        columns: [
          { key: "code", label: "Code" },
          { key: "bankName", label: "Bank Name" },
          { key: "accountName", label: "Account Name" },
          { key: "accountNumber", label: "Account Number" },
          { key: "subtype", label: "Type" },
          { key: "currency", label: "Currency" },
          { key: "openingBalance", label: `Opening (${cur})`, isNumeric: true },
          { key: "currentBalance", label: `Current Balance (${cur})`, isNumeric: true },
          { key: "lastReconciledDate", label: "Last Reconciled" },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Bank Accounts", value: rows.length },
          { label: "Total Bank Balance", value: state.kpis.totalBankBalance },
        ],
      };
    }

    case "bank-transaction-report": {
      const rows = state.filteredLedgerRows.map((r) => ({
        date: r.transactionDate,
        txNo: r.transactionNo,
        bankName: r.bankName,
        accountName: r.accountName,
        type: r.transactionType,
        direction: r.direction,
        amount: r.amount,
        referenceNo: r.referenceNo,
        project: r.project,
        counterparty: r.counterparty,
        approvalStatus: r.approvalStatus,
        reconciliationStatus: r.reconciliationStatus,
      }));
      return {
        id: reportType,
        title: "Bank Transaction Report",
        titleAm: "የባንክ ግብይቶች ሪፖርት",
        subtitle: "All bank deposits, withdrawals, client/supplier/salary payments, transfers, charges & interest",
        columns: [
          { key: "date", label: "Date" },
          { key: "txNo", label: "Tx Ref" },
          { key: "accountName", label: "Account" },
          { key: "type", label: "Transaction Type" },
          { key: "direction", label: "Dr/Cr" },
          { key: "amount", label: `Amount (${cur})`, isNumeric: true },
          { key: "referenceNo", label: "Bank Ref" },
          { key: "counterparty", label: "Counterparty" },
          { key: "approvalStatus", label: "Approval" },
          { key: "reconciliationStatus", label: "Recon" },
        ],
        rows,
        summaryTotals: [
          { label: "Approved Deposits", value: state.kpis.totalDeposits },
          { label: "Approved Withdrawals", value: state.kpis.totalWithdrawals },
          { label: "Net Bank Flow", value: state.kpis.netBankFlow },
        ],
      };
    }

    case "monthly-bank-statement": {
      // Uses selected uploaded statement or monthly grouped approved ledger rows
      const latestStmt = state.statements[0];
      if (latestStmt && latestStmt.originalLines.length > 0) {
        const rows = latestStmt.originalLines.map((l) => ({
          lineNo: l.lineNumber,
          date: l.transactionDate,
          referenceNo: l.referenceNo,
          description: l.description,
          deposit: l.depositAmount,
          withdrawal: l.withdrawalAmount,
          runningBalance: l.runningBalance ?? 0,
        }));
        return {
          id: reportType,
          title: "Monthly Bank Statement",
          titleAm: "ወርሃዊ የባንክ መግለጫ",
          subtitle: `${latestStmt.bankName} — ${latestStmt.accountName} (${latestStmt.periodStart} to ${latestStmt.periodEnd})`,
          columns: [
            { key: "lineNo", label: "#", isNumeric: true },
            { key: "date", label: "Date" },
            { key: "referenceNo", label: "Reference" },
            { key: "description", label: "Description" },
            { key: "deposit", label: `Deposit (${cur})`, isNumeric: true },
            { key: "withdrawal", label: `Withdrawal (${cur})`, isNumeric: true },
            { key: "runningBalance", label: `Balance (${cur})`, isNumeric: true },
          ],
          rows,
          summaryTotals: [
            { label: "Opening Balance", value: latestStmt.openingBalance },
            { label: "Total Deposits", value: latestStmt.totalDeposits },
            { label: "Total Withdrawals", value: latestStmt.totalWithdrawals },
            { label: "Closing Balance", value: latestStmt.closingBalance },
          ],
        };
      }

      // Fallback from approved bank ledger
      const approvedChronological = state.filteredLedgerRows
        .filter((r) => r.isApproved)
        .slice()
        .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
      let running = state.kpis.bankBalancesByAccount[0]?.openingBalance || 0;
      const rows = approvedChronological.map((r, idx) => {
        const dep = r.direction === "Credit" ? r.amount : 0;
        const wdr = r.direction === "Debit" ? r.amount : 0;
        running += dep - wdr;
        return {
          lineNo: idx + 1,
          date: r.transactionDate,
          referenceNo: r.referenceNo,
          description: `${r.transactionType}: ${r.description}`,
          deposit: dep,
          withdrawal: wdr,
          runningBalance: running,
        };
      });
      return {
        id: reportType,
        title: "Monthly Bank Statement",
        titleAm: "ወርሃዊ የባንክ መግለጫ",
        subtitle: "Chronological bank ledger statement computed from approved ERP transactions",
        columns: [
          { key: "lineNo", label: "#", isNumeric: true },
          { key: "date", label: "Date" },
          { key: "referenceNo", label: "Reference" },
          { key: "description", label: "Description" },
          { key: "deposit", label: `Deposit (${cur})`, isNumeric: true },
          { key: "withdrawal", label: `Withdrawal (${cur})`, isNumeric: true },
          { key: "runningBalance", label: `Running Balance (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Deposits", value: state.kpis.totalDeposits },
          { label: "Total Withdrawals", value: state.kpis.totalWithdrawals },
          { label: "Closing Balance", value: running },
        ],
      };
    }

    case "bank-reconciliation-report": {
      const targetList = selectedReconciliation ? [selectedReconciliation] : state.reconciliations;
      const rows = targetList.map((r) => ({
        reconciliationNo: r.reconciliationNo,
        accountName: r.accountName,
        period: `${r.periodStart} → ${r.periodEnd}`,
        statementClosing: r.statementClosingBalance,
        bookClosing: r.bookClosingBalance,
        outstandingDeposits: r.outstandingDepositsTotal ?? 0,
        unpresentedCheques: r.unpresentedChequesTotal ?? 0,
        unrecordedCharges: r.bankChargesNotRecordedTotal ?? 0,
        discrepancy: r.discrepancyAmount,
        workflowStage: r.workflowStage || "Final Report",
        status: r.approvalStatus,
        approvedBy: r.approvedBy || "Pending",
      }));
      return {
        id: reportType,
        title: "Bank Reconciliation Report",
        titleAm: "የባንክ ማስታረቂያ ሪፖርት",
        subtitle: "Statement balance vs ERP book balance, outstanding deposits, unpresented cheques & approval status",
        columns: [
          { key: "reconciliationNo", label: "Recon No" },
          { key: "accountName", label: "Account" },
          { key: "period", label: "Period" },
          { key: "statementClosing", label: `Stmt Closing (${cur})`, isNumeric: true },
          { key: "bookClosing", label: `Book Closing (${cur})`, isNumeric: true },
          { key: "outstandingDeposits", label: `Outst. Deposits (${cur})`, isNumeric: true },
          { key: "unpresentedCheques", label: `Unpres. Cheques (${cur})`, isNumeric: true },
          { key: "discrepancy", label: `Discrepancy (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Reconciliations", value: rows.length },
          { label: "Total Discrepancy", value: state.kpis.reconciliationDifferencesTotal },
        ],
      };
    }

    case "unmatched-transaction-report": {
      const rows: Record<string, any>[] = [];
      state.reconciliations.forEach((rec) => {
        (rec.statementLines || []).forEach((line) => {
          if (line.matchStatus !== "Matched") {
            rows.push({
              source: "Bank Statement",
              reconciliationNo: rec.reconciliationNo,
              accountName: rec.accountName,
              date: line.statementDate,
              referenceNo: line.bankReferenceNo,
              description: line.description,
              direction: line.direction,
              amount: line.amount,
              classification: line.matchStatus,
            });
          }
        });
      });
      state.ledgerRows
        .filter((r) => r.isApproved && r.reconciliationStatus !== "Reconciled")
        .forEach((r) => {
          rows.push({
            source: "ERP Bank Ledger",
            reconciliationNo: r.reconciliationId || "Unassigned",
            accountName: r.accountName,
            date: r.transactionDate,
            referenceNo: r.referenceNo,
            description: r.description,
            direction: r.direction,
            amount: r.amount,
            classification: r.direction === "Credit" ? "Outstanding Deposit" : "Unpresented / Unreconciled",
          });
        });

      return {
        id: reportType,
        title: "Unmatched Transaction Report",
        titleAm: "ያልተጣመሩ ግብይቶች ሪፖርት",
        subtitle: "Unmatched statement lines, missing ERP transactions, duplicates, outstanding deposits & unpresented cheques",
        columns: [
          { key: "source", label: "Source" },
          { key: "accountName", label: "Account" },
          { key: "date", label: "Date" },
          { key: "referenceNo", label: "Reference" },
          { key: "description", label: "Description" },
          { key: "direction", label: "Dr/Cr" },
          { key: "amount", label: `Amount (${cur})`, isNumeric: true },
          { key: "classification", label: "Classification" },
        ],
        rows,
        summaryTotals: [
          { label: "Unmatched Items", value: rows.length },
          { label: "Unreconciled ERP Value", value: state.kpis.unreconciledTransactionsAmount },
        ],
      };
    }

    case "bank-charges-report": {
      const chargeRows = state.filteredLedgerRows
        .filter((r) => r.transactionType === "Bank Charges" || isBankChargeText(r.description))
        .map((r) => ({
          date: r.transactionDate,
          txNo: r.transactionNo,
          bankName: r.bankName,
          accountName: r.accountName,
          description: r.description,
          referenceNo: r.referenceNo,
          amount: r.amount,
          status: r.approvalStatus,
        }));
      return {
        id: reportType,
        title: "Bank Charges Report",
        titleAm: "የባንክ አገልግሎት ክፍያ ሪፖርት",
        subtitle: "Recorded and statement-detected bank fees, commissions, transfer charges & ledger maintenance costs",
        columns: [
          { key: "date", label: "Date" },
          { key: "txNo", label: "Tx Ref" },
          { key: "bankName", label: "Bank" },
          { key: "accountName", label: "Account" },
          { key: "description", label: "Charge Description" },
          { key: "referenceNo", label: "Bank Ref" },
          { key: "amount", label: `Amount (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows: chargeRows,
        summaryTotals: [
          { label: "Charge Entries", value: chargeRows.length },
          { label: "Approved Bank Charges", value: state.kpis.totalBankCharges },
        ],
      };
    }

    case "cash-and-bank-position-report":
    default: {
      const rows = state.allAccounts.map((a) => {
        const bal = parseMoney(a.currentBalance) ?? 0;
        const thr = parseMoney(a.minimumThreshold) ?? 0;
        return {
          accountCode: a.accountCode,
          accountType: a.accountType,
          subtype: a.bankAccountSubtype || (a.accountType === "Cash" ? "Cash Vault" : "Checking"),
          institution: a.bankName || "Company Treasury Vault",
          accountName: a.accountName,
          accountNumber: a.accountNumber || "-",
          currency: a.currency || cur,
          currentBalance: bal,
          minimumThreshold: thr,
          headroom: bal - thr,
          status: a.status,
        };
      });
      return {
        id: "cash-and-bank-position-report",
        title: "Cash and Bank Position Report",
        titleAm: "የጥሬ ገንዘብ እና የባንክ አቋም ሪፖርት",
        subtitle: "Consolidated company liquidity across all Cash Vaults and Commercial Bank Accounts",
        columns: [
          { key: "accountCode", label: "Code" },
          { key: "accountType", label: "Class" },
          { key: "institution", label: "Bank / Vault" },
          { key: "accountName", label: "Account Name" },
          { key: "accountNumber", label: "Account No" },
          { key: "currentBalance", label: `Balance (${cur})`, isNumeric: true },
          { key: "minimumThreshold", label: `Min Buffer (${cur})`, isNumeric: true },
          { key: "headroom", label: `Headroom (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Cash Balance", value: state.kpis.totalCashBalance },
          { label: "Total Bank Balance", value: state.kpis.totalBankBalance },
          { label: "Combined Cash & Bank Position", value: state.kpis.totalCashAndBankPosition },
        ],
      };
    }
  }
}

export function exportPart6ReportToExcel(dataset: GeneratedPart6BankReportDataset): void {
  const sheetRows = dataset.rows.map((r) => {
    const out: Record<string, any> = {};
    dataset.columns.forEach((col) => {
      out[col.label] = r[col.key] ?? "";
    });
    return out;
  });
  if (dataset.summaryTotals.length > 0) {
    sheetRows.push({});
    dataset.summaryTotals.forEach((st) => {
      const firstKey = dataset.columns[0]?.label || "Metric";
      const secondKey = dataset.columns[1]?.label || "Value";
      sheetRows.push({
        [firstKey]: st.label,
        [secondKey]: st.value,
      });
    });
  }
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, dataset.title.slice(0, 31));
  XLSX.writeFile(workbook, `${dataset.id}-${toIsoDate(new Date())}.xlsx`);
}
