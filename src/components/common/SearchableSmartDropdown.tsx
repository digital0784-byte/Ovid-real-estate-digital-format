import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, Check, Clock, Plus, Sparkles, X, ShieldCheck, AlertCircle } from "lucide-react";

export interface DropdownOption {
  id: string;
  label: string;
  subLabel?: string;
  code?: string;
  badge?: string;
  isVerified?: boolean;
  disabled?: boolean;
  metadata?: any;
}

interface SearchableSmartDropdownProps {
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (option: DropdownOption) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  recentValues?: string[];
  allowAddNew?: boolean;
  onAddNewClick?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
  required?: boolean;
  isAmharic?: boolean;
  error?: string;
  className?: string;
  badgeColor?: string;
}

export const SearchableSmartDropdown: React.FC<SearchableSmartDropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  label,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  recentValues = [],
  allowAddNew = false,
  onAddNewClick,
  addNewLabel = "+ Add New / Enter New",
  disabled = false,
  required = false,
  isAmharic = false,
  error,
  className = "",
  badgeColor = "amber"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Current selected option object
  const currentOption = useMemo(() => {
    return options.find(o => o.id === selectedValue || o.label === selectedValue || o.code === selectedValue);
  }, [options, selectedValue]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase().trim();
    return options.filter(o => {
      const matchLabel = o.label.toLowerCase().includes(q);
      const matchSub = (o.subLabel || "").toLowerCase().includes(q);
      const matchCode = (o.code || "").toLowerCase().includes(q);
      return matchLabel || matchSub || matchCode;
    });
  }, [options, searchTerm]);

  // Split into recent options vs main options
  const recentOptions = useMemo(() => {
    if (!recentValues || recentValues.length === 0 || searchTerm.trim()) return [];
    return options.filter(o => recentValues.includes(o.id) || recentValues.includes(o.label) || recentValues.includes(o.code || ""));
  }, [options, recentValues, searchTerm]);

  const handleSelectOption = (option: DropdownOption) => {
    if (option.disabled) return;
    onSelect(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-amber-400">*</span>}
          </span>
          {currentOption?.isVerified && (
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <ShieldCheck size={11} /> Verified Standard
            </span>
          )}
        </label>
      )}

      {/* Button / Select Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-900 border text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
          disabled
            ? "opacity-50 cursor-not-allowed border-slate-800 text-slate-500"
            : isOpen
            ? "border-amber-500 ring-2 ring-amber-500/20 shadow-lg text-white"
            : error
            ? "border-rose-500 text-rose-300"
            : "border-slate-800 text-slate-200 hover:border-slate-700"
        }`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {currentOption ? (
            <div className="truncate flex items-center gap-2">
              <span className="font-semibold text-white truncate">{currentOption.label}</span>
              {currentOption.code && (
                <span className="text-[10px] font-mono bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                  {currentOption.code}
                </span>
              )}
              {currentOption.badge && (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                  {currentOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 truncate">{selectedValue || placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180 text-amber-400" : ""}`}
        />
      </button>

      {error && (
        <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn backdrop-blur-md">
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-800 bg-slate-950/70 flex items-center gap-2">
            <Search size={14} className="text-slate-400 shrink-0 ml-1.5" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none py-1"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-slate-500 hover:text-white p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* List Body */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/50 p-1 text-xs">
            {/* Recent Items Section */}
            {recentOptions.length > 0 && !searchTerm && (
              <div className="pb-1 mb-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Clock size={11} className="text-amber-400" />
                  <span>{isAmharic ? "በቅርብ የተመረጡ" : "Recently Used Options"}</span>
                </div>
                {recentOptions.map(option => (
                  <button
                    key={`rec-${option.id}`}
                    type="button"
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      selectedValue === option.id || selectedValue === option.label || selectedValue === option.code
                        ? "bg-amber-500/15 text-amber-300 font-semibold"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{option.label}</span>
                        {option.code && (
                          <span className="text-[10px] font-mono text-amber-400 bg-slate-950/60 px-1 py-0.2 rounded border border-slate-800">
                            {option.code}
                          </span>
                        )}
                      </div>
                      {option.subLabel && <div className="text-[10px] text-slate-500 truncate">{option.subLabel}</div>}
                    </div>
                    {(selectedValue === option.id || selectedValue === option.label || selectedValue === option.code) && (
                      <Check size={14} className="text-amber-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Standard Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected =
                  selectedValue === option.id || selectedValue === option.label || selectedValue === option.code;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      option.disabled
                        ? "opacity-40 cursor-not-allowed text-slate-600"
                        : isSelected
                        ? "bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30"
                        : "hover:bg-slate-800/80 text-slate-200"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{option.label}</span>
                        {option.code && (
                          <span className="text-[10px] font-mono text-amber-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
                            {option.code}
                          </span>
                        )}
                        {option.isVerified && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono shrink-0">
                            Verified Standard
                          </span>
                        )}
                      </div>
                      {option.subLabel && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{option.subLabel}</div>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-amber-400 shrink-0 ml-1.5" />}
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center text-slate-500 text-xs">
                {isAmharic ? "ምንም አማራጭ አልተገኘም" : "No matching options found"}
              </div>
            )}
          </div>

          {/* Action Footer: + Add New / Enter New Option */}
          {allowAddNew && onAddNewClick && (
            <div className="p-2 border-t border-slate-800 bg-slate-950/90">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onAddNewClick();
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center gap-1.5 font-bold cursor-pointer transition text-xs"
              >
                <Plus size={13} />
                <span>{addNewLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
