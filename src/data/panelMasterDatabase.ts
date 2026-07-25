import * as XLSX from "xlsx";

export interface MasterPanelRecord {
  panelId: string;
  panelCode: string;
  panelName: string;
  category: string;
  panelType: string;
  description: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  areaM2: number;
  weightKg: number;
  material: string;
  surfaceFinish: string;
  compatibleAccessories: string;
  bundleQuantity: number;
  bundleWeightKg: number;
  barcode: string;
  qrCode: string;
  serialNumber: string;
  status: string;
  manufacturer: string;
  notes: string;
}

export const MASTER_CATEGORIES = [
  "Internal Wall Panels",
  "External Wall Panels",
  "Extend Wall Panels",
  "Beam Side Panels",
  "Beam Bottom Panels",
  "Beam Panels",
  "Beam Extension Panels",
  "Slab Panels",
  "Soffit Panels",
  "Deck Panels",
  "Column Panels",
  "Internal Corner Panels",
  "External Corner Panels",
  "Kicker Panels",
  "Closure Panels",
  "Filler Panels",
  "Rocker Panels",
  "Drop Head Panels",
  "Prop Head Panels",
  "Deck Beam Panels",
  "Stair Panels",
  "Stair Formwork Panels",
  "Lift Shaft Panels",
  "Bulkhead Panels",
  "Edge Panels",
] as const;

export const MASTER_WIDTHS = [
  50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425,
  450, 475, 500, 525, 550, 575, 600,
] as const;

export const MASTER_HEIGHTS = [
  150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900,
  950, 1000, 1050, 1100, 1150, 1200, 1500, 1800, 2100, 2400,
] as const;

const CATEGORY_PREFIX_MAP: Record<string, string> = {
  "Internal Wall Panels": "IWP",
  "External Wall Panels": "EWP",
  "Extend Wall Panels": "EXW",
  "Beam Side Panels": "BS",
  "Beam Bottom Panels": "BB",
  "Beam Panels": "BP",
  "Beam Extension Panels": "BEX",
  "Slab Panels": "SP",
  "Soffit Panels": "SO",
  "Deck Panels": "DP",
  "Column Panels": "CP",
  "Internal Corner Panels": "IC",
  "External Corner Panels": "EC",
  "Kicker Panels": "KP",
  "Closure Panels": "CL",
  "Filler Panels": "FP",
  "Rocker Panels": "RP",
  "Drop Head Panels": "DH",
  "Prop Head Panels": "PH",
  "Deck Beam Panels": "DB",
  "Stair Panels": "ST",
  "Stair Formwork Panels": "STF",
  "Lift Shaft Panels": "LS",
  "Bulkhead Panels": "BH",
  "Edge Panels": "EP",
  "Wall Panels": "WP",
};

