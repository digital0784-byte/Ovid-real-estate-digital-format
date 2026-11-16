import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer, Search } from "lucide-react";
import { BudgetReportTypeId } from "../../types";
import {
  buildPart4BudgetReportDataset,
  Part4BudgetControlState,
} from "../../services/budgetControlService";
import { exportRowsToCsv } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface BudgetReportsCenterProps {
  isAmharic: boolean;
  budgetState: Part4BudgetControlState;
  currency?: string;
  defaultReport?: BudgetReportTypeId;
}

const BUDGET_REPORT_OPTIONS: {
  id: BudgetReportTypeId;
  labelEn: string;
  labelAm: string;
}[] = [
  { id: "project-budget-report", labelEn: "1. Project Budget Report", labelAm: "1. የፕሮጀክት በጀት ሪፖርት" },
  { id: "monthly-budget-allocation-report", labelEn: "2. Monthly Budget Allocation", labelAm: "2. ወርሃዊ የበጀት ምደባ" },
  { id: "actual-cost-report", labelEn: "3. Actual Cost Report", labelAm: "3. ትክክለኛ የወጪ ሪፖርት" },
  { id: "budget-vs-actual-cost-report", labelEn: "4. Budget vs Actual Cost", labelAm: "4. በጀት እና ትክክለኛ ወጪ" },
  { id: "budget-utilization-report", labelEn: "5. Budget Utilization Report", labelAm: "5. የበጀት አጠቃቀም መጠን" },
  { id: "cost-variance-report", labelEn: "6. Cost Variance Report", labelAm: "6. የወጪ ልዩነት (Variance)" },
  { id: "project-cost-breakdown-report", labelEn: "7. Project Cost Breakdown", labelAm: "7. የፕሮጀክት ወጪ ዘርፍ ትንተና" },
  { id: "budget-revision-history-report", labelEn: "8. Budget Revision History", labelAm: "8. የበጀት ማሻሻያ ታሪክ" },
  { id: "monthly-expenditure-report", labelEn: "9. Monthly Expenditure Report", labelAm: "9. ወርሃዊ የወጪ ሪፖርት" },
  { id: "quarterly-expenditure-report", labelEn: "10. Quarterly Expenditure Report", labelAm: "10. የሩብ ዓመት የወጪ ሪፖርት" },
  { id: "annual-project-cost-report", labelEn: "11. Annual Project Cost Report", labelAm: "11. ዓመታዊ የፕሮጀክት ወጪ" },
  { id: "projects-over-budget-report", labelEn: "12. Projects Over Budget", labelAm: "12. ከበጀት በላይ ፕሮጀክቶች" },
  { id: "remaining-budget-report", labelEn: "13. Remaining Budget Report", labelAm: "13. የቀሪ በጀት ሪፖርት" },
  { id: "project-financial-performance-report", labelEn: "14. Project Financial Performance", labelAm: "14. የፕሮጀክት ፋይናንስ አፈፃፀም" },
];

export const BudgetReportsCenter: React.FC<BudgetReportsCenterProps> = ({
  isAmharic,
  budgetState,
  currency = "ETB",
  defaultReport = "budget-vs-actual-cost-report",
}) => {
  const [selectedReport, setSelectedReport] = useState<BudgetReportTypeId>(defaultReport);
  const [searchTerm, setSearchTerm] = useState("");

  const dataset = useMemo(
    () => buildPart4BudgetReportDataset(selectedReport, budgetState, currency),
    [selectedReport, budgetState, currency]
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return dataset.rows;
    return dataset.rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [dataset.rows, searchTerm]);

  return (
    <div className="space-y-4" id="budget-14-reports-center">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isAmharic
                ? "14 የበጀት እና የወጪ ቁጥጥር ሪፖርቶች"
                : "Budget Management & Cost Control Reports (14 Statements)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ከቀጥታ Firestore በጀቶች፣ ምደባዎች፣ ማሻሻያዎች እና ከተረጋገጡ ወጪዎች የተሰሉ ሪፖርቶች"
                : "Live Firestore-driven budget baselines, allocations, variance statements, overruns & financial performance exports."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportRowsToCsv(dataset.id, filteredRows)}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Download size={14} />
            <span>{isAmharic ? "Excel/CSV አውርድ" : "Export Excel / CSV"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer size={14} />
            <span>{isAmharic ? "PDF / አትም" : "Print / PDF"}</span>
          </button>
        </div>
      </div>

      {/* 14 Report Selector Pills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {BUDGET_REPORT_OPTIONS.map((opt) => {
          const active = selectedReport === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedReport(opt.id)}
              className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer truncate ${
                active
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {isAmharic ? opt.labelAm : opt.labelEn}
            </button>
          );
        })}
      </div>

      {/* Report Search & Summary Totals */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-white">
            {isAmharic ? dataset.titleAm : dataset.title}
          </h4>
          <p className="text-[11px] text-slate-400">{dataset.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {dataset.summaryTotals.map((st) => (
            <div
              key={st.label}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
            >
              <span className="text-slate-400 mr-1.5">{st.label}:</span>
              <span className="font-mono font-bold text-white tabular-nums">
                {typeof st.value === "number" ? formatCurrency(st.value, currency) : st.value}
              </span>
            </div>
          ))}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAmharic ? "ሪፖርት ፈልግ..." : "Filter rows..."}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 uppercase text-[10px]">
                {dataset.columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-3 px-4 font-bold ${col.isNumeric ? "text-right" : ""}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={dataset.columns.length}
                    className="py-10 text-center text-slate-500"
                  >
                    {isAmharic
                      ? "ለዚህ ሪፖርት የተመዘገበ መረጃ አልተገኘም።"
                      : "No records matched the selected report criteria."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    {dataset.columns.map((col) => {
                      const val = row[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-4 ${
                            col.isNumeric ? "text-right font-mono tabular-nums font-semibold" : ""
                          }`}
                        >
                          {col.isNumeric && typeof val === "number"
                            ? formatCurrency(val, currency)
                            : String(val ?? "—")}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
