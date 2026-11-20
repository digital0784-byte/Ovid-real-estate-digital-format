import { UserRole } from "../types";

export type CanonicalWarehouseRole =
  | "warehouse_manager"
  | "site_store_owner"
  | "head_office"
  | "admin"
  | "other";

export type WarehouseAppMode = "warehouse_manager" | "store_owner";

export interface StockLedgerBreakdown {
  openingStock: number;
  received: number;
  returned: number;
  transferIn: number;
  issued: number;
  transferOut: number;
  damaged: number;
  adjustments: number;
  currentStock: number;
}

export interface StockTransactionRecord {
  id: string;
  transactionType:
    | "GRN_RECEIVED"
    | "PO_RECEIVED"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "ISSUE_FROM_WAREHOUSE"
    | "ISSUE_TO_TEAM"
    | "RETURN_FROM_TEAM"
    | "RETURN_VERIFIED_WAREHOUSE"
    | "DAMAGED_REPORTED"
    | "MISSING_REPORTED"
    | "STOCK_ADJUSTMENT"
    | "STOCK_COUNT_RECONCILIATION";
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  warehouseId?: string;
  warehouseName?: string;
  siteId?: string;
  siteName?: string;
  projectName?: string;
  building?: string;
  floor?: string;
  zone?: string;
  referenceId: string;
  performedByUid: string;
  performedByName: string;
  performedByRole: string;
  timestamp: string;
  notes?: string;
}

export interface StockDiscrepancyRecord {
  id: string;
  transferId: string;
  requestId?: string;
  materialName: string;
  unit: string;
  sentQuantity: number;
  receivedQuantity: number;
  difference: number;
  discrepancyReason: string;
  sourceWarehouse: string;
  destinationSiteStore: string;
  reportedByUid: string;
  reportedByName: string;
  reportedByRole: string;
  dateTime: string;
  status: "Pending Review" | "Investigating" | "Resolved / Audited" | "Adjusted";
  resolutionNotes?: string;
}

export interface StockAdjustmentRecord {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  warehouseName: string;
  previousQty: number;
  adjustmentDelta: number;
  newQty: number;
  reason: string;
  requestedBy: string;
  approvedBy: string;
  status: "Approved" | "Pending Approval" | "Rejected";
  timestamp: string;
}

export interface SiteStockCountRecord {
  id: string;
  siteName: string;
  projectName: string;
  materialId: string;
  materialName: string;
  unit: string;
  systemExpectedQty: number;
  physicalCountedQty: number;
  variance: number;
  countedBy: string;
  verifiedBy: string;
  date: string;
  status: "Matched" | "Discrepancy Flagged" | "Reconciled";
  remarks?: string;
}

export interface DamagedMissingMaterialReport {
  id: string;
  reportType: "Damaged" | "Missing";
  scope: "Warehouse" | "Site Store";
  siteOrWarehouseName: string;
  projectName: string;
  building?: string;
  floor?: string;
  zone?: string;
  materialId: string;
  materialName: string;
  panelSerialNumber?: string;
  quantity: number;
  unit: string;
  estimatedCostEtb: number;
  causeDescription: string;
  responsibleTeamOrParty: string;
  reportedBy: string;
  reportedByRole: string;
  date: string;
  status: "Open" | "Under Investigation" | "Deducted / Resolved" | "Sent for Repair";
}

export interface EnterpriseAuditEvent {
  id: string;
  userUid: string;
  userName: string;
  userRole: string;
  action:
    | "WAREHOUSE_MANAGER_APPROVED_REQUEST"
    | "WAREHOUSE_MANAGER_PARTIALLY_APPROVED_REQUEST"
    | "WAREHOUSE_MANAGER_REJECTED_REQUEST"
    | "WAREHOUSE_MANAGER_DISPATCHED_TRANSFER"
    | "WAREHOUSE_MANAGER_ISSUED_MAIN_WAREHOUSE"
    | "WAREHOUSE_MANAGER_VERIFIED_RETURN"
    | "WAREHOUSE_MANAGER_CREATED_GRN"
    | "STOCK_ADJUSTMENT_APPROVED"
    | "SITE_STORE_CREATED_REQUEST"
    | "SITE_STORE_RECEIVED_TRANSFER"
    | "SITE_STORE_REPORTED_DISCREPANCY"
    | "SITE_STORE_ISSUED_MATERIAL"
    | "SITE_STORE_RETURNED_MATERIAL"
    | "SITE_STORE_ALLOCATED_FLOOR_ZONE"
    | "SITE_STORE_RECORDED_CONSUMPTION"
    | "SITE_STORE_SUBMITTED_STOCK_COUNT"
    | "SITE_STORE_REPORTED_DAMAGED_MATERIAL"
    | "SITE_STORE_REPORTED_MISSING_MATERIAL"
    | "UNAUTHORIZED_ROUTE_ATTEMPT"
    | "UNAUTHORIZED_DATA_SCOPE_ATTEMPT"
    | string;
  module: string;
  transactionId: string;
  previousValue: string;
  newValue: string;
  dateTime: string;
  project: string;
  site: string;
  warehouse: string;
  deviceSession: string;
  details: string;
}

/**
 * Normalizes any UserRole or string role to a canonical RBAC role.
 */
