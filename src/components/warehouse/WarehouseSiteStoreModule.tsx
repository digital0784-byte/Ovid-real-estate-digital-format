import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Languages,
  Lock,
  PackageCheck,
  PackagePlus,
  QrCode,
  RotateCcw,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  Truck,
  Wrench,
} from "lucide-react";
import { UserRole, WarehouseDashboardFilters, Worker } from "../../types";
import {
  ErpWarehouseSnapshot,
  subscribeWarehouseErpModule,
  WarehouseActorContext,
} from "../../services/warehouseStoreDataService";
import {
  canPerformWarehouseModuleAction,
  getAuthorizedSectionsForRole,
  WarehouseSectionKey,
} from "../../services/warehouseStoreRbac";
import { getWarehouseSectionLabel, tr } from "./warehouseI18n";
import { ActionFeedbackBanner, PrintPreviewModal } from "./WarehouseSharedUi";
import { InventoryDashboardView } from "./InventoryDashboardView";
import { MasterDataAndFacilitiesView } from "./MasterDataAndFacilitiesView";
import { MaterialPlanningAndRequestsView } from "./MaterialPlanningAndRequestsView";
import { GrvAndCommercialInvoiceView } from "./GrvAndCommercialInvoiceView";
import { DispatchAndGivView } from "./DispatchAndGivView";
import { FixedAssetsAndTransfersView } from "./FixedAssetsAndTransfersView";
import { ReturnsAndQuarantineView } from "./ReturnsAndQuarantineView";
import { TransportAndGatePassView } from "./TransportAndGatePassView";
import { WarehouseReportsLedgerAuditView } from "./WarehouseReportsLedgerAuditView";
import { StoreOwnerApp } from "../StoreOwnerApp";

const SECTION_META: Array<{ key: WarehouseSectionKey; label: string; icon: React.ComponentType<any> }> = [
  { key: "dashboard", label: "Dashboard (15 KPIs)", icon: BarChart3 },
  { key: "warehouse_inventory", label: "Warehouse & Catalog", icon: Building2 },
  { key: "site_stores", label: "Project Site Stores", icon: Store },
  { key: "material_planning", label: "Material Plans", icon: FileText },
  { key: "material_requests", label: "Requests & Plan Verification", icon: Send },
  { key: "director_approvals", label: "Director Approvals", icon: ShieldCheck },
  { key: "grv", label: "GRV & Receiving", icon: PackagePlus },
  { key: "commercial_invoices", label: "Commercial Invoices", icon: FileCheck2 },
  { key: "giv_dispatch", label: "Dispatch & GIV", icon: PackageCheck },
  { key: "fixed_assets_big_balance", label: "Assets BIG BALANCE", icon: Wrench },
  { key: "project_fixed_assets", label: "Project Assets", icon: Store },
  { key: "fatov_fativ", label: "Asset Transfers (FATOV/FATIV)", icon: ArrowRightLeft },
  { key: "transportation", label: "Transportation (11)", icon: Truck },
  { key: "gate_pass", label: "Gate Passes (QR)", icon: QrCode },
  { key: "returns_mrv", label: "Two-Way Returns (MRV)", icon: RotateCcw },
  { key: "quarantine_stock", label: "Quarantine Stock", icon: AlertTriangle },
  { key: "stock_ledger", label: "Stock Ledger", icon: BookOpen },
  { key: "reports", label: "Reports (22 Excel/PDF)", icon: FileSpreadsheet },
  { key: "warehouse_fleet_formwork", label: "Fleet, Depots & Formwork Ops", icon: Truck },
  { key: "store_field_operations", label: "Site Requisitions & Crew Ops", icon: ClipboardCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "audit_logs", label: "Audit Trail", icon: Shield },
  { key: "settings", label: "Valuation Settings", icon: Settings },
];

