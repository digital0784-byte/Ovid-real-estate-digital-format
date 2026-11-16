import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  Receipt,
  Search,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Expense, FinancialAccount, FinancialInvoiceRecord } from "../../types";
import {
  AGING_BUCKET_LABELS,
  ComputedFinancialState,
  exportRowsToCsv,
  NormalizedExpense,
  NormalizedInvoice,
  PAYABLE_CATEGORIES,
  RECEIVABLE_CATEGORIES,
} from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";
import {
  ArApDetailWorkflowModal,
  ArApSettlementModal,
  RegisterArApModal,
} from "./ArApRegistrationModals";
import { ArApReportsCenter } from "./ArApReportsCenter";

interface ReceivablesPayablesViewsProps {
  mode: "accounts-receivable" | "accounts-payable" | "aging-receivables" | "aging-payables";
  isAmharic: boolean;
  state: ComputedFinancialState;
  rawInvoices?: FinancialInvoiceRecord[];
  rawExpenses?: Expense[];
  rawAccounts: FinancialAccount[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

const lifecycleStatusBadgeClass = (status: string) => {
  switch (status) {
    case "Fully Collected":
    case "Fully Paid":
      return "bg-emerald-950/70 text-emerald-300 border-emerald-800";
    case "Partially Collected":
    case "Partially Paid":
      return "bg-cyan-950/70 text-cyan-300 border-cyan-800";
    case "Due Today":
      return "bg-amber-950/70 text-amber-300 border-amber-800";
    case "Overdue":
      return "bg-red-950/70 text-red-300 border-red-800";
    case "Disputed":
      return "bg-purple-950/70 text-purple-300 border-purple-800";
    default:
      return "bg-slate-900 text-slate-300 border-slate-700";
  }
};

export const ReceivablesPayablesViews: React.FC<ReceivablesPayablesViewsProps> = ({
  mode,
  isAmharic,
  state,
  rawInvoices = [],
  rawExpenses = [],
  rawAccounts,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const { metrics, permissions, settings } = state;
  const cur = settings.defaultCurrency || "ETB";
  const isReceivable = mode === "accounts-receivable" || mode === "aging-receivables";
  const isAging = mode === "aging-receivables" || mode === "aging-payables";

  const [viewTab, setViewTab] = useState<"ledger" | "reports">("ledger");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [settleInvoice, setSettleInvoice] = useState<NormalizedInvoice | null>(null);
  const [settleExpense, setSettleExpense] = useState<NormalizedExpense | null>(null);
  const [inspectInvoice, setInspectInvoice] = useState<NormalizedInvoice | null>(null);
  const [inspectExpense, setInspectExpense] = useState<NormalizedExpense | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [agingFilter, setAgingFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [openOnly, setOpenOnly] = useState(isAging);
  const [notice, setNotice] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setNotice(msg);
    onLogAction?.("AR/AP Action", msg);
    setTimeout(() => setNotice(null), 4500);
  };

  const agingBuckets = isReceivable ? state.agingReceivables : state.agingPayables;
  const agingPerf = isReceivable ? metrics.arAgingPerformance : metrics.apAgingPerformance;

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return state.allDimInvoices
      .filter((inv) => !inv.isCancelledOrRejected)
      .filter((inv) => (openOnly ? inv.outstandingAmount > 0 : true))
      .filter((inv) => (projectFilter === "ALL" ? true : inv.project === projectFilter))
      .filter((inv) => (statusFilter === "ALL" ? true : inv.arLifecycleStatus === statusFilter))
      .filter((inv) => (categoryFilter === "ALL" ? true : inv.normalizedReceivableCategory === categoryFilter))
      .filter((inv) => (agingFilter === "ALL" ? true : inv.agingCategory === agingFilter))
      .filter((inv) =>
        !q
          ? true
          : `${inv.receivableId || ""} ${inv.invoiceNumber} ${inv.normalizedClient} ${inv.project} ${inv.contractNumber || ""}`
              .toLowerCase()
              .includes(q)
      );
  }, [state.allDimInvoices, openOnly, projectFilter, statusFilter, categoryFilter, agingFilter, searchTerm]);

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return state.allDimExpenses
      .filter((exp) => !exp.isCancelledOrRejected)
      .filter((exp) => (openOnly ? exp.outstandingAmount > 0 : true))
      .filter((exp) => (projectFilter === "ALL" ? true : exp.project === projectFilter))
      .filter((exp) => (statusFilter === "ALL" ? true : exp.apLifecycleStatus === statusFilter))
      .filter((exp) => (categoryFilter === "ALL" ? true : exp.normalizedPayableCategory === categoryFilter))
      .filter((exp) => (agingFilter === "ALL" ? true : exp.agingCategory === agingFilter))
      .filter((exp) =>
        !q
          ? true
          : `${exp.payableId || ""} ${exp.billNumber || ""} ${exp.referenceNo || ""} ${exp.normalizedSupplier} ${exp.project} ${exp.purchaseOrderNumber || ""}`
              .toLowerCase()
              .includes(q)
      );
  }, [state.allDimExpenses, openOnly, projectFilter, statusFilter, categoryFilter, agingFilter, searchTerm]);

  const titles = {
    "accounts-receivable": isAmharic ? "6. ተሰብሳቢ ሂሳቦች (Accounts Receivable)" : "6. Accounts Receivable Management",
    "accounts-payable": isAmharic ? "7. ተከፋይ ሂሳቦች (Accounts Payable)" : "7. Accounts Payable Management",
    "aging-receivables": isAmharic ? "8. የሰብሳቢ ሂሳቦች ዕድሜ ትንተና (Aging Receivables)" : "8. Aging Receivables Analysis",
    "aging-payables": isAmharic ? "9. የተከፋይ ሂሳቦች ዕድሜ ትንተና (Aging Payables)" : "9. Aging Payables Analysis",
  };

  const perfBadgeClass =
    agingPerf.color === "Green"
      ? "bg-emerald-950/70 text-emerald-300 border-emerald-700"
      : agingPerf.color === "Yellow"
      ? "bg-amber-950/70 text-amber-300 border-amber-700"
      : "bg-red-950/70 text-red-300 border-red-700";

  const canCreateOrEdit = permissions.canManageTransactions || permissions.isDirector;

  const statusChoices = isReceivable
    ? ["Not Yet Due", "Due Today", "Overdue", "Partially Collected", "Fully Collected", "Disputed"]
    : ["Not Yet Due", "Due Today", "Overdue", "Partially Paid", "Fully Paid", "Disputed"];

  return (
    <div className="space-y-5" id={`finance-module-${mode}`}>
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${isReceivable ? "text-amber-400" : "text-orange-400"}`}>
            {isAging ? <Clock size={20} /> : isReceivable ? <Receipt size={20} /> : <CreditCard size={20} />}
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">{titles[mode]}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isReceivable
                ? isAmharic
                  ? "የደንበኛ ተሰብሳቢ ደረሰኞች ምዝገባ፣ መሰብሰብ፣ ዕድሜ ትንተና እና ማጽደቂያ ሂደት"
                  : "Client receivables registration, partial/full collection tracking, aging schedule & approval audit."
                : isAmharic
                ? "የአቅራቢ እና ንዑስ ተቋራጭ ተከፋይ ሂሳቦች፣ ክፍያ መመዝገቢያ እና ዕድሜ ትንተና"
                : "Supplier, subcontractor & operational payables, disbursements, aging buckets & 5-stage audit."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreateOrEdit && (
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>
                {isReceivable
                  ? isAmharic ? "ተሰብሳቢ መዝግብ" : "Register Receivable"
                  : isAmharic ? "ተከፋይ መዝግብ" : "Register Payable"}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              exportRowsToCsv(mode, isReceivable ? filteredInvoices : filteredExpenses)
            }
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download size={14} />
            <span>{isAmharic ? "CSV አውርድ" : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setViewTab("ledger")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
            viewTab === "ledger"
              ? "bg-red-600 text-white border-red-500"
              : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          {isAging ? <Clock size={14} /> : <Receipt size={14} />}
          <span>{isAmharic ? "ዋና መዝገብ እና የዕድሜ ትንተና" : "Active Ledger & Aging"}</span>
        </button>
        <button
          type="button"
          onClick={() => setViewTab("reports")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5 ${
            viewTab === "reports"
              ? "bg-red-600 text-white border-red-500"
              : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          <FileSpreadsheet size={14} />
          <span>{isAmharic ? "12 የAR እና AP ሪፖርቶች" : "12 AR & AP Reports"}</span>
        </button>
      </div>

      {notice && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold">
          {notice}
        </div>
      )}

      {viewTab === "reports" ? (
        <ArApReportsCenter
          isAmharic={isAmharic}
          state={state}
          defaultReport={
            mode === "aging-receivables"
              ? "aging-receivable-report"
              : mode === "aging-payables"
              ? "aging-payable-report"
              : mode === "accounts-payable"
              ? "accounts-payable-report"
              : "accounts-receivable-report"
          }
        />
      ) : (
        <>
          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">
                {isReceivable ? (isAmharic ? "ጠቅላላ ተሰብሳቢ" : "Total Receivables") : (isAmharic ? "ጠቅላላ ተከፋይ" : "Total Payables")}
              </span>
              <span className="text-lg font-mono font-black text-white tabular-nums mt-1 block">
                {formatCurrency(isReceivable ? metrics.totalReceivables : metrics.totalPayables, cur)}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {isReceivable ? `${state.allDimInvoices.length} registered invoices` : `${state.allDimExpenses.length} registered bills`}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">
                {isReceivable ? (isAmharic ? "ጠቅላላ የተሰበሰበ" : "Total Collected") : (isAmharic ? "ጠቅላላ የተከፈለ" : "Total Paid")}
              </span>
              <span className="text-lg font-mono font-black text-emerald-400 tabular-nums mt-1 block">
                {formatCurrency(isReceivable ? metrics.totalCollectedReceivables : metrics.totalPaidPayables, cur)}
              </span>
              <span className="text-[11px] text-emerald-400/80 font-mono mt-0.5 block tabular-nums">
                {isReceivable ? `Collection Rate: ${metrics.collectionRatePct}%` : `Payment Rate: ${metrics.paymentRatePct}%`}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">
                {isReceivable ? (isAmharic ? "ያልተሰበሰበ ቀሪ" : "Outstanding Receivables") : (isAmharic ? "ያልተከፈለ ቀሪ" : "Outstanding Payables")}
              </span>
              <span className="text-lg font-mono font-black text-amber-400 tabular-nums mt-1 block">
                {formatCurrency(isReceivable ? metrics.outstandingReceivables : metrics.outstandingPayables, cur)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono mt-0.5 block tabular-nums">
                Due This Month: {formatCurrency(isReceivable ? metrics.receivablesDueThisMonth : metrics.payablesDueThisMonth, cur)}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1">
                {(isReceivable ? metrics.overdueReceivables : metrics.overduePayables) > 0 && (
                  <AlertTriangle size={12} className="text-red-400" />
                )}
                <span>{isReceivable ? (isAmharic ? "ጊዜው ያለፈበት ተሰብሳቢ" : "Overdue Receivables") : (isAmharic ? "ጊዜው ያለፈበት ተከፋይ" : "Overdue Payables")}</span>
              </span>
              <span
                className={`text-lg font-mono font-black tabular-nums mt-1 block ${
                  (isReceivable ? metrics.overdueReceivables : metrics.overduePayables) > 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(isReceivable ? metrics.overdueReceivables : metrics.overduePayables, cur)}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block tabular-nums">
                Net AR Position: {formatCurrency(metrics.netReceivablePosition, cur)}
              </span>
            </div>
          </div>

          {/* Aging Performance Indicator Card (Part 3 Section 5) */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                <h3 className="text-sm font-extrabold text-white">
                  {isReceivable ? "AR Aging Performance Indicator" : "AP Aging Performance Indicator"}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${perfBadgeClass}`}>
                  {agingPerf.color} · {agingPerf.tier}
                </span>
                <span className="font-mono text-sm font-black text-white tabular-nums">
                  {agingPerf.percentageChange >= 0 ? "+" : ""}
                  {agingPerf.percentageChange.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isAmharic ? agingPerf.narrativeAm : agingPerf.narrative}
              </p>
              {agingPerf.liquidityWarning && (
                <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  <span>
                    Liquidity Safeguard Triggered: Available treasury liquidity is below outstanding payables — AP reduction cannot be scored Green.
                  </span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Prev Overdue</span>
                <span className="font-mono font-bold text-slate-200 tabular-nums">
                  {formatCurrency(agingPerf.previousOverdueAmount, cur)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Curr Overdue</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {formatCurrency(agingPerf.currentOverdueAmount, cur)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Prev Open</span>
                <span className="font-mono font-bold text-slate-200 tabular-nums">
                  {formatCurrency(agingPerf.previousOutstandingAmount, cur)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Curr Open</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {formatCurrency(agingPerf.currentOutstandingAmount, cur)}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Bucket Aging Chart + Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                {isReceivable
                  ? isAmharic ? "የተሰብሳቢ ሂሳቦች የዕድሜ ክፍፍል (5 ምድቦች)" : "Receivables Aging Distribution (5 Buckets)"
                  : isAmharic ? "የተከፋይ ሂሳቦች የዕድሜ ክፍፍል (5 ምድቦች)" : "Payables Aging Distribution (5 Buckets)"}
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, cur)}
                    />
                    <Bar
                      dataKey="amount"
                      name={isAmharic ? "መጠን" : "Amount"}
                      fill={isReceivable ? "#f59e0b" : "#f97316"}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "የዕድሜ ማጠቃለያ" : "Aging Bucket Breakdown"}
              </h3>
              <div className="space-y-2">
                {agingBuckets.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => setAgingFilter(agingFilter === b.label ? "ALL" : b.label)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      agingFilter === b.label
                        ? "bg-slate-800 border-amber-500"
                        : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-left">
                      <span className="font-bold text-white block">{b.label}</span>
                      <span className="text-[10px] text-slate-400">{b.count} {isAmharic ? "ሰነዶች" : "item(s)"}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-200 tabular-nums">
                      {formatCurrency(b.amount, cur)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="relative lg:col-span-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isReceivable ? "Search ID, Invoice #, Client, Contract..." : "Search ID, Bill #, Supplier, PO #..."}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-white"
              />
            </div>

            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="ALL">All Projects</option>
              {state.filterOptions.projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="ALL">All Categories</option>
              {(isReceivable ? RECEIVABLE_CATEGORIES : PAYABLE_CATEGORIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
            >
              <option value="ALL">All Statuses</option>
              {statusChoices.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white"
              >
                <option value="ALL">All Aging</option>
                {AGING_BUCKET_LABELS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setOpenOnly(!openOnly)}
                className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold cursor-pointer whitespace-nowrap ${
                  openOnly ? "bg-amber-600 text-white border-amber-500" : "bg-slate-900 text-slate-300 border-slate-800"
                }`}
              >
                {openOnly ? "Open Only" : "All"}
              </button>
            </div>
          </div>

          {/* AR / AP Register Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              {isReceivable ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                      <th className="py-3 px-4">ID / Invoice #</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Project / Category</th>
                      <th className="py-3 px-4">Due / Aging</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Collected</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4">Status / Stage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500">
                          {isAmharic ? "ምንም ተሰብሳቢ ሂሳብ አልተገኘም።" : "No Matching Receivables Found."}
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-white">{inv.invoiceNumber}</div>
                            <div className="text-[10px] font-mono text-slate-500">{inv.receivableId || inv.id}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold">{inv.normalizedClient}</td>
                          <td className="py-3 px-4">
                            <div className="text-slate-200">{inv.project}</div>
                            <div className="text-[10px] text-slate-400">{inv.normalizedReceivableCategory}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div className="text-slate-200">{inv.dueDate}</div>
                            <div className={inv.isOverdue ? "text-red-400 font-bold" : "text-slate-400"}>
                              {inv.agingCategory}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                            {formatCurrency(inv.amount, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 tabular-nums">
                            {formatCurrency(inv.collectedAmount, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                            {formatCurrency(inv.outstandingAmount, cur)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-block whitespace-nowrap ${lifecycleStatusBadgeClass(inv.arLifecycleStatus)}`}>
                              {inv.arLifecycleStatus}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{inv.effectiveWorkflowStage}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {canCreateOrEdit && inv.outstandingAmount > 0 && !inv.isDisputed && (
                                <button
                                  type="button"
                                  onClick={() => setSettleInvoice(inv)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <ArrowDownLeft size={12} />
                                  <span>{isAmharic ? "ሰብስብ" : "Collect"}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setInspectInvoice(inv)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Eye size={12} />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                      <th className="py-3 px-4">ID / Bill #</th>
                      <th className="py-3 px-4">Supplier / Creditor</th>
                      <th className="py-3 px-4">Project / Category</th>
                      <th className="py-3 px-4">Due / Aging</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4">Status / Stage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-500">
                          {isAmharic ? "ምንም ተከፋይ ሂሳብ አልተገኘም።" : "No Matching Payables Found."}
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-white">{exp.billNumber || exp.referenceNo || exp.id}</div>
                            <div className="text-[10px] font-mono text-slate-500">{exp.payableId || exp.id}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold">{exp.normalizedSupplier}</td>
                          <td className="py-3 px-4">
                            <div className="text-slate-200">{exp.project}</div>
                            <div className="text-[10px] text-slate-400">{exp.normalizedPayableCategory}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div className="text-slate-200">{exp.dueDate}</div>
                            <div className={exp.isOverdue ? "text-red-400 font-bold" : "text-slate-400"}>
                              {exp.agingCategory}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                            {formatCurrency(exp.amount, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 tabular-nums">
                            {formatCurrency(exp.paidCashAmount, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-orange-400 tabular-nums">
                            {formatCurrency(exp.outstandingAmount, cur)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-block whitespace-nowrap ${lifecycleStatusBadgeClass(exp.apLifecycleStatus)}`}>
                              {exp.apLifecycleStatus}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">{exp.effectiveWorkflowStage}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {canCreateOrEdit && exp.outstandingAmount > 0 && !exp.isDisputed && (
                                <button
                                  type="button"
                                  onClick={() => setSettleExpense(exp)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <ArrowUpRight size={12} />
                                  <span>{isAmharic ? "ክፈል" : "Pay"}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setInspectExpense(exp)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Eye size={12} />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Register New AR or AP Modal */}
      {showRegisterModal && (
        <RegisterArApModal
          domain={isReceivable ? "AR" : "AP"}
          isAmharic={isAmharic}
          currency={cur}
          projects={state.filterOptions.projects}
          clients={state.filterOptions.customers}
          suppliers={state.filterOptions.suppliers}
          rawInvoices={rawInvoices}
          rawExpenses={rawExpenses}
          actorName={actorName}
          actorRole={actorRole}
          actorUid={actorUid}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={triggerNotice}
        />
      )}

      {/* Collect / Pay Modal */}
      {(settleInvoice || settleExpense) && (
        <ArApSettlementModal
          invoice={settleInvoice}
          expense={settleExpense}
          isAmharic={isAmharic}
          currency={cur}
          rawAccounts={rawAccounts}
          scopedCashTransactions={state.scopedCashTransactions}
          directorThreshold={settings.requireDirectorApprovalAboveEtb}
          permissions={permissions}
          actorName={actorName}
          actorRole={actorRole}
          actorUid={actorUid}
          onClose={() => {
            setSettleInvoice(null);
            setSettleExpense(null);
          }}
          onSuccess={triggerNotice}
        />
      )}

      {/* Detail / Workflow / Dispute / Audit Modal */}
      {(inspectInvoice || inspectExpense) && (
        <ArApDetailWorkflowModal
          invoice={inspectInvoice}
          expense={inspectExpense}
          isAmharic={isAmharic}
          currency={cur}
          permissions={permissions}
          actorName={actorName}
          actorRole={actorRole}
          actorUid={actorUid}
          onClose={() => {
            setInspectInvoice(null);
            setInspectExpense(null);
          }}
          onSuccess={triggerNotice}
        />
      )}
    </div>
  );
};
