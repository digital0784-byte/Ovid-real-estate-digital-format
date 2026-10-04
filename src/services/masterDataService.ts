import {
  PanelMasterCatalogItem,
  AccessoryMasterCatalogItem,
  AccessoryCategoryType,
  MasterProjectRecord,
  MasterSiteStoreRecord,
  MasterStorageLocationRecord,
  RegisteredWarehouse,
  RegisteredSite,
  PanelCategoryType,
  MasterManufacturerRecord,
  MasterPanelTypeRecord,
  MasterPanelDimensionRecord,
  StockTransactionRecord,
  StairPanelConfig
} from "../types";
import { DbService } from "./db";

// Local storage keys for resilient persistence
const STORAGE_CATALOG = "digital_construction_panel_catalog";
const STORAGE_PROJECTS = "digital_construction_master_projects";
const STORAGE_SITE_STORES = "digital_construction_master_site_stores";
const STORAGE_LOCATIONS = "digital_construction_master_locations";
const STORAGE_RECENT_SELECTIONS = "digital_construction_recent_master_selections";

// ============================================================================
// CENTRALIZED MANUFACTURERS & FORMWORK SYSTEMS CATALOG
// ============================================================================
export const INITIAL_MANUFACTURERS: MasterManufacturerRecord[] = [
  {
    id: "MFR-MIVAN",
    name: "Mivan Technology Corp",
    formworkSystems: ["Mivan 65mm Standard System", "Mivan Monolithic High-Rise"],
    country: "Malaysia / UK",
    description: "Pioneer of monolithic aluminum formwork casting systems worldwide.",
    contactInfo: "info@mivan.com",
    isActive: true
  },
  {
    id: "MFR-KUMKANG",
    name: "Kumkang Kind Formwork",
    formworkSystems: ["Kumkang 65mm Standard System", "Kumkang Mega-Slab"],
    country: "South Korea",
    description: "Global manufacturer of high-precision aluminum formwork and climbing systems.",
    contactInfo: "export@kumkangkind.com",
    isActive: true
  },
  {
    id: "MFR-ALUMA",
    name: "Aluma Systems International",
    formworkSystems: ["Aluma EasySet 65mm", "Aluma Heavy Shoring"],
    country: "Canada / USA",
    description: "Industry-standard aluminum wall, beam, and table-form system solutions.",
    contactInfo: "sales@aluma.com",
    isActive: true
  },
  {
    id: "MFR-GETO",
    name: "Geto Aluminum Formwork Co.",
    formworkSystems: ["Geto High-Rise 65mm", "Geto Quick-Deck"],
    country: "China",
    description: "Large-scale aluminum formwork producer certified for multi-story residential towers.",
    contactInfo: "overseas@geto.com.cn",
    isActive: true
  },
  {
    id: "MFR-PERI",
    name: "PERI Formwork Systems",
    formworkSystems: ["PERI Trio-Alu 65mm", "PERI Skydeck"],
    country: "Germany",
    description: "European precision engineering formwork and scaffolding technology.",
    contactInfo: "info@peri.de",
    isActive: true
  },
  {
    id: "MFR-DOKA",
    name: "Doka Formwork",
    formworkSystems: ["Doka Alu-Framax", "Doka Dokaflex"],
    country: "Austria",
    description: "Heavy-duty modular aluminum and steel framed wall formwork.",
    contactInfo: "info@doka.com",
    isActive: true
  },
  {
    id: "MFR-SFORMS",
    name: "Sforms Aluminum Tech",
    formworkSystems: ["Sforms 65mm Deck & Wall System"],
    country: "India / UAE",
    description: "Cost-effective high-grade alloy aluminum formwork manufacturer.",
    contactInfo: "contact@sforms.in",
    isActive: true
  }
];

// ============================================================================
// CENTRALIZED PANEL TYPES CATALOG (PROMPT 1 SPECIFICATION)
// ============================================================================
export const INITIAL_PANEL_TYPES: MasterPanelTypeRecord[] = [
  { id: "PT-IWP", name: "Internal Wall Panel", category: "Internal Wall", description: "Internal partition and dividing wall formwork panel.", isActive: true },
  { id: "PT-EWP", name: "External Wall Panel", category: "External Wall", description: "Exterior facade and perimeter shear wall panel.", isActive: true },
  { id: "PT-EXT", name: "Extend Panel", category: "Extend Panel", description: "Extension panel for ceiling height and floor adjustments.", isActive: true },
  { id: "PT-SOF", name: "Soffit Panel", category: "Soffit Panel", description: "Soffit transition and slab-wall connection panel.", isActive: true },
  { id: "PT-BM", name: "Beam Panel", category: "Beam Panel", description: "Structural concrete beam bottom and side formwork panel.", isActive: true },
  { id: "PT-CA", name: "CA Panel", category: "CA Panel", description: "Corner Angle / Chamfer Angle panel for perimeter bevels.", isActive: true },
  { id: "PT-IC", name: "IC Panel", category: "IC Panel", description: "Internal Corner angle panel connecting 90° inner walls.", isActive: true },
  { id: "PT-SC", name: "SC Panel", category: "SC Panel", description: "Soffit Corner panel for beam-slab junction points.", isActive: true },
  { id: "PT-SCR", name: "SCR Panel", category: "SCR Panel", description: "Soffit Corner Return panel for 3-way intersection corners.", isActive: true },
  { id: "PT-SP", name: "Slab Panel", category: "Slab Panel", description: "Suspended slab deck formwork panel.", isActive: true },
  { id: "PT-DEP", name: "Door End Panel", category: "Door End Panel", description: "Door opening side jamb enclosure panel.", isActive: true },
  { id: "PT-WEP", name: "Wall End Panel", category: "Wall End Panel", description: "Wall termination and stop-end closure panel.", isActive: true },
  { id: "PT-CP", name: "Corner Panel", category: "Corner Panel", description: "Corner compensation and alignment panel.", isActive: true },
  { id: "PT-IC-STD", name: "Internal Corner", category: "Internal Corner", description: "Standard 90° internal corner angle extrusion.", isActive: true },
  { id: "PT-EC-STD", name: "External Corner", category: "External Corner", description: "Standard external 90° corner clamp profile.", isActive: true },
  { id: "PT-COL", name: "Column Panel", category: "Column Panel", description: "Square and rectangular structural column shutter panel.", isActive: true },
  { id: "PT-STP", name: "Stair Panel", category: "Stair Panel", description: "Dedicated flight, landing, and tread-riser stair formwork component.", isActive: true },
  { id: "PT-BS", name: "Beam Soffit", category: "Beam Soffit", description: "Horizontal underside soffit panel supporting concrete beams.", isActive: true },
  { id: "PT-BSI", name: "Beam Side", category: "Beam Side", description: "Vertical side wall panel forming concrete beam depth.", isActive: true },
  { id: "PT-FP", name: "Filler Panel", category: "Filler Panel", description: "Dimensional tolerance filler and infill strip.", isActive: true },
  { id: "PT-KP", name: "Kicker Panel", category: "Kicker Panel", description: "Starter footing kicker anchored to the concrete slab.", isActive: true },
  { id: "PT-SEP", name: "Stop End Panel", category: "Stop End Panel", description: "Construction joint end bulkhead stop panel.", isActive: true },
  { id: "PT-PWP", name: "Platform/Working Panel", category: "Platform/Accessory Panel", description: "External worker access and working bracket platform panel.", isActive: true },
  { id: "PT-SPEC", name: "Special Panel", category: "Special Panel", description: "Custom architectural geometries and core shaft panels.", isActive: true }
];

