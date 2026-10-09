// ============================================================
// DIGITAL CONSTRUCTION ERP SYSTEM - NAVIGATION ARCHITECTURE
// Comprehensive Multi-Role Navigation & History Management Service
// ============================================================

import { UserRole } from "../types";

export interface NavLocation {
  id: string;
  tab: string;
  subView?: string;
  params?: Record<string, any>;
  titleEn: string;
  titleAm: string;
  timestamp: number;
}

export interface UnsavedChangesGuard {
  id: string;
  isDirty: () => boolean;
  onSave?: () => Promise<boolean> | boolean;
  onDiscard?: () => void;
  messageEn?: string;
  messageAm?: string;
}

export interface SubViewBackHandler {
  id: string;
  canHandle: () => boolean;
  handleBack: () => boolean; // returns true if handled (consumed), false if stack should continue popping
}

export interface TabMetadata {
  id: string;
  num: number;
  nameEn: string;
  nameAm: string;
  category: "core" | "workforce" | "engineering" | "formwork" | "ai" | "admin";
}

export const ERP_TAB_METADATA: Record<string, TabMetadata> = {
  dashboard: {
    id: "dashboard",
    num: 1,
    nameEn: "Main Command Dashboard",
    nameAm: "ዋና የዕዝ መቆጣጠሪያ ዳሽቦርድ",
    category: "core"
  },
  notificationCenter: {
    id: "notificationCenter",
    num: 2,
    nameEn: "Enterprise Notification Center",
    nameAm: "የድርጅት ማሳወቂያ ማዕከል",
    category: "core"
  },
  customInputHub: {
    id: "customInputHub",
    num: 3,
    nameEn: "Custom Input & Governance Hub",
    nameAm: "የመረጃ ማስገቢያና ቁጥጥር ማዕከል",
    category: "core"
  },
  workerProfiles: {
    id: "workerProfiles",
    num: 4,
    nameEn: "Worker Profiles & Management",
    nameAm: "የሰራተኞች ማህደርና ምዝገባ",
    category: "workforce"
  },
  enterpriseErp: {
    id: "enterpriseErp",
    num: 5,
    nameEn: "Enterprise ERP Hub",
    nameAm: "የድርጅት ERP አስተዳደር",
    category: "core"
  },
  financeErp: {
    id: "financeErp",
    num: 6,
    nameEn: "Finance & Payroll ERP",
    nameAm: "ፋይናንስና ክፍያዎች ERP",
    category: "core"
  },
  warehouseManagerApp: {
    id: "warehouseManagerApp",
    num: 7,
    nameEn: "Central Warehouse Management",
    nameAm: "ማዕከላዊ መጋዘን አስተዳደር",
    category: "formwork"
  },
  storeOwnerApp: {
    id: "storeOwnerApp",
    num: 8,
    nameEn: "Site Store Management",
    nameAm: "የሳይት ስቶር አስተዳደር",
    category: "formwork"
  },
  panelTraceability: {
    id: "panelTraceability",
    num: 9,
    nameEn: "Panel Traceability & QR Tracking",
    nameAm: "የፓነል ዱካና QR መከታተያ",
    category: "formwork"
  },
  siteStoreMovement: {
    id: "siteStoreMovement",
    num: 10,
    nameEn: "Site Store Material Movement",
    nameAm: "የሳይት ስቶር ዕቃዎች ዝውውር",
    category: "formwork"
  },
  formworkManagement: {
    id: "formworkManagement",
    num: 11,
    nameEn: "Aluminum Formwork Management",
    nameAm: "የአሉሚኒየም ፎርምወርክ አስተዳደር",
    category: "formwork"
  },
  projectDocs: {
    id: "projectDocs",
    num: 12,
    nameEn: "Project & Document Vault",
    nameAm: "ፕሮጀክት ምዝገባ እና ሰነዶች መጋዘን",
    category: "engineering"
  },
  siteLayout: {
    id: "siteLayout",
    num: 13,
    nameEn: "Site Layout & 3D Logistics",
    nameAm: "የሳይት ፕላንና 3D ሎጂስቲክስ",
    category: "engineering"
  },
  cadDrawing: {
    id: "cadDrawing",
    num: 14,
    nameEn: "CAD Drawing & Formwork Viewer",
    nameAm: "CAD ፕላን እና ፎርምወርክ እይታ",
    category: "engineering"
  },
  surveying: {
    id: "surveying",
    num: 15,
    nameEn: "Surveying & Leveling Instruments",
    nameAm: "ሰርቬይ እና ሌቨሊንግ መሳሪያዎች",
    category: "engineering"
  },
  attendance: {
    id: "attendance",
    num: 16,
    nameEn: "Attendance & Clock-In",
    nameAm: "የመገኘት መዝገብ",
    category: "workforce"
  },
  biometricBoard: {
    id: "biometricBoard",
    num: 17,
    nameEn: "Biometric Attendance Board",
    nameAm: "ባዮሜትሪክ ቦርድ",
    category: "workforce"
  },
  fingerprintBoard: {
    id: "fingerprintBoard",
    num: 18,
    nameEn: "Fingerprint Attendance Board",
    nameAm: "የጣት አሻራ ቦርድ",
    category: "workforce"
  },
  biometricKiosk: {
    id: "biometricKiosk",
    num: 19,
    nameEn: "Biometric Enrollment Kiosk",
    nameAm: "ባዮሜትሪክ ኪዮስክ",
    category: "workforce"
  },
  headOfficeSync: {
    id: "headOfficeSync",
    num: 20,
    nameEn: "Head Office Sync",
    nameAm: "ዋና መስሪያ ቤት ማመሳሰያ",
    category: "core"
  },
  planning: {
    id: "planning",
    num: 21,
    nameEn: "Planning & Gantt Scheduler",
    nameAm: "የግንባታ እቅድ & Gantt",
    category: "engineering"
  },
  progress: {
    id: "progress",
    num: 22,
    nameEn: "Daily Progress Logs",
    nameAm: "ዕለታዊ የዕድገት መዝገብ",
    category: "engineering"
  },
  performance: {
    id: "performance",
    num: 23,
    nameEn: "Performance Evaluation",
    nameAm: "የሰራተኞች የስራ ግምገማ",
    category: "workforce"
  },
  safetyQuality: {
    id: "safetyQuality",
    num: 24,
    nameEn: "Safety & Quality Control",
    nameAm: "ደህንነት እና ጥራት ቁጥጥር",
    category: "engineering"
  },
  aiInspection: {
    id: "aiInspection",
    num: 25,
    nameEn: "AI Photo Inspection",
    nameAm: "አይአይ ፎቶ ቁጥጥር",
    category: "ai"
  },
  predictions: {
    id: "predictions",
    num: 26,
    nameEn: "AI Predictive Analytics",
    nameAm: "አይአይ ትንበያዎች",
    category: "ai"
  },
  admin: {
    id: "admin",
    num: 27,
    nameEn: "Admin User Approval Hub",
    nameAm: "የአስተዳዳሪ ፍቃድ ማዕከል",
    category: "admin"
  },
  auditLog: {
    id: "auditLog",
    num: 28,
    nameEn: "Security Audit Log",
    nameAm: "የደህንነት ኦዲት መዝገብ",
    category: "admin"
  },
  mobileApps: {
    id: "mobileApps",
    num: 29,
    nameEn: "Mobile Apps Suite",
    nameAm: "የሞባይል መተግበሪያዎች",
    category: "core"
  },
  launchReadiness: {
    id: "launchReadiness",
    num: 30,
    nameEn: "Launch Readiness",
    nameAm: "ማስጀመሪያ ዝግጁነት",
    category: "admin"
  },
  subcontractorPortal: {
    id: "subcontractorPortal",
    num: 31,
    nameEn: "Subcontractor Portal",
    nameAm: "የንዑስ ተቋራጮች ፖርታል",
    category: "engineering"
  },
  securitySettings: {
    id: "securitySettings",
    num: 32,
    nameEn: "Security & Privacy Settings",
    nameAm: "ቅንጅቶች፣ ግላዊነት እና ደህንነት",
    category: "admin"
  }
};

