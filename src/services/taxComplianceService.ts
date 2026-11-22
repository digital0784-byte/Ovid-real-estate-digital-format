import {
  BankTransactionRecord,
  Expense,
  FinanceTaxType,
  FinancialAccount,
  FinancialInvoiceRecord,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  HrmPayrollRunRecord,
  JournalEntryRecord,
  TaxRateConfigRecord,
  TaxReturnRecord,
  TaxTransactionRecord,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { resolveUserFinancePermissions } from "./financeService";
import { Part7FinancialStatementsState } from "./financialStatementsService";
import { assertGlPostingAllowed } from "./generalLedgerService";
import { safeString } from "../utils/formatters";

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export const ETHIOPIAN_DEFAULT_TAX_RATES: TaxRateConfigRecord[] = [
  {
    id: "TAX-CFG-VAT15",
    taxCode: "VAT-15",
    taxName: "Ethiopian Standard VAT (15%)",
    taxType: "VAT",
    ratePct: 15,
    vatCategory: "Standard Rated",
    effectiveFrom: "2020-01-01",
    coaLiabilityCode: "2031",
    coaInputAssetCode: "1140",
    isActive: true,
    notes: "Standard Ethiopian Value Added Tax per Proclamation No. 1341/2024.",
    createdBy: "System Statutory Config",
    createdById: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "TAX-CFG-VAT0",
    taxCode: "VAT-0",
    taxName: "Zero-Rated Construction / Export VAT (0%)",
    taxType: "VAT",
    ratePct: 0,
    vatCategory: "Zero-Rated",
    effectiveFrom: "2020-01-01",
    coaLiabilityCode: "2031",
    coaInputAssetCode: "1140",
    isActive: true,
    createdBy: "System Statutory Config",
    createdById: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "TAX-CFG-WHT2",
    taxCode: "WHT-2",
    taxName: "Withholding Tax on Suppliers & Subcontractors (2%)",
    taxType: "WHT",
    ratePct: 2,
    effectiveFrom: "2020-01-01",
    coaLiabilityCode: "2032",
    isActive: true,
    notes: "Applicable on local supply of goods/services above ETB threshold.",
    createdBy: "System Statutory Config",
    createdById: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "TAX-CFG-CIT30",
    taxCode: "CIT-30",
    taxName: "Corporate Business Income Tax (30%)",
    taxType: "CIT",
    ratePct: 30,
    effectiveFrom: "2020-01-01",
    coaLiabilityCode: "2033",
    isActive: true,
    notes: "Standard corporate net profit income tax rate.",
    createdBy: "System Statutory Config",
    createdById: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "TAX-CFG-PAYROLL",
    taxCode: "PAYROLL-ERCA",
    taxName: "Ethiopian Progressive Payroll Income Tax & Pension (7%/11%)",
    taxType: "PayrollTax",
    ratePct: 0,
    effectiveFrom: "2020-01-01",
    coaLiabilityCode: "2030",
    isActive: true,
    notes: "Progressive Employment Income Tax (0%-35%) + 7% employee / 11% employer pension.",
    createdBy: "System Statutory Config",
    createdById: "SYSTEM",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export function resolveEffectiveTaxRate(
  configs: TaxRateConfigRecord[],
  taxType: FinanceTaxType,
  transactionDate: string,
  taxCode?: string
): TaxRateConfigRecord | undefined {
  const merged = [...ETHIOPIAN_DEFAULT_TAX_RATES];
  (configs || []).forEach((c) => {
    const idx = merged.findIndex((m) => m.id === c.id || m.taxCode === c.taxCode);
    if (idx >= 0) merged[idx] = c;
    else merged.push(c);
  });
  const dt = transactionDate.slice(0, 10);
  const matching = merged
    .filter(
      (c) =>
        c.isActive &&
        c.taxType === taxType &&
        (!taxCode || c.taxCode === taxCode) &&
        c.effectiveFrom <= dt &&
        (!c.effectiveTo || c.effectiveTo >= dt)
    )
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return matching[0];
}

export function computeMonthlyFilingDeadline(periodMonth: string): string {
  const [yStr, mStr] = periodMonth.split("-");
  const y = Number(yStr || 2026);
  const m = Number(mStr || 1);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-28`;
}

export interface TaxComplianceDashboardState {
  activeRates: TaxRateConfigRecord[];
  autoDerivedTransactions: TaxTransactionRecord[];
  allTaxTransactions: TaxTransactionRecord[];
  returns: TaxReturnRecord[];
  upcomingDeadlines: Array<{
    taxType: FinanceTaxType;
    periodMonth: string;
    deadline: string;
    estimatedLiability: number;
    status: string;
    isOverdue: boolean;
  }>;
  kpis: {
    outputVatTotal: number;
    inputVatCreditTotal: number;
    netVatPayable: number;
    withholdingTaxPayable: number;
    payrollTaxAndPensionTotal: number;
    estimatedCorporateIncomeTax: number;
    totalUnpaidTaxLiability: number;
    totalTaxPaidToDate: number;
    overdueReturnsCount: number;
  };
}

export function computeTaxComplianceState(params: {
  taxRates: TaxRateConfigRecord[];
  taxTransactions: TaxTransactionRecord[];
  taxReturns: TaxReturnRecord[];
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  hrmPayrollRuns: HrmPayrollRunRecord[];
  statementsState?: Part7FinancialStatementsState;
  referenceToday?: string;
}): TaxComplianceDashboardState {
  const today = params.referenceToday || new Date().toISOString().slice(0, 10);
  const mergedRateMap = new Map<string, TaxRateConfigRecord>();
  ETHIOPIAN_DEFAULT_TAX_RATES.forEach((r) => mergedRateMap.set(r.taxCode, r));
  (params.taxRates || []).forEach((r) => mergedRateMap.set(r.taxCode, r));
  const activeRates = Array.from(mergedRateMap.values());

  const autoDerived: TaxTransactionRecord[] = [];
  const manualIds = new Set((params.taxTransactions || []).map((t) => `${t.sourceModule}:${t.sourceRecordId}:${t.taxType}`));

  // Derive Output VAT from non-rejected invoices when tax fields or VAT config applies
  (params.invoices || []).forEach((inv) => {
    const st = String(inv.status || "").toLowerCase();
    if (st === "rejected" || st === "cancelled" || st === "draft") return;
    const dt = safeString(inv.date, today).slice(0, 10);
    const key = `Accounts Receivable:${inv.id}:VAT`;
    if (manualIds.has(key)) return;
    const vatRate =
      typeof (inv as any).vatRatePct === "number"
        ? (inv as any).vatRatePct
        : resolveEffectiveTaxRate(activeRates, "VAT", dt, "VAT-15")?.ratePct ?? 15;
    const explicitTax = Number((inv as any).vatAmount ?? (inv as any).taxAmount ?? 0);
    const gross = Number(inv.amount || 0);
    if (gross <= 0) return;
    // Standard VAT inclusive extraction only if explicit tax field > 0, or 15% of net if tax-inclusive flag
    const vatAmt =
      explicitTax > 0
        ? round2(explicitTax)
        : (inv as any).isVatApplicable === false
        ? 0
        : round2((gross * vatRate) / (100 + vatRate));
    if (vatAmt <= 0) return;
    autoDerived.push({
      id: `TAX-AR-${inv.id}`,
      taxRef: inv.invoiceNumber || inv.id,
      taxType: "VAT",
      direction: "Output Liability",
      transactionDate: dt,
      periodMonth: dt.slice(0, 7),
      project: safeString(inv.project, "General"),
      department: safeString((inv as any).department, "Finance"),
      counterparty: safeString(inv.clientName || (inv as any).client, "Client"),
      sourceModule: "Accounts Receivable",
      sourceRecordId: inv.id,
      baseAmount: round2(gross - vatAmt),
      ratePct: vatRate,
      taxAmount: vatAmt,
      status: "Accrued",
      createdAt: dt,
    });
  });

  // Derive Input VAT & WHT from approved/paid expenses
  (params.expenses || []).forEach((exp) => {
    const st = String(exp.status || "").toLowerCase();
    if (st === "rejected" || st === "cancelled" || st === "draft") return;
    const dt = safeString(exp.date, today).slice(0, 10);
    const amt = Number(exp.amount || 0);
    if (amt <= 0) return;

    const explicitVat = Number((exp as any).vatAmount || 0);
    if (explicitVat > 0 && !manualIds.has(`Accounts Payable:${exp.id}:VAT`)) {
      autoDerived.push({
        id: `TAX-AP-VAT-${exp.id}`,
        taxRef: exp.billNumber || exp.id,
        taxType: "VAT",
        direction: "Input Recoverable",
        transactionDate: dt,
        periodMonth: dt.slice(0, 7),
        project: safeString(exp.project, "General"),
        department: safeString((exp as any).department, "Operations"),
        counterparty: safeString((exp as any).supplier || (exp as any).vendor, "Vendor"),
        sourceModule: "Accounts Payable",
        sourceRecordId: exp.id,
        baseAmount: round2(amt - explicitVat),
        ratePct: 15,
        taxAmount: round2(explicitVat),
        status: "Accrued",
        createdAt: dt,
      });
    }

    const explicitWht = Number((exp as any).withholdingTaxAmount || 0);
    const whtCfg = resolveEffectiveTaxRate(activeRates, "WHT", dt, "WHT-2");
    const whtAmt =
      explicitWht > 0
        ? round2(explicitWht)
        : amt >= 10000 && (exp as any).applyWht !== false && whtCfg
        ? round2((amt * whtCfg.ratePct) / 100)
        : 0;
    if (whtAmt > 0 && !manualIds.has(`Accounts Payable:${exp.id}:WHT`)) {
      autoDerived.push({
        id: `TAX-AP-WHT-${exp.id}`,
        taxRef: exp.billNumber || exp.id,
        taxType: "WHT",
        direction: "Withheld Payable",
        transactionDate: dt,
        periodMonth: dt.slice(0, 7),
        project: safeString(exp.project, "General"),
        department: safeString((exp as any).department, "Operations"),
        counterparty: safeString((exp as any).supplier || (exp as any).vendor, "Vendor"),
        sourceModule: "Accounts Payable",
        sourceRecordId: exp.id,
        baseAmount: amt,
        ratePct: whtCfg?.ratePct || 2,
        taxAmount: whtAmt,
        status: "Accrued",
        createdAt: dt,
      });
    }
  });

  // Derive Payroll Tax & Pension from HRM Payroll Runs
  (params.hrmPayrollRuns || []).forEach((run) => {
    if (run.workflowStage === "Rejected" || run.workflowStage === "Draft") return;
    const dt = safeString(run.paymentDate || run.updatedAt || today, today).slice(0, 10);
    if (run.totalIncomeTax > 0 && !manualIds.has(`HRM Payroll:${run.id}:PayrollTax`)) {
      autoDerived.push({
        id: `TAX-PAY-${run.id}`,
        taxRef: run.runNo,
        taxType: "PayrollTax",
        direction: "Withheld Payable",
        transactionDate: dt,
        periodMonth: run.payPeriod,
        project: run.projectScope,
        department: "Human Resources",
        counterparty: "Ethiopian Revenues & Customs (ERCA)",
        sourceModule: "HRM Payroll",
        sourceRecordId: run.id,
        baseAmount: run.totalGrossPay,
        ratePct: run.totalGrossPay > 0 ? round2((run.totalIncomeTax / run.totalGrossPay) * 100) : 0,
        taxAmount: round2(run.totalIncomeTax),
        status: run.workflowStage === "Paid" ? "Filed" : "Accrued",
        createdAt: dt,
      });
    }
    const pensionTotal = round2(Number(run.totalEmployeePension || 0) + Number(run.totalEmployerPension || 0));
    const basicSalaryBase = round2(
      (run.items || []).reduce((s, it) => s + Number(it.basicSalary || 0), 0) || run.totalGrossPay
    );
    if (pensionTotal > 0 && !manualIds.has(`HRM Payroll:${run.id}:Pension`)) {
      autoDerived.push({
        id: `TAX-PEN-${run.id}`,
        taxRef: run.runNo,
        taxType: "Pension",
        direction: "Withheld Payable",
        transactionDate: dt,
        periodMonth: run.payPeriod,
        project: run.projectScope,
        department: "Human Resources",
        counterparty: "Private Organizations Employees Social Security (POESSA)",
        sourceModule: "HRM Payroll",
        sourceRecordId: run.id,
        baseAmount: basicSalaryBase,
        ratePct: 18,
        taxAmount: pensionTotal,
        status: run.workflowStage === "Paid" ? "Filed" : "Accrued",
        createdAt: dt,
      });
    }
  });

  const allTaxTransactions = [...(params.taxTransactions || []), ...autoDerived].sort((a, b) =>
    b.transactionDate.localeCompare(a.transactionDate)
  );

  const outputVatTotal = round2(
    allTaxTransactions
      .filter((t) => t.taxType === "VAT" && t.direction === "Output Liability")
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0)
  );
  const inputVatCreditTotal = round2(
    allTaxTransactions
      .filter((t) => t.taxType === "VAT" && t.direction === "Input Recoverable")
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0)
  );
  const netVatPayable = round2(Math.max(0, outputVatTotal - inputVatCreditTotal));
  const withholdingTaxPayable = round2(
    allTaxTransactions
      .filter((t) => t.taxType === "WHT")
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0)
  );
  const payrollTaxAndPensionTotal = round2(
    allTaxTransactions
      .filter((t) => t.taxType === "PayrollTax" || t.taxType === "Pension")
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0)
  );

  const citCfg = resolveEffectiveTaxRate(activeRates, "CIT", today, "CIT-30");
  const netProfit = Number(params.statementsState?.incomeStatement.netProfitLoss || 0);
  const estimatedCorporateIncomeTax =
    netProfit > 0 ? round2((netProfit * (citCfg?.ratePct ?? 30)) / 100) : 0;

  const returns = [...(params.taxReturns || [])].sort((a, b) =>
    b.periodMonth.localeCompare(a.periodMonth)
  );
  const totalTaxPaidToDate = round2(
    returns.filter((r) => r.status === "Paid").reduce((s, r) => s + Number(r.netTaxPayable || 0), 0)
  );
  const overdueReturnsCount = returns.filter(
    (r) => r.status !== "Paid" && r.filingDeadline < today
  ).length;

  const grossTaxAccrued = round2(
    netVatPayable + withholdingTaxPayable + payrollTaxAndPensionTotal + estimatedCorporateIncomeTax
  );
  const totalUnpaidTaxLiability = round2(Math.max(0, grossTaxAccrued - totalTaxPaidToDate));

  const currentMonth = today.slice(0, 7);
  const upcomingDeadlines = (["VAT", "WHT", "PayrollTax", "CIT"] as FinanceTaxType[]).map((tType) => {
    const existingRet = returns.find((r) => r.taxType === tType && r.periodMonth === currentMonth);
    const deadline = existingRet?.filingDeadline || computeMonthlyFilingDeadline(currentMonth);
    const est =
      existingRet?.netTaxPayable ??
      (tType === "VAT"
        ? netVatPayable
        : tType === "WHT"
        ? withholdingTaxPayable
        : tType === "PayrollTax"
        ? payrollTaxAndPensionTotal
        : estimatedCorporateIncomeTax);
    const status = existingRet?.status || "Unprepared";
    return {
      taxType: tType,
      periodMonth: currentMonth,
      deadline,
      estimatedLiability: est,
      status,
      isOverdue: status !== "Paid" && deadline < today,
    };
  });

  return {
    activeRates,
    autoDerivedTransactions: autoDerived,
    allTaxTransactions,
    returns,
    upcomingDeadlines,
    kpis: {
      outputVatTotal,
      inputVatCreditTotal,
      netVatPayable,
      withholdingTaxPayable,
      payrollTaxAndPensionTotal,
      estimatedCorporateIncomeTax,
      totalUnpaidTaxLiability,
      totalTaxPaidToDate,
      overdueReturnsCount,
    },
  };
}

export async function saveTaxRateConfigMutation(params: {
  taxCode: string;
  taxName: string;
  taxType: FinanceTaxType;
  ratePct: number;
  vatCategory?: "Standard Rated" | "Zero-Rated" | "Exempt";
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<TaxRateConfigRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTaxCompliance && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance staff can configure tax rates.");
  }
  const nowIso = new Date().toISOString();
  const coaLiabilityCode =
    params.taxType === "VAT"
      ? "2031"
      : params.taxType === "WHT"
      ? "2032"
      : params.taxType === "CIT"
      ? "2033"
      : "2030";
  const cfg: TaxRateConfigRecord = {
    id: `TAX-CFG-${params.taxCode.trim().toUpperCase()}`,
    taxCode: params.taxCode.trim().toUpperCase(),
    taxName: params.taxName.trim(),
    taxType: params.taxType,
    ratePct: round2(Math.max(0, Math.min(100, params.ratePct))),
    vatCategory: params.vatCategory,
    effectiveFrom: params.effectiveFrom.slice(0, 10),
    effectiveTo: params.effectiveTo ? params.effectiveTo.slice(0, 10) : undefined,
    coaLiabilityCode,
    coaInputAssetCode: params.taxType === "VAT" ? "1140" : undefined,
    isActive: true,
    notes: params.notes?.trim(),
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await DbService.saveTaxRateConfig(cfg);
  return cfg;
}

export async function prepareTaxReturnMutation(params: {
  taxType: FinanceTaxType;
  periodMonth: string;
  grossTaxableBase: number;
  outputTaxTotal: number;
  inputTaxCreditTotal: number;
  notes?: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<TaxReturnRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageTaxCompliance && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Unauthorized: Only Finance staff can prepare tax returns.");
  }
  const nowIso = new Date().toISOString();
  const netTaxPayable = round2(Math.max(0, params.outputTaxTotal - params.inputTaxCreditTotal));
  const ret: TaxReturnRecord = {
    id: `TAX-RET-${params.taxType}-${params.periodMonth}`,
    returnNumber: `RET-${params.taxType.toUpperCase()}-${params.periodMonth.replace("-", "")}`,
    taxType: params.taxType,
    periodMonth: params.periodMonth,
    filingDeadline: computeMonthlyFilingDeadline(params.periodMonth),
    grossTaxableBase: round2(params.grossTaxableBase),
    outputTaxTotal: round2(params.outputTaxTotal),
    inputTaxCreditTotal: round2(params.inputTaxCreditTotal),
    netTaxPayable,
    status: "Prepared",
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    notes: params.notes?.trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await DbService.saveTaxReturn(ret);
  return ret;
}

export async function payAndFileTaxReturnMutation(params: {
  taxReturn: TaxReturnRecord;
  paymentDate: string;
  paymentAccount: FinancialAccount;
  paymentRef: string;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<TaxReturnRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Only Finance Manager or Director can approve and remit tax returns.");
  }
  if (
    params.taxReturn.preparedById &&
    params.taxReturn.preparedById === params.actorUid &&
    params.actorRole !== UserRole.SUPER_ADMIN
  ) {
    throw new Error("Maker-Checker Control: The preparer of a tax return cannot approve & remit it.");
  }

  const periodGuard = assertGlPostingAllowed({
    entryDate: params.paymentDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodGuard.allowed) throw new Error(periodGuard.reason);

  const amount = round2(Math.max(0, params.taxReturn.netTaxPayable));
  if (amount <= 0) throw new Error("Net tax payable must be greater than zero to remit.");

  const nowIso = new Date().toISOString();
  const taxLiabCode =
    params.taxReturn.taxType === "VAT"
      ? "2031"
      : params.taxReturn.taxType === "WHT"
      ? "2032"
      : params.taxReturn.taxType === "CIT"
      ? "2033"
      : "2030";
  const taxLiabName =
    params.taxReturn.taxType === "VAT"
      ? "Output VAT Payable"
      : params.taxReturn.taxType === "WHT"
      ? "Withholding Tax Payable"
      : params.taxReturn.taxType === "CIT"
      ? "Corporate Income Tax Payable"
      : "Tax & Statutory Payables";

  const jeId = `JE-TAX-${params.taxReturn.id}`;
  const je: JournalEntryRecord = {
    id: jeId,
    journalNo: `TAX-${params.taxReturn.returnNumber}`,
    entryDate: params.paymentDate.slice(0, 10),
    fiscalYear: params.paymentDate.slice(0, 4),
    periodMonth: params.paymentDate.slice(0, 7),
    project: "Corporate Treasury",
    department: "Finance",
    referenceNo: params.paymentRef || params.taxReturn.returnNumber,
    description: `Tax Remittance ${params.taxReturn.returnNumber} (${params.taxReturn.taxType} ${params.taxReturn.periodMonth})`,
    entryType: "Auto-Sync",
    sourceModule: "Tax Compliance",
    sourceRecordId: params.taxReturn.id,
    sourceKey: `TAX_PAY:${params.taxReturn.id}`,
    uniqueTransactionKey: `TAX_PAY:${params.taxReturn.id}`,
    isImmutable: true,
    lines: [
      {
        lineNo: 1,
        accountCode: taxLiabCode,
        accountName: taxLiabName,
        accountType: "Liability",
        subType: "Current Liability",
        debit: amount,
        credit: 0,
        memo: `Settlement of ${params.taxReturn.taxType} (${params.taxReturn.periodMonth})`,
        project: "Corporate Treasury",
        department: "Finance",
      },
      {
        lineNo: 2,
        accountCode: params.paymentAccount.accountType === "Cash" ? "1010" : "1020",
        accountName: params.paymentAccount.accountName,
        accountType: "Asset",
        subType: "Current Asset",
        debit: 0,
        credit: amount,
        memo: `Bank remittance ref ${params.paymentRef}`,
        project: "Corporate Treasury",
        department: "Finance",
      },
    ],
    totalDebit: amount,
    totalCredit: amount,
    isBalanced: true,
    status: "Posted",
    preparedBy: params.taxReturn.preparedBy,
    preparedById: params.taxReturn.preparedById,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const bankTx: BankTransactionRecord | undefined =
    params.paymentAccount.accountType === "Bank"
      ? {
          id: `BTX-TAX-${params.taxReturn.id}`,
          transactionNo: `BNK-TAX-${params.taxReturn.returnNumber}`,
          transactionDate: params.paymentDate.slice(0, 10),
          valueDate: params.paymentDate.slice(0, 10),
          transactionType: "Tax Remittances",
          direction: "Debit",
          accountId: params.paymentAccount.id,
          accountName: params.paymentAccount.accountName,
          accountNumber: params.paymentAccount.accountNumber,
          amount,
          currency: params.paymentAccount.currency || "ETB",
          project: "Corporate Treasury",
          department: "Finance",
          counterparty: "Ethiopian Revenues & Customs Authority (ERCA)",
          referenceNo: params.paymentRef || params.taxReturn.returnNumber,
          paymentMethod: "Bank Transfer",
          description: `Tax Payment: ${params.taxReturn.returnNumber}`,
          sourceChannel: "AP",
          linkedDocumentType: "Other",
          linkedDocumentId: params.taxReturn.id,
          linkedReferenceNo: params.taxReturn.returnNumber,
          approvalStatus: "Approved",
          reconciliationStatus: "Unreconciled",
          recordedBy: params.actorName,
          createdBy: params.taxReturn.preparedBy,
          createdById: params.taxReturn.preparedById,
          approvedBy: params.actorName,
          approvedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
        }
      : undefined;

  const paidReturn: TaxReturnRecord = {
    ...params.taxReturn,
    status: "Paid",
    approvedBy: params.actorName,
    approvedById: params.actorUid,
    filedAt: nowIso,
    paidAt: params.paymentDate.slice(0, 10),
    paymentAccountId: params.paymentAccount.id,
    paymentRef: params.paymentRef,
    glJournalId: je.id,
    updatedAt: nowIso,
  };

  await DbService.applyTaxReturnPaymentAtomic({
    taxReturn: paidReturn,
    journalEntry: je,
    paymentAccount: params.paymentAccount,
    bankTransaction: bankTx,
  });

  return paidReturn;
}