const CATEGORY_PANEL_TYPES_MAP: Record<string, string[]> = {
  "Internal Wall Panels": [
    "Standard Internal Wall Panel",
    "Single Tie-Hole Internal Panel",
    "Double Tie-Hole Internal Panel",
    "Door Opening Internal Wall Panel",
    "Internal Corridor Wall Panel",
    "Partition Junction Internal Panel",
  ],
  "External Wall Panels": [
    "Standard External Wall Panel",
    "Heavy-Duty Exterior Wall Panel",
    "High-Pressure Weatherproof Outer Panel",
    "Kicker Flange External Panel",
    "Window Opening External Panel",
    "Facade Perimeter Shear Panel",
  ],
  "Extend Wall Panels": [
    "Vertical Wall Extension Panel",
    "High-Story Extension Joint Panel",
    "Parapet Height Extension Panel",
  ],
  "Beam Side Panels": [
    "Standard Beam Side Panel",
    "Deep Beam Side Form Panel",
    "T-Beam Junction Side Panel",
  ],
  "Beam Bottom Panels": [
    "Standard Beam Bottom Soffit Panel",
    "Heavy Girder Bottom Panel",
    "Adjustable Width Beam Soffit",
  ],
  "Beam Panels": [
    "Integrated Monolithic Beam Panel",
    "Drop-Beam Interface Panel",
    "Transfer Girder Beam Panel",
  ],
  "Beam Extension Panels": [
    "Beam Length Extension Panel",
    "Variable Span Beam Extension",
    "Cantilever Beam Extension Panel",
  ],
  "Slab Panels": [
    "Standard Slab Decking Panel",
    "Prop-Head Interface Slab Panel",
    "Corner Slab Panel",
  ],
  "Soffit Panels": [
    "Standard Slab Soffit Panel",
    "Corner Soffit Panel",
    "Early Stripping Soffit Panel",
  ],
  "Deck Panels": [
    "Standard Decking Panel",
    "High-Load Deck Panel",
    "Interlocking Deck Panel",
  ],
  "Column Panels": [
    "Standard Adjustable Column Panel",
    "Heavy-Duty Column Form Panel",
    "Square Column Panel",
  ],
  "Internal Corner Panels": [
    "Standard Internal Corner Panel",
    "90 Degree Right-Angle Corner",
    "Variable Angle Internal Corner",
  ],
  "External Corner Panels": [
    "Standard External Corner Panel",
    "High-Rigidity Outer Corner Angle",
    "Chamfered External Corner",
  ],
  "Kicker Panels": [
    "Standard Wall Kicker Panel",
    "Starter Footing Kicker Panel",
    "Perimeter Alignment Kicker",
  ],
  "Closure Panels": [
    "End Closure Panel",
    "Slab Edge Closure Panel",
    "Beam End Closure Form",
  ],
  "Filler Panels": [
    "Standard Filler Compensation Panel",
    "Tapered Gap Filler Panel",
    "Adjustable Slide Filler Panel",
  ],
  "Rocker Panels": [
    "Standard Bottom Rocker Panel",
    "Wall Alignment Rocker Panel",
    "Adjustable Angle Rocker Panel",
  ],
  "Drop Head Panels": [
    "Standard Quick-Release Drop Head Panel",
    "Early Stripping Drop Head Form",
    "Heavy-Shoring Drop Head Panel",
  ],
  "Prop Head Panels": [
    "Standard Shoring Prop Head Panel",
    "High-Load Prop Head Interface",
    "Universal Joint Prop Head Panel",
  ],
  "Deck Beam Panels": [
    "Primary Deck Support Beam Panel",
    "Secondary Joist Deck Beam Panel",
    "Telescopic Deck Beam Form",
  ],
  "Stair Panels": [
    "Stair Tread Panel",
    "Stair Riser Panel",
    "Stair Landing Panel",
    "Stair Landing Beam Panel",
    "Stair Landing Soffit Panel",
    "Stair Side Panel (Left)",
    "Stair Side Panel (Right)",
    "Stair Waist Slab Panel",
    "Stair Edge Panel",
    "Stair Nosing Panel",
    "Stair Internal Corner Panel",
    "Stair External Corner Panel",
    "Stair Closure Panel",
    "Stair Filler Panel",
    "Stair Beam Side Panel",
    "Stair Beam Bottom Panel",
    "Stair Kick Panel",
    "Stair Bulkhead Panel",
    "Stair End Panel",
    "Stair Transition Panel",
  ],
  "Stair Formwork Panels": [
    "Stair Tread Panel",
    "Stair Riser Panel",
    "Stair Landing Panel",
    "Stair Landing Beam Panel",
    "Stair Landing Soffit Panel",
    "Stair Side Panel (Left)",
    "Stair Side Panel (Right)",
    "Stair Waist Slab Panel",
    "Stair Edge Panel",
    "Stair Nosing Panel",
    "Stair Internal Corner Panel",
    "Stair External Corner Panel",
    "Stair Closure Panel",
    "Stair Filler Panel",
    "Stair Beam Side Panel",
    "Stair Beam Bottom Panel",
    "Stair Kick Panel",
    "Stair Bulkhead Panel",
    "Stair End Panel",
    "Stair Transition Panel",
  ],
  "Lift Shaft Panels": [
    "Elevator Shaft Wall Panel",
    "Quick-Stripping Core Shaft Panel",
    "Telescopic Lift Shaft Core Form",
  ],
  "Bulkhead Panels": [
    "Construction Joint Bulkhead Panel",
    "Stop-End Mesh Pass Bulkhead",
    "Slab Pour Bulkhead Form",
  ],
  "Edge Panels": [
    "Slab Edge Stop Panel",
    "Cantilever Edge Protection Form",
    "Balcony Edge Profile Panel",
  ],
};

