import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Send,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  AttendanceRecord,
  EthiopianTaxPensionConfig,
  FinancialAccount,
  HrmPayrollRunRecord,
  HrmPayslipRecord,
  SalaryAdvanceLoanRecord,
  UserRole,
  Worker,
} from "../../types";
import {
  advancePayrollRunStage,
  computeEthiopianIncomeTaxAndPension,
  disburseApprovedHrmPayrollRun,
} from "../../services/hrmService";
import { assertMakerCheckerSeparation } from "../../services/financialAuditService";
import { exportRowsToCsv, resolveUserFinancePermissions } from "../../services/financeService";
import { formatCurrency } from "../../utils/formatters";

export interface GeneratedAttendancePayrollSlip {
  id: string;
  workerId: string;
  workerName: string;
  trade: string;
  department: string;
  basicSalary: number;
  daysWorked: number;
  normalHours: number;
  overtimeHours: number;
  underTimeHours: number;
  overtimePay: number;
  allowances: number;
  bonuses: number;
  underTimeDeduction: number;
  attendanceDeductions: number;
  tax: number;
  pension: number;
  employerPension: number;
  loanDeduction: number;
  netSalary: number;
  status: "Approved";
  paymentMethod: string;
}

interface EnhancedPayrollFinanceModuleProps {
  isAmharic: boolean;
  hrmPayrollRuns: HrmPayrollRunRecord[];
  hrmPayslips: HrmPayslipRecord[];
  salaryLoans: SalaryAdvanceLoanRecord[];
  taxPensionConfigs: EthiopianTaxPensionConfig[];
  accounts: FinancialAccount[];
  workers: Worker[];
  attendance: AttendanceRecord[];
  generatedPayroll: GeneratedAttendancePayrollSlip[];
  availablePeriods: string[];
  selectedPayPeriod: string;
  onSelectPayPeriod: (period: string) => void;
  onSavePayrollBatch: () => Promise<void>;
  isSavingPayroll: boolean;
  payrollSyncStatus: string | null;
  currency: string;
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

export const EnhancedPayrollFinanceModule: React.FC<EnhancedPayrollFinanceModuleProps> = ({
  isAmharic,
  hrmPayrollRuns,
  hrmPayslips,
  salaryLoans,
  taxPensionConfigs,
  accounts,
  workers,
  attendance,
  generatedPayroll,
  availablePeriods,
  selectedPayPeriod,
  onSelectPayPeriod,
  onSavePayrollBatch,
  isSavingPayroll,
  payrollSyncStatus,
  currency,
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const perms = useMemo(() => resolveUserFinancePermissions(actorRole), [actorRole]);
  const [subTab, setSubTab] = useState<"runs" | "attendance-calc" | "loans" | "payslips">("runs");
  const [selectedSlip, setSelectedSlip] = useState<GeneratedAttendancePayrollSlip | null>(null);
  const [selectedRunSlip, setSelectedRunSlip] = useState<HrmPayslipRecord | null>(null);
  const [disburseTarget, setDisburseTarget] = useState<HrmPayrollRunRecord | null>(null);
  const [disburseForm, setDisburseForm] = useState({
    accountId: accounts[0]?.id || "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReferenceNo: "",
  });
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const activeTaxCfg = taxPensionConfigs[0];

  const notify = (type: "ok" | "err", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  // Enrich attendance-based preview with progressive Ethiopian Tax/Pension + active loan deduction
  const enrichedAttendancePayroll = useMemo(() => {
    const activeLoansByWorker = new Map<string, number>();
    salaryLoans
      .filter((l) => (l.status === "Approved" || l.status === "Active Recovery") && Number(l.remainingBalance || 0) > 0)
      .forEach((l) => {
        const cur = activeLoansByWorker.get(l.workerId) || 0;
        const install = Math.min(Number(l.remainingBalance || 0), Number(l.monthlyInstallment || l.remainingBalance || 0));
        activeLoansByWorker.set(l.workerId, cur + install);
      });

    return generatedPayroll.map((p) => {
      const taxRes = computeEthiopianIncomeTaxAndPension({
        basicSalary: p.basicSalary,
        taxableAllowances: p.allowances,
        overtimePay: p.overtimePay,
        bonuses: p.bonuses,
        config: activeTaxCfg,
      });
      const loanDed = activeLoansByWorker.get(p.workerId) || 0;
      const net = Math.max(
        0,
        Math.round((taxRes.grossEarnings - taxRes.incomeTax - taxRes.employeePension - loanDed - p.underTimeDeduction) * 100) /
          100
      );
      return {
        ...p,
        tax: taxRes.incomeTax,
        pension: taxRes.employeePension,
        employerPension: taxRes.employerPension,
        loanDeduction: loanDed,
        netSalary: net,
      };
    });
  }, [generatedPayroll, salaryLoans, activeTaxCfg]);

  // Verify attendance final approval compliance for selected period
  const unapprovedAttendanceCount = useMemo(() => {
    return attendance.filter((a) => {
      if (selectedPayPeriod !== "all" && (!a.date || !a.date.startsWith(selectedPayPeriod))) return false;
      const st = a.finalApprovalStatus || "Pending";
      return st !== "Approved";
    }).length;
  }, [attendance, selectedPayPeriod]);

  const sortedRuns = useMemo(
    () => [...hrmPayrollRuns].sort((a, b) => (b.payPeriod || "").localeCompare(a.payPeriod || "")),
    [hrmPayrollRuns]
  );

  const runKpis = useMemo(() => {
    const totalGross = sortedRuns.reduce((s, r) => s + Number(r.totalGrossPay || 0), 0);
    const totalNet = sortedRuns.reduce((s, r) => s + Number(r.totalNetPay || 0), 0);
    const totalTaxPension = sortedRuns.reduce(
      (s, r) => s + Number(r.totalIncomeTax || 0) + Number(r.totalEmployeePension || 0) + Number(r.totalEmployerPension || 0),
      0
    );
    const totalLoanRecovered = sortedRuns.reduce((s, r) => s + Number(r.totalLoanRecovery || 0), 0);
    const pendingFinanceOrDisburse = sortedRuns.filter(
      (r) => r.workflowStage === "Pending Finance Manager" || r.workflowStage === "Approved for Payment"
    ).length;
    return { totalGross, totalNet, totalTaxPension, totalLoanRecovered, pendingFinanceOrDisburse };
  }, [sortedRuns]);

  const handleApproveStage = async (run: HrmPayrollRunRecord, decision: "Approved" | "Rejected") => {
    setBusy(true);
    try {
      assertMakerCheckerSeparation({
        makerUid: run.preparedById,
        checkerUid: actorUid,
        checkerRole: actorRole,
        actionLabel: "Payroll Run Verification",
      });
      const updated = await advancePayrollRunStage({
        run,
        decision,
        actorName,
        actorRole,
        notes: `Finance Portal review by ${actorName}`,
      });
      onLogAction?.("Payroll Run Approval", `${updated.runNo} -> ${updated.workflowStage}`);
      notify("ok", `Payroll run ${updated.runNo} advanced to ${updated.workflowStage}.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to update payroll stage.");
    } finally {
      setBusy(false);
    }
  };

  const handleDisburseRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseTarget) return;
    setBusy(true);
    try {
      assertMakerCheckerSeparation({
        makerUid: disburseTarget.preparedById,
        checkerUid: actorUid,
        checkerRole: actorRole,
        actionLabel: "Payroll Bank Disbursement",
      });
      const acc = accounts.find((a) => a.id === disburseForm.accountId) || accounts[0];
      const paid = await disburseApprovedHrmPayrollRun({
        run: disburseTarget,
        account: acc,
        paymentReferenceNo: disburseForm.paymentReferenceNo || `PAY-${disburseTarget.runNo}`,
        paymentDate: disburseForm.paymentDate,
        loans: salaryLoans,
        existingRuns: hrmPayrollRuns,
        workers,
        actorName,
        actorRole,
        actorUid,
      });
      setDisburseTarget(null);
      onLogAction?.("Disburse Payroll Run", `${paid.runNo} (${formatCurrency(paid.totalNetPay, currency)}) via ${acc?.accountName || "Bank"}`);
      notify("ok", `Disbursed ${paid.runNo} (${formatCurrency(paid.totalNetPay, currency)}) & synced Bank, GL (5020/1020/2030/1110), and Payslips.`);
    } catch (err: any) {
      notify("err", err?.message || "Failed to disburse payroll run.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" id="enhanced-payroll-finance-module">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">
              {isAmharic ? "የደሞዝ፣ የግብር/ጡረታ እና የሰራተኞች ብድር አስተዳደር" : "Payroll & Employee Financial Management"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "ከHRM የደሞዝ ሩጫዎች፣ ከጸደቀ መገኘት፣ ከኢትዮጵያ የግብር/ጡረታ (7%/11%) እና ከባንክ ክፍያ ጋር የተሳሰረ"
                : "Unified HRM Payroll Runs, progressive Ethiopian Tax & 7%/11% Pension, loan recovery, Maker-Checker bank disbursement & GL sync."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCsv(
                "payroll_financial_register",
                enrichedAttendancePayroll.map((p) => ({
                  WorkerId: p.workerId,
                  Name: p.workerName,
                  Department: p.department,
                  Basic: p.basicSalary,
                  Overtime: p.overtimePay,
                  Allowances: p.allowances,
                  IncomeTax: p.tax,
                  EmployeePension7Pct: p.pension,
                  EmployerPension11Pct: p.employerPension,
                  LoanRecovery: p.loanDeduction,
                  NetPay: p.netSalary,
                }))
              )
            }
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            <span>Export Payroll CSV</span>
          </button>
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

      {payrollSyncStatus && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle size={15} className="text-emerald-400" />
          <span>{payrollSyncStatus}</span>
        </div>
      )}

      {/* Attendance Verification Compliance Banner */}
      {unapprovedAttendanceCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/70 rounded-2xl p-3.5 text-xs text-amber-200 flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>Attendance Gate Notice:</strong> {unapprovedAttendanceCount} attendance record(s) in this period are not yet{" "}
            <span className="font-mono">Approved</span> by the HR Manager. Only approved attendance should be finalized for payroll disbursement.
          </span>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Payroll Runs Gross</span>
          <span className="text-lg font-black text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(runKpis.totalGross, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{sortedRuns.length} HRM cycles</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Net Disbursable</span>
          <span className="text-lg font-black text-emerald-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(runKpis.totalNet, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Bank direct credit</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Tax + Pension (7%/11%)</span>
          <span className="text-lg font-black text-amber-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(runKpis.totalTaxPension, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Statutory ERCA/POESSA</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Staff Loans Recovered</span>
          <span className="text-lg font-black text-cyan-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(runKpis.totalLoanRecovered, currency)}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">COA 1110 / 1130 credit</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Finance Queue</span>
          <span className="text-lg font-black text-blue-400 font-mono tabular-nums mt-1 block">
            {runKpis.pendingFinanceOrDisburse}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Pending review or disbursement</span>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
        {[
          { id: "runs", label: `HRM Payroll Runs & Bank Disbursement (${sortedRuns.length})` },
          { id: "attendance-calc", label: `Attendance Payroll Preview (${enrichedAttendancePayroll.length})` },
          { id: "loans", label: `Employee Advances & Loans (${salaryLoans.length})` },
          { id: "payslips", label: `Issued Payslips (${hrmPayslips.length})` },
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

      {/* Subtab 1: HRM Payroll Runs (Integrated with HR Module, zero duplicate collections) */}
      {subTab === "runs" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Run No / Period</th>
                <th className="py-3 px-3">Project Scope</th>
                <th className="py-3 px-3 text-right">Staff</th>
                <th className="py-3 px-3 text-right">Gross Earnings</th>
                <th className="py-3 px-3 text-right">Tax & Pension</th>
                <th className="py-3 px-3 text-right">Loan Recovery</th>
                <th className="py-3 px-3 text-right">Net Payable</th>
                <th className="py-3 px-3">Workflow Stage</th>
                <th className="py-3 px-3 text-right">Finance Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {sortedRuns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No HRM payroll runs submitted yet. Prepare a cycle in HRM or use the Attendance Preview tab.
                  </td>
                </tr>
              ) : (
                sortedRuns.map((run) => {
                  const canApproveFinance =
                    run.workflowStage === "Pending Finance Manager" && (perms.isFinanceManager || perms.isDirector);
                  const canDisburse =
                    run.workflowStage === "Approved for Payment" && (perms.isFinanceManager || perms.isDirector);
                  return (
                    <tr key={run.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-white block">{run.runNo}</span>
                        <span className="text-[10px] font-mono text-slate-400">{run.payPeriod}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">{run.projectScope}</td>
                      <td className="py-3 px-3 text-right font-mono">{run.totalEmployees}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {formatCurrency(run.totalGrossPay, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-400">
                        {formatCurrency(run.totalIncomeTax + run.totalEmployeePension, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-cyan-400">
                        {formatCurrency(run.totalLoanRecovery, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                        {formatCurrency(run.totalNetPay, currency)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            run.workflowStage === "Paid"
                              ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                              : run.workflowStage === "Rejected"
                              ? "bg-red-950/60 border-red-800 text-red-300"
                              : "bg-slate-900 border-slate-700 text-amber-300"
                          }`}
                        >
                          {run.workflowStage}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApproveFinance && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApproveStage(run, "Approved")}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Verify Budget
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApproveStage(run, "Rejected")}
                                className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {canDisburse && (
                            <button
                              type="button"
                              onClick={() => {
                                setDisburseForm({
                                  accountId: accounts[0]?.id || "",
                                  paymentDate: new Date().toISOString().slice(0, 10),
                                  paymentReferenceNo: `PAY-${run.runNo}`,
                                });
                                setDisburseTarget(run);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                            >
                              <Send size={11} />
                              <span>Disburse & Post GL</span>
                            </button>
                          )}
                          {run.glJournalId && (
                            <span className="text-[10px] font-mono text-cyan-400">GL Synced</span>
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
      )}

      {/* Subtab 2: Attendance-Driven Live Calculation & Batch Sync */}
      {subTab === "attendance-calc" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-emerald-400" />
              <select
                value={selectedPayPeriod}
                onChange={(e) => onSelectPayPeriod(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">
                  All Pay Periods
                </option>
                {availablePeriods.map((p) => (
                  <option key={p} value={p} className="bg-slate-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {perms.canManageTransactions && (
              <button
                type="button"
                onClick={onSavePayrollBatch}
                disabled={isSavingPayroll || enrichedAttendancePayroll.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{isSavingPayroll ? "Syncing..." : "Approve & Sync Payroll Batch"}</span>
              </button>
            )}
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Trade</th>
                  <th className="py-3 px-3 text-right">Basic</th>
                  <th className="py-3 px-3 text-right">OT Pay</th>
                  <th className="py-3 px-3 text-right">Tax (Prog.)</th>
                  <th className="py-3 px-3 text-right">Pension (7%/11%)</th>
                  <th className="py-3 px-3 text-right">Loan Ded.</th>
                  <th className="py-3 px-3 text-right">Net Salary</th>
                  <th className="py-3 px-3 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300">
                {enrichedAttendancePayroll.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      No attendance-verified workers found for this pay period.
                    </td>
                  </tr>
                ) : (
                  enrichedAttendancePayroll.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] text-slate-500 block">{p.workerId}</span>
                        <span className="font-bold text-white">{p.workerName}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{p.trade}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(p.basicSalary, currency)}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-400">
                        {formatCurrency(p.overtimePay, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-red-400">{formatCurrency(p.tax, currency)}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(p.pension, currency)} / {formatCurrency(p.employerPension, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-cyan-400">
                        {formatCurrency(p.loanDeduction, currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                        {formatCurrency(p.netSalary, currency)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSlip(p)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-white cursor-pointer"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Employee Salary Advances & Loans */}
      {subTab === "loans" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Loan Type</th>
                <th className="py-3 px-3 text-right">Principal</th>
                <th className="py-3 px-3 text-right">Monthly Installment</th>
                <th className="py-3 px-3 text-right">Recovered</th>
                <th className="py-3 px-3 text-right">Remaining Balance</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {salaryLoans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No employee salary advances or loans recorded in HRM.
                  </td>
                </tr>
              ) : (
                salaryLoans.map((ln) => (
                  <tr key={ln.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-3">
                      <span className="font-bold text-white block">{ln.workerName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{ln.employeeId || ln.workerId}</span>
                    </td>
                    <td className="py-3 px-3">{ln.requestType}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{formatCurrency(ln.amount, currency)}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-400">
                      {formatCurrency(ln.monthlyInstallment || 0, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400">
                      {formatCurrency(ln.totalRecovered || 0, currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-white">
                      {formatCurrency(ln.remainingBalance, currency)}
                    </td>
                    <td className="py-3 px-3 font-bold text-[11px]">{ln.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtab 4: Issued Official Payslips */}
      {subTab === "payslips" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-3">Run / Period</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Project / Bank</th>
                <th className="py-3 px-3 text-right">Gross</th>
                <th className="py-3 px-3 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Net Paid</th>
                <th className="py-3 px-3 text-right">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {hrmPayslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    No disbursed official payslips generated yet.
                  </td>
                </tr>
              ) : (
                hrmPayslips.map((ps) => (
                  <tr key={ps.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono">{ps.runNo} · {ps.payPeriod}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{ps.workerName}</td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {ps.project} · {ps.bankName || "Direct"} ({ps.bankAccountMasked || "N/A"})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {formatCurrency(ps.item.grossEarnings, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-400">
                      {formatCurrency(ps.item.totalDeductions, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                      {formatCurrency(ps.item.netPay, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRunSlip(ps)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-white cursor-pointer"
                      >
                        Print Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Bank Disbursement for Approved Payroll Run */}
      {disburseTarget && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDisburseRun} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Disburse Approved Payroll Run</h3>
                <p className="text-[11px] text-slate-400">
                  {disburseTarget.runNo} ({disburseTarget.payPeriod}) · Net{" "}
                  {formatCurrency(disburseTarget.totalNetPay, currency)}
                </p>
              </div>
              <button type="button" onClick={() => setDisburseTarget(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Disbursement Bank Account</label>
                <select
                  value={disburseForm.accountId}
                  onChange={(e) => setDisburseForm({ ...disburseForm, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Disbursement Date</label>
                <input
                  required
                  type="date"
                  value={disburseForm.paymentDate}
                  onChange={(e) => setDisburseForm({ ...disburseForm, paymentDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bank Transfer Batch Ref *</label>
                <input
                  required
                  type="text"
                  value={disburseForm.paymentReferenceNo}
                  onChange={(e) => setDisburseForm({ ...disburseForm, paymentReferenceNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setDisburseTarget(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50">
                {busy ? "Disbursing..." : "Confirm Bank Transfer & GL Sync"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payslip Print Modals */}
      {(selectedSlip || selectedRunSlip) && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  {selectedSlip ? selectedSlip.workerName : selectedRunSlip?.workerName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedSlip
                    ? `${selectedSlip.trade} · ${selectedSlip.workerId}`
                    : `${selectedRunSlip?.position} · ${selectedRunSlip?.payPeriod}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlip(null);
                  setSelectedRunSlip(null);
                }}
                className="p-1.5 bg-slate-800 rounded-lg text-slate-300 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {selectedSlip && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Basic Monthly Salary</span>
                  <span className="font-mono tabular-nums text-white">{formatCurrency(selectedSlip.basicSalary, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overtime Pay</span>
                  <span className="font-mono tabular-nums text-amber-400">+{formatCurrency(selectedSlip.overtimePay, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Income Tax (Ethiopian Progressive)</span>
                  <span className="font-mono tabular-nums text-red-400">-{formatCurrency(selectedSlip.tax, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Employee Pension (7%)</span>
                  <span className="font-mono tabular-nums text-red-400">-{formatCurrency(selectedSlip.pension, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Loan / Advance Recovery</span>
                  <span className="font-mono tabular-nums text-cyan-400">-{formatCurrency(selectedSlip.loanDeduction, currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 font-black text-sm">
                  <span className="text-white">Net Disbursable Salary</span>
                  <span className="font-mono tabular-nums text-emerald-400">{formatCurrency(selectedSlip.netSalary, currency)}</span>
                </div>
              </div>
            )}

            {selectedRunSlip && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Earnings</span>
                  <span className="font-mono tabular-nums text-white">{formatCurrency(selectedRunSlip.item.grossEarnings, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Income Tax</span>
                  <span className="font-mono tabular-nums text-red-400">-{formatCurrency(selectedRunSlip.item.incomeTax, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Employee Pension (7%)</span>
                  <span className="font-mono tabular-nums text-red-400">-{formatCurrency(selectedRunSlip.item.employeePension, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Advance/Loan Deduction</span>
                  <span className="font-mono tabular-nums text-cyan-400">-{formatCurrency(selectedRunSlip.item.advanceLoanDeduction, currency)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 font-black text-sm">
                  <span className="text-white">Net Paid ({selectedRunSlip.paymentReferenceNo})</span>
                  <span className="font-mono tabular-nums text-emerald-400">{formatCurrency(selectedRunSlip.item.netPay, currency)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
