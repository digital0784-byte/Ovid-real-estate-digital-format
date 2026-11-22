import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Landmark,
  Percent,
  Plus,
  Receipt,
  Settings2,
  X,
} from "lucide-react";
import {
  Expense,
  FinanceTaxType,
  FinancialAccount,
  FinancialInvoiceRecord,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  HrmPayrollRunRecord,
  TaxRateConfigRecord,
  TaxReturnRecord,
  TaxTransactionRecord,
  UserRole,
} from "../../types";
import { Part7FinancialStatementsState } from "../../services/financialStatementsService";
import {
  computeTaxComplianceState,
  payAndFileTaxReturnMutation,
  prepareTaxReturnMutation,
  saveTaxRateConfigMutation,
} from "../../services/taxComplianceService";
import { exportRowsToCsv, resolveUserFinancePermissions } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface TaxComplianceModuleProps {
  isAmharic: boolean;
  taxRates: TaxRateConfigRecord[];
  taxTransactions: TaxTransactionRecord[];
  taxReturns: TaxReturnRecord[];
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  hrmPayrollRuns: HrmPayrollRunRecord[];
  accounts: FinancialAccount[];
  statementsState?: Part7FinancialStatementsState;
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  currency: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

export const TaxComplianceModule: React.FC<TaxComplianceModuleProps> = ({
  isAmharic,
  taxRates,
  taxTransactions,
  taxReturns,
  invoices,
  expenses,
  hrmPayrollRuns,
  accounts,
  statementsState,
  periods,
  financialYears,
  currency,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const perms = useMemo(() => resolveUserFinancePermissions(actorRole), [actorRole]);
  const [subTab, setSubTab] = useState<"returns" | "transactions" | "rates">("returns");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showRateModal, setShowRateModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [remitReturn, setRemitReturn] = useState<TaxReturnRecord | null>(null);

  const [rateForm, setRateForm] = useState({
    taxCode: "VAT-STD-NEW",
    taxName: "Standard VAT Rate",
    taxType: "VAT" as FinanceTaxType,
    ratePct: "15",
    vatCategory: "Standard Rated" as "Standard Rated" | "Zero-Rated" | "Exempt",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    notes: "",
  });

  const [retForm, setRetForm] = useState({
    taxType: "VAT" as FinanceTaxType,
    periodMonth: new Date().toISOString().slice(0, 7),
    notes: "",
  });

  const [remitForm, setRemitForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    accountId: accounts[0]?.id || "",
    paymentRef: "",
  });

  const taxState = useMemo(
    () =>
      computeTaxComplianceState({
        taxRates,
        taxTransactions,
        taxReturns,
        invoices,
        expenses,
        hrmPayrollRuns,
        statementsState,
      }),
    [taxRates, taxTransactions, taxReturns, invoices, expenses, hrmPayrollRuns, statementsState]
  );

  const notify = (type: "ok" | "err", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  // Pre-compute summary for selected period & tax type when preparing return
  const previewAmounts = useMemo(() => {
    const matching = taxState.allTaxTransactions.filter(
      (t) => t.taxType === retForm.taxType && t.periodMonth === retForm.periodMonth
    );
    const grossTaxableBase = matching.reduce((s, t) => s + Number(t.taxableBase || 0), 0);
    const outputTaxTotal = matching
      .filter((t) => t.direction === "Output / Payable")
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0);
    const inputTaxCreditTotal = matching
      .filter((t) => t.direction === "Input / Recoverable")
      .reduce((s, t) => s + Number(t.taxAmount || 0), 0);
    return {
      grossTaxableBase,
      outputTaxTotal,
      inputTaxCreditTotal,
      netTaxPayable: Math.max(0, outputTaxTotal - inputTaxCreditTotal),
    };
  }, [taxState.allTaxTransactions, retForm.taxType, retForm.periodMonth]);

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cfg = await saveTaxRateConfigMutation({
        taxCode: rateForm.taxCode,
        taxName: rateForm.taxName,
        taxType: rateForm.taxType,
        ratePct: Number(rateForm.ratePct),
        vatCategory: rateForm.taxType === "VAT" ? rateForm.vatCategory : undefined,
        effectiveFrom: rateForm.effectiveFrom,
        effectiveTo: rateForm.effectiveTo || undefined,
        notes: rateForm.notes,
        actorName,
        actorRole,
        actorUid,
      });
      setShowRateModal(false);
      onLogAction?.("Save Tax Rate Config", `${cfg.taxCode} (${cfg.ratePct}%) effective ${cfg.effectiveFrom}`);
      notify("ok", `Saved effective-dated tax configuration ${cfg.taxCode} (${cfg.ratePct}%).`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to save tax configuration.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrepareReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await prepareTaxReturnMutation({
        taxType: retForm.taxType,
        periodMonth: retForm.periodMonth,
        grossTaxableBase: previewAmounts.grossTaxableBase,
        outputTaxTotal: previewAmounts.outputTaxTotal,
        inputTaxCreditTotal: previewAmounts.inputTaxCreditTotal,
        notes: retForm.notes,
        actorName,
        actorRole,
        actorUid,
      });
      setShowReturnModal(false);
      onLogAction?.("Prepare Tax Return", `${created.returnNumber} (${formatCurrency(created.netTaxPayable, currency)})`);
      notify("ok", `Prepared ${created.returnNumber} — Net Payable: ${formatCurrency(created.netTaxPayable, currency)}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to prepare tax return.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remitReturn) return;
    setBusy(true);
    try {
      const acc = accounts.find((a) => a.id === remitForm.accountId) || accounts[0];
      if (!acc) throw new Error("No treasury bank/cash account configured.");
      const paid = await payAndFileTaxReturnMutation({
        taxReturn: remitReturn,
        paymentDate: remitForm.paymentDate,
        paymentAccount: acc,
        paymentRef: remitForm.paymentRef || `ERCA-${remitReturn.returnNumber}`,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      setRemitReturn(null);
      onLogAction?.("Remit Tax Return", `Filed & Paid ${paid.returnNumber} (${formatCurrency(paid.netTaxPayable, currency)})`);
      notify("ok", `Tax return ${paid.returnNumber} approved, paid from ${acc.accountName}, and posted to GL.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to approve & remit tax return.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" id="tax-compliance-module">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
            <Percent size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic ? "የግብር እና የህግ ተገዢነት አስተዳደር" : "Tax Management & Regulatory Compliance"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "VAT (15% / 0% / ነጻ)፣ WHT (2%)፣ CIT (30%) እና የደሞዝ ግብር/ጡረታ ማስላት እና ማቅረብ"
                : "Ethiopian VAT (Output vs Input), Withholding Tax (WHT), Corporate Income Tax (CIT), Payroll Tax & Filing Returns."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportRowsToCsv("tax_transactions_ledger", taxState.allTaxTransactions)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            <span>CSV Ledger</span>
          </button>

          {perms.canManageTaxCompliance && (
            <>
              <button
                type="button"
                onClick={() => setShowRateModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 size={14} />
                <span>{isAmharic ? "የግብር መጠን ቀይር" : "Configure Rate"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>{isAmharic ? "የግብር መመለሻ አዘጋጅ" : "Prepare Tax Return"}</span>
              </button>
            </>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Output VAT Collected</span>
          <span className="text-lg font-black text-amber-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(taxState.kpis.outputVatTotal, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">COA 2031</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Input VAT Credit</span>
          <span className="text-lg font-black text-cyan-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(taxState.kpis.inputVatCreditTotal, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">COA 1140 Recoverable</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Net VAT Payable</span>
          <span className="text-lg font-black text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(taxState.kpis.netVatPayable, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Output - Input VAT</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">WHT + Payroll Tax</span>
          <span className="text-lg font-black text-orange-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(taxState.kpis.withholdingTaxPayable + taxState.kpis.payrollTaxAndPensionTotal, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">WHT 2% + PAYE/Pension</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Est. Corporate Tax</span>
          <span className="text-lg font-black text-blue-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(taxState.kpis.estimatedCorporateIncomeTax, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">30% Taxable Profit (2033)</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Overdue Filings</span>
          <span
            className={`text-lg font-black font-mono tabular-nums mt-1 block ${
              taxState.kpis.overdueReturnsCount > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {taxState.kpis.overdueReturnsCount}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Paid: {formatCurrency(taxState.kpis.totalTaxPaidToDate, currency)}
          </span>
        </div>
      </div>

      {/* Upcoming Filing Deadlines Strip */}
      {taxState.upcomingDeadlines.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold text-white">
            <CalendarClock size={15} className="text-amber-400" />
            <span>Statutory Filing Deadlines (Due Last Day of Following Month)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {taxState.upcomingDeadlines.slice(0, 6).map((d) => (
              <div
                key={`${d.taxType}-${d.periodMonth}`}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  d.isOverdue ? "bg-red-950/40 border-red-800/80" : "bg-slate-900 border-slate-800"
                }`}
              >
                <div>
                  <span className="font-bold text-white block">
                    {d.taxType} · {d.periodMonth}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Due {d.deadline} {d.isOverdue ? "· OVERDUE" : `· ${d.status}`}
                  </span>
                </div>
                <span className="font-mono tabular-nums font-bold text-amber-400">
                  {formatCurrency(d.estimatedLiability, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtabs */}
      <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        {[
          { id: "returns", label: `Tax Returns & Filings (${taxState.returns.length})` },
          { id: "transactions", label: `Tax Ledger (${taxState.allTaxTransactions.length})` },
          { id: "rates", label: `Effective-Dated Tax Rates (${taxState.activeRates.length})` },
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

      {/* Tab 1: Tax Returns */}
      {subTab === "returns" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Return No</th>
                <th className="py-3 px-3">Tax Type & Period</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3 text-right">Output Tax</th>
                <th className="py-3 px-3 text-right">Input Credit</th>
                <th className="py-3 px-3 text-right">Net Payable</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Remit / File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {taxState.returns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No tax returns prepared yet. Click &ldquo;Prepare Tax Return&rdquo; to compile a monthly return.
                  </td>
                </tr>
              ) : (
                taxState.returns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3 font-mono font-bold text-white">{r.returnNumber}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-200">{r.taxType}</span>
                      <span className="text-slate-400 font-mono ml-2">{r.periodMonth}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{r.filingDeadline}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(r.outputTaxTotal, currency)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-cyan-400">
                      {formatCurrency(r.inputTaxCreditTotal, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                      {formatCurrency(r.netTaxPayable, currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.status === "Paid & Filed"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : "bg-amber-950/60 border-amber-800 text-amber-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.status !== "Paid & Filed" && (perms.isDirector || perms.isFinanceManager) && (
                        <button
                          type="button"
                          onClick={() => {
                            setRemitForm({
                              paymentDate: new Date().toISOString().slice(0, 10),
                              accountId: accounts[0]?.id || "",
                              paymentRef: `ERCA-${r.returnNumber}`,
                            });
                            setRemitReturn(r);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Approve & Remit GL
                        </button>
                      )}
                      {r.glJournalId && (
                        <span className="text-[10px] font-mono text-cyan-400">Paid {r.paymentDate}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Tax Transactions */}
      {subTab === "transactions" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Date / Period</th>
                <th className="py-3 px-3">Tax Type</th>
                <th className="py-3 px-3">Source Module & Counterparty</th>
                <th className="py-3 px-3 text-right">Taxable Base</th>
                <th className="py-3 px-3 text-right">Rate</th>
                <th className="py-3 px-3 text-right">Tax Amount</th>
                <th className="py-3 px-3">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {taxState.allTaxTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No VAT, WHT, or Payroll tax transactions recorded yet.
                  </td>
                </tr>
              ) : (
                taxState.allTaxTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono">{tx.transactionDate}</td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {tx.taxType} <span className="text-[10px] text-slate-400 font-mono">({tx.taxCode})</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-200 block">{tx.counterparty}</span>
                      <span className="text-[10px] text-slate-500">
                        {tx.sourceModule} · {tx.referenceNo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(tx.taxableBase, currency)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{tx.taxRatePct}%</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                      {formatCurrency(tx.taxAmount, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-semibold">
                      <span className={tx.direction === "Input / Recoverable" ? "text-cyan-400" : "text-orange-400"}>
                        {tx.direction}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Effective-Dated Tax Rates */}
      {subTab === "rates" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Tax Name</th>
                <th className="py-3 px-3">Type / VAT Category</th>
                <th className="py-3 px-3 text-right">Rate %</th>
                <th className="py-3 px-3">Effective From</th>
                <th className="py-3 px-3">COA Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {taxState.activeRates.map((rt) => (
                <tr key={rt.id} className="hover:bg-slate-900/50">
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">{rt.taxCode}</td>
                  <td className="py-3 px-3 font-bold text-white">{rt.taxName}</td>
                  <td className="py-3 px-3">
                    {rt.taxType} {rt.vatCategory ? `· ${rt.vatCategory}` : ""}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">{rt.ratePct}%</td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {rt.effectiveFrom} {rt.effectiveTo ? `→ ${rt.effectiveTo}` : "→ Active"}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {rt.coaLiabilityCode} {rt.coaInputAssetCode ? `/ ${rt.coaInputAssetCode}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Configure Tax Rate */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveRate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Configure Effective-Dated Tax Rate</h3>
              <button type="button" onClick={() => setShowRateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tax Code *</label>
                <input
                  required
                  type="text"
                  value={rateForm.taxCode}
                  onChange={(e) => setRateForm({ ...rateForm, taxCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tax Type</label>
                <select
                  value={rateForm.taxType}
                  onChange={(e) => setRateForm({ ...rateForm, taxType: e.target.value as FinanceTaxType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="VAT">VAT</option>
                  <option value="WHT">Withholding Tax (WHT)</option>
                  <option value="CIT">Corporate Income Tax (CIT)</option>
                  <option value="Payroll Tax">Payroll Tax</option>
                  <option value="Pension">Statutory Pension</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Rule Name *</label>
                <input
                  required
                  type="text"
                  value={rateForm.taxName}
                  onChange={(e) => setRateForm({ ...rateForm, taxName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Rate (%)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={rateForm.ratePct}
                  onChange={(e) => setRateForm({ ...rateForm, ratePct: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Effective From *</label>
                <input
                  required
                  type="date"
                  value={rateForm.effectiveFrom}
                  onChange={(e) => setRateForm({ ...rateForm, effectiveFrom: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowRateModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50">
                Save Rate Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Prepare Return */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePrepareReturn} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Prepare Monthly Statutory Tax Return</h3>
              <button type="button" onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tax Type</label>
                <select
                  value={retForm.taxType}
                  onChange={(e) => setRetForm({ ...retForm, taxType: e.target.value as FinanceTaxType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="VAT">VAT</option>
                  <option value="WHT">WHT (2%)</option>
                  <option value="CIT">CIT (30%)</option>
                  <option value="Payroll Tax">Payroll Tax</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tax Period</label>
                <input
                  required
                  type="month"
                  value={retForm.periodMonth}
                  onChange={(e) => setRetForm({ ...retForm, periodMonth: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Taxable Base (Period)</span>
                <span className="font-mono text-white">{formatCurrency(previewAmounts.grossTaxableBase, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Output Tax Payable</span>
                <span className="font-mono text-amber-400">{formatCurrency(previewAmounts.outputTaxTotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Input Tax Credit</span>
                <span className="font-mono text-cyan-400">{formatCurrency(previewAmounts.inputTaxCreditTotal, currency)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-800 font-bold">
                <span className="text-white">Net Tax Payable</span>
                <span className="font-mono text-emerald-400">{formatCurrency(previewAmounts.netTaxPayable, currency)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowReturnModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50">
                Save Return Draft
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Approve & Remit Return */}
      {remitReturn && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRemitReturn} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Approve & Remit Tax Return</h3>
                <p className="text-[11px] text-slate-400">
                  {remitReturn.returnNumber} · Payable {formatCurrency(remitReturn.netTaxPayable, currency)}
                </p>
              </div>
              <button type="button" onClick={() => setRemitReturn(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Remittance Date</label>
                <input
                  required
                  type="date"
                  value={remitForm.paymentDate}
                  onChange={(e) => setRemitForm({ ...remitForm, paymentDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank / Treasury Account</label>
                <select
                  value={remitForm.accountId}
                  onChange={(e) => setRemitForm({ ...remitForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tax Authority Receipt Ref *</label>
                <input
                  required
                  type="text"
                  value={remitForm.paymentRef}
                  onChange={(e) => setRemitForm({ ...remitForm, paymentRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setRemitReturn(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50">
                Approve, Pay & Post GL
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
