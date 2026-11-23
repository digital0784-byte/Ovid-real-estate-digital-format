import * as XLSX from "xlsx";
import {
  CommercialInvoiceRecord,
  CostValuationMethod,
  EngineeringMaterialRequest,
  FifoCostLayer,
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
  ItemConditionStatus,
  MaterialApprovalRecord,
  MaterialPlanItem,
  MaterialPlanRecord,
  MaterialPlanRevisionRecord,
  MaterialRequestItem,
  MaterialReturnVoucher,
  PlanComparisonStatus,
  ProjectStoreRecord,
  StockBalanceRecord,
  StockLedgerEntry,
  TransportationRecord,
  TransportationStatus,
  UserRole,
  WarehouseDashboardFilters,
  WarehouseRecord,
  WarehouseReportType,
} from "../types";
import { NotificationService } from "./notificationService";

export const ALL_TRANSPORT_STATUSES: TransportationStatus[] = [
  "Pending Preparation",
  "Approved for Dispatch",
  "Ready for Dispatch",
  "Dispatched",
  "In Transit",
  "Arrived",
  "Receiving Verification",
  "Partially Received",
  "Completed",
  "Discrepancy Reported",
  "Cancelled",
];

export const ALLOWED_INVOICE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export function round2(val: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round4(val: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

export function normalizeSpec(s?: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function generateSequentialCode(
  prefix: string,
  existingNumbers: string[],
  year = new Date().getFullYear()
): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-(?:${year}-)?(\\d+)$`, "i");
  let maxSeq = 0;
  for (const num of existingNumbers) {
    const m = re.exec(String(num || "").trim());
    if (m && m[1]) {
      const parsed = Number(m[1]);
      if (Number.isFinite(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }
  const next = String(maxSeq + 1).padStart(4, "0");
  return `${prefix}-${year}-${next}`;
}

export function generatePermanentAssetId(existingAssetIds: string[]): string {
  const re = /^OVID-FA-(\d+)$/i;
  let maxSeq = 0;
  for (const id of existingAssetIds) {
    const m = re.exec(String(id || "").trim());
    if (m && m[1]) {
      const parsed = Number(m[1]);
      if (Number.isFinite(parsed) && parsed > maxSeq) maxSeq = parsed;
    }
  }
  return `OVID-FA-${String(maxSeq + 1).padStart(5, "0")}`;
}

/**
 * Computes closing balance strictly per accounting identity:
 * Closing = Opening + Received + Returned − Issued − TransferOut + TransferIn
 */
export function computeStockClosingBalance(params: {
  openingQty: number;
  receivedQty: number;
  returnedQty: number;
  issuedQty: number;
  transferOutQty: number;
  transferInQty: number;
}): number {
  const raw =
    (Number(params.openingQty) || 0) +
    (Number(params.receivedQty) || 0) +
    (Number(params.returnedQty) || 0) -
    (Number(params.issuedQty) || 0) -
    (Number(params.transferOutQty) || 0) +
    (Number(params.transferInQty) || 0);
  return round4(raw);
}

/**
 * Computes valuation for inbound GRV stock without touching historical ledger entries.
 */
export function applyInboundCostLayer(params: {
  balance: StockBalanceRecord;
  qtyIn: number;
  unitCost: number;
  grvId: string;
  grvNumber: string;
  receivedDate: string;
  valuationMethod: CostValuationMethod;
  batchNumber?: string;
  expiryDate?: string;
}): StockBalanceRecord {
  const qtyIn = Number(params.qtyIn) || 0;
  const unitCost = Number(params.unitCost) || 0;
  if (qtyIn <= 0) {
    throw new Error("Inbound GRV quantity must be greater than zero.");
  }
  if (unitCost < 0) {
    throw new Error("Inbound unit cost cannot be negative.");
  }

  const prevQty = Math.max(0, Number(params.balance.availableQty) || 0);
  const prevTotalVal = Math.max(0, Number(params.balance.totalValuation) || 0);
  const addedValue = round2(qtyIn * unitCost);
  const newReceivedQty = round4((Number(params.balance.receivedQty) || 0) + qtyIn);
  const nextAvailable = computeStockClosingBalance({
    openingQty: params.balance.openingQty,
    receivedQty: newReceivedQty,
    returnedQty: params.balance.returnedQty,
    issuedQty: params.balance.issuedQty,
    transferOutQty: params.balance.transferOutQty,
    transferInQty: params.balance.transferInQty,
  });

  const newLayer: FifoCostLayer = {
    layerId: `LYR-${params.grvNumber}-${Date.now()}`,
    grvId: params.grvId,
    grvNumber: params.grvNumber,
    receivedDate: params.receivedDate,
    batchNumber: params.batchNumber,
    expiryDate: params.expiryDate,
    originalQty: qtyIn,
    remainingQty: qtyIn,
    unitCost,
  };

  const nextLayers = [...(params.balance.fifoLayers || []), newLayer];
  let nextTotalVal = 0;
  let nextAvgCost = params.balance.averageUnitCost || unitCost;

  if (params.valuationMethod === "FIFO") {
    nextTotalVal = round2(
      nextLayers.reduce((acc, l) => acc + l.remainingQty * l.unitCost, 0)
    );
    nextAvgCost = nextAvailable > 0 ? round2(nextTotalVal / nextAvailable) : unitCost;
  } else {
    nextTotalVal = round2(prevTotalVal + addedValue);
    nextAvgCost =
      prevQty + qtyIn > 0
        ? round2((prevTotalVal + addedValue) / (prevQty + qtyIn))
        : unitCost;
  }

  return {
    ...params.balance,
    receivedQty: newReceivedQty,
    availableQty: nextAvailable,
    valuationMethod: params.valuationMethod,
    averageUnitCost: nextAvgCost,
    totalValuation: nextTotalVal,
    fifoLayers: nextLayers,
    batchNumber: params.batchNumber || params.balance.batchNumber,
    expiryDate: params.expiryDate || params.balance.expiryDate,
    lastMovementAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Consumes stock cost according to active valuationMethod ("FIFO" | "Weighted Moving Average").
 * Strictly blocks negative stock!
 */
export function applyOutboundStockDeduction(params: {
  balance: StockBalanceRecord;
  qtyOut: number;
  mode: "ISSUE" | "TRANSFER_OUT";
  valuationMethod: CostValuationMethod;
}): {
  updatedBalance: StockBalanceRecord;
  unitCostUsed: number;
  totalCost: number;
} {
  const qtyOut = Number(params.qtyOut) || 0;
  if (qtyOut <= 0) {
    throw new Error("Dispatch/Issue quantity must be greater than zero.");
  }
  const available = Number(params.balance.availableQty) || 0;
  if (qtyOut > available + 1e-6) {
    throw new Error(
      `Insufficient stock for ${params.balance.itemName} at ${params.balance.locationName}: available ${available}, requested ${qtyOut}.`
    );
  }

  const nextIssued =
    params.mode === "ISSUE"
      ? round4((Number(params.balance.issuedQty) || 0) + qtyOut)
      : params.balance.issuedQty;
  const nextTransferOut =
    params.mode === "TRANSFER_OUT"
      ? round4((Number(params.balance.transferOutQty) || 0) + qtyOut)
      : params.balance.transferOutQty;

  const nextAvailable = computeStockClosingBalance({
    openingQty: params.balance.openingQty,
    receivedQty: params.balance.receivedQty,
    returnedQty: params.balance.returnedQty,
    issuedQty: nextIssued,
    transferOutQty: nextTransferOut,
    transferInQty: params.balance.transferInQty,
  });

  if (nextAvailable < 0) {
    throw new Error("Negative stock blocked by ledger invariant.");
  }

  let consumedTotalCost = 0;
  const updatedLayers: FifoCostLayer[] = [];

  if (params.valuationMethod === "FIFO") {
    let remainingToConsume = qtyOut;
    const sorted = [...(params.balance.fifoLayers || [])];
    for (const layer of sorted) {
      if (layer.remainingQty <= 0) continue;
      if (remainingToConsume <= 0) {
        updatedLayers.push({ ...layer });
        continue;
      }
      const take = Math.min(layer.remainingQty, remainingToConsume);
      consumedTotalCost += take * layer.unitCost;
      remainingToConsume = round4(remainingToConsume - take);
      const leftover = round4(layer.remainingQty - take);
      if (leftover > 0) {
        updatedLayers.push({ ...layer, remainingQty: leftover });
      }
    }
    if (remainingToConsume > 0) {
      consumedTotalCost +=
        remainingToConsume * (params.balance.averageUnitCost || 0);
    }
  } else {
    // Weighted Moving Average: consume at current weighted average cost, proportionally reducing FIFO tracking layers cleanly
    const avg = Number(params.balance.averageUnitCost) || 0;
    consumedTotalCost = qtyOut * avg;
    let remainingToReduce = qtyOut;
    for (const layer of params.balance.fifoLayers || []) {
      if (layer.remainingQty <= 0) continue;
      if (remainingToReduce <= 0) {
        updatedLayers.push({ ...layer });
        continue;
      }
      const take = Math.min(layer.remainingQty, remainingToReduce);
      remainingToReduce = round4(remainingToReduce - take);
      const leftover = round4(layer.remainingQty - take);
      if (leftover > 0) {
        updatedLayers.push({ ...layer, remainingQty: leftover });
      }
    }
  }

  consumedTotalCost = round2(consumedTotalCost);
  const unitCostUsed = qtyOut > 0 ? round2(consumedTotalCost / qtyOut) : 0;

  let nextTotalValuation = 0;
  let nextAvgCost = params.balance.averageUnitCost || 0;
  if (params.valuationMethod === "FIFO") {
    nextTotalValuation = round2(
      updatedLayers.reduce((sum, l) => sum + l.remainingQty * l.unitCost, 0)
    );
    nextAvgCost =
      nextAvailable > 0 ? round2(nextTotalValuation / nextAvailable) : unitCostUsed;
  } else {
    nextTotalValuation = round2(
      Math.max(0, (Number(params.balance.totalValuation) || 0) - consumedTotalCost)
    );
    nextAvgCost =
      nextAvailable > 0
        ? round2(nextTotalValuation / nextAvailable)
        : params.balance.averageUnitCost || 0;
  }

  return {
    unitCostUsed,
    totalCost: consumedTotalCost,
    updatedBalance: {
      ...params.balance,
      issuedQty: nextIssued,
      transferOutQty: nextTransferOut,
      availableQty: nextAvailable,
      valuationMethod: params.valuationMethod,
      averageUnitCost: nextAvgCost,
      totalValuation: nextTotalValuation,
      fifoLayers: updatedLayers,
      lastMovementAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Routes returns strictly into good usable stock vs separate quarantine stock.
 * Damaged / Defective / Under Inspection / Not Reusable items NEVER enter usable availableQty.
 */
export function applyReturnToBalance(params: {
  balance: StockBalanceRecord;
  qtyReturned: number;
  condition: ItemConditionStatus;
  unitCost: number;
  grvNumber?: string;
}): StockBalanceRecord {
  const qty = Number(params.qtyReturned) || 0;
  if (qty <= 0) {
    throw new Error("Return quantity must be greater than zero.");
  }

  const isQuarantine = params.condition !== "Good";

  if (isQuarantine) {
    const nextQuarantine = round4((Number(params.balance.quarantineQty) || 0) + qty);
    const nextDamaged =
      params.condition === "Damaged" || params.condition === "Not Reusable"
        ? round4((Number(params.balance.damagedQty) || 0) + qty)
        : params.balance.damagedQty || 0;
    const nextDefective =
      params.condition === "Defective"
        ? round4((Number(params.balance.defectiveQty) || 0) + qty)
        : params.balance.defectiveQty || 0;
    const nextInspection =
      params.condition === "Under Inspection"
        ? round4((Number(params.balance.underInspectionQty) || 0) + qty)
        : params.balance.underInspectionQty || 0;

    return {
      ...params.balance,
      quarantineQty: nextQuarantine,
      damagedQty: nextDamaged,
      defectiveQty: nextDefective,
      underInspectionQty: nextInspection,
      lastMovementAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Good condition return increases returnedQty and availableQty
  const nextReturned = round4((Number(params.balance.returnedQty) || 0) + qty);
  const nextAvailable = computeStockClosingBalance({
    openingQty: params.balance.openingQty,
    receivedQty: params.balance.receivedQty,
    returnedQty: nextReturned,
    issuedQty: params.balance.issuedQty,
    transferOutQty: params.balance.transferOutQty,
    transferInQty: params.balance.transferInQty,
  });

  const addedVal = round2(qty * (params.unitCost || params.balance.averageUnitCost || 0));
  const nextLayers = [
    ...(params.balance.fifoLayers || []),
    {
      layerId: `RET-${Date.now()}`,
      grvId: params.grvNumber || "RETURN",
      grvNumber: params.grvNumber || "MRV-RETURN",
      receivedDate: new Date().toISOString().slice(0, 10),
      originalQty: qty,
      remainingQty: qty,
      unitCost: params.unitCost || params.balance.averageUnitCost || 0,
    },
  ];
  const nextTotalVal = round2((Number(params.balance.totalValuation) || 0) + addedVal);
  const nextAvg =
    nextAvailable > 0 ? round2(nextTotalVal / nextAvailable) : params.balance.averageUnitCost;

  return {
    ...params.balance,
    returnedQty: nextReturned,
    availableQty: nextAvailable,
    totalValuation: nextTotalVal,
    averageUnitCost: nextAvg,
    fifoLayers: nextLayers,
    lastMovementAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validates Commercial Invoice completeness (PDF/JPG/JPEG/PNG + number + date + supplier).
 */
export function validateCommercialInvoiceForGrv(params: {
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierId?: string;
  supplierName?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!params.invoiceNumber || !params.invoiceNumber.trim()) {
    errors.push("Commercial Invoice Number is required.");
  }
  if (!params.invoiceDate || !params.invoiceDate.trim()) {
    errors.push("Commercial Invoice Date is required.");
  }
  if (!params.supplierName || !params.supplierName.trim()) {
    errors.push("Supplier is required for Commercial Invoice.");
  }
  if (!params.fileUrl || !params.fileUrl.trim()) {
    errors.push("Commercial Invoice file attachment (PDF/JPG/JPEG/PNG) is mandatory before finalizing GRV.");
  }
  if (params.fileName) {
    const ext = params.fileName.split(".").pop()?.toLowerCase() || "";
    const mimeOk = params.mimeType ? ALLOWED_INVOICE_MIME_TYPES.has(params.mimeType.toLowerCase()) : false;
    const extOk = ["pdf", "jpg", "jpeg", "png"].includes(ext);
    if (!mimeOk && !extOk) {
      errors.push("Commercial Invoice must be PDF, JPG, JPEG, or PNG format.");
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Auto-compares Site Store Material Request line items against the linked Material Plan,
 * previously approved/active requests against that plan, and current Warehouse stock.
 */
export function compareMaterialRequestAgainstPlan(params: {
  plan: MaterialPlanRecord;
  requestedItems: {
    itemId: string;
    itemCode: string;
    itemName: string;
    specification: string;
    inventoryType: "Consumable" | "Fixed Asset";
    unit: string;
    requestedQty: number;
  }[];
  existingRequestsForPlan: EngineeringMaterialRequest[];
  warehouseBalances: StockBalanceRecord[];
  warehouseId: string;
  excludeRequestId?: string;
}): {
  comparedItems: MaterialRequestItem[];
  hasMismatch: boolean;
  mismatchSummary: string;
} {
  const planMap = new Map<string, MaterialPlanItem>();
  for (const pi of params.plan.items || []) {
    planMap.set(pi.itemId, pi);
    if (pi.itemCode) planMap.set(pi.itemCode.toUpperCase(), pi);
  }

  // Sum previously approved or submitted/pending qty across all non-rejected/non-returned requests on this plan
  const consumedByItem = new Map<string, number>();
  for (const req of params.existingRequestsForPlan || []) {
    if (req.id === params.excludeRequestId) continue;
    if (
      req.status === "Director Disapproved" ||
      req.status === "Returned by Warehouse Manager" ||
      req.status === "Draft"
    ) {
      continue;
    }
    for (const ri of req.items || []) {
      const qtyToCount =
        req.status === "Director Approved" ||
        req.status === "Partially Dispatched" ||
        req.status === "Fully Dispatched" ||
        req.status === "Closed"
          ? Number(ri.approvedQty || ri.requestedQty || 0)
          : Number(ri.requestedQty || 0);
      consumedByItem.set(
        ri.itemId,
        round4((consumedByItem.get(ri.itemId) || 0) + qtyToCount)
      );
    }
  }

  const mismatchReasons: string[] = [];
  const comparedItems: MaterialRequestItem[] = [];

  for (let i = 0; i < params.requestedItems.length; i++) {
    const reqItem = params.requestedItems[i];
    const planLine =
      planMap.get(reqItem.itemId) || planMap.get((reqItem.itemCode || "").toUpperCase());

    const whBal = (params.warehouseBalances || []).find(
      (b) =>
        b.locationType === "Warehouse" &&
        b.locationId === params.warehouseId &&
        (b.itemId === reqItem.itemId || b.itemCode === reqItem.itemCode)
    );
    const warehouseAvailableQty = whBal ? Number(whBal.availableQty) || 0 : 0;

    if (!planLine) {
      const reason = `Item ${reqItem.itemCode} (${reqItem.itemName}) is not listed in Material Plan ${params.plan.planNumber}.`;
      mismatchReasons.push(reason);
      comparedItems.push({
        id: `MRI-${Date.now()}-${i}`,
        requestId: "",
        ...reqItem,
        plannedQty: 0,
        previouslyApprovedOrIssuedQty: 0,
        remainingPlanQty: 0,
        approvedQty: 0,
        dispatchedQty: 0,
        remainingDispatchQty: 0,
        warehouseAvailableQty,
        comparisonStatus: "Item Not in Plan",
        mismatchReason: reason,
      });
      continue;
    }

    const plannedQty = Number(planLine.plannedQty) || 0;
    const prevQty = consumedByItem.get(planLine.itemId) || 0;
    const remainingPlanQty = Math.max(0, round4(plannedQty - prevQty));
    const reqQty = Number(reqItem.requestedQty) || 0;

    let comparisonStatus: PlanComparisonStatus = "Matched";
    let mismatchReason = "";

    const unitMismatch =
      normalizeSpec(reqItem.unit) !== normalizeSpec(planLine.unit);
    const specMismatch =
      planLine.specification &&
      reqItem.specification &&
      normalizeSpec(reqItem.specification) !== normalizeSpec(planLine.specification);

    if (unitMismatch || specMismatch) {
      comparisonStatus = "Spec/Unit Mismatch";
      mismatchReason = `Plan expects ${planLine.unit} (${planLine.specification}), request supplied ${reqItem.unit} (${reqItem.specification}).`;
    } else if (reqQty <= 0) {
      comparisonStatus = "Exceeds Remaining Plan";
      mismatchReason = "Requested quantity must be greater than zero.";
    } else if (reqQty > remainingPlanQty + 1e-6) {
      comparisonStatus = "Exceeds Remaining Plan";
      mismatchReason = `Requested ${reqQty} ${reqItem.unit} exceeds remaining approved plan quantity (${remainingPlanQty} of ${plannedQty} ${planLine.unit}).`;
    } else if (reqQty > warehouseAvailableQty + 1e-6) {
      comparisonStatus = "Insufficient Stock";
      mismatchReason = `Requested ${reqQty} ${reqItem.unit} exceeds available warehouse stock (${warehouseAvailableQty} ${reqItem.unit}).`;
    }

    if (comparisonStatus !== "Matched") {
      mismatchReasons.push(`${reqItem.itemCode}: ${mismatchReason}`);
    }

    comparedItems.push({
      id: `MRI-${Date.now()}-${i}`,
      requestId: "",
      itemId: planLine.itemId,
      itemCode: planLine.itemCode,
      itemName: planLine.itemName,
      specification: reqItem.specification || planLine.specification,
      inventoryType: planLine.inventoryType,
      unit: reqItem.unit,
      plannedQty,
      previouslyApprovedOrIssuedQty: prevQty,
      remainingPlanQty,
      requestedQty: reqQty,
      approvedQty: comparisonStatus === "Matched" ? reqQty : 0,
      dispatchedQty: 0,
      remainingDispatchQty: comparisonStatus === "Matched" ? reqQty : 0,
      warehouseAvailableQty,
      comparisonStatus,
      mismatchReason: mismatchReason || undefined,
    });
  }

  return {
    comparedItems,
    hasMismatch: mismatchReasons.length > 0,
    mismatchSummary: mismatchReasons.join(" | "),
  };
}

/**
 * Generates deterministic tamper-evident QR verification code & SHA-256 signature.
 */
export async function generateGatePassVerification(params: {
  gatePassNumber: string;
  voucherType: string;
  voucherId: string;
  vehicleNumber: string;
  itemsSummary: string;
}): Promise<{ qrVerificationCode: string; verificationHash: string }> {
  const payload = `${params.gatePassNumber}|${params.voucherType}|${params.voucherId}|${params.vehicleNumber.trim().toUpperCase()}|${params.itemsSummary.trim()}`;
  let hashHex = "";
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.subtle) {
    const enc = new TextEncoder().encode(payload);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", enc);
    hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 24)
      .toUpperCase();
  } else {
    // Fallback deterministic checksum in restricted test runtimes
    let h = 2166136261;
    for (let i = 0; i < payload.length; i++) {
      h ^= payload.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    hashHex = Math.abs(h).toString(16).toUpperCase().padStart(12, "0");
  }
  return {
    qrVerificationCode: `GPQR:${params.gatePassNumber}:${hashHex}`,
    verificationHash: hashHex,
  };
}

export async function verifyGatePassIntegrity(gp: GatePassRecord, scannedCode: string): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const { qrVerificationCode, verificationHash } = await generateGatePassVerification({
    gatePassNumber: gp.gatePassNumber,
    voucherType: gp.voucherType,
    voucherId: gp.voucherId,
    vehicleNumber: gp.vehicleNumber,
    itemsSummary: gp.itemsSummary,
  });

  if (gp.verificationHash !== verificationHash || gp.qrVerificationCode !== qrVerificationCode) {
    return {
      valid: false,
      reason: "Gate Pass manifest or vehicle tampered — cryptographic verification hash mismatch.",
    };
  }
  if (scannedCode.trim() !== gp.qrVerificationCode && scannedCode.trim() !== gp.gatePassNumber) {
    return {
      valid: false,
      reason: "Scanned QR / Gate Pass code does not match registered Gate Pass.",
    };
  }
  return { valid: true };
}

/**
 * Dispatches real notification via NotificationService AND returns an InventoryNotificationRecord
 * for Firestore persistence across all 20 event triggers.
 */
export function buildAndDispatchInventoryNotification(params: {
  eventType: InventoryNotificationRecord["eventType"];
  title: string;
  message: string;
  severity: InventoryNotificationRecord["severity"];
  targetRoles: (UserRole | string)[];
  projectId?: string;
  projectName?: string;
  locationId?: string;
  referenceId?: string;
  referenceNumber?: string;
  actorName: string;
  actorRole: string;
}): InventoryNotificationRecord {
  const record: InventoryNotificationRecord = {
    id: `INVNOTIF-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    eventType: params.eventType,
    title: params.title,
    message: params.message,
    severity: params.severity,
    targetRoles: params.targetRoles.map(String),
    projectId: params.projectId,
    locationId: params.locationId,
    referenceId: params.referenceId,
    referenceNumber: params.referenceNumber,
    readByUids: [],
    createdAt: new Date().toISOString(),
  };

  try {
    NotificationService.createNotification({
      title: params.title,
      titleAm: params.title,
      description: params.message,
      descriptionAm: params.message,
      category:
        params.eventType.includes("REQUEST")
          ? "Material Request Notifications"
          : params.eventType.includes("DIRECTOR")
          ? "Material Approval Notifications"
          : params.eventType.includes("RETURN") || params.eventType.includes("QUARANTINED")
          ? "Material Return Notifications"
          : params.eventType.includes("DISPATCH") || params.eventType.includes("TRANSPORT")
          ? "Material Transfer Notifications"
          : "Warehouse Notifications",
      priority:
        params.severity === "critical"
          ? "Critical"
          : params.severity === "warning"
          ? "High"
          : "Medium",
      status: "Unread",
      projectName: params.projectName || "All Projects",
      sender: params.actorName,
      senderRole: params.actorRole,
      receiver: params.targetRoles.map(String).join(", "),
      targetRoles: params.targetRoles,
      deliveryChannels: { inApp: true, push: true, email: false, sms: false },
      actionTab: "warehouseSiteStore",
    });
  } catch {
    // Non-blocking in server/headless test mode
  }

  return record;
}

// ============================================================================
// 15 DASHBOARD KPIs & 6 INTERACTIVE CHART DATA AGGREGATORS
// ============================================================================

export interface WarehouseDashboardDataset {
  warehouses: WarehouseRecord[];
  projectStores: ProjectStoreRecord[];
  categories: InventoryCategoryRecord[];
  items: InventoryItemRecord[];
  stockBalances: StockBalanceRecord[];
  stockLedger: StockLedgerEntry[];
  materialPlans: MaterialPlanRecord[];
  materialRequests: EngineeringMaterialRequest[];
  grvs: GoodsReceivingVoucher[];
  givs: GoodsIssueVoucher[];
  mrvs: MaterialReturnVoucher[];
  fixedAssets: FixedAssetRecord[];
  fatovs: FixedAssetTransferOut[];
  fativs: FixedAssetTransferIn[];
  transports: TransportationRecord[];
  gatePasses: GatePassRecord[];
  commercialInvoices: CommercialInvoiceRecord[];
  auditLogs: InventoryAuditLogRecord[];
}

export interface WarehouseDashboardKpis {
  totalInventoryItems: number;
  totalWarehouseConsumableStock: number;
  totalProjectStoreConsumableStock: number;
  totalInventoryValuation: number;
  totalFixedAssetsBigBalance: number;
  fixedAssetsInWarehouse: number;
  fixedAssetsInProjects: number;
  pendingMaterialRequests: number;
  pendingDirectorApprovals: number;
  approvedRequestsPendingDispatch: number;
  dispatchedInTransitCount: number;
  pendingGatePasses: number;
  lowStockAlertsCount: number;
  damagedQuarantineStockCount: number;
  totalGrvsWithCommercialInvoices: number;
}

export function computeDashboardKpisAndCharts(
  dataset: WarehouseDashboardDataset,
  filters: WarehouseDashboardFilters
) {
  const inDateRange = (iso?: string) => {
    if (!iso) return true;
    const d = iso.slice(0, 10);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo && d > filters.dateTo) return false;
    return true;
  };

  const itemById = new Map(dataset.items.map((it) => [it.id, it]));

  const filteredItems = dataset.items.filter((it) => {
    if (filters.categoryId && filters.categoryId !== "ALL" && it.categoryId !== filters.categoryId) return false;
    if (filters.inventoryType !== "ALL" && it.inventoryType !== filters.inventoryType) return false;
    return true;
  });

  const filteredBalances = dataset.stockBalances.filter((b) => {
    if (filters.projectId && filters.projectId !== "ALL" && b.projectId !== filters.projectId) return false;
    if (filters.locationId && filters.locationId !== "ALL" && b.locationId !== filters.locationId) return false;
    if (filters.inventoryType !== "ALL" && b.inventoryType !== filters.inventoryType) return false;
    const item = itemById.get(b.itemId);
    if (filters.categoryId && filters.categoryId !== "ALL" && item?.categoryId !== filters.categoryId) return false;
    return true;
  });

  const filteredAssets = dataset.fixedAssets.filter((fa) => {
    if (filters.inventoryType === "Consumable") return false;
    if (filters.projectId && filters.projectId !== "ALL" && fa.currentProjectId !== filters.projectId) return false;
    if (filters.locationId && filters.locationId !== "ALL" && fa.currentLocationId !== filters.locationId) return false;
    const item = itemById.get(fa.itemId);
    if (filters.categoryId && filters.categoryId !== "ALL" && item?.categoryId !== filters.categoryId) return false;
    return true;
  });

  const filteredRequests = dataset.materialRequests.filter((r) => {
    if (filters.projectId && filters.projectId !== "ALL" && r.projectId !== filters.projectId) return false;
    if (filters.locationId && filters.locationId !== "ALL" && r.warehouseId !== filters.locationId && r.projectStoreId !== filters.locationId) return false;
    if (!inDateRange(r.requestedDate)) return false;
    return true;
  });

  const filteredLedger = dataset.stockLedger.filter((l) => {
    if (filters.projectId && filters.projectId !== "ALL" && l.projectId !== filters.projectId) return false;
    if (filters.locationId && filters.locationId !== "ALL" && l.locationId !== filters.locationId) return false;
    if (filters.inventoryType !== "ALL" && l.inventoryType !== filters.inventoryType) return false;
    if (!inDateRange(l.createdAt)) return false;
    return true;
  });

  const kpis: WarehouseDashboardKpis = {
    totalInventoryItems: filteredItems.length,
    totalWarehouseConsumableStock: round2(
      filteredBalances
        .filter((b) => b.locationType === "Warehouse" && b.inventoryType === "Consumable")
        .reduce((s, b) => s + b.availableQty, 0)
    ),
    totalProjectStoreConsumableStock: round2(
      filteredBalances
        .filter((b) => b.locationType === "ProjectStore" && b.inventoryType === "Consumable")
        .reduce((s, b) => s + b.availableQty, 0)
    ),
    totalInventoryValuation: round2(
      filteredBalances.reduce((s, b) => s + (b.totalValuation || 0), 0) +
        filteredAssets.reduce((s, a) => s + (a.purchaseCost || 0), 0)
    ),
    totalFixedAssetsBigBalance: filteredAssets.length,
    fixedAssetsInWarehouse: filteredAssets.filter((a) => a.currentLocationType === "Warehouse").length,
    fixedAssetsInProjects: filteredAssets.filter((a) => a.currentLocationType === "ProjectStore").length,
    pendingMaterialRequests: filteredRequests.filter((r) =>
      ["Submitted", "Warehouse Reviewing", "Returned by Warehouse Manager"].includes(r.status)
    ).length,
    pendingDirectorApprovals: filteredRequests.filter(
      (r) => r.status === "Verified Pending Director"
    ).length,
    approvedRequestsPendingDispatch: filteredRequests.filter((r) =>
      ["Director Approved", "Partially Dispatched"].includes(r.status)
    ).length,
    dispatchedInTransitCount: dataset.transports.filter((t) =>
      ["Dispatched", "In Transit", "Arrived", "Receiving Verification"].includes(t.status)
    ).length,
    pendingGatePasses: dataset.gatePasses.filter((g) => g.status === "Issued" || g.status === "Exit Verified").length,
    lowStockAlertsCount: filteredBalances.filter(
      (b) => b.availableQty <= (b.reorderPoint || b.minStockLevel || 0)
    ).length,
    damagedQuarantineStockCount: round2(
      filteredBalances.reduce((s, b) => s + (b.quarantineQty || 0), 0) +
        filteredAssets.filter((a) => a.condition !== "Good").length
    ),
    totalGrvsWithCommercialInvoices: dataset.grvs.filter(
      (g) => Boolean(g.commercialInvoiceId && g.commercialInvoiceUrl) && inDateRange(g.receivedDate)
    ).length,
  };

  // Chart 1: Consumables Stock vs Fixed Assets by Category
  const catMap = new Map<string, { category: string; consumablesQty: number; fixedAssetsCount: number; valuation: number }>();
  for (const b of filteredBalances) {
    const key = b.categoryName || "General";
    const cur = catMap.get(key) || { category: key, consumablesQty: 0, fixedAssetsCount: 0, valuation: 0 };
    if (b.inventoryType === "Consumable") cur.consumablesQty = round2(cur.consumablesQty + b.availableQty);
    cur.valuation = round2(cur.valuation + (b.totalValuation || 0));
    catMap.set(key, cur);
  }
  for (const fa of filteredAssets) {
    const key = fa.categoryName || "Fixed Assets";
    const cur = catMap.get(key) || { category: key, consumablesQty: 0, fixedAssetsCount: 0, valuation: 0 };
    cur.fixedAssetsCount += 1;
    cur.valuation = round2(cur.valuation + (fa.purchaseCost || 0));
    catMap.set(key, cur);
  }
  const stockByCategoryChart = Array.from(catMap.values());

  // Chart 2: Warehouse vs Project Store Stock Distribution
  const locMap = new Map<string, { location: string; availableQty: number; quarantineQty: number; valuation: number }>();
  for (const b of filteredBalances) {
    const cur = locMap.get(b.locationName) || {
      location: b.locationName,
      availableQty: 0,
      quarantineQty: 0,
      valuation: 0,
    };
    cur.availableQty = round2(cur.availableQty + b.availableQty);
    cur.quarantineQty = round2(cur.quarantineQty + (b.quarantineQty || 0));
    cur.valuation = round2(cur.valuation + (b.totalValuation || 0));
    locMap.set(b.locationName, cur);
  }
  const locationDistributionChart = Array.from(locMap.values());

  // Chart 3: Material Plan vs Requested vs Dispatched Comparison
  const planCompareChart = dataset.materialPlans
    .filter((p) => !filters.projectId || filters.projectId === "ALL" || p.projectId === filters.projectId)
    .map((p) => {
      const planned = (p.items || []).reduce((s, i) => s + (i.plannedQty || 0), 0);
      const reqs = filteredRequests.filter((r) => r.planId === p.id && r.status !== "Director Disapproved");
      const requested = reqs.reduce((s, r) => s + (r.items || []).reduce((si, i) => si + (i.requestedQty || 0), 0), 0);
      const dispatched = reqs.reduce((s, r) => s + (r.items || []).reduce((si, i) => si + (i.dispatchedQty || 0), 0), 0);
      return {
        plan: p.planNumber,
        project: p.projectName,
        planned: round2(planned),
        requested: round2(requested),
        dispatched: round2(dispatched),
      };
    });

  // Chart 4: Monthly/Daily Inward vs Outward Movement Trend
  const trendMap = new Map<string, { date: string; received: number; dispatched: number; returned: number }>();
  for (const le of filteredLedger) {
    const day = (le.createdAt || "").slice(0, 10) || "Unknown";
    const cur = trendMap.get(day) || { date: day, received: 0, dispatched: 0, returned: 0 };
    if (le.voucherType === "GRV") cur.received = round2(cur.received + le.quantity);
    if (le.voucherType === "GIV" || le.voucherType === "FATOV") cur.dispatched = round2(cur.dispatched + le.quantity);
    if (le.voucherType === "MRV" || le.voucherType === "QUARANTINE_IN") cur.returned = round2(cur.returned + le.quantity);
    trendMap.set(day, cur);
  }
  const movementTrendChart = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Chart 5: Fixed Assets Location & Condition Breakdown
  const assetCondMap = new Map<string, number>();
  for (const fa of filteredAssets) {
    assetCondMap.set(fa.condition, (assetCondMap.get(fa.condition) || 0) + 1);
  }
  const fixedAssetConditionChart = Array.from(assetCondMap.entries()).map(([condition, count]) => ({
    condition,
    count,
  }));

  // Chart 6: Transport & Gate Pass Status Summary
  const transportStatusMap = new Map<string, number>();
  for (const tr of dataset.transports) {
    transportStatusMap.set(tr.status, (transportStatusMap.get(tr.status) || 0) + 1);
  }
  const transportStatusChart = Array.from(transportStatusMap.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  return {
    kpis,
    charts: {
      stockByCategoryChart,
      locationDistributionChart,
      planCompareChart,
      movementTrendChart,
      fixedAssetConditionChart,
      transportStatusChart,
    },
  };
}

// ============================================================================
// 22 REPORT GENERATORS + EXCEL & PRINTABLE PDF EXPORT
// ============================================================================

export const REPORT_CATALOG: { id: WarehouseReportType; title: string; category: string }[] = [
  { id: "WAREHOUSE_STOCK_BALANCE", title: "1. Warehouse Stock Balance Report", category: "Inventory" },
  { id: "PROJECT_SITE_STORE_BALANCE", title: "2. Project Site Store Stock Balance Report", category: "Inventory" },
  { id: "STOCK_MOVEMENT_LEDGER", title: "3. Stock Movement Ledger Report (GRV, GIV, MRV, Returns)", category: "Ledger" },
  { id: "GRV_REGISTER", title: "4. GRV Register Report (with Commercial Invoice verification)", category: "Receiving" },
  { id: "COMMERCIAL_INVOICE_REGISTER", title: "5. Commercial Invoice Register Report", category: "Receiving" },
  { id: "MATERIAL_PLAN_VS_REQUEST_VS_ISSUED", title: "6. Material Plan vs Request vs Issued Variance Report", category: "Planning" },
  { id: "PENDING_DIRECTOR_APPROVALS", title: "7. Pending & Completed Director Approvals Report", category: "Approvals" },
  { id: "GIV_DISPATCH_REGISTER", title: "8. GIV Dispatch Register Report", category: "Dispatch" },
  { id: "PARTIAL_DISPATCH_BALANCE", title: "9. Partial Dispatch Balance Report (Approved vs Issued vs Remaining)", category: "Dispatch" },
  { id: "FIXED_ASSETS_BIG_BALANCE", title: "10. Fixed Assets BIG BALANCE Warehouse Report", category: "Fixed Assets" },
  { id: "PROJECT_FIXED_ASSET_REGISTER", title: "11. Per-Project Fixed Asset Register Report", category: "Fixed Assets" },
  { id: "FATOV_FATIV_ASSET_TRANSFER", title: "12. FATOV & FATIV Fixed Asset Transfer Report", category: "Fixed Assets" },
  { id: "ASSET_LOCATION_HISTORY", title: "13. Asset Location & Transfer History Report", category: "Fixed Assets" },
  { id: "TRANSPORTATION_TRACKING", title: "14. Two-Way Transportation Tracking Report", category: "Logistics" },
  { id: "GATE_PASS_SECURITY_LOG", title: "15. Gate Pass Security Verification Log Report", category: "Security" },
  { id: "TWO_WAY_RETURN_MRV", title: "16. Two-Way Return (MRV) Report", category: "Returns" },
  { id: "DAMAGED_DEFECTIVE_QUARANTINE", title: "17. Damaged / Defective / Quarantine Stock Report", category: "Quarantine" },
  { id: "LOW_STOCK_REORDER", title: "18. Low Stock & Reorder Alert Report", category: "Inventory" },
  { id: "INVENTORY_VALUATION", title: "19. Inventory Valuation Report (FIFO / Weighted Moving Average)", category: "Finance" },
  { id: "FAST_SLOW_MOVING", title: "20. Fast / Slow Moving Consumables Report", category: "Analytics" },
  { id: "DISCREPANCY_SHORTAGE", title: "21. Discrepancy & Shortage Report (Sent vs Received)", category: "Audit" },
  { id: "AUDIT_TRAIL_APPROVAL_HISTORY", title: "22. Full Audit Trail & Approval History Report", category: "Audit" },
];

export interface GeneratedReportResult {
  reportType: WarehouseReportType;
  title: string;
  generatedAt: string;
  generatedBy: string;
  filtersApplied: WarehouseDashboardFilters;
  columns: string[];
  rows: Record<string, string | number>[];
}

export function generateWarehouseReportData(
  reportType: WarehouseReportType,
  dataset: WarehouseDashboardDataset,
  filters: WarehouseDashboardFilters,
  generatedBy: string
): GeneratedReportResult {
  const meta = REPORT_CATALOG.find((r) => r.id === reportType) || REPORT_CATALOG[0];
  const inRange = (iso?: string) => {
    if (!iso) return true;
    const d = iso.slice(0, 10);
    if (filters.dateFrom && d < filters.dateFrom) return false;
    if (filters.dateTo && d > filters.dateTo) return false;
    return true;
  };
  const matchProject = (pid?: string) =>
    !filters.projectId || filters.projectId === "ALL" || pid === filters.projectId;
  const matchLocation = (lid?: string) =>
    !filters.locationId || filters.locationId === "ALL" || lid === filters.locationId;

  let columns: string[] = [];
  let rows: Record<string, string | number>[] = [];

  switch (reportType) {
    case "WAREHOUSE_STOCK_BALANCE": {
      columns = ["Warehouse", "Item Code", "Item Name", "Category", "Type", "Unit", "Opening", "Received", "Returned", "Issued", "TransferOut", "TransferIn", "Available", "Quarantine", "Avg Cost (ETB)", "Total Valuation (ETB)"];
      rows = dataset.stockBalances
        .filter((b) => b.locationType === "Warehouse" && matchLocation(b.locationId) && (filters.inventoryType === "ALL" || b.inventoryType === filters.inventoryType))
        .map((b) => ({
          "Warehouse": b.locationName,
          "Item Code": b.itemCode,
          "Item Name": b.itemName,
          "Category": b.categoryName,
          "Type": b.inventoryType,
          "Unit": b.unit,
          "Opening": b.openingQty,
          "Received": b.receivedQty,
          "Returned": b.returnedQty,
          "Issued": b.issuedQty,
          "TransferOut": b.transferOutQty,
          "TransferIn": b.transferInQty,
          "Available": b.availableQty,
          "Quarantine": b.quarantineQty,
          "Avg Cost (ETB)": b.averageUnitCost,
          "Total Valuation (ETB)": b.totalValuation,
        }));
      break;
    }
    case "PROJECT_SITE_STORE_BALANCE": {
      columns = ["Project", "Site Store", "Item Code", "Item Name", "Unit", "Received/TransferIn", "Issued", "Returned", "Available", "Quarantine", "Total Valuation (ETB)"];
      rows = dataset.stockBalances
        .filter((b) => b.locationType === "ProjectStore" && matchProject(b.projectId) && matchLocation(b.locationId))
        .map((b) => ({
          "Project": b.projectName || b.projectId || "-",
          "Site Store": b.locationName,
          "Item Code": b.itemCode,
          "Item Name": b.itemName,
          "Unit": b.unit,
          "Received/TransferIn": round2(b.receivedQty + b.transferInQty),
          "Issued": b.issuedQty,
          "Returned": b.returnedQty,
          "Available": b.availableQty,
          "Quarantine": b.quarantineQty,
          "Total Valuation (ETB)": b.totalValuation,
        }));
      break;
    }
    case "STOCK_MOVEMENT_LEDGER": {
      columns = ["Date", "Voucher Type", "Voucher No", "Original GRV", "Location", "Item Code", "Item Name", "Direction", "Qty Delta", "Balance After", "Unit Cost", "Total Cost", "Method", "By"];
      rows = dataset.stockLedger
        .filter((l) => inRange(l.createdAt) && matchProject(l.projectId) && matchLocation(l.locationId))
        .map((l) => ({
          "Date": l.createdAt.slice(0, 19).replace("T", " "),
          "Voucher Type": l.voucherType,
          "Voucher No": l.voucherNo,
          "Original GRV": l.originalGrvNumber || "-",
          "Location": l.locationName,
          "Item Code": l.itemCode,
          "Item Name": l.itemName,
          "Direction": l.direction,
          "Qty Delta": l.quantityDelta,
          "Balance After": l.balanceAfter,
          "Unit Cost": l.unitCost,
          "Total Cost": l.totalCost,
          "Method": l.valuationMethodUsed,
          "By": l.createdByName,
        }));
      break;
    }
    case "GRV_REGISTER": {
      columns = ["GRV No", "Date", "Warehouse", "Supplier", "PO No", "Commercial Invoice No", "Invoice Attached", "Total Amount (ETB)", "Status", "Received By"];
      rows = dataset.grvs
        .filter((g) => inRange(g.receivedDate) && matchLocation(g.warehouseId))
        .map((g) => ({
          "GRV No": g.grvNumber,
          "Date": g.receivedDate,
          "Warehouse": g.warehouseName,
          "Supplier": g.supplierName,
          "PO No": g.poNumber || "-",
          "Commercial Invoice No": g.commercialInvoiceNo,
          "Invoice Attached": g.commercialInvoiceFileName || (g.commercialInvoiceUrl ? "Attached" : "Missing"),
          "Total Amount (ETB)": g.totalAmount,
          "Status": g.status,
          "Received By": g.receivedByName,
        }));
      break;
    }
    case "COMMERCIAL_INVOICE_REGISTER": {
      columns = ["Invoice No", "Invoice Date", "Supplier", "Linked GRV", "File Name", "Format", "Amount", "Currency", "Replacements Count", "Uploaded By"];
      rows = dataset.commercialInvoices
        .filter((c) => inRange(c.invoiceDate))
        .map((c) => ({
          "Invoice No": c.invoiceNumber,
          "Invoice Date": c.invoiceDate,
          "Supplier": c.supplierName,
          "Linked GRV": c.grvNumber || "-",
          "File Name": c.fileName,
          "Format": c.mimeType,
          "Amount": c.totalAmount,
          "Currency": c.currency,
          "Replacements Count": c.replacementHistory?.length || 0,
          "Uploaded By": c.uploadedByName,
        }));
      break;
    }
    case "MATERIAL_PLAN_VS_REQUEST_VS_ISSUED": {
      columns = ["Plan No", "Project", "Item Code", "Item Name", "Unit", "Planned Qty", "Requested Qty", "Approved Qty", "Dispatched Qty", "Remaining Plan"];
      for (const p of dataset.materialPlans.filter((mp) => matchProject(mp.projectId))) {
        const reqs = dataset.materialRequests.filter((r) => r.planId === p.id && r.status !== "Director Disapproved");
        for (const pi of (p.items || [])) {
          let reqQty = 0;
          let appQty = 0;
          let dispQty = 0;
          for (const r of reqs) {
            for (const ri of (r.items || [])) {
              if (ri.itemId === pi.itemId || ri.itemCode === pi.itemCode) {
                reqQty += ri.requestedQty || 0;
                appQty += ri.approvedQty || 0;
                dispQty += ri.dispatchedQty || 0;
              }
            }
          }
          rows.push({
            "Plan No": `${p.planNumber} (Rev ${p.revisionNumber})`,
            "Project": p.projectName,
            "Item Code": pi.itemCode,
            "Item Name": pi.itemName,
            "Unit": pi.unit,
            "Planned Qty": pi.plannedQty,
            "Requested Qty": round2(reqQty),
            "Approved Qty": round2(appQty),
            "Dispatched Qty": round2(dispQty),
            "Remaining Plan": round2(Math.max(0, pi.plannedQty - appQty)),
          });
        }
      }
      break;
    }
    case "PENDING_DIRECTOR_APPROVALS": {
      columns = ["Request No", "Date", "Project", "Site Store", "Plan Match", "Status", "Warehouse Verifier", "Director Decision By", "Director Comments / Reason"];
      rows = dataset.materialRequests
        .filter((r) => matchProject(r.projectId) && inRange(r.requestedDate))
        .map((r) => ({
          "Request No": r.requestNumber,
          "Date": r.requestedDate,
          "Project": r.projectName,
          "Site Store": r.projectStoreName,
          "Plan Match": r.hasPlanMismatch ? "Mismatch" : "Matched",
          "Status": r.status,
          "Warehouse Verifier": r.warehouseVerifiedByName || "-",
          "Director Decision By": r.directorDecisionByName || "Pending",
          "Director Comments / Reason": r.disapprovalReason || r.directorComments || "-",
        }));
      break;
    }
    case "GIV_DISPATCH_REGISTER": {
      columns = ["GIV No", "Request No", "Warehouse", "Destination Project Store", "Vehicle", "Driver", "Dispatched Qty Total", "Cost (ETB)", "Gate Pass No", "Status"];
      rows = dataset.givs
        .filter((g) => matchProject(g.projectId) && inRange(g.createdAt))
        .map((g) => ({
          "GIV No": g.givNumber,
          "Request No": g.requestNumber,
          "Warehouse": g.warehouseName,
          "Destination Project Store": g.projectStoreName,
          "Vehicle": g.vehicleNumber,
          "Driver": g.driverName,
          "Dispatched Qty Total": round2((g.items || []).reduce((s, i) => s + i.dispatchedQty, 0)),
          "Cost (ETB)": g.totalCost,
          "Gate Pass No": g.gatePassNumber || "-",
          "Status": g.status,
        }));
      break;
    }
    case "PARTIAL_DISPATCH_BALANCE": {
      columns = ["Request No", "Project", "Item Code", "Item Name", "Approved Qty", "Dispatched Qty", "Remaining Pending", "Status"];
      for (const r of dataset.materialRequests.filter((req) => matchProject(req.projectId))) {
        for (const ri of (r.items || [])) {
          if (ri.approvedQty > 0) {
            rows.push({
              "Request No": r.requestNumber,
              "Project": r.projectName,
              "Item Code": ri.itemCode,
              "Item Name": ri.itemName,
              "Approved Qty": ri.approvedQty,
              "Dispatched Qty": ri.dispatchedQty,
              "Remaining Pending": ri.remainingDispatchQty,
              "Status": r.status,
            });
          }
        }
      }
      break;
    }
    case "FIXED_ASSETS_BIG_BALANCE": {
      columns = ["Asset ID", "Item Code", "Asset Name", "Serial No", "Original GRV No", "Commercial Invoice No", "Purchase Date", "Purchase Cost", "Current Location", "Project", "Condition", "Status"];
      rows = dataset.fixedAssets
        .filter((fa) => matchProject(fa.currentProjectId) && matchLocation(fa.currentLocationId))
        .map((fa) => ({
          "Asset ID": fa.assetId,
          "Item Code": fa.itemCode,
          "Asset Name": fa.assetName,
          "Serial No": fa.serialNumber,
          "Original GRV No": fa.originalGrvNumber,
          "Commercial Invoice No": fa.commercialInvoiceNo,
          "Purchase Date": fa.purchaseDate,
          "Purchase Cost": fa.purchaseCost,
          "Current Location": fa.currentLocationName,
          "Project": fa.currentProjectName || "Main Warehouse",
          "Condition": fa.condition,
          "Status": fa.status,
        }));
      break;
    }
    case "PROJECT_FIXED_ASSET_REGISTER": {
      columns = ["Project", "Asset ID", "Asset Name", "Serial No", "Original GRV No", "Previous Location", "Current Store", "Receiver", "Condition", "Status"];
      rows = dataset.fixedAssets
        .filter((fa) => fa.currentLocationType === "ProjectStore" && matchProject(fa.currentProjectId))
        .map((fa) => ({
          "Project": fa.currentProjectName || "-",
          "Asset ID": fa.assetId,
          "Asset Name": fa.assetName,
          "Serial No": fa.serialNumber,
          "Original GRV No": fa.originalGrvNumber,
          "Previous Location": fa.previousLocationName || "-",
          "Current Store": fa.currentLocationName,
          "Receiver": fa.receiverName || "-",
          "Condition": fa.condition,
          "Status": fa.status,
        }));
      break;
    }
    case "FATOV_FATIV_ASSET_TRANSFER": {
      columns = ["FATOV No", "FATIV No", "Asset ID", "Asset Name", "Original GRV", "From", "To", "Sent Qty", "Received Qty", "Discrepancy", "Status"];
      rows = dataset.fatovs
        .filter((f) => matchProject(f.projectId) && inRange(f.createdAt))
        .map((f) => {
          const fi = dataset.fativs.find((x) => x.fatovId === f.id);
          return {
            "FATOV No": f.fatovNumber,
            "FATIV No": fi?.fativNumber || f.fativNumber || "Pending",
            "Asset ID": f.assetId,
            "Asset Name": f.assetName,
            "Original GRV": f.originalGrvNumber,
            "From": f.fromLocationName,
            "To": f.toLocationName,
            "Sent Qty": f.quantitySent,
            "Received Qty": fi ? fi.quantityReceived : 0,
            "Discrepancy": fi ? fi.discrepancyQty : 0,
            "Status": f.status,
          };
        });
      break;
    }
    case "ASSET_LOCATION_HISTORY": {
      columns = ["Asset ID", "Asset Name", "Original GRV", "Event Date", "Voucher", "From", "To", "Issuer", "Receiver", "Condition"];
      for (const fa of dataset.fixedAssets.filter((a) => matchProject(a.currentProjectId))) {
        for (const h of fa.transferHistory || []) {
          rows.push({
            "Asset ID": fa.assetId,
            "Asset Name": fa.assetName,
            "Original GRV": fa.originalGrvNumber,
            "Event Date": h.date,
            "Voucher": `${h.voucherType} ${h.voucherNumber}`,
            "From": h.fromLocation,
            "To": h.toLocation,
            "Issuer": h.issuerName,
            "Receiver": h.receiverName,
            "Condition": h.condition,
          });
        }
      }
      break;
    }
    case "TRANSPORTATION_TRACKING": {
      columns = ["Transport No", "Direction", "Reference Voucher", "Original GRV", "Origin", "Destination", "Vehicle", "Driver", "Handler", "Status", "Last Update"];
      rows = dataset.transports
        .filter((t) => matchProject(t.projectId) && inRange(t.createdAt))
        .map((t) => ({
          "Transport No": t.transportNumber,
          "Direction": t.direction,
          "Reference Voucher": `${t.referenceType} ${t.referenceNumber}`,
          "Original GRV": t.originalGrvNumber || "-",
          "Origin": t.originLocationName,
          "Destination": t.destinationLocationName,
          "Vehicle": t.vehicleNumber,
          "Driver": t.driverName,
          "Handler": t.handlerName || "-",
          "Status": t.status,
          "Last Update": t.updatedAt.slice(0, 19).replace("T", " "),
        }));
      break;
    }
    case "GATE_PASS_SECURITY_LOG": {
      columns = ["Gate Pass No", "Voucher", "Original GRV", "Origin", "Destination", "Vehicle", "Driver", "QR Code", "Exit Verified By", "Entry Verified By", "Status"];
      rows = dataset.gatePasses
        .filter((g) => matchProject(g.projectId) && inRange(g.issuedAt))
        .map((g) => ({
          "Gate Pass No": g.gatePassNumber,
          "Voucher": `${g.voucherType} ${g.voucherNumber}`,
          "Original GRV": g.originalGrvNumber || "-",
          "Origin": g.originLocationName,
          "Destination": g.destinationLocationName,
          "Vehicle": g.vehicleNumber,
          "Driver": g.driverName,
          "QR Code": g.qrVerificationCode,
          "Exit Verified By": g.exitVerifiedByName || "Pending",
          "Entry Verified By": g.entryVerifiedByName || "Pending",
          "Status": g.status,
        }));
      break;
    }
    case "TWO_WAY_RETURN_MRV": {
      columns = ["MRV No", "Direction", "Source", "Destination", "Ref GIV/GRV", "Total Returned", "Accepted Good", "Quarantined", "Status"];
      rows = dataset.mrvs
        .filter((m) => matchProject(m.projectId) && inRange(m.createdAt))
        .map((m) => ({
          "MRV No": m.mrvNumber,
          "Direction": m.direction,
          "Source": m.sourceLocationName,
          "Destination": m.destinationLocationName,
          "Ref GIV/GRV": m.originalGivNumber || m.originalGrvNumber || "-",
          "Total Returned": round2((m.items || []).reduce((s, i) => s + i.quantityReturned, 0)),
          "Accepted Good": round2((m.items || []).reduce((s, i) => s + i.quantityAcceptedGood, 0)),
          "Quarantined": round2((m.items || []).reduce((s, i) => s + i.quantityQuarantined, 0)),
          "Status": m.status,
        }));
      break;
    }
    case "DAMAGED_DEFECTIVE_QUARANTINE": {
      columns = ["Location", "Item Code", "Item Name", "Total Quarantine Qty", "Damaged Qty", "Defective Qty", "Under Inspection Qty", "Usable Available Qty"];
      rows = dataset.stockBalances
        .filter((b) => (b.quarantineQty || 0) > 0 && matchProject(b.projectId) && matchLocation(b.locationId))
        .map((b) => ({
          "Location": b.locationName,
          "Item Code": b.itemCode,
          "Item Name": b.itemName,
          "Total Quarantine Qty": b.quarantineQty,
          "Damaged Qty": b.damagedQty,
          "Defective Qty": b.defectiveQty,
          "Under Inspection Qty": b.underInspectionQty,
          "Usable Available Qty": b.availableQty,
        }));
      break;
    }
    case "LOW_STOCK_REORDER": {
      columns = ["Location", "Item Code", "Item Name", "Available Qty", "Reorder Point", "Min Level", "Shortfall", "Status"];
      rows = dataset.stockBalances
        .filter((b) => b.availableQty <= (b.reorderPoint || b.minStockLevel || 0) && matchProject(b.projectId) && matchLocation(b.locationId))
        .map((b) => ({
          "Location": b.locationName,
          "Item Code": b.itemCode,
          "Item Name": b.itemName,
          "Available Qty": b.availableQty,
          "Reorder Point": b.reorderPoint,
          "Min Level": b.minStockLevel,
          "Shortfall": round2(Math.max(0, (b.reorderPoint || b.minStockLevel) - b.availableQty)),
          "Status": b.availableQty === 0 ? "Out of Stock" : "Reorder Triggered",
        }));
      break;
    }
    case "INVENTORY_VALUATION": {
      columns = ["Location", "Location Type", "Item Code", "Item Name", "Method", "Available Qty", "Avg Unit Cost (ETB)", "Total Value (ETB)", "Active FIFO Layers"];
      rows = dataset.stockBalances
        .filter((b) => matchProject(b.projectId) && matchLocation(b.locationId))
        .map((b) => ({
          "Location": b.locationName,
          "Location Type": b.locationType,
          "Item Code": b.itemCode,
          "Item Name": b.itemName,
          "Method": b.valuationMethod,
          "Available Qty": b.availableQty,
          "Avg Unit Cost (ETB)": b.averageUnitCost,
          "Total Value (ETB)": b.totalValuation,
          "Active FIFO Layers": b.fifoLayers?.length || 0,
        }));
      break;
    }
    case "FAST_SLOW_MOVING": {
      const issueSumByItem = new Map<string, { code: string; name: string; totalMoved: number; txCount: number }>();
      for (const l of dataset.stockLedger.filter((x) => inRange(x.createdAt) && (x.voucherType === "GIV" || x.voucherType === "GRV"))) {
        const cur = issueSumByItem.get(l.itemId) || { code: l.itemCode, name: l.itemName, totalMoved: 0, txCount: 0 };
        cur.totalMoved = round2(cur.totalMoved + l.quantity);
        cur.txCount += 1;
        issueSumByItem.set(l.itemId, cur);
      }
      columns = ["Item Code", "Item Name", "Transaction Count", "Total Qty Moved", "Velocity Classification"];
      rows = Array.from(issueSumByItem.values())
        .sort((a, b) => b.totalMoved - a.totalMoved)
        .map((v) => ({
          "Item Code": v.code,
          "Item Name": v.name,
          "Transaction Count": v.txCount,
          "Total Qty Moved": v.totalMoved,
          "Velocity Classification": v.txCount >= 3 || v.totalMoved >= 100 ? "Fast Moving" : "Slow Moving",
        }));
      break;
    }
    case "DISCREPANCY_SHORTAGE": {
      columns = ["Source Ref", "Asset/Item", "Original GRV", "Sent Qty", "Received Qty", "Discrepancy", "Reason", "Reported By", "Date"];
      rows = dataset.fativs
        .filter((f) => f.discrepancyQty !== 0 && matchProject(f.projectId))
        .map((f) => ({
          "Source Ref": `${f.fatovNumber} -> ${f.fativNumber}`,
          "Asset/Item": `${f.assetId} ${f.assetName}`,
          "Original GRV": f.originalGrvNumber,
          "Sent Qty": f.quantitySent,
          "Received Qty": f.quantityReceived,
          "Discrepancy": f.discrepancyQty,
          "Reason": f.discrepancyReason || "-",
          "Reported By": f.receivedByName,
          "Date": f.confirmedAt.slice(0, 10),
        }));
      break;
    }
    case "AUDIT_TRAIL_APPROVAL_HISTORY": {
      columns = ["Timestamp", "Module", "Action", "Entity No", "Details", "Actor", "Role"];
      rows = dataset.auditLogs
        .filter((a) => inRange(a.timestamp) && matchProject(a.projectId))
        .map((a) => ({
          "Timestamp": a.timestamp.slice(0, 19).replace("T", " "),
          "Module": a.module,
          "Action": a.action,
          "Entity No": a.entityNumber || a.entityId,
          "Details": a.details,
          "Actor": a.actorName,
          "Role": a.actorRole,
        }));
      break;
    }
  }

  return {
    reportType,
    title: meta.title,
    generatedAt: new Date().toISOString(),
    generatedBy,
    filtersApplied: filters,
    columns,
    rows,
  };
}

export function exportReportToExcel(report: GeneratedReportResult, filenamePrefix = "OVID-Warehouse-Report"): Uint8Array {
  const wb = XLSX.utils.book_new();
  const headerRows = [
    ["DIGITAL CONSTRUCTION ERP — WAREHOUSE & SITE STORE REPORT"],
    ["Report", report.title],
    ["Generated At", report.generatedAt],
    ["Generated By", report.generatedBy],
    ["Project Filter", report.filtersApplied.projectId || "ALL", "Location Filter", report.filtersApplied.locationId || "ALL", "Type", report.filtersApplied.inventoryType],
    [],
    report.columns,
    ...report.rows.map((r) => report.columns.map((c) => r[c] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 28));

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filenamePrefix}-${report.reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Headless environment (Vitest/jsdom)
    }
  }
  return new Uint8Array(buf);
}

