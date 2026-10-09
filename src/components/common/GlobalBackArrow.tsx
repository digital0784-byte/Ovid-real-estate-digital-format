// ============================================================
// DIGITAL CONSTRUCTION ERP SYSTEM - GLOBAL BACK ARROW
// Consistent Page Header Back Button with Responsive Labels & Tooltips
// ============================================================

import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";

interface GlobalBackArrowProps {
  label?: string;
  showText?: boolean;
  className?: string;
  isAmharic?: boolean;
  onCustomBack?: () => void;
  tooltip?: string;
}

export const GlobalBackArrow: React.FC<GlobalBackArrowProps> = ({
  label,
  showText = true,
  className = "",
  isAmharic = true,
  onCustomBack,
  tooltip
}) => {
  const { goBack, canGoBack, previousLocation } = useNavigation();

  // If there is nowhere to go back and no custom handler, do not render or render disabled
  if (!canGoBack && !onCustomBack) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCustomBack) {
      onCustomBack();
    } else {
      goBack();
    }
  };

  const displayText = label || (isAmharic ? "ተመለስ" : "Back");
  const prevTitle = isAmharic ? previousLocation?.titleAm : previousLocation?.titleEn;
  const hoverTooltip = tooltip || (prevTitle ? `${displayText}: ${prevTitle}` : displayText);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={hoverTooltip}
      aria-label={hoverTooltip}
      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border border-slate-300/80 transition-all cursor-pointer font-bold shadow-2xs shrink-0 select-none ${className}`}
    >
      <ArrowLeft
        size={17}
        className="text-slate-700 group-hover:-translate-x-0.5 transition-transform"
      />
      {showText && (
        <span className="text-xs font-bold text-slate-700 tracking-tight">
          {displayText}
        </span>
      )}
    </button>
  );
};
