import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  FileSpreadsheet,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  CashPlanApprovalStatus,
  CollectionPlanScope,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  MonthlyCollectionPlan,
  MonthlyPaymentPlan,
} from "../../types";
import {
  approveAndConfirmPayment,
  ComputedFinancialState,
  exportRowsToCsv,
  generateFinancialRef,
  isConfirmedCashStatus,
  PAYMENT_PLANNING_CATEGORIES,
  rejectCashTransaction,
  verifyAndConfirmCollection,
} from "../../services/financeService";
import { DbService } from "../../services/db";
import { formatCurrency } from "../../utils/formatters";

interface CashPlanningAndApprovalsViewProps {
  mode: "plans" | "approvals";
  planFocus?: "all" | "collection" | "payment";
  isAmharic: boolean;
  state: ComputedFinancialState;
  rawInvoices: FinancialInvoiceRecord[];
  rawExpenses: Expense[];
  rawAccounts: FinancialAccount[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

export const CashPlanningAndApprovalsView: React.FC<CashPlanningAndApprovalsViewProps> = ({
  mode,
  planFocus = "all",
  isAmharic,
  state,
  rawInvoices,
  rawExpenses,
  rawAccounts,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const { permissions, metrics, settings } = state;
  const cur = settings.defaultCurrency || "ETB";
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const currentYear = today.slice(0, 4);

  const [subTab, setSubTab] = useState<"collection-plans" | "payment-plans">(
    planFocus === "payment" ? "payment-plans" : "collection-plans"
  );
  const [toast, setToast] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showColPlanModal, setShowColPlanModal] = useState(false);
  const [colPlanForm, setColPlanForm] = useState({
    financialYear: currentYear,
    month: currentMonth,
    targetScope: "Project" as CollectionPlanScope,
    project: state.assignedProjects[0] || state.filterOptions.projects[0] || "All Projects",
    customer: state.filterOptions.customers[0] || "",
    department: "Contracting & Billing",
    contractNumber: "",
    invoiceNumber: "",
    plannedAmount: "",
    expectedDate: today,
    responsiblePerson: actorName,
    notes: "",
    approvalStatus: "Approved" as CashPlanApprovalStatus,
  });

  const [showPayPlanModal, setShowPayPlanModal] = useState(false);
  const [payPlanForm, setPayPlanForm] = useState({
    financialYear: currentYear,
    month: currentMonth,
    project: state.assignedProjects[0] || state.filterOptions.projects[0] || "All Projects",
    department: "Operations",
    supplierOrPayee: "",
    expenseCategory: PAYMENT_PLANNING_CATEGORIES[0] as string,
    invoiceNumber: "",
    plannedAmount: "",
    expectedDate: today,
    responsiblePerson: actorName,
    approvalStatus: "Approved" as CashPlanApprovalStatus,
    notes: "",
  });

  const [rejectTarget, setRejectTarget] = useState<{ id: string; txRef: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveCollectionPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageCollectionPaymentPlans) return;
    const amt = Number(colPlanForm.plannedAmount);
    if (!colPlanForm.month || isNaN(amt) || amt <= 0) {
      setErrMsg(isAmharic ? "እባክዎ ወር እና ትክክለኛ የታቀደ መጠን ያስገቡ።" : "Month and positive Planned Collection Amount are required.");
      return;
    }
    setBusyId("save-col-plan");
    setErrMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const plan: MonthlyCollectionPlan = {
        id: `CPL-${Date.now()}`,
        planNumber: generateFinancialRef("CPL"),
        financialYear: colPlanForm.financialYear.trim() || currentYear,
        month: colPlanForm.month.slice(0, 7),
        targetScope: colPlanForm.targetScope,
        project: colPlanForm.targetScope === "Company" ? "All Projects" : colPlanForm.project.trim() || "All Projects",
        customer: colPlanForm.targetScope === "Customer" || colPlanForm.customer.trim() ? colPlanForm.customer.trim() || "All Customers" : "All Customers",
        department: colPlanForm.department.trim() || "All Departments",
        contractNumber: colPlanForm.contractNumber.trim(),
        invoiceNumber: colPlanForm.invoiceNumber.trim(),
        plannedAmount: amt,
        expectedDate: colPlanForm.expectedDate || `${colPlanForm.month}-28`,
        responsiblePerson: colPlanForm.responsiblePerson.trim() || actorName,
        notes: colPlanForm.notes.trim(),
        approvalStatus: colPlanForm.approvalStatus,
        approvedBy: colPlanForm.approvalStatus === "Approved" ? actorName : undefined,
        approvedAt: colPlanForm.approvalStatus === "Approved" ? nowIso : undefined,
        createdBy: actorName,
        createdById: actorUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await DbService.saveCollectionPlan(plan);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Save Monthly Collection Plan",
        category: "Finance",
        severity: "INFO",
        details: `Created Collection Plan ${plan.planNumber} (${plan.month}, ${plan.targetScope}) for ${cur} ${amt.toLocaleString()} [${plan.approvalStatus}].`,
      });
      onLogAction?.("Save Collection Plan", `${plan.planNumber} - ${cur} ${amt.toLocaleString()}`);
      setShowColPlanModal(false);
      setColPlanForm({ ...colPlanForm, plannedAmount: "", contractNumber: "", invoiceNumber: "", notes: "" });
      showNotice(isAmharic ? "ወርሃዊ የገንዘብ መሰብሰብ እቅድ ተቀምጧል።" : "Monthly collection plan saved to Firestore.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save collection plan.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSavePaymentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManageCollectionPaymentPlans) return;
    const amt = Number(payPlanForm.plannedAmount);
    if (!payPlanForm.month || !payPlanForm.supplierOrPayee.trim() || isNaN(amt) || amt <= 0) {
      setErrMsg(isAmharic ? "እባክዎ ወር፣ ተከፋይ/አቅራቢ እና ትክክለኛ መጠን ያስገቡ።" : "Month, Supplier/Payee, and positive Planned Amount are required.");
      return;
    }
    setBusyId("save-pay-plan");
    setErrMsg(null);
    try {
      const nowIso = new Date().toISOString();
      const plan: MonthlyPaymentPlan = {
        id: `PPL-${Date.now()}`,
        planNumber: generateFinancialRef("PPL"),
        financialYear: payPlanForm.financialYear.trim() || currentYear,
        month: payPlanForm.month.slice(0, 7),
        project: payPlanForm.project.trim() || "All Projects",
        department: payPlanForm.department.trim() || "Operations",
        supplierOrPayee: payPlanForm.supplierOrPayee.trim(),
        expenseCategory: payPlanForm.expenseCategory,
        invoiceNumber: payPlanForm.invoiceNumber.trim(),
        plannedAmount: amt,
        expectedDate: payPlanForm.expectedDate || `${payPlanForm.month}-25`,
        responsiblePerson: payPlanForm.responsiblePerson.trim() || actorName,
        approvalStatus: payPlanForm.approvalStatus,
        approvedBy: payPlanForm.approvalStatus === "Approved" ? actorName : undefined,
        approvedAt: payPlanForm.approvalStatus === "Approved" ? nowIso : undefined,
        notes: payPlanForm.notes.trim(),
        createdBy: actorName,
        createdById: actorUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await DbService.savePaymentPlan(plan);
      await DbService.addAuditLog({
        id: `AUD-${Date.now()}`,
        timestamp: nowIso,
        userId: actorUid,
        userName: actorName,
        role: actorRole,
        action: "Save Monthly Payment Plan",
        category: "Finance",
        severity: "INFO",
        details: `Created Payment Plan ${plan.planNumber} (${plan.month}, ${plan.expenseCategory}) to ${plan.supplierOrPayee} for ${cur} ${amt.toLocaleString()} [${plan.approvalStatus}].`,
      });
      onLogAction?.("Save Payment Plan", `${plan.planNumber} - ${cur} ${amt.toLocaleString()}`);
      setShowPayPlanModal(false);
      setPayPlanForm({ ...payPlanForm, supplierOrPayee: "", plannedAmount: "", invoiceNumber: "", notes: "" });
      showNotice(isAmharic ? "ወርሃዊ የገንዘብ ክፍያ እቅድ ተቀምጧል።" : "Monthly payment plan saved to Firestore.");
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save payment plan.");
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePlanStatus = async (
    kind: "collection" | "payment",
    plan: MonthlyCollectionPlan | MonthlyPaymentPlan,
    nextStatus: CashPlanApprovalStatus
  ) => {
    if (!permissions.canManageCollectionPaymentPlans) return;
    const nowIso = new Date().toISOString();
    const updated = {
      ...plan,
      approvalStatus: nextStatus,
      approvedBy: nextStatus === "Approved" ? actorName : plan.approvedBy,
      approvedAt: nextStatus === "Approved" ? nowIso : plan.approvedAt,
      updatedAt: nowIso,
    };
    if (kind === "collection") {
      await DbService.saveCollectionPlan(updated as MonthlyCollectionPlan);
    } else {
      await DbService.savePaymentPlan(updated as MonthlyPaymentPlan);
    }
    showNotice(`Plan ${plan.planNumber} marked as ${nextStatus}.`);
  };

  const handleVerifyOrApproveTx = async (txId: string) => {
    const tx = state.pendingApprovalTransactions.find((t) => t.id === txId);
    if (!tx) return;
    setBusyId(tx.id);
    setErrMsg(null);
    try {
      const targetAcc = rawAccounts.find((a) => a.id === tx.accountId);
      if (tx.type === "Collection") {
        const linkedInv = rawInvoices.find((i) => i.id === tx.linkedDocumentId);
        await verifyAndConfirmCollection({
          tx,
          targetAccount: targetAcc,
          linkedInvoice: linkedInv,
          actorName,
          actorRole,
          actorUid,
        });
        showNotice(`Collection ${tx.referenceNo} verified & credited to ${tx.accountName}.`);
      } else {
        const linkedExp = rawExpenses.find((ex) => ex.id === tx.linkedDocumentId);
        await approveAndConfirmPayment({
          tx,
          sourceAccount: targetAcc,
          linkedExpense: linkedExp,
          directorApprovalThresholdEtb: settings.requireDirectorApprovalAboveEtb,
          actorName,
          actorRole,
          actorUid,
        });
        showNotice(`Payment ${tx.referenceNo} approved & disbursed from ${tx.accountName}.`);
      }
      onLogAction?.(`Confirm Cash ${tx.type}`, `${tx.referenceNo} (${cur} ${tx.amount.toLocaleString()})`);
    } catch (err: any) {
      setErrMsg(err?.message || "Approval action blocked.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    const tx = state.pendingApprovalTransactions.find((t) => t.id === rejectTarget.id);
    if (!tx) return;
    setBusyId(tx.id);
    setErrMsg(null);
    try {
      await rejectCashTransaction({
        tx,
        reason: rejectReason || "Rejected during review",
        actorName,
        actorRole,
        actorUid,
      });
      setRejectTarget(null);
      setRejectReason("");
      showNotice(`Transaction ${tx.referenceNo} rejected.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to reject transaction.");
    } finally {
      setBusyId(null);
    }
  };

  // Actuals matched per plan row for live Plan vs Actual table
  const confirmedCollections = useMemo(
    () => state.scopedCashTransactions.filter((t) => t.type === "Collection" && isConfirmedCashStatus(t.status)),
    [state.scopedCashTransactions]
  );
  const confirmedPayments = useMemo(
    () => state.scopedCashTransactions.filter((t) => t.type === "Payment" && isConfirmedCashStatus(t.status)),
    [state.scopedCashTransactions]
  );

  if (mode === "approvals") {
    return (
      <div className="space-y-5" id="cash-approvals-queue">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {isAmharic
                  ? "የገንዘብ መሰብሰብ ማረጋገጫ እና የክፍያ ፍቃድ ሰልፍ"
                  : "Collection Verification & Payment Approval Queue"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic
                  ? `ከ ${formatCurrency(settings.requireDirectorApprovalAboveEtb, cur)} በላይ ያሉ ክፍያዎች የዳይሬክተር (Super Admin / Head Office) ፍቃድ ይፈልጋሉ`
                  : `Director approval threshold: ${formatCurrency(settings.requireDirectorApprovalAboveEtb, cur)}. Pending entries do NOT affect balances until verified/approved.`}
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-300 tabular-nums whitespace-nowrap">
            {state.pendingApprovalTransactions.length} {isAmharic ? "በመጠባበቅ ላይ" : "Pending Review"}
          </span>
        </div>

        {toast && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{toast}</span>
          </div>
        )}
        {errMsg && (
          <div className="bg-red-950/70 border border-red-800 text-red-300 px-4 py-2.5 rounded-xl text-xs font-bold">
            {errMsg}
          </div>
        )}

        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3 px-4">{isAmharic ? "መለያ / ደረሰኝ" : "Ref / Doc #"}</th>
                  <th className="py-3 px-4">{isAmharic ? "አይነት" : "Type"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ከፋይ / ተከፋይ" : "Counterparty"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ፕሮጀክት / ሂሳብ" : "Project & Account"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ያስገባው" : "Recorded By"}</th>
                  <th className="py-3 px-4 text-right">{isAmharic ? "መጠን" : "Amount"}</th>
                  <th className="py-3 px-4">{isAmharic ? "ሁኔታ" : "Approval Stage"}</th>
                  <th className="py-3 px-4 text-right">{isAmharic ? "ውሳኔ" : "Governance Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {state.pendingApprovalTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <ClipboardCheck size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="font-bold text-slate-300">
                        {isAmharic ? "በመጠባበቅ ላይ ያለ ግብይት የለም" : "All Cash Collections & Payments Reviewed — Queue Clear"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  state.pendingApprovalTransactions.map((tx) => {
                    const needsDirector =
                      tx.type === "Payment" &&
                      (tx.requiresDirectorApproval || tx.amount > settings.requireDirectorApprovalAboveEtb);
                    const canApproveRow =
                      tx.type === "Collection"
                        ? permissions.canVerifyCollections
                        : needsDirector
                        ? permissions.canApproveHighValuePayments
                        : permissions.canApproveStandardPayments || permissions.canApproveHighValuePayments;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-white block">{tx.referenceNo}</span>
                          <span className="text-[10px] text-slate-400">
                            {tx.receiptNumber || tx.paymentVoucherNumber || "—"} | {tx.date}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              tx.type === "Collection"
                                ? "bg-cyan-950/60 text-cyan-300 border-cyan-800"
                                : "bg-amber-950/60 text-amber-300 border-amber-800"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold block">{tx.counterparty}</span>
                          <span className="text-[10px] text-slate-400">
                            {tx.invoiceNumber ? `Inv: ${tx.invoiceNumber}` : tx.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="block">{tx.project}</span>
                          <span className="text-[10px] text-slate-400">
                            {tx.accountName} ({tx.paymentMethod})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{tx.recordedBy || tx.createdBy}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-white">
                          {formatCurrency(tx.amount, cur)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              needsDirector
                                ? "bg-red-950/70 text-red-300 border-red-800"
                                : "bg-amber-950/70 text-amber-300 border-amber-800"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canApproveRow ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={busyId === tx.id}
                                onClick={() => handleVerifyOrApproveTx(tx.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                              >
                                {tx.type === "Collection"
                                  ? isAmharic ? "አረጋግጥና አጽድቅ" : "Verify & Confirm"
                                  : needsDirector
                                  ? isAmharic ? "የዳይሬክተር ፍቃድ ስጥ" : "Director Approve & Pay"
                                  : isAmharic ? "ፍቃድ ስጥና ክፈል" : "Approve & Pay"}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === tx.id}
                                onClick={() => setRejectTarget({ id: tx.id, txRef: tx.referenceNo })}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-700 text-red-400 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                              >
                                {isAmharic ? "ውድቅ አድርግ" : "Reject"}
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                              <Lock size={11} />
                              {needsDirector
                                ? isAmharic ? "የዳይሬክተር ፍቃድ ብቻ" : "Director Role Required"
                                : isAmharic ? "የፋይናንስ ሥራ አስኪያጅ" : "Finance Manager Required"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {rejectTarget && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmReject}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <XCircle size={16} className="text-red-400" />
                  <span>{isAmharic ? "ግብይቱን ውድቅ አድርግ" : `Reject ${rejectTarget.txRef}`}</span>
                </h4>
                <button type="button" onClick={() => setRejectTarget(null)} className="p-1 text-slate-400 cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  {isAmharic ? "ውድቅ የተደረገበት ምክንያት *" : "Rejection Reason *"}
                </label>
                <input
                  type="text"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Missing bank slip / wrong amount / unverified receipt"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRejectTarget(null)} className="px-3.5 py-2 rounded-xl bg-slate-800 font-bold cursor-pointer">
                  {isAmharic ? "ተመለስ" : "Cancel"}
                </button>
                <button type="submit" className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">
                  {isAmharic ? "ውድቅ አድርግ" : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // MODE === "plans": Monthly Collection & Payment Planning
  return (
    <div className="space-y-5" id="cash-monthly-planning-view">
      {/* Header & Summary Strip */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
            <FilePlus2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isAmharic
                ? "ወርሃዊ የጥሬ ገንዘብ መሰብሰብ እና ክፍያ እቅድ (Monthly Cash Planning)"
                : "Monthly Cash Collection & Cash Payment Planning"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "በወሩ መጀመሪያ የጸደቁ የገንዘብ መሰብሰብ እና የክፍያ እቅዶችን በፕሮጀክት፣ በደንበኛ እና በወጪ ዘርፍ ያዘጋጁ።"
                : "Finance Manager & Director approved monthly cash collection targets and payment category budgets."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCsv(
                subTab === "collection-plans" ? "monthly_collection_plans" : "monthly_payment_plans",
                subTab === "collection-plans" ? state.scopedCollectionPlans : state.scopedPaymentPlans
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet size={14} />
            <span>{isAmharic ? "CSV አውርድ" : "Export CSV"}</span>
          </button>

          {permissions.canManageCollectionPaymentPlans && (
            <>
              <button
                type="button"
                onClick={() => {
                  setErrMsg(null);
                  setShowColPlanModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} />
                <span>{isAmharic ? "የመሰብሰብ እቅድ አክል" : "New Collection Plan"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrMsg(null);
                  setShowPayPlanModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus size={14} />
                <span>{isAmharic ? "የክፍያ እቅድ አክል" : "New Payment Plan"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{toast}</span>
        </div>
      )}

      {/* Automatic Calculations Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            {isAmharic ? "የመሰብሰብ እቅድ vs አፈጻጸም ስሌት" : "Collection Plan Automatic Calculations"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono tabular-nums">
            <div>
              <span className="text-[10px] text-slate-400 block">Planned</span>
              <span className="font-bold text-white">{formatCurrency(metrics.plannedCashCollection, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Actual</span>
              <span className="font-bold text-cyan-400">{formatCurrency(metrics.actualCashCollection, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Difference</span>
              <span className={metrics.collectionDifference >= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                {metrics.collectionDifference >= 0 ? "+" : ""}{formatCurrency(metrics.collectionDifference, cur)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Achievement</span>
              <span className="font-bold text-emerald-400">{metrics.collectionAchievementPct.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Outstanding</span>
              <span className="font-bold text-amber-400">{formatCurrency(metrics.outstandingCollectionTarget, cur)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            {isAmharic ? "የክፍያ በጀት vs አፈጻጸም ስሌት" : "Payment Plan Automatic Calculations"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono tabular-nums">
            <div>
              <span className="text-[10px] text-slate-400 block">Planned</span>
              <span className="font-bold text-white">{formatCurrency(metrics.plannedCashPayment, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Actual Paid</span>
              <span className="font-bold text-amber-400">{formatCurrency(metrics.actualCashPayment, cur)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Difference</span>
              <span className={metrics.paymentDifference <= 0 ? "font-bold text-emerald-400" : "font-bold text-red-400"}>
                {metrics.paymentDifference > 0 ? "+" : ""}{formatCurrency(metrics.paymentDifference, cur)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Achievement</span>
              <span className="font-bold text-amber-300">{metrics.paymentAchievementPct.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Remaining</span>
              <span className="font-bold text-slate-300">{formatCurrency(metrics.outstandingPlannedPayments, cur)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Type Switcher */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab("collection-plans")}
          className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
            subTab === "collection-plans"
              ? "bg-cyan-600 text-white border-cyan-500"
              : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
          }`}
        >
          {isAmharic
            ? `ወርሃዊ የመሰብሰብ እቅዶች (${state.scopedCollectionPlans.length})`
            : `Monthly Collection Plans (${state.scopedCollectionPlans.length})`}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("payment-plans")}
          className={`px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer whitespace-nowrap ${
            subTab === "payment-plans"
              ? "bg-amber-600 text-white border-amber-500"
              : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
          }`}
        >
          {isAmharic
            ? `ወርሃዊ የክፍያ እቅዶች (${state.scopedPaymentPlans.length})`
            : `Monthly Payment Plans (${state.scopedPaymentPlans.length})`}
        </button>
      </div>

      {/* Collection Plans Table */}
      {subTab === "collection-plans" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3 px-4">Plan # / Month</th>
                  <th className="py-3 px-4">Scope / Project</th>
                  <th className="py-3 px-4">Customer / Contract</th>
                  <th className="py-3 px-4">Expected Date / Owner</th>
                  <th className="py-3 px-4 text-right">Planned ({cur})</th>
                  <th className="py-3 px-4 text-right">Actual ({cur})</th>
                  <th className="py-3 px-4">Status</th>
                  {permissions.canManageCollectionPaymentPlans && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {state.scopedCollectionPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <p className="font-bold text-slate-300">
                        {isAmharic ? "ለዚህ ወቅት ወርሃዊ የመሰብሰብ እቅድ የለም" : "No Monthly Collection Plans Defined Yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  state.scopedCollectionPlans.map((cp) => {
                    const matchedActual = confirmedCollections
                      .filter(
                        (t) =>
                          t.date.startsWith(cp.month) &&
                          (cp.project === "All Projects" || t.project === cp.project) &&
                          (cp.customer === "All Customers" || t.counterparty === cp.customer)
                      )
                      .reduce((s, t) => s + t.amount, 0);
                    return (
                      <tr key={cp.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-white block">{cp.planNumber}</span>
                          <span className="text-[10px] text-slate-400">FY {cp.financialYear} | {cp.month}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-cyan-300 block">{cp.targetScope}: {cp.project}</span>
                          <span className="text-[10px] text-slate-400">{cp.department}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="block">{cp.customer}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cp.contractNumber || "—"} / {cp.invoiceNumber || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] block">{cp.expectedDate}</span>
                          <span className="text-[10px] text-slate-400">{cp.responsiblePerson}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-white">
                          {formatCurrency(cp.plannedAmount, cur)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-cyan-400">
                          {formatCurrency(matchedActual, cur)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              cp.approvalStatus === "Approved"
                                ? "bg-emerald-950/70 text-emerald-400 border-emerald-800"
                                : cp.approvalStatus === "Rejected"
                                ? "bg-red-950/70 text-red-400 border-red-800"
                                : "bg-amber-950/70 text-amber-300 border-amber-800"
                            }`}
                          >
                            {cp.approvalStatus}
                          </span>
                        </td>
                        {permissions.canManageCollectionPaymentPlans && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {cp.approvalStatus !== "Approved" && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlanStatus("collection", cp, "Approved")}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => DbService.deleteCollectionPlan(cp.id)}
                                className="p-1.5 rounded bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
      )}

      {/* Payment Plans Table */}
      {subTab === "payment-plans" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3 px-4">Plan # / Month</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Supplier / Payee</th>
                  <th className="py-3 px-4">Project / Dept</th>
                  <th className="py-3 px-4">Expected Date / Owner</th>
                  <th className="py-3 px-4 text-right">Budget ({cur})</th>
                  <th className="py-3 px-4 text-right">Paid ({cur})</th>
                  <th className="py-3 px-4">Status</th>
                  {permissions.canManageCollectionPaymentPlans && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {state.scopedPaymentPlans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <p className="font-bold text-slate-300">
                        {isAmharic ? "ለዚህ ወቅት ወርሃዊ የክፍያ እቅድ የለም" : "No Monthly Payment Plans Defined Yet"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  state.scopedPaymentPlans.map((pp) => {
                    const matchedPaid = confirmedPayments
                      .filter(
                        (t) =>
                          t.date.startsWith(pp.month) &&
                          (pp.project === "All Projects" || t.project === pp.project) &&
                          t.counterparty === pp.supplierOrPayee
                      )
                      .reduce((s, t) => s + t.amount, 0);
                    return (
                      <tr key={pp.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-white block">{pp.planNumber}</span>
                          <span className="text-[10px] text-slate-400">FY {pp.financialYear} | {pp.month}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-amber-300">{pp.expenseCategory}</td>
                        <td className="py-3 px-4">
                          <span className="block font-medium">{pp.supplierOrPayee}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{pp.invoiceNumber || "—"}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="block">{pp.project}</span>
                          <span className="text-[10px] text-slate-400">{pp.department}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] block">{pp.expectedDate}</span>
                          <span className="text-[10px] text-slate-400">{pp.responsiblePerson}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-white">
                          {formatCurrency(pp.plannedAmount, cur)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-amber-400">
                          {formatCurrency(matchedPaid, cur)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              pp.approvalStatus === "Approved"
                                ? "bg-emerald-950/70 text-emerald-400 border-emerald-800"
                                : pp.approvalStatus === "Rejected"
                                ? "bg-red-950/70 text-red-400 border-red-800"
                                : "bg-amber-950/70 text-amber-300 border-amber-800"
                            }`}
                          >
                            {pp.approvalStatus}
                          </span>
                        </td>
                        {permissions.canManageCollectionPaymentPlans && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {pp.approvalStatus !== "Approved" && (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePlanStatus("payment", pp, "Approved")}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => DbService.deletePaymentPlan(pp.id)}
                                className="p-1.5 rounded bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
      )}

      {/* Create Collection Plan Modal */}
      {showColPlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-white">
                {isAmharic ? "ወርሃዊ የገንዘብ መሰብሰብ እቅድ ፍጠር" : "Create Monthly Cash Collection Plan"}
              </h4>
              <button type="button" onClick={() => setShowColPlanModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            {errMsg && <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-red-300 font-bold">{errMsg}</div>}
            <form onSubmit={handleSaveCollectionPlan} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Financial Year *</label>
                  <input type="text" required value={colPlanForm.financialYear} onChange={(e) => setColPlanForm({ ...colPlanForm, financialYear: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Month *</label>
                  <input type="month" required value={colPlanForm.month} onChange={(e) => setColPlanForm({ ...colPlanForm, month: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Scope *</label>
                  <select value={colPlanForm.targetScope} onChange={(e) => setColPlanForm({ ...colPlanForm, targetScope: e.target.value as CollectionPlanScope })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    <option value="Company">Entire Company</option>
                    <option value="Project">Individual Project</option>
                    <option value="Customer">Individual Customer</option>
                    <option value="Department">Department</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project</label>
                  <input type="text" list="finance-plan-projects" value={colPlanForm.project} onChange={(e) => setColPlanForm({ ...colPlanForm, project: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Customer</label>
                  <input type="text" value={colPlanForm.customer} onChange={(e) => setColPlanForm({ ...colPlanForm, customer: e.target.value })} placeholder="Customer / Client Name" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                  <input type="text" value={colPlanForm.department} onChange={(e) => setColPlanForm({ ...colPlanForm, department: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contract Number</label>
                  <input type="text" value={colPlanForm.contractNumber} onChange={(e) => setColPlanForm({ ...colPlanForm, contractNumber: e.target.value })} placeholder="CTR-..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Invoice Number</label>
                  <input type="text" value={colPlanForm.invoiceNumber} onChange={(e) => setColPlanForm({ ...colPlanForm, invoiceNumber: e.target.value })} placeholder="INV-..." className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Planned Amount ({cur}) *</label>
                  <input type="number" min="1" step="0.01" required value={colPlanForm.plannedAmount} onChange={(e) => setColPlanForm({ ...colPlanForm, plannedAmount: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Expected Collection Date *</label>
                  <input type="date" required value={colPlanForm.expectedDate} onChange={(e) => setColPlanForm({ ...colPlanForm, expectedDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Responsible Person *</label>
                  <input type="text" required value={colPlanForm.responsiblePerson} onChange={(e) => setColPlanForm({ ...colPlanForm, responsiblePerson: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Approval Status</label>
                  <select value={colPlanForm.approvalStatus} onChange={(e) => setColPlanForm({ ...colPlanForm, approvalStatus: e.target.value as CashPlanApprovalStatus })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    <option value="Approved">Approved</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notes</label>
                <input type="text" value={colPlanForm.notes} onChange={(e) => setColPlanForm({ ...colPlanForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowColPlanModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={busyId === "save-col-plan"} className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer disabled:opacity-50">
                  Save Collection Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payment Plan Modal */}
      {showPayPlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-extrabold text-white">
                {isAmharic ? "ወርሃዊ የገንዘብ ክፍያ እቅድ ፍጠር" : "Create Monthly Cash Payment Plan"}
              </h4>
              <button type="button" onClick={() => setShowPayPlanModal(false)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            {errMsg && <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-red-300 font-bold">{errMsg}</div>}
            <form onSubmit={handleSavePaymentPlan} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Financial Year *</label>
                  <input type="text" required value={payPlanForm.financialYear} onChange={(e) => setPayPlanForm({ ...payPlanForm, financialYear: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Month *</label>
                  <input type="month" required value={payPlanForm.month} onChange={(e) => setPayPlanForm({ ...payPlanForm, month: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Expense Category *</label>
                  <select value={payPlanForm.expenseCategory} onChange={(e) => setPayPlanForm({ ...payPlanForm, expenseCategory: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    {PAYMENT_PLANNING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Supplier or Payee *</label>
                  <input type="text" required value={payPlanForm.supplierOrPayee} onChange={(e) => setPayPlanForm({ ...payPlanForm, supplierOrPayee: e.target.value })} placeholder="Supplier / Staff / Authority" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project *</label>
                  <input type="text" list="finance-plan-projects" required value={payPlanForm.project} onChange={(e) => setPayPlanForm({ ...payPlanForm, project: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Department</label>
                  <input type="text" value={payPlanForm.department} onChange={(e) => setPayPlanForm({ ...payPlanForm, department: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Invoice Number</label>
                  <input type="text" value={payPlanForm.invoiceNumber} onChange={(e) => setPayPlanForm({ ...payPlanForm, invoiceNumber: e.target.value })} placeholder="Bill / Inv #" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Planned Payment ({cur}) *</label>
                  <input type="number" min="1" step="0.01" required value={payPlanForm.plannedAmount} onChange={(e) => setPayPlanForm({ ...payPlanForm, plannedAmount: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Expected Payment Date *</label>
                  <input type="date" required value={payPlanForm.expectedDate} onChange={(e) => setPayPlanForm({ ...payPlanForm, expectedDate: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Responsible Person *</label>
                  <input type="text" required value={payPlanForm.responsiblePerson} onChange={(e) => setPayPlanForm({ ...payPlanForm, responsiblePerson: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Approval Status</label>
                  <select value={payPlanForm.approvalStatus} onChange={(e) => setPayPlanForm({ ...payPlanForm, approvalStatus: e.target.value as CashPlanApprovalStatus })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                    <option value="Approved">Approved</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notes</label>
                <input type="text" value={payPlanForm.notes} onChange={(e) => setPayPlanForm({ ...payPlanForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPayPlanModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={busyId === "save-pay-plan"} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer disabled:opacity-50">
                  Save Payment Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <datalist id="finance-plan-projects">
        <option value="All Projects" />
        {state.filterOptions.projects.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </div>
  );
};
