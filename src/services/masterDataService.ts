import {
  PanelMasterCatalogItem,
  MasterProjectRecord,
  MasterSiteStoreRecord,
  MasterStorageLocationRecord,
  RegisteredWarehouse,
  RegisteredSite,
  PanelCategoryType
} from "../types";
import { DbService } from "./db";

// Local storage keys for resilient persistence
const STORAGE_CATALOG = "digital_construction_panel_catalog";
const STORAGE_PROJECTS = "digital_construction_master_projects";
const STORAGE_SITE_STORES = "digital_construction_master_site_stores";
const STORAGE_LOCATIONS = "digital_construction_master_locations";
const STORAGE_RECENT_SELECTIONS = "digital_construction_recent_master_selections";

// Verified Global / International Aluminum Formwork Panel Master Catalog Seeds
// Sourced from verified industrial manufacturer standards (6061-T6 alloy extrusion, 65mm profile depth)
export const INITIAL_PANEL_CATALOG: PanelMasterCatalogItem[] = [
  // Wall Panels
  {
    id: "CAT-WP-600-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard Wall Panel",
    panelCategory: "Wall Panel",
    panelCode: "WP-600-2400",
    standardDimension: "600 × 2400 mm",
    length: 2400,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 28.5,
    description: "Standard vertical wall shuttering panel with reinforced side ribs and tie-rod holes at standard 300mm centers.",
    manufacturerRef: "MIV-WP-2460",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-WP-600-2700",
    manufacturer: "Kumkang Kind Formwork",
    panelType: "Standard Wall Panel",
    panelCategory: "Wall Panel",
    panelCode: "WP-600-2700",
    standardDimension: "600 × 2700 mm",
    length: 2700,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 32.1,
    description: "Extended floor-height wall formwork panel for commercial high-clearance residential shear walls.",
    manufacturerRef: "KK-W270-60",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-WP-600-3000",
    manufacturer: "Geto Aluminum Formwork Co.",
    panelType: "Standard Wall Panel",
    panelCategory: "Wall Panel",
    panelCode: "WP-600-3000",
    standardDimension: "600 × 3000 mm",
    length: 3000,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 35.8,
    description: "3.0-meter high-clearance wall panel for podium floors and lobby architectural perimeter walls.",
    manufacturerRef: "GETO-AL-3060",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-WP-450-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard Wall Panel",
    panelCategory: "Wall Panel",
    panelCode: "WP-450-2400",
    standardDimension: "450 × 2400 mm",
    length: 2400,
    width: 450,
    thickness: 65,
    unit: "mm",
    weightKg: 21.8,
    description: "Medium-width partition wall panel for corridor walls, window jambs, and door surround assemblies.",
    manufacturerRef: "MIV-WP-2445",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-WP-300-2400",
    manufacturer: "AlumaSystems Global",
    panelType: "Standard Wall Panel",
    panelCategory: "Wall Panel",
    panelCode: "WP-300-2400",
    standardDimension: "300 × 2400 mm",
    length: 2400,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 15.2,
    description: "Narrow wall compensation panel for tight room corners and mechanical shaft enclosures.",
    manufacturerRef: "ASG-WP-30",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-WP-HD-600-2400",
    manufacturer: "Geto Aluminum Formwork Co.",
    panelType: "Heavy-Duty Exterior Wall Panel",
    panelCategory: "Wall Panel",
    panelCode: "EWP-600-2400",
    standardDimension: "600 × 2400 mm",
    length: 2400,
    width: 600,
    thickness: 70,
    unit: "mm",
    weightKg: 31.0,
    description: "Exterior facade perimeter panel with heavy-duty kicker flange and weather seals for high wind-pressure casting.",
    manufacturerRef: "GETO-EXT-2460",
    isVerifiedStandard: true,
    isActive: true
  },

  // Slab Panels
  {
    id: "CAT-SP-900-1800",
    manufacturer: "Kumkang Kind Formwork",
    panelType: "Standard Slab Decking Panel",
    panelCategory: "Slab Panel",
    panelCode: "SP-900-1800",
    standardDimension: "900 × 1800 mm",
    length: 1800,
    width: 900,
    thickness: 65,
    unit: "mm",
    weightKg: 31.4,
    description: "Large-span horizontal slab deck panel with reinforced underside cross-ribs for deflection control.",
    manufacturerRef: "KK-SP-1890",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-SP-600-1800",
    manufacturer: "Kumkang Kind Formwork",
    panelType: "Standard Slab Decking Panel",
    panelCategory: "Slab Panel",
    panelCode: "SP-600-1800",
    standardDimension: "600 × 1800 mm",
    length: 1800,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 21.6,
    description: "Standard suspended slab formwork panel for general residential and commercial deck layouts.",
    manufacturerRef: "KK-SP-1860",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-SP-600-1200",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard Slab Decking Panel",
    panelCategory: "Slab Panel",
    panelCode: "SP-600-1200",
    standardDimension: "600 × 1200 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 14.8,
    description: "Modular slab panel for infill zones, perimeter spans, and early prop-head strip intervals.",
    manufacturerRef: "MIV-SP-1260",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-SP-450-1200",
    manufacturer: "Sforms Aluminum Tech",
    panelType: "Prop-Head Interface Slab Panel",
    panelCategory: "Slab Panel",
    panelCode: "SP-PH-450-1200",
    standardDimension: "450 × 1200 mm",
    length: 1200,
    width: 450,
    thickness: 65,
    unit: "mm",
    weightKg: 11.2,
    description: "Early-stripping slab deck panel designed with quick-release prop head interface slot.",
    manufacturerRef: "SF-SP-PH45",
    isVerifiedStandard: true,
    isActive: true
  },

  // Column Panels
  {
    id: "CAT-COL-600-2400",
    manufacturer: "Navnirman Aluminum Extrusions",
    panelType: "Standard Column Panel",
    panelCategory: "Column Panel",
    panelCode: "CP-600-2400",
    standardDimension: "600 × 2400 mm",
    length: 2400,
    width: 600,
    thickness: 75,
    unit: "mm",
    weightKg: 33.2,
    description: "High-pressure column formwork panel with integrated yoke connection slots for 80 kN/m² hydrostatic concrete pressure.",
    manufacturerRef: "NAV-COL-60",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-COL-450-2400",
    manufacturer: "Navnirman Aluminum Extrusions",
    panelType: "Standard Column Panel",
    panelCategory: "Column Panel",
    panelCode: "CP-450-2400",
    standardDimension: "450 × 2400 mm",
    length: 2400,
    width: 450,
    thickness: 75,
    unit: "mm",
    weightKg: 25.4,
    description: "Medium column face panel with reinforced tie-rod yokes for square and rectangular columns.",
    manufacturerRef: "NAV-COL-45",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-COL-400-3000",
    manufacturer: "Geto Aluminum Formwork Co.",
    panelType: "Adjustable Heavy Column Form",
    panelCategory: "Column Panel",
    panelCode: "CP-400-3000",
    standardDimension: "400 × 3000 mm",
    length: 3000,
    width: 400,
    thickness: 75,
    unit: "mm",
    weightKg: 29.8,
    description: "Adjustable column panel for variable section column forming up to 3.0m casting height.",
    manufacturerRef: "GETO-CP-3040",
    isVerifiedStandard: true,
    isActive: true
  },

  // Beam Panels
  {
    id: "CAT-BP-300-2400",
    manufacturer: "AlumaSystems Global",
    panelType: "Standard Beam Side Panel",
    panelCategory: "Beam Panel",
    panelCode: "BS-300-2400",
    standardDimension: "300 × 2400 mm",
    length: 2400,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 16.5,
    description: "Deep beam side formwork panel with top tie holes and bottom soffit alignment notch.",
    manufacturerRef: "ASG-BS-3024",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-BP-400-2400",
    manufacturer: "AlumaSystems Global",
    panelType: "Standard Beam Side Panel",
    panelCategory: "Beam Panel",
    panelCode: "BS-400-2400",
    standardDimension: "400 × 2400 mm",
    length: 2400,
    width: 400,
    thickness: 65,
    unit: "mm",
    weightKg: 20.8,
    description: "Deep transfer beam side form panel engineered for deep structural beams.",
    manufacturerRef: "ASG-BS-4024",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-BB-300-2400",
    manufacturer: "Kumkang Kind Formwork",
    panelType: "Standard Beam Bottom Soffit",
    panelCategory: "Beam Panel",
    panelCode: "BB-300-2400",
    standardDimension: "300 × 2400 mm",
    length: 2400,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 17.2,
    description: "High-load beam bottom panel supported directly on shoring props.",
    manufacturerRef: "KK-BB-3024",
    isVerifiedStandard: true,
    isActive: true
  },

  // Corner Panels (Internal & External)
  {
    id: "CAT-IC-150-150-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard 90° Internal Corner",
    panelCategory: "Internal Corner",
    panelCode: "IC-150-2400",
    standardDimension: "150 × 150 × 2400 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 18.6,
    description: "90-degree internal angle connection panel linking perpendicular room shear walls.",
    manufacturerRef: "MIV-IC-1524",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-IC-200-200-2400",
    manufacturer: "Geto Aluminum Formwork Co.",
    panelType: "Standard 90° Internal Corner",
    panelCategory: "Internal Corner",
    panelCode: "IC-200-2400",
    standardDimension: "200 × 200 × 2400 mm",
    length: 2400,
    width: 200,
    thickness: 65,
    unit: "mm",
    weightKg: 23.4,
    description: "Heavy internal corner panel for elevator shafts and stair core 90° junctions.",
    manufacturerRef: "GETO-IC-2024",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-EC-65-65-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard External Corner Angle",
    panelCategory: "External Corner",
    panelCode: "EC-65-2400",
    standardDimension: "65 × 65 × 2400 mm",
    length: 2400,
    width: 65,
    thickness: 65,
    unit: "mm",
    weightKg: 9.8,
    description: "Rigid 90-degree outer corner extrusion clamping external wall panels together.",
    manufacturerRef: "MIV-EC-6524",
    isVerifiedStandard: true,
    isActive: true
  },

  // Soffit Panels
  {
    id: "CAT-SO-150-2400",
    manufacturer: "Kumkang Kind Formwork",
    panelType: "Soffit Length Corner Panel",
    panelCategory: "Soffit Panel",
    panelCode: "SO-150-2400",
    standardDimension: "150 × 2400 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 11.5,
    description: "Wall-to-slab transition soffit angle supporting early stripping of vertical wall panels while keeping slab propped.",
    manufacturerRef: "KK-SO-1524",
    isVerifiedStandard: true,
    isActive: true
  },

  // Deck Panels
  {
    id: "CAT-DP-600-1200",
    manufacturer: "Sforms Aluminum Tech",
    panelType: "Interlocking Deck Panel",
    panelCategory: "Deck Panel",
    panelCode: "DP-600-1200",
    standardDimension: "600 × 1200 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 14.2,
    description: "Interlocking tongue-and-groove decking panel providing flush concrete ceiling finish.",
    manufacturerRef: "SF-DP-6012",
    isVerifiedStandard: true,
    isActive: true
  },

  // Filler Panels
  {
    id: "CAT-FP-100-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard Filler Compensation Panel",
    panelCategory: "Filler Panel",
    panelCode: "FP-100-2400",
    standardDimension: "100 × 2400 mm",
    length: 2400,
    width: 100,
    thickness: 65,
    unit: "mm",
    weightKg: 6.8,
    description: "Dimensional adjustment panel for custom room spans and structural tolerances.",
    manufacturerRef: "MIV-FP-1024",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-FP-50-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Standard Filler Compensation Panel",
    panelCategory: "Filler Panel",
    panelCode: "FP-50-2400",
    standardDimension: "50 × 2400 mm",
    length: 2400,
    width: 50,
    thickness: 65,
    unit: "mm",
    weightKg: 4.2,
    description: "50mm precision gap filler extrusion for non-standard room layouts.",
    manufacturerRef: "MIV-FP-5024",
    isVerifiedStandard: true,
    isActive: true
  },

  // Kicker Panels
  {
    id: "CAT-KP-150-2400",
    manufacturer: "Kumkang Kind Formwork",
    panelType: "Standard Starter Footing Kicker",
    panelCategory: "Kicker Panel",
    panelCode: "KP-150-2400",
    standardDimension: "150 × 2400 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 9.6,
    description: "Bottom alignment starter kicker bolted to the concrete slab edge to anchor upper-floor wall panels.",
    manufacturerRef: "KK-KP-1524",
    isVerifiedStandard: true,
    isActive: true
  },

  // Platform & Special Panels
  {
    id: "CAT-ST-TREAD-300-1200",
    manufacturer: "Geto Aluminum Formwork Co.",
    panelType: "Stair Tread & Riser Panel",
    panelCategory: "Special Panel",
    panelCode: "ST-TRD-300-1200",
    standardDimension: "300 × 1200 mm",
    length: 1200,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 13.5,
    description: "Monolithic stair flight formwork component for rapid simultaneous casting with core walls.",
    manufacturerRef: "GETO-ST-TRD",
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-LS-600-2400",
    manufacturer: "Mivan Technology Corp",
    panelType: "Quick-Stripping Core Shaft Panel",
    panelCategory: "Special Panel",
    panelCode: "LS-600-2400",
    standardDimension: "600 × 2400 mm",
    length: 2400,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 29.5,
    description: "Elevator shaft inner formwork panel configured with crane-lift stripping corners.",
    manufacturerRef: "MIV-LS-2460",
    isVerifiedStandard: true,
    isActive: true
  }
];

