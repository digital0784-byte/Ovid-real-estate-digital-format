import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Printer, QrCode, ShieldCheck, Truck } from "lucide-react";
import { GatePassRecord, TransportationStatus } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import { canPerformWarehouseModuleAction } from "../../services/warehouseStoreRbac";
import { ALL_TRANSPORT_STATUSES, buildPrintableVoucherHtml } from "../../services/warehouseManagementService";
import { StatusBadge } from "./WarehouseSharedUi";

export function TransportAndGatePassView({
  mode,
  snapshot,
  actor,
  onFeedback,
  onOpenPrint,
}: {
  mode: "transportation" | "gate_pass";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
  onOpenPrint: (title: string, html: string) => void;
}) {
  const canManageTransport = canPerformWarehouseModuleAction(actor.role, "MANAGE_TRANSPORT");
  const canVerifyGatePass = canPerformWarehouseModuleAction(actor.role, "VERIFY_GATE_PASS_EXIT_ENTRY");

  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, TransportationStatus>>({});
  const [scanInputs, setScanInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleUpdateTransport = async (transportId: string, status: TransportationStatus) => {
    setSubmitting(true);
    try {
      const updated = await WarehouseStoreDataService.updateTransportStatus(
        transportId,
        { status },
        actor
      );
      onFeedback("success", `Shipment ${updated.transportNumber} updated to '${updated.status}'.`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Failed to update transport status.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyGatePass = async (gp: GatePassRecord, verificationType: "EXIT" | "ENTRY") => {
    setSubmitting(true);
    try {
      const scannedCode = (scanInputs[gp.id] || gp.qrVerificationCode).trim();
      const updated = await WarehouseStoreDataService.verifyGatePass(
        gp.id,
        { scannedCode, verificationType },
        actor
      );
      onFeedback("success", `Gate Pass ${updated.gatePassNumber} verified for ${verificationType}!`);
    } catch (err: any) {
      onFeedback("error", err?.message || "Gate Pass verification blocked.");
    } finally {
      setSubmitting(false);
    }
  };

  const printGatePass = (gp: GatePassRecord) => {
    const html = buildPrintableVoucherHtml({
      voucherTitle: "AUTHORIZED MATERIAL GATE PASS",
      voucherNumber: gp.gatePassNumber,
      subtitle: `${gp.voucherType} ${gp.voucherNumber} · ${gp.originLocationName} → ${gp.destinationLocationName}`,
      metadata: [
        { label: "Vehicle Plate No", value: gp.vehicleNumber },
        { label: "Driver Name", value: gp.driverName },
        { label: "Original GRV", value: gp.originalGrvNumber || "-" },
        { label: "Issued By", value: gp.issuedByName },
        { label: "Exit Verified", value: gp.exitVerifiedByName || "Pending" },
        { label: "Entry Verified", value: gp.entryVerifiedByName || "Pending" },
      ],
      columns: ["Voucher Ref", "Cargo Summary", "Total Qty", "Status", "Verification Hash"],
      rows: [[gp.voucherNumber, gp.itemsSummary, gp.totalQuantity, gp.status, gp.verificationHash]],
      qrCodeText: gp.qrVerificationCode,
      signatures: ["Issued By (Warehouse / Store)", "Gate Security Exit Officer", "Destination Gate Entry Officer"],
    });
    onOpenPrint(`Gate Pass ${gp.gatePassNumber}`, html);
  };

  if (mode === "transportation") {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Truck size={16} className="text-amber-400" />
            <span>Two-Way Transportation Lifecycle Tracker (11 Operational Statuses)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tracks Warehouse ↔ Project transfers, driver assignments, Gate Security events, and Material Handling milestones.
          </p>
        </div>

        <div className="space-y-3">
          {snapshot.transports.map((tr) => (
            <div key={tr.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-xs">{tr.transportNumber}</span>
                  <span className="text-xs text-slate-300">{tr.referenceType} {tr.referenceNumber}</span>
                  <StatusBadge status={tr.status} />
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {tr.vehicleNumber} · Driver: {tr.driverName}
                </span>
              </div>

              <div className="text-xs text-white font-medium">
                {tr.originLocationName} → {tr.destinationLocationName}
              </div>
              <div className="text-xs text-slate-400">{tr.itemsSummary}</div>

              {canManageTransport && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                  <select
                    value={selectedStatuses[tr.id] || tr.status}
                    onChange={(e) =>
                      setSelectedStatuses({ ...selectedStatuses, [tr.id]: e.target.value as TransportationStatus })
                    }
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    {ALL_TRANSPORT_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleUpdateTransport(tr.id, selectedStatuses[tr.id] || tr.status)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Update Status
                  </button>
                </div>
              )}
            </div>
          ))}
          {snapshot.transports.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No active or completed transportation dispatches recorded yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <QrCode size={16} className="text-cyan-400" />
          <span>Gate Pass Security Verification Console (QR Code + SHA-256 Anti-Tamper)</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Every approved dispatch & return emits a locked Gate Pass with unique QR verification hash. Gate Security Officers verify Exit & Entry before movement clears checkpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {snapshot.gatePasses.map((gp) => (
          <div key={gp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-cyan-400 text-sm">{gp.gatePassNumber}</span>
                  <StatusBadge status={gp.status} />
                </div>
                <div className="text-xs text-white font-semibold">
                  {gp.voucherType} {gp.voucherNumber} · {gp.vehicleNumber} ({gp.driverName})
                </div>
                <div className="text-xs text-slate-400">
                  {gp.originLocationName} → {gp.destinationLocationName}
                </div>
                <div className="text-[11px] text-slate-300 mt-1">{gp.itemsSummary}</div>
                <div className="text-[10px] font-mono text-slate-500 break-all">
                  Code: {gp.qrVerificationCode}
                </div>
              </div>
              <div className="bg-white p-2 rounded-lg shrink-0">
                <QRCodeSVG value={gp.qrVerificationCode} size={76} />
              </div>
            </div>

            {canVerifyGatePass && gp.status !== "Tamper Blocked" && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <input
                  placeholder="Scan or paste QR Verification Code..."
                  value={scanInputs[gp.id] ?? gp.qrVerificationCode}
                  onChange={(e) => setScanInputs({ ...scanInputs, [gp.id]: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleVerifyGatePass(gp, "EXIT")}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck size={13} />
                    <span>Verify Exit</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleVerifyGatePass(gp, "ENTRY")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    <span>Verify Entry</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => printGatePass(gp)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print Gate Pass</span>
                  </button>
                </div>
              </div>
            )}

            {!canVerifyGatePass && (
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => printGatePass(gp)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print Gate Pass</span>
                </button>
              </div>
            )}
          </div>
        ))}
        {snapshot.gatePasses.length === 0 && (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
            No Gate Passes generated yet. Dispatch an approved request (GIV/FATOV) or vehicle return (MRV) to generate a QR Gate Pass.
          </div>
        )}
      </div>
    </div>
  );
}