const CATEGORY_ACCESSORIES_MAP: Record<string, string> = {
  "Internal Wall Panels": "Flat Tie, Pin & Wedge 16mm, Alignment Coupler, Wall Tie Nut, Turnbuckle Prop",
  "External Wall Panels": "Flat Tie, Heavy Wedge, External Corner Bracket, Kicker Clamp, Alignment Beam",
  "Extend Wall Panels": "Extension Bolt, Vertical Alignment Bracket, Coupling Pin, Flat Tie",
  "Beam Side Panels": "Beam Clamp, Tie Rod 15/17mm, Wing Nut, Wedge Pin",
  "Beam Bottom Panels": "Heavy Support Prop, U-Head Jack, High-Tensile Wedge",
  "Beam Panels": "Beam Bracing Angle, Heavy Tie Rod, Coupler Pin",
  "Beam Extension Panels": "Extension Coupler, Beam Splice Plate, High-Tensile Wedge",
  "Slab Panels": "Deck Pin, Prop Head Adaptor, Alignment Beam, Slab Tie",
  "Soffit Panels": "Soffit Length Corner, Adjustable Prop, Locking Pin",
  "Deck Panels": "Deck Beam, Prop Support, Joint Pin, Early Stripping Latch",
  "Column Panels": "Column Clamps, Yoke Clamp, Pin & Wedge, Corner Stiffener",
  "Internal Corner Panels": "Corner Key, Pin & Wedge, Turnbuckle Push-Pull Prop",
  "External Corner Panels": "External Corner Angle, Heavy Wedge, Alignment Bar",
  "Kicker Panels": "Anchor Bolt, Kicker Bracket, Shim Plate, Flat Tie",
  "Closure Panels": "End Plate, Lock Wedge, Gap Sealing Gasket",
  "Filler Panels": "Compensation Bar, Joint Key, Pin & Wedge",
  "Rocker Panels": "Rocker Base Bracket, Pin & Wedge, Swivel Head",
  "Drop Head Panels": "Drop Head Mechanism, Quick-Release Pin, Shore Prop",
  "Prop Head Panels": "Shoring Prop Head, Locking Collar, Heavy Pin",
  "Deck Beam Panels": "Deck Beam Bracket, Joist Lock, Alignment Clip",
  "Stair Panels": "Stair Riser Clamp, Step Tie, Tread Alignment Bracket, Corner Key, Pin & Wedge 16mm, Turnbuckle Prop",
  "Stair Formwork Panels": "Stair Riser Clamp, Step Tie, Tread Alignment Bracket, Corner Key, Pin & Wedge 16mm, Turnbuckle Prop",
  "Lift Shaft Panels": "Stripping Corner, Shaft Working Platform Shoe, Tie Rod",
  "Bulkhead Panels": "Stop-End Angle, Rebar Pass-Through Gasket, Lock Pin",
  "Edge Panels": "Slab Edge Bracket, Safety Handrail Post Adaptor, Wedge",
  "Wall Panels": "Flat Tie, Pin & Wedge 16mm, Alignment Coupler, Wall Tie Nut",
};

const CATEGORY_MANUFACTURERS = [
  "Geto Aluminum Formwork Co.",
  "AlumaSystems Global",
  "Mivan Technology Corp",
  "Kumkang Kind Formwork",
  "Navnirman Aluminum Extrusions",
  "Sforms Aluminum Tech",
] as const;

