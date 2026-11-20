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

export function GrvAndCommercialInvoiceView({
  mode,
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
}: {
  mode: "grv" | "commercial_invoices";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
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
      onFeedback("info", `Attached Commercial Invoice file: ${uploaded.fileName}`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Invalid Commercial Invoice file.");
    } finally {
      setUploadingInv(false);
    }
  };

  const handleFinalizeGrv = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const wh = snapshot.warehouses.find((w) => w.id === warehouseId) || snapshot.warehouses[0];
      if (!wh) throw new Error("Register or select a destination Warehouse first.");
      if (!invFileMeta) {
        throw new Error("GRV blocked: Mandatory Commercial Invoice attachment (PDF/JPG/PNG) is missing.");
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
      if (grvItems.length === 0) throw new Error("Add at least one received item line.");

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
        `Finalized ${res.grv.grvNumber} with Commercial Invoice ${res.commercialInvoice.invoiceNumber}. ${
          res.createdAssets.length > 0
            ? `${res.createdAssets.length} Fixed Asset(s) capitalized to BIG BALANCE!`
            : "Consumable stock updated."
        }`
      );
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to finalize GRV.");
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
      onFeedback("success", `Commercial Invoice ${updated.invoiceNumber} replaced & logged in audit trail.`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to replace commercial invoice.");
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
              <span>Commercial Invoice Register ({snapshot.commercialInvoices.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Invoice No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5">Linked GRV</th>
                  <th className="px-4 py-2.5">Attachment</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Revisions</th>
                  {canReplaceInv && <th className="px-4 py-2.5 text-right">Action</th>}
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
                          <span>Replace</span>
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
                <span>Replace Commercial Invoice ({replacingInv.invoiceNumber})</span>
              </h4>
              <input
                required
                placeholder="Updated Invoice Number"
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
                placeholder="Mandatory audit reason for replacing invoice..."
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replaceFileMeta}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                >
                  Confirm Replacement
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
              <span>Goods Receiving Voucher (GRV) — Commercial Invoice Required</span>
            </h3>
            <span className="text-[11px] font-mono text-amber-300">
              Fixed Assets automatically capitalize to BIG BALANCE with permanent Asset ID
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Receiving Warehouse</label>
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
              <label className="block text-[11px] text-slate-400 mb-1">Supplier Name</label>
              <input
                required
                list="erp-suppliers-list"
                placeholder="Supplier Name"
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
              <label className="block text-[11px] text-slate-400 mb-1">PO / Procurement Reference</label>
              <input
                placeholder="Optional PO Number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Received Date</label>
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
              <span>Mandatory Commercial Invoice Verification (Blocks GRV Without Valid File)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <input
                required
                placeholder="Commercial Invoice Number *"
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
                {uploadingInv && <div className="text-[11px] text-amber-300 mt-1">Uploading to Storage...</div>}
                {invFileMeta && (
                  <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                    Attached: {invFileMeta.fileName}
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
                  <option value="">Select Catalog Item...</option>
                  {snapshot.items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.itemCode} — {it.itemName} [{it.inventoryType}] ({it.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Qty"
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
                  placeholder="Unit Cost"
                  value={line.unitCost}
                  onChange={(e) => {
                    const next = [...lines];
                    next[idx].unitCost = Number(e.target.value);
                    setLines(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                />
                <input
                  placeholder="Batch / Serials (comma-sep)"
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
                  placeholder="Expiry Date"
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
              + Add Another Received Line
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || uploadingInv}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <FileCheck2 size={14} />
            <span>Finalize GRV & Post Stock Ledger</span>
          </button>
        </form>
      )}

      {/* Completed GRV Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 text-xs font-bold uppercase text-white">
          Goods Receiving Vouchers ({snapshot.grvs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="px-4 py-2.5">GRV No</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Warehouse</th>
                <th className="px-4 py-2.5">Supplier</th>
                <th className="px-4 py-2.5">Commercial Invoice</th>
                <th className="px-4 py-2.5 text-right">Total Value</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Print</th>
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
                    {grv.totalAmount.toLocaleString()} ETB
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={grv.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handlePrintGrv(grv)}
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
