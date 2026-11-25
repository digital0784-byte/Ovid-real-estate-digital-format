import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { UserRole } from "../types";
import {
  NotificationService,
  normalizeNotificationRole,
  getRoleMatchAliases,
} from "../services/notificationService";
import { LiveNotificationToast } from "../components/LiveNotificationToast";
import { WarehouseReportsLedgerAuditView } from "../components/warehouse/WarehouseReportsLedgerAuditView";
import { subscribeWarehouseErpModule } from "../services/warehouseStoreDataService";

describe("Strict Role-Based & UID-Based Notification Filtering", () => {
  beforeEach(() => {
    localStorage.clear();
    NotificationService.setActiveUserContext(null);
    vi.restoreAllMocks();
  });

  it("normalizes legacy roles accurately without loose substring collisions", () => {
    expect(normalizeNotificationRole("Directory")).toBe(UserRole.DIRECTOR);
    expect(normalizeNotificationRole("directory")).toBe(UserRole.DIRECTOR);
    expect(normalizeNotificationRole("Store Owner")).toBe(UserRole.SITE_MANAGER);
    expect(normalizeNotificationRole("site_store_owner")).toBe(UserRole.SITE_MANAGER);
    expect(normalizeNotificationRole("warehouse_manager")).toBe(UserRole.WAREHOUSE_MANAGER);
    expect(normalizeNotificationRole("Security Officer")).toBe(UserRole.GATE_SECURITY_OFFICER);

    // HR and HR Manager must remain distinct canonical roles
    expect(normalizeNotificationRole("HR")).toBe(UserRole.HR);
    expect(normalizeNotificationRole("HR Manager")).toBe(UserRole.HR_MANAGER);
    expect(getRoleMatchAliases(UserRole.HR)).not.toContain("HR Manager");
    expect(getRoleMatchAliases(UserRole.HR_MANAGER)).not.toContain("HR");
  });

  it("never leaks role-specific notifications to unrelated roles (including zero wildcard bypasses)", () => {
    const financeOnly = NotificationService.createNotification({
      title: "Cash Flow Variance Alert",
      description: "Bank reconciliation variance flagged.",
      category: "Finance Notifications",
      priority: "Critical",
      status: "Unread",
      projectName: "All Projects",
      targetRoles: [UserRole.FINANCE_MANAGER],
    });

    const warehouseOnly = NotificationService.createNotification({
      title: "GRV Posted in Main Warehouse",
      description: "Cement GRV-102 completed.",
      category: "Warehouse Notifications",
      priority: "Medium",
      status: "Unread",
      projectName: "All Projects",
      targetRoles: [UserRole.WAREHOUSE_MANAGER],
    });

    const workerVisible = NotificationService.getNotificationsForRoleAndProject(UserRole.WORKER);
    const driverVisible = NotificationService.getNotificationsForRoleAndProject(UserRole.DRIVER);
    const engineerVisible = NotificationService.getNotificationsForRoleAndProject(UserRole.SITE_ENGINEER);
    const directorVisible = NotificationService.getNotificationsForRoleAndProject(UserRole.DIRECTOR);
    const financeVisible = NotificationService.getNotificationsForRoleAndProject(UserRole.FINANCE_MANAGER);
    const warehouseVisible = NotificationService.getNotificationsForRoleAndProject(UserRole.WAREHOUSE_MANAGER);

    expect(workerVisible.some((n) => n.id === financeOnly.id || n.id === warehouseOnly.id)).toBe(false);
    expect(driverVisible.some((n) => n.id === financeOnly.id || n.id === warehouseOnly.id)).toBe(false);
    expect(engineerVisible.some((n) => n.id === financeOnly.id || n.id === warehouseOnly.id)).toBe(false);
    // Strict targetRoles enforcement: Director only receives notifications explicitly targeting Director
    expect(directorVisible.some((n) => n.id === financeOnly.id || n.id === warehouseOnly.id)).toBe(false);
    expect(financeVisible.some((n) => n.id === financeOnly.id)).toBe(true);
    expect(financeVisible.some((n) => n.id === warehouseOnly.id)).toBe(false);
    expect(warehouseVisible.some((n) => n.id === warehouseOnly.id)).toBe(true);
    expect(warehouseVisible.some((n) => n.id === financeOnly.id)).toBe(false);
  });

  it("blocks Pending users from receiving any notifications", () => {
    NotificationService.createNotification({
      title: "System Maintenance",
      description: "Scheduled maintenance window.",
      category: "System Update Notifications",
      priority: "Low",
      status: "Unread",
      targetRoles: Object.values(UserRole),
    });

    expect(NotificationService.getNotificationsForRoleAndProject("Pending")).toEqual([]);
    expect(NotificationService.getUnreadCount("Pending")).toBe(0);
  });

  it("restricts untargeted legacy notifications safely to Super Admin and Director only", () => {
    const untargeted = {
      id: "LEGACY-UNTARGETED-1",
      title: "Legacy Executive Notice",
      message: "Legacy alert without targetRoles",
      read: false,
      timestamp: Date.now(),
    };

    expect(
      NotificationService.isNotificationTargetedToUser(untargeted, { role: UserRole.WORKER })
    ).toBe(false);
    expect(
      NotificationService.isNotificationTargetedToUser(untargeted, { role: UserRole.SITE_ENGINEER })
    ).toBe(false);
    expect(
      NotificationService.isNotificationTargetedToUser(untargeted, { role: UserRole.STORE_MANAGER })
    ).toBe(false);
    expect(
      NotificationService.isNotificationTargetedToUser(untargeted, { role: UserRole.DIRECTOR })
    ).toBe(true);
    expect(
      NotificationService.isNotificationTargetedToUser(untargeted, { role: UserRole.SUPER_ADMIN })
    ).toBe(true);
  });

  it("enforces explicit UID targeting isolation even when roles match", () => {
    const directUserNotif = {
      id: "UID-NOTIF-1",
      title: "Personal Payslip Issued",
      message: "Your personal payslip is ready.",
      targetRoles: [UserRole.WORKER],
      targetUserId: "uid-worker-1",
      timestamp: Date.now(),
    };

    expect(
      NotificationService.isNotificationTargetedToUser(directUserNotif, {
        role: UserRole.WORKER,
        uid: "uid-worker-1",
      })
    ).toBe(true);
    expect(
      NotificationService.isNotificationTargetedToUser(directUserNotif, {
        role: UserRole.WORKER,
        uid: "uid-worker-2",
      })
    ).toBe(false);
  });

  it("only dispatches live toast/event notifications when activeUserContext or mergeRemoteNotifications matches target role", () => {
    const dispatched: string[] = [];
    const listener = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id) dispatched.push(detail.id);
    };
    window.addEventListener("buildsync_live_notification", listener);

    try {
      NotificationService.setActiveUserContext({ role: UserRole.SITE_ENGINEER, uid: "uid-eng-1" });

      const hrOnly = NotificationService.createNotification({
        title: "HR Recruitment Screening",
        description: "New applicant awaiting HR review.",
        category: "User Approval Notifications",
        priority: "High",
        status: "Unread",
        targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
      });
      expect(dispatched).not.toContain(hrOnly.id);

      const engNotif = NotificationService.createNotification({
        title: "Slab Inspection Due",
        description: "Tower A Floor 3 rebar inspection scheduled.",
        category: "QA/QC Notifications",
        priority: "High",
        status: "Unread",
        targetRoles: [UserRole.SITE_ENGINEER],
      });
      expect(dispatched).toContain(engNotif.id);

      NotificationService.mergeRemoteNotifications(
        [
          {
            id: "REMOTE-FIN-1",
            title: "Tax Return Deadline",
            message: "VAT filing due tomorrow.",
            targetRoles: [UserRole.FINANCE_MANAGER],
            timestamp: new Date().toISOString(),
            read: false,
          },
          {
            id: "REMOTE-ENG-1",
            title: "Concrete Mix Test",
            message: "Cube test ready.",
            targetRoles: [UserRole.SITE_ENGINEER],
            timestamp: new Date().toISOString(),
            read: false,
          },
        ],
        UserRole.SITE_ENGINEER,
        "All Projects",
        "uid-eng-1"
      );

      expect(dispatched).not.toContain("REMOTE-FIN-1");
      expect(dispatched).toContain("REMOTE-ENG-1");
    } finally {
      window.removeEventListener("buildsync_live_notification", listener);
    }
  });

  it("marks only notifications targeted to the current role as read during markAllAsRead", () => {
    const finNotif = NotificationService.createNotification({
      title: "Finance Only Item",
      description: "Payable due",
      category: "Finance Notifications",
      priority: "High",
      status: "Unread",
      targetRoles: [UserRole.FINANCE_MANAGER],
    });
    const engNotif = NotificationService.createNotification({
      title: "Engineer Only Item",
      description: "Survey check",
      category: "QA/QC Notifications",
      priority: "Medium",
      status: "Unread",
      targetRoles: [UserRole.SITE_ENGINEER],
    });

    NotificationService.markAllAsRead(UserRole.SITE_ENGINEER, "ALL", "uid-eng-1");

    expect(NotificationService.isNotificationUnread(engNotif, UserRole.SITE_ENGINEER, "uid-eng-1")).toBe(false);
    expect(NotificationService.isNotificationUnread(finNotif, UserRole.FINANCE_MANAGER, "uid-fin-1")).toBe(true);
  });

  it("LiveNotificationToast ignores events not targeted to the active user role", () => {
    render(
      React.createElement(LiveNotificationToast, {
        isAmharic: false,
        currentUserRole: UserRole.STORE_MANAGER,
        currentUserId: "uid-store-1",
        selectedProject: "All Projects",
      })
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("buildsync_live_notification", {
          detail: {
            id: "LIVE-HR-ONLY",
            title: "Confidential HR Salary Review",
            description: "Payroll confidential alert.",
            priority: "Critical",
            targetRoles: [UserRole.HR_MANAGER],
          },
        })
      );
    });

    expect(screen.queryByText("Confidential HR Salary Review")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("buildsync_live_notification", {
          detail: {
            id: "LIVE-STORE-ONLY",
            title: "Site Store Material Dispatched",
            description: "45 wall panels en route.",
            priority: "High",
            targetRoles: [UserRole.STORE_MANAGER],
          },
        })
      );
    });

    expect(screen.getByText("Site Store Material Dispatched")).toBeInTheDocument();
  });

  it("filters warehouse inventoryNotifications strictly by actor role in subscription cache and audit view", () => {
    const cachedInvNotifs = [
      {
        id: "INV-DIR-1",
        eventType: "EXCESS_REQUEST_DIRECTOR_APPROVAL",
        title: "Director Excess Approval Required",
        message: "Material request exceeds plan by 20%.",
        severity: "critical" as const,
        targetRoles: [UserRole.DIRECTOR, UserRole.SUPER_ADMIN],
        readByUids: [],
        createdAt: "2026-07-23T09:00:00.000Z",
      },
      {
        id: "INV-STORE-1",
        eventType: "REQUEST_APPROVED_WAREHOUSE",
        title: "Store Replenishment Approved",
        message: "GRV-ready transfer dispatched to Site Store.",
        severity: "info" as const,
        targetRoles: [UserRole.STORE_MANAGER, UserRole.SITE_MANAGER],
        readByUids: [],
        createdAt: "2026-07-23T09:05:00.000Z",
      },
    ];
    localStorage.setItem("ovid_wh_inventoryNotifications", JSON.stringify(cachedInvNotifs));

    let emittedNotifs: any[] = [];
    const unsub = subscribeWarehouseErpModule(
      (snap) => {
        emittedNotifs = snap.notifications;
      },
      { role: UserRole.STORE_MANAGER, uid: "uid-store-1" }
    );
    unsub();

    expect(emittedNotifs.map((n) => n.id)).toEqual(["INV-STORE-1"]);

    render(
      React.createElement(WarehouseReportsLedgerAuditView, {
        mode: "notifications",
        snapshot: {
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
          notifications: cachedInvNotifs,
          auditLogs: [],
          valuationSettings: {
            id: "default",
            valuationMethod: "FIFO",
            enforceCommercialInvoiceOnGrv: true,
            enforcePlanComparisonOnRequest: true,
            quarantineDamagedReturnsAutomatically: true,
            updatedByUid: "SYS",
            updatedByName: "System",
            updatedByRole: "Super Admin",
            updatedAt: "2026-07-23T00:00:00.000Z",
            history: [],
          },
          erpProjects: [],
          erpSuppliers: [],
          erpProcurements: [],
          erpTrucks: [],
        },
        filters: {
          dateFrom: "",
          dateTo: "",
          projectId: "ALL",
          locationId: "ALL",
          categoryId: "ALL",
          inventoryType: "ALL",
        },
        actor: {
          uid: "uid-store-1",
          name: "Abebe",
          role: UserRole.STORE_MANAGER,
        },
        onFeedback: () => {},
        onOpenPrint: () => {},
      })
    );

    expect(screen.getByText("Store Replenishment Approved")).toBeInTheDocument();
    expect(screen.queryByText("Director Excess Approval Required")).not.toBeInTheDocument();
  });
});
