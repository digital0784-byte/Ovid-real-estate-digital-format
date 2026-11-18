import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderTree,
  Layers,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  FinancialYearRecord,
  JournalEntryLine,
  JournalEntryRecord,
  JournalEntryType,
  Part8LedgerReportTypeId,
  UserRole,
} from "../../types";
import { DbService } from "../../services/db";
import {
  approveAndPostJournalEntry,
  createDoubleEntryJournalVoucher,
  Part7FinancialStatementsState,
  prepareAndCloseFinancialPeriod,
  rejectJournalEntry,
  reopenClosedFinancialPeriod,
  validateJournalEntryLines,
} from "../../services/financialStatementsService";
import {
  assertGlPostingAllowed,
  checkDuplicateJournalReference,
  createAndPostReversingJournalEntry,
  exportPart8Report,
  mapPart8CategoryToAccountType,
  Part8CoaCategoryGroup,
  Part8GeneralLedgerState,
  Part8GlFilterState,
  saveFinancialYearLifecycle,
  savePart8ChartAccount,
} from "../../services/generalLedgerService";
import { formatCurrency } from "../../utils/formatters";

export type Part8SubTab = "dashboard" | "coa" | "journals" | "reports" | "periods";

interface GeneralLedgerCoaModuleProps {
  isAmharic: boolean;
  glState: Part8GeneralLedgerState;
  statementsState: Part7FinancialStatementsState;
  filterState: Part8GlFilterState;
  onFilterChange: (next: Part8GlFilterState) => void;
  onResetFilters: () => void;
  rawJournalEntries: JournalEntryRecord[];
  rawPeriods: FinancialPeriodCloseRecord[];
  rawFinancialYears: FinancialYearRecord[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

const PART8_COA_CATEGORIES: Part8CoaCategoryGroup[] = [
  "Assets",
  "Liabilities",
  "Equity",
  "Revenue",
  "Direct Construction Costs",
  "Operating Expenses",
];

const PART8_REPORT_TABS: {
  id: Part8LedgerReportTypeId;
  labelEn: string;
  labelAm: string;
}[] = [
  { id: "general-ledger-report", labelEn: "1. General Ledger Report", labelAm: "1. ጠቅላላ የሂሳብ መዝገብ" },
  { id: "account-ledger-report", labelEn: "2. Account Ledger Report", labelAm: "2. የሂሳብ መደብ መዝገብ" },
  { id: "trial-balance", labelEn: "3. Trial Balance", labelAm: "3. የሙከራ ሚዛን" },
  { id: "journal-register", labelEn: "4. Journal Register", labelAm: "4. የጆርናል መዝገብ" },
  { id: "account-balance-summary", labelEn: "5. Account Balance Summary", labelAm: "5. የሂሳብ ሚዛን ማጠቃለያ" },
  { id: "project-ledger", labelEn: "6. Project-wise Ledger", labelAm: "6. የፕሮጀክት መዝገብ" },
  { id: "department-ledger", labelEn: "7. Department-wise Ledger", labelAm: "7. የክፍል መዝገብ" },
];

const SUB_TYPES_FOR_TYPE: Record<ChartAccountType, ChartAccountSubType[]> = {
  Asset: ["Current Asset", "Non-Current Asset"],
  Liability: ["Current Liability", "Non-Current Liability"],
  Equity: ["Owner Capital", "Retained Earnings", "Dividends / Drawings"],
  Revenue: ["Project Revenue", "Other Income"],
  "Cost of Construction": ["Direct Construction Cost"],
  "Operating Expense": ["Operating Expense"],
  "Administrative Expense": ["Administrative Expense"],
};

export const GeneralLedgerCoaModule: React.FC<GeneralLedgerCoaModuleProps> = ({
  isAmharic,
  glState,
  statementsState,
  filterState,
  onFilterChange,
  onResetFilters,
  rawJournalEntries,
  rawPeriods,
  rawFinancialYears,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const [subTab, setSubTab] = useState<Part8SubTab>("dashboard");
  const [selectedReport, setSelectedReport] = useState<Part8LedgerReportTypeId>("general-ledger-report");
  const [selectedCoaCategory, setSelectedCoaCategory] = useState<Part8CoaCategoryGroup | "ALL">("ALL");
  const [busyAction, setBusyAction] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Role privileges
  const isDirectorOrFinanceMgr =
    actorRole === UserRole.FINANCE_MANAGER ||
    actorRole === UserRole.HEAD_OFFICE ||
    actorRole === UserRole.SUPER_ADMIN ||
    actorRole === UserRole.DIRECTOR ||
    actorRole === UserRole.DIRECTORY;
  const isFinanceOperator = isDirectorOrFinanceMgr || actorRole === UserRole.ACCOUNTANT;

  // COA Form Modal State
  const [showCoaModal, setShowCoaModal] = useState(false);
  const [coaForm, setCoaForm] = useState<{
    id?: string;
    accountCode: string;
    accountName: string;
    categoryGroup: Part8CoaCategoryGroup;
    subType: ChartAccountSubType;
    parentAccountCode: string;
    normalBalance: "Debit" | "Credit";
    openingBalance: string;
    status: "Active" | "Inactive" | "Archived";
    description: string;
  }>({
    accountCode: "",
    accountName: "",
    categoryGroup: "Assets",
    subType: "Current Asset",
    parentAccountCode: "",
    normalBalance: "Debit",
    openingBalance: "0",
    status: "Active",
    description: "",
  });

  // Manual Journal Voucher Modal State
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [jeForm, setJeForm] = useState<{
    entryDate: string;
    entryType: JournalEntryType;
    project: string;
    department: string;
    referenceNo: string;
    description: string;
    autoPost: boolean;
    lines: { accountCode: string; debit: string; credit: string; memo: string }[];
  }>({
    entryDate: new Date().toISOString().slice(0, 10),
    entryType: "Standard",
    project: glState.availableProjects[0] || "Corporate / Head Office",
    department: glState.availableDepartments[0] || "Finance",
    referenceNo: "",
    description: "",
    autoPost: false,
    lines: [
      { accountCode: "1020", debit: "", credit: "", memo: "" },
      { accountCode: "4010", debit: "", credit: "", memo: "" },
    ],
  });

  // Reversal Modal State (Posted entries are NEVER deleted)
  const [reversingTarget, setReversingTarget] = useState<JournalEntryRecord | null>(null);
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10));
  const [reversalReason, setReversalReason] = useState("");

  // Financial Year & Period Form State
  const [newFyYear, setNewFyYear] = useState(String(new Date().getFullYear()));
  const [newPeriodForm, setNewPeriodForm] = useState({
    periodType: "Monthly" as "Monthly" | "Quarterly" | "Annual",
    financialYear: String(new Date().getFullYear()),
    startDate: `${new Date().toISOString().slice(0, 7)}-01`,
    endDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const activeAccounts = useMemo(
    () => glState.coaNodes.map((n) => n.account),
    [glState.coaNodes]
  );

  const accountByCode = useMemo(
    () => new Map(activeAccounts.map((a) => [a.accountCode, a])),
    [activeAccounts]
  );

  const journalPreviewTotals = useMemo(() => {
    const mapped: JournalEntryLine[] = jeForm.lines.map((l, idx) => {
      const acc = accountByCode.get(l.accountCode);
      return {
        lineNo: idx + 1,
        accountCode: l.accountCode,
        accountName: acc?.accountName || l.accountCode,
        accountType: acc?.accountType || "Asset",
        subType: acc?.subType,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        memo: l.memo,
        project: jeForm.project,
        department: jeForm.department,
      };
    });
    return validateJournalEntryLines(mapped);
  }, [jeForm.lines, jeForm.project, jeForm.department, accountByCode]);

  const categoryChartData = useMemo(() => {
    return PART8_COA_CATEGORIES.map((cat) => {
      const nodes = glState.coaByCategory[cat] || [];
      const totalBal = nodes
        .filter((n) => !n.account.parentAccountCode)
        .reduce((s, n) => s + Math.abs(n.rollupBalance), 0);
      return {
        category: cat.replace("Direct Construction ", "Direct ").replace("Operating ", "Op. "),
        Balance: Math.round(totalBal),
      };
    });
  }, [glState.coaByCategory]);

  // Handlers
  const handleSaveChartAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFinanceOperator) return;
    setBusyAction(true);
    setBanner(null);
    try {
      const accountType = mapPart8CategoryToAccountType(coaForm.categoryGroup);
      const nowIso = new Date().toISOString();
      const record: ChartAccountRecord = {
        id: coaForm.id || `COA-${coaForm.accountCode.trim()}`,
        accountCode: coaForm.accountCode.trim(),
        accountName: coaForm.accountName.trim(),
        accountNameAm: coaForm.accountName.trim(),
        accountType,
        subType: coaForm.subType,
        parentAccountCode: coaForm.parentAccountCode.trim() || undefined,
        normalBalance: coaForm.normalBalance,
        cashFlowSection:
          accountType === "Asset" || accountType === "Liability" || accountType === "Equity"
            ? "Operating"
            : "Operating",
        isSystemAccount: false,
        isActive: coaForm.status === "Active",
        status: coaForm.status,
        openingBalance: Number(coaForm.openingBalance || 0),
        currency: "ETB",
        description: coaForm.description.trim(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await savePart8ChartAccount({
        account: record,
        allAccounts: activeAccounts,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Chart of Accounts Saved", `${record.accountCode} — ${record.accountName} (${record.status})`);
      setBanner({ type: "success", text: `Account ${record.accountCode} saved to Chart of Accounts.` });
      setShowCoaModal(false);
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to save Chart of Accounts item." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleSubmitJournalVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFinanceOperator) return;
    setBusyAction(true);
    setBanner(null);
    try {
      // 1. Check Closed Financial Period / Fiscal Year lock
      const guard = assertGlPostingAllowed({
        entryDate: jeForm.entryDate,
        periods: rawPeriods,
        financialYears: glState.financialYears,
      });
      if (!guard.allowed) {
        throw new Error(guard.reason);
      }

      // 2. Duplicate Reference Check
      if (jeForm.referenceNo.trim()) {
        const dup = checkDuplicateJournalReference({
          referenceNo: jeForm.referenceNo,
          uniqueTransactionKey: `MANUAL::${jeForm.entryDate}::${jeForm.referenceNo.trim()}`,
          existingEntries: glState.allJournals,
        });
        if (dup.isDuplicate) {
          throw new Error(`Duplicate journal reference detected (already recorded in ${dup.conflictingJournalNo}).`);
        }
      }

      // 3. Build lines & validate double-entry
      const lines: JournalEntryLine[] = jeForm.lines.map((l, idx) => {
        const acc = accountByCode.get(l.accountCode);
        return {
          lineNo: idx + 1,
          accountCode: l.accountCode,
          accountName: acc?.accountName || l.accountCode,
          accountType: acc?.accountType || "Asset",
          subType: acc?.subType,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          memo: l.memo.trim(),
          project: jeForm.project,
          department: jeForm.department,
        };
      });

      const created = await createDoubleEntryJournalVoucher({
        entryDate: jeForm.entryDate,
        project: jeForm.project,
        department: jeForm.department,
        referenceNo: jeForm.referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
        description: jeForm.description.trim(),
        entryType: jeForm.entryType === "Opening Balance" || jeForm.entryType === "Adjusting" ? jeForm.entryType : "Standard",
        lines,
        actorName,
        actorRole: String(actorRole),
        actorUid,
        submitImmediately: true,
        postImmediatelyIfAuthorized: jeForm.autoPost && isDirectorOrFinanceMgr,
        existingPeriods: rawPeriods,
      });

      onLogAction?.(
        "Journal Entry Created",
        `${created.journalNo} (${created.status}) Dr/Cr ${formatCurrency(created.totalDebit)}`
      );
      setBanner({
        type: "success",
        text: `Journal Voucher ${created.journalNo} created (${created.status}).`,
      });
      setShowJournalModal(false);
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to save Journal Entry." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleApproveJournal = async (entry: JournalEntryRecord) => {
    if (!isDirectorOrFinanceMgr) return;
    setBusyAction(true);
    setBanner(null);
    try {
      const guard = assertGlPostingAllowed({
        entryDate: entry.entryDate,
        periods: rawPeriods,
        financialYears: glState.financialYears,
      });
      if (!guard.allowed) throw new Error(guard.reason);
      await approveAndPostJournalEntry({
        entry,
        actorName,
        actorRole: String(actorRole),
        actorUid,
        existingPeriods: rawPeriods,
      });
      onLogAction?.("Journal Entry Posted", `Posted ${entry.journalNo} to General Ledger`);
      setBanner({ type: "success", text: `Journal ${entry.journalNo} approved & posted to GL.` });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Approval failed." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleRejectJournal = async (entry: JournalEntryRecord) => {
    if (!isDirectorOrFinanceMgr) return;
    setBusyAction(true);
    setBanner(null);
    try {
      await rejectJournalEntry({
        entry,
        reason: "Rejected during General Ledger review",
        actorName,
        actorRole: String(actorRole),
        actorUid,
      });
      setBanner({ type: "success", text: `Journal ${entry.journalNo} marked Rejected.` });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Reject failed." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleReversePostedJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingTarget || !isDirectorOrFinanceMgr) return;
    setBusyAction(true);
    setBanner(null);
    try {
      const rev = await createAndPostReversingJournalEntry({
        originalEntry: reversingTarget,
        reversalDate,
        reason: reversalReason,
        actorName,
        actorRole,
        actorUid,
        periods: rawPeriods,
        financialYears: glState.financialYears,
      });
      onLogAction?.("Journal Reversed", `Posted reversing entry ${rev.journalNo} for ${reversingTarget.journalNo}`);
      setBanner({
        type: "success",
        text: `Original entry ${reversingTarget.journalNo} preserved as Reversed; linked reversing voucher ${rev.journalNo} posted.`,
      });
      setReversingTarget(null);
      setReversalReason("");
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to reverse journal entry." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateFinancialYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirectorOrFinanceMgr) return;
    setBusyAction(true);
    setBanner(null);
    try {
      const yr = newFyYear.trim();
      const nowIso = new Date().toISOString();
      const fy: FinancialYearRecord = {
        id: `FY-${yr}`,
        yearCode: `FY${yr}`,
        yearLabel: `Fiscal Year ${yr} (Jan 1 – Dec 31)`,
        startDate: `${yr}-01-01`,
        endDate: `${yr}-12-31`,
        status: "Open",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await saveFinancialYearLifecycle({
        year: fy,
        nextStatus: "Open",
        actorName,
        actorRole,
      });
      setBanner({ type: "success", text: `Financial Year ${fy.yearCode} created & opened.` });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to create Financial Year." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleYearStatus = async (fy: FinancialYearRecord, nextStatus: "Closed" | "Reopened") => {
    if (!isDirectorOrFinanceMgr) return;
    setBusyAction(true);
    setBanner(null);
    try {
      await saveFinancialYearLifecycle({
        year: fy,
        nextStatus,
        actorName,
        actorRole,
        reason: nextStatus === "Reopened" ? `Executive authorization by ${actorName}` : undefined,
      });
      onLogAction?.("Financial Year Lifecycle", `${fy.yearCode} -> ${nextStatus}`);
      setBanner({ type: "success", text: `${fy.yearCode} marked ${nextStatus}.` });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to update Financial Year." });
    } finally {
      setBusyAction(false);
    }
  };

  const handleCloseAccountingPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirectorOrFinanceMgr) return;
    setBusyAction(true);
    setBanner(null);
    try {
      const periodKey =
        newPeriodForm.periodType === "Monthly"
          ? newPeriodForm.startDate.slice(0, 7)
          : newPeriodForm.periodType === "Annual"
          ? `FY${newPeriodForm.financialYear}`
          : `${newPeriodForm.financialYear}-${newPeriodForm.startDate.slice(5, 7)}`;
      await prepareAndCloseFinancialPeriod({
        state: statementsState,
        periodType: newPeriodForm.periodType,
        action: "CloseAndLock",
        notes: newPeriodForm.notes,
        actorName,
        actorRole: String(actorRole),
        actorUid,
      });
      onLogAction?.("Accounting Period Closed", `Locked period ${periodKey}`);
      setBanner({ type: "success", text: `Period ${periodKey} closed & snapshot archived.` });
    } catch (err: any) {
      setBanner({ type: "error", text: err?.message || "Failed to close accounting period." });
    } finally {
      setBusyAction(false);
    }
  };

  const displayedCoaNodes = useMemo(() => {
    if (selectedCoaCategory === "ALL") return glState.coaNodes;
    return glState.coaByCategory[selectedCoaCategory] || [];
  }, [glState.coaNodes, glState.coaByCategory, selectedCoaCategory]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BookOpen size={18} className="text-red-500 shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              {isAmharic
                ? "ጠቅላላ የሂሳብ መዝገብ (GL) እና የሂሳብ መደቦች (COA)"
                : "Part 8: General Ledger (GL) & Chart of Accounts (COA)"}
            </h2>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                glState.kpis.unbalancedEntries === 0 && statementsState.trialBalanceSummary.isBalanced
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                  : "bg-red-950 text-red-400 border-red-800"
              }`}
            >
              {glState.kpis.unbalancedEntries === 0 && statementsState.trialBalanceSummary.isBalanced
                ? "Double-Entry Verified (Dr = Cr)"
                : "Balance Attention Needed"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAmharic
              ? "ተዋረዳዊ የሂሳብ መደቦች፣ ድርብ-መዝገብ ጆርናል ቁጥጥር፣ 7 የሌጀር ሪፖርቶች እና የበጀት ዓመት መዝጊያ"
              : "Hierarchical COA, Double-Entry Vouchers, Immutable Reversals, Closed Period Locks & 7 Audit Reports"}
          </p>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "dashboard", labelEn: "GL Dashboard", labelAm: "ዳሽቦርድ" },
            { id: "coa", labelEn: "Chart of Accounts", labelAm: "የሂሳብ መደቦች" },
            { id: "journals", labelEn: "Journal Entries", labelAm: "ጆርናል መዝገቦች" },
            { id: "reports", labelEn: "7 Ledger Reports", labelAm: "7 የሂሳብ ሪፖርቶች" },
            { id: "periods", labelEn: "Fiscal Periods", labelAm: "የሂሳብ ወቅቶች" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as Part8SubTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer transition ${
                subTab === tab.id
                  ? "bg-red-600 text-white border-red-500"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {isAmharic ? tab.labelAm : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            banner.type === "success"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-red-950/60 border-red-800 text-red-300"
          }`}
        >
          <span>{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="p-1 rounded hover:bg-slate-900 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Strip (shown across GL Views) */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Start Date</label>
          <input
            type="date"
            value={filterState.startDate}
            onChange={(e) => onFilterChange({ ...filterState, startDate: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">End Date</label>
          <input
            type="date"
            value={filterState.endDate}
            onChange={(e) => onFilterChange({ ...filterState, endDate: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Account</label>
          <select
            value={filterState.accountCode}
            onChange={(e) => onFilterChange({ ...filterState, accountCode: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
          >
            <option value="ALL">All Accounts</option>
            {activeAccounts.map((acc) => (
              <option key={acc.accountCode} value={acc.accountCode}>
                {acc.accountCode} — {acc.accountName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Project</label>
          <select
            value={filterState.project}
            onChange={(e) => onFilterChange({ ...filterState, project: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
          >
            <option value="ALL">All Projects</option>
            {glState.availableProjects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Department</label>
          <select
            value={filterState.department}
            onChange={(e) => onFilterChange({ ...filterState, department: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
          >
            <option value="ALL">All Departments</option>
            {glState.availableDepartments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-1.5">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search voucher/ref..."
              value={filterState.searchTerm}
              onChange={(e) => onFilterChange({ ...filterState, searchTerm: e.target.value })}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white"
            />
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* TAB 1: GL DASHBOARD */}
      {subTab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Debit (Period)</div>
              <div className="text-xl font-black font-mono tabular-nums text-emerald-400 mt-1">
                {formatCurrency(glState.kpis.totalDebit)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{glState.filteredGlRows.length} GL lines posted</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Credit (Period)</div>
              <div className="text-xl font-black font-mono tabular-nums text-blue-400 mt-1">
                {formatCurrency(glState.kpis.totalCredit)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Variance: <span className="font-mono">{formatCurrency(glState.kpis.totalDebit - glState.kpis.totalCredit)}</span>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Account Balances (Assets)</div>
              <div className="text-xl font-black font-mono tabular-nums text-white mt-1">
                {formatCurrency(glState.kpis.totalAccountBalances)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{glState.kpis.activeAccountsCount} active COA accounts</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">Approved vs Pending Journals</div>
              <div className="text-xl font-black font-mono tabular-nums text-amber-400 mt-1">
                {glState.kpis.approvedJournalEntries} / {glState.kpis.pendingJournalEntries}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {glState.kpis.reversedJournalEntries} reversed · {glState.kpis.closedFinancialPeriods} closed periods
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale size={16} className="text-emerald-400" />
                  <span>General Ledger Balance Distribution by COA Category</span>
                </h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "12px" }}
                      formatter={(val: any) => formatCurrency(Number(val || 0))}
                    />
                    <Legend />
                    <Bar dataKey="Balance" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-400" />
                  <span>GL Governance & Controls</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Unbalanced Entries</span>
                    <span className={`font-mono font-bold ${glState.kpis.unbalancedEntries === 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {glState.kpis.unbalancedEntries}
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Closed Accounting Periods</span>
                    <span className="font-mono font-bold text-amber-400">{glState.kpis.closedFinancialPeriods}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Closed Financial Years</span>
                    <span className="font-mono font-bold text-slate-200">{glState.kpis.closedFinancialYears}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Trial Balance Parity</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {statementsState.trialBalanceSummary.isBalanced ? "BALANCED" : "CHECK TB"}
                    </span>
                  </div>
                </div>
              </div>

              {isFinanceOperator && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubTab("journals");
                      setShowJournalModal(true);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>New Journal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubTab("coa");
                      setShowCoaModal(true);
                    }}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FolderTree size={14} />
                    <span>Add Account</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS (HIERARCHICAL COA) */}
      {subTab === "coa" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCoaCategory("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCoaCategory === "ALL"
                    ? "bg-emerald-600 text-white border-emerald-500"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
                }`}
              >
                All Categories ({glState.coaNodes.length})
              </button>
              {PART8_COA_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCoaCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCoaCategory === cat
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
                  }`}
                >
                  {cat} ({(glState.coaByCategory[cat] || []).length})
                </button>
              ))}
            </div>

            {isFinanceOperator && (
              <button
                type="button"
                onClick={() => {
                  setCoaForm({
                    accountCode: "",
                    accountName: "",
                    categoryGroup: "Assets",
                    subType: "Current Asset",
                    parentAccountCode: "",
                    normalBalance: "Debit",
                    openingBalance: "0",
                    status: "Active",
                    description: "",
                  });
                  setShowCoaModal(true);
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add / Customize Account</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                  <th className="py-3 px-3">Account Code</th>
                  <th className="py-3 px-3">Account Name & Hierarchy</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Normal</th>
                  <th className="py-3 px-3 text-right">Opening Bal</th>
                  <th className="py-3 px-3 text-right">Own Balance</th>
                  <th className="py-3 px-3 text-right">Rollup Balance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-200">
                {displayedCoaNodes.map((node) => {
                  const acc = node.account;
                  const statusLabel = acc.status || (acc.isActive ? "Active" : "Inactive");
                  return (
                    <tr key={acc.id || acc.accountCode} className="hover:bg-slate-900/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{acc.accountCode}</td>
                      <td className="py-2.5 px-3">
                        <div style={{ paddingLeft: `${node.depth * 16}px` }} className="flex items-center gap-1.5">
                          {node.depth > 0 && <span className="text-slate-600 font-mono">↳</span>}
                          <div>
                            <div className="font-bold text-white">{acc.accountName}</div>
                            {acc.parentAccountCode && (
                              <div className="text-[10px] text-slate-500">
                                Parent: {acc.parentAccountCode} {acc.parentAccountName ? `(${acc.parentAccountName})` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{node.categoryGroup}</td>
                      <td className="py-2.5 px-3 font-mono">{acc.normalBalance}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(acc.openingBalance || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-200">
                        {formatCurrency(node.ownBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                        {formatCurrency(node.rollupBalance)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            statusLabel === "Active"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : statusLabel === "Archived"
                              ? "bg-slate-900 text-slate-500 border-slate-700"
                              : "bg-amber-950 text-amber-400 border-amber-800"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onFilterChange({ ...filterState, accountCode: acc.accountCode });
                              setSelectedReport("account-ledger-report");
                              setSubTab("reports");
                            }}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-blue-400 cursor-pointer"
                          >
                            Ledger
                          </button>
                          {isFinanceOperator && (
                            <button
                              type="button"
                              onClick={() => {
                                setCoaForm({
                                  id: acc.id,
                                  accountCode: acc.accountCode,
                                  accountName: acc.accountName,
                                  categoryGroup: node.categoryGroup,
                                  subType: acc.subType,
                                  parentAccountCode: acc.parentAccountCode || "",
                                  normalBalance: acc.normalBalance,
                                  openingBalance: String(acc.openingBalance || 0),
                                  status: statusLabel as any,
                                  description: acc.description || "",
                                });
                                setShowCoaModal(true);
                              }}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: JOURNAL ENTRIES & REVERSAL WORKFLOW */}
      {subTab === "journals" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {["ALL", "Draft", "Submitted", "Posted", "Reversed", "Rejected"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onFilterChange({ ...filterState, entryStatus: st })}
                  className={`px-3 py-1.5 rounded-lg font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                    filterState.entryStatus === st
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {isFinanceOperator && (
              <button
                type="button"
                onClick={() => setShowJournalModal(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Journal Entry</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                  <th className="py-3 px-3">Journal #</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type & Source</th>
                  <th className="py-3 px-3">Description & Ref</th>
                  <th className="py-3 px-3">Project / Dept</th>
                  <th className="py-3 px-3 text-right">Debit</th>
                  <th className="py-3 px-3 text-right">Credit</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Governance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-200">
                {glState.filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No journal vouchers match the selected filters.
                    </td>
                  </tr>
                ) : (
                  glState.filteredJournals.slice(0, 150).map((je) => {
                    const isPersistedManual = rawJournalEntries.some((r) => r.id === je.id);
                    return (
                      <tr key={je.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{je.journalNo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{je.entryDate}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{je.entryType}</div>
                          <div className="text-[10px] text-slate-400">{je.sourceModule}</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          <div className="text-slate-200 truncate" title={je.description}>
                            {je.description}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Ref: {je.referenceNo} · By: {je.preparedBy}
                            {je.approvedBy ? ` · Appr: ${je.approvedBy}` : ""}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-300">{je.project}</div>
                          <div className="text-[10px] text-slate-500">{je.department}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">
                          {formatCurrency(je.totalDebit)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-400">
                          {formatCurrency(je.totalCredit)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              je.status === "Posted"
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : je.status === "Reversed"
                                ? "bg-purple-950 text-purple-300 border-purple-800"
                                : je.status === "Rejected"
                                ? "bg-red-950 text-red-400 border-red-800"
                                : "bg-amber-950 text-amber-400 border-amber-800"
                            }`}
                          >
                            {je.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {isDirectorOrFinanceMgr && (je.status === "Draft" || je.status === "Submitted") && (
                              <>
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleApproveJournal(je)}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Post
                                </button>
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleRejectJournal(je)}
                                  className="px-2 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isPersistedManual && isFinanceOperator && (je.status === "Draft" || je.status === "Rejected") && (
                              <button
                                type="button"
                                disabled={busyAction}
                                onClick={async () => {
                                  await DbService.deleteJournalEntry(je.id);
                                  setBanner({ type: "success", text: `Draft entry ${je.journalNo} deleted.` });
                                }}
                                className="p-1 rounded bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete Draft"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            {isDirectorOrFinanceMgr &&
                              isPersistedManual &&
                              je.status === "Posted" &&
                              !je.reversedByEntryId &&
                              je.entryType !== "Reversing" && (
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => {
                                    setReversingTarget(je);
                                    setReversalReason("");
                                  }}
                                  className="px-2 py-1 rounded bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Posted entries cannot be deleted; create a linked Reversing Entry"
                                >
                                  <RotateCcw size={11} />
                                  <span>Reverse</span>
                                </button>
                              )}
                            {je.reversedByEntryId && (
                              <span className="text-[10px] font-mono text-purple-400">Immutable</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: 7 LEDGER REPORTS */}
      {subTab === "reports" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {PART8_REPORT_TABS.map((rep) => (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => setSelectedReport(rep.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedReport === rep.id
                      ? "bg-red-600 text-white border-red-500"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {isAmharic ? rep.labelAm : rep.labelEn}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => exportPart8Report({ reportType: selectedReport, state: glState, format: "xlsx" })}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet size={13} />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => exportPart8Report({ reportType: selectedReport, state: glState, format: "csv" })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download size={13} />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer no-print"
              >
                <Printer size={13} />
                <span>Print</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            {selectedReport === "general-ledger-report" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Journal #</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Project / Dept</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit</th>
                    <th className="py-2.5 px-3 text-right">Credit</th>
                    <th className="py-2.5 px-3 text-right">Running Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {glState.filteredGlRows.slice(0, 250).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50">
                      <td className="py-2 px-3 font-mono text-slate-400">{r.entryDate}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-400">{r.journalNo}</td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-slate-200">{r.accountCode}</span>{" "}
                        <span className="text-slate-400">{r.accountName}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{r.project} / {r.department}</td>
                      <td className="py-2 px-3 text-slate-300 max-w-xs truncate">{r.description}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400">
                        {r.debit ? formatCurrency(r.debit) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-400">
                        {r.credit ? formatCurrency(r.credit) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">
                        {formatCurrency(r.runningBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "account-ledger-report" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400">Account Ledger:</span>{" "}
                    <span className="font-mono font-bold text-amber-400">
                      {glState.selectedAccountLedger.account?.accountCode}
                    </span>{" "}
                    <span className="font-bold text-white">
                      {glState.selectedAccountLedger.account?.accountName}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 font-mono tabular-nums">
                    <span>Opening: <strong className="text-slate-200">{formatCurrency(glState.selectedAccountLedger.openingBalance)}</strong></span>
                    <span>Dr: <strong className="text-emerald-400">{formatCurrency(glState.selectedAccountLedger.totalDebit)}</strong></span>
                    <span>Cr: <strong className="text-blue-400">{formatCurrency(glState.selectedAccountLedger.totalCredit)}</strong></span>
                    <span>Closing: <strong className="text-white">{formatCurrency(glState.selectedAccountLedger.closingBalance)}</strong></span>
                  </div>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Journal #</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                      <th className="py-2.5 px-3 text-right">Credit</th>
                      <th className="py-2.5 px-3 text-right">Running Bal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {glState.selectedAccountLedger.rows.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-mono text-slate-400">{r.entryDate}</td>
                        <td className="py-2 px-3 font-mono text-amber-400">{r.journalNo}</td>
                        <td className="py-2 px-3 text-slate-400">{r.sourceModule}</td>
                        <td className="py-2 px-3 text-slate-200">{r.description}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400">{r.debit ? formatCurrency(r.debit) : "-"}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-400">{r.credit ? formatCurrency(r.credit) : "-"}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">{formatCurrency(r.runningBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === "trial-balance" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Opening Dr</th>
                    <th className="py-2.5 px-3 text-right">Opening Cr</th>
                    <th className="py-2.5 px-3 text-right">Period Dr</th>
                    <th className="py-2.5 px-3 text-right">Period Cr</th>
                    <th className="py-2.5 px-3 text-right">Ending Dr</th>
                    <th className="py-2.5 px-3 text-right">Ending Cr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {glState.trialBalanceRows.map((tb) => (
                    <tr key={tb.accountCode}>
                      <td className="py-2 px-3 font-mono font-bold text-amber-400">{tb.accountCode}</td>
                      <td className="py-2 px-3 font-semibold text-white">{tb.accountName}</td>
                      <td className="py-2 px-3 text-slate-400">{tb.accountType}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(tb.openingDebit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(tb.openingCredit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400">{formatCurrency(tb.periodDebit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-400">{formatCurrency(tb.periodCredit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">{formatCurrency(tb.endingDebit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">{formatCurrency(tb.endingCredit)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-700 bg-slate-900 font-black">
                    <td colSpan={3} className="py-2.5 px-3 text-white">TOTAL TRIAL BALANCE</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(statementsState.trialBalanceSummary.totalOpeningDebit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{formatCurrency(statementsState.trialBalanceSummary.totalOpeningCredit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">{formatCurrency(statementsState.trialBalanceSummary.totalPeriodDebit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-400">{formatCurrency(statementsState.trialBalanceSummary.totalPeriodCredit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white">{formatCurrency(statementsState.trialBalanceSummary.totalEndingDebit)}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white">{formatCurrency(statementsState.trialBalanceSummary.totalEndingCredit)}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {selectedReport === "journal-register" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Journal #</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Source Module</th>
                    <th className="py-2.5 px-3">Prepared / Approved</th>
                    <th className="py-2.5 px-3 text-right">Debit</th>
                    <th className="py-2.5 px-3 text-right">Credit</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {glState.filteredJournals.map((j) => (
                    <tr key={j.id}>
                      <td className="py-2 px-3 font-mono text-slate-400">{j.entryDate}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-400">{j.journalNo}</td>
                      <td className="py-2 px-3 text-slate-200">{j.entryType}</td>
                      <td className="py-2 px-3 text-slate-300">{j.sourceModule}</td>
                      <td className="py-2 px-3 text-slate-400">{j.preparedBy} / {j.approvedBy || "-"}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400">{formatCurrency(j.totalDebit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-400">{formatCurrency(j.totalCredit)}</td>
                      <td className="py-2 px-3 font-bold">{j.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "account-balance-summary" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Account Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Period Dr</th>
                    <th className="py-2.5 px-3 text-right">Period Cr</th>
                    <th className="py-2.5 px-3 text-right">Own Balance</th>
                    <th className="py-2.5 px-3 text-right">Rollup Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {glState.coaNodes.map((n) => (
                    <tr key={n.account.accountCode}>
                      <td className="py-2 px-3 font-mono text-amber-400 font-bold">{n.account.accountCode}</td>
                      <td className="py-2 px-3 text-white font-semibold">{n.account.accountName}</td>
                      <td className="py-2 px-3 text-slate-400">{n.categoryGroup}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400">{formatCurrency(n.periodDebit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-400">{formatCurrency(n.periodCredit)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(n.ownBalance)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">{formatCurrency(n.rollupBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(selectedReport === "project-ledger" || selectedReport === "department-ledger") && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold">
                    <th className="py-2.5 px-3">{selectedReport === "project-ledger" ? "Project Name" : "Department"}</th>
                    <th className="py-2.5 px-3 text-right">GL Lines</th>
                    <th className="py-2.5 px-3 text-right">Total Debit</th>
                    <th className="py-2.5 px-3 text-right">Total Credit</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Costs & Expenses</th>
                    <th className="py-2.5 px-3 text-right">Net Movement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {(selectedReport === "project-ledger" ? glState.projectLedgerRows : glState.departmentLedgerRows).map((row) => (
                    <tr key={row.dimensionName}>
                      <td className="py-2.5 px-3 font-bold text-white">{row.dimensionName}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{row.entryCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">{formatCurrency(row.totalDebit)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-400">{formatCurrency(row.totalCredit)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-400">{formatCurrency(row.revenueRecognized)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-400">{formatCurrency(row.directAndOperatingCosts)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-white">{formatCurrency(row.netMovement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: FINANCIAL YEARS & ACCOUNTING PERIODS */}
      {subTab === "periods" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Financial Years Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-amber-400" />
                <span>Financial Years Governance</span>
              </h3>
              {isDirectorOrFinanceMgr && (
                <form onSubmit={handleCreateFinancialYear} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="2020"
                    max="2040"
                    value={newFyYear}
                    onChange={(e) => setNewFyYear(e.target.value)}
                    className="w-20 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={busyAction}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    + Open FY
                  </button>
                </form>
              )}
            </div>

            <div className="space-y-2.5">
              {glState.financialYears.map((fy) => (
                <div
                  key={fy.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="font-mono text-amber-400">{fy.yearCode}</span>
                      <span>{fy.yearLabel}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {fy.startDate} → {fy.endDate}
                      {fy.closedBy ? ` · Closed by ${fy.closedBy}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        fy.status === "Closed"
                          ? "bg-red-950 text-red-400 border-red-800"
                          : "bg-emerald-950 text-emerald-400 border-emerald-800"
                      }`}
                    >
                      {fy.status}
                    </span>
                    {isDirectorOrFinanceMgr && (
                      fy.status === "Closed" ? (
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() => handleToggleYearStatus(fy, "Reopened")}
                          className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Unlock size={11} />
                          <span>Reopen</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={() => handleToggleYearStatus(fy, "Closed")}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-red-950 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Lock size={11} />
                          <span>Close FY</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accounting Periods Close / Reopen Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" />
              <span>Accounting Periods Lock & History</span>
            </h3>

            {isDirectorOrFinanceMgr && (
              <form onSubmit={handleCloseAccountingPeriod} className="p-3 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <select
                  value={newPeriodForm.periodType}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, periodType: e.target.value as any })}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Annual">Annual</option>
                </select>
                <input
                  type="date"
                  value={newPeriodForm.startDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, startDate: e.target.value })}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
                <input
                  type="date"
                  value={newPeriodForm.endDate}
                  onChange={(e) => setNewPeriodForm({ ...newPeriodForm, endDate: e.target.value })}
                  className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                >
                  Close Period
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {rawPeriods.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No accounting periods closed yet. All periods are currently Open.
                </div>
              ) : (
                rawPeriods.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{p.periodLabel}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Net Profit: {formatCurrency(p.netProfitSnapshot)} · Assets: {formatCurrency(p.totalAssetsSnapshot)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.status === "Closed"
                            ? "bg-red-950 text-red-400 border-red-800"
                            : "bg-emerald-950 text-emerald-400 border-emerald-800"
                        }`}
                      >
                        {p.status}
                      </span>
                      {isDirectorOrFinanceMgr && p.status === "Closed" && (
                        <button
                          type="button"
                          disabled={busyAction}
                          onClick={async () => {
                            await reopenClosedFinancialPeriod({
                              period: p,
                              reason: `Authorized period reopen by ${actorName}`,
                              actorName,
                              actorRole: String(actorRole),
                              actorUid,
                            });
                            setBanner({ type: "success", text: `Period ${p.periodKey} reopened.` });
                          }}
                          className="px-2 py-1 rounded bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-300 text-[10px] font-bold cursor-pointer"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CHART OF ACCOUNTS */}
      {showCoaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSaveChartAccount}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">Chart of Accounts Entry</h3>
              <button type="button" onClick={() => setShowCoaModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Account Code *</label>
                <input
                  required
                  value={coaForm.accountCode}
                  onChange={(e) => setCoaForm({ ...coaForm, accountCode: e.target.value })}
                  placeholder="e.g. 1025"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Category *</label>
                <select
                  value={coaForm.categoryGroup}
                  onChange={(e) => {
                    const cat = e.target.value as Part8CoaCategoryGroup;
                    const t = mapPart8CategoryToAccountType(cat);
                    setCoaForm({
                      ...coaForm,
                      categoryGroup: cat,
                      subType: SUB_TYPES_FOR_TYPE[t][0],
                      normalBalance: t === "Asset" || t === "Cost of Construction" || t === "Operating Expense" ? "Debit" : "Credit",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  {PART8_COA_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 font-bold mb-1">Account Name *</label>
                <input
                  required
                  value={coaForm.accountName}
                  onChange={(e) => setCoaForm({ ...coaForm, accountName: e.target.value })}
                  placeholder="e.g. Dashen Bank Construction Escrow Account"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Parent Account (Optional)</label>
                <select
                  value={coaForm.parentAccountCode}
                  onChange={(e) => setCoaForm({ ...coaForm, parentAccountCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="">None (Top-Level Header)</option>
                  {activeAccounts
                    .filter((a) => a.accountCode !== coaForm.accountCode)
                    .map((a) => (
                      <option key={a.accountCode} value={a.accountCode}>
                        {a.accountCode} — {a.accountName}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Normal Balance</label>
                <select
                  value={coaForm.normalBalance}
                  onChange={(e) => setCoaForm({ ...coaForm, normalBalance: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Debit">Debit</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={coaForm.openingBalance}
                  onChange={(e) => setCoaForm({ ...coaForm, openingBalance: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Account Status</label>
                <select
                  value={coaForm.status}
                  onChange={(e) => setCoaForm({ ...coaForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 font-bold mb-1">Description</label>
                <input
                  value={coaForm.description}
                  onChange={(e) => setCoaForm({ ...coaForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCoaModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busyAction} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">
                Save Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE DOUBLE-ENTRY JOURNAL VOUCHER */}
      {showJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitJournalVoucher}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">Create Double-Entry Journal Voucher</h3>
              <button type="button" onClick={() => setShowJournalModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Transaction Date *</label>
                <input
                  type="date"
                  required
                  value={jeForm.entryDate}
                  onChange={(e) => setJeForm({ ...jeForm, entryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Entry Type</label>
                <select
                  value={jeForm.entryType}
                  onChange={(e) => setJeForm({ ...jeForm, entryType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="Standard">Manual / Standard</option>
                  <option value="Adjusting">Adjusting Entry</option>
                  <option value="Opening Balance">Opening Balance</option>
                  <option value="Closing">Closing Entry</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Reference No.</label>
                <input
                  value={jeForm.referenceNo}
                  onChange={(e) => setJeForm({ ...jeForm, referenceNo: e.target.value })}
                  placeholder="JV-REF-001"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Project</label>
                <input
                  value={jeForm.project}
                  onChange={(e) => setJeForm({ ...jeForm, project: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Department</label>
                <input
                  value={jeForm.department}
                  onChange={(e) => setJeForm({ ...jeForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Description *</label>
                <input
                  required
                  value={jeForm.description}
                  onChange={(e) => setJeForm({ ...jeForm, description: e.target.value })}
                  placeholder="Accrual / Adjustment memo"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Journal Lines (Total Debits must equal Total Credits)</span>
                <button
                  type="button"
                  onClick={() =>
                    setJeForm({
                      ...jeForm,
                      lines: [...jeForm.lines, { accountCode: "1020", debit: "", credit: "", memo: "" }],
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
                >
                  + Add Line
                </button>
              </div>
              {jeForm.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={line.accountCode}
                    onChange={(e) => {
                      const next = [...jeForm.lines];
                      next[idx] = { ...next[idx], accountCode: e.target.value };
                      setJeForm({ ...jeForm, lines: next });
                    }}
                    className="col-span-5 px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  >
                    {activeAccounts.map((a) => (
                      <option key={a.accountCode} value={a.accountCode}>
                        {a.accountCode} — {a.accountName}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={(e) => {
                      const next = [...jeForm.lines];
                      next[idx] = { ...next[idx], debit: e.target.value, credit: e.target.value ? "0" : next[idx].credit };
                      setJeForm({ ...jeForm, lines: next });
                    }}
                    className="col-span-2 px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-right"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Credit"
                    value={line.credit}
                    onChange={(e) => {
                      const next = [...jeForm.lines];
                      next[idx] = { ...next[idx], credit: e.target.value, debit: e.target.value ? "0" : next[idx].debit };
                      setJeForm({ ...jeForm, lines: next });
                    }}
                    className="col-span-2 px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-blue-400 font-mono text-right"
                  />
                  <input
                    placeholder="Line memo"
                    value={line.memo}
                    onChange={(e) => {
                      const next = [...jeForm.lines];
                      next[idx] = { ...next[idx], memo: e.target.value };
                      setJeForm({ ...jeForm, lines: next });
                    }}
                    className="col-span-2 px-2.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
                  />
                  {jeForm.lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setJeForm({
                          ...jeForm,
                          lines: jeForm.lines.filter((_, i) => i !== idx),
                        })
                      }
                      className="col-span-1 p-2 text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-4 font-mono tabular-nums">
                <span>Total Dr: <strong className="text-emerald-400">{formatCurrency(journalPreviewTotals.totalDebit)}</strong></span>
                <span>Total Cr: <strong className="text-blue-400">{formatCurrency(journalPreviewTotals.totalCredit)}</strong></span>
              </div>
              <span className={`font-bold ${journalPreviewTotals.valid ? "text-emerald-400" : "text-red-400"}`}>
                {journalPreviewTotals.valid ? "Balanced (Dr = Cr)" : journalPreviewTotals.error}
              </span>
            </div>

            {isDirectorOrFinanceMgr && (
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jeForm.autoPost}
                  onChange={(e) => setJeForm({ ...jeForm, autoPost: e.target.checked })}
                />
                <span>Approve & Post immediately to Official General Ledger</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowJournalModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyAction || !journalPreviewTotals.valid}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold cursor-pointer"
              >
                Save Journal Voucher
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AUTHORIZED REVERSING ENTRY (NEVER DELETES POSTED ENTRIES) */}
      {reversingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleReversePostedJournal}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white">Reverse Posted Journal Entry</h3>
              <button type="button" onClick={() => setReversingTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 bg-purple-950/40 border border-purple-800/70 rounded-xl text-purple-200 leading-relaxed">
              Approved/Posted entries (<strong>{reversingTarget.journalNo}</strong>) cannot be deleted. Creating a linked Reversing Entry preserves full audit integrity.
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Reversal Date *</label>
              <input
                type="date"
                required
                value={reversalDate}
                onChange={(e) => setReversalDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-bold mb-1">Mandatory Audit Reason *</label>
              <textarea
                required
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Reason for reversing this posted voucher..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReversingTarget(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busyAction} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer">
                Post Reversing Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
