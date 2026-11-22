import { describe, it, expect } from "vitest";
import { UserRole } from "../types";
import {
  SYSTEM_CHART_OF_ACCOUNTS,
  validateJournalEntryLines,
  isDateInClosedPeriod,
  computePart7FinancialStatementsState,
} from "../services/financialStatementsService";
import { assertGlPostingAllowed } from "../services/generalLedgerService";
import {
  computeMonthlyDepreciationAmount,
  generateAnnualDepreciationSchedule,
  resolveAssetCoaMapping,
  computeFixedAssetsState,
} from "../services/fixedAssetsService";
import {
  ETHIOPIAN_DEFAULT_TAX_RATES,
  resolveEffectiveTaxRate,
  computeMonthlyFilingDeadline,
  computeTaxComplianceState,
} from "../services/taxComplianceService";
import {
  generateLoanAmortizationSchedule,
  computeLoanAndCreditState,
} from "../services/loanCreditService";
import { computePettyCashState } from "../services/pettyCashService";
import {
  assertMakerCheckerSeparation,
  detectFinancialAnomalies,
  computeExecutiveFinancialOverview,
} from "../services/financialAuditService";
import { computeFinancialDashboardState, resolveUserFinancePermissions } from "../services/financeService";

describe("Financial Management Advanced Modules (Parts 8-16)", () => {
  describe("1. General Ledger & Chart of Accounts", () => {
    it("includes expanded COA accounts across Assets, Liabilities, Revenue, and Expenses", () => {
      const codes = new Set(SYSTEM_CHART_OF_ACCOUNTS.map((a) => a.accountCode));
      [
        "1015",
        "1130",
        "1140",
        "1520",
        "1530",
        "1540",
        "1595",
        "2031",
        "2032",
        "2033",
        "2110",
        "3120",
        "4120",
        "6220",
        "6320",
        "6410",
      ].forEach((code) => expect(codes.has(code)).toBe(true));
    });

    it("enforces Total Debits = Total Credits and blocks closed periods/years", () => {
      const balanced = validateJournalEntryLines([
        {
          lineNo: 1,
          accountCode: "1520",
          accountName: "Heavy Machinery & Construction Equipment",
          accountType: "Asset",
          subType: "Non-Current Asset",
          debit: 250000,
          credit: 0,
          memo: "Excavator purchase",
        },
        {
          lineNo: 2,
          accountCode: "1020",
          accountName: "Cash in Commercial Banks",
          accountType: "Asset",
          subType: "Current Asset",
          debit: 0,
          credit: 250000,
          memo: "Bank transfer",
        },
      ]);
      expect(balanced.isValid).toBe(true);
      expect(balanced.totalDebit).toBe(250000);

      const unbalanced = validateJournalEntryLines([
        {
          lineNo: 1,
          accountCode: "1015",
          accountName: "Petty Cash",
          accountType: "Asset",
          subType: "Current Asset",
          debit: 5000,
          credit: 0,
          memo: "Mismatch",
        },
        {
          lineNo: 2,
          accountCode: "1020",
          accountName: "Bank",
          accountType: "Asset",
          subType: "Current Asset",
          debit: 0,
          credit: 4000,
          memo: "Short credit",
        },
      ]);
      expect(unbalanced.isValid).toBe(false);

      const periods = [
        {
          id: "PER-2026-01",
          periodKey: "2026-01",
          periodLabel: "January 2026",
          fiscalYear: "2026",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
          status: "Closed",
          closedBy: "Finance Manager",
          closedById: "fm-1",
          closedAt: "2026-02-05T10:00:00Z",
          totalJournalCount: 12,
          totalDebitsSnapshot: 100000,
          totalCreditsSnapshot: 100000,
          netProfitSnapshot: 20000,
          cashBalanceSnapshot: 50000,
        },
      ] as any;
      expect(isDateInClosedPeriod("2026-01-15", periods)).toBeTruthy();
      const guard = assertGlPostingAllowed({
        entryDate: "2026-01-15",
        periods,
        financialYears: [],
      });
      expect(guard.allowed).toBe(false);
    });
  });

  describe("2. Fixed Assets & Depreciation", () => {
    it("maps categories to dedicated Asset and Accumulated Depreciation COA codes", () => {
      const bldgMapping = resolveAssetCoaMapping("Buildings & Structures");
      expect(bldgMapping.coaAssetCode).toBe("1520");
      expect(bldgMapping.coaAccumDepCode).toBe("1595");

      const machMapping = resolveAssetCoaMapping("Heavy Machinery");
      expect(machMapping.coaAssetCode).toBe("1510");
      expect(machMapping.coaAccumDepCode).toBe("1590");
    });

    it("computes Straight-Line, Declining Balance, and Units of Production with salvage floor", () => {
      const slMonthly = computeMonthlyDepreciationAmount({
        acquisitionCost: 130000,
        salvageValue: 10000,
        usefulLifeYears: 5,
        depreciationMethod: "Straight-Line",
        accumulatedDepreciation: 0,
        netBookValue: 130000,
        status: "Active",
      });
      expect(slMonthly).toBe(2000);

      const dbMonthly = computeMonthlyDepreciationAmount({
        acquisitionCost: 120000,
        salvageValue: 10000,
        usefulLifeYears: 5,
        depreciationMethod: "Declining Balance",
        decliningRatePct: 40,
        accumulatedDepreciation: 0,
        netBookValue: 120000,
        status: "Active",
      });
      expect(dbMonthly).toBe(4000);

      const uomMonthly = computeMonthlyDepreciationAmount(
        {
          acquisitionCost: 550000,
          salvageValue: 50000,
          usefulLifeYears: 10,
          depreciationMethod: "Units of Production",
          totalEstimatedUnits: 10000,
          accumulatedDepreciation: 0,
          netBookValue: 550000,
          status: "Active",
        },
        250
      );
      expect(uomMonthly).toBe(12500);

      const schedule = generateAnnualDepreciationSchedule({
        acquisitionCost: 100000,
        salvageValue: 10000,
        usefulLifeYears: 5,
        depreciationMethod: "Straight-Line",
        acquisitionDate: "2026-01-01",
      });
      expect(schedule).toHaveLength(5);
      expect(schedule[4].closingNbv).toBe(10000);
      expect(schedule[4].accumulatedDepreciation).toBe(90000);

      const faState = computeFixedAssetsState({
        assets: [
          {
            id: "FA-1",
            assetCode: "FA-001",
            assetName: "Tower Crane",
            category: "Heavy Machinery",
            acquisitionDate: "2026-01-01",
            acquisitionCost: 2000000,
            salvageValue: 200000,
            usefulLifeYears: 10,
            depreciationMethod: "Straight-Line",
            accumulatedDepreciation: 150000,
            netBookValue: 1850000,
            department: "Construction",
            project: "Bole Tower",
            location: "Site A",
            status: "Active",
            coaAssetCode: "1520",
            coaAccumDepCode: "1595",
            createdBy: "FM",
            createdById: "fm-1",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        events: [],
      });
      expect(faState.kpis.totalNetBookValue).toBe(1850000);
      expect(faState.byCategory[0].category).toBe("Heavy Machinery");
    });
  });

  describe("3. Tax Management & Compliance", () => {
    it("resolves effective tax rates, computes filing deadlines, and nets Output vs Input VAT", () => {
      const vatCfg = resolveEffectiveTaxRate(ETHIOPIAN_DEFAULT_TAX_RATES, "VAT", "2026-05-01", "VAT-15");
      expect(vatCfg?.ratePct).toBe(15);
      expect(computeMonthlyFilingDeadline("2026-12")).toBe("2027-01-28");

      const taxState = computeTaxComplianceState({
        taxRates: [],
        taxTransactions: [],
        taxReturns: [
          {
            id: "RET-1",
            returnNumber: "TR-2026-01",
            taxType: "VAT",
            periodMonth: "2026-01",
            filingDeadline: "2026-02-28",
            grossTaxableBase: 100000,
            outputTaxTotal: 15000,
            inputTaxCreditTotal: 5000,
            netTaxPayable: 10000,
            status: "Prepared",
            preparedBy: "Accountant",
            preparedById: "acc-1",
            createdAt: "2026-02-15T00:00:00Z",
            updatedAt: "2026-02-15T00:00:00Z",
          },
        ],
        invoices: [
          {
            id: "INV-1",
            invoiceNumber: "INV-2026-001",
            clientName: "Ovid Real Estate",
            project: "Bole Tower",
            amount: 115000,
            paidAmount: 115000,
            date: "2026-03-10",
            dueDate: "2026-04-10",
            status: "Paid",
          } as any,
        ],
        expenses: [
          {
            id: "EXP-1",
            description: "Cement delivery",
            project: "Bole Tower",
            amount: 57500,
            vatAmount: 7500,
            date: "2026-03-12",
            category: "Materials",
            status: "Approved",
          } as any,
        ],
        hrmPayrollRuns: [
          {
            id: "HPR-1",
            payPeriod: "2026-03",
            workflowStage: "Paid",
            totalIncomeTax: 12000,
            totalEmployeePension: 3500,
            totalEmployerPension: 5500,
          } as any,
        ],
        referenceToday: "2026-03-20",
      });

      expect(taxState.kpis.outputVatTotal).toBe(15000);
      expect(taxState.kpis.inputVatCreditTotal).toBe(7500);
      expect(taxState.kpis.netVatPayable).toBe(7500);
      expect(taxState.kpis.withholdingTaxPayable).toBe(1150);
      expect(taxState.kpis.payrollTaxAndPensionTotal).toBe(21000);
      expect(taxState.kpis.overdueReturnsCount).toBe(1);
    });
  });

  describe("4. Loan, Credit & Financing Management", () => {
    it("generates Reducing Balance and Flat Rate schedules and detects client credit breaches", () => {
      const rbSchedule = generateLoanAmortizationSchedule(
        {
          principalAmount: 120000,
          annualInterestRatePct: 12,
          termMonths: 12,
          interestMethod: "Reducing Balance",
          disbursementDate: "2026-01-01",
          totalPrincipalRepaid: 0,
        },
        "2026-01-15"
      );
      expect(rbSchedule).toHaveLength(12);
      expect(rbSchedule[0].interestDue).toBe(1200);
      expect(rbSchedule[11].closingBalance).toBe(0);

      const flatSchedule = generateLoanAmortizationSchedule(
        {
          principalAmount: 120000,
          annualInterestRatePct: 12,
          termMonths: 12,
          interestMethod: "Flat Rate",
          disbursementDate: "2026-01-01",
          totalPrincipalRepaid: 0,
        },
        "2026-01-15"
      );
      expect(flatSchedule[0].principalDue).toBe(10000);
      expect(flatSchedule[5].interestDue).toBe(1200);

      const loanState = computeLoanAndCreditState({
        loans: [
          {
            id: "LN-1",
            facilityNo: "LN-2026-01",
            lenderName: "Commercial Bank of Ethiopia",
            facilityType: "Bank Term Loan",
            project: "Bole Tower",
            department: "Finance",
            principalAmount: 120000,
            annualInterestRatePct: 12,
            termMonths: 12,
            interestMethod: "Reducing Balance",
            disbursementDate: "2026-01-01",
            maturityDate: "2027-01-01",
            outstandingPrincipal: 100000,
            totalInterestAccrued: 2400,
            totalPrincipalRepaid: 20000,
            totalInterestRepaid: 2400,
            nextDueDate: "2026-03-01",
            coaLiabilityCode: "2510",
            status: "Partially Repaid",
            createdBy: "Acc",
            createdById: "acc-1",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-02-01T00:00:00Z",
          },
        ],
        repayments: [],
        creditProfiles: [
          {
            id: "CP-1",
            counterpartyName: "Addis Plaza Client",
            counterpartyType: "Client",
            projectScope: "Addis Plaza",
            creditLimitEtb: 200000,
            paymentTermDays: 30,
            creditRating: "Moderate Risk",
            isCreditHold: false,
            updatedBy: "FM",
            updatedById: "fm-1",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        invoices: [
          {
            id: "INV-C1",
            invoiceNumber: "INV-901",
            clientName: "Addis Plaza Client",
            project: "Addis Plaza",
            amount: 350000,
            paidAmount: 0,
            date: "2026-01-01",
            dueDate: "2026-01-31",
            status: "Pending",
          } as any,
        ],
        expenses: [],
        referenceToday: "2026-03-10",
      });

      expect(loanState.kpis.totalOutstandingPrincipal).toBe(100000);
      expect(loanState.kpis.creditLimitBreachesCount).toBe(1);
      expect(loanState.clientCreditSummaries[0].computedRisk).toBe("High Risk");
    });
  });

  describe("5. Petty Cash & Expense Control", () => {
    it("identifies shortages, excess funds, low balance alerts, and unsupported expenses", () => {
      const pcState = computePettyCashState({
        funds: [
          {
            id: "PCF-1",
            fundCode: "PC-BOLE",
            fundName: "Bole Site Imprest",
            locationType: "Construction Site",
            project: "Bole Tower",
            department: "Site Operations",
            custodianUid: "user-1",
            custodianName: "Dawit",
            authorizedLimit: 50000,
            maxSingleExpense: 5000,
            openingBalance: 50000,
            currentBalance: 8000,
            replenishThresholdPct: 25,
            status: "Active",
            createdBy: "FM",
            createdById: "fm-1",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
        transactions: [
          {
            id: "PCT-1",
            voucherNo: "PCV-001",
            fundId: "PCF-1",
            fundCode: "PC-BOLE",
            fundName: "Bole Site Imprest",
            project: "Bole Tower",
            department: "Site Operations",
            txType: "Expense",
            txDate: "2026-03-01",
            category: "Transport",
            payeeOrSource: "Taxi Driver",
            description: "Site urgent delivery",
            amount: 1200,
            hasValidReceipt: false,
            status: "Posted",
            createdBy: "Dawit",
            createdById: "user-1",
            createdAt: "2026-03-01T00:00:00Z",
            updatedAt: "2026-03-01T00:00:00Z",
          },
        ],
        reconciliations: [
          {
            id: "PCR-1",
            reconciliationNo: "PCR-2026-01",
            fundId: "PCF-1",
            fundName: "Bole Site Imprest",
            project: "Bole Tower",
            reconciliationDate: "2026-03-02",
            custodianName: "Dawit",
            bookBalance: 8000,
            physicalCashCount: 6500,
            unpostedReceiptsTotal: 0,
            varianceAmount: -1500,
            varianceClassification: "Cash Shortage",
            unsupportedExpensesCount: 1,
            unsupportedExpensesAmount: 1200,
            reconciledBy: "Dawit",
            reconciledById: "user-1",
            status: "Pending Verification",
            createdAt: "2026-03-02T00:00:00Z",
          },
        ],
      });

      expect(pcState.lowBalanceFunds).toHaveLength(1);
      expect(pcState.unsupportedExpenses).toHaveLength(1);
      expect(pcState.kpis.openShortageCount).toBe(1);
      expect(pcState.kpis.totalShortageAmount).toBe(1500);
    });
  });

  describe("6. Audit Controls, Maker-Checker & Executive Overview", () => {
    it("enforces Maker-Checker separation except Super Admin and detects financial anomalies", () => {
      expect(() =>
        assertMakerCheckerSeparation({
          makerUid: "fm-1",
          checkerUid: "fm-1",
          checkerRole: UserRole.FINANCE_MANAGER,
          actionLabel: "Tax Settlement",
        })
      ).toThrow(/Maker-Checker Violation Blocked/);

      expect(() =>
        assertMakerCheckerSeparation({
          makerUid: "sa-1",
          checkerUid: "sa-1",
          checkerRole: UserRole.SUPER_ADMIN,
          actionLabel: "Emergency Override",
        })
      ).not.toThrow();

      const auditorPerms = resolveUserFinancePermissions(UserRole.AUDITOR);
      expect(auditorPerms.isAuditor).toBe(true);
      expect(auditorPerms.canApproveHighValuePayments).toBe(false);

      const anomalies = detectFinancialAnomalies({
        invoices: [
          { id: "I1", invoiceNumber: "INV-100", amount: 50000, project: "Alpha" } as any,
          { id: "I2", invoiceNumber: "INV-100", amount: 50000, project: "Alpha" } as any,
        ],
        expenses: [
          { id: "E1", supplier: "Habesha Cement", amount: 120000, date: "2026-03-01", project: "Alpha" } as any,
          { id: "E2", supplier: "Habesha Cement", amount: 120000, date: "2026-03-02", project: "Alpha" } as any,
        ],
        cashTransactions: [],
        bankTransactions: [],
        journalEntries: [
          {
            id: "JE-UNBAL",
            journalNo: "JV-99",
            entryDate: "2026-03-02",
            project: "Alpha",
            totalDebit: 1000,
            totalCredit: 800,
            isBalanced: false,
            preparedById: "u1",
            approvedById: "u1",
            status: "Posted",
          } as any,
        ],
        pettyCashTransactions: [
          {
            id: "PC-1",
            voucherNo: "PCV-5",
            fundName: "Site A",
            project: "Alpha",
            txType: "Expense",
            amount: 4000,
            hasValidReceipt: false,
            status: "Posted",
            createdById: "u2",
            approvedById: "u2",
          } as any,
        ],
        pettyCashReconciliations: [
          {
            id: "PCR-2",
            reconciliationNo: "PCR-2",
            fundName: "Site A",
            project: "Alpha",
            varianceAmount: -900,
            varianceClassification: "Cash Shortage",
          } as any,
        ],
        projectBudgetPlans: [
          {
            id: "PB-1",
            projectName: "Alpha",
            approvedProjectBudget: 100000,
            actualSpentAmount: 125000,
          } as any,
        ],
        hrmPayrollRuns: [],
        attendance: [],
        creditBreachesCount: 1,
        settings: {
          requireDirectorApprovalAboveEtb: 500000,
          budgetOverrunAlertPct: 100,
        } as any,
      });

      const categories = new Set(anomalies.map((a) => a.category));
      expect(categories.has("Duplicate Payment / Invoice")).toBe(true);
      expect(categories.has("Unbalanced or Unverified Posting")).toBe(true);
      expect(categories.has("Unsupported Petty Cash Expense")).toBe(true);
      expect(categories.has("Petty Cash Shortage / Excess")).toBe(true);
      expect(categories.has("Budget Overrun Anomaly")).toBe(true);
      expect(categories.has("Credit Limit Breach")).toBe(true);
    });

    it("computes ExecutiveFinancialOverview financial ratios and project profitability", () => {
      const invoices = [
        {
          id: "INV-1",
          invoiceNumber: "INV-01",
          project: "Bole Tower",
          amount: 1000000,
          paidAmount: 800000,
          date: "2026-03-01",
          dueDate: "2026-03-31",
          status: "Partially Paid",
        } as any,
      ];
      const expenses = [
        {
          id: "EXP-1",
          project: "Bole Tower",
          amount: 400000,
          paidAmount: 400000,
          date: "2026-03-05",
          category: "Materials",
          status: "Paid",
        } as any,
      ];
      const budgets = [{ id: "BG-1", project: "Bole Tower", allocated: 500000, status: "Approved" } as any];

      const financeState = computeFinancialDashboardState({
        userRole: UserRole.FINANCE_MANAGER,
        invoices,
        expenses,
        paymentRecords: [],
        projectBudgets: budgets,
        financialAccounts: [
          { id: "ACC-1", accountName: "CBE Main", accountType: "Bank", currentBalance: 500000 } as any,
        ],
        cashTransactions: [],
        collectionPlans: [],
        paymentPlans: [],
        financialTargets: [],
        referenceToday: "2026-03-15",
        filterState: {
          periodPreset: "custom",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          project: "ALL",
          department: "ALL",
          customer: "ALL",
          supplier: "ALL",
          category: "ALL",
          status: "ALL",
          searchTerm: "",
        } as any,
      });

      const statementsState = computePart7FinancialStatementsState({
        journalEntries: [],
        chartOfAccounts: SYSTEM_CHART_OF_ACCOUNTS,
        financialAccounts: [{ id: "ACC-1", accountName: "CBE Main", accountType: "Bank", currentBalance: 500000 } as any],
        invoices,
        expenses,
        cashTransactions: [],
        bankTransactions: [],
        paymentRecords: [],
        financialPeriods: [],
        referenceToday: "2026-03-15",
        filterState: {
          reportingFrequency: "Monthly",
          financialYear: "2026",
          project: "ALL",
          department: "ALL",
          startDate: "2026-03-01",
          endDate: "2026-03-31",
        },
      });

      const overview = computeExecutiveFinancialOverview({
        financeState,
        statementsState,
        fixedAssetsState: { kpis: { totalNetBookValue: 750000 } } as any,
        taxState: { kpis: { totalUnpaidTaxLiability: 30000 } } as any,
        loanState: { kpis: { totalOutstandingPrincipal: 250000 } } as any,
        pettyCashState: { kpis: { totalPettyCashBalance: 25000 } } as any,
        projectsEvm: [{ name: "Bole Tower", budget: 500000, actualCost: 400000 }],
      });

      expect(overview.totalRevenue).toBe(1000000);
      expect(overview.netProfit).toBe(600000);
      expect(overview.fixedAssetsNbv).toBe(750000);
      expect(overview.pettyCashBalance).toBe(25000);
      expect(overview.totalLoansOutstanding).toBe(250000);
      expect(overview.ratios.currentRatio).toBeGreaterThan(1);
      expect(overview.ratios.netProfitMarginPct).toBe(60);
      expect(overview.projectProfitability[0].project).toBe("Bole Tower");
      expect(overview.projectProfitability[0].netProfit).toBe(600000);
    });
  });
});
