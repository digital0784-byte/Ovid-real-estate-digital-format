// ============================================================
// DIGITAL CONSTRUCTION ERP SYSTEM - BREADCRUMB NAVIGATION BAR
// Prominent Top-of-Page Navigation Bar with Back Arrow & Path
// ============================================================

import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { useNavigation } from "../../context/NavigationContext";
import { GlobalBackArrow } from "./GlobalBackArrow";
import { ERP_TAB_METADATA } from "../../services/appNavigationService";

interface BreadcrumbNavBarProps {
  isAmharic?: boolean;
  className?: string;
}

export const BreadcrumbNavBar: React.FC<BreadcrumbNavBarProps> = ({
  isAmharic = true,
  className = ""
}) => {
  const { currentTab, currentLocation, previousLocation, navigate, canGoBack } = useNavigation();

  // If on dashboard and no subview, we don't need a heavy breadcrumb
  if (currentTab === "dashboard" && !currentLocation.subView && !canGoBack) {
    return null;
  }

  const meta = ERP_TAB_METADATA[currentTab];
  const currentTitle = isAmharic ? meta?.nameAm || currentTab : meta?.nameEn || currentTab;
  const previousTitle = previousLocation
    ? isAmharic
      ? previousLocation.titleAm
      : previousLocation.titleEn
    : isAmharic
    ? "ዳሽቦርድ"
    : "Dashboard";

  return (
    <div
      className={`mb-5 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-slate-800 ${className}`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 overflow-hidden">
        {/* Global Back Arrow Button */}
        <GlobalBackArrow isAmharic={isAmharic} />

        {/* Breadcrumb Path Trail */}
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs font-semibold overflow-x-auto py-0.5">
          <button
            onClick={() => navigate("dashboard")}
            className="text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            title={isAmharic ? "ወደ ዋና ዳሽቦርድ ሂድ" : "Go to Main Dashboard"}
          >
            <Home size={14} />
            <span className="hidden md:inline">{isAmharic ? "ዳሽቦርድ" : "Dashboard"}</span>
          </button>

          {previousLocation && previousLocation.tab !== "dashboard" && previousLocation.tab !== currentTab && (
            <>
              <ChevronRight size={13} className="text-slate-400 shrink-0" />
              <button
                onClick={() => navigate(previousLocation.tab, { subView: previousLocation.subView, params: previousLocation.params })}
                className="text-slate-500 hover:text-slate-800 transition-colors truncate max-w-[120px] sm:max-w-[180px] cursor-pointer"
                title={previousTitle}
              >
                {previousTitle}
              </button>
            </>
          )}

          <ChevronRight size={13} className="text-slate-400 shrink-0" />
          <span className="text-slate-900 font-bold truncate max-w-[180px] sm:max-w-[280px]">
            {currentTitle}
          </span>

          {currentLocation.subView && (
            <>
              <ChevronRight size={13} className="text-slate-400 shrink-0" />
              <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-mono text-[11px] font-bold">
                {currentLocation.subView}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Module Index Pill */}
      {meta && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-bold">
            MODULE #{meta.num}
          </span>
        </div>
      )}
    </div>
  );
};
