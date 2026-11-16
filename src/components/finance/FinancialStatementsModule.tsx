import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Landmark,
  Layers,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Unlock,
  XCircle,
} from "lucide-react";
import {
  Bar,
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
  ChartAccountRecord,
  ChartAccountSubType,
  ChartAccountType,
  FinancialPeriodCloseRecord,
  JournalEntryLine,
  JournalEntryRecord,
  Part7StatementTypeId,
} from "../../types";
import {
  approveAndPostJournalEntry,
  createDoubleEntryJournalVoucher,
  exportPart7StatementToCsv,
  exportPart7StatementToExcel,
  Part7FinancialStatementsState,
  Part7ReportingFrequency,
  Part7StatementsFilterState,
  prepareAndCloseFinancialPeriod,
  rejectJournalEntry,
  reopenClosedFinancialPeriod,
  saveChartAccountMutation,
  validateJournalEntryLines,
} from "../../services/financialStatementsService";
import { formatCurrency } from "../../utils/formatters";

export type Part7SubTab = "dashboard" | "statements" | "journals" | "closing";

interface FinancialStatementsModuleProps {
  isAmharic: boolean;
  statementsState: Part7FinancialStatementsState;
  filterState: Part7StatementsFilterState;
  onFilterChange: (next: Part7StatementsFilterState) => void;
  onResetFilters: () => void;
  rawJournalEntries: JournalEntryRecord[];
  rawPeriods: FinancialPeriodCloseRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

const STATEMENT_OPTIONS: {
  id: Part7StatementTypeId;
  code: string;
  labelEn: string;
  labelAm: string;
}[] = [
  { id: "income-statement", code: "01", labelEn: "Income Statement (P&L)", labelAm: "የትርፍና ኪሳራ መግለጫ" },
  { id: "balance-sheet", code: "02", labelEn: "Balance Sheet", labelAm: "የሂሳብ ሚዛን መግለጫ" },
  { id: "cash-flow-statement", code: "03", labelEn: "Cash Flow Statement", labelAm: "የገንዘብ ፍሰት መግለጫ" },
  { id: "changes-in-equity", code: "04", labelEn: "Changes in Equity", labelAm: "የካፒታል ለውጥ መግለጫ" },
  { id: "trial-balance", code: "05", labelEn: "Trial Balance", labelAm: "የሙከራ ሚዛን" },
  { id: "general-ledger", code: "06", labelEn: "General Ledger", labelAm: "ጠቅላላ የሂሳብ መዝገብ" },
  { id: "accounts-receivable-report", code: "07", labelEn: "Accounts Receivable Report", labelAm: "የተሰብሳቢ ሂሳብ ሪፖርት" },
  { id: "accounts-payable-report", code: "08", labelEn: "Accounts Payable Report", labelAm: "የተከፋይ ሂሳብ ሪፖርት" },
];

const ACCOUNT_TYPES: ChartAccountType[] = [
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Cost of Construction",
  "Operating Expense",
  "Administrative Expense",
];

const SUB_TYPES_BY_TYPE: Record<ChartAccountType, ChartAccountSubType[]> = {
  Asset: ["Current Asset", "Non-Current Asset"],
  Liability: ["Current Liability", "Non-Current Liability"],
  Equity: ["Owner Capital", "Retained Earnings", "Dividends / Drawings"],
  Revenue: ["Project Revenue", "Other Income"],
  "Cost of Construction": ["Direct Construction Cost"],
  "Operating Expense": ["Operating Expense"],
  "Administrative Expense": ["Administrative Expense"],
};

const formatCompact = (val: number): string => {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString();
};

const CompanyCrestLogo: React.FC = () => (
  <svg
    width="44"
    height="44"
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Company Crest"
    className="shrink-0"
  >
    <rect width="44" height="44" rx="10" fill="#0F172A" />
    <path d="M10 34V16L18 11V34H10Z" fill="#DC2626" />
    <path d="M18 34V8L28 13V34H18Z" fill="#F8FAFC" />
    <path d="M28 34V18L34 21V34H28Z" fill="#94A3B8" />
    <rect x="8" y="34" width="28" height="2.5" rx="1.25" fill="#DC2626" />
  </svg>
);

export const PrintableFinancialStatementSheet: React.FC<{
  state: Part7FinancialStatementsState;
  activeStatement: Part7StatementTypeId;
  isAmharic: boolean;
  actorName: string;
  glAccountFilter?: string;
  glSourceFilter?: string;
  glSearch?: string;
}> = ({
  state,
  activeStatement,
  isAmharic,
  actorName,
  glAccountFilter = "ALL",
  glSourceFilter = "ALL",
  glSearch = "",
}) => {
  const cur = state.currency || "ETB";
  const {
    incomeStatement: is,
    balanceSheet: bs,
    cashFlowStatement: cf,
    changesInEquity: eq,
    trialBalance: tb,
    generalLedger,
    arReport,
    apReport,
  } = state;

  const activeMeta =
    STATEMENT_OPTIONS.find((s) => s.id === activeStatement) || STATEMENT_OPTIONS[0];

  const filteredGl = useMemo(() => {
    const q = glSearch.trim().toLowerCase();
    return generalLedger.filter((row) => {
      if (glAccountFilter !== "ALL" && row.accountCode !== glAccountFilter) return false;
      if (glSourceFilter !== "ALL" && row.sourceModule !== glSourceFilter) return false;
      if (q) {
        const hay = `${row.journalNo} ${row.accountCode} ${row.accountName} ${row.project} ${row.referenceNo} ${row.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [generalLedger, glAccountFilter, glSourceFilter, glSearch]);

  return (
    <div
      className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-300 space-y-6 print:border-0 print:rounded-none print:p-0"
      id={`printable-statement-${activeStatement}`}
    >
      {/* Formal Corporate Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
        <div className="flex items-start gap-3.5">
          <CompanyCrestLogo />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-red-700">
              {state.companyName}
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-950">
              {isAmharic ? activeMeta.labelAm : activeMeta.labelEn.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Reporting Period: {state.resolvedRange.startDate} to {state.resolvedRange.endDate} ({state.resolvedRange.label})
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-700 sm:text-right font-mono space-y-0.5">
          <div>
            <span className="text-slate-500">Preparation Date:</span>{" "}
            <strong className="text-slate-950">{state.referenceToday}</strong>
          </div>
          <div>
            <span className="text-slate-500">Reporting Currency:</span>{" "}
            <strong className="text-slate-950">{cur}</strong>
          </div>
          <div>
            <span className="text-slate-500">Period Status:</span>{" "}
            <strong
              className={
                state.isCurrentPeriodClosed ? "text-emerald-700" : "text-amber-700"
              }
            >
              {state.activePeriodRecord?.status || "Open (Live Audited)"}
            </strong>
          </div>
        </div>
      </div>

      {/* 1. INCOME STATEMENT (PROFIT & LOSS) */}
      {activeStatement === "income-statement" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 uppercase font-bold">
                <th className="py-2.5 px-3 text-left">Account</th>
                <th className="py-2.5 px-3 text-left">Statement Line Item</th>
                <th className="py-2.5 px-3 text-right">Amount ({cur})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="bg-slate-50 font-extrabold text-slate-800">
                <td className="py-2 px-3" colSpan={3}>
                  REVENUE & CONTRACT INCOME
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">4010</td>
                <td className="py-2 px-3 font-semibold">Total Project Revenue (Certified & Client Invoices)</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.projectRevenue, cur)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">4110</td>
                <td className="py-2 px-3 font-semibold">Other Operating & Interest Income</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.otherIncome, cur)}</td>
              </tr>
              <tr className="bg-slate-100 font-black text-slate-950">
                <td className="py-2.5 px-3" />
                <td className="py-2.5 px-3">TOTAL REVENUE</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(is.totalRevenue, cur)}</td>
              </tr>

              <tr className="bg-slate-50 font-extrabold text-slate-800">
                <td className="py-2 px-3" colSpan={3}>
                  DIRECT CONSTRUCTION COSTS
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">5010</td>
                <td className="py-2 px-3">Direct Materials & Procurement Cost</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.directMaterialsCost, cur)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">5020</td>
                <td className="py-2 px-3">Direct Site Labor & Payroll Cost</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.directLaborCost, cur)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">5030</td>
                <td className="py-2 px-3">Direct Subcontractor & Consultant Cost</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.directSubcontractorCost, cur)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-slate-500">5040</td>
                <td className="py-2 px-3">Direct Equipment, Formwork & Fuel Cost</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.directEquipmentCost, cur)}</td>
              </tr>
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td className="py-2 px-3" />
                <td className="py-2 px-3">TOTAL DIRECT CONSTRUCTION COSTS</td>
                <td className="py-2 px-3 text-right font-mono tabular-nums">({formatCurrency(is.directConstructionCosts, cur)})</td>
              </tr>

              <tr className="bg-emerald-50 font-black text-emerald-950 border-y border-emerald-300">
                <td className="py-2.5 px-3" />
                <td className="py-2.5 px-3">GROSS PROFIT (Project Revenue − Direct Costs)</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(is.grossProfit, cur)}</td>
              </tr>

              <tr className="bg-slate-50 font-extrabold text-slate-800">
                <td className="py-2 px-3" colSpan={3}>
                  OPERATING & ADMINISTRATIVE EXPENSES
                </td>
              </tr>
              {is.operatingExpenseBreakdown.length > 0 ? (
                is.operatingExpenseBreakdown.map((item) => (
                  <tr key={item.code}>
                    <td className="py-2 px-3 font-mono text-slate-500">{item.code}</td>
                    <td className="py-2 px-3">{item.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(item.amount, cur)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 px-3 font-mono text-slate-500">6010</td>
                  <td className="py-2 px-3">Operating Expenses & Site Overhead</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.operatingExpenses, cur)}</td>
                </tr>
              )}
              {is.adminExpenseBreakdown.length > 0 ? (
                is.adminExpenseBreakdown.map((item) => (
                  <tr key={item.code}>
                    <td className="py-2 px-3 font-mono text-slate-500">{item.code}</td>
                    <td className="py-2 px-3">{item.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(item.amount, cur)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-2 px-3 font-mono text-slate-500">6110</td>
                  <td className="py-2 px-3">Administrative & General Expenses</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(is.administrativeExpenses, cur)}</td>
                </tr>
              )}

              <tr className="bg-slate-100 font-black text-slate-900">
                <td className="py-2.5 px-3" />
                <td className="py-2.5 px-3">OPERATING PROFIT (EBIT)</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(is.operatingProfit, cur)}</td>
              </tr>

              <tr
                className={`font-black text-sm border-y-2 border-slate-900 ${
                  is.netProfitLoss >= 0 ? "bg-emerald-100/70 text-emerald-950" : "bg-red-100/70 text-red-950"
                }`}
              >
                <td className="py-3 px-3" />
                <td className="py-3 px-3">NET PROFIT / (LOSS) FOR THE PERIOD</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">
                  {formatCurrency(is.netProfitLoss, cur)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 2. BALANCE SHEET */}
      {activeStatement === "balance-sheet" && (
        <div className="space-y-4">
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
              bs.isBalanced
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <span>
              Accounting Equation Verification: Total Assets ({formatCurrency(bs.totalAssets, cur)}) = Total Liabilities + Total Equity ({formatCurrency(bs.totalLiabilitiesAndEquity, cur)})
            </span>
            <span className="font-mono">
              {bs.isBalanced ? "BALANCED (Diff: 0.00)" : `OUT OF BALANCE (Diff: ${formatCurrency(bs.balanceDifference, cur)})`}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ASSETS */}
            <table className="w-full text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-bold">
                  <th className="py-2.5 px-3 text-left" colSpan={2}>
                    ASSETS (As of {bs.asOfDate})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td className="py-2 px-3" colSpan={2}>Current Assets</td>
                </tr>
                {bs.currentAssets.map((a) => (
                  <tr key={a.code}>
                    <td className="py-2 px-3"><span className="font-mono text-slate-500 mr-2">{a.code}</span>{a.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(a.amount, cur)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3">Total Current Assets</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalCurrentAssets, cur)}</td>
                </tr>

                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td className="py-2 px-3" colSpan={2}>Non-Current Assets</td>
                </tr>
                {bs.nonCurrentAssets.map((a) => (
                  <tr key={a.code}>
                    <td className="py-2 px-3"><span className="font-mono text-slate-500 mr-2">{a.code}</span>{a.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(a.amount, cur)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3">Total Non-Current Assets</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalNonCurrentAssets, cur)}</td>
                </tr>

                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="py-3 px-3">TOTAL ASSETS</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalAssets, cur)}</td>
                </tr>
              </tbody>
            </table>

            {/* LIABILITIES & EQUITY */}
            <table className="w-full text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-bold">
                  <th className="py-2.5 px-3 text-left" colSpan={2}>
                    LIABILITIES & OWNER&apos;S EQUITY
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td className="py-2 px-3" colSpan={2}>Current Liabilities</td>
                </tr>
                {bs.currentLiabilities.map((l) => (
                  <tr key={l.code}>
                    <td className="py-2 px-3"><span className="font-mono text-slate-500 mr-2">{l.code}</span>{l.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(l.amount, cur)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3">Total Current Liabilities</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalCurrentLiabilities, cur)}</td>
                </tr>

                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td className="py-2 px-3" colSpan={2}>Non-Current Liabilities</td>
                </tr>
                {bs.nonCurrentLiabilities.map((l) => (
                  <tr key={l.code}>
                    <td className="py-2 px-3"><span className="font-mono text-slate-500 mr-2">{l.code}</span>{l.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(l.amount, cur)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3">Total Liabilities</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalLiabilities, cur)}</td>
                </tr>

                <tr className="bg-slate-100 font-bold text-slate-700">
                  <td className="py-2 px-3" colSpan={2}>Owner&apos;s Equity & Retained Earnings</td>
                </tr>
                {bs.equityBreakdown.map((e) => (
                  <tr key={e.code}>
                    <td className="py-2 px-3"><span className="font-mono text-slate-500 mr-2">{e.code}</span>{e.label}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(e.amount, cur)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-2 px-3">Total Equity</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalEquity, cur)}</td>
                </tr>

                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="py-3 px-3">TOTAL LIABILITIES + EQUITY</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(bs.totalLiabilitiesAndEquity, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CASH FLOW STATEMENT */}
      {activeStatement === "cash-flow-statement" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">Opening Cash Balance</div>
              <div className="text-sm font-black font-mono tabular-nums mt-0.5">{formatCurrency(cf.openingCashBalance, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Total Cash Inflows</div>
              <div className="text-sm font-black font-mono tabular-nums text-emerald-800 mt-0.5">{formatCurrency(cf.totalCashInflows, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="text-[10px] font-bold uppercase text-red-700">Total Cash Outflows</div>
              <div className="text-sm font-black font-mono tabular-nums text-red-800 mt-0.5">{formatCurrency(cf.totalCashOutflows, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 text-white">
              <div className="text-[10px] font-bold uppercase text-slate-300">Closing Cash Balance</div>
              <div className="text-sm font-black font-mono tabular-nums mt-0.5">{formatCurrency(cf.closingCashBalance, cur)}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold">
                  <th className="py-2.5 px-3 text-left">Cash Flow Activity / Classification</th>
                  <th className="py-2.5 px-3 text-right">Inflows</th>
                  <th className="py-2.5 px-3 text-right">Outflows</th>
                  <th className="py-2.5 px-3 text-right">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50 font-extrabold">
                  <td className="py-2 px-3" colSpan={4}>1. OPERATING ACTIVITIES</td>
                </tr>
                {cf.operatingLines.length === 0 ? (
                  <tr>
                    <td className="py-2 px-3 text-slate-500 italic" colSpan={4}>No verified operating cash movements in selected period (unpaid invoices excluded).</td>
                  </tr>
                ) : (
                  cf.operatingLines.map((ln) => (
                    <tr key={ln.label}>
                      <td className="py-2 px-3">{ln.label}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700">{ln.inflow > 0 ? formatCurrency(ln.inflow, cur) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700">{ln.outflow > 0 ? formatCurrency(ln.outflow, cur) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(ln.net, cur)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-100 font-bold">
                  <td className="py-2 px-3" colSpan={3}>Net Cash Flow from Operating Activities</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.netOperatingCashFlow, cur)}</td>
                </tr>

                <tr className="bg-slate-50 font-extrabold">
                  <td className="py-2 px-3" colSpan={4}>2. INVESTING ACTIVITIES</td>
                </tr>
                {cf.investingLines.length === 0 ? (
                  <tr>
                    <td className="py-2 px-3 text-slate-500 italic" colSpan={4}>No equipment or capital investing cash movements recorded.</td>
                  </tr>
                ) : (
                  cf.investingLines.map((ln) => (
                    <tr key={ln.label}>
                      <td className="py-2 px-3">{ln.label}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700">{ln.inflow > 0 ? formatCurrency(ln.inflow, cur) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700">{ln.outflow > 0 ? formatCurrency(ln.outflow, cur) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(ln.net, cur)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-100 font-bold">
                  <td className="py-2 px-3" colSpan={3}>Net Cash Flow from Investing Activities</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.netInvestingCashFlow, cur)}</td>
                </tr>

                <tr className="bg-slate-50 font-extrabold">
                  <td className="py-2 px-3" colSpan={4}>3. FINANCING ACTIVITIES</td>
                </tr>
                {cf.financingLines.length === 0 ? (
                  <tr>
                    <td className="py-2 px-3 text-slate-500 italic" colSpan={4}>No loan, capital injection, or dividend cash movements recorded.</td>
                  </tr>
                ) : (
                  cf.financingLines.map((ln) => (
                    <tr key={ln.label}>
                      <td className="py-2 px-3">{ln.label}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700">{ln.inflow > 0 ? formatCurrency(ln.inflow, cur) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700">{ln.outflow > 0 ? formatCurrency(ln.outflow, cur) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(ln.net, cur)}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-slate-100 font-bold">
                  <td className="py-2 px-3" colSpan={3}>Net Cash Flow from Financing Activities</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.netFinancingCashFlow, cur)}</td>
                </tr>

                <tr className="bg-slate-200 font-black">
                  <td className="py-2.5 px-3">NET INCREASE / (DECREASE) IN CASH</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.totalCashInflows, cur)}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.totalCashOutflows, cur)}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.netCashFlow, cur)}</td>
                </tr>
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="py-3 px-3" colSpan={3}>CLOSING CASH & BANK BALANCE</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(cf.closingCashBalance, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. STATEMENT OF CHANGES IN EQUITY */}
      {activeStatement === "changes-in-equity" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-900 text-white uppercase font-bold">
                <th className="py-2.5 px-3 text-left">Equity Movement Component</th>
                <th className="py-2.5 px-3 text-right">Owner&apos;s Capital</th>
                <th className="py-2.5 px-3 text-right">Retained Earnings</th>
                <th className="py-2.5 px-3 text-right">Total Equity ({cur})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="font-semibold bg-slate-50">
                <td className="py-2.5 px-3">Opening Balance (As of {eq.periodStart})</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.openingOwnerCapital, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.openingRetainedEarnings, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.openingTotalEquity, cur)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Additional Owner Capital Contributions</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.capitalContributions, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(0, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.capitalContributions, cur)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Net Profit / (Loss) for the Reporting Period</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(0, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.netProfitForPeriod, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.netProfitForPeriod, cur)}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Less: Owner Drawings / Dividends Declared</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(0, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">({formatCurrency(eq.dividendsOrDrawings, cur)})</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">({formatCurrency(eq.dividendsOrDrawings, cur)})</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3">Other Equity Adjustments</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(0, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.otherEquityAdjustments, cur)}</td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.otherEquityAdjustments, cur)}</td>
              </tr>
              <tr className="bg-slate-900 text-white font-black text-sm">
                <td className="py-3 px-3">Closing Balance (As of {eq.periodEnd})</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.closingOwnerCapital, cur)}</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.closingRetainedEarnings, cur)}</td>
                <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(eq.closingTotalEquity, cur)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 5. TRIAL BALANCE */}
      {activeStatement === "trial-balance" && (
        <div className="space-y-3 overflow-x-auto">
          <div
            className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
              tb.isBalanced
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <span>Double-Entry Trial Balance Check (Ending Debit = Ending Credit)</span>
            <span className="font-mono">
              {tb.isBalanced ? "BALANCED (0.00 Difference)" : `DIFFERENCE: ${formatCurrency(tb.difference, cur)}`}
            </span>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold">
                <th className="py-2.5 px-2.5 text-left">Code</th>
                <th className="py-2.5 px-2.5 text-left">Account Name</th>
                <th className="py-2.5 px-2.5 text-left">Type</th>
                <th className="py-2.5 px-2.5 text-right">Opening Dr</th>
                <th className="py-2.5 px-2.5 text-right">Opening Cr</th>
                <th className="py-2.5 px-2.5 text-right">Period Dr</th>
                <th className="py-2.5 px-2.5 text-right">Period Cr</th>
                <th className="py-2.5 px-2.5 text-right">Ending Dr</th>
                <th className="py-2.5 px-2.5 text-right">Ending Cr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tb.rows.map((r) => (
                <tr key={r.accountCode} className="hover:bg-slate-50">
                  <td className="py-2 px-2.5 font-mono font-bold">{r.accountCode}</td>
                  <td className="py-2 px-2.5 font-semibold">{r.accountName}</td>
                  <td className="py-2 px-2.5 text-slate-500">{r.accountType}</td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums">{r.openingDebit > 0 ? formatCurrency(r.openingDebit, "") : "—"}</td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums">{r.openingCredit > 0 ? formatCurrency(r.openingCredit, "") : "—"}</td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums">{r.periodDebit > 0 ? formatCurrency(r.periodDebit, "") : "—"}</td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums">{r.periodCredit > 0 ? formatCurrency(r.periodCredit, "") : "—"}</td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold tabular-nums">{r.endingDebit > 0 ? formatCurrency(r.endingDebit, "") : "—"}</td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold tabular-nums">{r.endingCredit > 0 ? formatCurrency(r.endingCredit, "") : "—"}</td>
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-black">
                <td className="py-2.5 px-2.5" colSpan={3}>TRIAL BALANCE TOTALS ({cur})</td>
                <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(tb.totalOpeningDebit, "")}</td>
                <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(tb.totalOpeningCredit, "")}</td>
                <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(tb.totalPeriodDebit, "")}</td>
                <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(tb.totalPeriodCredit, "")}</td>
                <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(tb.totalEndingDebit, "")}</td>
                <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">{formatCurrency(tb.totalEndingCredit, "")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 6. GENERAL LEDGER */}
      {activeStatement === "general-ledger" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold">
                <th className="py-2.5 px-2.5 text-left">Date</th>
                <th className="py-2.5 px-2.5 text-left">Journal #</th>
                <th className="py-2.5 px-2.5 text-left">Account</th>
                <th className="py-2.5 px-2.5 text-left">Source / Project</th>
                <th className="py-2.5 px-2.5 text-left">Description</th>
                <th className="py-2.5 px-2.5 text-right">Debit</th>
                <th className="py-2.5 px-2.5 text-right">Credit</th>
                <th className="py-2.5 px-2.5 text-right">Running Bal.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredGl.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={8}>
                    No posted General Ledger lines match the current reporting period and filters.
                  </td>
                </tr>
              ) : (
                filteredGl.slice(0, 250).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">{row.entryDate}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-600 whitespace-nowrap">{row.journalNo}</td>
                    <td className="py-2 px-2.5">
                      <span className="font-mono font-bold mr-1">{row.accountCode}</span>
                      <span>{row.accountName}</span>
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-slate-800">{row.sourceModule}</div>
                      <div className="text-[10px] text-slate-500">{row.project}</div>
                    </td>
                    <td className="py-2 px-2.5 max-w-xs truncate" title={row.description}>{row.description}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{row.debit > 0 ? formatCurrency(row.debit, "") : "—"}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{row.credit > 0 ? formatCurrency(row.credit, "") : "—"}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold tabular-nums">{formatCurrency(row.runningBalance, "")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredGl.length > 250 && (
            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              Showing first 250 of {filteredGl.length} posted ledger lines. Export Excel/CSV for the complete General Ledger extract.
            </p>
          )}
        </div>
      )}

      {/* 7. ACCOUNTS RECEIVABLE REPORT */}
      {activeStatement === "accounts-receivable-report" && (
        <div className="space-y-4 overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">Total Billed</div>
              <div className="text-sm font-black font-mono tabular-nums">{formatCurrency(arReport.totalBilled, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Collected Cash</div>
              <div className="text-sm font-black font-mono tabular-nums text-emerald-800">{formatCurrency(arReport.totalCollected, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-700">Outstanding AR</div>
              <div className="text-sm font-black font-mono tabular-nums text-amber-800">{formatCurrency(arReport.totalOutstanding, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="text-[10px] font-bold uppercase text-red-700">Overdue AR</div>
              <div className="text-sm font-black font-mono tabular-nums text-red-800">{formatCurrency(arReport.totalOverdue, cur)}</div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold">
                <th className="py-2 px-2.5 text-left">Invoice #</th>
                <th className="py-2 px-2.5 text-left">Client</th>
                <th className="py-2 px-2.5 text-left">Project</th>
                <th className="py-2 px-2.5 text-left">Due Date</th>
                <th className="py-2 px-2.5 text-right">Billed</th>
                <th className="py-2 px-2.5 text-right">Collected</th>
                <th className="py-2 px-2.5 text-right">Outstanding</th>
                <th className="py-2 px-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {arReport.rows.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={8}>
                    No verified receivables found in the selected scope.
                  </td>
                </tr>
              ) : (
                arReport.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-2.5 font-mono font-bold">{r.invoiceNumber}</td>
                    <td className="py-2 px-2.5 font-semibold">{r.client}</td>
                    <td className="py-2 px-2.5">{r.project}</td>
                    <td className="py-2 px-2.5 font-mono">{r.dueDate}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{formatCurrency(r.totalAmount, cur)}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-700">{formatCurrency(r.collectedAmount, cur)}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold tabular-nums">{formatCurrency(r.outstandingAmount, cur)}</td>
                    <td className="py-2 px-2.5 font-bold">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 8. ACCOUNTS PAYABLE REPORT */}
      {activeStatement === "accounts-payable-report" && (
        <div className="space-y-4 overflow-x-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500">Total Billed</div>
              <div className="text-sm font-black font-mono tabular-nums">{formatCurrency(apReport.totalBilled, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700">Paid Out</div>
              <div className="text-sm font-black font-mono tabular-nums text-emerald-800">{formatCurrency(apReport.totalPaid, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-700">Outstanding AP</div>
              <div className="text-sm font-black font-mono tabular-nums text-amber-800">{formatCurrency(apReport.totalOutstanding, cur)}</div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-200">
              <div className="text-[10px] font-bold uppercase text-red-700">Overdue AP</div>
              <div className="text-sm font-black font-mono tabular-nums text-red-800">{formatCurrency(apReport.totalOverdue, cur)}</div>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase font-bold">
                <th className="py-2 px-2.5 text-left">Bill / Voucher #</th>
                <th className="py-2 px-2.5 text-left">Supplier / Creditor</th>
                <th className="py-2 px-2.5 text-left">Project</th>
                <th className="py-2 px-2.5 text-left">Due Date</th>
                <th className="py-2 px-2.5 text-right">Billed</th>
                <th className="py-2 px-2.5 text-right">Paid</th>
                <th className="py-2 px-2.5 text-right">Outstanding</th>
                <th className="py-2 px-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {apReport.rows.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={8}>
                    No verified payables found in the selected scope.
                  </td>
                </tr>
              ) : (
                apReport.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-2.5 font-mono font-bold">{r.billNumber}</td>
                    <td className="py-2 px-2.5 font-semibold">{r.supplier}</td>
                    <td className="py-2 px-2.5">{r.project}</td>
                    <td className="py-2 px-2.5 font-mono">{r.dueDate}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums">{formatCurrency(r.totalAmount, cur)}</td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums text-emerald-700">{formatCurrency(r.paidAmount, cur)}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold tabular-nums">{formatCurrency(r.outstandingAmount, cur)}</td>
                    <td className="py-2 px-2.5 font-bold">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Official Approval Signature Block */}
      <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Prepared By (Finance Officer / Accountant)
          </div>
          <div className="font-bold text-slate-900">
            {state.activePeriodRecord?.preparedBy || actorName}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
            Signature & Stamp · Date: {state.activePeriodRecord?.preparedAt?.slice(0, 10) || state.referenceToday}
          </div>
        </div>
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Reviewed By (Finance Manager)
          </div>
          <div className="font-bold text-slate-900">
            {state.activePeriodRecord?.reviewedBy || "Finance Manager Review"}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
            Signature & Stamp · Date: {state.activePeriodRecord?.reviewedAt?.slice(0, 10) || "Pending Review"}
          </div>
        </div>
        <div className="space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Approved By (Managing Director / Head Office)
          </div>
          <div className="font-bold text-slate-900">
            {state.activePeriodRecord?.approvedBy || "Director Approval"}
          </div>
          <div className="border-t border-slate-400 pt-1 text-[10px] text-slate-500 font-mono">
            Signature & Stamp · Date: {state.activePeriodRecord?.approvedAt?.slice(0, 10) || "Pending Approval"}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FinancialStatementsModule: React.FC<FinancialStatementsModuleProps> = ({
  isAmharic,
  statementsState,
  filterState,
  onFilterChange,
  onResetFilters,
  rawJournalEntries,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const cur = statementsState.currency || "ETB";
  const { dashboardKpis: kpis, ratios, monthlyTrends, trialBalance, balanceSheet } = statementsState;

  const [subTab, setSubTab] = useState<Part7SubTab>("dashboard");
  const [activeStatement, setActiveStatement] = useState<Part7StatementTypeId>("income-statement");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // General Ledger sub-filters
  const [glAccountFilter, setGlAccountFilter] = useState<string>("ALL");
  const [glSourceFilter, setGlSourceFilter] = useState<string>("ALL");
  const [glSearch, setGlSearch] = useState<string>("");

  // New Double-Entry Journal Modal
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [jeDate, setJeDate] = useState(statementsState.referenceToday);
  const [jeType, setJeType] = useState<"Standard" | "Opening Balance" | "Adjusting">("Standard");
  const [jeProject, setJeProject] = useState("Corporate Treasury");
  const [jeDept, setJeDept] = useState("Finance");
  const [jeRef, setJeRef] = useState("");
  const [jeDesc, setJeDesc] = useState("");
  const [jeLines, setJeLines] = useState<
    Array<{ accountCode: string; debit: string; credit: string; memo: string }>
  >([
    { accountCode: "1020", debit: "", credit: "", memo: "" },
    { accountCode: "3010", debit: "", credit: "", memo: "" },
  ]);

  // Add Chart Account Modal
  const [showCoaModal, setShowCoaModal] = useState(false);
  const [coaCode, setCoaCode] = useState("");
  const [coaName, setCoaName] = useState("");
  const [coaType, setCoaType] = useState<ChartAccountType>("Asset");
  const [coaSubType, setCoaSubType] = useState<ChartAccountSubType>("Current Asset");
  const [coaNormalBal, setCoaNormalBal] = useState<"Debit" | "Credit">("Debit");
  const [coaCfSection, setCoaCfSection] = useState<"Operating" | "Investing" | "Financing" | "Non-Cash">("Operating");

  // Period Closing & Reopen states
  const [closingNotes, setClosingNotes] = useState("");
  const [reopeningPeriod, setReopeningPeriod] = useState<FinancialPeriodCloseRecord | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [rejectingEntry, setRejectingEntry] = useState<JournalEntryRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const notify = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  // Live Double-Entry Validation for Journal Draft Form
  const journalDraftLinesBuilt: JournalEntryLine[] = useMemo(() => {
    return jeLines.map((ln, idx) => {
      const acc = statementsState.chartOfAccounts.find((a) => a.accountCode === ln.accountCode);
      return {
        lineNo: idx + 1,
        accountCode: ln.accountCode,
        accountName: acc?.accountName || "",
        accountType: acc?.accountType || "Operating Expense",
        subType: acc?.subType,
        debit: Number(ln.debit) || 0,
        credit: Number(ln.credit) || 0,
        memo: ln.memo,
        project: jeProject,
        department: jeDept,
      };
    });
  }, [jeLines, statementsState.chartOfAccounts, jeProject, jeDept]);

  const journalValidation = useMemo(
    () => validateJournalEntryLines(journalDraftLinesBuilt),
    [journalDraftLinesBuilt]
  );

  const handleSaveJournalVoucher = async (postNow: boolean) => {
    setBusy(true);
    try {
      const created = await createDoubleEntryJournalVoucher({
        entryDate: jeDate,
        project: jeProject,
        department: jeDept,
        referenceNo: jeRef,
        description: jeDesc,
        entryType: jeType,
        lines: journalDraftLinesBuilt,
        existingPeriods: statementsState.financialPeriods,
        submitImmediately: !postNow,
        postImmediatelyIfAuthorized: postNow,
        actorName,
        actorRole,
        actorUid,
      });
      setShowJournalModal(false);
      setJeRef("");
      setJeDesc("");
      setJeLines([
        { accountCode: "1020", debit: "", credit: "", memo: "" },
        { accountCode: "3010", debit: "", credit: "", memo: "" },
      ]);
      notify(
        "success",
        `Journal ${created.journalNo} (${created.status}) saved successfully.`
      );
      onLogAction?.("Create Double-Entry Journal", `${created.journalNo} (${created.status})`);
    } catch (err: any) {
      notify("error", err?.message || "Failed to create journal voucher.");
    } finally {
      setBusy(false);
    }
  };

  const handleApprovePostJournal = async (entry: JournalEntryRecord) => {
    setBusy(true);
    try {
      await approveAndPostJournalEntry({
        entry,
        existingPeriods: statementsState.financialPeriods,
        actorName,
        actorRole,
        actorUid,
      });
      notify("success", `Journal ${entry.journalNo} approved & posted to General Ledger.`);
      onLogAction?.("Post Journal Voucher", entry.journalNo);
    } catch (err: any) {
      notify("error", err?.message || "Failed to post journal entry.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRejectJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingEntry) return;
    setBusy(true);
    try {
      await rejectJournalEntry({
        entry: rejectingEntry,
        reason: rejectReason,
        actorName,
        actorRole,
        actorUid,
      });
      notify("success", `Journal ${rejectingEntry.journalNo} rejected.`);
      setRejectingEntry(null);
      setRejectReason("");
    } catch (err: any) {
      notify("error", err?.message || "Failed to reject journal entry.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveChartAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const saved = await saveChartAccountMutation({
        accountCode: coaCode,
        accountName: coaName,
        accountType: coaType,
        subType: coaSubType,
        normalBalance: coaNormalBal,
        cashFlowSection: coaCfSection,
        currency: cur,
        actorName,
        actorRole,
        actorUid,
      });
      setShowCoaModal(false);
      setCoaCode("");
      setCoaName("");
      notify("success", `Account ${saved.accountCode} - ${saved.accountName} added to Chart of Accounts.`);
      onLogAction?.("Add GL Account", `${saved.accountCode} ${saved.accountName}`);
    } catch (err: any) {
      notify("error", err?.message || "Failed to save Chart of Account.");
    } finally {
      setBusy(false);
    }
  };

  const handlePeriodAction = async (action: "SubmitForReview" | "CloseAndLock") => {
    setBusy(true);
    try {
      const periodType =
        filterState.reportingFrequency === "Daily"
          ? "Daily"
          : filterState.reportingFrequency === "Quarterly"
          ? "Quarterly"
          : filterState.reportingFrequency === "Annual"
          ? "Annual"
          : "Monthly";

      const result = await prepareAndCloseFinancialPeriod({
        state: statementsState,
        periodType,
        action,
        notes: closingNotes,
        actorName,
        actorRole,
        actorUid,
      });
      setClosingNotes("");
      notify(
        "success",
        action === "CloseAndLock"
          ? `Financial period ${result.period.periodLabel} closed & locked atomically.`
          : `Financial period ${result.period.periodLabel} submitted for management review.`
      );
      onLogAction?.(action, result.period.periodLabel);
    } catch (err: any) {
      notify("error", err?.message || "Period closing operation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReopenPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningPeriod) return;
    setBusy(true);
    try {
      const closingEntry = rawJournalEntries.find(
        (j) => j.id === reopeningPeriod.closingJournalEntryId
      );
      await reopenClosedFinancialPeriod({
        period: reopeningPeriod,
        closingEntry,
        reason: reopenReason,
        actorName,
        actorRole,
        actorUid,
      });
      notify("success", `Period ${reopeningPeriod.periodLabel} reopened and closing entry reversed.`);
      setReopeningPeriod(null);
      setReopenReason("");
    } catch (err: any) {
      notify("error", err?.message || "Failed to reopen period.");
    } finally {
      setBusy(false);
    }
  };

  const tooltipStyle = {
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderRadius: "10px",
    fontSize: "11px",
    color: "#e2e8f0",
  };

  return (
    <div className="space-y-5" id="part7-financial-statements-module">
      {/* MODULE HEADER */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 print:hidden">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-red-400">
            <Scale size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {isAmharic
                  ? "11. የፋይናንስ መግለጫዎች እና ትንተና (Part 7)"
                  : "11. Financial Statements, Double-Entry Ledger & Reporting"}
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  balanceSheet.isBalanced && trialBalance.isBalanced
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-red-950 text-red-300 border-red-800"
                }`}
              >
                {balanceSheet.isBalanced && trialBalance.isBalanced
                  ? "A = L + E · TB Balanced"
                  : "Balance Check Required"}
              </span>
              {statementsState.isCurrentPeriodClosed && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                  <Lock size={10} /> Period Closed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ከተረጋገጡ AR፣ AP፣ ጥሬ ገንዘብ፣ ባንክ፣ ደሞዝ፣ ግዢ እና ጆርናል ግብይቶች በራስ-ሰር የተዘጋጁ 8 መግለጫዎች"
                : "8 automated financial statements, 7 ratio analytics, double-entry General Ledger, period closing & PDF/Excel package."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              exportPart7StatementToExcel({
                state: statementsState,
                preparedBy: actorName,
              });
              onLogAction?.("Export Complete 8-Statement Excel", statementsState.resolvedRange.label);
              notify("success", "Complete 8-Statement + Ratios Excel package (.xlsx) downloaded.");
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet size={14} />
            <span>{isAmharic ? "8 መግለጫዎች Excel (.xlsx)" : "Export Full 8-Sheet Excel"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSubTab("statements");
              setTimeout(() => window.print(), 150);
              onLogAction?.("Print Financial Statements", activeStatement);
            }}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer size={14} />
            <span>{isAmharic ? "PDF / አትም" : "Print / Save PDF"}</span>
          </button>
        </div>
      </div>

      {/* TOAST FEEDBACK */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center gap-2 print:hidden ${
            toast.type === "success"
              ? "bg-emerald-950/70 border-emerald-800 text-emerald-200"
              : "bg-red-950/70 border-red-800 text-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* PART 7 FILTER BAR */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Filter size={14} className="text-red-400" />
            <span>Reporting Period & Scope Filters</span>
            <span className="font-mono text-[11px] text-slate-400">
              · {statementsState.resolvedRange.startDate} → {statementsState.resolvedRange.endDate}
            </span>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Reporting Frequency
            </label>
            <select
              value={filterState.reportingFrequency}
              onChange={(e) =>
                onFilterChange({
                  ...filterState,
                  reportingFrequency: e.target.value as Part7ReportingFrequency,
                  startDate: e.target.value === "Custom" ? filterState.startDate : "",
                  endDate: e.target.value === "Custom" ? filterState.endDate : "",
                })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-semibold"
            >
              {(["Daily", "Monthly", "Quarterly", "Annual", "Custom"] as Part7ReportingFrequency[]).map(
                (f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Financial Year
            </label>
            <select
              value={filterState.financialYear}
              onChange={(e) => onFilterChange({ ...filterState, financialYear: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-semibold"
            >
              <option value="ALL">All Years (Current)</option>
              {statementsState.filterOptions.financialYears.map((yr) => (
                <option key={yr} value={yr}>
                  FY {yr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Project Scope
            </label>
            <select
              value={filterState.project}
              onChange={(e) => onFilterChange({ ...filterState, project: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-semibold"
            >
              <option value="ALL">All Projects (Consolidated)</option>
              {statementsState.filterOptions.projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Department
            </label>
            <select
              value={filterState.department}
              onChange={(e) => onFilterChange({ ...filterState, department: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-semibold"
            >
              <option value="ALL">All Departments</option>
              {statementsState.filterOptions.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filterState.startDate || statementsState.resolvedRange.startDate}
              onChange={(e) =>
                onFilterChange({
                  ...filterState,
                  reportingFrequency: "Custom",
                  startDate: e.target.value,
                  endDate: filterState.endDate || statementsState.resolvedRange.endDate,
                })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filterState.endDate || statementsState.resolvedRange.endDate}
              onChange={(e) =>
                onFilterChange({
                  ...filterState,
                  reportingFrequency: "Custom",
                  startDate: filterState.startDate || statementsState.resolvedRange.startDate,
                  endDate: e.target.value,
                })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
          </div>
        </div>
      </div>

      {/* SUBTAB SWITCHER */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        {[
          { id: "dashboard", labelEn: "Financial Dashboard & Ratios", labelAm: "ዳሽቦርድ እና ትንተና", icon: BarChart3 },
          { id: "statements", labelEn: "8 Financial Statements", labelAm: "8 የፋይናንስ መግለጫዎች", icon: FileCheck2 },
          { id: "journals", labelEn: "Journal Vouchers & CoA", labelAm: "ጆርናል እና የሂሳብ መደብ", icon: BookOpen },
          { id: "closing", labelEn: "Period Closing & Approvals", labelAm: "የሂሳብ ወቅት መዝጊያ", icon: Lock },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as Part7SubTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition ${
                active
                  ? "bg-red-600 text-white border-red-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Icon size={14} />
              <span>{isAmharic ? t.labelAm : t.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* TAB 1: FINANCIAL DASHBOARD, PROFIT/LOSS TRENDS & 7 RATIOS */}
      {/* ================================================================ */}
      {subTab === "dashboard" && (
        <div className="space-y-5">
          {/* 8 KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", val: kpis.totalRevenue, tone: "text-emerald-400" },
              { label: "Total Expenses", val: kpis.totalExpenses, tone: "text-red-400" },
              { label: "Gross Profit", val: kpis.grossProfit, tone: kpis.grossProfit >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Net Profit / (Loss)", val: kpis.netProfit, tone: kpis.netProfit >= 0 ? "text-cyan-400" : "text-red-400" },
              { label: "Total Assets", val: kpis.totalAssets, tone: "text-white" },
              { label: "Total Liabilities", val: kpis.totalLiabilities, tone: "text-amber-400" },
              { label: "Total Equity", val: kpis.totalEquity, tone: "text-blue-400" },
              { label: "Cash Position", val: kpis.cashPosition, tone: "text-emerald-300" },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </div>
                <div className={`text-xl font-black font-mono tabular-nums ${card.tone}`}>
                  {formatCurrency(card.val, cur)}
                </div>
              </div>
            ))}
          </div>

          {/* MONTHLY PROFIT / LOSS TREND CHART */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  <span>Monthly Profit / Loss & Construction Cost Trends</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Accrual revenue, direct construction costs, operating/administrative overhead & net profit by month.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubTab("statements");
                  setActiveStatement("income-statement");
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Inspect Income Statement
              </button>
            </div>

            {monthlyTrends.length === 0 ? (
              <div className="h-56 flex items-center justify-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                No verified accounting transactions posted yet for monthly trend plotting.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatCompact} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: any) => formatCurrency(Number(val), cur)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="directCosts" name="Direct Costs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="operatingAndAdminExpenses" name="Op & Admin Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="netProfit"
                      name="Net Profit"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 7 FINANCIAL ANALYSIS RATIOS */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Financial Analysis & Solvency Ratios (7 Key Metrics)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time profitability, liquidity, leverage, and capital efficiency computed from Balance Sheet & Income Statement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {ratios.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-white">
                        {isAmharic ? r.nameAm : r.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{r.formula}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                        r.health === "Healthy"
                          ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                          : r.health === "Watch"
                          ? "bg-amber-950 text-amber-300 border-amber-800"
                          : r.health === "Critical"
                          ? "bg-red-950 text-red-300 border-red-800"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {r.health}
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono tabular-nums text-white">
                    {r.formattedValue}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isAmharic ? r.explanationAm : r.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AUDIT DUPLICATE/DATA QUALITY WARNINGS (IF ANY) */}
          {statementsState.auditWarnings.length > 0 && (
            <div className="bg-slate-950 border border-amber-800/70 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <AlertTriangle size={14} />
                <span>Ledger Integrity Guard Notes ({statementsState.auditWarnings.length})</span>
              </div>
              <ul className="text-[11px] text-slate-300 list-disc pl-5 space-y-0.5">
                {statementsState.auditWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: ALL 8 FINANCIAL STATEMENTS + EXPORT & PRINT HEADER */}
      {/* ================================================================ */}
      {subTab === "statements" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-4 print:hidden">
            <div className="flex flex-wrap gap-1.5">
              {STATEMENT_OPTIONS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveStatement(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap transition ${
                    activeStatement === st.id
                      ? "bg-red-600 text-white border-red-500"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-[10px] mr-1.5 opacity-75">{st.code}</span>
                  {isAmharic ? st.labelAm : st.labelEn}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={filterState.companyName ?? statementsState.companyName}
                onChange={(e) => onFilterChange({ ...filterState, companyName: e.target.value })}
                placeholder="Company Legal Name"
                aria-label="Company Legal Name for Reports"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-52"
              />
              <button
                type="button"
                onClick={() => {
                  exportPart7StatementToExcel({
                    state: statementsState,
                    statementId: activeStatement,
                    preparedBy: actorName,
                  });
                  onLogAction?.("Export Excel Statement", activeStatement);
                  notify("success", `Exported ${activeStatement} to Excel (.xlsx).`);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download size={13} />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  exportPart7StatementToCsv(activeStatement, statementsState);
                  onLogAction?.("Export CSV Statement", activeStatement);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet size={13} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* General Ledger Specific Filters */}
          {activeStatement === "general-ledger" && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs print:hidden">
              <div className="flex items-center gap-1.5 flex-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  value={glSearch}
                  onChange={(e) => setGlSearch(e.target.value)}
                  placeholder="Search journal #, reference, memo..."
                  className="bg-transparent text-white w-full focus:outline-none"
                />
              </div>
              <select
                value={glAccountFilter}
                onChange={(e) => setGlAccountFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="ALL">All GL Accounts</option>
                {statementsState.filterOptions.accounts.map((a) => (
                  <option key={a.accountCode} value={a.accountCode}>
                    {a.accountCode} — {a.accountName}
                  </option>
                ))}
              </select>
              <select
                value={glSourceFilter}
                onChange={(e) => setGlSourceFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="ALL">All Source Modules</option>
                {statementsState.filterOptions.sourceModules.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          <PrintableFinancialStatementSheet
            state={statementsState}
            activeStatement={activeStatement}
            isAmharic={isAmharic}
            actorName={actorName}
            glAccountFilter={glAccountFilter}
            glSourceFilter={glSourceFilter}
            glSearch={glSearch}
          />
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: DOUBLE-ENTRY JOURNAL VOUCHERS & CHART OF ACCOUNTS */}
      {/* ================================================================ */}
      {subTab === "journals" && (
        <div className="space-y-5">
          {/* Manual Journal Vouchers Header & Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Double-Entry Journal Vouchers (Manual, Adjusting & Opening Balances)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Every journal enforces Total Debit = Total Credit before saving or posting to the General Ledger.
                </p>
              </div>
              {statementsState.canPrepareJournals && (
                <button
                  type="button"
                  onClick={() => setShowJournalModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>New Journal Voucher</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2.5 px-3 text-left">Date</th>
                    <th className="py-2.5 px-3 text-left">Journal #</th>
                    <th className="py-2.5 px-3 text-left">Type</th>
                    <th className="py-2.5 px-3 text-left">Project / Dept</th>
                    <th className="py-2.5 px-3 text-left">Description</th>
                    <th className="py-2.5 px-3 text-right">Dr / Cr ({cur})</th>
                    <th className="py-2.5 px-3 text-left">Status</th>
                    <th className="py-2.5 px-3 text-right">Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-200">
                  {statementsState.manualJournalEntries.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-slate-400" colSpan={8}>
                        No manual journal vouchers created yet. Automated entries are continuously synced from AR, AP, Cash, Bank, Payroll & Procurement.
                      </td>
                    </tr>
                  ) : (
                    statementsState.manualJournalEntries.map((je) => (
                      <tr key={je.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">{je.entryDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">{je.journalNo}</td>
                        <td className="py-2.5 px-3">{je.entryType}</td>
                        <td className="py-2.5 px-3">
                          <div>{je.project}</div>
                          <div className="text-[10px] text-slate-400">{je.department}</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate" title={je.description}>
                          {je.description}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                          {formatCurrency(je.totalDebit, cur)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              je.status === "Posted"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                : je.status === "Submitted"
                                ? "bg-amber-950 text-amber-300 border-amber-800"
                                : je.status === "Rejected" || je.status === "Reversed"
                                ? "bg-red-950 text-red-300 border-red-800"
                                : "bg-slate-900 text-slate-300 border-slate-700"
                            }`}
                          >
                            {je.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {(je.status === "Draft" || je.status === "Submitted") &&
                            statementsState.canApproveJournalsAndClosePeriods && (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleApprovePostJournal(je)}
                                  className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                >
                                  Post
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setRejectingEntry(je)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-900 text-slate-200 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          {je.status === "Posted" && (
                            <span className="text-[10px] font-mono text-slate-400">
                              By {je.approvedBy || je.preparedBy}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart of Accounts Directory */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Chart of Accounts ({statementsState.chartOfAccounts.length} Accounts)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Standardized construction ERP general ledger accounts mapped across Assets, Liabilities, Equity, Revenue, Direct Costs & Overhead.
                </p>
              </div>
              {statementsState.canPrepareJournals && (
                <button
                  type="button"
                  onClick={() => setShowCoaModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Custom Account</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950">
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2 px-3 text-left">Code</th>
                    <th className="py-2 px-3 text-left">Account Name</th>
                    <th className="py-2 px-3 text-left">Type</th>
                    <th className="py-2 px-3 text-left">Sub-Type</th>
                    <th className="py-2 px-3 text-left">Normal</th>
                    <th className="py-2 px-3 text-left">Cash Flow Map</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {statementsState.chartOfAccounts.map((a) => (
                    <tr key={a.accountCode} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 font-mono font-bold text-white">{a.accountCode}</td>
                      <td className="py-2 px-3 font-semibold">{a.accountName}</td>
                      <td className="py-2 px-3">{a.accountType}</td>
                      <td className="py-2 px-3 text-slate-400">{a.subType}</td>
                      <td className="py-2 px-3 font-mono">{a.normalBalance}</td>
                      <td className="py-2 px-3 font-mono text-slate-400">{a.cashFlowSection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 4: FINANCIAL PERIOD CLOSING, AUDIT LOCK & REOPENING */}
      {/* ================================================================ */}
      {subTab === "closing" && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Period Closing & Statement Sign-Off ({statementsState.resolvedRange.startDate} → {statementsState.resolvedRange.endDate})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Closing locks the reporting period against retroactive journal entries and posts an atomic closing entry transferring Net Profit to Retained Earnings (3110).
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                  statementsState.isCurrentPeriodClosed
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-slate-900 text-slate-300 border-slate-700"
                }`}
              >
                Status: {statementsState.activePeriodRecord?.status || "Open"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Period Net Profit Snapshot</div>
                <div className="text-base font-mono font-black text-emerald-400 mt-1">
                  {formatCurrency(kpis.netProfit, cur)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Trial Balance Verification</div>
                <div className={`text-sm font-bold mt-1 ${trialBalance.isBalanced ? "text-emerald-400" : "text-red-400"}`}>
                  {trialBalance.isBalanced ? "Verified Balanced (Dr = Cr)" : `Out of balance (${trialBalance.difference})`}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Balance Sheet Equation</div>
                <div className={`text-sm font-bold mt-1 ${balanceSheet.isBalanced ? "text-emerald-400" : "text-red-400"}`}>
                  {balanceSheet.isBalanced ? "Verified (A = L + E)" : `Diff: ${balanceSheet.balanceDifference}`}
                </div>
              </div>
            </div>

            {!statementsState.isCurrentPeriodClosed && statementsState.canPrepareJournals && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Closing review notes / audit reference..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handlePeriodAction("SubmitForReview")}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Submit Period for Review
                  </button>
                  {statementsState.canApproveJournalsAndClosePeriods && (
                    <button
                      type="button"
                      disabled={busy || !trialBalance.isBalanced || !balanceSheet.isBalanced}
                      onClick={() => handlePeriodAction("CloseAndLock")}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Lock size={13} />
                      <span>Approve, Post Closing Entry & Lock Period</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Closed & Historical Periods Snapshot Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Financial Period Audit History
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2 px-3 text-left">Period Label</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 px-3 text-right">Net Profit</th>
                    <th className="py-2 px-3 text-right">Total Assets</th>
                    <th className="py-2 px-3 text-left">Approved By</th>
                    <th className="py-2 px-3 text-left">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-200">
                  {statementsState.financialPeriods.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-slate-400" colSpan={7}>
                        No period close records archived yet. Submit or close the current reporting period above.
                      </td>
                    </tr>
                  ) : (
                    statementsState.financialPeriods.map((fp) => (
                      <tr key={fp.id}>
                        <td className="py-2.5 px-3 font-semibold">{fp.periodLabel}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(fp.totalRevenueSnapshot, cur)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-400">{formatCurrency(fp.netProfitSnapshot, cur)}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(fp.totalAssetsSnapshot, cur)}</td>
                        <td className="py-2.5 px-3">{fp.approvedBy || fp.reviewedBy || fp.preparedBy}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              fp.status === "Closed"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                : fp.status === "Reopened"
                                ? "bg-amber-950 text-amber-300 border-amber-800"
                                : "bg-slate-900 text-slate-300 border-slate-700"
                            }`}
                          >
                            {fp.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {fp.status === "Closed" && statementsState.canApproveJournalsAndClosePeriods && (
                            <button
                              type="button"
                              onClick={() => setReopeningPeriod(fp)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-900 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Unlock size={11} />
                              <span>Reopen</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: NEW DOUBLE-ENTRY JOURNAL VOUCHER */}
      {/* ================================================================ */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">Create Double-Entry Journal Voucher</h3>
              <button
                type="button"
                onClick={() => setShowJournalModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Entry Date</label>
                <input
                  type="date"
                  value={jeDate}
                  onChange={(e) => setJeDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Entry Type</label>
                <select
                  value={jeType}
                  onChange={(e) => setJeType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                >
                  <option value="Standard">Standard</option>
                  <option value="Opening Balance">Opening Balance</option>
                  <option value="Adjusting">Adjusting</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Reference #</label>
                <input
                  type="text"
                  value={jeRef}
                  onChange={(e) => setJeRef(e.target.value)}
                  placeholder="Optional Ref #"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project</label>
                <input
                  type="text"
                  value={jeProject}
                  onChange={(e) => setJeProject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                <input
                  type="text"
                  value={jeDept}
                  onChange={(e) => setJeDept(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={jeDesc}
                  onChange={(e) => setJeDesc(e.target.value)}
                  placeholder="Narration / Journal memo"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                />
              </div>
            </div>

            {/* Journal Lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 uppercase text-[10px]">Journal Lines</span>
                <button
                  type="button"
                  onClick={() => setJeLines([...jeLines, { accountCode: "6110", debit: "", credit: "", memo: "" }])}
                  className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-bold cursor-pointer"
                >
                  + Add Line
                </button>
              </div>
              {jeLines.map((ln, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={ln.accountCode}
                    onChange={(e) => {
                      const next = [...jeLines];
                      next[idx] = { ...ln, accountCode: e.target.value };
                      setJeLines(next);
                    }}
                    className="col-span-5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    {statementsState.chartOfAccounts.map((a) => (
                      <option key={a.accountCode} value={a.accountCode}>
                        {a.accountCode} — {a.accountName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Debit"
                    value={ln.debit}
                    onChange={(e) => {
                      const next = [...jeLines];
                      next[idx] = { ...ln, debit: e.target.value, credit: e.target.value ? "" : ln.credit };
                      setJeLines(next);
                    }}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono text-right"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Credit"
                    value={ln.credit}
                    onChange={(e) => {
                      const next = [...jeLines];
                      next[idx] = { ...ln, credit: e.target.value, debit: e.target.value ? "" : ln.debit };
                      setJeLines(next);
                    }}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono text-right"
                  />
                  <input
                    type="text"
                    placeholder="Line memo"
                    value={ln.memo}
                    onChange={(e) => {
                      const next = [...jeLines];
                      next[idx] = { ...ln, memo: e.target.value };
                      setJeLines(next);
                    }}
                    className="col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  />
                  <button
                    type="button"
                    disabled={jeLines.length <= 2}
                    onClick={() => setJeLines(jeLines.filter((_, i) => i !== idx))}
                    className="col-span-1 text-red-400 hover:text-red-300 flex justify-center disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Balance Status Bar */}
            <div
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 font-mono ${
                journalValidation.isValid
                  ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                  : "bg-red-950/40 border-red-900 text-red-300"
              }`}
            >
              <div>
                Dr: {formatCurrency(journalValidation.totalDebit, cur)} · Cr: {formatCurrency(journalValidation.totalCredit, cur)} · Diff: {formatCurrency(journalValidation.difference, cur)}
              </div>
              <div className="text-[11px]">
                {journalValidation.isValid ? "BALANCED — READY" : journalValidation.error}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowJournalModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !journalValidation.isValid || !jeDesc.trim()}
                onClick={() => handleSaveJournalVoucher(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer disabled:opacity-40"
              >
                Submit for Approval
              </button>
              {statementsState.canApproveJournalsAndClosePeriods && (
                <button
                  type="button"
                  disabled={busy || !journalValidation.isValid || !jeDesc.trim()}
                  onClick={() => handleSaveJournalVoucher(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-40"
                >
                  Approve & Post to GL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: ADD CUSTOM GL ACCOUNT */}
      {/* ================================================================ */}
      {showCoaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveChartAccount}
            className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs"
          >
            <h3 className="text-sm font-black text-white">Add Chart of Accounts Entry</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">4-Digit Account Code</label>
                <input
                  type="text"
                  required
                  pattern="\d{4}"
                  placeholder="e.g. 1520"
                  value={coaCode}
                  onChange={(e) => setCoaCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower Crane Equipment"
                  value={coaName}
                  onChange={(e) => setCoaName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Account Type</label>
                  <select
                    value={coaType}
                    onChange={(e) => {
                      const nextType = e.target.value as ChartAccountType;
                      setCoaType(nextType);
                      setCoaSubType(SUB_TYPES_BY_TYPE[nextType][0]);
                      setCoaNormalBal(
                        nextType === "Asset" ||
                          nextType === "Cost of Construction" ||
                          nextType === "Operating Expense" ||
                          nextType === "Administrative Expense"
                          ? "Debit"
                          : "Credit"
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Sub-Type</label>
                  <select
                    value={coaSubType}
                    onChange={(e) => setCoaSubType(e.target.value as ChartAccountSubType)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    {SUB_TYPES_BY_TYPE[coaType].map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Normal Balance</label>
                  <select
                    value={coaNormalBal}
                    onChange={(e) => setCoaNormalBal(e.target.value as "Debit" | "Credit")}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cash Flow Section</label>
                  <select
                    value={coaCfSection}
                    onChange={(e) => setCoaCfSection(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="Operating">Operating</option>
                    <option value="Investing">Investing</option>
                    <option value="Financing">Financing</option>
                    <option value="Non-Cash">Non-Cash</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCoaModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: REOPEN CLOSED FINANCIAL PERIOD */}
      {/* ================================================================ */}
      {reopeningPeriod && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReopenPeriod}
            className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs"
          >
            <h3 className="text-sm font-black text-amber-300">
              Reopen Closed Period: {reopeningPeriod.periodLabel}
            </h3>
            <p className="text-slate-400">
              Reopening reverses the period closing journal entry and allows authorized adjusting entries. This action is logged in the audit trail.
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Mandatory Audit Reason
              </label>
              <textarea
                required
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Explain why this closed period must be reopened..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReopeningPeriod(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !reopenReason.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                Confirm Reopen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: REJECT JOURNAL ENTRY */}
      {/* ================================================================ */}
      {rejectingEntry && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRejectJournal}
            className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs"
          >
            <h3 className="text-sm font-black text-red-300">
              Reject Journal {rejectingEntry.journalNo}
            </h3>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejecting or returning this voucher..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !rejectReason.trim()}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
