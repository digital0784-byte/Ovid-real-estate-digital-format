import { WarehouseReportType } from "../../types";
import { WarehouseSectionKey } from "../../services/warehouseStoreRbac";

export function tr(isAmharic: boolean | undefined, en: string, am: string): string {
  return isAmharic ? am : en;
}

const SECTION_LABELS_AM: Record<WarehouseSectionKey, string> = {
  dashboard: "ዳሽቦርድ (15 ቁልፍ መለኪያዎች)",
  warehouse_inventory: "መጋዘን እና የእቃዎች ካታሎግ",
  site_stores: "የፕሮጀክት ሳይት ስቶሮች",
  material_planning: "የምህንድስና እቃ ዕቅድ",
  material_requests: "የእቃ ጥያቄ እና ዕቅድ ማረጋገጫ",
  director_approvals: "የዳይሬክተር ማፅደቂያ",
  grv: "የእቃ መቀበያ ደረሰኝ (GRV)",
  commercial_invoices: "የንግድ ደረሰኞች (Invoices)",
  giv_dispatch: "እቃ መላኪያ እና መቀበያ (GIV)",
  fixed_assets_big_balance: "ቋሚ ንብረቶች (BIG BALANCE)",
  project_fixed_assets: "የፕሮጀክት ቋሚ ንብረቶች",
  fatov_fativ: "የንብረት ዝውውር (FATOV/FATIV)",
  transportation: "ትራንስፖርት መከታተያ (11)",
  gate_pass: "የበር ማለፊያ (QR Gate Pass)",
  returns_mrv: "የሁለትዮሽ ተመላሽ (MRV)",
  quarantine_stock: "የተበላሹ / ኳራንቲን እቃዎች",
  stock_ledger: "የክምችት መዝገብ (Stock Ledger)",
  reports: "ሪፖርቶች (22 Excel/PDF)",
  warehouse_fleet_formwork: "የመኪኖች፣ መጋዘን እና ፎርምወርክ ስራዎች",
  store_field_operations: "የሳይት እቃ ጥያቄ እና ቡድን ስራዎች",
  notifications: "ማስጠንቀቂያዎች",
  audit_logs: "የኦዲት መዝገብ (Audit Trail)",
  settings: "የዋጋ ግምት ቅንብሮች",
};

export function getWarehouseSectionLabel(
  key: WarehouseSectionKey,
  defaultEn: string,
  isAmharic?: boolean,
  options?: { isStoreOrSiteSide?: boolean }
): string {
  if (key === "material_requests" && options?.isStoreOrSiteSide) {
    return tr(isAmharic, "Request Items from Warehouse", "ከመጋዘን እቃ መጠየቂያ");
  }
  if (key === "giv_dispatch" && options?.isStoreOrSiteSide) {
    return tr(isAmharic, "Receive from Warehouse (GIV/FATIV)", "ከመጋዘን እቃ መቀበያ (GIV/FATIV)");
  }
  if (!isAmharic) return defaultEn;
  return SECTION_LABELS_AM[key] || defaultEn;
}

const STATUS_AM: Record<string, string> = {
  // General & workflow statuses
  active: "ንቁ (Active)",
  inactive: "የቦዘነ",
  pending: "በመጠባበቅ ላይ",
  submitted: "ተልኳል (Submitted)",
  "warehouse reviewing": "በመጋዘን ማናጀር እየታየ",
  "verified pending director": "ተረጋግጦ ዳይሬክተር ይጠብቃል",
  "director approved": "በዳይሬክተር ጸድቋል",
  "director disapproved": "በዳይሬክተር ተከልክሏል",
  "returned by warehouse manager": "በመጋዘን ማናጀር ተመልሷል",
  "partially dispatched": "በከፊል ተልኳል",
  "fully dispatched": "ሙሉ በሙሉ ተልኳል",
  dispatched: "ተልኳል (In Transit)",
  "received confirmed": "መድረሱ ተረጋግጧል",
  "confirmed receipt": "መቀበሉ ተረጋግጧል",
  "received with discrepancy": "በልዩነት ተቀብሏል",
  approved: "ጸድቋል",
  rejected: "ተከልክሏል",
  issued: "ወጪ ሆኗል",
  finalized: "ተጠናቋል (Finalized)",
  completed: "ተጠናቋል",
  matched: "ተዛምዷል (Matched)",
  mismatch: "ልዩነት አለው",
  "plan mismatch": "ከዕቅድ ጋር ልዩነት አለው",
  good: "ጥሩ (Good)",
  damaged: "የተጎዳ (Damaged)",
  defective: "ጉድለት ያለበት",
  "under inspection": "በምርመራ ላይ",
  "not reusable": "ዳግም የማይጠቅም",
  quarantined: "ኳራንቲን (Quarantined)",
  "in warehouse": "በመጋዘን ውስጥ",
  "in transit": "በመንገድ ላይ",
  assigned: "ለፕሮጀክት ተመድቧል",
  consumable: "አላቂ እቃ (Consumable)",
  "fixed asset": "ቋሚ ንብረት (Fixed Asset)",
  "exit verified": "መውጫ ተረጋግጧል",
  "entry verified": "መግቢያ ተረጋግጧል",
  "tamper blocked": "ማጭበርበር ታግዷል",
  "pending exit": "መውጫ ይጠብቃል",
  in: "ገቢ (IN)",
  out: "ወጪ (OUT)",
  info: "መረጃ",
  warning: "ማስጠንቀቂያ",
  critical: "አስቸኳይ",
  high: "ከፍተኛ",
};

