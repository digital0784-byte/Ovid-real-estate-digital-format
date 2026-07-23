import { CustomMasterEntry, CustomInputCategory, CustomInputAuditItem, UserRole } from "../types";

const STORAGE_KEY_ENTRIES = "buildsync_custom_master_entries";
const STORAGE_KEY_FAVORITES = "buildsync_custom_favorites";
const STORAGE_KEY_RECENTS = "buildsync_custom_recents";
const STORAGE_KEY_AUDIT = "buildsync_custom_audit_logs";

// Predefined master dictionary seeds for all 17 Categories
const DEFAULT_MASTER_ENTRIES: CustomMasterEntry[] = [
  // Material Name
  { id: "MAT-01", category: "Material Name", value: "C30 Pre-mix Structural Concrete", labelAm: "C30 ሬዲሚክስ ኮንክሪት", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 142, isFavorite: true },
  { id: "MAT-02", category: "Material Name", value: "High-Tensile Deformed Rebar 16mm", labelAm: "ባለ 16 ሚሜ የብረት ዘንግ (ባለ ቅርጽ)", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 98, isFavorite: true },
  { id: "MAT-03", category: "Material Name", value: "6061-T6 Aluminum Formwork Panels", labelAm: "6061-T6 የአሉሚኒየም ፎርምወርክ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 210, isFavorite: false },
  { id: "MAT-04", category: "Material Name", value: "Portland Pozzolana Cement (PPC 42.5N)", labelAm: "ፖርትላንድ ፖዞላና ሲሚንቶ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 75, isFavorite: false },

  // Material Type
  { id: "MTYP-01", category: "Material Type", value: "Structural Reinforcement Steel", labelAm: "የመዋቅር ብረት", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 88, isFavorite: true },
  { id: "MTYP-02", category: "Material Type", value: "Modular Aluminum Shoring & Formwork", labelAm: "ሞዱላር የአሉሚኒየም ፎርምወርክ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 154, isFavorite: true },
  { id: "MTYP-03", category: "Material Type", value: "Aggregates & Masonry Sand", labelAm: "የኮንክሪት አሸዋና አሸዋማ ድንጋይ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 62, isFavorite: false },

  // Material Dimension
  { id: "MDIM-01", category: "Material Dimension", value: "1200mm x 600mm x 65mm Standard Wall Panel", labelAm: "1200x600x65 ሚሜ ስታንዳርድ የግድግዳ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 180, isFavorite: true },
  { id: "MDIM-02", category: "Material Dimension", value: "2400mm x 450mm Column Panel", labelAm: "2400x450 ሚሜ የዓምድ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 92, isFavorite: false },
  { id: "MDIM-03", category: "Material Dimension", value: "Ø16mm Length 12 meters", labelAm: "ዲያሜትር 16ሚሜ ርዝመት 12 ሜትር", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 110, isFavorite: false },

  // Supplier Name
  { id: "SUP-01", category: "Supplier Name", value: "Mugher Cement Factory PLC", labelAm: "ሙገር ሲሚንቶ ፋብሪካ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 120, isFavorite: true },
  { id: "SUP-02", category: "Supplier Name", value: "Lianxin Formwork & Metal Products Ltd", labelAm: "ሊያንክሲን ፎርምወርክ ኢንደስትሪ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 145, isFavorite: true },
  { id: "SUP-03", category: "Supplier Name", value: "Ethio Steel Mills Share Company", labelAm: "ኢትዮ ስቲል ሚልስ አ.ማ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 90, isFavorite: false },

  // Manufacturer
  { id: "MFG-01", category: "Manufacturer", value: "Sany Heavy Industry Co.", labelAm: "ሳኒ ሄቪ ኢንደስትሪ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 75, isFavorite: true },
  { id: "MFG-02", category: "Manufacturer", value: "Potain Tower Cranes France", labelAm: "ፖታይን ታወር ክሬን", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 60, isFavorite: false },

  // Building Name
  { id: "BLD-01", category: "Building Name", value: "Tower Block A (Residential)", labelAm: "ታወር ህንጻ ኤ (መኖሪያ)", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 220, isFavorite: true },
  { id: "BLD-02", category: "Building Name", value: "Commercial Podium Plaza B", labelAm: "ንግድ ፕላዛ ህንጻ ቢ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 180, isFavorite: true },

  // Block Name
  { id: "BLK-01", category: "Block Name", value: "Block-01 East Core", labelAm: "ብሎክ-01 ምሥራቅ ኮር", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 140, isFavorite: true },
  { id: "BLK-02", category: "Block Name", value: "Block-02 West Wing", labelAm: "ብሎክ-02 ምዕራብ ዊንግ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 110, isFavorite: false },

  // Floor Name
  { id: "FLR-01", category: "Floor Name", value: "Ground Floor (+0.00m)", labelAm: "ምድር ቤት floor", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 310, isFavorite: true },
  { id: "FLR-02", category: "Floor Name", value: "1st Typ. Suspended Slab (+3.60m)", labelAm: "1ኛ ፎቅ ስላብ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 280, isFavorite: true },
  { id: "FLR-03", category: "Floor Name", value: "2nd Typ. Suspended Slab (+7.20m)", labelAm: "2ኛ ፎቅ ስላብ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 250, isFavorite: false },

  // Zone Name
  { id: "ZON-01", category: "Zone Name", value: "Zone 1 - Lift Shaft & Core Wall", labelAm: "ዞን 1 - የሊፍት ሻፍትና ኮር ግድግዳ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 195, isFavorite: true },
  { id: "ZON-02", category: "Zone Name", value: "Zone 2 - North Perimeter Beams", labelAm: "ዞን 2 - ሰሜን ቢሞች", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 160, isFavorite: false },

  // Defect Type
  { id: "DEF-01", category: "Defect Type", value: "Honeycombing Concrete Surface", labelAm: "የኮንክሪት ክፍተት (ሃኒኮምቢንግ)", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 45, isFavorite: true },
  { id: "DEF-02", category: "Defect Type", value: "Panel Alignment Offset > 3mm", labelAm: "የፓነል አለመጋጠም ስህተት", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 38, isFavorite: true },
  { id: "DEF-03", category: "Defect Type", value: "Pin & Wedge Corrosion / Bent Pin", labelAm: "የፒንና ዌጅ መታጠፍ ወይም ዝገት", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 29, isFavorite: false },

  // Hazard Type
  { id: "HAZ-01", category: "Hazard Type", value: "Unprotected Slab Edge Fall Risk", labelAm: "ያልተከለለ የፎቅ ጠርዝ ውድቀት አደጋ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 52, isFavorite: true },
  { id: "HAZ-02", category: "Hazard Type", value: "Overhead Crane Suspended Load Hazard", labelAm: "የክሬን ተንጠልጣይ እቃ አደጋ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 40, isFavorite: true },

  // Equipment Name
  { id: "EQP-01", category: "Equipment Name", value: "Potain Tower Crane MC235 (10-Ton)", labelAm: "ፖታይን ታወር ክሬን", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 88, isFavorite: true },
  { id: "EQP-02", category: "Equipment Name", value: "Putzmeister Mobile Concrete Pump 36m", labelAm: "ፑትዝማይስተር ኮንክሪት ፓምፕ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 72, isFavorite: false },

  // Vehicle Name
  { id: "VEH-01", category: "Vehicle Name", value: "Sino Truck Howo Dump Truck 16m³", labelAm: "ሲኖ ትራክ ዳምፕ ትራክ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 95, isFavorite: true },
  { id: "VEH-02", category: "Vehicle Name", value: "Toyota Hilux Executive Site Pickup 4x4", labelAm: "ቶዮታ ሃይለክስ ፒክአፕ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 110, isFavorite: false },

  // Customer Name
  { id: "CUST-01", category: "Customer Name", value: "Federal Housing Corporation (FHC)", labelAm: "ፌደራል ቤቶች ኮርፖሬሽን", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 130, isFavorite: true },
  { id: "CUST-02", category: "Customer Name", value: "Addis Real Estate Ltd", labelAm: "አዲስ ሪል እስቴት ኃ/የተ/የግ/ማ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 95, isFavorite: false },

  // Contractor Name
  { id: "CON-01", category: "Contractor Name", value: "BuildSync Main Construction Enterprise", labelAm: "ቢልድሲንክ ዋና ኮንስትራክሽን", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 300, isFavorite: true },
  { id: "CON-02", category: "Contractor Name", value: "Tekle Structural Subcontracting Firm", labelAm: "ተክለ መዋቅር ንዑስ ተራዳኢ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 85, isFavorite: false },

  // Remarks
  { id: "RMK-01", category: "Remarks", value: "Inspection Verified - Conforms to Technical Specs", labelAm: "ፍተሻ ተረጋግጧል - የቴክኒክ መስፈርት ያሟላል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 210, isFavorite: true },
  { id: "RMK-02", category: "Remarks", value: "Pending Quality Snag Rectification", labelAm: "የጥራት እርማት በመጠበቅ ላይ", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 65, isFavorite: false },

  // Comments
  { id: "CMT-01", category: "Comments", value: "Urgent material dispatch required before morning pour.", labelAm: "አስቸኳይ ቁሳቁስ ከጠዋቱ መፍሰስ በፊት መላክ አለበት።", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 42, isFavorite: true },

  // Panel Status
  { id: "PST-01", category: "Panel Status", value: "New Panel", labelAm: "አዲስ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 220, isFavorite: true },
  { id: "PST-02", category: "Panel Status", value: "Aged / Old Panel", labelAm: "አሮጌ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 180, isFavorite: true },
  { id: "PST-03", category: "Panel Status", value: "Cleaned", labelAm: "የፀዳ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 310, isFavorite: true },
  { id: "PST-04", category: "Panel Status", value: "Waiting Cleaning", labelAm: "ያልተፀዳ (ጽዳት የሚፈልግ)", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 140, isFavorite: false },
  { id: "PST-05", category: "Panel Status", value: "Damaged", labelAm: "የተበላሸ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 95, isFavorite: true },
  { id: "PST-06", category: "Panel Status", value: "Repaired", labelAm: "የተጠገነ ፓነል", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 110, isFavorite: true },
  { id: "PST-07", category: "Panel Status", value: "Installed / In Use", labelAm: "በስራ ላይ ያለ (የተገጠመ)", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 420, isFavorite: true },
  { id: "PST-08", category: "Panel Status", value: "Active", labelAm: "ንቁ (ዝግጁ)", isPredefined: true, status: "Approved", createdBy: "System", createdByRole: "System Admin", createdDate: "2026-01-01", usageCount: 250, isFavorite: false },

  // Pending approval user entries (for initial testing demo)
  { id: "CUST-PENDING-01", category: "Material Name", value: "Nano-Polymer Anti-Stick Concrete Release Oil", labelAm: "ናኖ-ፖሊመር አክቲቭ ዘይት", isPredefined: false, status: "Pending", createdBy: "Abebe Worku (Site Eng)", createdByRole: "Site Engineer", createdDate: "2026-07-22", usageCount: 0, isFavorite: false }
];

export class CustomInputService {

  // Load all master entries from storage or fallback to defaults
  public static getEntries(): CustomMasterEntry[] {
    if (typeof window === "undefined") return DEFAULT_MASTER_ENTRIES;
    const stored = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(DEFAULT_MASTER_ENTRIES));
      return DEFAULT_MASTER_ENTRIES;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_MASTER_ENTRIES;
    }
  }

  // Save entries to localStorage
  private static saveEntries(entries: CustomMasterEntry[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
  }

  // Get approved entries for a specific category
  public static getApprovedOptionsForCategory(category: CustomInputCategory): CustomMasterEntry[] {
    const all = this.getEntries();
    return all.filter(e => e.category === category && e.status === "Approved");
  }

  // Get all entries for a specific category (including pending if caller wants)
  public static getAllForCategory(category: CustomInputCategory): CustomMasterEntry[] {
    const all = this.getEntries();
    return all.filter(e => e.category === category);
  }

  // Favorites tracking
  public static getFavoriteIds(): string[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public static toggleFavorite(entryId: string, userName: string, role: string): boolean {
    const favs = this.getFavoriteIds();
    const isFav = favs.includes(entryId);
    let newFavs: string[];
    if (isFav) {
      newFavs = favs.filter(id => id !== entryId);
    } else {
      newFavs = [...favs, entryId];
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(newFavs));
    }

    // Update in memory master entry
    const entries = this.getEntries();
    const target = entries.find(e => e.id === entryId);
    if (target) {
      target.isFavorite = !isFav;
      this.saveEntries(entries);

      this.addAuditLog({
        userId: userName.toLowerCase().replace(/\s+/g, "_"),
        userName,
        role,
        category: target.category,
        action: "FavoriteToggled",
        entryValue: target.value,
        details: `${isFav ? "Removed from" : "Added to"} favorites`
      });
    }

    return !isFav;
  }

  // Recently Used Tracking per category
  public static getRecentValues(category: CustomInputCategory): string[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(`${STORAGE_KEY_RECENTS}_${category}`);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public static recordRecentUsage(category: CustomInputCategory, value: string): void {
    if (!value || typeof window === "undefined") return;
    const recents = this.getRecentValues(category);
    const filtered = recents.filter(v => v !== value);
    const updated = [value, ...filtered].slice(0, 5); // keep top 5
    localStorage.setItem(`${STORAGE_KEY_RECENTS}_${category}`, JSON.stringify(updated));

    // Increment usage count in master database
    const entries = this.getEntries();
    const item = entries.find(e => e.category === category && e.value.toLowerCase() === value.toLowerCase());
    if (item) {
      item.usageCount = (item.usageCount || 0) + 1;
      this.saveEntries(entries);
    }
  }

  // Category classifications
  public static MATERIAL_CATEGORIES: CustomInputCategory[] = [
    "Material Name",
    "Material Type",
    "Material Dimension",
    "Supplier Name",
    "Manufacturer"
  ];

  public static PROJECT_CATEGORIES: CustomInputCategory[] = [
    "Building Name",
    "Block Name",
    "Floor Name",
    "Zone Name",
    "Panel Status",
    "Defect Type",
    "Hazard Type",
    "Equipment Name",
    "Vehicle Name",
    "Customer Name",
    "Contractor Name",
    "Remarks",
    "Comments"
  ];

  // Permission Check Matrix
  public static checkPermissions(role: UserRole | string, category?: CustomInputCategory): {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    authorizedScope: string;
  } {
    const r = String(role);
    const isSuperAdmin = r === UserRole.SUPER_ADMIN || r === "Admin" || r === "SUPER_ADMIN";
    const isHeadOffice = r === UserRole.HEAD_OFFICE;
    const isProjectManager = r === UserRole.PROJECT_MANAGER;
    const isFinanceManager = r === UserRole.FINANCE_MANAGER;
    const isWarehouseManager = r === UserRole.WAREHOUSE_MANAGER || r === UserRole.STORE_OWNER;

    let canApprove = false;
    let authorizedScope = "Submit Only";

    if (isSuperAdmin || isHeadOffice) {
      canApprove = true;
      authorizedScope = "All Fields (Global Admin)";
    } else if (isWarehouseManager) {
      if (!category || this.MATERIAL_CATEGORIES.includes(category)) {
        canApprove = true;
        authorizedScope = "Material & Inventory Fields Only";
      } else {
        canApprove = false;
        authorizedScope = "Restricted (Material Fields Only)";
      }
    } else if (isProjectManager) {
      if (!category || this.PROJECT_CATEGORIES.includes(category)) {
        canApprove = true;
        authorizedScope = "Project & Site Fields Only";
      } else {
        canApprove = false;
        authorizedScope = "Restricted (Project Fields Only)";
      }
    } else if (isFinanceManager) {
      canApprove = true;
      authorizedScope = "Finance & Commercial Fields";
    }

    return {
      canAdd: true, // Store Owner, Warehouse Manager, Site Eng, PM, Supervisor, etc. can submit
      canEdit: isSuperAdmin || isHeadOffice || isProjectManager || isFinanceManager || isWarehouseManager,
      canDelete: isSuperAdmin || isHeadOffice,
      canApprove,
      authorizedScope
    };
  }

  // Submit new custom value (with duplicate prevention and rich metadata)
  public static submitCustomValue(params: {
    category: CustomInputCategory;
    value: string;
    labelAm?: string;
    description?: string;
    reason?: string;
    project?: string;
    site?: string;
    userName: string;
    userRole: UserRole | string;
    autoApprove?: boolean;
  }): { entry: CustomMasterEntry; requiresApproval: boolean; isDuplicate?: boolean } {
    const entries = this.getEntries();
    const cleanValue = params.value.trim();

    // Prevent Duplicate Values
    const existing = entries.find(
      e => e.category === params.category && e.value.trim().toLowerCase() === cleanValue.toLowerCase()
    );

    if (existing) {
      if (existing.status === "Approved") {
        this.recordRecentUsage(params.category, existing.value);
        return { entry: existing, requiresApproval: false, isDuplicate: true };
      }
      return { entry: existing, requiresApproval: existing.status === "Pending", isDuplicate: true };
    }

    // Role check for approval
    const permissions = this.checkPermissions(params.userRole, params.category);
    const canAutoApproveDirectly = Boolean(params.autoApprove) || permissions.canApprove;
    const newStatus: "Approved" | "Pending" = canAutoApproveDirectly ? "Approved" : "Pending";

    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newEntry: CustomMasterEntry = {
      id: `CUST-${Date.now()}`,
      category: params.category,
      value: cleanValue,
      labelAm: params.labelAm?.trim() || cleanValue,
      description: params.description?.trim() || "User defined custom input value",
      reason: params.reason?.trim() || "Required for site operational reporting",
      project: params.project || "Addis Ababa Tower Block A",
      site: params.site || "Core Tower Building Area",
      createdTime: currentTime,
      isPredefined: false,
      status: newStatus,
      createdBy: params.userName,
      createdByRole: String(params.userRole),
      createdDate: currentDate,
      approvedBy: canAutoApproveDirectly ? params.userName : undefined,
      approvedByRole: canAutoApproveDirectly ? String(params.userRole) : undefined,
      approvedDate: canAutoApproveDirectly ? currentDate : undefined,
      approvedTime: canAutoApproveDirectly ? currentTime : undefined,
      usageCount: 1,
      isFavorite: false
    };

    entries.unshift(newEntry);
    this.saveEntries(entries);
    this.recordRecentUsage(params.category, newEntry.value);

    // Audit log
    this.addAuditLog({
      userId: params.userName.toLowerCase().replace(/\s+/g, "_"),
      userName: params.userName,
      requestedBy: params.userName,
      approvedBy: canAutoApproveDirectly ? params.userName : undefined,
      approvedByRole: canAutoApproveDirectly ? String(params.userRole) : undefined,
      role: String(params.userRole),
      category: params.category,
      action: "Created",
      entryValue: newEntry.value,
      newValue: newEntry.value,
      approvalStatus: newStatus,
      date: currentDate,
      time: currentTime,
      details: `Submitted new custom entry under "${params.category}". Project: ${newEntry.project}, Reason: ${newEntry.reason} (Status: ${newStatus})`
    });

    return { entry: newEntry, requiresApproval: newStatus === "Pending", isDuplicate: false };
  }

  // Admin / Authorized Approval Action
  public static approveEntry(entryId: string, adminName: string, adminRole: string): CustomMasterEntry | null {
    const entries = this.getEntries();
    const target = entries.find(e => e.id === entryId);
    if (!target) return null;

    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    target.status = "Approved";
    target.approvedBy = adminName;
    target.approvedByRole = adminRole;
    target.approvedDate = currentDate;
    target.approvedTime = currentTime;
    this.saveEntries(entries);

    this.addAuditLog({
      userId: adminName.toLowerCase().replace(/\s+/g, "_"),
      userName: adminName,
      requestedBy: target.createdBy,
      approvedBy: adminName,
      approvedByRole: adminRole,
      role: adminRole,
      category: target.category,
      action: "Approved",
      entryValue: target.value,
      newValue: target.value,
      approvalStatus: "Approved",
      date: currentDate,
      time: currentTime,
      details: `Approved custom entry by ${target.createdBy} (${target.createdByRole}). New value automatically synchronized in master database.`
    });

    return target;
  }

  // Edit value before approval
  public static editAndApproveEntry(
    entryId: string,
    editedValue: string,
    editedLabelAm: string,
    approverName: string,
    approverRole: string
  ): CustomMasterEntry | null {
    const entries = this.getEntries();
    const target = entries.find(e => e.id === entryId);
    if (!target) return null;

    const previousVal = target.value;
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    target.previousValue = previousVal;
    target.value = editedValue.trim();
    target.labelAm = editedLabelAm.trim() || editedValue.trim();
    target.status = "Approved";
    target.approvedBy = approverName;
    target.approvedByRole = approverRole;
    target.approvedDate = currentDate;
    target.approvedTime = currentTime;
    this.saveEntries(entries);

    this.addAuditLog({
      userId: approverName.toLowerCase().replace(/\s+/g, "_"),
      userName: approverName,
      requestedBy: target.createdBy,
      approvedBy: approverName,
      approvedByRole: approverRole,
      role: approverRole,
      category: target.category,
      action: "Approved",
      entryValue: target.value,
      previousValue: previousVal,
      newValue: target.value,
      approvalStatus: "Approved (Edited)",
      date: currentDate,
      time: currentTime,
      details: `Edited and approved entry by ${target.createdBy}. Standardized from "${previousVal}" to "${target.value}".`
    });

    return target;
  }

  // Merge entry into existing value
  public static mergeEntry(
    entryId: string,
    targetApprovedValue: string,
    approverName: string,
    approverRole: string
  ): CustomMasterEntry | null {
    const entries = this.getEntries();
    const pendingTarget = entries.find(e => e.id === entryId);
    if (!pendingTarget) return null;

    const masterTarget = entries.find(
      e => e.category === pendingTarget.category && e.value.toLowerCase() === targetApprovedValue.toLowerCase()
    );

    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const previousVal = pendingTarget.value;
    pendingTarget.status = "Approved";
    pendingTarget.mergedIntoValue = targetApprovedValue;
    pendingTarget.previousValue = previousVal;
    pendingTarget.value = targetApprovedValue; // standardized to existing
    pendingTarget.approvedBy = approverName;
    pendingTarget.approvedByRole = approverRole;
    pendingTarget.approvedDate = currentDate;
    pendingTarget.approvedTime = currentTime;

    if (masterTarget) {
      masterTarget.usageCount = (masterTarget.usageCount || 0) + 1;
    }

    this.saveEntries(entries);

    this.addAuditLog({
      userId: approverName.toLowerCase().replace(/\s+/g, "_"),
      userName: approverName,
      requestedBy: pendingTarget.createdBy,
      approvedBy: approverName,
      approvedByRole: approverRole,
      role: approverRole,
      category: pendingTarget.category,
      action: "Merged",
      entryValue: targetApprovedValue,
      previousValue: previousVal,
      newValue: targetApprovedValue,
      approvalStatus: "Merged",
      date: currentDate,
      time: currentTime,
      details: `Merged custom requested value "${previousVal}" into standardized master value "${targetApprovedValue}".`
    });

    return pendingTarget;
  }

  // Admin Reject Action
  public static rejectEntry(entryId: string, adminName: string, adminRole: string, reason?: string): CustomMasterEntry | null {
    const entries = this.getEntries();
    const target = entries.find(e => e.id === entryId);
    if (!target) return null;

    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    target.status = "Rejected";
    target.approvedBy = adminName;
    target.approvedByRole = adminRole;
    target.approvedDate = currentDate;
    target.approvedTime = currentTime;
    this.saveEntries(entries);

    this.addAuditLog({
      userId: adminName.toLowerCase().replace(/\s+/g, "_"),
      userName: adminName,
      requestedBy: target.createdBy,
      approvedBy: adminName,
      approvedByRole: adminRole,
      role: adminRole,
      category: target.category,
      action: "Rejected",
      entryValue: target.value,
      newValue: target.value,
      approvalStatus: "Rejected",
      date: currentDate,
      time: currentTime,
      details: `Rejected custom entry by ${target.createdBy}. Reason: ${reason || "Does not comply with standardized naming"}`
    });

    return target;
  }

  // Edit Value
  public static updateEntry(
    entryId: string,
    newValue: string,
    newLabelAm: string,
    userName: string,
    role: string
  ): CustomMasterEntry | null {
    const entries = this.getEntries();
    const target = entries.find(e => e.id === entryId);
    if (!target) return null;

    const oldVal = target.value;
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    target.previousValue = oldVal;
    target.value = newValue;
    target.labelAm = newLabelAm;
    this.saveEntries(entries);

    this.addAuditLog({
      userId: userName.toLowerCase().replace(/\s+/g, "_"),
      userName,
      role,
      category: target.category,
      action: "Updated",
      entryValue: newValue,
      previousValue: oldVal,
      newValue: newValue,
      approvalStatus: target.status,
      date: currentDate,
      time: currentTime,
      details: `Renamed entry from "${oldVal}" to "${newValue}"`
    });

    return target;
  }

  // Delete Entry
  public static deleteEntry(entryId: string, userName: string, role: string): boolean {
    const entries = this.getEntries();
    const target = entries.find(e => e.id === entryId);
    if (!target) return false;

    const filtered = entries.filter(e => e.id !== entryId);
    this.saveEntries(filtered);

    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    this.addAuditLog({
      userId: userName.toLowerCase().replace(/\s+/g, "_"),
      userName,
      role,
      category: target.category,
      action: "Deleted",
      entryValue: target.value,
      date: currentDate,
      time: currentTime,
      details: `Deleted entry "${target.value}" from master dictionary`
    });

    return true;
  }

  // Audit Log Storage
  public static getAuditLogs(): CustomInputAuditItem[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  public static addAuditLog(params: {
    userId: string;
    userName: string;
    requestedBy?: string;
    approvedBy?: string;
    approvedByRole?: string;
    role: string;
    category: CustomInputCategory;
    action: CustomInputAuditItem["action"];
    entryValue: string;
    previousValue?: string;
    newValue?: string;
    approvalStatus?: string;
    date?: string;
    time?: string;
    details: string;
  }): void {
    const logs = this.getAuditLogs();
    const currentDate = params.date || new Date().toISOString().slice(0, 10);
    const currentTime = params.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newLog: CustomInputAuditItem = {
      id: `AUD-CUST-${Date.now()}`,
      timestamp: `${currentDate} ${currentTime}`,
      userId: params.userId,
      userName: params.userName,
      requestedBy: params.requestedBy || params.userName,
      approvedBy: params.approvedBy,
      approvedByRole: params.approvedByRole,
      role: params.role,
      category: params.category,
      action: params.action,
      entryValue: params.entryValue,
      previousValue: params.previousValue,
      newValue: params.newValue || params.entryValue,
      approvalStatus: params.approvalStatus,
      date: currentDate,
      time: currentTime,
      details: params.details
    };
    logs.unshift(newLog);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs.slice(0, 300))); // keep latest 300
    }
  }
}
