import {
  EvaluationCommitteeMember,
  ProcurementBudgetAllocationRecord,
  ProcurementLineItem,
  ProcurementOrderRecord,
  ProcurementQuotationRecord,
  ProcurementRequestRecord,
  ProcurementSupportingDoc,
  ProcurementWorkflowStatus,
  QuotationEvaluationScore,
  UserRole,
} from "../types";

export type ProcurementAction =
  | "CREATE_PR"
  | "SUBMIT_PR"
  | "COLLECT_QUOTATION"
  | "EVALUATE_AND_RECOMMEND"
  | "APPROVE_BUDGET"
  | "REJECT_BUDGET"
  | "AUTHORIZE_PO"
  | "EXECUTE_PROCUREMENT"
  | "REJECT_REQUEST"
  | "READ_PROCUREMENT";

export class ProcurementAuthorizationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(code: string, message: string, statusCode = 403) {
    super(message);
    this.name = "ProcurementAuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function normalizeProcurementRole(role: unknown): string {
  if (typeof role !== "string") return "";
  const trimmed = role.trim();
  const lowered = trimmed.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
  if (lowered === "directory" || lowered === "director") return UserRole.DIRECTOR;
  if (lowered === "procurement officer") return UserRole.PROCUREMENT_OFFICER;
  if (lowered === "evaluation committee") return UserRole.EVALUATION_COMMITTEE;
  if (lowered === "super admin" || lowered === "admin") return UserRole.SUPER_ADMIN;
  if (lowered === "head office" || lowered === "head office manager") return UserRole.HEAD_OFFICE;
  if (lowered === "finance manager") return UserRole.FINANCE_MANAGER;
  if (lowered === "project manager" || lowered === "project head") return UserRole.PROJECT_MANAGER;
  if (lowered === "warehouse manager") return UserRole.WAREHOUSE_MANAGER;
  if (lowered === "auditor") return UserRole.AUDITOR;
  return trimmed;
}

export function isProcurementOfficerRole(role: unknown): boolean {
  return normalizeProcurementRole(role) === UserRole.PROCUREMENT_OFFICER;
}

export function isEvaluationCommitteeRole(role: unknown): boolean {
  return normalizeProcurementRole(role) === UserRole.EVALUATION_COMMITTEE;
}

/**
 * STRICT GOVERNANCE RULE:
 * Only the Director can authorize budget allocation and Contract/PO authorization
 * under this procurement authority structure.
 */
export function isDirectorOnlyRole(role: unknown): boolean {
  return normalizeProcurementRole(role) === UserRole.DIRECTOR;
}

const READ_ALLOWED_ROLES = new Set<string>([
  UserRole.PROCUREMENT_OFFICER,
  UserRole.EVALUATION_COMMITTEE,
  UserRole.DIRECTOR,
  UserRole.SUPER_ADMIN,
  UserRole.HEAD_OFFICE,
  UserRole.FINANCE_MANAGER,
  UserRole.PROJECT_MANAGER,
  UserRole.WAREHOUSE_MANAGER,
  UserRole.OPERATION_MANAGER,
  UserRole.AUDITOR,
]);

export function canReadProcurementModule(role: unknown): boolean {
  return READ_ALLOWED_ROLES.has(normalizeProcurementRole(role));
}

