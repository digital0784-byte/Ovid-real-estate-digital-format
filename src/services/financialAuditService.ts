import * as XLSX from "xlsx";
import {
  AttendanceRecord,
  AuditAnomalyCategory,
  AuditFindingSeverity,
  BankTransactionRecord,
  CashTransactionRecord,
  Expense,
  FinancialAuditFindingRecord,
  FinancialInvoiceRecord,
  FinancialSettingsConfig,
  HrmPayrollRunRecord,
  JournalEntryRecord,
  PettyCashReconciliationRecord,
  PettyCashTransactionRecord,
  ProjectBudgetPlan,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { ComputedFinancialState, resolveUserFinancePermissions } from "./financeService";
import { Part7FinancialStatementsState } from "./financialStatementsService";
import { FixedAssetsDashboardState } from "./fixedAssetsService";
import { LoanCreditDashboardState } from "./loanCreditService";
import { PettyCashControlState } from "./pettyCashService";
import { TaxComplianceDashboardState } from "./taxComplianceService";
import { safeString } from "../utils/formatters";

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export function assertMakerCheckerSeparation(params: {
  makerUid?: string;
  checkerUid: string;
  checkerRole: UserRole | string;
  actionLabel: string;
}): void {
  if (
    params.makerUid &&
    params.makerUid === params.checkerUid &&
    params.checkerRole !== UserRole.SUPER_ADMIN
  ) {
    throw new Error(
      `Maker-Checker Violation Blocked (${params.actionLabel}): Creator (${params.makerUid}) cannot self-approve their own financial transaction.`
    );
  }
}

export interface DetectedAnomalyItem {
  id: string;
  category: AuditAnomalyCategory;
  severity: AuditFindingSeverity;
  title: string;
  description: string;
  sourceCollection: string;
  sourceRecordId: string;
  project: string;
  amountInvolved: number;
  makerUid?: string;
  checkerUid?: string;
}

export function detectFinancialAnomalies(params: {
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  cashTransactions: CashTransactionRecord[];
  bankTransactions: BankTransactionRecord[];
  journalEntries: JournalEntryRecord[];
  pettyCashTransactions: PettyCashTransactionRecord[];
  pettyCashReconciliations: PettyCashReconciliationRecord[];
  projectBudgetPlans: ProjectBudgetPlan[];
  hrmPayrollRuns: HrmPayrollRunRecord[];
  attendance: AttendanceRecord[];
  creditBreachesCount?: number;
  settings: FinancialSettingsConfig;
}): DetectedAnomalyItem[] {
  const anomalies: DetectedAnomalyItem[] = [];
  const threshold = Number(params.settings.requireDirectorApprovalAboveEtb || 500000);
  const overrunPct = Number(params.settings.budgetOverrunAlertPct || 100);

  // 1. Duplicate Invoice / Bill Numbers
  const seenInvNo = new Map<string, FinancialInvoiceRecord>();
  (params.invoices || []).forEach((inv) => {
    const key = (inv.invoiceNumber || "").trim().toLowerCase();
    if (!key) return;
    if (seenInvNo.has(key)) {
      anomalies.push({
        id: `ANOM-DUP-INV-${inv.id}`,
        category: "Duplicate Payment / Invoice",
        severity: "HIGH",
        title: `Duplicate Client Invoice No: ${inv.invoiceNumber}`,
        description: `Invoice ${inv.invoiceNumber} appears multiple times (${seenInvNo.get(key)!.id} and ${inv.id}).`,
        sourceCollection: "invoices",
        sourceRecordId: inv.id,
        project: safeString(inv.project, "General"),
        amountInvolved: Number(inv.amount || 0),
      });
    } else {
      seenInvNo.set(key, inv);
    }
  });

  // 2. Duplicate Expenses (same vendor + exact amount within 3 days)
  const expSorted = [...(params.expenses || [])].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || ""))
  );
  for (let i = 0; i < expSorted.length; i++) {
    const a = expSorted[i];
    const supA = safeString((a as any).supplier || (a as any).vendor || a.description).toLowerCase();
    const amtA = round2(Number(a.amount || 0));
    if (amtA <= 0) continue;
    for (let j = i + 1; j < expSorted.length; j++) {
      const b = expSorted[j];
      const supB = safeString((b as any).supplier || (b as any).vendor || b.description).toLowerCase();
      const amtB = round2(Number(b.amount || 0));
      if (supA && supA === supB && Math.abs(amtA - amtB) < 0.01) {
        const dA = new Date(`${String(a.date || "").slice(0, 10)}T00:00:00Z`).getTime();
        const dB = new Date(`${String(b.date || "").slice(0, 10)}T00:00:00Z`).getTime();
        const days = Math.abs(dB - dA) / (1000 * 60 * 60 * 24);
        if (!isNaN(days) && days <= 3) {
          anomalies.push({
            id: `ANOM-DUP-EXP-${a.id}-${b.id}`,
            category: "Duplicate Payment / Invoice",
            severity: "HIGH",
            title: `Potential Duplicate Vendor Expense: ${supA} (${amtA.toLocaleString()} ETB)`,
            description: `Expenses ${a.id} and ${b.id} share the same vendor and exact amount within ${Math.round(days)} day(s).`,
            sourceCollection: "expenses",
            sourceRecordId: b.id,
            project: safeString(b.project, "General"),
            amountInvolved: amtB,
          });
          break;
        }
      }
    }
  }

  // 3. Split Transactions Just Below Director Threshold (within 48h to same counterparty)
  const cashPayments = (params.cashTransactions || []).filter(
    (c) => c.type === "Payment" && c.status !== "Rejected" && c.status !== "Cancelled"
  );
  const byCounterparty = new Map<string, CashTransactionRecord[]>();
  cashPayments.forEach((tx) => {
    const cp = safeString(tx.counterparty).toLowerCase();
    if (!cp) return;
    const arr = byCounterparty.get(cp) || [];
    arr.push(tx);
    byCounterparty.set(cp, arr);
  });
  byCounterparty.forEach((txs, cp) => {
    const subThreshold = txs.filter(
      (t) => Number(t.amount || 0) >= threshold * 0.45 && Number(t.amount || 0) < threshold
    );
    if (subThreshold.length >= 2) {
      const combined = round2(subThreshold.reduce((s, t) => s + Number(t.amount || 0), 0));
      if (combined > threshold) {
        anomalies.push({
          id: `ANOM-SPLIT-${subThreshold[0].id}`,
          category: "Split Transaction Near Threshold",
          severity: "CRITICAL",
          title: `Possible Split Payment Below ${threshold.toLocaleString()} ETB Approval Limit`,
          description: `${subThreshold.length} sub-threshold payments to "${cp}" totaling ${combined.toLocaleString()} ETB may bypass executive approval.`,
          sourceCollection: "cashTransactions",
          sourceRecordId: subThreshold[0].id,
          project: safeString(subThreshold[0].project, "General"),
          amountInvolved: combined,
        });
      }
    }
  });

  // 4. Maker-Checker Self-Approval Check across Cash, Bank, Journals, Petty Cash
  [...(params.cashTransactions || [])].forEach((tx) => {
    if (
      tx.createdById &&
      (tx as any).approvedById &&
      tx.createdById === (tx as any).approvedById &&
      tx.createdById !== "SYSTEM"
    ) {
      anomalies.push({
        id: `ANOM-MC-CASH-${tx.id}`,
        category: "Maker-Checker Violation",
        severity: "CRITICAL",
        title: `Self-Approved Cash Transaction (${tx.referenceNo || tx.id})`,
        description: `User ${tx.createdBy} (${tx.createdById}) both created and approved this cash transaction.`,
        sourceCollection: "cashTransactions",
        sourceRecordId: tx.id,
        project: safeString(tx.project, "General"),
        amountInvolved: Number(tx.amount || 0),
        makerUid: tx.createdById,
        checkerUid: (tx as any).approvedById,
      });
    }
  });

  (params.bankTransactions || []).forEach((bt) => {
    if (
      bt.createdById &&
      (bt as any).approvedById &&
      bt.createdById === (bt as any).approvedById &&
      bt.createdById !== "SYSTEM"
    ) {
      anomalies.push({
        id: `ANOM-MC-BNK-${bt.id}`,
        category: "Maker-Checker Violation",
        severity: "CRITICAL",
        title: `Self-Approved Bank Transaction (${bt.transactionNo || bt.id})`,
        description: `Creator ${bt.createdBy} also appears as approver.`,
        sourceCollection: "bankTransactions",
        sourceRecordId: bt.id,
        project: safeString(bt.project, "General"),
        amountInvolved: Number(bt.amount || 0),
        makerUid: bt.createdById,
        checkerUid: (bt as any).approvedById,
      });
    }
  });

  // 5. After-Hours / Weekend Manual Journal Entries & Unbalanced Journals
  (params.journalEntries || []).forEach((je) => {
    if (Math.abs(Number(je.totalDebit || 0) - Number(je.totalCredit || 0)) > 0.01 || !je.isBalanced) {
      anomalies.push({
        id: `ANOM-UNBAL-${je.id}`,
        category: "Unbalanced or Unverified Posting",
        severity: "CRITICAL",
        title: `Unbalanced Journal Voucher ${je.journalNo}`,
        description: `Debits (${je.totalDebit}) do not equal Credits (${je.totalCredit}).`,
        sourceCollection: "journalEntries",
        sourceRecordId: je.id,
        project: safeString(je.project, "General"),
        amountInvolved: Math.max(Number(je.totalDebit || 0), Number(je.totalCredit || 0)),
      });
    }
    if (je.entryType === "Standard" && je.createdAt && je.createdAt.includes("T")) {
      const d = new Date(je.createdAt);
      const hr = d.getUTCHours();
      const day = d.getUTCDay();
      if (!isNaN(hr) && (hr < 5 || hr >= 21 || day === 0)) {
        anomalies.push({
          id: `ANOM-AHR-${je.id}`,
          category: "After-Hours / Weekend Posting",
          severity: "MEDIUM",
          title: `Off-Hours Manual Journal Entry (${je.journalNo})`,
          description: `Manual voucher created at ${je.createdAt} by ${je.preparedBy}.`,
          sourceCollection: "journalEntries",
          sourceRecordId: je.id,
          project: safeString(je.project, "General"),
          amountInvolved: Number(je.totalDebit || 0),
        });
      }
    }
  });

  // 6. Petty Cash Unsupported Expenses & Reconciliations Shortages
  (params.pettyCashTransactions || []).forEach((ptx) => {
    if (ptx.txType === "Expense" && ptx.status !== "Rejected" && !ptx.hasValidReceipt) {
      anomalies.push({
        id: `ANOM-PC-NORCP-${ptx.id}`,
        category: "Unsupported Petty Cash Expense",
        severity: "MEDIUM",
        title: `Petty Cash Expense Without Receipt (${ptx.voucherNo})`,
        description: `${ptx.fundName}: ${ptx.description} (${ptx.amount.toLocaleString()} ETB) has no receipt reference.`,
        sourceCollection: "pettyCashTransactions",
        sourceRecordId: ptx.id,
        project: safeString(ptx.project, "General"),
        amountInvolved: Number(ptx.amount || 0),
      });
    }
  });

  (params.pettyCashReconciliations || []).forEach((rec) => {
    if (rec.varianceClassification !== "Balanced") {
      anomalies.push({
        id: `ANOM-PC-VAR-${rec.id}`,
        category: "Petty Cash Shortage / Excess",
        severity: Math.abs(rec.varianceAmount) > 5000 ? "HIGH" : "MEDIUM",
        title: `${rec.varianceClassification} in ${rec.fundName}`,
        description: `Physical count variance of ${rec.varianceAmount.toLocaleString()} ETB recorded by ${rec.reconciledBy}.`,
        sourceCollection: "pettyCashReconciliations",
        sourceRecordId: rec.id,
        project: safeString(rec.project, "General"),
        amountInvolved: Math.abs(Number(rec.varianceAmount || 0)),
      });
    }
  });

  // 7. Payroll Paid With Unapproved Attendance
  const unapprovedAttendanceCount = (params.attendance || []).filter(
    (a) => (a as any).approvalStatus && (a as any).approvalStatus !== "Approved"
  ).length;
  if (unapprovedAttendanceCount > 0 && (params.hrmPayrollRuns || []).some((r) => r.workflowStage === "Paid")) {
    anomalies.push({
      id: `ANOM-ATT-PAY-${unapprovedAttendanceCount}`,
      category: "Unbalanced or Unverified Posting",
      severity: "MEDIUM",
      title: `${unapprovedAttendanceCount} Attendance Logs Pending HR Manager Final Approval`,
      description: `Ensure all daily attendance records are finalized by HR Manager before payroll disbursement.`,
      sourceCollection: "attendance",
      sourceRecordId: "ATTENDANCE-QUEUE",
      project: "All Sites",
      amountInvolved: 0,
    });
  }

  // 8. Budget Overruns
  (params.projectBudgetPlans || []).forEach((plan) => {
    const budget = Number(plan.approvedProjectBudget || plan.originalApprovedBudget || 0);
    const spent = Number((plan as any).actualSpentAmount || (plan as any).actualSpent || 0);
    if (budget > 0 && (spent / budget) * 100 > overrunPct) {
      anomalies.push({
        id: `ANOM-BGT-${plan.id}`,
        category: "Budget Overrun Anomaly",
        severity: "HIGH",
        title: `Budget Overrun on ${plan.projectName}`,
        description: `Actual spending exceeds ${overrunPct}% threshold of approved project budget.`,
        sourceCollection: "projectBudgetPlans",
        sourceRecordId: plan.id,
        project: plan.projectName,
        amountInvolved: round2(spent - budget),
      });
    }
  });

  // 9. Counterparty Credit Limit Breaches
  if ((params.creditBreachesCount || 0) > 0) {
    anomalies.push({
      id: `ANOM-CREDIT-BREACH-${params.creditBreachesCount}`,
      category: "Credit Limit Breach",
      severity: "HIGH",
      title: `${params.creditBreachesCount} Counterparty Credit Limit Breach(es)`,
      description: `${params.creditBreachesCount} client or supplier account(s) have exceeded approved ETB credit exposure limits.`,
      sourceCollection: "creditProfiles",
      sourceRecordId: "CREDIT-LIMIT-SUMMARY",
      project: "Corporate Credit Control",
      amountInvolved: 0,
    });
  }

  return anomalies;
}

