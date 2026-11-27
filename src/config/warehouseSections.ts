import { UserRole } from "../types";
import { normalizeLegacyRole } from "../services/authService";
import { WarehouseSectionKey } from "../services/warehouseStoreRbac";

export type WarehouseHubSectionId =
  | "overview"
  | "warehouse_operations"
  | "master_data_facilities"
  | "catalog_governance"
  | "planning_requests"
  | "grv_invoices"
  | "dispatch_giv"
  | "fixed_assets_transfers"
  | "transport_gate_pass"
  | "returns_quarantine"
  | "reports_ledger_audit";

export interface WarehouseHubSectionConfig {
  id: WarehouseHubSectionId;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  allowedRoles: UserRole[];
  readOnlyRoles: UserRole[];
  childSectionKeys: WarehouseSectionKey[];
  isCentralWarehouseControl?: boolean;
  isSiteStoreScoped?: boolean;
}

const ALL_EXECUTIVE_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.SUPER_ADMIN,
  UserRole.HEAD_OFFICE,
];

const STANDARD_OVERSIGHT_READONLY: UserRole[] = [
  UserRole.FINANCE_MANAGER,
  UserRole.AUDITOR,
  UserRole.SECTION_HEAD,
  UserRole.OFFICE_MANAGER,
  UserRole.OPERATION_MANAGER,
  UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
];

