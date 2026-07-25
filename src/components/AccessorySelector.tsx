import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Check,
  ChevronDown,
  Info,
  Layers,
  Sparkles,
  PackageCheck,
  AlertTriangle,
  Building2,
  Tag,
  DollarSign,
  QrCode,
  Barcode,
  Weight,
} from "lucide-react";
import { FormworkAccessoryRecord } from "../types";
import { ACCESSORY_CATEGORIES } from "../data/accessoryMasterDatabase";

interface AccessorySelectorProps {
  accessories: FormworkAccessoryRecord[];
  selectedAccessoryId?: string;
  onSelectAccessory: (accessory: FormworkAccessoryRecord) => void;
  panelTypeFilter?: string; // e.g. "Internal Wall Panels"
  placeholder?: string;
  className?: string;
}

export const AccessorySelector: React.FC<AccessorySelectorProps> = ({
  accessories,
  selectedAccessoryId,
  onSelectAccessory,
  panelTypeFilter,
  placeholder = "Search or select accessory by name, code, category...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedAccessory, setSelectedAccessory] = useState<FormworkAccessoryRecord | null>(
    null
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedAccessoryId) {
      const found = accessories.find((a) => a.id === selectedAccessoryId);
      if (found) {
        setSelectedAccessory(found);
      }
    }
  }, [selectedAccessoryId, accessories]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAccessories = accessories.filter((acc) => {
    const matchesQuery =
      !searchQuery ||
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.material.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "All" || acc.category === categoryFilter;

    const matchesPanelFilter =
      !panelTypeFilter ||
      acc.compatiblePanelTypes.some(
        (pt) =>
          pt.toLowerCase().includes(panelTypeFilter.toLowerCase()) ||
          pt.toLowerCase() === "universal all panels"
      );

    return matchesQuery && matchesCategory && matchesPanelFilter;
  });

  const handleSelect = (acc: FormworkAccessoryRecord) => {
    setSelectedAccessory(acc);
    onSelectAccessory(acc);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
        Select Accessory (Auto-Populate Data)
      </label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full cursor-pointer flex items-center justify-between p-3 rounded-lg border text-sm transition-all duration-150 ${
          isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20 bg-white shadow-sm"
            : selectedAccessory
            ? "border-emerald-300 bg-emerald-50/30 text-slate-900"
            : "border-slate-300 bg-white hover:border-slate-400 text-slate-500"
        }`}
      >
        {selectedAccessory ? (
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="px-2 py-1 bg-amber-500 text-white font-mono text-xs font-bold rounded">
              {selectedAccessory.code}
            </div>
            <div className="truncate">
              <span className="font-medium text-slate-900">{selectedAccessory.name}</span>
              <span className="ml-2 text-xs text-slate-500 font-normal">
                ({selectedAccessory.category} • {selectedAccessory.size})
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center text-slate-400 space-x-2">
            <Search className="w-4 h-4" />
            <span>{placeholder}</span>
          </div>
        )}

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-amber-600" : ""
          }`}
        />
      </div>

      {/* Selected Accessory Auto-populated Info Card */}
      {selectedAccessory && !isOpen && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center space-x-2 text-emerald-700 font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Auto-Populated Specifications</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                selectedAccessory.currentStock > selectedAccessory.minStock
                  ? "bg-emerald-100 text-emerald-800"
                  : selectedAccessory.currentStock > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              Stock: {selectedAccessory.currentStock} {selectedAccessory.unit}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px]">Material:</span>
              <span className="font-medium text-slate-800">{selectedAccessory.material}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Unit Weight:</span>
              <span className="font-medium text-slate-800">{selectedAccessory.weightKg} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Location:</span>
              <span className="font-medium text-slate-800">{selectedAccessory.warehouseLocation}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Unit Price:</span>
              <span className="font-medium text-slate-800">${selectedAccessory.purchasePrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Compatible Panels: </span>
            {selectedAccessory.compatiblePanelTypes.join(", ")}
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fadeIn max-h-96 flex flex-col">
          {/* Header Search & Filter */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, name, size, material..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
              <button
                onClick={() => setCategoryFilter("All")}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === "All"
                    ? "bg-amber-500 text-white font-medium"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                All Categories
              </button>
              {ACCESSORY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-amber-500 text-white font-medium"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Accessory Options List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredAccessories.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No matching accessories found. Try broadening search or select another category.
              </div>
            ) : (
              filteredAccessories.map((acc) => {
                const isSelected = selectedAccessory?.id === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelect(acc)}
                    className={`p-3 cursor-pointer hover:bg-amber-50/60 transition-colors flex items-start justify-between ${
                      isSelected ? "bg-amber-50/80 border-l-4 border-amber-500" : ""
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 bg-slate-800 text-white font-mono text-[11px] rounded">
                          {acc.code}
                        </span>
                        <span className="font-semibold text-slate-900 text-xs">{acc.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </div>

                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-2 items-center">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {acc.category}
                        </span>
                        <span>• Size: {acc.size}</span>
                        <span>• {acc.weightKg} kg</span>
                        <span>• Material: {acc.material}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        ${acc.purchasePrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Stock: <span className="font-semibold text-slate-700">{acc.currentStock}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
