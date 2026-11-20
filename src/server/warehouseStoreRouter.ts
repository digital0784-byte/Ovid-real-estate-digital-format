import express, { type NextFunction, type Request, type Response, type Router } from "express";
import {
  CommercialInvoiceRecord,
  CostValuationMethod,
  EngineeringMaterialRequest,
  FixedAssetRecord,
  FixedAssetTransferIn,
  FixedAssetTransferOut,
  GatePassRecord,
  GoodsIssueVoucher,
  GoodsReceivingVoucher,
  InventoryAuditLogRecord,
  InventoryItemRecord,
  InventoryNotificationRecord,
  InventoryValuationSettingsRecord,
  ItemConditionStatus,
  MaterialApprovalRecord,
  MaterialPlanRecord,
  MaterialPlanRevisionRecord,
  MaterialReturnVoucher,
  ProjectStoreRecord,
  StockBalanceRecord,
  StockLedgerEntry,
  TransportationRecord,
  TransportationStatus,
  WarehouseDashboardFilters,
  WarehouseRecord,
  WarehouseReportType,
} from "../types";
import {
  canPerformWarehouseModuleAction,
  canUserAccessProjectRecord,
  isStrictDirectorRole,
  resolveExtendedWarehouseRole,
} from "../services/warehouseStoreRbac";
import {
  ALL_TRANSPORT_STATUSES,
  applyInboundCostLayer,
  applyOutboundStockDeduction,
  applyReturnToBalance,
  buildAndDispatchInventoryNotification,
  compareMaterialRequestAgainstPlan,
  computeStockClosingBalance,
  generateGatePassVerification,
  generatePermanentAssetId,
  generateSequentialCode,
  generateWarehouseReportData,
  round2,
  round4,
  validateCommercialInvoiceForGrv,
  verifyGatePassIntegrity,
} from "../services/warehouseManagementService";
import { decodeFirestoreRestDocument } from "./firestoreUserLookup";

export interface WarehouseBackendMiddlewareDeps {
  verifyAppCheck: (req: Request, res: Response, next: NextFunction) => any;
  requireAuth: (req: Request, res: Response, next: NextFunction) => any;
  requireActiveUser: (req: Request, res: Response, next: NextFunction) => any;
  getProjectConfig: () => { projectId: string; databaseId: string };
  store?: WarehouseBackendStore;
}

export interface WarehouseBackendContext {
  idToken?: string;
  appCheckToken?: string;
  projectId: string;
  databaseId: string;
}

export interface StoreWriteOp {
  collection: string;
  docId: string;
  data: Record<string, any>;
}

export interface WarehouseBackendStore {
  getDoc<T = Record<string, any>>(
    collection: string,
    docId: string,
    ctx: WarehouseBackendContext
  ): Promise<T | null>;
  listCollection<T = Record<string, any>>(
    collection: string,
    ctx: WarehouseBackendContext
  ): Promise<T[]>;
  commitWrites(ops: StoreWriteOp[], ctx: WarehouseBackendContext): Promise<void>;
}

// Encode plain JS object to Firestore REST Value map
function encodeFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val) && Math.abs(val) <= 9007199254740991) {
      return { integerValue: String(val) };
    }
    return { doubleValue: Number.isFinite(val) ? val : 0 };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map((v) => encodeFirestoreRestValue(v)),
      },
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function encodeFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreRestValue(v);
    }
  }
  return fields;
}

