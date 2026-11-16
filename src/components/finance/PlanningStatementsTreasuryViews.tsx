import React, { useState } from "react";
import {
  ArrowLeftRight,
  Briefcase,
  CheckCircle2,
  Download,
  Landmark,
  Layers,
  Plus,
  Scale,
  Trash2,
  Wallet,
  X,
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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FinancialAccount,
  FinancialBudgetRecord,
  MonthlyFinancialTarget,
} from "../../types";
import {
  ComputedFinancialState,
  exportRowsToCsv,
  generateFinancialRef,
  transferBetweenCashBankAccounts,
} from "../../services/financeService";
import { DbService } from "../../services/db";
import { formatCurrency, parseMoney } from "../../utils/formatters";

interface PlanningStatementsTreasuryViewsProps {
  mode:
    | "budget-management"
    | "profit-and-loss"
    | "cash-flow"
    | "cash-and-bank"
    | "liquidity-management";
  isAmharic: boolean;
  state: ComputedFinancialState;
  rawAccounts: FinancialAccount[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  onOpenReconciliation?: () => void;
  onLogAction?: (action: string, details: string) => void;
}

export const PlanningStatementsTreasuryViews: React.FC<PlanningStatementsTreasuryViewsProps> = ({
  mode,
  isAmharic,
  state,
  rawAccounts,
  actorName,
  actorRole,
  actorUid,
  onOpenReconciliation,
  onLogAction,
}) => {
  const { metrics, permissions, settings, charts } = state;
  const cur = settings.defaultCurrency || "ETB";
  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);

