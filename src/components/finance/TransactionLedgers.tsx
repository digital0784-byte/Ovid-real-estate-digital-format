import React, { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  CashTransactionRecord,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
} from "../../types";
import {
  approveAndConfirmPayment,
  COLLECTION_PAYMENT_METHODS,
  ComputedFinancialState,
  exportRowsToCsv,
  generateFinancialRef,
  isConfirmedCashStatus,
  isPendingCashStatus,
  isReversedOrRejectedStatus,
  PAYMENT_PLANNING_CATEGORIES,
  recordCashCollection,
  recordCashPayment,
  rejectCashTransaction,
  reverseConfirmedCashTransaction,
  verifyAndConfirmCollection,
} from "../../services/financeService";
import { DbService } from "../../services/db";
import { formatCurrency } from "../../utils/formatters";
import { CashCollectionPaymentDashboard } from "./CashCollectionPaymentDashboard";
import { CashPlanningAndApprovalsView } from "./CashPlanningAndApprovalsView";
import { CashReportsCenter } from "./CashReportsCenter";

interface TransactionLedgersProps {
  mode: "revenue-management" | "expense-management" | "cash-collection" | "cash-payment";
  isAmharic: boolean;
  state: ComputedFinancialState;
  rawInvoices: FinancialInvoiceRecord[];
  rawExpenses: Expense[];
  rawAccounts: FinancialAccount[];
  rawCashTransactions?: CashTransactionRecord[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

const EXPENSE_CATEGORIES = [
  "Material",
  "Labor",
  "Equipment",
  "Subcontractor",
  "Logistics",
  "Overhead",
  "Utilities",
  "Administrative",
];

const REVENUE_CATEGORIES = [
  "Project Revenue",
  "Interim Payment Certificate (IPC)",
  "Advance Payment",
  "Retention Release",
  "Formwork Rental",
  "Variation Order",
  "Consulting / Other",
];

const COLLECTION_CATEGORIES = [
  "Milestone Collection",
  "Advance Payment",
  "Interim Payment Certificate (IPC)",
  "Final Payment",
  "Retention Release",
  "Formwork Rental Receipt",
  "Other Collection",
];

type CashSubWorkspace = "ledger" | "dashboard" | "plans" | "approvals" | "reports";

export const TransactionLedgers: React.FC<TransactionLedgersProps> = ({
  mode,
  isAmharic,
  state,
  rawInvoices,
  rawExpenses,
  rawAccounts,
  rawCashTransactions,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const { permissions, settings, metrics } = state;
  const cur = settings.defaultCurrency || "ETB";
  const today = new Date().toISOString().slice(0, 10);

  const isCashMode = mode === "cash-collection" || mode === "cash-payment";
  const [cashSubView, setCashSubView] = useState<CashSubWorkspace>("ledger");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CONFIRMED" | "PENDING" | "REVERSED">("ALL");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inspectTx, setInspectTx] = useState<CashTransactionRecord | null>(null);
  const [reverseTarget, setReverseTarget] = useState<CashTransactionRecord | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<CashTransactionRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const defaultProject =
    state.assignedProjects[0] ||
    state.filterOptions.projects[0] ||
    "";

  const [revForm, setRevForm] = useState({
    invoiceNumber: "",
    contractNumber: "",
    project: defaultProject,
    department: "Contracting & Billing",
    category: "Project Revenue",
    client: "",
    description: "",
    amount: "",
    date: today,
    dueDate: today,
    status: "Approved",
  });

  const [expForm, setExpForm] = useState({
    billNumber: "",
    project: defaultProject,
    department: "Site Operations",
    category: "Material",
    vendor: "",
    description: "",
    costCenter: "CC-101 Direct Cost",
    amount: "",
    date: today,
    dueDate: today,
    status: "Approved",
  });

  const [cashForm, setCashForm] = useState({
    date: today,
    amount: "",
    accountId: rawAccounts[0]?.id || "",
    project: defaultProject,
    department: "Treasury & Cash",
    category:
      mode === "cash-collection"
        ? COLLECTION_CATEGORIES[0]
        : PAYMENT_PLANNING_CATEGORIES[0],
    counterparty: "",
    linkedDocumentId: "",
    contractNumber: "",
    invoiceNumber: "",
    paymentMethod: "Bank Transfer",
    bankReferenceNumber: "",
    receiptNumber: "",
    paymentVoucherNumber: "",
    supportingDocName: "",
    description: "",
    confirmImmediately:
      mode === "cash-collection"
        ? permissions.canVerifyCollections
        : permissions.canApproveStandardPayments,
    notes: "",
  });

  const allTransactionsPool = rawCashTransactions || state.scopedCashTransactions;

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  };

  const openNewModal = () => {
    setErrorMsg(null);
    const activeAcc = rawAccounts.find((a) => a.status !== "Inactive") || rawAccounts[0];
    setCashForm({
      date: today,
      amount: "",
      accountId: activeAcc?.id || "",
      project: defaultProject,
      department: "Treasury & Cash",
      category:
        mode === "cash-collection"
          ? COLLECTION_CATEGORIES[0]
          : PAYMENT_PLANNING_CATEGORIES[0],
      counterparty: "",
      linkedDocumentId: "",
      contractNumber: "",
      invoiceNumber: "",
      paymentMethod: "Bank Transfer",
      bankReferenceNumber: "",
      receiptNumber: mode === "cash-collection" ? generateFinancialRef("RCP") : "",
      paymentVoucherNumber: mode === "cash-payment" ? generateFinancialRef("PVC") : "",
      supportingDocName: "",
      description: "",
      confirmImmediately:
        mode === "cash-collection"
          ? permissions.canVerifyCollections
          : permissions.canApproveStandardPayments,
      notes: "",
    });
    setShowModal(true);
  };

  const handleCreateRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageTransactions) return;
    const amt = Number(revForm.amount);
    if (!revForm.client.trim() || !revForm.project.trim() || isNaN(amt) || amt <= 0) {
      setErrorMsg(
        isAmharic
          ? "እባክዎ ደንበኛ፣ ፕሮጀክት እና ትክክለኛ መጠን ያስገቡ።"
          : "Client, Project, and positive Amount are required."
      );
      return;
    }
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const id = `INV-${Date.now()}`;
      const refNo = generateFinancialRef("REV");
      const invoice: FinancialInvoiceRecord = {
        id,
        referenceNo: refNo,
        invoiceNumber: revForm.invoiceNumber.trim() || refNo,
        contractNumber: revForm.contractNumber.trim() || undefined,
        project: revForm.project.trim(),
        department: revForm.department.trim() || "Contracting & Billing",
        category: revForm.category,
        client: revForm.client.trim(),
        clientName: revForm.client.trim(),
        description: revForm.description.trim() || "Project Revenue Billing",
        amount: amt,
        paidAmount: 0,
        currency: cur,
        status: revForm.status,
        date: revForm.date,
        dueDate: revForm.dueDate || revForm.date,
        createdBy: actorName,
        createdById: actorUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await DbService.addInvoice(invoice);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Record Revenue / Invoice",
        category: "Finance",
        severity: "INFO",
        details: `Created revenue record ${invoice.invoiceNumber} (${cur} ${amt.toLocaleString()}) for ${invoice.client} [${invoice.project}].`,
      });
      onLogAction?.("Record Revenue", `${invoice.invoiceNumber} - ${cur} ${amt.toLocaleString()}`);
      setShowModal(false);
      setRevForm({
        ...revForm,
        invoiceNumber: "",
        contractNumber: "",
        client: "",
        description: "",
        amount: "",
      });
      showToast(isAmharic ? "የገቢ መዝገብ በተሳካ ሁኔታ ተቀምጧል።" : "Revenue record saved to Firestore.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save revenue record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageTransactions) return;
    const amt = Number(expForm.amount);
    if (!expForm.vendor.trim() || !expForm.project.trim() || isNaN(amt) || amt <= 0) {
      setErrorMsg(
        isAmharic
          ? "እባክዎ አቅራቢ፣ ፕሮጀክት እና ትክክለኛ መጠን ያስገቡ።"
          : "Supplier/Vendor, Project, and positive Amount are required."
      );
      return;
    }
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const id = `EXP-${Date.now()}`;
      const refNo = generateFinancialRef("EXP");
      const expense: Expense = {
        id,
        referenceNo: refNo,
        billNumber: expForm.billNumber.trim() || refNo,
        category: expForm.category,
        amount: amt,
        paidAmount: 0,
        date: expForm.date,
        dueDate: expForm.dueDate || expForm.date,
        vendor: expForm.vendor.trim(),
        supplier: expForm.vendor.trim(),
        description: expForm.description.trim() || `${expForm.category} expense`,
        project: expForm.project.trim(),
        department: expForm.department.trim() || "Site Operations",
        costCenter: expForm.costCenter.trim() || "CC-101 Direct Cost",
        approvedBy: permissions.canApproveTransactions ? actorName : "Pending Approval",
        status: expForm.status,
        createdBy: actorName,
        createdById: actorUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await DbService.addExpense(expense);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Record Expense / Supplier Bill",
        category: "Finance",
        severity: amt > settings.requireDirectorApprovalAboveEtb ? "WARNING" : "INFO",
        details: `Recorded expense ${expense.referenceNo} (${cur} ${amt.toLocaleString()}) to ${expense.vendor} [${expense.project}].`,
      });
      onLogAction?.("Record Expense", `${expense.referenceNo} - ${cur} ${amt.toLocaleString()}`);
      setShowModal(false);
      setExpForm({ ...expForm, billNumber: "", vendor: "", description: "", amount: "" });
      showToast(isAmharic ? "የወጪ መዝገብ በተሳካ ሁኔታ ተቀምጧል።" : "Expense record saved to Firestore.");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save expense record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCashTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageTransactions && !permissions.isDirector) return;
    setErrorMsg(null);
    const amt = Number(cashForm.amount);
    const targetAcc = rawAccounts.find((a) => a.id === cashForm.accountId);
    if (!targetAcc) {
      setErrorMsg(
        isAmharic
          ? "እባክዎ የጥሬ ገንዘብ ወይም የባንክ ሂሳብ ይምረጡ (በቅድሚያ በ Cash & Bank ክፍል ይፍጠሩ)።"
          : "Please select an active Cash or Bank account (create one in Cash & Bank Management first)."
      );
      return;
    }
    if (isNaN(amt) || amt <= 0 || !cashForm.counterparty.trim() || !cashForm.project.trim()) {
      setErrorMsg(
        isAmharic
          ? "እባክዎ ተከፋይ/ከፋይ፣ ፕሮጀክት እና ትክክለኛ መጠን ያስገቡ።"
          : "Counterparty, Project, and positive Amount are required."
      );
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "cash-collection") {
        const linkedInv = rawInvoices.find((i) => i.id === cashForm.linkedDocumentId);
        const desiredStatus =
          cashForm.confirmImmediately && permissions.canVerifyCollections
            ? "Verified & Confirmed"
            : "Pending Verification";
        const savedTx = await recordCashCollection({
          tx: {
            date: cashForm.date,
            amount: amt,
            currency: cur,
            accountId: targetAcc.id,
            accountName: targetAcc.accountName,
            project: cashForm.project.trim(),
            department: cashForm.department.trim() || "Treasury & Cash",
            category: cashForm.category,
            counterparty: cashForm.counterparty.trim(),
            linkedDocumentType: linkedInv ? "Invoice" : "Direct",
            linkedDocumentId: linkedInv?.id,
            linkedReferenceNo: linkedInv?.invoiceNumber || cashForm.invoiceNumber.trim() || undefined,
            contractNumber: cashForm.contractNumber.trim() || linkedInv?.contractNumber || undefined,
            invoiceNumber: cashForm.invoiceNumber.trim() || linkedInv?.invoiceNumber || undefined,
            paymentMethod: cashForm.paymentMethod,
            bankReferenceNumber: cashForm.bankReferenceNumber.trim() || undefined,
            receiptNumber: cashForm.receiptNumber.trim() || undefined,
            supportingDocName: cashForm.supportingDocName.trim() || undefined,
            description: cashForm.description.trim() || undefined,
            status: desiredStatus,
            notes: cashForm.notes.trim(),
            createdBy: actorName,
            createdById: actorUid,
          },
          targetAccount: targetAcc,
          linkedInvoice: linkedInv,
          existingTransactions: allTransactionsPool,
          actorName,
          actorRole,
          actorUid,
        });
        onLogAction?.(
          isConfirmedCashStatus(savedTx.status) ? "Verify Cash Collection" : "Submit Cash Collection",
          `${savedTx.referenceNo} (${cur} ${amt.toLocaleString()}) -> ${savedTx.status}`
        );
        showToast(
          isConfirmedCashStatus(savedTx.status)
            ? isAmharic
              ? "የተሰበሰበ ገንዘብ ተረጋግጦ ሂሳብ ተዘምኗል።"
              : "Collection verified & confirmed. Cash/Bank balance and AR updated atomically."
            : isAmharic
            ? "ግብይቱ ለፋይናንስ ስራ አስኪያጅ ማረጋገጫ ቀርቧል።"
            : "Collection submitted for Finance Manager verification (balance updates after verification)."
        );
      } else {
        const linkedExp = rawExpenses.find((ex) => ex.id === cashForm.linkedDocumentId);
        const desiredStatus =
          cashForm.confirmImmediately &&
          (permissions.canApproveStandardPayments || permissions.canApproveHighValuePayments)
            ? "Confirmed & Paid"
            : "Pending Approval";
        const savedTx = await recordCashPayment({
          tx: {
            date: cashForm.date,
            amount: amt,
            currency: cur,
            accountId: targetAcc.id,
            accountName: targetAcc.accountName,
            project: cashForm.project.trim(),
            department: cashForm.department.trim() || "Treasury & Cash",
            category: cashForm.category,
            counterparty: cashForm.counterparty.trim(),
            linkedDocumentType: linkedExp ? "Expense" : "Direct",
            linkedDocumentId: linkedExp?.id,
            linkedReferenceNo: linkedExp?.referenceNo || linkedExp?.id || cashForm.invoiceNumber.trim() || undefined,
            invoiceNumber: cashForm.invoiceNumber.trim() || linkedExp?.billNumber || linkedExp?.referenceNo || undefined,
            paymentMethod: cashForm.paymentMethod,
            bankReferenceNumber: cashForm.bankReferenceNumber.trim() || undefined,
            paymentVoucherNumber: cashForm.paymentVoucherNumber.trim() || undefined,
            supportingDocName: cashForm.supportingDocName.trim() || undefined,
            description: cashForm.description.trim() || undefined,
            status: desiredStatus,
            notes: cashForm.notes.trim(),
            createdBy: actorName,
            createdById: actorUid,
          },
          sourceAccount: targetAcc,
          linkedExpense: linkedExp,
          existingTransactions: allTransactionsPool,
          directorApprovalThresholdEtb: settings.requireDirectorApprovalAboveEtb,
          actorName,
          actorRole,
          actorUid,
        });
        onLogAction?.(
          isConfirmedCashStatus(savedTx.status) ? "Confirm Cash Payment" : "Submit Cash Payment",
          `${savedTx.referenceNo} (${cur} ${amt.toLocaleString()}) -> ${savedTx.status}`
        );
        showToast(
          isConfirmedCashStatus(savedTx.status)
            ? isAmharic
              ? "ክፍያው ጸድቆ ከሂሳብ ተቀንሷል።"
              : "Payment approved & confirmed. Cash/Bank balance and AP updated atomically."
            : savedTx.status === "Director Approval Required"
            ? isAmharic
              ? `ክፍያው ከ${cur} ${settings.requireDirectorApprovalAboveEtb.toLocaleString()} ስለሚበልጥ የዳይሬክተር ፈቃድ ይጠብቃል።`
              : `Submitted for Director approval (exceeds ${cur} ${settings.requireDirectorApprovalAboveEtb.toLocaleString()} threshold).`
            : isAmharic
            ? "ክፍያው ለፋይናንስ ስራ አስኪያጅ ማጽደቂያ ቀርቧል።"
            : "Payment submitted for Finance Manager approval (balance updates after approval)."
        );
      }
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to persist cash transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkSelectionChange = (docId: string) => {
    if (mode === "cash-collection") {
      const inv = state.openReceivablesInvoices.find((i) => i.id === docId);
      setCashForm((prev) => ({
        ...prev,
        linkedDocumentId: docId,
        counterparty: inv ? inv.normalizedClient : prev.counterparty,
        project: inv ? inv.project : prev.project,
        invoiceNumber: inv ? inv.invoiceNumber : "",
        contractNumber: inv?.contractNumber || prev.contractNumber,
        amount: inv ? String(inv.outstandingAmount) : prev.amount,
      }));
    } else {
      const exp = state.openPayablesExpenses.find((ex) => ex.id === docId);
      setCashForm((prev) => ({
        ...prev,
        linkedDocumentId: docId,
        counterparty: exp ? exp.normalizedSupplier : prev.counterparty,
        project: exp ? exp.project : prev.project,
        invoiceNumber: exp ? exp.billNumber || exp.referenceNo || exp.id : "",
        amount: exp ? String(exp.outstandingAmount) : prev.amount,
      }));
    }
  };

  const handleQuickConfirmRow = async (tx: CashTransactionRecord) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const acc = rawAccounts.find((a) => a.id === tx.accountId);
      if (tx.type === "Collection") {
        const inv = rawInvoices.find((i) => i.id === tx.linkedDocumentId);
        await verifyAndConfirmCollection({
          tx,
          targetAccount: acc,
          linkedInvoice: inv,
          actorName,
          actorRole,
          actorUid,
        });
        onLogAction?.("Verify Cash Collection", `${tx.referenceNo} verified & confirmed`);
        showToast(isAmharic ? `${tx.referenceNo} ተረጋግጧል።` : `Verified collection ${tx.referenceNo}.`);
      } else {
        const exp = rawExpenses.find((ex) => ex.id === tx.linkedDocumentId);
        await approveAndConfirmPayment({
          tx,
          sourceAccount: acc,
          linkedExpense: exp,
          directorApprovalThresholdEtb: settings.requireDirectorApprovalAboveEtb,
          actorName,
          actorRole,
          actorUid,
        });
        onLogAction?.("Approve Cash Payment", `${tx.referenceNo} approved & confirmed`);
        showToast(isAmharic ? `${tx.referenceNo} ጸድቋል።` : `Approved payment ${tx.referenceNo}.`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Approval failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseTarget) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const acc = rawAccounts.find((a) => a.id === reverseTarget.accountId);
      const inv = rawInvoices.find((i) => i.id === reverseTarget.linkedDocumentId);
      const exp = rawExpenses.find((ex) => ex.id === reverseTarget.linkedDocumentId);
      await reverseConfirmedCashTransaction({
        tx: reverseTarget,
        account: acc,
        linkedInvoice: inv,
        linkedExpense: exp,
        reason: reverseReason || "Reversed by authorized governance",
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Reverse Cash Transaction", `${reverseTarget.referenceNo} reversed`);
      showToast(
        isAmharic
          ? `${reverseTarget.referenceNo} ተመልሷል (Reversed)፤ የባንክና AR/AP ሂሳብ ተስተካክሏል።`
          : `Reversed ${reverseTarget.referenceNo}; account and AR/AP balances restored.`
      );
      setReverseTarget(null);
      setReverseReason("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to reverse transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await rejectCashTransaction({
        tx: rejectTarget,
        reason: rejectReason || "Rejected on financial review",
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Reject Cash Transaction", `${rejectTarget.referenceNo} rejected`);
      showToast(isAmharic ? `${rejectTarget.referenceNo} ውድቅ ተደርጓል።` : `Rejected ${rejectTarget.referenceNo}.`);
      setRejectTarget(null);
      setRejectReason("");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to reject transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const cashCollections = state.scopedCashTransactions.filter((t) => t.type === "Collection");
  const cashPayments = state.scopedCashTransactions.filter((t) => t.type === "Payment");
  const activeCashListRaw = mode === "cash-collection" ? cashCollections : cashPayments;

  const filteredCashList = useMemo(() => {
    if (statusFilter === "ALL") return activeCashListRaw;
    if (statusFilter === "CONFIRMED") return activeCashListRaw.filter((t) => isConfirmedCashStatus(t.status));
    if (statusFilter === "PENDING") return activeCashListRaw.filter((t) => isPendingCashStatus(t.status));
    return activeCashListRaw.filter((t) => isReversedOrRejectedStatus(t.status));
  }, [activeCashListRaw, statusFilter]);

  const pendingTypeCount = state.pendingApprovalTransactions.filter((t) =>
    mode === "cash-collection" ? t.type === "Collection" : t.type === "Payment"
  ).length;

  // Details for currently selected linked doc inside Create Modal (shows partial/multiple payment progress)
  const selectedLinkedInvoiceInfo = useMemo(() => {
    if (mode !== "cash-collection" || !cashForm.linkedDocumentId) return null;
    const inv = state.openReceivablesInvoices.find((i) => i.id === cashForm.linkedDocumentId);
    if (!inv) return null;
    const priorPayments = allTransactionsPool.filter(
      (t) => t.type === "Collection" && t.linkedDocumentId === inv.id && !isReversedOrRejectedStatus(t.status)
    );
    return { inv, priorPayments };
  }, [mode, cashForm.linkedDocumentId, state.openReceivablesInvoices, allTransactionsPool]);

  const selectedLinkedExpenseInfo = useMemo(() => {
    if (mode !== "cash-payment" || !cashForm.linkedDocumentId) return null;
    const exp = state.openPayablesExpenses.find((ex) => ex.id === cashForm.linkedDocumentId);
    if (!exp) return null;
    const priorPayments = allTransactionsPool.filter(
      (t) => t.type === "Payment" && t.linkedDocumentId === exp.id && !isReversedOrRejectedStatus(t.status)
    );
    return { exp, priorPayments };
  }, [mode, cashForm.linkedDocumentId, state.openPayablesExpenses, allTransactionsPool]);

  const meta = {
    "revenue-management": {
      title: isAmharic ? "2. የገቢ አስተዳደር (Revenue Management)" : "2. Revenue Management",
      subtitle: isAmharic
        ? "የፕሮጀክት ገቢ፣ የክፍያ ሰርተፊኬቶች (IPC) እና የደንበኛ ደረሰኞች (Accrual)"
        : "Project billings, interim payment certificates, and customer invoices (Accrual Ledger).",
      icon: TrendingUp,
      accent: "text-emerald-400",
      actionLabel: isAmharic ? "አዲስ ገቢ መዝግብ" : "Record Revenue",
    },
    "expense-management": {
      title: isAmharic ? "3. የወጪ አስተዳደር (Expense Management)" : "3. Expense Management",
      subtitle: isAmharic
        ? "የማቴሪያል፣ የሰራተኛ፣ የማሽነሪ እና የንዑስ ተቋራጭ ወጪዎች (Accrual)"
        : "Direct project costs, supplier bills, subcontractor claims, and overheads (Accrual Ledger).",
      icon: TrendingDown,
      accent: "text-red-400",
      actionLabel: isAmharic ? "አዲስ ወጪ መዝግብ" : "Record Expense",
    },
    "cash-collection": {
      title: isAmharic ? "4. የጥሬ ገንዘብ መሰብሰብ አስተዳደር (Cash Collection)" : "4. Cash Collection Management",
      subtitle: isAmharic
        ? "ወርሃዊ እቅድ፣ የተረጋገጠ የደንበኛ ክፍያ መሰብሰብ፣ ከፊል ክፍያዎች፣ 7 ቻርቶች እና 14 ሪፖርቶች"
        : "Monthly collection plans, verified customer receipts, partial/multi-invoice settlements, approvals & analytics.",
      icon: ArrowDownLeft,
      accent: "text-cyan-400",
      actionLabel: isAmharic ? "የተሰበሰበ ገንዘብ መዝግብ" : "Record Collection",
    },
    "cash-payment": {
      title: isAmharic ? "5. የጥሬ ገንዘብ ክፍያ አስተዳደር (Cash Payment)" : "5. Cash Payment Management",
      subtitle: isAmharic
        ? "ወርሃዊ የክፍያ እቅድ (11 ዘርፎች)፣ የአቅራቢና ሰራተኛ ክፍያዎች፣ የዳይሬክተር ማጽደቅ እና ሪፖርቶች"
        : "Monthly payment plans (11 categories), supplier disbursements, multi-level approvals & analytics.",
      icon: ArrowUpRight,
      accent: "text-amber-400",
      actionLabel: isAmharic ? "ክፍያ መዝግብ" : "Record Payment",
    },
  }[mode];

  const Icon = meta.icon;

  return (
    <div className="space-y-5" id={`finance-module-${mode}`}>
      {/* Header */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 ${meta.accent}`}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">{meta.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (mode === "revenue-management") exportRowsToCsv("revenue_ledger", state.scopedInvoices);
              else if (mode === "expense-management") exportRowsToCsv("expense_ledger", state.scopedExpenses);
              else if (mode === "cash-collection") exportRowsToCsv("cash_collections", filteredCashList);
              else exportRowsToCsv("cash_payments", filteredCashList);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download size={14} />
            <span>{isAmharic ? "CSV አውርድ" : "Export CSV"}</span>
          </button>

          {(permissions.canManageTransactions || permissions.isDirector) && (
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>{meta.actionLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Part 2 Sub-Navigation Workspace Tabs for Cash Collection & Cash Payment */}
      {isCashMode && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            {
              id: "ledger" as CashSubWorkspace,
              label: isAmharic
                ? mode === "cash-collection"
                  ? "የመሰብሰብ መዝገብ"
                  : "የክፍያ መዝገብ"
                : mode === "cash-collection"
                ? "Collection Transactions"
                : "Payment Transactions",
              icon: Receipt,
            },
            {
              id: "dashboard" as CashSubWorkspace,
              label: isAmharic ? "ዳሽቦርድ እና 7 ቻርቶች" : "Dashboard & 7 Charts",
              icon: BarChart3,
            },
            {
              id: "plans" as CashSubWorkspace,
              label: isAmharic ? "ወርሃዊ እቅድ (Planning)" : "Monthly Planning",
              icon: CalendarClock,
            },
            {
              id: "approvals" as CashSubWorkspace,
              label: isAmharic ? "ማረጋገጫ እና ማጽደቅ" : "Approvals & Verification",
              icon: ClipboardCheck,
              badge: pendingTypeCount > 0 ? pendingTypeCount : state.pendingApprovalTransactions.length,
            },
            {
              id: "reports" as CashSubWorkspace,
              label: isAmharic ? "14 ልዩ ሪፖርቶች" : "14 Cash Reports",
              icon: FileSpreadsheet,
            },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const active = cashSubView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCashSubView(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition whitespace-nowrap ${
                  active
                    ? mode === "cash-collection"
                      ? "bg-cyan-600 text-white border-cyan-500"
                      : "bg-amber-600 text-white border-amber-500"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-900"
                }`}
              >
                <TabIcon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-950/60 text-amber-300 font-mono text-[10px] tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {feedback && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && !showModal && !reverseTarget && !rejectTarget && (
        <div className="bg-red-950/60 border border-red-800 text-red-300 px-4 py-2.5 rounded-xl text-xs font-bold">
          {errorMsg}
        </div>
      )}

      {/* SUB-VIEWS FOR CASH COLLECTION / PAYMENT */}
      {isCashMode && cashSubView === "dashboard" && (
        <CashCollectionPaymentDashboard
          isAmharic={isAmharic}
          state={state}
          focusMode={mode === "cash-collection" ? "collection" : "payment"}
        />
      )}

      {isCashMode && cashSubView === "plans" && (
        <CashPlanningAndApprovalsView
          mode="plans"
          planFocus={mode === "cash-collection" ? "collection" : "payment"}
          isAmharic={isAmharic}
          state={state}
          rawInvoices={rawInvoices}
          rawExpenses={rawExpenses}
          rawAccounts={rawAccounts}
          actorName={actorName}
          actorRole={actorRole}
          actorUid={actorUid}
          onLogAction={onLogAction}
        />
      )}

      {isCashMode && cashSubView === "approvals" && (
        <CashPlanningAndApprovalsView
          mode="approvals"
          isAmharic={isAmharic}
          state={state}
          rawInvoices={rawInvoices}
          rawExpenses={rawExpenses}
          rawAccounts={rawAccounts}
          actorName={actorName}
          actorRole={actorRole}
          actorUid={actorUid}
          onLogAction={onLogAction}
        />
      )}

      {isCashMode && cashSubView === "reports" && (
        <CashReportsCenter
          isAmharic={isAmharic}
          state={state}
          defaultReport={
            mode === "cash-collection" ? "monthly-cash-collection" : "monthly-cash-payment"
          }
        />
      )}

      {/* STANDARD SUMMARY + LEDGER VIEW */}
      {(!isCashMode || cashSubView === "ledger") && (
        <>
          {/* Module Summary Strip */}
          {mode === "revenue-management" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የታቀደ ገቢ" : "Planned Revenue"}
                </span>
                <span className="text-lg font-mono font-black text-slate-200 tabular-nums mt-1 block">
                  {formatCurrency(metrics.plannedRevenue, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ትክክለኛ ገቢ" : "Actual Revenue"}
                </span>
                <span className="text-lg font-mono font-black text-emerald-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.actualRevenue, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ያልተሰበሰበ AR" : "Uncollected Billed"}
                </span>
                <span className="text-lg font-mono font-black text-amber-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.outstandingReceivables, cur)}
                </span>
              </div>
            </div>
          )}

          {mode === "expense-management" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የታቀደ ወጪ" : "Planned Expenses"}
                </span>
                <span className="text-lg font-mono font-black text-slate-200 tabular-nums mt-1 block">
                  {formatCurrency(metrics.plannedExpenses, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ትክክለኛ ወጪ" : "Actual Expenses"}
                </span>
                <span className="text-lg font-mono font-black text-red-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.actualExpenses, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ያልተከፈለ ቀሪ" : "Unpaid Expenses (AP)"}
                </span>
                <span className="text-lg font-mono font-black text-orange-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.outstandingPayables, cur)}
                </span>
              </div>
            </div>
          )}

          {mode === "cash-collection" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ወርሃዊ የመሰብሰብ እቅድ" : "Planned Collection"}
                </span>
                <span className="text-base font-mono font-black text-slate-200 tabular-nums mt-1 block">
                  {formatCurrency(metrics.plannedCashCollection, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የተረጋገጠ የተሰበሰበ" : "Actual Confirmed"}
                </span>
                <span className="text-base font-mono font-black text-cyan-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.actualCashCollection, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የመሰብሰብ ልዩነት" : "Difference"}
                </span>
                <span
                  className={`text-base font-mono font-black tabular-nums mt-1 block ${
                    metrics.collectionDifference >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {metrics.collectionDifference >= 0 ? "+" : ""}
                  {formatCurrency(metrics.collectionDifference, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የእቅድ ስኬት (%)" : "Achievement (%)"}
                </span>
                <span className="text-base font-mono font-black text-white tabular-nums mt-1 block">
                  {metrics.collectionAchievementPct}%
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ቀሪ የእቅድ ግብ" : "Outstanding Target"}
                </span>
                <span className="text-base font-mono font-black text-amber-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.outstandingCollectionTarget, cur)}
                </span>
              </div>
            </div>
          )}

          {mode === "cash-payment" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ወርሃዊ የክፍያ እቅድ" : "Planned Payment"}
                </span>
                <span className="text-base font-mono font-black text-slate-200 tabular-nums mt-1 block">
                  {formatCurrency(metrics.plannedCashPayment, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የተረጋገጠ ክፍያ" : "Actual Confirmed Paid"}
                </span>
                <span className="text-base font-mono font-black text-amber-400 tabular-nums mt-1 block">
                  {formatCurrency(metrics.actualCashPayment, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የክፍያ ልዩነት" : "Payment Difference"}
                </span>
                <span
                  className={`text-base font-mono font-black tabular-nums mt-1 block ${
                    metrics.paymentDifference <= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {metrics.paymentDifference > 0 ? "+" : ""}
                  {formatCurrency(metrics.paymentDifference, cur)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "የክፍያ ስኬት (%)" : "Payment Execution (%)"}
                </span>
                <span className="text-base font-mono font-black text-white tabular-nums mt-1 block">
                  {metrics.paymentAchievementPct}%
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase text-slate-400 font-bold">
                  {isAmharic ? "ቀሪ የታቀደ ክፍያ" : "Remaining Planned"}
                </span>
                <span className="text-base font-mono font-black text-slate-200 tabular-nums mt-1 block">
                  {formatCurrency(metrics.outstandingPlannedPayments, cur)}
                </span>
              </div>
            </div>
          )}

          {/* Status Quick Filter for Cash Modes */}
          {isCashMode && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL" as const, label: isAmharic ? "ሁሉም" : `All (${activeCashListRaw.length})` },
                  {
                    id: "CONFIRMED" as const,
                    label: isAmharic
                      ? "የጸደቁ (Confirmed)"
                      : `Confirmed (${activeCashListRaw.filter((t) => isConfirmedCashStatus(t.status)).length})`,
                  },
                  {
                    id: "PENDING" as const,
                    label: isAmharic
                      ? "በመጠባበቅ ላይ"
                      : `Pending (${activeCashListRaw.filter((t) => isPendingCashStatus(t.status)).length})`,
                  },
                  {
                    id: "REVERSED" as const,
                    label: isAmharic
                      ? "ውድቅ / የተመለሱ"
                      : `Reversed / Rejected (${activeCashListRaw.filter((t) => isReversedOrRejectedStatus(t.status)).length})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition ${
                      statusFilter === f.id
                        ? "bg-slate-800 text-white border-slate-600"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400">
                {isAmharic
                  ? "ማሳሰቢያ፡ የጸደቁ ግብይቶች ብቻ የባንክ ቀሪን እና AR/APን ያዘምናሉ።"
                  : "Governance Rule: Only Verified & Confirmed entries alter Cash/Bank & AR/AP balances."}
              </span>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              {mode === "revenue-management" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                      <th className="py-3 px-4">{isAmharic ? "ደረሰኝ / መለያ" : "Ref / Invoice"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ደንበኛ" : "Customer"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት / ክፍል" : "Project / Dept"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ቀን / መጨረሻ ቀን" : "Date / Due"}</th>
                      <th className="py-3 px-4 text-right">{isAmharic ? "የገቢ መጠን" : "Amount"}</th>
                      <th className="py-3 px-4 text-right">{isAmharic ? "የተሰበሰበ" : "Collected"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ሁኔታ" : "Status"}</th>
                      {permissions.canDeleteTransactions && (
                        <th className="py-3 px-4 text-right">{isAmharic ? "ድርጊት" : "Action"}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {state.scopedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <Receipt size={28} className="mx-auto mb-2 opacity-40" />
                          <p className="font-bold text-slate-300">
                            {isAmharic ? "ምንም የገቢ መዝገብ የለም" : "No Revenue Records Found for Active Filters"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      state.scopedInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-white block">{inv.invoiceNumber}</span>
                            <span className="text-[10px] text-slate-500">
                              {inv.contractNumber ? `${inv.contractNumber} · ` : ""}
                              {inv.normalizedCategory}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{inv.normalizedClient}</td>
                          <td className="py-3 px-4">
                            <span className="block">{inv.project}</span>
                            <span className="text-[10px] text-slate-400">{inv.normalizedDepartment}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <span className="block">{inv.date}</span>
                            <span className={inv.isOverdue ? "text-red-400 font-bold" : "text-slate-500"}>
                              Due: {inv.dueDate}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 tabular-nums">
                            {formatCurrency(inv.amount, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-cyan-400 tabular-nums">
                            {formatCurrency(inv.collectedAmount, cur)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                inv.status === "Paid"
                                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-800"
                                  : inv.status === "Overdue"
                                  ? "bg-red-950/70 text-red-400 border-red-800"
                                  : "bg-amber-950/70 text-amber-300 border-amber-800"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          {permissions.canDeleteTransactions && (
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => DbService.deleteInvoice(inv.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete"
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
              )}

              {mode === "expense-management" && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                      <th className="py-3 px-4">{isAmharic ? "መለያ / ዘርፍ" : "Ref / Category"}</th>
                      <th className="py-3 px-4">{isAmharic ? "አቅራቢ / ተከፋይ" : "Supplier / Vendor"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት / ክፍል" : "Project / Cost Center"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ቀን / መጨረሻ ቀን" : "Date / Due"}</th>
                      <th className="py-3 px-4 text-right">{isAmharic ? "መጠን" : "Amount"}</th>
                      <th className="py-3 px-4 text-right">{isAmharic ? "የተከፈለ" : "Paid Cash"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ሁኔታ" : "Status"}</th>
                      {permissions.canDeleteTransactions && (
                        <th className="py-3 px-4 text-right">{isAmharic ? "ድርጊት" : "Action"}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {state.scopedExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <TrendingDown size={28} className="mx-auto mb-2 opacity-40" />
                          <p className="font-bold text-slate-300">
                            {isAmharic ? "ምንም የወጪ መዝገብ የለም" : "No Expense Records Found for Active Filters"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      state.scopedExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-white block">
                              {exp.referenceNo || exp.billNumber || exp.id}
                            </span>
                            <span className="text-[10px] text-slate-400">{exp.normalizedCategory}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium block">{exp.normalizedSupplier}</span>
                            <span className="text-[10px] text-slate-400">{exp.description}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="block">{exp.project}</span>
                            <span className="text-[10px] text-slate-400">{exp.normalizedDepartment}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <span className="block">{exp.date}</span>
                            <span className={exp.isOverdue ? "text-red-400 font-bold" : "text-slate-500"}>
                              Due: {exp.dueDate}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-red-400 tabular-nums">
                            {formatCurrency(exp.amount, cur)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-400 tabular-nums">
                            {formatCurrency(exp.paidCashAmount, cur)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                exp.normalizedStatus === "Paid"
                                  ? "bg-emerald-950/70 text-emerald-400 border-emerald-800"
                                  : exp.normalizedStatus === "Overdue"
                                  ? "bg-red-950/70 text-red-400 border-red-800"
                                  : "bg-slate-900 text-slate-300 border-slate-700"
                              }`}
                            >
                              {exp.normalizedStatus}
                            </span>
                          </td>
                          {permissions.canDeleteTransactions && (
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => DbService.deleteExpense(exp.id)}
                                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete"
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
              )}

              {isCashMode && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                      <th className="py-3 px-4">
                        {mode === "cash-collection"
                          ? isAmharic
                            ? "መለያ / ደረሰኝ #"
                            : "Tx ID / Receipt #"
                          : isAmharic
                          ? "መለያ / ቫውቸር #"
                          : "Tx ID / Voucher #"}
                      </th>
                      <th className="py-3 px-4">
                        {mode === "cash-collection"
                          ? isAmharic
                            ? "ደንበኛ / ኮንትራት"
                            : "Customer / Contract"
                          : isAmharic
                          ? "አቅራቢ / ዘርፍ"
                          : "Supplier / Category"}
                      </th>
                      <th className="py-3 px-4">{isAmharic ? "ሂሳብ / ባንክ ማጣቀሻ" : "Account & Bank Ref"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት / ደረሰኝ #" : "Project / Invoice #"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ቀን" : "Date"}</th>
                      <th className="py-3 px-4 text-right">{isAmharic ? "መጠን" : "Amount"}</th>
                      <th className="py-3 px-4">{isAmharic ? "ሁኔታ" : "Status"}</th>
                      <th className="py-3 px-4 text-right">{isAmharic ? "ድርጊት" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {filteredCashList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <Icon size={28} className="mx-auto mb-2 opacity-40" />
                          <p className="font-bold text-slate-300">
                            {mode === "cash-collection"
                              ? isAmharic
                                ? "ምንም የተሰበሰበ ጥሬ ገንዘብ የለም"
                                : "No Cash Collection Entries Found"
                              : isAmharic
                              ? "ምንም የተከፈለ ጥሬ ገንዘብ የለም"
                              : "No Cash Payment Entries Found"}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredCashList.map((tx) => {
                        const confirmed = isConfirmedCashStatus(tx.status);
                        const pending = isPendingCashStatus(tx.status);
                        const needsDirector =
                          tx.type === "Payment" &&
                          (tx.requiresDirectorApproval || tx.amount > settings.requireDirectorApprovalAboveEtb);
                        const canApproveRow =
                          tx.type === "Collection"
                            ? permissions.canVerifyCollections
                            : needsDirector
                            ? permissions.canApproveHighValuePayments
                            : permissions.canApproveStandardPayments;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-900/40">
                            <td className="py-3 px-4 font-mono">
                              <span className="font-bold text-white block">{tx.referenceNo}</span>
                              <span className="text-[10px] text-slate-400">
                                {tx.type === "Collection"
                                  ? tx.receiptNumber || "—"
                                  : tx.paymentVoucherNumber || "—"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-white block">{tx.counterparty}</span>
                              <span className="text-[10px] text-slate-400">
                                {tx.type === "Collection" ? tx.contractNumber || tx.category : tx.category}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="block text-white">{tx.accountName}</span>
                              <span className="text-[10px] text-slate-400">
                                {tx.paymentMethod}
                                {tx.bankReferenceNumber ? ` · Ref: ${tx.bankReferenceNumber}` : ""}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="block">{tx.project}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {tx.invoiceNumber || tx.linkedReferenceNo || "Direct"}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">{tx.date}</td>
                            <td
                              className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                                mode === "cash-collection" ? "text-cyan-400" : "text-amber-400"
                              }`}
                            >
                              {formatCurrency(tx.amount, cur)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border inline-block ${
                                  confirmed
                                    ? "bg-emerald-950/70 text-emerald-400 border-emerald-800"
                                    : pending
                                    ? "bg-amber-950/70 text-amber-300 border-amber-800"
                                    : "bg-red-950/70 text-red-400 border-red-800"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setInspectTx(tx)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                                  title="Inspect Receipt / Voucher & History"
                                >
                                  <Eye size={13} />
                                </button>

                                {pending && canApproveRow && (
                                  <button
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleQuickConfirmRow(tx)}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                    title={tx.type === "Collection" ? "Verify & Confirm" : "Approve & Pay"}
                                  >
                                    {tx.type === "Collection" ? "Verify" : "Approve"}
                                  </button>
                                )}

                                {pending && (permissions.canVerifyCollections || permissions.canApproveStandardPayments) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectTarget(tx);
                                      setRejectReason("");
                                    }}
                                    className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                )}

                                {confirmed && permissions.canReverseCashTransactions && !tx.isLegacyMigrated && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReverseTarget(tx);
                                      setReverseReason("");
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950 text-amber-400 cursor-pointer"
                                    title="Reverse Confirmed Transaction"
                                  >
                                    <RotateCcw size={13} />
                                  </button>
                                )}

                                {permissions.canDeleteTransactions && !confirmed && !tx.isLegacyMigrated && (
                                  <button
                                    type="button"
                                    onClick={() => DbService.deleteCashTransaction(tx.id)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                    title="Delete Draft/Rejected"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 text-slate-100 my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">{meta.actionLabel}</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">
                {errorMsg}
              </div>
            )}

            {mode === "revenue-management" && (
              <form onSubmit={handleCreateRevenue} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የደረሰኝ ቁጥር" : "Invoice / Ref Number"}
                    </label>
                    <input
                      type="text"
                      value={revForm.invoiceNumber}
                      onChange={(e) => setRevForm({ ...revForm, invoiceNumber: e.target.value })}
                      placeholder="Auto if blank"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የኮንትራት ቁጥር" : "Contract Number"}
                    </label>
                    <input
                      type="text"
                      value={revForm.contractNumber}
                      onChange={(e) => setRevForm({ ...revForm, contractNumber: e.target.value })}
                      placeholder="e.g., CTR-2026-01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ደንበኛ *" : "Customer / Client *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={revForm.client}
                      onChange={(e) => setRevForm({ ...revForm, client: e.target.value })}
                      placeholder="Client Name"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ፕሮጀክት *" : "Project *"}
                    </label>
                    <input
                      type="text"
                      list="finance-projects-list"
                      required
                      value={revForm.project}
                      onChange={(e) => setRevForm({ ...revForm, project: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ክፍል" : "Department"}
                    </label>
                    <input
                      type="text"
                      value={revForm.department}
                      onChange={(e) => setRevForm({ ...revForm, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የገቢ ዘርፍ" : "Category"}
                    </label>
                    <select
                      value={revForm.category}
                      onChange={(e) => setRevForm({ ...revForm, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      {REVENUE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? `መጠን (${cur}) *` : `Amount (${cur}) *`}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={revForm.amount}
                      onChange={(e) => setRevForm({ ...revForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ቀን *" : "Billing Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={revForm.date}
                      onChange={(e) => setRevForm({ ...revForm, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የክፍያ መጨረሻ ቀን *" : "Due Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={revForm.dueDate}
                      onChange={(e) => setRevForm({ ...revForm, dueDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    {isAmharic ? "መግለጫ" : "Description"}
                  </label>
                  <input
                    type="text"
                    value={revForm.description}
                    onChange={(e) => setRevForm({ ...revForm, description: e.target.value })}
                    placeholder="IPC #4 Slab Concrete & Aluminum Formwork"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "..." : isAmharic ? "ገቢ አስቀምጥ" : "Save Revenue Record"}
                  </button>
                </div>
              </form>
            )}

            {mode === "expense-management" && (
              <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "አቅራቢ / ተከፋይ *" : "Supplier / Vendor *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={expForm.vendor}
                      onChange={(e) => setExpForm({ ...expForm, vendor: e.target.value })}
                      placeholder="Supplier Name"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የወጪ ዘርፍ *" : "Category *"}
                    </label>
                    <select
                      value={expForm.category}
                      onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ፕሮጀክት *" : "Project *"}
                    </label>
                    <input
                      type="text"
                      list="finance-projects-list"
                      required
                      value={expForm.project}
                      onChange={(e) => setExpForm({ ...expForm, project: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ክፍል / ዲፓርትመንት" : "Department"}
                    </label>
                    <input
                      type="text"
                      value={expForm.department}
                      onChange={(e) => setExpForm({ ...expForm, department: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? `መጠን (${cur}) *` : `Amount (${cur}) *`}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={expForm.amount}
                      onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የደረሰኝ ቁጥር" : "Supplier Bill No."}
                    </label>
                    <input
                      type="text"
                      value={expForm.billNumber}
                      onChange={(e) => setExpForm({ ...expForm, billNumber: e.target.value })}
                      placeholder="Auto if blank"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ቀን *" : "Expense Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={expForm.date}
                      onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የክፍያ መጨረሻ ቀን *" : "Due Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={expForm.dueDate}
                      onChange={(e) => setExpForm({ ...expForm, dueDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    {isAmharic ? "መግለጫ *" : "Description *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={expForm.description}
                    onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                    placeholder="Material delivery, labor, or service description"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "..." : isAmharic ? "ወጪ አስቀምጥ" : "Save Expense Bill"}
                  </button>
                </div>
              </form>
            )}

            {isCashMode && (
              <form onSubmit={handleCreateCashTx} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    {mode === "cash-collection"
                      ? isAmharic
                        ? "ከደረሰኝ ጋር አገናኝ (ሙሉ ወይም ከፊል ክፍያ)"
                        : "Link Open Receivable Invoice (Full, Partial or Multiple Payments)"
                      : isAmharic
                      ? "ከወጪ ሂሳብ ጋር አገናኝ (ሙሉ ወይም ከፊል ክፍያ)"
                      : "Link Open Payable Bill (Full, Partial or Installment Payments)"}
                  </label>
                  <select
                    value={cashForm.linkedDocumentId}
                    onChange={(e) => handleLinkSelectionChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">
                      {isAmharic
                        ? "ቀጥተኛ የጥሬ ገንዘብ ግብይት (ያልተገናኘ)"
                        : "Direct Unlinked Transaction"}
                    </option>
                    {mode === "cash-collection"
                      ? state.openReceivablesInvoices.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoiceNumber} — {inv.normalizedClient} (Open: {formatCurrency(inv.outstandingAmount, cur)} / Total: {formatCurrency(inv.amount, cur)})
                          </option>
                        ))
                      : state.openPayablesExpenses.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.referenceNo || ex.id} — {ex.normalizedSupplier} (Open: {formatCurrency(ex.outstandingAmount, cur)} / Total: {formatCurrency(ex.amount, cur)})
                          </option>
                        ))}
                  </select>
                </div>

                {/* Live Partial/Multi Payment Summary Box */}
                {selectedLinkedInvoiceInfo && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-cyan-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Invoice Total: </span>
                      <span className="font-mono font-bold text-white">{formatCurrency(selectedLinkedInvoiceInfo.inv.amount, cur)}</span>
                      <span className="text-slate-600 mx-2">|</span>
                      <span className="text-slate-400">Collected: </span>
                      <span className="font-mono font-bold text-cyan-400">{formatCurrency(selectedLinkedInvoiceInfo.inv.collectedAmount, cur)}</span>
                      <span className="text-slate-600 mx-2">|</span>
                      <span className="text-slate-400">Open Balance: </span>
                      <span className="font-mono font-bold text-amber-400">{formatCurrency(selectedLinkedInvoiceInfo.inv.outstandingAmount, cur)}</span>
                    </div>
                    <span className="text-slate-400 font-mono">
                      Prior receipts: {selectedLinkedInvoiceInfo.priorPayments.length}
                    </span>
                  </div>
                )}

                {selectedLinkedExpenseInfo && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Bill Total: </span>
                      <span className="font-mono font-bold text-white">{formatCurrency(selectedLinkedExpenseInfo.exp.amount, cur)}</span>
                      <span className="text-slate-600 mx-2">|</span>
                      <span className="text-slate-400">Paid: </span>
                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(selectedLinkedExpenseInfo.exp.paidCashAmount, cur)}</span>
                      <span className="text-slate-600 mx-2">|</span>
                      <span className="text-slate-400">Open AP: </span>
                      <span className="font-mono font-bold text-amber-400">{formatCurrency(selectedLinkedExpenseInfo.exp.outstandingAmount, cur)}</span>
                    </div>
                    <span className="text-slate-400 font-mono">
                      Prior disbursements: {selectedLinkedExpenseInfo.priorPayments.length}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የጥሬ ገንዘብ / ባንክ ሂሳብ *" : "Cash / Bank Account *"}
                    </label>
                    <select
                      required
                      value={cashForm.accountId}
                      onChange={(e) => setCashForm({ ...cashForm, accountId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">{isAmharic ? "ሂሳብ ይምረጡ..." : "Select Account..."}</option>
                      {rawAccounts
                        .filter((a) => a.status !== "Inactive")
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountName} ({acc.accountType} — {formatCurrency(acc.currentBalance, cur)})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የክፍያ ዘዴ *" : "Payment Method *"}
                    </label>
                    <select
                      value={cashForm.paymentMethod}
                      onChange={(e) => setCashForm({ ...cashForm, paymentMethod: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      {COLLECTION_PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {mode === "cash-collection"
                        ? isAmharic
                          ? "ደንበኛ / ከፋይ *"
                          : "Customer Name *"
                        : isAmharic
                        ? "አቅራቢ / ተከፋይ *"
                        : "Supplier / Payee *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={cashForm.counterparty}
                      onChange={(e) => setCashForm({ ...cashForm, counterparty: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ፕሮጀክት *" : "Project *"}
                    </label>
                    <input
                      type="text"
                      list="finance-projects-list"
                      required
                      value={cashForm.project}
                      onChange={(e) => setCashForm({ ...cashForm, project: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {mode === "cash-collection"
                        ? isAmharic
                          ? "የመሰብሰብ ዘርፍ"
                          : "Collection Category"
                        : isAmharic
                        ? "የወጪ ዘርፍ (11 ምድቦች) *"
                        : "Expense Category (11 Categories) *"}
                    </label>
                    <select
                      value={cashForm.category}
                      onChange={(e) => setCashForm({ ...cashForm, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    >
                      {(mode === "cash-collection" ? COLLECTION_CATEGORIES : PAYMENT_PLANNING_CATEGORIES).map(
                        (cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? `መጠን (${cur}) *` : `Amount (${cur}) *`}
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={cashForm.amount}
                      onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ቀን *" : "Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={cashForm.date}
                      onChange={(e) => setCashForm({ ...cashForm, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {mode === "cash-collection"
                        ? isAmharic
                          ? "የደረሰኝ ቁጥር (Receipt #)"
                          : "Receipt Number"
                        : isAmharic
                        ? "የክፍያ ቫውቸር ቁጥር (Voucher #)"
                        : "Payment Voucher Number"}
                    </label>
                    <input
                      type="text"
                      value={
                        mode === "cash-collection"
                          ? cashForm.receiptNumber
                          : cashForm.paymentVoucherNumber
                      }
                      onChange={(e) =>
                        setCashForm({
                          ...cashForm,
                          ...(mode === "cash-collection"
                            ? { receiptNumber: e.target.value }
                            : { paymentVoucherNumber: e.target.value }),
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "የባንክ ማጣቀሻ ቁጥር" : "Bank Reference Number"}
                    </label>
                    <input
                      type="text"
                      value={cashForm.bankReferenceNumber}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, bankReferenceNumber: e.target.value })
                      }
                      placeholder="TT / FT / Cheque Ref"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {mode === "cash-collection"
                        ? isAmharic
                          ? "የኮንትራት / ደረሰኝ ቁጥር"
                          : "Contract # / Invoice #"
                        : isAmharic
                        ? "የደረሰኝ / ቢል ቁጥር"
                        : "Invoice / Bill Number"}
                    </label>
                    <div className="flex gap-2">
                      {mode === "cash-collection" && (
                        <input
                          type="text"
                          value={cashForm.contractNumber}
                          onChange={(e) =>
                            setCashForm({ ...cashForm, contractNumber: e.target.value })
                          }
                          placeholder="Contract #"
                          className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono"
                        />
                      )}
                      <input
                        type="text"
                        value={cashForm.invoiceNumber}
                        onChange={(e) =>
                          setCashForm({ ...cashForm, invoiceNumber: e.target.value })
                        }
                        placeholder="Invoice #"
                        className={`${
                          mode === "cash-collection" ? "w-1/2" : "w-full"
                        } bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "ደጋፊ ሰነድ ስም/ማጣቀሻ" : "Supporting Document Ref"}
                    </label>
                    <input
                      type="text"
                      value={cashForm.supportingDocName}
                      onChange={(e) =>
                        setCashForm({ ...cashForm, supportingDocName: e.target.value })
                      }
                      placeholder="e.g. bank_slip_nov.pdf"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      {isAmharic ? "መግለጫ" : "Description"}
                    </label>
                    <input
                      type="text"
                      value={cashForm.description}
                      onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                      placeholder="Payment / collection purpose"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                {/* Role-Based Confirmation Option */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-200">
                      {mode === "cash-collection"
                        ? permissions.canVerifyCollections
                          ? "Verification Workflow"
                          : "Accountant Submission"
                        : permissions.canApproveStandardPayments || permissions.canApproveHighValuePayments
                        ? "Disbursement Approval Workflow"
                        : "Accountant Payment Request"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {mode === "cash-collection"
                        ? permissions.canVerifyCollections
                          ? "Choose immediate confirmation or route for later verification."
                          : "Submits as Pending Verification; Finance Manager verification required to update Cash/Bank."
                        : Number(cashForm.amount || 0) > settings.requireDirectorApprovalAboveEtb &&
                          !permissions.canApproveHighValuePayments
                        ? `Amount exceeds ${cur} ${settings.requireDirectorApprovalAboveEtb.toLocaleString()} limit — requires Director approval.`
                        : permissions.canApproveStandardPayments || permissions.canApproveHighValuePayments
                        ? "Approve & disburse immediately, or submit to approval queue."
                        : "Submits as Pending Approval; Finance Manager / Director approval updates Cash/Bank."}
                    </div>
                  </div>
                  {(mode === "cash-collection"
                    ? permissions.canVerifyCollections
                    : permissions.canApproveStandardPayments || permissions.canApproveHighValuePayments) && (
                    <label className="flex items-center gap-2 cursor-pointer shrink-0 font-bold text-emerald-400">
                      <input
                        type="checkbox"
                        checked={cashForm.confirmImmediately}
                        onChange={(e) =>
                          setCashForm({ ...cashForm, confirmImmediately: e.target.checked })
                        }
                        className="accent-emerald-500"
                      />
                      <span>
                        {mode === "cash-collection" ? "Verify & Confirm Now" : "Approve & Pay Now"}
                      </span>
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                    {isAmharic ? "ማስታወሻ" : "Notes"}
                  </label>
                  <input
                    type="text"
                    value={cashForm.notes}
                    onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                    placeholder="Additional treasury notes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
                  >
                    {isAmharic ? "ሰርዝ" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {submitting
                      ? "..."
                      : mode === "cash-collection"
                      ? isAmharic
                        ? "የመሰብሰብ ግብይት አስቀምጥ"
                        : "Submit Cash Collection"
                      : isAmharic
                      ? "የክፍያ ግብይት አስቀምጥ"
                      : "Submit Cash Payment"}
                  </button>
                </div>
              </form>
            )}
          </div>
          <datalist id="finance-projects-list">
            {state.filterOptions.projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      )}

      {/* RECEIPT / PAYMENT VOUCHER & APPROVAL HISTORY INSPECTOR MODAL */}
      {inspectTx && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-6 space-y-4 my-6">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  DIGITAL CONSTRUCTION ERP — TREASURY VOUCHER
                </div>
                <h3 className="text-lg font-black">
                  {inspectTx.type === "Collection"
                    ? "OFFICIAL CASH COLLECTION RECEIPT"
                    : "OFFICIAL CASH PAYMENT VOUCHER"}
                </h3>
                <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                  Ref: {inspectTx.referenceNo} ·{" "}
                  {inspectTx.type === "Collection"
                    ? `Receipt #: ${inspectTx.receiptNumber || "N/A"}`
                    : `Voucher #: ${inspectTx.paymentVoucherNumber || "N/A"}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectTx(null)}
                className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">
                  {inspectTx.type === "Collection" ? "Received From" : "Paid To"}
                </span>
                <span className="font-bold text-slate-900">{inspectTx.counterparty}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">
                  Amount ({cur})
                </span>
                <span className="font-mono font-black text-base text-slate-900 tabular-nums">
                  {formatCurrency(inspectTx.amount, cur)}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">
                  Account & Payment Method
                </span>
                <span className="font-semibold">
                  {inspectTx.accountName} ({inspectTx.paymentMethod})
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">
                  Date & Bank Reference
                </span>
                <span className="font-mono">
                  {inspectTx.date} · {inspectTx.bankReferenceNumber || "N/A"}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">
                  Project / Contract / Invoice
                </span>
                <span className="font-semibold">
                  {inspectTx.project}
                  {inspectTx.contractNumber ? ` · ${inspectTx.contractNumber}` : ""}
                  {inspectTx.invoiceNumber ? ` · ${inspectTx.invoiceNumber}` : ""}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase text-slate-500 block font-bold">
                  Recorded / Verified / Approved By
                </span>
                <span className="font-semibold block">
                  Rec: {inspectTx.recordedBy || inspectTx.createdBy || "—"}
                </span>
                <span className="font-semibold text-emerald-700">
                  {inspectTx.verifiedBy
                    ? `Verified: ${inspectTx.verifiedBy}`
                    : inspectTx.approvedBy
                    ? `Approved: ${inspectTx.approvedBy}`
                    : `Status: ${inspectTx.status}`}
                </span>
              </div>
            </div>

            {(inspectTx.description || inspectTx.supportingDocName || inspectTx.notes) && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                {inspectTx.description && (
                  <div>
                    <span className="font-bold">Description: </span>
                    {inspectTx.description}
                  </div>
                )}
                {inspectTx.supportingDocName && (
                  <div>
                    <span className="font-bold">Supporting Doc: </span>
                    <span className="font-mono">{inspectTx.supportingDocName}</span>
                  </div>
                )}
                {inspectTx.notes && (
                  <div>
                    <span className="font-bold">Notes: </span>
                    {inspectTx.notes}
                  </div>
                )}
              </div>
            )}

            {inspectTx.approvalHistory && inspectTx.approvalHistory.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  Approval & Audit Trail
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {inspectTx.approvalHistory.map((h, i) => (
                    <div
                      key={i}
                      className="text-[11px] p-2 rounded bg-slate-100 flex items-center justify-between gap-2"
                    >
                      <span>
                        <strong>{h.action}</strong> by {h.actorName} ({h.actorRole})
                        {h.notes ? ` — ${h.notes}` : ""}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {h.timestamp.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setInspectTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Receipt / Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReject}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-extrabold text-white">
                Reject Transaction {rejectTarget.referenceNo}
              </h4>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-1 bg-slate-800 rounded text-slate-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="text"
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVERSE CONFIRMED TRANSACTION MODAL */}
      {reverseTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReverse}
            className="bg-slate-900 border border-amber-800/70 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-extrabold text-amber-300">
                Reverse Confirmed {reverseTarget.type} ({reverseTarget.referenceNo})
              </h4>
              <button
                type="button"
                onClick={() => setReverseTarget(null)}
                className="p-1 bg-slate-800 rounded text-slate-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Reversing {formatCurrency(reverseTarget.amount, cur)} will restore{" "}
              {reverseTarget.accountName} balance and reopen any linked{" "}
              {reverseTarget.type === "Collection" ? "Receivable Invoice" : "Payable Bill"} atomically.
            </p>
            <input
              type="text"
              required
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Audit reason for reversal (required)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReverseTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Atomic Reversal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
