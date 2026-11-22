import * as XLSX from "xlsx";
import {
  ChartAccountRecord,
  ChartAccountType,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  JournalEntryLine,
  JournalEntryRecord,
  Part8LedgerReportTypeId,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { resolveUserFinancePermissions } from "./financeService";
import {
  GeneralLedgerRow,
  Part7FinancialStatementsState,
  SYSTEM_CHART_OF_ACCOUNTS,
  TrialBalanceRow,
  validateJournalEntryLines,
} from "./financialStatementsService";
import { safeString } from "../utils/formatters";

export type Part8CoaCategoryGroup =
  | "Assets"
  | "Liabilities"
  | "Equity"
  | "Revenue"
  | "Direct Construction Costs"
  | "Operating Expenses";

export interface Part8GlFilterState {
  startDate: string;
  endDate: string;
  accountCode: string; // "ALL" or specific code
  project: string; // "ALL" or project name
  department: string; // "ALL" or department name
  sourceModule: string; // "ALL" or module
  entryStatus: string; // "ALL" | "Draft" | "Submitted" | "Posted" | "Rejected" | "Reversed"
  searchTerm: string;
}

export interface HierarchicalCoaNode {
  account: ChartAccountRecord;
  categoryGroup: Part8CoaCategoryGroup;
  depth: number;
  ownBalance: number;
  rollupBalance: number;
  periodDebit: number;
  periodCredit: number;
  childrenCount: number;
}

export interface ProjectOrDepartmentLedgerRow {
  dimensionName: string;
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  revenueRecognized: number;
  directAndOperatingCosts: number;
}

export interface Part8GeneralLedgerState {
  coaNodes: HierarchicalCoaNode[];
  coaByCategory: Record<Part8CoaCategoryGroup, HierarchicalCoaNode[]>;
  allJournals: JournalEntryRecord[];
  filteredJournals: JournalEntryRecord[];
  filteredGlRows: GeneralLedgerRow[];
  selectedAccountLedger: {
    account: ChartAccountRecord | null;
    openingBalance: number;
    totalDebit: number;
    totalCredit: number;
    closingBalance: number;
    rows: GeneralLedgerRow[];
  };
  trialBalanceRows: TrialBalanceRow[];
  projectLedgerRows: ProjectOrDepartmentLedgerRow[];
  departmentLedgerRows: ProjectOrDepartmentLedgerRow[];
  financialYears: FinancialYearRecord[];
  availableProjects: string[];
  availableDepartments: string[];
  availableSourceModules: string[];
  kpis: {
    totalDebit: number;
    totalCredit: number;
    totalAccountBalances: number;
    pendingJournalEntries: number;
    approvedJournalEntries: number;
    reversedJournalEntries: number;
    unbalancedEntries: number;
    closedFinancialPeriods: number;
    closedFinancialYears: number;
    activeAccountsCount: number;
  };
}

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export const mapAccountTypeToPart8Category = (t: ChartAccountType): Part8CoaCategoryGroup => {
  switch (t) {
    case "Asset":
      return "Assets";
    case "Liability":
      return "Liabilities";
    case "Equity":
      return "Equity";
    case "Revenue":
      return "Revenue";
    case "Cost of Construction":
      return "Direct Construction Costs";
    case "Operating Expense":
    case "Administrative Expense":
    default:
      return "Operating Expenses";
  }
};

export const mapPart8CategoryToAccountType = (cat: Part8CoaCategoryGroup): ChartAccountType => {
  switch (cat) {
    case "Assets":
      return "Asset";
    case "Liabilities":
      return "Liability";
    case "Equity":
      return "Equity";
    case "Revenue":
      return "Revenue";
    case "Direct Construction Costs":
      return "Cost of Construction";
    case "Operating Expenses":
    default:
      return "Operating Expense";
  }
};

export function validateChartAccountHierarchy(params: {
  accountCode: string;
  parentAccountCode?: string;
  allAccounts: ChartAccountRecord[];
}): { valid: boolean; error?: string } {
  const code = params.accountCode.trim();
  const parent = (params.parentAccountCode || "").trim();
  if (!code) return { valid: false, error: "Account code is required." };
  if (!parent) return { valid: true };
  if (code === parent) {
    return { valid: false, error: "An account cannot be its own parent account." };
  }
  const byCode = new Map(params.allAccounts.map((a) => [a.accountCode, a]));
  if (!byCode.has(parent)) {
    return { valid: false, error: `Parent account code ${parent} does not exist.` };
  }
  // Cycle detection
  const visited = new Set<string>([code]);
  let cursor: string | undefined = parent;
  while (cursor) {
    if (visited.has(cursor)) {
      return { valid: false, error: "Circular parent-child hierarchy detected." };
    }
    visited.add(cursor);
    cursor = byCode.get(cursor)?.parentAccountCode;
  }
  return { valid: true };
}

export function assertGlPostingAllowed(params: {
  entryDate: string;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
}): { allowed: boolean; reason?: string } {
  const dt = params.entryDate.slice(0, 10);
  if (!dt) return { allowed: false, reason: "Transaction date is required." };

  const closedYear = params.financialYears.find(
    (fy) => fy.status === "Closed" && dt >= fy.startDate.slice(0, 10) && dt <= fy.endDate.slice(0, 10)
  );
  if (closedYear) {
    return {
      allowed: false,
      reason: `Financial Year ${closedYear.yearCode} (${closedYear.startDate} to ${closedYear.endDate}) is Closed. Reopen with executive approval before posting.`,
    };
  }

  const closedPeriod = params.periods.find(
    (p) => p.status === "Closed" && dt >= p.startDate.slice(0, 10) && dt <= p.endDate.slice(0, 10)
  );
  if (closedPeriod) {
    return {
      allowed: false,
      reason: `Accounting Period "${closedPeriod.periodLabel}" is Closed. Reopen with Finance Manager / Director approval before posting.`,
    };
  }

  return { allowed: true };
}

export function checkDuplicateJournalReference(params: {
  referenceNo?: string;
  uniqueTransactionKey?: string;
  sourceKey?: string;
  existingEntries: JournalEntryRecord[];
  ignoreEntryId?: string;
}): { isDuplicate: boolean; conflictingJournalNo?: string } {
  const uniq = (params.uniqueTransactionKey || "").trim();
  const srcKey = (params.sourceKey || "").trim();
  const hit = params.existingEntries.find((je) => {
    if (params.ignoreEntryId && je.id === params.ignoreEntryId) return false;
    if (je.status === "Rejected" || je.status === "Reversed") return false;
    if (uniq && je.uniqueTransactionKey && je.uniqueTransactionKey === uniq) return true;
    if (srcKey && je.sourceKey && je.sourceKey === srcKey) return true;
    return false;
  });
  return hit
    ? { isDuplicate: true, conflictingJournalNo: hit.journalNo }
    : { isDuplicate: false };
}

export function buildDefaultFinancialYears(referenceYear?: number): FinancialYearRecord[] {
  const yr = referenceYear || new Date().getFullYear();
  const nowIso = new Date().toISOString();
  return [yr - 1, yr].map((y) => ({
    id: `FY-${y}`,
    yearCode: `FY${y}`,
    yearLabel: `Fiscal Year ${y} (Jan 1 – Dec 31)`,
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
    status: "Open" as const,
    notes: "Calendar Fiscal Year",
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
}

export function computePart8GeneralLedgerState(params: {
  statementsState: Part7FinancialStatementsState;
  rawJournalEntries: JournalEntryRecord[];
  financialPeriods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  filterState: Part8GlFilterState;
}): Part8GeneralLedgerState {
  const { statementsState, rawJournalEntries, financialPeriods, filterState } = params;
  const chartAccounts = statementsState.chartOfAccounts.length
    ? statementsState.chartOfAccounts
    : SYSTEM_CHART_OF_ACCOUNTS;

  // Merge raw persisted journals (all statuses) + auto-synced Part 7 posted journals (deduplicated)
  const rawIds = new Set(rawJournalEntries.map((j) => j.id));
  const rawSourceKeys = new Set(rawJournalEntries.map((j) => j.sourceKey).filter(Boolean));
  const combinedJournals: JournalEntryRecord[] = [
    ...rawJournalEntries,
    ...(statementsState.allPostedEntries || []).filter(
      (sj) => !rawIds.has(sj.id) && (!sj.sourceKey || !rawSourceKeys.has(sj.sourceKey))
    ),
  ].sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.journalNo.localeCompare(a.journalNo));

  const projectSet = new Set<string>(statementsState.filterOptions?.projects || []);
  const deptSet = new Set<string>(statementsState.filterOptions?.departments || []);
  const moduleSet = new Set<string>();

  combinedJournals.forEach((j) => {
    if (j.project) projectSet.add(j.project);
    if (j.department) deptSet.add(j.department);
    if (j.sourceModule) moduleSet.add(j.sourceModule);
  });

  const searchQ = filterState.searchTerm.trim().toLowerCase();

  const matchesFilter = (entry: {
    entryDate?: string;
    project?: string;
    department?: string;
    sourceModule?: string;
    status?: string;
    accountCode?: string;
    lines?: JournalEntryLine[];
    journalNo?: string;
    referenceNo?: string;
    description?: string;
  }) => {
    const dt = (entry.entryDate || "").slice(0, 10);
    if (filterState.startDate && dt < filterState.startDate) return false;
    if (filterState.endDate && dt > filterState.endDate) return false;
    if (filterState.project !== "ALL" && entry.project !== filterState.project) return false;
    if (filterState.department !== "ALL" && entry.department !== filterState.department) return false;
    if (filterState.sourceModule !== "ALL" && entry.sourceModule !== filterState.sourceModule) return false;
    if (filterState.entryStatus !== "ALL" && entry.status && entry.status !== filterState.entryStatus) return false;
    if (filterState.accountCode !== "ALL") {
      if (entry.accountCode) {
        if (entry.accountCode !== filterState.accountCode) return false;
      } else if (entry.lines) {
        if (!entry.lines.some((l) => l.accountCode === filterState.accountCode)) return false;
      }
    }
    if (searchQ) {
      const hay = [
        entry.journalNo,
        entry.referenceNo,
        entry.description,
        entry.project,
        entry.department,
        entry.sourceModule,
        entry.accountCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(searchQ)) return false;
    }
    return true;
  };

  const filteredJournals = combinedJournals.filter((je) => matchesFilter(je));

  const filteredGlRows = statementsState.generalLedger.filter((row) =>
    matchesFilter({
      entryDate: row.entryDate,
      project: row.project,
      department: row.department,
      sourceModule: row.sourceModule,
      accountCode: row.accountCode,
      journalNo: row.journalNo,
      referenceNo: row.referenceNo,
      description: row.description,
    })
  );

  // Trial Balance lookup by accountCode
  const tbByCode = new Map<string, TrialBalanceRow>(
    (statementsState.trialBalance?.rows || []).map((r) => [r.accountCode, r])
  );

  // Build hierarchical COA nodes & rollups
  const childrenMap = new Map<string, ChartAccountRecord[]>();
  chartAccounts.forEach((acc) => {
    if (acc.parentAccountCode) {
      const arr = childrenMap.get(acc.parentAccountCode) || [];
      arr.push(acc);
      childrenMap.set(acc.parentAccountCode, arr);
    }
  });

  const coaByCode = new Map(chartAccounts.map((a) => [a.accountCode, a]));
  const getDepth = (acc: ChartAccountRecord): number => {
    let depth = 0;
    let cur = acc.parentAccountCode;
    const seen = new Set<string>([acc.accountCode]);
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      depth += 1;
      cur = coaByCode.get(cur)?.parentAccountCode;
    }
    return depth;
  };

  const getRollupBalance = (code: string, visited = new Set<string>()): number => {
    if (visited.has(code)) return 0;
    visited.add(code);
    const tb = tbByCode.get(code);
    const own = tb ? tb.netBalance : Number(coaByCode.get(code)?.openingBalance || 0);
    const kids = childrenMap.get(code) || [];
    const childSum = kids.reduce((sum, kid) => sum + getRollupBalance(kid.accountCode, visited), 0);
    return round2(own + childSum);
  };

  const coaNodes: HierarchicalCoaNode[] = [...chartAccounts]
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))
    .map((acc) => {
      const tb = tbByCode.get(acc.accountCode);
      const ownBalance = tb ? tb.netBalance : round2(acc.openingBalance || 0);
      return {
        account: acc,
        categoryGroup: mapAccountTypeToPart8Category(acc.accountType),
        depth: getDepth(acc),
        ownBalance,
        rollupBalance: getRollupBalance(acc.accountCode),
        periodDebit: tb ? tb.periodDebit : 0,
        periodCredit: tb ? tb.periodCredit : 0,
        childrenCount: (childrenMap.get(acc.accountCode) || []).length,
      };
    });

  const coaByCategory: Record<Part8CoaCategoryGroup, HierarchicalCoaNode[]> = {
    Assets: [],
    Liabilities: [],
    Equity: [],
    Revenue: [],
    "Direct Construction Costs": [],
    "Operating Expenses": [],
  };
  coaNodes.forEach((n) => {
    coaByCategory[n.categoryGroup].push(n);
  });

  // Account Ledger Report (when an account is selected, or default 1020 Main Bank)
  const targetAccountCode =
    filterState.accountCode !== "ALL"
      ? filterState.accountCode
      : chartAccounts.find((a) => a.accountCode === "1020")?.accountCode || chartAccounts[0]?.accountCode || "";
  const selectedAccount = coaByCode.get(targetAccountCode) || null;
  const selectedTb = targetAccountCode ? tbByCode.get(targetAccountCode) : undefined;
  const selectedRows = targetAccountCode
    ? statementsState.generalLedger.filter((r) => {
        if (r.accountCode !== targetAccountCode) return false;
        if (filterState.startDate && r.entryDate < filterState.startDate) return false;
        if (filterState.endDate && r.entryDate > filterState.endDate) return false;
        if (filterState.project !== "ALL" && r.project !== filterState.project) return false;
        if (filterState.department !== "ALL" && r.department !== filterState.department) return false;
        return true;
      })
    : [];
  const accOpenDr = selectedTb?.openingDebit || 0;
  const accOpenCr = selectedTb?.openingCredit || 0;
  const openingBal = selectedAccount
    ? selectedAccount.normalBalance === "Debit"
      ? round2(accOpenDr - accOpenCr + Number(selectedAccount.openingBalance || 0))
      : round2(accOpenCr - accOpenDr + Number(selectedAccount.openingBalance || 0))
    : 0;
  const selPeriodDr = round2(selectedRows.reduce((s, r) => s + r.debit, 0));
  const selPeriodCr = round2(selectedRows.reduce((s, r) => s + r.credit, 0));
  const closingBal = selectedAccount
    ? selectedAccount.normalBalance === "Debit"
      ? round2(openingBal + selPeriodDr - selPeriodCr)
      : round2(openingBal + selPeriodCr - selPeriodDr)
    : 0;

  // Project-wise & Department-wise Ledger aggregations
  const projAgg = new Map<string, ProjectOrDepartmentLedgerRow>();
  const deptAgg = new Map<string, ProjectOrDepartmentLedgerRow>();

  const accumulateDim = (
    map: Map<string, ProjectOrDepartmentLedgerRow>,
    key: string,
    row: GeneralLedgerRow
  ) => {
    const dim = safeString(key, "General");
    const prev = map.get(dim) || {
      dimensionName: dim,
      entryCount: 0,
      totalDebit: 0,
      totalCredit: 0,
      netMovement: 0,
      revenueRecognized: 0,
      directAndOperatingCosts: 0,
    };
    prev.entryCount += 1;
    prev.totalDebit = round2(prev.totalDebit + row.debit);
    prev.totalCredit = round2(prev.totalCredit + row.credit);
    prev.netMovement = round2(prev.totalDebit - prev.totalCredit);
    if (row.accountType === "Revenue") {
      prev.revenueRecognized = round2(prev.revenueRecognized + row.credit - row.debit);
    } else if (
      row.accountType === "Cost of Construction" ||
      row.accountType === "Operating Expense" ||
      row.accountType === "Administrative Expense"
    ) {
      prev.directAndOperatingCosts = round2(prev.directAndOperatingCosts + row.debit - row.credit);
    }
    map.set(dim, prev);
  };

  filteredGlRows.forEach((row) => {
    accumulateDim(projAgg, row.project || "General", row);
    accumulateDim(deptAgg, row.department || "Engineering", row);
  });

  const projectLedgerRows = Array.from(projAgg.values()).sort((a, b) => b.totalDebit - a.totalDebit);
  const departmentLedgerRows = Array.from(deptAgg.values()).sort((a, b) => b.totalDebit - a.totalDebit);

  // KPIs
  const totalDebit = round2(filteredGlRows.reduce((s, r) => s + r.debit, 0));
  const totalCredit = round2(filteredGlRows.reduce((s, r) => s + r.credit, 0));
  const totalAccountBalances = round2(
    coaNodes
      .filter((n) => n.account.accountType === "Asset" && !n.account.parentAccountCode)
      .reduce((s, n) => s + n.rollupBalance, 0)
  );
  const pendingJournalEntries = combinedJournals.filter(
    (j) => j.status === "Draft" || j.status === "Submitted"
  ).length;
  const approvedJournalEntries = combinedJournals.filter((j) => j.status === "Posted").length;
  const reversedJournalEntries = combinedJournals.filter((j) => j.status === "Reversed").length;
  const unbalancedEntries = combinedJournals.filter(
    (j) => !j.isBalanced || Math.abs(Number(j.totalDebit || 0) - Number(j.totalCredit || 0)) > 0.01
  ).length;
  const closedFinancialPeriods = financialPeriods.filter((p) => p.status === "Closed").length;
  const effectiveYears = params.financialYears.length ? params.financialYears : buildDefaultFinancialYears();
  const closedFinancialYears = effectiveYears.filter((y) => y.status === "Closed").length;

  return {
    coaNodes,
    coaByCategory,
    allJournals: combinedJournals,
    filteredJournals,
    filteredGlRows,
    selectedAccountLedger: {
      account: selectedAccount,
      openingBalance: openingBal,
      totalDebit: selPeriodDr,
      totalCredit: selPeriodCr,
      closingBalance: closingBal,
      rows: selectedRows,
    },
    trialBalanceRows: statementsState.trialBalance?.rows || [],
    projectLedgerRows,
    departmentLedgerRows,
    financialYears: effectiveYears,
    availableProjects: Array.from(projectSet).sort(),
    availableDepartments: Array.from(deptSet).sort(),
    availableSourceModules: Array.from(moduleSet).sort(),
    kpis: {
      totalDebit,
      totalCredit,
      totalAccountBalances,
      pendingJournalEntries,
      approvedJournalEntries,
      reversedJournalEntries,
      unbalancedEntries,
      closedFinancialPeriods,
      closedFinancialYears,
      activeAccountsCount: chartAccounts.filter((a) => a.isActive && a.status !== "Archived").length,
    },
  };
}

