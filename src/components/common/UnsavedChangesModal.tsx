// ============================================================
// DIGITAL CONSTRUCTION ERP SYSTEM - UNSAVED CHANGES MODAL
// Guard Dialog: Save Changes | Discard Changes | Cancel
// ============================================================

import React, { useState } from "react";
import { AlertTriangle, Save, Trash2, X } from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";

interface UnsavedChangesModalProps {
  isAmharic?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isAmharic = true
}) => {
  const {
    isUnsavedModalOpen,
    activeUnsavedGuard,
    confirmDiscardAndLeave,
    confirmSaveAndLeave,
    cancelNavigation
  } = useNavigation();

  const [isSaving, setIsSaving] = useState(false);

  if (!isUnsavedModalOpen || !activeUnsavedGuard) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await confirmSaveAndLeave();
    } finally {
      setIsSaving(false);
    }
  };

  const title = isAmharic ? "ያልተቀመጡ ለውጦች አሉ!" : "Unsaved Changes Detected!";
  const message = isAmharic
    ? (activeUnsavedGuard.messageAm ||
       "በቅጹ ላይ ያስገቧቸው ወይም ያሻሻሏቸው ያልተቀመጡ መረጃዎች አሉ። ከመውጣትዎ በፊት ማስቀመጥ ይፈልጋሉ ወይስ ይሰረዙ?")
    : (activeUnsavedGuard.messageEn ||
       "You have unsaved changes in this form. Would you like to save them before leaving, or discard them?");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden text-slate-900 animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-modal-title"
      >
        {/* Header */}
        <div className="bg-amber-500 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-600/60 rounded-xl">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <h3 id="unsaved-modal-title" className="text-base font-black tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={cancelNavigation}
            className="p-1 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed font-sans font-medium">
            {message}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-mono">
            {isAmharic 
              ? "⚠️ 'ለውጦችን አስቀር' ከመረጡ የሞሏቸው መረጃዎች በሙሉ ይጠፋሉ!" 
              : "⚠️ Choosing 'Discard Changes' will permanently drop your entered inputs!"}
          </div>
        </div>

        {/* Actions - 3 Options: Save Changes | Discard Changes | Cancel */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
          {/* Cancel */}
          <button
            type="button"
            onClick={cancelNavigation}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            {isAmharic ? "ይቅር / Cancel" : "Cancel"}
          </button>

          {/* Discard Changes */}
          <button
            type="button"
            onClick={confirmDiscardAndLeave}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-rose-950/20"
          >
            <Trash2 size={14} />
            <span>{isAmharic ? "ለውጦችን አስቀር (Discard)" : "Discard Changes"}</span>
          </button>

          {/* Save Changes (if save handler provided) */}
          {activeUnsavedGuard.onSave && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
            >
              <Save size={14} />
              <span>
                {isSaving
                  ? (isAmharic ? "በመመዝገብ ላይ..." : "Saving...")
                  : (isAmharic ? "ለውጦችን መዝግብ (Save)" : "Save Changes")}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