const SURFACE_FINISHES = [
  "Hard Anodized Coating (25µm)",
  "Nano Polyurethane Non-Stick Finish",
  "Electrophoretic Anti-Slurry Finish",
  "Powder-Coated Hydrophobic Barrier",
  "Brushed Architectural Alloy Finish",
] as const;

const STATUS_LIST = [
  "Active Stock",
  "Active Stock",
  "Active Stock",
  "In Use",
  "Reserved for Project",
  "New / Unused",
  "Under Maintenance",
] as const;

// Generate over 2,000 unique records systematically
function generateMasterDatabase(): MasterPanelRecord[] {
  const records: MasterPanelRecord[] = [];
  let recordCounter = 1;

  // We loop through categories and width x height combinations
  // Using a structured pattern to create > 2,000 unique records
  for (let cIdx = 0; cIdx < MASTER_CATEGORIES.length; cIdx++) {
    const category = MASTER_CATEGORIES[cIdx];
    const prefix = CATEGORY_PREFIX_MAP[category] || "AP";
    const accessories = CATEGORY_ACCESSORIES_MAP[category] || "Pin & Wedge, Flat Tie";

    for (let wIdx = 0; wIdx < MASTER_WIDTHS.length; wIdx++) {
      const width = MASTER_WIDTHS[wIdx];

      for (let hIdx = 0; hIdx < MASTER_HEIGHTS.length; hIdx++) {
        const height = MASTER_HEIGHTS[hIdx];

        // Select heights and widths according to category specs to ensure natural structural realistic engineering data,
        // while guaranteeing > 2,000 records.
        // Wall, Slab, Column, Beam, Corner, Deck, Lift Shaft panels cover full width/height spectrum.
        // Skip only rare non-standard extreme aspect ratios for specialized categories.
        if (
          category === "Kicker Panels" && height > 600
        ) {
          continue; // Kickers are short height
        }
        if (
          category === "Rocker Panels" && (width > 300 || height > 600)
        ) {
          continue; // Rockers are smaller components
        }

        const areaM2 = parseFloat(((width * height) / 1000000).toFixed(4));
        
        // Aluminum 6061-T6 extrusion depth 65mm with 4mm face plate (~20.5 kg/m²)
        const baseThicknessMm = category.includes("Corner") ? 70 : category.includes("Beam") ? 65 : 60;
        const densityFactorKgM2 = category.includes("Beam") || category.includes("Column") ? 22.5 : 19.8;
        const weightKg = parseFloat(Math.max(1.2, areaM2 * densityFactorKgM2).toFixed(2));

        // Calculate Bundle Quantity & Weight
        let bundleQuantity = 20;
        if (areaM2 < 0.2) bundleQuantity = 50;
        else if (areaM2 < 0.5) bundleQuantity = 30;
        else if (areaM2 < 1.0) bundleQuantity = 20;
        else bundleQuantity = 12;

        const bundleWeightKg = parseFloat((weightKg * bundleQuantity).toFixed(2));

        const panelId = `AFP-MST-${String(recordCounter).padStart(4, "0")}`;
        const panelCode = `${prefix}-${width}x${height}`;
        
        // Determine Panel Type & Description based on Category
        const availableTypes = CATEGORY_PANEL_TYPES_MAP[category] || [`Standard ${category.replace(" Panels", "")} Panel`];
        const panelType = availableTypes[recordCounter % availableTypes.length];

        let description = `Standard aluminum formwork panel for ${category.toLowerCase()}`;
        if (category === "Internal Wall Panels") {
          description = `Internal wall formwork panel ${width}x${height} mm for interior room partitions, corridors, shear core walls, and elevator shafts.`;
        } else if (category === "External Wall Panels") {
          description = `Heavy-duty weatherproof external wall formwork panel ${width}x${height} mm for perimeter facade, exterior shear walls, and weather envelope concrete pouring.`;
        } else if (category.includes("Stair")) {
          description = `Stair formwork element ${width}x${height} mm (${panelType}) engineered for concrete flight steps, risers, treads, landing platforms, side walls, and waist slabs.`;
        } else {
          description = `${category} ${width}x${height} mm structural 6061-T6 aluminum formwork element.`;
        }

        const panelName = `${category.replace(" Panels", "")} Panel ${width}x${height} mm`;
        const barcode = `692026${String(recordCounter).padStart(7, "0")}`;
        const qrCode = `https://erp.construction.local/qr/panel/${panelId}`;
        const serialNumber = `SN-ALU-2026-${String(recordCounter).padStart(5, "0")}`;

        const manufacturer = CATEGORY_MANUFACTURERS[recordCounter % CATEGORY_MANUFACTURERS.length];
        const surfaceFinish = SURFACE_FINISHES[recordCounter % SURFACE_FINISHES.length];
        const status = STATUS_LIST[recordCounter % STATUS_LIST.length];

        const notes = `High-grade 6061-T6 structural aluminum formwork panel. Rated concrete lateral pressure resistance: 60 kN/m². Designed for 300+ repetitive pour cycles with zero deflection.`;

        records.push({
          panelId,
          panelCode,
          panelName,
          category,
          panelType,
          description,
          widthMm: width,
          heightMm: height,
          thicknessMm: baseThicknessMm,
          areaM2,
          weightKg,
          material: "Aluminum Alloy 6061-T6",
          surfaceFinish,
          compatibleAccessories: accessories,
          bundleQuantity,
          bundleWeightKg,
          barcode,
          qrCode,
          serialNumber,
          status,
          manufacturer,
          notes,
        });

        recordCounter++;
      }
    }
  }

  return records;
}

