import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  Download,
  FileSpreadsheet,
  FilterX,
  Landmark,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BankReconciliationRecord,
  BankStatementLineItem,
  CashFlowForecastItem,
  CashFlowForecastSource,
  CashInflowCategory,
  CashOutflowCategory,
  CashTransactionRecord,
  FinancialAccount,
  FinancialMenuModuleId,
} from "../../types";
import {
  advanceBankReconciliationStatus,
  advanceCashFlowForecastStatus,
  CASH_FLOW_GRANULARITIES,
  CASH_INFLOW_CATEGORIES,
  CASH_OUTFLOW_CATEGORIES,
  computeBankReconciliationSummary,
  createCashFlowForecastItem,
  createOrSaveBankReconciliation,
  generateCashFlowRef,
  Part5CashFlowState,
  Part5FilterState,
} from "../../services/cashFlowForecastService";
import { exportRowsToCsv, transferBetweenCashBankAccounts } from "../../services/financeService";
import { DbService } from "../../services/db";
import { formatCurrency, parseMoney } from "../../utils/formatters";
import { CashFlowReportsCenter } from "./CashFlowReportsCenter";

interface CashFlowForecastingModuleProps {
  isAmharic: boolean;
  cashFlowState: Part5CashFlowState;
  filterState: Part5FilterState;
  onFilterChange: (next: Part5FilterState) => void;
  onResetFilters: () => void;
  rawAccounts: FinancialAccount[];
  rawCashTransactions: CashTransactionRecord[];
  rawForecastItems: CashFlowForecastItem[];
  rawReconciliations: BankReconciliationRecord[];
  defaultSubTab?: CashFlowSubTab;
  actorName: string;
  actorRole: string;
  actorUid: string;
  onNavigateModule: (moduleId: FinancialMenuModuleId) => void;
  onLogAction?: (action: string, details: string) => void;
}

export type CashFlowSubTab =
  | "dashboard"
  | "inflows-outflows"
  | "forecasting"
  | "reconciliation"
  | "shortages-alerts"
  | "reports";