export function resolveCanonicalRole(role?: UserRole | string | null): CanonicalWarehouseRole {
  if (!role) return "other";
  const r = String(role).trim().toLowerCase();
  if (r === "super admin" || r === "admin" || r === "super_admin") return "admin";
  if (r === "head office" || r === "head_office") return "head_office";
  if (r === "warehouse manager" || r === "warehouse_manager") return "warehouse_manager";
  if (
    r === "store owner" ||
    r === "store manager" ||
    r === "site store owner" ||
    r === "site_store_owner" ||
    r === "store_owner" ||
    r === "store_manager"
  ) {
    return "site_store_owner";
  }
  return "other";
}

export const resolveCanonicalWarehouseRole = resolveCanonicalRole;

export function canAccessAppMode(
  role: UserRole | string | undefined | null,
  targetMode: WarehouseAppMode
): boolean {
  const canonical = resolveCanonicalRole(role);
  if (canonical === "admin" || canonical === "head_office") return true;
  if (canonical === "warehouse_manager") return targetMode === "warehouse_manager";
  if (canonical === "site_store_owner") return targetMode === "store_owner";
  return false;
}

/**
 * Aluminum Formwork Management System is strictly controlled ONLY by:
 * 1. Warehouse Manager App (warehouse_manager)
 * 2. Head Office Manager App (head_office)
 * 3. Admin App (admin)
 */
export function canControlAluminumFormwork(
  role: UserRole | string | undefined | null
): boolean {
  const canonical = resolveCanonicalRole(role);
  return (
    canonical === "warehouse_manager" ||
    canonical === "head_office" ||
    canonical === "admin"
  );
}

/**
 * Calculates transaction-based inventory strictly following:
 * Opening Stock + Received + Returned + Transfer In - Issued - Transfer Out - Damaged - Adjustments = Current Stock
 */
export function calculateTransactionStock(params: {
  openingStock: number;
  received?: number;
  returned?: number;
  transferIn?: number;
  issued?: number;
  transferOut?: number;
  damaged?: number;
  adjustments?: number;
}): StockLedgerBreakdown {
  const openingStock = Number(params.openingStock) || 0;
  const received = Number(params.received) || 0;
  const returned = Number(params.returned) || 0;
  const transferIn = Number(params.transferIn) || 0;
  const issued = Number(params.issued) || 0;
  const transferOut = Number(params.transferOut) || 0;
  const damaged = Number(params.damaged) || 0;
  const adjustments = Number(params.adjustments) || 0;

  const currentStock = Math.max(
    0,
    openingStock +
      received +
      returned +
      transferIn -
      issued -
      transferOut -
      damaged -
      adjustments
  );

  return {
    openingStock,
    received,
    returned,
    transferIn,
    issued,
    transferOut,
    damaged,
    adjustments,
    currentStock
  };
}

/**
 * WAREHOUSE MANAGER NAVIGATION (Section 2 & Section 15)
 * Warehouse Manager sees ONLY:
 * Dashboard, Warehouses, Materials, Suppliers, Goods Receiving, Inventory,
 * Material Requests, Transfers, Issues, Returns, Reports, Notifications, Settings, Security
 */
export interface RoleNavModule {
  id: string;
  shortLabelEn: string;
  shortLabelAm: string;
  fullTitleEn: string;
  fullTitleAm: string;
  routePath: string;
  allowedRoles: CanonicalWarehouseRole[];
  isSharedCore?: boolean;
  subModulesEn: string[];
}