export function canRolePerformProcurementAction(
  role: unknown,
  action: ProcurementAction,
  request?: Pick<
    ProcurementRequestRecord,
    "status" | "budgetAllocationId" | "poId" | "quotationCount"
  >
): { allowed: boolean; reason?: string; statusCode?: number } {
  const norm = normalizeProcurementRole(role);

  if (action === "READ_PROCUREMENT") {
    return READ_ALLOWED_ROLES.has(norm)
      ? { allowed: true }
      : {
          allowed: false,
          statusCode: 403,
          reason: `Role "${norm || "Unknown"}" is not authorized to view procurement records.`,
        };
  }

  switch (action) {
    case "CREATE_PR": {
      if (!isProcurementOfficerRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason: "Only the Procurement Officer is authorized to create Purchase Requisitions.",
        };
      }
      return { allowed: true };
    }

    case "SUBMIT_PR": {
      if (!isProcurementOfficerRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason: "Only the Procurement Officer is authorized to submit or resubmit Purchase Requests.",
        };
      }
      if (
        request &&
        request.status !== "Draft" &&
        request.status !== "Rejected" &&
        request.status !== "Resubmitted"
      ) {
        return {
          allowed: false,
          statusCode: 409,
          reason: `Cannot submit Purchase Request from status "${request.status}".`,
        };
      }
      return { allowed: true };
    }

    case "COLLECT_QUOTATION": {
      if (!isEvaluationCommitteeRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason:
            "Only the Evaluation Committee is authorized to collect and register supplier quotations. Procurement Officers cannot perform quotation evaluation tasks.",
        };
      }
      if (
        request &&
        request.status !== "Submitted for Evaluation" &&
        request.status !== "Quotation Collection" &&
        request.status !== "Under Evaluation"
      ) {
        return {
          allowed: false,
          statusCode: 409,
          reason: `Quotation collection is locked while request status is "${request.status}".`,
        };
      }
      return { allowed: true };
    }

    case "EVALUATE_AND_RECOMMEND": {
      if (!isEvaluationCommitteeRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason:
            "Only the Evaluation Committee is authorized to evaluate quotations, select winners, and submit award recommendations.",
        };
      }
      if (
        request &&
        request.status !== "Quotation Collection" &&
        request.status !== "Under Evaluation"
      ) {
        return {
          allowed: false,
          statusCode: 409,
          reason: `Evaluation requires status "Quotation Collection" or "Under Evaluation" (current: "${request.status}").`,
        };
      }
      if (request && Number(request.quotationCount || 0) < 1) {
        return {
          allowed: false,
          statusCode: 400,
          reason: "At least one supplier quotation must be collected before submitting an evaluation.",
        };
      }
      return { allowed: true };
    }

    case "APPROVE_BUDGET":
    case "REJECT_BUDGET": {
      if (!isDirectorOnlyRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason:
            "Only the Director can authorize or reject procurement budget allocation under this authority structure.",
        };
      }
      if (request && request.status !== "Award Recommended") {
        return {
          allowed: false,
          statusCode: 409,
          reason: `Director budget decision requires status "Award Recommended" (current: "${request.status}").`,
        };
      }
      return { allowed: true };
    }

    case "AUTHORIZE_PO": {
      if (!isDirectorOnlyRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason: "Only the Director can authorize Contract / Purchase Order issuance.",
        };
      }
      if (request && request.status !== "Budget Approved") {
        return {
          allowed: false,
          statusCode: 409,
          reason: `PO authorization is blocked until Director approves budget allocation (current: "${request.status}").`,
        };
      }
      if (request && !request.budgetAllocationId) {
        return {
          allowed: false,
          statusCode: 409,
          reason: "Verified Director budget allocation record is missing.",
        };
      }
      return { allowed: true };
    }

    case "EXECUTE_PROCUREMENT": {
      if (!isProcurementOfficerRole(norm) && !isDirectorOnlyRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason:
            "Only the Procurement Officer or Director can record procurement execution after PO authorization.",
        };
      }
      if (request && request.status !== "PO Authorized") {
        return {
          allowed: false,
          statusCode: 409,
          reason: `Procurement execution is blocked without Director budget approval and PO authorization (current: "${request.status}").`,
        };
      }
      if (request && (!request.budgetAllocationId || !request.poId)) {
        return {
          allowed: false,
          statusCode: 409,
          reason: "Procurement execution requires both a verified Budget Allocation and an Authorized PO.",
        };
      }
      return { allowed: true };
    }

    case "REJECT_REQUEST": {
      if (request) {
        if (
          request.status === "Submitted for Evaluation" ||
          request.status === "Quotation Collection" ||
          request.status === "Under Evaluation"
        ) {
          if (!isEvaluationCommitteeRole(norm)) {
            return {
              allowed: false,
              statusCode: 403,
              reason: "Only the Evaluation Committee can reject/return a request during quotation evaluation.",
            };
          }
          return { allowed: true };
        }
        if (request.status === "Award Recommended" || request.status === "Budget Approved") {
          if (!isDirectorOnlyRole(norm)) {
            return {
              allowed: false,
              statusCode: 403,
              reason: "Only the Director can reject a procurement recommendation or budget request at this stage.",
            };
          }
          return { allowed: true };
        }
        return {
          allowed: false,
          statusCode: 409,
          reason: `Cannot reject a procurement request in status "${request.status}".`,
        };
      }
      if (!isEvaluationCommitteeRole(norm) && !isDirectorOnlyRole(norm)) {
        return {
          allowed: false,
          statusCode: 403,
          reason: "Only Evaluation Committee or Director can reject procurement requests.",
        };
      }
      return { allowed: true };
    }
  }
}

