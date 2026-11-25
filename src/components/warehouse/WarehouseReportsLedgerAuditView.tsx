import React, { useState } from "react";
import { Bell, BookOpen, Check, DollarSign, Download, FileSpreadsheet, Lock, Printer, Shield } from "lucide-react";
import { CostValuationMethod, WarehouseDashboardFilters, WarehouseReportType } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import {
  canPerformWarehouseModuleAction,
  resolveExtendedWarehouseRole,
  STORE_MANAGER_ALLOWED_REPORTS,
} from "../../services/warehouseStoreRbac";
import {
  buildPrintableReportHtml,
  computeStockClosingBalance,
  exportReportToExcel,
  generateWarehouseReportData,
  REPORT_CATALOG,
} from "../../services/warehouseManagementService";
import { StatusBadge } from "./WarehouseSharedUi";
import { getReportTitle, tr } from "./warehouseI18n";
import { NotificationService } from "../../services/notificationService";

export function WarehouseReportsLedgerAuditView({
  mode,
  snapshot,
  filters,
  actor,
  onFeedback,
  onOpenPrint,
  isAmharic,
}: {
  mode: "stock_ledger" | "reports" | "audit_logs" | "notifications" | "settings";
  snapshot: ErpWarehouseSnapshot;
  filters: WarehouseDashboardFilters;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
  isAmharic?: boolean;
}) {
  const canConfigValuation = canPerformWarehouseModuleAction(actor.role, "CONFIGURE_VALUATION_METHOD");
  const isScopedStoreManager = resolveExtendedWarehouseRole(actor.role) === "store_manager";
  const availableReports = React.useMemo(
    () =>
      isScopedStoreManager
        ? REPORT_CATALOG.filter((r) => STORE_MANAGER_ALLOWED_REPORTS.has(r.id))
        : REPORT_CATALOG,
    [isScopedStoreManager]
  );
  const [selectedReportType, setSelectedReportType] = useState<WarehouseReportType>(
    (availableReports[0] || REPORT_CATALOG[0]).id
  );
  React.useEffect(() => {
    if (!availableReports.some((r) => r.id === selectedReportType) && availableReports[0]) {
      setSelectedReportType(availableReports[0].id);
    }
  }, [availableReports, selectedReportType]);
  const [valuationChoice, setValuationChoice] = useState<CostValuationMethod>(snapshot.valuationSettings.valuationMethod);
  const [valuationReason, setValuationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const generatedReport = React.useMemo(
    () =>
      generateWarehouseReportData(
        selectedReportType,
        {
          warehouses: snapshot.warehouses,
          projectStores: snapshot.projectStores,
          categories: snapshot.categories,
          items: snapshot.items,
          stockBalances: snapshot.stockBalances,
          stockLedger: snapshot.stockLedger,
          materialPlans: snapshot.materialPlans,
          materialRequests: snapshot.materialRequests,
          grvs: snapshot.grvs,
          givs: snapshot.givs,
          mrvs: snapshot.mrvs,
          fixedAssets: snapshot.fixedAssets,
          fatovs: snapshot.fatovs,
          fativs: snapshot.fativs,
          transports: snapshot.transports,
          gatePasses: snapshot.gatePasses,
          commercialInvoices: snapshot.commercialInvoices,
          auditLogs: snapshot.auditLogs,
        },
        filters,
        `${actor.name} (${actor.role})`
      ),
    [selectedReportType, snapshot, filters, actor.name, actor.role]
  );

  const handleSaveValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.updateValuationMethod(
        { valuationMethod: valuationChoice, reason: valuationReason },
        actor
      );
      setValuationReason("");
      onFeedback(
        "success",
        tr(
          isAmharic,
          `Inventory costing method updated to ${updated.valuationMethod} (applies prospectively; historical ledger preserved).`,
          `የክምችት ዋጋ ስሌት ዘዴ ወደ ${updated.valuationMethod} ተቀይሯል (ለቀጣይ ግብይቶች ብቻ ይተገበራል)።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to update valuation method.", "የዋጋ ስሌት ዘዴውን ማዘመን አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "reports") {
    const localizedReportTitle = getReportTitle(selectedReportType, generatedReport.title, isAmharic);
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[11px] font-bold uppercase text-amber-400 mb-1">
              {isScopedStoreManager
                ? tr(
                    isAmharic,
                    `Select Site Store Report (${availableReports.length} Authorized Site Reports)`,
                    `የሳይት ስቶር ሪፖርት ይምረጡ (${availableReports.length} የተፈቀዱ ሪፖርቶች)`
                  )
                : tr(
                    isAmharic,
                    `Select Enterprise Inventory & Logistics Report (${availableReports.length} Built-In Reports)`,
                    `የድርጅት ክምችት እና ሎጂስቲክስ ሪፖርት ይምረጡ (${availableReports.length} ሪፖርቶች)`
                  )}
            </label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value as WarehouseReportType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-semibold"
            >
              {availableReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {getReportTitle(r.id, r.title, isAmharic)} ({r.category})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportReportToExcel(generatedReport);
                onFeedback("success", tr(isAmharic, `Exported ${generatedReport.title} to Excel (.xlsx).`, `${localizedReportTitle} ወደ Excel (.xlsx) ወጥቷል።`));
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>{tr(isAmharic, "Export Excel (.xlsx)", "Excel (.xlsx) አውጣ")}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPrint(localizedReportTitle, buildPrintableReportHtml(generatedReport))}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              <span>{tr(isAmharic, "Print / PDF Report", "ሪፖርት አትም / PDF")}</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{localizedReportTitle}</span>
            <span className="font-mono text-slate-400">{generatedReport.rows.length} {tr(isAmharic, "rows", "መስመሮች")}</span>
          </div>
          <div className="overflow-x-auto max-h-[540px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                <tr>
                  {generatedReport.columns.map((c) => (
                    <th key={c} className="px-3 py-2.5 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {generatedReport.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    {generatedReport.columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-slate-200 whitespace-nowrap font-mono text-[11px]">
                        {String(row[col] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
                {generatedReport.rows.length === 0 && (
                  <tr>
                    <td colSpan={generatedReport.columns.length} className="px-4 py-8 text-center text-slate-500">
                      {tr(isAmharic, "No transactions matched the active filter criteria for this report.", "ለዚህ ሪፖርት ከተመረጠው ማጣሪያ ጋር የሚዛመድ ግብይት የለም።")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "stock_ledger") {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen size={16} className="text-amber-400" />
              <span>{tr(isAmharic, "Immutable Stock Movement Ledger & Closing Balance Integrity", "ቋሚ የእቃ እንቅስቃሴ መዝገብ (Stock Ledger)")}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {tr(
                isAmharic,
                "Formula: Opening + Received + ReturnedGood − Issued − TransferOut + TransferIn = Usable AvailableQty (Quarantine isolated)",
                "ቀመር: መነሻ + ገቢ + ጥሩ ተመላሽ − ወጪ − የተላከ + የገባ = ጥሩ ክምችት (ኳራንቲን ተለይቷል)"
              )}
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            {tr(isAmharic, "Active Method:", "ንቁ ዘዴ:")} {snapshot.valuationSettings.valuationMethod}
          </span>
        </div>

        {/* Live Balance Equation Check */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-bold uppercase text-cyan-400">
            {tr(isAmharic, "Stock Balance Integrity Matrix", "የክምችት ሚዛን ማረጋገጫ ሰንጠረዥ")} ({snapshot.stockBalances.length})
          </div>
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">{tr(isAmharic, "Location", "ቦታ")}</th>
                  <th className="px-3 py-2">{tr(isAmharic, "Item", "እቃ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Recv", "ገቢ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "RetGood", "ጥሩ ተመላሽ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Issued", "ወጪ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "AvailQty", "የሚገኝ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Quarantine", "ኳራንቲን")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Valuation", "ዋጋ")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {snapshot.stockBalances.map((b) => {
                  const expected = computeStockClosingBalance(b);
                  const ok = Math.abs(expected - b.availableQty) < 0.01;
                  return (
                    <tr key={b.id}>
                      <td className="px-3 py-2 text-white">{b.locationName}</td>
                      <td className="px-3 py-2 text-slate-200">{b.itemCode} — {b.itemName}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{b.receivedQty}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{b.returnedQty}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{b.issuedQty}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold tabular-nums ${ok ? "text-emerald-400" : "text-rose-400"}`}>
                        {b.availableQty} {b.unit}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-rose-300 tabular-nums">{b.quarantineQty}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-300 tabular-nums">{b.totalValuation.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Append-only Ledger Entries */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-bold uppercase text-white">
            {tr(isAmharic, "Append-Only Ledger Transactions", "የማይሻሩ የመዝገብ ግብይቶች")} ({snapshot.stockLedger.length})
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">{tr(isAmharic, "Timestamp", "ጊዜ")}</th>
                  <th className="px-3 py-2">{tr(isAmharic, "Voucher", "ደረሰኝ")}</th>
                  <th className="px-3 py-2">{tr(isAmharic, "Location", "ቦታ")}</th>
                  <th className="px-3 py-2">{tr(isAmharic, "Item", "እቃ")}</th>
                  <th className="px-3 py-2">{tr(isAmharic, "Dir", "አቅጣጫ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Qty", "ብዛት")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Unit Cost", "ነጠላ ዋጋ")}</th>
                  <th className="px-3 py-2 text-right">{tr(isAmharic, "Balance After", "ቀሪ ሚዛን")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {snapshot.stockLedger.map((le) => (
                  <tr key={le.id}>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{le.createdAt.slice(0, 16)}</td>
                    <td className="px-3 py-2 font-mono text-amber-400 font-semibold">{le.voucherType} {le.voucherNo}</td>
                    <td className="px-3 py-2 text-white">{le.locationName}</td>
                    <td className="px-3 py-2 text-slate-200">{le.itemName}</td>
                    <td className="px-3 py-2"><StatusBadge status={le.direction} isAmharic={isAmharic} /></td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{le.quantity}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{le.unitCost}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300 tabular-nums">{le.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "audit_logs") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-white flex items-center gap-2">
            <Shield size={15} className="text-amber-400" />
            <span>{tr(isAmharic, "Immutable Inventory Audit Trail", "የማይለወጥ የክምችት ኦዲት መዝገብ")} ({snapshot.auditLogs.length})</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">{tr(isAmharic, "Append-Only Enforcement", "ተጨማሪ-ብቻ ቁጥጥር")}</span>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase sticky top-0">
              <tr>
                <th className="px-3 py-2.5">{tr(isAmharic, "Timestamp", "ጊዜ")}</th>
                <th className="px-3 py-2.5">{tr(isAmharic, "Module / Action", "ክፍል / ድርጊት")}</th>
                <th className="px-3 py-2.5">{tr(isAmharic, "Ref No", "ማጣቀሻ ቁጥር")}</th>
                <th className="px-3 py-2.5">{tr(isAmharic, "Actor (Role)", "ፈጻሚ (ሚና)")}</th>
                <th className="px-3 py-2.5">{tr(isAmharic, "Details", "ዝርዝር")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshot.auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400 whitespace-nowrap">{log.timestamp.slice(0, 19)}</td>
                  <td className="px-3 py-2 font-mono text-amber-300 font-semibold">{log.module} / {log.action}</td>
                  <td className="px-3 py-2 font-mono text-cyan-300">{log.entityNumber || log.entityId}</td>
                  <td className="px-3 py-2 text-white">{log.actorName} ({log.actorRole})</td>
                  <td className="px-3 py-2 text-slate-300">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === "notifications") {
    const visibleNotifications = snapshot.notifications.filter((n) =>
      NotificationService.isNotificationTargetedToUser(n as any, {
        role: actor.role,
        uid: actor.uid,
      })
    );
    return (
      <div className="space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            <span>{tr(isAmharic, "Automated ERP Inventory & Approval Notifications", "ራስ-ሰር የERP ክምችት እና ማፅደቂያ ማስጠንቀቂያዎች")} ({visibleNotifications.length})</span>
          </h3>
        </div>
        {visibleNotifications.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
            {tr(isAmharic, "No notifications targeted to your role.", "ለእርስዎ የስራ ድርሻ የተላኩ ማስጠንቀቂያዎች የሉም።")}
          </div>
        )}
        {visibleNotifications.map((n) => {
          const isRead = (n.readByUids || []).includes(actor.uid);
          return (
            <div key={n.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={n.severity} isAmharic={isAmharic} />
                  <span className="text-xs font-bold text-white">{n.title}</span>
                  <span className="text-[11px] font-mono text-slate-400">{n.createdAt.slice(0, 16)}</span>
                </div>
                <p className="text-xs text-slate-300">{n.message}</p>
                <div className="text-[11px] text-slate-500">
                  {tr(isAmharic, "Target Roles:", "የሚመለከታቸው ሚናዎች:")} {(n.targetRoles || []).join(", ")}
                </div>
              </div>
              {!isRead && (
                <button
                  type="button"
                  onClick={() => WarehouseStoreDataService.markNotificationRead(n.id, actor.uid)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check size={13} />
                  <span>{tr(isAmharic, "Mark Read", "ተነብቧል በል")}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // SETTINGS TAB (Finance Manager / Super Admin Valuation Method Switch)
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign size={16} className="text-amber-400" />
              <span>{tr(isAmharic, "Inventory Costing & Valuation Policy (Finance Manager Control)", "የክምችት ዋጋ ግምት ፖሊሲ (የፋይናንስ ማናጀር ቁጥጥር)")}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {tr(isAmharic, "Changes between FIFO and Weighted Moving Average apply strictly going forward without rewriting historical ledger cost entries.", "በFIFO እና Weighted Moving Average መካከል የሚደረግ ለውጥ የቆየውን መዝገብ ሳይነካ ለቀጣይ ግብይቶች ብቻ ይተገበራል።")}
            </p>
          </div>
          {!canConfigValuation && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
              <Lock size={13} />
              {tr(isAmharic, "Finance Manager Only", "የፋይናንስ ማናጀር ብቻ")}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveValuation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "Active Valuation Method", "ንቁ የዋጋ ግምት ዘዴ")}</label>
            <select
              disabled={!canConfigValuation}
              value={valuationChoice}
              onChange={(e) => setValuationChoice(e.target.value as CostValuationMethod)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white disabled:opacity-60"
            >
              <option value="FIFO">FIFO (First-In, First-Out)</option>
              <option value="Weighted Moving Average">Weighted Moving Average</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "Accounting Policy Reason", "የፖሊሲ ለውጥ ምክንያት")}</label>
            <input
              disabled={!canConfigValuation}
              placeholder={tr(isAmharic, "Reason for costing policy change...", "የዋጋ ግምት ፖሊሲ መቀየሪያ ምክንያት...")}
              value={valuationReason}
              onChange={(e) => setValuationReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white disabled:opacity-60"
            />
          </div>
          {canConfigValuation && (
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
            >
              {tr(isAmharic, "Save Valuation Policy", "የዋጋ ፖሊሲውን አስቀምጥ")}
            </button>
          )}
        </form>

        <div className="border-t border-slate-800 pt-3 space-y-2">
          <div className="text-xs font-bold text-slate-300">{tr(isAmharic, "Policy Change History", "የፖሊሲ ለውጥ ታሪክ")}</div>
          {(snapshot.valuationSettings.history || []).length === 0 ? (
            <div className="text-xs text-slate-500">{tr(isAmharic, "Default FIFO policy active since system initialization.", "ከስርዓቱ መጀመሪያ ጀምሮ መደበኛ FIFO ፖሊሲ ንቁ ነው።")}</div>
          ) : (
            (snapshot.valuationSettings.history || []).map((h, i) => (
              <div key={i} className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                <span className="font-mono text-amber-300">{h.previousMethod} → {h.newMethod}</span> {tr(isAmharic, "by", "በ")} {h.changedByName} {tr(isAmharic, "on", "በቀን")} {h.changedAt.slice(0, 10)} ({h.reason})
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
