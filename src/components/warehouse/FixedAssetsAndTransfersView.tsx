import React, { useState } from "react";
import { ArrowRightLeft, CheckCircle2, History, Printer, Send, Wrench, X } from "lucide-react";
import { FixedAssetRecord, FixedAssetTransferOut } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { buildPrintableVoucherHtml } from "../../services/warehouseManagementService";
import { StatusBadge } from "./WarehouseSharedUi";

export function FixedAssetsAndTransfersView({
  mode,
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
}: {
  mode: "fixed_assets_big_balance" | "project_fixed_assets" | "fatov" | "fativ";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
}) {
  const canFatov = canPerformWarehouseModuleAction(actor.role, "CREATE_FATOV");
  const canFativ = canPerformWarehouseModuleAction(actor.role, "CONFIRM_FATIV");

  const [historyAsset, setHistoryAsset] = useState<FixedAssetRecord | null>(null);
  const [selectedProjFilter, setSelectedProjFilter] = useState("ALL");

  // FATOV form
  const transferableAssets = snapshot.fixedAssets.filter((a) => a.status !== "In Transit");
  const [fatovAssetDocId, setFatovAssetDocId] = useState(transferableAssets[0]?.id || "");
  const [toType, setToType] = useState<"ProjectStore" | "Warehouse">("ProjectStore");
  const [toLocId, setToLocId] = useState(snapshot.projectStores[0]?.id || "");
  const [vehicleNumber, setVehicleNumber] = useState(snapshot.erpTrucks[0]?.plateNumber || "");
  const [driverName, setDriverName] = useState(snapshot.erpTrucks[0]?.driverName || "");
  const [submitting, setSubmitting] = useState(false);

  // FATIV partial/discrepancy modal state
  const [receivingFatov, setReceivingFatov] = useState<FixedAssetTransferOut | null>(null);
  const [fativQty, setFativQty] = useState("1");
  const [fativCond, setFativCond] = useState<"Good" | "Damaged" | "Defective" | "Under Inspection">("Good");
  const [fativReason, setFativReason] = useState("");

  const handleDispatchFatov = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const asset = snapshot.fixedAssets.find((a) => a.id === fatovAssetDocId) || transferableAssets[0];
      if (!asset) throw new Error("No available Fixed Asset selected for transfer.");
      const targetList = toType === "Warehouse" ? snapshot.warehouses : snapshot.projectStores;
      const dest: any = targetList.find((l) => l.id === toLocId) || targetList[0];
      if (!dest) throw new Error("Select a valid destination Warehouse or Project Store.");

      const res = await WarehouseStoreDataService.dispatchFixedAssetFatov(
        {
          assetDocId: asset.id,
          toLocationType: toType,
          toLocationId: dest.id,
          toLocationName: dest.name,
          projectId: dest.projectId,
          projectName: dest.projectName,
          vehicleNumber,
          driverName,
        },
        actor
      );
      onFeedback(
        "success",
        `Dispatched ${res.fatov.fatovNumber} for ${res.asset.assetId} (Orig GRV ${res.asset.originalGrvNumber}). Location stays in transit until FATIV confirmation.`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "FATOV dispatch failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmFativ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingFatov) return;
    setSubmitting(true);
    try {
      const res = await WarehouseStoreDataService.confirmFixedAssetFativ(
        {
          fatovId: receivingFatov.id,
          quantityReceived: Number(fativQty),
          conditionReceived: fativCond,
          discrepancyReason: fativReason || undefined,
        },
        actor
      );
      setReceivingFatov(null);
      setFativReason("");
      onFeedback(
        "success",
        `Confirmed ${res.fativ.fativNumber}! Asset ${res.asset.assetId} moved to ${res.asset.currentLocationName} (Original GRV ${res.asset.originalGrvNumber} preserved).`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "FATIV confirmation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const printFatov = (f: FixedAssetTransferOut) => {
    const html = buildPrintableVoucherHtml({
      voucherTitle: "FIXED ASSET TRANSFER OUT VOUCHER (FATOV)",
      voucherNumber: f.fatovNumber,
      subtitle: `${f.fromLocationName} → ${f.toLocationName}`,
      metadata: [
        { label: "Permanent Asset ID", value: f.assetId },
        { label: "Original GRV No", value: f.originalGrvNumber },
        { label: "Serial Number", value: f.serialNumber },
        { label: "Gate Pass No", value: f.gatePassNumber || "-" },
        { label: "Vehicle / Driver", value: `${f.vehicleNumber} / ${f.driverName}` },
        { label: "Condition Sent", value: f.conditionSent },
      ],
      columns: ["Asset ID", "Description", "Orig GRV", "Qty Sent", "Condition", "Status"],
      rows: [[f.assetId, f.assetName, f.originalGrvNumber, f.quantitySent, f.conditionSent, f.status]],
      signatures: ["Issued By (Warehouse / Store)", "Gate Security Exit", "Received By (Destination)"],
    });
    onOpenPrint(`FATOV ${f.fatovNumber}`, html);
  };

  if (mode === "fixed_assets_big_balance" || mode === "project_fixed_assets") {
    const isBigBalance = mode === "fixed_assets_big_balance";
    const rows = snapshot.fixedAssets.filter((fa) => {
      if (isBigBalance) return true;
      if (fa.currentLocationType !== "ProjectStore") return false;
      if (selectedProjFilter !== "ALL" && fa.currentProjectId !== selectedProjFilter) return false;
      return true;
    });

    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench size={16} className="text-indigo-400" />
              <span>
                {isBigBalance
                  ? "BIG BALANCE — Central Fixed Asset Master Register"
                  : "Per-Project Fixed Asset Register"}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanent Asset IDs and Original GRV Numbers remain locked to every asset across its entire lifecycle.
            </p>
          </div>
          {!isBigBalance && (
            <select
              value={selectedProjFilter}
              onChange={(e) => setSelectedProjFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">All Projects</option>
              {snapshot.erpProjects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name || p.title}</option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Asset ID</th>
                  <th className="px-4 py-2.5">Asset Name & Serial</th>
                  <th className="px-4 py-2.5">Original GRV</th>
                  <th className="px-4 py-2.5">Current Location</th>
                  <th className="px-4 py-2.5">Condition</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((fa) => (
                  <tr key={fa.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono text-indigo-400 font-bold">{fa.assetId}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-white font-semibold">{fa.assetName}</div>
                      <div className="text-[11px] font-mono text-slate-400">SN: {fa.serialNumber}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-emerald-300 font-semibold">{fa.originalGrvNumber}</td>
                    <td className="px-4 py-2.5 text-slate-200">
                      <div>{fa.currentLocationName}</div>
                      {fa.currentProjectName && <div className="text-[11px] text-cyan-300">{fa.currentProjectName}</div>}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={fa.condition} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={fa.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setHistoryAsset(fa)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <History size={12} />
                        <span>Timeline ({(fa.transferHistory || []).length})</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No fixed assets registered in this view yet. Receive Fixed Asset equipment via GRV to capitalize into BIG BALANCE.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {historyAsset && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-mono text-indigo-400 font-bold">
                    {historyAsset.assetId} · Orig GRV {historyAsset.originalGrvNumber}
                  </div>
                  <h4 className="text-sm font-bold text-white">{historyAsset.assetName}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryAsset(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {(historyAsset.transferHistory || []).map((ev) => (
                  <div key={ev.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-400">
                        {ev.voucherType} — {ev.voucherNumber}
                      </span>
                      <span className="font-mono text-slate-400">{ev.date}</span>
                    </div>
                    <div className="text-white font-medium">
                      {ev.fromLocation} → {ev.toLocation}
                    </div>
                    <div className="text-slate-400">
                      Condition: {ev.condition} · Receiver: {ev.receiverName || "-"}
                    </div>
                    {ev.notes && <div className="text-[11px] text-slate-400">{ev.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "fatov") {
    return (
      <div className="space-y-5">
        {canFatov && (
          <form onSubmit={handleDispatchFatov} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send size={16} className="text-amber-400" />
              <span>Fixed Asset Transfer Out Voucher (FATOV) — Automatic Gate Pass & In-Transit Lock</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={fatovAssetDocId || transferableAssets[0]?.id || ""}
                onChange={(e) => setFatovAssetDocId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {transferableAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.assetId} — {a.assetName} ({a.currentLocationName})
                  </option>
                ))}
              </select>
              <select
                value={toType}
                onChange={(e) => {
                  const next = e.target.value as any;
                  setToType(next);
                  setToLocId(next === "Warehouse" ? snapshot.warehouses[0]?.id || "" : snapshot.projectStores[0]?.id || "");
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="ProjectStore">Transfer to Project Site Store</option>
                <option value="Warehouse">Return / Transfer to Central Warehouse</option>
              </select>
              <select
                value={toLocId}
                onChange={(e) => setToLocId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {(toType === "Warehouse" ? snapshot.warehouses : snapshot.projectStores).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <input
                required
                placeholder="Vehicle Plate Number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                required
                placeholder="Driver Name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || transferableAssets.length === 0}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft size={14} />
              <span>Dispatch FATOV & Generate Gate Pass</span>
            </button>
          </form>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
            FATOV Transfer Register ({snapshot.fatovs.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">FATOV No</th>
                  <th className="px-4 py-2.5">Asset ID</th>
                  <th className="px-4 py-2.5">Orig GRV</th>
                  <th className="px-4 py-2.5">Route</th>
                  <th className="px-4 py-2.5">Gate Pass</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {snapshot.fatovs.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{f.fatovNumber}</td>
                    <td className="px-4 py-2.5 font-mono text-indigo-300">{f.assetId} — {f.assetName}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-300">{f.originalGrvNumber}</td>
                    <td className="px-4 py-2.5 text-white">{f.fromLocationName} → {f.toLocationName}</td>
                    <td className="px-4 py-2.5 font-mono text-cyan-300">{f.gatePassNumber}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => printFatov(f)}
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

  // FATIV RECEIPT CONFIRMATION MODE
  const pendingFatovs = snapshot.fatovs.filter((f) => f.status === "Dispatched");
  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>Fixed Asset Transfer In Voucher (FATIV) — Receiving Confirmation</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Asset location updates ONLY when FATIV receiving is confirmed. Duplicate FATIV submissions are strictly prevented.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-amber-400">
          In-Transit FATOVs Awaiting Receiving Confirmation ({pendingFatovs.length})
        </div>
        <div className="divide-y divide-slate-800">
          {pendingFatovs.map((f) => (
            <div key={f.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-mono font-bold text-amber-400">
                  {f.fatovNumber} · {f.assetId} (Orig GRV {f.originalGrvNumber})
                </div>
                <div className="text-white font-semibold mt-0.5">{f.assetName}</div>
                <div className="text-slate-400">
                  {f.fromLocationName} → {f.toLocationName} · Vehicle {f.vehicleNumber}
                </div>
              </div>
              {canFativ && (
                <button
                  type="button"
                  onClick={() => {
                    setReceivingFatov(f);
                    setFativQty(String(f.quantitySent));
                    setFativCond("Good");
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Confirm FATIV Receipt</span>
                </button>
              )}
            </div>
          ))}
          {pendingFatovs.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              No in-transit Fixed Assets awaiting FATIV confirmation.
            </div>
          )}
        </div>
      </div>

      {/* Confirmed FATIVs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          Completed FATIV Register ({snapshot.fativs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">FATIV No</th>
                <th className="px-4 py-2.5">FATOV Ref</th>
                <th className="px-4 py-2.5">Asset ID</th>
                <th className="px-4 py-2.5">Orig GRV</th>
                <th className="px-4 py-2.5">Received At</th>
                <th className="px-4 py-2.5">Sent / Recv</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshot.fativs.map((fv) => (
                <tr key={fv.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{fv.fativNumber}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{fv.fatovNumber}</td>
                  <td className="px-4 py-2.5 font-mono text-indigo-300">{fv.assetId}</td>
                  <td className="px-4 py-2.5 font-mono text-amber-300">{fv.originalGrvNumber}</td>
                  <td className="px-4 py-2.5 text-white">{fv.receivingLocationName}</td>
                  <td className="px-4 py-2.5 font-mono tabular-nums">{fv.quantitySent} / {fv.quantityReceived}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={fv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receivingFatov && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmFativ} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-3">
            <h4 className="text-sm font-bold text-white">
              Confirm FATIV Receipt for {receivingFatov.fatovNumber} ({receivingFatov.assetId})
            </h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Quantity Received (Sent: {receivingFatov.quantitySent})</label>
              <input
                type="number"
                min={0}
                max={receivingFatov.quantitySent}
                value={fativQty}
                onChange={(e) => setFativQty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Inspected Condition</label>
              <select
                value={fativCond}
                onChange={(e) => setFativCond(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="Good">Good (Usable)</option>
                <option value="Under Inspection">Under Inspection (Quarantine)</option>
                <option value="Damaged">Damaged (Quarantine)</option>
                <option value="Defective">Defective (Quarantine)</option>
              </select>
            </div>
            {Number(fativQty) !== receivingFatov.quantitySent && (
              <input
                required
                placeholder="Mandatory discrepancy reason..."
                value={fativReason}
                onChange={(e) => setFativReason(e.target.value)}
                className="w-full bg-slate-950 border border-rose-700 rounded-lg px-3 py-2 text-xs text-white"
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReceivingFatov(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm & Update Asset Location
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