export const WAREHOUSE_MANAGER_NAV_MODULES: RoleNavModule[] = [
  {
    id: "wh-dashboard",
    shortLabelEn: "Dashboard",
    shortLabelAm: "የመጋዘን ዳሽቦርድ",
    fullTitleEn: "Warehouse Manager Dashboard",
    fullTitleAm: "የዋና መጋዘን ሥራ አስኪያጅ ዳሽቦርድ",
    routePath: "/warehouse/dashboard",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    subModulesEn: [
      "Total Warehouses & Central Inventory Status",
      "Total Stock & Stock Valuation",
      "Pending Material Requests & Transfers",
      "Pending Goods Receipts & Supplier Deliveries",
      "Damaged, Missing & Low Stock Alerts"
    ]
  },
  {
    id: "wh-warehouses",
    shortLabelEn: "Warehouses",
    shortLabelAm: "መጋዘኖች እና ቦታዎች",
    fullTitleEn: "Warehouse Management & Locations",
    fullTitleAm: "የመጋዘን አስተዳደር፣ ቦታዎች እና ሳይት ምደባ",
    routePath: "/warehouse/warehouses",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    subModulesEn: [
      "1. Warehouse Management",
      "2. Warehouse Locations (Sheds / Bays / Yards)",
      "10. Site Allocation"
    ]
  },
  {
    id: "wh-materials",
    shortLabelEn: "Materials",
    shortLabelAm: "የዕቃዎች ማስተር",
    fullTitleEn: "Item / Material Master Catalog",
    fullTitleAm: "የዕቃዎች እና አሉሚኒየም ፎርምወርክ ማስተር ዝርዝር",
    routePath: "/warehouse/materials",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    subModulesEn: [
      "3. Item/Material Master",
      "Aluminum Formwork Panel Specifications",
      "17. Low Stock / Reorder Thresholds"
    ]
  },
  {
    id: "wh-suppliers",
    shortLabelEn: "Suppliers",
    shortLabelAm: "አቅራቢዎች",
    fullTitleEn: "Supplier Management & Deliveries",
    fullTitleAm: "የአቅራቢዎች አስተዳደር እና የዕቃ አቅርቦት መርሃ-ግብር",
    routePath: "/warehouse/suppliers",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    subModulesEn: [
      "4. Supplier Management",
      "Supplier Delivery Schedules"
    ]
  },
  {
    id: "wh-grn",
    shortLabelEn: "Goods Receiving",
    shortLabelAm: "ዕቃ መቀበያ (GRN)",
    fullTitleEn: "Goods Receiving (GRN) & Purchase-Linked Receiving",
    fullTitleAm: "ከአቅራቢ እና ከግዥ ትዕዛዝ (PO) ዕቃ መቀበያ (GRN)",
    routePath: "/warehouse/goods-receiving",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    subModulesEn: [
      "5. Goods Receiving / GRN",
      "6. Purchase-linked Receiving (PO)"
    ]
  },
  {
    id: "wh-inventory",
    shortLabelEn: "Inventory",
    shortLabelAm: "ማዕከላዊ ክምችት",
    fullTitleEn: "Central Inventory, Stock Adjustment, Valuation & Audit",
    fullTitleAm: "ማዕከላዊ ክምችት፣ የስቶክ ማስተካከያ፣ ግምት እና ኦዲት",
    routePath: "/warehouse/inventory",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    subModulesEn: [
      "7. Central Inventory & Formwork Panels",
      "8. Warehouse Stock Adjustment",
      "15. Stock Valuation",
      "16. Inventory Audit",
      "17. Low Stock/Reorder Alerts"
    ]
  },
  {
    id: "wh-requests",
    shortLabelEn: "Material Requests",
    shortLabelAm: "የዕቃ ጥያቄዎች ግምገማ",
    fullTitleEn: "Material Request Review & Approval",
    fullTitleAm: "ከሳይት ስቶር የቀረቡ የዕቃ ጥያቄዎች መገምገሚያ እና ማፅደቂያ",
    routePath: "/warehouse/material-requests",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "11. Material Request Review (Approve / Partially Approve / Reject)",
      "Prepare Material for Dispatch"
    ]
  },
  {
    id: "wh-transfers",
    shortLabelEn: "Transfers",
    shortLabelAm: "ዝውውሮች (Transfers)",
    fullTitleEn: "Warehouse-to-Warehouse & Warehouse-to-Site Transfers",
    fullTitleAm: "ከመጋዘን ወደ መጋዘን እና ወደ ሳይት ስቶር ዕቃ ማስተላለፊያ",
    routePath: "/warehouse/transfers",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "9. Warehouse-to-Warehouse Transfer",
      "Warehouse → Site Store Dispatch",
      "Site Discrepancy Resolution"
    ]
  },
  {
    id: "wh-issues",
    shortLabelEn: "Issues",
    shortLabelAm: "ከዋና መጋዘን ወጪ",
    fullTitleEn: "Material Issue from Main Warehouse",
    fullTitleAm: "ከዋና መጋዘን ዕቃ ወጪ ማድረጊያ",
    routePath: "/warehouse/issues",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "12. Material Issue from Main Warehouse",
      "Authorized Site Allocation Issuance"
    ]
  },
  {
    id: "wh-returns",
    shortLabelEn: "Returns",
    shortLabelAm: "ተመላሽ ማረጋገጫ",
    fullTitleEn: "Material Return Verification",
    fullTitleAm: "ወደ ዋና መጋዘን የተመለሱ ዕቃዎች ማረጋገጫ",
    routePath: "/warehouse/returns",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "13. Material Return Verification",
      "Damaged / Missing Warehouse Inspection"
    ]
  },
  {
    id: "wh-reports",
    shortLabelEn: "Reports",
    shortLabelAm: "የመጋዘን ሪፖርቶች",
    fullTitleEn: "Warehouse Reports & Valuation Analytics",
    fullTitleAm: "የመጋዘን ክምችት፣ ዝውውር፣ አቅራቢ እና የዋጋ ግምት ሪፖርቶች",
    routePath: "/warehouse/reports",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "14. Warehouse Reports (Central Stock, Transfers, Supplier/GRN, Site Allocation)"
    ]
  },
  {
    id: "wh-notifications",
    shortLabelEn: "Notifications",
    shortLabelAm: "ማስታወቂያዎች",
    fullTitleEn: "Warehouse Notifications",
    fullTitleAm: "የመጋዘን ማስታወቂያዎች",
    routePath: "/warehouse/notifications",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "New Material Requests & Approval Required",
      "Low Warehouse Stock & Supplier Deliveries",
      "Transfer Confirmations & Site Discrepancies"
    ]
  },
  {
    id: "wh-settings",
    shortLabelEn: "Settings",
    shortLabelAm: "ቅንብሮች",
    fullTitleEn: "Warehouse Profile & Operational Settings",
    fullTitleAm: "የመጋዘን ሥራ አስኪያጅ መገለጫ እና ቅንብሮች",
    routePath: "/warehouse/settings",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: ["Authorized Warehouses Scope", "Reorder Alert Preferences"]
  },
  {
    id: "wh-security",
    shortLabelEn: "Security",
    shortLabelAm: "ደህንነት እና ኦዲት",
    fullTitleEn: "Warehouse Security & Audit History",
    fullTitleAm: "የመጋዘን ደህንነት፣ የፈቃድ ማትሪክስ እና የኦዲት ታሪክ",
    routePath: "/warehouse/security",
    allowedRoles: ["warehouse_manager", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: ["Role Permission Matrix", "Immutable Warehouse Audit Log"]
  }
];