export function translateWarehouseStatus(status: string, isAmharic?: boolean): string {
  if (!isAmharic || !status) return status;
  const key = status.trim().toLowerCase();
  return STATUS_AM[key] || status;
}

const REPORT_TITLE_AM: Record<WarehouseReportType, string> = {
  WAREHOUSE_STOCK_BALANCE: "የመጋዘን ክምችት ሚዛን ሪፖርት",
  PROJECT_SITE_STORE_BALANCE: "የፕሮጀክት ሳይት ስቶር ክምችት ሪፖርት",
  STOCK_MOVEMENT_LEDGER: "የክምችት እንቅስቃሴ መዝገብ (Stock Ledger)",
  GRV_REGISTER: "የGRV እቃ መቀበያ መዝገብ",
  COMMERCIAL_INVOICE_REGISTER: "የንግድ ደረሰኞች መዝገብ",
  MATERIAL_PLAN_VS_REQUEST_VS_ISSUED: "የምህንድስና ዕቅድ፣ ጥያቄ እና የተላከ ንጽጽር",
  PENDING_DIRECTOR_APPROVALS: "በዳይሬክተር ውሳኔ በመጠባበቅ ላይ ያሉ ጥያቄዎች",
  GIV_DISPATCH_REGISTER: "የGIV እቃ መላኪያ መዝገብ",
  PARTIAL_DISPATCH_BALANCE: "በከፊል የተላኩ እና ቀሪ እቃዎች",
  FIXED_ASSETS_BIG_BALANCE: "ዋና ቋሚ ንብረቶች (BIG BALANCE)",
  PROJECT_FIXED_ASSET_REGISTER: "የፕሮጀክት ቋሚ ንብረቶች መዝገብ",
  FATOV_FATIV_ASSET_TRANSFER: "የቋሚ ንብረት ዝውውር (FATOV/FATIV)",
  ASSET_LOCATION_HISTORY: "የንብረት ቦታ እና ዝውውር ታሪክ",
  TRANSPORTATION_TRACKING: "የትራንስፖርት እና መላኪያ ክትትል",
  GATE_PASS_SECURITY_LOG: "የበር ማለፊያ ደህንነት መዝገብ",
  TWO_WAY_RETURN_MRV: "የሁለትዮሽ ተመላሽ (MRV)",
  DAMAGED_DEFECTIVE_QUARANTINE: "የተበላሹ እና ኳራንቲን እቃዎች",
  LOW_STOCK_REORDER: "ዝቅተኛ ክምችት እና ዳግም ማዘዣ",
  INVENTORY_VALUATION: "የክምችት ዋጋ ግምት (FIFO / WMA)",
  FAST_SLOW_MOVING: "ፈጣን እና ዘገምተኛ እንቅስቃሴ እቃዎች",
  DISCREPANCY_SHORTAGE: "የእቃ ጉድለት እና ልዩነት ሪፖርት",
  AUDIT_TRAIL_APPROVAL_HISTORY: "የኦዲት እና የማፅደቅ ታሪክ መዝገብ",
};

export function getReportTitle(id: WarehouseReportType, defaultTitle: string, isAmharic?: boolean): string {
  if (!isAmharic) return defaultTitle;
  return REPORT_TITLE_AM[id] || defaultTitle;
}
