import express, { type NextFunction, type Request, type Response, type Router } from "express";
import {
  EvaluationCommitteeMember,
  ProcurementAuditAction,
  ProcurementAuditLogRecord,
  ProcurementBudgetAllocationRecord,
  ProcurementEvaluationRecord,
  ProcurementLineItem,
  ProcurementOrderRecord,
  ProcurementQuotationRecord,
  ProcurementRequestRecord,
  ProcurementSupportingDoc,
  ProcurementWorkflowStatus,
  QuotationEvaluationScore,
  UserRole,
} from "../types";
import {
  assertProcurementAuthority,
  canReadProcurementModule,
  normalizeProcurementRole,
  ProcurementAuthorizationError,
  validateCreatePrInput,
  validateEvaluationSubmissionInput,
  validateExecutionPrerequisites,
} from "../services/procurementRbac";
import {
  FirestoreRestWarehouseStore,
  StoreWriteOp,
  WarehouseBackendContext,
  WarehouseBackendStore,
} from "./warehouseStoreRouter";

export interface ProcurementRouterDeps {
  verifyAppCheck: (req: Request, res: Response, next: NextFunction) => any;
  requireAuth: (req: Request, res: Response, next: NextFunction) => any;
  requireActiveUser: (req: Request, res: Response, next: NextFunction) => any;
  getProjectConfig: () => { projectId: string; databaseId: string };
  store?: WarehouseBackendStore;
}

export const PROCUREMENT_COLLECTIONS = {
  REQUESTS: "procurementRequests",
  QUOTATIONS: "procurementQuotations",
  EVALUATIONS: "procurementEvaluations",
  BUDGET_ALLOCATIONS: "procurementBudgetAllocations",
  ORDERS: "procurementOrders",
  AUDIT_LOGS: "procurementAuditLogs",
  NOTIFICATIONS: "notifications",
} as const;

function buildCtx(
  req: Request,
  getProjectConfig: () => { projectId: string; databaseId: string }
): WarehouseBackendContext {
  const cfg = getProjectConfig();
  return {
    idToken: (req as any).rawIdToken,
    appCheckToken: req.header("X-Firebase-AppCheck"),
    projectId: cfg.projectId,
    databaseId: cfg.databaseId,
  };
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, "");
}

function getActor(req: Request): { uid: string; name: string; role: string } {
  const authUser = (req as any).authUser || {};
  const profile = (req as any).userProfile || {};
  const role = normalizeProcurementRole(profile.role);
  const name =
    String(profile.displayName || profile.name || authUser.email || authUser.uid || "Authorized User").trim();
  return {
    uid: String(authUser.uid || ""),
    name,
    role,
  };
}

function buildAuditOp(params: {
  requestId: string;
  requestNumber: string;
  action: ProcurementAuditAction;
  actor: { uid: string; name: string; role: string };
  previousStatus: ProcurementWorkflowStatus | "None";
  newStatus: ProcurementWorkflowStatus;
  comments: string;
  metadata?: Record<string, any>;
  nowIso: string;
}): StoreWriteOp {
  const id = makeId("PAUD");
  const record: ProcurementAuditLogRecord = {
    id,
    requestId: params.requestId,
    requestNumber: params.requestNumber,
    action: params.action,
    actorUid: params.actor.uid,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    comments: params.comments,
    metadata: params.metadata || {},
    timestamp: params.nowIso,
    capturedAt: params.nowIso,
    serverReceivedAt: params.nowIso,
  };
  return {
    collection: PROCUREMENT_COLLECTIONS.AUDIT_LOGS,
    docId: id,
    data: record,
  };
}

function buildNotificationOp(params: {
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  projectName: string;
  actor: { uid: string; name: string; role: string };
  receiverLabel: string;
  targetRoles: UserRole[];
  nowIso: string;
}): StoreWriteOp {
  const id = makeId("NTFPROC");
  const d = new Date(params.nowIso);
  const notif = {
    id,
    title: params.title,
    titleAm: params.titleAm,
    description: params.description,
    descriptionAm: params.descriptionAm,
    category: "Material Approval Notifications",
    priority: params.priority,
    status: "Unread",
    projectName: params.projectName || "Enterprise Procurement",
    sender: `${params.actor.name} (${params.actor.role})`,
    senderRole: params.actor.role,
    receiver: params.receiverLabel,
    targetRoles: params.targetRoles,
    date: params.nowIso.slice(0, 10),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    timestamp: d.getTime(),
    deliveryChannels: { inApp: true, push: true, email: true, sms: false },
    actionTab: "procurementWorkflow",
    capturedAt: params.nowIso,
    serverReceivedAt: params.nowIso,
  };
  return {
    collection: PROCUREMENT_COLLECTIONS.NOTIFICATIONS,
    docId: id,
    data: notif,
  };
}

