import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseReady,
  OperationType,
  sanitizeForFirestore,
  storage,
} from "../firebase";
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
  InventoryCategoryRecord,
  InventoryItemRecord,
  InventoryNotificationRecord,
  InventoryValuationSettingsRecord,
  MaterialApprovalRecord,
  MaterialPlanRecord,
  MaterialPlanRevisionRecord,
  MaterialRequestItem,
  MaterialReturnVoucher,
  ProjectStoreRecord,
  RegisteredSite,
  RegisteredWarehouse,
  StockBalanceRecord,
  StockLedgerEntry,
  TransportationRecord,
  TransportationStatus,
  UserRole,
  WarehouseDashboardFilters,
  WarehouseRecord,
  WarehouseReportType,
} from "../types";
import { authFetch } from "./authService";
import {
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
} from "./warehouseManagementService";
import {
  canPerformWarehouseModuleAction,
  isStrictDirectorRole,
  resolveExtendedWarehouseRole,
} from "./warehouseStoreRbac";
import {
  getRoleMatchAliases,
  normalizeNotificationRole,
  NotificationService,
} from "./notificationService";

function canQueryFirestore(): boolean {
  return Boolean(isFirebaseReady && db && auth && auth.currentUser);
}

const memFallbackCache = new Map<string, any[]>();

function readLocalCache<T>(colName: string, fallback: T[] = []): T[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(`ovid_wh_${colName}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    }
  } catch {
    // ignore storage errors
  }
  return memFallbackCache.get(colName) ?? fallback;
}

function writeLocalCache<T>(colName: string, items: T[]): void {
  memFallbackCache.set(colName, items);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(`ovid_wh_${colName}`, JSON.stringify(items));
    }
  } catch {
    // ignore storage quota errors
  }
}

const offlineEngine = {
  getCache: readLocalCache,
  saveCache: writeLocalCache,
  reconcileWithOutbox: <T>(_colName: string, docs: T[]): T[] => docs,
};

function subscribeCol<T extends { id: string }>(
  colName: string,
  callback: (items: T[]) => void,
  fallback: T[] = []
): () => void {
  if (canQueryFirestore() && db) {
    return onSnapshot(
      collection(db, colName),
      (snap) => {
        const docs = snap.docs.map((d) => ({
          ...(d.data() as T),
          id: (d.data() as any)?.id || d.id,
        }));
        const merged = offlineEngine.reconcileWithOutbox<T>(colName, docs);
        offlineEngine.saveCache(colName, merged);
        callback(merged);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, colName);
        callback(offlineEngine.getCache<T>(colName, fallback));
      }
    );
  }
  callback(offlineEngine.getCache<T>(colName, fallback));
  return () => {};
}

async function writeColDoc<T extends { id: string }>(
  colName: string,
  item: T
): Promise<T> {
  const clean = sanitizeForFirestore(item) as T;
  const cached = offlineEngine.getCache<T>(colName, []);
  const idx = cached.findIndex((c) => c.id === clean.id);
  const next = idx >= 0 ? [...cached.slice(0, idx), clean, ...cached.slice(idx + 1)] : [clean, ...cached];
  offlineEngine.saveCache(colName, next);

  if (canQueryFirestore() && db) {
    try {
      await setDoc(doc(db, colName, clean.id), clean);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${colName}/${clean.id}`);
      throw err;
    }
  }
  return clean;
}

