import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FilterX, Printer, Search } from "lucide-react";
import { ArApReportTypeId } from "../../types";
import {
  AGING_BUCKET_LABELS,
  ArApReportFilters,
  buildArApReportDataset,
  ComputedFinancialState,
  exportRowsToCsv,
  PAYABLE_CATEGORIES,
  RECEIVABLE_CATEGORIES,
} from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface ArApReportsCenterProps {
  isAmharic: boolean;
  state: ComputedFinancialState;
  defaultReport?: ArApReportTypeId;
}

const AR_AP_REPORT_OPTIONS: {
  id: ArApReportTypeId;
  labelEn: string;
  labelAm: string;
  domain: "AR" | "AP";
}[] = [
  { id: "accounts-receivable-report", labelEn: "1. Accounts Receivable Report", labelAm: "1. የተሰብሳቢ ሂሳቦች (AR) ሪፖርት", domain: "AR" },
  { id: "accounts-payable-report", labelEn: "2. Accounts Payable Report", labelAm: "2. የተከፋይ ሂሳቦች (AP) ሪፖርት", domain: "AP" },
  { id: "client-outstanding-balance-report", labelEn: "3. Client Outstanding Balance", labelAm: "3. የደንበኞች ቀሪ ሂሳብ", domain: "AR" },
  { id: "supplier-outstanding-balance-report", labelEn: "4. Supplier Outstanding Balance", labelAm: "4. የአቅራቢዎች ቀሪ ሂሳብ", domain: "AP" },
  { id: "project-receivable-report", labelEn: "5. Project Receivable Report", labelAm: "5. በፕሮጀክት የተሰብሳቢ ሪፖርት", domain: "AR" },
  { id: "project-payable-report", labelEn: "6. Project Payable Report", labelAm: "6. በፕሮጀክት የተከፋይ ሪፖርት", domain: "AP" },
  { id: "aging-receivable-report", labelEn: "7. Aging Receivable Report", labelAm: "7. የተሰብሳቢ ዕድሜ (Aging) ሪፖርት", domain: "AR" },
  { id: "aging-payable-report", labelEn: "8. Aging Payable Report", labelAm: "8. የተከፋይ ዕድሜ (Aging) ሪፖርት", domain: "AP" },
  { id: "monthly-collection-report", labelEn: "9. Monthly Collection Report", labelAm: "9. ወርሃዊ የመሰብሰብ ሪፖርት", domain: "AR" },
  { id: "monthly-payment-report", labelEn: "10. Monthly Payment Report", labelAm: "10. ወርሃዊ የክፍያ ሪፖርት", domain: "AP" },
  { id: "overdue-receivable-report", labelEn: "11. Overdue Receivable Report", labelAm: "11. ጊዜው ያለፈበት ተሰብሳቢ ሪፖርት", domain: "AR" },
  { id: "overdue-payable-report", labelEn: "12. Overdue Payable Report", labelAm: "12. ጊዜው ያለፈበት ተከፋይ ሪፖርት", domain: "AP" },
];

const PAYMENT_STATUS_OPTIONS = [
  "Not Yet Due",
  "Due Today",
  "Overdue",
  "Partially Collected",
  "Fully Collected",
  "Partially Paid",
  "Fully Paid",
  "Disputed",
];

