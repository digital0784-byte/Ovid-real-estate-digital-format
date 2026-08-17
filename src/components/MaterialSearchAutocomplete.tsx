import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Plus, Check, Package, Sparkles, ChevronDown } from 'lucide-react';
import { StoreMaterialItem } from './StoreOwnerApp';

export interface MaterialOption {
  id: string;
  name: string;
  category: string;
  dimensions: string;
  unit: string;
  availableStock?: number;
  totalStock?: number;
  unitCost?: number;
  isPreset?: boolean;
}

// Comprehensive preset catalog containing ALL aluminum formwork panels, dimensions, and accessories
export const PRESET_MATERIAL_CATALOG: MaterialOption[] = [
  // --- WALL & EXTENSION PANELS ---
  { id: "PRE-AL-01", name: "External Wall Panel 1200x600", category: "Aluminum Panels", dimensions: "1200x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-02", name: "External Wall Panel 2400x600", category: "Aluminum Panels", dimensions: "2400x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-03", name: "Internal Wall Panel 1200x600", category: "Aluminum Panels", dimensions: "1200x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-04", name: "Internal Wall Panel 2400x600", category: "Aluminum Panels", dimensions: "2400x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-05", name: "Standard Wall Panel 1200x450", category: "Aluminum Panels", dimensions: "1200x450mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-06", name: "Standard Wall Panel 1200x300", category: "Aluminum Panels", dimensions: "1200x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-07", name: "Standard Wall Panel 1200x200", category: "Aluminum Panels", dimensions: "1200x200mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-08", name: "Standard Wall Panel 1200x150", category: "Aluminum Panels", dimensions: "1200x150mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-09", name: "Standard Wall Panel 1200x100", category: "Aluminum Panels", dimensions: "1200x100mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-10", name: "Extend Panel / Extension 1200x300", category: "Aluminum Panels", dimensions: "1200x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-11", name: "Extend Panel / Extension 1200x150", category: "Aluminum Panels", dimensions: "1200x150mm", unit: "Pcs", isPreset: true },

  // --- CORNER PANELS (IC, EC, SC, SCA) ---
  { id: "PRE-AL-12", name: "Inner Corner IC Panel 1200x150x150", category: "Aluminum Panels", dimensions: "1200x150x150mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-13", name: "Inner Corner IC Panel 2400x150x150", category: "Aluminum Panels", dimensions: "2400x150x150mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-14", name: "External Corner EC Angle 1200x50x50", category: "Aluminum Panels", dimensions: "1200x50x50mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-15", name: "External Corner EC Angle 2400x50x50", category: "Aluminum Panels", dimensions: "2400x50x50mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-16", name: "Special Corner SC Panel 1200x100", category: "Aluminum Panels", dimensions: "1200x100mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-17", name: "Special Corner Angle SCA 1200x50", category: "Aluminum Panels", dimensions: "1200x50mm", unit: "Pcs", isPreset: true },

  // --- KICKER & BEAM PANELS ---
  { id: "PRE-AL-18", name: "K-Kicker Panel 1200x300", category: "Aluminum Panels", dimensions: "1200x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-19", name: "K-Kicker Panel 1200x150", category: "Aluminum Panels", dimensions: "1200x150mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-20", name: "Kicker Beam Panel 1200x150", category: "Aluminum Panels", dimensions: "1200x150mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-21", name: "Beam Bottom Panel 1200x400", category: "Aluminum Panels", dimensions: "1200x400mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-22", name: "Beam Bottom Panel 1200x300", category: "Aluminum Panels", dimensions: "1200x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-23", name: "Beam Side Panel 1200x600", category: "Aluminum Panels", dimensions: "1200x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-24", name: "Beam Side Panel 1200x400", category: "Aluminum Panels", dimensions: "1200x400mm", unit: "Pcs", isPreset: true },

  // --- SLAB, SOFFIT, SPONDA & STAIR PANELS ---
  { id: "PRE-AL-25", name: "Slab Deck Panel 1200x600", category: "Aluminum Panels", dimensions: "1200x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-26", name: "Slab Deck Panel 1200x400", category: "Aluminum Panels", dimensions: "1200x400mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-27", name: "Slab Deck Panel 1200x300", category: "Aluminum Panels", dimensions: "1200x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-28", name: "Slab Corner Panel 600x600", category: "Aluminum Panels", dimensions: "600x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-29", name: "Soffit / Sofit Panel 1200x300", category: "Aluminum Panels", dimensions: "1200x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-30", name: "Soffit / Sofit Corner Panel 1200x150", category: "Aluminum Panels", dimensions: "1200x150mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-31", name: "Sponda / Deck Stop Panel 1200x100", category: "Aluminum Panels", dimensions: "1200x100mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-32", name: "Staircase Step Panel 1000x400", category: "Aluminum Panels", dimensions: "1000x400mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-33", name: "Stair Riser Panel 1000x200", category: "Aluminum Panels", dimensions: "1000x200mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-34", name: "Stair Side Wall Panel 1200x600", category: "Aluminum Panels", dimensions: "1200x600mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-35", name: "Column Panel 1200x400", category: "Aluminum Panels", dimensions: "1200x400mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-36", name: "Door Head Panel 1000x300", category: "Aluminum Panels", dimensions: "1000x300mm", unit: "Pcs", isPreset: true },
  { id: "PRE-AL-37", name: "Window Sill Panel 1200x200", category: "Aluminum Panels", dimensions: "1200x200mm", unit: "Pcs", isPreset: true },

  // --- PROPS, PROPS HEAD & ACCESSORIES ---
  { id: "PRE-ACC-01", name: "Props Head / Early Stripping Head", category: "Props", dimensions: "Standard", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-02", name: "Heavy Duty Turnbuckle Push-Pull Prop", category: "Props", dimensions: "2.0m - 3.8m", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-03", name: "Single Tubular Supporting Prop", category: "Props", dimensions: "1.8m - 3.2m", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-04", name: "Stair Props / Stair Supporting Prop", category: "Props", dimensions: "1.5m - 2.5m", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-05", name: "Threaded Tie Rod 15/17mm x 1.0m", category: "Consumables", dimensions: "15/17mm x 1m", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-06", name: "PVC Sleeve Conduit Tube & Cone Set 22mm (Condit)", category: "Consumables", dimensions: "22mm x 2m Tube", unit: "Bags", isPreset: true },
  { id: "PRE-ACC-07", name: "Wedge Pin 16mm x 50mm", category: "Consumables", dimensions: "16x50mm", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-08", name: "Aluminum Formwork Pin & Wedge Set (16mm)", category: "Consumables", dimensions: "16mm Box of 200", unit: "Boxes", isPreset: true },
  { id: "PRE-ACC-09", name: "Flat Tie 200mm Wall Thickness", category: "Consumables", dimensions: "200mm Wall", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-10", name: "Flat Tie 250mm Wall Thickness", category: "Consumables", dimensions: "250mm Wall", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-11", name: "Flat Tie 300mm Wall Thickness", category: "Consumables", dimensions: "300mm Wall", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-12", name: "Alignment Waler Beam 2.5m", category: "Beams", dimensions: "2.5m Length", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-13", name: "Corner Keys & L-Pins", category: "Consumables", dimensions: "Standard", unit: "Sets", isPreset: true },
  { id: "PRE-ACC-14", name: "Joint Pin & Stub Pin 16mm", category: "Consumables", dimensions: "16mm", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-15", name: "Puller Hook Tool 450mm", category: "Tools", dimensions: "450mm", unit: "Units", isPreset: true },
  { id: "PRE-ACC-16", name: "Wing Nut & Cast Iron Plate 120mm", category: "Consumables", dimensions: "120mm Plate", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-17", name: "Water Stopper Tie Nut 15/17mm", category: "Consumables", dimensions: "15/17mm", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-18", name: "Working Platform Bracket 900mm", category: "Brackets", dimensions: "900mm", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-19", name: "Safety Guardrail Post 1200mm", category: "Brackets", dimensions: "1200mm", unit: "Pcs", isPreset: true },
  { id: "PRE-ACC-20", name: "Formwork Release Oil / Mould Agent", category: "Consumables", dimensions: "200L Drum", unit: "Drums", isPreset: true },

  // --- GENERAL CONSTRUCTION MATERIALS ---
  { id: "PRE-GEN-01", name: "Dangote OPC 42.5N Cement", category: "Cement", dimensions: "50kg Bag", unit: "Bags", isPreset: true },
  { id: "PRE-GEN-02", name: "High Tensile Deformed Steel Bar 16mm", category: "Rebar", dimensions: "12m Length", unit: "Pcs", isPreset: true },
  { id: "PRE-GEN-03", name: "High Tensile Deformed Steel Bar 12mm", category: "Rebar", dimensions: "12m Length", unit: "Pcs", isPreset: true },
  { id: "PRE-GEN-04", name: "Film Faced Shuttering Plywood 18mm", category: "Plywood", dimensions: "2440x1220mm", unit: "Sheets", isPreset: true },
  { id: "PRE-GEN-05", name: "H20 Timber Formwork Beam 2.9m", category: "Beams", dimensions: "2.9m Length", unit: "Pcs", isPreset: true },
];

interface MaterialSearchAutocompleteProps {
  value: string;
  onChange: (name: string, item?: MaterialOption) => void;
  storeItems?: StoreMaterialItem[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  isAmharic?: boolean;
}

export const MaterialSearchAutocomplete: React.FC<MaterialSearchAutocompleteProps> = ({
  value,
  onChange,
  storeItems = [],
  label,
  placeholder,
  required = false,
  className = "",
  isAmharic = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal search term when value prop changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Merge inventory store items with preset catalog
  const mergedOptions = useMemo(() => {
    const optionMap = new Map<string, MaterialOption>();

    // 1. Add storeItems from Firestore / local state first
    storeItems.forEach(i => {
      if (!i || !i.name) return;
      optionMap.set(String(i.name).toLowerCase().trim(), {
        id: i.id,
        name: i.name,
        category: i.category || "",
        dimensions: i.dimensions || "",
        unit: i.unit || "pcs",
        availableStock: i.availableStock ?? 0,
        totalStock: i.totalStock ?? 0,
        unitCost: i.unitCost ?? 0,
        isPreset: false,
      });
    });

    // 2. Add preset catalog items if not already present
    PRESET_MATERIAL_CATALOG.forEach(p => {
      if (!p || !p.name) return;
      const key = String(p.name).toLowerCase().trim();
      if (!optionMap.has(key)) {
        optionMap.set(key, p);
      }
    });

    return Array.from(optionMap.values());
  }, [storeItems]);

  // Filter options based on search input
  const filteredOptions = useMemo(() => {
    const term = String(searchTerm || "").toLowerCase().trim();
    if (!term) return mergedOptions;

    return mergedOptions.filter(opt =>
      String(opt.name || "").toLowerCase().includes(term) ||
      String(opt.category || "").toLowerCase().includes(term) ||
      String(opt.dimensions || "").toLowerCase().includes(term)
    );
  }, [mergedOptions, searchTerm]);

  const exactMatchExists = useMemo(() => {
    const term = String(searchTerm || "").toLowerCase().trim();
    if (!term) return false;
    return mergedOptions.some(opt => String(opt.name || "").toLowerCase().trim() === term);
  }, [mergedOptions, searchTerm]);

  const handleSelectOption = (opt: MaterialOption) => {
    setSearchTerm(opt.name);
    onChange(opt.name, opt);
    setIsOpen(false);
  };

  const handleAddNewMaterial = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    onChange(trimmed, {
      id: `NEW-${Date.now()}`,
      name: trimmed,
      category: "Consumables",
      dimensions: "Standard",
      unit: "Pcs",
      isPreset: false
    });
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          required={required}
          value={searchTerm}
          placeholder={placeholder || (isAmharic ? "እቃ/ፓነል ፈልግ ወይም አዲስ ጻፍ..." : "Search material, panel, or accessory...")}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            onChange(val); // update raw text immediately
            setIsOpen(true);
          }}
          className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-8 pr-8 py-2 text-xs focus:outline-none focus:border-emerald-500 font-sans transition-all"
        />
        <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 text-slate-400 hover:text-white p-1"
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-slate-800/60 animate-fadeIn">
          {/* Section Header */}
          <div className="px-3 py-1.5 bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 backdrop-blur-sm flex items-center justify-between z-10">
            <span className="flex items-center space-x-1">
              <Package size={12} className="text-emerald-400" />
              <span>{isAmharic ? "የእቃ / የፓነል ካታሎግ (Searchable Catalog)" : "Catalog & Inventory Materials"}</span>
            </span>
            <span className="text-[9px] text-slate-500">{filteredOptions.length} items</span>
          </div>

          {/* Filtered Options List */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(value || "").toLowerCase().trim() === String(opt.name || "").toLowerCase().trim();
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors cursor-pointer group ${
                      isSelected ? "bg-emerald-950/40 text-emerald-300 font-bold" : "text-slate-200"
                    }`}
                  >
                    <div className="flex flex-col space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                          {opt.name}
                        </span>
                        {isSelected && <Check size={12} className="text-emerald-400" />}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.2 bg-slate-800 border border-slate-700/60 rounded text-slate-300 font-mono">
                          {opt.category}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{opt.dimensions}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-mono">{opt.unit}</span>
                      </div>
                    </div>

                    {/* Stock badge */}
                    <div className="text-right">
                      {opt.availableStock !== undefined ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          opt.availableStock > 0
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                            : "bg-rose-950 text-rose-400 border border-rose-800/60"
                        }`}>
                          {opt.availableStock} {opt.unit}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">Preset</span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-center text-xs text-slate-400 italic">
                {isAmharic ? "ምንም የሚዛመድ እቃ አልተገኘም" : "No matching catalog materials found"}
              </div>
            )}
          </div>

          {/* "+ Add new material" Option */}
          {searchTerm.trim() !== "" && !exactMatchExists && (
            <div className="p-1 bg-slate-950/90 border-t border-slate-800 sticky bottom-0">
              <button
                type="button"
                onClick={handleAddNewMaterial}
                className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded-xl transition-colors flex items-center justify-between cursor-pointer font-medium border border-dashed border-emerald-800/60"
              >
                <div className="flex items-center space-x-2">
                  <Plus size={14} className="text-emerald-400" />
                  <span>
                    {isAmharic ? `+ አዲስ እቃ ጨምር፡ "${searchTerm}"` : `+ Add new material: "${searchTerm}"`}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Custom</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