async function deleteColDoc(colName: string, docId: string): Promise<void> {
  const cached = offlineEngine.getCache<any>(colName, []);
  offlineEngine.saveCache(
    colName,
    cached.filter((c) => c.id !== docId)
  );
  if (canQueryFirestore() && db) {
    try {
      await deleteDoc(doc(db, colName, docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${colName}/${docId}`);
      throw err;
    }
  }
}

export interface ErpWarehouseSnapshot {
  categories: InventoryCategoryRecord[];
  items: InventoryItemRecord[];
  warehouses: WarehouseRecord[];
  projectStores: ProjectStoreRecord[];
  stockBalances: StockBalanceRecord[];
  stockLedger: StockLedgerEntry[];
  materialPlans: MaterialPlanRecord[];
  materialPlanRevisions: MaterialPlanRevisionRecord[];
  materialRequests: EngineeringMaterialRequest[];
  materialApprovals: MaterialApprovalRecord[];
  grvs: GoodsReceivingVoucher[];
  givs: GoodsIssueVoucher[];
  mrvs: MaterialReturnVoucher[];
  fixedAssets: FixedAssetRecord[];
  fatovs: FixedAssetTransferOut[];
  fativs: FixedAssetTransferIn[];
  transports: TransportationRecord[];
  gatePasses: GatePassRecord[];
  commercialInvoices: CommercialInvoiceRecord[];
  notifications: InventoryNotificationRecord[];
  auditLogs: InventoryAuditLogRecord[];
  valuationSettings: InventoryValuationSettingsRecord;
  erpProjects: any[];
  erpSuppliers: any[];
  erpProcurements: any[];
  erpTrucks: any[];
}

export interface WarehouseActorContext {
  uid: string;
  name: string;
  role: UserRole | string;
  assignedProject?: string;
  assignedSite?: string;
}

const DEFAULT_SETTINGS: InventoryValuationSettingsRecord = {
  id: "default",
  valuationMethod: "FIFO",
  enforceCommercialInvoiceOnGrv: true,
  enforcePlanComparisonOnRequest: true,
  quarantineDamagedReturnsAutomatically: true,
  updatedByUid: "SYSTEM",
  updatedByName: "System Policy",
  updatedByRole: "Super Admin",
  updatedAt: new Date().toISOString(),
  history: [],
};

// Upload Commercial Invoice (PDF/JPG/JPEG/PNG <= 15MB) to Firebase Storage or data-URL fallback
export async function uploadCommercialInvoiceFile(
  file: File,
  invoiceId: string
): Promise<{
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
}> {
  const allowedMimes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const extOk = /\.(pdf|jpe?g|png)$/i.test(file.name || "");
  if (!allowedMimes.includes((file.type || "").toLowerCase()) && !extOk) {
    throw new Error("Commercial Invoice attachment must be a PDF, JPG, JPEG, or PNG file.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Commercial Invoice attachment exceeds maximum 15 MB file size.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `commercialInvoices/${invoiceId}/${safeName}`;
  const mimeType =
    file.type ||
    (file.name.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : file.name.toLowerCase().endsWith(".png")
      ? "image/png"
      : "image/jpeg");

  if (canQueryFirestore() && storage) {
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: mimeType });
      const fileUrl = await getDownloadURL(storageRef);
      return {
        fileUrl,
        fileName: file.name,
        mimeType,
        fileSizeBytes: file.size,
        storagePath,
      };
    } catch (err) {
      console.warn("Firebase Storage commercial invoice upload fallback:", err);
    }
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read attachment file."));
    reader.readAsDataURL(file);
  });

  return {
    fileUrl: dataUrl,
    fileName: file.name,
    mimeType,
    fileSizeBytes: file.size,
    storagePath: `local:${storagePath}`,
  };
}

export async function uploadMaterialAttachmentFile(
  file: File,
  docId: string
): Promise<{ url: string; fileName: string; mimeType: string; storagePath: string }> {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Attachment file exceeds maximum 15 MB limit.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `materialAttachments/${docId}/${safeName}`;

  if (canQueryFirestore() && storage) {
    try {
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return { url, fileName: file.name, mimeType: file.type, storagePath };
    } catch (err) {
      console.warn("Firebase Storage material attachment fallback:", err);
    }
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
  return { url: dataUrl, fileName: file.name, mimeType: file.type, storagePath: `local:${storagePath}` };
}

async function callWarehouseApi<T>(url: string, method: "GET" | "POST", body?: any): Promise<T> {
  const resp = await authFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json.success === false) {
    throw new Error(json.message || json.error || `Request failed (${resp.status})`);
  }
  return json.data as T;
}

// Reconcile existing registeredWarehouses & siteStores & materials into unified ERP facilities without duplication
export function mergeExistingWarehouses(
  whDocs: WarehouseRecord[],
  regWarehouses: RegisteredWarehouse[]
): WarehouseRecord[] {
  const map = new Map<string, WarehouseRecord>();
  const now = new Date().toISOString();
  for (const rw of regWarehouses) {
    map.set(rw.id, {
      id: rw.id,
      code: rw.code || `WH-${rw.id.slice(-4).toUpperCase()}`,
      name: rw.name,
      location: rw.address || [rw.citySite, rw.locationRegion].filter(Boolean).join(", ") || "Head Office",
      managerUid: "",
      managerName: rw.warehouseManager || "Assigned Manager",
      status: rw.status === "Active" ? "Active" : "Inactive",
      createdAt: rw.registrationDate || now,
      updatedAt: rw.registrationDate || now,
    });
  }
  for (const wh of whDocs) {
    map.set(wh.id, wh);
  }
  return Array.from(map.values());
}

export function mergeExistingProjectStores(
  storeDocs: ProjectStoreRecord[],
  regSites: RegisteredSite[],
  erpProjects: any[]
): ProjectStoreRecord[] {
  const map = new Map<string, ProjectStoreRecord>();
  const now = new Date().toISOString();
  for (const rs of regSites) {
    const matchedProj = erpProjects.find(
      (p) => p.name === rs.projectName || p.id === rs.projectName
    );
    map.set(rs.id, {
      id: rs.id,
      storeCode: `PS-${rs.id.slice(-4).toUpperCase()}`,
      storeName: rs.projectName,
      projectId: matchedProj?.id || rs.id,
      projectName: rs.projectName,
      siteId: rs.id,
      siteName: rs.projectName,
      location: [rs.cityWoreda, rs.region].filter(Boolean).join(", ") || rs.projectName,
      storeOwnerName: rs.siteManager || "Site Manager",
      status: rs.status === "Active" ? "Active" : "Inactive",
      createdAt: rs.startDate || now,
      updatedAt: rs.startDate || now,
    });
  }
  for (const ps of storeDocs) {
    map.set(ps.id, ps);
  }
  return Array.from(map.values());
}

export function mergeExistingCatalogItems(
  invItems: InventoryItemRecord[],
  legacyMaterials: any[]
): InventoryItemRecord[] {
  const map = new Map<string, InventoryItemRecord>();
  for (const m of legacyMaterials) {
    const id = String(m.id || m.code || "");
    if (!id) continue;
    map.set(id, {
      id,
      itemCode: String(m.code || m.itemCode || id),
      itemName: String(m.name || m.itemName || "Unnamed Material"),
      specification: String(m.specification || m.size || m.category || ""),
      categoryId: String(m.categoryId || "CAT-GEN"),
      categoryName: String(m.category || "General Construction"),
      inventoryType:
        m.inventoryType === "Fixed Asset" ||
        String(m.category || "").toLowerCase().includes("machinery") ||
        String(m.category || "").toLowerCase().includes("equipment") ||
        String(m.category || "").toLowerCase().includes("formwork")
          ? "Fixed Asset"
          : "Consumable",
      unit: String(m.unit || "pcs"),
      minStockLevel: Number(m.minStockLevel ?? m.minThreshold ?? 10),
      reorderPoint: Number(m.reorderPoint ?? m.minThreshold ?? 15),
      standardUnitCost: Number(m.unitCost || m.standardUnitCost || 0),
      batchTrackingEnabled: Boolean(m.batchTrackingEnabled ?? m.trackBatch),
      expiryTrackingEnabled: Boolean(m.expiryTrackingEnabled ?? m.trackExpiry),
      isActive: true,
      createdAt: m.createdAt || new Date().toISOString(),
      updatedAt: m.updatedAt || new Date().toISOString(),
    });
  }
  for (const item of invItems) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

export function normalizeMaterialRequestRecord(raw: any): EngineeringMaterialRequest {
  const items = Array.isArray(raw?.items)
    ? raw.items
    : raw?.materialName
    ? [
        {
          id: raw.id ? `${raw.id}-1` : "LINE-1",
          requestId: raw.id || "",
          itemId: raw.itemId || raw.materialId || raw.id || "CUSTOM",
          itemCode: raw.itemCode || "SITE-REQ",
          itemName: String(raw.materialName),
          specification: raw.purpose || "",
          inventoryType: "Consumable" as const,
          unit: String(raw.unit || "Pcs"),
          plannedQty: 0,
          previouslyApprovedOrIssuedQty: 0,
          requestedQty: Number(raw.requestedQty || 0),
          warehouseAvailableQty: 0,
          approvedQty: raw.status === "Approved" || raw.status === "Issued" ? Number(raw.requestedQty || 0) : 0,
          dispatchedQty: raw.status === "Issued" ? Number(raw.requestedQty || 0) : 0,
          remainingDispatchQty: raw.status === "Issued" ? 0 : Number(raw.requestedQty || 0),
          comparisonStatus: "Matched" as const,
        },
      ]
    : [];

  return {
    ...raw,
    requestNumber: raw?.requestNumber || raw?.id || "REQ",
    planId: raw?.planId || "",
    planNumber: raw?.planNumber || "SITE-STORE",
    planRevisionNumber: Number(raw?.planRevisionNumber || 1),
    projectId: raw?.projectId || raw?.siteName || "PROJ-MAIN",
    projectName: raw?.projectName || raw?.siteName || "Site Store",
    projectStoreId: raw?.projectStoreId || raw?.siteName || "SITE-STORE",
    projectStoreName:
      raw?.projectStoreName ||
      [raw?.building, raw?.floor, raw?.zone].filter(Boolean).join(" / ") ||
      raw?.siteName ||
      "Site Store",
    warehouseId: raw?.warehouseId || "WH-CENTRAL",
    warehouseName: raw?.warehouseName || "Central Warehouse",
    requestedByUid: raw?.requestedByUid || raw?.requesterId || "",
    requestedByName: raw?.requestedByName || raw?.requesterName || "Store Manager",
    requestedByRole: raw?.requestedByRole || raw?.requesterRole || "Store Manager",
    requestedDate: raw?.requestedDate || raw?.requestDate || "",
    createdAt: raw?.createdAt || raw?.requestDate || "",
    items,
  } as EngineeringMaterialRequest;
}

// =========================================================================
// UNIFIED REAL-TIME SUBSCRIPTION & CACHE ENGINE
// =========================================================================
export function subscribeWarehouseErpModule(
  onUpdate: (snapshot: ErpWarehouseSnapshot) => void,
  actor?: { role?: UserRole | string; uid?: string; assignedProject?: string }
): () => void {
  const state: ErpWarehouseSnapshot = {
    categories: [],
    items: [],
    warehouses: [],
    projectStores: [],
    stockBalances: [],
    stockLedger: [],
    materialPlans: [],
    materialPlanRevisions: [],
    materialRequests: [],
    materialApprovals: [],
    grvs: [],
    givs: [],
    mrvs: [],
    fixedAssets: [],
    fatovs: [],
    fativs: [],
    transports: [],
    gatePasses: [],
    commercialInvoices: [],
    notifications: [],
    auditLogs: [],
    valuationSettings: DEFAULT_SETTINGS,
    erpProjects: [],
    erpSuppliers: [],
    erpProcurements: [],
    erpTrucks: [],
  };

  let rawWarehouses: WarehouseRecord[] = [];
  let rawRegWarehouses: RegisteredWarehouse[] = [];
  let rawProjectStores: ProjectStoreRecord[] = [];
  let rawRegSites: RegisteredSite[] = [];
  let rawItems: InventoryItemRecord[] = [];
  let rawMaterials: any[] = [];

  const emit = () => {
    state.warehouses = mergeExistingWarehouses(rawWarehouses, rawRegWarehouses);
    state.projectStores = mergeExistingProjectStores(
      rawProjectStores,
      rawRegSites,
      state.erpProjects
    );
    state.items = mergeExistingCatalogItems(rawItems, rawMaterials);
    onUpdate({ ...state });
  };

  const unsubs: Array<() => void> = [
    subscribeCol<InventoryCategoryRecord>("inventoryCategories", (d) => {
      state.categories = d;
      emit();
    }),
    subscribeCol<InventoryItemRecord>("inventoryItems", (d) => {
      rawItems = d;
      emit();
    }),
    subscribeCol<any>("materials", (d) => {
      rawMaterials = d;
      emit();
    }),
    subscribeCol<WarehouseRecord>("warehouses", (d) => {
      rawWarehouses = d;
      emit();
    }),
    subscribeCol<RegisteredWarehouse>("registeredWarehouses", (d) => {
      rawRegWarehouses = d;
      emit();
    }),
    subscribeCol<ProjectStoreRecord>("projectStores", (d) => {
      rawProjectStores = d;
      emit();
    }),
    subscribeCol<RegisteredSite>("registeredSites", (d) => {
      rawRegSites = d;
      emit();
    }),
    subscribeCol<any>("projects", (d) => {
      state.erpProjects = d;
      emit();
    }),
    subscribeCol<any>("suppliers", (d) => {
      state.erpSuppliers = d;
      emit();
    }),
    subscribeCol<any>("procurements", (d) => {
      state.erpProcurements = d;
      emit();
    }),
    subscribeCol<any>("truckFleets", (d) => {
      state.erpTrucks = d;
      emit();
    }),
    subscribeCol<StockBalanceRecord>("stockBalances", (d) => {
      state.stockBalances = d;
      emit();
    }),
    subscribeCol<StockLedgerEntry>("stockLedger", (d) => {
      state.stockLedger = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<MaterialPlanRecord>("materialPlans", (d) => {
      state.materialPlans = d
        .map((p) => ({ ...p, items: Array.isArray(p?.items) ? p.items : [] }))
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      emit();
    }),
    subscribeCol<MaterialPlanRevisionRecord>("materialPlanRevisions", (d) => {
      state.materialPlanRevisions = [...d].sort((a, b) => (b.revisedAt || "").localeCompare(a.revisedAt || ""));
      emit();
    }),
    subscribeCol<any>("materialRequests", (d) => {
      state.materialRequests = d
        .map((r) => normalizeMaterialRequestRecord(r))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<MaterialApprovalRecord>("materialApprovals", (d) => {
      state.materialApprovals = [...d].sort((a, b) => (b.decidedAt || "").localeCompare(a.decidedAt || ""));
      emit();
    }),
    subscribeCol<GoodsReceivingVoucher>("goodsReceivingVouchers", (d) => {
      state.grvs = d
        .map((g) => ({ ...g, items: Array.isArray(g?.items) ? g.items : [] }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<GoodsIssueVoucher>("goodsIssueVouchers", (d) => {
      state.givs = d
        .map((g) => ({ ...g, items: Array.isArray(g?.items) ? g.items : [] }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<MaterialReturnVoucher>("materialReturnVouchers", (d) => {
      state.mrvs = d
        .map((m) => ({ ...m, items: Array.isArray(m?.items) ? m.items : [] }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<FixedAssetRecord>("fixedAssets", (d) => {
      state.fixedAssets = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<FixedAssetTransferOut>("fixedAssetTransfersOut", (d) => {
      state.fatovs = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<FixedAssetTransferIn>("fixedAssetTransfersIn", (d) => {
      state.fativs = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<TransportationRecord>("transportationRecords", (d) => {
      state.transports = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<GatePassRecord>("gatePasses", (d) => {
      state.gatePasses = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    subscribeCol<CommercialInvoiceRecord>("commercialInvoices", (d) => {
      state.commercialInvoices = [...d].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      emit();
    }),
    (() => {
      const activeCtx = actor?.role
        ? { role: actor.role, uid: actor.uid }
        : NotificationService.getActiveUserContext();
      const normalizedRole = activeCtx?.role ? normalizeNotificationRole(activeCtx.role) : "";
      const filterNotifs = (list: InventoryNotificationRecord[]): InventoryNotificationRecord[] => {
        const sorted = [...list].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        if (!activeCtx?.role) return sorted;
        return sorted.filter((n) =>
          NotificationService.isNotificationTargetedToUser(n as any, {
            role: activeCtx.role,
            uid: activeCtx.uid,
          })
        );
      };

      if (normalizedRole === "Pending") {
        state.notifications = [];
        emit();
        return () => {};
      }

      if (canQueryFirestore() && db) {
        const isBroadAccess =
          normalizedRole === UserRole.SUPER_ADMIN ||
          normalizedRole === UserRole.DIRECTOR ||
          normalizedRole === UserRole.HEAD_OFFICE;
        const aliases = normalizedRole ? getRoleMatchAliases(normalizedRole).slice(0, 10) : [];
        const notifQuery =
          !isBroadAccess && aliases.length > 0
            ? query(collection(db, "inventoryNotifications"), where("targetRoles", "array-contains-any", aliases))
            : collection(db, "inventoryNotifications");

        return onSnapshot(
          notifQuery,
          (snap) => {
            const docs = snap.docs.map((d) => ({
              ...(d.data() as InventoryNotificationRecord),
              id: (d.data() as any)?.id || d.id,
            }));
            const filtered = filterNotifs(docs);
            offlineEngine.saveCache("inventoryNotifications", filtered);
            state.notifications = filtered;
            emit();
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, "inventoryNotifications");
            state.notifications = filterNotifs(
              offlineEngine.getCache<InventoryNotificationRecord>("inventoryNotifications", [])
            );
            emit();
          }
        );
      }

      state.notifications = filterNotifs(
        offlineEngine.getCache<InventoryNotificationRecord>("inventoryNotifications", [])
      );
      emit();
      return () => {};
    })(),
    subscribeCol<InventoryAuditLogRecord>("inventoryAuditLogs", (d) => {
      state.auditLogs = [...d].sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      emit();
    }),
    subscribeCol<InventoryValuationSettingsRecord>(
      "inventorySettings",
      (d) => {
        const found = d.find((x) => x.id === "default") || d[0];
        if (found) {
          state.valuationSettings = found;
          emit();
        }
      },
      [DEFAULT_SETTINGS]
    ),
  ];

  // Hydrate initial read if offline cache empty
  if (canQueryFirestore() && db) {
    getDocs(collection(db, "inventorySettings"))
      .then((snap) => {
        const found = snap.docs
          .map((d) => ({ ...(d.data() as InventoryValuationSettingsRecord), id: d.id }))
          .find((x) => x.id === "default");
        if (found) {
          state.valuationSettings = found;
          emit();
        }
      })
      .catch(() => {});
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}

// Local-only transactional runner used ONLY when no Firebase Auth user session is active (dev demo role switch).
// When Firebase Auth IS signed in, ALL critical mutations execute strictly on the Express backend (/api/warehouse/*).
function isLiveAuthenticatedSession(): boolean {
  return Boolean(auth && auth.currentUser);
}

function getCache<T>(col: string, fallback: T[] = []): T[] {
  return offlineEngine.getCache<T>(col, fallback);
}
function saveCache<T>(col: string, data: T[]): void {
  offlineEngine.saveCache(col, data);
}
function upsertCache<T extends { id: string }>(col: string, docItem: T): void {
  const list = getCache<T>(col, []);
  const idx = list.findIndex((x) => x.id === docItem.id);
  saveCache(col, idx >= 0 ? [...list.slice(0, idx), docItem, ...list.slice(idx + 1)] : [docItem, ...list]);
}

function makeLocalAudit(params: {
  action: string;
  module: InventoryAuditLogRecord["module"];
  entityType: string;
  entityId: string;
  entityNumber?: string;
  details: string;
  actor: WarehouseActorContext;
  projectId?: string;
}): InventoryAuditLogRecord {
  const entry: InventoryAuditLogRecord = {
    id: `IAUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: params.action,
    module: params.module,
    entityType: params.entityType,
    entityId: params.entityId,
    entityNumber: params.entityNumber,
    details: params.details,
    projectId: params.projectId,
    actorUid: params.actor.uid,
    actorName: params.actor.name,
    actorRole: String(params.actor.role),
    timestamp: new Date().toISOString(),
  };
  upsertCache("inventoryAuditLogs", entry);
  return entry;
}

function makeLocalNotification(params: Parameters<typeof buildAndDispatchInventoryNotification>[0]): InventoryNotificationRecord {
  const notif = buildAndDispatchInventoryNotification(params);
  upsertCache("inventoryNotifications", notif);
  return notif;
}

// =========================================================================
// EXPORTED SERVICE API FOR UI & INTEGRATED ERP FLOWS
// =========================================================================
export const WarehouseStoreDataService = {
  // Master Data CRUD
  async saveCategory(category: InventoryCategoryRecord, actor: WarehouseActorContext): Promise<InventoryCategoryRecord> {
    if (!canPerformWarehouseModuleAction(actor.role, "MANAGE_MASTER_DATA")) {
      throw new Error("Only Warehouse Manager or Super Admin can manage inventory categories.");
    }
    const saved = await writeColDoc("inventoryCategories", category);
    await writeColDoc("inventoryAuditLogs", makeLocalAudit({
      action: "CATEGORY_SAVED",
      module: "MasterData",
      entityType: "InventoryCategory",
      entityId: saved.id,
      entityNumber: saved.code,
      details: `Saved inventory category ${saved.code} - ${saved.name} (${saved.inventoryType}).`,
      actor,
    }));
    return saved;
  },

  async deleteCategory(id: string, actor: WarehouseActorContext): Promise<void> {
    if (!canPerformWarehouseModuleAction(actor.role, "MANAGE_MASTER_DATA")) {
      throw new Error("Only Warehouse Manager or Super Admin can delete categories.");
    }
    await deleteColDoc("inventoryCategories", id);
  },

  async saveItem(item: InventoryItemRecord, actor: WarehouseActorContext): Promise<InventoryItemRecord> {
    if (!canPerformWarehouseModuleAction(actor.role, "MANAGE_MASTER_DATA")) {
      throw new Error("Only Warehouse Manager or Super Admin can manage inventory items.");
    }
    const saved = await writeColDoc("inventoryItems", item);
    await writeColDoc("inventoryAuditLogs", makeLocalAudit({
      action: "ITEM_SAVED",
      module: "MasterData",
      entityType: "InventoryItem",
      entityId: saved.id,
      entityNumber: saved.itemCode,
      details: `Saved item ${saved.itemCode} - ${saved.itemName} (${saved.inventoryType}, Min=${saved.minStockLevel}).`,
      actor,
    }));
    return saved;
  },

  async saveWarehouse(warehouse: WarehouseRecord, actor: WarehouseActorContext): Promise<WarehouseRecord> {
    if (
      !canPerformWarehouseModuleAction(actor.role, "MANAGE_MASTER_DATA") &&
      resolveExtendedWarehouseRole(actor.role) !== "operation_manager"
    ) {
      throw new Error("Only Warehouse Manager or Super Admin can register/update warehouses.");
    }
    const saved = await writeColDoc("warehouses", warehouse);
    await writeColDoc<any>("registeredWarehouses", {
      id: saved.id,
      code: saved.code,
      name: saved.name,
      locationRegion: saved.location,
      citySite: saved.location,
      address: saved.location,
      warehouseManager: saved.managerName || "Assigned Manager",
      managerPhone: "",
      status: saved.status === "Active" ? "Active" : "Inactive",
      registrationDate: saved.createdAt,
    });
    return saved;
  },

  async saveProjectStore(store: ProjectStoreRecord, actor: WarehouseActorContext): Promise<ProjectStoreRecord> {
    if (
      !canPerformWarehouseModuleAction(actor.role, "MANAGE_MASTER_DATA") &&
      resolveExtendedWarehouseRole(actor.role) !== "operation_manager"
    ) {
      throw new Error("Only Warehouse Manager, Operation Manager, or Super Admin can register Project Stores.");
    }
    const saved = await writeColDoc("projectStores", store);
    await writeColDoc<any>("registeredSites", {
      id: saved.id,
      projectName: saved.projectName || saved.storeName,
      region: saved.location,
      cityWoreda: saved.location,
      siteManager: saved.storeOwnerName || "Site Manager",
      status: saved.status === "Active" ? "Active" : "Completed",
      startDate: saved.createdAt,
    });
    return saved;
  },

  async markNotificationRead(id: string, uid: string): Promise<void> {
    const notifs = getCache<InventoryNotificationRecord>("inventoryNotifications", []);
    const target = notifs.find((n) => n.id === id);
    if (!target) return;
    const updated: InventoryNotificationRecord = {
      ...target,
      readByUids: Array.from(new Set([...(target.readByUids || []), uid])),
    };
    await writeColDoc("inventoryNotifications", updated);
  },

  // 1. MATERIAL PLANS & REVISIONS
  async createMaterialPlan(
    payload: {
      title: string;
      projectId: string;
      projectName: string;
      department?: string;
      items: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        specification?: string;
        inventoryType: "Consumable" | "Fixed Asset";
        unit: string;
        plannedQty: number;
        notes?: string;
      }>;
    },
    actor: WarehouseActorContext
  ): Promise<MaterialPlanRecord> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi<MaterialPlanRecord>("/api/warehouse/plans", "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_REVISE_MATERIAL_PLAN")) {
      throw new Error("Only Office Manager Engineer or Super Admin can create material plans.");
    }
    const existing = getCache<MaterialPlanRecord>("materialPlans", []);
    const now = new Date().toISOString();
    const plan: MaterialPlanRecord = {
      id: `PLAN-${Date.now()}`,
      planNumber: generateSequentialCode("MP", existing.map((p) => p.planNumber)),
      title: payload.title,
      projectId: payload.projectId,
      projectName: payload.projectName,
      department: payload.department || "Engineering",
      revisionNumber: 1,
      status: "Approved",
      items: payload.items.map((i) => ({
        ...i,
        specification: i.specification || "",
        consumedOrRequestedQty: 0,
      })),
      createdByUid: actor.uid,
      createdByName: actor.name,
      createdByRole: String(actor.role),
      submittedAt: now,
      approvedAt: now,
      approvedByUid: actor.uid,
      approvedByName: actor.name,
      createdAt: now,
      updatedAt: now,
    };
    upsertCache("materialPlans", plan);
    makeLocalAudit({
      action: "MATERIAL_PLAN_CREATED",
      module: "MaterialPlan",
      entityType: "MaterialPlan",
      entityId: plan.id,
      entityNumber: plan.planNumber,
      details: `Created Material Plan ${plan.planNumber} for ${plan.projectName}.`,
      projectId: plan.projectId,
      actor,
    });
    makeLocalNotification({
      eventType: "MATERIAL_PLAN_SUBMITTED",
      title: `New Material Plan ${plan.planNumber}`,
      message: `${actor.name} submitted ${plan.planNumber} (${plan.items.length} items).`,
      severity: "info",
      targetRoles: ["Warehouse Manager", "Site Manager", "Store Manager", "Director", "Project Manager"],
      projectId: plan.projectId,
      projectName: plan.projectName,
      referenceId: plan.id,
      referenceNumber: plan.planNumber,
      actorName: actor.name,
      actorRole: String(actor.role),
    });
    return plan;
  },

  async reviseMaterialPlan(
    planId: string,
    payload: { items: any[]; reason: string; changeSummary?: string },
    actor: WarehouseActorContext
  ): Promise<{ plan: MaterialPlanRecord; revision: MaterialPlanRevisionRecord }> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/plans/${planId}/revise`, "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_REVISE_MATERIAL_PLAN")) {
      throw new Error("Only Office Manager Engineer or Super Admin can revise material plans.");
    }
    const plans = getCache<MaterialPlanRecord>("materialPlans", []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) throw new Error("Material Plan not found.");
    const now = new Date().toISOString();
    const nextRev = (plan.revisionNumber || 1) + 1;
    const revision: MaterialPlanRevisionRecord = {
      id: `MPREV-${plan.id}-R${nextRev}-${Date.now()}`,
      planId: plan.id,
      planNumber: plan.planNumber,
      projectId: plan.projectId,
      projectName: plan.projectName,
      revisionNumber: nextRev,
      previousItemsSnapshot: plan.items,
      newItemsSnapshot: payload.items,
      changeSummary: payload.changeSummary || `Revision ${nextRev} updated`,
      reason: payload.reason,
      revisedByUid: actor.uid,
      revisedByName: actor.name,
      revisedByRole: String(actor.role),
      revisedAt: now,
    };
    const updated: MaterialPlanRecord = {
      ...plan,
      revisionNumber: nextRev,
      revisionReason: payload.reason,
      items: payload.items,
      status: "Approved",
      updatedAt: now,
    };
    upsertCache("materialPlans", updated);
    upsertCache("materialPlanRevisions", revision);
    makeLocalAudit({
      action: "MATERIAL_PLAN_REVISED",
      module: "MaterialPlan",
      entityType: "MaterialPlan",
      entityId: updated.id,
      entityNumber: updated.planNumber,
      details: `Revised ${updated.planNumber} to Rev ${nextRev}: ${payload.reason}`,
      projectId: updated.projectId,
      actor,
    });
    makeLocalNotification({
      eventType: "MATERIAL_PLAN_REVISED",
      title: `Material Plan ${updated.planNumber} Revised (Rev ${nextRev})`,
      message: `${actor.name} revised ${updated.planNumber}: ${payload.reason}`,
      severity: "warning",
      targetRoles: ["Warehouse Manager", "Site Manager", "Store Manager", "Director", "Project Manager"],
      projectId: updated.projectId,
      projectName: updated.projectName,
      referenceId: updated.id,
      referenceNumber: updated.planNumber,
      actorName: actor.name,
      actorRole: String(actor.role),
    });
    return { plan: updated, revision };
  },

  // 2. MATERIAL REQUESTS & PLAN COMPARISON
  async createMaterialRequest(
    payload: {
      planId: string;
      projectId: string;
      projectName: string;
      projectStoreId: string;
      projectStoreName: string;
      warehouseId: string;
      warehouseName: string;
      requiredByDate?: string;
      purpose: string;
      items: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        specification?: string;
        inventoryType: "Consumable" | "Fixed Asset";
        unit: string;
        requestedQty: number;
      }>;
    },
    actor: WarehouseActorContext
  ): Promise<EngineeringMaterialRequest> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi<EngineeringMaterialRequest>("/api/warehouse/requests", "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_MATERIAL_REQUEST")) {
      throw new Error("Only Site Manager, Store Manager, or Super Admin can submit material requests.");
    }
    const plans = getCache<MaterialPlanRecord>("materialPlans", []);
    const plan = plans.find((p) => p.id === payload.planId);
    if (!plan) throw new Error("Linked Material Plan not found.");
    const existingReqs = getCache<EngineeringMaterialRequest>("materialRequests", []);
    const balances = getCache<StockBalanceRecord>("stockBalances", []);
    const comparison = compareMaterialRequestAgainstPlan({
      plan,
      requestedItems: payload.items.map((it) => ({
        ...it,
        specification: it.specification || "",
      })),
      existingRequestsForPlan: existingReqs.filter((r) => r.planId === plan.id),
      warehouseBalances: balances,
      warehouseId: payload.warehouseId,
    });
    const now = new Date().toISOString();
    const requestId = `MREQ-${Date.now()}`;
    const reqDoc: EngineeringMaterialRequest = {
      id: requestId,
      requestNumber: generateSequentialCode("MRQ", existingReqs.map((r) => r.requestNumber)),
      planId: plan.id,
      planNumber: plan.planNumber,
      planRevisionNumber: plan.revisionNumber,
      projectId: payload.projectId,
      projectName: payload.projectName,
      projectStoreId: payload.projectStoreId,
      projectStoreName: payload.projectStoreName,
      warehouseId: payload.warehouseId,
      warehouseName: payload.warehouseName,
      requestedDate: now.slice(0, 10),
      requiredByDate: payload.requiredByDate,
      purpose: payload.purpose,
      status: "Submitted",
      hasPlanMismatch: comparison.hasMismatch,
      mismatchSummary: comparison.mismatchSummary || undefined,
      items: comparison.comparedItems.map((i) => ({ ...i, requestId })),
      requestedByUid: actor.uid,
      requestedByName: actor.name,
      requestedByRole: String(actor.role),
      createdAt: now,
      updatedAt: now,
    };
    upsertCache("materialRequests", reqDoc);
    makeLocalAudit({
      action: "MATERIAL_REQUEST_SUBMITTED",
      module: "MaterialRequest",
      entityType: "MaterialRequest",
      entityId: reqDoc.id,
      entityNumber: reqDoc.requestNumber,
      details: `Submitted request ${reqDoc.requestNumber} vs ${plan.planNumber}.`,
      projectId: reqDoc.projectId,
      actor,
    });
    makeLocalNotification({
      eventType: "MATERIAL_REQUEST_SUBMITTED",
      title: `Material Request ${reqDoc.requestNumber} Submitted`,
      message: `${actor.name} requested ${reqDoc.items.length} item(s).`,
      severity: reqDoc.hasPlanMismatch ? "warning" : "info",
      targetRoles: ["Warehouse Manager", "Office & Technical Engineering"],
      projectId: reqDoc.projectId,
      projectName: reqDoc.projectName,
      referenceId: reqDoc.id,
      referenceNumber: reqDoc.requestNumber,
      actorName: actor.name,
      actorRole: String(actor.role),
    });
    return reqDoc;
  },

  // 3. WAREHOUSE MANAGER VERIFY OR RETURN REQUEST
  async verifyOrReturnRequest(
    requestId: string,
    payload: { action: "verify" | "return"; remarks?: string; reason?: string },
    actor: WarehouseActorContext
  ): Promise<{ request: EngineeringMaterialRequest; approval: MaterialApprovalRecord }> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/requests/${requestId}/verify`, "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "VERIFY_RETURN_MATERIAL_REQUEST")) {
      throw new Error("Only Warehouse Manager or Super Admin can verify/return requests.");
    }
    const reqs = getCache<EngineeringMaterialRequest>("materialRequests", []);
    const reqDoc = reqs.find((r) => r.id === requestId);
    if (!reqDoc) throw new Error("Material Request not found.");
    const plans = getCache<MaterialPlanRecord>("materialPlans", []);
    const plan = plans.find((p) => p.id === reqDoc.planId);
    if (!plan) throw new Error("Linked Material Plan not found.");
    const balances = getCache<StockBalanceRecord>("stockBalances", []);
    const liveCompare = compareMaterialRequestAgainstPlan({
      plan,
      requestedItems: reqDoc.items.map((i) => ({
        itemId: i.itemId,
        itemCode: i.itemCode,
        itemName: i.itemName,
        specification: i.specification,
        inventoryType: i.inventoryType,
        unit: i.unit,
        requestedQty: i.requestedQty,
      })),
      existingRequestsForPlan: reqs.filter((r) => r.planId === plan.id),
      warehouseBalances: balances,
      warehouseId: reqDoc.warehouseId,
      excludeRequestId: reqDoc.id,
    });
    if (payload.action === "verify" && liveCompare.hasMismatch) {
      throw new Error(`Verification blocked due to Plan/Stock Mismatch: ${liveCompare.mismatchSummary}`);
    }
    if (payload.action === "return" && !String(payload.reason || payload.remarks || "").trim()) {
      throw new Error("Return reason is mandatory.");
    }
    const now = new Date().toISOString();
    const nextStatus =
      payload.action === "verify" ? "Verified Pending Director" : "Returned by Warehouse Manager";
    const updatedReq: EngineeringMaterialRequest = {
      ...reqDoc,
      items: liveCompare.comparedItems.map((i) => ({ ...i, requestId: reqDoc.id })),
      hasPlanMismatch: liveCompare.hasMismatch,
      mismatchSummary: liveCompare.mismatchSummary || undefined,
      status: nextStatus,
      warehouseVerifiedByUid: actor.uid,
      warehouseVerifiedByName: actor.name,
      warehouseVerifiedAt: now,
      warehouseRemarks: payload.remarks || payload.reason || "",
      returnedReason: payload.action === "return" ? payload.reason || payload.remarks : undefined,
      updatedAt: now,
    };
    const approval: MaterialApprovalRecord = {
      id: `APPR-WH-${reqDoc.id}-${Date.now()}`,
      requestId: reqDoc.id,
      requestNumber: reqDoc.requestNumber,
      planId: reqDoc.planId,
      stage: "Warehouse Manager Verification",
      decision: nextStatus,
      decisionByUid: actor.uid,
      decisionByName: actor.name,
      decisionByRole: String(actor.role),
      comments: payload.remarks || payload.reason || "",
      mismatchDetails: liveCompare.mismatchSummary || undefined,
      isPermanent: false,
      decidedAt: now,
    };
    upsertCache("materialRequests", updatedReq);
    upsertCache("materialApprovals", approval);
    makeLocalAudit({
      action: payload.action === "verify" ? "WAREHOUSE_VERIFIED_REQUEST" : "WAREHOUSE_RETURNED_REQUEST",
      module: "MaterialRequest",
      entityType: "MaterialRequest",
      entityId: updatedReq.id,
      entityNumber: updatedReq.requestNumber,
      details: `${actor.name} set ${updatedReq.requestNumber} -> ${nextStatus}.`,
      projectId: updatedReq.projectId,
      actor,
    });
    makeLocalNotification({
      eventType: payload.action === "verify" ? "MATERIAL_REQUEST_VERIFIED" : "MATERIAL_REQUEST_RETURNED",
      title:
        payload.action === "verify"
          ? `Request ${updatedReq.requestNumber} Verified — Awaiting Director Approval`
          : `Request ${updatedReq.requestNumber} Returned by Warehouse Manager`,
      message: approval.comments || updatedReq.requestNumber,
      severity: payload.action === "verify" ? "info" : "warning",
      targetRoles:
        payload.action === "verify"
          ? ["Director", "Super Admin"]
          : ["Site Manager", "Store Manager", "Office & Technical Engineering"],
      projectId: updatedReq.projectId,
      projectName: updatedReq.projectName,
      referenceId: updatedReq.id,
      referenceNumber: updatedReq.requestNumber,
      actorName: actor.name,
      actorRole: String(actor.role),
    });
    return { request: updatedReq, approval };
  },

  // 4. DIRECTOR FINAL APPROVAL ONLY
  async submitDirectorDecision(
    requestId: string,
    payload: { decision: "Director Approved" | "Director Disapproved"; comments?: string; reason?: string },
    actor: WarehouseActorContext
  ): Promise<{ request: EngineeringMaterialRequest; approval: MaterialApprovalRecord }> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/requests/${requestId}/director-decision`, "POST", payload);
    }
    if (!isStrictDirectorRole(actor.role)) {
      throw new Error("Access Denied: Only the Director is authorized to give final Approval or Disapproval.");
    }
    const reqs = getCache<EngineeringMaterialRequest>("materialRequests", []);
    const reqDoc = reqs.find((r) => r.id === requestId);
    if (!reqDoc) throw new Error("Material Request not found.");
    if (reqDoc.directorDecisionPermanent || reqDoc.status === "Director Approved" || reqDoc.status === "Director Disapproved") {
      throw new Error("Director final decision is permanent and cannot be modified.");
    }
    if (reqDoc.status !== "Verified Pending Director") {
      throw new Error("Request must be verified by Warehouse Manager before Director decision.");
    }
    if (payload.decision === "Director Disapproved" && !String(payload.reason || payload.comments || "").trim()) {
      throw new Error("Mandatory reason required when Disapproving.");
    }
    const now = new Date().toISOString();
    const updated: EngineeringMaterialRequest = {
      ...reqDoc,
      status: payload.decision,
      directorDecisionByUid: actor.uid,
      directorDecisionByName: actor.name,
      directorDecisionByRole: String(actor.role),
      directorDecisionAt: now,
      directorDecisionPermanent: true,
      directorComments: payload.comments || "",
      disapprovalReason: payload.decision === "Director Disapproved" ? payload.reason || payload.comments : undefined,
      items: reqDoc.items.map((it) => ({
        ...it,
        approvedQty: payload.decision === "Director Approved" ? it.requestedQty : 0,
        remainingDispatchQty: payload.decision === "Director Approved" ? it.requestedQty : 0,
      })),
      updatedAt: now,
    };
    const approval: MaterialApprovalRecord = {
      id: `APPR-DIR-${reqDoc.id}-${Date.now()}`,
      requestId: reqDoc.id,
      requestNumber: reqDoc.requestNumber,
      planId: reqDoc.planId,
      stage: "Director Final Decision",
      decision: payload.decision,
      decisionByUid: actor.uid,
      decisionByName: actor.name,
      decisionByRole: String(actor.role),
      comments: payload.comments || payload.reason || "",
      isPermanent: true,
      decidedAt: now,
    };
    upsertCache("materialRequests", updated);
    upsertCache("materialApprovals", approval);
    makeLocalAudit({
      action: payload.decision === "Director Approved" ? "DIRECTOR_APPROVED_REQUEST" : "DIRECTOR_DISAPPROVED_REQUEST",
      module: "MaterialRequest",
      entityType: "MaterialRequest",
      entityId: updated.id,
      entityNumber: updated.requestNumber,
      details: `${actor.name} permanently set ${updated.requestNumber} -> ${payload.decision}.`,
      projectId: updated.projectId,
      actor,
    });
    makeLocalNotification({
      eventType:
        payload.decision === "Director Approved"
          ? "MATERIAL_REQUEST_DIRECTOR_APPROVED"
          : "MATERIAL_REQUEST_DIRECTOR_DISAPPROVED",
      title: `Request ${updated.requestNumber}: ${payload.decision}`,
      message: payload.decision === "Director Approved" ? "Approved for dispatch." : `Disapproved: ${updated.disapprovalReason}`,
      severity: payload.decision === "Director Approved" ? "success" : "critical",
      targetRoles: ["Warehouse Manager", "Site Manager", "Store Manager", "Office & Technical Engineering", "Project Manager"],
      projectId: updated.projectId,
      projectName: updated.projectName,
      referenceId: updated.id,
      referenceNumber: updated.requestNumber,
      actorName: actor.name,
      actorRole: String(actor.role),
    });
    return { request: updated, approval };
  },

  // 5. GRV CREATION & FINALIZATION WITH MANDATORY COMMERCIAL INVOICE
  async finalizeGrv(
    payload: {
      warehouseId: string;
      warehouseName: string;
      supplierId?: string;
      supplierName: string;
      poNumber?: string;
      procurementId?: string;
      receivedDate?: string;
      remarks?: string;
      commercialInvoice: {
        invoiceNumber: string;
        invoiceDate: string;
        fileUrl: string;
        fileName: string;
        mimeType: string;
        fileSizeBytes?: number;
        currency?: string;
      };
      items: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        inventoryType: "Consumable" | "Fixed Asset";
        unit: string;
        quantityReceived: number;
        unitCost: number;
        batchNumber?: string;
        expiryDate?: string;
        serialNumbers?: string[];
        condition?: "Good" | "Damaged" | "Defective" | "Under Inspection" | "Not Reusable";
      }>;
    },
    actor: WarehouseActorContext
  ): Promise<{ grv: GoodsReceivingVoucher; commercialInvoice: CommercialInvoiceRecord; createdAssets: FixedAssetRecord[] }> {
    let result: { grv: GoodsReceivingVoucher; commercialInvoice: CommercialInvoiceRecord; createdAssets: FixedAssetRecord[] };

    if (isLiveAuthenticatedSession()) {
      const apiRes = await callWarehouseApi<any>("/api/warehouse/grv", "POST", payload);
      result = {
        grv: apiRes.grv,
        commercialInvoice: apiRes.commercialInvoice,
        createdAssets: apiRes.createdAssets ?? apiRes.fixedAssetsCreated ?? [],
      };
    } else {
      if (!canPerformWarehouseModuleAction(actor.role, "CREATE_FINALIZE_GRV")) {
        throw new Error("Only Warehouse Manager or Super Admin can finalize GRVs.");
      }
      const invCheck = validateCommercialInvoiceForGrv({
        invoiceNumber: payload.commercialInvoice?.invoiceNumber,
        invoiceDate: payload.commercialInvoice?.invoiceDate,
        supplierId: payload.supplierId || "SUP-1",
        supplierName: payload.supplierName,
        fileUrl: payload.commercialInvoice?.fileUrl,
        fileName: payload.commercialInvoice?.fileName,
        mimeType: payload.commercialInvoice?.mimeType,
      });
      if (!invCheck.valid) {
        throw new Error(invCheck.errors.join(" "));
      }
      const settings =
        getCache<InventoryValuationSettingsRecord>("inventorySettings", [DEFAULT_SETTINGS])[0] ||
        DEFAULT_SETTINGS;
      const existingGrvs = getCache<GoodsReceivingVoucher>("goodsReceivingVouchers", []);
      const existingBalances = getCache<StockBalanceRecord>("stockBalances", []);
      const existingAssets = getCache<FixedAssetRecord>("fixedAssets", []);
      const now = new Date().toISOString();
      const grvNumber = generateSequentialCode("GRV", existingGrvs.map((g) => g.grvNumber));
      const grvId = `GRV-${Date.now()}`;
      const invoiceId = `CINV-${Date.now()}`;

      const invoiceDoc: CommercialInvoiceRecord = {
        id: invoiceId,
        invoiceNumber: payload.commercialInvoice.invoiceNumber,
        invoiceDate: payload.commercialInvoice.invoiceDate,
        supplierId: payload.supplierId || "SUP-1",
        supplierName: payload.supplierName,
        poNumber: payload.poNumber,
        grvId,
        grvNumber,
        fileUrl: payload.commercialInvoice.fileUrl,
        fileName: payload.commercialInvoice.fileName,
        mimeType: payload.commercialInvoice.mimeType,
        fileSizeBytes: payload.commercialInvoice.fileSizeBytes || 0,
        totalAmount: 0,
        currency: payload.commercialInvoice.currency || "ETB",
        replacementHistory: [],
        uploadedByUid: actor.uid,
        uploadedByName: actor.name,
        uploadedByRole: String(actor.role),
        createdAt: now,
        updatedAt: now,
      };

      const createdAssets: FixedAssetRecord[] = [];
      const poolIds = existingAssets.map((a) => a.assetId);
      let grandTotal = 0;

      const normalizedLines = payload.items.map((line, idx) => {
        const lineTotal = round2(line.quantityReceived * line.unitCost);
        grandTotal = round2(grandTotal + lineTotal);

        const balKey = `${payload.warehouseId}__${line.itemId}`;
        const prevBal: StockBalanceRecord =
          existingBalances.find((b) => b.id === balKey || (b.locationId === payload.warehouseId && b.itemId === line.itemId)) || {
            id: balKey,
            locationType: "Warehouse",
            locationId: payload.warehouseId,
            locationName: payload.warehouseName,
            itemId: line.itemId,
            itemCode: line.itemCode,
            itemName: line.itemName,
            categoryName: "General",
            inventoryType: line.inventoryType,
            unit: line.unit,
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
            minStockLevel: 10,
            reorderPoint: 15,
            valuationMethod: settings.valuationMethod,
            averageUnitCost: 0,
            totalValuation: 0,
            fifoLayers: [],
            lastMovementAt: now,
            updatedAt: now,
          };

        const updatedBal = applyInboundCostLayer({
          balance: prevBal,
          qtyIn: line.quantityReceived,
          unitCost: line.unitCost,
          grvId,
          grvNumber,
          receivedDate: payload.receivedDate || now.slice(0, 10),
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          valuationMethod: settings.valuationMethod,
        });
        const ebIdx = existingBalances.findIndex((b) => b.id === updatedBal.id);
        if (ebIdx >= 0) existingBalances[ebIdx] = updatedBal;
        else existingBalances.push(updatedBal);
        upsertCache("stockBalances", updatedBal);

        const ledgerEntry: StockLedgerEntry = {
          id: `LEDGER-GRV-${grvNumber}-${idx}-${Date.now()}`,
          voucherType: "GRV",
          voucherId: grvId,
          voucherNo: grvNumber,
          originalGrvNumber: grvNumber,
          locationType: "Warehouse",
          locationId: payload.warehouseId,
          locationName: payload.warehouseName,
          itemId: line.itemId,
          itemCode: line.itemCode,
          itemName: line.itemName,
          inventoryType: line.inventoryType,
          unit: line.unit,
          direction: "IN",
          quantity: line.quantityReceived,
          quantityDelta: line.quantityReceived,
          quarantineDelta: 0,
          unitCost: line.unitCost,
          totalCost: lineTotal,
          valuationMethodUsed: settings.valuationMethod,
          openingBefore: prevBal.availableQty,
          balanceAfter: updatedBal.availableQty,
          quarantineAfter: updatedBal.quarantineQty,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          condition: line.condition || "Good",
          createdByUid: actor.uid,
          createdByName: actor.name,
          createdByRole: String(actor.role),
          createdAt: now,
        };
        upsertCache("stockLedger", ledgerEntry);

        if (line.inventoryType === "Fixed Asset") {
          const count = Math.max(1, Math.floor(line.quantityReceived));
          for (let unitIdx = 0; unitIdx < count; unitIdx++) {
            const assetId = generatePermanentAssetId(poolIds);
            poolIds.push(assetId);
            const serial =
              line.serialNumbers?.[unitIdx] ||
              `${line.itemCode}-${grvNumber}-${String(unitIdx + 1).padStart(3, "0")}`;
            const asset: FixedAssetRecord = {
              id: `FA-${Date.now()}-${idx}-${unitIdx}`,
              assetId,
              itemId: line.itemId,
              itemCode: line.itemCode,
              assetName: line.itemName,
              description: line.itemName,
              categoryName: "Fixed Asset",
              serialNumber: serial,
              originalGrvId: grvId,
              originalGrvNumber: grvNumber,
              commercialInvoiceId: invoiceId,
              commercialInvoiceNo: invoiceDoc.invoiceNumber,
              purchaseDate: payload.receivedDate || now.slice(0, 10),
              purchaseCost: line.unitCost,
              currentLocationType: "Warehouse",
              currentLocationId: payload.warehouseId,
              currentLocationName: payload.warehouseName,
              issuerName: payload.supplierName,
              receiverName: actor.name,
              status: "In Warehouse",
              condition: line.condition || "Good",
              transferHistory: [
                {
                  id: `FAHIST-${Date.now()}-${unitIdx}`,
                  date: payload.receivedDate || now.slice(0, 10),
                  voucherType: "GRV",
                  voucherNumber: grvNumber,
                  fromLocation: `Supplier: ${payload.supplierName}`,
                  toLocation: payload.warehouseName,
                  issuerName: payload.supplierName,
                  receiverName: actor.name,
                  condition: line.condition || "Good",
                  notes: `Initial BIG BALANCE capitalization (Invoice ${invoiceDoc.invoiceNumber})`,
                },
              ],
              createdAt: now,
              updatedAt: now,
            };
            createdAssets.push(asset);
            upsertCache("fixedAssets", asset);
          }
        }

        return {
          itemId: line.itemId,
          itemCode: line.itemCode,
          itemName: line.itemName,
          inventoryType: line.inventoryType,
          unit: line.unit,
          quantityReceived: line.quantityReceived,
          unitCost: line.unitCost,
          totalCost: lineTotal,
          batchNumber: line.batchNumber,
          expiryDate: line.expiryDate,
          serialNumbers: line.serialNumbers,
          condition: line.condition || "Good",
        };
      });

      invoiceDoc.totalAmount = grandTotal;
      upsertCache("commercialInvoices", invoiceDoc);

      const grvDoc: GoodsReceivingVoucher = {
        id: grvId,
        grvNumber,
        warehouseId: payload.warehouseId,
        warehouseName: payload.warehouseName,
        supplierId: payload.supplierId || "SUP-1",
        supplierName: payload.supplierName,
        poNumber: payload.poNumber,
        procurementId: payload.procurementId,
        commercialInvoiceId: invoiceDoc.id,
        commercialInvoiceNo: invoiceDoc.invoiceNumber,
        commercialInvoiceDate: invoiceDoc.invoiceDate,
        commercialInvoiceUrl: invoiceDoc.fileUrl,
        commercialInvoiceFileName: invoiceDoc.fileName,
        commercialInvoiceMimeType: invoiceDoc.mimeType,
        receivedDate: payload.receivedDate || now.slice(0, 10),
        status: "Completed",
        items: normalizedLines,
        totalAmount: grandTotal,
        receivedByUid: actor.uid,
        receivedByName: actor.name,
        receivedByRole: String(actor.role),
        remarks: payload.remarks,
        createdAt: now,
        updatedAt: now,
      };
      upsertCache("goodsReceivingVouchers", grvDoc);
      makeLocalAudit({
        action: "GRV_COMPLETED",
        module: "GRV",
        entityType: "GoodsReceivingVoucher",
        entityId: grvDoc.id,
        entityNumber: grvDoc.grvNumber,
        details: `Completed GRV ${grvDoc.grvNumber} with Commercial Invoice ${invoiceDoc.invoiceNumber}. Value: ${grandTotal}.`,
        actor,
      });
      makeLocalNotification({
        eventType: "GRV_COMPLETED",
        title: `GRV ${grvDoc.grvNumber} Completed`,
        message: `Received ${grvDoc.items.length} line(s) from ${grvDoc.supplierName} (Invoice ${invoiceDoc.invoiceNumber}).`,
        severity: "success",
        targetRoles: ["Finance Manager", "Director", "Operation Manager"],
        referenceId: grvDoc.id,
        referenceNumber: grvDoc.grvNumber,
        actorName: actor.name,
        actorRole: String(actor.role),
      });
      result = { grv: grvDoc, commercialInvoice: invoiceDoc, createdAssets };
    }

    // Bridge completed GRV directly to Finance ERP actualCostEntries (best-effort integration)
    try {
      await writeColDoc<any>("actualCostEntries", {
        id: `COST-GRV-${result.grv.id}`,
        projectId: "CENTRAL-WAREHOUSE",
        projectName: result.grv.warehouseName,
        category: "Materials & Equipment Procurement",
        description: `${result.grv.grvNumber} — ${result.grv.supplierName} (Inv ${result.grv.commercialInvoiceNo})`,
        amount: result.grv.totalAmount,
        date: result.grv.receivedDate,
        referenceVoucherNo: result.grv.grvNumber,
        recordedBy: actor.name,
        createdAt: result.grv.createdAt,
      });
    } catch {
      // Non-blocking finance sync
    }

    return result;
  },

  async replaceCommercialInvoice(
    invoiceId: string,
    payload: {
      newInvoiceNumber?: string;
      newFileUrl: string;
      newFileName: string;
      newMimeType: string;
      reason: string;
    },
    actor: WarehouseActorContext
  ): Promise<CommercialInvoiceRecord> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/invoices/${invoiceId}/replace`, "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "REPLACE_COMMERCIAL_INVOICE")) {
      throw new Error("Only Warehouse Manager or Super Admin can replace commercial invoices.");
    }
    const list = getCache<CommercialInvoiceRecord>("commercialInvoices", []);
    const existing = list.find((c) => c.id === invoiceId);
    if (!existing) throw new Error("Commercial Invoice not found.");
    const now = new Date().toISOString();
    const updated: CommercialInvoiceRecord = {
      ...existing,
      invoiceNumber: payload.newInvoiceNumber || existing.invoiceNumber,
      fileUrl: payload.newFileUrl,
      fileName: payload.newFileName,
      mimeType: payload.newMimeType,
      replacementHistory: [
        ...(existing.replacementHistory || []),
        {
          id: `INVREP-${Date.now()}`,
          previousInvoiceNumber: existing.invoiceNumber,
          previousFileName: existing.fileName,
          previousFileUrl: existing.fileUrl,
          newInvoiceNumber: payload.newInvoiceNumber || existing.invoiceNumber,
          newFileName: payload.newFileName,
          newFileUrl: payload.newFileUrl,
          reason: payload.reason,
          replacedByUid: actor.uid,
          replacedByName: actor.name,
          replacedByRole: String(actor.role),
          replacedAt: now,
        },
      ],
      updatedAt: now,
    };
    upsertCache("commercialInvoices", updated);
    makeLocalAudit({
      action: "COMMERCIAL_INVOICE_REPLACED",
      module: "CommercialInvoice",
      entityType: "CommercialInvoice",
      entityId: updated.id,
      entityNumber: updated.invoiceNumber,
      details: `Replaced attachment on ${updated.invoiceNumber}: ${payload.reason}`,
      actor,
    });
    return updated;
  },

  // 6. DISPATCH CONFIRMATION (GIV PARTIAL/FULL OR FATOV)
  async dispatchConsumablesGiv(
    payload: {
      requestId: string;
      vehicleNumber: string;
      driverName: string;
      driverPhone?: string;
      dispatchItems: Array<{ itemId: string; itemCode?: string; dispatchQty: number }>;
    },
    actor: WarehouseActorContext
  ): Promise<{
    giv: GoodsIssueVoucher;
    request: EngineeringMaterialRequest;
    transport: TransportationRecord;
    gatePass: GatePassRecord;
  }> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/dispatch", "POST", {
        dispatchType: "GIV",
        ...payload,
      });
    }
    if (!canPerformWarehouseModuleAction(actor.role, "PREPARE_CONFIRM_DISPATCH_GIV")) {
      throw new Error("Only Warehouse Manager or Super Admin can dispatch GIV.");
    }
    const reqs = getCache<EngineeringMaterialRequest>("materialRequests", []);
    const matReq = reqs.find((r) => r.id === payload.requestId);
    if (!matReq) throw new Error("Material Request not found.");
    if (matReq.status !== "Director Approved" && matReq.status !== "Partially Dispatched") {
      throw new Error(`Dispatch blocked! Request ${matReq.requestNumber} must be Director Approved first.`);
    }
    const settings =
      getCache<InventoryValuationSettingsRecord>("inventorySettings", [DEFAULT_SETTINGS])[0] ||
      DEFAULT_SETTINGS;
    const balances = getCache<StockBalanceRecord>("stockBalances", []);
    const existingGivs = getCache<GoodsIssueVoucher>("goodsIssueVouchers", []);
    const existingTrns = getCache<TransportationRecord>("transportationRecords", []);
    const existingGps = getCache<GatePassRecord>("gatePasses", []);

    const givNumber = generateSequentialCode("GIV", existingGivs.map((g) => g.givNumber));
    const transportNumber = generateSequentialCode("TRN", existingTrns.map((t) => t.transportNumber));
    const gatePassNumber = generateSequentialCode("GP", existingGps.map((g) => g.gatePassNumber));
    const givId = `GIV-${Date.now()}`;
    const transportId = `TRN-${Date.now()}`;
    const gatePassId = `GP-${Date.now()}`;
    const now = new Date().toISOString();

    const updatedItems: MaterialRequestItem[] = matReq.items.map((i) => ({ ...i }));
    const givLines: any[] = [];
    let totalCost = 0;
    let totalQty = 0;

    for (const di of payload.dispatchItems) {
      if (di.dispatchQty <= 0) continue;
      const line = updatedItems.find((i) => i.itemId === di.itemId || i.itemCode === di.itemCode);
      if (!line) throw new Error(`Item ${di.itemId} not on request.`);
      if (di.dispatchQty > line.remainingDispatchQty + 1e-6) {
        throw new Error(`Over-issue blocked for ${line.itemName}: remaining ${line.remainingDispatchQty}.`);
      }
      const whBal = balances.find(
        (b) => b.locationType === "Warehouse" && b.locationId === matReq.warehouseId && b.itemId === line.itemId
      );
      if (!whBal) throw new Error(`No stock balance in warehouse for ${line.itemName}.`);
      const ded = applyOutboundStockDeduction({
        balance: whBal,
        qtyOut: di.dispatchQty,
        mode: "ISSUE",
        valuationMethod: settings.valuationMethod,
      });
      upsertCache("stockBalances", ded.updatedBalance);
      const prevDisp = line.dispatchedQty;
      line.dispatchedQty = round4(prevDisp + di.dispatchQty);
      line.remainingDispatchQty = Math.max(0, round4(line.approvedQty - line.dispatchedQty));
      totalCost = round2(totalCost + ded.totalCost);
      totalQty = round2(totalQty + di.dispatchQty);

      upsertCache("stockLedger", {
        id: `LEDGER-GIV-${givNumber}-${Date.now()}-${line.itemId}`,
        voucherType: "GIV",
        voucherId: givId,
        voucherNo: givNumber,
        referenceRequestId: matReq.id,
        locationType: "Warehouse",
        locationId: matReq.warehouseId,
        locationName: matReq.warehouseName,
        projectId: matReq.projectId,
        projectName: matReq.projectName,
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        inventoryType: line.inventoryType,
        unit: line.unit,
        direction: "OUT",
        quantity: di.dispatchQty,
        quantityDelta: -di.dispatchQty,
        quarantineDelta: 0,
        unitCost: ded.unitCostUsed,
        totalCost: ded.totalCost,
        valuationMethodUsed: settings.valuationMethod,
        openingBefore: whBal.availableQty,
        balanceAfter: ded.updatedBalance.availableQty,
        quarantineAfter: ded.updatedBalance.quarantineQty,
        createdByUid: actor.uid,
        createdByName: actor.name,
        createdByRole: String(actor.role),
        createdAt: now,
      } as StockLedgerEntry);

      givLines.push({
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        unit: line.unit,
        approvedQty: line.approvedQty,
        previouslyDispatchedQty: prevDisp,
        dispatchedQty: di.dispatchQty,
        remainingPendingQty: line.remainingDispatchQty,
        unitCost: ded.unitCostUsed,
        totalCost: ded.totalCost,
      });
    }

    if (givLines.length === 0) throw new Error("At least one item with positive dispatchQty is required.");

    const allDone = updatedItems.every((i) => i.remainingDispatchQty <= 1e-6);
    const updatedReq: EngineeringMaterialRequest = {
      ...matReq,
      items: updatedItems,
      status: allDone ? "Fully Dispatched" : "Partially Dispatched",
      updatedAt: now,
    };
    const itemsSummary = givLines.map((l) => `${l.itemCode} (${l.dispatchedQty} ${l.unit})`).join(", ");
    const qr = await generateGatePassVerification({
      gatePassNumber,
      voucherType: "GIV",
      voucherId: givId,
      vehicleNumber: payload.vehicleNumber,
      itemsSummary,
    });
    const giv: GoodsIssueVoucher = {
      id: givId,
      givNumber,
      requestId: matReq.id,
      requestNumber: matReq.requestNumber,
      directorApprovalId: `DIR-${matReq.id}`,
      warehouseId: matReq.warehouseId,
      warehouseName: matReq.warehouseName,
      projectId: matReq.projectId,
      projectName: matReq.projectName,
      projectStoreId: matReq.projectStoreId,
      projectStoreName: matReq.projectStoreName,
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
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
    const transport: TransportationRecord = {
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
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      itemsSummary,
      status: "Dispatched",
      statusHistory: [
        { status: "Dispatched", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: String(actor.role) },
      ],
      dispatchedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const gatePass: GatePassRecord = {
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
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
      itemsSummary,
      totalQuantity: totalQty,
      qrVerificationCode: qr.qrVerificationCode,
      verificationHash: qr.verificationHash,
      status: "Issued",
      issuedByUid: actor.uid,
      issuedByName: actor.name,
      issuedByRole: String(actor.role),
      issuedAt: now,
      lockedForEdit: true,
      createdAt: now,
      updatedAt: now,
    };
    upsertCache("materialRequests", updatedReq);
    upsertCache("goodsIssueVouchers", giv);
    upsertCache("transportationRecords", transport);
    upsertCache("gatePasses", gatePass);
    makeLocalAudit({
      action: allDone ? "GIV_FULL_DISPATCH" : "GIV_PARTIAL_DISPATCH",
      module: "GIVDispatch",
      entityType: "GoodsIssueVoucher",
      entityId: giv.id,
      entityNumber: givNumber,
      details: `${givNumber} dispatched (${updatedReq.status}). Gate Pass ${gatePassNumber}.`,
      projectId: matReq.projectId,
      actor,
    });
    makeLocalNotification({
      eventType: allDone ? "FULL_DISPATCH_PERFORMED" : "PARTIAL_DISPATCH_PERFORMED",
      title: `${givNumber} Dispatched (${updatedReq.status})`,
      message: `Gate Pass ${gatePassNumber} generated for ${matReq.projectStoreName}.`,
      severity: "info",
      targetRoles: ["Site Manager", "Store Manager", "Gate Security Officer", "Material Handling", "Operation Manager"],
      projectId: matReq.projectId,
      projectName: matReq.projectName,
      referenceId: giv.id,
      referenceNumber: givNumber,
      actorName: actor.name,
      actorRole: String(actor.role),
    });
    return { giv, request: updatedReq, transport, gatePass };
  },

  async dispatchFixedAssetFatov(
    payload: {
      assetDocId: string;
      toLocationType: "Warehouse" | "ProjectStore";
      toLocationId: string;
      toLocationName: string;
      projectId?: string;
      projectName?: string;
      requestId?: string;
      requestNumber?: string;
      vehicleNumber: string;
      driverName: string;
      driverPhone?: string;
      conditionSent?: string;
    },
    actor: WarehouseActorContext
  ): Promise<{
    fatov: FixedAssetTransferOut;
    asset: FixedAssetRecord;
    transport: TransportationRecord;
    gatePass: GatePassRecord;
  }> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/dispatch", "POST", {
        dispatchType: "FATOV",
        ...payload,
      });
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CREATE_FATOV")) {
      throw new Error("Only Warehouse Manager or Super Admin can dispatch FATOV.");
    }
    const assets = getCache<FixedAssetRecord>("fixedAssets", []);
    const asset = assets.find((a) => a.id === payload.assetDocId);
    if (!asset) throw new Error("Fixed Asset not found.");
    if (asset.status === "In Transit") throw new Error("Asset is already In Transit.");
    const now = new Date().toISOString();
    const existingFatovs = getCache<FixedAssetTransferOut>("fixedAssetTransfersOut", []);
    const existingTrns = getCache<TransportationRecord>("transportationRecords", []);
    const existingGps = getCache<GatePassRecord>("gatePasses", []);
    const fatovNumber = generateSequentialCode("FATOV", existingFatovs.map((f) => f.fatovNumber));
    const transportNumber = generateSequentialCode("TRN", existingTrns.map((t) => t.transportNumber));
    const gatePassNumber = generateSequentialCode("GP", existingGps.map((g) => g.gatePassNumber));
    const fatovId = `FATOV-${Date.now()}`;
    const transportId = `TRN-${Date.now()}`;
    const gatePassId = `GP-${Date.now()}`;
    const itemsSummary = `Fixed Asset ${asset.assetId} - ${asset.assetName} (Orig GRV: ${asset.originalGrvNumber})`;
    const qr = await generateGatePassVerification({
      gatePassNumber,
      voucherType: "FATOV",
      voucherId: fatovId,
      vehicleNumber: payload.vehicleNumber,
      itemsSummary,
    });
    const fatov: FixedAssetTransferOut = {
      id: fatovId,
      fatovNumber,
      assetDocId: asset.id,
      assetId: asset.assetId,
      assetName: asset.assetName,
      itemCode: asset.itemCode,
      serialNumber: asset.serialNumber,
      originalGrvId: asset.originalGrvId,
      originalGrvNumber: asset.originalGrvNumber,
      requestId: payload.requestId,
      requestNumber: payload.requestNumber,
      fromLocationType: asset.currentLocationType,
      fromLocationId: asset.currentLocationId,
      fromLocationName: asset.currentLocationName,
      toLocationType: payload.toLocationType,
      toLocationId: payload.toLocationId,
      toLocationName: payload.toLocationName,
      projectId: payload.projectId,
      projectName: payload.projectName,
      quantitySent: 1,
      conditionSent: (payload.conditionSent as any) || asset.condition || "Good",
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
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
    const updatedAsset: FixedAssetRecord = { ...asset, status: "In Transit", issuerName: actor.name, updatedAt: now };
    const transport: TransportationRecord = {
      id: transportId,
      transportNumber,
      direction: asset.currentLocationType === "Warehouse" ? "WarehouseToProject" : "ProjectToWarehouse",
      referenceType: "FATOV",
      referenceId: fatovId,
      referenceNumber: fatovNumber,
      originalGrvNumber: asset.originalGrvNumber,
      originLocationId: asset.currentLocationId,
      originLocationName: asset.currentLocationName,
      destinationLocationId: payload.toLocationId,
      destinationLocationName: payload.toLocationName,
      projectId: payload.projectId,
      projectName: payload.projectName,
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      itemsSummary,
      status: "Dispatched",
      statusHistory: [{ status: "Dispatched", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: String(actor.role) }],
      dispatchedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const gatePass: GatePassRecord = {
      id: gatePassId,
      gatePassNumber,
      voucherType: "FATOV",
      voucherId: fatovId,
      voucherNumber: fatovNumber,
      originalGrvNumber: asset.originalGrvNumber,
      originLocationId: asset.currentLocationId,
      originLocationName: asset.currentLocationName,
      destinationLocationId: payload.toLocationId,
      destinationLocationName: payload.toLocationName,
      projectId: payload.projectId,
      projectName: payload.projectName,
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
      itemsSummary,
      totalQuantity: 1,
      qrVerificationCode: qr.qrVerificationCode,
      verificationHash: qr.verificationHash,
      status: "Issued",
      issuedByUid: actor.uid,
      issuedByName: actor.name,
      issuedByRole: String(actor.role),
      issuedAt: now,
      lockedForEdit: true,
      createdAt: now,
      updatedAt: now,
    };
    upsertCache("fixedAssetTransfersOut", fatov);
    upsertCache("fixedAssets", updatedAsset);
    upsertCache("transportationRecords", transport);
    upsertCache("gatePasses", gatePass);
    makeLocalAudit({
      action: "FATOV_DISPATCHED_WITH_GATE_PASS",
      module: "FATOV",
      entityType: "FixedAssetTransferOut",
      entityId: fatov.id,
      entityNumber: fatovNumber,
      details: `Dispatched Fixed Asset ${asset.assetId} via ${fatovNumber} (Orig GRV ${asset.originalGrvNumber}).`,
      projectId: payload.projectId,
      actor,
    });
    return { fatov, asset: updatedAsset, transport, gatePass };
  },

  // 7. CONFIRM CONSUMABLE GIV OR FIXED ASSET FATIV RECEIPT
  async confirmConsumableGivReceipt(
    payload: { givId: string; receivedItems?: Array<{ itemId: string; receivedQty: number }>; discrepancyNote?: string },
    actor: WarehouseActorContext
  ): Promise<GoodsIssueVoucher> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/transfers/receive", "POST", {
        receiptType: "GIV",
        ...payload,
      });
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CONFIRM_CONSUMABLE_RECEIPT")) {
      throw new Error("Only Site Manager, Store Manager, or Super Admin can confirm GIV receipt.");
    }
    const givs = getCache<GoodsIssueVoucher>("goodsIssueVouchers", []);
    const giv = givs.find((g) => g.id === payload.givId);
    if (!giv) throw new Error("GIV not found.");
    if (giv.status === "Delivered") throw new Error("GIV already Delivered.");
    const settings =
      getCache<InventoryValuationSettingsRecord>("inventorySettings", [DEFAULT_SETTINGS])[0] ||
      DEFAULT_SETTINGS;
    const balances = getCache<StockBalanceRecord>("stockBalances", []);
    const now = new Date().toISOString();
    let hasShortage = false;

    for (const line of giv.items) {
      const ov = payload.receivedItems?.find((r) => r.itemId === line.itemId);
      const recv = ov ? ov.receivedQty : line.dispatchedQty;
      if (recv < line.dispatchedQty) hasShortage = true;
      const storeBalId = `${giv.projectStoreId}__${line.itemId}`;
      const existingBal: StockBalanceRecord = balances.find((b) => b.id === storeBalId) || {
        id: storeBalId,
        locationType: "ProjectStore",
        locationId: giv.projectStoreId,
        locationName: giv.projectStoreName,
        projectId: giv.projectId,
        projectName: giv.projectName,
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        categoryName: "General",
        inventoryType: "Consumable",
        unit: line.unit,
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
        minStockLevel: 5,
        reorderPoint: 10,
        valuationMethod: settings.valuationMethod,
        averageUnitCost: line.unitCost,
        totalValuation: 0,
        fifoLayers: [],
        lastMovementAt: now,
        updatedAt: now,
      };
      const nextTrIn = round4((existingBal.transferInQty || 0) + recv);
      const nextAvail = computeStockClosingBalance({
        openingQty: existingBal.openingQty,
        receivedQty: existingBal.receivedQty,
        returnedQty: existingBal.returnedQty,
        issuedQty: existingBal.issuedQty,
        transferOutQty: existingBal.transferOutQty,
        transferInQty: nextTrIn,
      });
      upsertCache("stockBalances", {
        ...existingBal,
        transferInQty: nextTrIn,
        availableQty: nextAvail,
        totalValuation: round2((existingBal.totalValuation || 0) + recv * line.unitCost),
        lastMovementAt: now,
        updatedAt: now,
      });
    }

    const updated: GoodsIssueVoucher = {
      ...giv,
      status: hasShortage ? "Partially Received" : "Delivered",
      receivedByUid: actor.uid,
      receivedByName: actor.name,
      receivedAt: now,
      discrepancyNote: payload.discrepancyNote,
      updatedAt: now,
    };
    upsertCache("goodsIssueVouchers", updated);
    makeLocalAudit({
      action: hasShortage ? "GIV_DELIVERY_DISCREPANCY" : "GIV_DELIVERY_CONFIRMED",
      module: "GIVDispatch",
      entityType: "GoodsIssueVoucher",
      entityId: updated.id,
      entityNumber: updated.givNumber,
      details: `Confirmed receipt of ${updated.givNumber} (${updated.status}).`,
      projectId: updated.projectId,
      actor,
    });
    return updated;
  },

  async confirmFixedAssetFativ(
    payload: {
      fatovId: string;
      quantityReceived?: number;
      conditionReceived?: "Good" | "Damaged" | "Defective" | "Under Inspection" | "Not Reusable";
      discrepancyReason?: string;
    },
    actor: WarehouseActorContext
  ): Promise<{ fativ: FixedAssetTransferIn; fatov: FixedAssetTransferOut; asset: FixedAssetRecord }> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/transfers/receive", "POST", {
        receiptType: "FATIV",
        ...payload,
      });
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CONFIRM_FATIV")) {
      throw new Error("Only Site Manager, Store Manager, Warehouse Manager, or Super Admin can confirm FATIV.");
    }
    const fatovs = getCache<FixedAssetTransferOut>("fixedAssetTransfersOut", []);
    const fatov = fatovs.find((f) => f.id === payload.fatovId);
    if (!fatov) throw new Error("FATOV not found.");
    if (fatov.fativId || fatov.status === "Completed") {
      throw new Error(`Duplicate FATIV blocked! ${fatov.fatovNumber} already confirmed.`);
    }
    const assets = getCache<FixedAssetRecord>("fixedAssets", []);
    const asset = assets.find((a) => a.id === fatov.assetDocId);
    if (!asset) throw new Error("Fixed Asset not found.");
    const qtyRecv = payload.quantityReceived ?? 1;
    const discQty = round4(fatov.quantitySent - qtyRecv);
    if (discQty !== 0 && !String(payload.discrepancyReason || "").trim()) {
      throw new Error("Discrepancy reason is required.");
    }
    const now = new Date().toISOString();
    const existingFativs = getCache<FixedAssetTransferIn>("fixedAssetTransfersIn", []);
    const fativNumber = generateSequentialCode("FATIV", existingFativs.map((f) => f.fativNumber));
    const cond = payload.conditionReceived || "Good";
    const fativ: FixedAssetTransferIn = {
      id: `FATIV-${Date.now()}`,
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
      quantityReceived: qtyRecv,
      discrepancyQty: discQty,
      discrepancyReason: payload.discrepancyReason,
      conditionReceived: cond,
      status: discQty !== 0 ? (qtyRecv > 0 ? "Partially Received" : "Discrepancy Reported") : "Confirmed",
      receivedByUid: actor.uid,
      receivedByName: actor.name,
      confirmedAt: now,
      createdAt: now,
    };
    const updatedFatov: FixedAssetTransferOut = {
      ...fatov,
      status: discQty !== 0 ? (qtyRecv > 0 ? "Partially Received" : "Discrepancy Reported") : "Completed",
      fativId: fativ.id,
      fativNumber: fativ.fativNumber,
      updatedAt: now,
    };
    const updatedAsset: FixedAssetRecord = {
      ...asset,
      previousLocationName: asset.currentLocationName,
      currentLocationType: qtyRecv > 0 ? fatov.toLocationType : asset.currentLocationType,
      currentLocationId: qtyRecv > 0 ? fatov.toLocationId : asset.currentLocationId,
      currentLocationName: qtyRecv > 0 ? fatov.toLocationName : asset.currentLocationName,
      currentProjectId: qtyRecv > 0 && fatov.toLocationType === "ProjectStore" ? fatov.projectId : undefined,
      currentProjectName: qtyRecv > 0 && fatov.toLocationType === "ProjectStore" ? fatov.projectName : undefined,
      receiverName: actor.name,
      condition: cond,
      status: cond !== "Good" ? "Quarantined" : fatov.toLocationType === "Warehouse" ? "In Warehouse" : "Assigned to Project",
      transferHistory: [
        ...(asset.transferHistory || []),
        {
          id: `FAHIST-${Date.now()}`,
          date: now.slice(0, 10),
          voucherType: "FATIV",
          voucherNumber: fativNumber,
          fromLocation: fatov.fromLocationName,
          toLocation: fatov.toLocationName,
          projectName: fatov.projectName,
          issuerName: fatov.issuedByName,
          receiverName: actor.name,
          condition: cond,
          notes: discQty !== 0 ? `Discrepancy: ${payload.discrepancyReason}` : `Confirmed via ${fatov.fatovNumber}`,
        },
      ],
      updatedAt: now,
    };
    upsertCache("fixedAssetTransfersIn", fativ);
    upsertCache("fixedAssetTransfersOut", updatedFatov);
    upsertCache("fixedAssets", updatedAsset);
    makeLocalAudit({
      action: "FATIV_RECEIPT_CONFIRMED",
      module: "FATIV",
      entityType: "FixedAssetTransferIn",
      entityId: fativ.id,
      entityNumber: fativNumber,
      details: `Confirmed FATIV ${fativNumber} for ${asset.assetId} (Orig GRV ${asset.originalGrvNumber}).`,
      projectId: fativ.projectId,
      actor,
    });
    return { fativ, fatov: updatedFatov, asset: updatedAsset };
  },

  // 8. TWO-WAY RETURNS (MRV) & CONFIRMATION
  async submitReturnMrv(
    payload: {
      direction: "ProjectToWarehouse" | "WarehouseToProject";
      sourceLocationType: "Warehouse" | "ProjectStore";
      sourceLocationId: string;
      sourceLocationName: string;
      destinationLocationType: "Warehouse" | "ProjectStore";
      destinationLocationId: string;
      destinationLocationName: string;
      projectId?: string;
      projectName?: string;
      originalGivId?: string;
      originalGivNumber?: string;
      originalGrvId?: string;
      originalGrvNumber?: string;
      inventoryType: "Consumable" | "Fixed Asset";
      vehicleNumber?: string;
      driverName?: string;
      remarks?: string;
      items: Array<{
        itemId: string;
        itemCode: string;
        itemName: string;
        unit: string;
        quantityReturned: number;
        condition: "Good" | "Damaged" | "Defective" | "Under Inspection" | "Not Reusable";
        originalGivNumber?: string;
        originalGrvNumber?: string;
        assetId?: string;
        unitCost?: number;
        reason?: string;
      }>;
    },
    actor: WarehouseActorContext
  ): Promise<MaterialReturnVoucher> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/returns", "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "SUBMIT_TWO_WAY_RETURN")) {
      throw new Error("Only authorized Site Managers, Store Managers, Warehouse Managers, or Super Admin can submit returns.");
    }
    const existingMrvs = getCache<MaterialReturnVoucher>("materialReturnVouchers", []);
    const mrvNumber = generateSequentialCode("MRV", existingMrvs.map((m) => m.mrvNumber));
    const now = new Date().toISOString();
    const mrvId = `MRV-${Date.now()}`;
    let gatePassId: string | undefined;
    let gatePassNumber: string | undefined;
    let transportId: string | undefined;
    let transportNumber: string | undefined;

    if (payload.vehicleNumber && payload.driverName) {
      const gps = getCache<GatePassRecord>("gatePasses", []);
      const trns = getCache<TransportationRecord>("transportationRecords", []);
      gatePassNumber = generateSequentialCode("GP", gps.map((g) => g.gatePassNumber));
      transportNumber = generateSequentialCode("TRN", trns.map((t) => t.transportNumber));
      gatePassId = `GP-${Date.now()}`;
      transportId = `TRN-${Date.now()}`;
      const summary = payload.items.map((i) => `${i.itemCode} (${i.quantityReturned} ${i.unit})`).join(", ");
      const qr = await generateGatePassVerification({
        gatePassNumber,
        voucherType: "MRV",
        voucherId: mrvId,
        vehicleNumber: payload.vehicleNumber,
        itemsSummary: summary,
      });
      upsertCache("gatePasses", {
        id: gatePassId,
        gatePassNumber,
        voucherType: "MRV",
        voucherId: mrvId,
        voucherNumber: mrvNumber,
        originalGrvNumber: payload.originalGrvNumber,
        originLocationId: payload.sourceLocationId,
        originLocationName: payload.sourceLocationName,
        destinationLocationId: payload.destinationLocationId,
        destinationLocationName: payload.destinationLocationName,
        projectId: payload.projectId,
        projectName: payload.projectName,
        vehicleNumber: payload.vehicleNumber,
        driverName: payload.driverName,
        itemsSummary: summary,
        totalQuantity: payload.items.reduce((s, x) => s + x.quantityReturned, 0),
        qrVerificationCode: qr.qrVerificationCode,
        verificationHash: qr.verificationHash,
        status: "Issued",
        issuedByUid: actor.uid,
        issuedByName: actor.name,
        issuedByRole: String(actor.role),
        issuedAt: now,
        lockedForEdit: true,
        createdAt: now,
        updatedAt: now,
      } as GatePassRecord);
      upsertCache("transportationRecords", {
        id: transportId,
        transportNumber,
        direction: payload.direction,
        referenceType: "MRV",
        referenceId: mrvId,
        referenceNumber: mrvNumber,
        originLocationId: payload.sourceLocationId,
        originLocationName: payload.sourceLocationName,
        destinationLocationId: payload.destinationLocationId,
        destinationLocationName: payload.destinationLocationName,
        projectId: payload.projectId,
        projectName: payload.projectName,
        vehicleNumber: payload.vehicleNumber,
        driverName: payload.driverName,
        itemsSummary: summary,
        status: "In Transit",
        statusHistory: [{ status: "In Transit", timestamp: now, actorUid: actor.uid, actorName: actor.name, actorRole: String(actor.role) }],
        dispatchedAt: now,
        createdAt: now,
        updatedAt: now,
      } as TransportationRecord);
    }

    const mrv: MaterialReturnVoucher = {
      id: mrvId,
      mrvNumber,
      direction: payload.direction,
      sourceLocationType: payload.sourceLocationType,
      sourceLocationId: payload.sourceLocationId,
      sourceLocationName: payload.sourceLocationName,
      destinationLocationType: payload.destinationLocationType,
      destinationLocationId: payload.destinationLocationId,
      destinationLocationName: payload.destinationLocationName,
      projectId: payload.projectId,
      projectName: payload.projectName,
      originalGivId: payload.originalGivId,
      originalGivNumber: payload.originalGivNumber,
      originalGrvId: payload.originalGrvId,
      originalGrvNumber: payload.originalGrvNumber,
      inventoryType: payload.inventoryType,
      vehicleNumber: payload.vehicleNumber,
      driverName: payload.driverName,
      status: gatePassId ? "In Transit" : "Submitted",
      items: payload.items.map((i) => ({
        ...i,
        unitCost: Number(i.unitCost || 0),
        inventoryType: payload.inventoryType,
        quantityAcceptedGood: i.condition === "Good" ? i.quantityReturned : 0,
        quantityQuarantined: i.condition === "Good" ? 0 : i.quantityReturned,
      })),
      gatePassId,
      gatePassNumber,
      transportId,
      transportNumber,
      submittedByUid: actor.uid,
      submittedByName: actor.name,
      submittedByRole: String(actor.role),
      remarks: payload.remarks,
      createdAt: now,
      updatedAt: now,
    };
    upsertCache("materialReturnVouchers", mrv);
    makeLocalAudit({
      action: "MRV_RETURN_SUBMITTED",
      module: "ReturnMRV",
      entityType: "MaterialReturnVoucher",
      entityId: mrv.id,
      entityNumber: mrvNumber,
      details: `Submitted two-way MRV ${mrvNumber} (${payload.direction}).`,
      projectId: payload.projectId,
      actor,
    });
    return mrv;
  },

  async confirmReturnReceipt(
    mrvId: string,
    payload: { inspectedItems?: Array<{ itemId: string; condition: "Good" | "Damaged" | "Defective" | "Under Inspection" | "Not Reusable" }> },
    actor: WarehouseActorContext
  ): Promise<MaterialReturnVoucher> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/returns/${mrvId}/confirm`, "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CONFIRM_RETURN_RECEIPT")) {
      throw new Error("Only Warehouse Manager, Site Manager, or Super Admin can confirm return receipt.");
    }
    const mrvs = getCache<MaterialReturnVoucher>("materialReturnVouchers", []);
    const mrv = mrvs.find((m) => m.id === mrvId);
    if (!mrv) throw new Error("MRV not found.");
    if (mrv.status === "Confirmed Receipt" || mrv.status === "Quarantined") {
      throw new Error("MRV already confirmed.");
    }
    const settings =
      getCache<InventoryValuationSettingsRecord>("inventorySettings", [DEFAULT_SETTINGS])[0] ||
      DEFAULT_SETTINGS;
    const balances = [...getCache<StockBalanceRecord>("stockBalances", [])];
    const assets = getCache<FixedAssetRecord>("fixedAssets", []);
    const now = new Date().toISOString();
    let anyQuarantined = false;

    for (const line of mrv.items) {
      const ov = payload.inspectedItems?.find((x) => x.itemId === line.itemId);
      const cond = ov ? ov.condition : line.condition;
      if (cond !== "Good") anyQuarantined = true;
      const destId = `${mrv.destinationLocationId}__${line.itemId}`;
      const existingDest: StockBalanceRecord = balances.find((b) => b.id === destId) || {
        id: destId,
        locationType: mrv.destinationLocationType,
        locationId: mrv.destinationLocationId,
        locationName: mrv.destinationLocationName,
        projectId: mrv.destinationLocationType === "ProjectStore" ? mrv.projectId : undefined,
        projectName: mrv.destinationLocationType === "ProjectStore" ? mrv.projectName : undefined,
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        categoryName: "General",
        inventoryType: line.inventoryType,
        unit: line.unit,
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
        minStockLevel: 10,
        reorderPoint: 15,
        valuationMethod: settings.valuationMethod,
        averageUnitCost: line.unitCost || 0,
        totalValuation: 0,
        fifoLayers: [],
        lastMovementAt: now,
        updatedAt: now,
      };
      const updatedDest = applyReturnToBalance({
        balance: existingDest,
        qtyReturned: line.quantityReturned,
        condition: cond,
        unitCost: line.unitCost || existingDest.averageUnitCost || 0,
        grvNumber: line.originalGrvNumber || mrv.originalGrvNumber,
      });
      const bIdx = balances.findIndex((b) => b.id === updatedDest.id);
      if (bIdx >= 0) balances[bIdx] = updatedDest;
      else balances.push(updatedDest);
      upsertCache("stockBalances", updatedDest);
      upsertCache("stockLedger", {
        id: `LEDGER-MRV-${mrv.mrvNumber}-${line.itemId}-${Date.now()}`,
        voucherType: cond === "Good" ? "MRV" : "QUARANTINE_IN",
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
        direction: cond === "Good" ? "IN" : "QUARANTINE",
        quantity: line.quantityReturned,
        quantityDelta: cond === "Good" ? line.quantityReturned : 0,
        quarantineDelta: cond === "Good" ? 0 : line.quantityReturned,
        unitCost: line.unitCost || existingDest.averageUnitCost || 0,
        totalCost: round2(line.quantityReturned * (line.unitCost || existingDest.averageUnitCost || 0)),
        valuationMethodUsed: settings.valuationMethod,
        openingBefore: existingDest.availableQty,
        balanceAfter: updatedDest.availableQty,
        quarantineAfter: updatedDest.quarantineQty,
        condition: cond,
        createdByUid: actor.uid,
        createdByName: actor.name,
        createdByRole: String(actor.role),
        createdAt: now,
      } as StockLedgerEntry);

      if (line.assetId) {
        const fa = assets.find((a) => a.assetId === line.assetId);
        if (fa) {
          upsertCache("fixedAssets", {
            ...fa,
            previousLocationName: fa.currentLocationName,
            currentLocationType: mrv.destinationLocationType,
            currentLocationId: mrv.destinationLocationId,
            currentLocationName: mrv.destinationLocationName,
            condition: cond,
            status: cond === "Good" ? "In Warehouse" : "Quarantined",
            transferHistory: [
              ...(fa.transferHistory || []),
              {
                id: `FAHIST-MRV-${Date.now()}`,
                date: now.slice(0, 10),
                voucherType: "MRV",
                voucherNumber: mrv.mrvNumber,
                fromLocation: mrv.sourceLocationName,
                toLocation: mrv.destinationLocationName,
                receiverName: actor.name,
                condition: cond,
                notes: `Returned via ${mrv.mrvNumber} (Orig GRV ${fa.originalGrvNumber})`,
              },
            ],
            updatedAt: now,
          });
        }
      }
    }

    const updated: MaterialReturnVoucher = {
      ...mrv,
      status: anyQuarantined ? "Quarantined" : "Confirmed Receipt",
      confirmedByUid: actor.uid,
      confirmedByName: actor.name,
      confirmedAt: now,
      updatedAt: now,
    };
    upsertCache("materialReturnVouchers", updated);
    if (anyQuarantined) {
      makeLocalNotification({
        eventType: "DAMAGED_QUARANTINED",
        title: `Quarantined Stock Alert (${mrv.mrvNumber})`,
        message: "Damaged/defective items placed strictly in Quarantine stock.",
        severity: "critical",
        targetRoles: ["Warehouse Manager", "Finance Manager", "Director"],
        projectId: mrv.projectId,
        projectName: mrv.projectName,
        referenceId: mrv.id,
        referenceNumber: mrv.mrvNumber,
        actorName: actor.name,
        actorRole: String(actor.role),
      });
    }
    return updated;
  },

  // 9. QUARANTINE RELEASE / WRITE-OFF
  async releaseQuarantineStock(
    payload: { balanceId: string; quantity: number; disposition: "RELEASE_TO_USABLE" | "WRITE_OFF"; notes?: string },
    actor: WarehouseActorContext
  ): Promise<StockBalanceRecord> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/quarantine/release", "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "RELEASE_QUARANTINE")) {
      throw new Error("Only Warehouse Manager or Super Admin can release/write off quarantine stock.");
    }
    const balances = getCache<StockBalanceRecord>("stockBalances", []);
    const bal = balances.find((b) => b.id === payload.balanceId);
    if (!bal) throw new Error("Stock balance not found.");
    if (payload.quantity <= 0 || payload.quantity > bal.quarantineQty) {
      throw new Error(`Invalid release quantity; quarantineQty is ${bal.quarantineQty}.`);
    }
    const nextQ = round4(bal.quarantineQty - payload.quantity);
    const nextRet = payload.disposition === "RELEASE_TO_USABLE" ? round4(bal.returnedQty + payload.quantity) : bal.returnedQty;
    const nextAvail = computeStockClosingBalance({
      openingQty: bal.openingQty,
      receivedQty: bal.receivedQty,
      returnedQty: nextRet,
      issuedQty: bal.issuedQty,
      transferOutQty: bal.transferOutQty,
      transferInQty: bal.transferInQty,
    });
    const nextBal: StockBalanceRecord = {
      ...bal,
      quarantineQty: nextQ,
      damagedQty: Math.max(0, round4(bal.damagedQty - Math.min(bal.damagedQty, payload.quantity))),
      returnedQty: nextRet,
      availableQty: nextAvail,
      updatedAt: new Date().toISOString(),
    };
    upsertCache("stockBalances", nextBal);
    return nextBal;
  },

  // 10. GATE PASS QR VERIFICATION
  async verifyGatePass(
    gatePassId: string,
    payload: { scannedCode: string; verificationType: "EXIT" | "ENTRY"; remarks?: string },
    actor: WarehouseActorContext
  ): Promise<GatePassRecord> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/gate-passes/${gatePassId}/verify`, "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "VERIFY_GATE_PASS_EXIT_ENTRY")) {
      throw new Error("Only Gate Security Officer or Super Admin can verify Gate Passes.");
    }
    const gps = getCache<GatePassRecord>("gatePasses", []);
    const gp = gps.find((g) => g.id === gatePassId);
    if (!gp) throw new Error("Gate Pass not found.");
    const check = await verifyGatePassIntegrity(gp, payload.scannedCode);
    const now = new Date().toISOString();
    if (!check.valid) {
      upsertCache("gatePasses", { ...gp, status: "Tamper Blocked", securityRemarks: check.reason, updatedAt: now });
      throw new Error(check.reason || "Invalid Gate Pass QR verification.");
    }
    const updated: GatePassRecord = {
      ...gp,
      status: payload.verificationType === "EXIT" ? "Exit Verified" : "Entry Verified",
      exitVerifiedByUid: payload.verificationType === "EXIT" ? actor.uid : gp.exitVerifiedByUid,
      exitVerifiedByName: payload.verificationType === "EXIT" ? actor.name : gp.exitVerifiedByName,
      exitVerifiedAt: payload.verificationType === "EXIT" ? now : gp.exitVerifiedAt,
      entryVerifiedByUid: payload.verificationType === "ENTRY" ? actor.uid : gp.entryVerifiedByUid,
      entryVerifiedByName: payload.verificationType === "ENTRY" ? actor.name : gp.entryVerifiedByName,
      entryVerifiedAt: payload.verificationType === "ENTRY" ? now : gp.entryVerifiedAt,
      securityRemarks: payload.remarks || gp.securityRemarks,
      updatedAt: now,
    };
    upsertCache("gatePasses", updated);
    return updated;
  },

  // 11. TRANSPORTATION WORKFLOW STATUS PROGRESSION
  async updateTransportStatus(
    transportId: string,
    payload: { status: TransportationStatus; handlerName?: string; notes?: string },
    actor: WarehouseActorContext
  ): Promise<TransportationRecord> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi(`/api/warehouse/transport/${transportId}/status`, "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "MANAGE_TRANSPORT")) {
      throw new Error("Not authorized to update transportation status.");
    }
    const trs = getCache<TransportationRecord>("transportationRecords", []);
    const tr = trs.find((t) => t.id === transportId);
    if (!tr) throw new Error("Transportation record not found.");
    const now = new Date().toISOString();
    const updated: TransportationRecord = {
      ...tr,
      status: payload.status,
      handlerName: payload.handlerName || tr.handlerName,
      arrivedAt: payload.status === "Arrived" ? now : tr.arrivedAt,
      completedAt: payload.status === "Completed" ? now : tr.completedAt,
      statusHistory: [
        ...(tr.statusHistory || []),
        {
          status: payload.status,
          timestamp: now,
          actorUid: actor.uid,
          actorName: actor.name,
          actorRole: String(actor.role),
          notes: payload.notes,
        },
      ],
      updatedAt: now,
    };
    upsertCache("transportationRecords", updated);
    return updated;
  },

  // 12. VALUATION METHOD SWITCH (FINANCE MANAGER / SUPER ADMIN ONLY)
  async updateValuationMethod(
    payload: { valuationMethod: CostValuationMethod; reason?: string },
    actor: WarehouseActorContext
  ): Promise<InventoryValuationSettingsRecord> {
    if (isLiveAuthenticatedSession()) {
      return callWarehouseApi("/api/warehouse/settings/valuation", "POST", payload);
    }
    if (!canPerformWarehouseModuleAction(actor.role, "CONFIGURE_VALUATION_METHOD")) {
      throw new Error("Only Finance Manager or Super Admin can configure inventory valuation method.");
    }
    const existing =
      getCache<InventoryValuationSettingsRecord>("inventorySettings", [DEFAULT_SETTINGS])[0] ||
      DEFAULT_SETTINGS;
    const now = new Date().toISOString();
    const next: InventoryValuationSettingsRecord = {
      ...existing,
      id: "default",
      valuationMethod: payload.valuationMethod,
      updatedByUid: actor.uid,
      updatedByName: actor.name,
      updatedByRole: String(actor.role),
      updatedAt: now,
      history: [
        ...(existing.history || []),
        {
          previousMethod: existing.valuationMethod,
          newMethod: payload.valuationMethod,
          changedByUid: actor.uid,
          changedByName: actor.name,
          changedAt: now,
          reason: payload.reason || "Finance valuation policy update",
        },
      ],
    };
    upsertCache("inventorySettings", next);
    makeLocalAudit({
      action: "INVENTORY_VALUATION_METHOD_UPDATED",
      module: "ValuationSettings",
      entityType: "InventoryValuationSettings",
      entityId: "default",
      details: `Finance updated costing method ${existing.valuationMethod} -> ${payload.valuationMethod}.`,
      actor,
    });
    return next;
  },

  // 13. REPORT GENERATION WRAPPER
  async fetchWarehouseReport(
    reportType: WarehouseReportType,
    snapshot: ErpWarehouseSnapshot,
    filters: WarehouseDashboardFilters,
    actor: WarehouseActorContext
  ) {
    if (isLiveAuthenticatedSession()) {
      try {
        const qs = new URLSearchParams({
          dateFrom: filters.dateFrom || "",
          dateTo: filters.dateTo || "",
          projectId: filters.projectId || "ALL",
          locationId: filters.locationId || "ALL",
          categoryId: filters.categoryId || "ALL",
          inventoryType: filters.inventoryType || "ALL",
        }).toString();
        return await callWarehouseApi<any>(`/api/warehouse/reports/${reportType}?${qs}`, "GET");
      } catch {
        // Fallback to local engine if backend unreachable
      }
    }
    return generateWarehouseReportData(
      reportType,
      {
        warehouses: snapshot.warehouses,
        projectStores: snapshot.projectStores,
        categories: snapshot.categories,
        items: snapshot.items,
        stockBalances: snapshot.stockBalances,
        stockLedger: snapshot.stockLedger,
        materialPlans: snapshot.materialPlans,
        materialRequests: snapshot.materialRequests,
        grvs: snapshot.grvs,
        givs: snapshot.givs,
        mrvs: snapshot.mrvs,
        fixedAssets: snapshot.fixedAssets,
        fatovs: snapshot.fatovs,
        fativs: snapshot.fativs,
        transports: snapshot.transports,
        gatePasses: snapshot.gatePasses,
        commercialInvoices: snapshot.commercialInvoices,
        auditLogs: snapshot.auditLogs,
      },
      filters,
      `${actor.name} (${actor.role})`
    );
  },
};
