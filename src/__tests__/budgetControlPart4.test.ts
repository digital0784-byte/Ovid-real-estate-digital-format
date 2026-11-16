import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceAllocationWorkflow,
  advanceBudgetRevisionWorkflow,
  advanceProjectBudgetWorkflow,
  buildPart4BudgetReportDataset,
  buildUnifiedActualCostLedger,
  calculateBudgetLineItemsSummary,
  classifyBudgetUtilization,
  computePart4BudgetControlState,
  createBudgetAllocation,
  createOrSubmitProjectBudget,
  getRemainingUnallocatedBudget,
  PART4_BUDGET_CATEGORIES,
  Part4FilterState,
  registerActualCostEntry,
  requestBudgetRevision,
  verifyActualCostEntry,
} from "../services/budgetControlService";
import { DbService } from "../services/db";
import {
  ActualCostEntry,
  BudgetAllocationRecord,
  BudgetReportTypeId,
  BudgetRevisionRecord,
  CashTransactionRecord,
  Expense,
  FinancialInvoiceRecord,
  PayrollRecord,
  ProjectBudgetPlan,
  UserRole,
} from "../types";

const BASE_FILTER: Part4FilterState = {
  project: "ALL",
  budgetYear: "ALL",
  budgetCategory: "ALL",
  startDate: "",
  endDate: "",
  status: "ALL",
  searchTerm: "",
};

const REF_TODAY = "2026-07-20";