/**
 * SITE STORE OWNER NAVIGATION (Section 3 & Section 15)
 * Site Store Owner sees ONLY:
 * Dashboard, Site Stock, Material Requests, Receive Materials, Issue Materials,
 * Returns, Floor/Zone, Consumption, Stock Count, Damaged/Missing, Reports,
 * Notifications, Settings, Security
 */
export const SITE_STORE_OWNER_NAV_MODULES: RoleNavModule[] = [
  {
    id: "ss-dashboard",
    shortLabelEn: "Dashboard",
    shortLabelAm: "የሳይት ስቶር ዳሽቦርድ",
    fullTitleEn: "Site Store Dashboard",
    fullTitleAm: "የሳይት ስቶር ባለቤት ዳሽቦርድ",
    routePath: "/site-store/dashboard",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    subModulesEn: [
      "1. Site Store Dashboard",
      "Site Stock, Today's Issues & Today's Receipts",
      "Pending Requests, Pending Returns & Low Stock",
      "Floor/Zone Allocation & Daily Material Consumption"
    ]
  },
  {
    id: "ss-site-stock",
    shortLabelEn: "Site Stock",
    shortLabelAm: "የሳይት ክምችት",
    fullTitleEn: "Assigned Site Stock & General Materials",
    fullTitleAm: "የተመደበው የሳይት ስቶር ክምችት እና የግንባታ ዕቃዎች",
    routePath: "/site-store/site-stock",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    subModulesEn: [
      "2. Site Stock (Transaction-calculated)",
      "Assigned Site Consumables, Tools & General Construction Materials"
    ]
  },
  {
    id: "ss-requests",
    shortLabelEn: "Material Requests",
    shortLabelAm: "የዕቃ መጠየቂያ",
    fullTitleEn: "Material Request to Main Warehouse",
    fullTitleAm: "ከዋና መጋዘን የዕቃ መጠየቂያ (Material Request)",
    routePath: "/site-store/material-requests",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "3. Create & Submit Material Request to Warehouse Manager",
      "Track Request Approval & Dispatch Status"
    ]
  },
  {
    id: "ss-receive",
    shortLabelEn: "Receive Materials",
    shortLabelAm: "ከመጋዘን መቀበያ",
    fullTitleEn: "Receive Material from Warehouse & Site Transfer Receiving",
    fullTitleAm: "ከዋና መጋዘን የተላከ ዕቃ መቀበያ እና ልዩነት መመዝገቢያ",
    routePath: "/site-store/receive-materials",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "4. Receive Material from Warehouse",
      "12. Site Transfer Receiving & Discrepancy Reporting (Sent vs Received)"
    ]
  },
  {
    id: "ss-issue",
    shortLabelEn: "Issue Materials",
    shortLabelAm: "ለቡድን/ጋንግ ወጪ",
    fullTitleEn: "Material Issue to Team / Gang / Floor / Zone",
    fullTitleAm: "ለቡድን መሪ፣ ጋንግ ቺፍ፣ ፎቅ እና ዞን ዕቃ ወጪ ማድረጊያ",
    routePath: "/site-store/issue-materials",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "5. Material Issue to Team Leader / Gang Chief / Floor / Zone",
      "Automatic Site Store Stock Deduction"
    ]
  },
  {
    id: "ss-returns",
    shortLabelEn: "Returns",
    shortLabelAm: "ከቡድን ተመላሽ",
    fullTitleEn: "Material Return from Team / Gang",
    fullTitleAm: "ከቡድን/ጋንግ ወደ ሳይት ስቶር የሚመለሱ ዕቃዎች መቀበያ",
    routePath: "/site-store/returns",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "6. Material Return (Good, Damaged, Missing Condition Breakdown)",
      "Automatic Site Store Inventory Update"
    ]
  },
  {
    id: "ss-floor-zone",
    shortLabelEn: "Floor/Zone",
    shortLabelAm: "ፎቅ እና ዞን ምደባ",
    fullTitleEn: "Floor / Zone Construction Material Allocation",
    fullTitleAm: "ፕሮጀክት → ሳይት → ህንፃ → ፎቅ → ዞን የዕቃ ምደባ",
    routePath: "/site-store/floor-zone",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    subModulesEn: [
      "7. Floor/Zone Allocation (Planned, Issued, Used, Remaining, Damaged, Returned)"
    ]
  },
  {
    id: "ss-consumption",
    shortLabelEn: "Consumption",
    shortLabelAm: "ዕለታዊ ፍጆታ",
    fullTitleEn: "Daily Material Consumption",
    fullTitleAm: "ዕለታዊ የሳይት ዕቃዎች ፍጆታ እና ልዩነት ክትትል",
    routePath: "/site-store/consumption",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    subModulesEn: [
      "8. Daily Material Consumption by Building, Floor & Zone"
    ]
  },
  {
    id: "ss-stock-count",
    shortLabelEn: "Stock Count",
    shortLabelAm: "የሳይት ቆጠራ",
    fullTitleEn: "Site Physical Stock Count",
    fullTitleAm: "የሳይት ስቶር የአካል ቆጠራ እና ማመሳከሪያ",
    routePath: "/site-store/stock-count",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    subModulesEn: [
      "9. Site Stock Count & Variance Reconciliation"
    ]
  },
  {
    id: "ss-damaged-missing",
    shortLabelEn: "Damaged/Missing",
    shortLabelAm: "የተጎዱ/የጠፉ ዕቃዎች",
    fullTitleEn: "Damaged & Missing Material Reports",
    fullTitleAm: "በሳይት ላይ የተጎዱ እና የጠፉ ዕቃዎች ሪፖርት",
    routePath: "/site-store/damaged-missing",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    subModulesEn: [
      "10. Damaged Material Report",
      "11. Missing Material Report"
    ]
  },
  {
    id: "ss-reports",
    shortLabelEn: "Reports",
    shortLabelAm: "የሳይት ሪፖርቶች",
    fullTitleEn: "Site-Level Material Reports",
    fullTitleAm: "የሳይት ስቶር ክምችት፣ ወጪ፣ ተመላሽ እና ፍጆታ ሪፖርቶች",
    routePath: "/site-store/reports",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "13. Site-level Reports (Site Stock, Site Consumption, Issue, Return, Discrepancy, Floor/Zone)"
    ]
  },
  {
    id: "ss-notifications",
    shortLabelEn: "Notifications",
    shortLabelAm: "ማስታወቂያዎች",
    fullTitleEn: "Site Store Notifications",
    fullTitleAm: "የሳይት ስቶር ማስታወቂያዎች",
    routePath: "/site-store/notifications",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: [
      "Request Approved & Material Dispatched",
      "Material Ready for Receiving & Low Site Stock",
      "Return Status & Discrepancy Response"
    ]
  },
  {
    id: "ss-settings",
    shortLabelEn: "Settings",
    shortLabelAm: "ቅንብሮች",
    fullTitleEn: "Site Store Profile & Assigned Site Settings",
    fullTitleAm: "የሳይት ስቶር መገለጫ እና የተመደበ ሳይት ቅንብሮች",
    routePath: "/site-store/settings",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: ["Assigned Site & Project Scope", "Alert Thresholds"]
  },
  {
    id: "ss-security",
    shortLabelEn: "Security",
    shortLabelAm: "ደህንነት እና ኦዲት",
    fullTitleEn: "Site Store Security & Audit History",
    fullTitleAm: "የሳይት ስቶር ደህንነት፣ የፈቃድ ማትሪክስ እና የኦዲት ታሪክ",
    routePath: "/site-store/security",
    allowedRoles: ["site_store_owner", "head_office", "admin"],
    isSharedCore: true,
    subModulesEn: ["Site Data Isolation Rules", "Immutable Site Store Audit Log"]
  }
];

