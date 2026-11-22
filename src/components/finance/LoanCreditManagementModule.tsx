import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  Landmark,
  Plus,
  ShieldAlert,
  TrendingUp,
  X,
} from "lucide-react";
import {
  CounterpartyCreditProfile,
  Expense,
  FinancialAccount,
  FinancialInvoiceRecord,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  LoanFacilityRecord,
  LoanFacilityType,
  LoanInterestMethod,
  LoanRepaymentRecord,
  LoanRepaymentScheduleRow,
  UserRole,
} from "../../types";
import {
  approveAndDisburseLoanMutation,
  computeLoanAndCreditState,
  createLoanFacilityMutation,
  generateLoanAmortizationSchedule,
  recordLoanRepaymentMutation,
} from "../../services/loanCreditService";
import { DbService } from "../../services/db";
import { exportRowsToCsv, resolveUserFinancePermissions } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

interface LoanCreditManagementModuleProps {
  isAmharic: boolean;
  loans: LoanFacilityRecord[];
  repayments: LoanRepaymentRecord[];
  creditProfiles: CounterpartyCreditProfile[];
  invoices: FinancialInvoiceRecord[];
  expenses: Expense[];
  accounts: FinancialAccount[];
  periods: FinancialPeriodCloseRecord[];
  financialYears: FinancialYearRecord[];
  projectsList: Array<{ id?: string; name?: string }>;
  currency: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

export const LoanCreditManagementModule: React.FC<LoanCreditManagementModuleProps> = ({
  isAmharic,
  loans,
  repayments,
  creditProfiles,
  invoices,
  expenses,
  accounts,
  periods,
  financialYears,
  projectsList,
  currency,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const perms = useMemo(() => resolveUserFinancePermissions(actorRole), [actorRole]);
  const [subTab, setSubTab] = useState<"loans" | "client-credit" | "supplier-credit" | "repayments">("loans");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [scheduleLoan, setScheduleLoan] = useState<LoanFacilityRecord | null>(null);
  const [approveLoanTarget, setApproveLoanTarget] = useState<LoanFacilityRecord | null>(null);
  const [repayLoanTarget, setRepayLoanTarget] = useState<LoanFacilityRecord | null>(null);

  const [loanForm, setLoanForm] = useState({
    facilityNo: `LN-${String(Date.now()).slice(-5)}`,
    lenderName: "Commercial Bank of Ethiopia",
    facilityType: "Project Term Loan" as LoanFacilityType,
    project: projectsList[0]?.name || "Corporate Treasury",
    department: "Finance",
    principalAmount: "",
    annualInterestRatePct: "14.5",
    termMonths: "24",
    interestMethod: "Reducing Balance" as LoanInterestMethod,
    disbursementDate: new Date().toISOString().slice(0, 10),
    depositAccountId: accounts[0]?.id || "",
    notes: "",
  });

  const [repayForm, setRepayForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    principalPaid: "0",
    interestPaid: "0",
    penaltyPaid: "0",
    accountId: accounts[0]?.id || "",
    referenceNo: "",
  });

  const [creditForm, setCreditForm] = useState({
    counterpartyType: "Client" as "Client" | "Supplier",
    counterpartyName: "",
    creditLimit: "",
    creditTermsDays: "30",
    paymentTermLabel: "Net 30",
    riskRating: "Low Risk" as "Low Risk" | "Moderate Risk" | "Elevated Risk" | "High Risk",
    notes: "",
  });

  const loanState = useMemo(
    () =>
      computeLoanAndCreditState({
        loans,
        repayments,
        creditProfiles,
        invoices,
        expenses,
      }),
    [loans, repayments, creditProfiles, invoices, expenses]
  );

  const scheduleRows: LoanRepaymentScheduleRow[] = useMemo(
    () => (scheduleLoan ? generateLoanAmortizationSchedule(scheduleLoan) : []),
    [scheduleLoan]
  );

  const notify = (type: "ok" | "err", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await createLoanFacilityMutation({
        facilityNo: loanForm.facilityNo,
        lenderName: loanForm.lenderName,
        facilityType: loanForm.facilityType,
        project: loanForm.project,
        department: loanForm.department,
        principalAmount: Number(loanForm.principalAmount),
        annualInterestRatePct: Number(loanForm.annualInterestRatePct),
        termMonths: Number(loanForm.termMonths),
        interestMethod: loanForm.interestMethod,
        disbursementDate: loanForm.disbursementDate,
        depositAccountId: loanForm.depositAccountId,
        notes: loanForm.notes,
        actorName,
        actorRole,
        actorUid,
      });
      setShowNewLoanModal(false);
      onLogAction?.("Create Loan Facility", `${created.facilityNo} (${formatCurrency(created.principalAmount, currency)})`);
      notify("ok", `Registered loan ${created.facilityNo}. Awaiting separate Maker-Checker approval for drawdown.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to register loan facility.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveDrawdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveLoanTarget) return;
    setBusy(true);
    try {
      const acc = accounts.find((a) => a.id === (approveLoanTarget.depositAccountId || accounts[0]?.id)) || accounts[0];
      if (!acc) throw new Error("No deposit bank/cash account configured.");
      const activated = await approveAndDisburseLoanMutation({
        loan: approveLoanTarget,
        depositAccount: acc,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      setApproveLoanTarget(null);
      onLogAction?.("Approve Loan Drawdown", `${activated.facilityNo} credited ${formatCurrency(activated.principalAmount, currency)}`);
      notify("ok", `Loan ${activated.facilityNo} approved, deposited into ${acc.accountName}, and posted to GL.`);
    } catch (err: any) {
      notify("err", err?.message || "Loan drawdown approval failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayLoanTarget) return;
    setBusy(true);
    try {
      const acc = accounts.find((a) => a.id === repayForm.accountId) || accounts[0];
      if (!acc) throw new Error("Select a valid payment bank account.");
      const res = await recordLoanRepaymentMutation({
        loan: repayLoanTarget,
        paymentDate: repayForm.paymentDate,
        principalPaid: Number(repayForm.principalPaid || 0),
        interestPaid: Number(repayForm.interestPaid || 0),
        penaltyPaid: Number(repayForm.penaltyPaid || 0),
        paymentAccount: acc,
        referenceNo: repayForm.referenceNo || `LREP-${repayLoanTarget.facilityNo}`,
        periods,
        financialYears,
        actorName,
        actorRole,
        actorUid,
      });
      setRepayLoanTarget(null);
      onLogAction?.(
        "Record Loan Repayment",
        `${res.loan.facilityNo}: Principal ${formatCurrency(res.repayment.principalPaid, currency)} + Interest ${formatCurrency(res.repayment.interestPaid, currency)}`
      );
      notify("ok", `Repayment posted to Bank & GL (${res.journal.journalNo}): Principal liability & Interest expense split.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to post loan repayment.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCreditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const prof: CounterpartyCreditProfile = {
        id: `CRP-${creditForm.counterpartyType.slice(0, 3).toUpperCase()}-${Date.now()}`,
        counterpartyType: creditForm.counterpartyType,
        counterpartyName: creditForm.counterpartyName.trim(),
        projectScope: "ALL",
        creditLimitEtb: Number(creditForm.creditLimit),
        paymentTermDays: Number(creditForm.creditTermsDays || 30),
        creditRating: creditForm.riskRating,
        isCreditHold: false,
        notes: creditForm.notes,
        updatedBy: actorName,
        updatedById: actorUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await DbService.saveCreditProfile(prof);
      setShowCreditModal(false);
      onLogAction?.("Save Credit Limit Profile", `${prof.counterpartyType} ${prof.counterpartyName}: Limit ${formatCurrency(prof.creditLimitEtb, currency)}`);
      notify("ok", `Saved ${prof.counterpartyType} credit profile for ${prof.counterpartyName}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to save credit profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" id="loan-credit-management-module">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
            <Landmark size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic ? "የብድር፣ ክሬዲት እና የፋይናንስ አስተዳደር" : "Loan, Credit & Financing Management"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "የባንክ ብድሮች፣ የፕሮጀክት ፋይናንሲንግ፣ የክፍያ መርሐ ግብር፣ ዋና እና ወለድ ልዩነት (GL)፣ የደንበኞች/አቅራቢዎች ክሬዲት ገደብ"
                : "Loans, Flat/Reducing amortization, strict GL separation of Principal vs Interest, and client/supplier credit exposure."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportRowsToCsv("loan_facilities_register", loanState.loans)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} className="text-emerald-400" />
            <span>CSV Loans</span>
          </button>

          {perms.canManageLoansAndCredit && (
            <>
              <button
                type="button"
                onClick={() => setShowCreditModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard size={14} />
                <span>Add Credit Limit</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewLoanModal(true)}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>New Loan Facility</span>
              </button>
            </>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-bold border flex items-center justify-between ${
            banner.type === "ok"
              ? "bg-emerald-950/70 border-emerald-800 text-emerald-200"
              : "bg-red-950/70 border-red-800 text-red-200"
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Outstanding Principal</span>
          <span className="text-lg font-black text-amber-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(loanState.kpis.totalOutstandingPrincipal, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{loanState.kpis.activeLoanCount} active facilities</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Approved Principal</span>
          <span className="text-lg font-black text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(loanState.kpis.totalFacilityPrincipal, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">COA 2110 / 2510</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Principal Repaid</span>
          <span className="text-lg font-black text-emerald-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(loanState.kpis.totalPrincipalRepaid, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Liability reduction</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Interest Expense Paid</span>
          <span className="text-lg font-black text-orange-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(loanState.kpis.totalInterestRepaid, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Financing Cost GL 6220</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Next 30d Debt Service</span>
          <span className="text-lg font-black text-cyan-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(loanState.kpis.next30DaysDebtService, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{loanState.kpis.overdueLoansCount} overdue</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Credit Limit Breaches</span>
          <span
            className={`text-lg font-black font-mono tabular-nums mt-1 block ${
              loanState.kpis.creditLimitBreachesCount > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {loanState.kpis.creditLimitBreachesCount}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Client & Supplier limits</span>
        </div>
      </div>

      {/* Subtabs */}
      <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        {[
          { id: "loans", label: `Loan Facilities (${loanState.loans.length})` },
          { id: "repayments", label: `Repayment History (${loanState.repayments.length})` },
          { id: "client-credit", label: `Client Credit Limits (${loanState.clientCreditSummaries.length})` },
          { id: "supplier-credit", label: `Supplier Credit Terms (${loanState.supplierCreditSummaries.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
              subTab === t.id
                ? "bg-red-600 text-white border-red-500"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Loan Facilities */}
      {subTab === "loans" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Facility</th>
                <th className="py-3 px-3">Lender & Type</th>
                <th className="py-3 px-3">Terms</th>
                <th className="py-3 px-3 text-right">Principal</th>
                <th className="py-3 px-3 text-right">Repaid (Princ / Int)</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {loanState.loans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No loan facilities registered yet.
                  </td>
                </tr>
              ) : (
                loanState.loans.map((ln) => (
                  <tr key={ln.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-cyan-400 block">{ln.facilityNo}</span>
                      <span className="text-[10px] text-slate-400">{ln.project}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{ln.lenderName}</span>
                      <span className="text-[10px] text-slate-400">{ln.facilityType}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px]">
                      {ln.annualInterestRatePct}% · {ln.termMonths}m ({ln.interestMethod})
                      <span className="block text-[10px] text-slate-500">Next Due: {ln.nextDueDate}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-white">
                      {formatCurrency(ln.principalAmount, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[11px]">
                      <span className="text-emerald-400 block">P: {formatCurrency(ln.totalPrincipalRepaid, currency)}</span>
                      <span className="text-orange-400">I: {formatCurrency(ln.totalInterestRepaid, currency)}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-400">
                      {formatCurrency(ln.outstandingPrincipal, currency)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          ln.status === "Settled"
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                            : ln.status === "Pending Approval"
                            ? "bg-amber-950/60 border-amber-800 text-amber-300"
                            : "bg-blue-950/60 border-blue-800 text-blue-300"
                        }`}
                      >
                        {ln.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScheduleLoan(ln)}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-200 cursor-pointer"
                        >
                          Schedule
                        </button>
                        {ln.status === "Pending Approval" && (perms.isDirector || perms.isFinanceManager) && (
                          <button
                            type="button"
                            onClick={() => setApproveLoanTarget(ln)}
                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            Approve Drawdown
                          </button>
                        )}
                        {(ln.status === "Active" || ln.status === "Partially Repaid" || ln.status === "Overdue") &&
                          (perms.isDirector || perms.isFinanceManager) && (
                            <button
                              type="button"
                              onClick={() => {
                                const sched = generateLoanAmortizationSchedule(ln);
                                const nextRow = sched.find((r) => r.installmentNo === 1) || sched[0];
                                setRepayForm({
                                  paymentDate: new Date().toISOString().slice(0, 10),
                                  principalPaid: String(Math.min(ln.outstandingPrincipal, nextRow?.principalDue || 0)),
                                  interestPaid: String(nextRow?.interestDue || 0),
                                  penaltyPaid: "0",
                                  accountId: accounts[0]?.id || "",
                                  referenceNo: `LREP-${ln.facilityNo}`,
                                });
                                setRepayLoanTarget(ln);
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Repay
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
      )}

      {/* Tab 2: Repayment History */}
      {subTab === "repayments" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Date / Ref</th>
                <th className="py-3 px-3">Facility</th>
                <th className="py-3 px-3 text-right">Principal Liability (DR)</th>
                <th className="py-3 px-3 text-right">Interest Expense (DR 6220)</th>
                <th className="py-3 px-3 text-right">Total Bank Paid (CR)</th>
                <th className="py-3 px-3 text-right">Remaining Principal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {loanState.repayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No loan repayments posted yet.
                  </td>
                </tr>
              ) : (
                loanState.repayments.map((rp) => (
                  <tr key={rp.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono">{rp.paymentDate} · {rp.referenceNo}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{rp.facilityNo}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">
                      {formatCurrency(rp.principalPaid, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-orange-400">
                      {formatCurrency(rp.interestPaid + (rp.penaltyPaid || 0), currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-white">
                      {formatCurrency(rp.totalPaid, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-400">
                      {formatCurrency(rp.remainingPrincipalAfter, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabs 3 & 4: Client Credit & Supplier Credit */}
      {(subTab === "client-credit" || subTab === "supplier-credit") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(subTab === "client-credit" ? loanState.clientCreditSummaries : loanState.supplierCreditSummaries).length === 0 ? (
            <div className="col-span-full bg-slate-950 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-500">
              No {subTab === "client-credit" ? "Client Credit Limits" : "Supplier Credit Terms"} configured yet. Click &ldquo;Add Credit Limit&rdquo;.
            </div>
          ) : (
            (subTab === "client-credit" ? loanState.clientCreditSummaries : loanState.supplierCreditSummaries).map((row) => (
              <div
                key={row.profile.id}
                className={`bg-slate-950 border rounded-2xl p-5 space-y-3 ${
                  row.utilizationPct >= 100 ? "border-red-800/80" : "border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-bold text-white block">{row.profile.counterpartyName}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Net {row.profile.paymentTermDays}d ({row.profile.creditRating})
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      row.computedRisk === "High Risk"
                        ? "bg-red-950/70 border-red-800 text-red-300"
                        : row.computedRisk === "Elevated Risk"
                        ? "bg-amber-950/70 border-amber-800 text-amber-300"
                        : "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                    }`}
                  >
                    {row.computedRisk}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Open Exposure</span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      {formatCurrency(row.openExposure, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Approved Credit Limit</span>
                    <span className="font-mono tabular-nums text-cyan-400">
                      {formatCurrency(row.profile.creditLimitEtb, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overdue Balance</span>
                    <span className={`font-mono tabular-nums ${row.overdueAmount > 0 ? "text-red-400 font-bold" : "text-slate-400"}`}>
                      {formatCurrency(row.overdueAmount, currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Utilization</span>
                    <span>{row.utilizationPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className={`h-full ${
                        row.utilizationPct >= 100
                          ? "bg-red-500"
                          : row.utilizationPct >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, row.utilizationPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Register Loan Facility */}
      {showNewLoanModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreateLoan} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Register Bank Loan / Financing Facility</h3>
              <button type="button" onClick={() => setShowNewLoanModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Facility Reference No</label>
                <input
                  required
                  type="text"
                  value={loanForm.facilityNo}
                  onChange={(e) => setLoanForm({ ...loanForm, facilityNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Lender / Financial Institution *</label>
                <input
                  required
                  type="text"
                  value={loanForm.lenderName}
                  onChange={(e) => setLoanForm({ ...loanForm, lenderName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Facility Type</label>
                <select
                  value={loanForm.facilityType}
                  onChange={(e) => setLoanForm({ ...loanForm, facilityType: e.target.value as LoanFacilityType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Bank Loan">Bank Loan</option>
                  <option value="Project Term Loan">Project Term Loan</option>
                  <option value="Working Capital Line">Working Capital Line</option>
                  <option value="Equipment Financing">Equipment Financing</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project Allocation</label>
                <select
                  value={loanForm.project}
                  onChange={(e) => setLoanForm({ ...loanForm, project: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Corporate Treasury">Corporate Treasury</option>
                  {projectsList.map((p) => p.name && (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Principal Amount ({currency}) *</label>
                <input
                  required
                  type="number"
                  min={1}
                  step="0.01"
                  value={loanForm.principalAmount}
                  onChange={(e) => setLoanForm({ ...loanForm, principalAmount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Annual Interest Rate (%)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={loanForm.annualInterestRatePct}
                  onChange={(e) => setLoanForm({ ...loanForm, annualInterestRatePct: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Term (Months)</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={360}
                  value={loanForm.termMonths}
                  onChange={(e) => setLoanForm({ ...loanForm, termMonths: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Interest Method</label>
                <select
                  value={loanForm.interestMethod}
                  onChange={(e) => setLoanForm({ ...loanForm, interestMethod: e.target.value as LoanInterestMethod })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Reducing Balance">Reducing Balance (EMI)</option>
                  <option value="Flat Rate">Flat Rate</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Disbursement Date</label>
                <input
                  required
                  type="date"
                  value={loanForm.disbursementDate}
                  onChange={(e) => setLoanForm({ ...loanForm, disbursementDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Deposit Treasury Account</label>
                <select
                  value={loanForm.depositAccountId}
                  onChange={(e) => setLoanForm({ ...loanForm, depositAccountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowNewLoanModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50">
                Save Loan Facility
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Approve Drawdown */}
      {approveLoanTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleApproveDrawdown} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <h3 className="text-sm font-extrabold text-white">Approve Loan Drawdown & Credit Treasury</h3>
            <p className="text-slate-300">
              Confirm activation of <strong>{approveLoanTarget.facilityNo}</strong> from {approveLoanTarget.lenderName} for{" "}
              <strong className="font-mono text-emerald-400">{formatCurrency(approveLoanTarget.principalAmount, currency)}</strong>.
              This posts DR Bank / CR Loan Liability ({approveLoanTarget.coaLiabilityCode}) to the GL.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setApproveLoanTarget(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer">
                {busy ? "Activating..." : "Approve Drawdown"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Record Repayment (Strict Principal vs Interest Split) */}
      {repayLoanTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleRecordRepayment} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Record Loan Repayment (GL Split)</h3>
                <p className="text-[11px] text-slate-400">
                  {repayLoanTarget.facilityNo} · Outstanding {formatCurrency(repayLoanTarget.outstandingPrincipal, currency)}
                </p>
              </div>
              <button type="button" onClick={() => setRepayLoanTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Date</label>
                <input
                  required
                  type="date"
                  value={repayForm.paymentDate}
                  onChange={(e) => setRepayForm({ ...repayForm, paymentDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Account</label>
                <select
                  value={repayForm.accountId}
                  onChange={(e) => setRepayForm({ ...repayForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Principal Paid ({repayLoanTarget.coaLiabilityCode})</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={repayForm.principalPaid}
                  onChange={(e) => setRepayForm({ ...repayForm, principalPaid: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Interest Expense (6220)</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={repayForm.interestPaid}
                  onChange={(e) => setRepayForm({ ...repayForm, interestPaid: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Debit Reference *</label>
                <input
                  required
                  type="text"
                  value={repayForm.referenceNo}
                  onChange={(e) => setRepayForm({ ...repayForm, referenceNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setRepayLoanTarget(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer">
                {busy ? "Posting..." : "Post Repayment to Bank & GL"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Save Credit Limit Profile */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCreditProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Configure Client / Supplier Credit Terms</h3>
              <button type="button" onClick={() => setShowCreditModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Counterparty Role</label>
                <select
                  value={creditForm.counterpartyType}
                  onChange={(e) => setCreditForm({ ...creditForm, counterpartyType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Client">Client (Receivables Limit)</option>
                  <option value="Supplier">Supplier (Vendor Credit Terms)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Counterparty Name *</label>
                <input
                  required
                  type="text"
                  placeholder="Exact customer or vendor name from invoices/expenses"
                  value={creditForm.counterpartyName}
                  onChange={(e) => setCreditForm({ ...creditForm, counterpartyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Credit Limit ({currency})</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={creditForm.creditLimit}
                    onChange={(e) => setCreditForm({ ...creditForm, creditLimit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Terms (Days)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={creditForm.creditTermsDays}
                    onChange={(e) => setCreditForm({ ...creditForm, creditTermsDays: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowCreditModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">
                Save Credit Limit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Amortization Schedule */}
      {scheduleLoan && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Amortization Schedule — {scheduleLoan.facilityNo} ({scheduleLoan.interestMethod})
                </h3>
                <p className="text-[11px] text-slate-400">
                  {scheduleLoan.lenderName} · {formatCurrency(scheduleLoan.principalAmount, currency)} @ {scheduleLoan.annualInterestRatePct}% for {scheduleLoan.termMonths} months
                </p>
              </div>
              <button type="button" onClick={() => setScheduleLoan(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3"># / Due Date</th>
                    <th className="py-2 px-3 text-right">Opening</th>
                    <th className="py-2 px-3 text-right">Principal</th>
                    <th className="py-2 px-3 text-right">Interest</th>
                    <th className="py-2 px-3 text-right">Installment</th>
                    <th className="py-2 px-3 text-right">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {scheduleRows.map((row) => (
                    <tr key={row.installmentNo}>
                      <td className="py-2 px-3 font-mono">{row.installmentNo}. {row.dueDate}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatCurrency(row.openingBalance, currency)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400">
                        {formatCurrency(row.principalDue, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-orange-400">
                        {formatCurrency(row.interestDue, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                        {formatCurrency(row.totalPayment, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(row.closingBalance, currency)}
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