// Initial Master Projects
export const INITIAL_MASTER_PROJECTS: MasterProjectRecord[] = [
  {
    id: "PRJ-001",
    code: "PRJ-BLH-01",
    name: "Digital Bole Heights Mixed-Use Development",
    nameAmharic: "ቦሌ ሃይትስ ድብልቅ አገልግሎት ህንጻ",
    clientName: "Federal Housing Corporation",
    contractorName: "BuildSync Main Construction Enterprise",
    location: "Addis Ababa - Bole Sub-City, Woreda 03",
    status: "Active",
    description: "Phase 1: 3 Residential Towers (15 Stories each) with aluminum formwork monolithic casting."
  },
  {
    id: "PRJ-002",
    code: "PRJ-KAZ-02",
    name: "Kazanchis Financial Tower & Plaza",
    nameAmharic: "ካዛንቺስ ፋይናንስ ታወር እና ፕላዛ",
    clientName: "Commercial Bank of Ethiopia",
    contractorName: "BuildSync Main Construction Enterprise",
    location: "Addis Ababa - Kirkos Sub-City, Woreda 08",
    status: "Active",
    description: "22-Story Commercial Grade A office tower with central elevator core shear walls."
  },
  {
    id: "PRJ-003",
    code: "PRJ-GOT-03",
    name: "Gotera Transport Interchange & Viaduct",
    nameAmharic: "ጎተራ የትራንስፖርት ኢንተርቼንጅ",
    clientName: "Addis Ababa City Roads Authority",
    contractorName: "BuildSync Main Construction Enterprise",
    location: "Addis Ababa - Nifas Silk Sub-City, Woreda 02",
    status: "Active",
    description: "Structural piers, viaduct bridge decks, and passenger terminal podium."
  },
  {
    id: "PRJ-004",
    code: "PRJ-LID-04",
    name: "Lideta Smart Apartments Community",
    nameAmharic: "ልደታ ስማርት አፓርትመንቶች",
    clientName: "Ministry of Urban Development",
    contractorName: "BuildSync Main Construction Enterprise",
    location: "Addis Ababa - Lideta Sub-City, Woreda 04",
    status: "Planning",
    description: "4 Towers (18 Stories each) utilizing modern modular aluminum formwork cycles."
  }
];