export type WarehouseStoreAction =
  | "MANAGE_WAREHOUSES"
  | "MANAGE_WAREHOUSE_LOCATIONS"
  | "MANAGE_ITEM_MASTER"
  | "MANAGE_SUPPLIERS"
  | "CREATE_GRN"
  | "CREATE_PO_RECEIPT"
  | "ADJUST_WAREHOUSE_STOCK"
  | "CREATE_WAREHOUSE_TRANSFER"
  | "ALLOCATE_SITE_FROM_WAREHOUSE"
  | "REVIEW_APPROVE_MATERIAL_REQUEST"
  | "ISSUE_FROM_MAIN_WAREHOUSE"
  | "VERIFY_WAREHOUSE_RETURN"
  | "VIEW_STOCK_VALUATION"
  | "PERFORM_WAREHOUSE_AUDIT"
  | "CREATE_SITE_MATERIAL_REQUEST"
  | "RECEIVE_MATERIAL_FROM_WAREHOUSE"
  | "REPORT_TRANSFER_DISCREPANCY"
  | "ISSUE_MATERIAL_TO_TEAM"
  | "RECORD_MATERIAL_RETURN_FROM_TEAM"
  | "ALLOCATE_FLOOR_ZONE"
  | "RECORD_DAILY_SITE_CONSUMPTION"
  | "SUBMIT_SITE_STOCK_COUNT"
  | "REPORT_SITE_DAMAGED_MISSING";

const WAREHOUSE_MANAGER_ONLY_ACTIONS: Set<WarehouseStoreAction> = new Set([
  "MANAGE_WAREHOUSES",
  "MANAGE_WAREHOUSE_LOCATIONS",
  "MANAGE_ITEM_MASTER",
  "MANAGE_SUPPLIERS",
  "CREATE_GRN",
  "CREATE_PO_RECEIPT",
  "ADJUST_WAREHOUSE_STOCK",
  "CREATE_WAREHOUSE_TRANSFER",
  "ALLOCATE_SITE_FROM_WAREHOUSE",
  "REVIEW_APPROVE_MATERIAL_REQUEST",
  "ISSUE_FROM_MAIN_WAREHOUSE",
  "VERIFY_WAREHOUSE_RETURN",
  "VIEW_STOCK_VALUATION",
  "PERFORM_WAREHOUSE_AUDIT"
]);

const SITE_STORE_OWNER_ONLY_ACTIONS: Set<WarehouseStoreAction> = new Set([
  "CREATE_SITE_MATERIAL_REQUEST",
  "RECEIVE_MATERIAL_FROM_WAREHOUSE",
  "REPORT_TRANSFER_DISCREPANCY",
  "ISSUE_MATERIAL_TO_TEAM",
  "RECORD_MATERIAL_RETURN_FROM_TEAM",
  "ALLOCATE_FLOOR_ZONE",
  "RECORD_DAILY_SITE_CONSUMPTION",
  "SUBMIT_SITE_STOCK_COUNT",
  "REPORT_SITE_DAMAGED_MISSING"
]);

export function canPerformAction(
  role: UserRole | string | undefined | null,
  action: WarehouseStoreAction
): boolean {
  const canonical = resolveCanonicalRole(role);
  if (canonical === "admin" || canonical === "head_office") return true;
  if (canonical === "warehouse_manager") {
    return WAREHOUSE_MANAGER_ONLY_ACTIONS.has(action);
  }
  if (canonical === "site_store_owner") {
    return SITE_STORE_OWNER_ONLY_ACTIONS.has(action);
  }
  return false;
}