  const [toast, setToast] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Budget & Monthly Targets modals
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    project: state.assignedProjects[0] || state.filterOptions.projects[0] || "",
    department: "Operations",
    category: "Material",
    period: currentMonth,
    allocated: "",
    committed: "",
    description: "",
  });

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetForm, setTargetForm] = useState({
    period: currentMonth,
    project: state.assignedProjects[0] || state.filterOptions.projects[0] || "",
    department: "All Departments",
    category: "Monthly Plan",
    plannedRevenue: "",
    plannedExpense: "",
    plannedCollection: "",
    plannedPayment: "",
    notes: "",
  });

  // Cash & Bank modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    accountName: "",
    accountType: "Bank" as "Cash" | "Bank",
    bankName: "",
    accountNumber: "",
    branch: "",
    openingBalance: "",
    minimumThreshold: "500000",
    project: "Corporate Treasury",
  });

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromId: rawAccounts[0]?.id || "",
    toId: rawAccounts[1]?.id || "",
    amount: "",
    date: today,
    project: "Corporate Treasury",
    notes: "",
  });

  const notifyToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageBudgets) return;
    const allocated = Number(budgetForm.allocated);
    const committed = Number(budgetForm.committed || 0);
    if (!budgetForm.project.trim() || isNaN(allocated) || allocated <= 0) {
      setErrMsg(isAmharic ? "እባክዎ ፕሮጀክት እና ትክክለኛ በጀት ያስገቡ።" : "Project and positive Allocated Budget are required.");
      return;
    }
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const budget: FinancialBudgetRecord = {
        id: `BGT-${Date.now()}`,
        project: budgetForm.project.trim(),
        department: budgetForm.department.trim() || "Operations",
        category: budgetForm.category,
        period: budgetForm.period,
        allocated,
        committed: isNaN(committed) ? 0 : committed,
        actual: 0,
        description: budgetForm.description.trim() || `${budgetForm.category} budget allocation`,
        status: "Active",
        updatedBy: actorName,
        updatedAt: nowIso,
      };
      await DbService.addProjectBudget(budget);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Save Financial Budget",
        category: "Finance",
        severity: "INFO",
        details: `Allocated ${cur} ${allocated.toLocaleString()} to ${budget.category} (${budget.project}).`,
      });
      onLogAction?.("Allocate Budget", `${budget.category} (${budget.project}) - ${cur} ${allocated.toLocaleString()}`);
      setShowBudgetModal(false);
      setErrMsg(null);
      notifyToast(isAmharic ? "የበጀት ምደባ ተቀምጧል።" : "Budget allocation saved to Firestore.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMonthlyTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageTargets) return;
    if (!targetForm.period || !targetForm.project.trim()) {
      setErrMsg(isAmharic ? "እባክዎ ወር እና ፕሮጀክት ያስገቡ።" : "Month period and Project are required.");
      return;
    }
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const target: MonthlyFinancialTarget = {
        id: `TGT-${Date.now()}`,
        period: targetForm.period,
        project: targetForm.project.trim(),
        department: targetForm.department.trim() || "All Departments",
        category: targetForm.category.trim() || "Monthly Plan",
        plannedRevenue: Number(targetForm.plannedRevenue || 0),
        plannedExpense: Number(targetForm.plannedExpense || 0),
        plannedCollection: Number(targetForm.plannedCollection || 0),
        plannedPayment: Number(targetForm.plannedPayment || 0),
        notes: targetForm.notes.trim(),
        updatedBy: actorName,
        updatedAt: nowIso,
      };
      await DbService.saveFinancialTarget(target);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Save Monthly Financial Target",
        category: "Finance",
        severity: "INFO",
        details: `Saved ${target.period} targets for ${target.project}: Plan Rev ${cur} ${target.plannedRevenue.toLocaleString()}, Plan Exp ${cur} ${target.plannedExpense.toLocaleString()}.`,
      });
      onLogAction?.("Save Financial Target", `${target.period} - ${target.project}`);
      setShowTargetModal(false);
      setErrMsg(null);
      notifyToast(isAmharic ? "ወርሃዊ የፋይናንስ እቅድ ተቀምጧል።" : "Monthly planned financial targets saved.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save monthly target.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageAccounts) return;
    const openBal = Number(accountForm.openingBalance || 0);
    if (!accountForm.accountName.trim() || isNaN(openBal) || openBal < 0) {
      setErrMsg(isAmharic ? "እባክዎ የሂሳብ ስም እና መነሻ ቀሪ ያስገቡ።" : "Account name and non-negative opening balance required.");
      return;
    }
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const acc: FinancialAccount = {
        id: `ACC-${Date.now()}`,
        accountCode: generateFinancialRef("ACC"),
        accountName: accountForm.accountName.trim(),
        accountType: accountForm.accountType,
        bankName: accountForm.accountType === "Bank" ? accountForm.bankName.trim() : "Site/Office Cash Vault",
        accountNumber: accountForm.accountNumber.trim(),
        branch: accountForm.branch.trim(),
        currency: cur,
        openingBalance: openBal,
        currentBalance: openBal,
        minimumThreshold: Number(accountForm.minimumThreshold || 0),
        project: accountForm.project.trim() || "Corporate Treasury",
        status: "Active",
        createdBy: actorName,
        updatedBy: actorName,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await DbService.saveFinancialAccount(acc);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Register Cash/Bank Account",
        category: "Finance",
        severity: "INFO",
        details: `Created ${acc.accountType} account ${acc.accountName} (${cur} ${openBal.toLocaleString()}).`,
      });
      onLogAction?.("Create Account", `${acc.accountName} (${acc.accountType})`);
      setShowAccountModal(false);
      setErrMsg(null);
      notifyToast(isAmharic ? "የጥሬ ገንዘብ / ባንክ ሂሳብ ተፈጥሯል።" : "Cash/Bank account registered.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save account.");
    } finally {
      setSaving(false);
    }
  };

  const handleAccountTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageAccounts) return;
    const fromAcc = rawAccounts.find((a) => a.id === transferForm.fromId);
    const toAcc = rawAccounts.find((a) => a.id === transferForm.toId);
    const amt = Number(transferForm.amount);
    if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) {
      setErrMsg(isAmharic ? "እባክዎ ሁለት የተለያዩ ሂሳቦችን ይምረጡ።" : "Select distinct source and destination accounts.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setErrMsg(isAmharic ? "ትክክለኛ የዝውውር መጠን ያስገቡ።" : "Enter a positive transfer amount.");
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
      onLogAction?.("Account Transfer", `${fromAcc.accountName} -> ${toAcc.accountName} (${cur} ${amt.toLocaleString()})`);
      setShowTransferModal(false);
      setErrMsg(null);
      notifyToast(isAmharic ? "የሂሳብ ዝውውር ተጠናቋል።" : "Inter-account transfer completed.");
    } catch (err: any) {
      setErrMsg(err?.message || "Transfer failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5" id={`finance-module-${mode}`}>
      {toast && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* 10. BUDGET MANAGEMENT (Cost Budgets + Monthly Plan Targets) */}
      {mode === "budget-management" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
                <Briefcase size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isAmharic ? "10. የበጀት እና ወርሃዊ እቅድ አስተዳደር (Budget Management)" : "10. Budget Management & Monthly Financial Targets"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAmharic
                    ? "የፕሮጀክት ወጪ በጀቶች እና የታቀደ ወርሃዊ ገቢ፣ ወጪ፣ መሰብሰብ እና ክፍያ እቅዶች"
                    : "Manage cost center budgets and monthly Planned Revenue, Expenses, Cash Collection, and Cash Payment targets."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {permissions.canManageTargets && (
                <button
                  type="button"
                  onClick={() => {
                    setErrMsg(null);
                    setShowTargetModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>{isAmharic ? "ወርሃዊ እቅድ አስገባ" : "Set Monthly Target"}</span>
                </button>
              )}
              {permissions.canManageBudgets && (
                <button
                  type="button"
                  onClick={() => {
                    setErrMsg(null);
                    setShowBudgetModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>{isAmharic ? "የበጀት ምደባ ጨምር" : "Allocate Budget"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ጠቅላላ የተመደበ በጀት" : "Total Allocated Budget"}</span>
              <span className="text-lg font-mono font-black text-blue-400 tabular-nums mt-1 block">{formatCurrency(metrics.totalBudgetAllocated, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የወጣ ወጪ (ተከፍሏል/ተመዝግቧል)" : "Incurred Expenses"}</span>
              <span className="text-lg font-mono font-black text-red-400 tabular-nums mt-1 block">{formatCurrency(metrics.actualExpenses, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የበጀት አጠቃቀም (%)" : "Budget Utilization"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.budgetUtilizationPct > 100 ? "text-red-400" : "text-emerald-400"}`}>
                {metrics.budgetUtilizationPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Chart: Budget vs Actual */}
          {charts.budgetVsActual.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">{isAmharic ? "የበጀት ከወጪ ንፅፅር" : "Budget vs Actual Spend"}</h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.budgetVsActual}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }} formatter={(v: any) => formatCurrency(v, cur)} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly Financial Targets Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {isAmharic ? "ወርሃዊ የፋይናንስ ግቦች (Planned Revenue, Expenses, Collection & Payment)" : "Monthly Financial Targets (Plan Baseline)"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60">
                    <th className="py-3 px-4">{isAmharic ? "ወር" : "Period"}</th>
                    <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት / ክፍል" : "Project / Dept"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "የታቀደ ገቢ" : "Plan Revenue"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "የታቀደ ወጪ" : "Plan Expense"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "የታቀደ መሰብሰብ" : "Plan Collection"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "የታቀደ ክፍያ" : "Plan Payment"}</th>
                    {permissions.canDeleteTransactions && <th className="py-3 px-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {state.scopedTargets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        {isAmharic ? "ምንም ወርሃዊ እቅድ አልተመዘገበም።" : "No monthly targets found for selected period."}
                      </td>
                    </tr>
                  ) : (
                    state.scopedTargets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono font-bold text-white">{t.period}</td>
                        <td className="py-3 px-4">{t.project} · <span className="text-slate-400">{t.department}</span></td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-400 tabular-nums">{formatCurrency(t.plannedRevenue, cur)}</td>
                        <td className="py-3 px-4 text-right font-mono text-red-400 tabular-nums">{formatCurrency(t.plannedExpense, cur)}</td>
                        <td className="py-3 px-4 text-right font-mono text-cyan-400 tabular-nums">{formatCurrency(t.plannedCollection, cur)}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-400 tabular-nums">{formatCurrency(t.plannedPayment, cur)}</td>
                        {permissions.canDeleteTransactions && (
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => DbService.deleteFinancialTarget(t.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Budgets Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {isAmharic ? "የፕሮጀክት ወጪ በጀቶች" : "Project Cost Center Budgets"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60">
                    <th className="py-3 px-4">{isAmharic ? "ዘርፍ" : "Category"}</th>
                    <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት / ክፍል" : "Project / Dept"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "የተመደበ በጀት" : "Allocated"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "ቃል የተገባ" : "Committed"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "ትክክለኛ ወጪ" : "Actual"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "ቀሪ በጀት" : "Remaining"}</th>
                    {permissions.canDeleteTransactions && <th className="py-3 px-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {state.scopedBudgets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        {isAmharic ? "ምንም የበጀት ምደባ አልተመዘገበም።" : "No project budgets recorded yet."}
                      </td>
                    </tr>
                  ) : (
                    state.scopedBudgets.map((b) => {
                      const matched = state.scopedExpenses
                        .filter((e) => !e.isCancelledOrRejected && e.normalizedCategory.toLowerCase() === String(b.category).toLowerCase() && (!b.project || e.project.toLowerCase() === b.project.toLowerCase()))
                        .reduce((s, e) => s + e.amount, 0);
                      const actualVal = matched > 0 ? matched : (parseMoney(b.actual) ?? 0);
                      const remaining = (parseMoney(b.allocated) ?? 0) - actualVal;
                      return (
                        <tr key={b.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-bold text-white">{b.category}</td>
                          <td className="py-3 px-4">{b.project} · <span className="text-slate-400">{b.department}</span></td>
                          <td className="py-3 px-4 text-right font-mono text-blue-400 tabular-nums">{formatCurrency(b.allocated, cur)}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">{formatCurrency(b.committed, cur)}</td>
                          <td className="py-3 px-4 text-right font-mono text-red-400 tabular-nums">{formatCurrency(actualVal, cur)}</td>
                          <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatCurrency(remaining, cur)}
                          </td>
                          {permissions.canDeleteTransactions && (
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => DbService.deleteProjectBudget(b.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 11. PROFIT AND LOSS STATEMENT */}
      {mode === "profit-and-loss" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
                <Scale size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isAmharic ? "11. የትርፍ እና ኪሳራ መግለጫ (Profit and Loss)" : "11. Profit and Loss Statement"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAmharic ? "በተመረጠው ወቅት የታቀደና ትክክለኛ የገቢ፣ ወጪ እና ትርፍ ንፅፅር" : "Accrual income statement comparing recognized revenue, direct expenses, and net profit margin."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => exportRowsToCsv("profit_and_loss_trends", charts.profitLossTrends)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
            >
              <Download size={14} />
              <span>{isAmharic ? "CSV አውርድ" : "Export CSV"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የታቀደ ትርፍ" : "Planned Profit"}</span>
              <span className="text-lg font-mono font-black text-blue-400 tabular-nums mt-1 block">{formatCurrency(metrics.plannedProfit, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ትክክለኛ ትርፍ / ኪሳራ" : "Actual Net Profit / Loss"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.actualProfitOrLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(metrics.actualProfitOrLoss, cur)}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የትርፍ መጠን (%)" : "Net Profit Margin"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.profitMarginPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {metrics.profitMarginPct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">{isAmharic ? "የትርፍ እና ኪሳራ አዝማሚያ" : "Profit & Loss Trend"}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.profitLossTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }} formatter={(v: any) => formatCurrency(v, cur)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="plannedProfit" name="Planned Profit" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="actualProfit" name="Actual Profit/Loss" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Structured P&L Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60">
                  <th className="py-3 px-5">{isAmharic ? "የሂሳብ ዝርዝር" : "Statement Line Item"}</th>
                  <th className="py-3 px-5 text-right">{isAmharic ? "የታቀደ" : "Planned"}</th>
                  <th className="py-3 px-5 text-right">{isAmharic ? "ትክክለኛ" : "Actual"}</th>
                  <th className="py-3 px-5 text-right">{isAmharic ? "ልዩነት" : "Variance"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <td className="py-3 px-5 font-bold text-emerald-400">{isAmharic ? "ጠቅላላ ገቢ (Accrual Revenue)" : "Total Operating Revenue"}</td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums">{formatCurrency(metrics.plannedRevenue, cur)}</td>
                  <td className="py-3 px-5 text-right font-mono font-bold text-emerald-400 tabular-nums">{formatCurrency(metrics.actualRevenue, cur)}</td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums">{formatCurrency(metrics.revenueDifference, cur)}</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-bold text-red-400">{isAmharic ? "ጠቅላላ ወጪ (Accrual Expenses)" : "Less: Total Operating Expenses"}</td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums">{formatCurrency(metrics.plannedExpenses, cur)}</td>
                  <td className="py-3 px-5 text-right font-mono font-bold text-red-400 tabular-nums">{formatCurrency(metrics.actualExpenses, cur)}</td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums">{formatCurrency(metrics.expenseDifference, cur)}</td>
                </tr>
                <tr className="bg-slate-900/60 font-extrabold">
                  <td className="py-3.5 px-5 text-white">{isAmharic ? "የተጣራ ትርፍ / ኪሳራ" : "Net Profit / (Loss)"}</td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums">{formatCurrency(metrics.plannedProfit, cur)}</td>
                  <td className={`py-3.5 px-5 text-right font-mono tabular-nums ${metrics.actualProfitOrLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(metrics.actualProfitOrLoss, cur)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums">{formatCurrency(metrics.actualProfitOrLoss - metrics.plannedProfit, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 12. CASH FLOW MANAGEMENT */}
      {mode === "cash-flow" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400">
                <Layers size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isAmharic ? "12. የጥሬ ገንዘብ ፍሰት አስተዳደር (Cash Flow Management)" : "12. Operating Cash Flow Management"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAmharic ? "ከተሰበሰቡ ገቢዎች እና ከተከፈሉ ወጪዎች የተሰላ ትክክለኛ የገንዘብ ፍሰት" : "Strict cash-basis inflows vs outflows computed exclusively from posted collections and payments."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => exportRowsToCsv("cash_flow_statement", charts.cashFlowTrends)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer self-start sm:self-center whitespace-nowrap"
            >
              <Download size={14} />
              <span>{isAmharic ? "CSV አውርድ" : "Export CSV"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ገቢ ጥሬ ገንዘብ (Inflow)" : "Actual Cash Inflow"}</span>
              <span className="text-lg font-mono font-black text-cyan-400 tabular-nums mt-1 block">{formatCurrency(metrics.actualCashCollection, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ወጪ ጥሬ ገንዘብ (Outflow)" : "Actual Cash Outflow"}</span>
              <span className="text-lg font-mono font-black text-amber-400 tabular-nums mt-1 block">{formatCurrency(metrics.actualCashPayment, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የተጣራ የገንዘብ ፍሰት" : "Net Cash Flow"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(metrics.netCashFlow, cur)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={charts.cashFlowTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="periodLabel" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }} formatter={(v: any) => formatCurrency(v, cur)} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Bar dataKey="cashInflow" name="Cash Inflow" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cashOutflow" name="Cash Outflow" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="cumulativeNetCashFlow" name="Cumulative Net" stroke="#10b981" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* 13. CASH AND BANK MANAGEMENT */}
      {mode === "cash-and-bank" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
                <Landmark size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white">
                  {isAmharic ? "13. የጥሬ ገንዘብ እና ባንክ አስተዳደር (Cash & Bank Management)" : "13. Cash and Bank Management"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAmharic ? "የጥሬ ገንዘብ ካዝናዎች፣ የባንክ ሂሳቦች እና በሂሳቦች መካከል የገንዘብ ዝውውር" : "Manage company cash boxes, commercial bank accounts, and inter-account transfers."}
                </p>
              </div>
            </div>
            {permissions.canManageAccounts && (
              <div className="flex flex-wrap gap-2">
                {onOpenReconciliation && (
                  <button
                    type="button"
                    onClick={onOpenReconciliation}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <CheckCircle2 size={14} />
                    <span>{isAmharic ? "የባንክ ማመሳከሪያ" : "Bank Reconciliation"}</span>
                  </button>
                )}
                {rawAccounts.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => {
                      setErrMsg(null);
                      setTransferForm({ ...transferForm, fromId: rawAccounts[0].id, toId: rawAccounts[1].id, amount: "" });
                      setShowTransferModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeftRight size={14} />
                    <span>{isAmharic ? "ዝውውር" : "Transfer Funds"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setErrMsg(null);
                    setShowAccountModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>{isAmharic ? "አዲስ ሂሳብ ጨምር" : "Add Cash / Bank Account"}</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ጠቅላላ የጥሬ ገንዘብ ቀሪ" : "Available Cash Balance"}</span>
              <span className="text-lg font-mono font-black text-cyan-400 tabular-nums mt-1 block">{formatCurrency(metrics.availableCashBalance, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ጠቅላላ የባንክ ቀሪ" : "Total Bank Balance"}</span>
              <span className="text-lg font-mono font-black text-blue-400 tabular-nums mt-1 block">{formatCurrency(metrics.totalBankBalance, cur)}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "አጠቃላይ ቀሪ (ጥሬ + ባንክ)" : "Combined Cash & Bank"}</span>
              <span className="text-lg font-mono font-black text-emerald-400 tabular-nums mt-1 block">{formatCurrency(metrics.currentLiquidityPosition, cur)}</span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60">
                    <th className="py-3 px-4">{isAmharic ? "ኮድ / ስም" : "Account Name"}</th>
                    <th className="py-3 px-4">{isAmharic ? "አይነት / ባንክ" : "Type / Bank"}</th>
                    <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት" : "Scope"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "መነሻ ቀሪ" : "Opening"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "የአሁን ቀሪ" : "Current Balance"}</th>
                    <th className="py-3 px-4 text-right">{isAmharic ? "ዝቅተኛ ገደብ" : "Min Threshold"}</th>
                    {permissions.canDeleteTransactions && <th className="py-3 px-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {state.scopedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        {isAmharic ? "ምንም የጥሬ ገንዘብ ወይም የባንክ ሂሳብ አልተመዘገበም።" : "No Cash or Bank accounts registered yet. Add one above."}
                      </td>
                    </tr>
                  ) : (
                    state.scopedAccounts.map((acc) => {
                      const low = acc.currentBalance < acc.minimumThreshold;
                      return (
                        <tr key={acc.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{acc.accountName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{acc.accountCode} {acc.accountNumber ? `· ${acc.accountNumber}` : ""}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${acc.accountType === "Cash" ? "bg-cyan-950/60 text-cyan-300 border-cyan-800" : "bg-blue-950/60 text-blue-300 border-blue-800"}`}>
                              {acc.accountType}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{acc.bankName}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{acc.project || "Corporate Treasury"}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">{formatCurrency(acc.openingBalance, cur)}</td>
                          <td className={`py-3 px-4 text-right font-mono font-black tabular-nums ${low ? "text-red-400" : "text-emerald-400"}`}>
                            {formatCurrency(acc.currentBalance, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">{formatCurrency(acc.minimumThreshold, cur)}</td>
                          {permissions.canDeleteTransactions && (
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => DbService.deleteFinancialAccount(acc.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank & Cash Transaction Reference Records */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                {isAmharic ? "የባንክና ጥሬ ገንዘብ ግብይቶች መዝገብ" : "Bank & Cash Transaction Reference Ledger"}
              </h3>
              <button
                type="button"
                disabled={state.scopedCashTransactions.length === 0}
                onClick={() => exportRowsToCsv("bank_cash_transactions", state.scopedCashTransactions)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Download size={13} />
                <span>Export CSV</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Tx Ref</th>
                    <th className="py-2.5 px-3">Bank / Receipt Ref</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Counterparty / Target</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-200">
                  {state.scopedCashTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {isAmharic ? "ምንም የባንክ ግብይት አልተመዘገበም።" : "No cash or bank transactions in the selected period."}
                      </td>
                    </tr>
                  ) : (
                    state.scopedCashTransactions.slice(0, 40).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{tx.date}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{tx.referenceNo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {tx.bankReferenceNumber || tx.receiptNumber || tx.paymentVoucherNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-200">
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{tx.accountName}</td>
                        <td className="py-2.5 px-3">{tx.counterparty}</td>
                        <td className="py-2.5 px-3 text-slate-300">{tx.status}</td>
                        <td className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                          tx.type === "Collection" ? "text-cyan-400" : tx.type === "Payment" ? "text-amber-400" : "text-blue-400"
                        }`}>
                          {formatCurrency(tx.amount, cur)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 14. LIQUIDITY MANAGEMENT */}
      {mode === "liquidity-management" && (
        <>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isAmharic ? "14. የሊኩዲቲ አስተዳደር (Liquidity Management)" : "14. Corporate Liquidity Management"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic ? "ፈጣን የጥሬ ገንዘብ ዝግጁነት፣ የስራ ማስኬጃ ሊኩዲቲ እና የክፍያ ሽፋን መለኪያ" : "Real-time cash buffer, working capital coverage against open payables, and threshold compliance."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የአሁኑ ሊኩዲቲ (ጥሬ + ባንክ)" : "Current Liquidity Position"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.currentLiquidityPosition < settings.lowCashAlertThresholdEtb ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(metrics.currentLiquidityPosition, cur)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Min Threshold: {formatCurrency(settings.lowCashAlertThresholdEtb, cur)}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የስራ ማስኬጃ ሊኩዲቲ (Cash+AR-AP)" : "Net Working Liquidity"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.netWorkingLiquidity >= 0 ? "text-blue-400" : "text-red-400"}`}>
                {formatCurrency(metrics.netWorkingLiquidity, cur)}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "የሊኩዲቲ ሬሾ (Cash+AR / AP)" : "Liquidity Coverage Ratio"}</span>
              <span className="text-lg font-mono font-black text-white tabular-nums mt-1 block">
                {metrics.liquidityRatio === null ? "No Open AP" : `${metrics.liquidityRatio.toFixed(2)}x`}
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase text-slate-400 font-bold">{isAmharic ? "ጊዜው ያለፈበት ተከፋይ" : "Immediate Overdue AP"}</span>
              <span className={`text-lg font-mono font-black tabular-nums mt-1 block ${metrics.overduePayables > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(metrics.overduePayables, cur)}
              </span>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">{isAmharic ? "በሂሳብ ደረጃ ያለው ሊኩዲቲ" : "Account-Level Liquidity Buffers"}</h3>
            {state.scopedAccounts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                {isAmharic ? "ምንም የተመዘገበ ሂሳብ የለም።" : "No accounts configured yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {state.scopedAccounts.map((acc) => {
                  const pct = acc.minimumThreshold > 0 ? Math.min(100, Math.round((acc.currentBalance / acc.minimumThreshold) * 100)) : 100;
                  const below = acc.currentBalance < acc.minimumThreshold;
                  return (
                    <div key={acc.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-white">{acc.accountName} ({acc.accountType})</span>
                        <span className={`font-mono font-bold tabular-nums ${below ? "text-red-400" : "text-emerald-400"}`}>
                          {formatCurrency(acc.currentBalance, cur)} / Min {formatCurrency(acc.minimumThreshold, cur)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${below ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* MODALS */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">{isAmharic ? "የበጀት ምደባ ጨምር" : "Allocate Project Cost Budget"}</h3>
              <button type="button" onClick={() => setShowBudgetModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><X size={16} /></button>
            </div>
            {errMsg && <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">{errMsg}</div>}
            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project *</label>
                <input type="text" required value={budgetForm.project} onChange={(e) => setBudgetForm({ ...budgetForm, project: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Category *</label>
                  <select value={budgetForm.category} onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    {["Material", "Labor", "Equipment", "Subcontractor", "Logistics", "Overhead"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                  <input type="text" value={budgetForm.department} onChange={(e) => setBudgetForm({ ...budgetForm, department: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Allocated ({cur}) *</label>
                  <input type="number" min="1" step="0.01" required value={budgetForm.allocated} onChange={(e) => setBudgetForm({ ...budgetForm, allocated: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Committed ({cur})</label>
                  <input type="number" min="0" step="0.01" value={budgetForm.committed} onChange={(e) => setBudgetForm({ ...budgetForm, committed: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description</label>
                <input type="text" value={budgetForm.description} onChange={(e) => setBudgetForm({ ...budgetForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBudgetModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTargetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">{isAmharic ? "ወርሃዊ የፋይናንስ እቅድ" : "Set Monthly Financial Target"}</h3>
              <button type="button" onClick={() => setShowTargetModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><X size={16} /></button>
            </div>
            {errMsg && <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">{errMsg}</div>}
            <form onSubmit={handleSaveMonthlyTarget} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Month (YYYY-MM) *</label>
                  <input type="month" required value={targetForm.period} onChange={(e) => setTargetForm({ ...targetForm, period: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project *</label>
                  <input type="text" required value={targetForm.project} onChange={(e) => setTargetForm({ ...targetForm, project: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Planned Revenue ({cur})</label>
                  <input type="number" min="0" step="0.01" value={targetForm.plannedRevenue} onChange={(e) => setTargetForm({ ...targetForm, plannedRevenue: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Planned Expenses ({cur})</label>
                  <input type="number" min="0" step="0.01" value={targetForm.plannedExpense} onChange={(e) => setTargetForm({ ...targetForm, plannedExpense: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Planned Collection ({cur})</label>
                  <input type="number" min="0" step="0.01" value={targetForm.plannedCollection} onChange={(e) => setTargetForm({ ...targetForm, plannedCollection: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Planned Payment ({cur})</label>
                  <input type="number" min="0" step="0.01" value={targetForm.plannedPayment} onChange={(e) => setTargetForm({ ...targetForm, plannedPayment: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTargetModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Save Monthly Target</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">{isAmharic ? "አዲስ የጥሬ ገንዘብ / ባንክ ሂሳብ" : "Add Cash or Bank Account"}</h3>
              <button type="button" onClick={() => setShowAccountModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><X size={16} /></button>
            </div>
            {errMsg && <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">{errMsg}</div>}
            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Account Name *</label>
                  <input type="text" required value={accountForm.accountName} onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })} placeholder="e.g. CBE Main Construction Operating Account" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Account Type *</label>
                  <select value={accountForm.accountType} onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value as "Cash" | "Bank" })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash Box / Safe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Name</label>
                  <input type="text" value={accountForm.bankName} onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })} placeholder="CBE, Awash, Dashen..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Account Number</label>
                  <input type="text" value={accountForm.accountNumber} onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project / Scope</label>
                  <input type="text" value={accountForm.project} onChange={(e) => setAccountForm({ ...accountForm, project: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Opening Balance ({cur}) *</label>
                  <input type="number" min="0" step="0.01" required value={accountForm.openingBalance} onChange={(e) => setAccountForm({ ...accountForm, openingBalance: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Min Alert Threshold ({cur})</label>
                  <input type="number" min="0" step="0.01" value={accountForm.minimumThreshold} onChange={(e) => setAccountForm({ ...accountForm, minimumThreshold: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAccountModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">{isAmharic ? "በሂሳቦች መካከል ዝውውር" : "Transfer Between Accounts"}</h3>
              <button type="button" onClick={() => setShowTransferModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"><X size={16} /></button>
            </div>
            {errMsg && <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">{errMsg}</div>}
            <form onSubmit={handleAccountTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">From Account *</label>
                <select value={transferForm.fromId} onChange={(e) => setTransferForm({ ...transferForm, fromId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  {rawAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountName} ({formatCurrency(a.currentBalance, cur)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">To Account *</label>
                <select value={transferForm.toId} onChange={(e) => setTransferForm({ ...transferForm, toId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                  {rawAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountName} ({formatCurrency(a.currentBalance, cur)})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Amount ({cur}) *</label>
                  <input type="number" min="1" step="0.01" required value={transferForm.amount} onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date *</label>
                  <input type="date" required value={transferForm.date} onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notes</label>
                <input type="text" value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Execute Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