// Initial Master Site Stores
export const INITIAL_MASTER_SITE_STORES: MasterSiteStoreRecord[] = [
  {
    id: "STORE-BOL-01",
    code: "ST-BOL-01",
    name: "Bole Heights Phase 1 Site Store",
    nameAmharic: "ቦሌ ሃይትስ ሳይት ስቶር 01",
    projectId: "PRJ-001",
    projectName: "Digital Bole Heights Mixed-Use Development",
    siteId: "Digital Construction ERP-SITE-2026-001",
    siteName: "Digital Bole Heights Phase I",
    storeKeeperName: "Ato Abebe Tadesse",
    storeKeeperPhone: "+251 911 445 566",
    securityGuardName: "Hailemariam Desalegn",
    securityGuardPhone: "+251 922 334 455",
    capacitySqM: 1200,
    status: "Active",
    registrationDate: "2025-03-01",
    notes: "Main site staging store for Block A & B formwork erection and tie-pin inventory."
  },
  {
    id: "STORE-KAZ-01",
    code: "ST-KAZ-01",
    name: "Kazanchis Tower Site Depot",
    nameAmharic: "ካዛንቺስ ታወር ሳይት ዲፖ",
    projectId: "PRJ-002",
    projectName: "Kazanchis Financial Tower & Plaza",
    siteId: "Digital Construction ERP-SITE-2026-002",
    siteName: "Kazanchis Financial Tower",
    storeKeeperName: "W/ro Selamawit Hailu",
    storeKeeperPhone: "+251 913 223 344",
    securityGuardName: "Kassahun Bekele",
    securityGuardPhone: "+251 914 556 677",
    capacitySqM: 850,
    status: "Active",
    registrationDate: "2025-07-10",
    notes: "Basement secured formwork parts, climbing jacks, and panel reconditioning yard."
  },
  {
    id: "STORE-GOT-01",
    code: "ST-GOT-01",
    name: "Gotera Viaduct Ground Yard",
    nameAmharic: "ጎተራ ግራውንድ ያርድ ስቶር",
    projectId: "PRJ-003",
    projectName: "Gotera Transport Interchange & Viaduct",
    siteId: "Digital Construction ERP-SITE-2026-003",
    siteName: "Gotera Interchange Project",
    storeKeeperName: "Eng. Daniel Girma",
    storeKeeperPhone: "+251 911 889 900",
    securityGuardName: "Tadesse Melaku",
    securityGuardPhone: "+251 912 667 788",
    capacitySqM: 2500,
    status: "Active",
    registrationDate: "2025-10-01",
    notes: "Outdoor heavy staging yard for pier columns and deck soffit beams."
  }
];

