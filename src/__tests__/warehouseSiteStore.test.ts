import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { UserRole, WarehouseDashboardFilters } from "../types";
import {
  createWarehouseStoreRouter,
  InMemoryWarehouseStore,
} from "../server/warehouseStoreRouter";
import {
  ALL_TRANSPORT_STATUSES,
  REPORT_CATALOG,
  buildPrintableReportHtml,
  computeDashboardKpisAndCharts,
  computeStockClosingBalance,
  exportReportToExcel,
} from "../services/warehouseManagementService";
import {
  canPerformWarehouseModuleAction,
  getAuthorizedSectionsForRole,
  isStrictDirectorRole,
  resolveCanonicalWarehouseRole,
  resolveExtendedWarehouseRole,
  STORE_MANAGER_ALLOWED_REPORTS,
} from "../services/warehouseStoreRbac";
import {
  getReportTitle,
  getWarehouseSectionLabel,
  tr,
  translateWarehouseStatus,
} from "../components/warehouse/warehouseI18n";
import { MaterialPlanningAndRequestsView } from "../components/warehouse/MaterialPlanningAndRequestsView";
import { normalizeMaterialRequestRecord } from "../services/warehouseStoreDataService";

function makeTestApp() {
  const store = new InMemoryWarehouseStore();
  // Seed initial catalog items, warehouses, and project stores
  store.seed("inventoryItems", [
    {
      id: "ITEM-CEM",
      itemCode: "CEM-42.5",
      itemName: "OPC Cement 50kg",
      specification: "Grade 42.5R",
      categoryId: "CAT-CON",
      categoryName: "Concrete & Cement",
      inventoryType: "Consumable",
      unit: "bags",
      minStockLevel: 50,
      reorderPoint: 80,
      standardUnitCost: 900,
      trackBatch: true,
      trackExpiry: false,
      trackSerialNumber: false,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ITEM-CRANE",
      itemCode: "FA-MIX-01",
      itemName: "Concrete Transit Mixer 9m3",
      specification: "Diesel Heavy Plant",
      categoryId: "CAT-EQP",
      categoryName: "Heavy Machinery",
      inventoryType: "Fixed Asset",
      unit: "unit",
      minStockLevel: 1,
      reorderPoint: 1,
      standardUnitCost: 4500000,
      trackBatch: false,
      trackExpiry: false,
      trackSerialNumber: true,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  store.seed("warehouses", [
    {
      id: "WH-CENTRAL",
      warehouseCode: "WH-001",
      name: "Kality Central Warehouse",
      location: "Addis Ababa - Kality",
      managerUid: "UID-WHM",
      managerName: "Abebe WarehouseMgr",
      status: "Active",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  store.seed("projectStores", [
    {
      id: "PS-BOLE",
      storeCode: "PS-001",
      name: "Bole Tower Site Store",
      projectId: "PROJ-BOLE",
      projectName: "Bole Heights Tower",
      location: "Bole Subcity",
      storeOwnerName: "Dawit StoreOwner",
      status: "Active",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "PS-CMC",
      storeCode: "PS-002",
      name: "CMC Villas Site Store",
      projectId: "PROJ-CMC",
      projectName: "CMC Residential Complex",
      location: "CMC Area",
      storeOwnerName: "Hanna StoreOwner",
      status: "Active",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  const app = express();
  app.use(express.json());

  // Mock authenticated ERP middleware driven by headers x-test-role, x-test-project
  const { router } = createWarehouseStoreRouter({
    store,
    verifyAppCheck: (_req, _res, next) => next(),
    requireAuth: (req: any, _res, next) => {
      req.authUser = { uid: req.header("x-test-uid") || "UID-TEST", email: "user@ovid.et" };
      req.rawIdToken = "test-token";
      next();
    },
    requireActiveUser: (req: any, _res, next) => {
      req.userProfile = {
        uid: req.header("x-test-uid") || "UID-TEST",
        displayName: req.header("x-test-name") || "Test Actor",
        role: req.header("x-test-role") || UserRole.WAREHOUSE_MANAGER,
        assignedProject: req.header("x-test-project") || "",
        assignedSite: req.header("x-test-site") || "",
        status: "Active",
      };
      next();
    },
    getProjectConfig: () => ({ projectId: "digital-construction-erp", databaseId: "(default)" }),
  });

  app.use(router);
  return { app, store };
}

function asRole(role: UserRole | string, extra: Record<string, string> = {}) {
  return {
    "x-test-role": role,
    "x-test-uid": `UID-${String(role).replace(/\s+/g, "_")}`,
    "x-test-name": `${role} User`,
    ...extra,
  };
}

describe("Warehouse & Site Store Enterprise Management — Full Functional & Security Suite", () => {
  let app: express.Express;
  let store: InMemoryWarehouseStore;

  beforeEach(() => {
    const setup = makeTestApp();
    app = setup.app;
    store = setup.store;
  });

  // 1 & 2. GRV MANDATORY COMMERCIAL INVOICE ENFORCEMENT
  it("blocks GRV finalization without valid Commercial Invoice PDF/JPG/PNG and succeeds with valid invoice + BIG BALANCE capitalization", async () => {
    const blocked = await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Dangote Cement PLC",
        commercialInvoice: { invoiceNumber: "", fileUrl: "", fileName: "", mimeType: "" },
        items: [
          {
            itemId: "ITEM-CEM",
            itemCode: "CEM-42.5",
            itemName: "OPC Cement 50kg",
            inventoryType: "Consumable",
            unit: "bags",
            quantityReceived: 100,
            unitCost: 850,
          },
        ],
      });
    expect(blocked.status).toBe(400);

    // Invalid mime type blocked
    const badMime = await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Dangote Cement PLC",
        commercialInvoice: {
          invoiceNumber: "INV-2026-001",
          invoiceDate: "2026-10-01",
          fileUrl: "https://storage.example/inv.exe",
          fileName: "malware.exe",
          mimeType: "application/x-msdownload",
        },
        items: [
          {
            itemId: "ITEM-CEM",
            itemCode: "CEM-42.5",
            itemName: "OPC Cement 50kg",
            inventoryType: "Consumable",
            unit: "bags",
            quantityReceived: 100,
            unitCost: 850,
          },
        ],
      });
    expect(badMime.status).toBe(400);

    // Valid GRV #1 (Layer 1: 100 @ 800) + Fixed Asset Transit Mixer
    const ok1 = await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Dangote Cement PLC",
        poNumber: "PO-2026-10",
        receivedDate: "2026-10-01",
        commercialInvoice: {
          invoiceNumber: "CINV-001",
          invoiceDate: "2026-10-01",
          fileUrl: "https://firebasestorage.googleapis.com/v0/b/demo/o/CINV-001.pdf",
          fileName: "CINV-001.pdf",
          mimeType: "application/pdf",
        },
        items: [
          {
            itemId: "ITEM-CEM",
            itemCode: "CEM-42.5",
            itemName: "OPC Cement 50kg",
            inventoryType: "Consumable",
            unit: "bags",
            quantityReceived: 100,
            unitCost: 800,
            batchNumber: "B-101",
          },
          {
            itemId: "ITEM-CRANE",
            itemCode: "FA-MIX-01",
            itemName: "Concrete Transit Mixer 9m3",
            inventoryType: "Fixed Asset",
            unit: "unit",
            quantityReceived: 1,
            unitCost: 4500000,
            serialNumbers: ["SN-MIX-9988"],
          },
        ],
      });

    expect(ok1.status).toBe(201);
    expect(ok1.body.data.grv.grvNumber).toMatch(/^GRV-\d{4}-0001$/);
    expect(ok1.body.data.commercialInvoice.invoiceNumber).toBe("CINV-001");
    expect(ok1.body.data.fixedAssetsCreated).toHaveLength(1);
    expect(ok1.body.data.fixedAssetsCreated[0].originalGrvNumber).toMatch(/^GRV-\d{4}-0001$/);
    expect(ok1.body.data.fixedAssetsCreated[0].assetId).toBe("OVID-FA-00001");
  });

  // 3. FIFO VS WEIGHTED MOVING AVERAGE COST VALUATION + PROSPECTIVE SWITCH
  it("computes accurate FIFO layers and allows Finance Manager to switch prospectively to Weighted Moving Average without altering historical ledger", async () => {
    // GRV 1: 100 @ 800
    await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Sup A",
        commercialInvoice: {
          invoiceNumber: "INV-1",
          invoiceDate: "2026-10-01",
          fileUrl: "https://example.com/1.pdf",
          fileName: "1.pdf",
          mimeType: "application/pdf",
        },
        items: [
          { itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", inventoryType: "Consumable", unit: "bags", quantityReceived: 100, unitCost: 800 },
        ],
      });

    // GRV 2: 100 @ 1000 => total 200 bags, valuation = 180,000, avg = 900
    await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Sup B",
        commercialInvoice: {
          invoiceNumber: "INV-2",
          invoiceDate: "2026-10-02",
          fileUrl: "https://example.com/2.jpg",
          fileName: "2.jpg",
          mimeType: "image/jpeg",
        },
        items: [
          { itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", inventoryType: "Consumable", unit: "bags", quantityReceived: 100, unitCost: 1000 },
        ],
      });

    // Plan + Request 120 bags
    const planRes = await request(app)
      .post("/api/warehouse/plans")
      .set(asRole(UserRole.OFFICE_MANAGER))
      .send({
        title: "Foundation Plan",
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", plannedQty: 150 }],
      });
    expect(planRes.status).toBe(201);

    const reqRes = await request(app)
      .post("/api/warehouse/requests")
      .set(asRole(UserRole.SITE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({
        planId: planRes.body.data.id,
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        projectStoreId: "PS-BOLE",
        projectStoreName: "Bole Tower Site Store",
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", requestedQty: 120 }],
      });
    expect(reqRes.body.data.hasPlanMismatch).toBe(false);

    await request(app)
      .post(`/api/warehouse/requests/${reqRes.body.data.id}/verify`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ action: "verify", remarks: "Matches BOQ" });

    await request(app)
      .post(`/api/warehouse/requests/${reqRes.body.data.id}/director-decision`)
      .set(asRole(UserRole.DIRECTOR))
      .send({ decision: "Director Approved" });

    // Dispatch 120 under FIFO => 100 * 800 + 20 * 1000 = 100,000! Remaining: 80 @ 1000 = 80,000
    const disp1 = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "GIV",
        requestId: reqRes.body.data.id,
        vehicleNumber: "ET-AA-100",
        driverName: "Bekele",
        dispatchItems: [{ itemId: "ITEM-CEM", dispatchQty: 120 }],
      });
    expect(disp1.status).toBe(201);
    expect(disp1.body.data.giv.totalCost).toBe(100000);

    // Non-Finance user CANNOT change valuation method
    const nonFin = await request(app)
      .post("/api/warehouse/settings/valuation")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ valuationMethod: "Weighted Moving Average" });
    expect(nonFin.status).toBe(403);

    // Finance Manager switches valuation method to Weighted Moving Average
    const finSwitch = await request(app)
      .post("/api/warehouse/settings/valuation")
      .set(asRole(UserRole.FINANCE_MANAGER))
      .send({ valuationMethod: "Weighted Moving Average", reason: "Q4 Financial Policy" });
    expect(finSwitch.status).toBe(200);
    expect(finSwitch.body.data.valuationMethod).toBe("Weighted Moving Average");

    // Verify historical FIFO ledger cost was NOT overwritten!
    const ledger = await store.listCollection<any>("stockLedger");
    const givEntry = ledger.find((l) => l.voucherType === "GIV");
    expect(givEntry.totalCost).toBe(100000);
    expect(givEntry.valuationMethodUsed).toBe("FIFO");
  });

  // 4, 5, 6, 7, 8, 9, 10. PLAN REVISIONS, MISMATCH RETURN, DIRECTOR-ONLY APPROVAL, PARTIAL DISPATCH, OVER-ISSUE BLOCK
  it("enforces Plan vs Request verification, Director-only approval/disapproval, Partial Dispatch GIV, and blocks over-issue/negative stock", async () => {
    // Seed 50 bags in Warehouse
    await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Sup A",
        commercialInvoice: { invoiceNumber: "INV-10", invoiceDate: "2026-10-01", fileUrl: "https://x.co/1.png", fileName: "1.png", mimeType: "image/png" },
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", inventoryType: "Consumable", unit: "bags", quantityReceived: 50, unitCost: 900 }],
      });

    // Office Manager Engineer creates Material Plan (planned: 40 bags) & revises to 50 bags
    const p = await request(app)
      .post("/api/warehouse/plans")
      .set(asRole(UserRole.OFFICE_MANAGER))
      .send({
        title: "Slab Plan",
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", plannedQty: 40 }],
      });
    const rev = await request(app)
      .post(`/api/warehouse/plans/${p.body.data.id}/revise`)
      .set(asRole(UserRole.OFFICE_MANAGER))
      .send({
        reason: "Structural engineer increased thickness",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", plannedQty: 50 }],
      });
    expect(rev.status).toBe(200);
    expect(rev.body.data.plan.revisionNumber).toBe(2);

    // Mismatch request (60 > planned 50)
    const badReq = await request(app)
      .post("/api/warehouse/requests")
      .set(asRole(UserRole.SITE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({
        planId: p.body.data.id,
        projectId: "PROJ-BOLE",
        projectStoreId: "PS-BOLE",
        warehouseId: "WH-CENTRAL",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", requestedQty: 60 }],
      });
    expect(badReq.body.data.hasPlanMismatch).toBe(true);

    // Warehouse Manager verify blocked due to mismatch!
    const blockedVerify = await request(app)
      .post(`/api/warehouse/requests/${badReq.body.data.id}/verify`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ action: "verify" });
    expect(blockedVerify.status).toBe(422);

    // Warehouse Manager returns with reason
    const retReq = await request(app)
      .post(`/api/warehouse/requests/${badReq.body.data.id}/verify`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ action: "return", reason: "Exceeds Rev 2 BOQ plan by 10 bags" });
    expect(retReq.status).toBe(200);
    expect(retReq.body.data.request.status).toBe("Returned by Warehouse Manager");

    // Valid matched request for 30 bags -> verified -> Director Disapproved permanently
    const disReq = await request(app)
      .post("/api/warehouse/requests")
      .set(asRole(UserRole.SITE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({
        planId: p.body.data.id,
        projectId: "PROJ-BOLE",
        projectStoreId: "PS-BOLE",
        warehouseId: "WH-CENTRAL",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", requestedQty: 20 }],
      });
    await request(app)
      .post(`/api/warehouse/requests/${disReq.body.data.id}/verify`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ action: "verify" });

    // Warehouse Manager CANNOT act as Director!
    const whAttemptDir = await request(app)
      .post(`/api/warehouse/requests/${disReq.body.data.id}/director-decision`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ decision: "Director Approved" });
    expect(whAttemptDir.status).toBe(403);

    // Director permanently disapproves
    const disRes = await request(app)
      .post(`/api/warehouse/requests/${disReq.body.data.id}/director-decision`)
      .set(asRole(UserRole.DIRECTOR))
      .send({ decision: "Director Disapproved", reason: "Deferred stage" });
    expect(disRes.status).toBe(200);

    // Dispatch on Disapproved request blocked & permanent decision lock prevents re-approval
    const reApprove = await request(app)
      .post(`/api/warehouse/requests/${disReq.body.data.id}/director-decision`)
      .set(asRole(UserRole.DIRECTOR))
      .send({ decision: "Director Approved" });
    expect(reApprove.status).toBe(409);

    const dispBlocked = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "GIV",
        requestId: disReq.body.data.id,
        vehicleNumber: "ET-1",
        driverName: "Ali",
        dispatchItems: [{ itemId: "ITEM-CEM", dispatchQty: 5 }],
      });
    expect(dispBlocked.status).toBe(403);

    // Create matched request for 30 bags -> Verify -> Director Approve -> Partial Dispatch 18 + Over-issue blocked + Final Partial Dispatch 12
    const okReq = await request(app)
      .post("/api/warehouse/requests")
      .set(asRole(UserRole.SITE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({
        planId: p.body.data.id,
        projectId: "PROJ-BOLE",
        projectStoreId: "PS-BOLE",
        warehouseId: "WH-CENTRAL",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", requestedQty: 30 }],
      });
    await request(app)
      .post(`/api/warehouse/requests/${okReq.body.data.id}/verify`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ action: "verify" });
    await request(app)
      .post(`/api/warehouse/requests/${okReq.body.data.id}/director-decision`)
      .set(asRole(UserRole.DIRECTOR))
      .send({ decision: "Director Approved" });

    // Partial Dispatch #1: 18 bags
    const p1 = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "GIV",
        requestId: okReq.body.data.id,
        vehicleNumber: "ET-AA-777",
        driverName: "Yohannes",
        dispatchItems: [{ itemId: "ITEM-CEM", dispatchQty: 18 }],
      });
    expect(p1.status).toBe(201);
    expect(p1.body.data.request.status).toBe("Partially Dispatched");
    expect(p1.body.data.request.items[0].remainingDispatchQty).toBe(12);

    // Over-issue blocked (attempting 15 when remaining is 12)
    const over = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "GIV",
        requestId: okReq.body.data.id,
        vehicleNumber: "ET-AA-777",
        driverName: "Yohannes",
        dispatchItems: [{ itemId: "ITEM-CEM", dispatchQty: 15 }],
      });
    expect(over.status).toBe(422);

    // Partial Dispatch #2: remaining 12 -> Fully Dispatched
    const p2 = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "GIV",
        requestId: okReq.body.data.id,
        vehicleNumber: "ET-AA-777",
        driverName: "Yohannes",
        dispatchItems: [{ itemId: "ITEM-CEM", dispatchQty: 12 }],
      });
    expect(p2.status).toBe(201);
    expect(p2.body.data.request.status).toBe("Fully Dispatched");

    // Verify Warehouse stock = 50 - 18 - 12 = 20 bags!
    const whBal = await store.getDoc<any>("stockBalances", "WH-CENTRAL__ITEM-CEM");
    expect(whBal.availableQty).toBe(20);
    expect(computeStockClosingBalance(whBal)).toBe(20);
  });

  // 11, 12, 13, 14, 15, 16. FATOV -> GATE PASS QR EXIT/ENTRY + TAMPER BLOCK -> TRANSPORT 11 STATUSES -> FATIV & DUPLICATE FATIV BLOCK
  it("handles FATOV fixed asset transfer, Gate Pass QR verification & tamper protection, transport lifecycle, FATIV receipt & duplicate FATIV block", async () => {
    const grvRes = await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Heavy Plant PLC",
        commercialInvoice: { invoiceNumber: "INV-FA-1", invoiceDate: "2026-10-05", fileUrl: "https://x.co/fa.pdf", fileName: "fa.pdf", mimeType: "application/pdf" },
        items: [{ itemId: "ITEM-CRANE", itemCode: "FA-MIX-01", itemName: "Concrete Transit Mixer 9m3", inventoryType: "Fixed Asset", unit: "unit", quantityReceived: 1, unitCost: 4500000, serialNumbers: ["SN-700"] }],
      });
    const asset = grvRes.body.data.fixedAssetsCreated[0];

    // Dispatch FATOV to Bole Tower Site Store
    const fatovRes = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "FATOV",
        assetDocId: asset.id,
        toLocationType: "ProjectStore",
        toLocationId: "PS-BOLE",
        toLocationName: "Bole Tower Site Store",
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        vehicleNumber: "ET-LOWBED-01",
        driverName: "Kebede",
      });
    expect(fatovRes.status).toBe(201);
    const { fatov, gatePass, transport } = fatovRes.body.data;

    // Asset MUST still show Warehouse as currentLocationId until FATIV receipt confirmation
    const assetInTransit = await store.getDoc<any>("fixedAssets", asset.id);
    expect(assetInTransit.status).toBe("In Transit");
    expect(assetInTransit.currentLocationId).toBe("WH-CENTRAL");

    // Gate Pass Tamper detection: invalid scanned code blocks & flags Tamper Blocked
    const gpTamper = await request(app)
      .post(`/api/warehouse/gate-passes/${gatePass.id}/verify`)
      .set(asRole(UserRole.GATE_SECURITY_OFFICER))
      .send({ scannedCode: "GP|FORGED|000", verificationType: "EXIT" });
    expect(gpTamper.status).toBe(403);

    // Reset status or use valid code test on Exit & Entry on fresh clean pass verification helper
    await store.commitWrites([
      { collection: "gatePasses", docId: gatePass.id, data: { ...gatePass, status: "Issued" } },
    ]);
    const gpExit = await request(app)
      .post(`/api/warehouse/gate-passes/${gatePass.id}/verify`)
      .set(asRole(UserRole.GATE_SECURITY_OFFICER))
      .send({ scannedCode: gatePass.qrVerificationCode, verificationType: "EXIT" });
    expect(gpExit.status).toBe(200);
    expect(gpExit.body.data.status).toBe("Exit Verified");

    const gpEntry = await request(app)
      .post(`/api/warehouse/gate-passes/${gatePass.id}/verify`)
      .set(asRole(UserRole.GATE_SECURITY_OFFICER))
      .send({ scannedCode: gatePass.qrVerificationCode, verificationType: "ENTRY" });
    expect(gpEntry.status).toBe(200);
    expect(gpEntry.body.data.status).toBe("Entry Verified");

    // Material Handling updates Transport Status
    expect(ALL_TRANSPORT_STATUSES).toHaveLength(11);
    const trUp = await request(app)
      .post(`/api/warehouse/transport/${transport.id}/status`)
      .set(asRole(UserRole.MATERIAL_HANDLING))
      .send({ status: "Receiving Verification", notes: "Arrived at Bole gate" });
    expect(trUp.status).toBe(200);
    expect(trUp.body.data.status).toBe("Receiving Verification");

    // Site Store Owner confirms FATIV receipt -> moves location to PS-BOLE preserving Asset ID & Original GRV No
    const fativRes = await request(app)
      .post("/api/warehouse/transfers/receive")
      .set(asRole(UserRole.SITE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({ receiptType: "FATIV", fatovId: fatov.id, quantityReceived: 1, conditionReceived: "Good" });
    expect(fativRes.status).toBe(200);
    expect(fativRes.body.data.asset.currentLocationId).toBe("PS-BOLE");
    expect(fativRes.body.data.asset.assetId).toBe(asset.assetId);
    expect(fativRes.body.data.asset.originalGrvNumber).toBe(asset.originalGrvNumber);

    // Duplicate FATIV strictly blocked!
    const dupFativ = await request(app)
      .post("/api/warehouse/transfers/receive")
      .set(asRole(UserRole.SITE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({ receiptType: "FATIV", fatovId: fatov.id, quantityReceived: 1, conditionReceived: "Good" });
    expect(dupFativ.status).toBe(409);
  });

  // 17, 18, 19. TWO-WAY MRV RETURNS & QUARANTINE SEGREGATION + RELEASE
  it("routes Good MRV consumables to availableQty ONLY after receipt confirmation, routes Damaged returns exclusively to quarantineQty, and preserves Fixed Asset GRV on return", async () => {
    // Submit return of 10 Good + 5 Damaged consumables from Bole Store -> Warehouse
    const mrvSub = await request(app)
      .post("/api/warehouse/returns")
      .set(asRole(UserRole.SITE_MANAGER))
      .send({
        direction: "ProjectToWarehouse",
        sourceLocationType: "ProjectStore",
        sourceLocationId: "PS-BOLE",
        sourceLocationName: "Bole Tower Site Store",
        destinationLocationType: "Warehouse",
        destinationLocationId: "WH-CENTRAL",
        destinationLocationName: "Kality Central Warehouse",
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        originalGivNumber: "GIV-00001",
        inventoryType: "Consumable",
        vehicleNumber: "ET-RET-01",
        driverName: "Tadesse",
        items: [
          { itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", unit: "bags", quantityReturned: 10, condition: "Good", unitCost: 900 },
          { itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", unit: "bags", quantityReturned: 5, condition: "Damaged", unitCost: 900, reason: "Moisture caked" },
        ],
      });
    expect(mrvSub.status).toBe(201);

    // Before confirmation: Warehouse stock NOT updated yet!
    const beforeBal = await store.getDoc<any>("stockBalances", "WH-CENTRAL__ITEM-CEM");
    expect(beforeBal).toBeNull();

    // Confirm Return MRV receipt
    const mrvConf = await request(app)
      .post(`/api/warehouse/returns/${mrvSub.body.data.id}/confirm`)
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({});
    expect(mrvConf.status).toBe(200);
    expect(mrvConf.body.data.status).toBe("Quarantined");

    // Verify 10 Good entered availableQty and 5 Damaged entered ONLY quarantineQty!
    const afterBal = await store.getDoc<any>("stockBalances", "WH-CENTRAL__ITEM-CEM");
    expect(afterBal.availableQty).toBe(10);
    expect(afterBal.quarantineQty).toBe(5);
    expect(afterBal.damagedQty).toBe(5);

    // Warehouse Manager releases 2 from quarantine to usable after re-bagging inspection
    const rel = await request(app)
      .post("/api/warehouse/quarantine/release")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({ balanceId: afterBal.id, quantity: 2, disposition: "RELEASE_TO_USABLE", notes: "Passed QA sieve test" });
    expect(rel.status).toBe(200);
    expect(rel.body.data.availableQty).toBe(12);
    expect(rel.body.data.quarantineQty).toBe(3);
  });

  // 20, 21. DASHBOARD 15 KPIs + 6 CHARTS + 22 REPORTS + EXCEL/PDF EXPORT
  it("computes all 15 KPIs, 6 charts, and generates all 22 reports with valid .xlsx binary and HTML PDF templates", async () => {
    await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "Sup X",
        commercialInvoice: { invoiceNumber: "INV-RPT-1", invoiceDate: "2026-10-10", fileUrl: "https://x.co/r.pdf", fileName: "r.pdf", mimeType: "application/pdf" },
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", inventoryType: "Consumable", unit: "bags", quantityReceived: 40, unitCost: 900 }],
      });

    const filters: WarehouseDashboardFilters = {
      dateFrom: "",
      dateTo: "",
      projectId: "ALL",
      locationId: "ALL",
      categoryId: "ALL",
      inventoryType: "ALL",
    };

    const dataset = {
      warehouses: await store.listCollection<any>("warehouses"),
      projectStores: await store.listCollection<any>("projectStores"),
      categories: await store.listCollection<any>("inventoryCategories"),
      items: await store.listCollection<any>("inventoryItems"),
      stockBalances: await store.listCollection<any>("stockBalances"),
      stockLedger: await store.listCollection<any>("stockLedger"),
      materialPlans: await store.listCollection<any>("materialPlans"),
      materialRequests: await store.listCollection<any>("materialRequests"),
      grvs: await store.listCollection<any>("goodsReceivingVouchers"),
      givs: await store.listCollection<any>("goodsIssueVouchers"),
      mrvs: await store.listCollection<any>("materialReturnVouchers"),
      fixedAssets: await store.listCollection<any>("fixedAssets"),
      fatovs: await store.listCollection<any>("fixedAssetTransfersOut"),
      fativs: await store.listCollection<any>("fixedAssetTransfersIn"),
      transports: await store.listCollection<any>("transportationRecords"),
      gatePasses: await store.listCollection<any>("gatePasses"),
      commercialInvoices: await store.listCollection<any>("commercialInvoices"),
      auditLogs: await store.listCollection<any>("inventoryAuditLogs"),
    };

    const dash = computeDashboardKpisAndCharts(dataset, filters);
    expect(dash.kpis.totalWarehouseConsumableStock).toBe(40);
    expect(dash.kpis.totalGrvsWithCommercialInvoices).toBe(1);
    expect(Object.keys(dash.kpis)).toHaveLength(15);
    expect(Object.keys(dash.charts)).toHaveLength(6);

    // Exercise ALL 22 Reports through Express endpoint & verify non-empty columns + Excel/PDF export
    expect(REPORT_CATALOG).toHaveLength(22);
    for (const rptMeta of REPORT_CATALOG) {
      const apiRes = await request(app)
        .get(`/api/warehouse/reports/${rptMeta.id}`)
        .set(asRole(UserRole.FINANCE_MANAGER));
      expect(apiRes.status).toBe(200);
      expect(apiRes.body.data.columns.length).toBeGreaterThan(0);

      if (rptMeta.id === "GRV_REGISTER") {
        const xlsxBytes = exportReportToExcel(apiRes.body.data);
        expect(xlsxBytes.byteLength).toBeGreaterThan(100);
        const html = buildPrintableReportHtml(apiRes.body.data);
        expect(html).toContain("OVID REAL ESTATE");
      }
    }
  });

  // 22. FULL 9-ROLE ENTERPRISE RBAC VERIFICATION
  it("enforces complete 9-role RBAC permissions across all roles including Finance read-only & Gate Security isolation", () => {
    expect(resolveExtendedWarehouseRole(UserRole.FINANCE_MANAGER)).toBe("finance_manager");
    expect(canPerformWarehouseModuleAction(UserRole.FINANCE_MANAGER, "CONFIGURE_VALUATION_METHOD")).toBe(true);
    expect(canPerformWarehouseModuleAction(UserRole.FINANCE_MANAGER, "CREATE_FINALIZE_GRV")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.FINANCE_MANAGER, "DIRECTOR_APPROVE_DISAPPROVE_REQUEST")).toBe(false);

    expect(isStrictDirectorRole(UserRole.DIRECTOR)).toBe(true);
    expect(isStrictDirectorRole(UserRole.WAREHOUSE_MANAGER)).toBe(false);
    expect(isStrictDirectorRole(UserRole.OFFICE_MANAGER)).toBe(false);

    expect(canPerformWarehouseModuleAction(UserRole.GATE_SECURITY_OFFICER, "VERIFY_GATE_PASS_EXIT_ENTRY")).toBe(true);
    expect(getAuthorizedSectionsForRole(UserRole.GATE_SECURITY_OFFICER)).toEqual(["gate_pass", "transportation", "notifications"]);

    expect(canPerformWarehouseModuleAction(UserRole.MATERIAL_HANDLING, "MANAGE_TRANSPORT")).toBe(true);
    expect(canPerformWarehouseModuleAction(UserRole.MATERIAL_HANDLING, "VERIFY_RETURN_MATERIAL_REQUEST")).toBe(false);

    expect(resolveExtendedWarehouseRole(UserRole.SITE_MANAGER)).toBe("site_manager");
    expect(resolveExtendedWarehouseRole("Store Owner")).toBe("site_manager");
    expect(resolveCanonicalWarehouseRole("Site Store Owner")).toBe("site_manager");
    expect(resolveExtendedWarehouseRole(UserRole.STORE_MANAGER)).toBe("store_manager");
    expect(resolveCanonicalWarehouseRole(UserRole.STORE_MANAGER)).toBe("store_manager");
  });

  // 23. STORE MANAGER ITEM REQUEST TO WAREHOUSE MANAGER & STRICT ISOLATION
  it("allows Store Manager to request items from Warehouse Manager while blocking all unauthorized Warehouse Manager sections, actions, and HQ reports", async () => {
    const storeMgrSections = getAuthorizedSectionsForRole(UserRole.STORE_MANAGER);
    expect(storeMgrSections).toContain("material_requests");
    expect(storeMgrSections).toContain("store_field_operations");
    expect(storeMgrSections).toContain("site_stores");
    expect(storeMgrSections).toContain("giv_dispatch");
    expect(storeMgrSections).toContain("returns_mrv");
    expect(storeMgrSections).toContain("reports");

    // HQ / Warehouse Manager sections strictly excluded from Store Manager
    for (const forbiddenSection of [
      "warehouse_inventory",
      "material_planning",
      "director_approvals",
      "grv",
      "commercial_invoices",
      "fixed_assets_big_balance",
      "fatov_fativ",
      "quarantine_stock",
      "stock_ledger",
      "settings",
      "audit_logs",
      "warehouse_fleet_formwork",
    ] as const) {
      expect(storeMgrSections).not.toContain(forbiddenSection);
    }

    // Store Manager allowed actions (including CONFIRM_FATIV for receiving fixed assets from Warehouse Manager)
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "CREATE_MATERIAL_REQUEST")).toBe(true);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "CONFIRM_CONSUMABLE_RECEIPT")).toBe(true);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "CONFIRM_FATIV")).toBe(true);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "SUBMIT_TWO_WAY_RETURN")).toBe(true);

    // Store Manager forbidden Warehouse Manager / Director / Finance actions
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "VERIFY_RETURN_MATERIAL_REQUEST")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "PREPARE_CONFIRM_DISPATCH_GIV")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "CREATE_FINALIZE_GRV")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "CREATE_FATOV")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "GENERATE_GATE_PASS")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "DIRECTOR_APPROVE_DISAPPROVE_REQUEST")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "CONFIGURE_VALUATION_METHOD")).toBe(false);
    expect(canPerformWarehouseModuleAction(UserRole.STORE_MANAGER, "RELEASE_QUARANTINE")).toBe(false);

    // Office Manager creates a Material Plan so Store Manager can submit a request to Warehouse Manager
    const planRes = await request(app)
      .post("/api/warehouse/plans")
      .set(asRole(UserRole.OFFICE_MANAGER))
      .send({
        title: "Store Manager Requisition Plan",
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", plannedQty: 100 }],
      });
    expect(planRes.status).toBe(201);

    // Store Manager CAN submit Material Request to Warehouse Manager
    const smReq = await request(app)
      .post("/api/warehouse/requests")
      .set(asRole(UserRole.STORE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({
        planId: planRes.body.data.id,
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        projectStoreId: "PS-BOLE",
        projectStoreName: "Bole Tower Site Store",
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        items: [{ itemId: "ITEM-CEM", itemCode: "CEM-42.5", itemName: "OPC Cement 50kg", specification: "Grade 42.5R", inventoryType: "Consumable", unit: "bags", requestedQty: 40 }],
      });
    expect(smReq.status).toBe(201);

    // Store Manager CANNOT verify/approve own or any request
    const smVerify = await request(app)
      .post(`/api/warehouse/requests/${smReq.body.data.id}/verify`)
      .set(asRole(UserRole.STORE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({ action: "verify" });
    expect(smVerify.status).toBe(403);

    // Store Manager CANNOT create GRV, dispatch GIV/FATOV, release quarantine, or alter valuation
    const smGrv = await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.STORE_MANAGER))
      .send({ warehouseId: "WH-CENTRAL", supplierName: "Test", items: [] });
    expect(smGrv.status).toBe(403);

    const smDispatch = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.STORE_MANAGER))
      .send({ dispatchType: "GIV", requestId: smReq.body.data.id, dispatchItems: [] });
    expect(smDispatch.status).toBe(403);

    const smFatov = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.STORE_MANAGER))
      .send({ dispatchType: "FATOV", assetDocId: "FA-DOC-1", toLocationId: "PS-BOLE", vehicleNumber: "ET-3-11029", driverName: "Test" });
    expect(smFatov.status).toBe(403);

    // Store Manager CAN confirm incoming FATIV receipt of a fixed asset dispatched by Warehouse Manager
    const mixerGrv = await request(app)
      .post("/api/warehouse/grv")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        warehouseId: "WH-CENTRAL",
        warehouseName: "Kality Central Warehouse",
        supplierName: "OVID Heavy Plant",
        commercialInvoice: { invoiceNumber: "CI-MIX-900", invoiceDate: "2026-10-05", fileUrl: "https://x.co/mix.pdf", fileName: "mix.pdf", mimeType: "application/pdf" },
        items: [{ itemId: "ITEM-CRANE", itemCode: "FA-MIX-01", itemName: "Concrete Transit Mixer 9m3", inventoryType: "Fixed Asset", unit: "unit", quantityReceived: 1, unitCost: 4500000, serialNumbers: ["SN-MIX-8801"] }],
      });
    expect(mixerGrv.status).toBe(201);
    const createdAssetId = mixerGrv.body.data.fixedAssetsCreated[0].id;

    const wmFatov = await request(app)
      .post("/api/warehouse/dispatch")
      .set(asRole(UserRole.WAREHOUSE_MANAGER))
      .send({
        dispatchType: "FATOV",
        assetDocId: createdAssetId,
        toLocationType: "ProjectStore",
        toLocationId: "PS-BOLE",
        toLocationName: "Bole Tower Site Store",
        projectId: "PROJ-BOLE",
        projectName: "Bole Heights Tower",
        vehicleNumber: "ET-3-90901",
        driverName: "Abebe Bikila",
        driverPhone: "+251911000222",
      });
    expect(wmFatov.status).toBe(201);

    const smFativConfirm = await request(app)
      .post("/api/warehouse/transfers/receive")
      .set(asRole(UserRole.STORE_MANAGER, { "x-test-project": "PROJ-BOLE" }))
      .send({
        receiptType: "FATIV",
        fatovId: wmFatov.body.data.fatov.id,
        quantityReceived: 1,
        conditionReceived: "Good",
      });
    expect(smFativConfirm.status).toBe(200);
    expect(smFativConfirm.body.data.fativ.status).toBe("Confirmed");

    const smQuarantine = await request(app)
      .post("/api/warehouse/quarantine/release")
      .set(asRole(UserRole.STORE_MANAGER))
      .send({ balanceId: "WH-CENTRAL__ITEM-CEM", quantity: 1, disposition: "RELEASE_TO_USABLE" });
    expect(smQuarantine.status).toBe(403);

    const smValuation = await request(app)
      .post("/api/warehouse/settings/valuation")
      .set(asRole(UserRole.STORE_MANAGER))
      .send({ valuationMethod: "FIFO" });
    expect(smValuation.status).toBe(403);

    // Store Manager CAN view allowed site-store reports and is blocked (403) from HQ-only reports
    expect(STORE_MANAGER_ALLOWED_REPORTS.has("PROJECT_SITE_STORE_BALANCE")).toBe(true);
    const allowedReport = await request(app)
      .get("/api/warehouse/reports/PROJECT_SITE_STORE_BALANCE")
      .set(asRole(UserRole.STORE_MANAGER, { "x-test-project": "PROJ-BOLE" }));
    expect(allowedReport.status).toBe(200);

    for (const hqReport of ["GRV_REGISTER", "BIG_BALANCE_FIXED_ASSETS", "STOCK_VALUATION_FIFO_WMA"]) {
      const deniedReport = await request(app)
        .get(`/api/warehouse/reports/${hqReport}`)
        .set(asRole(UserRole.STORE_MANAGER, { "x-test-project": "PROJ-BOLE" }));
      expect(deniedReport.status).toBe(403);
    }

    // Full bilingual Amharic/English coverage across Store Manager sections, statuses, and reports
    expect(tr(true, "English", "አማርኛ")).toBe("አማርኛ");
    expect(tr(false, "English", "አማርኛ")).toBe("English");
    expect(getWarehouseSectionLabel("material_requests", "Requests", true, { isStoreOrSiteSide: true })).toBe("ከመጋዘን እቃ መጠየቂያ");
    expect(getWarehouseSectionLabel("giv_dispatch", "Dispatch", true, { isStoreOrSiteSide: true })).toBe("ከመጋዘን እቃ መቀበያ (GIV/FATIV)");
    expect(translateWarehouseStatus("Submitted", true)).not.toBe("Submitted");
    expect(getReportTitle("PROJECT_SITE_STORE_BALANCE", "Project Site Store Balance", true)).not.toBe("Project Site Store Balance");
  });

  // 24. REGRESSION TEST: Legacy Site Store materialRequests docs without .items never crash material_requests view
  it("renders MaterialPlanningAndRequestsView safely in Amharic even when legacy materialRequests docs lack items array", () => {
    const legacyDoc = {
      id: "REQ-LEGACY-1",
      requesterName: "Abebe Store Manager",
      requesterRole: "Store Manager",
      siteName: "Bole Heights Phase I",
      building: "Building A",
      floor: "Floor 2",
      zone: "Zone 1",
      materialName: "Dangote OPC 42.5N Cement",
      requestedQty: 50,
      unit: "Bags",
      purpose: "Foundation slab",
      status: "Pending",
      requestDate: "2026-11-22",
    };

    const normalized = normalizeMaterialRequestRecord(legacyDoc);
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].itemName).toBe("Dangote OPC 42.5N Cement");
    expect(normalized.requestNumber).toBe("REQ-LEGACY-1");

    const { container } = render(
      React.createElement(MaterialPlanningAndRequestsView, {
        mode: "material_requests",
        isAmharic: true,
        actor: {
          uid: "UID-SM",
          name: "Store Manager",
          role: UserRole.STORE_MANAGER,
          assignedProject: "PROJ-BOLE",
        },
        onFeedback: () => {},
        snapshot: {
          categories: [],
          items: [],
          warehouses: [],
          projectStores: [],
          stockBalances: [],
          stockLedger: [],
          materialPlans: [{ id: "PLAN-1", planNumber: "MP-01", projectId: "P1", projectName: "P1" } as any],
          materialPlanRevisions: [],
          materialRequests: [legacyDoc as any, { ...normalized, id: "REQ-LEGACY-NORM" }],
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
          valuationSettings: { id: "default", valuationMethod: "WMA", updatedAt: "", updatedByName: "System" } as any,
          erpProjects: [],
          erpSuppliers: [],
          erpProcurements: [],
          erpTrucks: [],
        },
      })
    );

    expect(container.textContent).toContain("ከመጋዘን እቃ መጠየቂያ እና መከታተያ");
    expect(container.textContent).toContain("REQ-LEGACY-1");
  });
});