class AppNavigationService {
  private historyStack: NavLocation[] = [];
  private unsavedGuards: Map<string, UnsavedChangesGuard> = new Map();
  private subViewBackHandlers: SubViewBackHandler[] = [];
  private pendingNavigationAction: (() => void) | null = null;
  private onUnsavedConfirmRequired: ((guard: UnsavedChangesGuard, proceed: () => void, cancel: () => void) => void) | null = null;

  constructor() {
    // Initialize default landing location
    this.historyStack = [
      {
        id: "nav-root-dashboard",
        tab: "dashboard",
        titleEn: "Command Dashboard",
        titleAm: "ዋና የዕዝ መቆጣጠሪያ ዳሽቦርድ",
        timestamp: Date.now()
      }
    ];
  }

  public getHistory(): NavLocation[] {
    return [...this.historyStack];
  }

  public getCurrentLocation(): NavLocation {
    if (this.historyStack.length === 0) {
      return {
        id: "nav-fallback",
        tab: "dashboard",
        titleEn: "Command Dashboard",
        titleAm: "ዋና የዕዝ መቆጣጠሪያ ዳሽቦርድ",
        timestamp: Date.now()
      };
    }
    return this.historyStack[this.historyStack.length - 1];
  }

  public getPreviousLocation(): NavLocation | null {
    if (this.historyStack.length <= 1) {
      return null;
    }
    return this.historyStack[this.historyStack.length - 2];
  }