export function assertProcurementAuthority(
  role: unknown,
  action: ProcurementAction,
  request?: Pick<
    ProcurementRequestRecord,
    "status" | "budgetAllocationId" | "poId" | "quotationCount"
  >
): void {
  const verdict = canRolePerformProcurementAction(role, action, request);
  if (!verdict.allowed) {
    throw new ProcurementAuthorizationError(
      verdict.statusCode === 409
        ? "invalid_workflow_state"
        : verdict.statusCode === 400
        ? "validation_error"
        : "forbidden_procurement_action",
      verdict.reason || "Unauthorized procurement action.",
      verdict.statusCode || 403
    );
  }
}

export function validateCreatePrInput(input: {
  title?: string;
  projectId?: string;
  projectName?: string;
  requiredDeliveryDate?: string;
  justification?: string;
  items?: ProcurementLineItem[];
}): void {
  if (!String(input.title || "").trim()) {
    throw new ProcurementAuthorizationError("validation_error", "Purchase request title is required.", 400);
  }
  if (!String(input.projectName || input.projectId || "").trim()) {
    throw new ProcurementAuthorizationError("validation_error", "Project selection is required.", 400);
  }
  if (!String(input.requiredDeliveryDate || "").trim()) {
    throw new ProcurementAuthorizationError("validation_error", "Required delivery date is mandatory.", 400);
  }
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    throw new ProcurementAuthorizationError("validation_error", "At least one line item is required.", 400);
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (!String(it.description || "").trim()) {
      throw new ProcurementAuthorizationError("validation_error", `Item #${i + 1} description is required.`, 400);
    }
    if (!String(it.specification || "").trim()) {
      throw new ProcurementAuthorizationError("validation_error", `Item #${i + 1} technical specification is required.`, 400);
    }
    if (!Number.isFinite(Number(it.quantity)) || Number(it.quantity) <= 0) {
      throw new ProcurementAuthorizationError("validation_error", `Item #${i + 1} quantity must be greater than 0.`, 400);
    }
  }
}

export function validateEvaluationSubmissionInput(input: {
  committeeMembers?: EvaluationCommitteeMember[];
  recommendedQuotationId?: string;
  quotationScores?: QuotationEvaluationScore[];
  recommendationReasons?: string;
  evaluationReportSummary?: string;
  supportingDocuments?: ProcurementSupportingDoc[];
  availableQuotations: ProcurementQuotationRecord[];
}): {
  winner: ProcurementQuotationRecord;
  technicalScore: number;
  financialScore: number;
  totalScore: number;
} {
  const members = Array.isArray(input.committeeMembers)
    ? input.committeeMembers.filter((m) => String(m?.name || "").trim().length > 0)
    : [];
  if (members.length === 0) {
    throw new ProcurementAuthorizationError(
      "validation_error",
      "Committee members' names must be documented for all evaluation decisions.",
      400
    );
  }

  const reasons = String(input.recommendationReasons || "").trim();
  if (!reasons) {
    throw new ProcurementAuthorizationError(
      "validation_error",
      "Written reasons for supplier selection and recommendation are mandatory.",
      400
    );
  }

  const docs = Array.isArray(input.supportingDocuments)
    ? input.supportingDocuments.filter(
        (d) => String(d?.name || "").trim().length > 0 && String(d?.urlOrRef || "").trim().length > 0
      )
    : [];
  if (docs.length === 0) {
    throw new ProcurementAuthorizationError(
      "validation_error",
      "At least one supporting evaluation document or report reference is mandatory.",
      400
    );
  }

  const winner = input.availableQuotations.find((q) => q.id === input.recommendedQuotationId);
  if (!winner) {
    throw new ProcurementAuthorizationError(
      "validation_error",
      "Recommended winning supplier quotation was not found on this purchase request.",
      400
    );
  }

  const scores = Array.isArray(input.quotationScores) ? input.quotationScores : [];
  const winnerScore = scores.find((s) => s.quotationId === winner.id);
  const tech = Number(winnerScore?.technicalScore ?? NaN);
  const fin = Number(winnerScore?.financialScore ?? NaN);
  if (!Number.isFinite(tech) || tech < 0 || tech > 100 || !Number.isFinite(fin) || fin < 0 || fin > 100) {
    throw new ProcurementAuthorizationError(
      "validation_error",
      "Technical and financial evaluation scores (0 to 100) must be recorded for the recommended supplier.",
      400
    );
  }

  const totalScore = Number((tech * 0.6 + fin * 0.4).toFixed(2));
  return {
    winner,
    technicalScore: tech,
    financialScore: fin,
    totalScore,
  };
}

