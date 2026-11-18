import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advancePayrollRunStage,
  advanceRecruitmentApproval,
  buildHrmPayrollRunDraft,
  computeEthiopianIncomeTaxAndPension,
  computeManpowerSummary,
  computeScheduleAttendanceMetrics,
  disburseApprovedHrmPayrollRun,
  generateNextEmployeeId,
  generatePayslipPdfBytes,
  maskSensitiveValue,
  recalculatePayrollRunLineItem,
  resolveHrmPermissions,
  submitRecruitmentRequestWithManpowerCheck,
  validateNoDuplicateSalaryPayment,
} from "../services/hrmService";
import {
  buildMaskedPreview,
  decryptSensitiveText,
  encryptSensitiveText,
  isEncryptedSensitiveValue,
} from "../utils/cryptoPii";
import { DbService } from "../services/db";
import {
  ActualCostEntry,
  Expense,
  FinancialAccount,
  HrmPayrollRunRecord,
  HrmPayslipRecord,
  JournalEntryRecord,
  ManpowerPlanRecord,
  OvertimeRequestRecord,
  RecruitmentRequestRecord,
  SalaryAdvanceLoanRecord,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";

let memRecruitments: RecruitmentRequestRecord[] = [];
let memNotifications: any[] = [];
let memPayrollRuns: HrmPayrollRunRecord[] = [];
let memJournals: JournalEntryRecord[] = [];
let memExpenses: Expense[] = [];
let memActualCosts: ActualCostEntry[] = [];
let memLoans: SalaryAdvanceLoanRecord[] = [];
let memPayslips: HrmPayslipRecord[] = [];

function sampleWorkers(): Worker[] {
  return [
    {
      id: "OVID-EMP-2026-0001",
      employeeId: "OVID-EMP-2026-0001",
      name: "Dawit Mekonnen",
      company: "OVID Real Estate",
      department: "Engineering",
      trade: "Site Engineer",
      position: "Site Engineer",
      joinedDate: "2026-01-01",
      assignedProject: "Bole Tower",
      currentSite: "Bole Tower",
      status: "Active",
      teamId: "TEAM-1",
      basicMonthlySalary: 15000,
      housingAllowance: 2000,
      transportAllowance: 1000,
      faydaId: "FIN-8829-1102-4491",
      bankName: "Commercial Bank of Ethiopia",
      bankAccountNumber: "1000445566778",
    },
  ];
}

function sampleBankAccount(): FinancialAccount {
  return {
    id: "BNK-PAY-1",
    accountCode: "1020",
    accountName: "CBE Payroll Account",
    accountType: "Bank",
    bankName: "CBE",
    accountNumber: "100099887766",
    currency: "ETB",
    openingBalance: 1000000,
    currentBalance: 1000000,
    minimumThreshold: 100000,
    status: "Active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  memRecruitments = [];
  memNotifications = [];
  memPayrollRuns = [];
  memJournals = [];
  memExpenses = [];
  memActualCosts = [];
  memLoans = [];
  memPayslips = [];

  vi.spyOn(DbService, "saveRecruitmentRequest").mockImplementation(async (req) => {
    memRecruitments = [...memRecruitments.filter((r) => r.id !== req.id), req];
  });
  vi.spyOn(DbService, "addNotification").mockImplementation(async (notif: any) => {
    memNotifications.push(notif);
  });
  vi.spyOn(DbService, "saveHrmPayrollRun").mockImplementation(async (run) => {
    memPayrollRuns = [...memPayrollRuns.filter((r) => r.id !== run.id), run];
  });
  vi.spyOn(DbService, "disburseHrmPayrollRunAtomic").mockImplementation(async (payload) => {
    memPayrollRuns = [...memPayrollRuns.filter((r) => r.id !== payload.run.id), payload.run];
    memJournals.push(payload.journalEntry);
    memExpenses.push(...payload.expenseRecords);
    memActualCosts.push(...payload.actualCostRecords);
    payload.updatedLoans.forEach((ln) => {
      memLoans = [...memLoans.filter((x) => x.id !== ln.id), ln];
    });
    if (payload.payslips) {
      memPayslips.push(...payload.payslips);
    }
  });
});

describe("Enterprise HRM & Ethiopian Payroll Module", () => {
  it("tracks approved manpower vs hired, triggers Director notification on excess recruitment, and enforces 5-stage + Director Excess approval", async () => {
    const plans: ManpowerPlanRecord[] = [
      {
        id: "MPP-1",
        planCode: "MP-2026-01",
        fiscalYear: "2026",
        project: "Bole Tower",
        department: "Engineering",
        jobPosition: "Site Engineer",
        approvedManpower: 2,
        budgetedMonthlySalaryPerHead: 15000,
        currency: "ETB",
        status: "Approved",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const workers = sampleWorkers();
    const summary = computeManpowerSummary({ manpowerPlans: plans, workers });
    const row = summary.find((s) => s.jobPosition === "Site Engineer")!;
    expect(row.approvedManpower).toBe(2);
    expect(row.actualHired).toBe(1);
    expect(row.remainingVacancies).toBe(1);

    // Requesting 3 when only 1 vacancy remains -> 2 excess -> triggers Director notification & excess approval
    let req = await submitRecruitmentRequestWithManpowerCheck({
      project: "Bole Tower",
      department: "Engineering",
      jobPosition: "Site Engineer",
      requestedCount: 3,
      employmentType: "Permanent",
      urgency: "High",
      requiredByDate: "2026-08-01",
      proposedMonthlySalary: 15000,
      qualificationsRequired: "BSc Civil Engineering",
      justification: "Accelerated tower block concreting schedule",
      actorName: "Eng. Samuel",
      actorUid: "SH-1",
      actorRole: UserRole.SECTION_HEAD,
      manpowerPlans: plans,
      workers,
    });

    expect(req.exceedsManpowerLimit).toBe(true);
    expect(req.excessCount).toBe(2);
    expect(req.excessApprovalStatus).toBe("Pending Director");
    expect(req.workflowStage).toBe("Pending Office Manager");
    expect(memNotifications.some((n) => n.type === "HRM Excess Manpower Alert")).toBe(true);

    // Walk through all 5 stages: Office Manager -> HR Manager -> Finance Manager -> Operation Dept -> Director Final -> Director Excess
    req = await advanceRecruitmentApproval({ request: req, decision: "Approved", actorName: "Office Mgr", actorRole: UserRole.OFFICE_MANAGER });
    expect(req.workflowStage).toBe("Pending HR Manager");

    req = await advanceRecruitmentApproval({ request: req, decision: "Approved", actorName: "HR Mgr", actorRole: UserRole.HR_MANAGER });
    expect(req.workflowStage).toBe("Pending Finance Manager");

    req = await advanceRecruitmentApproval({ request: req, decision: "Approved", actorName: "Finance Mgr", actorRole: UserRole.FINANCE_MANAGER });
    expect(req.workflowStage).toBe("Pending Operation Department");

    req = await advanceRecruitmentApproval({ request: req, decision: "Approved", actorName: "Operation Mgr", actorRole: UserRole.OPERATION_MANAGER });
    expect(req.workflowStage).toBe("Pending Director Final Approval");

    req = await advanceRecruitmentApproval({ request: req, decision: "Approved", actorName: "Director", actorRole: UserRole.DIRECTOR });
    // Because exceedsManpowerLimit is true, must pause at Pending Director Excess Approval!
    expect(req.workflowStage).toBe("Pending Director Excess Approval");
    expect(req.status).toBe("Pending");

    req = await advanceRecruitmentApproval({ request: req, decision: "Approved", actorName: "Director", actorRole: UserRole.DIRECTOR });
    expect(req.workflowStage).toBe("Approved");
    expect(req.status).toBe("Approved");
    expect(req.excessApprovalStatus).toBe("Approved");
  });

  it("generates sequential Employee IDs and masks Fayda/Bank PII for non-HR/Director roles", () => {
    const nextId = generateNextEmployeeId(sampleWorkers(), 2026);
    expect(nextId).toBe("OVID-EMP-2026-0002");

    expect(maskSensitiveValue("FIN-8829-1102-4491", false)).toBe("**************4491");
    expect(maskSensitiveValue("FIN-8829-1102-4491", true)).toBe("FIN-8829-1102-4491");
  });

  it("calculates Ethiopian Progressive Income Tax and 7% / 11% Pension accurately", () => {
    // Gross: 15,000 basic + 3,000 allowances = 18,000 taxable -> >10,900 bracket (35% - 1500) = 6,300 - 1,500 = 4,800 ETB tax
    // Employee Pension 7% of 15,000 basic = 1,050; Employer Pension 11% of 15,000 basic = 1,650
    const res = computeEthiopianIncomeTaxAndPension({
      basicSalary: 15000,
      taxableAllowances: 3000,
    });
    expect(res.grossEarnings).toBe(18000);
    expect(res.incomeTax).toBe(4800);
    expect(res.employeePension).toBe(1050);
    expect(res.employerPension).toBe(1650);
  });

  it("prevents duplicate monthly salary payments, enforces 4-tier verification, recovers loans, and posts balanced GL + Project Labor Cost", async () => {
    const workers = sampleWorkers();
    const approvedOt: OvertimeRequestRecord[] = [
      {
        id: "OT-1",
        requestNo: "OT-2026-01",
        employeeId: "OVID-EMP-2026-0001",
        workerId: "OVID-EMP-2026-0001",
        workerName: "Dawit Mekonnen",
        project: "Bole Tower",
        department: "Engineering",
        workDate: "2026-07-14",
        hoursRequested: 4,
        dayType: "Weekday",
        multiplier: 1.5,
        reason: "Slab pour supervision",
        status: "Approved",
        createdById: "SH-1",
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ];
    const activeLoan: SalaryAdvanceLoanRecord = {
      id: "LN-1",
      referenceNo: "ADV-2026-01",
      employeeId: "OVID-EMP-2026-0001",
      workerId: "OVID-EMP-2026-0001",
      workerName: "Dawit Mekonnen",
      project: "Bole Tower",
      department: "Engineering",
      type: "Salary Advance",
      principalAmount: 4000,
      installmentMonths: 2,
      monthlyInstallment: 2000,
      remainingBalance: 4000,
      totalRecovered: 0,
      reason: "Emergency advance",
      requestedDate: "2026-07-02",
      status: "Active Recovery",
      createdById: "HR-1",
      createdAt: "2026-07-02T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
    };
    memLoans = [activeLoan];

    let run = buildHrmPayrollRunDraft({
      payPeriod: "2026-07",
      projectScope: "ALL",
      workers,
      attendance: [],
      overtimeRequests: approvedOt,
      leaveRequests: [],
      salaryStructures: [],
      loans: memLoans,
      existingRuns: [],
      actorName: "HR Officer",
      actorUid: "HR-1",
    });

    expect(run.totalEmployees).toBe(1);
    expect(run.totalLoanRecovery).toBe(2000);
    expect(run.totalOvertimePay).toBeGreaterThan(0);
    expect(run.workflowStage).toBe("Pending HR Manager");

    // Verify 4-tier workflow
    run = await advancePayrollRunStage({ run, decision: "Approved", actorName: "HR Mgr", actorRole: UserRole.HR_MANAGER });
    expect(run.workflowStage).toBe("Pending Finance Manager");

    // Duplicate check blocks generating another run for same employee & period once in Finance Verification+
    const dup = validateNoDuplicateSalaryPayment({
      payPeriod: "2026-07",
      workerIds: ["OVID-EMP-2026-0001"],
      existingRuns: [run],
    });
    expect(dup.valid).toBe(false);
    expect(dup.duplicateWorkers).toContain("OVID-EMP-2026-0001");

    run = await advancePayrollRunStage({ run, decision: "Approved", actorName: "Finance Mgr", actorRole: UserRole.FINANCE_MANAGER });
    expect(run.workflowStage).toBe("Pending Operation Manager");

    run = await advancePayrollRunStage({ run, decision: "Approved", actorName: "Operation Mgr", actorRole: UserRole.OPERATION_MANAGER });
    expect(run.workflowStage).toBe("Pending Director");

    run = await advancePayrollRunStage({ run, decision: "Approved", actorName: "Director", actorRole: UserRole.DIRECTOR });
    expect(run.workflowStage).toBe("Approved for Payment");

    const paid = await disburseApprovedHrmPayrollRun({
      run,
      account: sampleBankAccount(),
      paymentReferenceNo: "CBE-PAY-0726",
      paymentDate: "2026-07-30",
      loans: memLoans,
      existingRuns: memPayrollRuns,
      workers,
      actorName: "Finance Manager",
      actorRole: UserRole.FINANCE_MANAGER,
      actorUid: "FM-1",
    });

    expect(paid.workflowStage).toBe("Paid");
    expect(memJournals).toHaveLength(1);
    expect(memJournals[0].isBalanced).toBe(true);
    expect(memJournals[0].totalDebit).toBe(memJournals[0].totalCredit);
    expect(memExpenses).toHaveLength(1);
    expect(memActualCosts).toHaveLength(1);
    expect(memLoans[0].remainingBalance).toBe(2000);
    expect(memLoans[0].totalRecovered).toBe(2000);
    expect(memPayslips).toHaveLength(1);
    expect(memPayslips[0].bankAccountMasked).toBe("*********6778");
  });

  it("computes schedule-aware attendance metrics (late arrival, early exit, overtime, holidays)", () => {
    const schedule: WorkScheduleConfig = {
      id: "WSC-1",
      scheduleName: "Day Shift",
      project: "Bole Tower",
      department: "ALL",
      shiftStartTime: "08:00",
      shiftEndTime: "17:00",
      breakMinutes: 60,
      standardDailyHours: 8,
      graceMinutesLate: 15,
      restDays: ["Sunday"],
      holidays: [{ date: "2026-09-11", name: "Enkutatash" }],
      overtimeMultiplierWeekday: 1.5,
      overtimeMultiplierRestDay: 2.0,
      overtimeMultiplierHoliday: 2.5,
      isActive: true,
      updatedBy: "HR Manager",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    // Arrived 30m late (beyond 15m grace) & left 30m early
    const lateEarly = computeScheduleAttendanceMetrics({
      date: "2026-07-15",
      checkIn: "08:30",
      checkOut: "16:30",
      schedule,
    });
    expect(lateEarly.status).toBe("Late");
    expect(lateEarly.lateArrivalMinutes).toBe(30);
    expect(lateEarly.earlyDepartureMinutes).toBe(30);
    expect(lateEarly.workingHours).toBe(7);

    // Worked 2 hours overtime on a weekday
    const otDay = computeScheduleAttendanceMetrics({
      date: "2026-07-16",
      checkIn: "08:00",
      checkOut: "19:00",
      schedule,
    });
    expect(otDay.status).toBe("Present");
    expect(otDay.workingHours).toBe(8);
    expect(otDay.overtime).toBe(2);

    // Public holiday work counts full shift as overtime
    const holidayWork = computeScheduleAttendanceMetrics({
      date: "2026-09-11",
      checkIn: "08:00",
      checkOut: "13:00",
      schedule,
    });
    expect(holidayWork.workingHours).toBe(0);
    expect(holidayWork.overtime).toBe(5);
  });

  it("recalculates payroll bonus & other deductions with progressive tax and generates binary PDF payslips", async () => {
    const workers = sampleWorkers();
    const run = buildHrmPayrollRunDraft({
      payPeriod: "2026-08",
      projectScope: "ALL",
      workers,
      attendance: [],
      overtimeRequests: [],
      leaveRequests: [],
      salaryStructures: [],
      loans: [],
      existingRuns: [],
      actorName: "HR Officer",
      actorUid: "HR-1",
    });

    const originalItem = run.items[0];
    const updatedRun = recalculatePayrollRunLineItem({
      run,
      workerId: originalItem.workerId,
      bonuses: 2000,
      otherDeductions: 500,
    });
    const updatedItem = updatedRun.items[0];
    expect(updatedItem.bonuses).toBe(2000);
    expect(updatedItem.otherDeductions).toBe(500);
    expect(updatedItem.grossEarnings).toBe(originalItem.grossEarnings + 2000);
    expect(updatedItem.incomeTax).toBeGreaterThan(originalItem.incomeTax);
    expect(updatedRun.totalNetPay).toBe(updatedItem.netPay);

    const pdfBytes = generatePayslipPdfBytes({
      run: updatedRun,
      item: updatedItem,
    });
    const pdfText = new TextDecoder().decode(pdfBytes);
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("Dawit Mekonnen");
    expect(pdfText).toContain("****6778");
    expect(pdfText.trim().endsWith("%%EOF")).toBe(true);

    // Client-side AES-GCM PII encryption & round-trip decryption
    const cipher = await encryptSensitiveText("FIN-8829-1102-4491");
    expect(isEncryptedSensitiveValue(cipher)).toBe(true);
    expect(cipher).not.toContain("8829");
    const plain = await decryptSensitiveText(cipher);
    expect(plain).toBe("FIN-8829-1102-4491");
    expect(buildMaskedPreview("FIN-8829-1102-4491")).toBe("**************4491");

    // Role permissions enforcement
    expect(resolveHrmPermissions(UserRole.EMPLOYEE).canViewPayrollAmounts).toBe(false);
    expect(resolveHrmPermissions(UserRole.EMPLOYEE).isEmployee).toBe(true);
    expect(resolveHrmPermissions(UserRole.FINANCE_MANAGER).canDisbursePayroll).toBe(true);
    expect(resolveHrmPermissions(UserRole.OFFICE_MANAGER).canApproveOfficeStage).toBe(true);
  });
});
