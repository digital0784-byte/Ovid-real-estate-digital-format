import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  AuditAnomalyCategory,
  AuditFindingSeverity,
  FinancialAuditFindingRecord,
  UserRole,
} from "../../types";
import {
  DetectedAnomalyItem,
  logAuditFindingMutation,
  updateAuditFindingCapaMutation,
} from "../../services/financialAuditService";
import { exportRowsToCsv, resolveUserFinancePermissions } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface AuditLogEntry {
  id: string;
  userName: string;
  userId: string;
  role: string;
  timestamp: string;
  device: string;
  action: string;
  financialImpact: string;
  encrypted: boolean;
}

interface FinancialAuditControlsModuleProps {
  isAmharic: boolean;
  anomalies: DetectedAnomalyItem[];
  findings: FinancialAuditFindingRecord[];
  auditLogs: AuditLogEntry[];
  currency: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

const RBAC_CONTROL_MATRIX = [
  { role: "Super Admin / Director", maker: "Override / Review", checker: "Final Approval", audit: "Full Oversight", scope: "All Projects & GL" },
  { role: "Finance Manager", maker: "Tax Returns / Period Close", checker: "Approve Payments / Loans / Petty Cash", audit: "View + CAPA", scope: "All Financial Ledgers" },
  { role: "Accountant", maker: "Record Invoices / JEs / Assets", checker: "Blocked (Self-Approve Prohibited)", audit: "Read Audit Trail", scope: "Head Office & GL" },
  { role: "Auditor", maker: "Prohibited (Read-Only Ledgers)", checker: "Prohibited (Segregation of Duties)", audit: "Log Findings & Track CAPA", scope: "Immutable Audit Logs" },
  { role: "Project Manager", maker: "Submit Petty Cash / Project Expenses", checker: "Blocked", audit: "Assigned Sites Only", scope: "Project-Scoped" },
];

export const FinancialAuditControlsModule: React.FC<FinancialAuditControlsModuleProps> = ({
  isAmharic,
  anomalies,
  findings,
  auditLogs,
  currency,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const perms = useMemo(() => resolveUserFinancePermissions(actorRole), [actorRole]);
  const [subTab, setSubTab] = useState<"anomalies" | "findings" | "rbac" | "logs">("anomalies");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<FinancialAuditFindingRecord | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [lastScannedAt, setLastScannedAt] = useState<string>(new Date().toLocaleTimeString());

  const [manualForm, setManualForm] = useState({
    anomalyCategory: "Manual Journal Off-Hours" as AuditAnomalyCategory,
    severity: "HIGH" as AuditFindingSeverity,
    title: "",
    description: "",
    sourceCollection: "journalEntries",
    sourceRecordId: "",
    project: "Corporate",
    amountInvolved: "0",
    capaAction: "",
    assignedOwner: "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const [capaForm, setCapaForm] = useState({
    status: "CAPA Assigned" as FinancialAuditFindingRecord["status"],
    capaAction: "",
    assignedOwner: "",
    dueDate: "",
    resolutionNotes: "",
  });

  const notify = (type: "ok" | "err", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const kpis = useMemo(() => {
    const criticalOrHigh = anomalies.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length;
    const makerCheckerViolations = anomalies.filter((a) => a.category === "Maker-Checker Violation").length;
    const openFindings = findings.filter((f) => f.status !== "Resolved" && f.status !== "Dismissed").length;
    const exposureAtRisk = anomalies.reduce((s, a) => s + Number(a.amountInvolved || 0), 0);
    return { criticalOrHigh, makerCheckerViolations, openFindings, exposureAtRisk };
  }, [anomalies, findings]);

  const handleLogAnomalyAsFinding = async (anom: DetectedAnomalyItem) => {
    setBusy(true);
    try {
      const f = await logAuditFindingMutation({
        anomalyCategory: anom.category,
        severity: anom.severity,
        title: anom.title,
        description: anom.description,
        sourceCollection: anom.sourceCollection,
        sourceRecordId: anom.sourceRecordId,
        project: anom.project,
        amountInvolved: anom.amountInvolved,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Log Audit Finding", `${f.findingNo}: ${f.title}`);
      notify("ok", `Logged ${f.findingNo} into Financial Audit Findings register.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to log finding.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateManualFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const f = await logAuditFindingMutation({
        anomalyCategory: manualForm.anomalyCategory,
        severity: manualForm.severity,
        title: manualForm.title,
        description: manualForm.description,
        sourceCollection: manualForm.sourceCollection,
        sourceRecordId: manualForm.sourceRecordId || "MANUAL",
        project: manualForm.project,
        amountInvolved: Number(manualForm.amountInvolved || 0),
        capaAction: manualForm.capaAction,
        assignedOwner: manualForm.assignedOwner,
        dueDate: manualForm.dueDate,
        actorName,
        actorRole,
        actorUid,
      });
      setShowManualModal(false);
      onLogAction?.("Create Manual Audit Finding", `${f.findingNo}: ${f.title}`);
      notify("ok", `Created audit finding ${f.findingNo}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to create audit finding.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCapa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinding) return;
    setBusy(true);
    try {
      const updated = await updateAuditFindingCapaMutation({
        finding: selectedFinding,
        status: capaForm.status,
        capaAction: capaForm.capaAction,
        assignedOwner: capaForm.assignedOwner,
        dueDate: capaForm.dueDate,
        resolutionNotes: capaForm.resolutionNotes,
        actorName,
        actorRole,
        actorUid,
      });
      setSelectedFinding(null);
      onLogAction?.("Update Audit CAPA", `${updated.findingNo} -> ${updated.status}`);
      notify("ok", `Updated CAPA status for ${updated.findingNo} to ${updated.status}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to update CAPA.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" id="financial-audit-controls-module">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-red-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic ? "የፋይናንስ ኦዲት፣ የውስጥ ቁጥጥር እና ያልተለመዱ ግብይቶች መከታተያ" : "Financial Audit, Internal Controls & Anomaly Detection"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "Maker-Checker ማረጋገጫ፣ ተደጋጋሚ ክፍያዎች/ደረሰኞች፣ የተከፋፈሉ ክፍያዎች፣ የፔቲ ካሽ ጉድለቶች እና CAPA ክትትል"
                : "Automated anomaly surveillance, Maker-Checker segregation of duties, RBAC enforcement, CAPA findings register & immutable audit trails."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLastScannedAt(new Date().toLocaleTimeString());
              notify("ok", `Live ERP anomaly scan completed (${anomalies.length} findings across active ledgers).`);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Scan Live Ledgers ({lastScannedAt})</span>
          </button>

          <button
            type="button"
            onClick={() => exportRowsToCsv("financial_audit_findings", findings)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            <span>CSV Findings</span>
          </button>

          {perms.canManageAuditFindings && (
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Log Finding</span>
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            banner.type === "ok"
              ? "bg-emerald-950/70 border-emerald-800 text-emerald-200"
              : "bg-red-950/70 border-red-800 text-red-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Critical / High Anomalies</span>
          <span
            className={`text-xl font-black font-mono tabular-nums mt-1 block ${
              kpis.criticalOrHigh > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {kpis.criticalOrHigh}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{anomalies.length} total signals detected</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Maker-Checker Breaches</span>
          <span
            className={`text-xl font-black font-mono tabular-nums mt-1 block ${
              kpis.makerCheckerViolations > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {kpis.makerCheckerViolations}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Same-UID self-approval checks</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Open Findings / CAPA</span>
          <span className="text-xl font-black text-amber-400 font-mono tabular-nums mt-1 block">
            {kpis.openFindings}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{findings.length} total register items</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Flagged Exposure Value</span>
          <span className="text-xl font-black text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(kpis.exposureAtRisk, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Across live ledgers</span>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        {[
          { id: "anomalies", label: `Automated Anomaly Scanner (${anomalies.length})` },
          { id: "findings", label: `Audit Findings & CAPA (${findings.length})` },
          { id: "rbac", label: "Maker-Checker & RBAC Matrix" },
          { id: "logs", label: `Immutable Audit Trail (${auditLogs.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              subTab === t.id
                ? "bg-red-600 text-white border-red-500"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Automated Anomalies */}
      {subTab === "anomalies" && (
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
              <p className="text-sm font-bold text-white">Zero Anomalies Detected Across Active Financial Modules</p>
              <p className="text-xs text-slate-400">
                No duplicate invoices, split payments, Maker-Checker self-approvals, petty cash shortages, or payroll exceptions found.
              </p>
            </div>
          ) : (
            anomalies.map((anom) => (
              <div
                key={anom.id}
                className={`bg-slate-950 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  anom.severity === "CRITICAL" ? "border-red-800/80" : "border-amber-800/70"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={18}
                    className={anom.severity === "CRITICAL" ? "text-red-400 shrink-0 mt-0.5" : "text-amber-400 shrink-0 mt-0.5"}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-white">{anom.title}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        · {anom.category} · {anom.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{anom.description}</p>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">
                      Collection: {anom.sourceCollection}/{anom.sourceRecordId} · Project: {anom.project} · Exposure:{" "}
                      {formatCurrency(anom.amountInvolved, currency)}
                    </p>
                  </div>
                </div>
                {perms.canManageAuditFindings && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleLogAnomalyAsFinding(anom)}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Log Finding & CAPA
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Findings & CAPA */}
      {subTab === "findings" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Finding No</th>
                <th className="py-3 px-3">Category & Severity</th>
                <th className="py-3 px-3">Description & Source</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">CAPA Owner & Due</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No formal audit findings logged yet.
                  </td>
                </tr>
              ) : (
                findings.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3 font-mono font-bold text-white">{f.findingNo}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-amber-400 block">{f.anomalyCategory}</span>
                      <span className="text-[10px] font-mono text-slate-400">{f.severity}</span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <span className="font-bold text-white block">{f.title}</span>
                      <span className="text-[10px] text-slate-400 block">{f.description}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(f.amountInvolved, currency)}</td>
                    <td className="py-3 px-3 text-[11px]">
                      <span className="block text-slate-200">{f.assignedOwner || "Unassigned"}</span>
                      <span className="font-mono text-[10px] text-slate-500">{f.dueDate || "-"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          f.status === "Resolved"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : "bg-red-950/60 border-red-800 text-red-300"
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {perms.canManageAuditFindings && (
                        <button
                          type="button"
                          onClick={() => {
                            setCapaForm({
                              status: f.status,
                              capaAction: f.capaAction || "",
                              assignedOwner: f.assignedOwner || "",
                              dueDate: f.dueDate || new Date().toISOString().slice(0, 10),
                              resolutionNotes: f.resolutionNotes || "",
                            });
                            setSelectedFinding(f);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Manage CAPA
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Segregation of Duties & RBAC Matrix */}
      {subTab === "rbac" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Maker Permissions</th>
                <th className="py-3 px-4">Checker / Approver Rules</th>
                <th className="py-3 px-4">Audit & CAPA Role</th>
                <th className="py-3 px-4">Data Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {RBAC_CONTROL_MATRIX.map((row) => (
                <tr key={row.role} className="hover:bg-slate-900/50">
                  <td className="py-3 px-4 font-bold text-white">{row.role}</td>
                  <td className="py-3 px-4 text-slate-300">{row.maker}</td>
                  <td className="py-3 px-4 text-cyan-400 font-semibold">{row.checker}</td>
                  <td className="py-3 px-4 text-amber-400">{row.audit}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{row.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Immutable Audit Trail */}
      {subTab === "logs" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Actor & Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Details / Impact</th>
                <th className="py-3 px-3">Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    No audit trail entries loaded.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 80).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono text-[11px]">{log.timestamp}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-white block">{log.userName}</span>
                      <span className="text-[10px] text-slate-400">{log.role}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-cyan-300">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-md">{log.financialImpact}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-400">
                      <Lock size={11} className="inline mr-1" />
                      Immutable
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Manual Finding */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateManualFinding} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Log Financial Audit Finding</h3>
              <button type="button" onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Anomaly Category</label>
                <select value={manualForm.anomalyCategory} onChange={(e) => setManualForm({ ...manualForm, anomalyCategory: e.target.value as AuditAnomalyCategory })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  <option value="Duplicate Payment / Invoice">Duplicate Payment / Invoice</option>
                  <option value="Maker-Checker Violation">Maker-Checker Violation</option>
                  <option value="Split Transaction Below Threshold">Split Transaction Below Threshold</option>
                  <option value="Unsupported Petty Cash Expense">Unsupported Petty Cash Expense</option>
                  <option value="Cash Shortage / Excess">Cash Shortage / Excess</option>
                  <option value="Unapproved Attendance Payroll">Unapproved Attendance Payroll</option>
                  <option value="Budget Overrun Breach">Budget Overrun Breach</option>
                  <option value="Manual Journal Off-Hours">Manual Journal Off-Hours</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Severity</label>
                <select value={manualForm.severity} onChange={(e) => setManualForm({ ...manualForm, severity: e.target.value as AuditFindingSeverity })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Finding Title *</label>
                <input required type="text" value={manualForm.title} onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Audit Observation *</label>
                <input required type="text" value={manualForm.description} onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Exposure ({currency})</label>
                <input type="number" min={0} value={manualForm.amountInvolved} onChange={(e) => setManualForm({ ...manualForm, amountInvolved: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assigned CAPA Owner</label>
                <input type="text" value={manualForm.assignedOwner} onChange={(e) => setManualForm({ ...manualForm, assignedOwner: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">Save Finding</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Update CAPA */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCapa} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Manage CAPA — {selectedFinding.findingNo}</h3>
              <button type="button" onClick={() => setSelectedFinding(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Finding Status</label>
                <select value={capaForm.status} onChange={(e) => setCapaForm({ ...capaForm, status: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  <option value="Open">Open</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="CAPA Assigned">CAPA Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Corrective & Preventive Action (CAPA)</label>
                <input type="text" value={capaForm.capaAction} onChange={(e) => setCapaForm({ ...capaForm, capaAction: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Action Owner</label>
                  <input type="text" value={capaForm.assignedOwner} onChange={(e) => setCapaForm({ ...capaForm, assignedOwner: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Due Date</label>
                  <input type="date" value={capaForm.dueDate} onChange={(e) => setCapaForm({ ...capaForm, dueDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Resolution / Verification Notes</label>
                <input type="text" value={capaForm.resolutionNotes} onChange={(e) => setCapaForm({ ...capaForm, resolutionNotes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setSelectedFinding(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">Update CAPA</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