// Initial Master Storage Locations (Hierarchical)
export const INITIAL_MASTER_LOCATIONS: MasterStorageLocationRecord[] = [
  {
    id: "LOC-WH1-A1",
    warehouseId: "WH-ADDIS-CENTRAL-01",
    warehouseName: "Central Addis Ababa Main Warehouse",
    section: "Section A",
    rack: "Rack 01",
    bay: "Bay 01",
    row: "Row 01",
    stack: "Stack 01",
    bin: "A1",
    formattedLocation: "Section A → Rack 01 → Bay 01 → Stack 01 (A1)",
    isActive: true,
    notes: "Primary storage for 600x2400 wall panels"
  },
  {
    id: "LOC-WH1-A2",
    warehouseId: "WH-ADDIS-CENTRAL-01",
    warehouseName: "Central Addis Ababa Main Warehouse",
    section: "Section A",
    rack: "Rack 01",
    bay: "Bay 02",
    row: "Row 01",
    stack: "Stack 01",
    bin: "A2",
    formattedLocation: "Section A → Rack 01 → Bay 02 → Stack 01 (A2)",
    isActive: true,
    notes: "Primary storage for 450x2400 and 300x2400 wall panels"
  },
  {
    id: "LOC-WH1-B1",
    warehouseId: "WH-ADDIS-CENTRAL-01",
    warehouseName: "Central Addis Ababa Main Warehouse",
    section: "Section B",
    rack: "Rack 02",
    bay: "Bay 01",
    row: "Row 02",
    stack: "Stack 01",
    bin: "B1",
    formattedLocation: "Section B → Rack 02 → Bay 01 → Stack 01 (B1)",
    isActive: true,
    notes: "Slab deck panels 900x1800 and 600x1800"
  },
  {
    id: "LOC-WH1-C1",
    warehouseId: "WH-ADDIS-CENTRAL-01",
    warehouseName: "Central Addis Ababa Main Warehouse",
    section: "Section C",
    rack: "Rack 03",
    bay: "Bay 01",
    row: "Row 03",
    stack: "Stack 01",
    bin: "C1",
    formattedLocation: "Section C → Rack 03 → Bay 01 → Stack 01 (C1)",
    isActive: true,
    notes: "Internal & external corner panels"
  },
  {
    id: "LOC-ST1-Y1",
    siteStoreId: "STORE-BOL-01",
    siteStoreName: "Bole Heights Phase 1 Site Store",
    section: "Yard Staging Area 1",
    rack: "Rack 01",
    bay: "Bay 01",
    row: "Row 01",
    stack: "Stack 01",
    bin: "S1-A",
    formattedLocation: "Yard Staging Area 1 → Rack 01 → Bay 01 (S1-A)",
    isActive: true,
    notes: "On-site ready-for-erection stack"
  }
];

