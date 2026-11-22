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
import { tr } from "./warehouseI18n";

export function FixedAssetsAndTransfersView({
  mode,
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
  isAmharic,
}: {
  mode: "fixed_assets_big_balance" | "project_fixed_assets" | "fatov_fativ";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
  isAmharic?: boolean;
}) {
  const canFatov = canPerformWarehouseModuleAction(actor.role, "CREATE_FATOV");
  const canFativ = canPerformWarehouseModuleAction(actor.role, "CONFIRM_FATIV");
  const [transferSubTab, setTransferSubTab] = useState<"fatov" | "fativ">(
    !canFatov && canFativ ? "fativ" : "fatov"
  );

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
      if (!asset) throw new Error(tr(isAmharic, "No available Fixed Asset selected for transfer.", "ለዝውውር የሚሆን ቋሚ ንብረት አልተመረጠም።"));
      const targetList = toType === "Warehouse" ? snapshot.warehouses : snapshot.projectStores;
      const dest: any = targetList.find((l) => l.id === toLocId) || targetList[0];
      if (!dest) throw new Error(tr(isAmharic, "Select a valid destination Warehouse or Project Store.", "ትክክለኛ መድረሻ መጋዘን ወይም ሳይት ስቶር ይምረጡ።"));

      const res = await WarehouseStoreDataService.dispatchFixedAssetFatov(
        {
          assetDocId: asset.id,
          toLocationType: toType,
          toLocationId: dest.id,
          toLocationName: toType === "Warehouse" ? dest.name : dest.storeName,
          projectId: dest.projectId,
          projectName: dest.projectName,
          vehicleNumber,
          driverName,
        },
        actor
      );
      onFeedback(
        "success",
        tr(
          isAmharic,
          `Dispatched ${res.fatov.fatovNumber} for ${res.asset.assetId} (Orig GRV ${res.asset.originalGrvNumber}). Location stays in transit until FATIV confirmation.`,
          `${res.fatov.fatovNumber} ለ${res.asset.assetId} (የመጀመሪያ GRV ${res.asset.originalGrvNumber}) ተልኳል። FATIV እስኪረጋገጥ ድረስ በመንገድ ላይ (In Transit) ይቆያል።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "FATOV dispatch failed.", "FATOV መላክ አልተቻለም።"));
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
          `Confirmed ${res.fativ.fativNumber}! Asset ${res.asset.assetId} moved to ${res.asset.currentLocationName} (Original GRV ${res.asset.originalGrvNumber} preserved).`,
          `${res.fativ.fativNumber} ተረጋግጧል! ንብረት ${res.asset.assetId} ወደ ${res.asset.currentLocationName} ተዛውሯል (የመጀመሪያ GRV ${res.asset.originalGrvNumber} ተጠብቋል)።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "FATIV confirmation failed.", "FATIV ማረጋገጥ አልተቻለም።"));
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
                  ? tr(isAmharic, "BIG BALANCE — Central Fixed Asset Master Register", "BIG BALANCE — ዋና የቋሚ ንብረቶች መዝገብ")
                  : tr(isAmharic, "Per-Project Fixed Asset Register", "የየፕሮጀክቱ ቋሚ ንብረቶች መዝገብ")}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {tr(isAmharic, "Permanent Asset IDs and Original GRV Numbers remain locked to every asset across its entire lifecycle.", "ቋሚ የንብረት መለያ (Asset ID) እና የመጀመሪያ GRV ቁጥር በንብረቱ ሙሉ ዕድሜ ተጠብቀው ይቆያሉ።")}
            </p>
          </div>
          {!isBigBalance && (
            <select
              value={selectedProjFilter}
              onChange={(e) => setSelectedProjFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="ALL">{tr(isAmharic, "All Projects", "ሁሉም ፕሮጀክቶች")}</option>
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
                  <th className="px-4 py-2.5">{tr(isAmharic, "Asset ID", "የንብረት መለያ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Asset Name & Serial", "የንብረት ስም እና ሴሪያል")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Original GRV", "የመጀመሪያ GRV")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Current Location", "የአሁን ቦታ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Condition", "ሁኔታ/ይዞታ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Status", "ደረጃ")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "History", "ታሪክ")}</th>
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
                    <td className="px-4 py-2.5"><StatusBadge status={fa.condition} isAmharic={isAmharic} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={fa.status} isAmharic={isAmharic} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setHistoryAsset(fa)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <History size={12} />
                        <span>{tr(isAmharic, "Timeline", "ታሪክ")} ({(fa.transferHistory || []).length})</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      {tr(isAmharic, "No fixed assets registered in this view yet. Receive Fixed Asset equipment via GRV to capitalize into BIG BALANCE.", "በዚህ ዝርዝር ውስጥ የተመዘገበ ቋሚ ንብረት የለም። ቋሚ ንብረት በGRV ሲገባ በራስ-ሰር BIG BALANCE ውስጥ ይመዘገባል።")}
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
                    {historyAsset.assetId} · {tr(isAmharic, "Orig GRV", "የመጀመሪያ GRV")} {historyAsset.originalGrvNumber}
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
                      {tr(isAmharic, "Condition:", "ሁኔታ:")} {ev.condition} · {tr(isAmharic, "Receiver:", "ተቀባይ:")} {ev.receiverName || "-"}
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

  // FATOV & FATIV UNIFIED TRANSFER WORKSPACE
  const pendingFatovs = snapshot.fatovs.filter((f) => f.status === "Dispatched");
  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTransferSubTab("fatov")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
            transferSubTab === "fatov" ? "bg-amber-600 text-white" : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
          }`}
        >
          <Send size={13} />
          <span>{tr(isAmharic, "FATOV — Dispatch Out", "FATOV — ወደ ሌላ ቦታ መላኪያ")} ({snapshot.fatovs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTransferSubTab("fativ")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
            transferSubTab === "fativ" ? "bg-emerald-600 text-white" : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
          }`}
        >
          <CheckCircle2 size={13} />
          <span>{tr(isAmharic, `FATIV — Confirm Receipt (${pendingFatovs.length} In Transit)`, `FATIV — መድረሱን ማረጋገጫ (${pendingFatovs.length} በመንገድ ላይ)`)}</span>
        </button>
      </div>

      {transferSubTab === "fatov" ? (
        <div className="space-y-5">
          {canFatov && (
          <form onSubmit={handleDispatchFatov} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send size={16} className="text-amber-400" />
              <span>{tr(isAmharic, "Fixed Asset Transfer Out Voucher (FATOV) — Automatic Gate Pass & In-Transit Lock", "የቋሚ ንብረት መላኪያ ደረሰኝ (FATOV) — ራስ-ሰር የበር ማለፊያ")}</span>
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
                <option value="ProjectStore">{tr(isAmharic, "Transfer to Project Site Store", "ወደ ፕሮጀክት ሳይት ስቶር አዛውር")}</option>
                <option value="Warehouse">{tr(isAmharic, "Return / Transfer to Central Warehouse", "ወደ ዋናው መጋዘን መልስ / አዛውር")}</option>
              </select>
              <select
                value={toLocId}
                onChange={(e) => setToLocId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {(toType === "Warehouse" ? snapshot.warehouses : snapshot.projectStores).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {"storeName" in loc ? loc.storeName : loc.name}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder={tr(isAmharic, "Vehicle Plate Number", "የተሽከርካሪ ሰሌዳ ቁጥር")}
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                required
                placeholder={tr(isAmharic, "Driver Name", "የሹፌር ስም")}
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
              <span>{tr(isAmharic, "Dispatch FATOV & Generate Gate Pass", "FATOV ላክ እና የበር ማለፊያ አዘጋጅ")}</span>
            </button>
          </form>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
            {tr(isAmharic, "FATOV Transfer Register", "የFATOV መላኪያ መዝገብ")} ({snapshot.fatovs.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">{tr(isAmharic, "FATOV No", "የFATOV ቁጥር")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Asset ID", "የንብረት መለያ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Orig GRV", "የመጀመሪያ GRV")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Route", "መስመር")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Gate Pass", "የበር ማለፊያ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Status", "ሁኔታ")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Print", "አትም")}</th>
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
                    <td className="px-4 py-2.5"><StatusBadge status={f.status} isAmharic={isAmharic} /></td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => printFatov(f)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={12} />
                        <span>{tr(isAmharic, "Voucher", "ደረሰኝ")}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{tr(isAmharic, "Fixed Asset Transfer In Voucher (FATIV) — Receiving Confirmation", "የቋሚ ንብረት መቀበያ (FATIV) — መድረሱን ማረጋገጫ")}</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {tr(isAmharic, "Asset location updates ONLY when FATIV receiving is confirmed. Duplicate FATIV submissions are strictly prevented.", "የንብረቱ ቦታ የሚዘመነው FATIV መቀበሉ ሲረጋገጥ ብቻ ነው። ድጋሚ ማስገባት የተከለከለ ነው።")}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-amber-400">
          {tr(isAmharic, "In-Transit FATOVs Awaiting Receiving Confirmation", "መቀበያ የሚጠብቁ በመንገድ ላይ ያሉ FATOVዎች")} ({pendingFatovs.length})
        </div>
        <div className="divide-y divide-slate-800">
          {pendingFatovs.map((f) => (
            <div key={f.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-mono font-bold text-amber-400">
                  {f.fatovNumber} · {f.assetId} ({tr(isAmharic, "Orig GRV", "የመጀመሪያ GRV")} {f.originalGrvNumber})
                </div>
                <div className="text-white font-semibold mt-0.5">{f.assetName}</div>
                <div className="text-slate-400">
                  {f.fromLocationName} → {f.toLocationName} · {tr(isAmharic, "Vehicle", "ተሽከርካሪ")} {f.vehicleNumber}
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
                  <span>{tr(isAmharic, "Confirm FATIV Receipt", "FATIV መቀበሉን አረጋግጥ")}</span>
                </button>
              )}
            </div>
          ))}
          {pendingFatovs.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              {tr(isAmharic, "No in-transit Fixed Assets awaiting FATIV confirmation.", "FATIV ማረጋገጫ የሚጠብቅ በመንገድ ላይ ያለ ቋሚ ንብረት የለም።")}
            </div>
          )}
        </div>
      </div>

      {/* Confirmed FATIVs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          {tr(isAmharic, "Completed FATIV Register", "የተጠናቀቁ FATIV መዝገብ")} ({snapshot.fativs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">{tr(isAmharic, "FATIV No", "የFATIV ቁጥር")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "FATOV Ref", "የFATOV ማጣቀሻ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Asset ID", "የንብረት መለያ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Orig GRV", "የመጀመሪያ GRV")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Received At", "ተቀባይ ቦታ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Sent / Recv", "የተላከ / የገባ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Status", "ሁኔታ")}</th>
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
                  <td className="px-4 py-2.5"><StatusBadge status={fv.status} isAmharic={isAmharic} /></td>
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
              {tr(isAmharic, "Confirm FATIV Receipt for", "FATIV መቀበሉን አረጋግጥ ለ")} {receivingFatov.fatovNumber} ({receivingFatov.assetId})
            </h4>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, `Quantity Received (Sent: ${receivingFatov.quantitySent})`, `የተቀበሉት ብዛት (የተላከ: ${receivingFatov.quantitySent})`)}</label>
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
              <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "Inspected Condition", "የተመረመረበት ሁኔታ")}</label>
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
                placeholder={tr(isAmharic, "Mandatory discrepancy reason...", "የብዛት ልዩነት አስገዳጅ ምክንያት...")}
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
                {tr(isAmharic, "Cancel", "ተው")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                {tr(isAmharic, "Confirm & Update Asset Location", "አረጋግጥ እና የንብረት ቦታ አዘምን")}
              </button>
            </div>
          </form>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
