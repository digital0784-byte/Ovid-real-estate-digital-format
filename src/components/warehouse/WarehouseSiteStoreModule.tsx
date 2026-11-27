import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  Database,
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
import { NotificationService } from "../../services/notificationService";
import {
  canPerformWarehouseModuleAction,
  getAuthorizedSectionsForRole,
  WarehouseSectionKey,
} from "../../services/warehouseStoreRbac";
import {
  canViewWarehouseHubSection,
  getWarehouseHubSectionsForRole,
  isWarehouseHubSectionReadOnly,
  WarehouseHubSectionConfig,
  WarehouseHubSectionId,
} from "../../config/warehouseSections";
import { getWarehouseSectionLabel, tr } from "./warehouseI18n";
import { ActionFeedbackBanner, PrintPreviewModal } from "./WarehouseSharedUi";
import { InventoryDashboardView } from "./InventoryDashboardView";
import { MasterDataAndFacilitiesView } from "./MasterDataAndFacilitiesView";
import { MasterDataCatalogGovernanceView } from "./MasterDataCatalogGovernanceView";
import { MaterialPlanningAndRequestsView } from "./MaterialPlanningAndRequestsView";
import { GrvAndCommercialInvoiceView } from "./GrvAndCommercialInvoiceView";
import { DispatchAndGivView } from "./DispatchAndGivView";
import { FixedAssetsAndTransfersView } from "./FixedAssetsAndTransfersView";
import { ReturnsAndQuarantineView } from "./ReturnsAndQuarantineView";
import { TransportAndGatePassView } from "./TransportAndGatePassView";
import { WarehouseReportsLedgerAuditView } from "./WarehouseReportsLedgerAuditView";
import { StoreOwnerApp } from "../StoreOwnerApp";

const HUB_SECTION_ICONS: Record<WarehouseHubSectionId, React.ComponentType<any>> = {
  overview: BarChart3,
  warehouse_operations: ClipboardCheck,
  master_data_facilities: Building2,
  catalog_governance: Database,
  planning_requests: FileText,
  grv_invoices: PackagePlus,
  dispatch_giv: PackageCheck,
  fixed_assets_transfers: Wrench,
  transport_gate_pass: Truck,
  returns_quarantine: RotateCcw,
  reports_ledger_audit: FileSpreadsheet,
};

const CHILD_SUBTAB_META: Record<WarehouseSectionKey, { en: string; icon: React.ComponentType<any> }> = {
  dashboard: { en: "Dashboard (15 KPIs)", icon: BarChart3 },
  warehouse_inventory: { en: "Warehouse & Stock Master", icon: Building2 },
  site_stores: { en: "Project Site Stores", icon: Store },
  material_planning: { en: "Material Plans", icon: FileText },
  material_requests: { en: "Requests & Plan Verification", icon: Send },
  director_approvals: { en: "Director Approvals", icon: ShieldCheck },
  grv: { en: "GRV & Receiving", icon: PackagePlus },
  commercial_invoices: { en: "Commercial Invoices", icon: FileCheck2 },
  giv_dispatch: { en: "Dispatch & GIV", icon: PackageCheck },
  fixed_assets_big_balance: { en: "Assets BIG BALANCE", icon: Wrench },
  project_fixed_assets: { en: "Project Assets", icon: Store },
  fatov_fativ: { en: "Asset Transfers (FATOV/FATIV)", icon: ArrowRightLeft },
  transportation: { en: "Transportation (11)", icon: Truck },
  gate_pass: { en: "Gate Passes (QR)", icon: QrCode },
  returns_mrv: { en: "Two-Way Returns (MRV)", icon: RotateCcw },
  quarantine_stock: { en: "Quarantine Stock", icon: AlertTriangle },
  stock_ledger: { en: "Stock Ledger", icon: BookOpen },
  reports: { en: "Reports (22 Excel/PDF)", icon: FileSpreadsheet },
  warehouse_fleet_formwork: { en: "Warehouse Daily Operations", icon: Truck },
  store_field_operations: { en: "Site Requisitions & Crew Ops", icon: ClipboardCheck },
  notifications: { en: "Notifications", icon: Bell },
  audit_logs: { en: "Audit Trail", icon: Shield },
  settings: { en: "Valuation Settings", icon: Settings },
};

