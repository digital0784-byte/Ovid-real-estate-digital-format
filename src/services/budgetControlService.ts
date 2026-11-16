import {
  ActualCostEntry,
  ActualCostSourceModule,
  BudgetAllocationRecord,
  BudgetAuditEntry,
  BudgetPerformanceIndicatorInfo,
  BudgetReportTypeId,
  BudgetRevisionRecord,
  BudgetUtilizationColor,
  CashTransactionRecord,
  Expense,
  FinancialBudgetRecord,
  FinancialInvoiceRecord,
  Part4BudgetCategory,
  PayrollRecord,
  ProjectBudgetItem,
  ProjectBudgetPlan,
  SupportingDocMeta,
  UserRole,
} from "../types";
import { DbService } from "./db";
import { parseMoney, safeString } from "../utils/formatters";
import {
  getAssignedProjectsForProfile,
  isConfirmedCashStatus,
  isReversedOrRejectedStatus,
  resolveUserFinancePermissions,
} from "./financeService";

export const PART4_BUDGET_CATEGORIES: Part4BudgetCategory[] = [
  "Material Costs",
  "Labor Costs",
  "Equipment Costs",
  "Subcontractor Costs",
  "Consultant Costs",
  "Transportation Costs",
  "Administrative Costs",
  "Site Overhead Costs",
  "Utilities Costs",
  "Tax and Duties",
  "Contingency",
  "Other Project Costs",
];

export const ACTUAL_COST_SOURCE_MODULES: ActualCostSourceModule[] = [
  "Procurement",
  "Material Management",
  "Inventory",
  "Payroll",
  "Equipment Management",
  "Subcontractor Management",
  "Accounts Payable",
  "Petty Cash",
  "Direct Entry",
];

export function generateBudgetRef(
  prefix: "BGT" | "BGI" | "BAL" | "BRV" | "ACT",
  now: Date = new Date()
): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function normalizeToPart4Category(raw?: string): Part4BudgetCategory {
  const s = safeString(raw).trim().toLowerCase();
  if (!s) return "Other Project Costs";
  if (s.includes("material") || s.includes("cement") || s.includes("rebar") || s.includes("steel")) {
    return "Material Costs";
  }
  if (s.includes("labor") || s.includes("labour") || s.includes("payroll") || s.includes("salary") || s.includes("wage")) {
    return "Labor Costs";
  }
  if (s.includes("equip") || s.includes("machin") || s.includes("fuel") || s.includes("rental") || s.includes("crane")) {
    return "Equipment Costs";
  }
  if (s.includes("subcontract")) {
    return "Subcontractor Costs";
  }
  if (s.includes("consult") || s.includes("architect") || s.includes("design") || s.includes("supervision")) {
    return "Consultant Costs";
  }
  if (s.includes("transport") || s.includes("logistics") || s.includes("freight") || s.includes("delivery") || s.includes("vehicle")) {
    return "Transportation Costs";
  }
  if (s.includes("admin") || s.includes("office")) {
    return "Administrative Costs";
  }
  if (s.includes("overhead") || s.includes("site")) {
    return "Site Overhead Costs";
  }
  if (s.includes("util") || s.includes("water") || s.includes("electric") || s.includes("power") || s.includes("internet")) {
    return "Utilities Costs";
  }
  if (s.includes("tax") || s.includes("vat") || s.includes("duty") || s.includes("duties") || s.includes("customs")) {
    return "Tax and Duties";
  }
  if (s.includes("contingen")) {
    return "Contingency";
  }
  return "Other Project Costs";
}

export function classifyBudgetUtilization(
  approvedBudget: number,
  actualCost: number
): BudgetPerformanceIndicatorInfo {
  const approved = Math.max(0, Number(approvedBudget) || 0);
  const actual = Math.max(0, Number(actualCost) || 0);
  const utilizationPct =
    approved > 0 ? Number(((actual / approved) * 100).toFixed(1)) : actual > 0 ? 100.1 : 0;
  const varianceAmount = approved - actual;
  const overrunAmount = Math.max(0, actual - approved);

  let varianceStatus: "Under Budget" | "On Budget" | "Over Budget" = "Under Budget";
  if (Math.abs(varianceAmount) < 0.01 && approved > 0) {
    varianceStatus = "On Budget";
  } else if (varianceAmount < 0) {
    varianceStatus = "Over Budget";
  }

  let color: BudgetUtilizationColor = "Green";
  let tierLabel = "Healthy (< 70%)";
  let tierLabelAm = "ጤናማ (< 70%)";

  if (utilizationPct > 100) {
    color = "Red";
    tierLabel = "Over Budget (> 100%)";
    tierLabelAm = "ከበጀት በላይ (> 100%)";
  } else if (utilizationPct > 85) {
    color = "Orange";
    tierLabel = "High Risk (> 85–100%)";
    tierLabelAm = "ከፍተኛ አጠቃቀም (> 85–100%)";
  } else if (utilizationPct >= 70) {
    color = "Yellow";
    tierLabel = "Watch Zone (70–85%)";
    tierLabelAm = "ጥንቃቄ (70–85%)";
  }

  return {
    utilizationPct,
    color,
    tierLabel,
    tierLabelAm,
    varianceAmount,
    varianceStatus,
    overrunAmount,
  };
}

export function calculateBudgetLineItemsSummary(
  items: ProjectBudgetItem[]
): {
  totalPlanned: number;
  contingencyTotal: number;
  categoryTotals: Record<Part4BudgetCategory, number>;
} {
  const categoryTotals = PART4_BUDGET_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {} as Record<Part4BudgetCategory, number>);

  let totalPlanned = 0;
  items.forEach((it) => {
    const qty = Math.max(0, Number(it.plannedQuantity) || 0);
    const price = Math.max(0, Number(it.unitPrice) || 0);
    const lineTotal = it.totalPlannedCost > 0 ? Number(it.totalPlannedCost) : qty * price;
    const cat = normalizeToPart4Category(it.budgetCategory);
    categoryTotals[cat] += lineTotal;
    totalPlanned += lineTotal;
  });

  return {
    totalPlanned,
    contingencyTotal: categoryTotals["Contingency"] || 0,
    categoryTotals,
  };
}

export function getMonthQuarterLabel(ym: string): string {
  const clean = safeString(ym).slice(0, 7);
  const [yStr, mStr] = clean.split("-");
  const month = Number(mStr) || 1;
  const q = Math.ceil(month / 3);
  return `${yStr || new Date().getFullYear()}-Q${q}`;
}

export function getRemainingUnallocatedBudget(
  plan: ProjectBudgetPlan,
  allocations: BudgetAllocationRecord[],
  excludeAllocationId?: string
): {
  approvedBudget: number;
  allocatedTotal: number;
  remainingUnallocated: number;
} {
  const approvedBudget = Math.max(0, Number(plan.approvedProjectBudget) || 0);
  const allocatedTotal = allocations
    .filter(
      (a) =>
        a.projectBudgetPlanId === plan.id &&
        a.approvalStatus !== "Rejected" &&
        a.id !== excludeAllocationId
    )
    .reduce((sum, a) => sum + (Number(a.allocatedAmount) || 0), 0);

  return {
    approvedBudget,
    allocatedTotal,
    remainingUnallocated: Math.max(0, approvedBudget - allocatedTotal),
  };
}

// ============================================================================
// PART 4 FIRESTORE WORKFLOW MUTATIONS (CREATION, ALLOCATION, COST, REVISION)
// ============================================================================

export async function createOrSubmitProjectBudget(params: {
  draft: {
    id?: string;
    budgetId?: string;
    projectName: string;
    projectId?: string;
    projectCode: string;
    contractNumber: string;
    clientName: string;
    projectManager: string;
    department?: string;
    budgetPreparationDate: string;
    budgetPeriod: string;
    budgetYear: string;
    projectStartDate: string;
    projectCompletionDate: string;
    originalContractAmount: number;
    contingencyBudget: number;
    approvedProjectBudget?: number;
    currency?: string;
    lineItems: ProjectBudgetItem[];
    supportingDocuments?: SupportingDocMeta[];
  };
  submitForReview: boolean;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<ProjectBudgetPlan> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageBudgets && params.actorRole !== UserRole.PROJECT_MANAGER) {
    throw new Error("Role does not have permission to create or submit project budgets.");
  }
  if (!safeString(params.draft.projectName)) {
    throw new Error("Project Name is required.");
  }
  if (!safeString(params.draft.projectCode)) {
    throw new Error("Project Code is required.");
  }

  const lineSummary = calculateBudgetLineItemsSummary(params.draft.lineItems || []);
  const computedBudget =
    lineSummary.totalPlanned > 0
      ? lineSummary.totalPlanned
      : Number(params.draft.approvedProjectBudget || 0);
  if (!Number.isFinite(computedBudget) || computedBudget <= 0) {
    throw new Error("Project Budget must have line items or a positive budget total.");
  }

  const nowIso = new Date().toISOString();
  const id = params.draft.id || `BGP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const budgetId = params.draft.budgetId || generateBudgetRef("BGT");
  const normalizedItems: ProjectBudgetItem[] = (params.draft.lineItems || []).map((item, idx) => ({
    ...item,
    id: item.id || `BGI-${Date.now()}-${idx + 1}`,
    budgetItemId: item.budgetItemId || `ITM-${String(idx + 1).padStart(3, "0")}`,
    projectName: params.draft.projectName.trim(),
    budgetCategory: normalizeToPart4Category(item.budgetCategory),
    plannedQuantity: Math.max(0, Number(item.plannedQuantity) || 0),
    unitPrice: Math.max(0, Number(item.unitPrice) || 0),
    totalPlannedCost:
      Math.max(0, Number(item.plannedQuantity) || 0) * Math.max(0, Number(item.unitPrice) || 0),
  }));

  const contingency =
    Number(params.draft.contingencyBudget) > 0
      ? Number(params.draft.contingencyBudget)
      : lineSummary.contingencyTotal;

  const plan: ProjectBudgetPlan = {
    id,
    budgetId,
    projectName: params.draft.projectName.trim(),
    projectId: params.draft.projectId || params.draft.projectCode.trim(),
    projectCode: params.draft.projectCode.trim(),
    contractNumber: params.draft.contractNumber.trim(),
    clientName: params.draft.clientName.trim(),
    projectManager: params.draft.projectManager.trim(),
    department: params.draft.department?.trim() || "Engineering & Operations",
    budgetPreparationDate: params.draft.budgetPreparationDate || nowIso.slice(0, 10),
    budgetPeriod: params.draft.budgetPeriod || params.draft.budgetYear || nowIso.slice(0, 4),
    budgetYear: params.draft.budgetYear || nowIso.slice(0, 4),
    projectStartDate: params.draft.projectStartDate || nowIso.slice(0, 10),
    projectCompletionDate: params.draft.projectCompletionDate || nowIso.slice(0, 10),
    originalContractAmount: Number(params.draft.originalContractAmount || 0),
    originalApprovedBudget: 0, // Locked when Management approves
    approvedProjectBudget: computedBudget,
    contingencyBudget: contingency,
    currency: params.draft.currency || "ETB",
    lineItems: normalizedItems,
    budgetPreparedBy: params.actorName,
    supportingDocuments: params.draft.supportingDocuments || [],
    budgetStatus: params.submitForReview ? "Submitted" : "Draft",
    workflowStage: params.submitForReview ? "Finance Review" : "Budget Preparation",
    auditHistory: [
      {
        timestamp: nowIso,
        action: params.submitForReview ? "Submitted Project Budget" : "Saved Draft Project Budget",
        actorName: params.actorName,
        actorRole: params.actorRole,
        stage: params.submitForReview ? "Finance Review" : "Budget Preparation",
        notes: `${budgetId} for ${params.draft.projectName} totaling ETB ${computedBudget.toLocaleString()}`,
      },
    ],
    createdBy: params.actorName,
    createdById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveProjectBudgetPlan(plan);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: plan.budgetStatus === "Submitted" ? "Submit Project Budget" : "Draft Project Budget",
    category: "Finance",
    severity: "INFO",
    details: `${plan.budgetId} (${plan.projectName}) prepared for ETB ${computedBudget.toLocaleString()}.`,
  });

  return plan;
}

export async function advanceProjectBudgetWorkflow(params: {
  plan: ProjectBudgetPlan;
  action: "Submit" | "Finance Review" | "PM Review" | "Approve" | "Reject" | "Close";
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<ProjectBudgetPlan> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  const isPm = params.actorRole === UserRole.PROJECT_MANAGER;

  if (params.action === "PM Review") {
    if (!isPm && !perms.isDirector && !perms.isFinanceManager) {
      throw new Error("Only Project Manager, Finance Manager, or Director can complete PM review.");
    }
  } else if (params.action === "Submit") {
    if (!perms.canManageBudgets && !isPm) {
      throw new Error("Role cannot submit project budget.");
    }
  } else {
    if (!perms.canManageBudgets && !perms.isDirector && !perms.isFinanceManager) {
      throw new Error("Only Finance Manager or Head Office / Director can approve, reject, review, or close budgets.");
    }
  }

  const nowIso = new Date().toISOString();
  const next: ProjectBudgetPlan = { ...params.plan, updatedAt: nowIso };
  const auditEntry: BudgetAuditEntry = {
    timestamp: nowIso,
    action: params.action,
    actorName: params.actorName,
    actorRole: params.actorRole,
    notes: params.notes,
  };

  if (params.action === "Submit") {
    next.budgetStatus = "Submitted";
    next.workflowStage = "Finance Review";
  } else if (params.action === "Finance Review") {
    next.reviewedBy = params.actorName;
    next.reviewedAt = nowIso;
    next.budgetStatus = "Under Review";
    next.workflowStage = "Project Manager Review";
  } else if (params.action === "PM Review") {
    next.pmReviewedBy = params.actorName;
    next.pmReviewedAt = nowIso;
    next.budgetStatus = "Under Review";
    next.workflowStage = "Management Approval";
  } else if (params.action === "Approve") {
    next.approvedBy = params.actorName;
    next.approvalDate = nowIso.slice(0, 10);
    next.budgetStatus = "Approved";
    next.workflowStage = "Budget Activation";
    if (!next.originalApprovedBudget || next.originalApprovedBudget <= 0) {
      next.originalApprovedBudget = next.approvedProjectBudget;
    }
  } else if (params.action === "Reject") {
    if (!safeString(params.notes)) {
      throw new Error("A rejection reason is required.");
    }
    next.budgetStatus = "Rejected";
    next.rejectionReason = params.notes;
  } else if (params.action === "Close") {
    next.budgetStatus = "Closed";
  }

  auditEntry.stage = next.workflowStage;
  next.auditHistory = [...(params.plan.auditHistory || []), auditEntry];

  await DbService.saveProjectBudgetPlan(next);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Project Budget ${params.action}`,
    category: "Finance",
    severity: params.action === "Reject" ? "WARNING" : "INFO",
    details: `${next.budgetId} (${next.projectName}) -> ${next.budgetStatus} (${next.workflowStage})`,
  });

  return next;
}

