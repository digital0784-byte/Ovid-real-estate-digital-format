import React, { useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  TrendingUp,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildCashCollectionPaymentAnalytics,
  ComputedFinancialState,
} from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface CashCollectionPaymentDashboardProps {
  isAmharic: boolean;
  state: ComputedFinancialState;
  focusMode?: "all" | "collection" | "payment";
}

const formatCompactEtb = (val: number): string => {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
};

export const CashCollectionPaymentDashboard: React.FC<CashCollectionPaymentDashboardProps> = ({
  isAmharic,
  state,
  focusMode = "all",
}) => {
  const cur = state.settings.defaultCurrency || "ETB";
  const analytics = useMemo(() => buildCashCollectionPaymentAnalytics(state), [state]);
  const { collectionKpis, paymentKpis, charts } = analytics;

  const tooltipStyle = {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderRadius: "10px",
    fontSize: "11px",
    color: "#e2e8f0",
  };

  const showCollection = focusMode === "all" || focusMode === "collection";
  const showPayment = focusMode === "all" || focusMode === "payment";

  return (
    <div className="space-y-6" id="cash-collection-payment-dashboard">
      {/* SEPARATE CASH COLLECTION KPI SECTION */}
      {showCollection && (
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/70 text-cyan-400">
                <ArrowDownLeft size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {isAmharic ? "የጥሬ ገንዘብ መሰብሰብ አፈጻጸም (Cash Collection KPIs)" : "Cash Collection Performance & KPIs"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isAmharic
                    ? "የጸደቁ የተሰበሰቡ ገንዘቦች ብቻ የሂሳብ ቀሪን እና የታቀደውን አፈጻጸም ያዘምናሉ"
                    : "Only Verified & Confirmed collections credit Cash/Bank balances & reduce Open AR."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-emerald-400 font-bold">
                {collectionKpis.confirmedCount} {isAmharic ? "የጸደቁ" : "Confirmed"}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-bold">
                {collectionKpis.pendingCount} {isAmharic ? "በመጠባበቅ ላይ" : "Pending Verification"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "ወርሃዊ የመሰብሰብ እቅድ" : "Monthly Collection Target"}
              </span>
              <span className="text-base font-mono font-black text-white tabular-nums mt-1 block">
                {formatCurrency(collectionKpis.monthlyTarget, cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "የተሰበሰበ ትክክለኛ ገንዘብ" : "Actual Amount Collected"}
              </span>
              <span className="text-base font-mono font-black text-cyan-400 tabular-nums mt-1 block">
                {formatCurrency(collectionKpis.actualCollected, cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "የመሰብሰብ ልዩነት" : "Collection Difference"}
              </span>
              <span
                className={`text-base font-mono font-black tabular-nums mt-1 block ${
                  collectionKpis.collectionDifference >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {collectionKpis.collectionDifference >= 0 ? "+" : "-"}
                {formatCurrency(Math.abs(collectionKpis.collectionDifference), cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "የስኬት መጠን (%)" : "Collection Achievement %"}
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-base font-mono font-black text-emerald-400 tabular-nums">
                  {collectionKpis.achievementPct.toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {isAmharic ? "ቀሪ እቅድ:" : "Rem:"} {formatCompactEtb(collectionKpis.outstandingTarget)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, collectionKpis.achievementPct))}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "ያልተሰበሰበ ተሰብሳቢ (AR)" : "Outstanding Receivables"}
              </span>
              <span className="text-base font-mono font-black text-amber-400 tabular-nums mt-1 block">
                {formatCurrency(collectionKpis.outstandingReceivables, cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "ጊዜው ያለፈበት መሰብሰብ" : "Overdue Collections"}
              </span>
              <span className="text-base font-mono font-black text-red-400 tabular-nums mt-1 block">
                {formatCurrency(collectionKpis.overdueCollections, cur)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* SEPARATE CASH PAYMENT KPI SECTION */}
      {showPayment && (
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/70 text-amber-400">
                <ArrowUpRight size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {isAmharic ? "የጥሬ ገንዘብ ክፍያ አፈጻጸም (Cash Payment KPIs)" : "Cash Payment Budget & Disbursement KPIs"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isAmharic
                    ? "በፋይናንስ ሥራ አስኪያጅ ወይም በዳይሬክተር የጸደቁ ክፍያዎች ብቻ ከባንክ ሂሳብ ይቀነሳሉ"
                    : "Only Confirmed & Paid disbursements deduct Cash/Bank balances & settle Open AP."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-emerald-400 font-bold">
                {paymentKpis.confirmedCount} {isAmharic ? "የተከፈሉ" : "Paid"}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-bold">
                {paymentKpis.pendingCount} {isAmharic ? "ፍቃድ የሚጠብቁ" : "Awaiting Approval"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "ወርሃዊ የክፍያ በጀት" : "Monthly Payment Budget"}
              </span>
              <span className="text-base font-mono font-black text-white tabular-nums mt-1 block">
                {formatCurrency(paymentKpis.monthlyBudget, cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "የተከፈለ ትክክለኛ ገንዘብ" : "Actual Amount Paid"}
              </span>
              <span className="text-base font-mono font-black text-amber-400 tabular-nums mt-1 block">
                {formatCurrency(paymentKpis.actualPaid, cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "የክፍያ ልዩነት" : "Payment Difference"}
              </span>
              <span
                className={`text-base font-mono font-black tabular-nums mt-1 block ${
                  paymentKpis.paymentDifference <= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {paymentKpis.paymentDifference > 0 ? "+" : paymentKpis.paymentDifference < 0 ? "-" : ""}
                {formatCurrency(Math.abs(paymentKpis.paymentDifference), cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "የክፍያ አጠቃቀም (%)" : "Payment Achievement %"}
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-base font-mono font-black text-amber-300 tabular-nums">
                  {paymentKpis.achievementPct.toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {isAmharic ? "ቀሪ እቅድ:" : "Rem:"} {formatCompactEtb(paymentKpis.outstandingPlanned)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    paymentKpis.achievementPct > 100 ? "bg-red-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, paymentKpis.achievementPct))}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {isAmharic ? "ያልተከፈለ ተከፋይ (AP)" : "Outstanding Payables"}
              </span>
              <span className="text-base font-mono font-black text-orange-400 tabular-nums mt-1 block">
                {formatCurrency(paymentKpis.outstandingPayables, cur)}
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block flex items-center gap-1">
                <CalendarClock size={11} />
                {isAmharic ? `መጪ ክፍያዎች (${paymentKpis.upcomingPaymentsCount})` : `Upcoming Payments (${paymentKpis.upcomingPaymentsCount})`}
              </span>
              <span className="text-base font-mono font-black text-purple-400 tabular-nums mt-1 block">
                {formatCurrency(paymentKpis.upcomingPaymentsTotal, cur)}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 7 INTERACTIVE CHARTS: DAILY / WEEKLY / MONTHLY COLLECTION & PAYMENT + PLANNED VS ACTUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {showCollection && (
          <>
            {/* Chart 1: Daily Collection Chart */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-cyan-400" />
                  <span>{isAmharic ? "1. ዕለታዊ የገንዘብ መሰብሰብ (Daily)" : "1. Daily Cash Collection (Last 14 Days)"}</span>
                </h4>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.dailyCollections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="planned" name={isAmharic ? "የታቀደ" : "Planned"} fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name={isAmharic ? "የተሰበሰበ" : "Collected"} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Weekly Collection Chart */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Clock size={14} className="text-emerald-400" />
                <span>{isAmharic ? "2. ሳምንታዊ የገንዘብ መሰብሰብ (Weekly)" : "2. Weekly Cash Collection Progress"}</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.weeklyCollections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="planned" name={isAmharic ? "የታቀደ" : "Planned"} fill="#334155" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name={isAmharic ? "የተሰበሰበ" : "Actual Collected"} fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Monthly Collection Trends */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <TrendingUp size={14} className="text-cyan-400" />
                <span>{isAmharic ? "3. ወርሃዊ የመሰብሰብ አዝማሚያ (Monthly)" : "3. Monthly Cash Collection Trends (6 Months)"}</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyCollections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Area type="monotone" dataKey="planned" name={isAmharic ? "የታቀደ" : "Planned"} stroke="#64748b" fill="#1e293b" />
                    <Area type="monotone" dataKey="actual" name={isAmharic ? "የተሰበሰበ" : "Actual Collected"} stroke="#06b6d4" fill="#083344" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {showPayment && (
          <>
            {/* Chart 4: Daily Payment Chart */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <BarChart3 size={14} className="text-amber-400" />
                <span>{isAmharic ? "4. ዕለታዊ የገንዘብ ክፍያ (Daily)" : "4. Daily Cash Payment (Last 14 Days)"}</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.dailyPayments}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="planned" name={isAmharic ? "የታቀደ" : "Planned Budget"} fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name={isAmharic ? "የተከፈለ" : "Actual Paid"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Weekly Payment Chart */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Clock size={14} className="text-orange-400" />
                <span>{isAmharic ? "5. ሳምንታዊ የገንዘብ ክፍያ (Weekly)" : "5. Weekly Cash Payment Progress"}</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.weeklyPayments}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="planned" name={isAmharic ? "የታቀደ" : "Planned"} fill="#334155" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name={isAmharic ? "የተከፈለ" : "Paid"} fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Monthly Payment Trends */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <TrendingUp size={14} className="text-red-400" />
                <span>{isAmharic ? "6. ወርሃዊ የክፍያ አዝማሚያ (Monthly)" : "6. Monthly Cash Payment Trends (6 Months)"}</span>
              </h4>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyPayments}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Area type="monotone" dataKey="planned" name={isAmharic ? "የታቀደ በጀት" : "Planned Budget"} stroke="#64748b" fill="#1e293b" />
                    <Area type="monotone" dataKey="actual" name={isAmharic ? "የተከፈለ" : "Actual Paid"} stroke="#ef4444" fill="#450a0a" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Chart 7: Planned vs Actual Comparison (Collection & Payment Side-by-Side) */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 lg:col-span-2">
          <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>
              {isAmharic
                ? "7. የታቀደ ከትክክለኛ ገቢ እና ክፍያ ንጽጽር (Planned vs Actual)"
                : "7. Planned vs Actual Cash Collection & Payment Comparison"}
            </span>
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={charts.plannedVsActualComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tickFormatter={formatCompactEtb} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v), cur)} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="actualCollection" name={isAmharic ? "ትክክለኛ መሰብሰብ" : "Actual Collection"} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="plannedCollection" name={isAmharic ? "የታቀደ መሰብሰብ" : "Planned Collection"} stroke="#22c55e" strokeWidth={2} />
                <Bar dataKey="actualPayment" name={isAmharic ? "ትክክለኛ ክፍያ" : "Actual Payment"} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="plannedPayment" name={isAmharic ? "የታቀደ ክፍያ" : "Planned Payment"} stroke="#ef4444" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
