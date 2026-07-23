import React, { useState, useEffect, useRef } from "react";
import { CustomInputCategory, CustomMasterEntry, UserRole } from "../types";
import { CustomInputService } from "../services/customInputService";
import { 
  Search, 
  Star, 
  Clock, 
  Plus, 
  Check, 
  ChevronDown, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Clock3, 
  X,
  FileEdit,
  Tag,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

export interface SmartCustomSelectProps {
  category: CustomInputCategory;
  value: string;
  onChange: (value: string, isCustom?: boolean) => void;
  labelEn?: string;
  labelAm?: string;
  placeholderEn?: string;
  placeholderAm?: string;
  isAmharic?: boolean;
  currentUserRole?: UserRole | string;
  currentUserName?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const SmartCustomSelect: React.FC<SmartCustomSelectProps> = ({
  category,
  value,
  onChange,
  labelEn,
  labelAm,
  placeholderEn = "Select or specify option...",
  placeholderAm = "ይምረጡ ወይም በግልጽ ያስገቡ...",
  isAmharic = true,
  currentUserRole = UserRole.PROJECT_MANAGER,
  currentUserName = "Site User",
  required = false,
  disabled = false,
  className = "",
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [masterEntries, setMasterEntries] = useState<CustomMasterEntry[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentValues, setRecentValues] = useState<string[]>([]);
  
  // "Other (Specify)" Custom Mode
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValueInput, setCustomValueInput] = useState("");
  const [customAmharicInput, setCustomAmharicInput] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    msg: string;
    type: "success" | "pending" | "error";
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load options for category
  const reloadData = () => {
    const approved = CustomInputService.getApprovedOptionsForCategory(category);
    setMasterEntries(approved);
    setFavoriteIds(CustomInputService.getFavoriteIds());
    setRecentValues(CustomInputService.getRecentValues(category));
  };

  useEffect(() => {
    reloadData();
  }, [category]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered dropdown lists
  const filteredEntries = masterEntries.filter(entry => {
    const text = (entry.value + " " + (entry.labelAm || "")).toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  // Split into Favorites, Recent, and Main
  const favoriteEntries = filteredEntries.filter(e => favoriteIds.includes(e.id) || e.isFavorite);
  const recentEntries = filteredEntries.filter(
    e => recentValues.includes(e.value) && !favoriteIds.includes(e.id)
  );
  const otherEntries = filteredEntries.filter(
    e => !favoriteIds.includes(e.id) && !recentValues.includes(e.value)
  );

  // Toggle favorite
  const handleToggleStar = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    CustomInputService.toggleFavorite(entryId, currentUserName, String(currentUserRole));
    reloadData();
  };

  // Select standard option
  const handleSelectOption = (selectedValue: string) => {
    onChange(selectedValue, false);
    CustomInputService.recordRecentUsage(category, selectedValue);
    setIsOpen(false);
    setIsCustomMode(false);
    setSearchTerm("");
  };

  // Handle Submit Custom Value
  const handleSubmitCustomValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customValueInput.trim()) return;

    const result = CustomInputService.submitCustomValue({
      category,
      value: customValueInput.trim(),
      labelAm: customAmharicInput.trim() || customValueInput.trim(),
      description: customDescription.trim(),
      userName: currentUserName,
      userRole: currentUserRole
    });

    if (result.requiresApproval) {
      setSubmissionFeedback({
        msg: isAmharic 
          ? "አዲሱ መረጃ ለአስተዳዳሪው ፈቃድ ተልኳል። እስከሚጸድቅ ድረስ በጊዚያዊነት ጥቅም ላይ ውሏል።"
          : "New entry submitted for Admin approval. Temporarily active for this session.",
        type: "pending"
      });
    } else {
      setSubmissionFeedback({
        msg: isAmharic 
          ? "አዲሱ መረጃ በስርዓቱ ቋሚ መዝገብ ተመዝግቧል!"
          : "New custom entry approved & added to ERP Master Dictionary!",
        type: "success"
      });
    }

    // Pass custom value up to form state
    onChange(customValueInput.trim(), true);
    reloadData();

    // Reset custom inputs after short delay
    setTimeout(() => {
      setIsOpen(false);
      setIsCustomMode(false);
      setCustomValueInput("");
      setCustomAmharicInput("");
      setCustomDescription("");
      setSubmissionFeedback(null);
    }, 1800);
  };

  // Find label of currently selected value
  const selectedObj = masterEntries.find(e => e.value === value);
  const displayLabel = selectedObj 
    ? (isAmharic && selectedObj.labelAm ? selectedObj.labelAm : selectedObj.value) 
    : value;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef} id={id || `smart-select-${category.toLowerCase().replace(/\s+/g, '-')}`}>
      {/* Optional Label */}
      {(labelEn || labelAm) && (
        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex justify-between items-center">
          <span>{isAmharic ? labelAm || labelEn : labelEn || labelAm}</span>
          {required && <span className="text-red-400 text-xs font-black ml-1">*</span>}
        </label>
      )}

      {/* Main Select Button Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer text-xs font-medium ${
          disabled 
            ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed" 
            : isOpen 
              ? "bg-slate-950 border-red-500 shadow-md shadow-red-500/10 text-white" 
              : "bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700"
        }`}
      >
        <span className="truncate">
          {value ? (
            <span className="flex items-center space-x-2">
              <span className="font-semibold">{displayLabel}</span>
              {selectedObj?.isPredefined === false && (
                <span className="px-1.5 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-800 rounded text-[9px] font-black uppercase">
                  {isAmharic ? "የተገለጸ" : "Custom"}
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-500 italic">
              {isAmharic ? placeholderAm : placeholderEn}
            </span>
          )}
        </span>

        <div className="flex items-center space-x-1 ml-2 flex-shrink-0 text-slate-400">
          <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-red-400" : ""}`} />
        </div>
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-96 flex flex-col text-slate-200">
          
          {/* Header Search & Actions */}
          <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAmharic ? "ፈልግ ወይም ቃል ፃፍ..." : "Search or filter items..."}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Subheader info bar */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
              <span>Category: <strong className="text-amber-400">{category}</strong></span>
              <span>{filteredEntries.length} options</span>
            </div>
          </div>

          {/* Custom Mode Modal Form Inline */}
          {isCustomMode ? (
            <div className="p-4 bg-slate-900/95 space-y-3 border-b border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                  <Sparkles size={15} />
                  <span>{isAmharic ? `አዲስ ብጁ "${category}" አስገባ` : `Specify Custom "${category}"`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {submissionFeedback ? (
                <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  submissionFeedback.type === "success" 
                    ? "bg-emerald-950/80 border-emerald-800 text-emerald-300" 
                    : "bg-amber-950/80 border-amber-800 text-amber-300"
                }`}>
                  <div className="flex items-center space-x-2 font-bold">
                    {submissionFeedback.type === "success" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                    <span>{submissionFeedback.type === "success" ? "Saved to Master" : "Approval Pending"}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{submissionFeedback.msg}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitCustomValue} className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isAmharic ? "አዲሱ እሴት / Custom Value (English):" : "Custom Value (English):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={customValueInput}
                      onChange={(e) => setCustomValueInput(e.target.value)}
                      placeholder={`e.g. ${category} Custom Spec...`}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isAmharic ? "የአማርኛ መጠሪያ (በአማርኛ):" : "Amharic Translation / Description:"}
                    </label>
                    <input
                      type="text"
                      value={customAmharicInput}
                      onChange={(e) => setCustomAmharicInput(e.target.value)}
                      placeholder="ምሳሌ፡ ልዩ የፎርምወርክ ዓይነት..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isAmharic ? "ተጨማሪ ማብራሪያ / Remarks:" : "Specification Remarks:"}
                    </label>
                    <input
                      type="text"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Reason or technical details..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                    >
                      {isAmharic ? "ሰርዝ" : "Cancel"}
                    </button>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl text-xs font-bold shadow hover:opacity-90 transition flex items-center space-x-1"
                    >
                      <Plus size={14} />
                      <span>{isAmharic ? "አስገባና መዝግብ" : "Add Custom Value"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          {/* Options Scroll List */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-900/60">
            
            {/* 1. FAVORITES SECTION */}
            {favoriteEntries.length > 0 && !isCustomMode && (
              <div className="py-1">
                <div className="px-2 py-1 text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center space-x-1">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{isAmharic ? "ተመራጭ እሴቶች (Favorites)" : "Favorites"}</span>
                </div>
                {favoriteEntries.map(entry => {
                  const isSelected = value === entry.value;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleSelectOption(entry.value)}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        isSelected ? "bg-red-950/80 text-white font-bold border border-red-800/80" : "hover:bg-slate-900 text-slate-200"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block font-medium truncate">{isAmharic && entry.labelAm ? entry.labelAm : entry.value}</span>
                        {isAmharic && entry.labelAm && (
                          <span className="text-[10px] text-slate-400 block truncate">{entry.value}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {isSelected && <Check size={14} className="text-red-400" />}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(e, entry.id)}
                          className="p-1 text-amber-400 hover:text-amber-300"
                        >
                          <Star size={13} className="fill-amber-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. RECENTLY USED SECTION */}
            {recentEntries.length > 0 && !isCustomMode && (
              <div className="py-1">
                <div className="px-2 py-1 text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center space-x-1">
                  <Clock size={11} />
                  <span>{isAmharic ? "በቅርቡ የተጠቀሟቸው (Recently Used)" : "Recently Used"}</span>
                </div>
                {recentEntries.map(entry => {
                  const isSelected = value === entry.value;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleSelectOption(entry.value)}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                        isSelected ? "bg-red-950/80 text-white font-bold border border-red-800/80" : "hover:bg-slate-900 text-slate-200"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block font-medium truncate">{isAmharic && entry.labelAm ? entry.labelAm : entry.value}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        {isSelected && <Check size={14} className="text-red-400" />}
                        <button
                          type="button"
                          onClick={(e) => handleToggleStar(e, entry.id)}
                          className="p-1 text-slate-600 hover:text-amber-400"
                        >
                          <Star size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. MAIN PREDEFINED & APPROVED OPTIONS */}
            {!isCustomMode && (
              <div className="py-1">
                {(favoriteEntries.length > 0 || recentEntries.length > 0) && (
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {isAmharic ? "ሁሉም የቋሚ መዝገብ እሴቶች (All Standard Entries)" : "Master Options"}
                  </div>
                )}

                {otherEntries.length === 0 && favoriteEntries.length === 0 && recentEntries.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    {isAmharic ? "ምንም የተገኘ እሴት የለም።" : "No matching entry found."}
                  </div>
                ) : (
                  otherEntries.map(entry => {
                    const isSelected = value === entry.value;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleSelectOption(entry.value)}
                        className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                          isSelected ? "bg-red-950/80 text-white font-bold border border-red-800/80" : "hover:bg-slate-900 text-slate-200"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="block font-medium truncate">{isAmharic && entry.labelAm ? entry.labelAm : entry.value}</span>
                          {isAmharic && entry.labelAm && (
                            <span className="text-[10px] text-slate-400 block truncate">{entry.value}</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {isSelected && <Check size={14} className="text-red-400" />}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStar(e, entry.id)}
                            className="p-1 text-slate-600 hover:text-amber-400"
                          >
                            <Star size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

          {/* 4. "OTHER (SPECIFY)" SPECIAL ACTION BUTTON FOOTER */}
          {!isCustomMode && (
            <div className="p-2 bg-slate-900 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  if (searchTerm) setCustomValueInput(searchTerm);
                }}
                className="w-full px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Plus size={14} className="text-amber-400" />
                <span>{isAmharic ? "ሌላ (በግልጽ ይግለጹ / Other Specify)" : "Other (Specify Custom Entry)"}</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