export function validateExecutionPrerequisites(params: {
  request: ProcurementRequestRecord;
  budgetAllocation?: ProcurementBudgetAllocationRecord | null;
  purchaseOrder?: ProcurementOrderRecord | null;
}): void {
  const { request, budgetAllocation, purchaseOrder } = params;
  if (request.status !== "PO Authorized") {
    throw new ProcurementAuthorizationError(
      "invalid_workflow_state",
      `Execution is strictly prevented: current status is "${request.status}" instead of "PO Authorized".`,
      409
    );
  }
  if (!request.budgetAllocationId || !budgetAllocation || budgetAllocation.decision !== "Approved") {
    throw new ProcurementAuthorizationError(
      "missing_director_budget_approval",
      "Execution is strictly prevented without an approved Director budget allocation record.",
      409
    );
  }
  if (!request.poId || !purchaseOrder || purchaseOrder.status !== "Authorized") {
    throw new ProcurementAuthorizationError(
      "missing_po_authorization",
      "Execution is strictly prevented without an authorized Contract / Purchase Order.",
      409
    );
  }
}

export const PROCUREMENT_WORKFLOW_STAGES: Array<{
  key: ProcurementWorkflowStatus;
  labelEn: string;
  labelAm: string;
  responsibleRole: string;
}> = [
  {
    key: "Draft",
    labelEn: "1. PR Creation",
    labelAm: "1. የግዢ ጥያቄ ዝግጅት",
    responsibleRole: UserRole.PROCUREMENT_OFFICER,
  },
  {
    key: "Submitted for Evaluation",
    labelEn: "2. Submitted",
    labelAm: "2. ለግምገማ ተልኳል",
    responsibleRole: UserRole.PROCUREMENT_OFFICER,
  },
  {
    key: "Quotation Collection",
    labelEn: "3. Quotation Collection",
    labelAm: "3. ዋጋ መሰብሰብ",
    responsibleRole: UserRole.EVALUATION_COMMITTEE,
  },
  {
    key: "Under Evaluation",
    labelEn: "4. Quotation Evaluation",
    labelAm: "4. የዋጋና ቴክኒክ ግምገማ",
    responsibleRole: UserRole.EVALUATION_COMMITTEE,
  },
  {
    key: "Award Recommended",
    labelEn: "5. Winner Recommendation",
    labelAm: "5. አሸናፊ አቅራቢ ምርጫ",
    responsibleRole: UserRole.EVALUATION_COMMITTEE,
  },
  {
    key: "Budget Approved",
    labelEn: "6. Director Budget Approval",
    labelAm: "6. የዳይሬክተር በጀት ማፅደቅ",
    responsibleRole: UserRole.DIRECTOR,
  },
  {
    key: "PO Authorized",
    labelEn: "7. PO / Contract Authorization",
    labelAm: "7. የውል / PO ፈቃድ",
    responsibleRole: UserRole.DIRECTOR,
  },
  {
    key: "Executed",
    labelEn: "8. Procurement Execution",
    labelAm: "8. ግዢ አፈፃፀም",
    responsibleRole: UserRole.PROCUREMENT_OFFICER,
  },
];
