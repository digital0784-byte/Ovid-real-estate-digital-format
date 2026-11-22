import {
  BankTransactionRecord,
  CounterpartyCreditProfile,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  JournalEntryRecord,
  LoanFacilityRecord,
  LoanFacilityType,
  LoanInterestMethod,
  LoanRepaymentRecord,
  LoanRepaymentScheduleRow,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { resolveUserFinancePermissions } from "./financeService";
import { assertGlPostingAllowed } from "./generalLedgerService";
import { safeString } from "../utils/formatters";

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function addMonthsIso(dateStr: string, months: number): string {
  const base = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (isNaN(base.getTime())) return dateStr.slice(0, 10);
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function generateLoanAmortizationSchedule(
  loan: Pick<
    LoanFacilityRecord,
    | "principalAmount"
    | "annualInterestRatePct"
    | "termMonths"
    | "interestMethod"
    | "disbursementDate"
    | "totalPrincipalRepaid"
  >,
  referenceToday?: string
): LoanRepaymentScheduleRow[] {
  const P = Math.max(0, Number(loan.principalAmount || 0));
  const n = Math.max(1, Math.min(360, Math.round(Number(loan.termMonths || 12))));
  const annualRate = Math.max(0, Number(loan.annualInterestRatePct || 0)) / 100;
  const r = annualRate / 12;
  const today = referenceToday || new Date().toISOString().slice(0, 10);

  const rows: LoanRepaymentScheduleRow[] = [];
  let balance = round2(P);
  let cumulativePrincipalScheduled = 0;
  const repaidSoFar = round2(Number(loan.totalPrincipalRepaid || 0));

  const pmt =
    loan.interestMethod === "Reducing Balance"
      ? r > 0
        ? (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1)
        : P / n
      : P / n + P * r;

  for (let i = 1; i <= n; i++) {
    const openingBalance = round2(balance);
    const interestDue =
      loan.interestMethod === "Reducing Balance" ? round2(openingBalance * r) : round2(P * r);
    let principalDue =
      i === n ? openingBalance : round2(Math.min(openingBalance, Math.max(0, pmt - interestDue)));
    if (loan.interestMethod === "Flat Rate" && i < n) {
      principalDue = round2(P / n);
    }
    const closingBalance = round2(Math.max(0, openingBalance - principalDue));
    cumulativePrincipalScheduled = round2(cumulativePrincipalScheduled + principalDue);
    const dueDate = addMonthsIso(loan.disbursementDate, i);

    const status: "Scheduled" | "Paid" | "Overdue" =
      repaidSoFar >= cumulativePrincipalScheduled - 0.5
        ? "Paid"
        : dueDate < today
        ? "Overdue"
        : "Scheduled";

    rows.push({
      installmentNo: i,
      dueDate,
      openingBalance,
      principalDue,
      interestDue,
      totalPayment: round2(principalDue + interestDue),
      closingBalance,
      status,
    });
    balance = closingBalance;
  }
  return rows;
}

export interface CreditExposureSummaryRow {
  profile: CounterpartyCreditProfile;
  openExposure: number;
  utilizationPct: number;
  overdueAmount: number;
  computedRisk: "Low Risk" | "Moderate Risk" | "Elevated Risk" | "High Risk";
}

export interface LoanCreditDashboardState {
  loans: LoanFacilityRecord[];
  repayments: LoanRepaymentRecord[];
  clientCreditSummaries: CreditExposureSummaryRow[];
  supplierCreditSummaries: CreditExposureSummaryRow[];
  kpis: {
    activeLoanCount: number;
    totalFacilityPrincipal: number;
    totalOutstandingPrincipal: number;
    totalPrincipalRepaid: number;
    totalInterestRepaid: number;
    next30DaysDebtService: number;
    overdueLoansCount: number;
    creditLimitBreachesCount: number;
  };
}

export function computeLoanAndCreditState(params: {
  loans: LoanFacilityRecord[];
  repayments: LoanRepaymentRecord[];
  creditProfiles: CounterpartyCreditProfile[];
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  referenceToday?: string;
}): LoanCreditDashboardState {
  const today = params.referenceToday || new Date().toISOString().slice(0, 10);
  const plus30 = new Date(`${today}T00:00:00Z`);
  plus30.setUTCDate(plus30.getUTCDate() + 30);
  const plus30Iso = plus30.toISOString().slice(0, 10);

  const loans = [...(params.loans || [])].sort((a, b) =>
    b.disbursementDate.localeCompare(a.disbursementDate)
  );
  const repayments = [...(params.repayments || [])].sort((a, b) =>
    b.paymentDate.localeCompare(a.paymentDate)
  );

  let next30DaysDebtService = 0;
  let overdueLoansCount = 0;

  loans.forEach((ln) => {
    if (ln.status === "Settled" || ln.status === "Pending Approval") return;
    const sched = generateLoanAmortizationSchedule(ln, today);
    const hasOverdue = sched.some((r) => r.status === "Overdue");
    if (hasOverdue) overdueLoansCount++;
    sched
      .filter((r) => r.status !== "Paid" && r.dueDate <= plus30Iso)
      .forEach((r) => {
        next30DaysDebtService += r.totalPayment;
      });
  });

  const buildExposure = (p: CounterpartyCreditProfile): CreditExposureSummaryRow => {
    const targetName = p.counterpartyName.trim().toLowerCase();
    let openExposure = 0;
    let overdueAmount = 0;

    if (p.counterpartyType === "Client") {
      (params.invoices || []).forEach((inv) => {
        const st = String(inv.status || "").toLowerCase();
        if (st === "rejected" || st === "cancelled" || st === "paid") return;
        const client = safeString(inv.clientName || (inv as any).client).toLowerCase();
        if (client !== targetName && !client.includes(targetName)) return;
        const rem = Math.max(0, Number(inv.amount || 0) - Number(inv.paidAmount || 0));
        openExposure += rem;
        if ((inv.dueDate || "") < today && rem > 0) overdueAmount += rem;
      });
    } else {
      (params.expenses || []).forEach((exp) => {
        const st = String(exp.status || "").toLowerCase();
        if (st === "rejected" || st === "cancelled" || st === "paid") return;
        const sup = safeString((exp as any).supplier || (exp as any).vendor).toLowerCase();
        if (sup !== targetName && !sup.includes(targetName)) return;
        const rem = Math.max(0, Number(exp.amount || 0) - Number(exp.paidAmount || 0));
        openExposure += rem;
        if (((exp as any).dueDate || exp.date || "") < today && rem > 0) overdueAmount += rem;
      });
    }

    openExposure = round2(openExposure);
    overdueAmount = round2(overdueAmount);
    const utilizationPct =
      p.creditLimitEtb > 0 ? round2((openExposure / p.creditLimitEtb) * 100) : 0;

    const computedRisk: CreditExposureSummaryRow["computedRisk"] =
      utilizationPct >= 100 || overdueAmount > p.creditLimitEtb * 0.5
        ? "High Risk"
        : utilizationPct >= 80 || overdueAmount > 0
        ? "Elevated Risk"
        : utilizationPct >= 50
        ? "Moderate Risk"
        : "Low Risk";

    return {
      profile: p,
      openExposure,
      utilizationPct,
      overdueAmount,
      computedRisk,
    };
  };

  const clientCreditSummaries = (params.creditProfiles || [])
    .filter((p) => p.counterpartyType === "Client")
    .map(buildExposure);
  const supplierCreditSummaries = (params.creditProfiles || [])
    .filter((p) => p.counterpartyType === "Supplier")
    .map(buildExposure);

  const creditLimitBreachesCount = [...clientCreditSummaries, ...supplierCreditSummaries].filter(
    (s) => s.utilizationPct > 100
  ).length;

  const activeLoans = loans.filter((l) => l.status !== "Settled" && l.status !== "Pending Approval");

  return {
    loans,
    repayments,
    clientCreditSummaries,
    supplierCreditSummaries,
    kpis: {
      activeLoanCount: activeLoans.length,
      totalFacilityPrincipal: round2(loans.reduce((s, l) => s + Number(l.principalAmount || 0), 0)),
      totalOutstandingPrincipal: round2(
        activeLoans.reduce((s, l) => s + Number(l.outstandingPrincipal || 0), 0)
      ),
      totalPrincipalRepaid: round2(loans.reduce((s, l) => s + Number(l.totalPrincipalRepaid || 0), 0)),
      totalInterestRepaid: round2(loans.reduce((s, l) => s + Number(l.totalInterestRepaid || 0), 0)),
      next30DaysDebtService: round2(next30DaysDebtService),
      overdueLoansCount,
      creditLimitBreachesCount,
    },
  };
}

export async function createLoanFacilityMutation(params: {
  facilityNo: string;
  lenderName: string;
  facilityType: LoanFacilityType;
  project: string;
  department: string;
  principalAmount: number;
  annualInterestRatePct: number;
  termMonths: number;
  interestMethod: LoanInterestMethod;
  disbursementDate: string;
  depositAccountId?: string;
  notes?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<LoanFacilityRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageLoansAndCredit && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance staff can register loan facilities.");
  }
  const principal = round2(params.principalAmount);
  if (principal <= 0) throw new Error("Loan principal must be greater than zero.");

  const nowIso = new Date().toISOString();
  const term = Math.max(1, Math.round(params.termMonths));
  const coaCode = params.facilityType === "Working Capital Line" || term <= 12 ? "2110" : "2510";

  const loan: LoanFacilityRecord = {
    id: `LN-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    facilityNo: params.facilityNo.trim() || `LN-${String(Date.now()).slice(-5)}`,
    lenderName: params.lenderName.trim(),
    facilityType: params.facilityType,
    project: safeString(params.project, "Corporate Treasury"),
    department: safeString(params.department, "Finance"),
    principalAmount: principal,
    annualInterestRatePct: round2(Math.max(0, params.annualInterestRatePct)),
    termMonths: term,
    interestMethod: params.interestMethod,
    disbursementDate: params.disbursementDate.slice(0, 10),
    maturityDate: addMonthsIso(params.disbursementDate, term),
    outstandingPrincipal: principal,
    totalInterestAccrued: 0,
    totalPrincipalRepaid: 0,
    totalInterestRepaid: 0,
    nextDueDate: addMonthsIso(params.disbursementDate, 1),
    coaLiabilityCode: coaCode,
    depositAccountId: params.depositAccountId,
    status: "Pending Approval",
    createdBy: params.actorName,
    createdById: params.actorUid,
    notes: params.notes?.trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveLoanFacility(loan);
  return loan;
}

export async function approveAndDisburseLoanMutation(params: {
  loan: LoanFacilityRecord;
  depositAccount: FinancialAccount;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<LoanFacilityRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canApproveLoans && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance Manager or Director can approve loan drawdown.");
  }
  if (params.loan.createdById === params.actorUid && params.actorRole !== UserRole.SUPER_ADMIN) {
    throw new Error("Maker-Checker Control: Loan preparer cannot self-approve drawdown.");
  }
  const periodGuard = assertGlPostingAllowed({
    entryDate: params.loan.disbursementDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const nowIso = new Date().toISOString();
  const amt = round2(params.loan.principalAmount);
  const liabName =
    params.loan.coaLiabilityCode === "2110"
      ? "Short-Term Loans & Working Capital Credit"
      : "Long-Term Loans & Equipment Financing";

  const je: JournalEntryRecord = {
    id: `JE-LN-DRW-${params.loan.id}`,
    journalNo: `LN-DRW-${params.loan.facilityNo}`,
    entryDate: params.loan.disbursementDate,
    fiscalYear: params.loan.disbursementDate.slice(0, 4),
    periodMonth: params.loan.disbursementDate.slice(0, 7),
    project: params.loan.project,
    department: params.loan.department,
    referenceNo: params.loan.facilityNo,
    description: `Loan Drawdown: ${params.loan.facilityNo} (${params.loan.lenderName})`,
    entryType: "Auto-Sync",
    sourceModule: "Loan & Financing",
    sourceRecordId: params.loan.id,
    sourceKey: `LN_DRW:${params.loan.id}`,
    uniqueTransactionKey: `LN_DRW:${params.loan.id}`,
    isImmutable: true,
    lines: [
      {
        lineNo: 1,
        accountCode: params.depositAccount.accountType === "Cash" ? "1010" : "1020",
        accountName: params.depositAccount.accountName,
        accountType: "Asset",
        subType: "Current Asset",
        debit: amt,
        credit: 0,
        memo: `Loan proceeds deposited to ${params.depositAccount.accountName}`,
        project: params.loan.project,
        department: params.loan.department,
      },
      {
        lineNo: 2,
        accountCode: params.loan.coaLiabilityCode,
        accountName: liabName,
        accountType: "Liability",
        subType: params.loan.coaLiabilityCode === "2110" ? "Current Liability" : "Non-Current Liability",
        debit: 0,
        credit: amt,
        memo: `${params.loan.facilityType} principal liability`,
        project: params.loan.project,
        department: params.loan.department,
      },
    ],
    totalDebit: amt,
    totalCredit: amt,
    isBalanced: true,
    status: "Posted",
    preparedBy: params.loan.createdBy,
    preparedById: params.loan.createdById,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const bankTx: BankTransactionRecord | undefined =
    params.depositAccount.accountType === "Bank"
      ? {
          id: `BTX-LN-DRW-${params.loan.id}`,
          transactionNo: `BNK-LN-${params.loan.facilityNo}`,
          transactionDate: params.loan.disbursementDate,
          valueDate: params.loan.disbursementDate,
          transactionType: "Loan Disbursements",
          direction: "Credit",
          accountId: params.depositAccount.id,
          accountName: params.depositAccount.accountName,
          accountNumber: params.depositAccount.accountNumber,
          amount: amt,
          currency: params.depositAccount.currency || "ETB",
          project: params.loan.project,
          department: params.loan.department,
          counterparty: params.loan.lenderName,
          referenceNo: params.loan.facilityNo,
          paymentMethod: "Bank Transfer",
          description: `Loan Drawdown: ${params.loan.facilityType} (${params.loan.facilityNo})`,
          sourceChannel: "Loan",
          linkedDocumentType: "Other",
          linkedDocumentId: params.loan.id,
          linkedReferenceNo: params.loan.facilityNo,
          approvalStatus: "Approved",
          reconciliationStatus: "Unreconciled",
          recordedBy: params.actorName,
          createdBy: params.loan.createdBy,
          createdById: params.loan.createdById,
          approvedBy: params.actorName,
          approvedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        }
      : undefined;

  const updatedLoan: LoanFacilityRecord = {
    ...params.loan,
    status: "Active",
    depositAccountId: params.depositAccount.id,
    glDisbursementJournalId: je.id,
    approvedBy: params.actorName,
    approvedById: params.actorUid,
    updatedAt: nowIso,
  };

  await DbService.applyLoanTransactionAtomic({
    loan: updatedLoan,
    journalEntry: je,
    account: params.depositAccount,
    accountDelta: amt,
    bankTransaction: bankTx,
  });

  return updatedLoan;
}

export async function recordLoanRepaymentMutation(params: {
  loan: LoanFacilityRecord;
  paymentDate: string;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid?: number;
  paymentAccount: FinancialAccount;
  referenceNo: string;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<{ loan: LoanFacilityRecord; repayment: LoanRepaymentRecord; journal: JournalEntryRecord }> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canApproveLoans && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance Manager or Director can post loan repayments.");
  }
  const periodGuard = assertGlPostingAllowed({
    entryDate: params.paymentDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const principal = round2(Math.max(0, params.principalPaid));
  const interest = round2(Math.max(0, params.interestPaid));
  const penalty = round2(Math.max(0, params.penaltyPaid || 0));
  const totalPaid = round2(principal + interest + penalty);
  if (totalPaid <= 0) throw new Error("Repayment amount must be greater than zero.");
  if (principal > params.loan.outstandingPrincipal + 0.01) {
    throw new Error(`Principal repayment (${principal}) exceeds outstanding loan balance (${params.loan.outstandingPrincipal}).`);
  }

  const nowIso = new Date().toISOString();
  const repId = `LREP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const liabName =
    params.loan.coaLiabilityCode === "2110"
      ? "Short-Term Loans & Working Capital Credit"
      : "Long-Term Loans & Equipment Financing";

  // Strictly separate Principal Liability Reduction vs Interest Expense!
  const lines: JournalEntryRecord["lines"] = [];
  if (principal > 0) {
    lines.push({
      lineNo: lines.length + 1,
      accountCode: params.loan.coaLiabilityCode,
      accountName: liabName,
      accountType: "Liability",
      subType: params.loan.coaLiabilityCode === "2110" ? "Current Liability" : "Non-Current Liability",
      debit: principal,
      credit: 0,
      memo: `Principal repayment on ${params.loan.facilityNo}`,
      project: params.loan.project,
      department: params.loan.department,
    });
  }
  if (interest + penalty > 0) {
    lines.push({
      lineNo: lines.length + 1,
      accountCode: "6220",
      accountName: "Loan Interest & Financing Expense",
      accountType: "Operating Expense",
      subType: "Operating Expense",
      debit: round2(interest + penalty),
      credit: 0,
      memo: `Interest ${interest}${penalty > 0 ? ` + Penalty ${penalty}` : ""} on ${params.loan.facilityNo}`,
      project: params.loan.project,
      department: params.loan.department,
    });
  }
  lines.push({
    lineNo: lines.length + 1,
    accountCode: params.paymentAccount.accountType === "Cash" ? "1010" : "1020",
    accountName: params.paymentAccount.accountName,
    accountType: "Asset",
    subType: "Current Asset",
    debit: 0,
    credit: totalPaid,
    memo: `Bank loan repayment ${params.referenceNo}`,
    project: params.loan.project,
    department: params.loan.department,
  });

  const je: JournalEntryRecord = {
    id: `JE-${repId}`,
    journalNo: `LN-PAY-${params.loan.facilityNo}-${String(Date.now()).slice(-4)}`,
    entryDate: params.paymentDate.slice(0, 10),
    fiscalYear: params.paymentDate.slice(0, 4),
    periodMonth: params.paymentDate.slice(0, 7),
    project: params.loan.project,
    department: params.loan.department,
    referenceNo: params.referenceNo || params.loan.facilityNo,
    description: `Loan Repayment ${params.loan.facilityNo}: Principal ${principal} + Interest ${interest}`,
    entryType: "Auto-Sync",
    sourceModule: "Loan & Financing",
    sourceRecordId: repId,
    sourceKey: `LN_PAY:${repId}`,
    uniqueTransactionKey: `LN_PAY:${repId}`,
    isImmutable: true,
    lines,
    totalDebit: totalPaid,
    totalCredit: totalPaid,
    isBalanced: true,
    status: "Posted",
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const newOut = round2(Math.max(0, params.loan.outstandingPrincipal - principal));
  const updatedLoan: LoanFacilityRecord = {
    ...params.loan,
    outstandingPrincipal: newOut,
    totalPrincipalRepaid: round2(params.loan.totalPrincipalRepaid + principal),
    totalInterestRepaid: round2(params.loan.totalInterestRepaid + interest + penalty),
    nextDueDate: newOut <= 0.01 ? params.paymentDate.slice(0, 10) : addMonthsIso(params.paymentDate, 1),
    status: newOut <= 0.01 ? "Settled" : "Partially Repaid",
    updatedAt: nowIso,
  };

  const repayment: LoanRepaymentRecord = {
    id: repId,
    repaymentNo: `REP-${String(Date.now()).slice(-6)}`,
    loanId: params.loan.id,
    facilityNo: params.loan.facilityNo,
    lenderName: params.loan.lenderName,
    project: params.loan.project,
    paymentDate: params.paymentDate.slice(0, 10),
    principalPaid: principal,
    interestPaid: interest,
    penaltyPaid: penalty,
    totalPaid,
    paymentAccountId: params.paymentAccount.id,
    paymentAccountName: params.paymentAccount.accountName,
    referenceNo: params.referenceNo,
    glJournalId: je.id,
    glJournalNo: je.journalNo,
    recordedBy: params.actorName,
    recordedById: params.actorUid,
    approvedBy: params.actorName,
    approvedById: params.actorUid,
    status: "Posted",
    createdAt: nowIso,
  };

  const bankTx: BankTransactionRecord | undefined =
    params.paymentAccount.accountType === "Bank"
      ? {
          id: `BTX-${repId}`,
          transactionNo: `BNK-LREP-${String(Date.now()).slice(-5)}`,
          transactionDate: params.paymentDate.slice(0, 10),
          valueDate: params.paymentDate.slice(0, 10),
          transactionType: "Loan Repayments",
          direction: "Debit",
          accountId: params.paymentAccount.id,
          accountName: params.paymentAccount.accountName,
          accountNumber: params.paymentAccount.accountNumber,
          amount: totalPaid,
          currency: params.paymentAccount.currency || "ETB",
          project: params.loan.project,
          department: params.loan.department,
          counterparty: params.loan.lenderName,
          referenceNo: params.referenceNo,
          paymentMethod: "Bank Transfer",
          description: `Loan Repayment (${params.loan.facilityNo}): Principal ${principal}, Interest ${interest}`,
          sourceChannel: "Loan",
          linkedDocumentType: "Other",
          linkedDocumentId: repId,
          linkedReferenceNo: repayment.repaymentNo,
          approvalStatus: "Approved",
          reconciliationStatus: "Unreconciled",
          recordedBy: params.actorName,
          createdBy: params.actorName,
          createdById: params.actorUid,
          approvedBy: params.actorName,
          approvedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        }
      : undefined;

  await DbService.applyLoanTransactionAtomic({
    loan: updatedLoan,
    repayment,
    journalEntry: je,
    account: params.paymentAccount,
    accountDelta: -totalPaid,
    bankTransaction: bankTx,
  });

  return { loan: updatedLoan, repayment, journal: je };
}