// Instantiate database once
export const MASTER_PANEL_DATABASE: MasterPanelRecord[] = generateMasterDatabase();

// Utility function to export to SQL
export function generateSqlExport(data: MasterPanelRecord[] = MASTER_PANEL_DATABASE): string {
  const createTableSql = `-- Aluminum Formwork Panel Master Database SQL Dump
-- Total Records: ${data.length}
-- Created At: ${new Date().toISOString()}

DROP TABLE IF EXISTS aluminum_formwork_panels;

CREATE TABLE aluminum_formwork_panels (
  panel_id VARCHAR(30) PRIMARY KEY,
  panel_code VARCHAR(50) NOT NULL UNIQUE,
  panel_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  width_mm INT NOT NULL,
  height_mm INT NOT NULL,
  thickness_mm INT NOT NULL,
  area_m2 NUMERIC(8, 4) NOT NULL,
  weight_kg NUMERIC(8, 2) NOT NULL,
  material VARCHAR(100) NOT NULL,
  surface_finish VARCHAR(100) NOT NULL,
  compatible_accessories TEXT NOT NULL,
  bundle_quantity INT NOT NULL,
  bundle_weight_kg NUMERIC(8, 2) NOT NULL,
  barcode VARCHAR(30) NOT NULL UNIQUE,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  serial_number VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_panel_category ON aluminum_formwork_panels(category);
CREATE INDEX idx_panel_code ON aluminum_formwork_panels(panel_code);
CREATE INDEX idx_panel_status ON aluminum_formwork_panels(status);

`;

  const batchSize = 100;
  const insertStatements: string[] = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const chunk = data.slice(i, i + batchSize);
    const valueRows = chunk
      .map(
        (r) =>
          `('${r.panelId}', '${r.panelCode.replace(/'/g, "''")}', '${r.panelName.replace(/'/g, "''")}', '${r.category.replace(/'/g, "''")}', ${r.widthMm}, ${r.heightMm}, ${r.thicknessMm}, ${r.areaM2}, ${r.weightKg}, '${r.material.replace(/'/g, "''")}', '${r.surfaceFinish.replace(/'/g, "''")}', '${r.compatibleAccessories.replace(/'/g, "''")}', ${r.bundleQuantity}, ${r.bundleWeightKg}, '${r.barcode}', '${r.qrCode}', '${r.serialNumber}', '${r.status}', '${r.manufacturer.replace(/'/g, "''")}', '${r.notes.replace(/'/g, "''")}')`
      )
      .join(",\n  ");

    insertStatements.push(
      `INSERT INTO aluminum_formwork_panels (\n  panel_id, panel_code, panel_name, category, width_mm, height_mm, thickness_mm, area_m2, weight_kg, material, surface_finish, compatible_accessories, bundle_quantity, bundle_weight_kg, barcode, qr_code, serial_number, status, manufacturer, notes\n) VALUES\n  ${valueRows};`
    );
  }

  return createTableSql + insertStatements.join("\n\n");
}