export function canAccessRoutePath(
  role: UserRole | string | undefined | null,
  routePath: string
): { allowed: boolean; redirectRoute: string; reason: string } {
  const canonical = resolveCanonicalRole(role);
  const normalizedRoute = routePath.trim().toLowerCase();

  if (canonical === "admin" || canonical === "head_office") {
    return { allowed: true, redirectRoute: normalizedRoute, reason: "Authorized Executive Role" };
  }

  if (normalizedRoute.startsWith("/warehouse")) {
    if (canonical === "warehouse_manager") {
      return { allowed: true, redirectRoute: normalizedRoute, reason: "Authorized Warehouse Manager" };
    }
    return {
      allowed: false,
      redirectRoute: canonical === "site_store_owner" ? "/site-store/dashboard" : "/dashboard",
      reason: "Access Denied: /warehouse/* routes require Warehouse Manager authorization. Site Store Owners cannot access central warehouse modules."
    };
  }

  if (normalizedRoute.startsWith("/site-store")) {
    if (canonical === "site_store_owner") {
      return { allowed: true, redirectRoute: normalizedRoute, reason: "Authorized Site Store Owner" };
    }
    return {
      allowed: false,
      redirectRoute: canonical === "warehouse_manager" ? "/warehouse/dashboard" : "/dashboard",
      reason: "Access Denied: /site-store/* routes require Site Store Owner authorization. Warehouse Managers cannot access private site store operational modules."
    };
  }

  return { allowed: true, redirectRoute: normalizedRoute, reason: "Authorized" };
}

export function canAccessSiteScope(
  role: UserRole | string | undefined | null,
  assignedSite: string,
  targetSite: string
): boolean {
  const canonical = resolveCanonicalRole(role);
  if (canonical === "admin" || canonical === "head_office") return true;
  if (canonical === "site_store_owner") {
    if (!assignedSite || !targetSite) return true;
    const a = assignedSite.toLowerCase();
    const t = targetSite.toLowerCase();
    return a === t || a.includes(t) || t.includes(a);
  }
  return false;
}

// ============================================================================
// EXTENDED 9-ROLE ENTERPRISE WAREHOUSE & SITE STORE RBAC MATRIX
// ============================================================================

export type ExtendedWarehouseRole =
  | "super_admin"
  | "finance_manager"
  | "warehouse_manager"
  | "office_manager_engineer"
  | "operation_manager"
  | "director"
  | "project_head"
  | "material_handling"
  | "site_store_owner"
  | "gate_security_officer"
  | "unauthorized";

export type WarehouseModuleAction =
  | "VIEW_DASHBOARD"
  | "VIEW_INVENTORY"
  | "MANAGE_MASTER_DATA"
  | "CREATE_REVISE_MATERIAL_PLAN"
  | "CREATE_MATERIAL_REQUEST"
  | "VERIFY_RETURN_MATERIAL_REQUEST"
  | "DIRECTOR_APPROVE_DISAPPROVE_REQUEST"
  | "CREATE_FINALIZE_GRV"
  | "UPLOAD_COMMERCIAL_INVOICE"
  | "REPLACE_COMMERCIAL_INVOICE"
  | "PREPARE_CONFIRM_DISPATCH_GIV"
  | "CONFIRM_CONSUMABLE_RECEIPT"
  | "MANAGE_FIXED_ASSETS_BIG_BALANCE"
  | "CREATE_FATOV"
  | "CONFIRM_FATIV"
  | "MANAGE_TRANSPORT"
  | "GENERATE_GATE_PASS"
  | "VERIFY_GATE_PASS_EXIT_ENTRY"
  | "SUBMIT_TWO_WAY_RETURN"
  | "CONFIRM_RETURN_RECEIPT"
  | "RELEASE_QUARANTINE"
  | "CONFIGURE_VALUATION_METHOD"
  | "EXPORT_REPORTS"
  | "VIEW_AUDIT_LOGS";

export type WarehouseSectionKey =
  | "dashboard"
  | "warehouse_inventory"
  | "site_stores"
  | "material_planning"
  | "material_requests"
  | "director_approvals"
  | "grv"
  | "commercial_invoices"
  | "giv_dispatch"
  | "fixed_assets_big_balance"
  | "project_fixed_assets"
  | "fatov_fativ"
  | "transportation"
  | "gate_pass"
  | "returns_mrv"
  | "quarantine_stock"
  | "stock_ledger"
  | "reports"
  | "notifications"
  | "audit_logs"
  | "settings";