function handleError(res: Response, err: unknown) {
  if (err instanceof ProcurementAuthorizationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
  }
  const msg = err instanceof Error ? err.message : "Procurement operation failed.";
  const isPerm = msg.includes("PERMISSION_DENIED") || msg.includes("403");
  return res.status(isPerm ? 403 : 500).json({
    success: false,
    error: isPerm ? "firestore_permission_denied" : "procurement_server_error",
    message: msg,
  });
}

export function createProcurementRouter(deps: ProcurementRouterDeps): {
  router: Router;
  store: WarehouseBackendStore;
} {
  const router = express.Router();
  const store: WarehouseBackendStore = deps.store || new FirestoreRestWarehouseStore();
  const authGuard = [deps.verifyAppCheck, deps.requireAuth, deps.requireActiveUser];

  // GET /api/procurement/snapshot
  router.get("/api/procurement/snapshot", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      assertProcurementAuthority(actor.role, "READ_PROCUREMENT");
      const ctx = buildCtx(req, deps.getProjectConfig);

      const [requests, quotations, evaluations, budgetAllocations, orders, auditLogs] = await Promise.all([
        store.listCollection<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, ctx),
        store.listCollection<ProcurementQuotationRecord>(PROCUREMENT_COLLECTIONS.QUOTATIONS, ctx),
        store.listCollection<ProcurementEvaluationRecord>(PROCUREMENT_COLLECTIONS.EVALUATIONS, ctx),
        store.listCollection<ProcurementBudgetAllocationRecord>(PROCUREMENT_COLLECTIONS.BUDGET_ALLOCATIONS, ctx),
        store.listCollection<ProcurementOrderRecord>(PROCUREMENT_COLLECTIONS.ORDERS, ctx),
        store.listCollection<ProcurementAuditLogRecord>(PROCUREMENT_COLLECTIONS.AUDIT_LOGS, ctx),
      ]);

      requests.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
      auditLogs.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));

      return res.json({
        success: true,
        actor,
        data: {
          requests,
          quotations,
          evaluations,
          budgetAllocations,
          orders,
          auditLogs,
        },
      });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests -> Procurement Officer ONLY
  router.post("/api/procurement/requests", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      assertProcurementAuthority(actor.role, "CREATE_PR");

      const body = req.body || {};
      const items: ProcurementLineItem[] = (Array.isArray(body.items) ? body.items : []).map((it: any, idx: number) => ({
        id: String(it.id || `ITEM-${idx + 1}`).replace(/[^a-zA-Z0-9_-]/g, "") || `ITEM-${idx + 1}`,
        description: String(it.description || "").trim(),
        quantity: Number(it.quantity || 0),
        unit: String(it.unit || "Pcs").trim(),
        specification: String(it.specification || "").trim(),
        estimatedUnitCostEtb: Number(it.estimatedUnitCostEtb || 0),
      }));

      validateCreatePrInput({
        title: body.title,
        projectId: body.projectId,
        projectName: body.projectName,
        requiredDeliveryDate: body.requiredDeliveryDate,
        justification: body.justification,
        items,
      });

      const computedTotal = items.reduce(
        (sum, it) => sum + Number(it.quantity || 0) * Number(it.estimatedUnitCostEtb || 0),
        0
      );
      const estimatedTotalEtb =
        Number(body.estimatedTotalEtb) > 0 ? Number(body.estimatedTotalEtb) : Number(computedTotal.toFixed(2));

      const submitImmediately = body.submitImmediately === true;
      const initialStatus: ProcurementWorkflowStatus = submitImmediately ? "Submitted for Evaluation" : "Draft";
      const nowIso = new Date().toISOString();
      const ctx = buildCtx(req, deps.getProjectConfig);

      const existingReqs = await store.listCollection<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, ctx);
      const nextNum = String(existingReqs.length + 1).padStart(4, "0");
      const year = nowIso.slice(0, 4);
      const id = makeId("PR");
      const requestNumber = `PR-${year}-${nextNum}`;

      const supportingDocuments: ProcurementSupportingDoc[] = (
        Array.isArray(body.supportingDocuments) ? body.supportingDocuments : []
      )
        .filter((d: any) => String(d?.name || "").trim() && String(d?.urlOrRef || "").trim())
        .map((d: any) => ({
          id: String(d.id || makeId("DOC")),
          name: String(d.name).trim(),
          category: d.category || "Specification",
          urlOrRef: String(d.urlOrRef).trim(),
          uploadedBy: actor.name,
          uploadedByUid: actor.uid,
          uploadedAt: nowIso,
        }));

      const newRequest: ProcurementRequestRecord = {
        id,
        requestNumber,
        title: String(body.title).trim(),
        projectId: String(body.projectId || body.projectName).trim(),
        projectName: String(body.projectName || body.projectId).trim(),
        items,
        requiredDeliveryDate: String(body.requiredDeliveryDate).trim(),
        estimatedTotalEtb,
        justification: String(body.justification || "Project procurement requisition").trim(),
        status: initialStatus,
        createdByUid: actor.uid,
        createdByName: actor.name,
        createdByRole: actor.role,
        ...(submitImmediately ? { submittedAt: nowIso } : {}),
        quotationCount: 0,
        rejectionHistory: [],
        supportingDocuments,
        createdAt: nowIso,
        updatedAt: nowIso,
        capturedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        {
          collection: PROCUREMENT_COLLECTIONS.REQUESTS,
          docId: id,
          data: newRequest,
        },
        buildAuditOp({
          requestId: id,
          requestNumber,
          action: submitImmediately ? "PR_SUBMITTED" : "PR_CREATED",
          actor,
          previousStatus: "None",
          newStatus: initialStatus,
          comments: submitImmediately
            ? `Created and submitted ${requestNumber} for Evaluation Committee quotation collection.`
            : `Created draft Purchase Request ${requestNumber}.`,
          metadata: { estimatedTotalEtb, itemCount: items.length },
          nowIso,
        }),
      ];

      if (submitImmediately) {
        ops.push(
          buildNotificationOp({
            title: `New Purchase Request ${requestNumber} Submitted for Quotation Collection`,
            titleAm: `አዲስ የግዢ ጥያቄ ${requestNumber} ለዋጋ ግምገማ ተልኳል`,
            description: `${actor.name} submitted "${newRequest.title}" (Delivery: ${newRequest.requiredDeliveryDate}). Please collect and evaluate supplier quotations.`,
            descriptionAm: `${actor.name} "${newRequest.title}" የግዢ ጥያቄ አቅርበዋል። የአቅራቢዎች ዋጋ እንዲሰበሰብና እንዲገመገም ይጠበቃል።`,
            priority: "High",
            projectName: newRequest.projectName,
            actor,
            receiverLabel: "Evaluation Committee",
            targetRoles: [UserRole.EVALUATION_COMMITTEE],
            nowIso,
          })
        );
      }

      await store.commitWrites(ops, ctx);
      return res.status(201).json({ success: true, request: newRequest });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/submit -> Procurement Officer ONLY (Draft/Rejected -> Submitted for Evaluation)
  router.post("/api/procurement/requests/:id/submit", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      assertProcurementAuthority(actor.role, "SUBMIT_PR", existing);

      const wasRejected = existing.status === "Rejected";
      const resubmissionComment = String(req.body?.comment || "").trim();
      if (wasRejected && !resubmissionComment) {
        throw new ProcurementAuthorizationError(
          "validation_error",
          "Resubmission comment is mandatory when resubmitting a rejected purchase request.",
          400
        );
      }

      const nowIso = new Date().toISOString();
      const updatedItems = Array.isArray(req.body?.items) && req.body.items.length > 0 ? req.body.items : existing.items;
      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        title: String(req.body?.title || existing.title).trim(),
        requiredDeliveryDate: String(req.body?.requiredDeliveryDate || existing.requiredDeliveryDate).trim(),
        justification: String(req.body?.justification || existing.justification).trim(),
        items: updatedItems,
        estimatedTotalEtb:
          Number(req.body?.estimatedTotalEtb) > 0 ? Number(req.body.estimatedTotalEtb) : existing.estimatedTotalEtb,
        status: "Submitted for Evaluation",
        submittedAt: nowIso,
        ...(wasRejected
          ? {
              resubmittedAt: nowIso,
              resubmissionComment,
              rejectionHistory: (existing.rejectionHistory || []).map((entry, idx, arr) =>
                idx === arr.length - 1 && !entry.resubmittedAt
                  ? { ...entry, resubmittedAt: nowIso, resubmissionComment }
                  : entry
              ),
            }
          : {}),
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: wasRejected ? "PR_RESUBMITTED" : "PR_SUBMITTED",
          actor,
          previousStatus: existing.status,
          newStatus: "Submitted for Evaluation",
          comments: wasRejected
            ? `Resubmitted after rejection: ${resubmissionComment}`
            : `Submitted ${existing.requestNumber} for Evaluation Committee quotation collection.`,
          nowIso,
        }),
        buildNotificationOp({
          title: `${wasRejected ? "Resubmitted " : ""}Purchase Request ${existing.requestNumber} Ready for Quotations`,
          titleAm: `${wasRejected ? "ተስተካክሎ የቀረበ " : ""}የግዢ ጥያቄ ${existing.requestNumber} ለዋጋ ማሰባሰብ ዝግጁ ነው`,
          description: `${actor.name} ${wasRejected ? "resubmitted" : "submitted"} "${updatedReq.title}". Evaluation Committee action required.`,
          descriptionAm: `${actor.name} "${updatedReq.title}" አቅርበዋል። የግምገማ ኮሚቴ እርምጃ ያስፈልጋል።`,
          priority: "High",
          projectName: updatedReq.projectName,
          actor,
          receiverLabel: "Evaluation Committee",
          targetRoles: [UserRole.EVALUATION_COMMITTEE],
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.json({ success: true, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/quotations -> Evaluation Committee ONLY
  router.post("/api/procurement/requests/:id/quotations", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      assertProcurementAuthority(actor.role, "COLLECT_QUOTATION", existing);

      const body = req.body || {};
      const supplierName = String(body.supplierName || "").trim();
      const supplierContact = String(body.supplierContact || "").trim();
      const totalAmountEtb = Number(body.totalAmountEtb);
      const deliveryLeadTimeDays = Number(body.deliveryLeadTimeDays || 0);
      const attachmentName = String(body.attachmentName || "").trim();
      const attachmentUrlOrRef = String(body.attachmentUrlOrRef || "").trim();

      if (!supplierName || !supplierContact) {
        throw new ProcurementAuthorizationError("validation_error", "Supplier name and contact are required.", 400);
      }
      if (!Number.isFinite(totalAmountEtb) || totalAmountEtb <= 0) {
        throw new ProcurementAuthorizationError("validation_error", "Quotation total amount must be greater than 0.", 400);
      }
      if (!attachmentName || !attachmentUrlOrRef) {
        throw new ProcurementAuthorizationError(
          "validation_error",
          "Supporting supplier quotation document name and reference/URL are required.",
          400
        );
      }

      const nowIso = new Date().toISOString();
      const quotationId = makeId("QT");
      const quotation: ProcurementQuotationRecord = {
        id: quotationId,
        requestId,
        requestNumber: existing.requestNumber,
        supplierName,
        supplierContact,
        supplierTin: String(body.supplierTin || "").trim(),
        unitPriceSummary: String(body.unitPriceSummary || `Total ETB ${totalAmountEtb.toLocaleString()}`).trim(),
        totalAmountEtb,
        currency: body.currency === "USD" || body.currency === "EUR" ? body.currency : "ETB",
        deliveryLeadTimeDays: Number.isFinite(deliveryLeadTimeDays) && deliveryLeadTimeDays >= 0 ? deliveryLeadTimeDays : 7,
        paymentTerms: String(body.paymentTerms || "Standard Net 30").trim(),
        technicalComplianceNotes: String(body.technicalComplianceNotes || "Complies with technical specifications").trim(),
        attachmentName,
        attachmentUrlOrRef,
        collectedByUid: actor.uid,
        collectedByName: actor.name,
        collectedByRole: actor.role,
        collectedAt: nowIso,
        createdAt: nowIso,
        capturedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const nextStatus: ProcurementWorkflowStatus =
        existing.status === "Under Evaluation" ? "Under Evaluation" : "Quotation Collection";

      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        quotationCount: Number(existing.quotationCount || 0) + 1,
        status: nextStatus,
        supportingDocuments: [
          ...(existing.supportingDocuments || []),
          {
            id: makeId("DOC"),
            name: attachmentName,
            category: "Quotation",
            urlOrRef: attachmentUrlOrRef,
            uploadedBy: actor.name,
            uploadedByUid: actor.uid,
            uploadedAt: nowIso,
          },
        ],
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.QUOTATIONS, docId: quotationId, data: quotation },
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: "QUOTATION_COLLECTED",
          actor,
          previousStatus: existing.status,
          newStatus: nextStatus,
          comments: `Registered quotation from "${supplierName}" (ETB ${totalAmountEtb.toLocaleString()}).`,
          metadata: { quotationId, supplierName, totalAmountEtb },
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.status(201).json({ success: true, quotation, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/evaluate -> Evaluation Committee ONLY
  router.post("/api/procurement/requests/:id/evaluate", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      assertProcurementAuthority(actor.role, "EVALUATE_AND_RECOMMEND", existing);

      const allQuotations = await store.listCollection<ProcurementQuotationRecord>(PROCUREMENT_COLLECTIONS.QUOTATIONS, ctx);
      const reqQuotations = allQuotations.filter((q) => q.requestId === requestId);

      const body = req.body || {};
      const committeeMembers: EvaluationCommitteeMember[] = (
        Array.isArray(body.committeeMembers) ? body.committeeMembers : []
      ).map((m: any) => ({
        name: String(m?.name || "").trim(),
        role: String(m?.role || "Evaluation Committee Member").trim(),
        ...(m?.uid ? { uid: String(m.uid) } : {}),
      }));

      const quotationScores: QuotationEvaluationScore[] = (
        Array.isArray(body.quotationScores) ? body.quotationScores : []
      ).map((s: any) => {
        const tech = Number(s?.technicalScore || 0);
        const fin = Number(s?.financialScore || 0);
        return {
          quotationId: String(s?.quotationId || "").trim(),
          supplierName: String(s?.supplierName || "").trim(),
          technicalScore: tech,
          financialScore: fin,
          weightedTotalScore: Number((tech * 0.6 + fin * 0.4).toFixed(2)),
          remarks: String(s?.remarks || "").trim(),
        };
      });

      const nowIso = new Date().toISOString();
      const supportingDocuments: ProcurementSupportingDoc[] = (
        Array.isArray(body.supportingDocuments) ? body.supportingDocuments : []
      )
        .filter((d: any) => String(d?.name || "").trim() && String(d?.urlOrRef || "").trim())
        .map((d: any) => ({
          id: String(d.id || makeId("DOC")),
          name: String(d.name).trim(),
          category: d.category || "Evaluation Report",
          urlOrRef: String(d.urlOrRef).trim(),
          uploadedBy: actor.name,
          uploadedByUid: actor.uid,
          uploadedAt: nowIso,
        }));

      const validated = validateEvaluationSubmissionInput({
        committeeMembers,
        recommendedQuotationId: body.recommendedQuotationId,
        quotationScores,
        recommendationReasons: body.recommendationReasons,
        evaluationReportSummary: body.evaluationReportSummary,
        supportingDocuments,
        availableQuotations: reqQuotations,
      });

      const evaluationId = makeId("EVAL");
      const evaluation: ProcurementEvaluationRecord = {
        id: evaluationId,
        requestId,
        requestNumber: existing.requestNumber,
        committeeMembers,
        quotationScores,
        recommendedQuotationId: validated.winner.id,
        recommendedSupplierName: validated.winner.supplierName,
        recommendedAmountEtb: validated.winner.totalAmountEtb,
        technicalScore: validated.technicalScore,
        financialScore: validated.financialScore,
        totalScore: validated.totalScore,
        recommendationReasons: String(body.recommendationReasons).trim(),
        evaluationReportSummary: String(
          body.evaluationReportSummary || body.recommendationReasons
        ).trim(),
        supportingDocuments,
        evaluatedByUid: actor.uid,
        evaluatedByName: actor.name,
        evaluatedByRole: actor.role,
        evaluatedAt: nowIso,
        createdAt: nowIso,
        capturedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        status: "Award Recommended",
        evaluationId,
        recommendedQuotationId: validated.winner.id,
        recommendedSupplierName: validated.winner.supplierName,
        supportingDocuments: [...(existing.supportingDocuments || []), ...supportingDocuments],
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.EVALUATIONS, docId: evaluationId, data: evaluation },
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: "WINNER_RECOMMENDED",
          actor,
          previousStatus: existing.status,
          newStatus: "Award Recommended",
          comments: `Evaluated ${reqQuotations.length} quotation(s) and recommended "${validated.winner.supplierName}" (Score: ${validated.totalScore}/100, Amount: ETB ${validated.winner.totalAmountEtb.toLocaleString()}). Committee: ${committeeMembers.map((m) => m.name).join(", ")}.`,
          metadata: {
            evaluationId,
            recommendedQuotationId: validated.winner.id,
            recommendedSupplierName: validated.winner.supplierName,
            totalScore: validated.totalScore,
            committeeCount: committeeMembers.length,
          },
          nowIso,
        }),
        buildNotificationOp({
          title: `Contract Award Recommendation ${existing.requestNumber} Awaiting Director Budget Approval`,
          titleAm: `የግዢ ውል ምክረ ሃሳብ ${existing.requestNumber} የዳይሬክተር በጀት ፈቃድ ይጠብቃል`,
          description: `Evaluation Committee recommended ${validated.winner.supplierName} (ETB ${validated.winner.totalAmountEtb.toLocaleString()}, Score ${validated.totalScore}/100). Only Director can authorize budget allocation.`,
          descriptionAm: `የግምገማ ኮሚቴው ${validated.winner.supplierName} (ETB ${validated.winner.totalAmountEtb.toLocaleString()}) መርጧል። የበጀት ፈቃድ የሚሰጠው በዳይሬክተር ብቻ ነው።`,
          priority: "Critical",
          projectName: updatedReq.projectName,
          actor,
          receiverLabel: "Director",
          targetRoles: [UserRole.DIRECTOR],
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.status(201).json({ success: true, evaluation, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/director-budget -> Director ONLY
  router.post("/api/procurement/requests/:id/director-budget", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      const body = req.body || {};
      const decision: "Approved" | "Rejected" = body.decision === "Rejected" ? "Rejected" : "Approved";
      assertProcurementAuthority(
        actor.role,
        decision === "Approved" ? "APPROVE_BUDGET" : "REJECT_BUDGET",
        existing
      );

      const comments = String(body.comments || "").trim();
      const allocatedBudgetEtb = Number(body.allocatedBudgetEtb || 0);
      const budgetLine = String(body.budgetLine || "CAPEX-PROJECT-PROCUREMENT").trim();
      const costCenter = String(body.costCenter || existing.projectName).trim();
      const fiscalYear = String(body.fiscalYear || new Date().getFullYear()).trim();

      if (decision === "Approved" && (!Number.isFinite(allocatedBudgetEtb) || allocatedBudgetEtb <= 0)) {
        throw new ProcurementAuthorizationError(
          "validation_error",
          "Allocated project procurement budget amount (ETB) must be greater than 0.",
          400
        );
      }
      if (decision === "Rejected" && !comments) {
        throw new ProcurementAuthorizationError(
          "validation_error",
          "Rejection comments are mandatory when rejecting budget allocation.",
          400
        );
      }

      const nowIso = new Date().toISOString();
      const allocationId = makeId("BUDG");
      const allocationNumber = `BDG-${nowIso.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const allocationRecord: ProcurementBudgetAllocationRecord = {
        id: allocationId,
        allocationNumber,
        requestId,
        requestNumber: existing.requestNumber,
        projectId: existing.projectId,
        projectName: existing.projectName,
        decision,
        allocatedBudgetEtb: decision === "Approved" ? allocatedBudgetEtb : 0,
        budgetLine,
        costCenter,
        fiscalYear,
        comments: comments || (decision === "Approved" ? "Budget allocated & authorized by Director" : ""),
        authorizedByUid: actor.uid,
        authorizedByName: actor.name,
        authorizedByRole: actor.role,
        authorizedAt: nowIso,
        createdAt: nowIso,
        capturedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const nextStatus: ProcurementWorkflowStatus = decision === "Approved" ? "Budget Approved" : "Rejected";
      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        status: nextStatus,
        ...(decision === "Approved"
          ? {
              budgetAllocationId: allocationId,
              allocatedBudgetEtb,
              budgetApprovedByUid: actor.uid,
              budgetApprovedByName: actor.name,
              budgetApprovedAt: nowIso,
            }
          : {
              lastRejectionReason: comments,
              lastRejectedByName: actor.name,
              lastRejectedByRole: actor.role,
              lastRejectedAt: nowIso,
              rejectionHistory: [
                ...(existing.rejectionHistory || []),
                {
                  id: makeId("REJ"),
                  stage: existing.status,
                  rejectedByUid: actor.uid,
                  rejectedByName: actor.name,
                  rejectedByRole: actor.role,
                  reason: comments,
                  rejectedAt: nowIso,
                },
              ],
            }),
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.BUDGET_ALLOCATIONS, docId: allocationId, data: allocationRecord },
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: decision === "Approved" ? "BUDGET_APPROVED" : "BUDGET_REJECTED",
          actor,
          previousStatus: existing.status,
          newStatus: nextStatus,
          comments:
            decision === "Approved"
              ? `Director allocated ETB ${allocatedBudgetEtb.toLocaleString()} (${budgetLine}). ${comments}`.trim()
              : `Director rejected budget allocation: ${comments}`,
          metadata: { allocationId, allocationNumber, allocatedBudgetEtb, budgetLine },
          nowIso,
        }),
        buildNotificationOp({
          title:
            decision === "Approved"
              ? `Budget Allocated for ${existing.requestNumber} — Ready for PO Authorization`
              : `Budget Rejected by Director for ${existing.requestNumber}`,
          titleAm:
            decision === "Approved"
              ? `ለግዢ ጥያቄ ${existing.requestNumber} በጀት ተፈቅዷል — የPO ፈቃድ ይጠበቃል`
              : `የግዢ ጥያቄ ${existing.requestNumber} በዳይሬክተር በጀት ውድቅ ተደርጓል`,
          description:
            decision === "Approved"
              ? `Director allocated ETB ${allocatedBudgetEtb.toLocaleString()}. Proceed to Contract / Purchase Order authorization.`
              : `Director rejected budget allocation with reason: ${comments}`,
          descriptionAm:
            decision === "Approved"
              ? `ዳይሬክተሩ ETB ${allocatedBudgetEtb.toLocaleString()} በጀት አጽድቀዋል።`
              : `ዳይሬክተሩ በጀቱን አልፈቀዱትም፡ ${comments}`,
          priority: decision === "Approved" ? "High" : "Critical",
          projectName: existing.projectName,
          actor,
          receiverLabel:
            decision === "Approved"
              ? "Director, Procurement Officer & Evaluation Committee"
              : "Procurement Officer & Evaluation Committee",
          targetRoles:
            decision === "Approved"
              ? [UserRole.DIRECTOR, UserRole.PROCUREMENT_OFFICER, UserRole.EVALUATION_COMMITTEE, UserRole.FINANCE_MANAGER]
              : [UserRole.PROCUREMENT_OFFICER, UserRole.EVALUATION_COMMITTEE],
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.json({ success: true, budgetAllocation: allocationRecord, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/authorize-po -> Director ONLY
  router.post("/api/procurement/requests/:id/authorize-po", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      assertProcurementAuthority(actor.role, "AUTHORIZE_PO", existing);

      const budgetAlloc = existing.budgetAllocationId
        ? await store.getDoc<ProcurementBudgetAllocationRecord>(
            PROCUREMENT_COLLECTIONS.BUDGET_ALLOCATIONS,
            existing.budgetAllocationId,
            ctx
          )
        : null;
      if (!budgetAlloc || budgetAlloc.decision !== "Approved") {
        throw new ProcurementAuthorizationError(
          "missing_director_budget_approval",
          "PO Authorization requires an approved Director budget allocation record.",
          409
        );
      }

      const evaluation = existing.evaluationId
        ? await store.getDoc<any>(PROCUREMENT_COLLECTIONS.EVALUATIONS, existing.evaluationId, ctx)
        : null;
      const quotation = existing.recommendedQuotationId
        ? await store.getDoc<ProcurementQuotationRecord>(
            PROCUREMENT_COLLECTIONS.QUOTATIONS,
            existing.recommendedQuotationId,
            ctx
          )
        : null;

      if (!evaluation || !quotation) {
        throw new ProcurementAuthorizationError(
          "missing_evaluation_record",
          "Contract / PO Authorization requires a verified Evaluation Committee award recommendation and quotation.",
          409
        );
      }

      const nowIso = new Date().toISOString();
      const poId = makeId("PO");
      const poNumber = `PO-${nowIso.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const authorizedAmountEtb =
        Number(req.body?.authorizedAmountEtb) > 0
          ? Number(req.body.authorizedAmountEtb)
          : Math.min(Number(budgetAlloc.allocatedBudgetEtb || quotation.totalAmountEtb), Number(quotation.totalAmountEtb));

      const order: ProcurementOrderRecord = {
        id: poId,
        poNumber,
        requestId,
        requestNumber: existing.requestNumber,
        projectId: existing.projectId,
        projectName: existing.projectName,
        quotationId: quotation.id,
        evaluationId: evaluation.id,
        budgetAllocationId: budgetAlloc.id,
        supplierName: quotation.supplierName,
        supplierContact: quotation.supplierContact,
        authorizedAmountEtb,
        deliveryTerms: String(req.body?.deliveryTerms || quotation.paymentTerms || "As per approved contract").trim(),
        requiredDeliveryDate: existing.requiredDeliveryDate,
        status: "Authorized",
        authorizedByUid: actor.uid,
        authorizedByName: actor.name,
        authorizedByRole: actor.role,
        authorizedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        capturedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        status: "PO Authorized",
        poId,
        poNumber,
        poAuthorizedByUid: actor.uid,
        poAuthorizedByName: actor.name,
        poAuthorizedAt: nowIso,
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.ORDERS, docId: poId, data: order },
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: "PO_AUTHORIZED",
          actor,
          previousStatus: existing.status,
          newStatus: "PO Authorized",
          comments: `Director authorized Contract / Purchase Order ${poNumber} for "${quotation.supplierName}" (ETB ${authorizedAmountEtb.toLocaleString()}).`,
          metadata: { poId, poNumber, budgetAllocationId: budgetAlloc.id, authorizedAmountEtb },
          nowIso,
        }),
        buildNotificationOp({
          title: `Purchase Order ${poNumber} Authorized — Ready for Procurement Execution`,
          titleAm: `የግዢ ትዕዛዝ ${poNumber} ጸድቋል — ለአፈፃፀም ዝግጁ ነው`,
          description: `Director authorized ${poNumber} for ${quotation.supplierName} (ETB ${authorizedAmountEtb.toLocaleString()}). Procurement Execution is now unlocked.`,
          descriptionAm: `ዳይሬክተሩ ${poNumber} ለ ${quotation.supplierName} አጽድቀዋል። ግዢውን መፈጸም ይቻላል።`,
          priority: "High",
          projectName: existing.projectName,
          actor,
          receiverLabel: "Procurement Officer & Warehouse Manager",
          targetRoles: [UserRole.PROCUREMENT_OFFICER, UserRole.WAREHOUSE_MANAGER, UserRole.FINANCE_MANAGER],
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.status(201).json({ success: true, order, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/execute -> Requires PO Authorized + verified Budget Allocation & PO
  router.post("/api/procurement/requests/:id/execute", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      assertProcurementAuthority(actor.role, "EXECUTE_PROCUREMENT", existing);

      const [budgetAllocation, purchaseOrder] = await Promise.all([
        existing.budgetAllocationId
          ? store.getDoc<ProcurementBudgetAllocationRecord>(
              PROCUREMENT_COLLECTIONS.BUDGET_ALLOCATIONS,
              existing.budgetAllocationId,
              ctx
            )
          : Promise.resolve(null),
        existing.poId
          ? store.getDoc<ProcurementOrderRecord>(PROCUREMENT_COLLECTIONS.ORDERS, existing.poId, ctx)
          : Promise.resolve(null),
      ]);

      validateExecutionPrerequisites({ request: existing, budgetAllocation, purchaseOrder });

      const nowIso = new Date().toISOString();
      const executionReference = String(req.body?.executionReference || `EXEC-${nowIso.slice(0, 10)}`).trim();
      const executionNotes = String(req.body?.executionNotes || "Contract/PO executed and dispatched to supplier.").trim();

      const updatedOrder: ProcurementOrderRecord = {
        ...purchaseOrder!,
        status: "Executed",
        executedByUid: actor.uid,
        executedByName: actor.name,
        executedAt: nowIso,
        executionReference,
        executionNotes,
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        status: "Executed",
        executedByUid: actor.uid,
        executedByName: actor.name,
        executedAt: nowIso,
        executionNotes,
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.ORDERS, docId: updatedOrder.id, data: updatedOrder },
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: "PROCUREMENT_EXECUTED",
          actor,
          previousStatus: existing.status,
          newStatus: "Executed",
          comments: `Executed ${updatedOrder.poNumber} (${executionReference}). ${executionNotes}`,
          metadata: { poId: updatedOrder.id, poNumber: updatedOrder.poNumber, executionReference },
          nowIso,
        }),
        buildNotificationOp({
          title: `Procurement Executed for ${existing.requestNumber} (${updatedOrder.poNumber})`,
          titleAm: `የግዢ ትዕዛዝ ${updatedOrder.poNumber} (${existing.requestNumber}) ተፈጽሟል`,
          description: `${actor.name} recorded procurement execution (${executionReference}) for supplier ${updatedOrder.supplierName}.`,
          descriptionAm: `${actor.name} ለ ${updatedOrder.supplierName} የግዢ አፈፃፀም (${executionReference}) መዝግበዋል።`,
          priority: "Medium",
          projectName: existing.projectName,
          actor,
          receiverLabel: "Director & Warehouse Manager",
          targetRoles: [UserRole.DIRECTOR, UserRole.WAREHOUSE_MANAGER, UserRole.FINANCE_MANAGER],
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.json({ success: true, order: updatedOrder, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // POST /api/procurement/requests/:id/reject -> Evaluation Committee (evaluation stages) or Director (approval stages)
  router.post("/api/procurement/requests/:id/reject", ...authGuard, async (req, res) => {
    try {
      const actor = getActor(req);
      const ctx = buildCtx(req, deps.getProjectConfig);
      const requestId = String(req.params.id || "").trim();
      const existing = await store.getDoc<ProcurementRequestRecord>(PROCUREMENT_COLLECTIONS.REQUESTS, requestId, ctx);
      if (!existing) {
        return res.status(404).json({ success: false, error: "not_found", message: "Purchase request not found." });
      }

      assertProcurementAuthority(actor.role, "REJECT_REQUEST", existing);

      const comment = String(req.body?.comment || "").trim();
      if (!comment) {
        throw new ProcurementAuthorizationError(
          "validation_error",
          "A rejection comment is mandatory when rejecting or returning a purchase request.",
          400
        );
      }

      const nowIso = new Date().toISOString();
      const updatedReq: ProcurementRequestRecord = {
        ...existing,
        status: "Rejected",
        lastRejectionReason: comment,
        lastRejectedByName: actor.name,
        lastRejectedByRole: actor.role,
        lastRejectedAt: nowIso,
        rejectionHistory: [
          ...(existing.rejectionHistory || []),
          {
            id: makeId("REJ"),
            stage: existing.status,
            rejectedByUid: actor.uid,
            rejectedByName: actor.name,
            rejectedByRole: actor.role,
            reason: comment,
            rejectedAt: nowIso,
          },
        ],
        updatedAt: nowIso,
        serverReceivedAt: nowIso,
      };

      const ops: StoreWriteOp[] = [
        { collection: PROCUREMENT_COLLECTIONS.REQUESTS, docId: requestId, data: updatedReq },
        buildAuditOp({
          requestId,
          requestNumber: existing.requestNumber,
          action: "REQUEST_REJECTED",
          actor,
          previousStatus: existing.status,
          newStatus: "Rejected",
          comments: comment,
          nowIso,
        }),
        buildNotificationOp({
          title: `Purchase Request ${existing.requestNumber} Rejected — Revision Required`,
          titleAm: `የግዢ ጥያቄ ${existing.requestNumber} ውድቅ ተደርጓል — ማስተካከያ ያስፈልጋል`,
          description: `${actor.name} (${actor.role}) rejected ${existing.requestNumber} at stage "${existing.status}": ${comment}`,
          descriptionAm: `${actor.name} (${actor.role}) የግዢ ጥያቄውን መልሰዋል፡ ${comment}`,
          priority: "Critical",
          projectName: existing.projectName,
          actor,
          receiverLabel: "Procurement Officer",
          targetRoles: [UserRole.PROCUREMENT_OFFICER],
          nowIso,
        }),
      ];

      await store.commitWrites(ops, ctx);
      return res.json({ success: true, request: updatedReq });
    } catch (err) {
      return handleError(res, err);
    }
  });

  // Defensive catch-all for read permission helper check
  router.get("/api/procurement/permissions", ...authGuard, async (req, res) => {
    const actor = getActor(req);
    return res.json({
      success: true,
      actor,
      canRead: canReadProcurementModule(actor.role),
    });
  });

  return { router, store };
}
