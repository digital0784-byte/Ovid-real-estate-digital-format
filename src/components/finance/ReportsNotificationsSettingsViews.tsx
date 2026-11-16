import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Printer,
  Send,
  Settings,
} from "lucide-react";
import { FinancialMenuModuleId, FinancialSettingsConfig, Part7StatementTypeId, UserRole } from "../../types";
import {
  ComputedFinancialState,
  exportRowsToCsv,
} from "../../services/financeService";
import { Part4BudgetControlState } from "../../services/budgetControlService";
import { DbService } from "../../services/db";
import { formatCurrency } from "../../utils/formatters";
import { CashReportsCenter } from "./CashReportsCenter";
import { ArApReportsCenter } from "./ArApReportsCenter";
import { BudgetReportsCenter } from "./BudgetReportsCenter";
import { CashFlowReportsCenter } from "./CashFlowReportsCenter";
import { BankReportsCenter } from "./BankReportsCenter";
import { PrintableFinancialStatementSheet } from "./FinancialStatementsModule";
import { Part5CashFlowState } from "../../services/cashFlowForecastService";
import { Part6BankDashboardState } from "../../services/bankManagementService";
import {
  exportPart7StatementToCsv,
  exportPart7StatementToExcel,
  Part7FinancialStatementsState,
} from "../../services/financialStatementsService";

interface ReportsNotificationsSettingsViewsProps {
  mode: "financial-reports" | "financial-notifications" | "financial-settings";
  isAmharic: boolean;
  state: ComputedFinancialState;
  budgetState?: Part4BudgetControlState;
  cashFlowState?: Part5CashFlowState;
  bankState?: Part6BankDashboardState;
  statementsState?: Part7FinancialStatementsState;
  actorName: string;
  actorRole: string;
  actorUid: string;
  onNavigateModule: (moduleId: FinancialMenuModuleId) => void;
  onLogAction?: (action: string, details: string) => void;
}

export const ReportsNotificationsSettingsViews: React.FC<
  ReportsNotificationsSettingsViewsProps
