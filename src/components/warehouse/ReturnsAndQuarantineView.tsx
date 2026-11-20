import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Printer, RotateCcw, ShieldAlert } from "lucide-react";
import { MaterialReturnVoucher, StockBalanceRecord } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { buildPrintableVoucherHtml } from "../../services/warehouseManagementService";
import { StatusBadge } from "./WarehouseSharedUi";

export function ReturnsAndQuarantineView({
  mode,
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
}: {
  mode: "returns_mrv" | "quarantine";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
}) {
  const canSubmit = canPerformWarehouseModuleAction(actor.role, "SUBMIT_TWO_WAY_RETURN");
  const canConfirm = canPerformWarehouseModuleAction(actor.role, "CONFIRM_RETURN_RECEIPT");
  const canReleaseQuarantine = canPerformWarehouseModuleAction(actor.role, "RELEASE_QUARANTINE");

  // MRV Form
  const [direction, setDirection] = useState<"ProjectToWarehouse" | "WarehouseToProject">("ProjectToWarehouse");
  const [sourceId, setSourceId] = useState(snapshot.projectStores[0]?.id || "");
  const [destId, setDestId] = useState(snapshot.warehouses[0]?.id || "");
  const [invType, setInvType] = useState<"Consumable" | "Fixed Asset">("Consumable");
  const [itemId, setItemId] = useState(snapshot.items[0]?.id || "");
  const [assetId, setAssetId] = useState("");
  const [qty, setQty] = useState("1");
  const [condition, setCondition] = useState<"Good" | "Damaged" | "Defective" | "Under Inspection" | "Not Reusable">("Good");
  const [origGiv, setOrigGiv] = useState("");
  const [origGrv, setOrigGrv] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [driverName, setDriverName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitMrv = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const srcObj: any =
        direction === "ProjectToWarehouse"
          ? snapshot.projectStores.find((s) => s.id === sourceId) || snapshot.projectStores[0]
          : snapshot.warehouses.find((w) => w.id === sourceId) || snapshot.warehouses[0];
      const dstObj: any =
        direction === "ProjectToWarehouse"
          ? snapshot.warehouses.find((w) => w.id === destId) || snapshot.warehouses[0]
          : snapshot.projectStores.find((s) => s.id === destId) || snapshot.projectStores[0];
      const meta = snapshot.items.find((i) => i.id === itemId) || snapshot.items[0];
      if (!srcObj || !dstObj || !meta) throw new Error("Source location, destination location, and item are required.");

      const linkedAsset = assetId ? snapshot.fixedAssets.find((a) => a.assetId === assetId) : undefined;
      const created = await WarehouseStoreDataService.submitReturnMrv(
        {
          direction,
          sourceLocationType: direction === "ProjectToWarehouse" ? "ProjectStore" : "Warehouse",
          sourceLocationId: srcObj.id,
          sourceLocationName: srcObj.name,
          destinationLocationType: direction === "ProjectToWarehouse" ? "Warehouse" : "ProjectStore",
          destinationLocationId: dstObj.id,
          destinationLocationName: dstObj.name,
          projectId: srcObj.projectId || dstObj.projectId,
          projectName: srcObj.projectName || dstObj.projectName,
          originalGivNumber: origGiv || undefined,
          originalGrvNumber: linkedAsset?.originalGrvNumber || origGrv || undefined,
          inventoryType: invType,
          vehicleNumber: vehicleNo || undefined,
          driverName: driverName || undefined,
          remarks: remarks || undefined,
          items: [
            {
              itemId: meta.id,
              itemCode: meta.itemCode,
              itemName: meta.itemName,
              unit: meta.unit,
              quantityReturned: Number(qty),
              condition,
              originalGivNumber: origGiv || undefined,
              originalGrvNumber: linkedAsset?.originalGrvNumber || origGrv || undefined,
              assetId: linkedAsset?.assetId || assetId || undefined,
              unitCost: meta.standardUnitCost,
              reason: remarks || undefined,
            },
          ],
        },
        actor
      );
      setRemarks("");
      onFeedback(
        "info",
        `Submitted ${created.mrvNumber}. Balances update strictly after destination inspection & confirmation.`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to submit MRV.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmMrv = async (mrv: MaterialReturnVoucher) => {
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.confirmReturnReceipt(mrv.id, {}, actor);
      onFeedback(
        updated.status === "Quarantined" ? "info" : "success",
        `${updated.mrvNumber} confirmed (${updated.status}). Good stock added to usable balance; damaged/defective routed to Quarantine.`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "MRV confirmation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleaseQuarantine = async (bal: StockBalanceRecord, disposition: "RELEASE_TO_USABLE" | "WRITE_OFF") => {
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.releaseQuarantineStock(
        {
          balanceId: bal.id,
          quantity: bal.quarantineQty,
          disposition,
          notes: `Disposition by ${actor.name}`,
        },
        actor
      );
      onFeedback(
        "success",
        `Quarantine stock disposition '${disposition}' completed for ${updated.itemName}.`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "Quarantine disposition failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const printMrv = (mrv: MaterialReturnVoucher) => {
    const html = buildPrintableVoucherHtml({
      voucherTitle: "MATERIAL RETURN VOUCHER (MRV)",
      voucherNumber: mrv.mrvNumber,
      subtitle: `${mrv.sourceLocationName} → ${mrv.destinationLocationName} (${mrv.direction})`,
      metadata: [
        { label: "Inventory Type", value: mrv.inventoryType },
        { label: "Original GIV", value: mrv.originalGivNumber || "-" },
        { label: "Original GRV", value: mrv.originalGrvNumber || "-" },
        { label: "Gate Pass", value: mrv.gatePassNumber || "-" },
        { label: "Submitted By", value: mrv.submittedByName },
        { label: "Status", value: mrv.status },
      ],
      columns: ["Code", "Item Name", "Returned", "Usable Good", "Quarantined", "Condition", "Asset / Orig GRV"],
      rows: mrv.items.map((i) => [
        i.itemCode,
        i.itemName,
        `${i.quantityReturned} ${i.unit}`,
        i.quantityAcceptedGood,
        i.quantityQuarantined,
        i.condition,
        `${i.assetId || "-"} / ${i.originalGrvNumber || "-"}`,
      ]),
      signatures: ["Returned By (Origin)", "Inspected By (QA/Warehouse)", "Confirmed Receipt"],
    });
    onOpenPrint(`MRV ${mrv.mrvNumber}`, html);
  };

  if (mode === "quarantine") {
    const quarantinedBalances = snapshot.stockBalances.filter((b) => (b.quarantineQty || 0) > 0);
    const quarantinedAssets = snapshot.fixedAssets.filter((a) => a.status === "Quarantined" || a.condition !== "Good");
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-rose-900/50 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>Quarantine & Damaged Stock Segregation Store</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Damaged, Defective, Not Reusable, or Under-Inspection stock is strictly isolated from usable Available Stock and cannot be issued until Warehouse Manager Inspection Release.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
            Quarantined Consumables ({quarantinedBalances.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5 text-right">Quarantine Qty</th>
                  <th className="px-4 py-2.5 text-right">Usable Avail Qty</th>
                  {canReleaseQuarantine && <th className="px-4 py-2.5 text-right">Inspection Disposition</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {quarantinedBalances.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-white">{b.locationName}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">{b.itemCode} — {b.itemName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-rose-400 font-bold tabular-nums">
                      {b.quarantineQty} {b.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-300 tabular-nums">
                      {b.availableQty} {b.unit}
                    </td>
                    {canReleaseQuarantine && (
                      <td className="px-4 py-2.5 text-right space-x-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleReleaseQuarantine(b, "RELEASE_TO_USABLE")}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Release to Usable
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleReleaseQuarantine(b, "WRITE_OFF")}
                          className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirm Write-Off
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {quarantinedBalances.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">No consumable items currently in quarantine.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {quarantinedAssets.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-rose-400">
              Damaged / Quarantined Fixed Assets ({quarantinedAssets.length})
            </div>
            <div className="divide-y divide-slate-800">
              {quarantinedAssets.map((fa) => (
                <div key={fa.id} className="px-4 py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-indigo-300">{fa.assetId}</span> —{" "}
                    <span className="text-white font-semibold">{fa.assetName}</span>{" "}
                    <span className="text-slate-400">(Orig GRV {fa.originalGrvNumber})</span>
                  </div>
                  <StatusBadge status={fa.condition} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {canSubmit && (
        <form onSubmit={handleSubmitMrv} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <RotateCcw size={16} className="text-cyan-400" />
            <span>Two-Way Return Voucher (MRV — Project ↔ Warehouse)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={direction}
              onChange={(e) => {
                const next = e.target.value as any;
                setDirection(next);
                setSourceId(next === "ProjectToWarehouse" ? snapshot.projectStores[0]?.id || "" : snapshot.warehouses[0]?.id || "");
                setDestId(next === "ProjectToWarehouse" ? snapshot.warehouses[0]?.id || "" : snapshot.projectStores[0]?.id || "");
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="ProjectToWarehouse">Project Site Store → Warehouse</option>
              <option value="WarehouseToProject">Warehouse → Project Site Store</option>
            </select>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              {(direction === "ProjectToWarehouse" ? snapshot.projectStores : snapshot.warehouses).map((l) => (
                <option key={l.id} value={l.id}>From: {l.name}</option>
              ))}
            </select>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              {(direction === "ProjectToWarehouse" ? snapshot.warehouses : snapshot.projectStores).map((l) => (
                <option key={l.id} value={l.id}>To: {l.name}</option>
              ))}
            </select>
            <select
              value={invType}
              onChange={(e) => setInvType(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="Consumable">Consumable Return</option>
              <option value="Fixed Asset">Fixed Asset Return</option>
            </select>
            <select
              value={itemId || snapshot.items[0]?.id || ""}
              onChange={(e) => setItemId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              {snapshot.items.map((it) => (
                <option key={it.id} value={it.id}>{it.itemCode} — {it.itemName}</option>
              ))}
            </select>
            {invType === "Fixed Asset" ? (
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">Select Asset ID (Preserves Original GRV)...</option>
                {snapshot.fixedAssets.map((a) => (
                  <option key={a.id} value={a.assetId}>{a.assetId} — {a.assetName} (GRV {a.originalGrvNumber})</option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={1}
                placeholder="Qty Returned"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            )}
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="Good">Good Condition (Usable)</option>
              <option value="Under Inspection">Under Inspection (Quarantine)</option>
              <option value="Damaged">Damaged (Auto-Quarantine)</option>
              <option value="Defective">Defective (Auto-Quarantine)</option>
              <option value="Not Reusable">Not Reusable (Auto-Quarantine)</option>
            </select>
            <input
              placeholder="Original GIV Ref (optional)"
              value={origGiv}
              onChange={(e) => setOrigGiv(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Original GRV Ref (optional)"
              value={origGrv}
              onChange={(e) => setOrigGrv(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Vehicle Plate (optional for Gate Pass)"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Driver Name (optional)"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <input
              placeholder="Return Reason / Damage Description"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>
          {condition !== "Good" && (
            <div className="text-xs text-rose-300 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              <span>Condition "{condition}" will automatically segregate returned stock into Quarantine (never usable Available Qty).</span>
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Submit Return MRV</span>
          </button>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          Two-Way Material Return Vouchers ({snapshot.mrvs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">MRV No</th>
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5">Items & Condition</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshot.mrvs.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-mono text-cyan-400 font-bold">{m.mrvNumber}</td>
                  <td className="px-4 py-2.5 text-white">{m.sourceLocationName} → {m.destinationLocationName}</td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {m.items.map((i) => `${i.itemName} (${i.quantityReturned} ${i.unit}, ${i.condition})`).join(", ")}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {canConfirm && m.status !== "Confirmed Receipt" && m.status !== "Quarantined" && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleConfirmMrv(m)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={12} />
                        <span>Confirm Receipt</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => printMrv(m)}
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
