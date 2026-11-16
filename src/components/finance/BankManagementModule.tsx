import React, { useMemo, useState } from "react";
import {
  Landmark,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  GitCompare,
  ArrowRightLeft,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Lock,
  Sparkles,
  FileCheck2,
  Eye,
  Building2,
  Search,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BankAccountSubtype,
  BankReconciliationRecord,
  BankReconciliationStatus,
  BankReconciliationWorkflowStage,
  BankStatementLineItem,
  BankTransactionRecord,
  BankTransactionType,
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  ImmutableBankStatementRecord,
  PayrollRecord,
} from "../../types";
import {
  approveBankTransaction,
  autoMatchStatementLines,
  BANK_ACCOUNT_SUBTYPES,
  BANK_TRANSACTION_TYPES,
  computePart6ReconciliationAnalysis,
  createBankTransaction,
  generateBankRef,
  getDefaultDirectionForBankTxType,
  manualMatchStatementLine,
  parseBankStatementFile,
  ParsedStatementLineDraft,
  ParsedStatementPreview,
  Part6BankDashboardState,
  Part6BankFilterState,
  RECONCILIATION_WORKFLOW_STAGES,
  registerBankAccount,
  rejectBankTransaction,
  reverseBankTransaction,
  saveImmutableBankStatementAndImport,
  saveOrSubmitBankReconciliation,
  UnifiedBankLedgerRow,
  unmatchStatementLine,
  updateBankAccountStatus,
} from "../../services/bankManagementService";
import { formatCurrency } from "../../utils/formatters";
import { BankReportsCenter } from "./BankReportsCenter";

export type Part6BankSubTab =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "statement-import"
  | "reconciliation"
  | "reports";