function findParentHubSection(
  childKey: WarehouseSectionKey,
  visibleHubSections: WarehouseHubSectionConfig[]
): WarehouseHubSectionId | null {
  const match = visibleHubSections.find((sec) => sec.childSectionKeys.includes(childKey));
  return match ? match.id : null;
}

export function WarehouseSiteStoreModule({
  currentUserRole,
  currentUserProfile,
  isAmharic = false,
  onToggleLanguage,
  workers = [],
  onLogAction,
  onCreateNotification,
  initialSection,
}: {
  currentUserRole: UserRole;
  currentUserProfile: any;
  isAmharic?: boolean;
  onToggleLanguage?: () => void;
  workers?: Worker[];
  onLogAction?: (action: string, details: string) => void;
  onCreateNotification?: (notification: any) => void;
  initialSection?: WarehouseHubSectionId;
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

  const authorizedChildSections = useMemo(
    () => getAuthorizedSectionsForRole(currentUserRole),
    [currentUserRole]
  );

  const visibleHubSections = useMemo(
    () => getWarehouseHubSectionsForRole(currentUserRole),
    [currentUserRole]
  );

  const isStoreOrSiteSide =
    canPerformWarehouseModuleAction(currentUserRole, "CREATE_MATERIAL_REQUEST") &&
    !canPerformWarehouseModuleAction(currentUserRole, "VERIFY_RETURN_MATERIAL_REQUEST") &&
    !canPerformWarehouseModuleAction(currentUserRole, "PREPARE_CONFIRM_DISPATCH_GIV");

  const resolvedInitialSection = useMemo<WarehouseHubSectionId>(() => {
    if (initialSection && canViewWarehouseHubSection(currentUserRole, initialSection)) {
      return initialSection;
    }
    return visibleHubSections[0]?.id || "overview";
  }, [initialSection, currentUserRole, visibleHubSections]);

  const [activeSection, setActiveSection] = useState<WarehouseHubSectionId>(resolvedInitialSection);
  const [activeSubTabs, setActiveSubTabs] = useState<Partial<Record<WarehouseHubSectionId, WarehouseSectionKey>>>({});
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
    if (initialSection && canViewWarehouseHubSection(currentUserRole, initialSection)) {
      setActiveSection(initialSection);
    } else if (initialSection && !canViewWarehouseHubSection(currentUserRole, initialSection)) {
      setFeedback({
        type: "error",
        message: tr(
          effectiveAmharic,
          `Access Denied: Role '${currentUserRole}' is not authorized to open '${initialSection}'.`,
          `መዳረሻ ተከልክሏል፡ '${currentUserRole}' ይህንን ክፍል መክፈት አይችልም።`
        ),
      });
    }
  }, [initialSection, currentUserRole, effectiveAmharic]);

  useEffect(() => {
    const unsub = subscribeWarehouseErpModule(
      (nextSnap) => {
        setSnapshot(nextSnap);
      },
      {
        role: currentUserRole,
        uid: actor.uid,
        assignedProject: actor.assignedProject,
      }
    );
    return () => unsub();
  }, [currentUserRole, actor.uid, actor.assignedProject]);

  useEffect(() => {
    if (!visibleHubSections.some((s) => s.id === activeSection)) {
      setActiveSection(visibleHubSections[0]?.id || "overview");
    }
  }, [visibleHubSections, activeSection]);

  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
  };

  if (!snapshot) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        {tr(
          effectiveAmharic,
          "Connecting to Warehouse & Site Store Firestore streams...",
          "ከመጋዘን እና ሳይት ስቶር የFirestore መረጃ ስርዓት ጋር በመገናኘት ላይ..."
        )}
      </div>
    );
  }

  const visibleNotifications = snapshot.notifications.filter((n) =>
    NotificationService.isNotificationTargetedToUser(n as any, {
      role: currentUserRole,
      uid: actor.uid,
    })
  );
  const unreadCount = visibleNotifications.filter(
    (n) => !(n.readByUids || []).includes(actor.uid)
  ).length;

  const currentSectionConfig =
    visibleHubSections.find((s) => s.id === activeSection) || visibleHubSections[0];
  const isCurrentSectionReadOnly = isWarehouseHubSectionReadOnly(
    currentUserRole,
    activeSection
  );

  // Filter internal sub-tabs for the active consolidated section based on role permissions
  const getAllowedSubTabs = (secConfig: WarehouseHubSectionConfig | undefined): WarehouseSectionKey[] => {
    if (!secConfig) return [];
    const allowed = secConfig.childSectionKeys.filter((k) => authorizedChildSections.includes(k));
    // Fallback to configured keys if user has section visibility without explicit child override
    return allowed.length > 0 ? allowed : secConfig.childSectionKeys;
  };

  const activeSectionSubTabs = getAllowedSubTabs(currentSectionConfig);
  const resolvedSubTab: WarehouseSectionKey | undefined = (() => {
    const saved = activeSubTabs[activeSection];
    if (saved && activeSectionSubTabs.includes(saved)) return saved;
    return activeSectionSubTabs[0];
  })();

  const setSubTabForSection = (sectionId: WarehouseHubSectionId, key: WarehouseSectionKey) => {
    setActiveSubTabs((prev) => ({ ...prev, [sectionId]: key }));
  };

  const handleDashboardNavigateChildSection = (childKey: WarehouseSectionKey) => {
    const parentId = findParentHubSection(childKey, visibleHubSections);
    if (!parentId) return;
    setActiveSection(parentId);
    setSubTabForSection(parentId, childKey);
  };

  const showSubTabBar =
    activeSection !== "overview" &&
    activeSection !== "warehouse_operations" &&
    activeSection !== "catalog_governance" &&
    activeSection !== "dispatch_giv" &&
    activeSectionSubTabs.length > 1;

  return (
    <div className="space-y-4">
      {/* Unified Hub Header */}
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
            {tr(effectiveAmharic, "Warehouse & Site Store", "መጋዘን እና ሳይት ስቶር")}
          </h2>
          <p className="text-xs text-slate-400">
            {tr(effectiveAmharic, "Role", "ሚና")}: <strong className="text-white">{currentUserRole}</strong>
            {actor.assignedProject ? ` · ${tr(effectiveAmharic, "Scope", "ፕሮጀክት")}: ${actor.assignedProject}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isCurrentSectionReadOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold">
              <Lock size={13} />
              {currentUserRole === UserRole.FINANCE_MANAGER
                ? tr(
                    effectiveAmharic,
                    "Read-Only Financial Oversight (+ Valuation Settings)",
                    "ለንባብ ብቻ የፋይናንስ ቁጥጥር (+ የዋጋ ግምት ቅንብር)"
                  )
                : tr(effectiveAmharic, "Read-Only Role View", "ለንባብ ብቻ የተፈቀደ እይታ")}
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
          {authorizedChildSections.includes("notifications") &&
            canViewWarehouseHubSection(currentUserRole, "reports_ledger_audit") && (
              <button
                type="button"
                onClick={() => {
                  setActiveSection("reports_ledger_audit");
                  setSubTabForSection("reports_ledger_audit", "notifications");
                }}
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

      {/* Single Top-Level Consolidated Section Bar (Hidden if Unauthorized) */}
      <nav
        aria-label={tr(effectiveAmharic, "Warehouse & Site Store Sections", "የመጋዘን እና ሳይት ስቶር ክፍሎች")}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5"
      >
        {visibleHubSections.map((sec) => {
          const Icon = HUB_SECTION_ICONS[sec.id] || BarChart3;
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              data-section-id={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                active
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <Icon size={13} />
              <span>{effectiveAmharic ? sec.titleAm : sec.titleEn}</span>
            </button>
          );
        })}
      </nav>

      {/* Internal Sub-Tab Bar for Consolidated Multi-View Sections */}
      {showSubTabBar && (
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 flex flex-wrap items-center gap-1.5">
          {activeSectionSubTabs.map((subKey) => {
            const meta = CHILD_SUBTAB_META[subKey];
            const SubIcon = meta.icon;
            const isSubActive = resolvedSubTab === subKey;
            const label = getWarehouseSectionLabel(subKey, meta.en, effectiveAmharic, {
              isStoreOrSiteSide,
            });
            return (
              <button
                key={subKey}
                type="button"
                data-subtab-id={subKey}
                onClick={() => setSubTabForSection(activeSection, subKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSubActive
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <SubIcon size={12} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      <ActionFeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />

      {/* Active Workspace View */}
      <div>
        {activeSection === "overview" && canViewWarehouseHubSection(currentUserRole, "overview") && (
          <InventoryDashboardView
            snapshot={snapshot}
            filters={filters}
            onChangeFilters={setFilters}
            authorizedSections={authorizedChildSections}
            isAmharic={effectiveAmharic}
            onNavigateSection={(sec) => handleDashboardNavigateChildSection(sec)}
          />
        )}

        {activeSection === "warehouse_operations" &&
          canViewWarehouseHubSection(currentUserRole, "warehouse_operations") && (
            <StoreOwnerApp
              mode="warehouse"
              isAmharic={effectiveAmharic}
              currentUserRole={currentUserRole}
              currentUserProfile={currentUserProfile}
              workers={workers}
              embeddedMode={true}
              warehouseSnapshot={snapshot}
              onLogAction={onLogAction}
              onCreateNotification={onCreateNotification}
            />
          )}

        {activeSection === "master_data_facilities" &&
          canViewWarehouseHubSection(currentUserRole, "master_data_facilities") &&
          (resolvedSubTab === "warehouse_inventory" || resolvedSubTab === "site_stores") && (
            <MasterDataAndFacilitiesView
              mode={resolvedSubTab}
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
            />
          )}

        {activeSection === "catalog_governance" &&
          canViewWarehouseHubSection(currentUserRole, "catalog_governance") && (
            <MasterDataCatalogGovernanceView
              isAmharic={effectiveAmharic}
              currentUserRole={currentUserRole}
              currentUserName={actor.name}
              readOnly={isCurrentSectionReadOnly}
            />
          )}

        {activeSection === "planning_requests" &&
          canViewWarehouseHubSection(currentUserRole, "planning_requests") &&
          (resolvedSubTab === "material_planning" ||
            resolvedSubTab === "material_requests" ||
            resolvedSubTab === "director_approvals") && (
            <MaterialPlanningAndRequestsView
              mode={resolvedSubTab}
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
            />
          )}

        {activeSection === "grv_invoices" &&
          canViewWarehouseHubSection(currentUserRole, "grv_invoices") &&
          (resolvedSubTab === "grv" || resolvedSubTab === "commercial_invoices") && (
            <GrvAndCommercialInvoiceView
              mode={resolvedSubTab}
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
              onOpenPrint={(title, html) => setPrintPreview({ title, html })}
            />
          )}

        {activeSection === "dispatch_giv" &&
          canViewWarehouseHubSection(currentUserRole, "dispatch_giv") && (
            <DispatchAndGivView
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
              onOpenPrint={(title, html) => setPrintPreview({ title, html })}
            />
          )}

        {activeSection === "fixed_assets_transfers" &&
          canViewWarehouseHubSection(currentUserRole, "fixed_assets_transfers") &&
          (resolvedSubTab === "fixed_assets_big_balance" ||
            resolvedSubTab === "project_fixed_assets" ||
            resolvedSubTab === "fatov_fativ") && (
            <FixedAssetsAndTransfersView
              mode={resolvedSubTab}
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
              onOpenPrint={(title, html) => setPrintPreview({ title, html })}
            />
          )}

        {activeSection === "transport_gate_pass" &&
          canViewWarehouseHubSection(currentUserRole, "transport_gate_pass") &&
          (resolvedSubTab === "transportation" || resolvedSubTab === "gate_pass") && (
            <TransportAndGatePassView
              mode={resolvedSubTab}
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
              onOpenPrint={(title, html) => setPrintPreview({ title, html })}
            />
          )}

        {activeSection === "returns_quarantine" &&
          canViewWarehouseHubSection(currentUserRole, "returns_quarantine") &&
          (resolvedSubTab === "returns_mrv" || resolvedSubTab === "quarantine_stock") && (
            <ReturnsAndQuarantineView
              mode={resolvedSubTab}
              snapshot={snapshot}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
              onOpenPrint={(title, html) => setPrintPreview({ title, html })}
            />
          )}

        {activeSection === "reports_ledger_audit" &&
          canViewWarehouseHubSection(currentUserRole, "reports_ledger_audit") &&
          (resolvedSubTab === "stock_ledger" ||
            resolvedSubTab === "reports" ||
            resolvedSubTab === "audit_logs" ||
            resolvedSubTab === "notifications" ||
            resolvedSubTab === "settings") && (
            <WarehouseReportsLedgerAuditView
              mode={resolvedSubTab}
              snapshot={snapshot}
              filters={filters}
              actor={actor}
              isAmharic={effectiveAmharic}
              onFeedback={showFeedback}
              onOpenPrint={(title, html) => setPrintPreview({ title, html })}
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
