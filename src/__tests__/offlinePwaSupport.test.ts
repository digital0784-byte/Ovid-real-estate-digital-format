import { beforeEach, describe, expect, it } from "vitest";
import {
  clearCachedUserProfile,
  loadCachedUserProfile,
  saveCachedUserProfile,
} from "../services/authService";
import { UserRole } from "../types";

describe("Offline APK / PWA Session Persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("saves and restores an active user profile for offline cold start", () => {
    saveCachedUserProfile({
      uid: "uid-site-mgr-1",
      role: UserRole.SITE_MANAGER,
      status: "Active",
      displayName: "Abebe Bikila",
      email: "abebe@ovid.local",
      assignedProject: "PROJ-001",
    });

    const loaded = loadCachedUserProfile("uid-site-mgr-1");
    expect(loaded).not.toBeNull();
    expect(loaded?.uid).toBe("uid-site-mgr-1");
    expect(loaded?.role).toBe(UserRole.SITE_MANAGER);
    expect(loaded?.status).toBe("Active");
  });

  it("never caches Pending or inactive user profiles", () => {
    saveCachedUserProfile({
      uid: "uid-pending-1",
      role: "Pending",
      status: "Pending",
      displayName: "Pending User",
    });
    expect(loadCachedUserProfile("uid-pending-1")).toBeNull();

    saveCachedUserProfile({
      uid: "uid-suspended-1",
      role: UserRole.WORKER,
      status: "Suspended",
      displayName: "Suspended User",
    });
    expect(loadCachedUserProfile("uid-suspended-1")).toBeNull();
  });

  it("normalizes legacy Directory role to Director when caching and loading", () => {
    saveCachedUserProfile({
      uid: "uid-dir-1",
      role: "Directory",
      status: "Active",
      displayName: "Director User",
    });

    const loaded = loadCachedUserProfile("uid-dir-1");
    expect(loaded?.role).toBe(UserRole.DIRECTOR);
  });

  it("clears cached profile cleanly on logout", () => {
    saveCachedUserProfile({
      uid: "uid-logout-1",
      role: UserRole.WAREHOUSE_MANAGER,
      status: "Active",
      displayName: "Warehouse Lead",
    });
    expect(loadCachedUserProfile("uid-logout-1")).not.toBeNull();

    clearCachedUserProfile("uid-logout-1");
    expect(loadCachedUserProfile("uid-logout-1")).toBeNull();
  });
});