export class FirestoreRestWarehouseStore implements WarehouseBackendStore {
  private baseUrl(ctx: WarehouseBackendContext): string {
    const db = ctx.databaseId || "(default)";
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(ctx.projectId)}/databases/${encodeURIComponent(db)}/documents`;
  }

  private headers(ctx: WarehouseBackendContext): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (ctx.idToken) h.Authorization = `Bearer ${ctx.idToken}`;
    if (ctx.appCheckToken) h["X-Firebase-AppCheck"] = ctx.appCheckToken;
    return h;
  }

  async getDoc<T = Record<string, any>>(
    collection: string,
    docId: string,
    ctx: WarehouseBackendContext
  ): Promise<T | null> {
    const url = `${this.baseUrl(ctx)}/${encodeURIComponent(collection)}/${encodeURIComponent(docId)}`;
    const resp = await fetch(url, { method: "GET", headers: this.headers(ctx) });
    if (resp.status === 404) return null;
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Firestore GET ${collection}/${docId} failed (${resp.status}): ${txt}`);
    }
    const json = await resp.json();
    const decoded = decodeFirestoreRestDocument(json);
    return decoded ? ({ id: docId, ...decoded } as T) : null;
  }

  async listCollection<T = Record<string, any>>(
    collection: string,
    ctx: WarehouseBackendContext
  ): Promise<T[]> {
    const docs: T[] = [];
    let pageToken = "";
    do {
      const url = `${this.baseUrl(ctx)}/${encodeURIComponent(collection)}?pageSize=300${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      }`;
      const resp = await fetch(url, { method: "GET", headers: this.headers(ctx) });
      if (resp.status === 404) break;
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Firestore LIST ${collection} failed (${resp.status}): ${txt}`);
      }
      const json = await resp.json();
      const rawDocs = Array.isArray(json.documents) ? json.documents : [];
      for (const d of rawDocs) {
        const nameParts = String(d.name || "").split("/");
        const id = nameParts[nameParts.length - 1] || "";
        const decoded = decodeFirestoreRestDocument(d);
        if (decoded) {
          docs.push({ id, ...decoded } as T);
        }
      }
      pageToken = json.nextPageToken || "";
    } while (pageToken);
    return docs;
  }

  async commitWrites(ops: StoreWriteOp[], ctx: WarehouseBackendContext): Promise<void> {
    if (!ops.length) return;
    const db = ctx.databaseId || "(default)";
    const docRoot = `projects/${ctx.projectId}/databases/${db}/documents`;
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(ctx.projectId)}/databases/${encodeURIComponent(db)}/documents:commit`;

    // Firestore REST commit supports up to 500 writes atomically in a single transaction
    const writes = ops.map((op) => ({
      update: {
        name: `${docRoot}/${op.collection}/${op.docId}`,
        fields: encodeFirestoreFields(op.data),
      },
    }));

    const resp = await fetch(url, {
      method: "POST",
      headers: this.headers(ctx),
      body: JSON.stringify({ writes }),
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Firestore atomic commit failed (${resp.status}): ${txt}`);
    }
  }
}

export class InMemoryWarehouseStore implements WarehouseBackendStore {
  public readonly collections = new Map<string, Map<string, Record<string, any>>>();

  private ensureCol(name: string): Map<string, Record<string, any>> {
    let col = this.collections.get(name);
    if (!col) {
      col = new Map();
      this.collections.set(name, col);
    }
    return col;
  }

  seed(collection: string, records: Record<string, any>[]) {
    const col = this.ensureCol(collection);
    for (const r of records) {
      col.set(r.id, structuredClone(r));
    }
  }

  async getDoc<T = Record<string, any>>(collection: string, docId: string): Promise<T | null> {
    const doc = this.ensureCol(collection).get(docId);
    return doc ? (structuredClone(doc) as T) : null;
  }

  async listCollection<T = Record<string, any>>(collection: string): Promise<T[]> {
    return Array.from(this.ensureCol(collection).values()).map((d) => structuredClone(d) as T);
  }

  async commitWrites(ops: StoreWriteOp[]): Promise<void> {
    // Atomic snapshot-clone commit for tests
    for (const op of ops) {
      const col = this.ensureCol(op.collection);
      col.set(op.docId, structuredClone(op.data));
    }
  }
}

// Process-level mutex queue to prevent concurrent read-modify-write race conditions
class AsyncMutex {
  private chain: Promise<void> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.chain.then(fn, fn);
    this.chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}

function actorFromReq(req: Request) {
  const authUser = (req as any).authUser || {};
  const profile = (req as any).userProfile || {};
  return {
    uid: String(authUser.uid || profile.uid || "SYSTEM"),
    name: String(profile.displayName || profile.name || authUser.email || "ERP User"),
    role: String(profile.role || "Pending"),
    assignedProject: String(profile.assignedProject || ""),
    assignedSite: String(profile.assignedSite || ""),
    assignedWarehouse: String(profile.assignedWarehouse || ""),
  };
}

function makeAuditOp(params: {
  action: string;
  module: InventoryAuditLogRecord["module"];
  entityType: string;
  entityId: string;
  entityNumber?: string;
  previousState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  details: string;
  projectId?: string;
  locationId?: string;
  actor: ReturnType<typeof actorFromReq>;
}): StoreWriteOp {
  const id = `INVAUD-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const entry: InventoryAuditLogRecord = {
    id,
    action: params.action,
    module: params.module,
    entityType: params.entityType,
    entityId: params.entityId,
    entityNumber: params.entityNumber,
    previousState: params.previousState || null,
    newState: params.newState || null,
    details: params.details,
    projectId: params.projectId,
    locationId: params.locationId,
    actorUid: params.actor.uid,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    timestamp: new Date().toISOString(),
  };
  return { collection: "inventoryAuditLogs", docId: id, data: entry };
}

function makeNotifOp(
  params: Parameters<typeof buildAndDispatchInventoryNotification>[0]
): StoreWriteOp {
  const notif = buildAndDispatchInventoryNotification(params);
  return { collection: "inventoryNotifications", docId: notif.id, data: notif };
}

async function getValuationMethod(
  store: WarehouseBackendStore,
  ctx: WarehouseBackendContext
): Promise<CostValuationMethod> {
  const setting = await store.getDoc<InventoryValuationSettingsRecord>(
    "inventorySettings",
    "default",
    ctx
  );
  if (
    setting?.valuationMethod === "FIFO" ||
    setting?.valuationMethod === "Weighted Moving Average"
  ) {
    return setting.valuationMethod;
  }
  return "FIFO";
}

function makeEmptyBalance(params: {
  locationType: "Warehouse" | "ProjectStore";
  locationId: string;
  locationName: string;
  projectId?: string;
  projectName?: string;
  item: {
    itemId: string;
    itemCode: string;
    itemName: string;
    categoryName?: string;
    inventoryType?: "Consumable" | "Fixed Asset";
    unit: string;
    reorderPoint?: number;
    minStockLevel?: number;
  };
  valuationMethod: CostValuationMethod;
}): StockBalanceRecord {
  const now = new Date().toISOString();
  return {
    id: `${params.locationId}__${params.item.itemId}`,
    locationType: params.locationType,
    locationId: params.locationId,
    locationName: params.locationName,
    projectId: params.projectId,
    projectName: params.projectName,
    itemId: params.item.itemId,
    itemCode: params.item.itemCode,
    itemName: params.item.itemName,
    categoryName: params.item.categoryName || "General",
    inventoryType: params.item.inventoryType || "Consumable",
    unit: params.item.unit,
    openingQty: 0,
    receivedQty: 0,
    returnedQty: 0,
    issuedQty: 0,
    transferOutQty: 0,
    transferInQty: 0,
    availableQty: 0,
    reservedQty: 0,
    quarantineQty: 0,
    damagedQty: 0,
    defectiveQty: 0,
    underInspectionQty: 0,
    valuationMethod: params.valuationMethod,
    averageUnitCost: 0,
    totalValuation: 0,
    fifoLayers: [],
    reorderPoint: params.item.reorderPoint ?? 10,
    minStockLevel: params.item.minStockLevel ?? 5,
    lastMovementAt: now,
    updatedAt: now,
  };
}

export function createWarehouseStoreRouter(deps: WarehouseBackendMiddlewareDeps): {
  router: Router;
  store: WarehouseBackendStore;
} {
  const router = express.Router();
  const store: WarehouseBackendStore = deps.store || new FirestoreRestWarehouseStore();
  const mutex = new AsyncMutex();

  const ctxFromReq = (req: Request): WarehouseBackendContext => {
    const cfg = deps.getProjectConfig();
    return {
      idToken: (req as any).rawIdToken,
      appCheckToken: req.header("X-Firebase-AppCheck") || undefined,
      projectId: cfg.projectId,
      databaseId: cfg.databaseId,
    };
  };

  const guard = [deps.verifyAppCheck, deps.requireAuth, deps.requireActiveUser];

  // =========================================================================
  // 1. MATERIAL PLANS — CREATE & REVISE (Office Manager Engineer / Super Admin)
  // =========================================================================
  router.post("/api/warehouse/plans", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_REVISE_MATERIAL_PLAN")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Office Manager Engineer or Super Admin can create material plans.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const { title, projectId, projectName, department, items, submitImmediately = true } = req.body || {};
        if (!title || !projectId || !projectName || !Array.isArray(items) || items.length === 0) {
          throw new Error("400:title, projectId, projectName, and at least one material item are required.");
        }

        const existingPlans = await store.listCollection<MaterialPlanRecord>("materialPlans", ctx);
        const planNumber = generateSequentialCode(
          "MP",
          existingPlans.map((p) => p.planNumber)
        );
        const now = new Date().toISOString();
        const planId = `PLAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const plan: MaterialPlanRecord = {
          id: planId,
          planNumber,
          title: String(title).trim(),
          projectId: String(projectId).trim(),
          projectName: String(projectName).trim(),
          department: department ? String(department).trim() : "Engineering",
          revisionNumber: 1,
          status: submitImmediately ? "Approved" : "Draft",
          items: items.map((i: any) => ({
            itemId: String(i.itemId),
            itemCode: String(i.itemCode),
            itemName: String(i.itemName),
            specification: String(i.specification || ""),
            inventoryType: i.inventoryType === "Fixed Asset" ? "Fixed Asset" : "Consumable",
            unit: String(i.unit),
            plannedQty: Number(i.plannedQty) || 0,
            consumedOrRequestedQty: 0,
            notes: i.notes ? String(i.notes) : "",
          })),
          createdByUid: actor.uid,
          createdByName: actor.name,
          createdByRole: actor.role,
          submittedAt: submitImmediately ? now : undefined,
          approvedAt: submitImmediately ? now : undefined,
          approvedByUid: submitImmediately ? actor.uid : undefined,
          approvedByName: submitImmediately ? actor.name : undefined,
          createdAt: now,
          updatedAt: now,
        };

        const ops: StoreWriteOp[] = [
          { collection: "materialPlans", docId: plan.id, data: plan },
          makeAuditOp({
            action: "MATERIAL_PLAN_CREATED",
            module: "MaterialPlan",
            entityType: "MaterialPlan",
            entityId: plan.id,
            entityNumber: plan.planNumber,
            newState: { planNumber: plan.planNumber, itemCount: plan.items.length, status: plan.status },
            details: `Office Manager Engineer created Material Plan ${plan.planNumber} for ${plan.projectName}.`,
            projectId: plan.projectId,
            actor,
          }),
          makeNotifOp({
            eventType: "MATERIAL_PLAN_SUBMITTED",
            title: `New Material Plan ${plan.planNumber} Submitted`,
            message: `${actor.name} submitted Material Plan ${plan.planNumber} (${plan.items.length} items) for ${plan.projectName}.`,
            severity: "info",
            targetRoles: ["Warehouse Manager", "Store Owner", "Director", "Project Manager", "Super Admin"],
            projectId: plan.projectId,
            projectName: plan.projectName,
            referenceId: plan.id,
            referenceNumber: plan.planNumber,
            actorName: actor.name,
            actorRole: actor.role,
          }),
        ];

        await store.commitWrites(ops, ctx);
        return plan;
      });
      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to create material plan");
      const code = msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "plan_create_failed", message: msg.replace(/^400:/, "") });
    }
  });

  router.post("/api/warehouse/plans/:id/revise", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_REVISE_MATERIAL_PLAN")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Office Manager Engineer or Super Admin can revise material plans.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const plan = await store.getDoc<MaterialPlanRecord>("materialPlans", req.params.id, ctx);
        if (!plan) throw new Error("404:Material Plan not found.");
        const { items, reason, changeSummary } = req.body || {};
        if (!Array.isArray(items) || items.length === 0 || !reason) {
          throw new Error("400:Updated items list and revision reason are required.");
        }

        const now = new Date().toISOString();
        const nextRev = (plan.revisionNumber || 1) + 1;
        const revisionId = `MPREV-${plan.id}-R${nextRev}-${Date.now()}`;
        const revision: MaterialPlanRevisionRecord = {
          id: revisionId,
          planId: plan.id,
          planNumber: plan.planNumber,
          projectId: plan.projectId,
          projectName: plan.projectName,
          revisionNumber: nextRev,
          previousItemsSnapshot: plan.items,
          newItemsSnapshot: items,
          changeSummary: String(changeSummary || `Revision ${nextRev} quantities/items updated.`),
          reason: String(reason),
          revisedByUid: actor.uid,
          revisedByName: actor.name,
          revisedByRole: actor.role,
          revisedAt: now,
        };

        const updatedPlan: MaterialPlanRecord = {
          ...plan,
          revisionNumber: nextRev,
          revisionReason: String(reason),
          items: items.map((i: any) => ({
            itemId: String(i.itemId),
            itemCode: String(i.itemCode),
            itemName: String(i.itemName),
            specification: String(i.specification || ""),
            inventoryType: i.inventoryType === "Fixed Asset" ? "Fixed Asset" : "Consumable",
            unit: String(i.unit),
            plannedQty: Number(i.plannedQty) || 0,
            consumedOrRequestedQty: Number(i.consumedOrRequestedQty || 0),
            notes: i.notes ? String(i.notes) : "",
          })),
          status: "Approved",
          updatedAt: now,
        };

        await store.commitWrites(
          [
            { collection: "materialPlans", docId: updatedPlan.id, data: updatedPlan },
            { collection: "materialPlanRevisions", docId: revision.id, data: revision },
            makeAuditOp({
              action: "MATERIAL_PLAN_REVISED",
              module: "MaterialPlan",
              entityType: "MaterialPlan",
              entityId: updatedPlan.id,
              entityNumber: updatedPlan.planNumber,
              previousState: { revisionNumber: plan.revisionNumber },
              newState: { revisionNumber: nextRev, reason },
              details: `Revised Material Plan ${plan.planNumber} to Rev ${nextRev}: ${reason}`,
              projectId: plan.projectId,
              actor,
            }),
            makeNotifOp({
              eventType: "MATERIAL_PLAN_REVISED",
              title: `Material Plan ${plan.planNumber} Revised (Rev ${nextRev})`,
              message: `${actor.name} revised ${plan.planNumber} for ${plan.projectName}: ${reason}.`,
              severity: "warning",
              targetRoles: ["Warehouse Manager", "Store Owner", "Director", "Project Manager", "Super Admin"],
              projectId: plan.projectId,
              projectName: plan.projectName,
              referenceId: plan.id,
              referenceNumber: plan.planNumber,
              actorName: actor.name,
              actorRole: actor.role,
            }),
          ],
          ctx
        );

        return { plan: updatedPlan, revision };
      });
      return res.json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to revise plan");
      const code = msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "plan_revise_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 2. MATERIAL REQUESTS & AUTO PLAN COMPARISON (Site Store Owner)
  // =========================================================================
  router.post("/api/warehouse/requests", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_MATERIAL_REQUEST")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Site Store Owner or Super Admin can submit material requests.",
      });
    }

    try {
      const created = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const {
          planId,
          projectId,
          projectName,
          projectStoreId,
          projectStoreName,
          warehouseId,
          warehouseName,
          requiredByDate,
          purpose,
          items,
        } = req.body || {};

        if (!planId || !projectId || !projectStoreId || !warehouseId || !Array.isArray(items) || items.length === 0) {
          throw new Error("400:planId, projectId, projectStoreId, warehouseId, and items are required.");
        }

        if (!canUserAccessProjectRecord(actor.role, actor.assignedProject, actor.assignedSite, projectId, projectStoreId)) {
          throw new Error("403:Site Store Owner can only submit requests for their assigned project/store.");
        }

        const plan = await store.getDoc<MaterialPlanRecord>("materialPlans", String(planId), ctx);
        if (!plan) throw new Error("404:Referenced Material Plan does not exist.");

        const [existingReqs, balances] = await Promise.all([
          store.listCollection<EngineeringMaterialRequest>("materialRequests", ctx),
          store.listCollection<StockBalanceRecord>("stockBalances", ctx),
        ]);

        const planRequests = existingReqs.filter((r) => r.planId === plan.id);
        const comparison = compareMaterialRequestAgainstPlan({
          plan,
          requestedItems: items,
          existingRequestsForPlan: planRequests,
          warehouseBalances: balances,
          warehouseId: String(warehouseId),
        });

        const reqNumber = generateSequentialCode(
          "MRQ",
          existingReqs.map((r) => r.requestNumber)
        );
        const now = new Date().toISOString();
        const requestId = `MREQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const lineItems = comparison.comparedItems.map((it) => ({ ...it, requestId }));

        const requestDoc: EngineeringMaterialRequest = {
          id: requestId,
          requestNumber: reqNumber,
          planId: plan.id,
          planNumber: plan.planNumber,
          planRevisionNumber: plan.revisionNumber,
          projectId: String(projectId),
          projectName: String(projectName || plan.projectName),
          projectStoreId: String(projectStoreId),
          projectStoreName: String(projectStoreName || projectStoreId),
          warehouseId: String(warehouseId),
          warehouseName: String(warehouseName || warehouseId),
          requestedDate: now.slice(0, 10),
          requiredByDate: requiredByDate ? String(requiredByDate) : undefined,
          purpose: String(purpose || "Site execution requirement"),
          status: "Submitted",
          hasPlanMismatch: comparison.hasMismatch,
          mismatchSummary: comparison.mismatchSummary || undefined,
          items: lineItems,
          requestedByUid: actor.uid,
          requestedByName: actor.name,
          requestedByRole: actor.role,
          createdAt: now,
          updatedAt: now,
        };

        const ops: StoreWriteOp[] = [
          { collection: "materialRequests", docId: requestDoc.id, data: requestDoc },
          ...lineItems.map((li) => ({
            collection: "materialRequestItems",
            docId: li.id,
            data: li,
          })),
          makeAuditOp({
            action: "MATERIAL_REQUEST_SUBMITTED",
            module: "MaterialRequest",
            entityType: "MaterialRequest",
            entityId: requestDoc.id,
            entityNumber: requestDoc.requestNumber,
            newState: { status: "Submitted", hasPlanMismatch: requestDoc.hasPlanMismatch },
            details: `Submitted request ${reqNumber} linked to plan ${plan.planNumber}.`,
            projectId: requestDoc.projectId,
            locationId: requestDoc.projectStoreId,
            actor,
          }),
          makeNotifOp({
            eventType: "MATERIAL_REQUEST_SUBMITTED",
            title: `Material Request ${reqNumber} Submitted`,
            message: `${actor.name} (${requestDoc.projectStoreName}) requested ${lineItems.length} item(s) against Plan ${plan.planNumber}.${
              requestDoc.hasPlanMismatch ? " Plan mismatch flagged for review." : ""
            }`,
            severity: requestDoc.hasPlanMismatch ? "warning" : "info",
            targetRoles: ["Warehouse Manager", "Office & Technical Engineering", "Super Admin"],
            projectId: requestDoc.projectId,
            projectName: requestDoc.projectName,
            referenceId: requestDoc.id,
            referenceNumber: reqNumber,
            actorName: actor.name,
            actorRole: actor.role,
          }),
        ];

        await store.commitWrites(ops, ctx);
        return requestDoc;
      });
      return res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to create material request");
      const code = msg.startsWith("403:") ? 403 : msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "request_create_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 3. WAREHOUSE MANAGER VERIFY / RETURN REQUEST AGAINST PLAN
  // =========================================================================
  router.post("/api/warehouse/requests/:id/verify", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "VERIFY_RETURN_MATERIAL_REQUEST")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Warehouse Manager or Super Admin can verify/return material requests against engineering plans.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const existingReq = await store.getDoc<EngineeringMaterialRequest>("materialRequests", req.params.id, ctx);
        if (!existingReq) throw new Error("404:Material Request not found.");

        const { action, remarks, reason } = req.body || {};
        if (action !== "verify" && action !== "return") {
          throw new Error("400:action must be 'verify' or 'return'.");
        }

        // Re-verify live against plan & stock before advancing to Director
        const [plan, existingReqs, balances] = await Promise.all([
          store.getDoc<MaterialPlanRecord>("materialPlans", existingReq.planId, ctx),
          store.listCollection<EngineeringMaterialRequest>("materialRequests", ctx),
          store.listCollection<StockBalanceRecord>("stockBalances", ctx),
        ]);
        if (!plan) throw new Error("404:Linked Material Plan not found.");

        const liveCompare = compareMaterialRequestAgainstPlan({
          plan,
          requestedItems: existingReq.items.map((i) => ({
            itemId: i.itemId,
            itemCode: i.itemCode,
            itemName: i.itemName,
            specification: i.specification,
            inventoryType: i.inventoryType,
            unit: i.unit,
            requestedQty: i.requestedQty,
          })),
          existingRequestsForPlan: existingReqs.filter((r) => r.planId === plan.id),
          warehouseBalances: balances,
          warehouseId: existingReq.warehouseId,
          excludeRequestId: existingReq.id,
        });

        if (action === "verify" && liveCompare.hasMismatch) {
          throw new Error(
            `422:Verification blocked due to Plan/Stock Mismatch: ${liveCompare.mismatchSummary}`
          );
        }

        if (action === "return" && !String(reason || remarks || "").trim()) {
          throw new Error("400:A clear return reason is mandatory when returning a request.");
        }

        const now = new Date().toISOString();
        const nextStatus =
          action === "verify" ? "Verified Pending Director" : "Returned by Warehouse Manager";

        const updatedReq: EngineeringMaterialRequest = {
          ...existingReq,
          items: liveCompare.comparedItems.map((ci) => ({ ...ci, requestId: existingReq.id })),
          hasPlanMismatch: liveCompare.hasMismatch,
          mismatchSummary: liveCompare.mismatchSummary || undefined,
          status: nextStatus,
          warehouseVerifiedByUid: actor.uid,
          warehouseVerifiedByName: actor.name,
          warehouseVerifiedAt: now,
          warehouseRemarks: String(remarks || reason || ""),
          returnedReason: action === "return" ? String(reason || remarks || "") : undefined,
          updatedAt: now,
        };

        const approvalId = `APPR-WH-${existingReq.id}-${Date.now()}`;
        const approval: MaterialApprovalRecord = {
          id: approvalId,
          requestId: existingReq.id,
          requestNumber: existingReq.requestNumber,
          planId: existingReq.planId,
          stage: "Warehouse Manager Verification",
          decision: nextStatus,
          decisionByUid: actor.uid,
          decisionByName: actor.name,
          decisionByRole: actor.role,
          comments: String(remarks || reason || ""),
          mismatchDetails: liveCompare.mismatchSummary || undefined,
          isPermanent: false,
          decidedAt: now,
        };

        await store.commitWrites(
          [
            { collection: "materialRequests", docId: updatedReq.id, data: updatedReq },
            { collection: "materialApprovals", docId: approval.id, data: approval },
            makeAuditOp({
              action: action === "verify" ? "WAREHOUSE_VERIFIED_REQUEST" : "WAREHOUSE_RETURNED_REQUEST",
              module: "MaterialRequest",
              entityType: "MaterialRequest",
              entityId: updatedReq.id,
              entityNumber: updatedReq.requestNumber,
              previousState: { status: existingReq.status },
              newState: { status: nextStatus, remarks: approval.comments },
              details: `Warehouse Manager ${action === "verify" ? "verified & submitted to Director" : "returned"} ${updatedReq.requestNumber}.`,
              projectId: updatedReq.projectId,
              actor,
            }),
            makeNotifOp(
              action === "verify"
                ? {
                    eventType: "MATERIAL_REQUEST_VERIFIED",
                    title: `Request ${updatedReq.requestNumber} Verified — Awaiting Director Approval`,
                    message: `${actor.name} verified ${updatedReq.requestNumber} against Plan ${plan.planNumber} and submitted it for Director final decision.`,
                    severity: "info",
                    targetRoles: ["Director", "Directory", "Super Admin"],
                    projectId: updatedReq.projectId,
                    projectName: updatedReq.projectName,
                    referenceId: updatedReq.id,
                    referenceNumber: updatedReq.requestNumber,
                    actorName: actor.name,
                    actorRole: actor.role,
                  }
                : {
                    eventType: "MATERIAL_REQUEST_RETURNED",
                    title: `Request ${updatedReq.requestNumber} Returned by Warehouse Manager`,
                    message: `Returned due to plan/stock discrepancy: ${updatedReq.returnedReason}`,
                    severity: "warning",
                    targetRoles: ["Store Owner", "Office & Technical Engineering", "Office Manager", "Project Manager", "Super Admin"],
                    projectId: updatedReq.projectId,
                    projectName: updatedReq.projectName,
                    referenceId: updatedReq.id,
                    referenceNumber: updatedReq.requestNumber,
                    actorName: actor.name,
                    actorRole: actor.role,
                  }
            ),
          ],
          ctx
        );

        return { request: updatedReq, approval };
      });
      return res.json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Verification failed");
      const code = msg.startsWith("422:") ? 422 : msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "verify_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 4. DIRECTOR FINAL DECISION ONLY (Director / Directory / Super Admin)
  // =========================================================================
  router.post("/api/warehouse/requests/:id/director-decision", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!isStrictDirectorRole(actor.role)) {
      return res.status(403).json({
        success: false,
        error: "forbidden_director_only",
        message: "Access Denied: Only the Director is authorized to give final Approval or Disapproval for material requests.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const existingReq = await store.getDoc<EngineeringMaterialRequest>("materialRequests", req.params.id, ctx);
        if (!existingReq) throw new Error("404:Material Request not found.");

        if (
          existingReq.status === "Director Approved" ||
          existingReq.status === "Director Disapproved" ||
          existingReq.directorDecisionPermanent
        ) {
          throw new Error("409:Director final decision has already been recorded permanently and cannot be altered.");
        }

        if (existingReq.status !== "Verified Pending Director") {
          throw new Error(
            `400:Request must be verified by Warehouse Manager before Director decision (current: ${existingReq.status}).`
          );
        }

        const { decision, comments, reason } = req.body || {};
        if (decision !== "Director Approved" && decision !== "Director Disapproved") {
          throw new Error("400:decision must be 'Director Approved' or 'Director Disapproved'.");
        }
        if (decision === "Director Disapproved" && !String(reason || comments || "").trim()) {
          throw new Error("400:Mandatory reason must be provided when Director Disapproves a request.");
        }

        const now = new Date().toISOString();
        const updatedReq: EngineeringMaterialRequest = {
          ...existingReq,
          status: decision,
          directorDecisionByUid: actor.uid,
          directorDecisionByName: actor.name,
          directorDecisionByRole: actor.role,
          directorDecisionAt: now,
          directorDecisionPermanent: true,
          directorComments: String(comments || ""),
          disapprovalReason: decision === "Director Disapproved" ? String(reason || comments || "") : undefined,
          items: existingReq.items.map((it) => ({
            ...it,
            approvedQty: decision === "Director Approved" ? it.requestedQty : 0,
            remainingDispatchQty: decision === "Director Approved" ? it.requestedQty : 0,
          })),
          updatedAt: now,
        };

        const approval: MaterialApprovalRecord = {
          id: `APPR-DIR-${existingReq.id}-${Date.now()}`,
          requestId: existingReq.id,
          requestNumber: existingReq.requestNumber,
          planId: existingReq.planId,
          stage: "Director Final Decision",
          decision,
          decisionByUid: actor.uid,
          decisionByName: actor.name,
          decisionByRole: actor.role,
          comments: String(comments || reason || ""),
          isPermanent: true,
          decidedAt: now,
        };

        await store.commitWrites(
          [
            { collection: "materialRequests", docId: updatedReq.id, data: updatedReq },
            { collection: "materialApprovals", docId: approval.id, data: approval },
            makeAuditOp({
              action: decision === "Director Approved" ? "DIRECTOR_APPROVED_REQUEST" : "DIRECTOR_DISAPPROVED_REQUEST",
              module: "MaterialRequest",
              entityType: "MaterialRequest",
              entityId: updatedReq.id,
              entityNumber: updatedReq.requestNumber,
              previousState: { status: existingReq.status },
              newState: { status: decision, permanent: true },
              details: `${actor.name} permanently set ${updatedReq.requestNumber} to ${decision}.`,
              projectId: updatedReq.projectId,
              actor,
            }),
            makeNotifOp({
              eventType:
                decision === "Director Approved"
                  ? "MATERIAL_REQUEST_DIRECTOR_APPROVED"
                  : "MATERIAL_REQUEST_DIRECTOR_DISAPPROVED",
              title: `Request ${updatedReq.requestNumber}: ${decision}`,
              message:
                decision === "Director Approved"
                  ? `Director approved ${updatedReq.requestNumber}. Ready for Warehouse Manager dispatch preparation.`
                  : `Director disapproved ${updatedReq.requestNumber}. Reason: ${updatedReq.disapprovalReason}`,
              severity: decision === "Director Approved" ? "success" : "critical",
              targetRoles: ["Warehouse Manager", "Store Owner", "Office & Technical Engineering", "Project Manager", "Super Admin"],
              projectId: updatedReq.projectId,
              projectName: updatedReq.projectName,
              referenceId: updatedReq.id,
              referenceNumber: updatedReq.requestNumber,
              actorName: actor.name,
              actorRole: actor.role,
            }),
          ],
          ctx
        );

        return { request: updatedReq, approval };
      });
      return res.json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Director decision failed");
      const code = msg.startsWith("409:") ? 409 : msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "director_decision_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 5. GRV WITH MANDATORY COMMERCIAL INVOICE & BIG BALANCE ASSET CAPITALIZATION
  // =========================================================================
  router.post("/api/warehouse/grv", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_FINALIZE_GRV")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Warehouse Manager or Super Admin can create and finalize GRVs.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const {
          warehouseId,
          warehouseName,
          supplierId,
          supplierName,
          poNumber,
          procurementId,
          receivedDate,
          remarks,
          commercialInvoice,
          items,
        } = req.body || {};

        if (!warehouseId || !supplierName || !Array.isArray(items) || items.length === 0) {
          throw new Error("400:warehouseId, supplierName, and at least one GRV item are required.");
        }

        const invValidation = validateCommercialInvoiceForGrv({
          invoiceNumber: commercialInvoice?.invoiceNumber,
          invoiceDate: commercialInvoice?.invoiceDate,
          supplierId: supplierId || commercialInvoice?.supplierId || "SUP-DEFAULT",
          supplierName: supplierName || commercialInvoice?.supplierName,
          fileUrl: commercialInvoice?.fileUrl,
          fileName: commercialInvoice?.fileName,
          mimeType: commercialInvoice?.mimeType,
        });
        if (!invValidation.valid) {
          throw new Error(`400:${invValidation.errors.join(" ")}`);
        }

        const valuationMethod = await getValuationMethod(store, ctx);
        const [existingGrvs, existingBalances, existingAssets, catalogItems] = await Promise.all([
          store.listCollection<GoodsReceivingVoucher>("goodsReceivingVouchers", ctx),
          store.listCollection<StockBalanceRecord>("stockBalances", ctx),
          store.listCollection<FixedAssetRecord>("fixedAssets", ctx),
          store.listCollection<InventoryItemRecord>("inventoryItems", ctx),
        ]);

        const grvNumber = generateSequentialCode(
          "GRV",
          existingGrvs.map((g) => g.grvNumber)
        );
        const now = new Date().toISOString();
        const grvId = `GRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const invoiceId = `CINV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const invoiceDoc: CommercialInvoiceRecord = {
          id: invoiceId,
          invoiceNumber: String(commercialInvoice.invoiceNumber).trim(),
          invoiceDate: String(commercialInvoice.invoiceDate).trim(),
          supplierId: String(supplierId || "SUP-1"),
          supplierName: String(supplierName).trim(),
          poNumber: poNumber ? String(poNumber) : undefined,
          grvId,
          grvNumber,
          fileUrl: String(commercialInvoice.fileUrl).trim(),
          fileName: String(commercialInvoice.fileName || "invoice.pdf").trim(),
          mimeType: String(commercialInvoice.mimeType || "application/pdf"),
          fileSizeBytes: Number(commercialInvoice.fileSizeBytes) || 0,
          totalAmount: 0,
          currency: String(commercialInvoice.currency || "ETB"),
          replacementHistory: [],
          uploadedByUid: actor.uid,
          uploadedByName: actor.name,
          uploadedByRole: actor.role,
          createdAt: now,
          updatedAt: now,
        };

        const ops: StoreWriteOp[] = [];
        const createdAssets: FixedAssetRecord[] = [];
        const assetIdsInPool = existingAssets.map((a) => a.assetId);
        let grandTotal = 0;
        const normalizedLines: any[] = [];

        for (let idx = 0; idx < items.length; idx++) {
          const line = items[idx];
          const qty = Number(line.quantityReceived) || 0;
          const unitCost = Number(line.unitCost) || 0;
          if (qty <= 0) throw new Error(`400:Invalid GRV quantity for ${line.itemName || line.itemCode}.`);
          const lineTotal = round2(qty * unitCost);
          grandTotal = round2(grandTotal + lineTotal);

          const catalogMeta = catalogItems.find((c) => c.id === line.itemId || c.itemCode === line.itemCode);
          const inventoryType = line.inventoryType === "Fixed Asset" || catalogMeta?.inventoryType === "Fixed Asset" ? "Fixed Asset" : "Consumable";

          normalizedLines.push({
            itemId: String(line.itemId),
            itemCode: String(line.itemCode),
            itemName: String(line.itemName),
            inventoryType,
            unit: String(line.unit || catalogMeta?.unit || "pcs"),
            quantityReceived: qty,
            unitCost,
            totalCost: lineTotal,
            batchNumber: line.batchNumber ? String(line.batchNumber) : undefined,
            expiryDate: line.expiryDate ? String(line.expiryDate) : undefined,
            serialNumbers: Array.isArray(line.serialNumbers) ? line.serialNumbers : undefined,
            condition: (line.condition as ItemConditionStatus) || "Good",
          });

          // Update Stock Balance atomically
          const balanceKey = `${warehouseId}__${line.itemId}`;
          const existingBal =
            existingBalances.find((b) => b.id === balanceKey || (b.locationId === warehouseId && b.itemId === line.itemId)) ||
            makeEmptyBalance({
              locationType: "Warehouse",
              locationId: String(warehouseId),
              locationName: String(warehouseName || warehouseId),
              item: {
                itemId: String(line.itemId),
                itemCode: String(line.itemCode),
                itemName: String(line.itemName),
                categoryName: catalogMeta?.categoryName || line.categoryName || "General",
                inventoryType,
                unit: String(line.unit || catalogMeta?.unit || "pcs"),
                reorderPoint: catalogMeta?.reorderPoint ?? 10,
                minStockLevel: catalogMeta?.minStockLevel ?? 5,
              },
              valuationMethod,
            });

          const updatedBal = applyInboundCostLayer({
            balance: existingBal,
            qtyIn: qty,
            unitCost,
            grvId,
            grvNumber,
            receivedDate: String(receivedDate || now.slice(0, 10)),
            valuationMethod,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
          });
          const exIdx = existingBalances.findIndex((b) => b.id === updatedBal.id);
          if (exIdx >= 0) existingBalances[exIdx] = updatedBal;
          else existingBalances.push(updatedBal);
          ops.push({ collection: "stockBalances", docId: updatedBal.id, data: updatedBal });

          // Immutable stock ledger entry
          const ledgerId = `LEDGER-GRV-${grvNumber}-${idx}-${Date.now()}`;
          const ledgerEntry: StockLedgerEntry = {
            id: ledgerId,
            voucherType: "GRV",
            voucherId: grvId,
            voucherNo: grvNumber,
            originalGrvNumber: grvNumber,
            locationType: "Warehouse",
            locationId: String(warehouseId),
            locationName: String(warehouseName || warehouseId),
            itemId: String(line.itemId),
            itemCode: String(line.itemCode),
            itemName: String(line.itemName),
            inventoryType,
            unit: updatedBal.unit,
            direction: "IN",
            quantity: qty,
            quantityDelta: qty,
            quarantineDelta: 0,
            unitCost,
            totalCost: lineTotal,
            valuationMethodUsed: valuationMethod,
            openingBefore: existingBal.availableQty,
            balanceAfter: updatedBal.availableQty,
            quarantineAfter: updatedBal.quarantineQty,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
            condition: "Good",
            notes: `Commercial Invoice: ${invoiceDoc.invoiceNumber}`,
            createdByUid: actor.uid,
            createdByName: actor.name,
            createdByRole: actor.role,
            createdAt: now,
          };
          ops.push({ collection: "stockLedger", docId: ledgerId, data: ledgerEntry });

          // Capitalize Fixed Assets into BIG BALANCE register preserving permanent Asset ID + Original GRV No
          if (inventoryType === "Fixed Asset") {
            const countUnits = Math.max(1, Math.round(qty));
            for (let unitIdx = 0; unitIdx < countUnits; unitIdx++) {
              const assetId = generatePermanentAssetId(assetIdsInPool);
              assetIdsInPool.push(assetId);
              const assetDocId = `FA-${assetId}`;
              const serial =
                Array.isArray(line.serialNumbers) && line.serialNumbers[unitIdx]
                  ? String(line.serialNumbers[unitIdx])
                  : `SN-${grvNumber}-${idx + 1}-${unitIdx + 1}`;
              const assetDoc: FixedAssetRecord = {
                id: assetDocId,
                assetId,
                itemId: String(line.itemId),
                itemCode: String(line.itemCode),
                assetName: String(line.itemName),
                description: catalogMeta?.specification || String(line.itemName),
                categoryName: catalogMeta?.categoryName || "Fixed Asset",
                serialNumber: serial,
                originalGrvId: grvId,
                originalGrvNumber: grvNumber,
                commercialInvoiceId: invoiceId,
                commercialInvoiceNo: invoiceDoc.invoiceNumber,
                purchaseDate: String(receivedDate || now.slice(0, 10)),
                purchaseCost: unitCost,
                currentLocationType: "Warehouse",
                currentLocationId: String(warehouseId),
                currentLocationName: String(warehouseName || warehouseId),
                previousLocationName: "Supplier Purchase",
                issuerName: String(supplierName),
                receiverName: actor.name,
                condition: "Good",
                status: "In Warehouse",
                transferHistory: [
                  {
                    id: `FAHIST-${Date.now()}-${unitIdx}`,
                    date: String(receivedDate || now.slice(0, 10)),
                    voucherType: "GRV",
                    voucherNumber: grvNumber,
                    fromLocation: String(supplierName),
                    toLocation: String(warehouseName || warehouseId),
                    issuerName: String(supplierName),
                    receiverName: actor.name,
                    condition: "Good",
                    notes: `Capitalized via Commercial Invoice ${invoiceDoc.invoiceNumber}`,
                  },
                ],
                createdAt: now,
                updatedAt: now,
              };
              createdAssets.push(assetDoc);
              ops.push({ collection: "fixedAssets", docId: assetDoc.id, data: assetDoc });
            }
          }
        }

        invoiceDoc.totalAmount = grandTotal;
        const grvDoc: GoodsReceivingVoucher = {
          id: grvId,
          grvNumber,
          poNumber: poNumber ? String(poNumber) : undefined,
          procurementId: procurementId ? String(procurementId) : undefined,
          supplierId: invoiceDoc.supplierId,
          supplierName: invoiceDoc.supplierName,
          warehouseId: String(warehouseId),
          warehouseName: String(warehouseName || warehouseId),
          receivedDate: String(receivedDate || now.slice(0, 10)),
          commercialInvoiceId: invoiceDoc.id,
          commercialInvoiceNo: invoiceDoc.invoiceNumber,
          commercialInvoiceDate: invoiceDoc.invoiceDate,
          commercialInvoiceUrl: invoiceDoc.fileUrl,
          commercialInvoiceFileName: invoiceDoc.fileName,
          commercialInvoiceMimeType: invoiceDoc.mimeType,
          status: "Completed",
          items: normalizedLines,
          totalAmount: grandTotal,
          remarks: remarks ? String(remarks) : undefined,
          receivedByUid: actor.uid,
          receivedByName: actor.name,
          receivedByRole: actor.role,
          createdAt: now,
          updatedAt: now,
        };

        ops.unshift(
          { collection: "commercialInvoices", docId: invoiceDoc.id, data: invoiceDoc },
          { collection: "goodsReceivingVouchers", docId: grvDoc.id, data: grvDoc }
        );
        ops.push(
          makeAuditOp({
            action: "GRV_FINALIZED_WITH_COMMERCIAL_INVOICE",
            module: "GRV",
            entityType: "GoodsReceivingVoucher",
            entityId: grvDoc.id,
            entityNumber: grvDoc.grvNumber,
            newState: {
              grvNumber: grvDoc.grvNumber,
              commercialInvoiceNo: invoiceDoc.invoiceNumber,
              totalAmount: grandTotal,
              capitalizedAssetsCount: createdAssets.length,
            },
            details: `Completed ${grvNumber} with Commercial Invoice ${invoiceDoc.invoiceNumber} (${grandTotal} ETB).`,
            locationId: grvDoc.warehouseId,
            actor,
          }),
          makeNotifOp({
            eventType: "GRV_COMPLETED",
            title: `GRV ${grvNumber} Completed & Stocked`,
            message: `Received ${normalizedLines.length} item line(s) into ${grvDoc.warehouseName}. Invoice: ${invoiceDoc.invoiceNumber}. Total: ETB ${grandTotal.toLocaleString()}.`,
            severity: "success",
            targetRoles: ["Finance Manager", "Director", "Operation Manager", "Warehouse Manager", "Super Admin"],
            locationId: grvDoc.warehouseId,
            referenceId: grvDoc.id,
            referenceNumber: grvNumber,
            actorName: actor.name,
            actorRole: actor.role,
          })
        );

        await store.commitWrites(ops, ctx);
        return { grv: grvDoc, commercialInvoice: invoiceDoc, fixedAssetsCreated: createdAssets };
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to finalize GRV");
      const code = msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "grv_failed", message: msg.replace(/^400:/, "") });
    }
  });

  // Replace Commercial Invoice with full audit log
  router.post("/api/warehouse/invoices/:id/replace", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "REPLACE_COMMERCIAL_INVOICE")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Warehouse Manager or Super Admin can replace commercial invoice attachments.",
      });
    }

    try {
      const updated = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const existing = await store.getDoc<CommercialInvoiceRecord>("commercialInvoices", req.params.id, ctx);
        if (!existing) throw new Error("404:Commercial Invoice not found.");

        const { newInvoiceNumber, newFileUrl, newFileName, newMimeType, reason } = req.body || {};
        if (!newFileUrl || !newFileName || !reason) {
          throw new Error("400:newFileUrl, newFileName, and replacement reason are required.");
        }

        const now = new Date().toISOString();
        const historyEntry = {
          id: `INVREP-${Date.now()}`,
          previousInvoiceNumber: existing.invoiceNumber,
          previousFileName: existing.fileName,
          previousFileUrl: existing.fileUrl,
          newInvoiceNumber: String(newInvoiceNumber || existing.invoiceNumber),
          newFileName: String(newFileName),
          newFileUrl: String(newFileUrl),
          reason: String(reason),
          replacedByUid: actor.uid,
          replacedByName: actor.name,
          replacedByRole: actor.role,
          replacedAt: now,
        };

        const updatedInv: CommercialInvoiceRecord = {
          ...existing,
          invoiceNumber: historyEntry.newInvoiceNumber,
          fileUrl: historyEntry.newFileUrl,
          fileName: historyEntry.newFileName,
          mimeType: String(newMimeType || existing.mimeType),
          replacementHistory: [...(existing.replacementHistory || []), historyEntry],
          updatedAt: now,
        };

        const ops: StoreWriteOp[] = [
          { collection: "commercialInvoices", docId: updatedInv.id, data: updatedInv },
          makeAuditOp({
            action: "COMMERCIAL_INVOICE_REPLACED",
            module: "CommercialInvoice",
            entityType: "CommercialInvoice",
            entityId: updatedInv.id,
            entityNumber: updatedInv.invoiceNumber,
            previousState: { fileName: existing.fileName, invoiceNumber: existing.invoiceNumber },
            newState: { fileName: updatedInv.fileName, invoiceNumber: updatedInv.invoiceNumber, reason },
            details: `Replaced Commercial Invoice attachment (${existing.fileName} -> ${updatedInv.fileName}): ${reason}`,
            actor,
          }),
          makeNotifOp({
            eventType: "COMMERCIAL_INVOICE_REPLACED",
            title: `Commercial Invoice ${updatedInv.invoiceNumber} Replaced`,
            message: `${actor.name} replaced commercial invoice document for GRV ${updatedInv.grvNumber || "-"}. Reason: ${reason}`,
            severity: "warning",
            targetRoles: ["Finance Manager", "Director", "Auditor", "Super Admin"],
            referenceId: updatedInv.id,
            referenceNumber: updatedInv.invoiceNumber,
            actorName: actor.name,
            actorRole: actor.role,
          }),
        ];

        await store.commitWrites(ops, ctx);
        return updatedInv;
      });
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to replace commercial invoice");
      const code = msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "invoice_replace_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 6. DISPATCH CONFIRMATION (CONSUMABLES GIV PARTIAL/FULL OR FIXED ASSET FATOV)
  // Usable warehouse stock decreases ONLY on dispatch confirmation!
  // Generates Transportation Record & Mandatory QR Gate Pass atomically.
  // =========================================================================
  router.post("/api/warehouse/dispatch", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    const { dispatchType } = req.body || {};

    if (
      dispatchType === "FATOV"
        ? !canPerformWarehouseModuleAction(actor.role, "CREATE_FATOV")
        : !canPerformWarehouseModuleAction(actor.role, "PREPARE_CONFIRM_DISPATCH_GIV")
    ) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "You are not authorized to execute this dispatch operation.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const now = new Date().toISOString();
        const valuationMethod = await getValuationMethod(store, ctx);

        if (dispatchType === "FATOV") {
          const {
            assetDocId,
            toLocationType,
            toLocationId,
            toLocationName,
            projectId,
            projectName,
            requestId,
            requestNumber,
            vehicleNumber,
            driverName,
            driverPhone,
            conditionSent,
          } = req.body || {};

          if (!assetDocId || !toLocationId || !vehicleNumber || !driverName) {
            throw new Error("400:assetDocId, toLocationId, vehicleNumber, and driverName are required for FATOV.");
          }

          const asset = await store.getDoc<FixedAssetRecord>("fixedAssets", String(assetDocId), ctx);
          if (!asset) throw new Error("404:Fixed Asset record not found.");
          if (asset.status === "In Transit") {
            throw new Error("409:Fixed Asset is already In Transit under an active transfer.");
          }

          if (requestId) {
            const linkedReq = await store.getDoc<EngineeringMaterialRequest>("materialRequests", String(requestId), ctx);
            if (!linkedReq || (linkedReq.status !== "Director Approved" && linkedReq.status !== "Partially Dispatched")) {
              throw new Error("403:Dispatch requires an approved Material Request with permanent Director Approval.");
            }
          }

          const [existingFatovs, existingTransports, existingGps] = await Promise.all([
            store.listCollection<FixedAssetTransferOut>("fixedAssetTransfersOut", ctx),
            store.listCollection<TransportationRecord>("transportationRecords", ctx),
            store.listCollection<GatePassRecord>("gatePasses", ctx),
          ]);

          const fatovNumber = generateSequentialCode("FATOV", existingFatovs.map((f) => f.fatovNumber));
          const transportNumber = generateSequentialCode("TRN", existingTransports.map((t) => t.transportNumber));
          const gatePassNumber = generateSequentialCode("GP", existingGps.map((g) => g.gatePassNumber));

          const fatovId = `FATOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const transportId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const gatePassId = `GP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const itemsSummary = `Fixed Asset ${asset.assetId} - ${asset.assetName} (SN: ${asset.serialNumber}, Orig GRV: ${asset.originalGrvNumber})`;
          const qr = await generateGatePassVerification({
            gatePassNumber,
            voucherType: "FATOV",
            voucherId: fatovId,
            vehicleNumber: String(vehicleNumber),
            itemsSummary,
          });

          const fatovDoc: FixedAssetTransferOut = {
            id: fatovId,
            fatovNumber,
            assetDocId: asset.id,
            assetId: asset.assetId,
            assetName: asset.assetName,
            itemCode: asset.itemCode,
            serialNumber: asset.serialNumber,
            originalGrvId: asset.originalGrvId,
            originalGrvNumber: asset.originalGrvNumber,
            requestId: requestId ? String(requestId) : undefined,
            requestNumber: requestNumber ? String(requestNumber) : undefined,
            fromLocationType: asset.currentLocationType,
            fromLocationId: asset.currentLocationId,
            fromLocationName: asset.currentLocationName,
            toLocationType: toLocationType === "Warehouse" ? "Warehouse" : "ProjectStore",
            toLocationId: String(toLocationId),
            toLocationName: String(toLocationName || toLocationId),
            projectId: projectId ? String(projectId) : undefined,
            projectName: projectName ? String(projectName) : undefined,
            quantitySent: 1,
            conditionSent: (conditionSent as ItemConditionStatus) || asset.condition || "Good",
            vehicleNumber: String(vehicleNumber),
            driverName: String(driverName),
            status: "Dispatched",
            gatePassId,
            gatePassNumber,
            transportId,
            transportNumber,
            issuedByUid: actor.uid,
            issuedByName: actor.name,
            dispatchedAt: now,
            createdAt: now,
            updatedAt: now,
          };

          // Asset stays at source location until FATIV receiving confirmation; status marks In Transit!
          const updatedAsset: FixedAssetRecord = {
            ...asset,
            status: "In Transit",
            issuerName: actor.name,
            updatedAt: now,
          };

          const transportDoc: TransportationRecord = {
            id: transportId,
            transportNumber,
            direction: asset.currentLocationType === "Warehouse" ? "WarehouseToProject" : "ProjectToWarehouse",
            referenceType: "FATOV",
            referenceId: fatovId,
            referenceNumber: fatovNumber,
            originalGrvNumber: asset.originalGrvNumber,
            originLocationId: asset.currentLocationId,
            originLocationName: asset.currentLocationName,
            destinationLocationId: fatovDoc.toLocationId,
            destinationLocationName: fatovDoc.toLocationName,
            projectId: fatovDoc.projectId,
            projectName: fatovDoc.projectName,
            vehicleNumber: String(vehicleNumber),
            driverName: String(driverName),
            driverPhone: driverPhone ? String(driverPhone) : undefined,
            itemsSummary,
            status: "Dispatched",
            statusHistory: [
              { status: "Pending Preparation", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
              { status: "Approved for Dispatch", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
              { status: "Ready for Dispatch", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
              { status: "Dispatched", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, notes: `FATOV ${fatovNumber} dispatched` },
            ],
            dispatchedAt: now,
            createdAt: now,
            updatedAt: now,
          };

          const gatePassDoc: GatePassRecord = {
            id: gatePassId,
            gatePassNumber,
            voucherType: "FATOV",
            voucherId: fatovId,
            voucherNumber: fatovNumber,
            originalGrvNumber: asset.originalGrvNumber,
            originLocationId: asset.currentLocationId,
            originLocationName: asset.currentLocationName,
            destinationLocationId: fatovDoc.toLocationId,
            destinationLocationName: fatovDoc.toLocationName,
            projectId: fatovDoc.projectId,
            projectName: fatovDoc.projectName,
            vehicleNumber: String(vehicleNumber),
            driverName: String(driverName),
            itemsSummary,
            totalQuantity: 1,
            qrVerificationCode: qr.qrVerificationCode,
            verificationHash: qr.verificationHash,
            status: "Issued",
            issuedByUid: actor.uid,
            issuedByName: actor.name,
            issuedByRole: actor.role,
            issuedAt: now,
            lockedForEdit: true,
            createdAt: now,
            updatedAt: now,
          };

          await store.commitWrites(
            [
              { collection: "fixedAssetTransfersOut", docId: fatovDoc.id, data: fatovDoc },
              { collection: "fixedAssets", docId: updatedAsset.id, data: updatedAsset },
              { collection: "transportationRecords", docId: transportDoc.id, data: transportDoc },
              { collection: "gatePasses", docId: gatePassDoc.id, data: gatePassDoc },
              makeAuditOp({
                action: "FATOV_DISPATCHED_WITH_GATE_PASS",
                module: "FATOV",
                entityType: "FixedAssetTransferOut",
                entityId: fatovDoc.id,
                entityNumber: fatovNumber,
                newState: { assetId: asset.assetId, originalGrv: asset.originalGrvNumber, to: fatovDoc.toLocationName },
                details: `Dispatched Fixed Asset ${asset.assetId} via ${fatovNumber} (Orig GRV ${asset.originalGrvNumber}). Gate Pass ${gatePassNumber}.`,
                projectId: fatovDoc.projectId,
                actor,
              }),
              makeNotifOp({
                eventType: "GATE_PASS_GENERATED",
                title: `Asset FATOV ${fatovNumber} Dispatched (Gate Pass ${gatePassNumber})`,
                message: `${asset.assetId} (${asset.assetName}) dispatched from ${fatovDoc.fromLocationName} to ${fatovDoc.toLocationName}. Vehicle: ${vehicleNumber}.`,
                severity: "info",
                targetRoles: ["Gate Security Officer", "Store Owner", "Material Handling", "Operation Manager", "Project Manager", "Super Admin"],
                projectId: fatovDoc.projectId,
                projectName: fatovDoc.projectName,
                referenceId: gatePassDoc.id,
                referenceNumber: gatePassNumber,
                actorName: actor.name,
                actorRole: actor.role,
              }),
            ],
            ctx
          );

          return { fatov: fatovDoc, asset: updatedAsset, transport: transportDoc, gatePass: gatePassDoc };
        }

        // CONSUMABLE GIV DISPATCH FROM DIRECTOR-APPROVED REQUEST
        const { requestId, vehicleNumber, driverName, driverPhone, dispatchItems } = req.body || {};
        if (!requestId || !vehicleNumber || !driverName || !Array.isArray(dispatchItems) || dispatchItems.length === 0) {
          throw new Error("400:requestId, vehicleNumber, driverName, and dispatchItems are required for GIV.");
        }

        const matReq = await store.getDoc<EngineeringMaterialRequest>("materialRequests", String(requestId), ctx);
        if (!matReq) throw new Error("404:Material Request not found.");
        if (matReq.status !== "Director Approved" && matReq.status !== "Partially Dispatched") {
          throw new Error(
            `403:Dispatch blocked! Request ${matReq.requestNumber} must be Director Approved before GIV dispatch (current: ${matReq.status}).`
          );
        }

        const [balances, existingGivs, existingTransports, existingGps, approvals] = await Promise.all([
          store.listCollection<StockBalanceRecord>("stockBalances", ctx),
          store.listCollection<GoodsIssueVoucher>("goodsIssueVouchers", ctx),
          store.listCollection<TransportationRecord>("transportationRecords", ctx),
          store.listCollection<GatePassRecord>("gatePasses", ctx),
          store.listCollection<MaterialApprovalRecord>("materialApprovals", ctx),
        ]);

        const directorApproval = approvals.find(
          (a) => a.requestId === matReq.id && a.decision === "Director Approved"
        );
        const directorApprovalId = directorApproval?.id || `DIR-APPR-${matReq.id}`;

        const givNumber = generateSequentialCode("GIV", existingGivs.map((g) => g.givNumber));
        const transportNumber = generateSequentialCode("TRN", existingTransports.map((t) => t.transportNumber));
        const gatePassNumber = generateSequentialCode("GP", existingGps.map((g) => g.gatePassNumber));
        const givId = `GIV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const transportId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const gatePassId = `GP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const ops: StoreWriteOp[] = [];
        const givLines: any[] = [];
        let totalCost = 0;
        let totalQtyDispatched = 0;
        const updatedReqItems = matReq.items.map((ri) => ({ ...ri }));

        for (let idx = 0; idx < dispatchItems.length; idx++) {
          const di = dispatchItems[idx];
          const dispatchQty = Number(di.dispatchQty) || 0;
          if (dispatchQty <= 0) continue;

          const reqLine = updatedReqItems.find((ri) => ri.itemId === di.itemId || ri.itemCode === di.itemCode);
          if (!reqLine) throw new Error(`400:Item ${di.itemId} is not part of request ${matReq.requestNumber}.`);
          if (dispatchQty > reqLine.remainingDispatchQty + 1e-6) {
            throw new Error(
              `422:Over-issue blocked for ${reqLine.itemName}: attempting ${dispatchQty}, remaining approved ${reqLine.remainingDispatchQty}.`
            );
          }

          const whBal = balances.find(
            (b) => b.locationType === "Warehouse" && b.locationId === matReq.warehouseId && b.itemId === reqLine.itemId
          );
          if (!whBal) {
            throw new Error(`422:No stock balance record found in ${matReq.warehouseName} for ${reqLine.itemName}.`);
          }

          const deduction = applyOutboundStockDeduction({
            balance: whBal,
            qtyOut: dispatchQty,
            mode: "ISSUE",
            valuationMethod,
          });

          // Replace in balances array in case of multiple refs
          const balIndex = balances.findIndex((b) => b.id === whBal.id);
          if (balIndex >= 0) balances[balIndex] = deduction.updatedBalance;

          ops.push({ collection: "stockBalances", docId: deduction.updatedBalance.id, data: deduction.updatedBalance });

          const prevDisp = reqLine.dispatchedQty;
          reqLine.dispatchedQty = round4(prevDisp + dispatchQty);
          reqLine.remainingDispatchQty = Math.max(0, round4(reqLine.approvedQty - reqLine.dispatchedQty));

          totalCost = round2(totalCost + deduction.totalCost);
          totalQtyDispatched = round2(totalQtyDispatched + dispatchQty);

          const ledgerId = `LEDGER-GIV-${givNumber}-${idx}-${Date.now()}`;
          const ledgerEntry: StockLedgerEntry = {
            id: ledgerId,
            voucherType: "GIV",
            voucherId: givId,
            voucherNo: givNumber,
            referenceRequestId: matReq.id,
            locationType: "Warehouse",
            locationId: matReq.warehouseId,
            locationName: matReq.warehouseName,
            projectId: matReq.projectId,
            projectName: matReq.projectName,
            itemId: reqLine.itemId,
            itemCode: reqLine.itemCode,
            itemName: reqLine.itemName,
            inventoryType: reqLine.inventoryType,
            unit: reqLine.unit,
            direction: "OUT",
            quantity: dispatchQty,
            quantityDelta: -dispatchQty,
            quarantineDelta: 0,
            unitCost: deduction.unitCostUsed,
            totalCost: deduction.totalCost,
            valuationMethodUsed: valuationMethod,
            openingBefore: whBal.availableQty,
            balanceAfter: deduction.updatedBalance.availableQty,
            quarantineAfter: deduction.updatedBalance.quarantineQty,
            createdByUid: actor.uid,
            createdByName: actor.name,
            createdByRole: actor.role,
            createdAt: now,
          };
          ops.push({ collection: "stockLedger", docId: ledgerId, data: ledgerEntry });

          if (deduction.updatedBalance.availableQty <= (deduction.updatedBalance.reorderPoint || 0)) {
            ops.push(
              makeNotifOp({
                eventType: "LOW_STOCK_ALERT",
                title: `Low Stock Alert: ${reqLine.itemName}`,
                message: `Warehouse balance dropped to ${deduction.updatedBalance.availableQty} ${reqLine.unit} (Reorder point: ${deduction.updatedBalance.reorderPoint}).`,
                severity: "warning",
                targetRoles: ["Warehouse Manager", "Operation Manager", "Finance Manager", "Super Admin"],
                locationId: matReq.warehouseId,
                referenceId: reqLine.itemId,
                referenceNumber: reqLine.itemCode,
                actorName: actor.name,
                actorRole: actor.role,
              })
            );
          }

          givLines.push({
            itemId: reqLine.itemId,
            itemCode: reqLine.itemCode,
            itemName: reqLine.itemName,
            unit: reqLine.unit,
            approvedQty: reqLine.approvedQty,
            previouslyDispatchedQty: prevDisp,
            dispatchedQty: dispatchQty,
            remainingPendingQty: reqLine.remainingDispatchQty,
            unitCost: deduction.unitCostUsed,
            totalCost: deduction.totalCost,
          });
        }

        if (givLines.length === 0) {
          throw new Error("400:At least one item with dispatchQty > 0 is required.");
        }

        const allFullyDispatched = updatedReqItems.every((ri) => ri.remainingDispatchQty <= 1e-6);
        const updatedReq: EngineeringMaterialRequest = {
          ...matReq,
          items: updatedReqItems,
          status: allFullyDispatched ? "Fully Dispatched" : "Partially Dispatched",
          updatedAt: now,
        };

        const itemsSummary = givLines
          .map((l) => `${l.itemCode} ${l.itemName} (${l.dispatchedQty} ${l.unit})`)
          .join(", ");
        const qr = await generateGatePassVerification({
          gatePassNumber,
          voucherType: "GIV",
          voucherId: givId,
          vehicleNumber: String(vehicleNumber),
          itemsSummary,
        });

        const givDoc: GoodsIssueVoucher = {
          id: givId,
          givNumber,
          requestId: matReq.id,
          requestNumber: matReq.requestNumber,
          directorApprovalId,
          warehouseId: matReq.warehouseId,
          warehouseName: matReq.warehouseName,
          projectId: matReq.projectId,
          projectName: matReq.projectName,
          projectStoreId: matReq.projectStoreId,
          projectStoreName: matReq.projectStoreName,
          vehicleNumber: String(vehicleNumber),
          driverName: String(driverName),
          driverPhone: driverPhone ? String(driverPhone) : undefined,
          status: "Dispatched",
          items: givLines,
          totalCost,
          gatePassId,
          gatePassNumber,
          transportId,
          transportNumber,
          issuedByUid: actor.uid,
          issuedByName: actor.name,
          dispatchedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        const transportDoc: TransportationRecord = {
          id: transportId,
          transportNumber,
          direction: "WarehouseToProject",
          referenceType: "GIV",
          referenceId: givId,
          referenceNumber: givNumber,
          originLocationId: matReq.warehouseId,
          originLocationName: matReq.warehouseName,
          destinationLocationId: matReq.projectStoreId,
          destinationLocationName: matReq.projectStoreName,
          projectId: matReq.projectId,
          projectName: matReq.projectName,
          vehicleNumber: String(vehicleNumber),
          driverName: String(driverName),
          driverPhone: driverPhone ? String(driverPhone) : undefined,
          itemsSummary,
          status: "Dispatched",
          statusHistory: [
            { status: "Pending Preparation", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
            { status: "Approved for Dispatch", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
            { status: "Ready for Dispatch", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
            { status: "Dispatched", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, notes: `GIV ${givNumber} dispatched` },
          ],
          dispatchedAt: now,
          createdAt: now,
          updatedAt: now,
        };

        const gatePassDoc: GatePassRecord = {
          id: gatePassId,
          gatePassNumber,
          voucherType: "GIV",
          voucherId: givId,
          voucherNumber: givNumber,
          originLocationId: matReq.warehouseId,
          originLocationName: matReq.warehouseName,
          destinationLocationId: matReq.projectStoreId,
          destinationLocationName: matReq.projectStoreName,
          projectId: matReq.projectId,
          projectName: matReq.projectName,
          vehicleNumber: String(vehicleNumber),
          driverName: String(driverName),
          itemsSummary,
          totalQuantity: totalQtyDispatched,
          qrVerificationCode: qr.qrVerificationCode,
          verificationHash: qr.verificationHash,
          status: "Issued",
          issuedByUid: actor.uid,
          issuedByName: actor.name,
          issuedByRole: actor.role,
          issuedAt: now,
          lockedForEdit: true,
          createdAt: now,
          updatedAt: now,
        };

        ops.push(
          { collection: "materialRequests", docId: updatedReq.id, data: updatedReq },
          { collection: "goodsIssueVouchers", docId: givDoc.id, data: givDoc },
          { collection: "transportationRecords", docId: transportDoc.id, data: transportDoc },
          { collection: "gatePasses", docId: gatePassDoc.id, data: gatePassDoc },
          makeAuditOp({
            action: allFullyDispatched ? "GIV_FULL_DISPATCH" : "GIV_PARTIAL_DISPATCH",
            module: "GIVDispatch",
            entityType: "GoodsIssueVoucher",
            entityId: givDoc.id,
            entityNumber: givNumber,
            newState: { requestStatus: updatedReq.status, totalQtyDispatched, totalCost, gatePassNumber },
            details: `${givNumber} dispatched from ${matReq.warehouseName} to ${matReq.projectStoreName}. Request ${updatedReq.status}.`,
            projectId: matReq.projectId,
            actor,
          }),
          makeNotifOp({
            eventType: allFullyDispatched ? "FULL_DISPATCH_PERFORMED" : "PARTIAL_DISPATCH_PERFORMED",
            title: `${givNumber} Dispatched (${updatedReq.status})`,
            message: `${givLines.length} line(s) dispatched to ${matReq.projectStoreName}. Gate Pass: ${gatePassNumber}.`,
            severity: "info",
            targetRoles: ["Store Owner", "Gate Security Officer", "Material Handling", "Operation Manager", "Project Manager", "Super Admin"],
            projectId: matReq.projectId,
            projectName: matReq.projectName,
            referenceId: givDoc.id,
            referenceNumber: givNumber,
            actorName: actor.name,
            actorRole: actor.role,
          })
        );

        await store.commitWrites(ops, ctx);
        return { giv: givDoc, request: updatedReq, transport: transportDoc, gatePass: gatePassDoc };
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Dispatch failed");
      const code = msg.startsWith("422:") ? 422 : msg.startsWith("409:") ? 409 : msg.startsWith("404:") ? 404 : msg.startsWith("403:") ? 403 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "dispatch_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 7. RECEIVING CONFIRMATION (CONSUMABLE GIV RECEIPT OR FIXED ASSET FATIV)
  // Asset currentLocation updates ONLY after FATIV receiving confirmation!
  // Duplicate FATIV receipts strictly blocked!
  // =========================================================================
  router.post("/api/warehouse/transfers/receive", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    const { receiptType } = req.body || {};

    if (
      receiptType === "FATIV"
        ? !canPerformWarehouseModuleAction(actor.role, "CONFIRM_FATIV")
        : !canPerformWarehouseModuleAction(actor.role, "CONFIRM_CONSUMABLE_RECEIPT")
    ) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Site Store Owner, Warehouse Manager, or Super Admin can confirm transfer receipts.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const now = new Date().toISOString();
        const valuationMethod = await getValuationMethod(store, ctx);

        if (receiptType === "FATIV") {
          const { fatovId, quantityReceived = 1, conditionReceived = "Good", discrepancyReason } = req.body || {};
          if (!fatovId) throw new Error("400:fatovId is required.");

          const fatov = await store.getDoc<FixedAssetTransferOut>("fixedAssetTransfersOut", String(fatovId), ctx);
          if (!fatov) throw new Error("404:FATOV document not found.");

          const existingFativs = await store.listCollection<FixedAssetTransferIn>("fixedAssetTransfersIn", ctx);
          const duplicate = existingFativs.find((f) => f.fatovId === fatov.id && f.status === "Confirmed");
          if (duplicate || fatov.status === "Completed" || fatov.fativId) {
            throw new Error(`409:Duplicate FATIV blocked! FATOV ${fatov.fatovNumber} was already received (${fatov.fativNumber || duplicate?.fativNumber}).`);
          }

          const asset = await store.getDoc<FixedAssetRecord>("fixedAssets", fatov.assetDocId, ctx);
          if (!asset) throw new Error("404:Linked Fixed Asset not found.");

          const recvQty = Number(quantityReceived);
          const discrepancyQty = round4(fatov.quantitySent - recvQty);
          const hasDiscrepancy = discrepancyQty !== 0;

          if (hasDiscrepancy && !String(discrepancyReason || "").trim()) {
            throw new Error("400:Discrepancy reason is required when received quantity differs from sent quantity.");
          }

          const fativNumber = generateSequentialCode("FATIV", existingFativs.map((f) => f.fativNumber));
          const fativId = `FATIV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const fativDoc: FixedAssetTransferIn = {
            id: fativId,
            fativNumber,
            fatovId: fatov.id,
            fatovNumber: fatov.fatovNumber,
            assetDocId: asset.id,
            assetId: asset.assetId,
            assetName: asset.assetName,
            itemCode: asset.itemCode,
            serialNumber: asset.serialNumber,
            originalGrvId: asset.originalGrvId,
            originalGrvNumber: asset.originalGrvNumber,
            fromLocationName: fatov.fromLocationName,
            receivingLocationType: fatov.toLocationType,
            receivingLocationId: fatov.toLocationId,
            receivingLocationName: fatov.toLocationName,
            projectId: fatov.projectId,
            projectName: fatov.projectName,
            quantitySent: fatov.quantitySent,
            quantityReceived: recvQty,
            discrepancyQty,
            discrepancyReason: discrepancyReason ? String(discrepancyReason) : undefined,
            conditionReceived: conditionReceived as ItemConditionStatus,
            status: hasDiscrepancy ? (recvQty > 0 ? "Partially Received" : "Discrepancy Reported") : "Confirmed",
            receivedByUid: actor.uid,
            receivedByName: actor.name,
            confirmedAt: now,
            createdAt: now,
          };

          const updatedFatov: FixedAssetTransferOut = {
            ...fatov,
            status: hasDiscrepancy ? (recvQty > 0 ? "Partially Received" : "Discrepancy Reported") : "Completed",
            fativId: fativDoc.id,
            fativNumber: fativDoc.fativNumber,
            updatedAt: now,
          };

          // Update Fixed Asset location ONLY now upon FATIV confirmation, preserving permanent Asset ID and originalGrvNumber!
          const updatedAsset: FixedAssetRecord = {
            ...asset,
            previousLocationName: asset.currentLocationName,
            currentLocationType: recvQty > 0 ? fatov.toLocationType : asset.currentLocationType,
            currentLocationId: recvQty > 0 ? fatov.toLocationId : asset.currentLocationId,
            currentLocationName: recvQty > 0 ? fatov.toLocationName : asset.currentLocationName,
            currentProjectId: recvQty > 0 ? (fatov.toLocationType === "ProjectStore" ? fatov.projectId : undefined) : asset.currentProjectId,
            currentProjectName: recvQty > 0 ? (fatov.toLocationType === "ProjectStore" ? fatov.projectName : undefined) : asset.currentProjectName,
            issuerName: fatov.issuedByName,
            receiverName: actor.name,
            condition: conditionReceived as ItemConditionStatus,
            status:
              conditionReceived !== "Good"
                ? "Quarantined"
                : fatov.toLocationType === "Warehouse"
                ? "In Warehouse"
                : "Assigned to Project",
            transferHistory: [
              ...(asset.transferHistory || []),
              {
                id: `FAHIST-IN-${Date.now()}`,
                date: now.slice(0, 10),
                voucherType: "FATIV",
                voucherNumber: fativNumber,
                fromLocation: fatov.fromLocationName,
                toLocation: fatov.toLocationName,
                projectName: fatov.projectName,
                issuerName: fatov.issuedByName,
                receiverName: actor.name,
                condition: conditionReceived as ItemConditionStatus,
                notes: hasDiscrepancy
                  ? `Discrepancy (${discrepancyQty}): ${discrepancyReason}`
                  : `Confirmed via FATOV ${fatov.fatovNumber}`,
              },
            ],
            updatedAt: now,
          };

          const ops: StoreWriteOp[] = [
            { collection: "fixedAssetTransfersIn", docId: fativDoc.id, data: fativDoc },
            { collection: "fixedAssetTransfersOut", docId: updatedFatov.id, data: updatedFatov },
            { collection: "fixedAssets", docId: updatedAsset.id, data: updatedAsset },
            makeAuditOp({
              action: hasDiscrepancy ? "FATIV_DISCREPANCY_LOGGED" : "FATIV_RECEIPT_CONFIRMED",
              module: "FATIV",
              entityType: "FixedAssetTransferIn",
              entityId: fativDoc.id,
              entityNumber: fativNumber,
              previousState: { location: asset.currentLocationName },
              newState: { location: updatedAsset.currentLocationName, assetId: asset.assetId, originalGrv: asset.originalGrvNumber },
              details: `FATIV ${fativNumber} confirmed receipt for Asset ${asset.assetId} at ${fativDoc.receivingLocationName}.`,
              projectId: fativDoc.projectId,
              actor,
            }),
            makeNotifOp({
              eventType: hasDiscrepancy ? "TRANSFER_DISCREPANCY" : "DELIVERY_RECEIVED",
              title: hasDiscrepancy
                ? `Asset Transfer Discrepancy: ${fativNumber}`
                : `Asset Transfer Confirmed: ${fativNumber}`,
              message: hasDiscrepancy
                ? `Sent ${fatov.quantitySent}, Received ${recvQty} for ${asset.assetId}. Reason: ${discrepancyReason}`
                : `${asset.assetId} (${asset.assetName}) confirmed received at ${fativDoc.receivingLocationName} (Orig GRV ${asset.originalGrvNumber}).`,
              severity: hasDiscrepancy ? "critical" : "success",
              targetRoles: ["Warehouse Manager", "Director", "Operation Manager", "Project Manager", "Super Admin"],
              projectId: fativDoc.projectId,
              projectName: fativDoc.projectName,
              referenceId: fativDoc.id,
              referenceNumber: fativNumber,
              actorName: actor.name,
              actorRole: actor.role,
            }),
          ];

          if (fatov.transportId) {
            const tr = await store.getDoc<TransportationRecord>("transportationRecords", fatov.transportId, ctx);
            if (tr) {
              const finalStatus: TransportationStatus = hasDiscrepancy ? "Discrepancy Reported" : "Completed";
              ops.push({
                collection: "transportationRecords",
                docId: tr.id,
                data: {
                  ...tr,
                  status: finalStatus,
                  completedAt: !hasDiscrepancy ? now : undefined,
                  statusHistory: [
                    ...(tr.statusHistory || []),
                    { status: finalStatus, timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
                  ],
                  updatedAt: now,
                },
              });
            }
          }

          await store.commitWrites(ops, ctx);
          return { fativ: fativDoc, fatov: updatedFatov, asset: updatedAsset };
        }

        // CONSUMABLE GIV RECEIPT BY PROJECT SITE STORE OWNER
        const { givId, receivedItems, discrepancyNote } = req.body || {};
        if (!givId) throw new Error("400:givId is required.");
        const giv = await store.getDoc<GoodsIssueVoucher>("goodsIssueVouchers", String(givId), ctx);
        if (!giv) throw new Error("404:GIV not found.");
        if (giv.status === "Delivered") throw new Error("409:GIV has already been marked Delivered.");

        if (!canUserAccessProjectRecord(actor.role, actor.assignedProject, actor.assignedSite, giv.projectId, giv.projectStoreId)) {
          throw new Error("403:Site Store Owner can only receive deliveries addressed to their assigned project store.");
        }

        const balances = await store.listCollection<StockBalanceRecord>("stockBalances", ctx);
        const ops: StoreWriteOp[] = [];
        let hasShortage = false;

        for (let idx = 0; idx < giv.items.length; idx++) {
          const line = giv.items[idx];
          const override = Array.isArray(receivedItems)
            ? receivedItems.find((ri: any) => ri.itemId === line.itemId)
            : null;
          const actualQty = override ? Number(override.receivedQty) : line.dispatchedQty;
          if (actualQty < line.dispatchedQty) hasShortage = true;
          if (actualQty <= 0) continue;

          const storeBalId = `${giv.projectStoreId}__${line.itemId}`;
          const existingStoreBal =
            balances.find((b) => b.id === storeBalId || (b.locationId === giv.projectStoreId && b.itemId === line.itemId)) ||
            makeEmptyBalance({
              locationType: "ProjectStore",
              locationId: giv.projectStoreId,
              locationName: giv.projectStoreName,
              projectId: giv.projectId,
              projectName: giv.projectName,
              item: {
                itemId: line.itemId,
                itemCode: line.itemCode,
                itemName: line.itemName,
                unit: line.unit,
              },
              valuationMethod,
            });

          const nextTransferIn = round4((existingStoreBal.transferInQty || 0) + actualQty);
          const nextAvailable = computeStockClosingBalance({
            openingQty: existingStoreBal.openingQty,
            receivedQty: existingStoreBal.receivedQty,
            returnedQty: existingStoreBal.returnedQty,
            issuedQty: existingStoreBal.issuedQty,
            transferOutQty: existingStoreBal.transferOutQty,
            transferInQty: nextTransferIn,
          });
          const addedVal = round2(actualQty * line.unitCost);
          const nextVal = round2((existingStoreBal.totalValuation || 0) + addedVal);
          const updatedStoreBal: StockBalanceRecord = {
            ...existingStoreBal,
            transferInQty: nextTransferIn,
            availableQty: nextAvailable,
            totalValuation: nextVal,
            averageUnitCost: nextAvailable > 0 ? round2(nextVal / nextAvailable) : line.unitCost,
            fifoLayers: [
              ...(existingStoreBal.fifoLayers || []),
              {
                layerId: `GIV-IN-${giv.givNumber}-${idx}`,
                grvId: giv.id,
                grvNumber: giv.givNumber,
                receivedDate: now.slice(0, 10),
                originalQty: actualQty,
                remainingQty: actualQty,
                unitCost: line.unitCost,
              },
            ],
            lastMovementAt: now,
            updatedAt: now,
          };

          const stIdx = balances.findIndex((b) => b.id === updatedStoreBal.id);
          if (stIdx >= 0) balances[stIdx] = updatedStoreBal;
          else balances.push(updatedStoreBal);
          ops.push({ collection: "stockBalances", docId: updatedStoreBal.id, data: updatedStoreBal });

          const ledgerId = `LEDGER-GIVIN-${giv.givNumber}-${idx}-${Date.now()}`;
          ops.push({
            collection: "stockLedger",
            docId: ledgerId,
            data: {
              id: ledgerId,
              voucherType: "GIV",
              voucherId: giv.id,
              voucherNo: giv.givNumber,
              referenceRequestId: giv.requestId,
              locationType: "ProjectStore",
              locationId: giv.projectStoreId,
              locationName: giv.projectStoreName,
              projectId: giv.projectId,
              projectName: giv.projectName,
              itemId: line.itemId,
              itemCode: line.itemCode,
              itemName: line.itemName,
              inventoryType: "Consumable",
              unit: line.unit,
              direction: "IN",
              quantity: actualQty,
              quantityDelta: actualQty,
              quarantineDelta: 0,
              unitCost: line.unitCost,
              totalCost: addedVal,
              valuationMethodUsed: valuationMethod,
              openingBefore: existingStoreBal.availableQty,
              balanceAfter: updatedStoreBal.availableQty,
              quarantineAfter: updatedStoreBal.quarantineQty,
              createdByUid: actor.uid,
              createdByName: actor.name,
              createdByRole: actor.role,
              createdAt: now,
            } as StockLedgerEntry,
          });
        }

        const updatedGiv: GoodsIssueVoucher = {
          ...giv,
          status: hasShortage ? "Partially Received" : "Delivered",
          receivedByUid: actor.uid,
          receivedByName: actor.name,
          receivedAt: now,
          discrepancyNote: discrepancyNote ? String(discrepancyNote) : undefined,
          updatedAt: now,
        };
        ops.push({ collection: "goodsIssueVouchers", docId: updatedGiv.id, data: updatedGiv });

        if (giv.transportId) {
          const tr = await store.getDoc<TransportationRecord>("transportationRecords", giv.transportId, ctx);
          if (tr) {
            const trStatus: TransportationStatus = hasShortage ? "Discrepancy Reported" : "Completed";
            ops.push({
              collection: "transportationRecords",
              docId: tr.id,
              data: {
                ...tr,
                status: trStatus,
                completedAt: !hasShortage ? now : undefined,
                statusHistory: [
                  ...(tr.statusHistory || []),
                  { status: trStatus, timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, notes: discrepancyNote || "Receipt confirmed" },
                ],
                updatedAt: now,
              },
            });
          }
        }

        ops.push(
          makeAuditOp({
            action: hasShortage ? "GIV_DELIVERY_DISCREPANCY" : "GIV_DELIVERY_CONFIRMED",
            module: "GIVDispatch",
            entityType: "GoodsIssueVoucher",
            entityId: updatedGiv.id,
            entityNumber: updatedGiv.givNumber,
            details: `Site Store confirmed receipt of ${updatedGiv.givNumber} (${updatedGiv.status}).`,
            projectId: updatedGiv.projectId,
            actor,
          }),
          makeNotifOp({
            eventType: hasShortage ? "TRANSFER_DISCREPANCY" : "DELIVERY_RECEIVED",
            title: hasShortage ? `Delivery Shortage on ${updatedGiv.givNumber}` : `${updatedGiv.givNumber} Delivery Confirmed`,
            message: `${actor.name} confirmed receipt at ${updatedGiv.projectStoreName}.${discrepancyNote ? ` Note: ${discrepancyNote}` : ""}`,
            severity: hasShortage ? "critical" : "success",
            targetRoles: ["Warehouse Manager", "Operation Manager", "Finance Manager", "Project Manager", "Super Admin"],
            projectId: updatedGiv.projectId,
            projectName: updatedGiv.projectName,
            referenceId: updatedGiv.id,
            referenceNumber: updatedGiv.givNumber,
            actorName: actor.name,
            actorRole: actor.role,
          })
        );

        await store.commitWrites(ops, ctx);
        return updatedGiv;
      });

      return res.json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Transfer receive failed");
      const code = msg.startsWith("409:") ? 409 : msg.startsWith("404:") ? 404 : msg.startsWith("403:") ? 403 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "receive_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 8. TWO-WAY RETURNS (MRV) & QUARANTINE STOCK SEGREGATION
  // Return Warehouse stock updates ONLY after receipt confirmation!
  // Damaged/Defective/Under Inspection items enter quarantineQty, NEVER availableQty!
  // =========================================================================
  router.post("/api/warehouse/returns", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "SUBMIT_TWO_WAY_RETURN")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only authorized Store Owners, Warehouse Managers, or Super Admin can submit returns.",
      });
    }

    try {
      const created = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const {
          direction,
          sourceLocationType,
          sourceLocationId,
          sourceLocationName,
          destinationLocationType,
          destinationLocationId,
          destinationLocationName,
          projectId,
          projectName,
          originalGivId,
          originalGivNumber,
          originalGrvId,
          originalGrvNumber,
          inventoryType = "Consumable",
          vehicleNumber,
          driverName,
          items,
          remarks,
        } = req.body || {};

        if (!sourceLocationId || !destinationLocationId || !Array.isArray(items) || items.length === 0) {
          throw new Error("400:sourceLocationId, destinationLocationId, and return items are required.");
        }

        const [existingMrvs, existingTransports, existingGps] = await Promise.all([
          store.listCollection<MaterialReturnVoucher>("materialReturnVouchers", ctx),
          store.listCollection<TransportationRecord>("transportationRecords", ctx),
          store.listCollection<GatePassRecord>("gatePasses", ctx),
        ]);

        const mrvNumber = generateSequentialCode("MRV", existingMrvs.map((m) => m.mrvNumber));
        const now = new Date().toISOString();
        const mrvId = `MRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let gatePassId: string | undefined;
        let gatePassNumber: string | undefined;
        let transportId: string | undefined;
        let transportNumber: string | undefined;
        const ops: StoreWriteOp[] = [];

        const normalizedItems = items.map((i: any) => {
          const qty = Number(i.quantityReturned) || 0;
          const cond = (i.condition as ItemConditionStatus) || "Good";
          const isGood = cond === "Good";
          return {
            itemId: String(i.itemId),
            itemCode: String(i.itemCode),
            itemName: String(i.itemName),
            inventoryType: inventoryType === "Fixed Asset" ? ("Fixed Asset" as const) : ("Consumable" as const),
            unit: String(i.unit || "pcs"),
            quantityReturned: qty,
            quantityAcceptedGood: isGood ? qty : 0,
            quantityQuarantined: isGood ? 0 : qty,
            condition: cond,
            originalGivNumber: i.originalGivNumber || originalGivNumber,
            originalGrvNumber: i.originalGrvNumber || originalGrvNumber,
            assetId: i.assetId ? String(i.assetId) : undefined,
            unitCost: Number(i.unitCost) || 0,
            reason: i.reason ? String(i.reason) : undefined,
          };
        });

        const totalQty = normalizedItems.reduce((s, it) => s + it.quantityReturned, 0);

        if (vehicleNumber && driverName) {
          transportNumber = generateSequentialCode("TRN", existingTransports.map((t) => t.transportNumber));
          gatePassNumber = generateSequentialCode("GP", existingGps.map((g) => g.gatePassNumber));
          transportId = `TRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          gatePassId = `GP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const itemsSummary = normalizedItems.map((l) => `${l.itemCode} (${l.quantityReturned} ${l.unit} - ${l.condition})`).join(", ");
          const qr = await generateGatePassVerification({
            gatePassNumber,
            voucherType: "MRV",
            voucherId: mrvId,
            vehicleNumber: String(vehicleNumber),
            itemsSummary,
          });
          ops.push(
            {
              collection: "transportationRecords",
              docId: transportId,
              data: {
                id: transportId,
                transportNumber,
                direction: direction === "WarehouseToProject" ? "WarehouseToProject" : "ProjectToWarehouse",
                referenceType: "MRV",
                referenceId: mrvId,
                referenceNumber: mrvNumber,
                originalGrvNumber,
                originLocationId: String(sourceLocationId),
                originLocationName: String(sourceLocationName || sourceLocationId),
                destinationLocationId: String(destinationLocationId),
                destinationLocationName: String(destinationLocationName || destinationLocationId),
                projectId: projectId ? String(projectId) : undefined,
                projectName: projectName ? String(projectName) : undefined,
                vehicleNumber: String(vehicleNumber),
                driverName: String(driverName),
                itemsSummary,
                status: "In Transit",
                statusHistory: [
                  { status: "Dispatched", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
                  { status: "In Transit", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role },
                ],
                dispatchedAt: now,
                createdAt: now,
                updatedAt: now,
              } as TransportationRecord,
            },
            {
              collection: "gatePasses",
              docId: gatePassId,
              data: {
                id: gatePassId,
                gatePassNumber,
                voucherType: "MRV",
                voucherId: mrvId,
                voucherNumber: mrvNumber,
                originalGrvNumber,
                originLocationId: String(sourceLocationId),
                originLocationName: String(sourceLocationName || sourceLocationId),
                destinationLocationId: String(destinationLocationId),
                destinationLocationName: String(destinationLocationName || destinationLocationId),
                projectId: projectId ? String(projectId) : undefined,
                projectName: projectName ? String(projectName) : undefined,
                vehicleNumber: String(vehicleNumber),
                driverName: String(driverName),
                itemsSummary,
                totalQuantity: totalQty,
                qrVerificationCode: qr.qrVerificationCode,
                verificationHash: qr.verificationHash,
                status: "Issued",
                issuedByUid: actor.uid,
                issuedByName: actor.name,
                issuedByRole: actor.role,
                issuedAt: now,
                lockedForEdit: true,
                createdAt: now,
                updatedAt: now,
              } as GatePassRecord,
            }
          );
        }

        const mrvDoc: MaterialReturnVoucher = {
          id: mrvId,
          mrvNumber,
          direction: direction === "WarehouseToProject" ? "WarehouseToProject" : "ProjectToWarehouse",
          sourceLocationType: sourceLocationType === "Warehouse" ? "Warehouse" : "ProjectStore",
          sourceLocationId: String(sourceLocationId),
          sourceLocationName: String(sourceLocationName || sourceLocationId),
          destinationLocationType: destinationLocationType === "ProjectStore" ? "ProjectStore" : "Warehouse",
          destinationLocationId: String(destinationLocationId),
          destinationLocationName: String(destinationLocationName || destinationLocationId),
          projectId: projectId ? String(projectId) : undefined,
          projectName: projectName ? String(projectName) : undefined,
          originalGivId: originalGivId ? String(originalGivId) : undefined,
          originalGivNumber: originalGivNumber ? String(originalGivNumber) : undefined,
          originalGrvId: originalGrvId ? String(originalGrvId) : undefined,
          originalGrvNumber: originalGrvNumber ? String(originalGrvNumber) : undefined,
          inventoryType: inventoryType === "Fixed Asset" ? "Fixed Asset" : "Consumable",
          vehicleNumber: vehicleNumber ? String(vehicleNumber) : undefined,
          driverName: driverName ? String(driverName) : undefined,
          status: gatePassId ? "In Transit" : "Submitted",
          items: normalizedItems,
          gatePassId,
          gatePassNumber,
          transportId,
          transportNumber,
          submittedByUid: actor.uid,
          submittedByName: actor.name,
          submittedByRole: actor.role,
          remarks: remarks ? String(remarks) : undefined,
          createdAt: now,
          updatedAt: now,
        };

        ops.unshift({ collection: "materialReturnVouchers", docId: mrvDoc.id, data: mrvDoc });
        ops.push(
          makeAuditOp({
            action: "MRV_RETURN_SUBMITTED",
            module: "ReturnMRV",
            entityType: "MaterialReturnVoucher",
            entityId: mrvDoc.id,
            entityNumber: mrvNumber,
            details: `Submitted two-way return ${mrvNumber} (${mrvDoc.direction}) — awaiting destination receipt confirmation before balance update.`,
            projectId: mrvDoc.projectId,
            actor,
          }),
          makeNotifOp({
            eventType: "RETURN_SUBMITTED",
            title: `Return ${mrvNumber} Submitted (${mrvDoc.direction})`,
            message: `${actor.name} initiated return ${mrvNumber} from ${mrvDoc.sourceLocationName} to ${mrvDoc.destinationLocationName}.`,
            severity: "info",
            targetRoles: ["Warehouse Manager", "Store Owner", "Gate Security Officer", "Operation Manager", "Super Admin"],
            projectId: mrvDoc.projectId,
            projectName: mrvDoc.projectName,
            referenceId: mrvDoc.id,
            referenceNumber: mrvNumber,
            actorName: actor.name,
            actorRole: actor.role,
          })
        );

        await store.commitWrites(ops, ctx);
        return mrvDoc;
      });
      return res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to create return");
      const code = msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "return_create_failed", message: msg.replace(/^400:/, "") });
    }
  });

  // Confirm MRV receipt at destination -> Good items update usable stock; Damaged/Defective go strictly to quarantineQty!
  router.post("/api/warehouse/returns/:id/confirm", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "CONFIRM_RETURN_RECEIPT")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Warehouse Manager or Super Admin can confirm return receipts and classify quarantine stock.",
      });
    }

    try {
      const result = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const mrv = await store.getDoc<MaterialReturnVoucher>("materialReturnVouchers", req.params.id, ctx);
        if (!mrv) throw new Error("404:MRV not found.");
        if (mrv.status === "Confirmed Receipt" || mrv.status === "Quarantined") {
          throw new Error("409:MRV receipt has already been confirmed.");
        }

        const valuationMethod = await getValuationMethod(store, ctx);
        const balances = await store.listCollection<StockBalanceRecord>("stockBalances", ctx);
        const assets = await store.listCollection<FixedAssetRecord>("fixedAssets", ctx);
        const now = new Date().toISOString();
        const ops: StoreWriteOp[] = [];
        let anyQuarantined = false;

        const overrideItems: any[] | undefined = req.body?.items;

        for (let idx = 0; idx < mrv.items.length; idx++) {
          const line = mrv.items[idx];
          const override = overrideItems?.find((oi) => oi.itemId === line.itemId);
          const inspectedCondition: ItemConditionStatus = override?.condition || line.condition || "Good";
          const qty = Number(override?.quantityReturned ?? line.quantityReturned) || 0;
          if (qty <= 0) continue;

          if (inspectedCondition !== "Good") anyQuarantined = true;

          // Update destination stock balance (or create if missing)
          const destKey = `${mrv.destinationLocationId}__${line.itemId}`;
          const existingDestBal =
            balances.find((b) => b.id === destKey || (b.locationId === mrv.destinationLocationId && b.itemId === line.itemId)) ||
            makeEmptyBalance({
              locationType: mrv.destinationLocationType,
              locationId: mrv.destinationLocationId,
              locationName: mrv.destinationLocationName,
              projectId: mrv.destinationLocationType === "ProjectStore" ? mrv.projectId : undefined,
              projectName: mrv.destinationLocationType === "ProjectStore" ? mrv.projectName : undefined,
              item: {
                itemId: line.itemId,
                itemCode: line.itemCode,
                itemName: line.itemName,
                inventoryType: line.inventoryType,
                unit: line.unit,
              },
              valuationMethod,
            });

          const updatedDestBal = applyReturnToBalance({
            balance: existingDestBal,
            qtyReturned: qty,
            condition: inspectedCondition,
            unitCost: line.unitCost || existingDestBal.averageUnitCost || 0,
            grvNumber: line.originalGrvNumber || mrv.originalGrvNumber,
          });
          const destIdx = balances.findIndex((b) => b.id === updatedDestBal.id);
          if (destIdx >= 0) balances[destIdx] = updatedDestBal;
          else balances.push(updatedDestBal);
          ops.push({ collection: "stockBalances", docId: updatedDestBal.id, data: updatedDestBal });

          // Also deduct source project store usable balance if returning from ProjectStore
          if (mrv.sourceLocationType === "ProjectStore") {
            const srcBal = balances.find((b) => b.locationId === mrv.sourceLocationId && b.itemId === line.itemId);
            if (srcBal && srcBal.availableQty >= qty) {
              const nextOut = round4((srcBal.transferOutQty || 0) + qty);
              const nextAvail = computeStockClosingBalance({
                openingQty: srcBal.openingQty,
                receivedQty: srcBal.receivedQty,
                returnedQty: srcBal.returnedQty,
                issuedQty: srcBal.issuedQty,
                transferOutQty: nextOut,
                transferInQty: srcBal.transferInQty,
              });
              const updatedSrcBal = {
                ...srcBal,
                transferOutQty: nextOut,
                availableQty: Math.max(0, nextAvail),
                updatedAt: now,
              };
              const srcIdx = balances.findIndex((b) => b.id === updatedSrcBal.id);
              if (srcIdx >= 0) balances[srcIdx] = updatedSrcBal;
              ops.push({
                collection: "stockBalances",
                docId: srcBal.id,
                data: updatedSrcBal,
              });
            }
          }

          // Ledger entry (QUARANTINE_IN vs MRV Good)
          const ledgerId = `LEDGER-MRV-${mrv.mrvNumber}-${idx}-${Date.now()}`;
          ops.push({
            collection: "stockLedger",
            docId: ledgerId,
            data: {
              id: ledgerId,
              voucherType: inspectedCondition === "Good" ? "MRV" : "QUARANTINE_IN",
              voucherId: mrv.id,
              voucherNo: mrv.mrvNumber,
              originalGrvNumber: line.originalGrvNumber || mrv.originalGrvNumber,
              locationType: mrv.destinationLocationType,
              locationId: mrv.destinationLocationId,
              locationName: mrv.destinationLocationName,
              projectId: mrv.projectId,
              projectName: mrv.projectName,
              itemId: line.itemId,
              itemCode: line.itemCode,
              itemName: line.itemName,
              inventoryType: line.inventoryType,
              unit: line.unit,
              direction: inspectedCondition === "Good" ? "IN" : "QUARANTINE",
              quantity: qty,
              quantityDelta: inspectedCondition === "Good" ? qty : 0,
              quarantineDelta: inspectedCondition === "Good" ? 0 : qty,
              unitCost: line.unitCost || existingDestBal.averageUnitCost || 0,
              totalCost: round2(qty * (line.unitCost || existingDestBal.averageUnitCost || 0)),
              valuationMethodUsed: valuationMethod,
              openingBefore: existingDestBal.availableQty,
              balanceAfter: updatedDestBal.availableQty,
              quarantineAfter: updatedDestBal.quarantineQty,
              condition: inspectedCondition,
              notes: line.reason || mrv.remarks || `Return condition: ${inspectedCondition}`,
              createdByUid: actor.uid,
              createdByName: actor.name,
              createdByRole: actor.role,
              createdAt: now,
            } as StockLedgerEntry,
          });

          // If Fixed Asset returned via MRV, preserve permanent Asset ID & Original GRV, update location & quarantine status
          if (line.assetId) {
            const fa = assets.find((a) => a.assetId === line.assetId);
            if (fa) {
              ops.push({
                collection: "fixedAssets",
                docId: fa.id,
                data: {
                  ...fa,
                  previousLocationName: fa.currentLocationName,
                  currentLocationType: mrv.destinationLocationType,
                  currentLocationId: mrv.destinationLocationId,
                  currentLocationName: mrv.destinationLocationName,
                  currentProjectId: mrv.destinationLocationType === "ProjectStore" ? mrv.projectId : undefined,
                  currentProjectName: mrv.destinationLocationType === "ProjectStore" ? mrv.projectName : undefined,
                  receiverName: actor.name,
                  condition: inspectedCondition,
                  status: inspectedCondition === "Good" ? "In Warehouse" : "Quarantined",
                  transferHistory: [
                    ...(fa.transferHistory || []),
                    {
                      id: `FAHIST-MRV-${Date.now()}`,
                      date: now.slice(0, 10),
                      voucherType: "MRV",
                      voucherNumber: mrv.mrvNumber,
                      fromLocation: mrv.sourceLocationName,
                      toLocation: mrv.destinationLocationName,
                      projectName: mrv.projectName,
                      issuerName: mrv.submittedByName,
                      receiverName: actor.name,
                      condition: inspectedCondition,
                      notes: `Returned via ${mrv.mrvNumber} (Orig GRV ${fa.originalGrvNumber})`,
                    },
                  ],
                  updatedAt: now,
                } as FixedAssetRecord,
              });
            }
          }
        }

        const updatedMrv: MaterialReturnVoucher = {
          ...mrv,
          status: anyQuarantined ? "Quarantined" : "Confirmed Receipt",
          confirmedByUid: actor.uid,
          confirmedByName: actor.name,
          confirmedAt: now,
          updatedAt: now,
        };
        ops.push({ collection: "materialReturnVouchers", docId: updatedMrv.id, data: updatedMrv });

        if (anyQuarantined) {
          ops.push(
            makeNotifOp({
              eventType: "DAMAGED_QUARANTINED",
              title: `Damaged / Defective Stock Quarantined (${mrv.mrvNumber})`,
              message: `Returned items classified as Damaged/Defective were isolated in Quarantine stock and excluded from usable inventory.`,
              severity: "critical",
              targetRoles: ["Warehouse Manager", "Finance Manager", "Director", "Operation Manager", "Super Admin"],
              projectId: mrv.projectId,
              projectName: mrv.projectName,
              referenceId: mrv.id,
              referenceNumber: mrv.mrvNumber,
              actorName: actor.name,
              actorRole: actor.role,
            })
          );
        }

        ops.push(
          makeAuditOp({
            action: anyQuarantined ? "MRV_RECEIPT_QUARANTINED" : "MRV_RECEIPT_CONFIRMED",
            module: anyQuarantined ? "Quarantine" : "ReturnMRV",
            entityType: "MaterialReturnVoucher",
            entityId: updatedMrv.id,
            entityNumber: updatedMrv.mrvNumber,
            details: `Confirmed MRV ${updatedMrv.mrvNumber} receipt (${updatedMrv.status}).`,
            projectId: updatedMrv.projectId,
            actor,
          })
        );

        await store.commitWrites(ops, ctx);
        return updatedMrv;
      });

      return res.json({ success: true, data: result });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to confirm return receipt");
      const code = msg.startsWith("409:") ? 409 : msg.startsWith("404:") ? 404 : 500;
      return res.status(code).json({ success: false, error: "return_confirm_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 9. QUARANTINE INSPECTION RELEASE / DISPOSITION
  // =========================================================================
  router.post("/api/warehouse/quarantine/release", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "RELEASE_QUARANTINE")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Warehouse Manager or Super Admin can release or write off quarantined stock.",
      });
    }

    try {
      const updated = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const { balanceId, quantity, disposition, notes } = req.body || {};
        if (!balanceId || !quantity || (disposition !== "RELEASE_TO_USABLE" && disposition !== "WRITE_OFF")) {
          throw new Error("400:balanceId, positive quantity, and disposition ('RELEASE_TO_USABLE' | 'WRITE_OFF') required.");
        }

        const bal = await store.getDoc<StockBalanceRecord>("stockBalances", String(balanceId), ctx);
        if (!bal) throw new Error("404:Stock balance not found.");
        const qty = Number(quantity);
        if (qty <= 0 || qty > bal.quarantineQty) {
          throw new Error(`422:Invalid release quantity ${qty}; current quarantineQty is ${bal.quarantineQty}.`);
        }

        const nextQuarantine = round4(bal.quarantineQty - qty);
        let nextReturned = bal.returnedQty;
        if (disposition === "RELEASE_TO_USABLE") {
          nextReturned = round4(bal.returnedQty + qty);
        }
        const nextAvail = computeStockClosingBalance({
          openingQty: bal.openingQty,
          receivedQty: bal.receivedQty,
          returnedQty: nextReturned,
          issuedQty: bal.issuedQty,
          transferOutQty: bal.transferOutQty,
          transferInQty: bal.transferInQty,
        });

        const now = new Date().toISOString();
        const nextBal: StockBalanceRecord = {
          ...bal,
          quarantineQty: nextQuarantine,
          damagedQty: Math.max(0, round4(bal.damagedQty - Math.min(bal.damagedQty, qty))),
          returnedQty: nextReturned,
          availableQty: nextAvail,
          updatedAt: now,
        };

        const ledgerId = `LEDGER-QREL-${Date.now()}`;
        await store.commitWrites(
          [
            { collection: "stockBalances", docId: nextBal.id, data: nextBal },
            {
              collection: "stockLedger",
              docId: ledgerId,
              data: {
                id: ledgerId,
                voucherType: "QUARANTINE_RELEASE",
                voucherId: nextBal.id,
                voucherNo: `QREL-${now.slice(0, 10)}`,
                locationType: nextBal.locationType,
                locationId: nextBal.locationId,
                locationName: nextBal.locationName,
                itemId: nextBal.itemId,
                itemCode: nextBal.itemCode,
                itemName: nextBal.itemName,
                inventoryType: nextBal.inventoryType,
                unit: nextBal.unit,
                direction: "RELEASE",
                quantity: qty,
                quantityDelta: disposition === "RELEASE_TO_USABLE" ? qty : 0,
                quarantineDelta: -qty,
                unitCost: nextBal.averageUnitCost,
                totalCost: round2(qty * nextBal.averageUnitCost),
                valuationMethodUsed: nextBal.valuationMethod,
                openingBefore: bal.availableQty,
                balanceAfter: nextBal.availableQty,
                quarantineAfter: nextBal.quarantineQty,
                notes: `${disposition}: ${notes || ""}`,
                createdByUid: actor.uid,
                createdByName: actor.name,
                createdByRole: actor.role,
                createdAt: now,
              } as StockLedgerEntry,
            },
            makeAuditOp({
              action: `QUARANTINE_${disposition}`,
              module: "Quarantine",
              entityType: "StockBalance",
              entityId: nextBal.id,
              details: `${disposition} of ${qty} ${nextBal.unit} ${nextBal.itemName}. Notes: ${notes || "-"}`,
              locationId: nextBal.locationId,
              actor,
            }),
          ],
          ctx
        );
        return nextBal;
      });
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      const msg = String(err?.message || "Quarantine disposition failed");
      const code = msg.startsWith("422:") ? 422 : msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "quarantine_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 10. GATE PASS QR VERIFICATION & EXIT / ENTRY SIGN-OFF (Gate Security Officer)
  // =========================================================================
  router.post("/api/warehouse/gate-passes/:id/verify", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "VERIFY_GATE_PASS_EXIT_ENTRY")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Gate Security Officer or Super Admin can verify Gate Pass Exit/Entry.",
      });
    }

    try {
      const updated = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const gp = await store.getDoc<GatePassRecord>("gatePasses", req.params.id, ctx);
        if (!gp) throw new Error("404:Gate Pass not found.");

        const { scannedCode, verificationType, remarks } = req.body || {};
        if (!scannedCode || (verificationType !== "EXIT" && verificationType !== "ENTRY")) {
          throw new Error("400:scannedCode and verificationType ('EXIT' | 'ENTRY') are required.");
        }

        const check = await verifyGatePassIntegrity(gp, String(scannedCode));
        const now = new Date().toISOString();
        const ops: StoreWriteOp[] = [];

        if (!check.valid) {
          const blocked: GatePassRecord = {
            ...gp,
            status: "Tamper Blocked",
            securityRemarks: `${check.reason} (Scanned by ${actor.name})`,
            updatedAt: now,
          };
          ops.push(
            { collection: "gatePasses", docId: blocked.id, data: blocked },
            makeAuditOp({
              action: "GATE_PASS_VERIFICATION_BLOCKED",
              module: "GatePass",
              entityType: "GatePass",
              entityId: gp.id,
              entityNumber: gp.gatePassNumber,
              details: check.reason || "Verification mismatch",
              actor,
            })
          );
          await store.commitWrites(ops, ctx);
          throw new Error(`403:${check.reason}`);
        }

        const updatedGp: GatePassRecord = {
          ...gp,
          status: verificationType === "EXIT" ? "Exit Verified" : "Entry Verified",
          exitVerifiedByUid: verificationType === "EXIT" ? actor.uid : gp.exitVerifiedByUid,
          exitVerifiedByName: verificationType === "EXIT" ? actor.name : gp.exitVerifiedByName,
          exitVerifiedAt: verificationType === "EXIT" ? now : gp.exitVerifiedAt,
          entryVerifiedByUid: verificationType === "ENTRY" ? actor.uid : gp.entryVerifiedByUid,
          entryVerifiedByName: verificationType === "ENTRY" ? actor.name : gp.entryVerifiedByName,
          entryVerifiedAt: verificationType === "ENTRY" ? now : gp.entryVerifiedAt,
          securityRemarks: remarks ? String(remarks) : gp.securityRemarks,
          updatedAt: now,
        };
        ops.push({ collection: "gatePasses", docId: updatedGp.id, data: updatedGp });

        // Also advance linked transportation record when gate exit/entry occurs
        const transports = await store.listCollection<TransportationRecord>("transportationRecords", ctx);
        const linkedTr = transports.find((t) => t.referenceId === gp.voucherId);
        if (linkedTr) {
          const nextTrStatus: TransportationStatus = verificationType === "EXIT" ? "In Transit" : "Arrived";
          ops.push({
            collection: "transportationRecords",
            docId: linkedTr.id,
            data: {
              ...linkedTr,
              status: nextTrStatus,
              arrivedAt: verificationType === "ENTRY" ? now : linkedTr.arrivedAt,
              statusHistory: [
                ...(linkedTr.statusHistory || []),
                {
                  status: nextTrStatus,
                  timestamp: now,
                  actorUid: actor.uid,
                  actorName: actor.name,
                  actorRole: actor.role,
                  notes: `Gate Pass ${gp.gatePassNumber} ${verificationType} verified`,
                },
              ],
              updatedAt: now,
            },
          });
        }

        ops.push(
          makeAuditOp({
            action: verificationType === "EXIT" ? "GATE_PASS_EXIT_VERIFIED" : "GATE_PASS_ENTRY_VERIFIED",
            module: "GatePass",
            entityType: "GatePass",
            entityId: updatedGp.id,
            entityNumber: updatedGp.gatePassNumber,
            details: `Gate Security Officer verified ${verificationType} for ${updatedGp.gatePassNumber} (${updatedGp.vehicleNumber}).`,
            projectId: updatedGp.projectId,
            actor,
          }),
          makeNotifOp({
            eventType: verificationType === "EXIT" ? "GATE_PASS_EXIT_VERIFIED" : "GATE_PASS_ENTRY_VERIFIED",
            title: `Gate Pass ${updatedGp.gatePassNumber} ${verificationType} Verified`,
            message: `${actor.name} verified vehicle ${updatedGp.vehicleNumber} ${verificationType} for ${updatedGp.voucherType} ${updatedGp.voucherNumber}.`,
            severity: "info",
            targetRoles: ["Warehouse Manager", "Store Owner", "Operation Manager", "Super Admin"],
            projectId: updatedGp.projectId,
            projectName: updatedGp.projectName,
            referenceId: updatedGp.id,
            referenceNumber: updatedGp.gatePassNumber,
            actorName: actor.name,
            actorRole: actor.role,
          })
        );

        await store.commitWrites(ops, ctx);
        return updatedGp;
      });

      return res.json({ success: true, data: updated });
    } catch (err: any) {
      const msg = String(err?.message || "Gate Pass verification failed");
      const code = msg.startsWith("404:") ? 404 : msg.startsWith("403:") ? 403 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "gate_pass_verify_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 11. TRANSPORTATION LIFECYCLE STATUS UPDATES (11 STATUSES)
  // =========================================================================
  router.post("/api/warehouse/transport/:id/status", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "MANAGE_TRANSPORT")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Not authorized to update transportation workflow status.",
      });
    }

    try {
      const updated = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const tr = await store.getDoc<TransportationRecord>("transportationRecords", req.params.id, ctx);
        if (!tr) throw new Error("404:Transportation record not found.");

        const { status, handlerName, notes } = req.body || {};
        if (!ALL_TRANSPORT_STATUSES.includes(status)) {
          throw new Error(`400:Invalid transport status '${status}'.`);
        }

        const now = new Date().toISOString();
        const updatedTr: TransportationRecord = {
          ...tr,
          status,
          handlerName: handlerName ? String(handlerName) : tr.handlerName || (resolveExtendedWarehouseRole(actor.role) === "material_handling" ? actor.name : undefined),
          handlerUid: resolveExtendedWarehouseRole(actor.role) === "material_handling" ? actor.uid : tr.handlerUid,
          arrivedAt: status === "Arrived" ? now : tr.arrivedAt,
          completedAt: status === "Completed" ? now : tr.completedAt,
          statusHistory: [
            ...(tr.statusHistory || []),
            { status, timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: actor.role, notes: notes ? String(notes) : undefined },
          ],
          updatedAt: now,
        };

        await store.commitWrites(
          [
            { collection: "transportationRecords", docId: updatedTr.id, data: updatedTr },
            makeAuditOp({
              action: "TRANSPORT_STATUS_UPDATED",
              module: "Transport",
              entityType: "TransportationRecord",
              entityId: updatedTr.id,
              entityNumber: updatedTr.transportNumber,
              previousState: { status: tr.status },
              newState: { status },
              details: `Transport ${updatedTr.transportNumber} transitioned ${tr.status} -> ${status}.`,
              projectId: updatedTr.projectId,
              actor,
            }),
            makeNotifOp({
              eventType: "TRANSPORT_STATUS_CHANGED",
              title: `Transport ${updatedTr.transportNumber}: ${status}`,
              message: `${updatedTr.referenceType} ${updatedTr.referenceNumber} (${updatedTr.originLocationName} -> ${updatedTr.destinationLocationName}) is now ${status}.`,
              severity: status === "Discrepancy Reported" || status === "Cancelled" ? "warning" : "info",
              targetRoles: ["Warehouse Manager", "Store Owner", "Operation Manager", "Project Manager", "Super Admin"],
              projectId: updatedTr.projectId,
              projectName: updatedTr.projectName,
              referenceId: updatedTr.id,
              referenceNumber: updatedTr.transportNumber,
              actorName: actor.name,
              actorRole: actor.role,
            }),
          ],
          ctx
        );

        return updatedTr;
      });
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      const msg = String(err?.message || "Failed to update transport status");
      const code = msg.startsWith("404:") ? 404 : msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "transport_update_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 12. VALUATION METHOD CONFIGURATION (Finance Manager / Super Admin ONLY)
  // Switching FIFO <-> Weighted Moving Average applies going forward; never rewrites historical ledger!
  // =========================================================================
  router.post("/api/warehouse/settings/valuation", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "CONFIGURE_VALUATION_METHOD")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "Only Finance Manager or Super Admin can configure inventory valuation method (FIFO vs Weighted Moving Average).",
      });
    }

    try {
      const updated = await mutex.run(async () => {
        const ctx = ctxFromReq(req);
        const { valuationMethod, reason } = req.body || {};
        if (valuationMethod !== "FIFO" && valuationMethod !== "Weighted Moving Average") {
          throw new Error("400:valuationMethod must be 'FIFO' or 'Weighted Moving Average'.");
        }

        const existing = await store.getDoc<InventoryValuationSettingsRecord>("inventorySettings", "default", ctx);
        const now = new Date().toISOString();
        const prevMethod: CostValuationMethod = existing?.valuationMethod || "FIFO";

        const nextSetting: InventoryValuationSettingsRecord = {
          id: "default",
          valuationMethod,
          enforceCommercialInvoiceOnGrv: true,
          enforcePlanComparisonOnRequest: true,
          quarantineDamagedReturnsAutomatically: true,
          updatedByUid: actor.uid,
          updatedByName: actor.name,
          updatedByRole: actor.role,
          updatedAt: now,
          history: [
            ...(existing?.history || []),
            {
              previousMethod: prevMethod,
              newMethod: valuationMethod,
              changedByUid: actor.uid,
              changedByName: actor.name,
              changedAt: now,
              reason: reason ? String(reason) : "Finance accounting policy update",
            },
          ],
        };

        await store.commitWrites(
          [
            { collection: "inventorySettings", docId: "default", data: nextSetting },
            makeAuditOp({
              action: "INVENTORY_VALUATION_METHOD_UPDATED",
              module: "ValuationSettings",
              entityType: "InventoryValuationSettings",
              entityId: "default",
              previousState: { valuationMethod: prevMethod },
              newState: { valuationMethod },
              details: `Finance updated costing method ${prevMethod} -> ${valuationMethod} (prospective only; historical ledger preserved).`,
              actor,
            }),
          ],
          ctx
        );

        return nextSetting;
      });
      return res.json({ success: true, data: updated });
    } catch (err: any) {
      const msg = String(err?.message || "Valuation update failed");
      const code = msg.startsWith("400:") ? 400 : 500;
      return res.status(code).json({ success: false, error: "valuation_update_failed", message: msg.replace(/^\d{3}:/, "") });
    }
  });

  // =========================================================================
  // 13. SERVER-SIDE REPORT GENERATOR ENDPOINT (22 REPORTS + SCOPED RBAC)
  // =========================================================================
  router.get("/api/warehouse/reports/:reportType", ...guard, async (req: Request, res: Response) => {
    const actor = actorFromReq(req);
    if (!canPerformWarehouseModuleAction(actor.role, "EXPORT_REPORTS")) {
      return res.status(403).json({
        success: false,
        error: "forbidden",
        message: "You are not authorized to generate warehouse/store reports.",
      });
    }

    try {
      const ctx = ctxFromReq(req);
      const [
        warehouses,
        projectStores,
        categories,
        items,
        stockBalances,
        stockLedger,
        materialPlans,
        materialRequests,
        grvs,
        givs,
        mrvs,
        fixedAssets,
        fatovs,
        fativs,
        transports,
        gatePasses,
        commercialInvoices,
        auditLogs,
      ] = await Promise.all([
        store.listCollection<WarehouseRecord>("warehouses", ctx),
        store.listCollection<ProjectStoreRecord>("projectStores", ctx),
        store.listCollection<any>("inventoryCategories", ctx),
        store.listCollection<InventoryItemRecord>("inventoryItems", ctx),
        store.listCollection<StockBalanceRecord>("stockBalances", ctx),
        store.listCollection<StockLedgerEntry>("stockLedger", ctx),
        store.listCollection<MaterialPlanRecord>("materialPlans", ctx),
        store.listCollection<EngineeringMaterialRequest>("materialRequests", ctx),
        store.listCollection<GoodsReceivingVoucher>("goodsReceivingVouchers", ctx),
        store.listCollection<GoodsIssueVoucher>("goodsIssueVouchers", ctx),
        store.listCollection<MaterialReturnVoucher>("materialReturnVouchers", ctx),
        store.listCollection<FixedAssetRecord>("fixedAssets", ctx),
        store.listCollection<FixedAssetTransferOut>("fixedAssetTransfersOut", ctx),
        store.listCollection<FixedAssetTransferIn>("fixedAssetTransfersIn", ctx),
        store.listCollection<TransportationRecord>("transportationRecords", ctx),
        store.listCollection<GatePassRecord>("gatePasses", ctx),
        store.listCollection<CommercialInvoiceRecord>("commercialInvoices", ctx),
        store.listCollection<InventoryAuditLogRecord>("inventoryAuditLogs", ctx),
      ]);

      const filters: WarehouseDashboardFilters = {
        dateFrom: String(req.query.dateFrom || ""),
        dateTo: String(req.query.dateTo || ""),
        projectId:
          resolveExtendedWarehouseRole(actor.role) === "project_head" ||
          resolveExtendedWarehouseRole(actor.role) === "site_store_owner"
            ? actor.assignedProject || String(req.query.projectId || "ALL")
            : String(req.query.projectId || "ALL"),
        locationId: String(req.query.locationId || "ALL"),
        categoryId: String(req.query.categoryId || "ALL"),
        inventoryType: (req.query.inventoryType as any) || "ALL",
      };

      const report = generateWarehouseReportData(
        req.params.reportType as WarehouseReportType,
        {
          warehouses,
          projectStores,
          categories,
          items,
          stockBalances,
          stockLedger,
          materialPlans,
          materialRequests,
          grvs,
          givs,
          mrvs,
          fixedAssets,
          fatovs,
          fativs,
          transports,
          gatePasses,
          commercialInvoices,
          auditLogs,
        },
        filters,
        `${actor.name} (${actor.role})`
      );

      return res.json({ success: true, data: report });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: "report_failed",
        message: err?.message || "Failed to generate report",
      });
    }
  });

  return { router, store };
}
