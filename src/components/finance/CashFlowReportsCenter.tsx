import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer, Search } from "lucide-react";
import { CashFlowReportTypeId } from "../../types";
import {
  buildCashFlowReportDataset,
  Part5CashFlowState,
} from "../../services/cashFlowForecastService";
import { exportRowsToCsv } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface CashFlowReportsCenterProps {
  isAmharic: boolean;
  cashFlowState: Part5CashFlowState;
  defaultReport?: CashFlowReportTypeId;
}

const CASH_FLOW_REPORT_OPTIONS: {
  id: CashFlowReportTypeId;
  labelEn: string;
  labelAm: string;
}[] = [
  { id: "daily-cash-flow", labelEn: "1. Daily Cash Flow Report", labelAm: "1. ዕለታዊ የገንዘብ ፍሰት" },
  { id: "monthly-cash-flow-statement", labelEn: "2. Monthly Cash Flow Statement", labelAm: "2. ወርሃዊ የገንዘብ ፍሰት መግለጫ" },
  { id: "quarterly-cash-flow", labelEn: "3. Quarterly Cash Flow Report", labelAm: "3. የሩብ ዓመት የገንዘብ ፍሰት" },
  { id: "annual-cash-flow", labelEn: "4. Annual Cash Flow Report", labelAm: "4. ዓመታዊ የገንዘብ ፍሰት" },
  { id: "cash-forecast-report", labelEn: "5. Cash Forecast Report", labelAm: "5. የገንዘብ ፍሰት ትንበያ" },
  { id: "bank-reconciliation-report", labelEn: "6. Bank Reconciliation Report", labelAm: "6. የባንክ ማመሳከሪያ" },
  { id: "cash-shortage-report", labelEn: "7. Cash Shortage Report", labelAm: "7. የጥሬ ገንዘብ እጥረት" },
];

export const CashFlowReportsCenter: React.FC<CashFlowReportsCenterProps> = ({
  isAmharic,
  cashFlowState,
  defaultReport = "monthly-cash-flow-statement",
}) => {
  const [selectedReport, setSelectedReport] = useState<CashFlowReportTypeId>(defaultReport);
  const [searchTerm, setSearchTerm] = useState("");
  const cur = cashFlowState.currency || "ETB";

  const dataset = useMemo(
    () => buildCashFlowReportDataset(selectedReport, cashFlowState),
    [selectedReport, cashFlowState]
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return dataset.rows;
    return dataset.rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [dataset.rows, searchTerm]);

  return (
    <div className="space-y-4" id="cashflow-7-reports-center">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isAmharic
                ? "7 የገንዘብ ፍሰት፣ ትንበያ እና የባንክ ማመሳከሪያ ሪፖርቶች"
                : "Cash Flow, Forecasting & Bank Reconciliation Reports (7 Statements)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ከቀጥታ Firestore የጥሬ ገንዘብ እንቅስቃሴ፣ ትንበያ እና የባንክ ማመሳከሪያ የተዘጋጁ ሪፖርቶች"
                : "Strict cash-basis statements, multi-horizon forecasts, bank reconciliations, and cash shortage projections."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={filteredRows.length === 0}
            onClick={() => exportRowsToCsv(`cashflow_${dataset.id}`, filteredRows)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Download size={14} />
            <span>{isAmharic ? "Excel / CSV አውርድ" : "Export Excel / CSV"}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer size={14} />
            <span>{isAmharic ? "PDF / አትም" : "Print / Save PDF"}</span>
          </button>
        </div>
      </div>

      {/* Report Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {CASH_FLOW_REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedReport(opt.id)}
            className={`px-3 py-2.5 rounded-xl text-left text-[11px] font-bold border transition cursor-pointer ${
              selectedReport === opt.id
                ? "bg-cyan-600 text-white border-cyan-500"
                : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
            }`}
          >
            <span className="line-clamp-2">{isAmharic ? opt.labelAm : opt.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Active Report Sheet */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h4 className="text-sm font-black text-white">
              {isAmharic ? dataset.titleAm : dataset.title}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{dataset.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {dataset.summaryTotals.map((tot) => (
              <div
                key={tot.label}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs"
              >
                <span className="text-[10px] text-slate-400 uppercase block">{tot.label}</span>
                <span className="font-mono font-black text-white tabular-nums">
                  {typeof tot.value === "number" ? formatCurrency(tot.value, cur) : tot.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAmharic ? "በሪፖርቱ ውስጥ ፈልግ..." : "Filter report rows..."}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 uppercase">
                {dataset.columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 font-bold ${col.isNumeric ? "text-right" : "text-left"}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={dataset.columns.length} className="py-10 text-center text-slate-500">
                    {isAmharic
                      ? "ለዚህ ሪፖርት ምንም የተገኘ መዝገብ የለም።"
                      : "No records matching this report period & filters yet."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    {dataset.columns.map((col) => {
                      const val = row[col.key];
                      const isNum = col.isNumeric && typeof val === "number";
                      const isCurrencyCol =
                        isNum &&
                        col.key !== "txCount" &&
                        col.key !== "reconciledCount" &&
                        col.key !== "unreconciledBookCount";
                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-3 ${
                            isNum ? "text-right font-mono tabular-nums" : ""
                          } ${
                            isNum && val < 0
                              ? "text-red-400 font-bold"
                              : col.key === "severity" && val === "CRITICAL"
                              ? "text-red-400 font-bold"
                              : col.key === "severity" && val === "WARNING"
                              ? "text-amber-400 font-bold"
                              : ""
                          }`}
                        >
                          {isCurrencyCol
                            ? formatCurrency(val, cur)
                            : isNum
                            ? val.toLocaleString()
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
