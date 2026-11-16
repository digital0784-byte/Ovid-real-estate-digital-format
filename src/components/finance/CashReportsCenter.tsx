import React, { useMemo, useState } from "react";
import { Download, FileText, Printer, Search } from "lucide-react";
import { CashReportTypeId } from "../../types";
import {
  buildCashReportDataset,
  ComputedFinancialState,
  exportRowsToCsv,
} from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface CashReportsCenterProps {
  isAmharic: boolean;
  state: ComputedFinancialState;
  defaultReport?: CashReportTypeId;
}

const CASH_REPORT_OPTIONS: { id: CashReportTypeId; labelEn: string; labelAm: string; group: "Collection" | "Payment" }[] = [
  { id: "daily-cash-collection", labelEn: "1. Daily Cash Collection Report", labelAm: "1. ዕለታዊ የመሰብሰብ ሪፖርት", group: "Collection" },
  { id: "weekly-cash-collection", labelEn: "2. Weekly Cash Collection Report", labelAm: "2. ሳምንታዊ የመሰብሰብ ሪፖርት", group: "Collection" },
  { id: "monthly-cash-collection", labelEn: "3. Monthly Cash Collection Report", labelAm: "3. ወርሃዊ የመሰብሰብ ሪፖርት", group: "Collection" },
  { id: "daily-cash-payment", labelEn: "4. Daily Cash Payment Report", labelAm: "4. ዕለታዊ የክፍያ ሪፖርት", group: "Payment" },
  { id: "weekly-cash-payment", labelEn: "5. Weekly Cash Payment Report", labelAm: "5. ሳምንታዊ የክፍያ ሪፖርት", group: "Payment" },
  { id: "monthly-cash-payment", labelEn: "6. Monthly Cash Payment Report", labelAm: "6. ወርሃዊ የክፍያ ሪፖርት", group: "Payment" },
  { id: "project-wise-collection", labelEn: "7. Project-wise Collection Report", labelAm: "7. በፕሮጀክት መሰብሰብ ሪፖርት", group: "Collection" },
  { id: "project-wise-payment", labelEn: "8. Project-wise Payment Report", labelAm: "8. በፕሮጀክት ክፍያ ሪፖርት", group: "Payment" },
  { id: "customer-wise-collection", labelEn: "9. Customer-wise Collection Report", labelAm: "9. በደንበኛ መሰብሰብ ሪፖርት", group: "Collection" },
  { id: "supplier-wise-payment", labelEn: "10. Supplier-wise Payment Report", labelAm: "10. በአቅራቢ ክፍያ ሪፖርት", group: "Payment" },
  { id: "collection-variance", labelEn: "11. Collection Variance Report", labelAm: "11. የመሰብሰብ ልዩነት (Variance)", group: "Collection" },
  { id: "payment-variance", labelEn: "12. Payment Variance Report", labelAm: "12. የክፍያ ልዩነት (Variance)", group: "Payment" },
  { id: "outstanding-collection", labelEn: "13. Outstanding Collection Report", labelAm: "13. ያልተሰበሰበ ቀሪ ገንዘብ ሪፖርት", group: "Collection" },
  { id: "upcoming-payment", labelEn: "14. Upcoming Payment Report", labelAm: "14. መጪ የክፍያ ሪፖርት", group: "Payment" },
];

export const CashReportsCenter: React.FC<CashReportsCenterProps> = ({
  isAmharic,
  state,
  defaultReport = "monthly-cash-collection",
}) => {
  const cur = state.settings.defaultCurrency || "ETB";
  const [selectedReport, setSelectedReport] = useState<CashReportTypeId>(defaultReport);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportRefDate, setReportRefDate] = useState(state.referenceToday);

  const reportData = useMemo(
    () => buildCashReportDataset(selectedReport, state, reportRefDate),
    [selectedReport, state, reportRefDate]
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reportData.rows;
    return reportData.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? "").toLowerCase().includes(q))
    );
  }, [reportData.rows, searchTerm]);

  return (
    <div className="space-y-5" id="cash-reports-center">
      {/* Header & Controls */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isAmharic
                ? "14 ልዩ የጥሬ ገንዘብ መሰብሰብ እና ክፍያ ሪፖርቶች"
                : "Cash Collection & Cash Payment Reports (14 Statements)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "በቀጥታ ከFirestore የተረጋገጡ መዝገቦች የሚመነጩ ዕለታዊ፣ ሳምንታዊ፣ ወርሃዊ እና የልዩነት ሪፖርቶች"
                : "Real-time daily, weekly, monthly, project, customer, supplier & variance statements with CSV/Excel & PDF print export."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={reportRefDate}
            onChange={(e) => setReportRefDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
            aria-label="Report Reference Date"
          />
          <button
            type="button"
            onClick={() => exportRowsToCsv(reportData.id, filteredRows)}
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
            <span>{isAmharic ? "PDF አትም" : "Print / PDF"}</span>
          </button>
        </div>
      </div>

      {/* 14 Report Selector Pills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {CASH_REPORT_OPTIONS.map((opt) => {
          const active = selectedReport === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedReport(opt.id)}
              className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-between gap-2 ${
                active
                  ? opt.group === "Collection"
                    ? "bg-cyan-600 text-white border-cyan-500"
                    : "bg-amber-600 text-white border-amber-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="truncate">{isAmharic ? opt.labelAm : opt.labelEn}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  active
                    ? "bg-slate-950/30 text-white"
                    : opt.group === "Collection"
                    ? "bg-cyan-950/70 text-cyan-400"
                    : "bg-amber-950/70 text-amber-400"
                }`}
              >
                {opt.group === "Collection" ? "COL" : "PAY"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Report Workspace */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-extrabold text-white">
              {isAmharic ? reportData.titleAm : reportData.title}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">{reportData.subtitle}</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAmharic ? "በሪፖርቱ ውስጥ ፈልግ..." : "Filter rows..."}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="flex flex-wrap gap-3">
          {reportData.summaryTotals.map((tot) => (
            <div key={tot.label} className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{tot.label}</span>
              <span className="text-sm font-mono font-black text-white tabular-nums">
                {typeof tot.value === "number" && !tot.label.toLowerCase().includes("count") && !tot.label.toLowerCase().includes("transactions") && !tot.label.toLowerCase().includes("payments") && !tot.label.toLowerCase().includes("invoices") && !tot.label.toLowerCase().includes("items")
                  ? formatCurrency(tot.value, cur)
                  : tot.value}
              </span>
            </div>
          ))}
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/80">
                {reportData.columns.map((col) => (
                  <th key={col.key} className={`py-2.5 px-3 whitespace-nowrap ${col.isNumeric ? "text-right" : ""}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={reportData.columns.length} className="py-10 text-center text-slate-500">
                    {isAmharic ? "ለዚህ ሪፖርት ምንም የተመዘገበ መረጃ የለም።" : "No matching records found for this report & filter scope."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40">
                    {reportData.columns.map((col) => {
                      const val = row[col.key];
                      const isMoneyCol =
                        col.isNumeric &&
                        col.key !== "txCount" &&
                        col.key !== "count" &&
                        col.key !== "daysOverdue";
                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-3 ${
                            col.isNumeric ? "text-right font-mono tabular-nums" : ""
                          } ${
                            col.key === "variance" && typeof val === "number"
                              ? val >= 0
                                ? "text-emerald-400 font-bold"
                                : "text-red-400 font-bold"
                              : ""
                          }`}
                        >
                          {isMoneyCol && typeof val === "number" ? formatCurrency(val, cur) : String(val ?? "—")}
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