> = ({
  mode,
  isAmharic,
  state,
  budgetState,
  cashFlowState,
  bankState,
  statementsState,
  actorName,
  actorRole,
  actorUid,
  onNavigateModule,
  onLogAction,
}) => {
  const { metrics, permissions, settings, alerts } = state;
  const cur = settings.defaultCurrency || "ETB";

  const combinedAlerts = React.useMemo(() => {
    const budgetAlertsMapped = (budgetState?.alerts || []).map((ba) => ({
      id: `P4-${ba.id}`,
      severity: ba.severity === "CRITICAL" ? ("CRITICAL" as const) : ("WARNING" as const),
      title: `[Budget Control] ${ba.title}`,
      titleAm: `[የበጀት ቁጥጥር] ${ba.titleAm}`,
      description: ba.description,
      descriptionAm: ba.descriptionAm,
      project: ba.project,
      moduleTarget: "budget-management" as FinancialMenuModuleId,
    }));
    const cashFlowAlertsMapped = (cashFlowState?.alerts || []).map((cf) => ({
      id: `P5-${cf.id}`,
      severity: cf.severity === "CRITICAL" ? ("CRITICAL" as const) : ("WARNING" as const),
      title: `[Cash Flow] ${cf.title}`,
      titleAm: `[የገንዘብ ፍሰት] ${cf.titleAm}`,
      description: cf.description,
      descriptionAm: cf.descriptionAm,
      project: cf.project,
      moduleTarget: cf.moduleTarget,
    }));
    const bankAlertsMapped = (bankState?.alerts || []).map((ba) => ({
      id: `P6-${ba.id}`,
      severity: ba.severity === "CRITICAL" ? ("CRITICAL" as const) : ("WARNING" as const),
      title: `[Bank & Reconciliation] ${ba.title}`,
      titleAm: `[ባንክና ማስታረቂያ] ${ba.titleAm}`,
      description: ba.description,
      descriptionAm: ba.descriptionAm,
      project: ba.project,
      moduleTarget: "cash-and-bank" as FinancialMenuModuleId,
    }));
    return [...alerts, ...budgetAlertsMapped, ...cashFlowAlertsMapped, ...bankAlertsMapped];
  }, [alerts, budgetState?.alerts, cashFlowState?.alerts, bankState?.alerts]);

  const [reportTab, setReportTab] = useState<
    | "summary"
    | "pnl"
    | "cashflow"
    | "ar-aging"
    | "ap-aging"
    | "budget"
    | "cash-14"
    | "ar-ap-12"
    | "budget-14"
    | "cashflow-7"
    | "bank-7"
    | "statements-8"
  >("summary");
  const [activePart7Statement, setActivePart7Statement] =
    useState<Part7StatementTypeId>("income-statement");

  const [settingsForm, setSettingsForm] = useState<FinancialSettingsConfig>(settings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageSettings) return;
    setSavingSettings(true);
    try {
      const nowIso = new Date().toISOString();
      const updated: FinancialSettingsConfig = {
        ...settingsForm,
        id: "FIN-SETTINGS-GLOBAL",
        updatedBy: actorName,
        updatedAt: nowIso,
      };
      await DbService.saveFinancialSettings(updated);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Update Financial Settings",
        category: "Finance",
        severity: "WARNING",
        details: `Updated financial threshold settings (Low Cash: ${updated.defaultCurrency} ${updated.lowCashAlertThresholdEtb.toLocaleString()}, Budget Overrun: ${updated.budgetOverrunAlertPct}%).`,
      });
      onLogAction?.("Update Financial Settings", `Threshold ${updated.defaultCurrency} ${updated.lowCashAlertThresholdEtb}`);
      showToast(isAmharic ? "የፋይናንስ ቅንብሮች ተቀምጠዋል።" : "Financial settings saved to Firestore.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDispatchAlertToDirectors = async (alertItem: (typeof alerts)[number]) => {
    const nowIso = new Date().toISOString();
    await DbService.addNotification({
      id: `${alertItem.id}-${Date.now()}`,
      type: "Financial Alert",
      title: alertItem.title,
      titleAm: alertItem.titleAm,
      message: alertItem.description,
      description: alertItem.description,
      descriptionAm: alertItem.descriptionAm,
      category: "Finance Notifications",
      priority: alertItem.severity === "CRITICAL" ? "Critical" : "High",
      status: "Unread",
      projectName: alertItem.project || "Corporate Finance",
      sender: actorName,
      senderRole: actorRole,
      receiver: "Director & Finance Manager",
      targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE, UserRole.FINANCE_MANAGER],
      date: nowIso.slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      read: false,
      actionTab: "financeErp",
    });
    setAcknowledgedIds((prev) => new Set(prev).add(alertItem.id));
    showToast(isAmharic ? "ማስጠንቀቂያው ለዳይሬክተር እና ለፋይናንስ አስተዳዳሪ ተልኳል።" : "Alert dispatched to Director & Finance Manager notifications.");
  };

  const handleExportActiveReportCsv = () => {
    if (reportTab === "statements-8" && statementsState) {
      exportPart7StatementToCsv(activePart7Statement, statementsState);
      onLogAction?.("Export Financial Statement CSV", `Exported ${activePart7Statement} to CSV`);
      return;
    }
    if (reportTab === "summary") {
      exportRowsToCsv("executive_financial_summary", [
        { Metric: "Planned Revenue", Amount: metrics.plannedRevenue, Currency: cur },
        { Metric: "Actual Revenue", Amount: metrics.actualRevenue, Currency: cur },
        { Metric: "Planned Expenses", Amount: metrics.plannedExpenses, Currency: cur },
        { Metric: "Actual Expenses", Amount: metrics.actualExpenses, Currency: cur },
        { Metric: "Planned Cash Collection", Amount: metrics.plannedCashCollection, Currency: cur },
        { Metric: "Actual Cash Collection", Amount: metrics.actualCashCollection, Currency: cur },
        { Metric: "Planned Cash Payment", Amount: metrics.plannedCashPayment, Currency: cur },
        { Metric: "Actual Cash Payment", Amount: metrics.actualCashPayment, Currency: cur },
        { Metric: "Outstanding Receivables", Amount: metrics.outstandingReceivables, Currency: cur },
        { Metric: "Overdue Receivables", Amount: metrics.overdueReceivables, Currency: cur },
        { Metric: "Outstanding Payables", Amount: metrics.outstandingPayables, Currency: cur },
        { Metric: "Overdue Payables", Amount: metrics.overduePayables, Currency: cur },
        { Metric: "Net Profit / Loss", Amount: metrics.actualProfitOrLoss, Currency: cur },
        { Metric: "Available Cash Balance", Amount: metrics.availableCashBalance, Currency: cur },
        { Metric: "Total Bank Balance", Amount: metrics.totalBankBalance, Currency: cur },
        { Metric: "Net Cash Flow", Amount: metrics.netCashFlow, Currency: cur },
      ]);
    } else if (reportTab === "pnl") {
      exportRowsToCsv("profit_and_loss_report", state.charts.profitLossTrends);
    } else if (reportTab === "cashflow") {
      exportRowsToCsv("cash_flow_report", state.charts.cashFlowTrends);
    } else if (reportTab === "ar-aging") {
      exportRowsToCsv("ar_aging_report", state.agingReceivables);
    } else if (reportTab === "ap-aging") {
      exportRowsToCsv("ap_aging_report", state.agingPayables);
    } else {
      exportRowsToCsv("budget_vs_actual_report", state.charts.budgetVsActual);
    }
    onLogAction?.("Export Financial Report", `Exported ${reportTab} report to CSV`);
  };

  return (
    <div className="space-y-5" id={`finance-module-${mode}`}>
      {toast && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* 15. FINANCIAL REPORTS */}
      {mode === "financial-reports" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-red-400">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isAmharic ? "15. የፋይናንስ ሪፖርቶች (Financial Reports)" : "15. Executive Financial Reports"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAmharic ? "ከቀጥታ Firestore ዳታ የተሰሉ የCSV እና የPDF ሪፖርቶች" : "Live Firestore-backed statements formatted for executive review, audit, CSV, and print/PDF export."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportActiveReportCsv}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet size={14} />
                <span>{isAmharic ? "CSV አውርድ" : "Export CSV"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  onLogAction?.("Print Financial Report", `Printed ${reportTab} report`);
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer size={14} />
                <span>{isAmharic ? "PDF / አትም" : "Print / Save PDF"}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: "summary", label: isAmharic ? "አጠቃላይ ማጠቃለያ" : "Executive Summary" },
              { id: "pnl", label: isAmharic ? "ትርፍና ኪሳራ" : "Profit & Loss" },
              { id: "cashflow", label: isAmharic ? "የገንዘብ ፍሰት" : "Cash Flow" },
              { id: "ar-aging", label: isAmharic ? "ተሰብሳቢ ዕድሜ" : "AR Aging" },
              { id: "ap-aging", label: isAmharic ? "ተከፋይ ዕድሜ" : "AP Aging" },
              { id: "budget", label: isAmharic ? "በጀት ከወጪ" : "Budget vs Actual" },
              { id: "cash-14", label: isAmharic ? "14 የጥሬ ገንዘብ ሪፖርቶች" : "Cash Collection & Payment (14)" },
              { id: "ar-ap-12", label: isAmharic ? "12 የAR እና AP ሪፖርቶች" : "AR & AP Reports (12)" },
              { id: "budget-14", label: isAmharic ? "14 የበጀት እና ወጪ ሪፖርቶች" : "Budget & Cost Control (14)" },
              { id: "cashflow-7", label: isAmharic ? "7 የገንዘብ ፍሰት እና ትንበያ ሪፖርቶች" : "Cash Flow & Forecasting (7)" },
              { id: "bank-7", label: isAmharic ? "7 የባንክና ማስታረቂያ ሪፖርቶች" : "Bank & Reconciliation (7)" },
              { id: "statements-8", label: isAmharic ? "8 የፋይናንስ መግለጫዎች (Part 7)" : "Financial Statements (8)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border transition ${
                  reportTab === tab.id
                    ? "bg-red-600 text-white border-red-500"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {reportTab === "cash-14" ? (
            <CashReportsCenter isAmharic={isAmharic} state={state} />
          ) : reportTab === "ar-ap-12" ? (
            <ArApReportsCenter isAmharic={isAmharic} state={state} />
          ) : reportTab === "budget-14" && budgetState ? (
            <BudgetReportsCenter isAmharic={isAmharic} budgetState={budgetState} currency={cur} />
          ) : reportTab === "cashflow-7" && cashFlowState ? (
            <CashFlowReportsCenter isAmharic={isAmharic} cashFlowState={cashFlowState} />
          ) : reportTab === "bank-7" && bankState ? (
            <BankReportsCenter isAmharic={isAmharic} bankState={bankState} onLogAction={onLogAction} />
          ) : reportTab === "statements-8" && statementsState ? (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["income-statement", "Income Statement"],
                      ["balance-sheet", "Balance Sheet"],
                      ["cash-flow-statement", "Cash Flow Statement"],
                      ["changes-in-equity", "Changes in Equity"],
                      ["trial-balance", "Trial Balance"],
                      ["general-ledger", "General Ledger"],
                      ["accounts-receivable-report", "AR Report"],
                      ["accounts-payable-report", "AP Report"],
                    ] as [Part7StatementTypeId, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActivePart7Statement(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer whitespace-nowrap ${
                        activePart7Statement === id
                          ? "bg-red-600 text-white border-red-500"
                          : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportPart7StatementToExcel({
                      state: statementsState,
                      preparedBy: actorName,
                    });
                    onLogAction?.("Export Complete 8-Statement Package", "Financial Reports Hub");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet size={13} />
                  <span>Export 8-Sheet Excel (.xlsx)</span>
                </button>
              </div>
              <PrintableFinancialStatementSheet
                state={statementsState}
                activeStatement={activePart7Statement}
                isAmharic={isAmharic}
                actorName={actorName}
              />
            </div>
          ) : (
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-slate-900 pb-4 gap-3">
              <div>
                <h3 className="text-lg font-black tracking-tight">DIGITAL CONSTRUCTION ERP — FINANCIAL REPORT</h3>
                <p className="text-xs text-slate-600 font-semibold">
                  Period: {state.resolvedRange.startDate} to {state.resolvedRange.endDate} ({state.resolvedRange.label})
                </p>
              </div>
              <div className="text-xs text-slate-600 sm:text-right font-mono">
                <div>Currency: {cur}</div>
                <div>Generated by: {actorName} ({actorRole})</div>
              </div>
            </div>

            {reportTab === "summary" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  ["Planned Revenue", metrics.plannedRevenue],
                  ["Actual Revenue (Accrual)", metrics.actualRevenue],
                  ["Planned Expenses", metrics.plannedExpenses],
                  ["Actual Expenses (Accrual)", metrics.actualExpenses],
                  ["Planned Cash Collection", metrics.plannedCashCollection],
                  ["Actual Cash Collection", metrics.actualCashCollection],
                  ["Planned Cash Payment", metrics.plannedCashPayment],
                  ["Actual Cash Payment", metrics.actualCashPayment],
                  ["Outstanding Receivables", metrics.outstandingReceivables],
                  ["Overdue Receivables", metrics.overdueReceivables],
                  ["Outstanding Payables", metrics.outstandingPayables],
                  ["Overdue Payables", metrics.overduePayables],
                  ["Net Profit / (Loss)", metrics.actualProfitOrLoss],
                  ["Available Cash + Bank Liquidity", metrics.currentLiquidityPosition],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-semibold text-slate-700">{label}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">{formatCurrency(val, cur)}</span>
                  </div>
                ))}
              </div>
            )}

            {reportTab === "pnl" && (
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-300">Period</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Planned Profit</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Actual Profit / Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.charts.profitLossTrends.map((row) => (
                    <tr key={row.periodLabel}>
                      <td className="py-2 px-3 font-mono">{row.periodLabel}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.plannedProfit, cur)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(row.actualProfit, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportTab === "cashflow" && (
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-300">Period</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Cash Inflow</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Cash Outflow</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Net Cash Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.charts.cashFlowTrends.map((row) => (
                    <tr key={row.periodLabel}>
                      <td className="py-2 px-3 font-mono">{row.periodLabel}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.cashInflow, cur)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.cashOutflow, cur)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(row.netCashFlow, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(reportTab === "ar-aging" || reportTab === "ap-aging") && (
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-300">Aging Bucket</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Open Items</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Outstanding Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(reportTab === "ar-aging" ? state.agingReceivables : state.agingPayables).map((b) => (
                    <tr key={b.label}>
                      <td className="py-2 px-3 font-bold">{b.label}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{b.count}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(b.amount, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportTab === "budget" && (
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead className="bg-slate-100 font-bold uppercase">
                  <tr>
                    <th className="py-2.5 px-3 border-b border-slate-300">Budget Center</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Allocated</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Actual</th>
                    <th className="py-2.5 px-3 border-b border-slate-300 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {state.charts.budgetVsActual.map((row) => (
                    <tr key={row.name}>
                      <td className="py-2 px-3 font-bold">{row.name}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.allocated, cur)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.actual, cur)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatCurrency(row.remaining, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}
        </>
      )}

      {/* 16. FINANCIAL NOTIFICATIONS */}
      {mode === "financial-notifications" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-red-400">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isAmharic ? "16. የፋይናንስ ማንቂያዎች (Financial Notifications)" : "16. Critical Financial Notifications & Alerts"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic ? "ጊዜው ያለፈበት AR/AP፣ ዝቅተኛ ሊኩዲቲ እና የበጀት ወሰን ማለፍ ማንቂያዎች" : "Live automated alerts for overdue receivables/payables, low cash thresholds, negative cash flow, and budget overruns."}
              </p>
            </div>
          </div>

          {combinedAlerts.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "ምንም አስቸኳይ የፋይናንስ ማንቂያ የለም" : "All Financial Thresholds Healthy"}
              </h3>
              <p className="text-xs text-slate-400">
                {isAmharic ? "ሁሉም የክፍያ ገደቦች እና ሊኩዲቲ በጤናማ ሁኔታ ላይ ናቸው።" : "No overdue balances, budget overruns, or low liquidity conditions detected."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {combinedAlerts.map((al) => {
                const acked = acknowledgedIds.has(al.id);
                return (
                  <div
                    key={al.id}
                    className={`bg-slate-950 border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      al.severity === "CRITICAL" ? "border-red-900/70" : "border-amber-900/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        size={18}
                        className={al.severity === "CRITICAL" ? "text-red-400 shrink-0 mt-0.5" : "text-amber-400 shrink-0 mt-0.5"}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {isAmharic ? al.titleAm : al.title}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-slate-400">· {al.severity}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAmharic ? al.descriptionAm : al.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onNavigateModule(al.moduleTarget)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 cursor-pointer whitespace-nowrap"
                      >
                        {isAmharic ? "ሞጁል ክፈት" : "Open Module"}
                      </button>
                      {permissions.canAcknowledgeAlerts && (
                        <button
                          type="button"
                          disabled={acked}
                          onClick={() => handleDispatchAlertToDirectors(al)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <Send size={12} />
                          <span>{acked ? (isAmharic ? "ተልኳል" : "Dispatched") : (isAmharic ? "ለዳይሬክተር ላክ" : "Notify Director")}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 17. FINANCIAL SETTINGS */}
      {mode === "financial-settings" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isAmharic ? "17. የፋይናንስ ቅንብሮች (Financial Settings)" : "17. Financial Governance & Settings"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic ? "ምንዛሬ፣ የበጀት ዓመት መጀመሪያ እና የአስቸኳይ ማንቂያ ገደቦች" : "Configure default reporting currency, fiscal calendar, alert thresholds, and director approval limits."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
            {!permissions.canManageSettings && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 flex items-center gap-2 font-bold">
                <Lock size={14} />
                <span>
                  {isAmharic
                    ? "ቅንብሮችን መቀየር የሚችለው የፋይናንስ ስራ አስኪያጅ ወይም ዳይሬክተር ብቻ ነው።"
                    : "Read-only view: Only Finance Manager or Director may modify global financial settings."}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Default Currency</label>
                <input
                  type="text"
                  disabled={!permissions.canManageSettings}
                  value={settingsForm.defaultCurrency}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultCurrency: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Fiscal Year Start Month (1-12)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  disabled={!permissions.canManageSettings}
                  value={settingsForm.fiscalYearStartMonth}
                  onChange={(e) => setSettingsForm({ ...settingsForm, fiscalYearStartMonth: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Default Payment Terms (Days)</label>
                <input
                  type="number"
                  min={0}
                  disabled={!permissions.canManageSettings}
                  value={settingsForm.defaultPaymentTermsDays}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultPaymentTermsDays: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Low Liquidity Alert Threshold ({cur})</label>
                <input
                  type="number"
                  min={0}
                  disabled={!permissions.canManageSettings}
                  value={settingsForm.lowCashAlertThresholdEtb}
                  onChange={(e) => setSettingsForm({ ...settingsForm, lowCashAlertThresholdEtb: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Budget Overrun Alert (%)</label>
                <input
                  type="number"
                  min={1}
                  disabled={!permissions.canManageSettings}
                  value={settingsForm.budgetOverrunAlertPct}
                  onChange={(e) => setSettingsForm({ ...settingsForm, budgetOverrunAlertPct: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Director Approval Limit ({cur})</label>
                <input
                  type="number"
                  min={0}
                  disabled={!permissions.canManageSettings}
                  value={settingsForm.requireDirectorApprovalAboveEtb}
                  onChange={(e) => setSettingsForm({ ...settingsForm, requireDirectorApprovalAboveEtb: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono disabled:opacity-60"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!permissions.canManageSettings}
                checked={settingsForm.enableCriticalAlerts}
                onChange={(e) => setSettingsForm({ ...settingsForm, enableCriticalAlerts: e.target.checked })}
                className="accent-red-600"
              />
              <span className="text-slate-300 font-semibold">
                {isAmharic ? "አስቸኳይ የፋይናንስ ማንቂያዎችን በራስ-ሰር አንቃ" : "Enable Automated Critical Financial Alerts (Overdue, Budget Overrun & Low Cash)"}
              </span>
            </label>

            {permissions.canManageSettings && (
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? "..." : isAmharic ? "ቅንብሮችን አስቀምጥ" : "Save Financial Settings"}
                </button>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
};