export interface ProjectProfitabilityRow {
  project: string;
  revenue: number;
  expenses: number;
  budget: number;
  netProfit: number;
  marginPct: number;
  budgetUtilizationPct: number;
}

export interface ExecutiveFinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashAndBankBalance: number;
  pettyCashBalance: number;
  fixedAssetsNbv: number;
  totalLoansOutstanding: number;
  totalTaxLiabilities: number;
  workingCapital: number;
  ratios: {
    currentRatio: number | null;
    quickRatio: number | null;
    debtToEquity: number | null;
    netProfitMarginPct: number | null;
    returnOnAssetsPct: number | null;
    budgetUtilizationPct: number | null;
    arCollectionRatePct: number | null;
    apPaymentRatePct: number | null;
  };
  projectProfitability: ProjectProfitabilityRow[];
}

export function computeExecutiveFinancialOverview(params: {
  financeState: ComputedFinancialState;
  statementsState: Part7FinancialStatementsState;
  fixedAssetsState: FixedAssetsDashboardState;
  taxState: TaxComplianceDashboardState;
  loanState: LoanCreditDashboardState;
  pettyCashState: PettyCashControlState;
  projectsEvm: Array<{ name: string; budget: number; actualCost: number }>;
}): ExecutiveFinancialOverview {
  const { financeState, statementsState, fixedAssetsState, taxState, loanState, pettyCashState } = params;
  const bs = statementsState.balanceSheet;
  const is = statementsState.incomeStatement;

  const totalRevenue = is.totalRevenue > 0 ? is.totalRevenue : financeState.metrics.actualRevenue;
  const totalExpenses = is.totalExpenses > 0 ? is.totalExpenses : financeState.metrics.actualExpenses;
  const netProfit = is.totalRevenue > 0 || is.totalExpenses > 0 ? is.netProfitLoss : financeState.metrics.actualProfitOrLoss;

  const totalAssets = bs.totalAssets;
  const totalLiabilities = bs.totalLiabilities;
  const totalEquity = bs.totalEquity;

  const fixedAssetsNbv =
    fixedAssetsState.kpis.totalNetBookValue > 0
      ? fixedAssetsState.kpis.totalNetBookValue
      : Math.max(0, bs.totalNonCurrentAssets);
  const pettyCashBalance = pettyCashState.kpis.totalPettyCashBalance;
  const cashAndBankBalance = round2(financeState.metrics.availableCashBalance + financeState.metrics.totalBankBalance);
  const totalLoansOutstanding = loanState.kpis.totalOutstandingPrincipal;
  const totalTaxLiabilities = taxState.kpis.totalUnpaidTaxLiability;

  const currentAssets = bs.totalCurrentAssets > 0 ? bs.totalCurrentAssets : round2(cashAndBankBalance + pettyCashBalance + financeState.metrics.outstandingReceivables);
  const currentLiabilities = bs.totalCurrentLiabilities > 0 ? bs.totalCurrentLiabilities : round2(financeState.metrics.outstandingPayables + totalTaxLiabilities);
  const workingCapital = round2(currentAssets - currentLiabilities);

  const inventoryVal =
    statementsState.trialBalance.rows.find((r) => r.accountCode === "1210")?.netBalance || 0;
  const quickAssets = round2(Math.max(0, currentAssets - inventoryVal));

  const currentRatio = currentLiabilities > 0 ? round2(currentAssets / currentLiabilities) : null;
  const quickRatio = currentLiabilities > 0 ? round2(quickAssets / currentLiabilities) : null;
  const debtToEquity = totalEquity > 0 ? round2(totalLiabilities / totalEquity) : null;
  const netProfitMarginPct = totalRevenue > 0 ? round2((netProfit / totalRevenue) * 100) : null;
  const returnOnAssetsPct = totalAssets > 0 ? round2((netProfit / totalAssets) * 100) : null;
  const budgetUtilizationPct =
    financeState.metrics.totalBudgetAllocated > 0
      ? round2(financeState.metrics.budgetUtilizationPct)
      : null;

  const arTotalBilled = statementsState.arReport.totalBilled;
  const arCollectionRatePct =
    arTotalBilled > 0 ? round2((statementsState.arReport.totalCollected / arTotalBilled) * 100) : null;

  const apTotalBilled = statementsState.apReport.totalBilled;
  const apPaymentRatePct =
    apTotalBilled > 0 ? round2((statementsState.apReport.totalPaid / apTotalBilled) * 100) : null;

  // Project-by-project profitability across invoices, expenses, budgets
  const projMap = new Map<string, { rev: number; exp: number; bgt: number }>();
  const touch = (name: string) => {
    const k = safeString(name, "Head Office");
    if (!projMap.has(k)) projMap.set(k, { rev: 0, exp: 0, bgt: 0 });
    return projMap.get(k)!;
  };
  (financeState.scopedInvoices || []).forEach((i) => {
    touch(i.project).rev += Number(i.amount || 0);
  });
  (financeState.scopedExpenses || []).forEach((e) => {
    touch(e.project).exp += Number(e.amount || 0);
  });
  (financeState.scopedBudgets || []).forEach((b) => {
    touch(b.project).bgt += Number(b.allocated || 0);
  });
  (params.projectsEvm || []).forEach((p) => {
    const row = touch(p.name);
    if (row.bgt === 0 && p.budget > 0) row.bgt = p.budget;
    if (row.exp === 0 && p.actualCost > 0) row.exp = p.actualCost;
  });

  const projectProfitability: ProjectProfitabilityRow[] = Array.from(projMap.entries())
    .map(([project, v]) => {
      const revenue = round2(v.rev);
      const expenses = round2(v.exp);
      const budget = round2(v.bgt);
      const net = round2(revenue - expenses);
      return {
        project,
        revenue,
        expenses,
        budget,
        netProfit: net,
        marginPct: revenue > 0 ? round2((net / revenue) * 100) : 0,
        budgetUtilizationPct: budget > 0 ? round2((expenses / budget) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue + b.expenses - (a.revenue + a.expenses));

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    totalAssets,
    totalLiabilities,
    totalEquity,
    accountsReceivable: financeState.metrics.outstandingReceivables,
    accountsPayable: financeState.metrics.outstandingPayables,
    cashAndBankBalance,
    pettyCashBalance,
    fixedAssetsNbv,
    totalLoansOutstanding,
    totalTaxLiabilities,
    workingCapital,
    ratios: {
      currentRatio,
      quickRatio,
      debtToEquity,
      netProfitMarginPct,
      returnOnAssetsPct,
      budgetUtilizationPct,
      arCollectionRatePct,
      apPaymentRatePct,
    },
    projectProfitability,
  };
}

export function exportExecutiveFinancialPacketToExcel(params: {
  companyName: string;
  overview: ExecutiveFinancialOverview;
  fixedAssets: FixedAssetsDashboardState;
  tax: TaxComplianceDashboardState;
  loans: LoanCreditDashboardState;
  pettyCash: PettyCashControlState;
  anomalies: DetectedAnomalyItem[];
}): void {
  const wb = XLSX.utils.book_new();
  const kpiRows = [
    { Metric: "Company", Value: params.companyName },
    { Metric: "Total Revenue (ETB)", Value: params.overview.totalRevenue },
    { Metric: "Total Expenses (ETB)", Value: params.overview.totalExpenses },
    { Metric: "Net Profit / Loss (ETB)", Value: params.overview.netProfit },
    { Metric: "Total Assets (ETB)", Value: params.overview.totalAssets },
    { Metric: "Total Liabilities (ETB)", Value: params.overview.totalLiabilities },
    { Metric: "Total Equity (ETB)", Value: params.overview.totalEquity },
    { Metric: "Fixed Assets NBV (ETB)", Value: params.overview.fixedAssetsNbv },
    { Metric: "Cash & Bank Balances (ETB)", Value: params.overview.cashAndBankBalance },
    { Metric: "Petty Cash Funds (ETB)", Value: params.overview.pettyCashBalance },
    { Metric: "Accounts Receivable (ETB)", Value: params.overview.accountsReceivable },
    { Metric: "Accounts Payable (ETB)", Value: params.overview.accountsPayable },
    { Metric: "Loan Balances Outstanding (ETB)", Value: params.overview.totalLoansOutstanding },
    { Metric: "Net Tax Liabilities (ETB)", Value: params.overview.totalTaxLiabilities },
    { Metric: "Working Capital (ETB)", Value: params.overview.workingCapital },
    { Metric: "Current Ratio", Value: params.overview.ratios.currentRatio ?? "N/A" },
    { Metric: "Quick Ratio", Value: params.overview.ratios.quickRatio ?? "N/A" },
    { Metric: "Debt-to-Equity Ratio", Value: params.overview.ratios.debtToEquity ?? "N/A" },
    { Metric: "Net Profit Margin (%)", Value: params.overview.ratios.netProfitMarginPct ?? "N/A" },
    { Metric: "Return on Assets ROA (%)", Value: params.overview.ratios.returnOnAssetsPct ?? "N/A" },
    { Metric: "Budget Utilization (%)", Value: params.overview.ratios.budgetUtilizationPct ?? "N/A" },
    { Metric: "AR Collection Rate (%)", Value: params.overview.ratios.arCollectionRatePct ?? "N/A" },
    { Metric: "AP Payment Rate (%)", Value: params.overview.ratios.apPaymentRatePct ?? "N/A" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), "Executive KPIs & Ratios");

  if (params.overview.projectProfitability.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(params.overview.projectProfitability),
      "Project Profitability"
    );
  }
  if (params.fixedAssets.assets.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        params.fixedAssets.assets.map((a) => ({
          Code: a.assetCode,
          Name: a.assetName,
          Category: a.category,
          Project: a.project,
          Method: a.depreciationMethod,
          Cost: a.acquisitionCost,
          AccumDep: a.accumulatedDepreciation,
          NBV: a.netBookValue,
          Status: a.status,
        }))
      ),
      "Fixed Assets"
    );
  }
  if (params.loans.loans.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        params.loans.loans.map((l) => ({
          FacilityNo: l.facilityNo,
          Lender: l.lenderName,
          Type: l.facilityType,
          Principal: l.principalAmount,
          Outstanding: l.outstandingPrincipal,
          InterestRatePct: l.annualInterestRatePct,
          Status: l.status,
        }))
      ),
      "Loans & Financing"
    );
  }
  if (params.anomalies.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(params.anomalies),
      "Audit Anomalies"
    );
  }

  XLSX.writeFile(wb, `Executive_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function logAuditFindingMutation(params: {
  anomalyCategory: AuditAnomalyCategory;
  severity: AuditFindingSeverity;
  title: string;
  description: string;
  sourceCollection: string;
  sourceRecordId: string;
  project: string;
  amountInvolved: number;
  capaAction?: string;
  assignedOwner?: string;
  dueDate?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<FinancialAuditFindingRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageAuditFindings && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Auditor, Finance Manager, or Director can log audit findings.");
  }
  const nowIso = new Date().toISOString();
  const finding: FinancialAuditFindingRecord = {
    id: `AUDF-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    findingNo: `FND-${String(Date.now()).slice(-6)}`,
    anomalyCategory: params.anomalyCategory,
    severity: params.severity,
    title: params.title.trim(),
    description: params.description.trim(),
    sourceCollection: params.sourceCollection,
    sourceRecordId: params.sourceRecordId,
    project: safeString(params.project, "Corporate"),
    amountInvolved: round2(params.amountInvolved),
    status: params.capaAction ? "CAPA Assigned" : "Open",
    capaAction: params.capaAction?.trim(),
    assignedOwner: params.assignedOwner?.trim(),
    dueDate: params.dueDate,
    detectedBy: params.actorName,
    detectedById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await DbService.saveFinancialAuditFinding(finding);
  return finding;
}