// Reversing Entry Generator — Approved/Posted entries are NEVER deleted
export async function createAndPostReversingJournalEntry(params: {
  originalEntry: JournalEntryRecord;
  reversalDate: string;
  reason: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
}): Promise<JournalEntryRecord> {
  if (params.originalEntry.status !== "Posted") {
    throw new Error("Only Posted journal entries require a Reversing entry.");
  }
  if (params.originalEntry.reversedByEntryId) {
    throw new Error("This journal entry has already been reversed.");
  }
  if (!params.reason.trim()) {
    throw new Error("A reversal audit reason is required.");
  }

  const periodCheck = assertGlPostingAllowed({
    entryDate: params.reversalDate,
    periods: params.periods,
    financialYears: params.financialYears,
  });
  if (!periodCheck.allowed) {
    throw new Error(periodCheck.reason);
  }

  const reversedLines: JournalEntryLine[] = params.originalEntry.lines.map((ln, idx) => ({
    ...ln,
    lineNo: idx + 1,
    debit: round2(ln.credit),
    credit: round2(ln.debit),
    memo: `Reversal of ${params.originalEntry.journalNo}: ${ln.memo || ""}`.trim(),
  }));

  const validation = validateJournalEntryLines(reversedLines);
  if (!validation.isValid) {
    throw new Error(validation.error || "Reversing lines must balance.");
  }

  const nowIso = new Date().toISOString();
  const revId = `JE-REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const reversingEntry: JournalEntryRecord = {
    id: revId,
    journalNo: `REV-${params.originalEntry.journalNo}`,
    entryDate: params.reversalDate.slice(0, 10),
    fiscalYear: params.reversalDate.slice(0, 4),
    periodMonth: params.reversalDate.slice(0, 7),
    project: params.originalEntry.project,
    department: params.originalEntry.department,
    referenceNo: `REV-${params.originalEntry.referenceNo}`,
    description: `REVERSAL of ${params.originalEntry.journalNo}: ${params.reason.trim()}`,
    entryType: "Reversing",
    sourceModule: params.originalEntry.sourceModule,
    sourceRecordId: params.originalEntry.id,
    reversesEntryId: params.originalEntry.id,
    reversalReason: params.reason.trim(),
    isImmutable: true,
    lines: reversedLines,
    totalDebit: validation.totalDebit,
    totalCredit: validation.totalCredit,
    isBalanced: true,
    status: "Posted",
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    auditHistory: [
      {
        timestamp: nowIso,
        action: "Created & Posted Reversing Entry",
        actorName: params.actorName,
        actorRole: String(params.actorRole),
        notes: `Reversed ${params.originalEntry.journalNo} (${params.reason.trim()})`,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.reverseJournalEntryAtomic({
    originalEntry: params.originalEntry,
    reversingEntry,
  });

  return reversingEntry;
}

export async function savePart8ChartAccount(params: {
  account: ChartAccountRecord;
  allAccounts: ChartAccountRecord[];
  actorName?: string;
  actorRole?: UserRole | string;
  actorUid?: string;
}): Promise<ChartAccountRecord> {
  if (params.actorRole) {
    const perms = resolveUserFinancePermissions(params.actorRole);
    if (!perms.canManageTransactions && !perms.canApproveTransactions) {
      throw new Error("Insufficient permissions to manage Chart of Accounts.");
    }
  }
  const code = params.account.accountCode.trim();
  if (!code || !params.account.accountName.trim()) {
    throw new Error("Account Code and Account Name are required.");
  }
  const hierarchyCheck = validateChartAccountHierarchy({
    accountCode: code,
    parentAccountCode: params.account.parentAccountCode,
    allAccounts: params.allAccounts,
  });
  if (!hierarchyCheck.valid) {
    throw new Error(hierarchyCheck.error);
  }
  const parent = params.account.parentAccountCode
    ? params.allAccounts.find((a) => a.accountCode === params.account.parentAccountCode)
    : undefined;

  const nowIso = new Date().toISOString();
  const enriched: ChartAccountRecord = {
    ...params.account,
    id: params.account.id || `COA-${code}`,
    accountCode: code,
    accountName: params.account.accountName.trim(),
    accountNameAm: params.account.accountNameAm?.trim() || params.account.accountName.trim(),
    parentAccountCode: params.account.parentAccountCode?.trim() || undefined,
    parentAccountName: parent?.accountName,
    status: params.account.status || (params.account.isActive ? "Active" : "Inactive"),
    isActive: params.account.status ? params.account.status === "Active" : params.account.isActive,
    updatedAt: nowIso,
  };
  await DbService.saveChartAccount(enriched);
  if (params.actorName && params.actorRole && params.actorUid) {
    await DbService.addAuditLog({
      id: `AUD-${Date.now()}`,
      timestamp: nowIso,
      userId: params.actorUid,
      userName: params.actorName,
      role: String(params.actorRole),
      action: "Save Chart of Account",
      category: "Finance",
      severity: "INFO",
      details: `Saved GL Account ${enriched.accountCode} - ${enriched.accountName} (${enriched.accountType})`,
    });
  }
  return enriched;
}

export async function saveFinancialYearLifecycle(params: {
  year: FinancialYearRecord;
  nextStatus: "Open" | "Closed" | "Reopened";
  actorName: string;
  actorRole: UserRole | string;
  reason?: string;
}): Promise<FinancialYearRecord> {
  const isManagerOrDirector =
    params.actorRole === UserRole.FINANCE_MANAGER ||
    params.actorRole === UserRole.HEAD_OFFICE ||
    params.actorRole === UserRole.SUPER_ADMIN ||
    params.actorRole === UserRole.DIRECTOR;

  if ((params.nextStatus === "Closed" || params.nextStatus === "Reopened") && !isManagerOrDirector) {
    throw new Error("Only Finance Manager or Director / Head Office can close or reopen a Financial Year.");
  }
  if (params.nextStatus === "Reopened" && !params.reason?.trim()) {
    throw new Error("A written justification reason is required to reopen a Closed Financial Year.");
  }

  const nowIso = new Date().toISOString();
  const updated: FinancialYearRecord = {
    ...params.year,
    status: params.nextStatus,
    ...(params.nextStatus === "Closed"
      ? { closedBy: params.actorName, closedAt: nowIso }
      : {}),
    ...(params.nextStatus === "Reopened"
      ? {
          reopenedBy: params.actorName,
          reopenedAt: nowIso,
          reopenedReason: params.reason?.trim(),
        }
      : {}),
    updatedAt: nowIso,
  };
  await DbService.saveFinancialYear(updated);
  return updated;
}

function downloadPart8Csv(filenamePrefix: string, rows: Record<string, any>[]) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const safeRows = rows.length ? rows : [{ Notice: "No rows match filter criteria" }];
  const headers = Object.keys(safeRows[0]);
  const escapeCell = (val: unknown) => {
    const s = String(val ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...safeRows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `OVID_GL_${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPart8Report(params: {
  reportType: Part8LedgerReportTypeId;
  state: Part8GeneralLedgerState;
  format: "csv" | "xlsx";
}) {
  const { reportType, state, format } = params;
  let rows: Record<string, any>[] = [];

  if (reportType === "general-ledger-report") {
    rows = state.filteredGlRows.map((r) => ({
      Date: r.entryDate,
      JournalNo: r.journalNo,
      ReferenceNo: r.referenceNo,
      AccountCode: r.accountCode,
      AccountName: r.accountName,
      Project: r.project,
      Department: r.department,
      SourceModule: r.sourceModule,
      Description: r.description,
      Debit: r.debit,
      Credit: r.credit,
      RunningBalance: r.runningBalance,
    }));
  } else if (reportType === "account-ledger-report") {
    rows = state.selectedAccountLedger.rows.map((r) => ({
      AccountCode: r.accountCode,
      AccountName: r.accountName,
      Date: r.entryDate,
      JournalNo: r.journalNo,
      Description: r.description,
      Project: r.project,
      Debit: r.debit,
      Credit: r.credit,
      RunningBalance: r.runningBalance,
    }));
  } else if (reportType === "trial-balance") {
    rows = state.trialBalanceRows.map((r) => ({
      AccountCode: r.accountCode,
      AccountName: r.accountName,
      Type: r.accountType,
      OpeningDebit: r.openingDebit,
      OpeningCredit: r.openingCredit,
      PeriodDebit: r.periodDebit,
      PeriodCredit: r.periodCredit,
      EndingDebit: r.endingDebit,
      EndingCredit: r.endingCredit,
      NetBalance: r.netBalance,
    }));
  } else if (reportType === "journal-register") {
    rows = state.filteredJournals.map((j) => ({
      JournalNo: j.journalNo,
      Date: j.entryDate,
      Type: j.entryType,
      SourceModule: j.sourceModule,
      ReferenceNo: j.referenceNo,
      Project: j.project,
      Department: j.department,
      TotalDebit: j.totalDebit,
      TotalCredit: j.totalCredit,
      Status: j.status,
      PreparedBy: j.preparedBy,
      ApprovedBy: j.approvedBy || "-",
      Description: j.description,
    }));
  } else if (reportType === "account-balance-summary") {
    rows = state.coaNodes.map((n) => ({
      AccountCode: n.account.accountCode,
      AccountName: n.account.accountName,
      Category: n.categoryGroup,
      ParentCode: n.account.parentAccountCode || "-",
      NormalBalance: n.account.normalBalance,
      PeriodDebit: n.periodDebit,
      PeriodCredit: n.periodCredit,
      OwnBalance: n.ownBalance,
      RollupBalance: n.rollupBalance,
      Status: n.account.status || (n.account.isActive ? "Active" : "Inactive"),
    }));
  } else if (reportType === "project-ledger") {
    rows = state.projectLedgerRows.map((p) => ({
      Project: p.dimensionName,
      Entries: p.entryCount,
      TotalDebit: p.totalDebit,
      TotalCredit: p.totalCredit,
      NetMovement: p.netMovement,
      Revenue: p.revenueRecognized,
      Costs: p.directAndOperatingCosts,
    }));
  } else if (reportType === "department-ledger") {
    rows = state.departmentLedgerRows.map((d) => ({
      Department: d.dimensionName,
      Entries: d.entryCount,
      TotalDebit: d.totalDebit,
      TotalCredit: d.totalCredit,
      NetMovement: d.netMovement,
      Revenue: d.revenueRecognized,
      Costs: d.directAndOperatingCosts,
    }));
  }

  if (format === "csv") {
    downloadPart8Csv(reportType, rows);
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Notice: "No rows match filter criteria" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, reportType.slice(0, 31));
  XLSX.writeFile(wb, `OVID_GL_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