export async function createBudgetAllocation(params: {
  plan: ProjectBudgetPlan;
  existingAllocations: BudgetAllocationRecord[];
  budgetMonth: string; // YYYY-MM
  budgetCategory: Part4BudgetCategory;
  budgetItem?: string;
  budgetItemId?: string;
  allocatedAmount: number;
  notes?: string;
  autoApprove?: boolean;
  authorizeOverAllocation?: boolean;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BudgetAllocationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageBudgets && !perms.isFinanceManager && !perms.isDirector && !perms.isAccountant) {
    throw new Error("Role does not have permission to create budget allocations.");
  }
  if (params.plan.budgetStatus !== "Approved" && params.plan.budgetStatus !== "Revised") {
    throw new Error("Allocations can only be created against an Approved or Revised official project budget.");
  }
  if (!/^\d{4}-\d{2}$/.test(safeString(params.budgetMonth))) {
    throw new Error("Valid budget month (YYYY-MM) is required.");
  }
  const amount = Number(params.allocatedAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Allocation amount must be greater than zero.");
  }

  const { allocatedTotal, remainingUnallocated } = getRemainingUnallocatedBudget(
    params.plan,
    params.existingAllocations
  );

  const canOverride =
    Boolean(params.authorizeOverAllocation) && (perms.isDirector || perms.isFinanceManager);
  if (amount > remainingUnallocated + 0.01 && !canOverride) {
    throw new Error(
      `Allocation amount (ETB ${amount.toLocaleString()}) exceeds remaining unallocated budget (ETB ${remainingUnallocated.toLocaleString()}) for ${params.plan.projectName}. Request a budget revision first.`
    );
  }

  const nowIso = new Date().toISOString();
  const approvedDirectly = Boolean(params.autoApprove) && (perms.isDirector || perms.isFinanceManager);
  const record: BudgetAllocationRecord = {
    id: `BAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    allocationId: generateBudgetRef("BAL"),
    projectBudgetPlanId: params.plan.id,
    projectName: params.plan.projectName,
    projectCode: params.plan.projectCode,
    budgetYear: params.budgetMonth.slice(0, 4),
    budgetMonth: params.budgetMonth,
    budgetCategory: normalizeToPart4Category(params.budgetCategory),
    budgetItem: params.budgetItem,
    budgetItemId: params.budgetItemId,
    allocatedAmount: amount,
    previouslyAllocatedAmount: allocatedTotal,
    remainingUnallocatedBudget: Math.max(0, remainingUnallocated - amount),
    preparedBy: params.actorName,
    reviewedBy: approvedDirectly ? params.actorName : undefined,
    reviewedAt: approvedDirectly ? nowIso : undefined,
    approvedBy: approvedDirectly ? params.actorName : undefined,
    approvedAt: approvedDirectly ? nowIso : undefined,
    approvalStatus: approvedDirectly ? "Approved" : "Pending Verification",
    notes: params.notes,
    auditHistory: [
      {
        timestamp: nowIso,
        action: approvedDirectly ? "Allocated & Approved" : "Allocation Submitted",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `${params.budgetMonth} ${params.budgetCategory}: ETB ${amount.toLocaleString()}`,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveBudgetAllocation(record);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Create Budget Allocation",
    category: "Finance",
    severity: "INFO",
    details: `${record.allocationId} allocated ETB ${amount.toLocaleString()} for ${record.projectName} (${record.budgetMonth} · ${record.budgetCategory}).`,
  });

  return record;
}

export async function advanceAllocationWorkflow(params: {
  allocation: BudgetAllocationRecord;
  action: "Finance Verify" | "Approve" | "Reject";
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<BudgetAllocationRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageBudgets && !perms.isDirector && !perms.isFinanceManager) {
    throw new Error("Only Finance Manager or Head Office / Director can verify, approve, or reject allocations.");
  }

  const nowIso = new Date().toISOString();
  const next: BudgetAllocationRecord = { ...params.allocation, updatedAt: nowIso };
  if (params.action === "Finance Verify") {
    next.approvalStatus = "Finance Verified";
    next.reviewedBy = params.actorName;
    next.reviewedAt = nowIso;
  } else if (params.action === "Approve") {
    next.approvalStatus = "Approved";
    next.approvedBy = params.actorName;
    next.approvedAt = nowIso;
  } else {
    if (!safeString(params.notes)) throw new Error("Rejection reason is required.");
    next.approvalStatus = "Rejected";
    next.rejectionReason = params.notes;
  }

  next.auditHistory = [
    ...(params.allocation.auditHistory || []),
    {
      timestamp: nowIso,
      action: params.action,
      actorName: params.actorName,
      actorRole: params.actorRole,
      notes: params.notes,
    },
  ];

  await DbService.saveBudgetAllocation(next);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Allocation ${params.action}`,
    category: "Finance",
    severity: params.action === "Reject" ? "WARNING" : "INFO",
    details: `${next.allocationId} -> ${next.approvalStatus}`,
  });
  return next;
}

