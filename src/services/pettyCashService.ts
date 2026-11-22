import {
  ActualCostEntry,
  FinancialAccount,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  JournalEntryRecord,
  PettyCashFundRecord,
  PettyCashReconciliationRecord,
  PettyCashTransactionRecord,
  PettyCashTxType,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { resolveUserFinancePermissions } from "./financeService";
import { assertGlPostingAllowed } from "./generalLedgerService";
import { safeString } from "../utils/formatters";

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export interface PettyCashControlState {
  funds: PettyCashFundRecord[];
  transactions: PettyCashTransactionRecord[];
  reconciliations: PettyCashReconciliationRecord[];
  unsupportedExpenses: PettyCashTransactionRecord[];
  shortageOrExcessRecons: PettyCashReconciliationRecord[];
  lowBalanceFunds: PettyCashFundRecord[];
  excessBalanceFunds: PettyCashFundRecord[];
  kpis: {
    activeFundsCount: number;
    totalAuthorizedFloat: number;
    totalPettyCashBalance: number;
    pendingApprovalCount: number;
    postedExpensesTotal: number;
    unsupportedExpensesCount: number;
    unsupportedExpensesAmount: number;
    openShortageCount: number;
    totalShortageAmount: number;
  };
}

export function computePettyCashState(params: {
  funds: PettyCashFundRecord[];
  transactions: PettyCashTransactionRecord[];
  reconciliations: PettyCashReconciliationRecord[];
  projectFilter?: string;
}): PettyCashControlState {
  const pf = (params.projectFilter || "ALL").toLowerCase();
  const funds = (params.funds || [])
    .filter((f) => pf === "all" || safeString(f.project).toLowerCase() === pf)
    .sort((a, b) => a.fundCode.localeCompare(b.fundCode));
  const fundIds = new Set(funds.map((f) => f.id));

  const transactions = (params.transactions || [])
    .filter((t) => pf === "all" || fundIds.has(t.fundId))
    .sort((a, b) => b.txDate.localeCompare(a.txDate) || b.createdAt.localeCompare(a.createdAt));

  const reconciliations = (params.reconciliations || [])
    .filter((r) => pf === "all" || fundIds.has(r.fundId))
    .sort((a, b) => b.reconciliationDate.localeCompare(a.reconciliationDate));

  const unsupportedExpenses = transactions.filter(
    (t) => t.txType === "Expense" && t.status !== "Rejected" && !t.hasValidReceipt
  );
  const shortageOrExcessRecons = reconciliations.filter(
    (r) => r.varianceClassification !== "Balanced"
  );
  const lowBalanceFunds = funds.filter(
    (f) =>
      f.status === "Active" &&
      f.authorizedLimit > 0 &&
      (f.currentBalance / f.authorizedLimit) * 100 <= (f.replenishThresholdPct || 25)
  );
  const excessBalanceFunds = funds.filter(
    (f) => f.status === "Active" && f.currentBalance > f.authorizedLimit
  );

  const shortageRecons = reconciliations.filter(
    (r) => r.varianceClassification === "Cash Shortage"
  );

  return {
    funds,
    transactions,
    reconciliations,
    unsupportedExpenses,
    shortageOrExcessRecons,
    lowBalanceFunds,
    excessBalanceFunds,
    kpis: {
      activeFundsCount: funds.filter((f) => f.status === "Active").length,
      totalAuthorizedFloat: round2(funds.reduce((s, f) => s + Number(f.authorizedLimit || 0), 0)),
      totalPettyCashBalance: round2(funds.reduce((s, f) => s + Number(f.currentBalance || 0), 0)),
      pendingApprovalCount: transactions.filter((t) => t.status === "Pending").length,
      postedExpensesTotal: round2(
        transactions
          .filter((t) => t.txType === "Expense" && t.status === "Posted")
          .reduce((s, t) => s + Number(t.amount || 0), 0)
      ),
      unsupportedExpensesCount: unsupportedExpenses.length,
      unsupportedExpensesAmount: round2(
        unsupportedExpenses.reduce((s, t) => s + Number(t.amount || 0), 0)
      ),
      openShortageCount: shortageRecons.length,
      totalShortageAmount: round2(
        shortageRecons.reduce((s, r) => s + Math.abs(Number(r.varianceAmount || 0)), 0)
      ),
    },
  };
}

export async function createPettyCashFundMutation(params: {
  fundCode: string;
  fundName: string;
  locationType: "Head Office" | "Construction Site";
  project: string;
  department: string;
  custodianUid: string;
  custodianName: string;
  authorizedLimit: number;
  maxSingleExpense: number;
  replenishThresholdPct: number;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<PettyCashFundRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.isDirector && !perms.isFinanceManager && !perms.canManagePettyCash) {
    throw new Error("Unauthorized: Cannot create petty cash funds.");
  }
  const limitAmt = round2(params.authorizedLimit);
  const maxSingle = round2(params.maxSingleExpense);
  if (limitAmt <= 0 || maxSingle <= 0 || maxSingle > limitAmt) {
    throw new Error("Max single expense must be > 0 and <= Authorized Fund Limit.");
  }

  const nowIso = new Date().toISOString();
  const fund: PettyCashFundRecord = {
    id: `PCF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    fundCode: params.fundCode.trim().toUpperCase(),
    fundName: params.fundName.trim(),
    locationType: params.locationType,
    project: safeString(params.project, "Head Office"),
    department: safeString(params.department, "Finance"),
    custodianUid: safeString(params.custodianUid, params.actorUid),
    custodianName: safeString(params.custodianName, params.actorName),
    authorizedLimit: limitAmt,
    maxSingleExpense: maxSingle,
    openingBalance: 0,
    currentBalance: 0,
    replenishThresholdPct: Math.min(80, Math.max(5, Number(params.replenishThresholdPct || 25))),
    status: "Active",
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await DbService.savePettyCashFund(fund);
  return fund;
}

export async function submitPettyCashTxMutation(params: {
  fund: PettyCashFundRecord;
  txType: PettyCashTxType;
  txDate: string;
  category: string;
  payeeOrSource: string;
  description: string;
  amount: number;
  receiptRef?: string;
  sourceTreasuryAccountId?: string;
  coaExpenseCode?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<PettyCashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManagePettyCash && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only authorized custodians or Finance staff can log petty cash vouchers.");
  }
  if (params.fund.status !== "Active") {
    throw new Error(`Petty cash fund ${params.fund.fundCode} is ${params.fund.status}.`);
  }
  const amt = round2(params.amount);
  if (amt <= 0) throw new Error("Petty cash voucher amount must be positive.");

  if (params.txType === "Expense") {
    if (amt > params.fund.maxSingleExpense) {
      throw new Error(
        `Spending Limit Exceeded: Single petty cash expense (${amt}) exceeds fund ceiling (${params.fund.maxSingleExpense}). Route through standard AP/Bank Payment.`
      );
    }
    if (amt > params.fund.currentBalance) {
      throw new Error(
        `Insufficient Fund Balance: Expense (${amt}) exceeds available petty cash balance (${params.fund.currentBalance}). Request replenishment first.`
      );
    }
  }

  if (
    (params.txType === "Allocation" || params.txType === "Replenishment") &&
    params.fund.currentBalance + amt > params.fund.authorizedLimit
  ) {
    throw new Error(
      `Imprest Ceiling Exceeded: Replenishing ${amt} would exceed authorized fund limit (${params.fund.authorizedLimit}).`
    );
  }

  const nowIso = new Date().toISOString();
  const receipt = params.receiptRef?.trim() || "";
  const tx: PettyCashTransactionRecord = {
    id: `PCT-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    voucherNo: `PCV-${params.txType.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-5)}`,
    fundId: params.fund.id,
    fundCode: params.fund.fundCode,
    fundName: params.fund.fundName,
    project: params.fund.project,
    department: params.fund.department,
    txType: params.txType,
    txDate: params.txDate.slice(0, 10),
    category: safeString(params.category, params.txType === "Expense" ? "Site Consumables" : "Imprest Replenishment"),
    payeeOrSource: safeString(params.payeeOrSource, params.fund.custodianName),
    description: params.description.trim(),
    amount: amt,
    receiptRef: receipt || undefined,
    hasValidReceipt: Boolean(receipt) || params.txType !== "Expense",
    sourceTreasuryAccountId: params.sourceTreasuryAccountId,
    coaExpenseCode: params.coaExpenseCode || "6010",
    status: "Pending",
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.savePettyCashTransaction(tx);
  return tx;
}

export async function approveAndPostPettyCashTxMutation(params: {
  fund: PettyCashFundRecord;
  tx: PettyCashTransactionRecord;
  sourceTreasuryAccount?: FinancialAccount;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<PettyCashTransactionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance Manager or Director can approve and post petty cash.");
  }
  if (params.tx.createdById === params.actorUid && params.actorRole !== UserRole.SUPER_ADMIN) {
    throw new Error("Maker-Checker Control: Petty cash requester/custodian cannot self-approve their own voucher.");
  }
  if (params.tx.status === "Posted") {
    throw new Error("Petty cash voucher is already posted.");
  }

  const periodGuard = assertGlPostingAllowed({
    entryDate: params.tx.txDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const nowIso = new Date().toISOString();
  const amt = round2(params.tx.amount);
  const isInflow = params.tx.txType === "Allocation" || params.tx.txType === "Replenishment";

  if (!isInflow && amt > params.fund.currentBalance) {
    throw new Error(`Insufficient petty cash fund balance (${params.fund.currentBalance}) to post ${amt}.`);
  }

  const expCode = params.tx.coaExpenseCode || "6010";
  const treasuryCode =
    params.sourceTreasuryAccount?.accountType === "Cash" ? "1010" : "1020";

  const je: JournalEntryRecord = {
    id: `JE-PC-${params.tx.id}`,
    journalNo: params.tx.voucherNo,
    entryDate: params.tx.txDate,
    fiscalYear: params.tx.txDate.slice(0, 4),
    periodMonth: params.tx.txDate.slice(0, 7),
    project: params.tx.project,
    department: params.tx.department,
    referenceNo: params.tx.receiptRef || params.tx.voucherNo,
    description: `Petty Cash ${params.tx.txType} (${params.fund.fundCode}): ${params.tx.description}`,
    entryType: "Auto-Sync",
    sourceModule: "Petty Cash",
    sourceRecordId: params.tx.id,
    sourceKey: `PC_TX:${params.tx.id}`,
    uniqueTransactionKey: `PC_TX:${params.tx.id}`,
    isImmutable: true,
    lines: isInflow
      ? [
          {
            lineNo: 1,
            accountCode: "1015",
            accountName: "Petty Cash Funds (Head Office & Sites)",
            accountType: "Asset",
            subType: "Current Asset",
            debit: amt,
            credit: 0,
            memo: `Replenish ${params.fund.fundName}`,
            project: params.tx.project,
            department: params.tx.department,
          },
          {
            lineNo: 2,
            accountCode: params.sourceTreasuryAccount ? treasuryCode : "1020",
            accountName: params.sourceTreasuryAccount?.accountName || "Cash in Commercial Banks",
            accountType: "Asset",
            subType: "Current Asset",
            debit: 0,
            credit: amt,
            memo: `Funded from ${params.sourceTreasuryAccount?.accountName || "Treasury"}`,
            project: params.tx.project,
            department: params.tx.department,
          },
        ]
      : [
          {
            lineNo: 1,
            accountCode: expCode,
            accountName: expCode === "5010" ? "Direct Materials & Procurement Cost" : "Operating Site Overhead & Utilities",
            accountType: expCode.startsWith("5") ? "Cost of Construction" : "Operating Expense",
            subType: expCode.startsWith("5") ? "Direct Construction Cost" : "Operating Expense",
            debit: amt,
            credit: 0,
            memo: `${params.tx.category} — ${params.tx.payeeOrSource}`,
            project: params.tx.project,
            department: params.tx.department,
          },
          {
            lineNo: 2,
            accountCode: "1015",
            accountName: "Petty Cash Funds (Head Office & Sites)",
            accountType: "Asset",
            subType: "Current Asset",
            debit: 0,
            credit: amt,
            memo: `Paid from ${params.fund.fundCode}`,
            project: params.tx.project,
            department: params.tx.department,
          },
        ],
    totalDebit: amt,
    totalCredit: amt,
    isBalanced: true,
    status: "Posted",
    preparedBy: params.tx.createdBy,
    preparedById: params.tx.createdById,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const actualCost: ActualCostEntry | undefined = !isInflow
    ? {
        id: `AC-PC-${params.tx.id}`,
        costTransactionId: params.tx.voucherNo,
        projectName: params.tx.project,
        budgetCategory: "Other Project Costs",
        sourceModule: "Petty Cash",
        sourceRecordId: params.tx.id,
        invoiceNumber: params.tx.voucherNo,
        supplierOrPayee: params.tx.payeeOrSource,
        costDescription: `[Petty Cash] ${params.tx.description}`,
        quantity: 1,
        unitPrice: amt,
        totalCost: amt,
        paidAmount: amt,
        transactionDate: params.tx.txDate,
        recordedBy: params.tx.createdBy,
        verificationStatus: "Validated",
        verifiedBy: params.actorName,
        validatedBy: params.actorName,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : undefined;

  const postedTx: PettyCashTransactionRecord = {
    ...params.tx,
    status: "Posted",
    glJournalId: je.id,
    approvedBy: params.actorName,
    approvedById: params.actorUid,
    approvedAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.applyPettyCashPostingAtomic({
    fund: params.fund,
    fundDelta: isInflow ? amt : -amt,
    tx: postedTx,
    journalEntry: je,
    sourceTreasuryAccount: isInflow ? params.sourceTreasuryAccount : undefined,
    sourceTreasuryDelta: isInflow && params.sourceTreasuryAccount ? -amt : 0,
    actualCostEntry: actualCost,
  });

  return postedTx;
}

export async function recordPettyCashReconciliationMutation(params: {
  fund: PettyCashFundRecord;
  reconciliationDate: string;
  physicalCashCount: number;
  unpostedReceiptsTotal: number;
  allFundTransactions: PettyCashTransactionRecord[];
  notes?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<PettyCashReconciliationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManagePettyCash && !perms.canVerifyPettyCashReconciliation && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Cannot record petty cash count reconciliation.");
  }

  const bookBalance = round2(params.fund.currentBalance);
  const physicalCount = round2(Math.max(0, params.physicalCashCount));
  const unpostedReceipts = round2(Math.max(0, params.unpostedReceiptsTotal));
  const varianceAmount = round2(physicalCount + unpostedReceipts - bookBalance);

  const varianceClassification: PettyCashReconciliationRecord["varianceClassification"] =
    Math.abs(varianceAmount) <= 1
      ? "Balanced"
      : varianceAmount < 0
      ? "Cash Shortage"
      : "Excess Cash";

  const unsupported = params.allFundTransactions.filter(
    (t) => t.fundId === params.fund.id && t.txType === "Expense" && t.status !== "Rejected" && !t.hasValidReceipt
  );

  const nowIso = new Date().toISOString();
  const rec: PettyCashReconciliationRecord = {
    id: `PCR-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    reconciliationNo: `PC-REC-${params.fund.fundCode}-${params.reconciliationDate.replace(/-/g, "")}`,
    fundId: params.fund.id,
    fundName: params.fund.fundName,
    project: params.fund.project,
    reconciliationDate: params.reconciliationDate.slice(0, 10),
    custodianName: params.fund.custodianName,
    bookBalance,
    physicalCashCount: physicalCount,
    unpostedReceiptsTotal: unpostedReceipts,
    varianceAmount,
    varianceClassification,
    unsupportedExpensesCount: unsupported.length,
    unsupportedExpensesAmount: round2(unsupported.reduce((s, t) => s + Number(t.amount || 0), 0)),
    notes: params.notes?.trim(),
    reconciledBy: params.actorName,
    reconciledById: params.actorUid,
    status: "Pending Verification",
    createdAt: nowIso,
  };

  await DbService.savePettyCashReconciliation(rec);
  await DbService.savePettyCashFund({
    ...params.fund,
    lastReconciledAt: rec.reconciliationDate,
    lastPhysicalCount: physicalCount,
    updatedAt: nowIso,
  });

  return rec;
}

export async function verifyPettyCashReconciliationMutation(params: {
  reconciliation: PettyCashReconciliationRecord;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<PettyCashReconciliationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canVerifyPettyCashReconciliation && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance Manager or Director can verify petty cash reconciliations.");
  }
  if (params.reconciliation.reconciledById === params.actorUid && params.actorRole !== UserRole.SUPER_ADMIN) {
    throw new Error("Maker-Checker Control: The person who counted petty cash cannot self-verify the reconciliation.");
  }
  const verified: PettyCashReconciliationRecord = {
    ...params.reconciliation,
    status: "Verified",
    verifiedBy: params.actorName,
    verifiedById: params.actorUid,
  };
  await DbService.savePettyCashReconciliation(verified);
  return verified;
}