export function resolveExtendedWarehouseRole(
  role?: UserRole | string | null
): ExtendedWarehouseRole {
  if (!role) return "unauthorized";
  const r = String(role).trim().toLowerCase();
  if (r === "super admin" || r === "admin" || r === "super_admin") return "super_admin";
  if (r === "finance manager" || r === "finance_manager") return "finance_manager";
  if (r === "warehouse manager" || r === "warehouse_manager") return "warehouse_manager";
  if (
    r === "office manager" ||
    r === "office_manager" ||
    r === "office & technical engineering" ||
    r === "office_and_technical_engineering" ||
    r === "office manager engineer" ||
    r === "office_manager_engineer"
  ) {
    return "office_manager_engineer";
  }
  if (r === "operation manager" || r === "operation_manager") return "operation_manager";
  if (r === "director" || r === "directory" || r === "head office" || r === "head_office") {
    return r === "head office" || r === "head_office" ? "director" : "director";
  }
  if (
    r === "project head" ||
    r === "project_head" ||
    r === "project manager" ||
    r === "project_manager" ||
    r === "section head" ||
    r === "section_head"
  ) {
    return "project_head";
  }
  if (
    r === "material handling" ||
    r === "material_handling" ||
    r === "driver" ||
    r === "assembler"
  ) {
    return "material_handling";
  }
  if (
    r === "store owner" ||
    r === "store_owner" ||
    r === "site store owner" ||
    r === "site_store_owner" ||
    r === "store manager" ||
    r === "store_manager"
  ) {
    return "site_store_owner";
  }
  if (
    r === "gate security officer" ||
    r === "gate_security_officer" ||
    r === "security officer" ||
    r === "security_officer" ||
    r === "gate security"
  ) {
    return "gate_security_officer";
  }
  return "unauthorized";
}

export function isStrictDirectorRole(role?: UserRole | string | null): boolean {
  if (!role) return false;
  const r = String(role).trim().toLowerCase();
  return r === "director" || r === "directory" || r === "super admin" || r === "super_admin";
}

const EXTENDED_ACTION_MATRIX: Record<ExtendedWarehouseRole, ReadonlySet<WarehouseModuleAction>> = {
  super_admin: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "MANAGE_MASTER_DATA",
    "CREATE_REVISE_MATERIAL_PLAN",
    "CREATE_MATERIAL_REQUEST",
    "VERIFY_RETURN_MATERIAL_REQUEST",
    "DIRECTOR_APPROVE_DISAPPROVE_REQUEST",
    "CREATE_FINALIZE_GRV",
    "UPLOAD_COMMERCIAL_INVOICE",
    "REPLACE_COMMERCIAL_INVOICE",
    "PREPARE_CONFIRM_DISPATCH_GIV",
    "CONFIRM_CONSUMABLE_RECEIPT",
    "MANAGE_FIXED_ASSETS_BIG_BALANCE",
    "CREATE_FATOV",
    "CONFIRM_FATIV",
    "MANAGE_TRANSPORT",
    "GENERATE_GATE_PASS",
    "VERIFY_GATE_PASS_EXIT_ENTRY",
    "SUBMIT_TWO_WAY_RETURN",
    "CONFIRM_RETURN_RECEIPT",
    "RELEASE_QUARANTINE",
    "CONFIGURE_VALUATION_METHOD",
    "EXPORT_REPORTS",
    "VIEW_AUDIT_LOGS"
  ]),
  // Finance Manager: read-only access to warehouse data, transactions, valuation, invoices, reports, audit logs + configure FIFO/Weighted Avg valuation; CANNOT approve requests, modify plans, or alter finalized vouchers.
  finance_manager: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "CONFIGURE_VALUATION_METHOD",
    "EXPORT_REPORTS",
    "VIEW_AUDIT_LOGS"
  ]),
  // Warehouse Manager: warehouse inventory, verify/return requests against plans, dispatch (only after Director approval), GRV, invoices, BIG BALANCE, FATOV/FATIV, transport, gate pass generation, return confirmation, quarantine, reports.
  warehouse_manager: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "MANAGE_MASTER_DATA",
    "VERIFY_RETURN_MATERIAL_REQUEST",
    "CREATE_FINALIZE_GRV",
    "UPLOAD_COMMERCIAL_INVOICE",
    "REPLACE_COMMERCIAL_INVOICE",
    "PREPARE_CONFIRM_DISPATCH_GIV",
    "MANAGE_FIXED_ASSETS_BIG_BALANCE",
    "CREATE_FATOV",
    "CONFIRM_FATIV",
    "MANAGE_TRANSPORT",
    "GENERATE_GATE_PASS",
    "SUBMIT_TWO_WAY_RETURN",
    "CONFIRM_RETURN_RECEIPT",
    "RELEASE_QUARANTINE",
    "EXPORT_REPORTS",
    "VIEW_AUDIT_LOGS"
  ]),
  // Office Manager Engineer: material planning, plan revisions, plan vs request tracking, reports.
  office_manager_engineer: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "CREATE_REVISE_MATERIAL_PLAN",
    "EXPORT_REPORTS"
  ]),
  // Operation Manager: cross-project operational monitoring, transportation oversight, reports, audit logs.
  operation_manager: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "MANAGE_TRANSPORT",
    "EXPORT_REPORTS",
    "VIEW_AUDIT_LOGS"
  ]),
  // Director: view everything + ONLY role (with Super Admin) authorized to perform final Director Approve / Disapprove.
  director: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "DIRECTOR_APPROVE_DISAPPROVE_REQUEST",
    "EXPORT_REPORTS",
    "VIEW_AUDIT_LOGS"
  ]),
  // Project Head: assigned-project operational visibility, oversight of project store/requests/fixed assets, reports.
  project_head: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "EXPORT_REPORTS"
  ]),
  // Material Handling: transport assignment, loading/delivery status updates & receiving handoffs (cannot edit item quantities/costs or approve vouchers).
  material_handling: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "MANAGE_TRANSPORT"
  ]),
  // Site Store Owner: assigned project site store inventory, create requests against plan, confirm actual received qtys (GIV & FATIV), issue two-way returns, project reports.
  site_store_owner: new Set<WarehouseModuleAction>([
    "VIEW_DASHBOARD",
    "VIEW_INVENTORY",
    "CREATE_MATERIAL_REQUEST",
    "CONFIRM_CONSUMABLE_RECEIPT",
    "CREATE_FATOV",
    "CONFIRM_FATIV",
    "SUBMIT_TWO_WAY_RETURN",
    "GENERATE_GATE_PASS",
    "EXPORT_REPORTS"
  ]),
  // Gate Security Officer: Gate Pass QR verification & confirm physical exit/entry ONLY.
  gate_security_officer: new Set<WarehouseModuleAction>([
    "VERIFY_GATE_PASS_EXIT_ENTRY"
  ]),
  unauthorized: new Set<WarehouseModuleAction>([])
};

