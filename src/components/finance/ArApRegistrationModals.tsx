import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  History,
  Paperclip,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import {
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  SupportingDocMeta,
} from "../../types";
import {
  advancePayableWorkflow,
  advanceReceivableWorkflow,
  COLLECTION_PAYMENT_METHODS,
  NormalizedExpense,
  NormalizedInvoice,
  PAYABLE_CATEGORIES,
  PAYMENT_TERMS_OPTIONS,
  RECEIVABLE_CATEGORIES,
  recordCashCollection,
  recordCashPayment,
  registerPayable,
  registerReceivable,
  togglePayableDispute,
  toggleReceivableDispute,
  UserFinancePermissions,
} from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

const readSupportingFiles = async (
  files: FileList | null,
  actorName: string
): Promise<SupportingDocMeta[]> => {
  if (!files || files.length === 0) return [];
  const results: SupportingDocMeta[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    let dataUrl: string | undefined;
    if (f.size <= 150 * 1024) {
      dataUrl = await new Promise<string | undefined>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(f);
      });
    }
    results.push({
      id: `DOC-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      name: f.name,
      fileType: f.type || "application/octet-stream",
      sizeBytes: f.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: actorName,
      dataUrl,
    });
  }
  return results;
};

/* ============================================================================
 * 1. REGISTER RECEIVABLE (AR) / PAYABLE (AP) MODAL
 * ============================================================================ */
interface RegisterArApModalProps {
  domain: "AR" | "AP";
  isAmharic: boolean;
  currency: string;
  projects: string[];
  clients: string[];
  suppliers: string[];
  rawInvoices: FinancialInvoiceRecord[];
  rawExpenses: Expense[];
  actorName: string;
  actorRole: string;
  actorUid: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RegisterArApModal: React.FC<RegisterArApModalProps> = ({
  domain,
  isAmharic,
  currency,
  projects,
  clients,
  suppliers,
  rawInvoices,
  rawExpenses,
  actorName,
  actorRole,
  actorUid,
  onClose,
  onSuccess,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [project, setProject] = useState(projects[0] || "");
  const [counterparty, setCounterparty] = useState("");
  const [category, setCategory] = useState(
    domain === "AR" ? RECEIVABLE_CATEGORIES[0] : PAYABLE_CATEGORIES[0]
  );
  const [poNumber, setPoNumber] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [subtotalAmount, setSubtotalAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [responsibleOfficer, setResponsibleOfficer] = useState(actorName);
  const [description, setDescription] = useState("");
  const [docs, setDocs] = useState<SupportingDocMeta[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subVal = Number(subtotalAmount || 0);
  const taxVal = Number(taxAmount || 0);
  const totalVal = (Number.isFinite(subVal) ? subVal : 0) + (Number.isFinite(taxVal) ? taxVal : 0);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = await readSupportingFiles(e.target.files, actorName);
    setDocs((prev) => [...prev, ...added]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      if (domain === "AR") {
        const rec = await registerReceivable({
          project,
          client: counterparty,
          contractNumber,
          invoiceNumber,
          invoiceDate,
          dueDate,
          subtotalAmount: subVal,
          taxAmount: taxVal,
          receivableCategory: category,
          paymentTerms,
          description,
          supportingDocuments: docs,
          responsibleOfficer,
          existingInvoices: rawInvoices,
          actorName,
          actorRole,
          actorUid,
        });
        onSuccess(
          isAmharic
            ? `ተሰብሳቢ ሂሳብ ${rec.receivableId} (${rec.invoiceNumber}) ተመዝግቧል።`
            : `Registered Receivable ${rec.receivableId} (${rec.invoiceNumber}) — Total ${formatCurrency(rec.amount, currency)}.`
        );
      } else {
        const exp = await registerPayable({
          project,
          vendor: counterparty,
          payableCategory: category,
          purchaseOrderNumber: poNumber,
          contractNumber,
          billNumber: invoiceNumber,
          invoiceDate,
          dueDate,
          subtotalAmount: subVal,
          taxAmount: taxVal,
          paymentTerms,
          description,
          supportingDocuments: docs,
          responsibleOfficer,
          existingExpenses: rawExpenses,
          actorName,
          actorRole,
          actorUid,
        });
        onSuccess(
          isAmharic
            ? `ተከፋይ ሂሳብ ${exp.payableId} (${exp.billNumber}) ተመዝግቧል።`
            : `Registered Payable ${exp.payableId} (${exp.billNumber}) — Total ${formatCurrency(exp.amount, currency)}.`
        );
      }
      onClose();
    } catch (error: any) {
      setErr(error?.message || "Registration failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 text-slate-100 my-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">
              {domain === "AR"
                ? isAmharic ? "አዲስ ተሰብሳቢ ሂሳብ መመዝገቢያ (AR)" : "Register Accounts Receivable (AR)"
                : isAmharic ? "አዲስ ተከፋይ ሂሳብ መመዝገቢያ (AP)" : "Register Accounts Payable (AP)"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {domain === "AR"
                ? "Auto-generates AR Reference ID, validates duplicate invoices & routes to workflow."
                : "Auto-generates AP Reference ID, enforces PO/Contract & duplicate bill validation."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {isAmharic ? "የፕሮጀክት ስም *" : "Project Name *"}
              </label>
              <input
                list="arap-project-list"
                required
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Bole Tower"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
              <datalist id="arap-project-list">
                {projects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {domain === "AR"
                  ? isAmharic ? "የደንበኛ ስም *" : "Client Name *"
                  : isAmharic ? "የአቅራቢ / ንዑስ ተቋራጭ ስም *" : "Supplier / Subcontractor Name *"}
              </label>
              <input
                list="arap-party-list"
                required
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder={domain === "AR" ? "Client company or owner" : "Supplier, subcontractor, consultant"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
              <datalist id="arap-party-list">
                {(domain === "AR" ? clients : suppliers).map((party) => (
                  <option key={party} value={party} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {domain === "AR" ? "Receivable Category *" : "Payable Category *"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              >
                {(domain === "AR" ? RECEIVABLE_CATEGORIES : PAYABLE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {isAmharic ? "የደረሰኝ ቁጥር *" : "Invoice / Bill Number *"}
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={domain === "AR" ? "e.g. INV-2026-0142" : "e.g. SUP-INV-882"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contract Number</label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="e.g. CNT-BOLE-09"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            {domain === "AP" ? (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Purchase Order Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="e.g. PO-2026-041"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {PAYMENT_TERMS_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {domain === "AP" && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Terms</label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {PAYMENT_TERMS_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Responsible Finance Officer</label>
              <input
                type="text"
                value={responsibleOfficer}
                onChange={(e) => setResponsibleOfficer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Invoice Date *</label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Amounts Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Invoice Amount ({currency}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={subtotalAmount}
                onChange={(e) => setSubtotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Tax / VAT ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {domain === "AR" ? "Total Invoice Amount" : "Total Payable Amount"}
              </span>
              <div className="w-full bg-slate-900/70 border border-slate-800 rounded-lg px-3 py-2 text-emerald-400 font-mono font-black tabular-nums">
                {formatCurrency(totalVal, currency)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Description / Scope Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contract IPC reference, milestone deliverables, or supply breakdown..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Supporting Documents Attachment */}
          <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-700 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 font-bold text-slate-300">
                <Upload size={14} className="text-amber-400" />
                <span>Supporting Documents (Contracts, IPCs, GRNs, Invoices)</span>
              </span>
              <input type="file" multiple onChange={handleFiles} className="hidden" />
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white">
                Attach Files
              </span>
            </label>
            {docs.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {docs.map((d) => (
                  <span key={d.id} className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex items-center gap-1.5">
                    <Paperclip size={11} className="text-cyan-400" />
                    <span className="truncate max-w-[180px]">{d.name}</span>
                    <button
                      type="button"
                      onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
                      className="text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer">
              {isAmharic ? "ሰርዝ" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving
                ? "..."
                : domain === "AR"
                ? isAmharic ? "ተሰብሳቢ መዝግብ" : "Register Receivable"
                : isAmharic ? "ተከፋይ መዝግብ" : "Register Payable"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. AR COLLECTION / AP PAYMENT SETTLEMENT MODAL (PART 3 FULL FIELDS)
 * ============================================================================ */
interface ArApSettlementModalProps {
  invoice: NormalizedInvoice | null;
  expense: NormalizedExpense | null;
  isAmharic: boolean;
  currency: string;
  rawAccounts: FinancialAccount[];
  scopedCashTransactions: any[];
  directorThreshold: number;
  permissions: UserFinancePermissions;
  actorName: string;
  actorRole: string;
  actorUid: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ArApSettlementModal: React.FC<ArApSettlementModalProps> = ({
  invoice,
  expense,
  isAmharic,
  currency,
  rawAccounts,
  scopedCashTransactions,
  directorThreshold,
  permissions,
  actorName,
  actorRole,
  actorUid,
  onClose,
  onSuccess,
}) => {
  const isCollection = Boolean(invoice);
  const activeAccounts = rawAccounts.filter((a) => a.status !== "Inactive");
  const openBalance = invoice ? invoice.outstandingAmount : expense ? expense.outstandingAmount : 0;
  const totalAmount = invoice ? invoice.amount : expense ? expense.amount : 0;
  const previouslySettled = invoice ? invoice.collectedAmount : expense ? expense.paidCashAmount : 0;

  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || "");
  const [amount, setAmount] = useState(String(openBalance));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [bankReferenceNumber, setBankReferenceNumber] = useState("");
  const [voucherOrReceiptNo, setVoucherOrReceiptNo] = useState("");
  const [notes, setNotes] = useState("");
  const [docs, setDocs] = useState<SupportingDocMeta[]>([]);
  const [isAuthorizedAdjustment, setIsAuthorizedAdjustment] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!invoice && !expense) return null;

  const numAmt = Number(amount || 0);
  const remainingAfter = Math.max(0, openBalance - (Number.isFinite(numAmt) ? numAmt : 0));
  const exceedsOpen = Number.isFinite(numAmt) && numAmt > openBalance + 0.01;
  const canAdjust = permissions.isFinanceManager || permissions.isDirector;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const added = await readSupportingFiles(e.target.files, actorName);
    setDocs((prev) => [...prev, ...added]);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const acc = rawAccounts.find((a) => a.id === accountId);
    if (!acc) {
      setErr(isAmharic ? "እባክዎ የጥሬ ገንዘብ / ባንክ ሂሳብ ይምረጡ" : "Select an active Cash or Bank account.");
      return;
    }
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      setErr(isAmharic ? "መጠን ከ0 በላይ መሆን አለበት" : "Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    try {
      if (invoice) {
        const resTx = await recordCashCollection({
          tx: {
            date,
            amount: numAmt,
            currency,
            accountId: acc.id,
            accountName: acc.accountName,
            project: invoice.project,
            department: invoice.normalizedDepartment,
            category: invoice.normalizedReceivableCategory,
            counterparty: invoice.normalizedClient,
            linkedDocumentType: "Invoice",
            linkedDocumentId: invoice.id,
            linkedReferenceNo: invoice.receivableId || invoice.invoiceNumber,
            invoiceNumber: invoice.invoiceNumber,
            contractNumber: invoice.contractNumber,
            paymentMethod,
            bankReferenceNumber: bankReferenceNumber.trim() || undefined,
            receiptNumber: voucherOrReceiptNo.trim() || undefined,
            supportingDocuments: docs,
            expectedAmount: openBalance,
            previouslyPaidAmount: previouslySettled,
            isAuthorizedAdjustment: exceedsOpen && isAuthorizedAdjustment,
            adjustmentReason: exceedsOpen && isAuthorizedAdjustment ? adjustmentReason : undefined,
            status: permissions.canVerifyCollections ? "Verified & Confirmed" : "Pending Verification",
            notes: notes.trim() || `AR Collection for ${invoice.invoiceNumber}`,
            createdBy: actorName,
            createdById: actorUid,
          },
          targetAccount: acc,
          linkedInvoice: invoice as FinancialInvoiceRecord,
          existingTransactions: scopedCashTransactions,
          actorName,
          actorRole,
          actorUid,
        });
        onSuccess(
          resTx.status === "Pending Verification"
            ? `Collection ${resTx.referenceNo} submitted for Finance Manager verification.`
            : `Collection ${resTx.receiptNumber || resTx.referenceNo} verified & confirmed.`
        );
      } else if (expense) {
        const resTx = await recordCashPayment({
          tx: {
            date,
            amount: numAmt,
            currency,
            accountId: acc.id,
            accountName: acc.accountName,
            project: expense.project,
            department: expense.normalizedDepartment,
            category: expense.normalizedPayableCategory,
            counterparty: expense.normalizedSupplier,
            linkedDocumentType: "Expense",
            linkedDocumentId: expense.id,
            linkedReferenceNo: expense.payableId || expense.referenceNo || expense.id,
            invoiceNumber: expense.billNumber || expense.referenceNo,
            contractNumber: expense.contractNumber,
            paymentMethod,
            bankReferenceNumber: bankReferenceNumber.trim() || undefined,
            paymentVoucherNumber: voucherOrReceiptNo.trim() || undefined,
            supportingDocuments: docs,
            expectedAmount: openBalance,
            previouslyPaidAmount: previouslySettled,
            isAuthorizedAdjustment: exceedsOpen && isAuthorizedAdjustment,
            adjustmentReason: exceedsOpen && isAuthorizedAdjustment ? adjustmentReason : undefined,
            status:
              permissions.canApproveStandardPayments || permissions.canApproveHighValuePayments
                ? "Confirmed & Paid"
                : "Pending Approval",
            notes: notes.trim() || `AP Payment for ${expense.billNumber || expense.referenceNo || expense.id}`,
            createdBy: actorName,
            createdById: actorUid,
          },
          sourceAccount: acc,
          linkedExpense: expense as Expense,
          existingTransactions: scopedCashTransactions,
          directorApprovalThresholdEtb: directorThreshold,
          actorName,
          actorRole,
          actorUid,
        });
        onSuccess(
          resTx.status === "Confirmed & Paid" || resTx.status === "Posted"
            ? `Payment ${resTx.paymentVoucherNumber || resTx.referenceNo} approved & disbursed.`
            : `Payment ${resTx.referenceNo} routed to ${resTx.status}.`
        );
      }
      onClose();
    } catch (error: any) {
      setErr(error?.message || "Settlement failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 text-slate-100 my-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isCollection
                ? `Register AR Collection — ${invoice?.receivableId || invoice?.invoiceNumber}`
                : `Register AP Payment — ${expense?.payableId || expense?.billNumber || expense?.id}`}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isCollection
                ? `${invoice?.normalizedClient} · ${invoice?.project}`
                : `${expense?.normalizedSupplier} · ${expense?.project}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Balance Context Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">{isCollection ? "Total Invoice" : "Total Payable"}</span>
            <span className="font-mono font-bold text-white tabular-nums">{formatCurrency(totalAmount, currency)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">{isCollection ? "Previously Collected" : "Previously Paid"}</span>
            <span className="font-mono font-bold text-emerald-400 tabular-nums">{formatCurrency(previouslySettled, currency)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">{isCollection ? "Expected Open" : "Open Payable"}</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">{formatCurrency(openBalance, currency)}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Remaining After</span>
            <span className="font-mono font-bold text-cyan-400 tabular-nums">{formatCurrency(remainingAfter, currency)}</span>
          </div>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">
            {err}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank / Cash Account *</label>
              <select
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Select Account...</option>
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({formatCurrency(acc.currentBalance, currency)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {isCollection ? `Actual Collected Amount (${currency}) *` : `Current Payment Amount (${currency}) *`}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {isCollection ? "Collection Date *" : "Payment Date *"}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              >
                {COLLECTION_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Transaction Reference</label>
              <input
                type="text"
                value={bankReferenceNumber}
                onChange={(e) => setBankReferenceNumber(e.target.value)}
                placeholder="Bank FT / TT reference #"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                {isCollection ? "Receipt Number" : "Payment Voucher Number"}
              </label>
              <input
                type="text"
                value={voucherOrReceiptNo}
                onChange={(e) => setVoucherOrReceiptNo(e.target.value)}
                placeholder={isCollection ? "Auto-generated if blank" : "Auto-generated PV if blank"}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {exceedsOpen && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle size={14} />
                <span>Amount exceeds open balance ({formatCurrency(openBalance, currency)}).</span>
              </div>
              {canAdjust ? (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      checked={isAuthorizedAdjustment}
                      onChange={(e) => setIsAuthorizedAdjustment(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>Authorize settlement adjustment (Finance Manager / Director override)</span>
                  </label>
                  {isAuthorizedAdjustment && (
                    <input
                      type="text"
                      required
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Mandatory justification for authorized adjustment..."
                      className="w-full bg-slate-950 border border-amber-700 rounded-lg px-3 py-1.5 text-white"
                    />
                  )}
                </>
              ) : (
                <p className="text-[11px] text-amber-200">Only Finance Manager or Director may authorize over-balance adjustments.</p>
              )}
            </div>
          )}

          {!isCollection && Number.isFinite(numAmt) && numAmt > directorThreshold && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-orange-800/80 text-orange-300 text-[11px] font-semibold">
              High-Value Payment Alert: Exceeds {formatCurrency(directorThreshold, currency)} Director approval limit.
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional settlement remarks"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-between">
            <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <Paperclip size={13} className="text-cyan-400" />
              <span>{docs.length > 0 ? `${docs.length} document(s) attached` : "Attach Receipt / Voucher Scan (Optional)"}</span>
            </span>
            <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-white cursor-pointer">
              Upload
              <input type="file" multiple onChange={handleFiles} className="hidden" />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {saving ? "..." : isCollection ? "Post Collection" : "Post Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. AR / AP DETAIL, MULTI-STAGE WORKFLOW, DISPUTE & AUDIT HISTORY MODAL
 * ============================================================================ */
interface ArApDetailWorkflowModalProps {
  invoice: NormalizedInvoice | null;
  expense: NormalizedExpense | null;
  isAmharic: boolean;
  currency: string;
  permissions: UserFinancePermissions;
  actorName: string;
  actorRole: string;
  actorUid: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ArApDetailWorkflowModal: React.FC<ArApDetailWorkflowModalProps> = ({
  invoice,
  expense,
  currency,
  permissions,
  actorName,
  actorRole,
  actorUid,
  onClose,
  onSuccess,
}) => {
  const [disputeReason, setDisputeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!invoice && !expense) return null;
  const isAr = Boolean(invoice);
  const stages = isAr
    ? ["Registered", "Finance Review", "Verified", "Completed"]
    : ["Registered", "Finance Review", "Supporting Docs Verified", "Approved", "Paid"];

  const currentStage = invoice ? invoice.effectiveWorkflowStage : expense!.effectiveWorkflowStage;
  const currentIdx = Math.max(0, stages.indexOf(currentStage));
  const isDisputed = Boolean(invoice ? invoice.isDisputed : expense?.isDisputed);
  const docs = (invoice ? invoice.supportingDocuments : expense?.supportingDocuments) || [];
  const auditHistory = (invoice ? invoice.auditHistory : expense?.auditHistory) || [];

  const handleAdvance = async (stage: any) => {
    setErr(null);
    setBusy(true);
    try {
      if (invoice) {
        await advanceReceivableWorkflow({
          invoice: invoice as FinancialInvoiceRecord,
          targetStage: stage,
          actorName,
          actorRole,
          actorUid,
        });
      } else if (expense) {
        await advancePayableWorkflow({
          expense: expense as Expense,
          targetStage: stage,
          actorName,
          actorRole,
          actorUid,
        });
      }
      onSuccess(`Moved to stage: ${stage}`);
      onClose();
    } catch (error: any) {
      setErr(error?.message || "Failed to update workflow stage.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleDispute = async (flag: boolean) => {
    setErr(null);
    setBusy(true);
    try {
      if (invoice) {
        await toggleReceivableDispute({
          invoice: invoice as FinancialInvoiceRecord,
          disputed: flag,
          reason: disputeReason.trim() || undefined,
          actorName,
          actorRole,
          actorUid,
        });
      } else if (expense) {
        await togglePayableDispute({
          expense: expense as Expense,
          disputed: flag,
          reason: disputeReason.trim() || undefined,
          actorName,
          actorRole,
          actorUid,
        });
      }
      onSuccess(flag ? "Marked as Disputed." : "Dispute cleared.");
      onClose();
    } catch (error: any) {
      setErr(error?.message || "Failed to update dispute status.");
    } finally {
      setBusy(false);
    }
  };

  const canAdvance = permissions.canManageTransactions || permissions.canVerifyCollections || permissions.canApproveTransactions || permissions.isDirector;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 text-slate-100 my-6">
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-amber-400" />
              <h3 className="text-base font-extrabold text-white">
                {invoice
                  ? `${invoice.receivableId || invoice.id} · ${invoice.invoiceNumber}`
                  : `${expense?.payableId || expense?.id} · ${expense?.billNumber || expense?.referenceNo}`}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {invoice
                ? `${invoice.normalizedClient} · ${invoice.project} · ${invoice.normalizedReceivableCategory}`
                : `${expense?.normalizedSupplier} · ${expense?.project} · ${expense?.normalizedPayableCategory}`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 font-bold">
            {err}
          </div>
        )}

        {/* Summary Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block">Total Amount</span>
            <span className="font-mono font-bold text-white tabular-nums">
              {formatCurrency(invoice ? invoice.amount : expense!.amount, currency)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block">{isAr ? "Collected" : "Paid"}</span>
            <span className="font-mono font-bold text-emerald-400 tabular-nums">
              {formatCurrency(invoice ? invoice.collectedAmount : expense!.paidCashAmount, currency)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block">Outstanding</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              {formatCurrency(invoice ? invoice.outstandingAmount : expense!.outstandingAmount, currency)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 block">Lifecycle Status</span>
            <span className="font-bold text-cyan-300">
              {invoice ? invoice.arLifecycleStatus : expense!.apLifecycleStatus}
            </span>
          </div>
        </div>

        {/* Multi-Stage Approval Stepper */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isAr ? "AR Approval Workflow (4 Stages)" : "AP Approval Workflow (5 Stages)"}
            </span>
            <span className="text-[11px] font-mono text-amber-400 font-bold">{currentStage}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {stages.map((st, idx) => {
              const reached = idx <= currentIdx;
              return (
                <div
                  key={st}
                  className={`p-2 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${
                    reached
                      ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  }`}
                >
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span className="truncate">{st}</span>
                </div>
              );
            })}
          </div>

          {canAdvance && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              {isAr ? (
                <>
                  {currentIdx < 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAdvance("Finance Review")}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Move to Finance Review
                    </button>
                  )}
                  {currentIdx < 2 && permissions.canVerifyCollections && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAdvance("Verified")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Verify Receivable
                    </button>
                  )}
                </>
              ) : (
                <>
                  {currentIdx < 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAdvance("Finance Review")}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Move to Finance Review
                    </button>
                  )}
                  {currentIdx < 2 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAdvance("Supporting Docs Verified")}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Verify Supporting Docs
                    </button>
                  )}
                  {currentIdx < 3 && permissions.canApproveTransactions && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAdvance("Approved")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Approve Payable
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Dispute Control */}
        {canAdvance && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldAlert size={14} className={isDisputed ? "text-red-400" : "text-slate-400"} />
                <span>{isDisputed ? "Dispute Active" : "Dispute Control"}</span>
              </span>
              {isDisputed && (
                <span className="text-[11px] text-red-300">
                  {invoice ? invoice.disputeReason : expense?.disputeReason}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={isDisputed ? "Resolution notes..." : "Reason for flagging as disputed..."}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
              />
              {isDisputed ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleDispute(false)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold cursor-pointer whitespace-nowrap"
                >
                  Resolve Dispute
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleDispute(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold cursor-pointer whitespace-nowrap"
                >
                  Flag Disputed
                </button>
              )}
            </div>
          </div>
        )}

        {/* Supporting Documents */}
        <div className="space-y-2 text-xs">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Supporting Documents ({docs.length})
          </h4>
          {docs.length === 0 ? (
            <p className="text-slate-500 text-[11px]">No supporting documents attached.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {docs.map((d) => (
                <div key={d.id} className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <Paperclip size={12} className="text-cyan-400" />
                  <span className="text-slate-200">{d.name}</span>
                  {d.dataUrl && (
                    <a href={d.dataUrl} download={d.name} className="text-amber-400 hover:underline font-bold">
                      Download
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Immutable Audit History */}
        <div className="space-y-2 text-xs">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History size={13} />
            <span>Audit History ({auditHistory.length})</span>
          </h4>
          {auditHistory.length === 0 ? (
            <p className="text-slate-500 text-[11px]">No workflow audit trail entries recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {auditHistory.map((entry, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <span className="font-bold text-white">{entry.action}</span>
                    {entry.stage && <span className="text-amber-400 ml-2 font-mono text-[10px]">[{entry.stage}]</span>}
                    {entry.notes && <p className="text-[11px] text-slate-400 mt-0.5">{entry.notes}</p>}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 sm:text-right shrink-0">
                    <div>{entry.actorName} ({entry.actorRole})</div>
                    <div>{entry.timestamp.slice(0, 16).replace("T", " ")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
