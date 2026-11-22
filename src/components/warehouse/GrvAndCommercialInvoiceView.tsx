import React, { useState } from "react";
import { FileCheck2, FileUp, History, PackagePlus, Printer, RefreshCw } from "lucide-react";
import { CommercialInvoiceRecord, GoodsReceivingVoucher } from "../../types";
import {
  ErpWarehouseSnapshot,
  uploadCommercialInvoiceFile,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { buildPrintableVoucherHtml } from "../../services/warehouseManagementService";
import { StatusBadge } from "./WarehouseSharedUi";
import { tr } from "./warehouseI18n";

export function GrvAndCommercialInvoiceView({
  mode,
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
  isAmharic,
}: {
  mode: "grv" | "commercial_invoices";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
  isAmharic?: boolean;
}) {
  const canCreateGrv = canPerformWarehouseModuleAction(actor.role, "CREATE_FINALIZE_GRV");
  const canReplaceInv = canPerformWarehouseModuleAction(actor.role, "REPLACE_COMMERCIAL_INVOICE");

  const [warehouseId, setWarehouseId] = useState(snapshot.warehouses[0]?.id || "");
  const [supplierName, setSupplierName] = useState(snapshot.erpSuppliers[0]?.name || "");
  const [poNumber, setPoNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  // Mandatory Commercial Invoice fields
  const [invNo, setInvNo] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invFileMeta, setInvFileMeta] = useState<{
    fileUrl: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
  } | null>(null);
  const [uploadingInv, setUploadingInv] = useState(false);

  const [lines, setLines] = useState<
    Array<{
      itemId: string;
      quantityReceived: number;
      unitCost: number;
      batchNumber: string;
      expiryDate: string;
      serialNumbersRaw: string;
    }>
  >([{ itemId: snapshot.items[0]?.id || "", quantityReceived: 10, unitCost: 500, batchNumber: "", expiryDate: "", serialNumbersRaw: "" }]);

  const [submitting, setSubmitting] = useState(false);

  // Invoice replacement modal state
  const [replacingInv, setReplacingInv] = useState<CommercialInvoiceRecord | null>(null);
  const [replaceNewNo, setReplaceNewNo] = useState("");
  const [replaceReason, setReplaceReason] = useState("");
  const [replaceFileMeta, setReplaceFileMeta] = useState<{
    fileUrl: string;
    fileName: string;
    mimeType: string;
  } | null>(null);

  const handleInvoiceFileSelect = async (file: File | undefined) => {
    if (!file) return;
    setUploadingInv(true);
    try {
      const uploaded = await uploadCommercialInvoiceFile(file, `CINV-${Date.now()}`);
      setInvFileMeta(uploaded);
      onFeedback("info", tr(isAmharic, `Attached Commercial Invoice file: ${uploaded.fileName}`, `የንግድ ደረሰኝ ፋይል ተያይዟል: ${uploaded.fileName}`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Invalid Commercial Invoice file.", "ልክ ያልሆነ የንግድ ደረሰኝ ፋይል።"));
    } finally {
      setUploadingInv(false);
    }
  };

  const handleFinalizeGrv = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const wh = snapshot.warehouses.find((w) => w.id === warehouseId) || snapshot.warehouses[0];
      if (!wh) throw new Error(tr(isAmharic, "Register or select a destination Warehouse first.", "በመጀመሪያ መቀበያ መጋዘን ይምረጡ ወይም ይመዝግቡ።"));
      if (!invFileMeta) {
        throw new Error(tr(isAmharic, "GRV blocked: Mandatory Commercial Invoice attachment (PDF/JPG/PNG) is missing.", "GRV ተከልክሏል: አስገዳጅ የንግድ ደረሰኝ ፋይል (PDF/JPG/PNG) አልተያያዘም።"));
      }

      const grvItems = lines
        .filter((l) => l.itemId && l.quantityReceived > 0)
        .map((l) => {
          const meta = snapshot.items.find((it) => it.id === l.itemId)!;
          return {
            itemId: meta.id,
            itemCode: meta.itemCode,
            itemName: meta.itemName,
            inventoryType: meta.inventoryType,
            unit: meta.unit,
            quantityReceived: Number(l.quantityReceived),
            unitCost: Number(l.unitCost),
            batchNumber: l.batchNumber || undefined,
            expiryDate: l.expiryDate || undefined,
            serialNumbers: l.serialNumbersRaw
              ? l.serialNumbersRaw.split(",").map((s) => s.trim()).filter(Boolean)
              : undefined,
            condition: "Good" as const,
          };
        });
      if (grvItems.length === 0) throw new Error(tr(isAmharic, "Add at least one received item line.", "ቢያንስ አንድ የገባ እቃ መስመር ያክሉ።"));

      const res = await WarehouseStoreDataService.finalizeGrv(
        {
          warehouseId: wh.id,
          warehouseName: wh.name,
          supplierId: `SUP-${supplierName.slice(0, 6).toUpperCase()}`,
          supplierName,
          poNumber: poNumber || undefined,
          receivedDate,
          remarks: remarks || undefined,
          commercialInvoice: {
            invoiceNumber: invNo,
            invoiceDate: invDate,
            fileUrl: invFileMeta.fileUrl,
            fileName: invFileMeta.fileName,
            mimeType: invFileMeta.mimeType,
            fileSizeBytes: invFileMeta.fileSizeBytes,
          },
          items: grvItems,
        },
        actor
      );

      setInvNo("");
      setInvFileMeta(null);
      setPoNumber("");
      setRemarks("");
      onFeedback(
        "success",
        tr(
          isAmharic,
          `Finalized ${res.grv.grvNumber} with Commercial Invoice ${res.commercialInvoice.invoiceNumber}. ${
            res.createdAssets.length > 0
              ? `${res.createdAssets.length} Fixed Asset(s) capitalized to BIG BALANCE!`
              : "Consumable stock updated."
          }`,
          `${res.grv.grvNumber} ከንግድ ደረሰኝ ${res.commercialInvoice.invoiceNumber} ጋር ተጠናቋል። ${
            res.createdAssets.length > 0
              ? `${res.createdAssets.length} ቋሚ ንብረት(ቶች) ወደ BIG BALANCE ገብተዋል!`
              : "የአላቂ እቃ ክምችት ተዘምኗል።"
          }`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to finalize GRV.", "GRV ማጠናቀቅ አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintGrv = (grv: GoodsReceivingVoucher) => {
    const html = buildPrintableVoucherHtml({
      voucherTitle: "GOODS RECEIVING VOUCHER (GRV)",
      voucherNumber: grv.grvNumber,
      subtitle: `${grv.warehouseName} — Supplier: ${grv.supplierName}`,
      metadata: [
        { label: "Received Date", value: grv.receivedDate },
        { label: "Commercial Invoice No", value: grv.commercialInvoiceNo },
        { label: "Invoice Date", value: grv.commercialInvoiceDate || "-" },
        { label: "PO Reference", value: grv.poNumber || "-" },
        { label: "Total Value", value: `${grv.totalAmount.toLocaleString()} ETB` },
        { label: "Fixed Asset Lines", value: String(grv.items.filter((i) => i.inventoryType === "Fixed Asset").length) },
      ],
      columns: ["Code", "Item Name", "Type", "Qty", "Unit", "Unit Cost", "Line Total", "Batch/Expiry"],
      rows: grv.items.map((it) => [
        it.itemCode,
        it.itemName,
        it.inventoryType,
        it.quantityReceived,
        it.unit,
        it.unitCost,
        it.totalCost,
        `${it.batchNumber || "-"} / ${it.expiryDate || "-"}`,
      ]),
      signatures: ["Received By (Warehouse Manager)", "Inspected By (QA / Technical)", "Finance Cost Verification"],
    });
    onOpenPrint(`GRV ${grv.grvNumber}`, html);
  };

  const handleReplaceInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingInv || !replaceFileMeta) return;
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.replaceCommercialInvoice(
        replacingInv.id,
        {
          newInvoiceNumber: replaceNewNo || replacingInv.invoiceNumber,
          newFileUrl: replaceFileMeta.fileUrl,
          newFileName: replaceFileMeta.fileName,
          newMimeType: replaceFileMeta.mimeType,
          reason: replaceReason,
        },
        actor
      );
      setReplacingInv(null);
      setReplaceFileMeta(null);
      setReplaceReason("");
      onFeedback("success", tr(isAmharic, `Commercial Invoice ${updated.invoiceNumber} replaced & logged in audit trail.`, `የንግድ ደረሰኝ ${updated.invoiceNumber} ተተክቶ በኦዲት መዝገብ ተመዝግቧል።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to replace commercial invoice.", "የንግድ ደረሰኙን መተካት አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "commercial_invoices") {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-white flex items-center gap-2">
              <FileCheck2 size={15} className="text-emerald-400" />
              <span>{tr(isAmharic, "Commercial Invoice Register", "የንግድ ደረሰኞች መዝገብ")} ({snapshot.commercialInvoices.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Invoice No", "የደረሰኝ ቁጥር")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Date", "ቀን")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Supplier", "አቅራቢ")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Linked GRV", "የተያያዘ GRV")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Attachment", "አባሪ ፋይል")}</th>
                  <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Amount", "መጠን")}</th>
                  <th className="px-4 py-2.5">{tr(isAmharic, "Revisions", "ለውጦች")}</th>
                  {canReplaceInv && <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Action", "ድርጊት")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {snapshot.commercialInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{inv.invoiceNumber}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{inv.invoiceDate}</td>
                    <td className="px-4 py-2.5 text-white">{inv.supplierName}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-300">{inv.grvNumber || "-"}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={inv.fileUrl}
                        download={inv.fileName}
                        className="text-cyan-400 hover:underline font-medium"
                      >
                        {inv.fileName}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-white">
                      {inv.totalAmount.toLocaleString()} {inv.currency}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">
                      {(inv.replacementHistory || []).length}
                    </td>
                    {canReplaceInv && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setReplacingInv(inv);
                            setReplaceNewNo(inv.invoiceNumber);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>{tr(isAmharic, "Replace", "ተካ")}</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {replacingInv && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleReplaceInvoiceSubmit}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-3"
            >
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <History size={15} className="text-amber-400" />
                <span>{tr(isAmharic, "Replace Commercial Invoice", "የንግድ ደረሰኝ መተኪያ")} ({replacingInv.invoiceNumber})</span>
              </h4>
              <input
                required
                placeholder={tr(isAmharic, "Updated Invoice Number", "የተሻሻለ የደረሰኝ ቁጥር")}
                value={replaceNewNo}
                onChange={(e) => setReplaceNewNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const up = await uploadCommercialInvoiceFile(file, replacingInv.id);
                    setReplaceFileMeta(up);
                  }
                }}
                className="w-full text-xs text-slate-300"
              />
              <input
                required
                placeholder={tr(isAmharic, "Mandatory audit reason for replacing invoice...", "ደረሰኙን የመተካት አስገዳጅ ምክንያት...")}
                value={replaceReason}
                onChange={(e) => setReplaceReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplacingInv(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {tr(isAmharic, "Cancel", "ተው")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replaceFileMeta}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                >
                  {tr(isAmharic, "Confirm Replacement", "መተካቱን አረጋግጥ")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canCreateGrv && (
        <form onSubmit={handleFinalizeGrv} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PackagePlus size={16} className="text-emerald-400" />
              <span>{tr(isAmharic, "Goods Receiving Voucher (GRV) — Commercial Invoice Required", "የእቃ መቀበያ ደረሰኝ (GRV) — የንግድ ደረሰኝ አስገዳጅ ነው")}</span>
            </h3>
            <span className="text-[11px] font-mono text-amber-300">
              {tr(isAmharic, "Fixed Assets automatically capitalize to BIG BALANCE with permanent Asset ID", "ቋሚ ንብረቶች በቋሚ Asset ID ወደ BIG BALANCE በራስ-ሰር ይመዘገባሉ")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "Receiving Warehouse", "ተቀባይ መጋዘን")}</label>
              <select
                value={warehouseId || snapshot.warehouses[0]?.id || ""}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
              >
                {snapshot.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "Supplier Name", "የአቅራቢ ስም")}</label>
              <input
                required
                list="erp-suppliers-list"
                placeholder={tr(isAmharic, "Supplier Name", "የአቅራቢ ስም")}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
              />
              <datalist id="erp-suppliers-list">
                {snapshot.erpSuppliers.map((s: any) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "PO / Procurement Reference", "የግዢ ትዕዛዝ (PO) ቁጥር")}</label>
              <input
                placeholder={tr(isAmharic, "Optional PO Number", "የPO ቁጥር (ካለ)")}
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">{tr(isAmharic, "Received Date", "የገባበት ቀን")}</label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Mandatory Commercial Invoice Gate */}
          <div className="bg-slate-950/90 border border-amber-600/50 rounded-xl p-3.5 space-y-3">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <FileUp size={14} />
              <span>{tr(isAmharic, "Mandatory Commercial Invoice Verification (Blocks GRV Without Valid File)", "አስገዳጅ የንግድ ደረሰኝ ማረጋገጫ (ፋይል ሳይያያዝ GRV አይጠናቀቅም)")}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <input
                required
                placeholder={tr(isAmharic, "Commercial Invoice Number *", "የንግድ ደረሰኝ ቁጥር *")}
                value={invNo}
                onChange={(e) => setInvNo(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              />
              <div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleInvoiceFileSelect(e.target.files?.[0])}
                  className="text-xs text-slate-300 w-full"
                />
                {uploadingInv && <div className="text-[11px] text-amber-300 mt-1">{tr(isAmharic, "Uploading to Storage...", "ፋይል በመጫን ላይ...")}</div>}
                {invFileMeta && (
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                    {tr(isAmharic, "Attached:", "ተያይዟል:")} {invFileMeta.fileName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Received Items */}
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <select
                  value={line.itemId}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].itemId = e.target.value;
                    const meta = snapshot.items.find((i) => i.id === e.target.value);
                    if (meta && meta.standardUnitCost > 0) next[idx].unitCost = meta.standardUnitCost;
                    setLines(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white sm:col-span-2"
                >
                  <option value="">{tr(isAmharic, "Select Catalog Item...", "ከካታሎግ እቃ ይምረጡ...")}</option>
                  {snapshot.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.itemCode} — {it.itemName} [{it.inventoryType}] ({it.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder={tr(isAmharic, "Qty", "ብዛት")}
                  value={line.quantityReceived}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].quantityReceived = Number(e.target.value);
                    setLines(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={tr(isAmharic, "Unit Cost", "የነጠላ ዋጋ")}
                  value={line.unitCost}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].unitCost = Number(e.target.value);
                    setLines(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <input
                  placeholder={tr(isAmharic, "Batch / Serials (comma-sep)", "ባች / ሴሪያል ቁጥሮች (በኮማ)")}
                  value={line.serialNumbersRaw || line.batchNumber}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].serialNumbersRaw = e.target.value;
                    next[idx].batchNumber = e.target.value;
                    setLines(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="date"
                  placeholder={tr(isAmharic, "Expiry Date", "የማብቂያ ቀን")}
                  value={line.expiryDate}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].expiryDate = e.target.value;
                    setLines(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setLines([
                  ...lines,
                  { itemId: "", quantityReceived: 1, unitCost: 0, batchNumber: "", expiryDate: "", serialNumbersRaw: "" },
                ])
              }
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
            >
              {tr(isAmharic, "+ Add Another Received Line", "+ ተጨማሪ የገባ እቃ መስመር ጨምር")}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || uploadingInv}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck2 size={14} />
            <span>{tr(isAmharic, "Finalize GRV & Post Stock Ledger", "GRV አጠናቅቅ እና ወደ መዝገብ አስገባ")}</span>
          </button>
        </form>
      )}

      {/* Completed GRV Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          {tr(isAmharic, "Goods Receiving Vouchers", "የእቃ መቀበያ ደረሰኞች (GRV)")} ({snapshot.grvs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">{tr(isAmharic, "GRV No", "የGRV ቁጥር")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Date", "ቀን")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Warehouse", "መጋዘን")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Supplier", "አቅራቢ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Commercial Invoice", "የንግድ ደረሰኝ")}</th>
                <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Total Value", "ጠቅላላ ዋጋ")}</th>
                <th className="px-4 py-2.5">{tr(isAmharic, "Status", "ሁኔታ")}</th>
                <th className="px-4 py-2.5 text-right">{tr(isAmharic, "Print", "አትም")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {snapshot.grvs.map((grv) => (
                <tr key={grv.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">{grv.grvNumber}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300">{grv.receivedDate}</td>
                  <td className="px-4 py-2.5 text-white">{grv.warehouseName}</td>
                  <td className="px-4 py-2.5 text-slate-300">{grv.supplierName}</td>
                  <td className="px-4 py-2.5 font-mono text-amber-300">{grv.commercialInvoiceNo}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-white">
                    {grv.totalAmount.toLocaleString()} {tr(isAmharic, "ETB", "ብር")}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={grv.status} isAmharic={isAmharic} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handlePrintGrv(grv)}
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
  );
}