export const WAREHOUSE_HUB_SECTIONS: WarehouseHubSectionConfig[] = [
  {
    id: "overview",
    titleEn: "Overview",
    titleAm: "አጠቃላይ እይታ",
    descriptionEn: "15 KPIs, 6 charts, low stock alerts, and warehouse/site-store summary.",
    descriptionAm: "15 ቁልፍ መለኪያዎች፣ 6 ግራፎች እና የክምችት ማጠቃለያ።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.MATERIAL_HANDLING,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OFFICE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      UserRole.PROJECT_MANAGER,
      UserRole.PROCUREMENT_OFFICER,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: ["dashboard"],
    isSiteStoreScoped: true,
  },
  {
    id: "warehouse_operations",
    titleEn: "Warehouse Operations",
    titleAm: "የመጋዘን ዕለታዊ ስራዎች",
    descriptionEn:
      "GRN receiving, Main Warehouse Issue, Issue to Team/Gang, Evening Dismantling Returns, Daily Consumption & Site Reports, Inventory Audit & Valuation, Formwork GPS & Zones, ERP Sync, and AI Analytics.",
    descriptionAm:
      "GRN፣ ከዋና መጋዘን ወጪ፣ ለቡድን ወጪ፣ የማታ ተመላሽ፣ ዕለታዊ ሪፖርት፣ የክምችት ኦዲት፣ ፎርምወርክ GPS እና ዞኖች፣ ERP ማመሳሰያ እና AI ትንተና።",
    allowedRoles: [...ALL_EXECUTIVE_ROLES, UserRole.WAREHOUSE_MANAGER],
    readOnlyRoles: [],
    childSectionKeys: ["warehouse_fleet_formwork", "store_field_operations"],
    isCentralWarehouseControl: true,
  },
  {
    id: "master_data_facilities",
    titleEn: "Master Data & Facilities",
    titleAm: "ዋና መረጃ እና መጋዘኖች",
    descriptionEn: "Warehouses, central stock balances, item catalog, categories, and project site stores.",
    descriptionAm: "መጋዘኖች፣ ማዕከላዊ ክምችት፣ የዕቃዎች ዝርዝር እና የፕሮጀክት ሳይት ስቶሮች።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OFFICE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      UserRole.PROJECT_MANAGER,
      UserRole.PROCUREMENT_OFFICER,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: ["warehouse_inventory", "site_stores"],
    isSiteStoreScoped: true,
  },
  {
    id: "catalog_governance",
    titleEn: "Catalog Governance",
    titleAm: "የካታሎግ እና ፎርምወርክ ቁጥጥር",
    descriptionEn: "Aluminum formwork panel master catalog, facility hierarchy, and smart cascading dropdowns.",
    descriptionAm: "ማዕከላዊ የአሉሚኒየም ፎርምወርክ ፓነሎች ካታሎግ እና የፕሮጀክት መጋዘን ተዋረድ።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.AUDITOR,
      UserRole.OFFICE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: [],
    isCentralWarehouseControl: true,
  },
  {
    id: "planning_requests",
    titleEn: "Planning & Requests",
    titleAm: "ዕቅድ እና የዕቃ ጥያቄዎች",
    descriptionEn: "Engineering material plans, site requests with plan comparison, and Director approvals.",
    descriptionAm: "የምህንድስና ዕቃ ዕቅድ፣ የሳይት ጥያቄዎች እና የዳይሬክተር ማፅደቂያ።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OFFICE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      UserRole.PROJECT_MANAGER,
    ],
    readOnlyRoles: [
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OPERATION_MANAGER,
    ],
    childSectionKeys: ["material_planning", "material_requests", "director_approvals"],
    isSiteStoreScoped: true,
  },
  {
    id: "grv_invoices",
    titleEn: "GRV & Commercial Invoice",
    titleAm: "GRV እና የንግድ ደረሰኞች",
    descriptionEn: "Goods receiving vouchers with mandatory commercial invoice attachments.",
    descriptionAm: "የዕቃ መቀበያ ደረሰኝ (GRV) እና የንግድ ደረሰኞች ማስተዳደሪያ።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.PROCUREMENT_OFFICER,
    ],
    readOnlyRoles: [...STANDARD_OVERSIGHT_READONLY, UserRole.PROCUREMENT_OFFICER],
    childSectionKeys: ["grv", "commercial_invoices"],
    isCentralWarehouseControl: true,
  },
  {
    id: "dispatch_giv",
    titleEn: "Dispatch & GIV",
    titleAm: "ዕቃ መላኪያ እና መቀበያ (GIV)",
    descriptionEn: "Main warehouse GIV dispatch and project site receipt confirmation.",
    descriptionAm: "ከዋና መጋዘን ዕቃ መላኪያ (GIV) እና በሳይት መቀበያ ማረጋገጫ።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.MATERIAL_HANDLING,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OPERATION_MANAGER,
      UserRole.PROJECT_MANAGER,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: ["giv_dispatch"],
    isSiteStoreScoped: true,
  },
  {
    id: "fixed_assets_transfers",
    titleEn: "Fixed Assets & Transfers",
    titleAm: "ቋሚ ንብረቶች እና ዝውውሮች",
    descriptionEn: "Central BIG BALANCE registry, project fixed assets, and FATOV/FATIV transfers.",
    descriptionAm: "ማዕከላዊ ቋሚ ንብረቶች (BIG BALANCE)፣ የፕሮጀክት ንብረቶች እና FATOV/FATIV ዝውውሮች።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.MATERIAL_HANDLING,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OFFICE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      UserRole.PROJECT_MANAGER,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: ["fixed_assets_big_balance", "project_fixed_assets", "fatov_fativ"],
    isSiteStoreScoped: true,
  },
  {
    id: "transport_gate_pass",
    titleEn: "Transport & Gate Pass",
    titleAm: "ትራንስፖርት እና የበር ማለፊያ",
    descriptionEn: "11-stage logistics tracking and QR gate pass exit/entry verification.",
    descriptionAm: "11-ደረጃ ትራንስፖርት ክትትል እና የQR በር ማለፊያ ማረጋገጫ።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.MATERIAL_HANDLING,
      UserRole.GATE_SECURITY_OFFICER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OPERATION_MANAGER,
      UserRole.PROJECT_MANAGER,
    ],
    readOnlyRoles: [
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OFFICE_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
    ],
    childSectionKeys: ["transportation", "gate_pass"],
  },
  {
    id: "returns_quarantine",
    titleEn: "Returns & Quarantine",
    titleAm: "ተመላሽ እና ኳራንቲን",
    descriptionEn: "Two-way MRV material returns and damaged/quarantined stock disposition.",
    descriptionAm: "የሁለትዮሽ ተመላሽ (MRV) እና የተጎዱ/ኳራንቲን ዕቃዎች አስተዳደር።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.MATERIAL_HANDLING,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OPERATION_MANAGER,
      UserRole.PROJECT_MANAGER,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: ["returns_mrv", "quarantine_stock"],
    isSiteStoreScoped: true,
  },
  {
    id: "reports_ledger_audit",
    titleEn: "Reports, Ledger & Audit",
    titleAm: "ሪፖርቶች፣ መዝገብ እና ኦዲት",
    descriptionEn: "22 Excel/PDF reports, stock movement ledger, notifications, audit logs, and valuation policy.",
    descriptionAm: "22 ሪፖርቶች፣ የክምችት መዝገብ፣ ማስጠንቀቂያዎች፣ የኦዲት ታሪክ እና የዋጋ ግምት ቅንብር።",
    allowedRoles: [
      ...ALL_EXECUTIVE_ROLES,
      UserRole.WAREHOUSE_MANAGER,
      UserRole.STORE_MANAGER,
      UserRole.SITE_MANAGER,
      UserRole.MATERIAL_HANDLING,
      UserRole.GATE_SECURITY_OFFICER,
      UserRole.FINANCE_MANAGER,
      UserRole.AUDITOR,
      UserRole.SECTION_HEAD,
      UserRole.OFFICE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      UserRole.PROJECT_MANAGER,
      UserRole.PROCUREMENT_OFFICER,
    ],
    readOnlyRoles: STANDARD_OVERSIGHT_READONLY,
    childSectionKeys: ["reports", "stock_ledger", "audit_logs", "notifications", "settings"],
    isSiteStoreScoped: true,
  },
];