describe("Part 4 Budget Management & Cost Control System", () => {
  let mockPlans: ProjectBudgetPlan[];
  let mockAllocations: BudgetAllocationRecord[];
  let mockRevisions: BudgetRevisionRecord[];
  let mockActualCosts: ActualCostEntry[];
  let mockExpenses: Expense[];
  let mockCashTxs: CashTransactionRecord[];
  let mockInvoices: FinancialInvoiceRecord[];
  let mockPayroll: PayrollRecord[];

  beforeEach(() => {
    mockPlans = [
      {
        id: "BGP-BOLE-1",
        budgetId: "BGT-20260701-1001",
        projectName: "Bole Tower",
        projectId: "PRJ-BOLE",
        projectCode: "PRJ-001",
        contractNumber: "CNT-BOLE-01",
        clientName: "Federal Housing Corp",
        projectManager: "Eng. Dawit",
        department: "Engineering",
        budgetPreparationDate: "2026-01-05",
        budgetPeriod: "2026",
        budgetYear: "2026",
        projectStartDate: "2026-01-10",
        projectCompletionDate: "2026-12-31",
        originalContractAmount: 15000000,
        originalApprovedBudget: 1000000,
        approvedProjectBudget: 1000000,
        contingencyBudget: 100000,
        currency: "ETB",
        lineItems: [
          {
            id: "BGI-1",
            budgetItemId: "ITM-001",
            projectName: "Bole Tower",
            budgetCategory: "Material Costs",
            subcategory: "Structural Cement & Rebar",
            itemDescription: "Portland Cement & Steel Rebar",
            unitOfMeasurement: "Lot",
            plannedQuantity: 10,
            unitPrice: 50000,
            totalPlannedCost: 500000,
          },
          {
            id: "BGI-2",
            budgetItemId: "ITM-002",
            projectName: "Bole Tower",
            budgetCategory: "Labor Costs",
            subcategory: "Site Workforce",
            itemDescription: "Structural Crew Wages",
            unitOfMeasurement: "Month",
            plannedQuantity: 4,
            unitPrice: 75000,
            totalPlannedCost: 300000,
          },
          {
            id: "BGI-3",
            budgetItemId: "ITM-003",
            projectName: "Bole Tower",
            budgetCategory: "Equipment Costs",
            subcategory: "Crane & Mixers",
            itemDescription: "Heavy Equipment Hire",
            unitOfMeasurement: "Month",
            plannedQuantity: 2,
            unitPrice: 50000,
            totalPlannedCost: 100000,
          },
          {
            id: "BGI-4",
            budgetItemId: "ITM-004",
            projectName: "Bole Tower",
            budgetCategory: "Contingency",
            subcategory: "Risk Reserve",
            itemDescription: "Unforeseen Site Works",
            unitOfMeasurement: "Lump Sum",
            plannedQuantity: 1,
            unitPrice: 100000,
            totalPlannedCost: 100000,
          },
        ],
        budgetPreparedBy: "Finance Officer",
        reviewedBy: "Finance Manager",
        approvedBy: "Managing Director",
        approvalDate: "2026-01-15",
        budgetStatus: "Approved",
        workflowStage: "Budget Activation",
        createdBy: "Finance Officer",
        createdById: "U-FIN",
        createdAt: "2026-01-05T08:00:00.000Z",
        updatedAt: "2026-01-15T08:00:00.000Z",
      },
      {
        id: "BGP-YEKA-DRAFT",
        budgetId: "BGT-20260702-2001",
        projectName: "Yeka Villas",
        projectId: "PRJ-YEKA",
        projectCode: "PRJ-002",
        contractNumber: "CNT-YEKA-02",
        clientName: "Ovid Holdings",
        projectManager: "Eng. Hanna",
        budgetPreparationDate: "2026-07-01",
        budgetPeriod: "2026",
        budgetYear: "2026",
        projectStartDate: "2026-07-10",
        projectCompletionDate: "2027-06-30",
        originalContractAmount: 8000000,
        originalApprovedBudget: 0,
        approvedProjectBudget: 600000,
        contingencyBudget: 50000,
        currency: "ETB",
        lineItems: [],
        budgetPreparedBy: "Project Engineer",
        budgetStatus: "Submitted", // NOT yet Approved -> must NOT count as official project budget
        workflowStage: "Finance Review",
        createdBy: "Project Engineer",
        createdById: "U-ENG",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
    ];

    mockAllocations = [
      {
        id: "BAL-1",
        allocationId: "BAL-20260701-1001",
        projectBudgetPlanId: "BGP-BOLE-1",
        projectName: "Bole Tower",
        projectCode: "PRJ-001",
        budgetYear: "2026",
        budgetMonth: "2026-07",
        budgetCategory: "Material Costs",
        budgetItem: "Portland Cement & Steel Rebar",
        budgetItemId: "ITM-001",
        allocatedAmount: 300000,
        previouslyAllocatedAmount: 0,
        remainingUnallocatedBudget: 700000,
        preparedBy: "Finance Officer",
        approvedBy: "Finance Manager",
        approvalStatus: "Approved",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
    ];

    mockRevisions = [];
    mockActualCosts = [];

    mockExpenses = [
      {
        id: "EXP-BOLE-1",
        payableId: "AP-20260705-0001",
        referenceNo: "AP-20260705-0001",
        billNumber: "SUP-CEM-101",
        category: "Material Supplier Payables",
        payableCategory: "Material Supplier Payables",
        amount: 200000,
        paidAmount: 120000,
        date: "2026-07-05",
        dueDate: "2026-08-05",
        vendor: "Ethio Cement Corp",
        description: "Portland Cement & Steel Rebar",
        project: "Bole Tower",
        costCenter: "Materials",
        approvedBy: "Finance Manager",
        status: "Partially Paid",
        workflowStage: "Approved",
      },
    ];

    mockCashTxs = [
      // Linked cash settlement of EXP-BOLE-1 -> updates Paid Cost only, MUST NOT double-count incurred cost!
      {
        id: "CTX-LINKED-1",
        referenceNo: "PAY-20260708-0001",
        type: "Payment",
        date: "2026-07-08",
        amount: 120000,
        accountId: "ACC-1",
        accountName: "CBE Main",
        project: "Bole Tower",
        department: "Procurement",
        category: "Material Costs",
        counterparty: "Ethio Cement Corp",
        linkedDocumentType: "Expense",
        linkedDocumentId: "EXP-BOLE-1",
        paymentMethod: "Bank Transfer",
        status: "Confirmed & Paid",
        createdBy: "Accountant",
        createdById: "U-ACC",
        createdAt: "2026-07-08T10:00:00.000Z",
        updatedAt: "2026-07-08T10:00:00.000Z",
      },
      // Unlinked Petty Cash Payment -> MUST count as BOTH incurred and paid cost!
      {
        id: "CTX-PETTY-1",
        referenceNo: "PAY-20260712-0002",
        type: "Payment",
        date: "2026-07-12",
        amount: 50000,
        accountId: "ACC-PETTY",
        accountName: "Site Petty Cash",
        project: "Bole Tower",
        department: "Site Operations",
        category: "Site Overhead Costs",
        counterparty: "Site Guard & Cleaning",
        paymentMethod: "Cash",
        status: "Confirmed & Paid",
        createdBy: "Site Accountant",
        createdById: "U-ACC",
        createdAt: "2026-07-12T10:00:00.000Z",
        updatedAt: "2026-07-12T10:00:00.000Z",
      },
    ];

    mockInvoices = [
      {
        id: "INV-BOLE-1",
        receivableId: "AR-20260701-0001",
        invoiceNumber: "INV-BOLE-001",
        project: "Bole Tower",
        client: "Federal Housing Corp",
        amount: 2500000,
        paidAmount: 1000000,
        status: "Partially Paid",
        date: "2026-07-01",
        dueDate: "2026-08-01",
      },
    ];

    mockPayroll = [
      {
        id: "PR-BOLE-01",
        workerId: "W-1",
        employeeId: "W-1",
        workerName: "Kebede Tadesse",
        position: "Foreman",
        department: "Construction",
        team: "Structure A",
        project: "Bole Tower",
        employmentType: "Permanent",
        basicSalary: 140000,
        attendanceDays: 26,
        totalWorkingHours: 208,
        overtimeHours: 10,
        overtimePayment: 10000,
        undertimeHours: 0,
        undertimeDeduction: 0,
        allowances: 5000,
        deductions: 5000,
        netSalary: 150000,
        status: "Approved",
        grade: "Grade A",
        period: "2026-07",
      },
    ];

    vi.spyOn(DbService, "saveProjectBudgetPlan").mockImplementation(async (plan) => {
      const idx = mockPlans.findIndex((p) => p.id === plan.id);
      if (idx >= 0) mockPlans[idx] = plan;
      else mockPlans.push(plan);
    });
    vi.spyOn(DbService, "saveBudgetAllocation").mockImplementation(async (alloc) => {
      const idx = mockAllocations.findIndex((a) => a.id === alloc.id);
      if (idx >= 0) mockAllocations[idx] = alloc;
      else mockAllocations.push(alloc);
    });
    vi.spyOn(DbService, "saveBudgetRevision").mockImplementation(async (rev) => {
      const idx = mockRevisions.findIndex((r) => r.id === rev.id);
      if (idx >= 0) mockRevisions[idx] = rev;
      else mockRevisions.push(rev);
    });
    vi.spyOn(DbService, "saveActualCostEntry").mockImplementation(async (entry) => {
      const idx = mockActualCosts.findIndex((c) => c.id === entry.id);
      if (idx >= 0) mockActualCosts[idx] = entry;
      else mockActualCosts.push(entry);
    });
    vi.spyOn(DbService, "applyBudgetRevisionApprovalAtomic").mockImplementation(
      async ({ revision, plan }) => {
        const rIdx = mockRevisions.findIndex((r) => r.id === revision.id);
        if (rIdx >= 0) mockRevisions[rIdx] = revision;
        else mockRevisions.push(revision);

        const pIdx = mockPlans.findIndex((p) => p.id === plan.id);
        if (pIdx >= 0) mockPlans[pIdx] = plan;
        else mockPlans.push(plan);
      }
    );
    vi.spyOn(DbService, "addAuditLog").mockResolvedValue(undefined);
  });

  it("supports all 12 Budget Categories and computes line-item Quantity × Unit Price totals", () => {
    expect(PART4_BUDGET_CATEGORIES).toHaveLength(12);
    const summary = calculateBudgetLineItemsSummary(mockPlans[0].lineItems);
    expect(summary.totalPlanned).toBe(1000000);
    expect(summary.contingencyTotal).toBe(100000);
    expect(summary.categoryTotals["Material Costs"]).toBe(500000);
    expect(summary.categoryTotals["Labor Costs"]).toBe(300000);
    expect(summary.categoryTotals["Equipment Costs"]).toBe(100000);
  });

  it("enforces 5-stage Project Budget creation & approval workflow and excludes Draft/Submitted budgets from official totals", async () => {
    const newDraft = await createOrSubmitProjectBudget({
      draft: {
        projectName: "Adama Industrial Park",
        projectCode: "PRJ-003",
        contractNumber: "CNT-ADAMA-01",
        clientName: "IPDC",
        projectManager: "Eng. Solomon",
        budgetPreparationDate: "2026-07-15",
        budgetPeriod: "2026",
        budgetYear: "2026",
        projectStartDate: "2026-08-01",
        projectCompletionDate: "2027-08-01",
        originalContractAmount: 12000000,
        contingencyBudget: 250000,
        lineItems: [
          {
            id: "LI-1",
            budgetItemId: "ITM-001",
            projectName: "Adama Industrial Park",
            budgetCategory: "Material Costs",
            subcategory: "Concrete",
            itemDescription: "Ready-mix C30",
            unitOfMeasurement: "m3",
            plannedQuantity: 100,
            unitPrice: 7500,
            totalPlannedCost: 750000,
          },
          {
            id: "LI-2",
            budgetItemId: "ITM-002",
            projectName: "Adama Industrial Park",
            budgetCategory: "Contingency",
            subcategory: "Reserve",
            itemDescription: "Risk Contingency",
            unitOfMeasurement: "Lump Sum",
            plannedQuantity: 1,
            unitPrice: 250000,
            totalPlannedCost: 250000,
          },
        ],
      },
      submitForReview: true,
      actorName: "Eng. Solomon",
      actorRole: UserRole.PROJECT_MANAGER,
      actorUid: "U-PM",
    });

    expect(newDraft.budgetId).toMatch(/^BGT-\d{8}-\d{4}$/);
    expect(newDraft.approvedProjectBudget).toBe(1000000);
    expect(newDraft.originalApprovedBudget).toBe(0); // Not yet locked
    expect(newDraft.budgetStatus).toBe("Submitted");
    expect(newDraft.workflowStage).toBe("Finance Review");

    // Stage 2 -> Finance Review
    const finReviewed = await advanceProjectBudgetWorkflow({
      plan: newDraft,
      action: "Finance Review",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(finReviewed.workflowStage).toBe("Project Manager Review");

    // Role check: Accountant cannot perform PM Review or Management Approval
    await expect(
      advanceProjectBudgetWorkflow({
        plan: finReviewed,
        action: "Approve",
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Only Finance Manager or Head Office/i);

    // Stage 3 -> PM Review
    const pmReviewed = await advanceProjectBudgetWorkflow({
      plan: finReviewed,
      action: "PM Review",
      actorName: "Eng. Solomon",
      actorRole: UserRole.PROJECT_MANAGER,
      actorUid: "U-PM",
    });
    expect(pmReviewed.workflowStage).toBe("Management Approval");

    // Stage 4 -> Management Approval activates budget & locks originalApprovedBudget
    const activated = await advanceProjectBudgetWorkflow({
      plan: pmReviewed,
      action: "Approve",
      actorName: "Managing Director",
      actorRole: UserRole.HEAD_OFFICE,
      actorUid: "U-HO",
    });
    expect(activated.budgetStatus).toBe("Approved");
    expect(activated.workflowStage).toBe("Budget Activation");
    expect(activated.originalApprovedBudget).toBe(1000000);
  });

  it("prevents Monthly Budget Allocations from exceeding Approved Budget unless authorized override", async () => {
    const bolePlan = mockPlans[0]; // Approved 1,000,000; BAL-1 = 300,000 -> remaining 700,000
    const unalloc = getRemainingUnallocatedBudget(bolePlan, mockAllocations);
    expect(unalloc.remainingUnallocated).toBe(700000);

    await expect(
      createBudgetAllocation({
        plan: bolePlan,
        existingAllocations: mockAllocations,
        budgetMonth: "2026-08",
        budgetCategory: "Labor Costs",
        allocatedAmount: 800000, // Exceeds 700,000 remaining
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/exceeds remaining unallocated budget/i);

    // Allocations against non-approved budgets (Yeka Villas Submitted) must be rejected
    await expect(
      createBudgetAllocation({
        plan: mockPlans[1],
        existingAllocations: mockAllocations,
        budgetMonth: "2026-07",
        budgetCategory: "Material Costs",
        allocatedAmount: 100000,
        actorName: "Finance Manager",
        actorRole: UserRole.FINANCE_MANAGER,
        actorUid: "U-FM",
      })
    ).rejects.toThrow(/Approved or Revised official project budget/i);

    // Valid allocation within remaining 700,000 + Finance approval workflow
    const alloc = await createBudgetAllocation({
      plan: bolePlan,
      existingAllocations: mockAllocations,
      budgetMonth: "2026-08",
      budgetCategory: "Labor Costs",
      allocatedAmount: 250000,
      actorName: "Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });
    expect(alloc.approvalStatus).toBe("Pending Verification");

    const approvedAlloc = await advanceAllocationWorkflow({
      allocation: alloc,
      action: "Approve",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(approvedAlloc.approvalStatus).toBe("Approved");
  });

  it("prevents double-counting across AP, Cash Payments, Payroll, and blocks duplicate invoice/source actual costs", async () => {
    const unified = buildUnifiedActualCostLedger({
      actualCostEntries: mockActualCosts,
      expenses: mockExpenses,
      cashTransactions: mockCashTxs,
      payrollRecords: mockPayroll,
      procurements: [],
      equipments: [],
    });

    // Should contain:
    // 1) EXP-BOLE-1 (AP): incurred 200,000, paid 120,000
    // 2) CTX-PETTY-1 (Petty Cash): incurred 50,000, paid 50,000
    // 3) PR-BOLE-01 (Payroll): incurred 150,000, paid 0
    // CTX-LINKED-1 (120,000) MUST NOT appear as a separate incurred cost!
    expect(unified).toHaveLength(3);
    const totalIncurred = unified.reduce((s, c) => s + c.incurredAmount, 0);
    const totalPaid = unified.reduce((s, c) => s + c.paidAmount, 0);
    expect(totalIncurred).toBe(200000 + 50000 + 150000); // 400,000 (NOT 520,000!)
    expect(totalPaid).toBe(120000 + 50000); // 170,000

    // Direct entry duplicate source & duplicate invoice guard
    const direct = await registerActualCostEntry({
      draft: {
        projectName: "Bole Tower",
        transactionDate: "2026-07-15",
        budgetCategory: "Equipment Costs",
        costDescription: "Tower crane extra shift",
        quantity: 2,
        unitPrice: 25000,
        supplierOrPayee: "Addis Cranes",
        invoiceNumber: "CRANE-INV-99",
        sourceModule: "Equipment Management",
        sourceRecordId: "EQ-LOG-99",
      },
      existingEntries: mockActualCosts,
      actorName: "Accountant",
      actorRole: UserRole.ACCOUNTANT,
      actorUid: "U-ACC",
    });
    expect(direct.totalCost).toBe(50000);
    expect(direct.verificationStatus).toBe("Registered");

    await expect(
      registerActualCostEntry({
        draft: {
          projectName: "Bole Tower",
          transactionDate: "2026-07-16",
          budgetCategory: "Equipment Costs",
          costDescription: "Duplicate source",
          quantity: 1,
          unitPrice: 50000,
          supplierOrPayee: "Addis Cranes",
          sourceModule: "Equipment Management",
          sourceRecordId: "EQ-LOG-99",
        },
        existingEntries: mockActualCosts,
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Duplicate actual cost blocked/i);

    await expect(
      registerActualCostEntry({
        draft: {
          projectName: "Bole Tower",
          transactionDate: "2026-07-16",
          budgetCategory: "Equipment Costs",
          costDescription: "Duplicate invoice",
          quantity: 1,
          unitPrice: 50000,
          supplierOrPayee: "Addis Cranes",
          invoiceNumber: "CRANE-INV-99",
          sourceModule: "Direct Entry",
        },
        existingEntries: mockActualCosts,
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Duplicate Invoice Number/i);

    // Accountant cannot perform final Validate on actual cost entry
    await expect(
      verifyActualCostEntry({
        entry: direct,
        action: "Validate",
        actorName: "Accountant",
        actorRole: UserRole.ACCOUNTANT,
        actorUid: "U-ACC",
      })
    ).rejects.toThrow(/Finance Manager or Head Office/i);

    const validated = await verifyActualCostEntry({
      entry: direct,
      action: "Validate",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(validated.verificationStatus).toBe("Validated");
  });

  it("classifies all 4 Budget Utilization color bands (<70% Green, 70-85% Yellow, >85-100% Orange, >100% Red)", () => {
    expect(classifyBudgetUtilization(1000000, 500000)).toMatchObject({
      utilizationPct: 50,
      color: "Green",
      varianceAmount: 500000,
      varianceStatus: "Under Budget",
    });
    expect(classifyBudgetUtilization(1000000, 700000)).toMatchObject({
      utilizationPct: 70,
      color: "Yellow",
    });
    expect(classifyBudgetUtilization(1000000, 850000)).toMatchObject({
      utilizationPct: 85,
      color: "Yellow",
    });
    expect(classifyBudgetUtilization(1000000, 920000)).toMatchObject({
      utilizationPct: 92,
      color: "Orange",
    });
    expect(classifyBudgetUtilization(1000000, 1120000)).toMatchObject({
      utilizationPct: 112,
      color: "Red",
      varianceAmount: -120000,
      overrunAmount: 120000,
      varianceStatus: "Over Budget",
    });
  });

  it("preserves originalApprovedBudget baseline across approved Budget Revisions", async () => {
    const revReq = await requestBudgetRevision({
      plan: mockPlans[0],
      proposedRevisedBudget: 1250000,
      affectedCategory: "Material Costs",
      revisionReason: "Cement and rebar escalation approved by client variation order",
      actorName: "Eng. Dawit",
      actorRole: UserRole.PROJECT_MANAGER,
      actorUid: "U-PM",
    });

    expect(revReq.originalApprovedBudget).toBe(1000000);
    expect(revReq.previousRevisedBudget).toBe(1000000);
    expect(revReq.budgetChangeAmount).toBe(250000);
    expect(revReq.revisionStatus).toBe("Requested");

    const revReviewed = await advanceBudgetRevisionWorkflow({
      revision: revReq,
      plan: mockPlans[0],
      action: "Finance Review",
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "U-FM",
    });
    expect(revReviewed.revision.revisionStatus).toBe("Finance Review");

    const { revision, plan } = await advanceBudgetRevisionWorkflow({
      revision: revReviewed.revision,
      plan: mockPlans[0],
      action: "Approve",
      actorName: "Managing Director",
      actorRole: UserRole.HEAD_OFFICE,
      actorUid: "U-HO",
    });

    expect(revision.revisionStatus).toBe("Approved");
    expect(plan.originalApprovedBudget).toBe(1000000); // Baseline strictly preserved!
    expect(plan.approvedProjectBudget).toBe(1250000);
    expect(plan.budgetStatus).toBe("Revised");
  });

  it("computes Part 4 KPIs, triggers Budget Control Alerts, enforces Project Manager scoping, and separates AP/AR on Financial Performance", () => {
    // Add an unapproved actual cost + overrun cost to trigger multiple alerts cleanly
    mockActualCosts.push(
      {
        id: "ACT-OVER-1",
        costTransactionId: "ACT-20260718-8001",
        projectName: "Bole Tower",
        transactionDate: "2026-07-18",
        budgetCategory: "Material Costs",
        costDescription: "Additional structural steel batch",
        quantity: 1,
        unitPrice: 700000,
        totalCost: 700000,
        paidAmount: 0,
        supplierOrPayee: "Habesha Steel",
        sourceModule: "Procurement",
        recordedBy: "Finance Officer",
        verificationStatus: "Validated",
        createdAt: "2026-07-18T08:00:00.000Z",
        updatedAt: "2026-07-18T08:00:00.000Z",
      },
      {
        id: "ACT-UNVERIFIED-1",
        costTransactionId: "ACT-20260719-8002",
        projectName: "Bole Tower",
        transactionDate: "2026-07-19",
        budgetCategory: "Labor Costs",
        costDescription: "Pending site overtime voucher",
        quantity: 1,
        unitPrice: 40000,
        totalCost: 40000,
        paidAmount: 0,
        supplierOrPayee: "Site Labor",
        sourceModule: "Direct Entry",
        recordedBy: "Site Accountant",
        verificationStatus: "Registered", // Unverified -> excluded from official actuals & triggers alert
        createdAt: "2026-07-19T08:00:00.000Z",
        updatedAt: "2026-07-19T08:00:00.000Z",
      }
    );

    const state = computePart4BudgetControlState({
      budgetPlans: mockPlans,
      allocations: mockAllocations,
      revisions: mockRevisions,
      actualCostEntries: mockActualCosts,
      expenses: mockExpenses,
      cashTransactions: mockCashTxs,
      invoices: mockInvoices,
      payrollRecords: mockPayroll,
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    // Only Bole Tower (Approved 1,000,000) is included in official approved budget (Yeka Submitted excluded!)
    expect(state.kpis.totalApprovedProjectBudget).toBe(1000000);
    // Verified actual incurred = 200,000 (AP) + 50,000 (Petty) + 150,000 (Payroll) + 700,000 (Material Validated) = 1,100,000
    expect(state.kpis.totalActualIncurredCost).toBe(1100000);
    expect(state.kpis.totalActualPaidCost).toBe(170000);
    expect(state.kpis.overallBudgetUtilizationPct).toBe(110);
    expect(state.kpis.projectsOverBudgetCount).toBe(1);

    const bolePerf = state.projectPerformanceRows.find((r) => r.projectName === "Bole Tower")!;
    expect(bolePerf.outstandingProjectPayables).toBe(80000); // 200k AP - 120k paid
    expect(bolePerf.projectReceivables).toBe(1500000); // 2.5M AR - 1M paid
    expect(bolePerf.financialPerformanceStatus).toBe("Over Budget");

    // Alerts include Over 100%, Monthly Allocation Exceeded, Category Exceeded, and Unapproved Expenditure
    const alertTypes = new Set(state.alerts.map((a) => a.ruleType));
    expect(alertTypes.has("UTILIZATION_OVER_100")).toBe(true);
    expect(alertTypes.has("MONTHLY_ALLOCATION_EXCEEDED")).toBe(true);
    expect(alertTypes.has("CATEGORY_BUDGET_EXCEEDED")).toBe(true);
    expect(alertTypes.has("UNAPPROVED_EXPENDITURE")).toBe(true);

    // Project Manager visibility scoping
    const pmState = computePart4BudgetControlState({
      budgetPlans: mockPlans,
      allocations: mockAllocations,
      revisions: mockRevisions,
      actualCostEntries: mockActualCosts,
      expenses: mockExpenses,
      cashTransactions: mockCashTxs,
      invoices: mockInvoices,
      payrollRecords: mockPayroll,
      filterState: BASE_FILTER,
      userRole: UserRole.PROJECT_MANAGER,
      userProfile: { assignedProjects: ["Yeka Villas"] },
      referenceToday: REF_TODAY,
    });
    expect(pmState.budgetPlans.every((p) => p.projectName === "Yeka Villas")).toBe(true);
    expect(pmState.kpis.totalApprovedProjectBudget).toBe(0); // Yeka is Submitted, Bole Tower filtered out
  });

  it("generates all 14 Budget Management & Cost Control Reports cleanly", () => {
    const state = computePart4BudgetControlState({
      budgetPlans: mockPlans,
      allocations: mockAllocations,
      revisions: mockRevisions,
      actualCostEntries: mockActualCosts,
      expenses: mockExpenses,
      cashTransactions: mockCashTxs,
      invoices: mockInvoices,
      payrollRecords: mockPayroll,
      filterState: BASE_FILTER,
      userRole: UserRole.FINANCE_MANAGER,
      referenceToday: REF_TODAY,
    });

    const reportIds: BudgetReportTypeId[] = [
      "project-budget-report",
      "monthly-budget-allocation-report",
      "actual-cost-report",
      "budget-vs-actual-cost-report",
      "budget-utilization-report",
      "cost-variance-report",
      "project-cost-breakdown-report",
      "budget-revision-history-report",
      "monthly-expenditure-report",
      "quarterly-expenditure-report",
      "annual-project-cost-report",
      "projects-over-budget-report",
      "remaining-budget-report",
      "project-financial-performance-report",
    ];

    expect(reportIds).toHaveLength(14);
    reportIds.forEach((id) => {
      const ds = buildPart4BudgetReportDataset(id, state, "ETB");
      expect(ds.id).toBe(id);
      expect(ds.columns.length).toBeGreaterThan(0);
    });
  });
});