export function WarehouseSiteStoreModule({
  currentUserRole,
  currentUserProfile,
  isAmharic = false,
  onToggleLanguage,
  workers = [],
  onLogAction,
  onCreateNotification,
}: {
  currentUserRole: UserRole;
  currentUserProfile: any;
  isAmharic?: boolean;
  onToggleLanguage?: () => void;
  workers?: Worker[];
  onLogAction?: (action: string, details: string) => void;
  onCreateNotification?: (notification: any) => void;
}) {
  const [localAmharicOverride, setLocalAmharicOverride] = useState<boolean | null>(null);
  const effectiveAmharic = localAmharicOverride !== null ? localAmharicOverride : isAmharic;

  const handleToggleLang = () => {
    if (onToggleLanguage) {
      setLocalAmharicOverride(null);
      onToggleLanguage();
    } else {
      setLocalAmharicOverride(!effectiveAmharic);
    }
  };

  const actor: WarehouseActorContext = {
    uid: currentUserProfile?.uid || `UID-${String(currentUserRole).replace(/\s+/g, "_")}`,
    name: currentUserProfile?.displayName || `${currentUserRole} User`,
    role: currentUserRole,
    assignedProject: currentUserProfile?.assignedProject || currentUserProfile?.projectId,
    assignedSite: currentUserProfile?.assignedSite || currentUserProfile?.siteId,
  };

  const authorizedSections = React.useMemo(
    () => getAuthorizedSectionsForRole(currentUserRole),
    [currentUserRole]
  );

  const isStoreOrSiteSide =
    canPerformWarehouseModuleAction(currentUserRole, "CREATE_MATERIAL_REQUEST") &&
    !canPerformWarehouseModuleAction(currentUserRole, "VERIFY_RETURN_MATERIAL_REQUEST") &&
    !canPerformWarehouseModuleAction(currentUserRole, "PREPARE_CONFIRM_DISPATCH_GIV");

  const [activeSection, setActiveSection] = useState<WarehouseSectionKey>(
    authorizedSections[0] || "dashboard"
  );
  const [snapshot, setSnapshot] = useState<ErpWarehouseSnapshot | null>(null);
  const [filters, setFilters] = useState<WarehouseDashboardFilters>({
    dateFrom: "",
    dateTo: "",
    projectId: "ALL",
    locationId: "ALL",
    categoryId: "ALL",
    inventoryType: "ALL",
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [printPreview, setPrintPreview] = useState<{ title: string; html: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeWarehouseErpModule((nextSnap) => {
      setSnapshot(nextSnap);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authorizedSections.includes(activeSection)) {
      setActiveSection(authorizedSections[0] || "dashboard");
    }
  }, [authorizedSections, activeSection]);

  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
  };

  if (!snapshot) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        {tr(
          effectiveAmharic,
          "Connecting to Enterprise Warehouse & Site Store Firestore streams...",
          "ከመጋዘን እና ሳይት ስቶር የFirestore መረጃ ስርዓት ጋር በመገናኘት ላይ..."
        )}
      </div>
    );
  }

  const unreadCount = snapshot.notifications.filter(
    (n) => !(n.readByUids || []).includes(actor.uid)
  ).length;
  const visibleTabs = SECTION_META.filter((m) => authorizedSections.includes(m.key));
  const isFinanceReadOnly = currentUserRole === UserRole.FINANCE_MANAGER;

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] font-bold uppercase text-amber-300">
              {tr(effectiveAmharic, "OVID ERP Logistics & Inventory", "OVID ERP መጋዘን እና ክምችት ስርዓት")}
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              {tr(effectiveAmharic, "Valuation", "የዋጋ ግምት")}: {snapshot.valuationSettings.valuationMethod}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-white mt-1">
            {tr(effectiveAmharic, "Warehouse & Site Store Management", "የመጋዘን እና ሳይት ስቶር አስተዳደር")}
          </h2>
          <p className="text-xs text-slate-400">
            {tr(effectiveAmharic, "Role", "ሚና")}: <strong className="text-white">{currentUserRole}</strong>
            {actor.assignedProject ? ` · ${tr(effectiveAmharic, "Scope", "ፕሮጀክት")}: ${actor.assignedProject}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isFinanceReadOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold">
              <Lock size={13} />
              {tr(
                effectiveAmharic,
                "Read-Only Financial Oversight (+ Valuation Settings)",
                "ለንባብ ብቻ የፋይናንስ ቁጥጥር (+ የዋጋ ግምት ቅንብር)"
              )}
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleLang}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
            title={tr(effectiveAmharic, "Switch to Amharic", "ወደ እንግሊዝኛ ቀይር")}
          >
            <Languages size={14} />
            <span>{effectiveAmharic ? "English" : "አማርኛ"}</span>
          </button>
          {authorizedSections.includes("notifications") && (
            <button
              type="button"
              onClick={() => setActiveSection("notifications")}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Bell size={14} className="text-amber-400" />
              <span>
                {tr(effectiveAmharic, "Alerts", "ማስጠንቀቂያ")} ({unreadCount})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Role-Filtered Section Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.key;
          const label = getWarehouseSectionLabel(tab.key, tab.label, effectiveAmharic, {
            isStoreOrSiteSide,
          });
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <ActionFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Active Workspace View */}
      <div>
        {activeSection === "dashboard" && (
          <InventoryDashboardView
            snapshot={snapshot}
            filters={filters}
            onChangeFilters={setFilters}
            authorizedSections={authorizedSections}
            isAmharic={effectiveAmharic}
            onNavigateSection={(sec) => {
              if (authorizedSections.includes(sec)) setActiveSection(sec);
            }}
          />
        )}

        {(activeSection === "warehouse_inventory" || activeSection === "site_stores") && (
          <MasterDataAndFacilitiesView
            mode={activeSection}
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
          />
        )}

        {(activeSection === "material_planning" ||
          activeSection === "material_requests" ||
          activeSection === "director_approvals") && (
          <MaterialPlanningAndRequestsView
            mode={activeSection}
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
          />
        )}

        {(activeSection === "grv" || activeSection === "commercial_invoices") && (
          <GrvAndCommercialInvoiceView
            mode={activeSection}
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
            onOpenPrint={(title, html) => setPrintPreview({ title, html })}
          />
        )}

        {activeSection === "giv_dispatch" && (
          <DispatchAndGivView
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
            onOpenPrint={(title, html) => setPrintPreview({ title, html })}
          />
        )}

        {(activeSection === "fixed_assets_big_balance" ||
          activeSection === "project_fixed_assets" ||
          activeSection === "fatov_fativ") && (
          <FixedAssetsAndTransfersView
            mode={activeSection}
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
            onOpenPrint={(title, html) => setPrintPreview({ title, html })}
          />
        )}

        {(activeSection === "returns_mrv" || activeSection === "quarantine_stock") && (
          <ReturnsAndQuarantineView
            mode={activeSection}
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
            onOpenPrint={(title, html) => setPrintPreview({ title, html })}
          />
        )}

        {(activeSection === "transportation" || activeSection === "gate_pass") && (
          <TransportAndGatePassView
            mode={activeSection}
            snapshot={snapshot}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
            onOpenPrint={(title, html) => setPrintPreview({ title, html })}
          />
        )}

        {(activeSection === "stock_ledger" ||
          activeSection === "reports" ||
          activeSection === "audit_logs" ||
          activeSection === "notifications" ||
          activeSection === "settings") && (
          <WarehouseReportsLedgerAuditView
            mode={activeSection}
            snapshot={snapshot}
            filters={filters}
            actor={actor}
            isAmharic={effectiveAmharic}
            onFeedback={showFeedback}
            onOpenPrint={(title, html) => setPrintPreview({ title, html })}
          />
        )}

        {(activeSection === "warehouse_fleet_formwork" || activeSection === "store_field_operations") && (
          <StoreOwnerApp
            isAmharic={effectiveAmharic}
            currentUserRole={currentUserRole}
            currentUserProfile={currentUserProfile}
            workers={workers}
            embeddedMode={true}
            embeddedCategory={activeSection}
            initialMode={activeSection === "warehouse_fleet_formwork" ? "warehouse_manager" : "store_owner"}
            onLogAction={onLogAction}
            onCreateNotification={onCreateNotification}
          />
        )}
      </div>

      {printPreview && (
        <PrintPreviewModal
          title={printPreview.title}
          html={printPreview.html}
          isAmharic={effectiveAmharic}
          onClose={() => setPrintPreview(null)}
        />
      )}
    </div>
  );
}
