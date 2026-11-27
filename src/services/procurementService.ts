import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { auth, db, isFirebaseReady } from "../firebase";
import { authFetch } from "./authService";
import {
  EvaluationCommitteeMember,
  ProcurementAuditLogRecord,
  ProcurementBudgetAllocationRecord,
  ProcurementEvaluationRecord,
  ProcurementLineItem,
  ProcurementOrderRecord,
  ProcurementQuotationRecord,
  ProcurementRequestRecord,
  ProcurementSupportingDoc,
  QuotationEvaluationScore,
} from "../types";

export interface ProcurementSnapshot {
  requests: ProcurementRequestRecord[];
  quotations: ProcurementQuotationRecord[];
  evaluations: ProcurementEvaluationRecord[];
  budgetAllocations: ProcurementBudgetAllocationRecord[];
  orders: ProcurementOrderRecord[];
  auditLogs: ProcurementAuditLogRecord[];
}

const CACHE_KEY = "ovid_erp_procurement_snapshot_v1";

export function loadCachedProcurementSnapshot(): ProcurementSnapshot {
  const empty: ProcurementSnapshot = {
    requests: [],
    quotations: [],
    evaluations: [],
    budgetAllocations: [],
    orders: [],
    auditLogs: [],
  };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      quotations: Array.isArray(parsed.quotations) ? parsed.quotations : [],
      evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
      budgetAllocations: Array.isArray(parsed.budgetAllocations) ? parsed.budgetAllocations : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch {
    return empty;
  }
}

export function saveCachedProcurementSnapshot(snapshot: ProcurementSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota errors
  }
}

async function parseApiResponse<T>(resp: Response): Promise<T> {
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.success === false) {
    const err: any = new Error(data?.message || data?.error || `Request failed (${resp.status})`);
    err.statusCode = resp.status;
    err.code = data?.error;
    throw err;
  }
  return data as T;
}

export const procurementService = {
  async fetchSnapshot(): Promise<ProcurementSnapshot> {
    try {
      const resp = await authFetch("/api/procurement/snapshot", { method: "GET" });
      const data = await parseApiResponse<{ success: true; data: ProcurementSnapshot }>(resp);
      saveCachedProcurementSnapshot(data.data);
      return data.data;
    } catch (err: any) {
      // If offline / network failure, serve cached snapshot; propagate 401/403 authorization errors
      if (err?.statusCode === 401 || err?.statusCode === 403) {
        throw err;
      }
      return loadCachedProcurementSnapshot();
    }
  },

  subscribeCollections(
    onUpdate: (partial: Partial<ProcurementSnapshot>) => void
  ): () => void {
    if (!isFirebaseReady || !db || !auth?.currentUser) {
      return () => {};
    }
    const unsubs: Array<() => void> = [];
    const bind = <T extends { id: string }>(colName: string, key: keyof ProcurementSnapshot) => {
      try {
        const q = query(collection(db!, colName), limit(250));
        const unsub = onSnapshot(
          q,
          (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as T);
            onUpdate({ [key]: rows } as Partial<ProcurementSnapshot>);
          },
          () => {
            // Ignore transient listener errors when offline or permission-scoped
          }
        );
        unsubs.push(unsub);
      } catch {
        // Ignore initialization errors
      }
    };

    bind<ProcurementRequestRecord>("procurementRequests", "requests");
    bind<ProcurementQuotationRecord>("procurementQuotations", "quotations");
    bind<ProcurementEvaluationRecord>("procurementEvaluations", "evaluations");
    bind<ProcurementBudgetAllocationRecord>("procurementBudgetAllocations", "budgetAllocations");
    bind<ProcurementOrderRecord>("procurementOrders", "orders");
    bind<ProcurementAuditLogRecord>("procurementAuditLogs", "auditLogs");

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  },

  async createPurchaseRequest(payload: {
    title: string;
    projectId: string;
    projectName: string;
    requiredDeliveryDate: string;
    justification: string;
    estimatedTotalEtb?: number;
    items: ProcurementLineItem[];
    supportingDocuments?: ProcurementSupportingDoc[];
    submitImmediately?: boolean;
  }): Promise<{ request: ProcurementRequestRecord }> {
    const resp = await authFetch("/api/procurement/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async submitOrResubmitRequest(
    requestId: string,
    payload: {
      comment?: string;
      title?: string;
      requiredDeliveryDate?: string;
      justification?: string;
      items?: ProcurementLineItem[];
      estimatedTotalEtb?: number;
    }
  ): Promise<{ request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async collectQuotation(
    requestId: string,
    payload: {
      supplierName: string;
      supplierContact: string;
      supplierTin?: string;
      unitPriceSummary?: string;
      totalAmountEtb: number;
      currency?: "ETB" | "USD" | "EUR";
      deliveryLeadTimeDays: number;
      paymentTerms: string;
      technicalComplianceNotes: string;
      attachmentName: string;
      attachmentUrlOrRef: string;
    }
  ): Promise<{ quotation: ProcurementQuotationRecord; request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/quotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async submitEvaluationRecommendation(
    requestId: string,
    payload: {
      committeeMembers: EvaluationCommitteeMember[];
      quotationScores: QuotationEvaluationScore[];
      recommendedQuotationId: string;
      recommendationReasons: string;
      evaluationReportSummary: string;
      supportingDocuments: ProcurementSupportingDoc[];
    }
  ): Promise<{ evaluation: ProcurementEvaluationRecord; request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async submitDirectorBudgetDecision(
    requestId: string,
    payload: {
      decision: "Approved" | "Rejected";
      allocatedBudgetEtb: number;
      budgetLine: string;
      costCenter: string;
      fiscalYear?: string;
      comments: string;
    }
  ): Promise<{ budgetAllocation: ProcurementBudgetAllocationRecord; request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/director-budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async authorizePurchaseOrder(
    requestId: string,
    payload: {
      authorizedAmountEtb?: number;
      deliveryTerms?: string;
    }
  ): Promise<{ order: ProcurementOrderRecord; request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/authorize-po`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async executeProcurement(
    requestId: string,
    payload: {
      executionReference?: string;
      executionNotes?: string;
    }
  ): Promise<{ order: ProcurementOrderRecord; request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseApiResponse(resp);
  },

  async rejectRequest(
    requestId: string,
    comment: string
  ): Promise<{ request: ProcurementRequestRecord }> {
    const resp = await authFetch(`/api/procurement/requests/${encodeURIComponent(requestId)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    return parseApiResponse(resp);
  },
};
