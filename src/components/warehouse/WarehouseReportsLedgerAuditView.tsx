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

export function WarehouseReportsLedgerAuditView({
  mode,
  snapshot,
  filters,
  actor,
  onFeedback,
  onOpenPrint,
}: {
  mode: "stock_ledger" | "reports" | "audit_logs" | "notifications" | "settings";
  snapshot: ErpWarehouseSnapshot;
  filters: WarehouseDashboardFilters;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
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
        `Inventory costing method updated to ${updated.valuationMethod} (applies prospectively; historical ledger preserved).`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to update valuation method.");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "reports") {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[11px] font-bold uppercase text-amber-400 mb-1">
              {isScopedStoreManager
                ? `Select Site Store Report (${availableReports.length} Authorized Site Reports)`
                : `Select Enterprise Inventory & Logistics Report (${availableReports.length} Built-In Reports)`}
            </label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value as WarehouseReportType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-semibold"
            >
              {availableReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.category})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportReportToExcel(generatedReport);
                onFeedback("success", `Exported ${generatedReport.title} to Excel (.xlsx).`);
              }}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet size={14} />
              <span>Export Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenPrint(generatedReport.title, buildPrintableReportHtml(generatedReport))}
              className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} />
              <span>Print / PDF Report</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-white">{generatedReport.title}</span>
            <span className="font-mono text-slate-400">{generatedReport.rows.length} rows</span>
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
                      No transactions matched the active filter criteria for this report.
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
              <span>Immutable Stock Movement Ledger & Closing Balance Integrity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Formula: Opening + Received + ReturnedGood − Issued − TransferOut + TransferIn = Usable AvailableQty (Quarantine isolated)
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Active Method: {snapshot.valuationSettings.valuationMethod}
          </span>
        </div>

        {/* Live Balance Equation Check */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-bold uppercase text-cyan-400">
            Stock Balance Integrity Matrix ({snapshot.stockBalances.length})
          </div>
          <div className="overflow-x-auto max-h-60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-right">Recv</th>
                  <th className="px-3 py-2 text-right">RetGood</th>
                  <th className="px-3 py-2 text-right">Issued</th>
                  <th className="px-3 py-2 text-right">AvailQty</th>
                  <th className="px-3 py-2 text-right">Quarantine</th>
                  <th className="px-3 py-2 text-right">Valuation</th>
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
            Append-Only Ledger Transactions ({snapshot.stockLedger.length})
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Voucher</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Dir</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Unit Cost</th>
                  <th className="px-3 py-2 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {snapshot.stockLedger.map((le) => (
                  <tr key={le.id}>
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{le.createdAt.slice(0, 16)}</td>
                    <td className="px-3 py-2 font-mono text-amber-400 font-semibold">{le.voucherType} {le.voucherNo}</td>
                    <td className="px-3 py-2 text-white">{le.locationName}</td>
                    <td className="px-3 py-2 text-slate-200">{le.itemName}</td>
                    <td className="px-3 py-2"><StatusBadge status={le.direction} /></td>
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
            <span>Immutable Inventory Audit Trail ({snapshot.auditLogs.length})</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Append-Only Enforcement</span>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase sticky top-0">
              <tr>
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Module / Action</th>
                <th className="px-3 py-2.5">Ref No</th>
                <th className="px-3 py-2.5">Actor (Role)</th>
                <th className="px-3 py-2.5">Details</th>
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
    return (
      <div className="space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell size={16} className="text-amber-400" />
            <span>Automated ERP Inventory & Approval Notifications ({snapshot.notifications.length})</span>
          </h3>
        </div>
        {snapshot.notifications.map((n) => {
          const isRead = (n.readByUids || []).includes(actor.uid);
          return (
            <div key={n.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={n.severity} />
                  <span className="text-xs font-bold text-white">{n.title}</span>
                  <span className="text-[11px] font-mono text-slate-400">{n.createdAt.slice(0, 16)}</span>
                </div>
                <p className="text-xs text-slate-300">{n.message}</p>
                <div className="text-[11px] text-slate-500">
                  Target Roles: {(n.targetRoles || []).join(", ")}
                </div>
              </div>
              {!isRead && (
                <button
                  type="button"
                  onClick={() => WarehouseStoreDataService.markNotificationRead(n.id, actor.uid)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check size={13} />
                  <span>Mark Read</span>
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
              <span>Inventory Costing & Valuation Policy (Finance Manager Control)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Changes between FIFO and Weighted Moving Average apply strictly going forward without rewriting historical ledger cost entries.
            </p>
          </div>
          {!canConfigValuation && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
              <Lock size={13} />
              Finance Manager Only
            </span>
          )}
        </div>

        <form onSubmit={handleSaveValuation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Active Valuation Method</label>
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
            <label className="block text-[11px] text-slate-400 mb-1">Accounting Policy Reason</label>
            <input
              disabled={!canConfigValuation}
              placeholder="Reason for costing policy change..."
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
              Save Valuation Policy
            </button>
          )}
        </form>

        <div className="border-t border-slate-800 pt-3 space-y-2">
          <div className="text-xs font-bold text-slate-300">Policy Change History</div>
          {(snapshot.valuationSettings.history || []).length === 0 ? (
            <div className="text-xs text-slate-500">Default FIFO policy active since system initialization.</div>
          ) : (
            (snapshot.valuationSettings.history || []).map((h, i) => (
              <div key={i} className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
                <span className="font-mono text-amber-300">{h.previousMethod} → {h.newMethod}</span> by {h.changedByName} on {h.changedAt.slice(0, 10)} ({h.reason})
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
