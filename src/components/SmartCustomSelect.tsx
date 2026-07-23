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
  
  // "Add New" Custom Modal Dialog state
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValueInput, setCustomValueInput] = useState("");
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [customAmharicInput, setCustomAmharicInput] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customRemarks, setCustomRemarks] = useState("");
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    msg: string;
    type: "success" | "pending" | "error";
  } | null>(null);

  // AI Similarity matches
  const [similarMatches, setSimilarMatches] = useState<{ entry: CustomMasterEntry; similarity: number }[]>([]);

  // Update AI similarity matches when custom value input changes
  useEffect(() => {
    if (customValueInput.trim().length >= 2) {
      const matches = CustomInputService.findSimilarEntries(category, customValueInput);
      setSimilarMatches(matches);
    } else {
      setSimilarMatches([]);
    }
  }, [customValueInput, category]);

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
    const text = (entry.value + " " + (entry.labelAm || "") + " " + (entry.code || "")).toLowerCase();
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
      code: customCodeInput.trim(),
      labelAm: customAmharicInput.trim() || customValueInput.trim(),
      description: customDescription.trim(),
      remarks: customRemarks.trim(),
      userName: currentUserName,
      userRole: currentUserRole
    });

    if (result.requiresApproval) {
      setSubmissionFeedback({
        msg: isAmharic 
          ? "አዲሱ እሴት 'በመጠባበቅ ላይ (Pending Approval)' ተመዝግቧል። ለአስተዳዳሪ ሲጸድቅ በሁሉም dropdowns በራስ-ሰር ይመሳሰላል።"
          : "New entry saved with status 'Pending Approval'. Will automatically synchronize across all modules once approved.",
        type: "pending"
      });
    } else {
      setSubmissionFeedback({
        msg: isAmharic 
          ? "አዲሱ መረጃ በስርዓቱ ቋሚ Master Database ተመዝግቦ በሁሉም ቦታ ተመሳስሏል!"
          : "New entry approved & added to Master Database! Instantly synchronized across all applications.",
        type: "success"
      });
    }

    // Pass value to form
    onChange(customValueInput.trim(), true);
    reloadData();

    // Close modal after feedback
    setTimeout(() => {
      setIsCustomMode(false);
      setIsOpen(false);
      setCustomValueInput("");
      setCustomCodeInput("");
      setCustomAmharicInput("");
      setCustomDescription("");
      setCustomRemarks("");
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
                placeholder={isAmharic ? "ፈልግ ወይም ቃል ፃፍ (Search or Filter)..." : "Search or filter items..."}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 font-medium"
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
              <span>{filteredEntries.length} options available</span>
            </div>
          </div>

          {/* Options Scroll List */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-900/60">
            
            {/* 1. FAVORITES SECTION */}
            {favoriteEntries.length > 0 && (
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
                        {entry.code && (
                          <span className="text-[10px] font-mono text-amber-400/80 block">{entry.code}</span>
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
            {recentEntries.length > 0 && (
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
            <div className="py-1">
              {(favoriteEntries.length > 0 || recentEntries.length > 0) && (
                <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {isAmharic ? "ሁሉም የቋሚ መዝገብ እሴቶች (Master Options)" : "Master Options"}
                </div>
              )}

              {otherEntries.length === 0 && favoriteEntries.length === 0 && recentEntries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {isAmharic ? "ምንም የተገኘ እሴት የለም። አዲስ ለማስገባት 'Add New' ይጫኑ።" : "No matching entry found. Click 'Add New' to create one."}
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
                        {entry.code && (
                          <span className="text-[10px] font-mono text-slate-400 block">{entry.code}</span>
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

          </div>

          {/* 4. FOOTER ACTION BUTTONS: "Add New" and "Other (Specify)" */}
          <div className="p-2 bg-slate-900 border-t border-slate-800 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                if (searchTerm) setCustomValueInput(searchTerm);
              }}
              className="px-2.5 py-2 bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <Plus size={13} className="text-red-400" />
              <span>{isAmharic ? "አዲስ አክል (Add New)" : "Add New"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                if (searchTerm) setCustomValueInput(searchTerm);
              }}
              className="px-2.5 py-2 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <FileEdit size={13} className="text-amber-400" />
              <span>{isAmharic ? "ሌላ (Other Specify)" : "Other (Specify)"}</span>
            </button>
          </div>

        </div>
      )}

      {/* 5. ADD NEW MASTER ENTRY POPUP DIALOG MODAL */}
      {isCustomMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 animate-in fade-in duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Sparkles size={18} className="text-amber-400" />
                <span>{isAmharic ? `አዲስ የማስተር መረጃ መዝግብ (${category})` : `Add New Master Entry (${category})`}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {submissionFeedback ? (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  submissionFeedback.type === "success" 
                    ? "bg-emerald-950/90 border-emerald-800 text-emerald-200" 
                    : "bg-amber-950/90 border-amber-800 text-amber-200"
                }`}>
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    {submissionFeedback.type === "success" ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Clock3 size={18} className="text-amber-400" />}
                    <span>{submissionFeedback.type === "success" ? "Approved & Master Updated" : "Saved - Pending Approval"}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{submissionFeedback.msg}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitCustomValue} className="space-y-3.5">
                  
                  {/* Name (Required) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAmharic ? "ስም / Name (English or Unicode) *" : "Name / Title *"}
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={customValueInput}
                      onChange={(e) => setCustomValueInput(e.target.value)}
                      placeholder={`e.g. ${category} entry name...`}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 font-medium"
                    />
                  </div>

                  {/* AI SIMILARITY DETECTION / DUPLICATE PREVENTION BOX */}
                  {similarMatches.length > 0 && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-amber-300 font-bold text-[11px]">
                        <span className="flex items-center space-x-1">
                          <AlertCircle size={14} className="text-amber-400" />
                          <span>{isAmharic ? "AI ተመሳስሎ ማወቂያ (Similar Master Entries Found)" : "AI Similarity Detection Notice"}</span>
                        </span>
                        <span className="text-[10px] font-mono bg-amber-900/60 px-1.5 py-0.5 rounded text-amber-200">
                          {similarMatches[0].similarity}% match
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90">
                        {isAmharic 
                          ? "ተመሳሳይ እሴት ቀደም ብሎ ተመዝግቧል። እባክዎን ካሉት አንዱን ይምረጡ ወይም ይቀጥሉ:" 
                          : "A similar entry already exists in the master database. Choose existing or proceed:"}
                      </p>
                      <div className="space-y-1 pt-1">
                        {similarMatches.slice(0, 2).map(({ entry, similarity }) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => handleSelectOption(entry.value)}
                            className="w-full text-left px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs flex justify-between items-center transition"
                          >
                            <span className="font-bold truncate">{entry.value} {entry.labelAm ? `(${entry.labelAm})` : ''}</span>
                            <span className="text-[10px] text-amber-400 font-mono flex-shrink-0 ml-2">Use Existing ({similarity}%)</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code (Optional) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAmharic ? "ኮድ / Code (አማራጭ - Optional)" : "Code (Optional)"}
                    </label>
                    <input
                      type="text"
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value)}
                      placeholder="e.g. CODE-101 / M-04"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 font-mono"
                    />
                  </div>

                  {/* Amharic Translation / Unicode Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAmharic ? "የአማርኛ ስም / Amharic Translation" : "Amharic Name / Unicode"}
                    </label>
                    <input
                      type="text"
                      value={customAmharicInput}
                      onChange={(e) => setCustomAmharicInput(e.target.value)}
                      placeholder="ምሳሌ፡ የአማርኛ መጠሪያ..."
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAmharic ? "መግለጫ / Description" : "Description"}
                    </label>
                    <textarea
                      rows={2}
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Enter technical details or category specs..."
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {isAmharic ? "ማስታወሻ / Remarks" : "Remarks"}
                    </label>
                    <input
                      type="text"
                      value={customRemarks}
                      onChange={(e) => setCustomRemarks(e.target.value)}
                      placeholder="Additional remarks or notes..."
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Action Buttons: Save & Cancel */}
                  <div className="pt-3 border-t border-slate-800 flex justify-end items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomMode(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                    >
                      {isAmharic ? "ሰርዝ (Cancel)" : "Cancel"}
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 transition flex items-center space-x-1.5"
                    >
                      <Check size={15} />
                      <span>{isAmharic ? "አስቀምጥ (Save)" : "Save"}</span>
                    </button>
                  </div>

                </form>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