  public canGoBack(): boolean {
    // Returns true if there's an active subview handler or more than 1 history item,
    // or if the current tab is not the root "dashboard"
    if (this.hasActiveSubViewHandler()) return true;
    if (this.historyStack.length > 1) return true;
    const current = this.getCurrentLocation();
    return current.tab !== "dashboard" || Boolean(current.subView);
  }

  public pushLocation(
    tab: string,
    options?: {
      subView?: string;
      params?: Record<string, any>;
      titleEn?: string;
      titleAm?: string;
      replace?: boolean;
    }
  ): NavLocation {
    const meta = ERP_TAB_METADATA[tab];
    const titleEn = options?.titleEn || meta?.nameEn || tab;
    const titleAm = options?.titleAm || meta?.nameAm || tab;

    const newLoc: NavLocation = {
      id: `nav-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tab,
      subView: options?.subView,
      params: options?.params,
      titleEn,
      titleAm,
      timestamp: Date.now()
    };

    if (options?.replace && this.historyStack.length > 0) {
      this.historyStack[this.historyStack.length - 1] = newLoc;
    } else {
      const current = this.getCurrentLocation();
      // Avoid duplicate consecutive entries with identical tab and subview
      if (current && current.tab === tab && current.subView === options?.subView && JSON.stringify(current.params) === JSON.stringify(options?.params)) {
        return current;
      }
      this.historyStack.push(newLoc);
      // Keep reasonable max stack depth
      if (this.historyStack.length > 50) {
        this.historyStack.shift();
      }
    }

    return newLoc;
  }

  public popLocation(): NavLocation | null {
    if (this.historyStack.length <= 1) {
      return null;
    }
    this.historyStack.pop();
    return this.getCurrentLocation();
  }

  public clearToRoot(): void {
    const root = this.historyStack[0] || {
      id: "nav-root-dashboard",
      tab: "dashboard",
      titleEn: "Command Dashboard",
      titleAm: "ዋና የዕዝ መቆጣጠሪያ ዳሽቦርድ",
      timestamp: Date.now()
    };
    this.historyStack = [root];
  }

  // --- Sub-View Back Handlers ---
  public registerSubViewBackHandler(handler: SubViewBackHandler): () => void {
    this.subViewBackHandlers.unshift(handler);
    return () => {
      this.subViewBackHandlers = this.subViewBackHandlers.filter(h => h.id !== handler.id);
    };
  }

  public hasActiveSubViewHandler(): boolean {
    return this.subViewBackHandlers.some(h => h.canHandle());
  }

  public executeSubViewBack(): boolean {
    for (const handler of this.subViewBackHandlers) {
      if (handler.canHandle()) {
        const handled = handler.handleBack();
        if (handled) return true;
      }
    }
    return false;
  }

  // --- Unsaved Changes Protection ---
  public registerUnsavedGuard(guard: UnsavedChangesGuard): () => void {
    this.unsavedGuards.set(guard.id, guard);
    return () => {
      this.unsavedGuards.delete(guard.id);
    };
  }

  public getActiveUnsavedGuard(): UnsavedChangesGuard | null {
    for (const guard of this.unsavedGuards.values()) {
      if (guard.isDirty()) {
        return guard;
      }
    }
    return null;
  }

  public setUnsavedConfirmCallback(
    callback: (guard: UnsavedChangesGuard, proceed: () => void, cancel: () => void) => void
  ): void {
    this.onUnsavedConfirmRequired = callback;
  }

  public checkUnsavedBeforeProceeding(proceed: () => void, cancel?: () => void): boolean {
    const dirtyGuard = this.getActiveUnsavedGuard();
    if (dirtyGuard && this.onUnsavedConfirmRequired) {
      this.pendingNavigationAction = proceed;
      this.onUnsavedConfirmRequired(
        dirtyGuard,
        () => {
          if (dirtyGuard.onDiscard) dirtyGuard.onDiscard();
          this.pendingNavigationAction = null;
          proceed();
        },
        () => {
          this.pendingNavigationAction = null;
          if (cancel) cancel();
        }
      );
      return false; // Navigation paused for confirmation
    }
    proceed();
    return true;
  }
}

export const navigationService = new AppNavigationService();