export const CashFlowForecastingModule: React.FC<CashFlowForecastingModuleProps> = ({
  isAmharic,
  cashFlowState,
  filterState,
  onFilterChange,
  onResetFilters,
  rawAccounts,
  rawCashTransactions,
  rawForecastItems,
  rawReconciliations,
  defaultSubTab = "dashboard",
  actorName,
  actorRole,
  actorUid,
  onNavigateModule,
  onLogAction,
}) => {
  const [subTab, setSubTab] = useState<CashFlowSubTab>(defaultSubTab);
  const [toast, setToast] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Explicit Cash Flow Forecast Modal State
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [forecastForm, setForecastForm] = useState<{
    direction: "Inflow" | "Outflow";
    category: CashInflowCategory | CashOutflowCategory;
    project: string;
    accountId: string;
    expectedDate: string;
    amount: string;
    counterparty: string;
    sourceType: CashFlowForecastSource;
    linkedReferenceNo: string;
    probabilityPct: string;
    notes: string;
    submitForApproval: boolean;
  }>({
    direction: "Inflow",
    category: "Client Payments",
    project: cashFlowState.filterOptions.projects[0] || "Corporate Construction",
    accountId: rawAccounts[0]?.id || "",
    expectedDate: cashFlowState.referenceToday,
    amount: "",
    counterparty: "",
    sourceType: "Expected Client Collection",
    linkedReferenceNo: "",
    probabilityPct: "90",
    notes: "",
    submitForApproval: true,
  });

  // Bank Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromId: rawAccounts[0]?.id || "",
    toId: rawAccounts[1]?.id || "",
    amount: "",
    date: cashFlowState.referenceToday,
    project: "Corporate Treasury",
    notes: "",
  });

  // Bank Reconciliation Modal State
  const [showReconModal, setShowReconModal] = useState(false);
  const [reconForm, setReconForm] = useState<{
    accountId: string;
    periodStart: string;
    periodEnd: string;
    statementOpeningBalance: string;
    statementClosingBalance: string;
    notes: string;
    manualMatchedTxIds: string[];
    statementLines: BankStatementLineItem[];
    newLineDate: string;
    newLineRef: string;
    newLineDesc: string;
    newLineDir: "Credit" | "Debit";
    newLineAmount: string;
  }>({
    accountId: rawAccounts[0]?.id || "",
    periodStart: `${cashFlowState.referenceToday.slice(0, 7)}-01`,
    periodEnd: cashFlowState.referenceToday,
    statementOpeningBalance: "0",
    statementClosingBalance: String(rawAccounts[0]?.currentBalance ?? 0),
    notes: "",
    manualMatchedTxIds: [],
    statementLines: [],
    newLineDate: cashFlowState.referenceToday,
    newLineRef: "",
    newLineDesc: "",
    newLineDir: "Credit",
    newLineAmount: "",
  });

  const cur = cashFlowState.currency || "ETB";
  const { kpis, permissions, charts } = cashFlowState;
  const canCreate = permissions.canManageTransactions || permissions.canManageBudgets || permissions.isDirector;
  const canApprove = permissions.canApproveTransactions || permissions.isFinanceManager || permissions.isDirector;

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Live Bank Reconciliation Preview inside Modal
  const selectedReconAccount = useMemo(
    () => rawAccounts.find((a) => a.id === reconForm.accountId) || rawAccounts[0] || null,
    [rawAccounts, reconForm.accountId]
  );

  const reconPreview = useMemo(() => {
    if (!selectedReconAccount) return null;
    return computeBankReconciliationSummary({
      account: selectedReconAccount,
      periodStart: reconForm.periodStart,
      periodEnd: reconForm.periodEnd,
      statementOpeningBalance: parseMoney(reconForm.statementOpeningBalance) ?? 0,
      statementClosingBalance: parseMoney(reconForm.statementClosingBalance) ?? 0,
      cashTransactions: rawCashTransactions,
      manualMatchedTxIds: reconForm.manualMatchedTxIds,
      statementLines: reconForm.statementLines,
      referenceToday: cashFlowState.referenceToday,
    });
  }, [selectedReconAccount, reconForm, rawCashTransactions, cashFlowState.referenceToday]);

  const handleCreateForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    setSaving(true);
    try {
      const selectedAcc = rawAccounts.find((a) => a.id === forecastForm.accountId);
      await createCashFlowForecastItem({
        direction: forecastForm.direction,
        category: forecastForm.category,
        project: forecastForm.project,
        accountId: selectedAcc?.id,
        accountName: selectedAcc?.accountName,
        expectedDate: forecastForm.expectedDate,
        amount: parseMoney(forecastForm.amount) ?? 0,
        counterparty: forecastForm.counterparty,
        sourceType: forecastForm.sourceType,
        linkedReferenceNo: forecastForm.linkedReferenceNo || undefined,
        probabilityPct: Number(forecastForm.probabilityPct || 90),
        notes: forecastForm.notes,
        submitForApproval: forecastForm.submitForApproval,
        existingForecasts: rawForecastItems,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(
        "Create Cash Flow Forecast",
        `${forecastForm.direction} ${forecastForm.category} (${forecastForm.project}) ETB ${forecastForm.amount}`
      );
      setShowForecastModal(false);
      notify(isAmharic ? "የገንዘብ ፍሰት ትንበያ ተመዝግቧል።" : "Cash flow forecast item saved.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to create forecast item.");
    } finally {
      setSaving(false);
    }
  };

  const handleForecastStatusAction = async (
    item: CashFlowForecastItem,
    nextStatus: "Submitted" | "Approved" | "Rejected"
  ) => {
    setErrMsg(null);
    setSaving(true);
    try {
      await advanceCashFlowForecastStatus({
        item,
        nextStatus,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(`Cash Forecast ${nextStatus}`, `${item.forecastRef} marked ${nextStatus}`);
      notify(`Forecast ${item.forecastRef} updated to ${nextStatus}.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to update forecast status.");
    } finally {
      setSaving(false);
    }
  };

  const handleTransferFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    const fromAcc = rawAccounts.find((a) => a.id === transferForm.fromId);
    const toAcc = rawAccounts.find((a) => a.id === transferForm.toId);
    const amt = parseMoney(transferForm.amount) ?? 0;
    if (!fromAcc || !toAcc || fromAcc.id === toAcc.id || amt <= 0) {
      setErrMsg("Select two distinct accounts and enter a positive transfer amount.");
      return;
    }
    setSaving(true);
    try {
      await transferBetweenCashBankAccounts({
        fromAccount: fromAcc,
        toAccount: toAcc,
        amount: amt,
        date: transferForm.date,
        project: transferForm.project,
        notes: transferForm.notes,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(
        "Cash & Bank Account Transfer",
        `Transferred ETB ${amt.toLocaleString()} from ${fromAcc.accountName} to ${toAcc.accountName}`
      );
      setShowTransferModal(false);
      notify(isAmharic ? "የሂሳብ ዝውውር ተፈጽሟል።" : "Inter-account cash transfer executed.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to transfer funds.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStatementLine = () => {
    const amt = parseMoney(reconForm.newLineAmount) ?? 0;
    if (amt <= 0 || !reconForm.newLineDesc.trim()) return;
    const newLine: BankStatementLineItem = {
      id: generateCashFlowRef("BSL"),
      statementDate: reconForm.newLineDate,
      bankReferenceNo: reconForm.newLineRef.trim(),
      description: reconForm.newLineDesc.trim(),
      direction: reconForm.newLineDir,
      amount: amt,
      matchStatus: "Unmatched",
    };
    setReconForm((prev) => ({
      ...prev,
      statementLines: [...prev.statementLines, newLine],
      newLineRef: "",
      newLineDesc: "",
      newLineAmount: "",
    }));
  };

  const handleSaveReconciliation = async (submitForSignoff: boolean) => {
    if (!selectedReconAccount) return;
    setErrMsg(null);
    setSaving(true);
    try {
      const saved = await createOrSaveBankReconciliation({
        account: selectedReconAccount,
        periodStart: reconForm.periodStart,
        periodEnd: reconForm.periodEnd,
        statementOpeningBalance: parseMoney(reconForm.statementOpeningBalance) ?? 0,
        statementClosingBalance: parseMoney(reconForm.statementClosingBalance) ?? 0,
        cashTransactions: rawCashTransactions,
        manualMatchedTxIds: reconForm.manualMatchedTxIds,
        statementLines: reconForm.statementLines,
        notes: reconForm.notes,
        submitForSignoff,
        existingReconciliations: rawReconciliations,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(
        "Bank Statement Reconciliation",
        `${saved.reconciliationNo} on ${saved.accountName} (${saved.approvalStatus})`
      );
      setShowReconModal(false);
      notify(
        isAmharic
          ? `የባንክ ማመሳከሪያ ${saved.reconciliationNo} ተቀምጧል።`
          : `Bank reconciliation ${saved.reconciliationNo} saved (${saved.approvalStatus}).`
      );
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save bank reconciliation.");
    } finally {
      setSaving(false);
    }
  };

  const handleReconciliationStatusAction = async (
    rec: BankReconciliationRecord,
    nextStatus: "Reconciled" | "Disputed"
  ) => {
    setErrMsg(null);
    setSaving(true);
    try {
      await advanceBankReconciliationStatus({
        record: rec,
        nextStatus,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(`Bank Reconciliation ${nextStatus}`, `${rec.reconciliationNo} (${rec.accountName})`);
      notify(`Reconciliation ${rec.reconciliationNo} updated to ${nextStatus}.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to update reconciliation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5" id="part5-cash-flow-module">
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
            <RefreshCw size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic
                ? "12. የገንዘብ ፍሰት አስተዳደር እና የፋይናንስ ትንበያ (Part 5)"
                : "12. Cash Flow Management & Financial Forecasting"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ትክክለኛ የጥሬ ገንዘብ ገቢና ወጪ፣ ዕለታዊ/ወርሃዊ/ሩብ ዓመት/ዓመታዊ ትንበያ እና የባንክ ማመሳከሪያ"
                : "Cash-basis inflow/outflow tracking, multi-horizon forecasting (Daily/Monthly/Quarterly/Annual), and bank reconciliation."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setShowForecastModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>{isAmharic ? "የገንዘብ ትንበያ ጨምር" : "Add Forecast Entry"}</span>
            </button>
          )}
          {permissions.canManageAccounts && rawAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setReconForm((prev) => ({
                  ...prev,
                  accountId: rawAccounts[0].id,
                  statementClosingBalance: String(rawAccounts[0].currentBalance ?? 0),
                }));
                setShowReconModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ClipboardCheck size={14} className="text-emerald-400" />
              <span>{isAmharic ? "የባንክ ማመሳከሪያ" : "Reconcile Bank"}</span>
            </button>
          )}
          {permissions.canManageAccounts && rawAccounts.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setTransferForm((prev) => ({
                  ...prev,
                  fromId: rawAccounts[0].id,
                  toId: rawAccounts[1].id,
                }));
                setShowTransferModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight size={14} />
              <span>{isAmharic ? "ዝውውር" : "Transfer"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banners */}
      {toast && (
        <div className="bg-emerald-950/70 border border-emerald-700 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {errMsg && (
        <div className="bg-red-950/70 border border-red-700 text-red-200 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <span>{errMsg}</span>
        </div>
      )}

      {/* Interactive Filters: Project, Bank Account, Financial Year, Granularity, Date Range, Search */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              {isAmharic ? "ፕሮጀክት" : "Project"}
            </label>
            <select
              value={filterState.project}
              onChange={(e) => onFilterChange({ ...filterState, project: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
              {cashFlowState.filterOptions.projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              {isAmharic ? "የባንክ / ጥሬ ገንዘብ ሂሳብ" : "Bank / Cash Account"}
            </label>
            <select
              value={filterState.bankAccountId}
              onChange={(e) => onFilterChange({ ...filterState, bankAccountId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ሂሳቦች (ጥምር)" : "All Accounts (Consolidated)"}</option>
              {cashFlowState.filterOptions.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} ({a.accountType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              {isAmharic ? "የትንበያ እይታ" : "Horizon / Granularity"}
            </label>
            <select
              value={filterState.granularity}
              onChange={(e) =>
                onFilterChange({ ...filterState, granularity: e.target.value as any })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
            >
              {CASH_FLOW_GRANULARITIES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              {isAmharic ? "የበጀት ዓመት" : "Financial Year"}
            </label>
            <select
              value={filterState.financialYear}
              onChange={(e) => onFilterChange({ ...filterState, financialYear: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">{isAmharic ? "ሁሉም ዓመታት" : "All Years"}</option>
              {cashFlowState.filterOptions.financialYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              {isAmharic ? "መነሻ ቀን" : "Start Date"}
            </label>
            <input
              type="date"
              value={filterState.startDate}
              onChange={(e) => onFilterChange({ ...filterState, startDate: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              {isAmharic ? "መጨረሻ ቀን" : "End Date"}
            </label>
            <input
              type="date"
              value={filterState.endDate}
              onChange={(e) => onFilterChange({ ...filterState, endDate: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filterState.searchTerm}
              onChange={(e) => onFilterChange({ ...filterState, searchTerm: e.target.value })}
              placeholder={
                isAmharic
                  ? "በማጣቀሻ ቁጥር፣ በደንበኛ፣ በአቅራቢ ወይም በፕሮጀክት ፈልግ..."
                  : "Search by Ref #, Customer, Supplier, Project, or Bank Ref..."
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
          >
            <FilterX size={13} />
            <span>{isAmharic ? "ማጣሪያዎችን ዳግም አስጀምር" : "Reset Filters"}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            id: "dashboard",
            label: isAmharic ? "ዳሽቦርድ እና ግራፎች" : "Cash Flow Dashboard",
            icon: BarChart3,
          },
          {
            id: "inflows-outflows",
            label: isAmharic ? "የጥሬ ገንዘብ ገቢና ወጪ" : "Inflows & Outflows Monitor",
            icon: ArrowLeftRight,
          },
          {
            id: "forecasting",
            label: isAmharic
              ? `የገንዘብ ፍሰት ትንበያ (${cashFlowState.projectedLines.length})`
              : `Forecasting Engine (${cashFlowState.projectedLines.length})`,
            icon: TrendingUp,
          },
          {
            id: "reconciliation",
            label: isAmharic
              ? `የባንክ ማመሳከሪያ (${cashFlowState.scopedReconciliations.length})`
              : `Bank Reconciliation (${cashFlowState.scopedReconciliations.length})`,
            icon: Landmark,
          },
          {
            id: "shortages-alerts",
            label: isAmharic
              ? `እጥረት እና ማንቂያ (${cashFlowState.alerts.length})`
              : `Shortages & Alerts (${cashFlowState.alerts.length})`,
            icon: AlertTriangle,
          },
          {
            id: "reports",
            label: isAmharic ? "7 የገንዘብ ፍሰት ሪፖርቶች" : "Cash Flow Reports (7)",
            icon: FileSpreadsheet,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as CashFlowSubTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap ${
                active
                  ? "bg-cyan-600 text-white border-cyan-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: DASHBOARD & 5 CHARTS                                       */}
      {/* ===================================================================== */}
      {subTab === "dashboard" && (
        <div className="space-y-5">
          {/* 7 Required Financial Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "ያለው ጥሬ ገንዘብ" : "Available Cash Balance"}
              </span>
              <span
                className={`text-base font-mono font-black tabular-nums mt-1 block ${
                  kpis.availableCashBalance < kpis.minimumBufferThreshold
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {formatCurrency(kpis.availableCashBalance, cur)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Bank: {formatCurrency(kpis.totalBankBalance, cur)}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "የሚጠበቅ ገቢ" : "Expected Inflows"}
              </span>
              <span className="text-base font-mono font-black text-cyan-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalExpectedInflows, cur)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Actual: {formatCurrency(kpis.actualCashInflow, cur)}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "የሚጠበቅ ወጪ" : "Expected Outflows"}
              </span>
              <span className="text-base font-mono font-black text-amber-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalExpectedOutflows, cur)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Actual: {formatCurrency(kpis.actualCashOutflow, cur)}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "የተጣራ የገንዘብ አቋም" : "Net Cash Position"}
              </span>
              <span
                className={`text-base font-mono font-black tabular-nums mt-1 block ${
                  kpis.netCashPosition >= 0 ? "text-blue-400" : "text-red-400"
                }`}
              >
                {formatCurrency(kpis.netCashPosition, cur)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Actual Net: {formatCurrency(kpis.actualNetCashFlow, cur)}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "የተተነበየ እጥረት" : "Forecast Cash Shortage"}
              </span>
              <span
                className={`text-base font-mono font-black tabular-nums mt-1 block ${
                  kpis.forecastCashShortage > 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(kpis.forecastCashShortage, cur)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {cashFlowState.shortageItems.length} alert period(s)
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "ያልተሰበሰበ ገቢ (AR)" : "Outstanding Receivables"}
              </span>
              <span className="text-base font-mono font-black text-indigo-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.outstandingReceivables, cur)}
              </span>
              <span className="text-[10px] text-red-400 mt-1 block">
                Overdue: {formatCurrency(kpis.overdueReceivables, cur)}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {isAmharic ? "መጪ ክፍያዎች (AP)" : "Upcoming Payables"}
              </span>
              <span className="text-base font-mono font-black text-rose-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.upcomingPayables, cur)}
              </span>
              <span className="text-[10px] text-amber-400 mt-1 block">
                Overdue: {formatCurrency(kpis.overduePayables, cur)}
              </span>
            </div>
          </div>

          {/* Core Cash Flow Formulas Rollup */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Net Cash Flow (Inflow − Outflow)
                </span>
                <span className="text-slate-300 text-[11px]">Strict cash basis (confirmed receipts & payments)</span>
              </div>
              <span
                className={`font-mono font-black tabular-nums text-sm ${
                  kpis.actualNetCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatCurrency(kpis.actualNetCashFlow, cur)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Closing Cash Balance (Opening + Net)
                </span>
                <span className="text-slate-300 text-[11px]">
                  Opening: {formatCurrency(kpis.openingCashBalance, cur)}
                </span>
              </div>
              <span className="font-mono font-black tabular-nums text-sm text-cyan-400">
                {formatCurrency(kpis.closingCashBalance, cur)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Cash Flow Variance (Actual − Forecast)
                </span>
                <span className="text-slate-300 text-[11px]">
                  Forecast Net: {formatCurrency(kpis.forecastNetCashFlow, cur)}
                </span>
              </div>
              <span
                className={`font-mono font-black tabular-nums text-sm ${
                  kpis.cashFlowVariance >= 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {formatCurrency(kpis.cashFlowVariance, cur)}
              </span>
            </div>
          </div>

          {/* 5 Interactive Cash Flow Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Monthly Cash Inflow vs Outflow */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isAmharic
                    ? "1. ወርሃዊ የጥሬ ገንዘብ ገቢ እና ወጪ"
                    : "1. Monthly Cash Inflow vs Outflow"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Confirmed receipts compared against paid cash disbursements by month
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlyInflowVsOutflow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, cur)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="actualInflow" name="Cash Inflow" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualOutflow" name="Cash Outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Actual vs Forecast Cash Flow */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isAmharic
                    ? "2. ትክክለኛ እና የተተነበየ የገንዘብ ፍሰት"
                    : `2. Actual vs Forecast Net Cash Flow (${filterState.granularity})`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tracks net cash performance and variance across the active horizon
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={charts.actualVsForecastCashFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, cur)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                    <Bar dataKey="actualNetCashFlow" name="Actual Net" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="forecastNetCashFlow" name="Forecast Net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="variance" name="Variance" stroke="#f43f5e" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Project Cash Flow */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isAmharic
                    ? "3. የፕሮጀክቶች የገንዘብ ፍሰት"
                    : "3. Project Cash Flow (Actual vs Expected)"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Per-project inflows, outflows, and pending cash expectations
                </p>
              </div>
              <div className="h-64">
                {charts.projectCashFlow.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No project cash flow activity in the selected window.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.projectCashFlow.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="project" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                        formatter={(v: any) => formatCurrency(v, cur)}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="actualInflow" name="Actual Inflow" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actualOutflow" name="Actual Outflow" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expectedInflow" name="Expected Inflow" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 4: Bank & Cash Balances */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {isAmharic ? "4. የባንክና ጥሬ ገንዘብ ቀሪዎች" : "4. Bank & Cash Account Balances"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Live account liquidity compared against minimum safety thresholds
                </p>
              </div>
              <div className="h-64">
                {charts.bankBalances.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No Cash or Bank accounts configured yet. Add accounts in Module 13.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.bankBalances}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="accountName" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                        formatter={(v: any) => formatCurrency(v, cur)}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="currentBalance" name="Current Balance" radius={[4, 4, 0, 0]}>
                        {charts.bankBalances.map((entry) => (
                          <Cell
                            key={entry.accountId}
                            fill={entry.isBelowThreshold ? "#ef4444" : "#10b981"}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="minimumThreshold" name="Min Threshold" fill="#475569" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Chart 5: Monthly Closing Cash Balance Trajectory */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <div className="mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                {isAmharic
                  ? "5. ወርሃዊ የመዝጊያ ጥሬ ገንዘብ ቀሪ ትንበያ"
                  : "5. Closing Cash Balance Trajectory (Actual & Forecast vs Buffer Threshold)"}
              </h3>
              <p className="text-[11px] text-slate-400">
                Cumulative cash trajectory highlighting projected dips below minimum liquidity buffer
              </p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyClosingBalance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                    formatter={(v: any) => formatCurrency(v, cur)}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <ReferenceLine
                    y={kpis.minimumBufferThreshold}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: "Min Buffer", fill: "#ef4444", fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="closingBalance"
                    name="Actual Closing Balance"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="projectedClosingBalance"
                    name="Projected Closing Balance"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: CASH INFLOWS & OUTFLOWS MONITOR                            */}
      {/* ===================================================================== */}
      {subTab === "inflows-outflows" && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>
                {isAmharic
                  ? "ጥብቅ የጥሬ ገንዘብ መርህ፡ ያልተከፈሉ ደረሰኞች (Unpaid Invoices/Bills) እስኪከፈሉ ድረስ እንደ ትክክለኛ የገንዘብ ፍሰት አይቆጠሩም።"
                  : "Cash-Basis Accounting Integrity: Unpaid AR invoices and unpaid AP bills are strictly excluded from actual cash movements until payment is confirmed."}
              </span>
            </div>
            <button
              type="button"
              disabled={cashFlowState.actualEntries.length === 0}
              onClick={() => exportRowsToCsv("actual_cash_flow_ledger", cashFlowState.actualEntries)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              <Download size={13} />
              <span>Export Ledger</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 4 Cash Inflow Categories */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ArrowDownLeft size={15} />
                  <span>Cash Inflows (4 Categories)</span>
                </h3>
                <span className="font-mono text-xs font-black text-white tabular-nums">
                  {formatCurrency(kpis.actualCashInflow, cur)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {cashFlowState.inflowCategoryTotals.map((row) => (
                  <div
                    key={row.category}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-white block">{row.category}</span>
                      <span className="text-[10px] text-slate-400">
                        Forecast Expected: {formatCurrency(row.forecast, cur)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-cyan-400 tabular-nums">
                      {formatCurrency(row.actual, cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 7 Cash Outflow Categories */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <ArrowUpRight size={15} />
                  <span>Cash Outflows (7 Categories)</span>
                </h3>
                <span className="font-mono text-xs font-black text-white tabular-nums">
                  {formatCurrency(kpis.actualCashOutflow, cur)}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                {cashFlowState.outflowCategoryTotals.map((row) => (
                  <div
                    key={row.category}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-white block">{row.category}</span>
                      <span className="text-[10px] text-slate-400">
                        Forecast Expected: {formatCurrency(row.forecast, cur)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-400 tabular-nums">
                      {formatCurrency(row.actual, cur)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Verified Cash Movements Ledger */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Confirmed Cash Flow Transactions ({cashFlowState.actualEntries.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ref #</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Counterparty</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {cashFlowState.actualEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        No confirmed cash receipts or disbursements recorded in the selected window.
                      </td>
                    </tr>
                  ) : (
                    cashFlowState.actualEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{entry.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {entry.referenceNo}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              entry.direction === "Inflow"
                                ? "bg-cyan-950/60 text-cyan-300 border-cyan-800"
                                : "bg-amber-950/60 text-amber-300 border-amber-800"
                            }`}
                          >
                            {entry.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{entry.category}</td>
                        <td className="py-2.5 px-3 text-slate-300">{entry.project}</td>
                        <td className="py-2.5 px-3">{entry.counterparty}</td>
                        <td className="py-2.5 px-3 text-slate-400">{entry.accountName}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-black tabular-nums ${
                            entry.direction === "Inflow" ? "text-cyan-400" : "text-amber-400"
                          }`}
                        >
                          {entry.direction === "Inflow" ? "+" : "−"}
                          {formatCurrency(entry.amount, cur)}
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

      {/* ===================================================================== */}
      {/* SUB-TAB 3: CASH FLOW FORECASTING ENGINE                               */}
      {/* ===================================================================== */}
      {subTab === "forecasting" && (
        <div className="space-y-5">
          {/* Chronological Forecast Schedule */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  {filterState.granularity} Cash Flow Forecast & Balance Rollforward
                </h3>
                <p className="text-[11px] text-slate-400">
                  Closing Balance = Opening Balance + Net Cash Flow | Variance = Actual − Forecast
                </p>
              </div>
              <button
                type="button"
                disabled={cashFlowState.periodSeries.length === 0}
                onClick={() => exportRowsToCsv("cash_flow_forecast_rollforward", cashFlowState.periodSeries)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
              >
                <Download size={13} />
                <span>Export Schedule</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Opening Bal</th>
                    <th className="py-2.5 px-3 text-right">Act. Inflow</th>
                    <th className="py-2.5 px-3 text-right">Act. Outflow</th>
                    <th className="py-2.5 px-3 text-right">Fcst. Inflow</th>
                    <th className="py-2.5 px-3 text-right">Fcst. Outflow</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3 text-right">Projected Closing</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {cashFlowState.periodSeries.map((row) => (
                    <tr key={row.periodKey} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {row.periodLabel}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {formatCurrency(row.openingBalance, cur)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-400">
                        {formatCurrency(row.actualInflow, cur)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-400">
                        {formatCurrency(row.actualOutflow, cur)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-300">
                        {formatCurrency(row.forecastInflow, cur)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-300">
                        {formatCurrency(row.forecastOutflow, cur)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          row.cashFlowVariance >= 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {formatCurrency(row.cashFlowVariance, cur)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-black ${
                          row.projectedClosingBalance < 0
                            ? "text-red-400"
                            : row.isShortage
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {formatCurrency(row.projectedClosingBalance, cur)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            row.projectedClosingBalance < 0
                              ? "bg-red-950/70 text-red-300 border-red-800"
                              : row.isShortage
                              ? "bg-amber-950/70 text-amber-300 border-amber-800"
                              : "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                          }`}
                        >
                          {row.projectedClosingBalance < 0
                            ? "Deficit"
                            : row.isShortage
                            ? "Low Buffer"
                            : "Healthy"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explicit Saved Forecast Entries with Approval Workflow */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Registered Cash Flow Forecast Entries ({cashFlowState.explicitForecastItems.length})
              </h3>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setErrMsg(null);
                    setShowForecastModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Forecast</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Ref #</th>
                    <th className="py-2.5 px-3">Expected Date</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Counterparty</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {cashFlowState.explicitForecastItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No manual cash flow forecast entries registered yet. Live ERP data (AR, AP, Payroll, Plans, Budgets) is automatically projected below.
                      </td>
                    </tr>
                  ) : (
                    cashFlowState.explicitForecastItems.map((fc) => (
                      <tr key={fc.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {fc.forecastRef}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{fc.expectedDate}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              fc.direction === "Inflow"
                                ? "bg-cyan-950/60 text-cyan-300 border-cyan-800"
                                : "bg-amber-950/60 text-amber-300 border-amber-800"
                            }`}
                          >
                            {fc.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{fc.category}</td>
                        <td className="py-2.5 px-3">{fc.project}</td>
                        <td className="py-2.5 px-3">{fc.counterparty}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                          {formatCurrency(fc.amount, cur)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              fc.approvalStatus === "Approved"
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                                : fc.approvalStatus === "Rejected"
                                ? "bg-red-950/60 text-red-300 border-red-800"
                                : "bg-amber-950/60 text-amber-300 border-amber-800"
                            }`}
                          >
                            {fc.approvalStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            {fc.approvalStatus === "Draft" && canCreate && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleForecastStatusAction(fc, "Submitted")}
                                className="px-2 py-1 rounded-md bg-blue-950 hover:bg-blue-900 text-blue-300 text-[10px] font-bold cursor-pointer"
                              >
                                Submit
                              </button>
                            )}
                            {(fc.approvalStatus === "Submitted" || fc.approvalStatus === "Draft") &&
                              canApprove && (
                                <>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleForecastStatusAction(fc, "Approved")}
                                    className="px-2 py-1 rounded-md bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => handleForecastStatusAction(fc, "Rejected")}
                                    className="px-2 py-1 rounded-md bg-red-950 hover:bg-red-900 text-red-300 text-[10px] font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            {permissions.canDeleteTransactions && (
                              <button
                                type="button"
                                onClick={() => DbService.deleteCashFlowForecastItem(fc.id)}
                                className="p-1 rounded-md bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Automated Multi-Source Forecast Projection Lines */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Integrated ERP Forecast Drivers (AR, AP, Payroll, Plans & Budgets)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Expected Date</th>
                    <th className="py-2.5 px-3">Ref #</th>
                    <th className="py-2.5 px-3">Source Module</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Counterparty</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {cashFlowState.projectedLines.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        No open receivables, payables, payroll obligations, or approved forecasts in this date range.
                      </td>
                    </tr>
                  ) : (
                    cashFlowState.projectedLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono text-slate-300">{line.expectedDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {line.referenceNo}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">{line.sourceType}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              line.direction === "Inflow"
                                ? "bg-cyan-950/60 text-cyan-300 border-cyan-800"
                                : "bg-amber-950/60 text-amber-300 border-amber-800"
                            }`}
                          >
                            {line.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{line.category}</td>
                        <td className="py-2.5 px-3">{line.project}</td>
                        <td className="py-2.5 px-3">{line.counterparty}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                            line.direction === "Inflow" ? "text-cyan-400" : "text-amber-400"
                          }`}
                        >
                          {formatCurrency(line.amount, cur)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              line.isOverdue
                                ? "bg-red-950/60 text-red-300 border-red-800"
                                : "bg-slate-900 text-slate-300 border-slate-700"
                            }`}
                          >
                            {line.status}
                          </span>
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

      {/* ===================================================================== */}
      {/* SUB-TAB 4: BANK & CASH RECONCILIATION CONSOLE                         */}
      {/* ===================================================================== */}
      {subTab === "reconciliation" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">Bank Accounts Total</span>
              <span className="text-lg font-mono font-black text-blue-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalBankBalance, cur)}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">Petty Cash / Safes Total</span>
              <span className="text-lg font-mono font-black text-cyan-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalPettyCashBalance, cur)}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">
                  Reconciled Statements
                </span>
                <span className="text-lg font-mono font-black text-emerald-400 tabular-nums mt-1 block">
                  {cashFlowState.scopedReconciliations.filter((r) => r.approvalStatus === "Reconciled").length}{" "}
                  / {cashFlowState.scopedReconciliations.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateModule("cash-and-bank")}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Manage Accounts
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Bank Statement Reconciliation History
              </h3>
              {permissions.canManageAccounts && rawAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setErrMsg(null);
                    setReconForm((prev) => ({
                      ...prev,
                      accountId: rawAccounts[0].id,
                      statementClosingBalance: String(rawAccounts[0].currentBalance ?? 0),
                    }));
                    setShowReconModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Bank Reconciliation</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Recon #</th>
                    <th className="py-2.5 px-3">Bank / Cash Account</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3 text-right">Book Closing</th>
                    <th className="py-2.5 px-3 text-right">Statement Closing</th>
                    <th className="py-2.5 px-3 text-right">Matched</th>
                    <th className="py-2.5 px-3 text-right">Discrepancy</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {cashFlowState.scopedReconciliations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-500">
                        No bank statement reconciliations recorded yet. Click "New Bank Reconciliation" to match ERP ledger transactions against a bank statement.
                      </td>
                    </tr>
                  ) : (
                    cashFlowState.scopedReconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {rec.reconciliationNo}
                        </td>
                        <td className="py-2.5 px-3">{rec.accountName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {rec.periodStart} → {rec.periodEnd}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {formatCurrency(rec.bookClosingBalance, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {formatCurrency(rec.statementClosingBalance, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-400">
                          {rec.reconciledTxIds.length} tx
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                            Math.abs(rec.discrepancyAmount) > 0.01 ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {formatCurrency(rec.discrepancyAmount, cur)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              rec.approvalStatus === "Reconciled"
                                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                                : rec.approvalStatus === "Disputed"
                                ? "bg-red-950/60 text-red-300 border-red-800"
                                : "bg-amber-950/60 text-amber-300 border-amber-800"
                            }`}
                          >
                            {rec.approvalStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            {rec.approvalStatus !== "Reconciled" && canApprove && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleReconciliationStatusAction(rec, "Reconciled")}
                                className="px-2 py-1 rounded-md bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-bold cursor-pointer"
                              >
                                Finalize
                              </button>
                            )}
                            {rec.approvalStatus !== "Disputed" && canApprove && (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => handleReconciliationStatusAction(rec, "Disputed")}
                                className="px-2 py-1 rounded-md bg-amber-950 hover:bg-amber-900 text-amber-300 text-[10px] font-bold cursor-pointer"
                              >
                                Flag
                              </button>
                            )}
                            {permissions.canDeleteTransactions && (
                              <button
                                type="button"
                                onClick={() => DbService.deleteBankReconciliation(rec.id)}
                                className="p-1 rounded-md bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
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

      {/* ===================================================================== */}
      {/* SUB-TAB 5: CASH SHORTAGE PROJECTIONS & ALERTS                         */}
      {/* ===================================================================== */}
      {subTab === "shortages-alerts" && (
        <div className="space-y-5">
          {/* Active Alerts */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Active Cash Flow & Liquidity Alerts ({cashFlowState.alerts.length})
            </h3>
            {cashFlowState.alerts.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-400" />
                <div className="text-xs font-bold text-white">
                  {isAmharic ? "ምንም የገንዘብ ፍሰት እጥረት ማንቂያ የለም" : "Cash Position Healthy Across All Horizon Periods"}
                </div>
              </div>
            ) : (
              cashFlowState.alerts.map((al) => (
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
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          · {al.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isAmharic ? al.descriptionAm : al.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateModule(al.moduleTarget)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Open Module
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Shortage Schedule */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Projected Cash Shortage Windows ({cashFlowState.shortageItems.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Scope / Account</th>
                    <th className="py-2.5 px-3 text-right">Opening Bal</th>
                    <th className="py-2.5 px-3 text-right">Exp. Inflow</th>
                    <th className="py-2.5 px-3 text-right">Exp. Outflow</th>
                    <th className="py-2.5 px-3 text-right">Proj. Closing</th>
                    <th className="py-2.5 px-3 text-right">Shortfall</th>
                    <th className="py-2.5 px-3">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {cashFlowState.shortageItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No projected cash shortages in the active forecast window.
                      </td>
                    </tr>
                  ) : (
                    cashFlowState.shortageItems.map((sh) => (
                      <tr key={sh.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{sh.periodKey}</td>
                        <td className="py-2.5 px-3">
                          {sh.project} · {sh.accountName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {formatCurrency(sh.projectedOpeningBalance, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-400">
                          {formatCurrency(sh.expectedInflows, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-400">
                          {formatCurrency(sh.expectedOutflows, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-red-400">
                          {formatCurrency(sh.projectedClosingBalance, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black tabular-nums text-red-400">
                          {formatCurrency(sh.shortageAmount, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-300">
                          {isAmharic ? sh.recommendedActionAm : sh.recommendedAction}
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

      {/* ===================================================================== */}
      {/* SUB-TAB 6: 7 CASH FLOW REPORTS                                        */}
      {/* ===================================================================== */}
      {subTab === "reports" && (
        <CashFlowReportsCenter isAmharic={isAmharic} cashFlowState={cashFlowState} />
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD CASH FLOW FORECAST ENTRY                                 */}
      {/* ===================================================================== */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                {isAmharic ? "አዲስ የገንዘብ ፍሰት ትንበያ መዝግብ" : "Register Cash Flow Forecast Entry"}
              </h3>
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {errMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">
                {errMsg}
              </div>
            )}

            <form onSubmit={handleCreateForecast} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Direction *
                  </label>
                  <select
                    value={forecastForm.direction}
                    onChange={(e) => {
                      const dir = e.target.value as "Inflow" | "Outflow";
                      setForecastForm({
                        ...forecastForm,
                        direction: dir,
                        category:
                          dir === "Inflow" ? "Client Payments" : "Material Payments",
                        sourceType:
                          dir === "Inflow"
                            ? "Expected Client Collection"
                            : "Planned Project Expenditure",
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Inflow">Cash Inflow (Receipt)</option>
                    <option value="Outflow">Cash Outflow (Payment)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={forecastForm.category}
                    onChange={(e) =>
                      setForecastForm({ ...forecastForm, category: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    {(forecastForm.direction === "Inflow"
                      ? CASH_INFLOW_CATEGORIES
                      : CASH_OUTFLOW_CATEGORIES
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Project *
                  </label>
                  <input
                    type="text"
                    required
                    value={forecastForm.project}
                    onChange={(e) => setForecastForm({ ...forecastForm, project: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Counterparty *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Client / Supplier / Payroll Batch"
                    value={forecastForm.counterparty}
                    onChange={(e) =>
                      setForecastForm({ ...forecastForm, counterparty: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Expected Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={forecastForm.expectedDate}
                    onChange={(e) =>
                      setForecastForm({ ...forecastForm, expectedDate: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Amount ({cur}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={forecastForm.amount}
                    onChange={(e) => setForecastForm({ ...forecastForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Forecast Driver Source
                  </label>
                  <select
                    value={forecastForm.sourceType}
                    onChange={(e) =>
                      setForecastForm({
                        ...forecastForm,
                        sourceType: e.target.value as CashFlowForecastSource,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Manual Forecast">Manual Forecast</option>
                    <option value="Expected Client Collection">Expected Client Collection</option>
                    <option value="Outstanding Receivable">Outstanding Receivable</option>
                    <option value="Scheduled Supplier Payment">Scheduled Supplier Payment</option>
                    <option value="Payroll Obligation">Payroll Obligation</option>
                    <option value="Approved Project Budget">Approved Project Budget</option>
                    <option value="Planned Project Expenditure">Planned Project Expenditure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Bank / Cash Account (Optional)
                  </label>
                  <select
                    value={forecastForm.accountId}
                    onChange={(e) =>
                      setForecastForm({ ...forecastForm, accountId: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">All Accounts / Treasury</option>
                    {rawAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Linked Ref # (Duplicate Check)
                  </label>
                  <input
                    type="text"
                    value={forecastForm.linkedReferenceNo}
                    onChange={(e) =>
                      setForecastForm({ ...forecastForm, linkedReferenceNo: e.target.value })
                    }
                    placeholder="IPC-04 / PO-102"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Confidence %
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={forecastForm.probabilityPct}
                    onChange={(e) =>
                      setForecastForm({ ...forecastForm, probabilityPct: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={forecastForm.notes}
                  onChange={(e) => setForecastForm({ ...forecastForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={forecastForm.submitForApproval}
                  onChange={(e) =>
                    setForecastForm({ ...forecastForm, submitForApproval: e.target.checked })
                  }
                  className="accent-cyan-500"
                />
                <span className="text-slate-300 font-semibold">
                  {canApprove
                    ? "Immediately approve & activate in forecast model"
                    : "Submit to Finance Manager for approval"}
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForecastModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Forecast Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: BANK STATEMENT RECONCILIATION WORKBENCH                      */}
      {/* ===================================================================== */}
      {showReconModal && selectedReconAccount && reconPreview && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 text-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {isAmharic ? "የባንክ መግለጫ ማመሳከሪያ" : "Bank Statement Reconciliation Workbench"}
                </h3>
                <p className="text-xs text-slate-400">
                  Match ERP ledger transactions against commercial bank statements and resolve variances
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReconModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {errMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">
                {errMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Bank / Cash Account
                </label>
                <select
                  value={reconForm.accountId}
                  onChange={(e) => {
                    const acc = rawAccounts.find((a) => a.id === e.target.value);
                    setReconForm({
                      ...reconForm,
                      accountId: e.target.value,
                      statementClosingBalance: String(acc?.currentBalance ?? 0),
                      manualMatchedTxIds: [],
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {rawAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, cur)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Statement Start Date
                </label>
                <input
                  type="date"
                  value={reconForm.periodStart}
                  onChange={(e) => setReconForm({ ...reconForm, periodStart: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Statement End Date
                </label>
                <input
                  type="date"
                  value={reconForm.periodEnd}
                  onChange={(e) => setReconForm({ ...reconForm, periodEnd: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Statement Opening Balance ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={reconForm.statementOpeningBalance}
                  onChange={(e) =>
                    setReconForm({ ...reconForm, statementOpeningBalance: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Statement Closing Balance ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={reconForm.statementClosingBalance}
                  onChange={(e) =>
                    setReconForm({ ...reconForm, statementClosingBalance: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-center">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  Book vs Statement Variance
                </span>
                <span
                  className={`font-mono font-black text-sm tabular-nums ${
                    Math.abs(reconPreview.discrepancyAmount) > 0.01
                      ? "text-red-400"
                      : "text-emerald-400"
                  }`}
                >
                  {formatCurrency(reconPreview.discrepancyAmount, cur)}
                </span>
              </div>
            </div>

            {/* Book Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div>
                <span className="text-[10px] text-slate-400 block">Book Opening</span>
                <span className="font-mono font-bold text-white tabular-nums">
                  {formatCurrency(reconPreview.bookOpeningBalance, cur)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Book Inflows</span>
                <span className="font-mono font-bold text-cyan-400 tabular-nums">
                  +{formatCurrency(reconPreview.bookInflows, cur)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Book Outflows</span>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  −{formatCurrency(reconPreview.bookOutflows, cur)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Book Closing</span>
                <span className="font-mono font-black text-emerald-400 tabular-nums">
                  {formatCurrency(reconPreview.bookClosingBalance, cur)}
                </span>
              </div>
            </div>

            {/* Bank Statement Lines Entry */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-300">
                Add Bank Statement Lines (Auto-matches against ERP Ledger by Ref / Amount)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <input
                  type="date"
                  value={reconForm.newLineDate}
                  onChange={(e) => setReconForm({ ...reconForm, newLineDate: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Bank Ref #"
                  value={reconForm.newLineRef}
                  onChange={(e) => setReconForm({ ...reconForm, newLineRef: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={reconForm.newLineDesc}
                  onChange={(e) => setReconForm({ ...reconForm, newLineDesc: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white sm:col-span-2"
                />
                <select
                  value={reconForm.newLineDir}
                  onChange={(e) =>
                    setReconForm({ ...reconForm, newLineDir: e.target.value as "Credit" | "Debit" })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                >
                  <option value="Credit">Credit (+)</option>
                  <option value="Debit">Debit (−)</option>
                </select>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                    value={reconForm.newLineAmount}
                    onChange={(e) =>
                      setReconForm({ ...reconForm, newLineAmount: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddStatementLine}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-600 text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {reconPreview.reconciledStatementLines.length > 0 && (
                <div className="max-h-32 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950">
                  {reconPreview.reconciledStatementLines.map((line) => (
                    <div
                      key={line.id}
                      className="px-3 py-1.5 flex items-center justify-between text-[11px]"
                    >
                      <span>
                        <span className="font-mono text-slate-400">{line.statementDate}</span>{" "}
                        <span className="font-bold text-white">{line.description}</span>{" "}
                        {line.bankReferenceNo ? (
                          <span className="font-mono text-slate-500">({line.bankReferenceNo})</span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            line.direction === "Credit" ? "text-cyan-400" : "text-amber-400"
                          }`}
                        >
                          {line.direction === "Credit" ? "+" : "−"}
                          {formatCurrency(line.amount, cur)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            line.matchStatus === "Matched"
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {line.matchStatus}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* In-Period Book Cash Transactions Checklist */}
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-slate-300">
                ERP Book Transactions in Period ({reconPreview.accountCashTxs.length}) —{" "}
                <span className="text-emerald-400">
                  {reconPreview.matchedTxIds.length} Matched
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950">
                {reconPreview.accountCashTxs.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    No confirmed ledger transactions on this account within {reconForm.periodStart} → {reconForm.periodEnd}.
                  </div>
                ) : (
                  reconPreview.accountCashTxs.map((tx) => {
                    const checked = reconPreview.matchedTxIds.includes(tx.id);
                    return (
                      <label
                        key={tx.id}
                        className="px-3 py-2 flex items-center justify-between hover:bg-slate-900/50 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...reconForm.manualMatchedTxIds, tx.id]
                                : reconForm.manualMatchedTxIds.filter((id) => id !== tx.id);
                              setReconForm({ ...reconForm, manualMatchedTxIds: next });
                            }}
                            className="accent-emerald-500"
                          />
                          <span className="font-mono text-slate-400">{tx.date}</span>
                          <span className="font-mono font-bold text-white">{tx.referenceNo}</span>
                          <span className="text-slate-300">{tx.counterparty}</span>
                        </span>
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            tx.type === "Collection" || tx.toAccountId === selectedReconAccount.id
                              ? "text-cyan-400"
                              : "text-amber-400"
                          }`}
                        >
                          {formatCurrency(tx.amount, cur)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowReconModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveReconciliation(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveReconciliation(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {Math.abs(reconPreview.discrepancyAmount) > 0.01
                  ? "Submit Variance for Review"
                  : "Finalize Reconciliation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: INTER-ACCOUNT TRANSFER                                       */}
      {/* ===================================================================== */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                {isAmharic ? "በሂሳቦች መካከል የገንዘብ ዝውውር" : "Transfer Between Cash & Bank Accounts"}
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleTransferFunds} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  From Account *
                </label>
                <select
                  value={transferForm.fromId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {rawAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, cur)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  To Account *
                </label>
                <select
                  value={transferForm.toId}
                  onChange={(e) => setTransferForm({ ...transferForm, toId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {rawAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, cur)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Amount ({cur}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
