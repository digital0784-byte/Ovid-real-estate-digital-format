import React, { useMemo, useState } from "react";
import { Download, Plus, Wallet, X } from "lucide-react";
import {
  FinancialAccount,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  PettyCashFundRecord,
  PettyCashReconciliationRecord,
  PettyCashTransactionRecord,
  PettyCashTxType,
  UserRole,
} from "../../types";
import {
  approveAndPostPettyCashTxMutation,
  computePettyCashState,
  createPettyCashFundMutation,
  recordPettyCashReconciliationMutation,
  submitPettyCashTxMutation,
  verifyPettyCashReconciliationMutation,
} from "../../services/pettyCashService";
import { exportRowsToCsv, resolveUserFinancePermissions } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface PettyCashControlModuleProps {
  isAmharic: boolean;
  funds: PettyCashFundRecord[];
  transactions: PettyCashTransactionRecord[];
  reconciliations: PettyCashReconciliationRecord[];
  accounts: FinancialAccount[];
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  projectsList: Array<{ id?: string; name?: string }>;
  currency: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

export const PettyCashControlModule: React.FC<PettyCashControlModuleProps> = ({
  isAmharic,
  funds,
  transactions,
  reconciliations,
  accounts,
  periods,
  financialYears,
  projectsList,
  currency,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const perms = useMemo(() => resolveUserFinancePermissions(actorRole), [actorRole]);
  const [subTab, setSubTab] = useState<"funds" | "vouchers" | "reconciliations">("funds");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showNewFundModal, setShowNewFundModal] = useState(false);
  const [voucherFund, setVoucherFund] = useState<PettyCashFundRecord | null>(null);
  const [reconFund, setReconFund] = useState<PettyCashFundRecord | null>(null);

  const [fundForm, setFundForm] = useState({
    fundCode: `PCF-SITE-${String(funds.length + 1).padStart(2, "0")}`,
    fundName: "Site Imprest Petty Cash",
    locationType: "Construction Site" as "Head Office" | "Construction Site",
    project: projectsList[0]?.name || "Head Office",
    department: "Operations",
    custodianName: actorName,
    authorizedLimit: "50000",
    maxSingleExpense: "5000",
    replenishThresholdPct: "25",
  });

  const [txForm, setTxForm] = useState({
    txType: "Allocation" as PettyCashTxType,
    txDate: new Date().toISOString().slice(0, 10),
    category: "Site Consumables",
    payeeOrSource: "",
    description: "",
    amount: "",
    receiptRef: "",
    sourceTreasuryAccountId: accounts[0]?.id || "",
    coaExpenseCode: "6010",
  });

  const [reconForm, setReconForm] = useState({
    reconciliationDate: new Date().toISOString().slice(0, 10),
    physicalCashCount: "0",
    unpostedReceiptsTotal: "0",
    notes: "",
  });

  const pcState = useMemo(
    () =>
      computePettyCashState({
        funds,
        transactions,
        reconciliations,
        projectFilter,
      }),
    [funds, transactions, reconciliations, projectFilter]
  );

  const notify = (type: "ok" | "err", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const handleCreateFund = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const f = await createPettyCashFundMutation({
        fundCode: fundForm.fundCode,
        fundName: fundForm.fundName,
        locationType: fundForm.locationType,
        project: fundForm.project,
        department: fundForm.department,
        custodianUid: actorUid,
        custodianName: fundForm.custodianName,
        authorizedLimit: Number(fundForm.authorizedLimit),
        maxSingleExpense: Number(fundForm.maxSingleExpense),
        replenishThresholdPct: Number(fundForm.replenishThresholdPct),
        actorName,
        actorRole,
        actorUid,
      });
      setShowNewFundModal(false);
      onLogAction?.("Create Petty Cash Fund", `${f.fundCode} Limit ${formatCurrency(f.authorizedLimit, currency)}`);
      notify("ok", `Created imprest fund ${f.fundCode} (${f.fundName}).`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to create petty cash fund.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherFund) return;
    setBusy(true);
    try {
      const tx = await submitPettyCashTxMutation({
        fund: voucherFund,
        txType: txForm.txType,
        txDate: txForm.txDate,
        category: txForm.category,
        payeeOrSource: txForm.payeeOrSource,
        description: txForm.description,
        amount: Number(txForm.amount),
        receiptRef: txForm.receiptRef,
        sourceTreasuryAccountId: txForm.sourceTreasuryAccountId,
        coaExpenseCode: txForm.coaExpenseCode,
        actorName,
        actorRole,
        actorUid,
      });
      setVoucherFund(null);
      onLogAction?.("Submit Petty Cash Voucher", `${tx.voucherNo} (${tx.txType} ${formatCurrency(tx.amount, currency)})`);
      notify("ok", `Voucher ${tx.voucherNo} submitted for Maker-Checker approval.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to submit petty cash voucher.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveVoucher = async (tx: PettyCashTransactionRecord) => {
    const fund = funds.find((f) => f.id === tx.fundId);
    if (!fund) return;
    setBusy(true);
    try {
      const srcAcc = accounts.find((a) => a.id === (tx.sourceTreasuryAccountId || accounts[0]?.id)) || accounts[0];
      const posted = await approveAndPostPettyCashTxMutation({
        fund,
        tx,
        sourceTreasuryAccount: srcAcc,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Approve Petty Cash Voucher", `Posted ${posted.voucherNo} to GL 1015`);
      notify("ok", `Approved & posted ${posted.voucherNo} to GL 1015.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to approve petty cash voucher.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconFund) return;
    setBusy(true);
    try {
      const rec = await recordPettyCashReconciliationMutation({
        fund: reconFund,
        reconciliationDate: reconForm.reconciliationDate,
        physicalCashCount: Number(reconForm.physicalCashCount),
        unpostedReceiptsTotal: Number(reconForm.unpostedReceiptsTotal || 0),
        allFundTransactions: transactions,
        notes: reconForm.notes,
        actorName,
        actorRole,
        actorUid,
      });
      setReconFund(null);
      onLogAction?.("Petty Cash Physical Count", `${rec.reconciliationNo}: ${rec.varianceClassification} (${rec.varianceAmount})`);
      notify("ok", `Recorded count ${rec.reconciliationNo}: ${rec.varianceClassification}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to record physical count.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyRecon = async (rec: PettyCashReconciliationRecord) => {
    setBusy(true);
    try {
      const verified = await verifyPettyCashReconciliationMutation({
        reconciliation: rec,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Verify Petty Cash Reconciliation", `${verified.reconciliationNo} (${verified.varianceClassification})`);
      notify("ok", `Verified reconciliation ${verified.reconciliationNo}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to verify reconciliation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" id="petty-cash-control-module">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic ? "የጥቃቅን ወጪ (Petty Cash) ቁጥጥር እና ማስታረቂያ" : "Petty Cash & Site Imprest Expense Control"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "የዋና ቢሮ እና የሳይት ፔቲ ካሽ ፈንዶች፣ የወጪ ገደብ ቁጥጥር፣ ደረሰኝ ያልተያያዘባቸው ወጪዎች እና የቆጠራ ጉድለት/ትርፍ ማወቂያ"
                : "Imprest funds across Head Office & Sites, single-spend caps, receipt compliance, physical counts, shortage/excess detection & GL 1015 sync."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportRowsToCsv("petty_cash_vouchers", pcState.transactions)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            <span>CSV Vouchers</span>
          </button>

          {perms.canManagePettyCash && (
            <button
              type="button"
              onClick={() => setShowNewFundModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>New Petty Cash Fund</span>
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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Imprest Cash</span>
          <span className="text-lg font-black text-emerald-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(pcState.kpis.totalPettyCashBalance, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{pcState.kpis.activeFundsCount} active (GL 1015)</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Authorized Imprest Limit</span>
          <span className="text-lg font-black text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(pcState.kpis.totalAuthorizedFloat, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Combined float ceiling</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Posted Petty Expenses</span>
          <span className="text-lg font-black text-amber-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(pcState.kpis.postedExpensesTotal, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{pcState.kpis.pendingApprovalCount} pending</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Unsupported Expenses</span>
          <span
            className={`text-lg font-black font-mono tabular-nums mt-1 block ${
              pcState.kpis.unsupportedExpensesCount > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {pcState.kpis.unsupportedExpensesCount}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {formatCurrency(pcState.kpis.unsupportedExpensesAmount, currency)} missing receipts
          </span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash Shortages</span>
          <span
            className={`text-lg font-black font-mono tabular-nums mt-1 block ${
              pcState.kpis.openShortageCount > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {formatCurrency(pcState.kpis.totalShortageAmount, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{pcState.kpis.openShortageCount} discrepancy counts</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Replenish Needed</span>
          <span className="text-lg font-black text-cyan-400 font-mono tabular-nums mt-1 block">
            {pcState.lowBalanceFunds.length}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{pcState.excessBalanceFunds.length} excess float</span>
        </div>
      </div>

      {/* Subtabs + Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "funds", label: `Petty Cash Funds (${pcState.funds.length})` },
            { id: "vouchers", label: `Vouchers & Expenses (${pcState.transactions.length})` },
            { id: "reconciliations", label: `Physical Count Reconciliations (${pcState.reconciliations.length})` },
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

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-semibold"
        >
          <option value="ALL">All Locations</option>
          {projectsList.map((p) => p.name && (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {subTab === "funds" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pcState.funds.length === 0 ? (
            <div className="col-span-full bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-500">
              No petty cash funds created yet.
            </div>
          ) : (
            pcState.funds.map((f) => {
              const pct = f.authorizedLimit > 0 ? Math.min(100, (f.currentBalance / f.authorizedLimit) * 100) : 0;
              const isLow = pct <= f.replenishThresholdPct;
              return (
                <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 block">{f.fundCode} · {f.locationType}</span>
                      <h3 className="text-sm font-bold text-white">{f.fundName}</h3>
                      <span className="text-[11px] text-slate-400">{f.project} · {f.custodianName}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isLow ? "bg-amber-950/60 border-amber-800 text-amber-300" : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                      }`}
                    >
                      {isLow ? "Low Float" : f.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Book Balance</span>
                      <span className="font-mono tabular-nums font-bold text-emerald-400">{formatCurrency(f.currentBalance, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Authorized Limit</span>
                      <span className="font-mono tabular-nums text-white">{formatCurrency(f.authorizedLimit, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Single Expense</span>
                      <span className="font-mono tabular-nums text-cyan-400">{formatCurrency(f.maxSingleExpense, currency)}</span>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div className={`h-full ${isLow ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                  </div>

                  {perms.canManagePettyCash && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setTxForm({
                            ...txForm,
                            txType: f.currentBalance <= 0 ? "Allocation" : "Expense",
                            payeeOrSource: f.custodianName,
                            description: "",
                            amount: "",
                            receiptRef: "",
                          });
                          setVoucherFund(f);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        New Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReconForm({
                            reconciliationDate: new Date().toISOString().slice(0, 10),
                            physicalCashCount: String(f.currentBalance),
                            unpostedReceiptsTotal: "0",
                            notes: "",
                          });
                          setReconFund(f);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 text-[11px] font-bold cursor-pointer"
                      >
                        Physical Count
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {subTab === "vouchers" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Voucher / Date</th>
                <th className="py-3 px-3">Fund & Project</th>
                <th className="py-3 px-3">Type / Details</th>
                <th className="py-3 px-3">Receipt Check</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {pcState.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No petty cash vouchers submitted yet.
                  </td>
                </tr>
              ) : (
                pcState.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-white block">{tx.voucherNo}</span>
                      <span className="text-[10px] font-mono text-slate-400">{tx.txDate}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200 block">{tx.fundName}</span>
                      <span className="text-[10px] text-slate-500">{tx.project}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-amber-400 block">{tx.txType} · {tx.category}</span>
                      <span className="text-[10px] text-slate-400">{tx.description}</span>
                    </td>
                    <td className="py-3 px-3">
                      {tx.hasValidReceipt ? (
                        <span className="text-[11px] font-mono text-emerald-400">{tx.receiptRef || "Treasury Transfer"}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-950/70 border border-red-800 text-red-300 text-[10px] font-bold">
                          Unsupported (No Receipt)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                      {formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          tx.status === "Posted"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : "bg-amber-950/60 border-amber-800 text-amber-300"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {tx.status === "Pending" && (perms.isDirector || perms.isFinanceManager) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApproveVoucher(tx)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          Approve & Post GL
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

      {subTab === "reconciliations" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Recon No / Date</th>
                <th className="py-3 px-3">Fund & Custodian</th>
                <th className="py-3 px-3 text-right">Book Balance</th>
                <th className="py-3 px-3 text-right">Physical + Unposted</th>
                <th className="py-3 px-3 text-right">Variance</th>
                <th className="py-3 px-3">Classification</th>
                <th className="py-3 px-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {pcState.reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No physical petty cash counts recorded yet.
                  </td>
                </tr>
              ) : (
                pcState.reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3 font-mono">{rec.reconciliationNo} · {rec.reconciliationDate}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{rec.fundName}</span>
                      <span className="text-[10px] text-slate-400">{rec.custodianName}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(rec.bookBalance, currency)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatCurrency(rec.physicalCashCount + rec.unpostedReceiptsTotal, currency)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                        rec.varianceClassification === "Balanced"
                          ? "text-emerald-400"
                          : rec.varianceClassification === "Cash Shortage"
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {formatCurrency(rec.varianceAmount, currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold block">{rec.varianceClassification}</span>
                      {rec.unsupportedExpensesCount > 0 && (
                        <span className="text-[10px] text-red-400">{rec.unsupportedExpensesCount} unsupported</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {rec.status === "Pending Verification" && perms.canVerifyPettyCashReconciliation ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleVerifyRecon(rec)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Verify Count
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-400">{rec.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNewFundModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateFund} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Create Site / Head Office Petty Cash Fund</h3>
              <button type="button" onClick={() => setShowNewFundModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fund Code *</label>
                <input required type="text" value={fundForm.fundCode} onChange={(e) => setFundForm({ ...fundForm, fundCode: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Location Type</label>
                <select value={fundForm.locationType} onChange={(e) => setFundForm({ ...fundForm, locationType: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  <option value="Construction Site">Construction Site</option>
                  <option value="Head Office">Head Office</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fund Name *</label>
                <input required type="text" value={fundForm.fundName} onChange={(e) => setFundForm({ ...fundForm, fundName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project / Site</label>
                <select value={fundForm.project} onChange={(e) => setFundForm({ ...fundForm, project: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  <option value="Head Office">Head Office</option>
                  {projectsList.map((p) => p.name && <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Custodian Name *</label>
                <input required type="text" value={fundForm.custodianName} onChange={(e) => setFundForm({ ...fundForm, custodianName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Authorized Float ({currency})</label>
                <input required type="number" min={100} value={fundForm.authorizedLimit} onChange={(e) => setFundForm({ ...fundForm, authorizedLimit: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Max Single Expense ({currency})</label>
                <input required type="number" min={10} value={fundForm.maxSingleExpense} onChange={(e) => setFundForm({ ...fundForm, maxSingleExpense: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowNewFundModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">Create Fund</button>
            </div>
          </form>
        </div>
      )}

      {voucherFund && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitVoucher} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Submit Petty Cash Voucher — {voucherFund.fundCode}</h3>
                <p className="text-[11px] text-slate-400">Balance: {formatCurrency(voucherFund.currentBalance, currency)}</p>
              </div>
              <button type="button" onClick={() => setVoucherFund(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Voucher Type</label>
                <select value={txForm.txType} onChange={(e) => setTxForm({ ...txForm, txType: e.target.value as PettyCashTxType })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  <option value="Allocation">Initial Allocation</option>
                  <option value="Replenishment">Imprest Replenishment</option>
                  <option value="Expense">Petty Cash Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
                <input required type="date" value={txForm.txDate} onChange={(e) => setTxForm({ ...txForm, txDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Amount ({currency}) *</label>
                <input required type="number" min={1} step="0.01" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">{txForm.txType === "Expense" ? "Receipt Ref" : "Source Bank"}</label>
                {txForm.txType === "Expense" ? (
                  <input type="text" placeholder="Leave blank if missing" value={txForm.receiptRef} onChange={(e) => setTxForm({ ...txForm, receiptRef: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                ) : (
                  <select value={txForm.sourceTreasuryAccountId} onChange={(e) => setTxForm({ ...txForm, sourceTreasuryAccountId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                  </select>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description *</label>
                <input required type="text" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setVoucherFund(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">Submit Voucher</button>
            </div>
          </form>
        </div>
      )}

      {reconFund && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReconciliation} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Physical Cash Count — {reconFund.fundCode}</h3>
                <p className="text-[11px] text-slate-400">Book Balance: {formatCurrency(reconFund.currentBalance, currency)}</p>
              </div>
              <button type="button" onClick={() => setReconFund(null)} className="text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Count Date</label>
                <input required type="date" value={reconForm.reconciliationDate} onChange={(e) => setReconForm({ ...reconForm, reconciliationDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Physical Cash Counted ({currency})</label>
                <input required type="number" min={0} step="0.01" value={reconForm.physicalCashCount} onChange={(e) => setReconForm({ ...reconForm, physicalCashCount: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Unposted Paid Receipts ({currency})</label>
                <input required type="number" min={0} step="0.01" value={reconForm.unpostedReceiptsTotal} onChange={(e) => setReconForm({ ...reconForm, unpostedReceiptsTotal: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Count Notes</label>
                <input type="text" value={reconForm.notes} onChange={(e) => setReconForm({ ...reconForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setReconFund(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer">Submit Count</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