export function canPerformWarehouseModuleAction(
  role: UserRole | string | undefined | null,
  action: WarehouseModuleAction
): boolean {
  const resolved = resolveExtendedWarehouseRole(role);
  if (action === "DIRECTOR_APPROVE_DISAPPROVE_REQUEST") {
    return isStrictDirectorRole(role);
  }
  return EXTENDED_ACTION_MATRIX[resolved]?.has(action) ?? false;
}

export function getAuthorizedSectionsForRole(
  role: UserRole | string | undefined | null
): WarehouseSectionKey[] {
  const r = resolveExtendedWarehouseRole(role);
  switch (r) {
    case "super_admin":
    case "warehouse_manager":
      return [
        "dashboard",
        "warehouse_inventory",
        "site_stores",
        "material_planning",
        "material_requests",
        ...(r === "super_admin" ? (["director_approvals"] as WarehouseSectionKey[]) : []),
        "grv",
        "commercial_invoices",
        "giv_dispatch",
        "fixed_assets_big_balance",
        "project_fixed_assets",
        "fatov_fativ",
        "transportation",
        "gate_pass",
        "returns_mrv",
        "quarantine_stock",
        "stock_ledger",
        "reports",
        "notifications",
        "audit_logs",
        "settings"
      ];
    case "director":
      return [
        "dashboard",
        "director_approvals",
        "material_requests",
        "material_planning",
        "warehouse_inventory",
        "site_stores",
        "grv",
        "commercial_invoices",
        "giv_dispatch",
        "fixed_assets_big_balance",
        "project_fixed_assets",
        "fatov_fativ",
        "transportation",
        "gate_pass",
        "returns_mrv",
        "quarantine_stock",
        "stock_ledger",
        "reports",
        "notifications",
        "audit_logs"
      ];
    case "finance_manager":
      return [
        "dashboard",
        "warehouse_inventory",
        "site_stores",
        "grv",
        "commercial_invoices",
        "giv_dispatch",
        "fixed_assets_big_balance",
        "project_fixed_assets",
        "returns_mrv",
        "quarantine_stock",
        "stock_ledger",
        "reports",
        "notifications",
        "audit_logs",
        "settings"
      ];
    case "office_manager_engineer":
      return [
        "dashboard",
        "material_planning",
        "material_requests",
        "warehouse_inventory",
        "project_fixed_assets",
        "reports",
        "notifications"
      ];
    case "operation_manager":
      return [
        "dashboard",
        "warehouse_inventory",
        "site_stores",
        "material_requests",
        "giv_dispatch",
        "fixed_assets_big_balance",
        "project_fixed_assets",
        "fatov_fativ",
        "transportation",
        "gate_pass",
        "returns_mrv",
        "quarantine_stock",
        "stock_ledger",
        "reports",
        "notifications",
        "audit_logs"
      ];
    case "project_head":
      return [
        "dashboard",
        "site_stores",
        "material_planning",
        "material_requests",
        "giv_dispatch",
        "project_fixed_assets",
        "fatov_fativ",
        "transportation",
        "returns_mrv",
        "reports",
        "notifications"
      ];
    case "site_store_owner":
      return [
        "dashboard",
        "site_stores",
        "material_planning",
        "material_requests",
        "giv_dispatch",
        "project_fixed_assets",
        "fatov_fativ",
        "transportation",
        "gate_pass",
        "returns_mrv",
        "quarantine_stock",
        "stock_ledger",
        "reports",
        "notifications"
      ];
    case "material_handling":
      return [
        "dashboard",
        "transportation",
        "gate_pass",
        "giv_dispatch",
        "fatov_fativ",
        "returns_mrv",
        "notifications"
      ];
    case "gate_security_officer":
      return ["gate_pass", "transportation", "notifications"];
    default:
      return [];
  }
}

export function canUserAccessProjectRecord(
  role: UserRole | string | undefined | null,
  assignedProject: string | undefined,
  assignedSite: string | undefined,
  targetProjectIdOrName: string | undefined,
  targetLocationId?: string | undefined
): boolean {
  const r = resolveExtendedWarehouseRole(role);
  if (
    r === "super_admin" ||
    r === "director" ||
    r === "finance_manager" ||
    r === "operation_manager" ||
    r === "office_manager_engineer" ||
    r === "warehouse_manager" ||
    r === "gate_security_officer" ||
    r === "material_handling"
  ) {
    return true;
  }
  if (r === "project_head" || r === "site_store_owner") {
    const scope = (assignedProject || assignedSite || "").trim().toLowerCase();
    if (!scope || !targetProjectIdOrName) return true;
    const target = targetProjectIdOrName.trim().toLowerCase();
    const loc = (targetLocationId || "").trim().toLowerCase();
    return (
      target === scope ||
      target.includes(scope) ||
      scope.includes(target) ||
      (loc !== "" && (loc === scope || loc.includes(scope)))
    );
  }
  return false;
}