export async function updateAuditFindingCapaMutation(params: {
  finding: FinancialAuditFindingRecord;
  status: FinancialAuditFindingRecord["status"];
  capaAction?: string;
  assignedOwner?: string;
  dueDate?: string;
  resolutionNotes?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<FinancialAuditFindingRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageAuditFindings && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Cannot update financial audit findings.");
  }
  const nowIso = new Date().toISOString();
  const updated: FinancialAuditFindingRecord = {
    ...params.finding,
    status: params.status,
    capaAction: params.capaAction ?? params.finding.capaAction,
    assignedOwner: params.assignedOwner ?? params.finding.assignedOwner,
    dueDate: params.dueDate ?? params.finding.dueDate,
    resolutionNotes: params.resolutionNotes ?? params.finding.resolutionNotes,
    resolvedBy: params.status === "Resolved" || params.status === "Dismissed" ? params.actorName : params.finding.resolvedBy,
    resolvedById: params.status === "Resolved" || params.status === "Dismissed" ? params.actorUid : params.finding.resolvedById,
    resolvedAt: params.status === "Resolved" || params.status === "Dismissed" ? nowIso : params.finding.resolvedAt,
    updatedAt: nowIso,
  };
  await DbService.saveFinancialAuditFinding(updated);
  return updated;
}