export function buildPrintableReportHtml(report: GeneratedReportResult): string {
  const th = report.columns.map((c) => `<th style="border:1px solid #cbd5e1;padding:6px 8px;background:#f8fafc;text-align:left;font-size:11px;">${c}</th>`).join("");
  const tr = report.rows
    .map(
      (r) =>
        `<tr>${report.columns
          .map((c) => `<td style="border:1px solid #cbd5e1;padding:5px 8px;font-size:11px;">${String(r[c] ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><title>${report.title}</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}@media print{.no-print{display:none}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px"><div><h1 style="margin:0;font-size:18px;">OVID REAL ESTATE — DIGITAL CONSTRUCTION ERP</h1><h2 style="margin:4px 0 0 0;font-size:14px;color:#334155;">${report.title}</h2></div><div style="text-align:right;font-size:11px;color:#475569;"><div>Generated: ${report.generatedAt}</div><div>Generated By: ${report.generatedBy}</div><div>Project: ${report.filtersApplied.projectId || "ALL"} | Location: ${report.filtersApplied.locationId || "ALL"}</div></div></div><table><thead><tr>${th}</tr></thead><tbody>${tr || `<tr><td colspan="${report.columns.length}" style="padding:12px;text-align:center;">No records matched filter criteria.</td></tr>`}</tbody></table><div style="margin-top:32px;display:flex;justify-content:space-between;font-size:11px;"><span>Prepared By: _____________________</span><span>Verified By Warehouse Manager: _____________________</span><span>Approved By Director / Finance: _____________________</span></div></body></html>`;
}

export function buildPrintableVoucherHtml(params: {
  voucherTitle: string;
  voucherNumber: string;
  subtitle?: string;
  metadata: { label: string; value: string }[];
  columns: string[];
  rows: (string | number)[][];
  qrCodeText?: string;
  signatures: string[];
}): string {
  const metaHtml = params.metadata
    .map((m) => `<div style="font-size:11px;"><strong>${m.label}:</strong> ${m.value}</div>`)
    .join("");
  const th = params.columns
    .map((c) => `<th style="border:1px solid #94a3b8;padding:6px 8px;background:#f1f5f9;font-size:11px;text-align:left;">${c}</th>`)
    .join("");
  const tr = params.rows
    .map((r) => `<tr>${r.map((cell) => `<td style="border:1px solid #94a3b8;padding:6px 8px;font-size:11px;">${String(cell)}</td>`).join("")}</tr>`)
    .join("");
  const sigs = params.signatures
    .map((s) => `<div style="flex:1;text-align:center;font-size:11px;padding-top:28px;border-top:1px solid #64748b;">${s}</div>`)
    .join("");

  return `<!DOCTYPE html><html><head><title>${params.voucherNumber}</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:16px}</style></head><body><div style="border:2px solid #0f172a;padding:16px;"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #cbd5e1;padding-bottom:10px;"><div><div style="font-size:11px;font-weight:700;color:#dc2626;">OVID REAL ESTATE — DIGITAL CONSTRUCTION ERP</div><h1 style="margin:2px 0;font-size:18px;">${params.voucherTitle}</h1><div style="font-size:12px;color:#475569;">${params.subtitle || ""}</div></div><div style="text-align:right;"><div style="font-family:monospace;font-size:16px;font-weight:800;">${params.voucherNumber}</div>${params.qrCodeText ? `<div style="font-family:monospace;font-size:10px;color:#334155;margin-top:4px;">QR: ${params.qrCodeText}</div>` : ""}</div></div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;">${metaHtml}</div><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table><div style="display:flex;gap:24px;margin-top:36px;">${sigs}</div></div></body></html>`;
}
