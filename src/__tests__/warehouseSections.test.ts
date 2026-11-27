import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { UserRole } from "../types";
import {
  WAREHOUSE_HUB_SECTIONS,
  WarehouseHubSectionId,
  canViewWarehouseHubSection,
  getWarehouseHubSectionsForRole,
  isWarehouseHubSectionReadOnly,
  normalizeLegacyTabToWarehouse,
} from "../config/warehouseSections";
import { WarehouseSiteStoreModule } from "../components/warehouse/WarehouseSiteStoreModule";
import {
  InMemoryWarehouseStore,
  createWarehouseStoreRouter,
} from "../server/warehouseStoreRouter";

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
});

function makeServerTestApp(enforceAuth = false) {
  const store = new InMemoryWarehouseStore();
  store.seed("warehouses", [
    {
      id: "WH-MAIN",
      warehouseCode: "WH-01",
      warehouseName: "Central Addis Warehouse",
      location: "Kality, Addis Ababa",
      isActive: true,
    },
  ]);
  store.seed("projectStores", [
    {
      id: "SITE-ALPHA",
      storeCode: "SS-01",
      storeName: "Alpha Site Store",
      projectId: "PROJ-ALPHA",
      projectName: "Alpha Project",
      location: "Bole",
      isActive: true,
    },
    {
      id: "SITE-BETA",
      storeCode: "SS-02",
      storeName: "Beta Site Store",
      projectId: "PROJ-BETA",
      projectName: "Beta Project",
      location: "CMC",
      isActive: true,
    },
  ]);
  store.seed("inventoryItems", [
    {
      id: "ITEM-1",
      itemCode: "STL-12",
      itemName: "Deformed Bar 12mm",
      categoryId: "CAT-STL",
      categoryName: "Steel",
      inventoryType: "Consumable",
      unit: "pcs",
      minStockLevel: 20,
      reorderPoint: 40,
      standardUnitCost: 650,
      isActive: true,
    },
  ]);
  store.seed("stockBalances", [
    {
      id: "WH-MAIN__ITEM-1",
      locationType: "Warehouse",
      locationId: "WH-MAIN",
      locationName: "Central Addis Warehouse",
      itemId: "ITEM-1",
      itemCode: "STL-12",
      itemName: "Deformed Bar 12mm",
      inventoryType: "Consumable",
      unit: "pcs",
      availableQty: 500,
    },
  ]);

  const app = express();
  app.use(express.json());

  const { router } = createWarehouseStoreRouter({
    verifyAppCheck: (_req, _res, next) => next(),
    requireAuth: (req, res, next) => {
      if (enforceAuth && !req.header("Authorization")) {
        return res.status(401).json({ success: false, error: "unauthorized" });
      }
      (req as any).authUser = {
        uid: req.header("x-test-uid") || "test-uid",
        email: "user@example.com",
      };
      next();
    },
    requireActiveUser: (req, _res, next) => {
      (req as any).userProfile = {
        uid: req.header("x-test-uid") || "test-uid",
        displayName: req.header("x-test-name") || "Test User",
        role: req.header("x-test-role") || UserRole.WAREHOUSE_MANAGER,
        assignedProject: req.header("x-test-project") || "",
        assignedSite: req.header("x-test-site") || "",
      };
      next();
    },
    getProjectConfig: () => ({ projectId: "test-project", databaseId: "(default)" }),
    store,
  });

  app.use(router);
  return { app, store };
}