export const ArApReportsCenter: React.FC<ArApReportsCenterProps> = ({
  isAmharic,
  state,
  defaultReport = "accounts-receivable-report",
}) => {
  const cur = state.settings.defaultCurrency || "ETB";
  const [selectedReport, setSelectedReport] = useState<ArApReportTypeId>(defaultReport);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ArApReportFilters>({
    project: "ALL",
    client: "ALL",
    supplier: "ALL",
    startDate: "",
    endDate: "",
    paymentStatus: "ALL",
    agingCategory: "ALL",
    transactionCategory: "ALL",
  });

  const activeOpt = AR_AP_REPORT_OPTIONS.find((r) => r.id === selectedReport) || AR_AP_REPORT_OPTIONS[0];

  const reportData = useMemo(
    () => buildArApReportDataset(selectedReport, state, filters),
    [selectedReport, state, filters]
  );

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reportData.rows;
    return reportData.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? "").toLowerCase().includes(q))
    );
  }, [reportData.rows, searchTerm]);

  const resetFilters = () => {
    setFilters({
      project: "ALL",
      client: "ALL",
      supplier: "ALL",
      startDate: "",
      endDate: "",
      paymentStatus: "ALL",
      agingCategory: "ALL",
      transactionCategory: "ALL",
    });
    setSearchTerm("");
  };

  const categoryChoices = activeOpt.domain === "AR" ? RECEIVABLE_CATEGORIES : PAYABLE_CATEGORIES;

  return (
    <div className="space-y-5" id="ar-ap-reports-center">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isAmharic
                ? "12 የAR እና AP የፋይናንስ ሪፖርቶች"
                : "Accounts Receivable & Accounts Payable Reports (12 Statements)"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "በፕሮጀክት፣ በደንበኛ፣ በአቅራቢ፣ በቀን፣ በሁኔታ እና በዕድሜ ምድብ የሚጣሩ የቀጥታ Firestore ሪፖርቶች"
                : "Filterable live statements across Project, Client, Supplier, Date Range, Payment Status, Aging Bucket & Category."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>{isAmharic ? "PDF / አትም" : "Print / PDF"}</span>
          </button>
        </div>
      </div>

      {/* 12 Report Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {AR_AP_REPORT_OPTIONS.map((opt) => {
          const active = selectedReport === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedReport(opt.id)}
              className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-between gap-2 ${
                active
                  ? opt.domain === "AR"
                    ? "bg-amber-600 text-white border-amber-500"
                    : "bg-orange-600 text-white border-orange-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="truncate">{isAmharic ? opt.labelAm : opt.labelEn}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  active
                    ? "bg-slate-950/30 text-white"
                    : opt.domain === "AR"
                    ? "bg-amber-950/70 text-amber-400"
                    : "bg-orange-950/70 text-orange-400"
                }`}
              >
                {opt.domain}
              </span>
            </button>
          );
        })}
      </div>

      {/* 7-Dimension Filter Controls */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isAmharic ? "የሪፖርት ማጣሪያዎች (7 መለኪያዎች)" : "Report Filters (Project, Client, Supplier, Dates, Status, Aging, Category)"}
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <FilterX size={12} />
            <span>{isAmharic ? "ማጣሪያዎችን አጽዳ" : "Reset Filters"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <select
            value={filters.project || "ALL"}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
            aria-label="Filter by Project"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
            {state.filterOptions.projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            value={filters.client || "ALL"}
            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            aria-label="Filter by Client"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ደንበኞች" : "All Clients"}</option>
            {state.filterOptions.customers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filters.supplier || "ALL"}
            onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
            aria-label="Filter by Supplier"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="ALL">{isAmharic ? "ሁሉም አቅራቢዎች" : "All Suppliers"}</option>
            {state.filterOptions.suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filters.paymentStatus || "ALL"}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
            aria-label="Filter by Payment Status"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="ALL">{isAmharic ? "ሁሉም የክፍያ ሁኔታዎች" : "All Payment Statuses"}</option>
            {PAYMENT_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={filters.agingCategory || "ALL"}
            onChange={(e) => setFilters({ ...filters, agingCategory: e.target.value })}
            aria-label="Filter by Aging Category"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="ALL">{isAmharic ? "ሁሉም የዕድሜ ምድቦች" : "All Aging Categories"}</option>
            {AGING_BUCKET_LABELS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={filters.transactionCategory || "ALL"}
            onChange={(e) => setFilters({ ...filters, transactionCategory: e.target.value })}
            aria-label="Filter by Transaction Category"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
          >
            <option value="ALL">{isAmharic ? "ሁሉም የግብይት ምድቦች" : "All Transaction Categories"}</option>
            {categoryChoices.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            aria-label="Start Date"
            title="Start Date"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />

          <input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            aria-label="End Date"
            title="End Date"
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
          />
        </div>
      </div>

      {/* Report Output */}
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
              placeholder={isAmharic ? "በሪፖርቱ ውስጥ ፈልግ..." : "Search rows..."}
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
                {typeof tot.value === "number" &&
                !tot.label.toLowerCase().includes("count") &&
                !tot.label.toLowerCase().includes("clients") &&
                !tot.label.toLowerCase().includes("suppliers") &&
                !tot.label.toLowerCase().includes("invoices") &&
                !tot.label.toLowerCase().includes("bills") &&
                !tot.label.toLowerCase().includes("collections") &&
                !tot.label.toLowerCase().includes("payments")
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
                    {isAmharic
                      ? "ለዚህ ሪፖርት ምንም የተመዘገበ መረጃ የለም።"
                      : "No matching AR/AP records found for the selected filters."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-900/40">
                    {reportData.columns.map((col) => {
                      const val = row[col.key];
                      const isNonMoneyCount =
                        col.key === "count" ||
                        col.key === "invoices" ||
                        col.key === "invoiceCount" ||
                        col.key === "bills" ||
                        col.key === "billCount" ||
                        col.key === "daysOverdue";
                      const isMoneyCol = col.isNumeric && !isNonMoneyCount;
                      return (
                        <td
                          key={col.key}
                          className={`py-2.5 px-3 ${
                            col.isNumeric ? "text-right font-mono tabular-nums" : ""
                          } ${
                            col.key === "overdue" && typeof val === "number" && val > 0
                              ? "text-red-400 font-bold"
                              : col.key === "outstanding" && typeof val === "number" && val > 0
                              ? "text-amber-300 font-bold"
                              : ""
                          }`}
                        >
                          {isMoneyCol && typeof val === "number"
                            ? formatCurrency(val, cur)
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