// Helper: Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) matrix[i] = [i];
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

// Master Data Service Implementation
export class MasterDataService {
  // --- 1. GLOBAL ALUMINUM FORMWORK PANEL MASTER CATALOG ---

  static async getPanelCatalog(filters?: {
    category?: string;
    manufacturer?: string;
    searchTerm?: string;
    activeOnly?: boolean;
  }): Promise<PanelMasterCatalogItem[]> {
    try {
      const items = await DbService.fetchCollection<PanelMasterCatalogItem>(
        "panelMasterCatalog",
        INITIAL_PANEL_CATALOG
      );

      return items.filter(item => {
        if (filters?.activeOnly && item.isActive === false) return false;
        if (filters?.category && filters.category !== "ALL" && item.panelCategory !== filters.category) return false;
        if (filters?.manufacturer && filters.manufacturer !== "ALL" && item.manufacturer !== filters.manufacturer) return false;
        if (filters?.searchTerm && filters.searchTerm.trim()) {
          const q = filters.searchTerm.toLowerCase().trim();
          const matchCode = (item.panelCode || "").toLowerCase().includes(q);
          const matchType = (item.panelType || "").toLowerCase().includes(q);
          const matchCat = (item.panelCategory || "").toLowerCase().includes(q);
          const matchMfr = (item.manufacturer || "").toLowerCase().includes(q);
          const matchDim = (item.standardDimension || "").toLowerCase().includes(q);
          if (!matchCode && !matchType && !matchCat && !matchMfr && !matchDim) return false;
        }
        return true;
      });
    } catch (e) {
      console.warn("[MasterDataService.getPanelCatalog] Falling back to initial catalog", e);
      return INITIAL_PANEL_CATALOG;
    }
  }