interface BankManagementModuleProps {
  isAmharic: boolean;
  bankState: Part6BankDashboardState;
  filterState: Part6BankFilterState;
  onFilterChange: (next: Part6BankFilterState) => void;
  onResetFilters: () => void;
  rawAccounts: FinancialAccount[];
  rawBankTransactions: BankTransactionRecord[];
  rawCashTransactions: CashTransactionRecord[];
  rawStatements: ImmutableBankStatementRecord[];
  rawReconciliations: BankReconciliationRecord[];
  rawInvoices: FinancialInvoiceRecord[];
  rawExpenses: Expense[];
  rawPayroll: PayrollRecord[];
  defaultSubTab?: Part6BankSubTab;
  actorName: string;
  actorRole: string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

export const BankManagementModule: React.FC<BankManagementModuleProps> = ({
  isAmharic,
  bankState,
  filterState,
  onFilterChange,
  onResetFilters,
  rawAccounts,
  rawBankTransactions,
  rawCashTransactions,
  rawStatements,
  rawReconciliations,
  rawInvoices,
  rawExpenses,
  rawPayroll,
  defaultSubTab = "dashboard",
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const [subTab, setSubTab] = useState<Part6BankSubTab>(defaultSubTab);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const cur = bankState.currency || "ETB";
  const perms = bankState.permissions;
  const canApproveBank = perms.canApproveTransactions || perms.isFinanceManager || perms.isDirector;
  const canManageBank = perms.canManageTransactions || perms.isFinanceManager || perms.isDirector;

  const notify = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // --- SUBTAB 2: BANK ACCOUNT FORM STATE ---
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accForm, setAccForm] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    bankAccountSubtype: "Checking" as BankAccountSubtype,
    currency: cur,
    branch: "",
    swiftOrIban: "",
    openingBalance: 0,
    minimumThreshold: 100000,
    project: "Corporate Treasury",
    status: "Active" as "Active" | "Inactive" | "Frozen",
  });

  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await registerBankAccount({
        ...accForm,
        existingAccounts: rawAccounts,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Register Bank Account", `${created.bankName} — ${created.accountName} (${created.accountNumber})`);
      notify("ok", isAmharic ? `የባንክ ሂሳብ ${created.accountName} ተመዝግቧል።` : `Bank account ${created.accountName} registered.`);
      setShowAccountModal(false);
      setAccForm({
        bankName: "",
        accountName: "",
        accountNumber: "",
        bankAccountSubtype: "Checking",
        currency: cur,
        branch: "",
        swiftOrIban: "",
        openingBalance: 0,
        minimumThreshold: 100000,
        project: "Corporate Treasury",
        status: "Active",
      });
    } catch (err: any) {
      notify("err", err?.message || "Failed to register bank account.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAccountStatus = async (
    account: FinancialAccount,
    nextStatus: "Active" | "Inactive" | "Frozen" | "Closed"
  ) => {
    setBusy(true);
    try {
      await updateBankAccountStatus({
        account,
        nextStatus,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Update Bank Account Status", `${account.accountName} -> ${nextStatus}`);
      notify("ok", `${account.accountName} status updated to ${nextStatus}.`);
    } catch (err: any) {
      notify("err", err?.message || "Status update failed.");
    } finally {
      setBusy(false);
    }
  };

  // --- SUBTAB 3: BANK TRANSACTION FORM & APPROVAL ACTIONS ---
  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState<{
    accountId: string;
    toAccountId: string;
    transactionType: BankTransactionType;
    direction: "Credit" | "Debit";
    transactionDate: string;
    amount: number;
    referenceNo: string;
    chequeNumber: string;
    project: string;
    counterparty: string;
    description: string;
    paymentMethod: string;
    linkedDocumentType: "Direct" | "Invoice" | "Expense" | "Payroll";
    linkedDocumentId: string;
  }>({
    accountId: bankState.bankAccounts[0]?.id || "",
    toAccountId: "",
    transactionType: "Deposits",
    direction: "Credit",
    transactionDate: bankState.referenceToday,
    amount: 0,
    referenceNo: "",
    chequeNumber: "",
    project: "Corporate Treasury",
    counterparty: "",
    description: "",
    paymentMethod: "Bank Transfer",
    linkedDocumentType: "Direct",
    linkedDocumentId: "",
  });

  const openNewTxModal = (presetType?: BankTransactionType) => {
    const tType = presetType || "Deposits";
    setTxForm((prev) => ({
      ...prev,
      accountId: prev.accountId || bankState.bankAccounts[0]?.id || "",
      transactionType: tType,
      direction: getDefaultDirectionForBankTxType(tType),
      transactionDate: bankState.referenceToday,
      amount: 0,
      referenceNo: generateBankRef("BTX"),
      chequeNumber: "",
      counterparty: "",
      description: "",
      linkedDocumentType: "Direct",
      linkedDocumentId: "",
    }));
    setShowTxModal(true);
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const acc = rawAccounts.find((a) => a.id === txForm.accountId);
    if (!acc) {
      notify("err", "Select a valid company bank account.");
      return;
    }
    const toAcc = txForm.toAccountId ? rawAccounts.find((a) => a.id === txForm.toAccountId) : undefined;
    setBusy(true);
    try {
      const rec = await createBankTransaction({
        account: acc,
        toAccount: toAcc,
        transactionType: txForm.transactionType,
        direction: txForm.direction,
        transactionDate: txForm.transactionDate,
        amount: txForm.amount,
        referenceNo: txForm.referenceNo,
        chequeNumber: txForm.chequeNumber,
        project: txForm.project,
        counterparty: txForm.counterparty,
        description: txForm.description,
        paymentMethod: txForm.paymentMethod,
        linkedDocumentType: txForm.linkedDocumentType,
        linkedDocumentId: txForm.linkedDocumentId || undefined,
        existingBankTxs: rawBankTransactions,
        existingCashTxs: rawCashTransactions,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Create Bank Transaction", `${rec.transactionNo} (${rec.transactionType}) ${cur} ${rec.amount}`);
      notify("ok", `${rec.transactionNo} saved as ${rec.approvalStatus}. Balance will update after approval.`);
      setShowTxModal(false);
    } catch (err: any) {
      notify("err", err?.message || "Failed to record bank transaction.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveTx = async (tx: BankTransactionRecord) => {
    setBusy(true);
    try {
      const updated = await approveBankTransaction({
        tx,
        accounts: rawAccounts,
        invoices: rawInvoices,
        expenses: rawExpenses,
        payrollRecords: rawPayroll,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Approve Bank Transaction", `${updated.transactionNo} approved (${cur} ${updated.amount})`);
      notify("ok", `${updated.transactionNo} approved & bank balance updated atomically.`);
    } catch (err: any) {
      notify("err", err?.message || "Approval failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectTx = async (tx: BankTransactionRecord) => {
    setBusy(true);
    try {
      await rejectBankTransaction({
        tx,
        reason: "Rejected by finance reviewer",
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Reject Bank Transaction", `${tx.transactionNo} rejected`);
      notify("ok", `${tx.transactionNo} rejected (account balance untouched).`);
    } catch (err: any) {
      notify("err", err?.message || "Rejection failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleReverseTx = async (tx: BankTransactionRecord) => {
    setBusy(true);
    try {
      await reverseBankTransaction({
        tx,
        reason: "Finance reversal",
        accounts: rawAccounts,
        invoices: rawInvoices,
        expenses: rawExpenses,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Reverse Bank Transaction", `${tx.transactionNo} reversed`);
      notify("ok", `${tx.transactionNo} reversed & bank balance restored.`);
    } catch (err: any) {
      notify("err", err?.message || "Reversal failed.");
    } finally {
      setBusy(false);
    }
  };

  // --- SUBTAB 4: STATEMENT IMPORT (EXCEL, CSV, PDF + MANUAL VERIFICATION) ---
  const [importAccountId, setImportAccountId] = useState<string>(bankState.bankAccounts[0]?.id || "");
  const [importProject, setImportProject] = useState<string>("Corporate Treasury");
  const [importPreview, setImportPreview] = useState<ParsedStatementPreview | null>(null);
  const [verifiedLines, setVerifiedLines] = useState<ParsedStatementLineDraft[]>([]);
  const [importOpeningBal, setImportOpeningBal] = useState<number>(0);
  const [importClosingBal, setImportClosingBal] = useState<number>(0);
  const [importNotes, setImportNotes] = useState<string>("");
  const [selectedArchiveStmt, setSelectedArchiveStmt] = useState<ImmutableBankStatementRecord | null>(null);

  const handleStatementFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetAccountId = importAccountId || bankState.bankAccounts[0]?.id || "";
    setBusy(true);
    try {
      const preview = await parseBankStatementFile(
        file,
        rawBankTransactions,
        rawCashTransactions,
        targetAccountId
      );
      setImportPreview(preview);
      setVerifiedLines(preview.lines);
      setImportOpeningBal(preview.openingBalance);
      setImportClosingBal(preview.closingBalance);
      notify(
        "ok",
        `Parsed ${preview.lines.length} line(s) from ${preview.fileName} (${preview.fileFormat}). Review & verify before importing.`
      );
    } catch (err: any) {
      notify("err", err?.message || "Failed to parse bank statement.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleEditVerifiedLine = (
    idx: number,
    patch: Partial<ParsedStatementLineDraft>
  ) => {
    setVerifiedLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        const merged = { ...line, ...patch, wasManuallyCorrected: true };
        const dep = Number(merged.depositAmount) || 0;
        const wdr = Number(merged.withdrawalAmount) || 0;
        const direction: "Credit" | "Debit" = dep > 0 ? "Credit" : "Debit";
        const amount = dep > 0 ? dep : wdr;
        return {
          ...merged,
          direction,
          amount,
        };
      })
    );
  };

  const handleAddManualStatementPreviewLine = () => {
    const nextNum = verifiedLines.length + 1;
    setVerifiedLines((prev) => [
      ...prev,
      {
        id: generateBankRef("BSL") + `-${nextNum}`,
        lineNumber: nextNum,
        transactionDate: bankState.referenceToday,
        description: "Manual Verified Statement Entry",
        referenceNo: `STMT-${nextNum}`,
        depositAmount: 0,
        withdrawalAmount: 0,
        direction: "Credit",
        amount: 0,
        wasManuallyCorrected: true,
        suggestedTxType: "Deposits",
      },
    ]);
  };

  const handleSaveImmutableStatementAndImport = async () => {
    const acc = rawAccounts.find((a) => a.id === (importAccountId || bankState.bankAccounts[0]?.id));
    if (!acc) {
      notify("err", "Please select the company bank account for this statement.");
      return;
    }
    if (!importPreview) return;
    setBusy(true);
    try {
      const res = await saveImmutableBankStatementAndImport({
        account: acc,
        preview: importPreview,
        verifiedLines: verifiedLines.filter((l) => l.amount > 0),
        openingBalance: importOpeningBal,
        closingBalance: importClosingBal,
        project: importProject,
        notes: importNotes,
        existingStatements: rawStatements,
        existingBankTxs: rawBankTransactions,
        existingCashTxs: rawCashTransactions,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(
        "Import Immutable Bank Statement",
        `${res.statement.statementNo}: imported ${res.importedTransactions.length} pending rows`
      );
      notify(
        "ok",
        `Archived immutable statement ${res.statement.statementNo} and imported ${res.importedTransactions.length} transaction(s) as Pending Verification (skipped ${res.skippedDuplicates} duplicates).`
      );
      setImportPreview(null);
      setVerifiedLines([]);
      // Automatically prime reconciliation workbench with the newly uploaded statement!
      loadStatementIntoReconciliation(res.statement);
    } catch (err: any) {
      notify("err", err?.message || "Failed to archive statement.");
    } finally {
      setBusy(false);
    }
  };

  // --- SUBTAB 5: BANK RECONCILIATION WORKBENCH (6-STAGE WORKFLOW + 7 IDENTIFICATIONS) ---
  const [reconAccountId, setReconAccountId] = useState<string>(bankState.bankAccounts[0]?.id || "");
  const [reconRecordEditing, setReconRecordEditing] = useState<BankReconciliationRecord | null>(null);
  const [reconStatementId, setReconStatementId] = useState<string>("");
  const [reconStatementNo, setReconStatementNo] = useState<string>("");
  const [reconPeriodStart, setReconPeriodStart] = useState<string>(
    `${bankState.referenceToday.slice(0, 7)}-01`
  );
  const [reconPeriodEnd, setReconPeriodEnd] = useState<string>(bankState.referenceToday);
  const [reconStmtOpening, setReconStmtOpening] = useState<number>(0);
  const [reconStmtClosing, setReconStmtClosing] = useState<number>(0);
  const [reconLines, setReconLines] = useState<BankStatementLineItem[]>([]);
  const [reconStage, setReconStage] = useState<BankReconciliationWorkflowStage>("Statement Upload");
  const [reconNotes, setReconNotes] = useState<string>("");
  const [reconFilterTab, setReconFilterTab] = useState<
    | "all"
    | "matched"
    | "unmatched"
    | "missing"
    | "duplicates"
    | "outstanding-deposits"
    | "unpresented-cheques"
    | "bank-charges"
  >("all");
  const [manualLineEntry, setManualLineEntry] = useState({
    statementDate: bankState.referenceToday,
    bankReferenceNo: "",
    description: "",
    direction: "Credit" as "Credit" | "Debit",
    amount: 0,
  });

  const activeReconAccount = useMemo(
    () =>
      bankState.bankAccounts.find((a) => a.id === reconAccountId) ||
      bankState.bankAccounts[0] ||
      null,
    [bankState.bankAccounts, reconAccountId]
  );

  const loadStatementIntoReconciliation = (stmt: ImmutableBankStatementRecord) => {
    setReconAccountId(stmt.accountId);
    setReconRecordEditing(null);
    setReconStatementId(stmt.id);
    setReconStatementNo(stmt.statementNo);
    setReconPeriodStart(stmt.periodStart);
    setReconPeriodEnd(stmt.periodEnd);
    setReconStmtOpening(stmt.openingBalance);
    setReconStmtClosing(stmt.closingBalance);
    const lines: BankStatementLineItem[] = stmt.originalLines.map((l) => ({
      id: l.id,
      lineNumber: l.lineNumber,
      statementDate: l.transactionDate,
      bankReferenceNo: l.referenceNo,
      chequeNumber: l.chequeNumber,
      description: l.description,
      direction: l.direction,
      amount: l.amount,
      depositAmount: l.depositAmount,
      withdrawalAmount: l.withdrawalAmount,
      runningBalance: l.runningBalance,
      matchStatus: "Unmatched",
    }));
    const autoMatched = autoMatchStatementLines(
      lines,
      bankState.ledgerRows.filter((r) => r.accountId === stmt.accountId || r.toAccountId === stmt.accountId)
    );
    setReconLines(autoMatched);
    setReconStage("Transaction Matching");
    setSubTab("reconciliation");
  };

  const loadExistingReconciliation = (rec: BankReconciliationRecord) => {
    setReconRecordEditing(rec);
    setReconAccountId(rec.accountId);
    setReconStatementId(rec.statementId || "");
    setReconStatementNo(rec.statementNo || "");
    setReconPeriodStart(rec.periodStart);
    setReconPeriodEnd(rec.periodEnd);
    setReconStmtOpening(rec.statementOpeningBalance);
    setReconStmtClosing(rec.statementClosingBalance);
    setReconLines(rec.statementLines || []);
    setReconStage(rec.workflowStage || (rec.approvalStatus === "Reconciled" ? "Final Report" : "Difference Identification"));
    setReconNotes(rec.notes || "");
    setSubTab("reconciliation");
  };

  const reconAnalysis = useMemo(() => {
    if (!activeReconAccount) return null;
    return computePart6ReconciliationAnalysis({
      account: activeReconAccount,
      periodStart: reconPeriodStart,
      periodEnd: reconPeriodEnd,
      statementOpeningBalance: reconStmtOpening,
      statementClosingBalance: reconStmtClosing,
      statementLines: reconLines,
      ledgerRows: bankState.ledgerRows,
    });
  }, [
    activeReconAccount,
    reconPeriodStart,
    reconPeriodEnd,
    reconStmtOpening,
    reconStmtClosing,
    reconLines,
    bankState.ledgerRows,
  ]);

  const handleRunAutoMatch = () => {
    if (!activeReconAccount) return;
    const accRows = bankState.ledgerRows.filter(
      (r) => r.accountId === activeReconAccount.id || r.toAccountId === activeReconAccount.id
    );
    const updated = autoMatchStatementLines(reconLines, accRows);
    setReconLines(updated);
    setReconStage("Difference Identification");
    const mCount = updated.filter((l) => l.matchStatus === "Matched").length;
    notify("ok", `Auto-matching completed: ${mCount} of ${updated.length} statement lines matched.`);
  };

  const handleManualPair = (lineId: string, erpId: string) => {
    if (!erpId) {
      setReconLines((prev) => unmatchStatementLine(prev, lineId));
      return;
    }
    const erp = bankState.ledgerRows.find((r) => r.id === erpId);
    if (!erp) return;
    setReconLines((prev) => manualMatchStatementLine(prev, lineId, erp));
    notify("ok", `Statement line manually matched to ${erp.transactionNo}.`);
  };

  const handleAddManualStatementLineToRecon = () => {
    if (manualLineEntry.amount <= 0) return;
    const newLine: BankStatementLineItem = {
      id: generateBankRef("BSL"),
      lineNumber: reconLines.length + 1,
      statementDate: manualLineEntry.statementDate,
      bankReferenceNo: manualLineEntry.bankReferenceNo || `MAN-${reconLines.length + 1}`,
      description: manualLineEntry.description || "Manual Statement Line",
      direction: manualLineEntry.direction,
      amount: Number(manualLineEntry.amount),
      matchStatus: "Unmatched",
    };
    setReconLines((prev) => [...prev, newLine]);
    setManualLineEntry({
      statementDate: bankState.referenceToday,
      bankReferenceNo: "",
      description: "",
      direction: "Credit",
      amount: 0,
    });
  };

  const handleRecordMissingChargeFromStatement = async (line: BankStatementLineItem) => {
    if (!activeReconAccount) return;
    setBusy(true);
    try {
      const created = await createBankTransaction({
        account: activeReconAccount,
        transactionType: "Bank Charges",
        direction: "Debit",
        transactionDate: line.statementDate,
        amount: line.amount,
        referenceNo: line.bankReferenceNo,
        project: activeReconAccount.project || "Corporate Treasury",
        counterparty: activeReconAccount.bankName || "Bank Service Fee",
        description: line.description,
        paymentMethod: "Bank Debit Advice",
        sourceChannel: "Statement Import",
        importedStatementId: reconStatementId || undefined,
        importedStatementLineId: line.id,
        existingBankTxs: rawBankTransactions,
        existingCashTxs: rawCashTransactions,
        actorName,
        actorRole,
        actorUid,
      });
      setReconLines((prev) =>
        manualMatchStatementLine(prev, line.id, {
          id: created.id,
          transactionNo: created.transactionNo,
          sourceCollection: "bankTransactions",
          accountId: created.accountId,
          accountName: created.accountName,
          bankName: created.bankName || "Bank",
          accountNumber: created.accountNumber || "-",
          transactionType: created.transactionType,
          direction: created.direction,
          transactionDate: created.transactionDate,
          amount: created.amount,
          currency: created.currency,
          referenceNo: created.referenceNo,
          project: created.project,
          counterparty: created.counterparty,
          description: created.description,
          paymentMethod: created.paymentMethod || "Bank Debit",
          sourceChannel: created.sourceChannel,
          approvalStatus: created.approvalStatus,
          isApproved: false,
          isPending: true,
          isRejectedOrReversed: false,
          reconciliationStatus: "Matched",
          recordedBy: created.recordedBy,
        })
      );
      notify("ok", `Bank charge ${created.transactionNo} created as Pending Verification & paired.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to record missing bank charge.");
    } finally {
      setBusy(false);
    }
  };

  const handlePersistReconciliationStage = async (
    nextStage: BankReconciliationWorkflowStage,
    nextStatus: BankReconciliationStatus
  ) => {
    if (!activeReconAccount) {
      notify("err", "Select a bank account first.");
      return;
    }
    setBusy(true);
    try {
      const saved = await saveOrSubmitBankReconciliation({
        existingRecord: reconRecordEditing || undefined,
        account: activeReconAccount,
        statementId: reconStatementId || undefined,
        statementNo: reconStatementNo || undefined,
        periodStart: reconPeriodStart,
        periodEnd: reconPeriodEnd,
        statementOpeningBalance: reconStmtOpening,
        statementClosingBalance: reconStmtClosing,
        statementLines: reconLines,
        ledgerRows: bankState.ledgerRows,
        workflowStage: nextStage,
        approvalStatus: nextStatus,
        notes: reconNotes,
        actorName,
        actorRole,
        actorUid,
      });
      setReconRecordEditing(saved);
      setReconStage(nextStage);
      onLogAction?.("Bank Reconciliation Workflow", `${saved.reconciliationNo} -> ${nextStage} (${nextStatus})`);
      notify("ok", `${saved.reconciliationNo} updated to ${nextStage} [${nextStatus}].`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to save reconciliation stage.");
    } finally {
      setBusy(false);
    }
  };

  // Eligible ERP entries for manual matching dropdown on the active recon account
  const activeAccountErpRows = useMemo(() => {
    if (!activeReconAccount) return [];
    return bankState.ledgerRows.filter(
      (r) =>
        (r.accountId === activeReconAccount.id || r.toAccountId === activeReconAccount.id) &&
        !r.isRejectedOrReversed
    );
  }, [activeReconAccount, bankState.ledgerRows]);

  const pendingApprovalBankTxs = useMemo(
    () =>
      rawBankTransactions.filter(
        (t) => t.approvalStatus === "Pending Verification" || t.approvalStatus === "Pending Approval"
      ),
    [rawBankTransactions]
  );

  return (
    <div className="space-y-5" id="finance-module-cash-and-bank">
      {/* HEADER + SUBTAB NAVIGATION */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
              <Landmark size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                {isAmharic
                  ? "13. የባንክ አስተዳደር፣ የመግለጫ ጭነት እና የባንክ ማስታረቂያ"
                  : "13. Bank Management & Bank Reconciliation"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic
                  ? "ባለብዙ ባንክ ሂሳቦች፣ 9 የግብይት አይነቶች፣ Excel/CSV/PDF ጭነት እና ባለ 6 ደረጃ የማስታረቂያ ሂደት"
                  : "Multi-bank accounts, 9 transaction workflows, Excel/CSV/PDF immutable statement import, auto & manual reconciliation, and 7 audit reports."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canManageBank && (
              <>
                <button
                  type="button"
                  onClick={() => openNewTxModal("Deposits")}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus size={14} />
                  <span>{isAmharic ? "አዲስ የባንክ ግብይት" : "New Bank Transaction"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab("statement-import")}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Upload size={14} />
                  <span>{isAmharic ? "መግለጫ ጫን" : "Import Statement"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 6 Sub-Tab Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80">
          {(
            [
              { id: "dashboard", en: "Bank Dashboard", am: "ዳሽቦርድ", badge: 0 },
              { id: "accounts", en: `Bank Accounts (${bankState.bankAccounts.length})`, am: `ባንክ ሂሳቦች (${bankState.bankAccounts.length})`, badge: 0 },
              { id: "transactions", en: "Bank Transactions", am: "የባንክ ግብይቶች", badge: bankState.kpis.pendingApprovalCount },
              { id: "statement-import", en: "Statement Import (Excel/CSV/PDF)", am: "መግለጫ ጭነት", badge: 0 },
              { id: "reconciliation", en: "Bank Reconciliation", am: "የባንክ ማስታረቂያ", badge: bankState.kpis.unreconciledTransactionsCount },
              { id: "reports", en: "Bank Reports (7)", am: "ሪፖርቶች (7)", badge: 0 },
            ] as { id: Part6BankSubTab; en: string; am: string; badge: number }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                subTab === t.id
                  ? "bg-red-600 text-white border-red-500"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{isAmharic ? t.am : t.en}</span>
              {t.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-slate-950/60 text-[10px] font-mono tabular-nums">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            toast.type === "ok"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
              : "bg-red-950/70 border-red-800 text-red-300"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 1: BANK DASHBOARD (ALL 7 REQUIRED KPI METRICS + CHARTS)    */}
      {/* ================================================================= */}
      {subTab === "dashboard" && (
        <div className="space-y-5">
          {/* Primary 7 Dashboard KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Bank Balance
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-cyan-400 mt-1">
                {formatCurrency(bankState.kpis.totalBankBalance, cur)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {bankState.bankAccounts.filter((a) => a.status === "Active").length} active bank account(s)
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cash & Bank Position
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-white mt-1">
                {formatCurrency(bankState.kpis.totalCashAndBankPosition, cur)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                Cash: {formatCurrency(bankState.kpis.totalCashBalance, cur)}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Deposits
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-emerald-400 mt-1">
                {formatCurrency(bankState.kpis.totalDeposits, cur)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Approved credits</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Withdrawals
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-rose-400 mt-1">
                {formatCurrency(bankState.kpis.totalWithdrawals, cur)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Approved debits</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Unreconciled Txs
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-amber-400 mt-1">
                {bankState.kpis.unreconciledTransactionsCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                {formatCurrency(bankState.kpis.unreconciledTransactionsAmount, cur)}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Recon Differences
              </div>
              <div
                className={`text-lg font-black font-mono tabular-nums mt-1 ${
                  bankState.kpis.reconciliationDifferencesTotal > 0.01
                    ? "text-red-400"
                    : "text-emerald-400"
                }`}
              >
                {formatCurrency(bankState.kpis.reconciliationDifferencesTotal, cur)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Latest statement gap</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Last Reconciliation
              </div>
              <div className="text-lg font-black font-mono tabular-nums text-slate-100 mt-1">
                {bankState.kpis.lastReconciliationDate}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {bankState.kpis.pendingApprovalCount} pending approval
              </div>
            </div>
          </div>

          {/* Bank Balances by Account + Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Bank Balances by Account
                </h3>
                <button
                  type="button"
                  onClick={() => setSubTab("accounts")}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Manage Accounts →
                </button>
              </div>
              {bankState.kpis.bankBalancesByAccount.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No bank accounts registered yet. Register a bank account in the Bank Accounts tab.
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bankState.charts.bankBalanceByAccount}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="currentBalance" name={`Balance (${cur})`} fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="threshold" name={`Min Buffer (${cur})`} fill="#475569" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  Monthly Deposits vs Withdrawals
                </h3>
                <button
                  type="button"
                  onClick={() => setSubTab("transactions")}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
                >
                  Open Ledger →
                </button>
              </div>
              {bankState.charts.depositsVsWithdrawals.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No approved bank transactions yet.
                </div>
              ) : (
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bankState.charts.depositsVsWithdrawals}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", fontSize: 11 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="deposits" name="Deposits (Credits)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="withdrawals" name="Withdrawals (Debits)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Bank Balances by Account Table + 9 Transaction Types Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Company Bank Account Balances & Reconciliation Snapshot
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-3">Bank / Account</th>
                      <th className="py-2 px-3">Account No</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Current Balance</th>
                      <th className="py-2 px-3">Last Reconciled</th>
                      <th className="py-2 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {bankState.kpis.bankBalancesByAccount.map((acc) => (
                      <tr key={acc.accountId} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-3">
                          <div className="font-bold text-white">{acc.accountName}</div>
                          <div className="text-[11px] text-slate-400">{acc.bankName}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{acc.accountNumber}</td>
                        <td className="py-2.5 px-3 text-slate-300">{acc.subtype}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                            acc.isBelowThreshold ? "text-amber-400" : "text-cyan-400"
                          }`}
                        >
                          {formatCurrency(acc.currentBalance, acc.currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {acc.lastReconciledDate || "Never"}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <span
                            className={`text-[11px] font-bold ${
                              acc.status === "Active"
                                ? "text-emerald-400"
                                : acc.status === "Frozen"
                                ? "text-amber-400"
                                : "text-slate-400"
                            }`}
                          >
                            {acc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                9 Bank Transaction Categories
              </h3>
              <div className="space-y-1.5 text-xs">
                {bankState.charts.transactionTypeBreakdown.map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-b-0"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{item.type}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({item.count})</span>
                    </div>
                    <div className="font-mono tabular-nums text-right">
                      {item.credits > 0 && (
                        <span className="text-emerald-400">+{formatCurrency(item.credits, cur)}</span>
                      )}
                      {item.debits > 0 && (
                        <span className="text-rose-400 ml-2">-{formatCurrency(item.debits, cur)}</span>
                      )}
                      {item.credits === 0 && item.debits === 0 && (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alerts Strip */}
          {bankState.alerts.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Bank Treasury & Reconciliation Alerts ({bankState.alerts.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {bankState.alerts.map((al) => (
                  <div
                    key={al.id}
                    className={`p-3 rounded-lg border text-xs ${
                      al.severity === "CRITICAL"
                        ? "bg-red-950/30 border-red-900/70 text-red-200"
                        : "bg-amber-950/20 border-amber-900/60 text-amber-200"
                    }`}
                  >
                    <div className="font-bold">{isAmharic ? al.titleAm : al.title}</div>
                    <div className="text-[11px] opacity-85 mt-0.5">
                      {isAmharic ? al.descriptionAm : al.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: BANK ACCOUNT MANAGEMENT + PRESERVED CASH VAULTS         */}
      {/* ================================================================= */}
      {subTab === "accounts" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "የድርጅቱ የባንክ ሂሳቦች ምዝገባ" : "Registered Company Bank Accounts"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic
                  ? "ባለብዙ ባንክ ሂሳቦችን ይመዝግቡ፣ የቀሪ ገንዘብ ገደብ እና ሁኔታን ያስተዳድሩ"
                  : "Register and govern Checking, Savings, Project Escrow, Payroll, and Overdraft accounts with duplicate protection."}
              </p>
            </div>
            {canManageBank && (
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus size={14} />
                <span>{isAmharic ? "አዲስ ባንክ ሂሳብ መዝግብ" : "Register Bank Account"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {bankState.bankAccounts.map((acc) => {
              const bal = Number(acc.currentBalance) || 0;
              const isBelow = acc.status === "Active" && acc.minimumThreshold > 0 && bal < acc.minimumThreshold;
              return (
                <div
                  key={acc.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase text-cyan-400">
                        {acc.bankName || "Commercial Bank"} · {acc.bankAccountSubtype || "Checking"}
                      </div>
                      <h4 className="text-sm font-extrabold text-white mt-0.5">{acc.accountName}</h4>
                      <div className="text-xs font-mono text-slate-400 mt-0.5">
                        A/C: {acc.accountNumber || "-"} · {acc.branch || "Main Branch"}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        acc.status === "Active"
                          ? "text-emerald-400"
                          : acc.status === "Frozen"
                          ? "text-amber-400"
                          : "text-slate-500"
                      }`}
                    >
                      {acc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Current Balance</div>
                      <div
                        className={`text-base font-black font-mono tabular-nums ${
                          isBelow ? "text-amber-400" : "text-white"
                        }`}
                      >
                        {formatCurrency(bal, acc.currency || cur)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase text-slate-500">Opening Balance</div>
                      <div className="text-xs font-mono tabular-nums text-slate-300 mt-1">
                        {formatCurrency(acc.openingBalance || 0, acc.currency || cur)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Min Threshold: {formatCurrency(acc.minimumThreshold || 0, acc.currency || cur)}</span>
                    <span>Last Recon: {acc.lastReconciledDate || "Never"}</span>
                  </div>

                  {canManageBank && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setTxForm((p) => ({ ...p, accountId: acc.id }));
                          openNewTxModal("Deposits");
                        }}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-cyan-300 cursor-pointer"
                      >
                        + Transaction
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReconAccountId(acc.id);
                          setSubTab("reconciliation");
                        }}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer"
                      >
                        Reconcile
                      </button>
                      {acc.status === "Active" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleAccountStatus(acc, "Frozen")}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-amber-400 cursor-pointer"
                        >
                          Freeze
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleAccountStatus(acc, "Active")}
                          className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-emerald-400 cursor-pointer"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Preserved Cash Vault Accounts */}
          {bankState.cashAccounts.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Wallet size={14} className="text-emerald-400" />
                <span>Preserved Company Cash Vaults ({bankState.cashAccounts.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {bankState.cashAccounts.map((ca) => (
                  <div key={ca.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="font-bold text-white">{ca.accountName}</div>
                    <div className="text-[11px] text-slate-400">{ca.accountCode} · {ca.status}</div>
                    <div className="text-sm font-black font-mono tabular-nums text-emerald-400 mt-1">
                      {formatCurrency(ca.currentBalance, ca.currency || cur)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: BANK TRANSACTIONS (9 TYPES + PENDING APPROVAL QUEUE)    */}
      {/* ================================================================= */}
      {subTab === "transactions" && (
        <div className="space-y-4">
          {/* Pending Approval Rule Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck size={16} className="text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Approval Governance:</strong> Bank account balances are updated{" "}
                <strong className="text-emerald-400">only after authorized Finance approval</strong>. Statement-imported transactions always start as{" "}
                <span className="font-mono text-amber-300">Pending Verification</span>.
              </span>
            </div>
            {canManageBank && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openNewTxModal("Bank Transfers")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <ArrowRightLeft size={13} />
                  <span>Bank Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNewTxModal("Bank Charges")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-rose-300 cursor-pointer whitespace-nowrap"
                >
                  + Bank Charge
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
            <select
              value={filterState.accountId}
              onChange={(e) => onFilterChange({ ...filterState, accountId: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
            >
              <option value="ALL">All Bank Accounts</option>
              {bankState.bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} ({a.bankName})
                </option>
              ))}
            </select>

            <select
              value={filterState.transactionType}
              onChange={(e) => onFilterChange({ ...filterState, transactionType: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
            >
              <option value="ALL">All 9 Tx Types</option>
              {BANK_TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={filterState.approvalStatus}
              onChange={(e) => onFilterChange({ ...filterState, approvalStatus: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
            >
              <option value="ALL">All Approval Statuses</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Reversed">Reversed</option>
            </select>

            <input
              type="date"
              value={filterState.startDate}
              onChange={(e) => onFilterChange({ ...filterState, startDate: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />
            <input
              type="date"
              value={filterState.endDate}
              onChange={(e) => onFilterChange({ ...filterState, endDate: e.target.value })}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
            />

            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ref, payee..."
                  value={filterState.searchTerm}
                  onChange={(e) => onFilterChange({ ...filterState, searchTerm: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-white"
                />
              </div>
              <button
                type="button"
                onClick={onResetFilters}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Pending Approval Queue */}
          {pendingApprovalBankTxs.length > 0 && (
            <div className="bg-slate-950 border border-amber-900/60 rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                Pending Verification & Approval Queue ({pendingApprovalBankTxs.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-3">Date / Tx No</th>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3">Type / Source</th>
                      <th className="py-2 px-3">Description / Counterparty</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 pl-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {pendingApprovalBankTxs.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-2 pr-3 font-mono">
                          <div className="text-white font-bold">{tx.transactionDate}</div>
                          <div className="text-[11px] text-slate-400">{tx.transactionNo}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-slate-200 font-semibold">{tx.accountName}</div>
                          <div className="text-[11px] text-slate-500">Ref: {tx.referenceNo}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-cyan-300 font-semibold">{tx.transactionType}</div>
                          <div className="text-[11px] text-amber-300">{tx.approvalStatus} · {tx.sourceChannel}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-slate-200">{tx.description}</div>
                          <div className="text-[11px] text-slate-400">{tx.counterparty} · {tx.project}</div>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold tabular-nums ${
                            tx.direction === "Credit" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {tx.direction === "Credit" ? "+" : "-"}
                          {formatCurrency(tx.amount, tx.currency || cur)}
                        </td>
                        <td className="py-2 pl-3 text-right">
                          {canApproveBank ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApproveTx(tx)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
                              >
                                Approve & Post
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleRejectTx(tx)}
                                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-400 text-[11px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Awaiting Finance Manager</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Unified Bank Transaction Ledger Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                Unified Bank Transactions Ledger ({bankState.filteredLedgerRows.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Includes approved Cash Module bank collections & payments
              </span>
            </div>

            {bankState.filteredLedgerRows.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No bank transactions found for the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-3">Date / Ref</th>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Description / Counterparty</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 px-3">Approval</th>
                      <th className="py-2 px-3">Recon</th>
                      <th className="py-2 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {bankState.filteredLedgerRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-3 font-mono whitespace-nowrap">
                          <div className="text-white font-semibold">{row.transactionDate}</div>
                          <div className="text-[11px] text-slate-400">{row.transactionNo}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-200 font-semibold">{row.accountName}</div>
                          <div className="text-[11px] text-slate-500">Ref: {row.referenceNo}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="text-cyan-300 font-semibold">{row.transactionType}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-200">{row.description}</div>
                          <div className="text-[11px] text-slate-400">
                            {row.counterparty} · {row.project}
                          </div>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            row.direction === "Credit" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {row.direction === "Credit" ? "+" : "-"}
                          {formatCurrency(row.amount, row.currency)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-bold ${
                              row.isApproved
                                ? "text-emerald-400"
                                : row.isRejectedOrReversed
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          >
                            {row.approvalStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold ${
                              row.reconciliationStatus === "Reconciled"
                                ? "text-emerald-400"
                                : row.reconciliationStatus === "Matched"
                                ? "text-cyan-400"
                                : "text-slate-400"
                            }`}
                          >
                            {row.reconciliationStatus}
                          </span>
                        </td>
                        <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                          {row.rawBankTx && row.isApproved && (perms.canReverseCashTransactions || canApproveBank) ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleReverseTx(row.rawBankTx!)}
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={11} />
                              <span>Reverse</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600">{row.sourceChannel}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 4: BANK STATEMENT IMPORT (EXCEL/CSV/PDF + VERIFICATION)    */}
      {/* ================================================================= */}
      {subTab === "statement-import" && (
        <div className="space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-cyan-400" />
                  <span>Upload Bank Statement (Excel, CSV, PDF)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Original statements are archived immutably (never overwritten). All imported transactions require manual verification & separate approval before updating balances.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <Lock size={13} />
                <span>Immutable Statement Vault Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Target Company Bank Account
                </label>
                <select
                  value={importAccountId || bankState.bankAccounts[0]?.id || ""}
                  onChange={(e) => setImportAccountId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {bankState.bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} — {a.accountName} ({a.accountNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Default Project Allocation
                </label>
                <select
                  value={importProject}
                  onChange={(e) => setImportProject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Corporate Treasury">Corporate Treasury</option>
                  {bankState.filterOptions.projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Select Statement File (.xlsx, .xls, .csv, .pdf)
                </label>
                <label className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg px-3 py-2 cursor-pointer">
                  <Upload size={14} />
                  <span>{busy ? "Parsing..." : "Choose Excel / CSV / PDF"}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleStatementFileSelected}
                    className="hidden"
                    disabled={busy || !canManageBank}
                  />
                </label>
              </div>
            </div>

            {/* Manual Verification & Correction Table */}
            {importPreview && (
              <div className="space-y-4 pt-3 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="font-bold text-white">{importPreview.fileName}</span>{" "}
                    <span className="font-mono text-cyan-400">({importPreview.fileFormat})</span> · Checksum:{" "}
                    <span className="font-mono text-slate-400">{importPreview.fileChecksum}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddManualStatementPreviewLine}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      + Add Missing Line
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImportPreview(null);
                        setVerifiedLines([]);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-400 cursor-pointer"
                    >
                      Discard Draft
                    </button>
                  </div>
                </div>

                {importPreview.parserWarnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/60 text-xs text-amber-200 space-y-1">
                    {importPreview.parserWarnings.map((w, i) => (
                      <div key={i}>• {w}</div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Statement Opening Balance ({cur})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={importOpeningBal}
                      onChange={(e) => setImportOpeningBal(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">
                      Statement Closing Balance ({cur})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={importClosingBal}
                      onChange={(e) => setImportClosingBal(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-1">Notes</label>
                    <input
                      type="text"
                      value={importNotes}
                      onChange={(e) => setImportNotes(e.target.value)}
                      placeholder="Verification remarks..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 sticky top-0 text-[10px] uppercase text-slate-400">
                      <tr>
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Description (Editable)</th>
                        <th className="py-2 px-2">Reference</th>
                        <th className="py-2 px-2">Category</th>
                        <th className="py-2 px-2 text-right">Deposit</th>
                        <th className="py-2 px-2 text-right">Withdrawal</th>
                        <th className="py-2 px-2 text-center">Import</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {verifiedLines.map((line, idx) => (
                        <tr key={line.id} className={line.isDuplicateInSystem ? "bg-amber-950/20" : ""}>
                          <td className="py-1.5 px-2 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-1.5 px-2">
                            <input
                              type="date"
                              value={line.transactionDate}
                              onChange={(e) => handleEditVerifiedLine(idx, { transactionDate: e.target.value })}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white font-mono text-[11px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 min-w-[200px]">
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleEditVerifiedLine(idx, { description: e.target.value })}
                              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-[11px]"
                            />
                            {line.isDuplicateInSystem && (
                              <div className="text-[10px] text-amber-400 mt-0.5">{line.duplicateReason}</div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={line.referenceNo}
                              onChange={(e) => handleEditVerifiedLine(idx, { referenceNo: e.target.value })}
                              className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={line.suggestedTxType}
                              onChange={(e) =>
                                handleEditVerifiedLine(idx, { suggestedTxType: e.target.value as BankTransactionType })
                              }
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-white text-[11px]"
                            >
                              {BANK_TRANSACTION_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={line.depositAmount}
                              onChange={(e) =>
                                handleEditVerifiedLine(idx, {
                                  depositAmount: Number(e.target.value),
                                  withdrawalAmount: Number(e.target.value) > 0 ? 0 : line.withdrawalAmount,
                                })
                              }
                              className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-right text-emerald-400 font-mono text-[11px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={line.withdrawalAmount}
                              onChange={(e) =>
                                handleEditVerifiedLine(idx, {
                                  withdrawalAmount: Number(e.target.value),
                                  depositAmount: Number(e.target.value) > 0 ? 0 : line.depositAmount,
                                })
                              }
                              className="w-28 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-right text-rose-400 font-mono text-[11px]"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!line.skipImport}
                              onChange={(e) => handleEditVerifiedLine(idx, { skipImport: !e.target.checked })}
                              className="accent-cyan-500"
                              title="Include in Pending Verification import"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 font-mono">
                    Verified Lines: {verifiedLines.length} · Importing as Pending Verification:{" "}
                    {verifiedLines.filter((l) => !l.skipImport && l.amount > 0).length}
                  </div>
                  <button
                    type="button"
                    disabled={busy || verifiedLines.length === 0}
                    onClick={handleSaveImmutableStatementAndImport}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileCheck2 size={15} />
                    <span>Save Immutable Statement & Import Pending Transactions</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Immutable Bank Statement Archive */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Lock size={13} className="text-emerald-400" />
              <span>Immutable Bank Statement Archive ({bankState.statements.length})</span>
            </h3>
            {bankState.statements.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No bank statements archived yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-3">Statement No</th>
                      <th className="py-2 px-3">Bank / Account</th>
                      <th className="py-2 px-3">File / Format</th>
                      <th className="py-2 px-3">Period</th>
                      <th className="py-2 px-3 text-right">Closing Balance</th>
                      <th className="py-2 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {bankState.statements.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-3 font-mono font-bold text-cyan-300">{st.statementNo}</td>
                        <td className="py-2.5 px-3">
                          <div className="text-white font-semibold">{st.accountName}</div>
                          <div className="text-[11px] text-slate-400">{st.bankName} · {st.accountNumber}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="text-slate-200">{st.fileName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{st.fileFormat} · {st.lineCount} lines · {st.fileChecksum}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {st.periodStart} → {st.periodEnd}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-white">
                          {formatCurrency(st.closingBalance, st.currency)}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedArchiveStmt(st)}
                              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={11} />
                              <span>Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => loadStatementIntoReconciliation(st)}
                              className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap"
                            >
                              Reconcile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 5: BANK RECONCILIATION WORKBENCH (6-STAGE + 7 IDENTIFY)    */}
      {/* ================================================================= */}
      {subTab === "reconciliation" && (
        <div className="space-y-5">
          {/* 6-Stage Workflow Stepper */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bank Reconciliation Workflow
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {RECONCILIATION_WORKFLOW_STAGES.map((stage, idx) => {
                const currentIdx = RECONCILIATION_WORKFLOW_STAGES.indexOf(reconStage);
                const done = idx < currentIdx || (reconRecordEditing?.approvalStatus === "Reconciled" && idx <= currentIdx);
                const active = stage === reconStage;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setReconStage(stage)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                      active
                        ? "bg-cyan-950/60 border-cyan-500 text-white"
                        : done
                        ? "bg-emerald-950/30 border-emerald-800/70 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="text-[10px] font-mono opacity-75">Step {idx + 1}</div>
                    <div className="font-bold mt-0.5 truncate">{stage}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account & Statement Parameters */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Company Bank Account
                </label>
                <select
                  value={reconAccountId || activeReconAccount?.id || ""}
                  onChange={(e) => {
                    setReconAccountId(e.target.value);
                    setReconRecordEditing(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                >
                  {bankState.bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} — {a.accountName} ({a.accountNumber})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Period Start</label>
                <input
                  type="date"
                  value={reconPeriodStart}
                  onChange={(e) => setReconPeriodStart(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Period End</label>
                <input
                  type="date"
                  value={reconPeriodEnd}
                  onChange={(e) => setReconPeriodEnd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Stmt Opening ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={reconStmtOpening}
                  onChange={(e) => setReconStmtOpening(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Stmt Closing ({cur})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={reconStmtClosing}
                  onChange={(e) => setReconStmtClosing(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>
            </div>

            {/* Load From Statement Archive + Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reconStatementId}
                  onChange={(e) => {
                    const st = bankState.statements.find((s) => s.id === e.target.value);
                    if (st) loadStatementIntoReconciliation(st);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs"
                >
                  <option value="">Load Archived Immutable Statement...</option>
                  {bankState.statements.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.statementNo} — {s.accountName} ({s.periodStart} → {s.periodEnd})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRunAutoMatch}
                  disabled={reconLines.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
                >
                  <Sparkles size={13} />
                  <span>Auto-Match Transactions</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canManageBank && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePersistReconciliationStage("Transaction Matching", "Draft")}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold cursor-pointer whitespace-nowrap"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePersistReconciliationStage("Finance Review", "Finance Review")}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer whitespace-nowrap"
                    >
                      Submit for Finance Review
                    </button>
                  </>
                )}
                {canApproveBank && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePersistReconciliationStage("Final Report", "Reconciled")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer whitespace-nowrap"
                    >
                      Approve Reconciliation
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePersistReconciliationStage("Difference Identification", "Disputed")}
                      className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 font-bold cursor-pointer whitespace-nowrap"
                    >
                      Mark Disputed
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Statement Balance vs ERP Book Balance + 7 Identification Counters */}
          {reconAnalysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Bank Stmt Bal</div>
                <div className="text-sm font-black font-mono tabular-nums text-white mt-0.5">
                  {formatCurrency(reconAnalysis.statementClosingBalance, cur)}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">ERP Book Bal</div>
                <div className="text-sm font-black font-mono tabular-nums text-cyan-400 mt-0.5">
                  {formatCurrency(reconAnalysis.bookClosingBalance, cur)}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Variance</div>
                <div
                  className={`text-sm font-black font-mono tabular-nums mt-0.5 ${
                    Math.abs(reconAnalysis.discrepancyAmount) > 0.01 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {formatCurrency(reconAnalysis.discrepancyAmount, cur)}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Matched</div>
                <div className="text-sm font-black font-mono tabular-nums text-emerald-400 mt-0.5">
                  {reconAnalysis.matchedLines.length}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Unmatched</div>
                <div className="text-sm font-black font-mono tabular-nums text-amber-400 mt-0.5">
                  {reconAnalysis.unmatchedStatementLines.length + reconAnalysis.unmatchedErpEntries.length}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Outst. Deposits</div>
                <div className="text-sm font-black font-mono tabular-nums text-cyan-300 mt-0.5">
                  {formatCurrency(reconAnalysis.outstandingDepositsTotal, cur)}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Unpres. Cheques</div>
                <div className="text-sm font-black font-mono tabular-nums text-amber-300 mt-0.5">
                  {formatCurrency(reconAnalysis.unpresentedChequesTotal, cur)}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] uppercase text-slate-400">Unrec. Charges</div>
                <div className="text-sm font-black font-mono tabular-nums text-rose-400 mt-0.5">
                  {formatCurrency(reconAnalysis.bankChargesNotRecordedTotal, cur)}
                </div>
              </div>
            </div>
          )}

          {/* 7 Identification Classification Tabs */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: `All Statement Lines (${reconLines.length})` },
                  { id: "matched", label: `Matched (${reconAnalysis?.matchedLines.length || 0})` },
                  { id: "unmatched", label: `Unmatched (${(reconAnalysis?.unmatchedStatementLines.length || 0) + (reconAnalysis?.unmatchedErpEntries.length || 0)})` },
                  { id: "missing", label: `Missing in ERP (${reconAnalysis?.missingInErpLines.length || 0})` },
                  { id: "duplicates", label: `Duplicates (${(reconAnalysis?.duplicateStatementLines.length || 0) + (reconAnalysis?.duplicateErpEntries.length || 0)})` },
                  { id: "outstanding-deposits", label: `Outstanding Deposits (${reconAnalysis?.outstandingDepositsErp.length || 0})` },
                  { id: "unpresented-cheques", label: `Unpresented Cheques (${reconAnalysis?.unpresentedChequesErp.length || 0})` },
                  { id: "bank-charges", label: `Bank Charges Not Recorded (${reconAnalysis?.bankChargesNotRecordedLines.length || 0})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReconFilterTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer whitespace-nowrap ${
                    reconFilterTab === tab.id
                      ? "bg-cyan-600 text-white border-cyan-500"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Statement-side Matching Table */}
            {(reconFilterTab === "all" ||
              reconFilterTab === "matched" ||
              reconFilterTab === "unmatched" ||
              reconFilterTab === "missing" ||
              reconFilterTab === "duplicates" ||
              reconFilterTab === "bank-charges") && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                        <th className="py-2 pr-3">Stmt Date / Ref</th>
                        <th className="py-2 px-3">Statement Description</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3">Classification</th>
                        <th className="py-2 px-3">Manual / Auto Match (ERP Tx)</th>
                        <th className="py-2 pl-3 text-right">Quick Fix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {reconLines
                        .filter((l) => {
                          if (reconFilterTab === "matched") return l.matchStatus === "Matched";
                          if (reconFilterTab === "unmatched") return l.matchStatus !== "Matched";
                          if (reconFilterTab === "missing") return l.matchStatus === "Missing in ERP" || l.matchStatus === "Bank Charge Not Recorded";
                          if (reconFilterTab === "duplicates") return l.matchStatus === "Duplicate";
                          if (reconFilterTab === "bank-charges") return l.matchStatus === "Bank Charge Not Recorded";
                          return true;
                        })
                        .map((line) => (
                          <tr key={line.id} className="hover:bg-slate-900/50">
                            <td className="py-2 pr-3 font-mono whitespace-nowrap">
                              <div className="text-white">{line.statementDate}</div>
                              <div className="text-[11px] text-slate-400">{line.bankReferenceNo}</div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-slate-200">{line.description}</div>
                              {line.classificationNote && (
                                <div className="text-[10px] text-slate-500">{line.classificationNote}</div>
                              )}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                                line.direction === "Credit" ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {line.direction === "Credit" ? "+" : "-"}
                              {formatCurrency(line.amount, cur)}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className={`text-[11px] font-bold ${
                                  line.matchStatus === "Matched"
                                    ? "text-emerald-400"
                                    : line.matchStatus === "Bank Charge Not Recorded"
                                    ? "text-rose-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {line.matchStatus}
                                {line.matchType ? ` (${line.matchType})` : ""}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={line.matchedBankTxId || line.matchedCashTxId || ""}
                                onChange={(e) => handleManualPair(line.id, e.target.value)}
                                className="w-full max-w-[240px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-white"
                              >
                                <option value="">— Unmatched / Pair Manually —</option>
                                {activeAccountErpRows.map((erp) => (
                                  <option key={erp.id} value={erp.id}>
                                    {erp.transactionNo} | {erp.transactionDate} | {erp.direction === "Credit" ? "+" : "-"}
                                    {erp.amount.toLocaleString()} | {erp.counterparty}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pl-3 text-right whitespace-nowrap">
                              {line.matchStatus === "Bank Charge Not Recorded" && canManageBank && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleRecordMissingChargeFromStatement(line)}
                                  className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-[11px] font-bold cursor-pointer"
                                >
                                  Record Bank Charge
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Quick Add Manual Statement Line */}
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                  <input
                    type="date"
                    value={manualLineEntry.statementDate}
                    onChange={(e) => setManualLineEntry({ ...manualLineEntry, statementDate: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Bank Ref"
                    value={manualLineEntry.bankReferenceNo}
                    onChange={(e) => setManualLineEntry({ ...manualLineEntry, bankReferenceNo: e.target.value })}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Line description..."
                    value={manualLineEntry.description}
                    onChange={(e) => setManualLineEntry({ ...manualLineEntry, description: e.target.value })}
                    className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <select
                    value={manualLineEntry.direction}
                    onChange={(e) =>
                      setManualLineEntry({ ...manualLineEntry, direction: e.target.value as "Credit" | "Debit" })
                    }
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="Credit">Deposit (Cr)</option>
                    <option value="Debit">Withdrawal (Dr)</option>
                  </select>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={manualLineEntry.amount || ""}
                      onChange={(e) => setManualLineEntry({ ...manualLineEntry, amount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualStatementLineToRecon}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ERP-Side Unreconciled Items (Outstanding Deposits / Unpresented Cheques / ERP Duplicates) */}
            {reconAnalysis &&
              (reconFilterTab === "unmatched" ||
                reconFilterTab === "outstanding-deposits" ||
                reconFilterTab === "unpresented-cheques" ||
                reconFilterTab === "duplicates") && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase">
                    {reconFilterTab === "outstanding-deposits"
                      ? "Outstanding Deposits (Recorded in ERP, Pending Bank Clearance)"
                      : reconFilterTab === "unpresented-cheques"
                      ? "Unpresented Cheques / Issued Payments Not Yet Cleared"
                      : reconFilterTab === "duplicates"
                      ? "Potential Duplicate ERP Ledger Entries"
                      : "Unmatched ERP Bank Ledger Entries"}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                          <th className="py-2 pr-3">Date / Ref</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Counterparty / Description</th>
                          <th className="py-2 pl-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {(reconFilterTab === "outstanding-deposits"
                          ? reconAnalysis.outstandingDepositsErp
                          : reconFilterTab === "unpresented-cheques"
                          ? reconAnalysis.unpresentedChequesErp
                          : reconFilterTab === "duplicates"
                          ? reconAnalysis.duplicateErpEntries
                          : reconAnalysis.unmatchedErpEntries
                        ).map((erp) => (
                          <tr key={erp.id}>
                            <td className="py-2 pr-3 font-mono">
                              <div className="text-white">{erp.transactionDate}</div>
                              <div className="text-[11px] text-slate-400">{erp.transactionNo}</div>
                            </td>
                            <td className="py-2 px-3 text-cyan-300">{erp.transactionType}</td>
                            <td className="py-2 px-3">
                              <div className="text-slate-200">{erp.counterparty}</div>
                              <div className="text-[11px] text-slate-500">{erp.description}</div>
                            </td>
                            <td
                              className={`py-2 pl-3 text-right font-mono font-bold tabular-nums ${
                                erp.direction === "Credit" ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {formatCurrency(erp.amount, cur)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            <div className="pt-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Reconciliation Notes / Sign-off Commentary
              </label>
              <input
                type="text"
                value={reconNotes}
                onChange={(e) => setReconNotes(e.target.value)}
                placeholder="Document clearing explanations, outstanding deposits, or disputed items..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Historical Bank Reconciliations */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
              Historical Bank Reconciliations ({bankState.reconciliations.length})
            </h3>
            {bankState.reconciliations.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No historical reconciliations saved yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                      <th className="py-2 pr-3">Recon No</th>
                      <th className="py-2 px-3">Account</th>
                      <th className="py-2 px-3">Period</th>
                      <th className="py-2 px-3 text-right">Stmt Closing</th>
                      <th className="py-2 px-3 text-right">Book Closing</th>
                      <th className="py-2 px-3 text-right">Discrepancy</th>
                      <th className="py-2 px-3">Stage / Status</th>
                      <th className="py-2 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {bankState.reconciliations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 pr-3 font-mono font-bold text-cyan-300">{rec.reconciliationNo}</td>
                        <td className="py-2.5 px-3 text-white font-semibold">{rec.accountName}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {rec.periodStart} → {rec.periodEnd}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-white">
                          {formatCurrency(rec.statementClosingBalance, cur)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-300">
                          {formatCurrency(rec.bookClosingBalance, cur)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-bold tabular-nums ${
                            Math.abs(rec.discrepancyAmount) > 0.01 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {formatCurrency(rec.discrepancyAmount, cur)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div
                            className={`text-[11px] font-bold ${
                              rec.approvalStatus === "Reconciled"
                                ? "text-emerald-400"
                                : rec.approvalStatus === "Disputed"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          >
                            {rec.approvalStatus}
                          </div>
                          <div className="text-[10px] text-slate-500">{rec.workflowStage || "Final Report"}</div>
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => loadExistingReconciliation(rec)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 6: 7 EXPORTABLE BANK REPORTS                               */}
      {/* ================================================================= */}
      {subTab === "reports" && (
        <BankReportsCenter isAmharic={isAmharic} bankState={bankState} onLogAction={onLogAction} />
      )}

      {/* ================================================================= */}
      {/* MODAL 1: REGISTER BANK ACCOUNT                                     */}
      {/* ================================================================= */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRegisterAccount}
            className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Building2 size={16} className="text-cyan-400" />
                <span>Register Company Bank Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Bank Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Commercial Bank of Ethiopia"
                  value={accForm.bankName}
                  onChange={(e) => setAccForm({ ...accForm, bankName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Account Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Main Construction Operating"
                  value={accForm.accountName}
                  onChange={(e) => setAccForm({ ...accForm, accountName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Account Number *</label>
                <input
                  required
                  type="text"
                  placeholder="1000293847561"
                  value={accForm.accountNumber}
                  onChange={(e) => setAccForm({ ...accForm, accountNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Account Type</label>
                <select
                  value={accForm.bankAccountSubtype}
                  onChange={(e) =>
                    setAccForm({ ...accForm, bankAccountSubtype: e.target.value as BankAccountSubtype })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {BANK_ACCOUNT_SUBTYPES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Branch</label>
                <input
                  type="text"
                  placeholder="e.g. Bole Medhanialem Branch"
                  value={accForm.branch}
                  onChange={(e) => setAccForm({ ...accForm, branch: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Currency</label>
                <input
                  type="text"
                  value={accForm.currency}
                  onChange={(e) => setAccForm({ ...accForm, currency: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={accForm.openingBalance}
                  onChange={(e) => setAccForm({ ...accForm, openingBalance: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Minimum Threshold</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={accForm.minimumThreshold}
                  onChange={(e) => setAccForm({ ...accForm, minimumThreshold: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {busy ? "Saving..." : "Register Bank Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: RECORD NEW BANK TRANSACTION (9 TYPES + AR/AP/PAYROLL LINK)*/}
      {/* ================================================================= */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTransaction}
            className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Landmark size={16} className="text-cyan-400" />
                <span>Record Bank Transaction (Approval Required Before Balance Update)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Bank Account *</label>
                <select
                  required
                  value={txForm.accountId}
                  onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Select Bank Account</option>
                  {bankState.bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.bankName} — {a.accountName} ({formatCurrency(a.currentBalance, a.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Transaction Type *</label>
                <select
                  value={txForm.transactionType}
                  onChange={(e) => {
                    const nextType = e.target.value as BankTransactionType;
                    setTxForm({
                      ...txForm,
                      transactionType: nextType,
                      direction: getDefaultDirectionForBankTxType(nextType),
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {BANK_TRANSACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {txForm.transactionType === "Bank Transfers" && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">
                    Destination Account *
                  </label>
                  <select
                    required
                    value={txForm.toAccountId}
                    onChange={(e) => setTxForm({ ...txForm, toAccountId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select Destination Bank / Cash Account</option>
                    {rawAccounts
                      .filter((a) => a.id !== txForm.accountId && a.status === "Active")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountType}: {a.accountName} ({a.bankName || a.accountCode})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Direction</label>
                <select
                  disabled={txForm.transactionType !== "Other Transactions"}
                  value={txForm.direction}
                  onChange={(e) => setTxForm({ ...txForm, direction: e.target.value as "Credit" | "Debit" })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white disabled:opacity-70"
                >
                  <option value="Credit">Credit (Deposit / Inflow +)</option>
                  <option value="Debit">Debit (Withdrawal / Outflow -)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Date *</label>
                <input
                  required
                  type="date"
                  value={txForm.transactionDate}
                  onChange={(e) => setTxForm({ ...txForm, transactionDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Amount ({cur}) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0.01}
                  value={txForm.amount || ""}
                  onChange={(e) => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Bank Reference No *</label>
                <input
                  required
                  type="text"
                  value={txForm.referenceNo}
                  onChange={(e) => setTxForm({ ...txForm, referenceNo: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Counterparty / Payee</label>
                <input
                  type="text"
                  placeholder="Client, Supplier, Bank or Staff"
                  value={txForm.counterparty}
                  onChange={(e) => setTxForm({ ...txForm, counterparty: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Cheque / CPO No</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={txForm.chequeNumber}
                  onChange={(e) => setTxForm({ ...txForm, chequeNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Project</label>
                <select
                  value={txForm.project}
                  onChange={(e) => setTxForm({ ...txForm, project: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Corporate Treasury">Corporate Treasury</option>
                  {bankState.filterOptions.projects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-400 mb-1">
                  Link ERP Module Record (Optional)
                </label>
                <select
                  value={txForm.linkedDocumentType}
                  onChange={(e) =>
                    setTxForm({
                      ...txForm,
                      linkedDocumentType: e.target.value as any,
                      linkedDocumentId: "",
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Direct">Standalone Bank Entry</option>
                  <option value="Invoice">AR Client Invoice (Client Payment)</option>
                  <option value="Expense">AP Supplier Bill (Supplier Payment)</option>
                  <option value="Payroll">Payroll Record (Salary Payment)</option>
                </select>
              </div>

              {txForm.linkedDocumentType === "Invoice" && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Select AR Invoice</label>
                  <select
                    value={txForm.linkedDocumentId}
                    onChange={(e) => {
                      const inv = rawInvoices.find((i) => i.id === e.target.value);
                      setTxForm({
                        ...txForm,
                        linkedDocumentId: e.target.value,
                        counterparty: inv?.clientName || inv?.client || txForm.counterparty,
                        project: inv?.project || txForm.project,
                        amount: inv ? Math.max(0, (inv.amount || 0) - (inv.paidAmount || 0)) : txForm.amount,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Choose Open Invoice...</option>
                    {rawInvoices
                      .filter((i) => i.status !== "Paid")
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.invoiceNumber} — {i.clientName || i.client} (Remaining:{" "}
                          {formatCurrency((i.amount || 0) - (i.paidAmount || 0), cur)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {txForm.linkedDocumentType === "Expense" && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Select AP Payable Bill</label>
                  <select
                    value={txForm.linkedDocumentId}
                    onChange={(e) => {
                      const exp = rawExpenses.find((ex) => ex.id === e.target.value);
                      setTxForm({
                        ...txForm,
                        linkedDocumentId: e.target.value,
                        counterparty: exp?.vendor || txForm.counterparty,
                        project: exp?.project || txForm.project,
                        amount: exp ? Math.max(0, (exp.amount || 0) - (exp.paidAmount || 0)) : txForm.amount,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Choose Open AP Bill...</option>
                    {rawExpenses
                      .filter((ex) => ex.status !== "Paid")
                      .map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.billNumber || ex.id} — {ex.vendor || ex.category} (Remaining:{" "}
                          {formatCurrency((ex.amount || 0) - (ex.paidAmount || 0), cur)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {txForm.linkedDocumentType === "Payroll" && (
                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase text-slate-400 mb-1">Select Payroll Slip</label>
                  <select
                    value={txForm.linkedDocumentId}
                    onChange={(e) => {
                      const pr = rawPayroll.find((p) => p.id === e.target.value);
                      setTxForm({
                        ...txForm,
                        linkedDocumentId: e.target.value,
                        counterparty: pr?.workerName || txForm.counterparty,
                        project: pr?.project || txForm.project,
                        amount: pr?.netSalary || txForm.amount,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Choose Payroll Record...</option>
                    {rawPayroll
                      .filter((p) => p.status !== "Paid")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.workerName} — {p.month} ({formatCurrency(p.netSalary, cur)})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase text-slate-400 mb-1">Description *</label>
                <input
                  required
                  type="text"
                  placeholder="Narrative / purpose..."
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {busy ? "Saving..." : "Submit for Approval"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: IMMUTABLE STATEMENT INSPECTOR                             */}
      {/* ================================================================= */}
      {selectedArchiveStmt && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Lock size={15} className="text-emerald-400" />
                  <span>
                    Immutable Statement {selectedArchiveStmt.statementNo} — {selectedArchiveStmt.fileName}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Uploaded by {selectedArchiveStmt.uploadedBy} ({selectedArchiveStmt.uploadedByRole}) · Checksum:{" "}
                  {selectedArchiveStmt.fileChecksum}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArchiveStmt(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Ref</th>
                    <th className="py-2 px-2">Description</th>
                    <th className="py-2 px-2 text-right">Deposit</th>
                    <th className="py-2 pl-2 text-right">Withdrawal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {selectedArchiveStmt.originalLines.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1.5 pr-2 font-mono text-slate-500">{l.lineNumber}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-300">{l.transactionDate}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-400">{l.referenceNo}</td>
                      <td className="py-1.5 px-2 text-white">{l.description}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-400">
                        {l.depositAmount > 0 ? formatCurrency(l.depositAmount, cur) : "-"}
                      </td>
                      <td className="py-1.5 pl-2 text-right font-mono text-rose-400">
                        {l.withdrawalAmount > 0 ? formatCurrency(l.withdrawalAmount, cur) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