// ============================================================================
// VERIFIED CENTRALIZED ALUMINUM FORMWORK MASTER CATALOG SEEDS
// ============================================================================
export const INITIAL_PANEL_CATALOG: PanelMasterCatalogItem[] = [
  // 1. Internal Wall Panels
  {
    id: "CAT-IWP-1200-600",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Internal Wall",
    panelType: "Internal Wall Panel",
    panelName: "Internal Wall Standard Modular Panel",
    panelCode: "IWP-1200-600",
    standardDimension: "1200 × 600 × 65 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 14.8,
    description: "Standard modular 1.2m internal room partition panel with tie-rod sleeves and pin holes at 50mm centers.",
    manufacturerRef: "MIV-IWP-1260",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "SP-200"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-IWP-2400-600",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Internal Wall",
    panelType: "Internal Wall Panel",
    panelName: "Internal Wall Full-Height Panel",
    panelCode: "IWP-2400-600",
    standardDimension: "2400 × 600 × 65 mm",
    length: 2400,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 28.5,
    description: "2.4m full-height vertical internal shear wall panel engineered with 4.0mm alloy 6061-T6 face skin.",
    manufacturerRef: "MIV-IWP-2460",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-IWP-2700-600",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Internal Wall",
    panelType: "Internal Wall Panel",
    panelName: "Internal Wall Extended High-Clearance Panel",
    panelCode: "IWP-2700-600",
    standardDimension: "2700 × 600 × 65 mm",
    length: 2700,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 32.1,
    description: "2.7m extended internal shear wall panel for residential high-ceiling living areas.",
    manufacturerRef: "KK-IWP-2760",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "PPP-2538"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-IWP-2400-450",
    manufacturer: "Aluma Systems International",
    formworkSystem: "Aluma EasySet 65mm",
    panelCategory: "Internal Wall",
    panelType: "Internal Wall Panel",
    panelName: "Internal Wall Corridor & Jamb Panel",
    panelCode: "IWP-2400-450",
    standardDimension: "2400 × 450 × 65 mm",
    length: 2400,
    width: 450,
    thickness: 65,
    unit: "mm",
    weightKg: 21.6,
    description: "Medium-width partition panel for corridors and doorway returns.",
    manufacturerRef: "ALU-IWP-2445",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-IWP-3000-600",
    manufacturer: "Geto Aluminum Formwork Co.",
    formworkSystem: "Geto High-Rise 65mm",
    panelCategory: "Internal Wall",
    panelType: "Internal Wall Panel",
    panelName: "Internal Wall Podium & Lobby Panel",
    panelCode: "IWP-3000-600",
    standardDimension: "3000 × 600 × 65 mm",
    length: 3000,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 35.8,
    description: "3.0-meter high-clearance wall panel for lobby architectural interior walls.",
    manufacturerRef: "GETO-IWP-3060",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "PPP-2538"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 2. External Wall Panels
  {
    id: "CAT-EWP-1200-900",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "External Wall",
    panelType: "External Wall Panel",
    panelName: "External Wall Wide Modular Panel",
    panelCode: "EWP-1200-900",
    standardDimension: "1200 × 900 × 65 mm",
    length: 1200,
    width: 900,
    thickness: 65,
    unit: "mm",
    weightKg: 22.4,
    description: "Wide-format exterior facade panel equipped with perimeter weather-seal groove.",
    manufacturerRef: "MIV-EWP-1290",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "WB-300"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-EWP-2400-600",
    manufacturer: "Geto Aluminum Formwork Co.",
    formworkSystem: "Geto High-Rise 65mm",
    panelCategory: "External Wall",
    panelType: "External Wall Panel",
    panelName: "External Facade Heavy-Duty Panel",
    panelCode: "EWP-2400-600",
    standardDimension: "2400 × 600 × 70 mm",
    length: 2400,
    width: 600,
    thickness: 70,
    unit: "mm",
    weightKg: 31.0,
    description: "Heavy-duty exterior wall panel with 70mm frame profile and reinforced ribs for high wind pressures.",
    manufacturerRef: "GETO-EWP-2460",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "KP-150-2400"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-EWP-2700-600",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "External Wall",
    panelType: "External Wall Panel",
    panelName: "External Facade High-Clearance Panel",
    panelCode: "EWP-2700-600",
    standardDimension: "2700 × 600 × 65 mm",
    length: 2700,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 33.2,
    description: "Full-height exterior facade shutter with integrated tie holes and kicker landing flange.",
    manufacturerRef: "KK-EWP-2760",
    compatibleAccessories: ["TR-15", "WN-15", "PC-22", "WP-PIN-01", "WEDGE-01", "PPP-2538"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 3. Extend Panels
  {
    id: "CAT-EXT-600-600",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Extend Panel",
    panelType: "Extend Panel",
    panelName: "Extend Panel Square Modular",
    panelCode: "EXT-600-600",
    standardDimension: "600 × 600 × 65 mm",
    length: 600,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 7.8,
    description: "Vertical height extension panel mounted above standard 2.4m wall panels for ceiling level adjustments.",
    manufacturerRef: "MIV-EXT-6060",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "CL-65"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-EXT-300-600",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Extend Panel",
    panelType: "Extend Panel",
    panelName: "Extend Panel 300mm Infill",
    panelCode: "EXT-300-600",
    standardDimension: "300 × 600 × 65 mm",
    length: 600,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 4.5,
    description: "Precision 300mm vertical height extension shutter.",
    manufacturerRef: "KK-EXT-3060",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "CL-65"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 4. Soffit Panels
  {
    id: "CAT-SOF-1200-600",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Soffit Panel",
    panelType: "Soffit Panel",
    panelName: "Soffit Modular Transition Panel",
    panelCode: "SOF-1200-600",
    standardDimension: "1200 × 600 × 65 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 14.2,
    description: "Soffit corner and edge panel supporting early wall stripping while maintaining continuous slab propping.",
    manufacturerRef: "MIV-SOF-1260",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525", "SP-200"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-SOF-150-2400",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Soffit Panel",
    panelType: "Soffit Panel",
    panelName: "Soffit Length Corner Strip",
    panelCode: "SO-150-2400",
    standardDimension: "150 × 2400 × 65 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 11.5,
    description: "Wall-to-slab transition soffit angle extrusion for quick-strip drop-head systems.",
    manufacturerRef: "KK-SO-1524",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 5. Beam Panels
  {
    id: "CAT-BM-1500-300",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Beam Panel",
    panelType: "Beam Panel",
    panelName: "Structural Beam Bottom & Side Panel",
    panelCode: "BM-1500-300",
    standardDimension: "1500 × 300 × 65 mm",
    length: 1500,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 11.8,
    description: "Reinforced modular beam bottom and side panel with prop-head brackets.",
    manufacturerRef: "MIV-BM-1530",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-BM-1200-400",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Beam Panel",
    panelType: "Beam Panel",
    panelName: "Deep Girder Beam Side Panel",
    panelCode: "BM-1200-400",
    standardDimension: "1200 × 400 × 65 mm",
    length: 1200,
    width: 400,
    thickness: 65,
    unit: "mm",
    weightKg: 12.6,
    description: "Modular beam formwork for 400mm drop-depth transfer beams.",
    manufacturerRef: "KK-BM-1240",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 6. CA Panels (Chamfer Angle / Corner Angle)
  {
    id: "CAT-CA-100-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "CA Panel",
    panelType: "CA Panel",
    panelName: "Chamfer Angle Bevel Corner Panel",
    panelCode: "CA-100-2400",
    standardDimension: "100 × 100 × 2400 mm",
    length: 2400,
    width: 100,
    thickness: 65,
    unit: "mm",
    weightKg: 12.5,
    description: "45-degree architectural chamfer corner extrusion preventing chipping at column and wall corners.",
    manufacturerRef: "MIV-CA-1024",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-CA-75-2400",
    manufacturer: "Geto Aluminum Formwork Co.",
    formworkSystem: "Geto High-Rise 65mm",
    panelCategory: "CA Panel",
    panelType: "CA Panel",
    panelName: "Chamfer Angle 75mm Bevel Panel",
    panelCode: "CA-75-2400",
    standardDimension: "75 × 75 × 2400 mm",
    length: 2400,
    width: 75,
    thickness: 65,
    unit: "mm",
    weightKg: 9.8,
    description: "75mm chamfer angle transition extrusion for monolithic edge finishing.",
    manufacturerRef: "GETO-CA-7524",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 7. IC Panels (Internal Corner)
  {
    id: "CAT-IC-150-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "IC Panel",
    panelType: "IC Panel",
    panelName: "Internal Corner 90° Angle Panel",
    panelCode: "IC-150-2400",
    standardDimension: "150 × 150 × 2400 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 18.6,
    description: "Rigid 90-degree internal angle connection panel linking perpendicular room shear walls.",
    manufacturerRef: "MIV-IC-1524",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-IC-200-2400",
    manufacturer: "Geto Aluminum Formwork Co.",
    formworkSystem: "Geto High-Rise 65mm",
    panelCategory: "IC Panel",
    panelType: "IC Panel",
    panelName: "Internal Corner 200mm Core Panel",
    panelCode: "IC-200-2400",
    standardDimension: "200 × 200 × 2400 mm",
    length: 2400,
    width: 200,
    thickness: 65,
    unit: "mm",
    weightKg: 23.4,
    description: "Heavy internal corner panel for elevator shafts and stair core 90° junctions.",
    manufacturerRef: "GETO-IC-2024",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 8. SC Panels (Soffit Corner)
  {
    id: "CAT-SC-150-1200",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "SC Panel",
    panelType: "SC Panel",
    panelName: "Soffit Corner Beam Junction Panel",
    panelCode: "SC-150-1200",
    standardDimension: "150 × 150 × 1200 mm",
    length: 1200,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 10.2,
    description: "Soffit corner angle forming horizontal wall-to-deck or beam-to-slab transition corners.",
    manufacturerRef: "KK-SC-1512",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 9. SCR Panels (Soffit Corner Return)
  {
    id: "CAT-SCR-150-150",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "SCR Panel",
    panelType: "SCR Panel",
    panelName: "Soffit Corner Return 3-Way Junction",
    panelCode: "SCR-150-150",
    standardDimension: "150 × 150 × 150 mm",
    length: 150,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 2.8,
    description: "Precision 3-dimensional corner component connecting wall corner, beam corner, and slab soffit.",
    manufacturerRef: "MIV-SCR-1515",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 10. Slab Panels
  {
    id: "CAT-SP-1200-1200",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Slab Panel",
    panelType: "Slab Panel",
    panelName: "Slab Decking Square Modular Panel",
    panelCode: "SP-1200-1200",
    standardDimension: "1200 × 1200 × 65 mm",
    length: 1200,
    width: 1200,
    thickness: 65,
    unit: "mm",
    weightKg: 24.2,
    description: "Standard square horizontal slab deck panel with reinforced underside cross-ribs for deflection control.",
    manufacturerRef: "KK-SP-1212",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-SP-900-1800",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Slab Panel",
    panelType: "Slab Panel",
    panelName: "Large-Span Slab Decking Panel",
    panelCode: "SP-900-1800",
    standardDimension: "900 × 1800 × 65 mm",
    length: 1800,
    width: 900,
    thickness: 65,
    unit: "mm",
    weightKg: 31.4,
    description: "Large-span horizontal slab deck panel for high-efficiency floor decking.",
    manufacturerRef: "KK-SP-1890",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-2538"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-SP-600-1200",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Slab Panel",
    panelType: "Slab Panel",
    panelName: "Modular Slab Infill Panel",
    panelCode: "SP-600-1200",
    standardDimension: "600 × 1200 × 65 mm",
    length: 1200,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 14.8,
    description: "Modular slab panel for infill zones, perimeter spans, and early prop-head strip intervals.",
    manufacturerRef: "MIV-SP-1260",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 11. Door End Panels
  {
    id: "CAT-DEP-2100-200",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Door End Panel",
    panelType: "Door End Panel",
    panelName: "Door Opening Jamb End Panel",
    panelCode: "DEP-2100-200",
    standardDimension: "2100 × 200 × 65 mm",
    length: 2100,
    width: 200,
    thickness: 65,
    unit: "mm",
    weightKg: 16.5,
    description: "Full-height vertical closure panel for standard 2.1m doorway openings in shear wall layouts.",
    manufacturerRef: "MIV-DEP-2120",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-DEP-2100-150",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Door End Panel",
    panelType: "Door End Panel",
    panelName: "Door Opening 150mm End Panel",
    panelCode: "DEP-2100-150",
    standardDimension: "2100 × 150 × 65 mm",
    length: 2100,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 13.2,
    description: "150mm wall thickness doorway jamb termination formwork.",
    manufacturerRef: "KK-DEP-2115",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 12. Wall End Panels
  {
    id: "CAT-WEP-2400-200",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Wall End Panel",
    panelType: "Wall End Panel",
    panelName: "Wall Termination End Bulkhead Panel",
    panelCode: "WEP-2400-200",
    standardDimension: "2400 × 200 × 65 mm",
    length: 2400,
    width: 200,
    thickness: 65,
    unit: "mm",
    weightKg: 17.8,
    description: "Vertical stop-end panel closing off free wall ends and window opening sides.",
    manufacturerRef: "MIV-WEP-2420",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-WEP-2700-200",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Wall End Panel",
    panelType: "Wall End Panel",
    panelName: "Wall End Extended Bulkhead Panel",
    panelCode: "WEP-2700-200",
    standardDimension: "2700 × 200 × 65 mm",
    length: 2700,
    width: 200,
    thickness: 65,
    unit: "mm",
    weightKg: 19.8,
    description: "2.7m extended wall end closure panel for high-clearance shear wall terminations.",
    manufacturerRef: "KK-WEP-2720",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 13. Corner Panels
  {
    id: "CAT-CP-300-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Corner Panel",
    panelType: "Corner Panel",
    panelName: "Corner Compensation Alignment Panel",
    panelCode: "CP-300-2400",
    standardDimension: "300 × 2400 × 65 mm",
    length: 2400,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 16.5,
    description: "Corner adjustment panel installed adjoining internal corners for precise grid dimensioning.",
    manufacturerRef: "MIV-CP-2430",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 14. Internal Corners
  {
    id: "CAT-IC-STD-150-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Internal Corner",
    panelType: "Internal Corner",
    panelName: "Standard Internal 90° Corner",
    panelCode: "IC-150-2400-STD",
    standardDimension: "150 × 150 × 2400 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 18.6,
    description: "Internal corner extrusion connecting right-angled interior shear walls.",
    manufacturerRef: "MIV-IC-90-24",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 15. External Corners
  {
    id: "CAT-EC-65-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "External Corner",
    panelType: "External Corner",
    panelName: "Standard External 90° Clamp Profile",
    panelCode: "EC-65-2400",
    standardDimension: "65 × 65 × 2400 mm",
    length: 2400,
    width: 65,
    thickness: 65,
    unit: "mm",
    weightKg: 9.8,
    description: "Rigid 90-degree outer corner extrusion clamping external wall panels together.",
    manufacturerRef: "MIV-EC-6524",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "CL-65"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 16. Column Panels
  {
    id: "CAT-COL-600-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Column Panel",
    panelType: "Column Panel",
    panelName: "Structural Column Shutter Panel",
    panelCode: "COL-600-2400",
    standardDimension: "600 × 2400 × 65 mm",
    length: 2400,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 28.5,
    description: "Heavy-duty column shuttering panel engineered for high hydrostatic concrete head pressure.",
    manufacturerRef: "MIV-COL-2460",
    compatibleAccessories: ["TR-15", "WN-15", "CL-80", "WB-300", "WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-COL-750-2400",
    manufacturer: "Geto Aluminum Formwork Co.",
    formworkSystem: "Geto High-Rise 65mm",
    panelCategory: "Column Panel",
    panelType: "Column Panel",
    panelName: "Wide Column Perimeter Shutter",
    panelCode: "COL-750-2400",
    standardDimension: "750 × 2400 × 65 mm",
    length: 2400,
    width: 750,
    thickness: 65,
    unit: "mm",
    weightKg: 34.2,
    description: "Wide column panel for structural core columns in commercial buildings.",
    manufacturerRef: "GETO-COL-2475",
    compatibleAccessories: ["TR-15", "WN-15", "CL-80", "WB-300", "WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 17. Stair Panels (Dedicated Category & Parameters - Prompt 10)
  {
    id: "CAT-STP-FLT-1200",
    manufacturer: "Geto Aluminum Formwork Co.",
    formworkSystem: "Geto High-Rise 65mm",
    panelCategory: "Stair Panel",
    panelType: "Stair Panel",
    panelName: "Monolithic Stair Flight Panel (10 Steps)",
    panelCode: "STP-FLT-1200",
    standardDimension: "1200 × 300 × 65 mm",
    length: 3000,
    width: 1200,
    thickness: 65,
    unit: "mm",
    weightKg: 42.5,
    description: "Complete monolithic flight shutter for 10-step staircases with 300mm tread and 150mm riser.",
    manufacturerRef: "GETO-STP-1200",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15", "PPP-1525"],
    stairConfig: {
      stairPanelType: "Flight Panel",
      stairWidth: 1200,
      tread: 300,
      riser: 150,
      slopeAngle: 30.5,
      numberOfSteps: 10
    },
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-STP-FLT-1000",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Stair Panel",
    panelType: "Stair Panel",
    panelName: "Standard Stair Flight Panel (8 Steps)",
    panelCode: "STP-FLT-1000",
    standardDimension: "1000 × 280 × 65 mm",
    length: 2400,
    width: 1000,
    thickness: 65,
    unit: "mm",
    weightKg: 36.0,
    description: "8-step residential stair flight formwork with 280mm tread and 175mm riser at 32° slope.",
    manufacturerRef: "KK-STP-1000",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15", "PPP-1525"],
    stairConfig: {
      stairPanelType: "Flight Panel",
      stairWidth: 1000,
      tread: 280,
      riser: 175,
      slopeAngle: 32.0,
      numberOfSteps: 8
    },
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-STP-LND-1200",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Stair Panel",
    panelType: "Stair Panel",
    panelName: "Stair Intermediate Landing Panel",
    panelCode: "STP-LND-1200",
    standardDimension: "1200 × 1200 × 65 mm",
    length: 1200,
    width: 1200,
    thickness: 65,
    unit: "mm",
    weightKg: 24.5,
    description: "Intermediate rest landing horizontal shuttering panel for stair core enclosures.",
    manufacturerRef: "MIV-STP-LND",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525"],
    stairConfig: {
      stairPanelType: "Landing Panel",
      stairWidth: 1200,
      tread: 300,
      riser: 150,
      slopeAngle: 0,
      numberOfSteps: 1
    },
    isVerifiedStandard: true,
    isActive: true
  },

  // 18. Beam Soffit Panels
  {
    id: "CAT-BS-1200-300",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Beam Soffit",
    panelType: "Beam Soffit",
    panelName: "Beam Underside Soffit Panel",
    panelCode: "BS-1200-300",
    standardDimension: "1200 × 300 × 65 mm",
    length: 1200,
    width: 300,
    thickness: 65,
    unit: "mm",
    weightKg: 9.6,
    description: "Horizontal underside soffit shutter supporting concrete beams between vertical supports.",
    manufacturerRef: "MIV-BS-1230",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "PPP-1525"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 19. Beam Side Panels
  {
    id: "CAT-BSI-1200-500",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Beam Side",
    panelType: "Beam Side",
    panelName: "Deep Beam Side Wall Panel",
    panelCode: "BSI-1200-500",
    standardDimension: "1200 × 500 × 65 mm",
    length: 1200,
    width: 500,
    thickness: 65,
    unit: "mm",
    weightKg: 15.2,
    description: "Vertical beam side shutter designed for 500mm deep concrete perimeter beams.",
    manufacturerRef: "MIV-BSI-1250",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 20. Filler Panels
  {
    id: "CAT-FP-100-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Filler Panel",
    panelType: "Filler Panel",
    panelName: "100mm Precision Tolerance Filler",
    panelCode: "FP-100-2400",
    standardDimension: "100 × 2400 × 65 mm",
    length: 2400,
    width: 100,
    thickness: 65,
    unit: "mm",
    weightKg: 6.8,
    description: "Dimensional adjustment panel for custom room spans and structural tolerances.",
    manufacturerRef: "MIV-FP-1024",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-FP-50-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Filler Panel",
    panelType: "Filler Panel",
    panelName: "50mm Gap Infill Extrusion",
    panelCode: "FP-50-2400",
    standardDimension: "50 × 2400 × 65 mm",
    length: 2400,
    width: 50,
    thickness: 65,
    unit: "mm",
    weightKg: 4.2,
    description: "50mm precision gap filler extrusion for non-standard room layouts.",
    manufacturerRef: "MIV-FP-5024",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 21. Kicker Panels
  {
    id: "CAT-KP-150-2400",
    manufacturer: "Kumkang Kind Formwork",
    formworkSystem: "Kumkang 65mm Standard System",
    panelCategory: "Kicker Panel",
    panelType: "Kicker Panel",
    panelName: "Starter Slab Footing Kicker",
    panelCode: "KP-150-2400",
    standardDimension: "150 × 2400 × 65 mm",
    length: 2400,
    width: 150,
    thickness: 65,
    unit: "mm",
    weightKg: 9.6,
    description: "Bottom alignment starter kicker bolted to the concrete slab edge to anchor upper-floor wall panels.",
    manufacturerRef: "KK-KP-1524",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 22. Stop End Panels
  {
    id: "CAT-SEP-2400-200",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan 65mm Standard System",
    panelCategory: "Stop End Panel",
    panelType: "Stop End Panel",
    panelName: "Construction Joint Stop-End Panel",
    panelCode: "SEP-2400-200",
    standardDimension: "2400 × 200 × 65 mm",
    length: 2400,
    width: 200,
    thickness: 65,
    unit: "mm",
    weightKg: 18.2,
    description: "Bulkhead stop-end shutter equipped with rebar comb slots for construction cold joints.",
    manufacturerRef: "MIV-SEP-2420",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 23. Platform / Working Panels
  {
    id: "CAT-PWP-1200-800",
    manufacturer: "Aluma Systems International",
    formworkSystem: "Aluma EasySet 65mm",
    panelCategory: "Platform/Accessory Panel",
    panelType: "Platform/Working Panel",
    panelName: "External Scaffold Working Platform",
    panelCode: "PWP-1200-800",
    standardDimension: "1200 × 800 × 65 mm",
    length: 1200,
    width: 800,
    thickness: 65,
    unit: "mm",
    weightKg: 19.5,
    description: "Perforated non-slip worker access deck panel mounted on external wall climbing brackets.",
    manufacturerRef: "ALU-PWP-1280",
    compatibleAccessories: ["WB-800", "WP-PIN-01", "WEDGE-01"],
    isVerifiedStandard: true,
    isActive: true
  },

  // 24. Special Panels
  {
    id: "CAT-LS-600-2400",
    manufacturer: "Mivan Technology Corp",
    formworkSystem: "Mivan Monolithic High-Rise",
    panelCategory: "Special Panel",
    panelType: "Special Panel",
    panelName: "Quick-Stripping Core Shaft Panel",
    panelCode: "LS-600-2400",
    standardDimension: "600 × 2400 × 65 mm",
    length: 2400,
    width: 600,
    thickness: 65,
    unit: "mm",
    weightKg: 29.5,
    description: "Elevator shaft inner formwork panel configured with crane-lift stripping corners.",
    manufacturerRef: "MIV-LS-2460",
    compatibleAccessories: ["WP-PIN-01", "WEDGE-01", "TR-15", "WN-15", "PPP-2538"],
    isVerifiedStandard: true,
    isActive: true
  }
];


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

// ============================================================================
// VERIFIED CENTRALIZED ALUMINUM FORMWORK ACCESSORIES MASTER CATALOG SEEDS
// ============================================================================
export const INITIAL_ACCESSORY_CATALOG: AccessoryMasterCatalogItem[] = [
  // --- 1. TIE ROD (TIE SYSTEM) ---
  {
    id: "CAT-ACC-TR-15",
    accessoryName: "Tie Rod",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "TR-15",
    standardDimension: "15 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "High-tensile cold-drawn 15mm continuous tie bar with 180kN tensile yield strength for wall shuttering.",
    weightKg: 1.25,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-TR-16",
    accessoryName: "Tie Rod",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "TR-16",
    standardDimension: "16 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "16mm heavy duty formwork tie rod engineered for shear walls and core wall casting with 210kN rating.",
    weightKg: 1.40,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-TR-20",
    accessoryName: "Tie Rod",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "TR-20",
    standardDimension: "20 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "20mm structural tie rod for heavy infrastructure basement retaining walls and double-height podium walls.",
    weightKg: 2.10,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-TR-1517",
    accessoryName: "Tie Rod",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "TR-1517",
    standardDimension: "15/17 mm x 1000 mm",
    unit: "mm",
    manufacturer: "AlumaSystems Global",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "15/17mm x 1.0m threaded tie bar cold-rolled for heavy beam and thick wall formwork holding capacity.",
    weightKg: 1.55,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 2. WING NUT (FASTENER) ---
  {
    id: "CAT-ACC-WN-15",
    accessoryName: "Wing Nut",
    accessoryType: "Fastener",
    accessoryCategory: "Tie System",
    accessoryCode: "WN-15",
    standardDimension: "15 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "Galvanized ductile cast iron 15mm wing nut with 90mm base diameter plate for high clamping torque.",
    weightKg: 0.45,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WN-16",
    accessoryName: "Wing Nut",
    accessoryType: "Fastener",
    accessoryCategory: "Tie System",
    accessoryCode: "WN-16",
    standardDimension: "16 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "16mm heavy wing nut with dual torque ears for rapid pneumatic or manual wrench tightening.",
    weightKg: 0.50,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WN-20",
    accessoryName: "Wing Nut",
    accessoryType: "Fastener",
    accessoryCategory: "Tie System",
    accessoryCode: "WN-20",
    standardDimension: "20 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "20mm heavy duty wing nut for deep civil wall shuttering and transfer beams.",
    weightKg: 0.65,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WN-SW15",
    accessoryName: "Wing Nut",
    accessoryType: "Fastener",
    accessoryCategory: "Tie System",
    accessoryCode: "WN-SW15",
    standardDimension: "15 mm Swivel Flange",
    unit: "mm",
    manufacturer: "Doka Allied Hardware Ltd.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "15mm swivel flange wing nut with self-aligning 12-degree tilt plate for angled formwork.",
    weightKg: 0.72,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 3. PVC CONE (SPACER) ---
  {
    id: "CAT-ACC-PC-22",
    accessoryName: "PVC Cone",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "PC-22",
    standardDimension: "22 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "High-density polymer reusable PVC chamfered sealing cone for 22mm tie rod sleeve pipes.",
    weightKg: 0.04,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-PC-25",
    accessoryName: "PVC Cone",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "PC-25",
    standardDimension: "25 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "25mm heavy polymer tie cone prevents slurry leakage through formwork tie-rod holes.",
    weightKg: 0.05,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-PC-30",
    accessoryName: "PVC Cone",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "PC-30",
    standardDimension: "30 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "30mm heavy waterproof tie sleeve cone for sub-grade basement foundation retaining walls.",
    weightKg: 0.07,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 4. SPACER ---
  {
    id: "CAT-ACC-SP-150",
    accessoryName: "Spacer",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "SP-150",
    standardDimension: "150 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Filler Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "Precision steel internal wall thickness spacer for 150mm standard partition shear walls.",
    weightKg: 0.22,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-SP-200",
    accessoryName: "Spacer",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "SP-200",
    standardDimension: "200 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Filler Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "200mm nominal internal wall spacer with notched ends for rigid panel spacing.",
    weightKg: 0.28,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-SP-250",
    accessoryName: "Spacer",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "SP-250",
    standardDimension: "250 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Filler Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "250mm heavy wall spacer bar for exterior facade shear walls.",
    weightKg: 0.35,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-SP-300",
    accessoryName: "Spacer",
    accessoryType: "Spacer",
    accessoryCategory: "Spacers & Cones",
    accessoryCode: "SP-300",
    standardDimension: "300 mm",
    unit: "mm",
    manufacturer: "AlumaSystems Global",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "300mm structural wall spacer for elevator core shear walls.",
    weightKg: 0.42,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 5. PIN ---
  {
    id: "CAT-ACC-PIN-1650",
    accessoryName: "Pin",
    accessoryType: "Fastener",
    accessoryCategory: "Fasteners & Pins",
    accessoryCode: "PIN-1650",
    standardDimension: "16 × 50 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Slab Panel", "Column Panel", "Beam Panel", "Corner Panel", "Internal Corner", "External Corner", "Soffit Panel", "Deck Panel", "Filler Panel", "Kicker Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 8,
    description: "Forged carbon steel 45# standard 16x50mm round connector pin with slotted eyelet for wedge keys.",
    weightKg: 0.18,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-PIN-1665",
    accessoryName: "Pin",
    accessoryType: "Fastener",
    accessoryCategory: "Fasteners & Pins",
    accessoryCode: "PIN-1665",
    standardDimension: "16 × 65 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Slab Panel", "Column Panel", "Beam Panel", "Corner Panel", "Internal Corner", "External Corner", "Soffit Panel", "Deck Panel", "Filler Panel", "Kicker Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 6,
    description: "Extended 16x65mm connector pin for joining dual-flange panel perimeters and kicker joints.",
    weightKg: 0.22,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-DP-1280",
    accessoryName: "Pin",
    accessoryType: "Fastener",
    accessoryCategory: "Fasteners & Pins",
    accessoryCode: "DP-1280",
    standardDimension: "12 × 80 mm",
    unit: "mm",
    manufacturer: "Doka Allied Hardware Ltd.",
    compatiblePanelTypes: ["Slab Panel", "Deck Panel", "Soffit Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "12x80mm precision deck joint pin for overhead slab deck and soffit panel locking.",
    weightKg: 0.14,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 6. WEDGE PIN ---
  {
    id: "CAT-ACC-WP-1650",
    accessoryName: "Wedge Pin",
    accessoryType: "Fastener",
    accessoryCategory: "Fasteners & Pins",
    accessoryCode: "WP-1650",
    standardDimension: "16 × 50 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Slab Panel", "Column Panel", "Beam Panel", "Corner Panel", "Internal Corner", "External Corner", "Soffit Panel", "Deck Panel", "Filler Panel", "Kicker Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 8,
    description: "Heat-treated hardened 16x50mm wedge pin featuring flat profile head for flush aluminum panel alignment.",
    weightKg: 0.20,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WP-1665",
    accessoryName: "Wedge Pin",
    accessoryType: "Fastener",
    accessoryCategory: "Fasteners & Pins",
    accessoryCode: "WP-1665",
    standardDimension: "16 × 65 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Slab Panel", "Column Panel", "Beam Panel", "Corner Panel", "Internal Corner", "External Corner", "Soffit Panel", "Deck Panel", "Filler Panel", "Kicker Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 6,
    description: "16x65mm long wedge pin engineered for heavy corner keys and column clamp junctions.",
    weightKg: 0.24,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WP-1675",
    accessoryName: "Wedge Pin",
    accessoryType: "Fastener",
    accessoryCategory: "Fasteners & Pins",
    accessoryCode: "WP-1675",
    standardDimension: "16 × 75 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel", "Corner Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "Extra long 16x75mm wedge pin for multiple stacked ribs and architectural recesses.",
    weightKg: 0.28,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 7. ALIGNMENT PIN ---
  {
    id: "CAT-ACC-AP-16",
    accessoryName: "Alignment Pin",
    accessoryType: "Alignment Tool",
    accessoryCategory: "Alignment & Wedges",
    accessoryCode: "AP-16",
    standardDimension: "16 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Corner Panel", "Internal Corner", "External Corner"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "Tapered 16mm alignment drift pin designed for rapid hand-alignment of adjacent panel pin holes.",
    weightKg: 0.19,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-AP-18",
    accessoryName: "Alignment Pin",
    accessoryType: "Alignment Tool",
    accessoryCategory: "Alignment & Wedges",
    accessoryCode: "AP-18",
    standardDimension: "18 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 4,
    description: "Heavy 18mm tapered alignment pin for heavy column shuttering and beam bottom alignments.",
    weightKg: 0.25,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 8. ALIGNMENT WEDGE ---
  {
    id: "CAT-ACC-AW-120",
    accessoryName: "Alignment Wedge",
    accessoryType: "Alignment Tool",
    accessoryCategory: "Alignment & Wedges",
    accessoryCode: "AW-120",
    standardDimension: "120 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Slab Panel", "Column Panel", "Beam Panel", "Corner Panel", "Internal Corner", "External Corner", "Soffit Panel", "Deck Panel", "Filler Panel", "Kicker Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 8,
    description: "Curved drop-forged high-tensile 120mm steel alignment wedge with locking taper groove.",
    weightKg: 0.16,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-AW-140",
    accessoryName: "Alignment Wedge",
    accessoryType: "Alignment Tool",
    accessoryCategory: "Alignment & Wedges",
    accessoryCode: "AW-140",
    standardDimension: "140 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Slab Panel", "Column Panel", "Beam Panel", "Corner Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 8,
    description: "Straight 140mm wedge key engineered for quick mallet locking and rapid stripping.",
    weightKg: 0.19,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-AW-150",
    accessoryName: "Alignment Wedge",
    accessoryType: "Alignment Tool",
    accessoryCategory: "Alignment & Wedges",
    accessoryCode: "AW-150",
    standardDimension: "150 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 8,
    description: "Heavy structural steel wedge with knurled non-slip surface for vibration-resistant locking.",
    weightKg: 0.23,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 9. PUSH PULL PROP (SUPPORT PROP) ---
  {
    id: "CAT-ACC-PPP-1525",
    accessoryName: "Push Pull Prop",
    accessoryType: "Support Prop",
    accessoryCategory: "Support & Props",
    accessoryCode: "PPP-1525",
    standardDimension: "1500 - 2500 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Kicker Panel", "Platform/Accessory Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "Dual-threaded telescopic push-pull prop for fine plumb vertical alignment of wall and column formwork.",
    weightKg: 12.5,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-PPP-2240",
    accessoryName: "Push Pull Prop",
    accessoryType: "Support Prop",
    accessoryCategory: "Support & Props",
    accessoryCode: "PPP-2240",
    standardDimension: "2200 - 4000 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "Heavy-duty 4.0m telescopic brace prop with swivel baseplates and micro-adjustment turnbuckle.",
    weightKg: 18.2,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-PPP-2538",
    accessoryName: "Push Pull Prop",
    accessoryType: "Support Prop",
    accessoryCategory: "Support & Props",
    accessoryCode: "PPP-2538",
    standardDimension: "2500 - 3800 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Slab Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "Standard industrial shoring prop with quick-release pin and galvanized tubular steel construction.",
    weightKg: 15.6,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 10. TIE / FORMWORK TIE / FLAT TIE ---
  {
    id: "CAT-ACC-FT-150",
    accessoryName: "Tie",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "FT-150",
    standardDimension: "150 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Filler Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "Nominal 150mm aluminum formwork flat tie engineered for partition walls with pre-drilled pin slots.",
    weightKg: 0.22,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-FT-200",
    accessoryName: "Tie",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "FT-200",
    standardDimension: "200 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Filler Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "200kN tensile capacity break-back flat tie for 200mm standard exterior and interior shear walls.",
    weightKg: 0.28,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-FT-250",
    accessoryName: "Tie",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "FT-250",
    standardDimension: "250 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "Heavy 250mm flat tie designed for thick residential perimeter shear walls.",
    weightKg: 0.34,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-FT-300",
    accessoryName: "Tie",
    accessoryType: "Formwork Tie",
    accessoryCategory: "Tie System",
    accessoryCode: "FT-300",
    standardDimension: "300 mm",
    unit: "mm",
    manufacturer: "AlumaSystems Global",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "Heavy 300mm structural tie for high-pressure shear wall concrete pours.",
    weightKg: 0.42,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 11. WALLER / WALER BRACKET ---
  {
    id: "CAT-ACC-WB-100",
    accessoryName: "Waller",
    accessoryType: "Waler Bracket",
    accessoryCategory: "Wallers & Stiffeners",
    accessoryCode: "WB-100",
    standardDimension: "100 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "100mm waler clamp bracket for securing horizontal stiffener channels across panel joints.",
    weightKg: 1.85,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WB-150",
    accessoryName: "Waller",
    accessoryType: "Waler Bracket",
    accessoryCategory: "Wallers & Stiffeners",
    accessoryCode: "WB-150",
    standardDimension: "150 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "150mm heavy waler bracket for double-C channel reinforcement on high-clearance walls.",
    weightKg: 2.30,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WAL-2000",
    accessoryName: "Waller",
    accessoryType: "Waler Stiffener",
    accessoryCategory: "Wallers & Stiffeners",
    accessoryCode: "WAL-2000",
    standardDimension: "2000 mm",
    unit: "mm",
    manufacturer: "AlumaSystems Global",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "2.0-meter 6061-T6 extruded aluminum square box waler beam for horizontal alignment.",
    weightKg: 8.40,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 12. CLAMP ---
  {
    id: "CAT-ACC-CL-65",
    accessoryName: "Clamp",
    accessoryType: "Formwork Clamp",
    accessoryCategory: "Brackets & Clamps",
    accessoryCode: "CL-65",
    standardDimension: "65 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Column Panel", "Beam Panel", "Corner Panel", "Kicker Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "Heavy forged B-clamp for clamping 65mm aluminum profile flanges together securely.",
    weightKg: 1.10,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-CL-80",
    accessoryName: "Clamp",
    accessoryType: "Formwork Clamp",
    accessoryCategory: "Brackets & Clamps",
    accessoryCode: "CL-80",
    standardDimension: "80 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Column Panel", "Wall Panel", "Standard Wall Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "80mm quick-wedge clamp for column shuttering and cantilever edge formwork.",
    weightKg: 1.45,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-CL-100",
    accessoryName: "Clamp",
    accessoryType: "Formwork Clamp",
    accessoryCategory: "Brackets & Clamps",
    accessoryCode: "CL-100",
    standardDimension: "100 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Column Panel", "Beam Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "100mm heavy adjustable external column clamp for high-lateral-pressure concrete pours.",
    weightKg: 1.85,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 13. BRACKET ---
  {
    id: "CAT-ACC-BK-300",
    accessoryName: "Bracket",
    accessoryType: "Alignment Bracket",
    accessoryCategory: "Brackets & Clamps",
    accessoryCode: "BK-300",
    standardDimension: "300 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Beam Panel", "Column Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "300mm structural wall alignment bracket with micro-leveling jacking screw.",
    weightKg: 2.40,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-BK-800",
    accessoryName: "Bracket",
    accessoryType: "Platform Bracket",
    accessoryCategory: "Platform Accessories",
    accessoryCode: "BK-800",
    standardDimension: "800 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Wall Panel", "Standard Wall Panel", "Platform/Accessory Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "800mm cantilever scaffold working platform bracket with integrated safety guardrail socket.",
    weightKg: 5.20,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-KB-500",
    accessoryName: "Bracket",
    accessoryType: "Kicker Bracket",
    accessoryCategory: "Brackets & Clamps",
    accessoryCode: "KB-500",
    standardDimension: "500 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Kicker Panel", "Wall Panel", "Standard Wall Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "500mm bottom kicker alignment bracket for starting lower-floor wall panels rigidly.",
    weightKg: 3.10,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 14. CORNER ACCESSORIES ---
  {
    id: "CAT-ACC-CK-2525",
    accessoryName: "Corner Accessories",
    accessoryType: "Corner Key",
    accessoryCategory: "Corner Accessories",
    accessoryCode: "CK-2525",
    standardDimension: "25 × 25 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Corner Panel", "Internal Corner", "External Corner", "Wall Panel", "Standard Wall Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "25x25mm internal corner key angle with pre-punched pin slots for right-angle wall intersections.",
    weightKg: 0.65,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-CK-5050",
    accessoryName: "Corner Accessories",
    accessoryType: "Corner Key",
    accessoryCategory: "Corner Accessories",
    accessoryCode: "CK-5050",
    standardDimension: "50 × 50 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Corner Panel", "External Corner", "Wall Panel", "Standard Wall Panel", "Column Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "50x50mm heavy external corner key for outer building perimeter and shear wall transitions.",
    weightKg: 0.95,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-ECK-100",
    accessoryName: "Corner Accessories",
    accessoryType: "Corner Fillet",
    accessoryCategory: "Corner Accessories",
    accessoryCode: "ECK-100",
    standardDimension: "100 × 100 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Corner Panel", "Internal Corner", "External Corner", "Column Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 2,
    description: "100x100mm architectural chamfer fillet strip for crisp concrete beveled corners.",
    weightKg: 1.30,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 15. PLATFORM ACCESSORIES ---
  {
    id: "CAT-ACC-HP-1000",
    accessoryName: "Platform Accessories",
    accessoryType: "Safety Post",
    accessoryCategory: "Platform Accessories",
    accessoryCode: "HP-1000",
    standardDimension: "1000 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Platform/Accessory Panel", "Wall Panel", "Standard Wall Panel", "Slab Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "1.0-meter OSHA/HSE compliant perimeter safety handrail post with dual barrier cable hooks.",
    weightKg: 4.20,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-WB-8012",
    accessoryName: "Platform Accessories",
    accessoryType: "Platform Plank",
    accessoryCategory: "Platform Accessories",
    accessoryCode: "WB-8012",
    standardDimension: "800 × 1200 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Platform/Accessory Panel", "Wall Panel", "Standard Wall Panel", "Special Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "Perforated non-slip aluminum working platform plank with integrated bracket clips.",
    weightKg: 6.50,
    isVerifiedStandard: true,
    isActive: true
  },

  // --- 16. SUPPORT ACCESSORIES ---
  {
    id: "CAT-ACC-DH-150",
    accessoryName: "Support Accessories",
    accessoryType: "Drop Head",
    accessoryCategory: "Support & Props",
    accessoryCode: "DH-150",
    standardDimension: "150 mm",
    unit: "mm",
    manufacturer: "Mivan Technology Corp",
    compatiblePanelTypes: ["Soffit Panel", "Slab Panel", "Deck Panel", "Beam Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "Early-stripping drop head mechanism allowing deck panel stripping within 36 hours while keeping props intact.",
    weightKg: 3.80,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-PH-200",
    accessoryName: "Support Accessories",
    accessoryType: "Prop Head",
    accessoryCategory: "Support & Props",
    accessoryCode: "PH-200",
    standardDimension: "200 mm",
    unit: "mm",
    manufacturer: "Kumkang Kind Formwork",
    compatiblePanelTypes: ["Beam Panel", "Soffit Panel", "Slab Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "Cantilever beam prop head with locking pin for perimeter spandrel beam soffits.",
    weightKg: 4.10,
    isVerifiedStandard: true,
    isActive: true
  },
  {
    id: "CAT-ACC-UJ-600",
    accessoryName: "Support Accessories",
    accessoryType: "Jack Base",
    accessoryCategory: "Support & Props",
    accessoryCode: "UJ-600",
    standardDimension: "600 mm",
    unit: "mm",
    manufacturer: "Geto Aluminum Formwork Co.",
    compatiblePanelTypes: ["Slab Panel", "Soffit Panel", "Deck Panel", "Beam Panel", "Wall Panel", "Standard Wall Panel"],
    compatiblePanelCodes: ["ALL"],
    defaultQtyRatioPerPanel: 1,
    description: "600mm heavy threaded hollow screw jack base with forged cast handle for floor height leveling.",
    weightKg: 5.50,
    isVerifiedStandard: true,
    isActive: true
  }
];

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
          unit: (m.unit as "mm" | "m") || "mm",
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

  // --- 1.1 EXACT CASCADING HIERARCHICAL METHODS (PROMPT 2 & 3) ---

  // Level 1: Get Categories
  static async getCategories(): Promise<string[]> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const set = new Set<string>();
    INITIAL_PANEL_TYPES.forEach(t => set.add(t.category));
    catalog.forEach(c => {
      if (c.panelCategory) set.add(c.panelCategory);
    });
    return Array.from(set).sort();
  }

  // Level 2: Get Panel Types for Category
  static async getPanelTypesForCategory(category: string): Promise<string[]> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const set = new Set<string>();
    INITIAL_PANEL_TYPES.filter(t => !category || category === "ALL" || t.category === category).forEach(t => set.add(t.name));
    catalog.filter(c => !category || category === "ALL" || c.panelCategory === category).forEach(c => {
      if (c.panelType) set.add(c.panelType);
    });
    return Array.from(set).sort();
  }

  // Level 3: Get Panel Names for Category & Panel Type
  static async getPanelNamesForType(category: string, panelType: string): Promise<string[]> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const set = new Set<string>();
    catalog
      .filter(c => (!category || category === "ALL" || c.panelCategory === category) &&
                   (!panelType || panelType === "ALL" || c.panelType === panelType))
      .forEach(c => {
        if (c.panelName) set.add(c.panelName);
      });
    if (set.size === 0 && panelType && panelType !== "ALL") {
      set.add(`${panelType} Standard`);
    }
    return Array.from(set).sort();
  }

  // Level 4: Get Manufacturers and Formwork Systems for selected Panel
  static async getManufacturersForPanel(
    category: string,
    panelType: string,
    panelName?: string
  ): Promise<Array<{ manufacturer: string; formworkSystem?: string }>> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const matches = catalog.filter(c => {
      if (category && category !== "ALL" && c.panelCategory !== category) return false;
      if (panelType && panelType !== "ALL" && c.panelType !== panelType) return false;
      if (panelName && panelName !== "ALL" && c.panelName && c.panelName !== panelName) return false;
      return true;
    });

    const mfrMap = new Map<string, { manufacturer: string; formworkSystem?: string }>();
    matches.forEach(m => {
      const key = `${m.manufacturer}||${m.formworkSystem || ""}`;
      if (!mfrMap.has(key)) {
        mfrMap.set(key, { manufacturer: m.manufacturer, formworkSystem: m.formworkSystem });
      }
    });

    if (mfrMap.size === 0) {
      INITIAL_MANUFACTURERS.forEach(m => {
        mfrMap.set(`${m.name}||${m.formworkSystems[0]}`, { manufacturer: m.name, formworkSystem: m.formworkSystems[0] });
      });
    }

    return Array.from(mfrMap.values());
  }

  // Level 5: Get Dimensions for Selection
  static async getDimensionsForSelection(
    category: string,
    panelType: string,
    panelName?: string,
    manufacturer?: string,
    formworkSystem?: string
  ): Promise<Array<{
    standardDimension: string;
    length: number;
    width: number;
    thickness: number;
    height?: number;
    unit: string;
    weightKg?: number;
    isVerifiedStandard: boolean;
  }>> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    const matches = catalog.filter(c => {
      if (category && category !== "ALL" && c.panelCategory !== category) return false;
      if (panelType && panelType !== "ALL" && c.panelType !== panelType) return false;
      if (panelName && panelName !== "ALL" && c.panelName && c.panelName !== panelName) return false;
      if (manufacturer && manufacturer !== "ALL" && c.manufacturer !== manufacturer) return false;
      if (formworkSystem && formworkSystem !== "ALL" && c.formworkSystem && c.formworkSystem !== formworkSystem) return false;
      return true;
    });

    const dimMap = new Map<string, {
      standardDimension: string;
      length: number;
      width: number;
      thickness: number;
      height?: number;
      unit: string;
      weightKg?: number;
      isVerifiedStandard: boolean;
    }>();

    matches.forEach(m => {
      const key = m.standardDimension || `${m.length} × ${m.width} × ${m.thickness} ${m.unit}`;
      if (!dimMap.has(key)) {
        dimMap.set(key, {
          standardDimension: key,
          length: m.length,
          width: m.width,
          thickness: m.thickness,
          height: m.height,
          unit: m.unit || "mm",
          weightKg: m.weightKg,
          isVerifiedStandard: !!m.isVerifiedStandard
        });
      }
    });

    return Array.from(dimMap.values()).sort((a, b) => b.width - a.width || b.length - a.length);
  }

  // Level 6: Get Panel Codes and Complete Master Records
  static async getCodesForSelection(
    category: string,
    panelType: string,
    panelName?: string,
    manufacturer?: string,
    dimensionStr?: string,
    formworkSystem?: string
  ): Promise<PanelMasterCatalogItem[]> {
    const catalog = await this.getPanelCatalog({ activeOnly: true });
    return catalog.filter(c => {
      if (category && category !== "ALL" && c.panelCategory !== category) return false;
      if (panelType && panelType !== "ALL" && c.panelType !== panelType) return false;
      if (panelName && panelName !== "ALL" && c.panelName && c.panelName !== panelName) return false;
      if (manufacturer && manufacturer !== "ALL" && c.manufacturer !== manufacturer) return false;
      if (formworkSystem && formworkSystem !== "ALL" && c.formworkSystem && c.formworkSystem !== formworkSystem) return false;
      if (dimensionStr && dimensionStr !== "ALL" && c.standardDimension !== dimensionStr) return false;
      return true;
    });
  }

  // Level 7: Get Compatible Accessories based on panelCode, panelType, and manufacturer
  static async getCompatibleAccessoriesForPanel(
    panelCode: string,
    panelType?: string,
    manufacturer?: string
  ): Promise<AccessoryMasterCatalogItem[]> {
    const accCatalog = await this.getAccessoryCatalog({ activeOnly: true });
    const panelCatalog = await this.getPanelCatalog();
    const panel = panelCatalog.find(p => p.panelCode === panelCode);

    if (panel && panel.compatibleAccessories && panel.compatibleAccessories.length > 0) {
      const explicitCodes = new Set(panel.compatibleAccessories.map(c => c.toUpperCase().trim()));
      const matches = accCatalog.filter(a => explicitCodes.has(a.accessoryCode.toUpperCase().trim()));
      if (matches.length > 0) return matches;
    }

    return this.getCompatibleAccessories(panelType || (panel ? panel.panelType : ""), panelCode);
  }

  // --- 1.1.2 MASTER DATA MANAGEMENT & DUPLICATE CHECKS (PROMPT 12 & 13) ---
  static async checkDuplicatePanelCode(
    panelCode: string,
    manufacturer: string,
    formworkSystem?: string,
    excludeId?: string
  ): Promise<boolean> {
    const catalog = await this.getPanelCatalog();
    const targetCode = panelCode.trim().toUpperCase();
    const targetMfr = manufacturer.trim().toLowerCase();
    const targetSys = (formworkSystem || "").trim().toLowerCase();

    return catalog.some(item => {
      if (excludeId && item.id === excludeId) return false;
      const matchCode = item.panelCode.trim().toUpperCase() === targetCode;
      const matchMfr = item.manufacturer.trim().toLowerCase() === targetMfr;
      const matchSys = !targetSys || !item.formworkSystem || item.formworkSystem.trim().toLowerCase() === targetSys;
      return matchCode && matchMfr && matchSys;
    });
  }

  static async findSimilarPanels(
    panelType: string,
    length: number,
    width: number,
    manufacturer?: string
  ): Promise<PanelMasterCatalogItem[]> {
    const catalog = await this.getPanelCatalog();
    return catalog.filter(item => {
      const typeMatch = item.panelType.toLowerCase() === panelType.toLowerCase();
      const lengthMatch = Math.abs(item.length - length) <= 100;
      const widthMatch = Math.abs(item.width - width) <= 50;
      const mfrMatch = !manufacturer || item.manufacturer.toLowerCase() === manufacturer.toLowerCase();
      return typeMatch && lengthMatch && widthMatch && mfrMatch;
    });
  }

  static async addPanelType(name: string, category: string, description?: string): Promise<void> {
    const newType: MasterPanelTypeRecord = {
      id: `PT-CUSTOM-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      category: category.trim(),
      description: description?.trim() || `Configurable panel type for ${name.trim()}`,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    await DbService.writeDocument<MasterPanelTypeRecord>("panelTypes", newType, INITIAL_PANEL_TYPES);
  }

  static async addManufacturer(name: string, formworkSystems: string[], country = "Global", contactInfo?: string): Promise<void> {
    const newMfr: MasterManufacturerRecord = {
      id: `MFR-${name.replace(/[^A-Za-z0-9]/g, "-").toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      formworkSystems: formworkSystems.length ? formworkSystems : [`${name.trim()} Standard System`],
      country: country.trim(),
      contactInfo: contactInfo?.trim() || "",
      isActive: true,
      createdAt: new Date().toISOString()
    };
    await DbService.writeDocument<MasterManufacturerRecord>("manufacturers", newMfr, INITIAL_MANUFACTURERS);
  }

  static async addDimension(
    panelType: string,
    manufacturer: string,
    length: number,
    width: number,
    thickness: number,
    unit = "mm",
    formworkSystem?: string
  ): Promise<void> {
    const newDim: MasterPanelDimensionRecord = {
      id: `DIM-${Date.now().toString().slice(-6)}`,
      panelType,
      manufacturer,
      formworkSystem,
      length,
      width,
      thickness,
      unit,
      formatted: `${length} × ${width} × ${thickness} ${unit}`,
      isActive: true
    };
    await DbService.writeDocument<MasterPanelDimensionRecord>("panelDimensions", newDim, []);
  }

  // Transaction-based inventory recording (Prompt 14)
  static async recordStockTransaction(tx: StockTransactionRecord): Promise<void> {
    const fullTx: StockTransactionRecord = {
      ...tx,
      id: tx.id || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: tx.timestamp || new Date().toISOString()
    };
    await DbService.writeDocument<StockTransactionRecord>("stockTransactions", fullTx, []);
    try {
      await DbService.addAuditLog({
        id: `LOG-TX-${Date.now().toString().slice(-6)}`,
        action: `Inventory ${tx.transactionType}: ${tx.panelCode}`,
        userId: tx.performedBy || "System User",
        userName: tx.performedBy || "System User",
        userRole: (tx.performedByRole as any) || "Warehouse Manager",
        timestamp: new Date().toISOString(),
        details: `${tx.transactionType} ${tx.quantity} units of ${tx.panelCode} (${tx.panelType}) at ${tx.warehouseName || tx.fromLocation} -> ${tx.toLocation}.`,
        severity: tx.transactionType === "DAMAGE" ? "Warning" : "Info",
        category: "Material / Store"
      });
    } catch (e) {
      console.warn("Audit log notice:", e);
    }
  }

  static async getStockTransactions(filters?: {
    panelCode?: string;
    warehouseId?: string;
    transactionType?: string;
  }): Promise<StockTransactionRecord[]> {
    const all = await DbService.fetchCollection<StockTransactionRecord>("stockTransactions", []);
    return all.filter(t => {
      if (filters?.panelCode && t.panelCode !== filters.panelCode) return false;
      if (filters?.warehouseId && t.warehouseId !== filters.warehouseId) return false;
      if (filters?.transactionType && t.transactionType !== filters.transactionType) return false;
      return true;
    });
  }

  // --- 1.2 CENTRALIZED ACCESSORIES MASTER CATALOG ---

  static async getAccessoryCatalog(filters?: {
    category?: string;
    manufacturer?: string;
    searchTerm?: string;
    activeOnly?: boolean;
  }): Promise<AccessoryMasterCatalogItem[]> {
    try {
      const items = await DbService.fetchCollection<AccessoryMasterCatalogItem>(
        "accessoryMasterCatalog",
        INITIAL_ACCESSORY_CATALOG
      );

      return items.filter(item => {
        if (filters?.activeOnly && item.isActive === false) return false;
        if (filters?.category && filters.category !== "ALL" && item.accessoryCategory !== filters.category) return false;
        if (filters?.manufacturer && filters.manufacturer !== "ALL" && item.manufacturer !== filters.manufacturer) return false;
        if (filters?.searchTerm && filters.searchTerm.trim()) {
          const q = filters.searchTerm.toLowerCase().trim();
          const matchName = (item.accessoryName || "").toLowerCase().includes(q);
          const matchCode = (item.accessoryCode || "").toLowerCase().includes(q);
          const matchType = (item.accessoryType || "").toLowerCase().includes(q);
          const matchCat = (item.accessoryCategory || "").toLowerCase().includes(q);
          const matchDim = (item.standardDimension || "").toLowerCase().includes(q);
          const matchMfr = (item.manufacturer || "").toLowerCase().includes(q);
          if (!matchName && !matchCode && !matchType && !matchCat && !matchDim && !matchMfr) return false;
        }
        return true;
      });
    } catch (e) {
      console.warn("[MasterDataService.getAccessoryCatalog] Falling back to initial catalog", e);
      return INITIAL_ACCESSORY_CATALOG;
    }
  }

  static async saveAccessoryItem(item: AccessoryMasterCatalogItem): Promise<void> {
    const enriched: AccessoryMasterCatalogItem = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    await DbService.writeDocument<AccessoryMasterCatalogItem>(
      "accessoryMasterCatalog",
      enriched,
      INITIAL_ACCESSORY_CATALOG
    );
  }

  static async deleteAccessoryItem(id: string): Promise<void> {
    try {
      await DbService.removeDocument<AccessoryMasterCatalogItem>(
        "accessoryMasterCatalog",
        id,
        INITIAL_ACCESSORY_CATALOG
      );
    } catch (e) {
      console.warn("[MasterDataService.deleteAccessoryItem] Error deleting:", e);
    }
  }

  /**
   * Panel -> Accessory Compatibility Filter:
   * When user selects Panel Type (e.g. Wall Panel, WP-600-2400),
   * automatically display compatible accessories.
   * If showAll is true, returns all active accessories.
   */
  static async getCompatibleAccessories(
    panelTypeName: string,
    panelCode?: string,
    showAll = false
  ): Promise<AccessoryMasterCatalogItem[]> {
    const catalog = await this.getAccessoryCatalog({ activeOnly: true });
    if (showAll || !panelTypeName) {
      return catalog;
    }

    const normPanel = panelTypeName.toLowerCase().trim();

    return catalog.filter(acc => {
      // 1. Check panel types
      const types = (acc.compatiblePanelTypes || []).map(t => t.toLowerCase().trim());
      if (types.includes("all")) return true;

      const directTypeMatch = types.some(t => {
        return normPanel.includes(t) || t.includes(normPanel) || (normPanel.includes("wall") && t.includes("wall"));
      });

      if (!directTypeMatch) return false;

      // 2. Check panel code if specified
      if (panelCode && acc.compatiblePanelCodes && acc.compatiblePanelCodes.length > 0) {
        const codes = acc.compatiblePanelCodes.map(c => c.toUpperCase().trim());
        if (codes.includes("ALL")) return true;
        const normCode = panelCode.toUpperCase().trim();
        return codes.includes(normCode);
      }

      return true;
    });
  }

  /**
   * Cascading Selection:
   * Level 1 -> Distinct Accessory Names for the selected compatible set
   */
  static getDistinctAccessoryNames(compatibleItems: AccessoryMasterCatalogItem[]): string[] {
    const set = new Set<string>();
    for (const item of compatibleItems) {
      if (item.accessoryName) set.add(item.accessoryName);
    }
    return Array.from(set).sort();
  }

  /**
   * Level 2 -> Accessory Types for selected Accessory Name
   */
  static getAccessoryTypesForName(
    accessoryName: string,
    compatibleItems: AccessoryMasterCatalogItem[]
  ): string[] {
    const set = new Set<string>();
    for (const item of compatibleItems) {
      if (item.accessoryName.toLowerCase() === accessoryName.toLowerCase() && item.accessoryType) {
        set.add(item.accessoryType);
      }
    }
    return Array.from(set).sort();
  }

  /**
   * Level 3 -> Standard Dimensions for selected Accessory Name & Type
   */
  static getAccessoryDimensionsForNameAndType(
    accessoryName: string,
    accessoryType?: string,
    compatibleItems: AccessoryMasterCatalogItem[] = []
  ): string[] {
    const set = new Set<string>();
    for (const item of compatibleItems) {
      const matchName = item.accessoryName.toLowerCase() === accessoryName.toLowerCase();
      const matchType = !accessoryType || item.accessoryType.toLowerCase() === accessoryType.toLowerCase();
      if (matchName && matchType && item.standardDimension) {
        set.add(item.standardDimension);
      }
    }
    return Array.from(set);
  }

  /**
   * Level 4 -> Accessory Code & Complete Item for selected Name, Dimension, and Type
   */
  static getAccessoryCodesForSelection(
    accessoryName: string,
    dimension: string,
    accessoryType?: string,
    compatibleItems: AccessoryMasterCatalogItem[] = []
  ): AccessoryMasterCatalogItem[] {
    return compatibleItems.filter(item => {
      const matchName = item.accessoryName.toLowerCase() === accessoryName.toLowerCase();
      const matchDim = (item.standardDimension || "").toLowerCase() === (dimension || "").toLowerCase();
      const matchType = !accessoryType || item.accessoryType.toLowerCase() === accessoryType.toLowerCase();
      return matchName && matchDim && matchType;
    });
  }

  static getAccessoryBySelection(
    accessoryName: string,
    dimension: string,
    code?: string,
    compatibleItems: AccessoryMasterCatalogItem[] = []
  ): AccessoryMasterCatalogItem | undefined {
    return compatibleItems.find(item => {
      const matchName = item.accessoryName.toLowerCase() === accessoryName.toLowerCase();
      const matchDim = (item.standardDimension || "").toLowerCase() === (dimension || "").toLowerCase();
      const matchCode = !code || item.accessoryCode.toLowerCase() === code.toLowerCase();
      return matchName && matchDim && matchCode;
    });
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