  static async addOrUpdateCatalogItem(item: PanelMasterCatalogItem): Promise<void> {
    const enriched: PanelMasterCatalogItem = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    await DbService.writeDocument<PanelMasterCatalogItem>(
      "panelMasterCatalog",
      enriched,
      INITIAL_PANEL_CATALOG
    );
  }

  // Cascading Selection Level 1: Get distinct Panel Types
  static async getAvailablePanelTypes(filters?: {
    category?: string;
    manufacturer?: string;
    searchTerm?: string;
  }): Promise<string[]> {
    const catalog = await this.getPanelCatalog({ ...filters, activeOnly: true });
    const types = Array.from(new Set(catalog.map(c => c.panelType).filter(Boolean)));
    return types.sort();
  }

  // Cascading Selection Level 2: Get standard dimensions for a selected Panel Type
  static async getDimensionsForPanelType(panelTypeName: string): Promise<Array<{
    standardDimension: string;
    length: number;
    width: number;
    thickness: number;
    unit: "mm" | "m";
    isVerifiedStandard: boolean;
  }>> {
    if (!panelTypeName) return [];
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const matches = catalog.filter(c => c.panelType.toLowerCase() === panelTypeName.toLowerCase());

    const dimMap = new Map<string, {
      standardDimension: string;
      length: number;
      width: number;
      thickness: number;
      unit: "mm" | "m";
      isVerifiedStandard: boolean;
    }>();

    for (const m of matches) {
      const key = `${m.width}x${m.length}x${m.thickness}${m.unit}`;
      if (!dimMap.has(key)) {
        dimMap.set(key, {
          standardDimension: m.standardDimension || `${m.width} × ${m.length} ${m.unit}`,
          length: m.length,
          width: m.width,
          thickness: m.thickness || 65,
          unit: m.unit || "mm",
          isVerifiedStandard: !!m.isVerifiedStandard
        });
      }
    }

    return Array.from(dimMap.values()).sort((a, b) => b.width - a.width || b.length - a.length);
  }