export const STORE_OWNER_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.STORE_MANAGER,
  UserRole.SITE_MANAGER,
]);

export function resolveNormalizedUserRole(role?: UserRole | string | null): UserRole | null {
  if (!role) return null;
  const normalized = normalizeLegacyRole(String(role));
  const values = Object.values(UserRole) as string[];
  if (values.includes(normalized)) {
    return normalized as UserRole;
  }
  const match = values.find((v) => v.toLowerCase() === String(role).trim().toLowerCase());
  return (match as UserRole) || null;
}

export function getWarehouseHubSectionsForRole(
  role?: UserRole | string | null
): WarehouseHubSectionConfig[] {
  const resolved = resolveNormalizedUserRole(role);
  if (!resolved) return [];
  return WAREHOUSE_HUB_SECTIONS.filter((sec) => sec.allowedRoles.includes(resolved));
}

export function canViewWarehouseHubSection(
  role: UserRole | string | undefined | null,
  sectionId: WarehouseHubSectionId
): boolean {
  const resolved = resolveNormalizedUserRole(role);
  if (!resolved) return false;
  const sec = WAREHOUSE_HUB_SECTIONS.find((s) => s.id === sectionId);
  return Boolean(sec && sec.allowedRoles.includes(resolved));
}

export function isWarehouseHubSectionReadOnly(
  role: UserRole | string | undefined | null,
  sectionId: WarehouseHubSectionId
): boolean {
  const resolved = resolveNormalizedUserRole(role);
  if (!resolved) return true;
  if (ALL_EXECUTIVE_ROLES.includes(resolved)) return false;
  const sec = WAREHOUSE_HUB_SECTIONS.find((s) => s.id === sectionId);
  if (!sec) return true;
  return sec.readOnlyRoles.includes(resolved);
}

export function normalizeLegacyTabToWarehouse(
  tab: string,
  role?: UserRole | string | null
): {
  tab: string;
  initialSection?: WarehouseHubSectionId;
  blockedAttempt?: { attemptedRoute: string; redirectedTo: string; reason: string };
} {
  const resolved = resolveNormalizedUserRole(role);

  if (tab === "warehouseManagerApp") {
    if (resolved && STORE_OWNER_ROLES.has(resolved)) {
      return {
        tab: "storeOwnerApp",
        blockedAttempt: {
          attemptedRoute: "/warehouseManagerApp",
          redirectedTo: "/storeOwnerApp",
          reason: `Access Denied — ${resolved} cannot access central Warehouse Manager Operations.`,
        },
      };
    }
    return {
      tab: "warehouseSiteStore",
      initialSection: "warehouse_operations",
    };
  }

  if (tab === "storeOwnerApp") {
    if (resolved === UserRole.WAREHOUSE_MANAGER) {
      return {
        tab: "warehouseSiteStore",
        blockedAttempt: {
          attemptedRoute: "/storeOwnerApp",
          redirectedTo: "/warehouseSiteStore",
          reason: "Access Denied — Warehouse Manager cannot access the private Store Owner App.",
        },
      };
    }
    return { tab: "storeOwnerApp" };
  }

  return { tab };
}