describe("Unified Warehouse & Site Store Hub Section Matrix & RBAC", () => {
  const EXPECTED_SECTIONS_BY_ROLE: Array<{
    role: UserRole;
    expected: WarehouseHubSectionId[];
  }> = [
    {
      role: UserRole.WAREHOUSE_MANAGER,
      expected: [
        "overview",
        "warehouse_operations",
        "master_data_facilities",
        "catalog_governance",
        "planning_requests",
        "grv_invoices",
        "dispatch_giv",
        "fixed_assets_transfers",
        "transport_gate_pass",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.DIRECTOR,
      expected: WAREHOUSE_HUB_SECTIONS.map((s) => s.id),
    },
    {
      role: UserRole.SUPER_ADMIN,
      expected: WAREHOUSE_HUB_SECTIONS.map((s) => s.id),
    },
    {
      role: UserRole.HEAD_OFFICE,
      expected: WAREHOUSE_HUB_SECTIONS.map((s) => s.id),
    },
    {
      role: UserRole.STORE_MANAGER,
      expected: [
        "overview",
        "master_data_facilities",
        "planning_requests",
        "dispatch_giv",
        "fixed_assets_transfers",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.SITE_MANAGER,
      expected: [
        "overview",
        "master_data_facilities",
        "planning_requests",
        "dispatch_giv",
        "fixed_assets_transfers",
        "transport_gate_pass",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.MATERIAL_HANDLING,
      expected: [
        "overview",
        "dispatch_giv",
        "fixed_assets_transfers",
        "transport_gate_pass",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.GATE_SECURITY_OFFICER,
      expected: ["transport_gate_pass", "reports_ledger_audit"],
    },
    {
      role: UserRole.FINANCE_MANAGER,
      expected: [
        "overview",
        "master_data_facilities",
        "planning_requests",
        "grv_invoices",
        "dispatch_giv",
        "fixed_assets_transfers",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.AUDITOR,
      expected: [
        "overview",
        "master_data_facilities",
        "catalog_governance",
        "planning_requests",
        "grv_invoices",
        "dispatch_giv",
        "fixed_assets_transfers",
        "transport_gate_pass",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.SECTION_HEAD,
      expected: [
        "overview",
        "master_data_facilities",
        "planning_requests",
        "dispatch_giv",
        "fixed_assets_transfers",
        "transport_gate_pass",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.OFFICE_MANAGER,
      expected: [
        "overview",
        "master_data_facilities",
        "catalog_governance",
        "planning_requests",
        "fixed_assets_transfers",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.OPERATION_MANAGER,
      expected: [
        "overview",
        "master_data_facilities",
        "catalog_governance",
        "planning_requests",
        "dispatch_giv",
        "fixed_assets_transfers",
        "transport_gate_pass",
        "returns_quarantine",
        "reports_ledger_audit",
      ],
    },
    {
      role: UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      expected: [
        "overview",
        "master_data_facilities",
        "catalog_governance",
        "planning_requests",
        "fixed_assets_transfers",
        "reports_ledger_audit",
      ],
    },
  ];

  it("exposes the exact top-level hub sections per role and hides unauthorized sections in rendered DOM", () => {
    for (const { role, expected } of EXPECTED_SECTIONS_BY_ROLE) {
      const resolvedIds = getWarehouseHubSectionsForRole(role).map((s) => s.id);
      expect(resolvedIds).toEqual(expected);

      const { container, unmount } = render(
        React.createElement(WarehouseSiteStoreModule, {
          currentUserRole: role,
          currentUserProfile: {
            uid: `uid-${role}`,
            displayName: `${role} Tester`,
            assignedProject: "PROJ-ALPHA",
          },
          isAmharic: false,
        })
      );

      const renderedButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button[data-section-id]")
      ).map((btn) => btn.getAttribute("data-section-id"));

      expect(renderedButtons).toEqual(expected);

      // Unauthorized sections must be completely hidden from the DOM, not merely disabled
      for (const sec of WAREHOUSE_HUB_SECTIONS) {
        if (!expected.includes(sec.id)) {
          expect(container.querySelector(`[data-section-id="${sec.id}"]`)).toBeNull();
          expect(canViewWarehouseHubSection(role, sec.id)).toBe(false);
        }
      }

      unmount();
    }
  });

  it("grants Director, Super Admin, and Head Office all 11 sections with write oversight", () => {
    for (const execRole of [UserRole.DIRECTOR, UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE]) {
      const sections = getWarehouseHubSectionsForRole(execRole);
      expect(sections).toHaveLength(11);
      for (const sec of sections) {
        expect(isWarehouseHubSectionReadOnly(execRole, sec.id)).toBe(false);
      }
    }
  });

  it("blocks Store Owner / Store Manager from Warehouse Operations and central sections even via initialSection deep-link", () => {
    for (const storeRole of [UserRole.STORE_MANAGER, UserRole.SITE_MANAGER]) {
      const { container, unmount } = render(
        React.createElement(WarehouseSiteStoreModule, {
          currentUserRole: storeRole,
          currentUserProfile: {
            uid: `uid-${storeRole}`,
            displayName: "Site Store Owner",
            assignedProject: "PROJ-ALPHA",
          },
          initialSection: "warehouse_operations",
        })
      );

      expect(container.querySelector('[data-section-id="warehouse_operations"]')).toBeNull();
      expect(container.querySelector('[data-section-id="catalog_governance"]')).toBeNull();
      expect(container.querySelector('[data-section-id="grv_invoices"]')).toBeNull();
      expect(screen.getByText(/Access Denied/i)).toBeTruthy();

      unmount();
    }
  });

  it("marks Finance, Auditor, Section Head, and Office/Engineering roles read-only on oversight sections", () => {
    expect(isWarehouseHubSectionReadOnly(UserRole.AUDITOR, "overview")).toBe(true);
    expect(isWarehouseHubSectionReadOnly(UserRole.FINANCE_MANAGER, "grv_invoices")).toBe(true);
    expect(isWarehouseHubSectionReadOnly(UserRole.SECTION_HEAD, "planning_requests")).toBe(true);
    expect(isWarehouseHubSectionReadOnly(UserRole.OPERATION_MANAGER, "transport_gate_pass")).toBe(
      false
    );
    expect(isWarehouseHubSectionReadOnly(UserRole.OFFICE_MANAGER, "planning_requests")).toBe(
      false
    );

    const { unmount } = render(
      React.createElement(WarehouseSiteStoreModule, {
        currentUserRole: UserRole.AUDITOR,
        currentUserProfile: { uid: "uid-auditor", displayName: "Chief Auditor" },
      })
    );
    expect(screen.getByText(/Read-Only Role View/i)).toBeTruthy();
    unmount();
  });

  it("handles warehouseManagerApp alias and keeps Store Owner App isolated from Warehouse Manager", () => {
    // Warehouse Manager & Executives opening legacy warehouseManagerApp land inside warehouse_operations
    for (const allowedRole of [
      UserRole.WAREHOUSE_MANAGER,
      UserRole.DIRECTOR,
      UserRole.SUPER_ADMIN,
      UserRole.HEAD_OFFICE,
    ]) {
      const res = normalizeLegacyTabToWarehouse("warehouseManagerApp", allowedRole);
      expect(res.tab).toBe("warehouseSiteStore");
      expect(res.initialSection).toBe("warehouse_operations");
      expect(res.blockedAttempt).toBeUndefined();
    }

    // Store Manager / Site Manager attempting warehouseManagerApp are blocked and kept in storeOwnerApp
    for (const storeRole of [UserRole.STORE_MANAGER, UserRole.SITE_MANAGER]) {
      const res = normalizeLegacyTabToWarehouse("warehouseManagerApp", storeRole);
      expect(res.tab).toBe("storeOwnerApp");
      expect(res.blockedAttempt).toBeDefined();
    }

    // Warehouse Manager attempting private storeOwnerApp is blocked and redirected to warehouseSiteStore
    const whAttempt = normalizeLegacyTabToWarehouse("storeOwnerApp", UserRole.WAREHOUSE_MANAGER);
    expect(whAttempt.tab).toBe("warehouseSiteStore");
    expect(whAttempt.blockedAttempt).toBeDefined();

    // Store Owner opening storeOwnerApp succeeds directly
    const storeAttempt = normalizeLegacyTabToWarehouse("storeOwnerApp", UserRole.STORE_MANAGER);
    expect(storeAttempt.tab).toBe("storeOwnerApp");
    expect(storeAttempt.blockedAttempt).toBeUndefined();
  });
});

describe("Server-Side Central Warehouse vs Site Store Role Isolation Endpoints", () => {
  it("rejects unauthenticated requests with 401 when auth is enforced", async () => {
    const { app } = makeServerTestApp(true);
    const res1 = await request(app).get("/api/warehouse/central/inventory");
    expect(res1.status).toBe(401);

    const res2 = await request(app).post("/api/warehouse/central/erp-sync").send({});
    expect(res2.status).toBe(401);

    const res3 = await request(app).get("/api/warehouse/site-store/operations");
    expect(res3.status).toBe(401);
  });

  it("blocks Store Manager and Site Manager (403) from central inventory, ERP sync, and formwork", async () => {
    const { app } = makeServerTestApp(false);
    for (const role of [UserRole.STORE_MANAGER, UserRole.SITE_MANAGER, "Store Owner"]) {
      const invRes = await request(app)
        .get("/api/warehouse/central/inventory")
        .set("x-test-role", role);
      expect(invRes.status).toBe(403);

      const syncRes = await request(app)
        .post("/api/warehouse/central/erp-sync")
        .set("x-test-role", role)
        .send({ syncScope: "FULL_WAREHOUSE" });
      expect(syncRes.status).toBe(403);

      const fwGetRes = await request(app)
        .get("/api/warehouse/central/formwork")
        .set("x-test-role", role);
      expect(fwGetRes.status).toBe(403);

      const fwPostRes = await request(app)
        .post("/api/warehouse/central/formwork")
        .set("x-test-role", role)
        .send({ panelCode: "PNL-01", panelType: "Wall" });
      expect(fwPostRes.status).toBe(403);
    }
  });

  it("blocks Warehouse Manager (403) from private site-store operations while allowing central ops", async () => {
    const { app } = makeServerTestApp(false);

    const siteGet = await request(app)
      .get("/api/warehouse/site-store/operations")
      .set("x-test-role", UserRole.WAREHOUSE_MANAGER);
    expect(siteGet.status).toBe(403);

    const sitePost = await request(app)
      .post("/api/warehouse/site-store/operations")
      .set("x-test-role", UserRole.WAREHOUSE_MANAGER)
      .send({
        operationType: "CREW_ISSUE",
        projectId: "PROJ-ALPHA",
        siteStoreId: "SITE-ALPHA",
        items: [{ itemId: "ITEM-1", qty: 5 }],
      });
    expect(sitePost.status).toBe(403);

    const centralInv = await request(app)
      .get("/api/warehouse/central/inventory")
      .set("x-test-role", UserRole.WAREHOUSE_MANAGER);
    expect(centralInv.status).toBe(200);
    expect(centralInv.body.data.warehouses).toHaveLength(1);

    const centralSync = await request(app)
      .post("/api/warehouse/central/erp-sync")
      .set("x-test-role", UserRole.WAREHOUSE_MANAGER)
      .send({ syncScope: "MAIN_WH_RECONCILE" });
    expect(centralSync.status).toBe(201);

    const fwCreate = await request(app)
      .post("/api/warehouse/central/formwork")
      .set("x-test-role", UserRole.WAREHOUSE_MANAGER)
      .send({ panelCode: "PNL-100", panelType: "Slab", zoneName: "Bay-A" });
    expect(fwCreate.status).toBe(201);
  });

  it("allows Store Manager / Site Manager scoped access on site-store operations and blocks cross-project writes", async () => {
    const { app } = makeServerTestApp(false);

    const scopedGet = await request(app)
      .get("/api/warehouse/site-store/operations")
      .set("x-test-role", UserRole.STORE_MANAGER)
      .set("x-test-project", "PROJ-ALPHA");
    expect(scopedGet.status).toBe(200);
    expect(scopedGet.body.data.projectStores).toHaveLength(1);
    expect(scopedGet.body.data.projectStores[0].projectId).toBe("PROJ-ALPHA");

    const ownPost = await request(app)
      .post("/api/warehouse/site-store/operations")
      .set("x-test-role", UserRole.STORE_MANAGER)
      .set("x-test-project", "PROJ-ALPHA")
      .send({
        operationType: "CREW_ISSUE",
        projectId: "PROJ-ALPHA",
        siteStoreId: "SITE-ALPHA",
        crewOrTeam: "Gang-1",
        items: [{ itemId: "ITEM-1", qty: 10 }],
      });
    expect(ownPost.status).toBe(201);

    const crossProjectPost = await request(app)
      .post("/api/warehouse/site-store/operations")
      .set("x-test-role", UserRole.STORE_MANAGER)
      .set("x-test-project", "PROJ-ALPHA")
      .send({
        operationType: "CREW_ISSUE",
        projectId: "PROJ-BETA",
        siteStoreId: "SITE-BETA",
        items: [{ itemId: "ITEM-1", qty: 10 }],
      });
    expect(crossProjectPost.status).toBe(403);
  });

  it("enforces read-only oversight (403 on mutations) for Auditor & Finance Manager on central and site-store routes", async () => {
    const { app } = makeServerTestApp(false);

    for (const roRole of [UserRole.AUDITOR, UserRole.FINANCE_MANAGER]) {
      const readCentral = await request(app)
        .get("/api/warehouse/central/inventory")
        .set("x-test-role", roRole);
      expect(readCentral.status).toBe(200);

      const syncRes = await request(app)
        .post("/api/warehouse/central/erp-sync")
        .set("x-test-role", roRole)
        .send({ syncScope: "FULL_WAREHOUSE" });
      expect(syncRes.status).toBe(403);

      const fwRes = await request(app)
        .post("/api/warehouse/central/formwork")
        .set("x-test-role", roRole)
        .send({ panelCode: "PNL-X", panelType: "Column" });
      expect(fwRes.status).toBe(403);

      const sitePost = await request(app)
        .post("/api/warehouse/site-store/operations")
        .set("x-test-role", roRole)
        .send({
          operationType: "CREW_ISSUE",
          projectId: "PROJ-ALPHA",
          siteStoreId: "SITE-ALPHA",
          items: [{ itemId: "ITEM-1", qty: 2 }],
        });
      expect(sitePost.status).toBe(403);
    }
  });
});