// Export to JSON string
export function generateJsonExport(data: MasterPanelRecord[] = MASTER_PANEL_DATABASE): string {
  return JSON.stringify(data, null, 2);
}

// Export to CSV string
export function generateCsvExport(data: MasterPanelRecord[] = MASTER_PANEL_DATABASE): string {
  const headers = [
    "Panel ID",
    "Panel Code",
    "Panel Name",
    "Category",
    "Width (mm)",
    "Height (mm)",
    "Thickness (mm)",
    "Area (m2)",
    "Weight (kg)",
    "Material",
    "Surface Finish",
    "Compatible Accessories",
    "Bundle Quantity",
    "Bundle Weight (kg)",
    "Barcode",
    "QR Code",
    "Serial Number",
    "Status",
    "Manufacturer",
    "Notes",
  ];

  const rows = data.map((r) => [
    `"${r.panelId}"`,
    `"${r.panelCode}"`,
    `"${r.panelName}"`,
    `"${r.category}"`,
    r.widthMm,
    r.heightMm,
    r.thicknessMm,
    r.areaM2,
    r.weightKg,
    `"${r.material}"`,
    `"${r.surfaceFinish}"`,
    `"${r.compatibleAccessories.replace(/"/g, '""')}"`,
    r.bundleQuantity,
    r.bundleWeightKg,
    `"${r.barcode}"`,
    `"${r.qrCode}"`,
    `"${r.serialNumber}"`,
    `"${r.status}"`,
    `"${r.manufacturer}"`,
    `"${r.notes.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

// Export to Excel Binary/Blob using SheetJS
export function downloadExcelFile(
  data: MasterPanelRecord[] = MASTER_PANEL_DATABASE,
  fileName: string = "Aluminum_Formwork_Panel_Master_Database.xlsx"
) {
  const exportData = data.map((r) => ({
    "Panel ID": r.panelId,
    "Panel Code": r.panelCode,
    "Panel Name": r.panelName,
    Category: r.category,
    "Width (mm)": r.widthMm,
    "Height (mm)": r.heightMm,
    "Thickness (mm)": r.thicknessMm,
    "Area (m²)": r.areaM2,
    "Weight (kg)": r.weightKg,
    Material: r.material,
    "Surface Finish": r.surfaceFinish,
    "Compatible Accessories": r.compatibleAccessories,
    "Bundle Quantity": r.bundleQuantity,
    "Bundle Weight (kg)": r.bundleWeightKg,
    Barcode: r.barcode,
    "QR Code": r.qrCode,
    "Serial Number": r.serialNumber,
    Status: r.status,
    Manufacturer: r.manufacturer,
    Notes: r.notes,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Panel ID
    { wch: 16 }, // Panel Code
    { wch: 32 }, // Panel Name
    { wch: 22 }, // Category
    { wch: 12 }, // Width
    { wch: 12 }, // Height
    { wch: 14 }, // Thickness
    { wch: 12 }, // Area
    { wch: 12 }, // Weight
    { wch: 24 }, // Material
    { wch: 28 }, // Surface Finish
    { wch: 45 }, // Accessories
    { wch: 16 }, // Bundle Qty
    { wch: 18 }, // Bundle Weight
    { wch: 18 }, // Barcode
    { wch: 45 }, // QR Code
    { wch: 22 }, // Serial Number
    { wch: 16 }, // Status
    { wch: 28 }, // Manufacturer
    { wch: 50 }, // Notes
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Panel Master DB");

  // Download browser trigger
  XLSX.writeFile(workbook, fileName);
}

// Download text string helper for SQL, CSV, JSON
export function triggerTextDownload(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
