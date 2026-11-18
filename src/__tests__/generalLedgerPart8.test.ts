import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertGlPostingAllowed,
  buildDefaultFinancialYears,
  checkDuplicateJournalReference,
  computePart8GeneralLedgerState,
  createAndPostReversingJournalEntry,
  Part8GlFilterState,
  saveFinancialYearLifecycle,
  savePart8ChartAccount,
  validateChartAccountHierarchy,
} from "../services/generalLedgerService";
import { computePart7FinancialStatementsState, SYSTEM_CHART_OF_ACCOUNTS } from "../services/financialStatementsService";
import { DbService } from "../services/db";
import {
  ChartAccountRecord,
  FinancialAccount,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  JournalEntryRecord,
  UserRole,
} from "../types";

let memCoa: ChartAccountRecord[] = [];
let memJournals: JournalEntryRecord[] = [];
let memYears: FinancialYearRecord[] = [];

const defaultGlFilter: Part8GlFilterState = {
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  accountCode: "ALL",
  project: "ALL",
  department: "ALL",
  sourceModule: "ALL",
  entryStatus: "ALL",
  searchTerm: "",
};

function makeTreasury(): FinancialAccount[] {
  return [
    {
      id: "ACC-1",
      accountCode: "1020",
      accountName: "CBE Operating",
      accountType: "Bank",
      bankAccountSubtype: "Checking",
      currency: "ETB",
      openingBalance: 500000,
      currentBalance: 500000,
      minimumThreshold: 50000,
      project: "Bole Tower",
      department: "Finance",
      status: "Active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

beforeEach(() => {
  memCoa = [...SYSTEM_CHART_OF_ACCOUNTS];
  memJournals = [];
  memYears = buildDefaultFinancialYears(2026);

  vi.spyOn(DbService, "saveChartAccount").mockImplementation(async (acc) => {
    memCoa = [...memCoa.filter((a) => a.id !== acc.id), acc];
  });
  vi.spyOn(DbService, "saveFinancialYear").mockImplementation(async (yr) => {
    memYears = [...memYears.filter((y) => y.id !== yr.id), yr];
  });
  vi.spyOn(DbService, "reverseJournalEntryAtomic").mockImplementation(
    async ({ originalEntry, reversingEntry }) => {
      const updatedOriginal: JournalEntryRecord = {
        ...originalEntry,
        status: "Reversed",
        reversedByEntryId: reversingEntry.id,
        reversalReason: reversingEntry.reversalReason,
      };
      memJournals = [
        ...memJournals.filter((j) => j.id !== originalEntry.id && j.id !== reversingEntry.id),
        updatedOriginal,
        reversingEntry,
      ];
    }
  );
});

describe("Part 8: General Ledger (GL) & Hierarchical Chart of Accounts", () => {
  it("detects circular parent-child COA hierarchy and rejects self/cyclic parents", async () => {
    const accounts: ChartAccountRecord[] = [
      ...SYSTEM_CHART_OF_ACCOUNTS,
      {
        id: "COA-1025",
        accountCode: "1025",
        accountName: "Project Escrow CBE",
        accountType: "Asset",
        subType: "Current Asset",
        parentAccountCode: "1020",
        normalBalance: "Debit",
        cashFlowSection: "Operating",
        openingBalance: 100000,
        currency: "ETB",
        isSystemAccount: false,
        isActive: true,
        status: "Active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const selfCycle = validateChartAccountHierarchy({
      accountCode: "1025",
      parentAccountCode: "1025",
      allAccounts: accounts,
    });
    expect(selfCycle.valid).toBe(false);

    const parentCycle = validateChartAccountHierarchy({
      accountCode: "1020",
      parentAccountCode: "1025",
      allAccounts: accounts,
    });
    expect(parentCycle.valid).toBe(false);

    const saved = await savePart8ChartAccount({
      account: {
        id: "COA-1026",
        accountCode: "1026",
        accountName: "Retention Sub-Account",
        accountType: "Asset",
        subType: "Current Asset",
        parentAccountCode: "1025",
        normalBalance: "Debit",
        cashFlowSection: "Operating",
        openingBalance: 25000,
        currency: "ETB",
        isSystemAccount: false,
        isActive: true,
        status: "Active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      allAccounts: accounts,
      actorName: "Finance Mgr",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
    });
    expect(saved.parentAccountName).toBe("Project Escrow CBE");
  });

  it("blocks posting in closed accounting periods and closed financial years, enforcing executive reopen reasons", async () => {
    const closedPeriod: FinancialPeriodCloseRecord = {
      id: "PER-2026-03",
      periodKey: "2026-03",
      periodLabel: "March 2026",
      periodType: "Monthly",
      financialYear: "2026",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      status: "Closed",
      totalRevenueSnapshot: 0,
      totalExpensesSnapshot: 0,
      netProfitSnapshot: 0,
      totalAssetsSnapshot: 0,
      totalLiabilitiesSnapshot: 0,
      totalEquitySnapshot: 0,
      isTrialBalanceBalanced: true,
      isBalanceSheetBalanced: true,
      preparedBy: "Accountant",
      createdAt: "2026-03-31T00:00:00.000Z",
      updatedAt: "2026-03-31T00:00:00.000Z",
    };

    const periodLock = assertGlPostingAllowed({
      entryDate: "2026-03-15",
      periods: [closedPeriod],
      financialYears: memYears,
    });
    expect(periodLock.allowed).toBe(false);
    expect(periodLock.reason).toContain("Closed");

    const fy2025 = memYears.find((y) => y.yearCode === "FY2025")!;
    // Accountant cannot close FY
    await expect(
      saveFinancialYearLifecycle({
        year: fy2025,
        nextStatus: "Closed",
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
      })
    ).rejects.toThrow();

    const closedFy = await saveFinancialYearLifecycle({
      year: fy2025,
      nextStatus: "Closed",
      actorName: "Director",
      actorRole: UserRole.DIRECTOR,
    });
    expect(closedFy.status).toBe("Closed");

    const yearLock = assertGlPostingAllowed({
      entryDate: "2025-11-20",
      periods: [],
      financialYears: memYears,
    });
    expect(yearLock.allowed).toBe(false);
    expect(yearLock.reason).toContain("FY2025");

    // Reopening requires justification reason
    await expect(
      saveFinancialYearLifecycle({
        year: closedFy,
        nextStatus: "Reopened",
        actorName: "Director",
        actorRole: UserRole.DIRECTOR,
        reason: "",
      })
    ).rejects.toThrow(/reason/i);
  });

  it("prevents duplicate journal entries and reverses immutable Posted entries without deletion", async () => {
    const postedJe: JournalEntryRecord = {
      id: "JE-POSTED-1",
      journalNo: "JV-2026-001",
      entryDate: "2026-07-10",
      fiscalYear: "2026",
      periodMonth: "2026-07",
      project: "Bole Tower",
      department: "Engineering",
      referenceNo: "EXP-99",
      description: "Cement delivery accrued",
      entryType: "Standard",
      sourceModule: "Accounts Payable",
      sourceKey: "AP:EXP-99",
      uniqueTransactionKey: "AP::EXP-99",
      isImmutable: true,
      lines: [
        {
          lineNo: 1,
          accountCode: "5010",
          accountName: "Direct Materials & Concrete",
          accountType: "Cost of Construction",
          debit: 120000,
          credit: 0,
        },
        {
          lineNo: 2,
          accountCode: "2010",
          accountName: "Accounts Payable",
          accountType: "Liability",
          debit: 0,
          credit: 120000,
        },
      ],
      totalDebit: 120000,
      totalCredit: 120000,
      isBalanced: true,
      status: "Posted",
      preparedBy: "Accountant",
      preparedById: "ACC-1",
      approvedBy: "Finance Manager",
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    };
    memJournals = [postedJe];

    // Duplicate reference detection
    const dupCheck = checkDuplicateJournalReference({
      uniqueTransactionKey: "AP::EXP-99",
      existingEntries: memJournals,
    });
    expect(dupCheck.isDuplicate).toBe(true);
    expect(dupCheck.conflictingJournalNo).toBe("JV-2026-001");

    // Reversal creates an equal & opposite Posted reversing entry and marks original Reversed
    const rev = await createAndPostReversingJournalEntry({
      originalEntry: postedJe,
      reversalDate: "2026-07-15",
      reason: "Vendor credit note issued for damaged cement",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
      periods: [],
      financialYears: memYears,
    });

    expect(rev.entryType).toBe("Reversing");
    expect(rev.reversesEntryId).toBe(postedJe.id);
    expect(rev.totalDebit).toBe(120000);
    expect(rev.totalCredit).toBe(120000);
    expect(rev.lines[0].credit).toBe(120000);
    expect(rev.lines[1].debit).toBe(120000);

    const origAfter = memJournals.find((j) => j.id === postedJe.id);
    expect(origAfter?.status).toBe("Reversed");
    expect(origAfter?.reversedByEntryId).toBe(rev.id);
  });

  it("computes all 7 Part 8 Ledger Reports, Project/Dept aggregations, and GL KPIs cleanly", () => {
    const sampleJe: JournalEntryRecord = {
      id: "JE-PRJ-1",
      journalNo: "JV-2026-010",
      entryDate: "2026-07-12",
      fiscalYear: "2026",
      periodMonth: "2026-07",
      project: "Bole Tower",
      department: "Structural",
      referenceNo: "CERT-01",
      description: "Certified structural slab progress billing",
      entryType: "Standard",
      sourceModule: "Accounts Receivable",
      lines: [
        {
          lineNo: 1,
          accountCode: "1110",
          accountName: "Accounts Receivable",
          accountType: "Asset",
          debit: 350000,
          credit: 0,
        },
        {
          lineNo: 2,
          accountCode: "4010",
          accountName: "Contract Revenue",
          accountType: "Revenue",
          debit: 0,
          credit: 350000,
        },
      ],
      totalDebit: 350000,
      totalCredit: 350000,
      isBalanced: true,
      status: "Posted",
      preparedBy: "Accountant",
      preparedById: "ACC-1",
      approvedBy: "Finance Manager",
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-12T00:00:00.000Z",
    };

    const statementsState = computePart7FinancialStatementsState({
      chartOfAccounts: memCoa,
      financialAccounts: makeTreasury(),
      journalEntries: [sampleJe],
      filterState: {
        reportingFrequency: "Annual",
        financialYear: "2026",
        project: "ALL",
        department: "ALL",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        companyName: "OVID Real Estate",
      },
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: "2026-07-20",
    });

    const glState = computePart8GeneralLedgerState({
      statementsState,
      rawJournalEntries: [sampleJe],
      financialPeriods: [],
      financialYears: memYears,
      filterState: defaultGlFilter,
    });

    expect(glState.coaByCategory["Assets"].length).toBeGreaterThan(0);
    expect(glState.coaByCategory["Revenue"].length).toBeGreaterThan(0);
    expect(glState.kpis.totalDebit).toBe(glState.kpis.totalCredit);
    expect(glState.kpis.unbalancedEntries).toBe(0);
    expect(glState.projectLedgerRows.find((p) => p.dimensionName === "Bole Tower")?.revenueRecognized).toBe(350000);
    expect(glState.departmentLedgerRows.find((d) => d.dimensionName === "Structural")?.totalCredit).toBe(350000);
    expect(glState.trialBalanceRows.length).toBeGreaterThan(0);
  });
});
