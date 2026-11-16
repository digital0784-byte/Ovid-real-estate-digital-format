import React, { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Landmark,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Part6BankReportTypeId } from "../../types";
import {
  buildPart6BankReportDataset,
  exportPart6ReportToExcel,
  Part6BankDashboardState,
} from "../../services/bankManagementService";
import { exportRowsToCsv } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface BankReportsCenterProps {
  isAmharic: boolean;
  bankState: Part6BankDashboardState;
  onLogAction?: (action: string, details: string) => void;
}

const PART6_REPORTS: {
  id: Part6BankReportTypeId;
  labelEn: string;
  labelAm: string;
}[] = [
  { id: "bank-account-report", labelEn: "1. Bank Account Report", labelAm: "1. የባንክ ሂሳቦች ሪፖርት" },
  { id: "bank-transaction-report", labelEn: "2. Bank Transaction Report", labelAm: "2. የባንክ ግብይቶች ሪፖርት" },
  { id: "monthly-bank-statement", labelEn: "3. Monthly Bank Statement", labelAm: "3. ወርሃዊ የባንክ መግለጫ" },
  { id: "bank-reconciliation-report", labelEn: "4. Bank Reconciliation Report", labelAm: "4. የባንክ ማስታረቂያ ሪፖርት" },
  { id: "unmatched-transaction-report", labelEn: "5. Unmatched Transaction Report", labelAm: "5. ያልተጣመሩ ግብይቶች ሪፖርት" },
  { id: "bank-charges-report", labelEn: "6. Bank Charges Report", labelAm: "6. የባንክ ክፍያዎች ሪፖርት" },
  { id: "cash-and-bank-position-report", labelEn: "7. Cash & Bank Position Report", labelAm: "7. የጥሬ ገንዘብና ባንክ አቋም" },
];

export const BankReportsCenter: React.FC<BankReportsCenterProps> = ({
  isAmharic,
  bankState,
  onLogAction,
}) => {
  const [activeReport, setActiveReport] = useState<Part6BankReportTypeId>("bank-account-report");
  const [selectedRecId, setSelectedRecId] = useState<string>("ALL");

  const selectedRec = useMemo(
    () =>
      selectedRecId === "ALL"
        ? null
        : bankState.reconciliations.find((r) => r.id === selectedRecId) || null,
    [bankState.reconciliations, selectedRecId]
  );

  const dataset = useMemo(
    () => buildPart6BankReportDataset(activeReport, bankState, selectedRec),
    [activeReport, bankState, selectedRec]
  );

  const cur = bankState.currency || "ETB";

  const handleExportExcel = () => {
    exportPart6ReportToExcel(dataset);
    onLogAction?.("Export Part 6 Bank Report (Excel)", `Exported ${dataset.title} to Excel`);
  };

  const handleExportCsv = () => {
    exportRowsToCsv(`${dataset.id}_${bankState.referenceToday}`, dataset.rows);
    onLogAction?.("Export Part 6 Bank Report (CSV)", `Exported ${dataset.title} to CSV`);
  };

  const handlePrintPdf = () => {
    window.print();
    onLogAction?.("Print Part 6 Bank Report (PDF)", `Printed ${dataset.title}`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
            <Landmark size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {isAmharic ? "የባንክ አስተዳደር እና ማስታረቂያ ሪፖርቶች (7)" : "Bank Management & Reconciliation Reports (7)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "በExcel (.xlsx)፣ CSV እና PDF ማተም የሚችሉ 7 ሪፖርቶች"
                : "Audit-ready bank, statement, reconciliation, unmatched, charge, and cash/bank position reports with Excel & PDF export."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet size={14} />
            <span>{isAmharic ? "Excel (.xlsx)" : "Export Excel"}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileText size={14} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer size={14} />
            <span>{isAmharic ? "PDF / አትም" : "Print / PDF"}</span>
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {PART6_REPORTS.map((rep) => (
          <button
            key={rep.id}
            type="button"
            onClick={() => setActiveReport(rep.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeReport === rep.id
                ? "bg-cyan-600 text-white border-cyan-500"
                : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
            }`}
          >
            {isAmharic ? rep.labelAm : rep.labelEn}
          </button>
        ))}
      </div>

      {activeReport === "bank-reconciliation-report" && bankState.reconciliations.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400 font-semibold">
            {isAmharic ? "የማስታረቂያ መዝገብ ይምረጡ:" : "Filter Reconciliation Record:"}
          </span>
          <select
            value={selectedRecId}
            onChange={(e) => setSelectedRecId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
          >
            <option value="ALL">All Reconciliations ({bankState.reconciliations.length})</option>
            {bankState.reconciliations.map((rec) => (
              <option key={rec.id} value={rec.id}>
                {rec.reconciliationNo} — {rec.accountName} ({rec.periodStart} → {rec.periodEnd}) [{rec.approvalStatus}]
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Printable Report Sheet */}
      <div className="bg-white text-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-3 gap-2">
          <div>
            <h4 className="text-base font-black tracking-tight uppercase">
              {isAmharic ? dataset.titleAm : dataset.title}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">{dataset.subtitle}</p>
          </div>
          <div className="text-[11px] font-mono text-slate-600 sm:text-right">
            <div>Currency: {cur}</div>
            <div>As of: {bankState.referenceToday}</div>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {dataset.summaryTotals.map((st) => (
            <div key={st.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">{st.label}</div>
              <div className="text-sm font-black font-mono tabular-nums text-slate-900 mt-0.5">
                {typeof st.value === "number" && !st.label.toLowerCase().includes("count") && !st.label.toLowerCase().includes("accounts") && !st.label.toLowerCase().includes("entries") && !st.label.toLowerCase().includes("items") && !st.label.toLowerCase().includes("reconciliations")
                  ? formatCurrency(st.value, cur)
                  : st.value}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        {dataset.rows.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg">
            {isAmharic ? "ለዚህ ሪፖርት ምንም መረጃ የለም።" : "No records match the current report filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                <tr>
                  {dataset.columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2 px-3 border-b border-slate-300 whitespace-nowrap ${
                        col.isNumeric ? "text-right" : ""
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dataset.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {dataset.columns.map((col) => {
                      const val = row[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-3 ${
                            col.isNumeric ? "text-right font-mono tabular-nums whitespace-nowrap" : ""
                          }`}
                        >
                          {col.isNumeric && typeof val === "number"
                            ? col.key === "lineNo"
                              ? val
                              : formatCurrency(val, cur)
                            : String(val ?? "-")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" />
            Digital Construction ERP — Treasury & Bank Reconciliation Module
          </span>
          {bankState.kpis.reconciliationDifferencesTotal > 0 && (
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <AlertTriangle size={12} />
              Open Reconciliation Variance: {formatCurrency(bankState.kpis.reconciliationDifferencesTotal, cur)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
