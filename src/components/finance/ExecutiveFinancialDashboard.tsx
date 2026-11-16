import React from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Briefcase,
  ChevronRight,
  CreditCard,
  DollarSign,
  Landmark,
  LineChart as LineIcon,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FinancialMenuModuleId } from "../../types";
import { ComputedFinancialState } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface ExecutiveFinancialDashboardProps {
  isAmharic: boolean;
  state: ComputedFinancialState;
  onNavigateModule: (moduleId: FinancialMenuModuleId) => void;
}

const formatCompactEtb = (val: number): string => {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
};

const SignedVariance: React.FC<{ value: number; positiveIsGood?: boolean; currency?: string }> = ({
  value,
  positiveIsGood = true,
  currency = "ETB",
}) => {
  const isZero = Math.abs(value) < 0.01;
  const isFavorable = positiveIsGood ? value >= 0 : value <= 0;
  const color = isZero
    ? "text-slate-400"
    : isFavorable
    ? "text-emerald-400"
    : "text-red-400";
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return (
    <span className={`font-mono font-bold tabular-nums ${color}`}>
      {prefix}
      {currency} {Math.abs(value).toLocaleString()}
    </span>
  );
};

export const ExecutiveFinancialDashboard: React.FC<ExecutiveFinancialDashboardProps> = ({
  isAmharic,
  state,
  onNavigateModule,
}) => {
  const { metrics, charts, alerts, settings, permissions } = state;
  const cur = settings.defaultCurrency || "ETB";

  const tooltipStyle = {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderRadius: "10px",
    fontSize: "11px",
    color: "#e2e8f0",
  };

  const hasAnyTransactionData =
    state.scopedInvoices.length > 0 ||
    state.scopedExpenses.length > 0 ||
    state.scopedCashTransactions.length > 0 ||
    state.scopedTargets.length > 0 ||
    state.scopedBudgets.length > 0;

  return (
    <div className="space-y-6" id="executive-financial-dashboard">
      {/* Critical Alerts Banner (if any active alerts) */}
      {alerts.length > 0 && (
        <div className="bg-slate-950 border border-red-900/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-950 border border-red-800/80 text-red-400 shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-400">
                  {isAmharic
                    ? `${alerts.length} አስቸኳይ የፋይናንስ ማንቂያዎች`
                    : `${alerts.length} Active Financial Alert(s)`}
                </h3>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isAmharic ? alerts[0].titleAm : alerts[0].title} —{" "}
                {isAmharic ? alerts[0].descriptionAm : alerts[0].description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateModule("financial-notifications")}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start md:self-center"
          >
            <span>{isAmharic ? "ሁሉንም ማንቂያዎች ይመልከቱ" : "Inspect Alerts"}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Project Manager Scope Notice */}
      {permissions.isProjectScopedOnly && (
        <div className="bg-slate-950 border border-amber-800/60 rounded-2xl p-3.5 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>
            {state.assignedProjects.length > 0
              ? isAmharic
                ? `የፕሮጀክት ወሰን፡ ለእርስዎ የተመደቡት ፕሮጀክቶች ብቻ ይታያሉ (${state.assignedProjects.join(", ")})።`
                : `Project Scope Active: Financial KPIs and charts are restricted to your assigned project(s): ${state.assignedProjects.join(", ")}.`
              : isAmharic
              ? "ለመለያዎ የተመደበ ፕሮጀክት የለም። ፕሮጀክት እንዲመደብልዎ አስተዳዳሪውን ያነጋግሩ።"
              : "No project is currently assigned to your user profile. Contact Super Admin or Finance Manager to assign a project."}
          </span>
        </div>
      )}

      {/* Financial Performance Summary Strip + Strict Accrual vs Cash Separation */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
              {isAmharic ? "የፋይናንስ አፈጻጸም ማጠቃለያ" : "Financial Performance Summary"}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAmharic
                ? "የተመዘገበ ገቢ/ወጪ (Accrual) ከትክክለኛ የጥሬ ገንዘብ እንቅስቃሴ (Cash Flow) በጥብቅ ተለይቶ ይሰላል።"
                : "Strict accounting separation: accrual Revenue/Expenses are tracked separately from posted Cash Collections/Payments."}
            </p>
          </div>
          {!hasAnyTransactionData && (
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/50 border border-amber-800/70 px-2.5 py-1 rounded-lg whitespace-nowrap">
              {isAmharic ? "ምንም የFirestore መዝገብ አልተገኘም" : "Live Ledger Empty — Record Transactions"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "ጠቅላላ ገቢ" : "Total Revenue"}</span>
            <span className="font-mono font-bold text-emerald-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.actualRevenue, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "ጠቅላላ ወጪ" : "Total Expenses"}</span>
            <span className="font-mono font-bold text-red-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.actualExpenses, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "የተጣራ ትርፍ/ኪሳራ" : "Net Profit/Loss"}</span>
            <span
              className={`font-mono font-bold tabular-nums mt-0.5 block ${
                metrics.actualProfitOrLoss >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatCurrency(metrics.actualProfitOrLoss, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "ቀሪ ተሰብሳቢ" : "Open AR"}</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.outstandingReceivables, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "ቀሪ ተከፋይ" : "Open AP"}</span>
            <span className="font-mono font-bold text-orange-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.outstandingPayables, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "ጊዜው ያለፈበት" : "Total Overdue"}</span>
            <span className="font-mono font-bold text-red-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.totalOverdueAmount, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "የጥሬ ገንዘብ ቀሪ" : "Cash Available"}</span>
            <span className="font-mono font-bold text-cyan-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.availableCashBalance, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "የባንክ ቀሪ" : "Bank Available"}</span>
            <span className="font-mono font-bold text-blue-400 tabular-nums mt-0.5 block">
              {formatCurrency(metrics.totalBankBalance, cur)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase block">{isAmharic ? "የተጣራ የገንዘብ ፍሰት" : "Net Cash Flow"}</span>
            <span
              className={`font-mono font-bold tabular-nums mt-0.5 block ${
                metrics.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {formatCurrency(metrics.netCashFlow, cur)}
            </span>
          </div>
        </div>
      </div>

      {/* ALL 8 EXECUTIVE KPI CARD GROUPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Revenue KPI Card */}
        <div
          onClick={() => onNavigateModule("revenue-management")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. {isAmharic ? "ገቢ (Revenue)" : "Revenue (Accrual)"}
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.actualRevenue, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የታቀደ ገቢ:" : "Planned Revenue:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.plannedRevenue, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ትክክለኛ ገቢ:" : "Actual Revenue:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.actualRevenue, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ልዩነት:" : "Revenue Difference:"}</span>
              <SignedVariance value={metrics.revenueDifference} positiveIsGood={true} currency={cur} />
            </div>
          </div>
        </div>

        {/* 2. Expenses KPI Card */}
        <div
          onClick={() => onNavigateModule("expense-management")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                2. {isAmharic ? "ወጪዎች (Expenses)" : "Expenses (Accrual)"}
              </span>
              <span className="text-xl font-black text-red-400 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.actualExpenses, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-red-950/70 border border-red-800/70 text-red-400">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የታቀደ ወጪ:" : "Planned Expenses:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.plannedExpenses, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ትክክለኛ ወጪ:" : "Actual Expenses:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.actualExpenses, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ልዩነት:" : "Expense Difference:"}</span>
              <SignedVariance value={metrics.expenseDifference} positiveIsGood={false} currency={cur} />
            </div>
          </div>
        </div>

        {/* 3. Cash Collection KPI Card */}
        <div
          onClick={() => onNavigateModule("cash-collection")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                3. {isAmharic ? "የጥሬ ገንዘብ መሰብሰብ" : "Cash Collection"}
              </span>
              <span className="text-xl font-black text-cyan-400 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.actualCashCollection, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-800/70 text-cyan-400">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የታቀደ መሰብሰብ:" : "Planned Collection:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.plannedCashCollection, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ትክክለኛ መሰብሰብ:" : "Actual Collection:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.actualCashCollection, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ልዩነት:" : "Collection Difference:"}</span>
              <SignedVariance value={metrics.collectionDifference} positiveIsGood={true} currency={cur} />
            </div>
          </div>
        </div>

        {/* 4. Cash Payment KPI Card */}
        <div
          onClick={() => onNavigateModule("cash-payment")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                4. {isAmharic ? "የጥሬ ገንዘብ ክፍያ" : "Cash Payment"}
              </span>
              <span className="text-xl font-black text-amber-400 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.actualCashPayment, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-800/70 text-amber-400">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የታቀደ ክፍያ:" : "Planned Payment:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.plannedCashPayment, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ትክክለኛ ክፍያ:" : "Actual Payment:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.actualCashPayment, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ልዩነት:" : "Payment Difference:"}</span>
              <SignedVariance value={metrics.paymentDifference} positiveIsGood={false} currency={cur} />
            </div>
          </div>
        </div>

        {/* 5. Accounts Receivable KPI Card */}
        <div
          onClick={() => onNavigateModule("accounts-receivable")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                5. {isAmharic ? "ተሰብሳቢ ሂሳቦች (AR)" : "Accounts Receivable"}
              </span>
              <span className="text-xl font-black text-amber-300 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.outstandingReceivables, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-950/70 border border-amber-800/70 text-amber-400">
              <Receipt size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ጠቅላላ ተሰብሳቢ:" : "Total Receivables:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.totalReceivables, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ያልተሰበሰበ ቀሪ:" : "Outstanding AR:"}</span>
              <span className="font-mono text-amber-400 font-bold tabular-nums">
                {formatCurrency(metrics.outstandingReceivables, cur)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ጊዜው ያለፈበት:" : "Overdue AR:"}</span>
              <span className={`font-mono font-bold tabular-nums ${metrics.overdueReceivables > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(metrics.overdueReceivables, cur)}
              </span>
            </div>
          </div>
        </div>

        {/* 6. Accounts Payable KPI Card */}
        <div
          onClick={() => onNavigateModule("accounts-payable")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                6. {isAmharic ? "ተከፋይ ሂሳቦች (AP)" : "Accounts Payable"}
              </span>
              <span className="text-xl font-black text-orange-400 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.outstandingPayables, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-orange-950/70 border border-orange-800/70 text-orange-400">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ጠቅላላ ተከፋይ:" : "Total Payables:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.totalPayables, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ያልተከፈለ ቀሪ:" : "Outstanding AP:"}</span>
              <span className="font-mono text-orange-400 font-bold tabular-nums">
                {formatCurrency(metrics.outstandingPayables, cur)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ጊዜው ያለፈበት:" : "Overdue AP:"}</span>
              <span className={`font-mono font-bold tabular-nums ${metrics.overduePayables > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(metrics.overduePayables, cur)}
              </span>
            </div>
          </div>
        </div>

        {/* 7. Profit and Loss KPI Card */}
        <div
          onClick={() => onNavigateModule("profit-and-loss")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                7. {isAmharic ? "ትርፍ እና ኪሳራ (P&L)" : "Profit and Loss"}
              </span>
              <span
                className={`text-xl font-black font-mono tabular-nums mt-1 block ${
                  metrics.actualProfitOrLoss >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatCurrency(metrics.actualProfitOrLoss, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-800/70 text-blue-400">
              <Scale size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የታቀደ ትርፍ:" : "Planned Profit:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.plannedProfit, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ትክክለኛ ትርፍ/ኪሳራ:" : "Actual Profit/Loss:"}</span>
              <span className={`font-mono font-bold tabular-nums ${metrics.actualProfitOrLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(metrics.actualProfitOrLoss, cur)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የትርፍ መጠን (%):" : "Profit Margin:"}</span>
              <span className={`font-mono font-bold tabular-nums ${metrics.profitMarginPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {metrics.profitMarginPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 8. Cash and Liquidity KPI Card */}
        <div
          onClick={() => onNavigateModule("liquidity-management")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                8. {isAmharic ? "ጥሬ ገንዘብ እና ሊኩዲቲ" : "Cash and Liquidity"}
              </span>
              <span className="text-xl font-black text-blue-400 font-mono tabular-nums mt-1 block">
                {formatCurrency(metrics.currentLiquidityPosition, cur)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-800/70 text-blue-400">
              <Landmark size={18} />
            </div>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ያለ ጥሬ ገንዘብ:" : "Available Cash:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.availableCashBalance, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "ጠቅላላ የባንክ ቀሪ:" : "Total Bank Balance:"}</span>
              <span className="font-mono text-slate-200 tabular-nums">{formatCurrency(metrics.totalBankBalance, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isAmharic ? "የተጣራ የገንዘብ ፍሰት:" : "Net Cash Flow:"}</span>
              <SignedVariance value={metrics.netCashFlow} positiveIsGood={true} currency={cur} />
            </div>
          </div>
        </div>
      </div>

      {/* PART 3: AR / AP EXECUTIVE SUMMARY, NET RECEIVABLE POSITION & AGING INDICATORS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Accounts Receivable Summary */}
        <div
          onClick={() => onNavigateModule("accounts-receivable")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              {isAmharic ? "የተሰብሳቢ ሂሳቦች (AR) ማጠቃለያ" : "Accounts Receivable Executive Summary"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono tabular-nums ${
                metrics.arAgingPerformance.color === "Green"
                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-700"
                  : metrics.arAgingPerformance.color === "Yellow"
                  ? "bg-amber-950/70 text-amber-300 border-amber-700"
                  : "bg-red-950/70 text-red-300 border-red-700"
              }`}
            >
              {metrics.arAgingPerformance.color} {metrics.arAgingPerformance.percentageChange >= 0 ? "+" : ""}
              {metrics.arAgingPerformance.percentageChange.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total Receivables</span>
              <span className="font-mono font-bold text-white tabular-nums">{formatCurrency(metrics.totalReceivables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total Collected</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">{formatCurrency(metrics.totalCollectedReceivables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Outstanding AR</span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">{formatCurrency(metrics.outstandingReceivables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Overdue AR</span>
              <span className="font-mono font-bold text-red-400 tabular-nums">{formatCurrency(metrics.overdueReceivables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Due This Month</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">{formatCurrency(metrics.receivablesDueThisMonth, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Collection Rate</span>
              <span className="font-mono font-bold text-cyan-400 tabular-nums">{metrics.collectionRatePct}%</span>
            </div>
          </div>
        </div>

        {/* Accounts Payable Summary */}
        <div
          onClick={() => onNavigateModule("accounts-payable")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400">
              {isAmharic ? "የተከፋይ ሂሳቦች (AP) ማጠቃለያ" : "Accounts Payable Executive Summary"}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono tabular-nums ${
                metrics.apAgingPerformance.color === "Green"
                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-700"
                  : metrics.apAgingPerformance.color === "Yellow"
                  ? "bg-amber-950/70 text-amber-300 border-amber-700"
                  : "bg-red-950/70 text-red-300 border-red-700"
              }`}
            >
              {metrics.apAgingPerformance.color} {metrics.apAgingPerformance.percentageChange >= 0 ? "+" : ""}
              {metrics.apAgingPerformance.percentageChange.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total Payables</span>
              <span className="font-mono font-bold text-white tabular-nums">{formatCurrency(metrics.totalPayables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Total Paid</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">{formatCurrency(metrics.totalPaidPayables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Outstanding AP</span>
              <span className="font-mono font-bold text-orange-400 tabular-nums">{formatCurrency(metrics.outstandingPayables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Overdue AP</span>
              <span className="font-mono font-bold text-red-400 tabular-nums">{formatCurrency(metrics.overduePayables, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Due This Month</span>
              <span className="font-mono font-bold text-slate-200 tabular-nums">{formatCurrency(metrics.payablesDueThisMonth, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Payment Rate</span>
              <span className="font-mono font-bold text-cyan-400 tabular-nums">{metrics.paymentRatePct}%</span>
            </div>
          </div>
        </div>

        {/* Combined Working Capital & Net Receivable Position */}
        <div
          onClick={() => onNavigateModule("aging-receivables")}
          className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
              {isAmharic ? "የተጣራ AR/AP አቋም" : "Combined AR / AP Summary"}
            </span>
            <Scale size={15} className="text-cyan-400" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Outstanding AR:</span>
              <span className="font-mono font-bold text-amber-400 tabular-nums">{formatCurrency(metrics.outstandingReceivables, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Outstanding AP:</span>
              <span className="font-mono font-bold text-orange-400 tabular-nums">{formatCurrency(metrics.outstandingPayables, cur)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-800/80">
              <span className="text-slate-200 font-bold">Net Receivable Position:</span>
              <SignedVariance value={metrics.netReceivablePosition} positiveIsGood={true} currency={cur} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Net Working Capital Impact:</span>
              <span className={`font-mono font-bold tabular-nums ${metrics.netWorkingLiquidity >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(metrics.netWorkingLiquidity, cur)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Overdue Obligations:</span>
              <span className="font-mono font-bold text-red-400 tabular-nums">{formatCurrency(metrics.totalOverdueAmount, cur)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ALL 9 INTERACTIVE DASHBOARD CHARTS (100% LIVE FIRESTORE DATA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Planned Revenue vs Actual Revenue */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-400" />
              <span>1. {isAmharic ? "የታቀደ ገቢ ከትክክለኛ ገቢ" : "Planned Revenue vs Actual Revenue"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("revenue-management")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "Manage →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenuePlanVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="plannedRevenue" name={isAmharic ? "የታቀደ ገቢ" : "Planned Revenue"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualRevenue" name={isAmharic ? "ትክክለኛ ገቢ" : "Actual Revenue"} fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Planned Expenses vs Actual Expenses */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-red-400" />
              <span>2. {isAmharic ? "የታቀደ ወጪ ከትክክለኛ ወጪ" : "Planned Expenses vs Actual Expenses"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("expense-management")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "Manage →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.expensePlanVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="plannedExpenses" name={isAmharic ? "የታቀደ ወጪ" : "Planned Expenses"} fill="#64748b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualExpenses" name={isAmharic ? "ትክክለኛ ወጪ" : "Actual Expenses"} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Planned Cash Collection vs Actual Collection */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet size={16} className="text-cyan-400" />
              <span>3. {isAmharic ? "የታቀደ መሰብሰብ ከትክክለኛ መሰብሰብ" : "Planned Cash Collection vs Actual Collection"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("cash-collection")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "Collect →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.collectionPlanVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="plannedCollection" name={isAmharic ? "የታቀደ መሰብሰብ" : "Planned Collection"} fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualCollection" name={isAmharic ? "ትክክለኛ መሰብሰብ" : "Actual Collection"} fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Planned Cash Payment vs Actual Payment */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Banknote size={16} className="text-amber-400" />
              <span>4. {isAmharic ? "የታቀደ ክፍያ ከትክክለኛ ክፍያ" : "Planned Cash Payment vs Actual Payment"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("cash-payment")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "Pay →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.paymentPlanVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="plannedPayment" name={isAmharic ? "የታቀደ ክፍያ" : "Planned Payment"} fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualPayment" name={isAmharic ? "ትክክለኛ ክፍያ" : "Actual Payment"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Accounts Receivable Trends */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LineIcon size={16} className="text-amber-400" />
              <span>5. {isAmharic ? "የተሰብሳቢ ሂሳቦች (AR) አዝማሚያ" : "Accounts Receivable Trends"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("aging-receivables")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "የዕድሜ ትንተና →" : "AR Aging →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.arTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="billedRevenue" name={isAmharic ? "የተጠየቀ ደረሰኝ" : "Billed AR"} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outstandingAR" name={isAmharic ? "ያልተሰበሰበ AR" : "Outstanding AR"} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="overdueAR" name={isAmharic ? "ጊዜው ያለፈበት AR" : "Overdue AR"} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Accounts Payable Trends */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LineIcon size={16} className="text-orange-400" />
              <span>6. {isAmharic ? "የተከፋይ ሂሳቦች (AP) አዝማሚያ" : "Accounts Payable Trends"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("aging-payables")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "የዕድሜ ትንተና →" : "AP Aging →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.apTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="incurredExpenses" name={isAmharic ? "የአቅራቢ ሂሳብ" : "Billed AP"} stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="outstandingAP" name={isAmharic ? "ያልተከፈለ AP" : "Outstanding AP"} stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="overdueAP" name={isAmharic ? "ጊዜው ያለፈበት AP" : "Overdue AP"} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Profit and Loss Trends */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              <span>7. {isAmharic ? "የትርፍ እና ኪሳራ አዝማሚያ" : "Profit and Loss Trends"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("profit-and-loss")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "P&L Statement →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.profitLossTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="plannedProfit" name={isAmharic ? "የታቀደ ትርፍ" : "Planned Profit"} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="actualProfit" name={isAmharic ? "ትክክለኛ ትርፍ/ኪሳራ" : "Actual Profit/Loss"} stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 8: Cash Flow Trends */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Landmark size={16} className="text-cyan-400" />
              <span>8. {isAmharic ? "የጥሬ ገንዘብ ፍሰት አዝማሚያ" : "Cash Flow Trends"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("cash-flow")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "Cash Flow →"}
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={charts.cashFlowTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                <Bar dataKey="cashInflow" name={isAmharic ? "ገቢ ጥሬ ገንዘብ" : "Cash Inflow"} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cashOutflow" name={isAmharic ? "ወጪ ጥሬ ገንዘብ" : "Cash Outflow"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="netCashFlow" name={isAmharic ? "የተጣራ ፍሰት" : "Net Cash Flow"} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 9: Budget vs Actual Performance (Full Width on Desktop) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase size={16} className="text-blue-400" />
              <span>9. {isAmharic ? "የበጀት ከትክክለኛ አፈጻጸም ንፅፅር" : "Budget vs Actual Performance"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("budget-management")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "በጀት ያስተዳድሩ →" : "Manage Budgets & Targets →"}
            </button>
          </div>
          {charts.budgetVsActual.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-300">
                {isAmharic ? "ምንም የበጀት ምደባ አልተመዘገበም" : "No Budget Allocations Recorded Yet"}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {isAmharic
                  ? "በበጀት አስተዳደር ክፍል የፕሮጀክት ወጪ በጀቶችን እና ወርሃዊ ግቦችን ያስገቡ።"
                  : "Create project cost budgets and monthly targets in Budget Management to track live variance."}
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.budgetVsActual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="allocated" name={isAmharic ? "የተመደበ በጀት" : "Allocated Budget"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="committed" name={isAmharic ? "ቃል የተገባ" : "Committed"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name={isAmharic ? "ትክክለኛ ወጪ" : "Actual Spend"} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 10: AR Aging Chart (Part 3) */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span>10. {isAmharic ? "የተሰብሳቢ ሂሳቦች ዕድሜ (AR Aging)" : "AR Aging Distribution"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("aging-receivables")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "AR Aging →"}
            </button>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.agingReceivables}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Bar dataKey="amount" name={isAmharic ? "ያልተሰበሰበ" : "Outstanding AR"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 11: AP Aging Chart (Part 3) */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-orange-400" />
              <span>11. {isAmharic ? "የተከፋይ ሂሳቦች ዕድሜ (AP Aging)" : "AP Aging Distribution"}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateModule("aging-payables")}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              {isAmharic ? "ዝርዝር →" : "AP Aging →"}
            </button>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={state.agingPayables}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={formatCompactEtb} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(v, cur)} />
                <Bar dataKey="amount" name={isAmharic ? "ያልተከፈለ" : "Outstanding AP"} fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
