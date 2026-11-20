import React, { useState } from "react";
import { CheckCircle2, Printer, Send, Truck } from "lucide-react";
import { GoodsIssueVoucher } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { buildPrintableVoucherHtml } from "../../services/warehouseManagementService";
import { StatusBadge } from "./WarehouseSharedUi";

export function DispatchAndGivView({
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
}: {
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
}) {
  const canDispatch = canPerformWarehouseModuleAction(actor.role, "PREPARE_CONFIRM_DISPATCH_GIV");
  const canReceive = canPerformWarehouseModuleAction(actor.role, "CONFIRM_CONSUMABLE_RECEIPT");

  const dispatchableRequests = snapshot.materialRequests.filter(
    (r) => r.status === "Director Approved" || r.status === "Partially Dispatched"
  );

  const [selectedReqId, setSelectedReqId] = useState(dispatchableRequests[0]?.id || "");
  const [vehicleNumber, setVehicleNumber] = useState(snapshot.erpTrucks[0]?.plateNumber || "");
  const [driverName, setDriverName] = useState(snapshot.erpTrucks[0]?.driverName || "");
  const [driverPhone, setDriverPhone] = useState("");
  const [dispatchQtys, setDispatchQtys] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const activeReq =
    dispatchableRequests.find((r) => r.id === selectedReqId) || dispatchableRequests[0];

  const handleDispatchGiv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;
    setSubmitting(true);
    try {
      const dispatchItems = activeReq.items
        .map((it) => ({
          itemId: it.itemId,
          itemCode: it.itemCode,
          dispatchQty: Number(dispatchQtys[it.itemId] ?? it.remainingDispatchQty),
        }))
        .filter((d) => d.dispatchQty > 0);
      if (dispatchItems.length === 0) throw new Error("Specify positive dispatch quantity for at least one line.");

      const res = await WarehouseStoreDataService.dispatchConsumablesGiv(
        {
          requestId: activeReq.id,
          vehicleNumber,
          driverName,
          driverPhone: driverPhone || undefined,
          dispatchItems,
        },
        actor
      );
      setDispatchQtys({});
      onFeedback(
        "success",
        `Confirmed ${res.giv.givNumber} (${res.request.status}). Gate Pass ${res.gatePass.gatePassNumber} generated & warehouse stock deducted!`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "GIV dispatch failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGivReceipt = async (giv: GoodsIssueVoucher) => {
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.confirmConsumableGivReceipt({ givId: giv.id }, actor);
      onFeedback("success", `Confirmed Site Store receipt for ${updated.givNumber}. Project store balance updated!`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to confirm GIV receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintGiv = (giv: GoodsIssueVoucher) => {
    const html = buildPrintableVoucherHtml({
      voucherTitle: "GOODS ISSUE VOUCHER (GIV)",
      voucherNumber: giv.givNumber,
      subtitle: `${giv.warehouseName} → ${giv.projectStoreName} (${giv.projectName})`,
      metadata: [
        { label: "Request Reference", value: giv.requestNumber },
        { label: "Gate Pass No", value: giv.gatePassNumber || "-" },
        { label: "Transport No", value: giv.transportNumber || "-" },
        { label: "Vehicle / Driver", value: `${giv.vehicleNumber} / ${giv.driverName}` },
        { label: "Dispatched At", value: (giv.dispatchedAt || giv.createdAt).slice(0, 16) },
        { label: "Total Valuation", value: `${giv.totalCost.toLocaleString()} ETB` },
      ],
      columns: ["Code", "Material", "Approved", "Prev Issued", "This Dispatch", "Remaining", "Total Cost"],
      rows: giv.items.map((i) => [
        i.itemCode,
        i.itemName,
        `${i.approvedQty} ${i.unit}`,
        i.previouslyDispatchedQty,
        i.dispatchedQty,
        i.remainingPendingQty,
        i.totalCost,
      ]),
      signatures: ["Issued By (Warehouse Manager)", "Driver / Material Handling", "Received By (Site Store Owner)"],
    });
    onOpenPrint(`GIV ${giv.givNumber}`, html);
  };

  return (
    <div className="space-y-5">
      {canDispatch && (
        <form onSubmit={handleDispatchGiv} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send size={16} className="text-amber-400" />
            <span>Prepare & Confirm Partial / Full Dispatch (GIV — Director Approved Requests Only)</span>
          </h3>

          {dispatchableRequests.length === 0 ? (
            <div className="text-xs text-slate-400">
              No requests currently hold permanent Director Approval with pending dispatch quantities.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Approved Request</label>
                  <select
                    value={activeReq?.id || ""}
                    onChange={(e) => setSelectedReqId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    {dispatchableRequests.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.requestNumber} — {r.projectStoreName} ({r.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Vehicle Plate Number</label>
                  <input
                    required
                    list="erp-fleet-plates"
                    placeholder="e.g. ET-AA-48291"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  />
                  <datalist id="erp-fleet-plates">
                    {snapshot.erpTrucks.map((t: any) => (
                      <option key={t.id} value={t.plateNumber} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Driver Name</label>
                  <input
                    required
                    placeholder="Driver Full Name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Driver Phone</label>
                  <input
                    placeholder="Optional contact phone"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {activeReq && (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="px-3 py-2">Material</th>
                        <th className="px-3 py-2 text-right">Approved Qty</th>
                        <th className="px-3 py-2 text-right">Already Issued</th>
                        <th className="px-3 py-2 text-right">Remaining</th>
                        <th className="px-3 py-2 text-right">Dispatch Now (Partial/Full)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {activeReq.items.map((it) => (
                        <tr key={it.itemId}>
                          <td className="px-3 py-2 text-white font-semibold">
                            {it.itemCode} — {it.itemName}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{it.approvedQty} {it.unit}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-400">{it.dispatchedQty}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-300 font-bold">
                            {it.remainingDispatchQty}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              max={it.remainingDispatchQty}
                              value={dispatchQtys[it.itemId] ?? it.remainingDispatchQty}
                              onChange={(e) =>
                                setDispatchQtys({
                                  ...dispatchQtys,
                                  [it.itemId]: Number(e.target.value),
                                })
                              }
                              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-right"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Truck size={14} />
                <span>Confirm GIV Dispatch & Issue Gate Pass</span>
              </button>
            </>
          )}
        </form>
      )}

      {/* Issued GIV Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          Goods Issue Vouchers (GIV Register — {snapshot.givs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">GIV No</th>
                <th className="px-4 py-2.5">Request</th>
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5">Gate Pass</th>
                <th className="px-4 py-2.5 text-right">Cost</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshot.givs.map((giv) => (
                <tr key={giv.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{giv.givNumber}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{giv.requestNumber}</td>
                  <td className="px-4 py-2.5 text-white">
                    {giv.warehouseName} → {giv.projectStoreName}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-cyan-300">{giv.gatePassNumber || "-"}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-300">
                    {giv.totalCost.toLocaleString()} ETB
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={giv.status} /></td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {canReceive && giv.status === "Dispatched" && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleConfirmGivReceipt(giv)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={12} />
                        <span>Confirm Receipt</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePrintGiv(giv)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>Voucher</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