export async function registerActualCostEntry(params: {
  draft: {
    projectName: string;
    projectCode?: string;
    transactionDate: string;
    budgetCategory: Part4BudgetCategory;
    budgetItem?: string;
    budgetItemId?: string;
    costDescription: string;
    quantity: number;
    unitPrice: number;
    paidAmount?: number;
    supplierOrPayee: string;
    invoiceNumber?: string;
    paymentVoucherNumber?: string;
    sourceModule: ActualCostSourceModule;
    sourceRecordId?: string;
    supportingDocuments?: SupportingDocMeta[];
  };
  existingEntries: ActualCostEntry[];
  autoValidate?: boolean;
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<ActualCostEntry> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  const isPm = params.actorRole === UserRole.PROJECT_MANAGER;
  if (!perms.canManageTransactions && !perms.canManageBudgets && !isPm) {
    throw new Error("Role does not have permission to register actual project costs.");
  }

  if (!safeString(params.draft.projectName)) {
    throw new Error("Project Name is required.");
  }
  if (!safeString(params.draft.costDescription)) {
    throw new Error("Cost Description is required.");
  }
  const qty = Math.max(0, Number(params.draft.quantity) || 0);
  const price = Math.max(0, Number(params.draft.unitPrice) || 0);
  const totalCost = qty * price;
  if (!Number.isFinite(totalCost) || totalCost <= 0) {
    throw new Error("Quantity × Unit Price must produce a positive total cost.");
  }

  // Duplicate prevention check (by sourceModule + sourceRecordId OR duplicate invoice/voucher on same project)
  const activeExisting = (params.existingEntries || []).filter(
    (e) => e.verificationStatus !== "Rejected"
  );
  const cleanSourceId = safeString(params.draft.sourceRecordId).trim().toLowerCase();
  if (cleanSourceId) {
    const dupSource = activeExisting.find(
      (e) =>
        e.sourceModule === params.draft.sourceModule &&
        safeString(e.sourceRecordId).trim().toLowerCase() === cleanSourceId
    );
    if (dupSource) {
      throw new Error(
        `Duplicate actual cost blocked: ${params.draft.sourceModule} record "${params.draft.sourceRecordId}" was already recorded (${dupSource.costTransactionId}).`
      );
    }
  }
  const cleanInv = safeString(params.draft.invoiceNumber).trim().toLowerCase();
  if (cleanInv) {
    const dupInv = activeExisting.find(
      (e) =>
        e.projectName.toLowerCase() === params.draft.projectName.trim().toLowerCase() &&
        safeString(e.invoiceNumber).trim().toLowerCase() === cleanInv
    );
    if (dupInv) {
      throw new Error(
        `Duplicate Invoice Number "${params.draft.invoiceNumber}" already exists on project ${params.draft.projectName} (${dupInv.costTransactionId}).`
      );
    }
  }
  const cleanVch = safeString(params.draft.paymentVoucherNumber).trim().toLowerCase();
  if (cleanVch) {
    const dupVch = activeExisting.find(
      (e) =>
        e.projectName.toLowerCase() === params.draft.projectName.trim().toLowerCase() &&
        safeString(e.paymentVoucherNumber).trim().toLowerCase() === cleanVch
    );
    if (dupVch) {
      throw new Error(
        `Duplicate Payment Voucher "${params.draft.paymentVoucherNumber}" already exists on project ${params.draft.projectName} (${dupVch.costTransactionId}).`
      );
    }
  }

  const nowIso = new Date().toISOString();
  const canValidate = Boolean(params.autoValidate) && (perms.isDirector || perms.isFinanceManager);
  const entry: ActualCostEntry = {
    id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    costTransactionId: generateBudgetRef("ACT"),
    projectName: params.draft.projectName.trim(),
    projectCode: params.draft.projectCode?.trim(),
    transactionDate: params.draft.transactionDate || nowIso.slice(0, 10),
    budgetCategory: normalizeToPart4Category(params.draft.budgetCategory),
    budgetItem: params.draft.budgetItem,
    budgetItemId: params.draft.budgetItemId,
    costDescription: params.draft.costDescription.trim(),
    quantity: qty,
    unitPrice: price,
    totalCost,
    paidAmount: Math.min(totalCost, Math.max(0, Number(params.draft.paidAmount) || 0)),
    supplierOrPayee: params.draft.supplierOrPayee.trim() || "Direct Cost",
    invoiceNumber: params.draft.invoiceNumber?.trim(),
    paymentVoucherNumber: params.draft.paymentVoucherNumber?.trim(),
    sourceModule: params.draft.sourceModule,
    sourceRecordId: params.draft.sourceRecordId?.trim(),
    supportingDocuments: params.draft.supportingDocuments || [],
    recordedBy: params.actorName,
    verifiedBy: canValidate ? params.actorName : undefined,
    verifiedAt: canValidate ? nowIso : undefined,
    validatedBy: canValidate ? params.actorName : undefined,
    validatedAt: canValidate ? nowIso : undefined,
    verificationStatus: canValidate ? "Validated" : "Registered",
    auditHistory: [
      {
        timestamp: nowIso,
        action: canValidate ? "Registered & Validated" : "Registered Actual Cost",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `${params.draft.sourceModule}: ETB ${totalCost.toLocaleString()}`,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveActualCostEntry(entry);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Register Actual Cost",
    category: "Finance",
    severity: "INFO",
    details: `${entry.costTransactionId} (${entry.projectName} · ${entry.budgetCategory}): ETB ${totalCost.toLocaleString()}.`,
  });

  return entry;
}

export async function verifyActualCostEntry(params: {
  entry: ActualCostEntry;
  action: "Source Verify" | "Classify Budget" | "Validate" | "Reject";
  budgetCategory?: Part4BudgetCategory;
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<ActualCostEntry> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  if (!perms.canManageBudgets && !perms.isDirector && !perms.isFinanceManager && !perms.isAccountant) {
    throw new Error("Role does not have permission to verify or validate actual cost entries.");
  }
  if (params.action === "Validate" && perms.isAccountant && !perms.isFinanceManager && !perms.isDirector) {
    throw new Error("Final cost validation requires Finance Manager or Head Office / Director authorization.");
  }

  const nowIso = new Date().toISOString();
  const next: ActualCostEntry = { ...params.entry, updatedAt: nowIso };
  if (params.budgetCategory) {
    next.budgetCategory = normalizeToPart4Category(params.budgetCategory);
  }
  if (params.action === "Source Verify") {
    next.verificationStatus = "Source Verified";
    next.verifiedBy = params.actorName;
    next.verifiedAt = nowIso;
  } else if (params.action === "Classify Budget") {
    next.verificationStatus = "Budget Classified";
  } else if (params.action === "Validate") {
    next.verificationStatus = "Validated";
    next.validatedBy = params.actorName;
    next.validatedAt = nowIso;
    if (!next.verifiedBy) {
      next.verifiedBy = params.actorName;
      next.verifiedAt = nowIso;
    }
  } else {
    if (!safeString(params.notes)) throw new Error("Rejection reason is required.");
    next.verificationStatus = "Rejected";
    next.rejectionReason = params.notes;
  }

  next.auditHistory = [
    ...(params.entry.auditHistory || []),
    {
      timestamp: nowIso,
      action: params.action,
      actorName: params.actorName,
      actorRole: params.actorRole,
      notes: params.notes,
    },
  ];

  await DbService.saveActualCostEntry(next);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Actual Cost ${params.action}`,
    category: "Finance",
    severity: params.action === "Reject" ? "WARNING" : "INFO",
    details: `${next.costTransactionId} -> ${next.verificationStatus}`,
  });

  return next;
}

export async function requestBudgetRevision(params: {
  plan: ProjectBudgetPlan;
  proposedRevisedBudget: number;
  affectedCategory?: Part4BudgetCategory | "All Categories";
  revisionReason: string;
  supportingDocuments?: SupportingDocMeta[];
  actorName: string;
  actorRole: string;
  actorUid: string;
}): Promise<BudgetRevisionRecord> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  const isPm = params.actorRole === UserRole.PROJECT_MANAGER;
  if (!perms.canManageBudgets && !isPm) {
    throw new Error("Role does not have permission to request a budget revision.");
  }
  if (params.plan.budgetStatus !== "Approved" && params.plan.budgetStatus !== "Revised") {
    throw new Error("Budget revisions can only be requested on Approved or Revised project budgets.");
  }
  const proposed = Number(params.proposedRevisedBudget);
  if (!Number.isFinite(proposed) || proposed <= 0) {
    throw new Error("Proposed Revised Budget must be greater than zero.");
  }
  if (!safeString(params.revisionReason)) {
    throw new Error("Revision Reason is required.");
  }

  const nowIso = new Date().toISOString();
  const originalBaseline =
    params.plan.originalApprovedBudget > 0
      ? params.plan.originalApprovedBudget
      : params.plan.approvedProjectBudget;
  const prevRevised = params.plan.approvedProjectBudget;
  const delta = proposed - prevRevised;

  const revision: BudgetRevisionRecord = {
    id: `BRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    revisionId: generateBudgetRef("BRV"),
    projectBudgetPlanId: params.plan.id,
    projectName: params.plan.projectName,
    projectCode: params.plan.projectCode,
    affectedCategory: params.affectedCategory || "All Categories",
    originalApprovedBudget: originalBaseline,
    previousRevisedBudget: prevRevised,
    proposedRevisedBudget: proposed,
    budgetChangeAmount: delta,
    revisionReason: params.revisionReason.trim(),
    supportingDocuments: params.supportingDocuments || [],
    requestedBy: params.actorName,
    requestedAt: nowIso,
    revisionStatus: "Requested",
    auditHistory: [
      {
        timestamp: nowIso,
        action: "Requested Budget Revision",
        actorName: params.actorName,
        actorRole: params.actorRole,
        notes: `${prevRevised.toLocaleString()} -> ${proposed.toLocaleString()} (${delta >= 0 ? "+" : ""}${delta.toLocaleString()})`,
      },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveBudgetRevision(revision);
  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: "Request Budget Revision",
    category: "Finance",
    severity: "WARNING",
    details: `${revision.revisionId} (${revision.projectName}): ETB ${prevRevised.toLocaleString()} -> ETB ${proposed.toLocaleString()}.`,
  });

  return revision;
}

export async function advanceBudgetRevisionWorkflow(params: {
  revision: BudgetRevisionRecord;
  plan: ProjectBudgetPlan;
  action: "Finance Review" | "PM Review" | "Approve" | "Reject";
  actorName: string;
  actorRole: string;
  actorUid: string;
  notes?: string;
}): Promise<{ revision: BudgetRevisionRecord; plan: ProjectBudgetPlan }> {
  const perms = resolveUserFinancePermissions(params.actorRole);
  const isPm = params.actorRole === UserRole.PROJECT_MANAGER;

  if (params.action === "PM Review") {
    if (!isPm && !perms.isDirector && !perms.isFinanceManager) {
      throw new Error("Only Project Manager, Finance Manager, or Director can complete PM review on revision.");
    }
  } else {
    if (!perms.isDirector && !perms.isFinanceManager) {
      throw new Error("Only Finance Manager or Head Office / Director can review, approve, or reject budget revisions.");
    }
  }

  const nowIso = new Date().toISOString();
  const nextRev: BudgetRevisionRecord = { ...params.revision, updatedAt: nowIso };
  let nextPlan: ProjectBudgetPlan = { ...params.plan };

  if (params.action === "Finance Review") {
    nextRev.revisionStatus = "Finance Review";
    nextRev.reviewedBy = params.actorName;
    nextRev.reviewedAt = nowIso;
  } else if (params.action === "PM Review") {
    nextRev.revisionStatus = "PM Review";
    nextRev.pmReviewedBy = params.actorName;
    nextRev.pmReviewedAt = nowIso;
  } else if (params.action === "Approve") {
    nextRev.revisionStatus = "Approved";
    nextRev.approvedBy = params.actorName;
    nextRev.approvalDate = nowIso.slice(0, 10);

    const preservedOriginal =
      params.plan.originalApprovedBudget > 0
        ? params.plan.originalApprovedBudget
        : params.revision.originalApprovedBudget || params.plan.approvedProjectBudget;

    nextPlan = {
      ...params.plan,
      originalApprovedBudget: preservedOriginal,
      approvedProjectBudget: params.revision.proposedRevisedBudget,
      budgetStatus: "Revised",
      updatedAt: nowIso,
      auditHistory: [
        ...(params.plan.auditHistory || []),
        {
          timestamp: nowIso,
          action: "Budget Revised by Approved Revision",
          actorName: params.actorName,
          actorRole: params.actorRole,
          stage: "Budget Activation",
          notes: `${nextRev.revisionId}: ETB ${params.plan.approvedProjectBudget.toLocaleString()} -> ETB ${params.revision.proposedRevisedBudget.toLocaleString()} (Original baseline preserved: ETB ${preservedOriginal.toLocaleString()})`,
        },
      ],
    };
  } else {
    if (!safeString(params.notes)) throw new Error("Rejection reason is required.");
    nextRev.revisionStatus = "Rejected";
    nextRev.rejectionReason = params.notes;
  }

  nextRev.auditHistory = [
    ...(params.revision.auditHistory || []),
    {
      timestamp: nowIso,
      action: params.action,
      actorName: params.actorName,
      actorRole: params.actorRole,
      notes: params.notes,
    },
  ];

  if (params.action === "Approve") {
    await DbService.applyBudgetRevisionApprovalAtomic({ revision: nextRev, plan: nextPlan });
  } else {
    await DbService.saveBudgetRevision(nextRev);
  }

  await DbService.addAuditLog({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    action: `Budget Revision ${params.action}`,
    category: "Finance",
    severity: params.action === "Approve" ? "WARNING" : "INFO",
    details: `${nextRev.revisionId} (${nextRev.projectName}) -> ${nextRev.revisionStatus}`,
  });

  return { revision: nextRev, plan: nextPlan };
}

// ============================================================================
// PART 4 COMPUTE & ANTI-DOUBLE-COUNTING AGGREGATION ENGINE
// ============================================================================

export interface UnifiedActualCostRecord {
  id: string;
  costTransactionId: string;
  projectName: string;
  transactionDate: string;
  month: string;
  quarter: string;
  year: string;
  budgetCategory: Part4BudgetCategory;
  budgetItem?: string;
  budgetItemId?: string;
  costDescription: string;
  incurredAmount: number;
  paidAmount: number;
  supplierOrPayee: string;
  invoiceNumber?: string;
  paymentVoucherNumber?: string;
  sourceModule: ActualCostSourceModule;
  sourceRecordId?: string;
  verificationStatus: string;
  isVerifiedOfficial: boolean;
  isAutoSyncedFromErp: boolean;
}

export interface Part4FilterState {
  project: string; // "ALL" or projectName
  budgetYear: string; // "ALL" or YYYY
  budgetCategory: string; // "ALL" or Part4BudgetCategory
  startDate: string;
  endDate: string;
  status: string; // "ALL" or budgetStatus
  searchTerm: string;
}

export interface Part4ProjectPerformanceRow {
  projectBudgetPlanId: string;
  budgetId: string;
  projectName: string;
  projectCode: string;
  contractNumber: string;
  clientName: string;
  projectManager: string;
  budgetYear: string;
  budgetStatus: string;
  originalApprovedBudget: number;
  currentApprovedBudget: number;
  contingencyBudget: number;
  totalMonthlyAllocations: number;
  remainingUnallocatedBudget: number;
  totalActualIncurredCost: number;
  totalActualPaidCost: number;
  unapprovedCostCount: number;
  unapprovedCostAmount: number;
  outstandingProjectPayables: number;
  projectReceivables: number;
  remainingBudget: number;
  costVariance: number;
  utilizationPct: number;
  costOverrun: number;
  indicator: BudgetPerformanceIndicatorInfo;
  financialPerformanceStatus: "Strong" | "On Track" | "At Risk" | "Over Budget";
}

export interface Part4CategoryBreakdownRow {
  category: Part4BudgetCategory;
  approvedBudget: number;
  monthlyAllocated: number;
  actualIncurred: number;
  actualPaid: number;
  remainingBudget: number;
  costVariance: number;
  utilizationPct: number;
  sharePct: number;
  indicator: BudgetPerformanceIndicatorInfo;
}

export interface Part4LineItemPerformanceRow {
  budgetItemId: string;
  projectName: string;
  category: Part4BudgetCategory;
  subcategory: string;
  itemDescription: string;
  unitOfMeasurement: string;
  plannedQuantity: number;
  unitPrice: number;
  plannedTotalCost: number;
  actualCost: number;
  varianceAmount: number;
  utilizationPct: number;
  indicator: BudgetPerformanceIndicatorInfo;
}

export interface Part4BudgetAlert {
  id: string;
  ruleType:
    | "UTILIZATION_70"
    | "UTILIZATION_85"
    | "UTILIZATION_OVER_100"
    | "MONTHLY_ALLOCATION_EXCEEDED"
    | "CATEGORY_BUDGET_EXCEEDED"
    | "BUDGET_NEAR_EXHAUSTION"
    | "UNAPPROVED_EXPENDITURE"
    | "PENDING_REVISION";
  severity: "INFO" | "WARNING" | "CRITICAL";
  project: string;
  category?: string;
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  utilizationPct?: number;
  amountEtb: number;
  timestamp: string;
}

export interface Part4BudgetControlState {
  permissions: ReturnType<typeof resolveUserFinancePermissions>;
  assignedProjects: string[];
  filterOptions: {
    projects: string[];
    years: string[];
    categories: Part4BudgetCategory[];
  };
  budgetPlans: ProjectBudgetPlan[];
  officialBudgets: ProjectBudgetPlan[];
  allocations: BudgetAllocationRecord[];
  revisions: BudgetRevisionRecord[];
  unifiedActualCosts: UnifiedActualCostRecord[];
  verifiedActualCosts: UnifiedActualCostRecord[];
  unverifiedActualCosts: UnifiedActualCostRecord[];
  kpis: {
    totalApprovedProjectBudget: number;
    totalActualIncurredCost: number;
    totalActualPaidCost: number;
    totalRemainingBudget: number;
    totalBudgetVariance: number;
    overallBudgetUtilizationPct: number;
    projectsOverBudgetCount: number;
    projectsWithinBudgetCount: number;
  };
  charts: {
    budgetVsActualByProject: {
      project: string;
      approvedBudget: number;
      actualIncurred: number;
      actualPaid: number;
      remainingBudget: number;
    }[];
    monthlyBudgetVsActual: {
      month: string;
      plannedAllocation: number;
      actualIncurred: number;
      actualPaid: number;
    }[];
    costDistributionByCategory: {
      category: Part4BudgetCategory;
      approvedBudget: number;
      actualIncurred: number;
      sharePct: number;
    }[];
    projectBudgetUtilization: {
      project: string;
      utilizationPct: number;
      color: BudgetUtilizationColor;
    }[];
    monthlyCostTrend: {
      month: string;
      monthlyCost: number;
      cumulativeCost: number;
      cumulativeBudget: number;
    }[];
    budgetVarianceAnalysis: {
      project: string;
      varianceAmount: number;
      status: "Under Budget" | "On Budget" | "Over Budget";
    }[];
  };
  projectPerformanceRows: Part4ProjectPerformanceRow[];
  categoryBreakdownRows: Part4CategoryBreakdownRow[];
  lineItemPerformanceRows: Part4LineItemPerformanceRow[];
  monthlyAllocationSummary: {
    month: string;
    quarter: string;
    year: string;
    allocatedAmount: number;
    actualIncurred: number;
    actualPaid: number;
    varianceAmount: number;
    utilizationPct: number;
    indicator: BudgetPerformanceIndicatorInfo;
  }[];
  alerts: Part4BudgetAlert[];
  referenceToday: string;
}

function isApprovedBudgetPlan(plan: ProjectBudgetPlan): boolean {
  return plan.budgetStatus === "Approved" || plan.budgetStatus === "Revised";
}

export function buildUnifiedActualCostLedger(params: {
  actualCostEntries: ActualCostEntry[];
  expenses: Expense[];
  cashTransactions: CashTransactionRecord[];
  payrollRecords: PayrollRecord[];
  procurements?: any[];
  equipments?: any[];
  materialIssues?: any[];
}): UnifiedActualCostRecord[] {
  const result: UnifiedActualCostRecord[] = [];
  const recordedSourceKeys = new Set<string>();
  const recordedInvoiceKeys = new Set<string>();
  const apExpenseIds = new Set<string>();
  const apBillNumbers = new Set<string>();
  const payrollIds = new Set<string>();

  // 1. Explicit Part 4 ActualCostEntry records (highest precedence)
  (params.actualCostEntries || []).forEach((e) => {
    if (e.verificationStatus === "Rejected") return;
    const total = Math.max(0, Number(e.totalCost) || 0);
    const paid = Math.min(total, Math.max(0, Number(e.paidAmount) || 0));
    const txDate = safeString(e.transactionDate, new Date().toISOString().slice(0, 10)).slice(0, 10);
    if (e.sourceRecordId) {
      recordedSourceKeys.add(`${e.sourceModule}::${e.sourceRecordId}`.toLowerCase());
    }
    if (e.invoiceNumber) {
      recordedInvoiceKeys.add(`${e.projectName}::${e.invoiceNumber}`.trim().toLowerCase());
    }
    result.push({
      id: e.id,
      costTransactionId: e.costTransactionId,
      projectName: safeString(e.projectName, "Unassigned Project"),
      transactionDate: txDate,
      month: txDate.slice(0, 7),
      quarter: getMonthQuarterLabel(txDate),
      year: txDate.slice(0, 4),
      budgetCategory: normalizeToPart4Category(e.budgetCategory),
      budgetItem: e.budgetItem,
      budgetItemId: e.budgetItemId,
      costDescription: e.costDescription,
      incurredAmount: total,
      paidAmount: paid,
      supplierOrPayee: e.supplierOrPayee || "Vendor",
      invoiceNumber: e.invoiceNumber,
      paymentVoucherNumber: e.paymentVoucherNumber,
      sourceModule: e.sourceModule || "Direct Entry",
      sourceRecordId: e.sourceRecordId,
      verificationStatus: e.verificationStatus,
      isVerifiedOfficial: e.verificationStatus === "Validated",
      isAutoSyncedFromErp: false,
    });
  });

  // 2. Accounts Payable / Expenses (incurred bills — deduplicated against direct cash payments!)
  const expenseCashPaidMap = new Map<string, number>();
  (params.cashTransactions || []).forEach((tx) => {
    if (tx.type === "Payment" && isConfirmedCashStatus(tx.status) && tx.linkedDocumentType === "Expense" && tx.linkedDocumentId) {
      expenseCashPaidMap.set(
        tx.linkedDocumentId,
        (expenseCashPaidMap.get(tx.linkedDocumentId) || 0) + (parseMoney(tx.amount) ?? 0)
      );
    }
  });

  (params.expenses || []).forEach((exp) => {
    const statusLower = safeString(exp.status).toLowerCase();
    if (statusLower === "rejected" || statusLower === "cancelled") return;
    apExpenseIds.add(exp.id);
    if (exp.billNumber) apBillNumbers.add(exp.billNumber.trim().toLowerCase());
    if (exp.purchaseOrderNumber) apBillNumbers.add(exp.purchaseOrderNumber.trim().toLowerCase());

    const sourceKey = `accounts payable::${exp.id}`.toLowerCase();
    if (recordedSourceKeys.has(sourceKey)) return;

    const proj = safeString(exp.project, "Unassigned Project");
    const invNo = exp.billNumber || exp.referenceNo;
    if (invNo && recordedInvoiceKeys.has(`${proj}::${invNo}`.trim().toLowerCase())) return;

    const incurred = Math.max(0, parseMoney(exp.amount) ?? 0);
    if (incurred <= 0) return;

    const paidFromLedger = expenseCashPaidMap.get(exp.id) || 0;
    const paidRaw = Math.max(parseMoney(exp.paidAmount) ?? 0, paidFromLedger);
    const paid = statusLower === "paid" ? incurred : Math.min(incurred, paidRaw);

    const isVerified =
      statusLower === "approved" ||
      statusLower === "paid" ||
      statusLower === "partially paid" ||
      exp.workflowStage === "Approved" ||
      exp.workflowStage === "Paid";

    const txDate = safeString(exp.date || exp.invoiceDate, new Date().toISOString().slice(0, 10)).slice(0, 10);
    result.push({
      id: `ERP-AP-${exp.id}`,
      costTransactionId: exp.payableId || exp.referenceNo || exp.id,
      projectName: proj,
      transactionDate: txDate,
      month: txDate.slice(0, 7),
      quarter: getMonthQuarterLabel(txDate),
      year: txDate.slice(0, 4),
      budgetCategory: normalizeToPart4Category(exp.payableCategory || exp.category),
      budgetItem: exp.description,
      costDescription: exp.description || `AP Expense (${exp.vendor})`,
      incurredAmount: incurred,
      paidAmount: paid,
      supplierOrPayee: exp.vendor || exp.supplier || "Supplier",
      invoiceNumber: invNo,
      sourceModule: "Accounts Payable",
      sourceRecordId: exp.id,
      verificationStatus: isVerified ? "Validated" : "Registered",
      isVerifiedOfficial: isVerified,
      isAutoSyncedFromErp: true,
    });
  });

  // 3. Direct / Petty Cash Payments (ONLY those NOT linked to an AP Expense or Payroll -> prevents double-counting!)
  (params.cashTransactions || []).forEach((tx) => {
    if (tx.type !== "Payment" || isReversedOrRejectedStatus(tx.status)) return;
    if (tx.linkedDocumentType === "Expense" && tx.linkedDocumentId && apExpenseIds.has(tx.linkedDocumentId)) {
      return; // Settlement of an already counted AP Expense -> DO NOT double-count incurred cost
    }
    if (tx.linkedDocumentType === "Payroll") {
      return; // Handled cleanly via Payroll or Cash only once
    }
    if (tx.invoiceNumber && apBillNumbers.has(tx.invoiceNumber.trim().toLowerCase())) {
      return; // Linked via invoiceNumber to AP bill
    }
    const sourceKey = `petty cash::${tx.id}`.toLowerCase();
    if (recordedSourceKeys.has(sourceKey)) return;

    const amt = Math.max(0, parseMoney(tx.amount) ?? 0);
    if (amt <= 0) return;

    const isConfirmed = isConfirmedCashStatus(tx.status);
    const txDate = safeString(tx.date, new Date().toISOString().slice(0, 10)).slice(0, 10);
    result.push({
      id: `ERP-CASH-${tx.id}`,
      costTransactionId: tx.referenceNo || tx.id,
      projectName: safeString(tx.project, "Unassigned Project"),
      transactionDate: txDate,
      month: txDate.slice(0, 7),
      quarter: getMonthQuarterLabel(txDate),
      year: txDate.slice(0, 4),
      budgetCategory: normalizeToPart4Category(tx.category),
      costDescription: tx.notes || tx.description || `Direct Cash Payment (${tx.counterparty})`,
      incurredAmount: amt,
      paidAmount: isConfirmed ? amt : 0,
      supplierOrPayee: tx.counterparty || "Payee",
      invoiceNumber: tx.invoiceNumber,
      paymentVoucherNumber: tx.paymentVoucherNumber,
      sourceModule: "Petty Cash",
      sourceRecordId: tx.id,
      verificationStatus: isConfirmed ? "Validated" : "Registered",
      isVerifiedOfficial: isConfirmed,
      isAutoSyncedFromErp: true,
    });
  });

  // 4. Approved / Paid Payroll Records
  (params.payrollRecords || []).forEach((pr) => {
    const statusLower = safeString(pr.status).toLowerCase();
    if (statusLower === "draft") return;
    payrollIds.add(pr.id);
    const sourceKey = `payroll::${pr.id}`.toLowerCase();
    if (recordedSourceKeys.has(sourceKey)) return;

    const net = Math.max(0, Number(pr.netSalary) || 0);
    if (net <= 0) return;
    const isVerified = statusLower === "approved" || statusLower === "paid";
    const periodDate = pr.period ? `${pr.period.slice(0, 7)}-28` : safeString(pr.updatedAt || pr.createdAt, new Date().toISOString().slice(0, 10)).slice(0, 10);
    result.push({
      id: `ERP-PAYROLL-${pr.id}`,
      costTransactionId: pr.id,
      projectName: safeString(pr.project, "General"),
      transactionDate: periodDate,
      month: periodDate.slice(0, 7),
      quarter: getMonthQuarterLabel(periodDate),
      year: periodDate.slice(0, 4),
      budgetCategory: "Labor Costs",
      budgetItem: pr.position || "Site Workforce",
      costDescription: `Payroll (${pr.workerName} · ${pr.department})`,
      incurredAmount: net,
      paidAmount: statusLower === "paid" ? net : 0,
      supplierOrPayee: pr.workerName,
      sourceModule: "Payroll",
      sourceRecordId: pr.id,
      verificationStatus: isVerified ? "Validated" : "Registered",
      isVerifiedOfficial: isVerified,
      isAutoSyncedFromErp: true,
    });
  });

  // 5. Procurement Orders not already billed in Accounts Payable
  (params.procurements || []).forEach((po: any) => {
    const statusLower = safeString(po.status).toLowerCase();
    if (statusLower === "rejected" || statusLower === "cancelled") return;
    const poNum = safeString(po.poNumber || po.id).trim().toLowerCase();
    if (poNum && apBillNumbers.has(poNum)) return; // Already billed via AP Expense
    const sourceKey = `procurement::${po.id}`.toLowerCase();
    if (recordedSourceKeys.has(sourceKey)) return;

    const total =
      Math.max(0, parseMoney(po.poAmount ?? po.amount ?? po.totalAmount) ?? 0) +
      Math.max(0, parseMoney(po.importCost) ?? 0) +
      Math.max(0, parseMoney(po.customsTax) ?? 0) +
      Math.max(0, parseMoney(po.deliveryCost) ?? 0);
    if (total <= 0) return;

    const isVerified = ["approved", "received", "completed", "paid", "delivered"].includes(statusLower);
    const txDate = safeString(po.date, new Date().toISOString().slice(0, 10)).slice(0, 10);
    result.push({
      id: `ERP-PROC-${po.id}`,
      costTransactionId: po.poNumber || po.id,
      projectName: safeString(po.project, "General"),
      transactionDate: txDate,
      month: txDate.slice(0, 7),
      quarter: getMonthQuarterLabel(txDate),
      year: txDate.slice(0, 4),
      budgetCategory: normalizeToPart4Category(po.category || "Material"),
      budgetItem: po.materialItem || "Procurement Material",
      costDescription: `PO ${po.poNumber || po.id}: ${po.materialItem || "Materials"}`,
      incurredAmount: total,
      paidAmount: statusLower === "paid" ? total : 0,
      supplierOrPayee: po.supplier || "Supplier",
      invoiceNumber: po.poNumber,
      sourceModule: "Procurement",
      sourceRecordId: po.id,
      verificationStatus: isVerified ? "Validated" : "Registered",
      isVerifiedOfficial: isVerified,
      isAutoSyncedFromErp: true,
    });
  });

  // 6. Equipment Management Logs (fuel + maintenance + rental not already in AP)
  (params.equipments || []).forEach((eq: any) => {
    const sourceKey = `equipment management::${eq.id}`.toLowerCase();
    if (recordedSourceKeys.has(sourceKey)) return;
    const eqCost =
      (parseMoney(eq.fuelCost) ?? 0) +
      (parseMoney(eq.maintenanceCost) ?? 0) +
      (parseMoney(eq.rentalCost) ?? 0) +
      (parseMoney(eq.repairCost) ?? 0);
    if (eqCost <= 0) return;

    const txDate = safeString(eq.date || eq.updatedAt, new Date().toISOString().slice(0, 10)).slice(0, 10);
    result.push({
      id: `ERP-EQ-${eq.id}`,
      costTransactionId: eq.assetCode || eq.id,
      projectName: safeString(eq.project, "General"),
      transactionDate: txDate,
      month: txDate.slice(0, 7),
      quarter: getMonthQuarterLabel(txDate),
      year: txDate.slice(0, 4),
      budgetCategory: "Equipment Costs",
      budgetItem: eq.equipmentName || "Heavy Equipment",
      costDescription: `${eq.equipmentName || "Equipment"} (Fuel, Maint. & Rental)`,
      incurredAmount: eqCost,
      paidAmount: eqCost,
      supplierOrPayee: eq.supplier || "Fleet Operations",
      sourceModule: "Equipment Management",
      sourceRecordId: eq.id,
      verificationStatus: "Validated",
      isVerifiedOfficial: true,
      isAutoSyncedFromErp: true,
    });
  });

  return result.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
}

export function computePart4BudgetControlState(input: {
  budgetPlans: ProjectBudgetPlan[];
  legacyBudgets?: FinancialBudgetRecord[];
  allocations: BudgetAllocationRecord[];
  revisions: BudgetRevisionRecord[];
  actualCostEntries: ActualCostEntry[];
  expenses: Expense[];
  cashTransactions: CashTransactionRecord[];
  invoices?: FinancialInvoiceRecord[];
  payrollRecords?: PayrollRecord[];
  procurements?: any[];
  equipments?: any[];
  projects?: any[];
  filterState: Part4FilterState;
  userRole: UserRole | string;
  userProfile?: any;
  referenceToday?: string;
}): Part4BudgetControlState {
  const referenceToday = input.referenceToday || new Date().toISOString().slice(0, 10);
  const permissions = resolveUserFinancePermissions(input.userRole);
  const assignedProjects = permissions.isProjectScopedOnly
    ? getAssignedProjectsForProfile(input.userProfile, input.projects || [])
    : [];

  const isProjectVisible = (projectName?: string): boolean => {
    if (!permissions.isProjectScopedOnly) return true;
    const p = safeString(projectName).trim().toLowerCase();
    if (!p) return false;
    return assignedProjects.some((ap) => p === ap.toLowerCase() || p.includes(ap.toLowerCase()));
  };

  // Merge registered Part 4 plans + optional project names from legacy budgets
  const roleBudgetPlans = (input.budgetPlans || []).filter((p) => isProjectVisible(p.projectName));
  const roleAllocations = (input.allocations || []).filter((a) => isProjectVisible(a.projectName));
  const roleRevisions = (input.revisions || []).filter((r) => isProjectVisible(r.projectName));

  const allUnifiedCosts = buildUnifiedActualCostLedger({
    actualCostEntries: input.actualCostEntries || [],
    expenses: input.expenses || [],
    cashTransactions: input.cashTransactions || [],
    payrollRecords: input.payrollRecords || [],
    procurements: input.procurements || [],
    equipments: input.equipments || [],
  }).filter((c) => isProjectVisible(c.projectName));

  // Filter options
  const projectSet = new Set<string>();
  const yearSet = new Set<string>([referenceToday.slice(0, 4)]);
  roleBudgetPlans.forEach((p) => {
    if (p.projectName) projectSet.add(p.projectName);
    if (p.budgetYear) yearSet.add(p.budgetYear);
  });
  (input.projects || []).forEach((p) => {
    const name = safeString(p?.name || p?.projectName);
    if (name && isProjectVisible(name)) projectSet.add(name);
  });
  allUnifiedCosts.forEach((c) => {
    if (c.projectName && c.projectName !== "Unassigned Project") projectSet.add(c.projectName);
    if (c.year) yearSet.add(c.year);
  });

  // Apply interactive Part 4 filters
  const f = input.filterState;
  const searchQ = safeString(f.searchTerm).trim().toLowerCase();

  const filteredPlans = roleBudgetPlans.filter((p) => {
    if (f.project !== "ALL" && p.projectName !== f.project) return false;
    if (f.budgetYear !== "ALL" && p.budgetYear !== f.budgetYear) return false;
    if (f.status !== "ALL" && p.budgetStatus !== f.status) return false;
    if (f.budgetCategory !== "ALL") {
      const hasCat = (p.lineItems || []).some(
        (li) => normalizeToPart4Category(li.budgetCategory) === f.budgetCategory
      );
      if ((p.lineItems || []).length > 0 && !hasCat) return false;
    }
    if (searchQ) {
      const blob = `${p.budgetId} ${p.projectName} ${p.projectCode} ${p.clientName} ${p.projectManager}`.toLowerCase();
      if (!blob.includes(searchQ)) return false;
    }
    return true;
  });

  const officialBudgets = filteredPlans.filter(isApprovedBudgetPlan);

  const filteredAllocations = roleAllocations.filter((a) => {
    if (f.project !== "ALL" && a.projectName !== f.project) return false;
    if (f.budgetYear !== "ALL" && a.budgetYear !== f.budgetYear) return false;
    if (f.budgetCategory !== "ALL" && a.budgetCategory !== f.budgetCategory) return false;
    if (f.startDate && `${a.budgetMonth}-01` < f.startDate.slice(0, 7) + "-01") return false;
    if (f.endDate && `${a.budgetMonth}-28` > f.endDate.slice(0, 7) + "-31") return false;
    if (searchQ) {
      const blob = `${a.allocationId} ${a.projectName} ${a.budgetCategory} ${a.budgetItem || ""}`.toLowerCase();
      if (!blob.includes(searchQ)) return false;
    }
    return true;
  });

  const filteredUnifiedCosts = allUnifiedCosts.filter((c) => {
    if (f.project !== "ALL" && c.projectName !== f.project) return false;
    if (f.budgetYear !== "ALL" && c.year !== f.budgetYear) return false;
    if (f.budgetCategory !== "ALL" && c.budgetCategory !== f.budgetCategory) return false;
    if (f.startDate && c.transactionDate < f.startDate) return false;
    if (f.endDate && c.transactionDate > f.endDate) return false;
    if (searchQ) {
      const blob = `${c.costTransactionId} ${c.projectName} ${c.costDescription} ${c.supplierOrPayee} ${c.sourceModule}`.toLowerCase();
      if (!blob.includes(searchQ)) return false;
    }
    return true;
  });

  const verifiedActualCosts = filteredUnifiedCosts.filter((c) => c.isVerifiedOfficial);
  const unverifiedActualCosts = filteredUnifiedCosts.filter((c) => !c.isVerifiedOfficial);

  // Project Performance Rows (official approved budgets + any projects with verified costs)
  const officialByProject = new Map<string, ProjectBudgetPlan[]>();
  officialBudgets.forEach((p) => {
    const arr = officialByProject.get(p.projectName) || [];
    arr.push(p);
    officialByProject.set(p.projectName, arr);
  });

  const projectNamesForPerf = new Set<string>(officialByProject.keys());
  verifiedActualCosts.forEach((c) => {
    if (c.projectName && c.projectName !== "Unassigned Project") {
      projectNamesForPerf.add(c.projectName);
    }
  });

  const projectPerformanceRows: Part4ProjectPerformanceRow[] = Array.from(projectNamesForPerf)
    .sort()
    .map((projName) => {
      const plans = officialByProject.get(projName) || [];
      const primaryPlan = plans[0];
      const originalApprovedBudget = plans.reduce(
        (s, p) => s + (p.originalApprovedBudget > 0 ? p.originalApprovedBudget : p.approvedProjectBudget),
        0
      );
      const currentApprovedBudget = plans.reduce((s, p) => {
        if (f.budgetCategory !== "ALL" && (p.lineItems || []).length > 0) {
          return (
            s +
            (p.lineItems || [])
              .filter((li) => normalizeToPart4Category(li.budgetCategory) === f.budgetCategory)
              .reduce((ls, li) => ls + (Number(li.totalPlannedCost) || 0), 0)
          );
        }
        return s + (Number(p.approvedProjectBudget) || 0);
      }, 0);
      const contingencyBudget = plans.reduce((s, p) => s + (Number(p.contingencyBudget) || 0), 0);

      const projAllocs = filteredAllocations.filter(
        (a) => a.projectName === projName && a.approvalStatus === "Approved"
      );
      const totalMonthlyAllocations = projAllocs.reduce((s, a) => s + (Number(a.allocatedAmount) || 0), 0);

      const projVerifiedCosts = verifiedActualCosts.filter((c) => c.projectName === projName);
      const projUnverifiedCosts = unverifiedActualCosts.filter((c) => c.projectName === projName);
      const totalActualIncurredCost = projVerifiedCosts.reduce((s, c) => s + c.incurredAmount, 0);
      const totalActualPaidCost = projVerifiedCosts.reduce((s, c) => s + c.paidAmount, 0);

      // AP & AR linkage per project (distinct from incurred cost)
      const outstandingProjectPayables = (input.expenses || [])
        .filter(
          (e) =>
            safeString(e.project) === projName &&
            safeString(e.status).toLowerCase() !== "rejected" &&
            safeString(e.status).toLowerCase() !== "cancelled"
        )
        .reduce((s, e) => s + Math.max(0, (parseMoney(e.amount) ?? 0) - (parseMoney(e.paidAmount) ?? 0)), 0);

      const projectReceivables = (input.invoices || [])
        .filter(
          (i) =>
            safeString(i.project) === projName &&
            safeString(i.status).toLowerCase() !== "rejected" &&
            safeString(i.status).toLowerCase() !== "cancelled"
        )
        .reduce((s, i) => s + Math.max(0, (parseMoney(i.amount) ?? 0) - (parseMoney(i.paidAmount) ?? 0)), 0);

      const remainingBudget = currentApprovedBudget - totalActualIncurredCost;
      const indicator = classifyBudgetUtilization(currentApprovedBudget, totalActualIncurredCost);

      let financialPerformanceStatus: Part4ProjectPerformanceRow["financialPerformanceStatus"] = "Strong";
      if (indicator.utilizationPct > 100) financialPerformanceStatus = "Over Budget";
      else if (indicator.utilizationPct > 85) financialPerformanceStatus = "At Risk";
      else if (indicator.utilizationPct >= 70) financialPerformanceStatus = "On Track";

      return {
        projectBudgetPlanId: primaryPlan?.id || projName,
        budgetId: primaryPlan?.budgetId || "NO-APPR-BGT",
        projectName: projName,
        projectCode: primaryPlan?.projectCode || "—",
        contractNumber: primaryPlan?.contractNumber || "—",
        clientName: primaryPlan?.clientName || "—",
        projectManager: primaryPlan?.projectManager || "—",
        budgetYear: primaryPlan?.budgetYear || f.budgetYear !== "ALL" ? f.budgetYear : referenceToday.slice(0, 4),
        budgetStatus: primaryPlan?.budgetStatus || "No Approved Budget",
        originalApprovedBudget,
        currentApprovedBudget,
        contingencyBudget,
        totalMonthlyAllocations,
        remainingUnallocatedBudget: Math.max(0, currentApprovedBudget - totalMonthlyAllocations),
        totalActualIncurredCost,
        totalActualPaidCost,
        unapprovedCostCount: projUnverifiedCosts.length,
        unapprovedCostAmount: projUnverifiedCosts.reduce((s, c) => s + c.incurredAmount, 0),
        outstandingProjectPayables,
        projectReceivables,
        remainingBudget,
        costVariance: indicator.varianceAmount,
        utilizationPct: indicator.utilizationPct,
        costOverrun: indicator.overrunAmount,
        indicator,
        financialPerformanceStatus,
      };
    });

  // Overall 8 KPIs
  const totalApprovedProjectBudget = projectPerformanceRows.reduce((s, r) => s + r.currentApprovedBudget, 0);
  const totalActualIncurredCost = verifiedActualCosts.reduce((s, c) => s + c.incurredAmount, 0);
  const totalActualPaidCost = verifiedActualCosts.reduce((s, c) => s + c.paidAmount, 0);
  const totalRemainingBudget = totalApprovedProjectBudget - totalActualIncurredCost;
  const totalBudgetVariance = totalApprovedProjectBudget - totalActualIncurredCost;
  const overallBudgetUtilizationPct =
    totalApprovedProjectBudget > 0
      ? Number(((totalActualIncurredCost / totalApprovedProjectBudget) * 100).toFixed(1))
      : totalActualIncurredCost > 0
      ? 100.1
      : 0;

  const projectsOverBudgetCount = projectPerformanceRows.filter(
    (r) => r.totalActualIncurredCost > r.currentApprovedBudget
  ).length;
  const projectsWithinBudgetCount = projectPerformanceRows.filter(
    (r) => r.currentApprovedBudget > 0 && r.totalActualIncurredCost <= r.currentApprovedBudget
  ).length;

  // 12-Category Breakdown
  const totalVerifiedSpendAllCats = Math.max(
    0,
    verifiedActualCosts.reduce((s, c) => s + c.incurredAmount, 0)
  );
  const categoryBreakdownRows: Part4CategoryBreakdownRow[] = PART4_BUDGET_CATEGORIES.map((cat) => {
    const approvedBudget = officialBudgets.reduce((sum, p) => {
      const catItemsTotal = (p.lineItems || [])
        .filter((li) => normalizeToPart4Category(li.budgetCategory) === cat)
        .reduce((ls, li) => ls + (Number(li.totalPlannedCost) || 0), 0);
      if (catItemsTotal > 0) return sum + catItemsTotal;
      if (cat === "Contingency" && (p.lineItems || []).length === 0) {
        return sum + (Number(p.contingencyBudget) || 0);
      }
      return sum;
    }, 0);

    const monthlyAllocated = filteredAllocations
      .filter((a) => a.approvalStatus === "Approved" && a.budgetCategory === cat)
      .reduce((s, a) => s + (Number(a.allocatedAmount) || 0), 0);

    const catCosts = verifiedActualCosts.filter((c) => c.budgetCategory === cat);
    const actualIncurred = catCosts.reduce((s, c) => s + c.incurredAmount, 0);
    const actualPaid = catCosts.reduce((s, c) => s + c.paidAmount, 0);
    const indicator = classifyBudgetUtilization(approvedBudget, actualIncurred);
    const sharePct =
      totalVerifiedSpendAllCats > 0
        ? Number(((actualIncurred / totalVerifiedSpendAllCats) * 100).toFixed(1))
        : 0;

    return {
      category: cat,
      approvedBudget,
      monthlyAllocated,
      actualIncurred,
      actualPaid,
      remainingBudget: approvedBudget - actualIncurred,
      costVariance: approvedBudget - actualIncurred,
      utilizationPct: indicator.utilizationPct,
      sharePct,
      indicator,
    };
  });

  // Line Item Level Variance
  const lineItemPerformanceRows: Part4LineItemPerformanceRow[] = [];
  officialBudgets.forEach((plan) => {
    (plan.lineItems || []).forEach((li) => {
      const cat = normalizeToPart4Category(li.budgetCategory);
      if (f.budgetCategory !== "ALL" && cat !== f.budgetCategory) return;
      const itemActual = verifiedActualCosts
        .filter(
          (c) =>
            c.projectName === plan.projectName &&
            (c.budgetItemId === li.budgetItemId ||
              (safeString(c.budgetItem).toLowerCase() === safeString(li.itemDescription).toLowerCase() &&
                c.budgetCategory === cat))
        )
        .reduce((s, c) => s + c.incurredAmount, 0);
      const planned = Number(li.totalPlannedCost) || Number(li.plannedQuantity) * Number(li.unitPrice);
      const indicator = classifyBudgetUtilization(planned, itemActual);
      lineItemPerformanceRows.push({
        budgetItemId: li.budgetItemId,
        projectName: plan.projectName,
        category: cat,
        subcategory: li.subcategory || cat,
        itemDescription: li.itemDescription,
        unitOfMeasurement: li.unitOfMeasurement,
        plannedQuantity: li.plannedQuantity,
        unitPrice: li.unitPrice,
        plannedTotalCost: planned,
        actualCost: itemActual,
        varianceAmount: planned - itemActual,
        utilizationPct: indicator.utilizationPct,
        indicator,
      });
    });
  });

  // Monthly Expenditure vs Allocation Trend
  const monthKeys = new Set<string>();
  filteredAllocations.forEach((a) => {
    if (a.budgetMonth) monthKeys.add(a.budgetMonth.slice(0, 7));
  });
  verifiedActualCosts.forEach((c) => {
    if (c.month) monthKeys.add(c.month.slice(0, 7));
  });
  if (monthKeys.size === 0) monthKeys.add(referenceToday.slice(0, 7));

  const sortedMonths = Array.from(monthKeys).sort();
  let cumulativeCost = 0;
  let cumulativeBudget = 0;
  const monthlyAllocationSummary: Part4BudgetControlState["monthlyAllocationSummary"] = [];
  const monthlyCostTrend: Part4BudgetControlState["charts"]["monthlyCostTrend"] = [];

  sortedMonths.forEach((mKey) => {
    const plannedAllocation = filteredAllocations
      .filter((a) => a.approvalStatus === "Approved" && a.budgetMonth.slice(0, 7) === mKey)
      .reduce((s, a) => s + (Number(a.allocatedAmount) || 0), 0);
    const mCosts = verifiedActualCosts.filter((c) => c.month === mKey);
    const actualIncurred = mCosts.reduce((s, c) => s + c.incurredAmount, 0);
    const actualPaid = mCosts.reduce((s, c) => s + c.paidAmount, 0);
    const indicator = classifyBudgetUtilization(plannedAllocation, actualIncurred);

    monthlyAllocationSummary.push({
      month: mKey,
      quarter: getMonthQuarterLabel(mKey),
      year: mKey.slice(0, 4),
      allocatedAmount: plannedAllocation,
      actualIncurred,
      actualPaid,
      varianceAmount: plannedAllocation - actualIncurred,
      utilizationPct: indicator.utilizationPct,
      indicator,
    });

    cumulativeCost += actualIncurred;
    cumulativeBudget += plannedAllocation;
    monthlyCostTrend.push({
      month: mKey,
      monthlyCost: actualIncurred,
      cumulativeCost,
      cumulativeBudget,
    });
  });

  // 8 Budget Control Alerts Evaluation
  const alerts: Part4BudgetAlert[] = [];

  projectPerformanceRows.forEach((row) => {
    if (row.currentApprovedBudget <= 0 && row.totalActualIncurredCost > 0) {
      alerts.push({
        id: `BGT-ALERT-NOPLAN-${row.projectName}`,
        ruleType: "UNAPPROVED_EXPENDITURE",
        severity: "CRITICAL",
        project: row.projectName,
        title: `Cost Recorded Without Approved Project Budget: ${row.projectName}`,
        titleAm: `ያለጸደቀ የፕሮጀክት በጀት ወጪ ተመዝግቧል: ${row.projectName}`,
        description: `Verified expenditure of ETB ${row.totalActualIncurredCost.toLocaleString()} detected without an activated approved budget.`,
        descriptionAm: `የተረጋገጠ ETB ${row.totalActualIncurredCost.toLocaleString()} ወጪ ያለጸደቀ በጀት ተመዝግቧል።`,
        amountEtb: row.totalActualIncurredCost,
        timestamp: referenceToday,
      });
    } else if (row.utilizationPct > 100) {
      alerts.push({
        id: `BGT-ALERT-100-${row.projectName}`,
        ruleType: "UTILIZATION_OVER_100",
        severity: "CRITICAL",
        project: row.projectName,
        title: `Budget Overrun (> 100%): ${row.projectName}`,
        titleAm: `ከበጀት በላይ ወጪ (> 100%): ${row.projectName}`,
        description: `Utilization reached ${row.utilizationPct}% (Overrun: ETB ${row.costOverrun.toLocaleString()}). Management budget revision required.`,
        descriptionAm: `የበጀት አጠቃቀም ${row.utilizationPct}% ደርሷል (ትርፍ ወጪ ETB ${row.costOverrun.toLocaleString()})።`,
        utilizationPct: row.utilizationPct,
        amountEtb: row.costOverrun,
        timestamp: referenceToday,
      });
    } else if (row.utilizationPct >= 95) {
      alerts.push({
        id: `BGT-ALERT-95-${row.projectName}`,
        ruleType: "BUDGET_NEAR_EXHAUSTION",
        severity: "CRITICAL",
        project: row.projectName,
        title: `Budget Nearly Exhausted (${row.utilizationPct}%): ${row.projectName}`,
        titleAm: `በጀት ሊያልቅ ተቃርቧል (${row.utilizationPct}%): ${row.projectName}`,
        description: `Only ETB ${Math.max(0, row.remainingBudget).toLocaleString()} remains out of ETB ${row.currentApprovedBudget.toLocaleString()}.`,
        descriptionAm: `ከETB ${row.currentApprovedBudget.toLocaleString()} በጀት ውስጥ ETB ${Math.max(0, row.remainingBudget).toLocaleString()} ብቻ ቀርቷል።`,
        utilizationPct: row.utilizationPct,
        amountEtb: row.remainingBudget,
        timestamp: referenceToday,
      });
    } else if (row.utilizationPct > 85) {
      alerts.push({
        id: `BGT-ALERT-85-${row.projectName}`,
        ruleType: "UTILIZATION_85",
        severity: "WARNING",
        project: row.projectName,
        title: `High Budget Utilization (> 85%): ${row.projectName}`,
        titleAm: `ከፍተኛ የበጀት አጠቃቀም (> 85%): ${row.projectName}`,
        description: `Project budget utilization is ${row.utilizationPct}% (Orange warning band).`,
        descriptionAm: `የፕሮጀክቱ የበጀት አጠቃቀም ${row.utilizationPct}% ላይ ደርሷል።`,
        utilizationPct: row.utilizationPct,
        amountEtb: row.totalActualIncurredCost,
        timestamp: referenceToday,
      });
    } else if (row.utilizationPct >= 70) {
      alerts.push({
        id: `BGT-ALERT-70-${row.projectName}`,
        ruleType: "UTILIZATION_70",
        severity: "INFO",
        project: row.projectName,
        title: `Budget Utilization Reached 70%: ${row.projectName}`,
        titleAm: `የበጀት አጠቃቀም 70% ደርሷል: ${row.projectName}`,
        description: `Project utilization entered the 70–85% monitoring band (${row.utilizationPct}%).`,
        descriptionAm: `የፕሮጀክቱ በጀት አጠቃቀም 70–85% የክትትል ክልል ገብቷል (${row.utilizationPct}%)።`,
        utilizationPct: row.utilizationPct,
        amountEtb: row.totalActualIncurredCost,
        timestamp: referenceToday,
      });
    }
  });

  // Alert 4: Actual monthly cost > Approved monthly allocation
  monthlyAllocationSummary.forEach((mRow) => {
    if (mRow.allocatedAmount > 0 && mRow.actualIncurred > mRow.allocatedAmount) {
      alerts.push({
        id: `BGT-ALERT-MONTH-${mRow.month}`,
        ruleType: "MONTHLY_ALLOCATION_EXCEEDED",
        severity: "CRITICAL",
        project: f.project === "ALL" ? "All Projects" : f.project,
        title: `Monthly Allocation Exceeded (${mRow.month})`,
        titleAm: `ወርሃዊ የተመደበ በጀት አልፏል (${mRow.month})`,
        description: `Actual cost (ETB ${mRow.actualIncurred.toLocaleString()}) exceeded approved monthly allocation (ETB ${mRow.allocatedAmount.toLocaleString()}).`,
        descriptionAm: `ትክክለኛው ወጪ (ETB ${mRow.actualIncurred.toLocaleString()}) ከተመደበው ወርሃዊ በጀት (ETB ${mRow.allocatedAmount.toLocaleString()}) በልጧል።`,
        utilizationPct: mRow.utilizationPct,
        amountEtb: mRow.actualIncurred - mRow.allocatedAmount,
        timestamp: referenceToday,
      });
    }
  });

  // Alert 5: Actual category cost > Category budget
  categoryBreakdownRows.forEach((cRow) => {
    if (cRow.approvedBudget > 0 && cRow.actualIncurred > cRow.approvedBudget) {
      alerts.push({
        id: `BGT-ALERT-CAT-${cRow.category}`,
        ruleType: "CATEGORY_BUDGET_EXCEEDED",
        severity: "CRITICAL",
        project: f.project === "ALL" ? "Portfolio" : f.project,
        category: cRow.category,
        title: `Category Budget Exceeded: ${cRow.category}`,
        titleAm: `የዘርፍ በጀት አልፏል: ${cRow.category}`,
        description: `${cRow.category} actual cost (ETB ${cRow.actualIncurred.toLocaleString()}) exceeded category budget (ETB ${cRow.approvedBudget.toLocaleString()}).`,
        descriptionAm: `${cRow.category} ትክክለኛ ወጪ ከተመደበው በጀት በልጧል።`,
        utilizationPct: cRow.utilizationPct,
        amountEtb: cRow.actualIncurred - cRow.approvedBudget,
        timestamp: referenceToday,
      });
    }
  });

  // Alert 7: Unapproved expenditure registered
  if (unverifiedActualCosts.length > 0) {
    const totalUnverified = unverifiedActualCosts.reduce((s, c) => s + c.incurredAmount, 0);
    alerts.push({
      id: `BGT-ALERT-UNVERIFIED-${unverifiedActualCosts.length}`,
      ruleType: "UNAPPROVED_EXPENDITURE",
      severity: "WARNING",
      project: f.project === "ALL" ? "Multiple Projects" : f.project,
      title: `${unverifiedActualCosts.length} Unverified Cost Transaction(s) Pending Validation`,
      titleAm: `${unverifiedActualCosts.length} ያልተረጋገጡ ወጪዎች ማረጋገጫ ይጠብቃሉ`,
      description: `ETB ${totalUnverified.toLocaleString()} in registered expenditures are excluded from official actuals until verified.`,
      descriptionAm: `ETB ${totalUnverified.toLocaleString()} የተመዘገቡ ወጪዎች እስኪረጋገጡ ድረስ በይፋዊ ሪፖርት አልተካተቱም።`,
      amountEtb: totalUnverified,
      timestamp: referenceToday,
    });
  }

  // Alert 8: Budget revision pending approval
  const pendingRevisions = roleRevisions.filter(
    (r) => r.revisionStatus === "Requested" || r.revisionStatus === "Finance Review" || r.revisionStatus === "PM Review"
  );
  if (pendingRevisions.length > 0) {
    const revDelta = pendingRevisions.reduce((s, r) => s + Math.abs(r.budgetChangeAmount), 0);
    alerts.push({
      id: `BGT-ALERT-REV-${pendingRevisions.length}`,
      ruleType: "PENDING_REVISION",
      severity: "WARNING",
      project: pendingRevisions[0].projectName,
      title: `${pendingRevisions.length} Budget Revision Request(s) Awaiting Approval`,
      titleAm: `${pendingRevisions.length} የበጀት ማሻሻያ ጥያቄዎች ማፅደቅ ይጠብቃሉ`,
      description: `Pending revisions totaling ETB ${revDelta.toLocaleString()} require Finance / PM / Management sign-off.`,
      descriptionAm: `የETB ${revDelta.toLocaleString()} የበጀት ማሻሻያ ጥያቄዎች የአመራር ውሳኔ ይጠብቃሉ።`,
      amountEtb: revDelta,
      timestamp: referenceToday,
    });
  }

  return {
    permissions,
    assignedProjects,
    filterOptions: {
      projects: Array.from(projectSet).sort(),
      years: Array.from(yearSet).sort().reverse(),
      categories: PART4_BUDGET_CATEGORIES,
    },
    budgetPlans: filteredPlans,
    officialBudgets,
    allocations: filteredAllocations,
    revisions: roleRevisions,
    unifiedActualCosts: filteredUnifiedCosts,
    verifiedActualCosts,
    unverifiedActualCosts,
    kpis: {
      totalApprovedProjectBudget,
      totalActualIncurredCost,
      totalActualPaidCost,
      totalRemainingBudget,
      totalBudgetVariance,
      overallBudgetUtilizationPct,
      projectsOverBudgetCount,
      projectsWithinBudgetCount,
    },
    charts: {
      budgetVsActualByProject: projectPerformanceRows.map((r) => ({
        project: r.projectName,
        approvedBudget: r.currentApprovedBudget,
        actualIncurred: r.totalActualIncurredCost,
        actualPaid: r.totalActualPaidCost,
        remainingBudget: Math.max(0, r.remainingBudget),
      })),
      monthlyBudgetVsActual: monthlyAllocationSummary.map((m) => ({
        month: m.month,
        plannedAllocation: m.allocatedAmount,
        actualIncurred: m.actualIncurred,
        actualPaid: m.actualPaid,
      })),
      costDistributionByCategory: categoryBreakdownRows
        .filter((c) => c.approvedBudget > 0 || c.actualIncurred > 0)
        .map((c) => ({
          category: c.category,
          approvedBudget: c.approvedBudget,
          actualIncurred: c.actualIncurred,
          sharePct: c.sharePct,
        })),
      projectBudgetUtilization: projectPerformanceRows.map((r) => ({
        project: r.projectName,
        utilizationPct: r.utilizationPct,
        color: r.indicator.color,
      })),
      monthlyCostTrend,
      budgetVarianceAnalysis: projectPerformanceRows.map((r) => ({
        project: r.projectName,
        varianceAmount: r.costVariance,
        status: r.indicator.varianceStatus,
      })),
    },
    projectPerformanceRows,
    categoryBreakdownRows,
    lineItemPerformanceRows,
    monthlyAllocationSummary,
    alerts,
    referenceToday,
  };
}

// ============================================================================
// PART 4: 14 REQUIRED BUDGET & COST CONTROL REPORTS GENERATOR
// ============================================================================

export interface GeneratedBudgetReportDataset {
  id: BudgetReportTypeId;
  title: string;
  titleAm: string;
  subtitle: string;
  columns: { key: string; label: string; isNumeric?: boolean }[];
  rows: Record<string, any>[];
  summaryTotals: { label: string; value: number | string }[];
}

export function buildPart4BudgetReportDataset(
  reportType: BudgetReportTypeId,
  state: Part4BudgetControlState,
  currency: string = "ETB"
): GeneratedBudgetReportDataset {
  const cur = currency || "ETB";

  switch (reportType) {
    case "project-budget-report": {
      const rows = state.budgetPlans.map((p) => ({
        budgetId: p.budgetId,
        projectName: p.projectName,
        projectCode: p.projectCode,
        contractNumber: p.contractNumber,
        clientName: p.clientName,
        budgetYear: p.budgetYear,
        originalContractAmount: p.originalContractAmount,
        originalApprovedBudget: p.originalApprovedBudget || p.approvedProjectBudget,
        approvedProjectBudget: p.approvedProjectBudget,
        contingencyBudget: p.contingencyBudget,
        status: p.budgetStatus,
        approvedBy: p.approvedBy || "Pending",
      }));
      return {
        id: reportType,
        title: "1. Project Budget Report",
        titleAm: "1. የፕሮጀክት በጀት ሪፖርት",
        subtitle: "Registered project budgets with original baselines, contingency, and approval status.",
        columns: [
          { key: "budgetId", label: "Budget ID" },
          { key: "projectName", label: "Project Name" },
          { key: "projectCode", label: "Code" },
          { key: "budgetYear", label: "Year" },
          { key: "originalContractAmount", label: `Contract (${cur})`, isNumeric: true },
          { key: "originalApprovedBudget", label: `Original Budget (${cur})`, isNumeric: true },
          { key: "approvedProjectBudget", label: `Current Budget (${cur})`, isNumeric: true },
          { key: "contingencyBudget", label: `Contingency (${cur})`, isNumeric: true },
          { key: "status", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Budgets", value: rows.length },
          { label: "Total Current Budget", value: rows.reduce((s, r) => s + r.approvedProjectBudget, 0) },
          { label: "Total Contingency", value: rows.reduce((s, r) => s + r.contingencyBudget, 0) },
        ],
      };
    }

    case "monthly-budget-allocation-report": {
      const rows = state.allocations.map((a) => ({
        allocationId: a.allocationId,
        projectName: a.projectName,
        budgetMonth: a.budgetMonth,
        budgetCategory: a.budgetCategory,
        budgetItem: a.budgetItem || "Category Pool",
        allocatedAmount: a.allocatedAmount,
        remainingUnallocatedBudget: a.remainingUnallocatedBudget,
        approvalStatus: a.approvalStatus,
        approvedBy: a.approvedBy || "Pending",
      }));
      return {
        id: reportType,
        title: "2. Monthly Budget Allocation Report",
        titleAm: "2. ወርሃዊ የበጀት ምደባ ሪፖርት",
        subtitle: "Monthly budget allocations across projects, categories, and line items.",
        columns: [
          { key: "allocationId", label: "Allocation ID" },
          { key: "projectName", label: "Project" },
          { key: "budgetMonth", label: "Month" },
          { key: "budgetCategory", label: "Category" },
          { key: "budgetItem", label: "Line Item" },
          { key: "allocatedAmount", label: `Allocated (${cur})`, isNumeric: true },
          { key: "approvalStatus", label: "Approval Status" },
          { key: "approvedBy", label: "Approved By" },
        ],
        rows,
        summaryTotals: [
          { label: "Allocation Records", value: rows.length },
          { label: "Approved Allocations", value: rows.filter((r) => r.approvalStatus === "Approved").reduce((s, r) => s + r.allocatedAmount, 0) },
        ],
      };
    }

    case "actual-cost-report": {
      const rows = state.unifiedActualCosts.map((c) => ({
        costTransactionId: c.costTransactionId,
        transactionDate: c.transactionDate,
        projectName: c.projectName,
        budgetCategory: c.budgetCategory,
        costDescription: c.costDescription,
        supplierOrPayee: c.supplierOrPayee,
        sourceModule: c.sourceModule,
        incurredAmount: c.incurredAmount,
        paidAmount: c.paidAmount,
        verificationStatus: c.verificationStatus,
      }));
      return {
        id: reportType,
        title: "3. Actual Cost Report",
        titleAm: "3. ትክክለኛ የወጪ ሪፖርት",
        subtitle: "Deduplicated actual project costs aggregated across ERP modules and direct entries.",
        columns: [
          { key: "costTransactionId", label: "Cost TX ID" },
          { key: "transactionDate", label: "Date" },
          { key: "projectName", label: "Project" },
          { key: "budgetCategory", label: "Category" },
          { key: "sourceModule", label: "Source Module" },
          { key: "supplierOrPayee", label: "Payee" },
          { key: "incurredAmount", label: `Incurred (${cur})`, isNumeric: true },
          { key: "paidAmount", label: `Paid (${cur})`, isNumeric: true },
          { key: "verificationStatus", label: "Verification" },
        ],
        rows,
        summaryTotals: [
          { label: "Transactions", value: rows.length },
          { label: "Total Verified Incurred", value: state.verifiedActualCosts.reduce((s, r) => s + r.incurredAmount, 0) },
          { label: "Total Verified Paid", value: state.verifiedActualCosts.reduce((s, r) => s + r.paidAmount, 0) },
        ],
      };
    }

    case "budget-vs-actual-cost-report": {
      const rows = state.projectPerformanceRows.map((r) => ({
        budgetId: r.budgetId,
        projectName: r.projectName,
        approvedBudget: r.currentApprovedBudget,
        actualIncurred: r.totalActualIncurredCost,
        actualPaid: r.totalActualPaidCost,
        remainingBudget: r.remainingBudget,
        variance: r.costVariance,
        utilizationPct: `${r.utilizationPct.toFixed(1)}%`,
        indicator: r.indicator.tierLabel,
      }));
      return {
        id: reportType,
        title: "4. Budget vs Actual Cost Report",
        titleAm: "4. የበጀት እና ትክክለኛ ወጪ ንፅፅር ሪፖርት",
        subtitle: "Comparison of approved project budgets against verified incurred and paid expenditures.",
        columns: [
          { key: "budgetId", label: "Budget ID" },
          { key: "projectName", label: "Project" },
          { key: "approvedBudget", label: `Approved Budget (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Incurred (${cur})`, isNumeric: true },
          { key: "actualPaid", label: `Actual Paid (${cur})`, isNumeric: true },
          { key: "remainingBudget", label: `Remaining (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Utilization" },
          { key: "indicator", label: "Indicator" },
        ],
        rows,
        summaryTotals: [
          { label: "Approved Budget", value: state.kpis.totalApprovedProjectBudget },
          { label: "Actual Incurred", value: state.kpis.totalActualIncurredCost },
          { label: "Overall Utilization", value: `${state.kpis.overallBudgetUtilizationPct.toFixed(1)}%` },
        ],
      };
    }

    case "budget-utilization-report": {
      const rows = state.projectPerformanceRows.map((r) => ({
        projectName: r.projectName,
        approvedBudget: r.currentApprovedBudget,
        actualIncurred: r.totalActualIncurredCost,
        utilizationPct: `${r.utilizationPct.toFixed(1)}%`,
        color: r.indicator.color,
        statusLabel: r.indicator.tierLabel,
      }));
      return {
        id: reportType,
        title: "5. Budget Utilization Report",
        titleAm: "5. የበጀት አጠቃቀም መጠን ሪፖርት",
        subtitle: "Color-coded utilization thresholds: Green (<70%), Yellow (70–85%), Orange (>85–100%), Red (>100%).",
        columns: [
          { key: "projectName", label: "Project" },
          { key: "approvedBudget", label: `Approved (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Utilization %" },
          { key: "color", label: "Indicator Color" },
          { key: "statusLabel", label: "Band" },
        ],
        rows,
        summaryTotals: [
          { label: "Overall Utilization", value: `${state.kpis.overallBudgetUtilizationPct.toFixed(1)}%` },
          { label: "Over Budget Projects", value: state.kpis.projectsOverBudgetCount },
        ],
      };
    }

    case "cost-variance-report": {
      const rows = state.projectPerformanceRows.map((r) => ({
        projectName: r.projectName,
        approvedBudget: r.currentApprovedBudget,
        actualIncurred: r.totalActualIncurredCost,
        costVariance: r.costVariance,
        overrunAmount: r.costOverrun,
        varianceStatus: r.indicator.varianceStatus,
      }));
      return {
        id: reportType,
        title: "6. Cost Variance Report",
        titleAm: "6. የወጪ ልዩነት (Cost Variance) ሪፖርት",
        subtitle: "Budget Variance = Approved Budget − Actual Cost (Positive = Under Budget, Negative = Over Budget).",
        columns: [
          { key: "projectName", label: "Project" },
          { key: "approvedBudget", label: `Approved Budget (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Cost (${cur})`, isNumeric: true },
          { key: "costVariance", label: `Variance (${cur})`, isNumeric: true },
          { key: "overrunAmount", label: `Overrun (${cur})`, isNumeric: true },
          { key: "varianceStatus", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Net Variance", value: state.kpis.totalBudgetVariance },
          { label: "Total Overruns", value: rows.reduce((s, r) => s + r.overrunAmount, 0) },
        ],
      };
    }

    case "project-cost-breakdown-report": {
      const rows = state.categoryBreakdownRows.map((c) => ({
        category: c.category,
        approvedBudget: c.approvedBudget,
        monthlyAllocated: c.monthlyAllocated,
        actualIncurred: c.actualIncurred,
        actualPaid: c.actualPaid,
        variance: c.costVariance,
        utilizationPct: `${c.utilizationPct.toFixed(1)}%`,
        sharePct: `${c.sharePct.toFixed(1)}%`,
      }));
      return {
        id: reportType,
        title: "7. Project Cost Breakdown Report",
        titleAm: "7. የፕሮጀክት ወጪ ዘርፍ ትንተና ሪፖርት",
        subtitle: "12-Category cost breakdown comparing category budgets, allocations, and actual costs.",
        columns: [
          { key: "category", label: "Budget Category" },
          { key: "approvedBudget", label: `Budget (${cur})`, isNumeric: true },
          { key: "monthlyAllocated", label: `Allocated (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Incurred (${cur})`, isNumeric: true },
          { key: "variance", label: `Variance (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Util. %" },
          { key: "sharePct", label: "Cost Share %" },
        ],
        rows,
        summaryTotals: [
          { label: "Categories", value: 12 },
          { label: "Total Actual Incurred", value: state.kpis.totalActualIncurredCost },
        ],
      };
    }

    case "budget-revision-history-report": {
      const rows = state.revisions.map((rev) => ({
        revisionId: rev.revisionId,
        projectName: rev.projectName,
        affectedCategory: rev.affectedCategory || "All Categories",
        originalApprovedBudget: rev.originalApprovedBudget,
        previousRevisedBudget: rev.previousRevisedBudget,
        proposedRevisedBudget: rev.proposedRevisedBudget,
        budgetChangeAmount: rev.budgetChangeAmount,
        revisionReason: rev.revisionReason,
        revisionStatus: rev.revisionStatus,
        approvedBy: rev.approvedBy || "Pending",
      }));
      return {
        id: reportType,
        title: "8. Budget Revision History Report",
        titleAm: "8. የበጀት ማሻሻያ ታሪክ ሪፖርት",
        subtitle: "Complete audit log of original baselines, revision deltas, reasons, and approvals.",
        columns: [
          { key: "revisionId", label: "Revision ID" },
          { key: "projectName", label: "Project" },
          { key: "originalApprovedBudget", label: `Original (${cur})`, isNumeric: true },
          { key: "previousRevisedBudget", label: `Previous (${cur})`, isNumeric: true },
          { key: "proposedRevisedBudget", label: `Proposed (${cur})`, isNumeric: true },
          { key: "budgetChangeAmount", label: `Change (${cur})`, isNumeric: true },
          { key: "revisionReason", label: "Reason" },
          { key: "revisionStatus", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Revisions Logged", value: rows.length },
          { label: "Approved Net Adjustments", value: rows.filter((r) => r.revisionStatus === "Approved").reduce((s, r) => s + r.budgetChangeAmount, 0) },
        ],
      };
    }

    case "monthly-expenditure-report": {
      const rows = state.monthlyAllocationSummary.map((m) => ({
        month: m.month,
        allocatedAmount: m.allocatedAmount,
        actualIncurred: m.actualIncurred,
        actualPaid: m.actualPaid,
        varianceAmount: m.varianceAmount,
        utilizationPct: `${m.utilizationPct.toFixed(1)}%`,
        status: m.indicator.tierLabel,
      }));
      return {
        id: reportType,
        title: "9. Monthly Expenditure Report",
        titleAm: "9. ወርሃዊ የወጪ ሪፖርት",
        subtitle: "Monthly budget allocations vs actual incurred and paid costs.",
        columns: [
          { key: "month", label: "Month" },
          { key: "allocatedAmount", label: `Allocated (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Incurred (${cur})`, isNumeric: true },
          { key: "actualPaid", label: `Actual Paid (${cur})`, isNumeric: true },
          { key: "varianceAmount", label: `Variance (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Utilization %" },
        ],
        rows,
        summaryTotals: [
          { label: "Months", value: rows.length },
          { label: "Total Incurred", value: rows.reduce((s, r) => s + r.actualIncurred, 0) },
        ],
      };
    }

    case "quarterly-expenditure-report": {
      const qMap = new Map<string, { quarter: string; allocatedAmount: number; actualIncurred: number; actualPaid: number }>();
      state.monthlyAllocationSummary.forEach((m) => {
        const curQ = qMap.get(m.quarter) || { quarter: m.quarter, allocatedAmount: 0, actualIncurred: 0, actualPaid: 0 };
        curQ.allocatedAmount += m.allocatedAmount;
        curQ.actualIncurred += m.actualIncurred;
        curQ.actualPaid += m.actualPaid;
        qMap.set(m.quarter, curQ);
      });
      const rows = Array.from(qMap.values()).map((q) => {
        const ind = classifyBudgetUtilization(q.allocatedAmount, q.actualIncurred);
        return {
          ...q,
          varianceAmount: q.allocatedAmount - q.actualIncurred,
          utilizationPct: `${ind.utilizationPct.toFixed(1)}%`,
        };
      });
      return {
        id: reportType,
        title: "10. Quarterly Expenditure Report",
        titleAm: "10. የሩብ ዓመት የወጪ ሪፖርት",
        subtitle: "Quarterly roll-up of allocated budgets, actual costs, and variances.",
        columns: [
          { key: "quarter", label: "Quarter" },
          { key: "allocatedAmount", label: `Allocated (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Incurred (${cur})`, isNumeric: true },
          { key: "actualPaid", label: `Actual Paid (${cur})`, isNumeric: true },
          { key: "varianceAmount", label: `Variance (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Utilization %" },
        ],
        rows,
        summaryTotals: [
          { label: "Quarters", value: rows.length },
          { label: "Total Quarterly Incurred", value: rows.reduce((s, r) => s + r.actualIncurred, 0) },
        ],
      };
    }

    case "annual-project-cost-report": {
      const yMap = new Map<string, { year: string; approvedBudget: number; allocatedAmount: number; actualIncurred: number; actualPaid: number }>();
      state.projectPerformanceRows.forEach((p) => {
        const yr = p.budgetYear || state.referenceToday.slice(0, 4);
        const curY = yMap.get(yr) || { year: yr, approvedBudget: 0, allocatedAmount: 0, actualIncurred: 0, actualPaid: 0 };
        curY.approvedBudget += p.currentApprovedBudget;
        curY.allocatedAmount += p.totalMonthlyAllocations;
        curY.actualIncurred += p.totalActualIncurredCost;
        curY.actualPaid += p.totalActualPaidCost;
        yMap.set(yr, curY);
      });
      const rows = Array.from(yMap.values()).map((yRow) => {
        const ind = classifyBudgetUtilization(yRow.approvedBudget, yRow.actualIncurred);
        return {
          ...yRow,
          remainingBudget: yRow.approvedBudget - yRow.actualIncurred,
          utilizationPct: `${ind.utilizationPct.toFixed(1)}%`,
        };
      });
      return {
        id: reportType,
        title: "11. Annual Project Cost Report",
        titleAm: "11. ዓመታዊ የፕሮጀክት ወጪ ሪፖርት",
        subtitle: "Annual budget baseline, cumulative allocations, incurred cost, and remaining headroom.",
        columns: [
          { key: "year", label: "Financial Year" },
          { key: "approvedBudget", label: `Approved Budget (${cur})`, isNumeric: true },
          { key: "allocatedAmount", label: `Allocated (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Incurred (${cur})`, isNumeric: true },
          { key: "actualPaid", label: `Actual Paid (${cur})`, isNumeric: true },
          { key: "remainingBudget", label: `Remaining (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Utilization %" },
        ],
        rows,
        summaryTotals: [
          { label: "Annual Budget", value: rows.reduce((s, r) => s + r.approvedBudget, 0) },
          { label: "Annual Incurred", value: rows.reduce((s, r) => s + r.actualIncurred, 0) },
        ],
      };
    }

    case "projects-over-budget-report": {
      const rows = state.projectPerformanceRows
        .filter((r) => r.totalActualIncurredCost > r.currentApprovedBudget)
        .map((r) => ({
          budgetId: r.budgetId,
          projectName: r.projectName,
          projectManager: r.projectManager,
          approvedBudget: r.currentApprovedBudget,
          actualIncurred: r.totalActualIncurredCost,
          costOverrun: r.costOverrun,
          utilizationPct: `${r.utilizationPct.toFixed(1)}%`,
        }));
      return {
        id: reportType,
        title: "12. Projects Over Budget Report",
        titleAm: "12. ከበጀት በላይ ወጪ የወጣባቸው ፕሮጀክቶች ሪፖርት",
        subtitle: "Exception report listing every project whose actual verified cost exceeds its approved budget.",
        columns: [
          { key: "budgetId", label: "Budget ID" },
          { key: "projectName", label: "Project Name" },
          { key: "projectManager", label: "Project Manager" },
          { key: "approvedBudget", label: `Approved Budget (${cur})`, isNumeric: true },
          { key: "actualIncurred", label: `Actual Cost (${cur})`, isNumeric: true },
          { key: "costOverrun", label: `Overrun (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Utilization %" },
        ],
        rows,
        summaryTotals: [
          { label: "Over-Budget Projects", value: rows.length },
          { label: "Total Overrun Amount", value: rows.reduce((s, r) => s + r.costOverrun, 0) },
        ],
      };
    }

    case "remaining-budget-report": {
      const rows = state.projectPerformanceRows.map((r) => ({
        budgetId: r.budgetId,
        projectName: r.projectName,
        currentApprovedBudget: r.currentApprovedBudget,
        totalMonthlyAllocations: r.totalMonthlyAllocations,
        remainingUnallocatedBudget: r.remainingUnallocatedBudget,
        totalActualIncurredCost: r.totalActualIncurredCost,
        remainingBudget: r.remainingBudget,
      }));
      return {
        id: reportType,
        title: "13. Remaining Budget Report",
        titleAm: "13. የቀሪ በጀት ሪፖርት",
        subtitle: "Unspent approved budget headroom and unallocated funds remaining per project.",
        columns: [
          { key: "budgetId", label: "Budget ID" },
          { key: "projectName", label: "Project Name" },
          { key: "currentApprovedBudget", label: `Approved Budget (${cur})`, isNumeric: true },
          { key: "totalMonthlyAllocations", label: `Allocated (${cur})`, isNumeric: true },
          { key: "remainingUnallocatedBudget", label: `Unallocated (${cur})`, isNumeric: true },
          { key: "totalActualIncurredCost", label: `Actual Cost (${cur})`, isNumeric: true },
          { key: "remainingBudget", label: `Remaining Budget (${cur})`, isNumeric: true },
        ],
        rows,
        summaryTotals: [
          { label: "Total Remaining Budget", value: state.kpis.totalRemainingBudget },
        ],
      };
    }

    case "project-financial-performance-report": {
      const rows = state.projectPerformanceRows.map((r) => ({
        projectName: r.projectName,
        originalApprovedBudget: r.originalApprovedBudget,
        currentApprovedBudget: r.currentApprovedBudget,
        totalMonthlyAllocations: r.totalMonthlyAllocations,
        totalActualIncurredCost: r.totalActualIncurredCost,
        totalActualPaidCost: r.totalActualPaidCost,
        outstandingProjectPayables: r.outstandingProjectPayables,
        projectReceivables: r.projectReceivables,
        remainingBudget: r.remainingBudget,
        utilizationPct: `${r.utilizationPct.toFixed(1)}%`,
        costVariance: r.costVariance,
        financialPerformanceStatus: r.financialPerformanceStatus,
      }));
      return {
        id: reportType,
        title: "14. Project Financial Performance Report",
        titleAm: "14. የፕሮጀክት አጠቃላይ የፋይናንስ አፈፃፀም ሪፖርት",
        subtitle: "Integrated view uniting Project Budget, Allocations, Incurred vs Paid Cost, AP, AR, Variance & Status.",
        columns: [
          { key: "projectName", label: "Project" },
          { key: "originalApprovedBudget", label: `Original (${cur})`, isNumeric: true },
          { key: "currentApprovedBudget", label: `Current (${cur})`, isNumeric: true },
          { key: "totalActualIncurredCost", label: `Incurred (${cur})`, isNumeric: true },
          { key: "totalActualPaidCost", label: `Paid (${cur})`, isNumeric: true },
          { key: "outstandingProjectPayables", label: `AP (${cur})`, isNumeric: true },
          { key: "projectReceivables", label: `AR (${cur})`, isNumeric: true },
          { key: "remainingBudget", label: `Remaining (${cur})`, isNumeric: true },
          { key: "utilizationPct", label: "Util. %" },
          { key: "financialPerformanceStatus", label: "Status" },
        ],
        rows,
        summaryTotals: [
          { label: "Total Approved", value: state.kpis.totalApprovedProjectBudget },
          { label: "Total Incurred", value: state.kpis.totalActualIncurredCost },
          { label: "Total Paid", value: state.kpis.totalActualPaidCost },
          { label: "Net Open AP", value: rows.reduce((s, r) => s + r.outstandingProjectPayables, 0) },
          { label: "Net Open AR", value: rows.reduce((s, r) => s + r.projectReceivables, 0) },
        ],
      };
    }
  }
}