  // Cascading Selection Level 3: Get corresponding Panel Code for Panel Type + Dimension
  static async getCodesForTypeAndDimension(
    panelTypeName: string,
    width: number,
    length: number
  ): Promise<Array<{
    panelCode: string;
    catalogId: string;
    manufacturer: string;
    weightKg?: number;
    description: string;
    category: string;
  }>> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const matches = catalog.filter(
      c =>
        c.panelType.toLowerCase() === panelTypeName.toLowerCase() &&
        Number(c.width) === Number(width) &&
        Number(c.length) === Number(length)
    );

    return matches.map(m => ({
      panelCode: m.panelCode,
      catalogId: m.id,
      manufacturer: m.manufacturer,
      weightKg: m.weightKg,
      description: m.description,
      category: m.panelCategory
    }));
  }

  // --- 2. MASTER PROJECTS & SITES ---

  static async getMasterProjects(): Promise<MasterProjectRecord[]> {
    return DbService.fetchCollection<MasterProjectRecord>(
      "registeredProjects",
      INITIAL_MASTER_PROJECTS
    );
  }

  static async getSitesForProject(projectIdOrName: string): Promise<RegisteredSite[]> {
    const allSites = await DbService.getRegisteredSites();
    if (!projectIdOrName || projectIdOrName === "ALL") return allSites;

    const lowerTarget = projectIdOrName.toLowerCase();
    return allSites.filter(s => {
      return (
        s.id.toLowerCase() === lowerTarget ||
        s.projectName.toLowerCase() === lowerTarget ||
        s.projectName.toLowerCase().includes(lowerTarget)
      );
    });
  }

  // --- WAREHOUSES MASTER DATA ---
  static async getWarehouses(): Promise<RegisteredWarehouse[]> {
    return DbService.getWarehouses();
  }

  // --- 3. MASTER SITE STORES ---

  static async getSiteStoresForSite(siteIdOrName: string): Promise<MasterSiteStoreRecord[]> {
    const allStores = await DbService.fetchCollection<MasterSiteStoreRecord>(
      "siteStores",
      INITIAL_MASTER_SITE_STORES
    );
    if (!siteIdOrName || siteIdOrName === "ALL") return allStores;

    const lowerTarget = siteIdOrName.toLowerCase();
    return allStores.filter(store => {
      return (
        store.siteId.toLowerCase() === lowerTarget ||
        store.siteName.toLowerCase() === lowerTarget ||
        store.siteName.toLowerCase().includes(lowerTarget) ||
        store.projectId.toLowerCase() === lowerTarget ||
        store.projectName.toLowerCase().includes(lowerTarget)
      );
    });
  }

  static async addSiteStore(store: MasterSiteStoreRecord): Promise<void> {
    await DbService.writeDocument<MasterSiteStoreRecord>(
      "siteStores",
      store,
      INITIAL_MASTER_SITE_STORES
    );
  }

  // --- 4. MASTER STORAGE LOCATIONS & SIMILARITY CHECK ---

  static async getStorageLocations(targetWarehouseOrStoreId?: string): Promise<MasterStorageLocationRecord[]> {
    const allLocations = await DbService.fetchCollection<MasterStorageLocationRecord>(
      "storageLocations",
      INITIAL_MASTER_LOCATIONS
    );

    if (!targetWarehouseOrStoreId || targetWarehouseOrStoreId === "ALL") {
      return allLocations;
    }

    const lower = targetWarehouseOrStoreId.toLowerCase();
    return allLocations.filter(loc => {
      return (
        (loc.warehouseId && loc.warehouseId.toLowerCase() === lower) ||
        (loc.warehouseName && loc.warehouseName.toLowerCase().includes(lower)) ||
        (loc.siteStoreId && loc.siteStoreId.toLowerCase() === lower) ||
        (loc.siteStoreName && loc.siteStoreName.toLowerCase().includes(lower))
      );
    });
  }

  static async saveStorageLocation(location: MasterStorageLocationRecord): Promise<void> {
    await DbService.writeDocument<MasterStorageLocationRecord>(
      "storageLocations",
      location,
      INITIAL_MASTER_LOCATIONS
    );
  }

  /**
   * Similarity Engine for duplicate location prevention:
   * When user enters a new location e.g. "Warehouse A — Section B — Rack 03",
   * checks existing locations like "Warehouse A — Section B — Rack 02"
   * and flags similar entries to avoid accidental duplicates.
   */
  static async findSimilarLocations(
    newLoc: {
      warehouseId?: string;
      warehouseName?: string;
      siteStoreId?: string;
      section: string;
      rack?: string;
      row?: string;
      bay?: string;
      stack?: string;
      bin?: string;
    },
    thresholdDistance = 4
  ): Promise<Array<{ location: MasterStorageLocationRecord; distance: number; reason: string }>> {
    const existing = await this.getStorageLocations(newLoc.warehouseId || newLoc.siteStoreId);
    const newFormatted = [
      newLoc.section,
      newLoc.rack ? `Rack ${newLoc.rack.replace(/^rack\s*/i, "")}` : "",
      newLoc.bay ? `Bay ${newLoc.bay.replace(/^bay\s*/i, "")}` : "",
      newLoc.row ? `Row ${newLoc.row.replace(/^row\s*/i, "")}` : "",
      newLoc.bin ? `Bin ${newLoc.bin.replace(/^bin\s*/i, "")}` : ""
    ].filter(Boolean).join(" — ").toLowerCase();

    const matches: Array<{ location: MasterStorageLocationRecord; distance: number; reason: string }> = [];

    for (const ex of existing) {
      const exFormatted = (ex.formattedLocation || "").toLowerCase();
      
      // Exact match
      if (exFormatted === newFormatted) {
        matches.push({
          location: ex,
          distance: 0,
          reason: "Exact duplicate found"
        });
        continue;
      }

      // Check section and rack alignment
      const sameSection = ex.section.toLowerCase().trim() === newLoc.section.toLowerCase().trim();
      const dist = levenshteinDistance(exFormatted, newFormatted);

      if (sameSection && dist <= thresholdDistance) {
        matches.push({
          location: ex,
          distance: dist,
          reason: `Similar section/rack structure in same facility (Distance: ${dist})`
        });
      } else if (dist <= 3) {
        matches.push({
          location: ex,
          distance: dist,
          reason: `High string similarity (Distance: ${dist})`
        });
      }
    }

    return matches.sort((a, b) => a.distance - b.distance);
  }

  // --- 5. RECENT SELECTIONS PERSISTENCE ---

  static recordRecentSelection(categoryKey: string, value: string): void {
    if (typeof window === "undefined" || !value) return;
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_SELECTIONS);
      const dict: Record<string, string[]> = raw ? JSON.parse(raw) : {};
      const currentList = dict[categoryKey] || [];
      const updated = [value, ...currentList.filter(v => v !== value)].slice(0, 10);
      dict[categoryKey] = updated;
      localStorage.setItem(STORAGE_RECENT_SELECTIONS, JSON.stringify(dict));
    } catch (e) {
      console.warn("Error recording recent selection:", e);
    }
  }

  static getRecentSelections(categoryKey: string): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_RECENT_SELECTIONS);
      if (!raw) return [];
      const dict: Record<string, string[]> = JSON.parse(raw);
      return dict[categoryKey] || [];
    } catch (e) {
      return [];
    }
  }
}
