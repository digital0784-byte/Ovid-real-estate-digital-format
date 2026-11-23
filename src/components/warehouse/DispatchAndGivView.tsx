import React, { useState } from "react";
import { CheckCircle2, PackageCheck, Printer, Send, Truck } from "lucide-react";
import { FixedAssetTransferOut, GoodsIssueVoucher } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { buildPrintableVoucherHtml } from "../../services/warehouseManagementService";
import { tr } from "./warehouseI18n";
import { StatusBadge } from "./WarehouseSharedUi";

export function DispatchAndGivView({
  snapshot,
  actor,
  isAmharic = false,
  onFeedback,
  onOpenPrint,
}: {
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  isAmharic?: boolean;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
}) {
  const canDispatch = canPerformWarehouseModuleAction(actor.role, "PREPARE_CONFIRM_DISPATCH_GIV");
  const canReceive = canPerformWarehouseModuleAction(actor.role, "CONFIRM_CONSUMABLE_RECEIPT");
  const canConfirmFativ = canPerformWarehouseModuleAction(actor.role, "CONFIRM_FATIV");

  const dispatchableRequests = snapshot.materialRequests.filter(
    (r) => r.status === "Director Approved" || r.status === "Partially Dispatched"
  );
  const pendingIncomingGivs = snapshot.givs.filter((g) => g.status === "Dispatched");
  const pendingIncomingFatovs = snapshot.fatovs.filter((f) => f.status === "Dispatched");

  const [selectedReqId, setSelectedReqId] = useState(dispatchableRequests[0]?.id || "");
  const [vehicleNumber, setVehicleNumber] = useState(snapshot.erpTrucks[0]?.plateNumber || "");
  const [driverName, setDriverName] = useState(snapshot.erpTrucks[0]?.driverName || "");
  const [driverPhone, setDriverPhone] = useState("");
  const [dispatchQtys, setDispatchQtys] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // Incoming Fixed Asset (FATIV) confirmation modal state for Store / Site Manager
  const [receivingFatov, setReceivingFatov] = useState<FixedAssetTransferOut | null>(null);
  const [fativQty, setFativQty] = useState("1");
  const [fativCond, setFativCond] = useState<"Good" | "Damaged" | "Defective" | "Under Inspection">("Good");
  const [fativReason, setFativReason] = useState("");

  const activeReq =
    dispatchableRequests.find((r) => r.id === selectedReqId) || dispatchableRequests[0];

  const handleDispatchGiv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq) return;
    setSubmitting(true);
    try {
      const dispatchItems = (activeReq.items || [])
        .map((it) => ({
          itemId: it.itemId,
          itemCode: it.itemCode,
          dispatchQty: Number(dispatchQtys[it.itemId] ?? it.remainingDispatchQty),
        }))
        .filter((d) => d.dispatchQty > 0);
      if (dispatchItems.length === 0) {
        throw new Error(
          tr(
            isAmharic,
            "Specify positive dispatch quantity for at least one line.",
            "ቢያንስ ለአንድ እቃ ትክክለኛ የመላኪያ ብዛት ያስገቡ።"
          )
        );
      }

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
        tr(
          isAmharic,
          `Confirmed ${res.giv.givNumber} (${res.request.status}). Gate Pass ${res.gatePass.gatePassNumber} generated & warehouse stock deducted!`,
          `${res.giv.givNumber} (${res.request.status}) ተረጋግጧል። የበር ማለፊያ ${res.gatePass.gatePassNumber} ወጥቷል፣ ከመጋዘን ክምችትም ተቀንሷል።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "GIV dispatch failed.", "የGIV መላኪያ አልተሳካም።"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGivReceipt = async (giv: GoodsIssueVoucher) => {
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.confirmConsumableGivReceipt({ givId: giv.id }, actor);
      onFeedback(
        "success",
        tr(
          isAmharic,
          `Confirmed Site Store receipt for ${updated.givNumber}. Project store balance updated!`,
          `ለ${updated.givNumber} በሳይት ስቶር መቀበሉ ተረጋግጧል። የፕሮጀክት ስቶር ክምችት ዘምኗል።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to confirm GIV receipt.", "የGIV መቀበያ ማረጋገጫ አልተሳካም።"));
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
        tr(
          isAmharic,
          `Confirmed ${res.fativ.fativNumber}! Asset ${res.asset.assetId} moved to ${res.asset.currentLocationName}.`,
          `${res.fativ.fativNumber} ተረጋግጧል! ንብረት ${res.asset.assetId} ወደ ${res.asset.currentLocationName} ገብቷል።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "FATIV confirmation failed.", "የFATIV መቀበያ ማረጋገጫ አልተሳካም።"));
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
      rows: (giv.items || []).map((i) => [
        i.itemCode,
        i.itemName,
        `${i.approvedQty} ${i.unit}`,
        i.previouslyDispatchedQty,
        i.dispatchedQty,
        i.remainingPendingQty,
        i.totalCost,
      ]),
      signatures: ["Issued By (Warehouse Manager)", "Driver / Material Handling", "Received By (Site Manager / Store Manager)"],
    });
    onOpenPrint(`GIV ${giv.givNumber}`, html);
  };

  return (
    <div className="space-y-5">
      {/* Dedicated Receiving Queue for Store Manager / Site Manager */}
      {canReceive && (
        <div className="bg-slate-900 border border-emerald-800/50 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PackageCheck size={16} className="text-emerald-400" />
                <span>
                  {tr(
                    isAmharic,
                    "Receive Items Dispatched by Warehouse Manager (GIV & Fixed Asset FATIV)",
                    "ከመጋዘን ማናጀር የተላኩ እቃዎች መቀበያ (GIV እና ቋሚ ንብረት FATIV)"
                  )}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {tr(
                  isAmharic,
                  "Confirm physical arrival of consumables (GIV) and fixed assets (FATIV) from the central warehouse to update your project site store balance.",
                  "ከዋናው መጋዘን የተላኩ አላቂ እቃዎች (GIV) እና ቋሚ ንብረቶች (FATIV) መድረሳቸውን ሲያረጋግጡ የሳይት ስቶር ክምችት ወዲያውኑ ይዘምናል።"
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-300 font-bold">
                GIV: {pendingIncomingGivs.length} {tr(isAmharic, "Pending", "በመጠባበቅ ላይ")}
              </span>
              {canConfirmFativ && (
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 font-bold">
                  FATIV: {pendingIncomingFatovs.length} {tr(isAmharic, "In Transit", "በመንገድ ላይ")}
                </span>
              )}
            </div>
          </div>

          {/* Pending Consumable GIV Deliveries */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase text-emerald-400">
              {tr(
                isAmharic,
                `Incoming Consumable Deliveries Awaiting Receipt Confirmation (${pendingIncomingGivs.length})`,
                `መቀበያ ማረጋገጫ የሚጠብቁ የተላኩ እቃዎች — GIV (${pendingIncomingGivs.length})`
              )}
            </div>
            {pendingIncomingGivs.length === 0 ? (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                {tr(
                  isAmharic,
                  "No dispatched GIV deliveries currently awaiting receipt confirmation.",
                  "በአሁኑ ጊዜ መቀበያ ማረጋገጫ የሚጠብቅ የተላከ የGIV እቃ የለም።"
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingIncomingGivs.map((giv) => (
                  <div
                    key={giv.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-400">{giv.givNumber}</span>
                        <span className="text-slate-400 font-mono">({giv.requestNumber})</span>
                        <StatusBadge status={giv.status} isAmharic={isAmharic} />
                        {giv.gatePassNumber && (
                          <span className="font-mono text-cyan-300 text-[11px]">
                            Gate Pass: {giv.gatePassNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-white font-semibold">
                        {giv.warehouseName} → {giv.projectStoreName} ({giv.projectName})
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {(giv.items || []).map((it) => `${it.itemName}: ${it.dispatchedQty} ${it.unit}`).join(" · ")} ·{" "}
                        {tr(isAmharic, "Vehicle", "መኪና")}: {giv.vehicleNumber} ({giv.driverName})
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleConfirmGivReceipt(giv)}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>{tr(isAmharic, "Confirm Receipt", "መቀበሉን አረጋግጥ")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintGiv(giv)}
                        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={13} />
                        <span>{tr(isAmharic, "Voucher", "ደረሰኝ")}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Fixed Asset FATOV Transfers Awaiting FATIV Confirmation */}
          {canConfirmFativ && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold uppercase text-cyan-400">
                {tr(
                  isAmharic,
                  `Incoming Fixed Assets from Warehouse Awaiting FATIV Receipt (${pendingIncomingFatovs.length})`,
                  `መቀበያ ማረጋገጫ የሚጠብቁ ቋሚ ንብረቶች — FATIV (${pendingIncomingFatovs.length})`
                )}
              </div>
              {pendingIncomingFatovs.length === 0 ? (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
                  {tr(
                    isAmharic,
                    "No in-transit fixed asset transfers awaiting FATIV confirmation.",
                    "በመንገድ ላይ ያለ እና መቀበያ የሚጠብቅ ቋሚ ንብረት የለም።"
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingIncomingFatovs.map((f) => (
                    <div
                      key={f.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-amber-400">
                          {f.fatovNumber} · {f.assetId} ({tr(isAmharic, "Orig GRV", "ዋና GRV")} {f.originalGrvNumber})
                        </div>
                        <div className="text-white font-semibold mt-0.5">{f.assetName}</div>
                        <div className="text-slate-400 text-[11px]">
                          {f.fromLocationName} → {f.toLocationName} · {tr(isAmharic, "Vehicle", "መኪና")}: {f.vehicleNumber} ({f.driverName})
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setReceivingFatov(f);
                          setFativQty(String(f.quantitySent));
                          setFativCond("Good");
                        }}
                        className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>{tr(isAmharic, "Confirm FATIV Receipt", "ቋሚ ንብረት መቀበሉን አረጋግጥ")}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {canDispatch && (
        <form onSubmit={handleDispatchGiv} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Send size={16} className="text-amber-400" />
            <span>
              {tr(
                isAmharic,
                "Prepare & Confirm Partial / Full Dispatch (GIV — Director Approved Requests Only)",
                "ከፊል / ሙሉ እቃ መላኪያ አዘጋጅቶ ማረጋገጥ (GIV — በዳይሬክተር የጸደቁ ጥያቄዎች ብቻ)"
              )}
            </span>
          </h3>

          {dispatchableRequests.length === 0 ? (
            <div className="text-xs text-slate-400">
              {tr(
                isAmharic,
                "No requests currently hold permanent Director Approval with pending dispatch quantities.",
                "በአሁኑ ጊዜ በዳይሬክተር ጸድቆ ለመላክ የሚጠብቅ የእቃ ጥያቄ የለም።"
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {tr(isAmharic, "Approved Request", "የጸደቀ ጥያቄ")}
                  </label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {tr(isAmharic, "Vehicle Plate Number", "የመኪና ታርጋ ቁጥር")}
                  </label>
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
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {tr(isAmharic, "Driver Name", "የሹፌር ስም")}
                  </label>
                  <input
                    required
                    placeholder={tr(isAmharic, "Driver Full Name", "የሹፌር ሙሉ ስም")}
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {tr(isAmharic, "Driver Phone", "የሹፌር ስልክ")}
                  </label>
                  <input
                    placeholder={tr(isAmharic, "Optional contact phone", "ስልክ ቁጥር (አማራጭ)")}
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
                        <th className="px-3 py-2">{tr(isAmharic, "Material", "እቃ")}</th>
                        <th className="px-3 py-2 text-right">{tr(isAmharic, "Approved Qty", "የጸደቀ ብዛት")}</th>
                        <th className="px-3 py-2 text-right">{tr(isAmharic, "Already Issued", "ቀድሞ የተላከ")}</th>
                        <th className="px-3 py-2 text-right">{tr(isAmharic, "Remaining", "ቀሪ ብዛት")}</th>
                        <th className="px-3 py-2 text-right">{tr(isAmharic, "Dispatch Now (Partial/Full)", "አሁን የሚላክ ብዛት")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(activeReq.items || []).map((it) => (
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
                <span>{tr(isAmharic, "Confirm GIV Dispatch & Issue Gate Pass", "GIV መላኪያ አረጋግጥ እና የበር ማለፊያ አውጣ")}</span>
              </button>
            </>
          )}
        </form>
      )}

      {/* Issued GIV Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          {tr(
            isAmharic,
            `Goods Issue Vouchers (GIV Register — ${snapshot.givs.length})`,
            `የGIV እቃ መላኪያ እና መቀበያ መዝገብ (${snapshot.givs.length})`
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">{tr(isAmharic, "GIV No", "GIV ቁጥር")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Request", "ጥያቄ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Route", "መስመር")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Gate Pass", "የበር ማለፊያ")}</th>
                <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Cost", "ዋጋ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Status", "ሁኔታ")}</th>
                <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Actions", "ተግባራት")}</th>
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
                  <td className="px-4 py-2.5"><StatusBadge status={giv.status} isAmharic={isAmharic} /></td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {canReceive && giv.status === "Dispatched" && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleConfirmGivReceipt(giv)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={12} />
                        <span>{tr(isAmharic, "Confirm Receipt", "መቀበሉን አረጋግጥ")}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePrintGiv(giv)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} />
                      <span>{tr(isAmharic, "Voucher", "ደረሰኝ")}</span>
                    </button>
                  </td>
                </tr>
              ))}
              {snapshot.givs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    {tr(isAmharic, "No Goods Issue Vouchers recorded yet.", "እስካሁን የተመዘገበ የGIV ደረሰኝ የለም።")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FATIV Receipt Confirmation Modal */}
      {receivingFatov && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmFativ} className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-3">
            <h4 className="text-sm font-bold text-white">
              {tr(
                isAmharic,
                `Confirm FATIV Receipt for ${receivingFatov.fatovNumber} (${receivingFatov.assetId})`,
                `ለ${receivingFatov.fatovNumber} (${receivingFatov.assetId}) የFATIV መቀበያ ማረጋገጥ`
              )}
            </h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {tr(
                  isAmharic,
                  `Quantity Received (Sent: ${receivingFatov.quantitySent})`,
                  `የተረከቡት ብዛት (የተላከ: ${receivingFatov.quantitySent})`
                )}
              </label>
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
              <label className="block text-[11px] text-slate-400 mb-1">
                {tr(isAmharic, "Inspected Condition", "የተመረመረ ሁኔታ")}
              </label>
              <select
                value={fativCond}
                onChange={(e) => setFativCond(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="Good">{tr(isAmharic, "Good (Usable)", "ጥሩ (ለስራ ዝግጁ)")}</option>
                <option value="Under Inspection">{tr(isAmharic, "Under Inspection (Quarantine)", "በምርመራ ላይ (ኳራንቲን)")}</option>
                <option value="Damaged">{tr(isAmharic, "Damaged (Quarantine)", "የተጎዳ (ኳራንቲን)")}</option>
                <option value="Defective">{tr(isAmharic, "Defective (Quarantine)", "ጉድለት ያለበት (ኳራንቲን)")}</option>
              </select>
            </div>
            {Number(fativQty) !== receivingFatov.quantitySent && (
              <input
                required
                placeholder={tr(isAmharic, "Mandatory discrepancy reason...", "የብዛት ልዩነት ምክንያት...")}
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
                {tr(isAmharic, "Cancel", "ሰርዝ")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                {tr(isAmharic, "Confirm & Update Asset Location", "አረጋግጥ እና የንብረቱን ቦታ አዘምን")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
