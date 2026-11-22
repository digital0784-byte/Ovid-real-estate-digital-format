import * as XLSX from "xlsx";
import {
  ActualCostEntry,
  AttendanceDeductionPolicy,
  AttendanceRecord,
  AuditLog,
  BankTransactionRecord,
  EmployeeTransferRecord,
  ErpTask,
  ErpTaskEvidence,
  EthiopianTaxBracket,
  EthiopianTaxPensionConfig,
  ExcessRecruitmentRequestRecord,
  Expense,
  FinancialAccount,
  HrmPayrollLineItem,
  HrmPayrollRunRecord,
  HrmPayrollRunStage,
  HrmPayslipRecord,
  HrmPrivateProfileRecord,
  HrmWorkflowStepLog,
  JournalEntryLine,
  JournalEntryRecord,
  LeaveRequestRecord,
  ManpowerPlanRecord,
  OvertimeRequestRecord,
  RecruitmentRequestRecord,
  RecruitmentSupportingDocument,
  RecruitmentWorkflowStage,
  SalaryAdvanceLoanRecord,
  SalaryStructureRecord,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";
import { DbService } from "./db";
import { safeString } from "../utils/formatters";
import { buildMaskedPreview, hashSensitiveIdentifier } from "../utils/cryptoPii";

const round2 = (n: number): number => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

export const DEFAULT_ETHIOPIAN_TAX_BRACKETS: EthiopianTaxBracket[] = [
  { minAmount: 0, maxAmount: 600, ratePercent: 0, deductionAmount: 0 },
  { minAmount: 600.01, maxAmount: 1650, ratePercent: 10, deductionAmount: 60 },
  { minAmount: 1650.01, maxAmount: 3200, ratePercent: 15, deductionAmount: 142.5 },
  { minAmount: 3200.01, maxAmount: 5250, ratePercent: 20, deductionAmount: 302.5 },
  { minAmount: 5250.01, maxAmount: 7800, ratePercent: 25, deductionAmount: 565 },
  { minAmount: 7800.01, maxAmount: 10900, ratePercent: 30, deductionAmount: 955 },
  { minAmount: 10900.01, maxAmount: null, ratePercent: 35, deductionAmount: 1500 },
];

export const DEFAULT_ETHIOPIAN_TAX_PENSION_CONFIG: EthiopianTaxPensionConfig = {
  id: "ETH-TAX-PENSION-DEFAULT",
  configName: "Ethiopian Statutory Employment Income Tax & Pension (7% / 11%)",
  effectiveFrom: "2025-01-01",
  employeePensionPercent: 7,
  employerPensionPercent: 11,
  taxBrackets: DEFAULT_ETHIOPIAN_TAX_BRACKETS,
  updatedBy: "System Default",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

export interface ManpowerSummaryRow {
  planId?: string;
  project: string;
  department: string;
  jobPosition: string;
  approvedManpower: number;
  actualHired: number;
  remainingVacancies: number;
  excessCount: number;
}

export interface ProjectLaborCostSummary {
  project: string;
  employeeCount: number;
  grossEarnings: number;
  employerPension: number;
  totalLaborExpense: number;
  netDisbursed: number;
}

export interface HrmAttendanceSummaryRow {
  workerId: string;
  employeeId: string;
  workerName: string;
  project: string;
  department: string;
  presentDays: number;
  lateDays: number;
  earlyDepartures: number;
  absentDays: number;
  leaveDays: number;
  totalHours: number;
  approvedOvertimeHours: number;
  biometricStatus: "Registered" | "Pending";
}

export interface HrmDashboardState {
  manpowerRows: ManpowerSummaryRow[];
  totalApprovedManpower: number;
  totalActualHired: number;
  totalRemainingVacancies: number;
  excessRecruitmentCount: number;
  totalManpowerRequests: number;
  approvedRecruitmentRequests: number;
  rejectedRecruitmentRequests: number;
  returnedRecruitmentRequests: number;
  totalApprovedManpowerQty: number;
  registeredEmployeesFromRequests: number;
  remainingRecruitmentVacancies: number;
  pendingExcessRequestsCount: number;
  attendanceSummaryRows: HrmAttendanceSummaryRow[];
  projectLaborSummaries: ProjectLaborCostSummary[];
  totalPayrollNetYtd: number;
  pendingRecruitmentApprovals: number;
  pendingLeaveApprovals: number;
  pendingOvertimeApprovals: number;
  pendingPayrollApprovals: number;
  activeLoansBalance: number;
}

export function resolveHrmPermissions(role: UserRole | string) {
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isDirector =
    role === UserRole.DIRECTOR ||
    role === UserRole.HEAD_OFFICE ||
    isSuperAdmin;
  const isStrictHrManager = role === UserRole.HR_MANAGER;
  const isHrOfficer = role === UserRole.HR;
  const isHrManager = isStrictHrManager || isHrOfficer;
  const isOfficeManager = role === UserRole.OFFICE_MANAGER;
  const isFinanceManager = role === UserRole.FINANCE_MANAGER || role === UserRole.ACCOUNTANT;
  const isOperationManager = role === UserRole.OPERATION_MANAGER;
  const isProjectManager = role === UserRole.PROJECT_MANAGER;
  const isSectionHead = role === UserRole.SECTION_HEAD || role === UserRole.SUPERVISOR;
  const isOfficeTechEng = role === UserRole.OFFICE_AND_TECHNICAL_ENGINEERING;
  const isAuditor = role === UserRole.AUDITOR;
  const isEmployee = role === UserRole.EMPLOYEE || role === UserRole.WORKER;

  return {
    isSuperAdmin,
    isDirector,
    isStrictHrManager,
    isHrOfficer,
    isHrManager,
    isOfficeManager,
    isFinanceManager,
    isOperationManager,
    isProjectManager,
    isSectionHead,
    isOfficeTechEng,
    isAuditor,
    isEmployee,
    canManageEmployees: isDirector || isHrManager,
    canRegisterApprovedEmployees: isHrManager || isSuperAdmin,
    // Integrated Employee Biometric Registration: Strictly HR Department ONLY
    canManageBiometricEnrollment: isStrictHrManager || isHrOfficer,
    // Recruitment & Hiring Part 1: Section Head submits Manpower Request Form (Super Admin override)
    canSubmitManpowerRequest: role === UserRole.SECTION_HEAD || isSuperAdmin,
    canRequestRecruitment:
      isDirector ||
      isHrManager ||
      isProjectManager ||
      isSectionHead ||
      isOfficeManager ||
      isOperationManager ||
      isOfficeTechEng,
    // Strict per-stage approver permissions so workflow order cannot be bypassed
    canApproveHrStage: isHrManager || isSuperAdmin,
    canApproveOfficeStage: isOfficeManager || isOfficeTechEng || isSuperAdmin,
    canApproveFinanceStage: role === UserRole.FINANCE_MANAGER || isSuperAdmin,
    canApproveOperationStage: isOperationManager || isSuperAdmin,
    canApproveDirectorStage: isDirector,
    canViewSensitivePii: isDirector || isHrManager || isFinanceManager,
    canViewPayrollAmounts: isDirector || isHrManager || isFinanceManager || isOperationManager || isAuditor,
    canApproveLeaveOrOvertimeSection: isDirector || isSectionHead || isProjectManager || isOperationManager,
    canDisbursePayroll: isDirector || role === UserRole.FINANCE_MANAGER,
    // Part 2 Attendance Workflow Permissions: ONLY HR Manager gives final attendance approval
    canFinalApproveAttendance: role === UserRole.HR_MANAGER,
    canPrepareAttendanceReview: isStrictHrManager || isHrOfficer,
    canSubmitManualCorrection:
      isStrictHrManager || isHrOfficer || isProjectManager || isSectionHead || isOperationManager,
    canReportAttendanceDiscrepancy:
      isProjectManager ||
      isSectionHead ||
      role === UserRole.SUPERVISOR ||
      role === UserRole.SITE_ENGINEER ||
      isOfficeManager ||
      isOperationManager ||
      isHrManager ||
      isDirector,
  };
}

export function canActorApproveRecruitmentStage(
  role: UserRole | string,
  stage: RecruitmentWorkflowStage
): boolean {
  const perms = resolveHrmPermissions(role);
  switch (stage) {
    case "Pending HR Manager":
      return perms.canApproveHrStage;
    case "Pending Office Manager":
      return perms.canApproveOfficeStage;
    case "Pending Finance Manager":
      return perms.canApproveFinanceStage;
    case "Pending Operation Department":
      return perms.canApproveOperationStage;
    case "Pending Director Final Approval":
    case "Pending Director Excess Approval":
      return perms.canApproveDirectorStage;
    default:
      return false;
  }
}

export function maskSensitiveValue(value: string | undefined, canViewUnmasked: boolean, keepLast = 4): string {
  const raw = safeString(value).trim();
  if (!raw) return "Not Provided";
  if (canViewUnmasked) return raw;
  if (raw.length <= keepLast) return "*".repeat(raw.length);
  return `${"*".repeat(Math.max(4, raw.length - keepLast))}${raw.slice(-keepLast)}`;
}

export function generateNextEmployeeId(existingWorkers: Worker[], year = new Date().getFullYear()): string {
  const existingIds = new Set<string>();
  let maxSeq = 0;
  const regex = new RegExp(`OVID-EMP-${year}-(\\d+)`, "i");
  (existingWorkers || []).forEach((w) => {
    if (!w) return;
    const empCode = safeString((w as any).employeeId).trim().toUpperCase();
    const docId = safeString(w.id).trim().toUpperCase();
    if (empCode) existingIds.add(empCode);
    if (docId) existingIds.add(docId);
    const code = empCode || docId;
    const m = code.match(regex);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });
  let nextSeq = Math.max(maxSeq + 1, (existingWorkers || []).length + 1, 1);
  let candidate = `OVID-EMP-${year}-${String(nextSeq).padStart(4, "0")}`;
  while (existingIds.has(candidate.toUpperCase())) {
    nextSeq += 1;
    candidate = `OVID-EMP-${year}-${String(nextSeq).padStart(4, "0")}`;
  }
  return candidate;
}

export function computeEthiopianIncomeTaxAndPension(params: {
  basicSalary: number;
  taxableAllowances?: number;
  overtimePay?: number;
  bonuses?: number;
  pensionEligible?: boolean;
  config?: EthiopianTaxPensionConfig;
}): {
  grossEarnings: number;
  taxableIncome: number;
  incomeTax: number;
  employeePension: number;
  employerPension: number;
} {
  const cfg = params.config || DEFAULT_ETHIOPIAN_TAX_PENSION_CONFIG;
  const basic = round2(params.basicSalary || 0);
  const allowances = round2(params.taxableAllowances || 0);
  const ot = round2(params.overtimePay || 0);
  const bonus = round2(params.bonuses || 0);

  const grossEarnings = round2(basic + allowances + ot + bonus);
  const taxableIncome = grossEarnings;

  // Apply Ethiopian progressive brackets
  const sortedBrackets = [...(cfg.taxBrackets || DEFAULT_ETHIOPIAN_TAX_BRACKETS)].sort(
    (a, b) => a.minAmount - b.minAmount
  );
  let matchedBracket = sortedBrackets[0];
  for (const br of sortedBrackets) {
    if (taxableIncome >= br.minAmount && (br.maxAmount === null || taxableIncome <= br.maxAmount)) {
      matchedBracket = br;
      break;
    }
    if (br.maxAmount === null && taxableIncome >= br.minAmount) {
      matchedBracket = br;
    }
  }

  const rawTax = matchedBracket
    ? taxableIncome * (matchedBracket.ratePercent / 100) - matchedBracket.deductionAmount
    : 0;
  const incomeTax = round2(Math.max(0, rawTax));

  const isPensionable = params.pensionEligible !== false;
  const employeePension = isPensionable
    ? round2(basic * (Number(cfg.employeePensionPercent || 7) / 100))
    : 0;
  const employerPension = isPensionable
    ? round2(basic * (Number(cfg.employerPensionPercent || 11) / 100))
    : 0;

  return {
    grossEarnings,
    taxableIncome,
    incomeTax,
    employeePension,
    employerPension,
  };
}

function parseTimeToMinutes(hhmm?: string | null): number | null {
  if (!hhmm || typeof hhmm !== "string") return null;
  const parts = hhmm.trim().split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function inferWorkerWorkLocationType(
  worker: Partial<Pick<Worker, "workLocationType" | "assignedProject" | "currentSite">>
): "Head Office" | "Construction Site" {
  if (worker.workLocationType === "Head Office" || worker.workLocationType === "Construction Site") {
    return worker.workLocationType;
  }
  const site = safeString(worker.assignedProject || worker.currentSite).toLowerCase();
  if (site.includes("head office") || site === "hq" || site.includes("headquarter")) {
    return "Head Office";
  }
  return "Construction Site";
}

function isScheduleEffectiveOnDate(s: WorkScheduleConfig, workDate?: string): boolean {
  if (!workDate) return true;
  if (s.effectiveFrom && workDate < s.effectiveFrom) return false;
  if (s.effectiveTo && workDate > s.effectiveTo) return false;
  return true;
}

export function resolveWorkerSchedule(
  worker: Partial<Pick<Worker, "id" | "employeeId" | "assignedProject" | "currentSite" | "department" | "workLocationType" | "defaultScheduleId">>,
  schedules: WorkScheduleConfig[],
  workDate?: string
): WorkScheduleConfig | undefined {
  const proj = safeString(worker.assignedProject || worker.currentSite).trim().toLowerCase();
  const dept = safeString(worker.department).trim().toLowerCase();
  const wLoc = inferWorkerWorkLocationType(worker);
  const empCode = safeString(worker.employeeId).trim().toLowerCase();
  const wId = safeString(worker.id).trim().toLowerCase();

  const active = schedules.filter(
    (s) => s.isActive !== false && isScheduleEffectiveOnDate(s, workDate)
  );
  if (active.length === 0) return undefined;

  // 1) Employee-specific assignment
  const byEmployee = active.find((s) => {
    if (worker.defaultScheduleId && s.id === worker.defaultScheduleId) return true;
    const sWid = safeString(s.workerId).trim().toLowerCase();
    const sEid = safeString(s.employeeId).trim().toLowerCase();
    return Boolean((wId && sWid === wId) || (empCode && sEid === empCode));
  });
  if (byEmployee) return byEmployee;

  const matchesLocation = (s: WorkScheduleConfig) =>
    !s.workLocationType || s.workLocationType === "ALL" || s.workLocationType === wLoc;

  // 2) Specific Project + Specific Department
  return (
    active.find(
      (s) =>
        matchesLocation(s) &&
        s.project.toLowerCase() === proj &&
        s.department.toLowerCase() === dept
    ) ||
    // 3) Specific Department + Work Location Type (e.g. Head Office HR vs Construction Site HR)
    active.find(
      (s) =>
        s.workLocationType === wLoc &&
        s.project.toLowerCase() === "all" &&
        s.department.toLowerCase() === dept
    ) ||
    // 4) Specific Project + ALL Departments
    active.find(
      (s) =>
        matchesLocation(s) &&
        s.project.toLowerCase() === proj &&
        s.department.toLowerCase() === "all"
    ) ||
    // 5) Work Location Type (Head Office or Construction Site) + ALL Projects + ALL Departments
    active.find(
      (s) =>
        s.workLocationType === wLoc &&
        s.project.toLowerCase() === "all" &&
        s.department.toLowerCase() === "all"
    ) ||
    // 6) Specific Department + ALL Projects
    active.find(
      (s) =>
        matchesLocation(s) &&
        s.project.toLowerCase() === "all" &&
        s.department.toLowerCase() === dept
    ) ||
    // 7) Company Default
    active.find(
      (s) =>
        matchesLocation(s) &&
        s.project.toLowerCase() === "all" &&
        s.department.toLowerCase() === "all"
    ) ||
    active[0]
  );
}

export function computeScheduleAttendanceMetrics(params: {
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  explicitStatus?: "Present" | "Absent" | "Late" | "Leave" | "Holiday";
  schedule?: WorkScheduleConfig;
  approvedLeaves?: LeaveRequestRecord[];
  workerId?: string;
  employeeId?: string;
}): {
  status: "Present" | "Absent" | "Late" | "Leave" | "Holiday";
  workingHours: number;
  lateArrivalMinutes: number;
  earlyDepartureMinutes: number;
  underTime: number;
  overtime: number;
  overtimeCandidateHours: number;
  punchCompleteness: "Complete" | "Missing Check-Out" | "Missing Check-In";
  missingPunchType: "Missing Check-Out" | "Missing Check-In" | "None";
  hrReviewStatus: "Not Required" | "Pending HR Review" | "Approved" | "Rejected";
} {
  const shiftStart = parseTimeToMinutes(params.schedule?.shiftStartTime || "08:00") ?? 480;
  const shiftEndRaw = parseTimeToMinutes(params.schedule?.shiftEndTime || "17:00") ?? 1020;
  const isCrossMidnight = Boolean(params.schedule?.isNightShift) || shiftEndRaw <= shiftStart;
  const shiftEnd = isCrossMidnight ? shiftEndRaw + 1440 : shiftEndRaw;

  const breakMins = Math.max(0, Number(params.schedule?.breakMinutes ?? 60));
  const stdHours = Math.max(1, Number(params.schedule?.standardDailyHours ?? 8));
  const grace = Math.max(0, Number(params.schedule?.graceMinutesLate ?? 15));

  const isHoliday = Boolean(
    params.schedule?.holidays?.some((h) => h.date === params.date)
  );
  const weekdayName = new Date(`${params.date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const isRestDay = Boolean(
    params.schedule?.restDays?.some((d) => d.toLowerCase() === weekdayName.toLowerCase())
  );

  const hasApprovedLeave = Boolean(
    params.approvedLeaves?.some(
      (lv) =>
        lv.status === "Approved" &&
        (!params.workerId ||
          lv.workerId === params.workerId ||
          (params.employeeId && lv.employeeId === params.employeeId)) &&
        lv.startDate <= params.date &&
        lv.endDate >= params.date
    )
  );

  const inMins = parseTimeToMinutes(params.checkIn);
  const outMins = parseTimeToMinutes(params.checkOut);

  if (
    params.explicitStatus === "Absent" ||
    params.explicitStatus === "Leave" ||
    (hasApprovedLeave && inMins === null && outMins === null)
  ) {
    return {
      status:
        params.explicitStatus === "Absent"
          ? "Absent"
          : params.explicitStatus === "Leave" || hasApprovedLeave
          ? "Leave"
          : "Absent",
      workingHours: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      underTime: 0,
      overtime: 0,
      overtimeCandidateHours: 0,
      punchCompleteness: "Complete",
      missingPunchType: "None",
      hrReviewStatus: "Not Required",
    };
  }

  // Missing BOTH Check-In & Check-Out
  if (inMins === null && outMins === null) {
    return {
      status: isHoliday ? "Holiday" : "Absent",
      workingHours: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      underTime: 0,
      overtime: 0,
      overtimeCandidateHours: 0,
      punchCompleteness: "Complete",
      missingPunchType: "None",
      hrReviewStatus: "Not Required",
    };
  }

  // Missing Check-In ONLY (Check-Out exists, Check-In is missing): NEVER invent Check-In or fabricate workingHours
  if (inMins === null && outMins !== null) {
    const normOut = isCrossMidnight && outMins < shiftStart ? outMins + 1440 : outMins;
    const earlyDepartureMinutes =
      normOut < shiftEnd && !isHoliday && !isRestDay ? shiftEnd - normOut : 0;
    const underTime = round2(earlyDepartureMinutes / 60);
    const status: "Present" | "Absent" | "Late" | "Leave" | "Holiday" =
      params.explicitStatus === "Holiday"
        ? "Holiday"
        : params.explicitStatus === "Late"
        ? "Late"
        : "Present";

    return {
      status,
      workingHours: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes,
      underTime,
      overtime: 0,
      overtimeCandidateHours: 0,
      punchCompleteness: "Missing Check-In",
      missingPunchType: "Missing Check-In",
      hrReviewStatus: "Pending HR Review",
    };
  }

  // Normalize inMins for night shifts crossing midnight (e.g. 22:00 shift, 00:15 arrival => +135m late)
  const normIn =
    isCrossMidnight && inMins! < shiftStart - 360 ? inMins! + 1440 : inMins!;
  const rawLate = Math.max(0, normIn - shiftStart);
  const lateArrivalMinutes = rawLate > grace ? rawLate : 0;

  // Missing Check-Out ONLY (Check-In exists, Check-Out is null): NEVER invent Check-Out or fabricate hours
  if (outMins === null) {
    const status: "Present" | "Absent" | "Late" | "Leave" | "Holiday" =
      params.explicitStatus === "Holiday"
        ? "Holiday"
        : params.explicitStatus === "Late" || lateArrivalMinutes > 0
        ? "Late"
        : "Present";

    return {
      status,
      workingHours: 0,
      lateArrivalMinutes,
      earlyDepartureMinutes: 0,
      underTime: 0,
      overtime: 0,
      overtimeCandidateHours: 0,
      punchCompleteness: "Missing Check-Out",
      missingPunchType: "Missing Check-Out",
      hrReviewStatus: "Pending HR Review",
    };
  }

  // Both Check-In & Check-Out verified
  const normOut =
    outMins >= normIn
      ? outMins
      : isCrossMidnight && outMins + 1440 >= normIn
      ? outMins + 1440
      : outMins + 1440;

  const rawSpan = Math.max(0, normOut - normIn);
  const deductedBreak = rawSpan > 300 ? breakMins : 0;
  const totalMinutesWorked = Math.max(0, rawSpan - deductedBreak);
  const earlyDepartureMinutes =
    normOut < shiftEnd && !isHoliday && !isRestDay ? shiftEnd - normOut : 0;

  const totalHours = round2(totalMinutesWorked / 60);
  const overtime =
    isHoliday || isRestDay ? totalHours : round2(Math.max(0, totalHours - stdHours));
  const regularHours =
    isHoliday || isRestDay ? 0 : round2(Math.min(stdHours, totalHours));
  const underTime = round2(earlyDepartureMinutes / 60);
  const overtimeCandidateHours = overtime;

  let status: "Present" | "Absent" | "Late" | "Leave" | "Holiday" = "Present";
  if (params.explicitStatus === "Holiday" || (isHoliday && totalHours === 0)) {
    status = "Holiday";
  } else if (params.explicitStatus === "Late" || lateArrivalMinutes > 0) {
    status = "Late";
  }

  const hrReviewStatus: "Not Required" | "Pending HR Review" =
    overtimeCandidateHours > 0 || earlyDepartureMinutes > 0
      ? "Pending HR Review"
      : "Not Required";

  return {
    status,
    workingHours: regularHours,
    lateArrivalMinutes,
    earlyDepartureMinutes,
    underTime,
    overtime,
    overtimeCandidateHours,
    punchCompleteness: "Complete",
    missingPunchType: "None",
    hrReviewStatus,
  };
}

export function computeManpowerSummary(params: {
  manpowerPlans: ManpowerPlanRecord[];
  workers: Worker[];
}): ManpowerSummaryRow[] {
  const { manpowerPlans, workers } = params;
  const activeWorkers = workers.filter((w) => w.status === "Active");
  const rows: ManpowerSummaryRow[] = [];
  const coveredKeys = new Set<string>();

  const norm = (s?: string) => safeString(s).trim().toLowerCase();

  manpowerPlans.forEach((plan) => {
    const key = `${norm(plan.project)}::${norm(plan.department)}::${norm(plan.jobPosition)}`;
    coveredKeys.add(key);
    const hired = activeWorkers.filter((w) => {
      const wProj = norm(w.assignedProject || w.currentSite || "General");
      const wDept = norm(w.department);
      const wPos = norm(w.position || w.trade);
      return (
        (norm(plan.project) === "all" || wProj === norm(plan.project)) &&
        (norm(plan.department) === "all" || wDept === norm(plan.department)) &&
        wPos === norm(plan.jobPosition)
      );
    }).length;
    const approved = Math.max(0, Number(plan.approvedManpower || 0));
    rows.push({
      planId: plan.id,
      project: plan.project,
      department: plan.department,
      jobPosition: plan.jobPosition,
      approvedManpower: approved,
      actualHired: hired,
      remainingVacancies: Math.max(0, approved - hired),
      excessCount: Math.max(0, hired - approved),
    });
  });

  // Also summarize unplanned hired positions so actual headcount visibility is 100% live
  activeWorkers.forEach((w) => {
    const proj = safeString(w.assignedProject || w.currentSite, "General");
    const dept = safeString(w.department, "Operations");
    const pos = safeString(w.position || w.trade, "Worker");
    const key = `${norm(proj)}::${norm(dept)}::${norm(pos)}`;
    if (!coveredKeys.has(key)) {
      coveredKeys.add(key);
      const count = activeWorkers.filter(
        (x) =>
          norm(x.assignedProject || x.currentSite || "General") === norm(proj) &&
          norm(x.department || "Operations") === norm(dept) &&
          norm(x.position || x.trade || "Worker") === norm(pos)
      ).length;
      rows.push({
        project: proj,
        department: dept,
        jobPosition: pos,
        approvedManpower: 0,
        actualHired: count,
        remainingVacancies: 0,
        excessCount: count,
      });
    }
  });

  return rows.sort((a, b) => a.project.localeCompare(b.project) || a.jobPosition.localeCompare(b.jobPosition));
}

export interface HrmRoutingUser {
  id?: string;
  uid?: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: UserRole | string;
  status?: string;
  department?: string;
  assignedProject?: string;
}

export interface RecruitmentStageRoutingMeta {
  stepNumber: number;
  departmentLabel: string;
  receiverLabel: string;
  primaryRole: UserRole;
  targetRoles: (UserRole | string)[];
  taskSummaryLabel: string;
}

export function getRecruitmentStageRoutingMeta(
  stage: RecruitmentWorkflowStage
): RecruitmentStageRoutingMeta | null {
  switch (stage) {
    case "Pending HR Manager":
      return {
        stepNumber: 2,
        departmentLabel: "Human Resources Department",
        receiverLabel: "HR Manager",
        primaryRole: UserRole.HR_MANAGER,
        targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
        taskSummaryLabel: "Verify manpower needs, job position & qualifications",
      };
    case "Pending Office Manager":
      return {
        stepNumber: 3,
        departmentLabel: "Office Engineer / Technical Management",
        receiverLabel: "Office Engineer Manager",
        primaryRole: UserRole.OFFICE_MANAGER,
        targetRoles: [UserRole.OFFICE_MANAGER, UserRole.OFFICE_AND_TECHNICAL_ENGINEERING],
        taskSummaryLabel: "Verify manpower requirements & work organization",
      };
    case "Pending Finance Manager":
      return {
        stepNumber: 4,
        departmentLabel: "Finance Department",
        receiverLabel: "Finance Manager",
        primaryRole: UserRole.FINANCE_MANAGER,
        targetRoles: [UserRole.FINANCE_MANAGER],
        taskSummaryLabel: "Verify proposed salary budget & financial capacity",
      };
    case "Pending Operation Department":
      return {
        stepNumber: 5,
        departmentLabel: "Operation Department",
        receiverLabel: "Operation Department",
        primaryRole: UserRole.OPERATION_MANAGER,
        targetRoles: [UserRole.OPERATION_MANAGER],
        taskSummaryLabel: "Verify operational & project site requirements",
      };
    case "Pending Director Final Approval":
    case "Pending Director Excess Approval":
      return {
        stepNumber: 6,
        departmentLabel: "Director / Executive Management",
        receiverLabel: "Director",
        primaryRole: UserRole.DIRECTOR,
        targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE],
        taskSummaryLabel: "Review all department approvals & grant Final Approval",
      };
    default:
      return null;
  }
}

export function resolveAuthorizedUsersForRoles(
  roles: (UserRole | string)[],
  users: HrmRoutingUser[] = []
): { ids: string[]; names: string[]; matchedUsers: HrmRoutingUser[] } {
  const roleSet = new Set(roles.map((r) => String(r).trim().toLowerCase()));
  const seenIds = new Set<string>();
  const matchedUsers: HrmRoutingUser[] = [];
  const ids: string[] = [];
  const names: string[] = [];

  (users || []).forEach((u) => {
    if (!u) return;
    const isActive = !u.status || String(u.status).toLowerCase() === "active";
    if (!isActive) return;
    const roleNorm = safeString(u.role).trim().toLowerCase();
    if (!roleSet.has(roleNorm)) return;
    const uid = safeString(u.uid || u.id).trim();
    if (!uid || seenIds.has(uid)) return;
    seenIds.add(uid);
    matchedUsers.push(u);
    ids.push(uid);
    names.push(safeString(u.displayName || u.name, String(u.role || uid)));
  });

  return { ids, names, matchedUsers };
}

export function generateNextRecruitmentRequestNo(
  existingRequests: RecruitmentRequestRecord[] = [],
  year = new Date().getFullYear()
): string {
  const used = new Set<string>();
  let maxSeq = 0;
  const regex = new RegExp(`MRF-${year}-(\\d+)`, "i");
  (existingRequests || []).forEach((r) => {
    if (!r) return;
    const code = safeString(r.requestNo).trim().toUpperCase();
    if (code) {
      used.add(code);
      const m = code.match(regex);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
  });
  let seq = Math.max(maxSeq + 1, (existingRequests || []).length + 1, 1);
  let candidate = `MRF-${year}-${String(seq).padStart(4, "0")}`;
  while (used.has(candidate.toUpperCase())) {
    seq += 1;
    candidate = `MRF-${year}-${String(seq).padStart(4, "0")}`;
  }
  return candidate;
}

export function canRequesterResubmitRecruitmentRequest(params: {
  request: RecruitmentRequestRecord;
  actorUid?: string;
  actorRole: UserRole | string;
}): boolean {
  if (params.request.workflowStage !== "Returned for Correction") return false;
  if (params.actorRole === UserRole.SUPER_ADMIN) return true;
  const uid = safeString(params.actorUid).trim();
  const ownerId = safeString(params.request.requestedById).trim();
  if (!uid || !ownerId) return false;
  return uid === ownerId;
}

function mapRecruitmentDocsToTaskEvidence(
  docs: RecruitmentSupportingDocument[] | undefined,
  defaultUploader: string,
  fallbackTimestamp: string
): ErpTaskEvidence[] {
  return (docs || []).map((d) => ({
    id: d.id,
    name: d.name,
    url: d.url,
    type: "Document",
    uploadedAt: d.uploadedAt || fallbackTimestamp,
    uploadedBy: d.uploadedBy || defaultUploader,
  }));
}

function buildRecruitmentTaskNarrative(
  req: Pick<
    RecruitmentRequestRecord,
    | "requestNo"
    | "project"
    | "department"
    | "jobPosition"
    | "requestedCount"
    | "employmentType"
    | "requiredByDate"
    | "proposedMonthlySalary"
    | "jobResponsibilities"
    | "qualificationsRequired"
    | "experienceRequired"
    | "justification"
    | "exceedsManpowerLimit"
    | "excessCount"
    | "approvalHistory"
  >,
  extraDirective?: string
): { description: string; notes: string } {
  const historyLines = (req.approvalHistory || []).map(
    (h, idx) =>
      `${idx + 1}. [${h.stage}] ${h.decision} by ${h.actorName} (${h.actorRole}) @ ${h.timestamp.slice(0, 10)}${
        h.notes ? ` — "${h.notes}"` : ""
      }`
  );
  const quotaNote = req.exceedsManpowerLimit
    ? `EXCESS ALERT (+${req.excessCount} over quota)`
    : "Within Quota";

  const description = [
    extraDirective ? `Action Required: ${extraDirective}` : "",
    `Request: ${req.requestNo} | ${req.requestedCount}x ${req.jobPosition} (${req.employmentType})`,
    `Project & Dept: ${req.project} / ${req.department} | Expected Date: ${req.requiredByDate} | Proposed Salary: ETB ${Number(req.proposedMonthlySalary || 0).toLocaleString()} | ${quotaNote}`,
    `Responsibilities: ${req.jobResponsibilities || "Not specified"}`,
    `Qualifications & Experience: ${req.qualificationsRequired} | ${req.experienceRequired || "Standard"}`,
    `Reason for Recruitment: ${req.justification}`,
  ]
    .filter(Boolean)
    .join("\n");

  const notes = historyLines.length > 0
    ? `Accumulated Department Verification Comments (${historyLines.length}):\n${historyLines.join("\n")}`
    : `Linked Recruitment Request: ${req.requestNo}`;

  return { description, notes };
}

async function resolveRoutingUsersList(providedUsers?: HrmRoutingUser[]): Promise<HrmRoutingUser[]> {
  if (Array.isArray(providedUsers)) return providedUsers;
  try {
    if (typeof DbService.getUsers === "function") {
      const list = await DbService.getUsers();
      return Array.isArray(list) ? list : [];
    }
  } catch {
    // Fallback cleanly when offline or mocked without getUsers
  }
  return [];
}

async function dispatchRecruitmentStageNotification(params: {
  id: string;
  type: string;
  title: string;
  titleAm: string;
  message: string;
  priority?: "Normal" | "High" | "Critical";
  projectName: string;
  sender: string;
  senderRole: string;
  receiver: string;
  targetRoles: (UserRole | string)[];
  targetUserId?: string;
  targetUserIds?: string[];
  actionTab?: string;
}) {
  const nowIso = new Date().toISOString();
  const basePayload = {
    type: params.type,
    title: params.title,
    titleAm: params.titleAm,
    message: params.message,
    description: params.message,
    category: "HRM Recruitment",
    priority: params.priority || "High",
    status: "Unread",
    projectName: params.projectName,
    sender: params.sender,
    senderRole: params.senderRole,
    receiver: params.receiver,
    targetRoles: params.targetRoles,
    targetUserIds: params.targetUserIds,
    date: nowIso.slice(0, 10),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: Date.now(),
    read: false,
    actionTab: params.actionTab || "hrmEnterprise:recruitment",
  };

  if (params.targetUserIds && params.targetUserIds.length > 1) {
    await DbService.addNotification({
      ...basePayload,
      id: params.id,
      userId: params.targetUserIds[0],
      targetUserId: params.targetUserIds[0],
    }).catch(() => {});
    for (let i = 1; i < params.targetUserIds.length; i += 1) {
      await DbService.addNotification({
        ...basePayload,
        id: `${params.id}-U${i}`,
        userId: params.targetUserIds[i],
        targetUserId: params.targetUserIds[i],
      }).catch(() => {});
    }
    return;
  }

  const resolvedUserId = params.targetUserId ?? params.targetUserIds?.[0];
  await DbService.addNotification({
    ...basePayload,
    id: params.id,
    userId: resolvedUserId,
    targetUserId: resolvedUserId,
  }).catch(() => {});
}

async function closeRecruitmentStageTask(params: {
  taskId?: string;
  tasks?: ErpTask[];
  status: "Completed" | "Rejected";
  actorName: string;
  actorUid?: string;
  nowIso: string;
  completionNotes?: string;
}) {
  if (!params.taskId) return;
  const existingTask = (params.tasks || []).find((t) => t.id === params.taskId);
  const baseTask: ErpTask = existingTask || {
    id: params.taskId,
    taskId: params.taskId,
    taskName: "Recruitment Stage Task",
    description: "",
    projectId: "HRM",
    projectName: "HRM",
    siteName: "HRM",
    assignedToName: params.actorName,
    createdById: params.actorUid || params.actorName,
    createdByName: params.actorName,
    createdAt: params.nowIso,
    dueDate: params.nowIso.slice(0, 10),
    status: params.status,
    priority: "High",
    updatedAt: params.nowIso,
  };
  await DbService.updateTask({
    ...baseTask,
    status: params.status,
    completionPercentage: params.status === "Completed" ? 100 : baseTask.completionPercentage || 0,
    completionDate: params.nowIso.slice(0, 10),
    updatedAt: params.nowIso,
    updatedById: params.actorUid,
    updatedByName: params.actorName,
    notes: params.completionNotes
      ? `${baseTask.notes ? `${baseTask.notes}\n` : ""}${params.completionNotes}`
      : baseTask.notes,
  }).catch(() => {});
}

export async function submitRecruitmentRequestWithManpowerCheck(params: {
  project: string;
  department: string;
  jobPosition: string;
  requestedCount: number;
  employmentType: "Permanent" | "Contract" | "Daily Labourer";
  urgency: "Normal" | "High" | "Critical";
  requiredByDate: string;
  proposedMonthlySalary: number;
  jobResponsibilities?: string;
  experienceRequired?: string;
  qualificationsRequired: string;
  justification: string;
  supportingDocuments?: RecruitmentSupportingDocument[];
  idempotencyKey?: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  manpowerPlans: ManpowerPlanRecord[];
  workers: Worker[];
  existingRequests?: RecruitmentRequestRecord[];
  users?: HrmRoutingUser[];
}): Promise<RecruitmentRequestRecord> {
  const perms = resolveHrmPermissions(params.actorRole);
  if (!perms.canSubmitManpowerRequest) {
    throw new Error(
      `Authorization Error: Role "${params.actorRole}" cannot submit a Manpower Request Form. Only Section Head (or Super Admin) may initiate manpower requests.`
    );
  }
  if (!safeString(params.project).trim() || !safeString(params.department).trim() || !safeString(params.jobPosition).trim()) {
    throw new Error("Project, department, and job position are mandatory.");
  }
  if (Number(params.requestedCount) < 1) {
    throw new Error("Number of employees required must be at least 1.");
  }
  if (!safeString(params.qualificationsRequired).trim() || !safeString(params.justification).trim()) {
    throw new Error("Required qualifications and reason for recruitment are mandatory.");
  }

  // Duplicate submission / idempotency protection
  const norm = (s?: string) => safeString(s).trim().toLowerCase();
  const duplicateRequest = (params.existingRequests || []).find((existing) => {
    if (params.idempotencyKey && existing.idempotencyKey && existing.idempotencyKey === params.idempotencyKey) {
      return true;
    }
    if (existing.status !== "Pending") return false;
    return (
      norm(existing.project) === norm(params.project) &&
      norm(existing.department) === norm(params.department) &&
      norm(existing.jobPosition) === norm(params.jobPosition) &&
      norm(existing.requestedById) === norm(params.actorUid) &&
      Number(existing.requestedCount) === Number(params.requestedCount) &&
      norm(existing.justification) === norm(params.justification)
    );
  });
  if (duplicateRequest) {
    throw new Error(
      `Duplicate submission blocked: An identical active request (${duplicateRequest.requestNo}) is already pending at "${duplicateRequest.workflowStage}".`
    );
  }

  const summaryRows = computeManpowerSummary({
    manpowerPlans: params.manpowerPlans,
    workers: params.workers,
  });

  const matchingRow = summaryRows.find(
    (r) =>
      r.project.toLowerCase() === params.project.toLowerCase() &&
      r.jobPosition.toLowerCase() === params.jobPosition.toLowerCase()
  );

  const approvedSnap = matchingRow?.approvedManpower || 0;
  const hiredSnap = matchingRow?.actualHired || 0;
  const remainingSnap = matchingRow?.remainingVacancies || 0;
  const excessCount = Math.max(0, params.requestedCount - remainingSnap);
  const exceedsLimit = excessCount > 0;

  const nowIso = new Date().toISOString();
  const id = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const reqNo = generateNextRecruitmentRequestNo(params.existingRequests);
  const initialHistory: HrmWorkflowStepLog[] = [
    {
      stage: "Submitted by Section Head",
      actorName: params.actorName,
      actorRole: String(params.actorRole),
      actorUid: params.actorUid,
      decision: "Submitted",
      timestamp: nowIso,
      notes: exceedsLimit
        ? `Exceeds approved manpower (${approvedSnap} approved, ${hiredSnap} hired, requesting ${params.requestedCount})`
        : "Within approved manpower limit",
    },
  ];

  // Lookup authorized active HR Manager users & auto-create Stage 2 task
  const routingUsers = await resolveRoutingUsersList(params.users);
  const stage2Meta = getRecruitmentStageRoutingMeta("Pending HR Manager")!;
  const matchedHr = resolveAuthorizedUsersForRoles(stage2Meta.targetRoles, routingUsers);
  const stage2TaskId = `TSK-REC-S2-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const evidence = mapRecruitmentDocsToTaskEvidence(params.supportingDocuments, params.actorName, nowIso);
  const narrative = buildRecruitmentTaskNarrative(
    {
      requestNo: reqNo,
      project: params.project,
      department: params.department,
      jobPosition: params.jobPosition,
      requestedCount: params.requestedCount,
      employmentType: params.employmentType,
      requiredByDate: params.requiredByDate,
      proposedMonthlySalary: round2(params.proposedMonthlySalary),
      jobResponsibilities: safeString(params.jobResponsibilities).trim(),
      qualificationsRequired: params.qualificationsRequired,
      experienceRequired: safeString(params.experienceRequired).trim(),
      justification: params.justification,
      exceedsManpowerLimit: exceedsLimit,
      excessCount,
      approvalHistory: initialHistory,
    },
    stage2Meta.taskSummaryLabel
  );

  const stage2Task: ErpTask = {
    id: stage2TaskId,
    taskId: `TSK-${reqNo}-STEP2`,
    taskName: `Step 2 (HR Manager): Verify ${reqNo} — ${params.requestedCount}x ${params.jobPosition}`,
    description: narrative.description,
    projectId: params.project,
    projectName: params.project,
    siteName: params.project,
    assignedToId: matchedHr.ids[0],
    assignedToUserIds: matchedHr.ids,
    assignedToName: matchedHr.names.join(", ") || stage2Meta.receiverLabel,
    assignedToRole: stage2Meta.primaryRole,
    createdById: params.actorUid || params.actorName,
    createdByName: params.actorName,
    createdByRole: String(params.actorRole),
    createdAt: nowIso,
    dueDate: params.requiredByDate || nowIso.slice(0, 10),
    status: "Pending",
    priority: params.urgency === "Critical" ? "Critical" : params.urgency === "High" ? "High" : "Medium",
    updatedAt: nowIso,
    category: "HRM Recruitment Approval",
    relatedEvidence: evidence,
    relatedRecruitmentId: id,
    relatedRecruitmentNo: reqNo,
    completionPercentage: 0,
    notes: narrative.notes,
  };
  await DbService.addTask(stage2Task).catch(() => {});

  const record: RecruitmentRequestRecord = {
    id,
    requestNo: reqNo,
    project: params.project,
    department: params.department,
    jobPosition: params.jobPosition,
    requestedCount: params.requestedCount,
    approvedRequestedCount: params.requestedCount,
    excessApprovedAdded: 0,
    hiredCount: 0,
    recruitmentFillStatus: "Open",
    hiredWorkerIds: [],
    hiredEmployeeIds: [],
    idempotencyKey: params.idempotencyKey,
    employmentType: params.employmentType,
    urgency: params.urgency,
    requiredByDate: params.requiredByDate,
    proposedMonthlySalary: round2(params.proposedMonthlySalary),
    jobResponsibilities: safeString(params.jobResponsibilities).trim(),
    experienceRequired: safeString(params.experienceRequired).trim(),
    qualificationsRequired: params.qualificationsRequired,
    justification: params.justification,
    supportingDocuments: params.supportingDocuments || [],
    requestedBy: params.actorName,
    requestedById: params.actorUid,
    requestedByRole: String(params.actorRole),
    workflowStage: "Pending HR Manager",
    status: "Pending",
    exceedsManpowerLimit: exceedsLimit,
    approvedManpowerSnapshot: approvedSnap,
    actualHiredSnapshot: hiredSnap,
    remainingVacanciesSnapshot: remainingSnap,
    excessCount,
    excessApprovalStatus: exceedsLimit ? "Pending Director" : "Not Required",
    hrRegistrationAuthorized: false,
    currentStageTaskId: stage2TaskId,
    currentStageAssigneeIds: matchedHr.ids,
    currentStageAssigneeNames: matchedHr.names.length ? matchedHr.names : [stage2Meta.receiverLabel],
    stageSummary: `Step 2 of 6: Pending ${stage2Meta.receiverLabel}`,
    approvalHistory: initialHistory,
    directorNotifiedAt: exceedsLimit ? nowIso : undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveRecruitmentRequest(record);
  await DbService.addAuditLog({
    id: `AUD-REC-SUB-${record.id}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    userRole: String(params.actorRole),
    action: "HRM_RECRUITMENT_REQUEST_SUBMITTED",
    details: `${reqNo}: Requested ${params.requestedCount}x ${params.jobPosition} for ${params.project}/${params.department}. ${exceedsLimit ? `Exceeds manpower quota by +${excessCount}.` : "Within quota."}`,
    severity: exceedsLimit ? "WARNING" : "INFO",
    category: "HRM Recruitment",
  }).catch(() => {});

  // Automatic Stage 2 routing notification to HR Manager
  await dispatchRecruitmentStageNotification({
    id: `HRM-STAGE-HR-${record.id}`,
    type: "HRM Recruitment Stage Assignment",
    title: `Step 2 Action Required — Verify Recruitment Request ${reqNo}`,
    titleAm: `ደረጃ 2፡ የቅጥር ጥያቄ ${reqNo} ማረጋገጫ ያስፈልጋል`,
    message: `${params.actorName} (${params.actorRole}) submitted ${reqNo} for ${params.requestedCount}x ${params.jobPosition} (${params.project} / ${params.department}). HR Manager must verify manpower needs, job position, and qualifications.`,
    priority: params.urgency === "Critical" ? "Critical" : "High",
    projectName: params.project,
    sender: params.actorName,
    senderRole: String(params.actorRole),
    receiver: "HR Manager",
    targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
    targetUserIds: matchedHr.ids,
    actionTab: "hrmEnterprise:recruitment",
  });

  // Automatic Director alert when recruitment exceeds approved manpower limit
  if (exceedsLimit) {
    const matchedDirs = resolveAuthorizedUsersForRoles(
      [UserRole.DIRECTOR, UserRole.HEAD_OFFICE],
      routingUsers
    );
    await dispatchRecruitmentStageNotification({
      id: `HRM-EXCESS-${record.id}`,
      type: "HRM Excess Manpower Alert",
      title: `Excess Manpower Recruitment Alert: ${params.jobPosition} (${params.project})`,
      titleAm: `ከተፈቀደው የሰው ኃይል ገደብ በላይ የቅጥር ጥያቄ (${params.project})`,
      message: `${reqNo} requests ${params.requestedCount} ${params.jobPosition} staff (${excessCount} above approved limit of ${approvedSnap}). Director alert logged prior to final approval.`,
      priority: "Critical",
      projectName: params.project,
      sender: params.actorName,
      senderRole: String(params.actorRole),
      receiver: "Director & Executive Management",
      targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
      targetUserIds: matchedDirs.ids,
      actionTab: "hrmEnterprise:recruitment",
    });
  }

  return record;
}

export async function advanceRecruitmentApproval(params: {
  request: RecruitmentRequestRecord;
  decision: "Approved" | "Rejected" | "Returned";
  actorName: string;
  actorUid?: string;
  actorRole: UserRole | string;
  notes?: string;
  users?: HrmRoutingUser[];
  tasks?: ErpTask[];
}): Promise<RecruitmentRequestRecord> {
  const { request, decision, actorName, actorUid, actorRole, notes } = params;

  if (request.status !== "Pending") {
    throw new Error(`Cannot act on request ${request.requestNo} because status is already "${request.status}".`);
  }

  if (!canActorApproveRecruitmentStage(actorRole, request.workflowStage)) {
    throw new Error(
      `Sequential workflow rule violation: Role "${actorRole}" is not authorized to act on stage "${request.workflowStage}".`
    );
  }

  const trimmedNotes = safeString(notes).trim();
  if ((decision === "Rejected" || decision === "Returned") && !trimmedNotes) {
    throw new Error(
      decision === "Rejected"
        ? "A rejection reason is mandatory when rejecting a recruitment request."
        : "Correction instructions are mandatory when returning a recruitment request for correction."
    );
  }

  const nowIso = new Date().toISOString();
  const stepLog: HrmWorkflowStepLog = {
    stage: request.workflowStage,
    actorName,
    actorRole: String(actorRole),
    actorUid,
    decision,
    timestamp: nowIso,
    notes: trimmedNotes || undefined,
  };
  const nextHistory = [...(request.approvalHistory || []), stepLog];
  const routingUsers = await resolveRoutingUsersList(params.users);
  const evidence = mapRecruitmentDocsToTaskEvidence(
    request.supportingDocuments,
    request.requestedBy,
    request.createdAt || nowIso
  );

  // Close the active task for the stage just acted upon
  await closeRecruitmentStageTask({
    taskId: request.currentStageTaskId,
    tasks: params.tasks,
    status: decision === "Rejected" ? "Rejected" : "Completed",
    actorName,
    actorUid,
    nowIso,
    completionNotes: `${request.workflowStage} -> ${decision}${trimmedNotes ? `: ${trimmedNotes}` : ""}`,
  });

  if (decision === "Rejected") {
    const rejected: RecruitmentRequestRecord = {
      ...request,
      workflowStage: "Rejected",
      status: "Rejected",
      excessApprovalStatus: request.exceedsManpowerLimit ? "Rejected" : request.excessApprovalStatus,
      hrRegistrationAuthorized: false,
      currentStageTaskId: undefined,
      currentStageAssigneeIds: [],
      currentStageAssigneeNames: [],
      stageSummary: `Rejected at ${request.workflowStage}`,
      rejectionReason: trimmedNotes,
      rejectedBy: actorName,
      rejectedByRole: String(actorRole),
      rejectedAt: nowIso,
      rejectedAtStage: request.workflowStage,
      approvalHistory: nextHistory,
      updatedAt: nowIso,
    };
    await DbService.saveRecruitmentRequest(rejected);

    await dispatchRecruitmentStageNotification({
      id: `HRM-REJ-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Rejected",
      title: `Recruitment Request Rejected: ${request.requestNo}`,
      titleAm: `የቅጥር ጥያቄ ውድቅ ተደርጓል: ${request.requestNo}`,
      message: `${request.requestNo} (${request.jobPosition} - ${request.project}) was rejected at "${request.workflowStage}" by ${actorName} (${actorRole}). Reason: ${trimmedNotes}`,
      priority: "Critical",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: request.requestedBy || "Section Head",
      targetRoles: [request.requestedByRole || UserRole.SECTION_HEAD, UserRole.SECTION_HEAD],
      targetUserId: request.requestedById,
      actionTab: "hrmEnterprise:recruitment",
    });

    return rejected;
  }

  if (decision === "Returned") {
    const correctionTaskId = `TSK-REC-COR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const narrative = buildRecruitmentTaskNarrative(
      { ...request, approvalHistory: nextHistory },
      `Edit & Resubmit returned request (${request.workflowStage} notes: ${trimmedNotes})`
    );
    const correctionTask: ErpTask = {
      id: correctionTaskId,
      taskId: `TSK-${request.requestNo}-CORR`,
      taskName: `Correction Required: ${request.requestNo} — ${request.jobPosition}`,
      description: narrative.description,
      projectId: request.project,
      projectName: request.project,
      siteName: request.project,
      assignedToId: request.requestedById,
      assignedToUserIds: request.requestedById ? [request.requestedById] : [],
      assignedToName: request.requestedBy || "Section Head",
      assignedToRole: request.requestedByRole || UserRole.SECTION_HEAD,
      createdById: actorUid || actorName,
      createdByName: actorName,
      createdByRole: String(actorRole),
      createdAt: nowIso,
      dueDate: request.requiredByDate || nowIso.slice(0, 10),
      status: "Pending",
      priority: "High",
      updatedAt: nowIso,
      category: "HRM Recruitment Correction",
      relatedEvidence: evidence,
      relatedRecruitmentId: request.id,
      relatedRecruitmentNo: request.requestNo,
      completionPercentage: 0,
      notes: narrative.notes,
    };
    await DbService.addTask(correctionTask).catch(() => {});

    const returned: RecruitmentRequestRecord = {
      ...request,
      workflowStage: "Returned for Correction",
      status: "Pending",
      hrRegistrationAuthorized: false,
      currentStageTaskId: correctionTaskId,
      currentStageAssigneeIds: request.requestedById ? [request.requestedById] : [],
      currentStageAssigneeNames: [request.requestedBy || "Section Head"],
      stageSummary: `Returned to ${request.requestedBy || "Section Head"} for Correction`,
      correctionNotes: trimmedNotes,
      returnedBy: actorName,
      returnedByRole: String(actorRole),
      returnedAt: nowIso,
      returnedAtStage: request.workflowStage,
      approvalHistory: nextHistory,
      updatedAt: nowIso,
    };
    await DbService.saveRecruitmentRequest(returned);

    await dispatchRecruitmentStageNotification({
      id: `HRM-RET-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Returned for Correction",
      title: `Correction Requested: ${request.requestNo}`,
      titleAm: `እርማት ተጠይቋል: ${request.requestNo}`,
      message: `${request.requestNo} (${request.jobPosition} - ${request.project}) was returned by ${actorName} (${actorRole}) at "${request.workflowStage}". Notes: ${trimmedNotes}`,
      priority: "High",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: request.requestedBy || "Section Head",
      targetRoles: [request.requestedByRole || UserRole.SECTION_HEAD, UserRole.SECTION_HEAD],
      targetUserId: request.requestedById,
      actionTab: "hrmEnterprise:recruitment",
    });

    return returned;
  }

  let nextStage: RecruitmentWorkflowStage = request.workflowStage;
  let nextStatus: RecruitmentRequestRecord["status"] = "Pending";
  let nextExcessStatus = request.excessApprovalStatus;
  let hrAuthorized = Boolean(request.hrRegistrationAuthorized);
  let onboardingTaskId = request.hrOnboardingTaskId;
  let onboardingTaskCreatedAt = request.hrOnboardingTaskCreatedAt;
  const patch: Partial<RecruitmentRequestRecord> = {};

  switch (request.workflowStage) {
    case "Pending HR Manager":
      patch.hrManagerApproval = stepLog;
      nextStage = "Pending Office Manager";
      break;
    case "Pending Office Manager":
      patch.officeManagerApproval = stepLog;
      nextStage = "Pending Finance Manager";
      break;
    case "Pending Finance Manager":
      patch.financeManagerApproval = stepLog;
      nextStage = "Pending Operation Department";
      break;
    case "Pending Operation Department":
      patch.operationApproval = stepLog;
      nextStage = "Pending Director Final Approval";
      break;
    case "Pending Director Final Approval":
      patch.directorFinalApproval = stepLog;
      if (request.exceedsManpowerLimit) {
        patch.directorExcessApproval = stepLog;
        nextExcessStatus = "Approved";
      }
      nextStage = "Approved";
      nextStatus = "Approved";
      hrAuthorized = true;
      break;
    case "Pending Director Excess Approval":
      patch.directorExcessApproval = stepLog;
      nextExcessStatus = "Approved";
      nextStage = "Approved";
      nextStatus = "Approved";
      hrAuthorized = true;
      break;
    default:
      throw new Error(`Stage "${request.workflowStage}" cannot be advanced sequentially.`);
  }

  let nextStageTaskId: string | undefined;
  let nextStageAssigneeIds: string[] = [];
  let nextStageAssigneeNames: string[] = [];
  let stageSummary = "";

  // Auto-create next department approval task for Steps 3, 4, 5, and 6
  const nextMeta = getRecruitmentStageRoutingMeta(nextStage);
  if (nextMeta) {
    const matchedNext = resolveAuthorizedUsersForRoles(nextMeta.targetRoles, routingUsers);
    nextStageAssigneeIds = matchedNext.ids;
    nextStageAssigneeNames = matchedNext.names.length ? matchedNext.names : [nextMeta.receiverLabel];
    nextStageTaskId = `TSK-REC-S${nextMeta.stepNumber}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    stageSummary = `Step ${nextMeta.stepNumber} of 6: Pending ${nextMeta.receiverLabel}`;

    const narrative = buildRecruitmentTaskNarrative(
      { ...request, approvalHistory: nextHistory },
      `Step ${nextMeta.stepNumber} (${nextMeta.receiverLabel}): ${nextMeta.taskSummaryLabel}`
    );

    const stageTask: ErpTask = {
      id: nextStageTaskId,
      taskId: `TSK-${request.requestNo}-STEP${nextMeta.stepNumber}`,
      taskName: `Step ${nextMeta.stepNumber} (${nextMeta.receiverLabel}): ${request.requestNo} — ${request.requestedCount}x ${request.jobPosition}`,
      description: narrative.description,
      projectId: request.project,
      projectName: request.project,
      siteName: request.project,
      assignedToId: matchedNext.ids[0],
      assignedToUserIds: matchedNext.ids,
      assignedToName: matchedNext.names.join(", ") || nextMeta.receiverLabel,
      assignedToRole: nextMeta.primaryRole,
      createdById: actorUid || actorName,
      createdByName: actorName,
      createdByRole: String(actorRole),
      createdAt: nowIso,
      dueDate: request.requiredByDate || nowIso.slice(0, 10),
      status: "Pending",
      priority: request.urgency === "Critical" ? "Critical" : request.urgency === "High" ? "High" : "Medium",
      updatedAt: nowIso,
      category: "HRM Recruitment Approval",
      relatedEvidence: evidence,
      relatedRecruitmentId: request.id,
      relatedRecruitmentNo: request.requestNo,
      completionPercentage: 0,
      notes: narrative.notes,
    };
    await DbService.addTask(stageTask).catch(() => {});
  }

  // Automatic Stage 7 Task Generation & HR Registration Authorization ONLY upon Director Final Approval
  if (nextStage === "Approved") {
    const matchedHr = resolveAuthorizedUsersForRoles([UserRole.HR_MANAGER, UserRole.HR], routingUsers);
    nextStageAssigneeIds = matchedHr.ids;
    nextStageAssigneeNames = matchedHr.names.length ? matchedHr.names : ["HR Manager"];
    stageSummary = "Approved by Director — Authorized for HR Employee Registration";

    if (!onboardingTaskId) {
      const taskCode = `TSK-HRM-${request.requestNo}`;
      onboardingTaskId = `TSK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      onboardingTaskCreatedAt = nowIso;
      const narrative = buildRecruitmentTaskNarrative(
        { ...request, approvalHistory: nextHistory },
        `Complete HR Employee Registration for ${request.requestedCount}x ${request.jobPosition}`
      );
      const hrTask: ErpTask = {
        id: onboardingTaskId,
        taskId: taskCode,
        taskName: `Register Approved Employee(s): ${request.jobPosition} (${request.requestedCount}) — ${request.requestNo}`,
        description: `Director final approval granted for ${request.requestNo} (${request.project} / ${request.department}). HR Manager is authorized to complete employee registration.\n${narrative.description}`,
        projectId: request.project,
        projectName: request.project,
        siteName: request.project,
        assignedToId: matchedHr.ids[0],
        assignedToUserIds: matchedHr.ids,
        assignedToName: matchedHr.names.join(", ") || "HR Manager",
        assignedToRole: UserRole.HR_MANAGER,
        createdById: actorUid || actorName,
        createdByName: actorName,
        createdByRole: String(actorRole),
        createdAt: nowIso,
        dueDate: request.requiredByDate || nowIso.slice(0, 10),
        status: "Pending",
        priority: request.urgency === "Critical" ? "Critical" : request.urgency === "High" ? "High" : "Medium",
        updatedAt: nowIso,
        category: "HRM Employee Registration",
        relatedEvidence: evidence,
        relatedRecruitmentId: request.id,
        relatedRecruitmentNo: request.requestNo,
        completionPercentage: 0,
        notes: narrative.notes,
      };
      await DbService.addTask(hrTask).catch(() => {});
    }
    nextStageTaskId = onboardingTaskId;
  }

  const updated: RecruitmentRequestRecord = {
    ...request,
    ...patch,
    workflowStage: nextStage,
    status: nextStatus,
    excessApprovalStatus: nextExcessStatus,
    hrRegistrationAuthorized: hrAuthorized,
    approvedRequestedCount:
      nextStage === "Approved"
        ? request.approvedRequestedCount ?? request.requestedCount
        : request.approvedRequestedCount,
    recruitmentFillStatus:
      nextStage === "Approved"
        ? (request.hiredCount || 0) >= request.requestedCount
          ? "Filled"
          : (request.hiredCount || 0) > 0
          ? "Partially Filled"
          : "Open"
        : request.recruitmentFillStatus,
    remainingVacanciesSnapshot:
      nextStage === "Approved"
        ? Math.max(0, request.requestedCount - (request.hiredCount || 0))
        : request.remainingVacanciesSnapshot,
    hiredWorkerIds: request.hiredWorkerIds || [],
    hiredEmployeeIds: request.hiredEmployeeIds || [],
    hrOnboardingTaskId: onboardingTaskId,
    hrOnboardingTaskCreatedAt: onboardingTaskCreatedAt,
    currentStageTaskId: nextStageTaskId,
    currentStageAssigneeIds: nextStageAssigneeIds,
    currentStageAssigneeNames: nextStageAssigneeNames,
    stageSummary,
    approvalHistory: nextHistory,
    updatedAt: nowIso,
  };

  await DbService.saveRecruitmentRequest(updated);
  await DbService.addAuditLog({
    id: `AUD-REC-STG-${request.id}-${Date.now()}`,
    timestamp: nowIso,
    userId: actorUid || actorName,
    userName: actorName,
    role: actorRole,
    userRole: String(actorRole),
    action: `HRM_RECRUITMENT_${decision.toUpperCase()}`,
    details: `${request.requestNo}: Stage "${request.workflowStage}" -> "${nextStage}" (${decision}). ${trimmedNotes || "No remarks"}`,
    severity: "INFO",
    category: "HRM Recruitment",
  }).catch(() => {});

  // Dispatch automatic notifications to the next approver or final stakeholders
  if (nextStage === "Pending Office Manager") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-OFF-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 3 Action Required — Office Engineer Manager Review: ${request.requestNo}`,
      titleAm: `ደረጃ 3፡ የቢሮ ምህንድስና አስተዳዳሪ ማረጋገጫ (${request.requestNo})`,
      message: `HR Manager verified ${request.requestNo} (${request.jobPosition}, ${request.project}). Verify manpower requirements and work organization.`,
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Office Engineer Manager",
      targetRoles: [UserRole.OFFICE_MANAGER, UserRole.OFFICE_AND_TECHNICAL_ENGINEERING],
      targetUserIds: nextStageAssigneeIds,
      actionTab: "hrmEnterprise:recruitment",
    });
  } else if (nextStage === "Pending Finance Manager") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-FIN-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 4 Action Required — Finance Budget Verification: ${request.requestNo}`,
      titleAm: `ደረጃ 4፡ የፋይናንስ በጀት ማረጋገጫ (${request.requestNo})`,
      message: `Office Engineer Manager verified ${request.requestNo}. Verify salary budget (ETB ${request.proposedMonthlySalary}/head x ${request.requestedCount}) and financial capacity.`,
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Finance Manager",
      targetRoles: [UserRole.FINANCE_MANAGER],
      targetUserIds: nextStageAssigneeIds,
      actionTab: "hrmEnterprise:recruitment",
    });
  } else if (nextStage === "Pending Operation Department") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-OPS-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 5 Action Required — Operation Department Review: ${request.requestNo}`,
      titleAm: `ደረጃ 5፡ የኦፕሬሽን ክፍል ማረጋገጫ (${request.requestNo})`,
      message: `Finance Manager verified salary budget for ${request.requestNo}. Verify operational and project requirements.`,
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Operation Department",
      targetRoles: [UserRole.OPERATION_MANAGER],
      targetUserIds: nextStageAssigneeIds,
      actionTab: "hrmEnterprise:recruitment",
    });
  } else if (nextStage === "Pending Director Final Approval") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-DIR-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 6 Action Required — Director Final Approval: ${request.requestNo}`,
      titleAm: `ደረጃ 6፡ የዳይሬክተር የመጨረሻ ውሳኔ (${request.requestNo})`,
      message: `All 4 prior department checks completed (HR, Office Engineer, Finance, Operation) for ${request.requestNo} (${request.requestedCount}x ${request.jobPosition}). Review prior comments and documents for Director Final Approval.`,
      priority: request.exceedsManpowerLimit ? "Critical" : "High",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Director",
      targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE],
      targetUserIds: nextStageAssigneeIds,
      actionTab: "hrmEnterprise:recruitment",
    });
  } else if (nextStage === "Approved") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-HRREG-${request.id}-${Date.now()}`,
      type: "HRM Employee Registration Authorized",
      title: `Step 7 Authorized — Register Employee(s) for ${request.requestNo}`,
      titleAm: `ደረጃ 7፡ ዳይሬክተሩ አጽድቋል — የሠራተኛ ምዝገባ ተፈቅዷል (${request.requestNo})`,
      message: `Director gave final approval for ${request.requestNo}. An Employee Registration task (${onboardingTaskId}) is assigned to HR Manager to register ${request.requestedCount}x ${request.jobPosition}.`,
      priority: "High",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "HR Manager",
      targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
      targetUserIds: nextStageAssigneeIds,
      actionTab: "hrmEnterprise:recruitment",
    });
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-REQAPP-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Final Approved",
      title: `Recruitment Request Approved by Director: ${request.requestNo}`,
      titleAm: `የቅጥር ጥያቄ በዳይሬክተር ጸድቋል: ${request.requestNo}`,
      message: `Your request ${request.requestNo} (${request.requestedCount}x ${request.jobPosition} for ${request.project}) received final Director approval. HR Manager has been tasked to register the employee(s).`,
      priority: "Normal",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: request.requestedBy || "Section Head",
      targetRoles: [request.requestedByRole || UserRole.SECTION_HEAD, UserRole.SECTION_HEAD],
      targetUserId: request.requestedById,
      actionTab: "hrmEnterprise:recruitment",
    });
  }

  return updated;
}

export async function resubmitReturnedRecruitmentRequest(params: {
  request: RecruitmentRequestRecord;
  updates: Partial<
    Pick<
      RecruitmentRequestRecord,
      | "project"
      | "department"
      | "jobPosition"
      | "requestedCount"
      | "employmentType"
      | "urgency"
      | "requiredByDate"
      | "proposedMonthlySalary"
      | "jobResponsibilities"
      | "experienceRequired"
      | "qualificationsRequired"
      | "justification"
      | "supportingDocuments"
    >
  >;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  manpowerPlans: ManpowerPlanRecord[];
  workers: Worker[];
  notes?: string;
  users?: HrmRoutingUser[];
  tasks?: ErpTask[];
}): Promise<RecruitmentRequestRecord> {
  const { request, updates } = params;
  if (request.workflowStage !== "Returned for Correction") {
    throw new Error(`Only requests in "Returned for Correction" stage can be resubmitted (current: ${request.workflowStage}).`);
  }
  if (!canRequesterResubmitRecruitmentRequest({ request, actorUid: params.actorUid, actorRole: params.actorRole })) {
    throw new Error(
      `Authorization Error: Only original requester "${request.requestedBy}" (or Super Admin) may edit and resubmit returned request ${request.requestNo}.`
    );
  }

  const nextProject = updates.project ?? request.project;
  const nextDepartment = updates.department ?? request.department;
  const nextPosition = updates.jobPosition ?? request.jobPosition;
  const nextCount = Number(updates.requestedCount ?? request.requestedCount);
  const nextEmpType = updates.employmentType ?? request.employmentType;
  const nextUrgency = updates.urgency ?? request.urgency;
  const nextReqDate = updates.requiredByDate ?? request.requiredByDate;
  const nextSalary = Number(updates.proposedMonthlySalary ?? request.proposedMonthlySalary);
  const nextResponsibilities = updates.jobResponsibilities ?? request.jobResponsibilities;
  const nextExperience = updates.experienceRequired ?? request.experienceRequired;
  const nextQualifications = updates.qualificationsRequired ?? request.qualificationsRequired;
  const nextJustification = updates.justification ?? request.justification;
  const nextDocs = updates.supportingDocuments ?? request.supportingDocuments ?? [];

  const summaryRows = computeManpowerSummary({
    manpowerPlans: params.manpowerPlans,
    workers: params.workers,
  });
  const matchingRow = summaryRows.find(
    (r) =>
      r.project.toLowerCase() === nextProject.toLowerCase() &&
      r.jobPosition.toLowerCase() === nextPosition.toLowerCase()
  );
  const approvedSnap = matchingRow?.approvedManpower || 0;
  const hiredSnap = matchingRow?.actualHired || 0;
  const remainingSnap = matchingRow?.remainingVacancies || 0;
  const excessCount = Math.max(0, nextCount - remainingSnap);
  const exceedsLimit = excessCount > 0;

  const nowIso = new Date().toISOString();
  const resubLog: HrmWorkflowStepLog = {
    stage: "Returned for Correction",
    actorName: params.actorName,
    actorRole: String(params.actorRole),
    actorUid: params.actorUid,
    decision: "Resubmitted",
    timestamp: nowIso,
    notes: safeString(params.notes).trim() || "Section Head updated details and resubmitted into workflow.",
  };
  const nextHistory = [...(request.approvalHistory || []), resubLog];

  // Close the Correction task
  await closeRecruitmentStageTask({
    taskId: request.currentStageTaskId,
    tasks: params.tasks,
    status: "Completed",
    actorName: params.actorName,
    actorUid: params.actorUid,
    nowIso,
    completionNotes: resubLog.notes,
  });

  // Create fresh Stage 2 task for HR Manager with updated specs + docs + preserved history
  const routingUsers = await resolveRoutingUsersList(params.users);
  const stage2Meta = getRecruitmentStageRoutingMeta("Pending HR Manager")!;
  const matchedHr = resolveAuthorizedUsersForRoles(stage2Meta.targetRoles, routingUsers);
  const nextStageTaskId = `TSK-REC-RESUB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const evidence = mapRecruitmentDocsToTaskEvidence(nextDocs, params.actorName, nowIso);
  const narrative = buildRecruitmentTaskNarrative(
    {
      requestNo: request.requestNo,
      project: nextProject,
      department: nextDepartment,
      jobPosition: nextPosition,
      requestedCount: nextCount,
      employmentType: nextEmpType,
      requiredByDate: nextReqDate,
      proposedMonthlySalary: nextSalary,
      jobResponsibilities: nextResponsibilities,
      qualificationsRequired: nextQualifications,
      experienceRequired: nextExperience,
      justification: nextJustification,
      exceedsManpowerLimit: exceedsLimit,
      excessCount,
      approvalHistory: nextHistory,
    },
    `Resubmitted After Correction — Step 2 (${stage2Meta.receiverLabel}): ${stage2Meta.taskSummaryLabel}`
  );
  const stage2Task: ErpTask = {
    id: nextStageTaskId,
    taskId: `TSK-${request.requestNo}-R${(request.resubmittedCount || 0) + 1}`,
    taskName: `Resubmitted Step 2 (HR Manager): ${request.requestNo} — ${nextCount}x ${nextPosition}`,
    description: narrative.description,
    projectId: nextProject,
    projectName: nextProject,
    siteName: nextProject,
    assignedToId: matchedHr.ids[0],
    assignedToUserIds: matchedHr.ids,
    assignedToName: matchedHr.names.join(", ") || stage2Meta.receiverLabel,
    assignedToRole: stage2Meta.primaryRole,
    createdById: params.actorUid || params.actorName,
    createdByName: params.actorName,
    createdByRole: String(params.actorRole),
    createdAt: nowIso,
    dueDate: nextReqDate || nowIso.slice(0, 10),
    status: "Pending",
    priority: nextUrgency === "Critical" ? "Critical" : nextUrgency === "High" ? "High" : "Medium",
    updatedAt: nowIso,
    category: "HRM Recruitment Approval",
    relatedEvidence: evidence,
    relatedRecruitmentId: request.id,
    relatedRecruitmentNo: request.requestNo,
    completionPercentage: 0,
    notes: narrative.notes,
  };
  await DbService.addTask(stage2Task).catch(() => {});

  const updated: RecruitmentRequestRecord = {
    ...request,
    ...updates,
    project: nextProject,
    department: nextDepartment,
    jobPosition: nextPosition,
    requestedCount: nextCount,
    employmentType: nextEmpType,
    urgency: nextUrgency,
    requiredByDate: nextReqDate,
    proposedMonthlySalary: nextSalary,
    jobResponsibilities: nextResponsibilities,
    experienceRequired: nextExperience,
    qualificationsRequired: nextQualifications,
    justification: nextJustification,
    supportingDocuments: nextDocs,
    workflowStage: "Pending HR Manager",
    status: "Pending",
    exceedsManpowerLimit: exceedsLimit,
    approvedManpowerSnapshot: approvedSnap,
    actualHiredSnapshot: hiredSnap,
    remainingVacanciesSnapshot: remainingSnap,
    excessCount,
    excessApprovalStatus: exceedsLimit ? "Pending Director" : "Not Required",
    hrRegistrationAuthorized: false,
    currentStageTaskId: nextStageTaskId,
    currentStageAssigneeIds: matchedHr.ids,
    currentStageAssigneeNames: matchedHr.names.length ? matchedHr.names : [stage2Meta.receiverLabel],
    stageSummary: `Resubmitted — Step 2 of 6: Pending ${stage2Meta.receiverLabel}`,
    resubmittedAt: nowIso,
    resubmittedCount: (request.resubmittedCount || 0) + 1,
    approvalHistory: nextHistory,
    updatedAt: nowIso,
  };

  await DbService.saveRecruitmentRequest(updated);

  await dispatchRecruitmentStageNotification({
    id: `HRM-RESUBMIT-${request.id}-${Date.now()}`,
    type: "HRM Recruitment Resubmitted",
    title: `Resubmitted After Correction: ${request.requestNo}`,
    titleAm: `ከእርማት በኋላ እንደገና የቀረበ የቅጥር ጥያቄ: ${request.requestNo}`,
    message: `${params.actorName} revised and resubmitted ${request.requestNo} (${nextCount}x ${nextPosition}). Ready for HR Manager re-verification.`,
    priority: "High",
    projectName: nextProject,
    sender: params.actorName,
    senderRole: String(params.actorRole),
    receiver: "HR Manager",
    targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
    targetUserIds: matchedHr.ids,
    actionTab: "hrmEnterprise:recruitment",
  });

  return updated;
}

export function getRecruitmentFillStatus(req: Pick<RecruitmentRequestRecord, "requestedCount" | "hiredCount">): {
  approvedQty: number;
  registeredCount: number;
  remainingVacancies: number;
  fillStatus: "Open" | "Partially Filled" | "Filled";
} {
  const approvedQty = Math.max(0, Number(req.requestedCount || 0));
  const registeredCount = Math.max(0, Number(req.hiredCount || 0));
  const remainingVacancies = Math.max(0, approvedQty - registeredCount);
  const fillStatus: "Open" | "Partially Filled" | "Filled" =
    registeredCount >= approvedQty && approvedQty > 0
      ? "Filled"
      : registeredCount > 0
      ? "Partially Filled"
      : "Open";
  return { approvedQty, registeredCount, remainingVacancies, fillStatus };
}

export function normalizePhoneForDuplicateCheck(phone?: string): string {
  const digits = safeString(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("251") && digits.length >= 12) return digits.slice(3);
  if (digits.startsWith("0") && digits.length >= 10) return digits.slice(1);
  return digits;
}

export async function checkDuplicateEmployeeRegistration(params: {
  employeeId?: string;
  phoneNumber?: string;
  faydaId?: string;
  nationalId?: string;
  name?: string;
  dateOfBirth?: string;
  ignoreWorkerId?: string;
  existingWorkers: Worker[];
  existingPrivateProfiles?: HrmPrivateProfileRecord[];
}): Promise<{ isDuplicate: boolean; reason?: string; matchedWorkerId?: string; field?: string }> {
  const targetEmpId = safeString(params.employeeId).trim().toUpperCase();
  const targetPhoneNorm = normalizePhoneForDuplicateCheck(params.phoneNumber);
  const targetNameNorm = safeString(params.name).trim().replace(/\s+/g, " ").toLowerCase();
  const targetDob = safeString(params.dateOfBirth).trim();
  const [faydaHash, nationalHash, phoneHash] = await Promise.all([
    hashSensitiveIdentifier(params.faydaId),
    hashSensitiveIdentifier(params.nationalId),
    targetPhoneNorm ? hashSensitiveIdentifier(targetPhoneNorm) : Promise.resolve(""),
  ]);

  for (const w of params.existingWorkers || []) {
    if (!w || (params.ignoreWorkerId && w.id === params.ignoreWorkerId)) continue;
    const wEmp = safeString(w.employeeId || w.id).trim().toUpperCase();
    if (targetEmpId && (wEmp === targetEmpId || safeString(w.id).trim().toUpperCase() === targetEmpId)) {
      return {
        isDuplicate: true,
        field: "employeeId",
        matchedWorkerId: w.id,
        reason: `Duplicate Employee ID blocked: ${targetEmpId} is already assigned to ${w.name}.`,
      };
    }
    const wPhoneNorm = normalizePhoneForDuplicateCheck(w.phoneNumber);
    if (targetPhoneNorm && wPhoneNorm && targetPhoneNorm === wPhoneNorm) {
      return {
        isDuplicate: true,
        field: "phoneNumber",
        matchedWorkerId: w.id,
        reason: `Duplicate phone number blocked: "${params.phoneNumber}" already belongs to ${w.name} (${w.employeeId || w.id}).`,
      };
    }
    const wNameNorm = safeString(w.name).trim().replace(/\s+/g, " ").toLowerCase();
    const wDob = safeString(w.dateOfBirth).trim();
    if (targetNameNorm && targetDob && wNameNorm === targetNameNorm && wDob === targetDob) {
      return {
        isDuplicate: true,
        field: "name+dateOfBirth",
        matchedWorkerId: w.id,
        reason: `Duplicate employee blocked: "${w.name}" (DOB ${wDob}) is already registered as ${w.employeeId || w.id}.`,
      };
    }
  }

  for (const prof of params.existingPrivateProfiles || []) {
    if (!prof || (params.ignoreWorkerId && prof.workerId === params.ignoreWorkerId)) continue;
    if (faydaHash && prof.faydaIdHash && prof.faydaIdHash === faydaHash) {
      return {
        isDuplicate: true,
        field: "faydaId",
        matchedWorkerId: prof.workerId,
        reason: `Duplicate Fayda ID blocked: This Fayda ID is already registered to employee ${prof.employeeId || prof.workerId}.`,
      };
    }
    if (nationalHash && prof.nationalIdHash && prof.nationalIdHash === nationalHash) {
      return {
        isDuplicate: true,
        field: "nationalId",
        matchedWorkerId: prof.workerId,
        reason: `Duplicate National ID blocked: This ID is already registered to employee ${prof.employeeId || prof.workerId}.`,
      };
    }
    if (phoneHash && prof.phoneNormalizedHash && prof.phoneNormalizedHash === phoneHash) {
      return {
        isDuplicate: true,
        field: "phoneNumber",
        matchedWorkerId: prof.workerId,
        reason: `Duplicate phone number blocked: Phone matches existing private profile for ${prof.employeeId || prof.workerId}.`,
      };
    }
  }

  return { isDuplicate: false };
}

export function validateEmployeeRegistrationAuthorization(params: {
  role: UserRole | string;
  recruitmentRequest?: RecruitmentRequestRecord | null;
}): {
  allowed: boolean;
  reason?: string;
  excessDetected?: boolean;
  approvedQty: number;
  registeredCount: number;
  remainingVacancies: number;
} {
  const perms = resolveHrmPermissions(params.role);
  const req = params.recruitmentRequest;
  const stats = req
    ? getRecruitmentFillStatus(req)
    : { approvedQty: 0, registeredCount: 0, remainingVacancies: 0, fillStatus: "Open" as const };

  if (!perms.canRegisterApprovedEmployees) {
    return {
      allowed: false,
      excessDetected: false,
      ...stats,
      reason:
        "Employee registration is strictly restricted to HR Manager / HR after Director final approval.",
    };
  }
  if (!req) {
    return {
      allowed: false,
      excessDetected: false,
      ...stats,
      reason:
        "A Director-approved Manpower Recruitment Request is required before registering a new employee.",
    };
  }
  const isApprovedOrFulfilled =
    (req.workflowStage === "Approved" || req.workflowStage === "Fulfilled") &&
    (req.status === "Approved" || req.status === "Fulfilled") &&
    Boolean(req.hrRegistrationAuthorized);

  if (!isApprovedOrFulfilled) {
    return {
      allowed: false,
      excessDetected: false,
      ...stats,
      reason: `Cannot register employee: Request ${req.requestNo} is at stage "${req.workflowStage}" and has not received Director final approval.`,
    };
  }
  if (stats.registeredCount >= stats.approvedQty) {
    return {
      allowed: false,
      excessDetected: true,
      ...stats,
      reason: `Excess Recruitment Blocked: All ${stats.approvedQty} Director-approved positions in ${req.requestNo} (${stats.registeredCount}/${stats.approvedQty}) are already registered. Submit an Additional Excess Approval Request to Director before registering more employees.`,
    };
  }
  return { allowed: true, excessDetected: false, ...stats };
}

export function generateNextExcessRecruitmentRequestNo(
  existingExcessRequests: ExcessRecruitmentRequestRecord[] = [],
  year = new Date().getFullYear()
): string {
  const used = new Set<string>();
  let maxSeq = 0;
  const regex = new RegExp(`ERR-${year}-(\\d+)`, "i");
  (existingExcessRequests || []).forEach((r) => {
    if (!r) return;
    const code = safeString(r.requestNo).trim().toUpperCase();
    if (code) {
      used.add(code);
      const m = code.match(regex);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxSeq) maxSeq = n;
      }
    }
  });
  let seq = Math.max(maxSeq + 1, (existingExcessRequests || []).length + 1, 1);
  let candidate = `ERR-${year}-${String(seq).padStart(4, "0")}`;
  while (used.has(candidate.toUpperCase())) {
    seq += 1;
    candidate = `ERR-${year}-${String(seq).padStart(4, "0")}`;
  }
  return candidate;
}

export async function recordExcessRegistrationAttemptAlert(params: {
  recruitmentRequest: RecruitmentRequestRecord;
  candidateName?: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  users?: HrmRoutingUser[];
}): Promise<void> {
  const req = params.recruitmentRequest;
  const nowIso = new Date().toISOString();
  const routingUsers = await resolveRoutingUsersList(params.users);
  const matchedDirs = resolveAuthorizedUsersForRoles(
    [UserRole.DIRECTOR, UserRole.HEAD_OFFICE],
    routingUsers
  );
  const candidateLabel = safeString(params.candidateName).trim()
    ? ` for candidate "${safeString(params.candidateName).trim()}"`
    : "";

  await DbService.addAuditLog({
    id: `AUD-ERR-BLK-${req.id}-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    userRole: String(params.actorRole),
    action: "HRM_EXCESS_REGISTRATION_BLOCKED",
    details: `Blocked attempt by ${params.actorName} to register employee${candidateLabel} beyond Director-approved quantity (${req.hiredCount || 0}/${req.requestedCount}) on ${req.requestNo} (${req.jobPosition} - ${req.project}).`,
    severity: "CRITICAL",
    category: "HRM Recruitment",
  }).catch(() => {});

  await dispatchRecruitmentStageNotification({
    id: `HRM-ERR-BLK-${req.id}-${Date.now()}`,
    type: "HRM Excess Recruitment Attempt Blocked",
    title: `EXCESS REGISTRATION BLOCKED — ${req.requestNo}`,
    titleAm: `ከተፈቀደው ብዛት በላይ የሠራተኛ ምዝገባ ታግዷል — ${req.requestNo}`,
    message: `${params.actorName} attempted to register${candidateLabel} beyond Director-approved manpower (${req.hiredCount || 0}/${req.requestedCount}) for ${req.requestNo} (${req.jobPosition}, ${req.project}). Registration was automatically blocked pending Director Excess Approval.`,
    priority: "Critical",
    projectName: req.project,
    sender: params.actorName,
    senderRole: String(params.actorRole),
    receiver: "Director",
    targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
    targetUserIds: matchedDirs.ids,
    actionTab: "hrmEnterprise:recruitment",
  });
}

export async function submitExcessRecruitmentRequest(params: {
  recruitmentRequest: RecruitmentRequestRecord;
  excessCount: number;
  justification: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  existingExcessRequests?: ExcessRecruitmentRequestRecord[];
  users?: HrmRoutingUser[];
}): Promise<ExcessRecruitmentRequestRecord> {
  const perms = resolveHrmPermissions(params.actorRole);
  if (!perms.canRegisterApprovedEmployees) {
    throw new Error(
      `Authorization Error: Role "${params.actorRole}" cannot submit an Excess Recruitment Approval Request. Only HR Manager (or Super Admin) may request excess hiring.`
    );
  }
  const req = params.recruitmentRequest;
  if (req.status !== "Approved" && req.status !== "Fulfilled" && req.workflowStage !== "Approved" && req.workflowStage !== "Fulfilled") {
    throw new Error(
      `Cannot submit excess request: ${req.requestNo} must first receive Director Final Approval.`
    );
  }
  const count = Math.floor(Number(params.excessCount || 0));
  if (count < 1) {
    throw new Error("Excess employee count must be at least 1.");
  }
  const reason = safeString(params.justification).trim();
  if (!reason) {
    throw new Error("Justification is mandatory when requesting excess recruitment approval.");
  }
  if (reason.length > 1000) {
    throw new Error("Justification cannot exceed 1000 characters.");
  }

  const dupPending = (params.existingExcessRequests || []).find(
    (e) =>
      e.recruitmentRequestId === req.id &&
      e.status === "Pending Director" &&
      Number(e.excessCount) === count &&
      safeString(e.justification).trim().toLowerCase() === reason.toLowerCase()
  );
  if (dupPending) {
    throw new Error(
      `Duplicate excess request blocked: ${dupPending.requestNo} is already pending Director approval.`
    );
  }

  const nowIso = new Date().toISOString();
  const id = `ERR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const reqNo = generateNextExcessRecruitmentRequestNo(params.existingExcessRequests);
  const routingUsers = await resolveRoutingUsersList(params.users);
  const matchedDirs = resolveAuthorizedUsersForRoles(
    [UserRole.DIRECTOR, UserRole.HEAD_OFFICE],
    routingUsers
  );

  const dirTaskId = `TSK-ERR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const dirTask: ErpTask = {
    id: dirTaskId,
    taskId: `TSK-${reqNo}`,
    taskName: `Excess Recruitment Approval (${reqNo}): +${count}x ${req.jobPosition} (${req.project})`,
    description: `HR Manager (${params.actorName}) attempted/requested registration beyond Director-approved quantity for ${req.requestNo} (${req.hiredCount || 0}/${req.requestedCount} filled). Additional requested: +${count}. Justification: ${reason}`,
    projectId: req.project,
    projectName: req.project,
    siteName: req.project,
    assignedToId: matchedDirs.ids[0],
    assignedToUserIds: matchedDirs.ids,
    assignedToName: matchedDirs.names.join(", ") || "Director",
    assignedToRole: UserRole.DIRECTOR,
    createdById: params.actorUid,
    createdByName: params.actorName,
    createdByRole: String(params.actorRole),
    createdAt: nowIso,
    dueDate: nowIso.slice(0, 10),
    status: "Pending",
    priority: "Critical",
    updatedAt: nowIso,
    category: "HRM Excess Recruitment Approval",
    relatedRecruitmentId: req.id,
    relatedRecruitmentNo: req.requestNo,
    completionPercentage: 0,
    notes: `Linked Request: ${req.requestNo} | Excess Request: ${reqNo} | Requested Additional Qty: +${count}`,
  };
  await DbService.addTask(dirTask).catch(() => {});

  const initialLog: HrmWorkflowStepLog = {
    stage: "Excess Recruitment Request Submitted",
    actorName: params.actorName,
    actorRole: String(params.actorRole),
    actorUid: params.actorUid,
    decision: "Submitted",
    timestamp: nowIso,
    notes: `Requested +${count} excess position(s) beyond approved ${req.requestedCount}. Justification: ${reason}`,
  };

  const excessRecord: ExcessRecruitmentRequestRecord = {
    id,
    requestNo: reqNo,
    recruitmentRequestId: req.id,
    recruitmentRequestNo: req.requestNo,
    project: req.project,
    department: req.department,
    jobPosition: req.jobPosition,
    approvedQuantitySnapshot: req.requestedCount,
    registeredCountSnapshot: req.hiredCount || 0,
    excessCount: count,
    justification: reason,
    requestedBy: params.actorName,
    requestedById: params.actorUid,
    requestedByRole: String(params.actorRole),
    status: "Pending Director",
    directorTaskId: dirTaskId,
    auditHistory: [initialLog],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveExcessRecruitmentRequest(excessRecord);

  // Append excess status + audit note onto parent recruitment request
  await DbService.saveRecruitmentRequest({
    ...req,
    exceedsManpowerLimit: true,
    excessApprovalStatus: "Pending Director",
    directorNotifiedAt: nowIso,
    approvalHistory: [...(req.approvalHistory || []), initialLog],
    updatedAt: nowIso,
  });

  await DbService.addAuditLog({
    id: `AUD-ERR-SUB-${id}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    userRole: String(params.actorRole),
    action: "HRM_EXCESS_RECRUITMENT_REQUESTED",
    details: `${reqNo} (+${count}x ${req.jobPosition} on ${req.requestNo}, ${req.project}): ${reason}`,
    severity: "CRITICAL",
    category: "HRM Recruitment",
  }).catch(() => {});

  await dispatchRecruitmentStageNotification({
    id: `HRM-ERR-DIR-${id}`,
    type: "HRM Excess Recruitment Alert",
    title: `EXCESS RECRUITMENT ALERT — Director Approval Required: ${reqNo}`,
    titleAm: `ከተፈቀደው ብዛት በላይ የቅጥር ማንቂያ — የዳይሬክተር ፈቃድ ያስፈልጋል (${reqNo})`,
    message: `HR attempted registration beyond approved quantity (${req.hiredCount || 0}/${req.requestedCount}) for ${req.requestNo} (${req.jobPosition} - ${req.project}). Normal registration is BLOCKED. Excess request ${reqNo} (+${count}) requires Director approval.`,
    priority: "Critical",
    projectName: req.project,
    sender: params.actorName,
    senderRole: String(params.actorRole),
    receiver: "Director",
    targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
    targetUserIds: matchedDirs.ids,
    actionTab: "hrmEnterprise:recruitment",
  });

  return excessRecord;
}

export async function decideExcessRecruitmentRequest(params: {
  excessRequest: ExcessRecruitmentRequestRecord;
  recruitmentRequest: RecruitmentRequestRecord;
  decision: "Approved" | "Rejected";
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  notes?: string;
  users?: HrmRoutingUser[];
}): Promise<{ updatedExcess: ExcessRecruitmentRequestRecord; updatedRecruitment: RecruitmentRequestRecord }> {
  const perms = resolveHrmPermissions(params.actorRole);
  if (!perms.canApproveDirectorStage) {
    throw new Error(
      `Authorization Error: Role "${params.actorRole}" cannot approve/reject Excess Recruitment Requests. ONLY Director may decide excess requests.`
    );
  }
  const notes = safeString(params.notes).trim();
  if (params.decision === "Rejected" && !notes) {
    throw new Error("Decision comments are mandatory when rejecting an Excess Recruitment Request.");
  }
  if (notes.length > 1000) {
    throw new Error("Decision comments cannot exceed 1000 characters.");
  }

  const nowIso = new Date().toISOString();
  const auditLog: AuditLog = {
    id: `AUD-ERR-DEC-${params.excessRequest.id}-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    userRole: String(params.actorRole),
    action: params.decision === "Approved" ? "HRM_EXCESS_RECRUITMENT_APPROVED" : "HRM_EXCESS_RECRUITMENT_REJECTED",
    details: `${params.excessRequest.requestNo} (+${params.excessRequest.excessCount} on ${params.excessRequest.recruitmentRequestNo}): ${params.decision}. ${notes || "Approved by Director"}`,
    severity: params.decision === "Approved" ? "WARNING" : "INFO",
    category: "HRM Recruitment",
  };

  const result = await DbService.decideExcessRecruitmentAtomic({
    excessRequest: params.excessRequest,
    recruitmentRequest: params.recruitmentRequest,
    decision: params.decision,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    notes: notes || (params.decision === "Approved" ? "Director approved excess recruitment capacity." : "Rejected"),
    auditLog,
  });

  const routingUsers = await resolveRoutingUsersList(params.users);
  const matchedHr = resolveAuthorizedUsersForRoles([UserRole.HR_MANAGER, UserRole.HR], routingUsers);

  await dispatchRecruitmentStageNotification({
    id: `HRM-ERR-RES-${params.excessRequest.id}-${Date.now()}`,
    type:
      params.decision === "Approved"
        ? "HRM Excess Recruitment Approved"
        : "HRM Excess Recruitment Rejected",
    title: `Excess Recruitment ${params.decision}: ${params.excessRequest.requestNo}`,
    titleAm:
      params.decision === "Approved"
        ? `ተጨማሪ የቅጥር ጥያቄ በዳይሬክተር ጸድቋል: ${params.excessRequest.requestNo}`
        : `ተጨማሪ የቅጥር ጥያቄ ውድቅ ተደርጓል: ${params.excessRequest.requestNo}`,
    message:
      params.decision === "Approved"
        ? `Director (${params.actorName}) approved +${params.excessRequest.excessCount} excess position(s) for ${params.excessRequest.recruitmentRequestNo}. Authorized qty is now ${result.updatedRecruitment.requestedCount}. HR Manager may finalize registration.`
        : `Director (${params.actorName}) rejected excess request ${params.excessRequest.requestNo} (+${params.excessRequest.excessCount}) for ${params.excessRequest.recruitmentRequestNo}. Excess registration remains BLOCKED. Reason: ${notes}`,
    priority: params.decision === "Approved" ? "High" : "Critical",
    projectName: params.excessRequest.project,
    sender: params.actorName,
    senderRole: String(params.actorRole),
    receiver: "HR Manager",
    targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
    targetUserId: params.excessRequest.requestedById,
    targetUserIds: matchedHr.ids,
    actionTab: "hrmEnterprise:recruitment",
  });

  return result;
}

export async function registerApprovedEmployeeFromRecruitment(params: {
  recruitmentRequest: RecruitmentRequestRecord;
  worker: Worker;
  privateProfile: HrmPrivateProfileRecord;
  existingWorkers: Worker[];
  existingPrivateProfiles?: HrmPrivateProfileRecord[];
  manpowerPlans: ManpowerPlanRecord[];
  tasks: ErpTask[];
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
}): Promise<{ updatedRequest: RecruitmentRequestRecord; exceededManpowerAlert: boolean }> {
  const authCheck = validateEmployeeRegistrationAuthorization({
    role: params.actorRole,
    recruitmentRequest: params.recruitmentRequest,
  });
  if (!authCheck.allowed) {
    throw new Error(authCheck.reason || "Not authorized to register employee from recruitment request.");
  }

  const dupCheck = await checkDuplicateEmployeeRegistration({
    employeeId: params.worker.employeeId || params.worker.id,
    phoneNumber: params.worker.phoneNumber,
    faydaId: params.privateProfile.faydaIdEncrypted ? undefined : params.worker.faydaId,
    nationalId: params.privateProfile.nationalIdEncrypted ? undefined : params.worker.nationalId,
    name: params.worker.name,
    dateOfBirth: params.worker.dateOfBirth,
    existingWorkers: params.existingWorkers,
    existingPrivateProfiles: params.existingPrivateProfiles,
  });
  // Also match deterministic hashes directly against existingPrivateProfiles
  if (dupCheck.isDuplicate) {
    throw new Error(dupCheck.reason || "Duplicate employee registration blocked.");
  }
  for (const prof of params.existingPrivateProfiles || []) {
    if (
      params.privateProfile.faydaIdHash &&
      prof.faydaIdHash &&
      prof.faydaIdHash === params.privateProfile.faydaIdHash
    ) {
      throw new Error(
        `Duplicate Fayda ID blocked: Already registered to ${prof.employeeId || prof.workerId}.`
      );
    }
    if (
      params.privateProfile.nationalIdHash &&
      prof.nationalIdHash &&
      prof.nationalIdHash === params.privateProfile.nationalIdHash
    ) {
      throw new Error(
        `Duplicate National ID blocked: Already registered to ${prof.employeeId || prof.workerId}.`
      );
    }
    if (
      params.privateProfile.phoneNormalizedHash &&
      prof.phoneNormalizedHash &&
      prof.phoneNormalizedHash === params.privateProfile.phoneNormalizedHash
    ) {
      throw new Error(
        `Duplicate phone number blocked: Matches existing employee ${prof.employeeId || prof.workerId}.`
      );
    }
  }

  const nowIso = new Date().toISOString();
  const onboardingTask = params.recruitmentRequest.hrOnboardingTaskId
    ? params.tasks.find((t) => t.id === params.recruitmentRequest.hrOnboardingTaskId)
    : undefined;

  const auditLog: AuditLog = {
    id: `AUD-EMP-REG-${params.worker.id}-${Date.now()}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole,
    userRole: String(params.actorRole),
    action: "HRM_EMPLOYEE_REGISTERED_FROM_REQUEST",
    details: `Registered ${params.worker.name} (${params.worker.employeeId || params.worker.id}) under ${params.recruitmentRequest.requestNo} (${params.worker.assignedProject} / ${params.worker.department} / ${params.worker.position}).`,
    severity: "INFO",
    category: "HRM Recruitment",
  };

  const workerWithLink: Worker = {
    ...params.worker,
    recruitmentRequestId: params.recruitmentRequest.id,
  };

  const updatedRequest = await DbService.registerApprovedEmployeeAtomic({
    recruitmentRequest: params.recruitmentRequest,
    worker: workerWithLink,
    privateProfile: params.privateProfile,
    auditLog,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    onboardingTask,
  });

  const summaryRows = computeManpowerSummary({
    manpowerPlans: params.manpowerPlans,
    workers: [workerWithLink, ...params.existingWorkers],
  });
  const matched = summaryRows.find(
    (r) =>
      r.project.toLowerCase() === params.recruitmentRequest.project.toLowerCase() &&
      r.jobPosition.toLowerCase() === params.recruitmentRequest.jobPosition.toLowerCase()
  );
  const exceededManpowerAlert = Boolean(matched && matched.excessCount > 0);
  if (exceededManpowerAlert && matched) {
    await dispatchRecruitmentStageNotification({
      id: `HRM-HIRE-EXCESS-${params.recruitmentRequest.id}-${Date.now()}`,
      type: "HRM Excess Manpower Alert",
      title: `Actual Headcount Exceeds Approved Manpower (${matched.project})`,
      titleAm: `የተቀጠሩ ሠራተኞች ብዛት ከተፈቀደው የሰው ኃይል ገደብ አልፏል (${matched.project})`,
      message: `Registering ${workerWithLink.name} (${workerWithLink.employeeId || workerWithLink.id}) brought active ${matched.jobPosition} count to ${matched.actualHired} against approved quota ${matched.approvedManpower} (+${matched.excessCount} excess).`,
      priority: "Critical",
      projectName: matched.project,
      sender: params.actorName,
      senderRole: String(params.actorRole),
      receiver: "Director & Executive Management",
      targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
    });
  }

  return { updatedRequest, exceededManpowerAlert };
}

export async function completeApprovedEmployeeOnboarding(params: {
  recruitmentRequest: RecruitmentRequestRecord;
  newWorker: Worker;
  manpowerPlans: ManpowerPlanRecord[];
  allWorkersAfterAdd: Worker[];
  tasks: ErpTask[];
  actorName: string;
  actorRole: UserRole | string;
}): Promise<{ updatedRequest: RecruitmentRequestRecord; exceededManpowerAlert: boolean }> {
  const nowIso = new Date().toISOString();
  const req = params.recruitmentRequest;
  const currentHired = Number(req.hiredCount || 0);
  if (currentHired >= Number(req.requestedCount || 0)) {
    throw new Error(
      `EXCESS_QUOTA_EXCEEDED: Approved manpower quantity (${req.requestedCount}) for ${req.requestNo} is already filled.`
    );
  }
  const nextHired = currentHired + 1;
  const isFulfilled = nextHired >= req.requestedCount;
  const remaining = Math.max(0, req.requestedCount - nextHired);

  const updatedRequest: RecruitmentRequestRecord = {
    ...req,
    hiredCount: nextHired,
    remainingVacanciesSnapshot: remaining,
    recruitmentFillStatus: isFulfilled ? "Filled" : "Partially Filled",
    hiredWorkerIds: [...(req.hiredWorkerIds || []), params.newWorker.id],
    hiredEmployeeIds: [...(req.hiredEmployeeIds || []), params.newWorker.employeeId || params.newWorker.id],
    status: isFulfilled ? "Fulfilled" : "Approved",
    workflowStage: isFulfilled ? "Fulfilled" : "Approved",
    updatedAt: nowIso,
  };
  await DbService.saveRecruitmentRequest(updatedRequest);

  if (req.hrOnboardingTaskId) {
    const existingTask = params.tasks.find((t) => t.id === req.hrOnboardingTaskId);
    if (existingTask) {
      await DbService.updateTask({
        ...existingTask,
        status: isFulfilled ? "Completed" : "In Progress",
        completionPercentage: Math.min(100, Math.round((nextHired / Math.max(1, req.requestedCount)) * 100)),
        completionDate: isFulfilled ? nowIso.slice(0, 10) : existingTask.completionDate,
        updatedAt: nowIso,
        updatedByName: params.actorName,
      }).catch(() => {});
    }
  }

  // Connect actual hired headcount against approved manpower & alert Director if exceeded
  const summaryRows = computeManpowerSummary({
    manpowerPlans: params.manpowerPlans,
    workers: params.allWorkersAfterAdd,
  });
  const matched = summaryRows.find(
    (r) =>
      r.project.toLowerCase() === req.project.toLowerCase() &&
      r.jobPosition.toLowerCase() === req.jobPosition.toLowerCase()
  );
  const exceededManpowerAlert = Boolean(matched && matched.excessCount > 0);
  if (exceededManpowerAlert && matched) {
    await dispatchRecruitmentStageNotification({
      id: `HRM-HIRE-EXCESS-${req.id}-${Date.now()}`,
      type: "HRM Excess Manpower Alert",
      title: `Actual Headcount Exceeds Approved Manpower (${matched.project})`,
      titleAm: `የተቀጠሩ ሠራተኞች ብዛት ከተፈቀደው የሰው ኃይል ገደብ አልፏል (${matched.project})`,
      message: `Registering ${params.newWorker.name} (${params.newWorker.employeeId || params.newWorker.id}) brought active ${matched.jobPosition} count to ${matched.actualHired} against approved quota ${matched.approvedManpower} (+${matched.excessCount} excess).`,
      priority: "Critical",
      projectName: matched.project,
      sender: params.actorName,
      senderRole: String(params.actorRole),
      receiver: "Director & Executive Management",
      targetRoles: [UserRole.DIRECTOR, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
    });
  }

  return { updatedRequest, exceededManpowerAlert };
}

export function validateNoDuplicateSalaryPayment(params: {
  payPeriod: string;
  workerIds: string[];
  existingRuns: HrmPayrollRunRecord[];
  ignoreRunId?: string;
}): { valid: boolean; duplicateWorkers: string[] } {
  const paidOrApprovedKeys = new Set<string>();
  params.existingRuns.forEach((run) => {
    if (params.ignoreRunId && run.id === params.ignoreRunId) return;
    if (run.workflowStage === "Rejected") return;
    // Duplicate salary protection applies once approved or paid (or active non-draft run for same period)
    if (
      run.workflowStage === "Paid" ||
      run.workflowStage === "Approved for Payment" ||
      run.workflowStage === "Pending Director" ||
      run.workflowStage === "Pending Operation Manager" ||
      run.workflowStage === "Pending Finance Manager"
    ) {
      run.items.forEach((item) => {
        paidOrApprovedKeys.add(item.uniquePayKey || `${run.payPeriod}::${item.workerId}`);
      });
    }
  });

  const duplicateWorkers = params.workerIds.filter((wid) =>
    paidOrApprovedKeys.has(`${params.payPeriod}::${wid}`)
  );
  return { valid: duplicateWorkers.length === 0, duplicateWorkers };
}

export function buildHrmPayrollRunDraft(params: {
  payPeriod: string;
  projectScope: string;
  workers: Worker[];
  attendance: AttendanceRecord[];
  overtimeRequests: OvertimeRequestRecord[];
  leaveRequests: LeaveRequestRecord[];
  salaryStructures: SalaryStructureRecord[];
  loans: SalaryAdvanceLoanRecord[];
  taxConfig?: EthiopianTaxPensionConfig;
  deductionPolicy?: AttendanceDeductionPolicy;
  enforceStrictApprovedAttendance?: boolean;
  existingRuns: HrmPayrollRunRecord[];
  actorName: string;
  actorUid: string;
}): HrmPayrollRunRecord {
  const targetWorkers = params.workers.filter((w) => {
    if (w.status !== "Active") return false;
    if (params.projectScope === "ALL") return true;
    return safeString(w.assignedProject || w.currentSite).toLowerCase() === params.projectScope.toLowerCase();
  });

  const dupCheck = validateNoDuplicateSalaryPayment({
    payPeriod: params.payPeriod,
    workerIds: targetWorkers.map((w) => w.id),
    existingRuns: params.existingRuns,
  });

  const eligibleWorkers = dupCheck.valid
    ? targetWorkers
    : targetWorkers.filter((w) => !dupCheck.duplicateWorkers.includes(w.id));

  if (eligibleWorkers.length === 0) {
    throw new Error(
      dupCheck.duplicateWorkers.length > 0
        ? `Duplicate salary payment blocked: all active workers in ${params.projectScope} already have an approved/paid run for ${params.payPeriod}.`
        : "No active employees match the selected project scope."
    );
  }

  let totalApprovedAttendanceRecordsUsed = 0;
  let totalUnapprovedAttendanceRecordsExcluded = 0;
  const activePolicy = params.deductionPolicy?.isApproved ? params.deductionPolicy : undefined;

  const isAttendanceRecordFinalApproved = (a: AttendanceRecord): boolean => {
    if (a.finalApprovalStatus) {
      return a.finalApprovalStatus === "Approved";
    }
    if (params.enforceStrictApprovedAttendance) {
      return false;
    }
    return a.hrReviewStatus === "Approved";
  };

  const countLeaveDaysInMonth = (w: Worker, empCode: string, unpaidOnly: boolean): number => {
    const monthStart = `${params.payPeriod}-01`;
    const [yy, mm] = params.payPeriod.split("-").map(Number);
    const lastDay = yy && mm ? new Date(Date.UTC(yy, mm, 0)).getUTCDate() : 30;
    const monthEnd = `${params.payPeriod}-${String(lastDay).padStart(2, "0")}`;

    return params.leaveRequests
      .filter((lv) => {
        if (lv.status !== "Approved") return false;
        if (lv.workerId !== w.id && lv.employeeId !== empCode) return false;
        const isUnpaid = lv.leaveType === "Unpaid Leave";
        if (unpaidOnly !== isUnpaid) return false;
        return lv.startDate <= monthEnd && lv.endDate >= monthStart;
      })
      .reduce((sum, lv) => {
        const s = lv.startDate > monthStart ? lv.startDate : monthStart;
        const e = lv.endDate < monthEnd ? lv.endDate : monthEnd;
        if (s > e) return sum;
        const d1 = new Date(`${s}T12:00:00Z`).getTime();
        const d2 = new Date(`${e}T12:00:00Z`).getTime();
        return sum + Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
      }, 0);
  };

  const structureById = new Map(params.salaryStructures.map((s) => [s.id, s]));
  const items: HrmPayrollLineItem[] = eligibleWorkers.map((w) => {
    const empCode = safeString((w as any).employeeId, w.id);
    const structure = w.salaryStructureId ? structureById.get(w.salaryStructureId) : undefined;
    const basicSalary = round2(
      Number(w.basicMonthlySalary) ||
        structure?.basicSalary ||
        (w.hourlyRate ? w.hourlyRate * 208 : 650 * 26)
    );
    const allowances = round2(
      (Number(w.housingAllowance) || structure?.housingAllowance || 0) +
        (Number(w.transportAllowance) || structure?.transportAllowance || 0) +
        (Number(w.positionAllowance) || structure?.positionAllowance || 0) +
        (Number(w.medicalAllowance) || structure?.medicalAllowance || 0)
    );

    const periodAtt = params.attendance.filter(
      (a) =>
        (a.workerId === w.id || a.workerId === empCode) &&
        (!a.date || a.date.startsWith(params.payPeriod))
    );
    const approvedAtt = periodAtt.filter(isAttendanceRecordFinalApproved);
    const unapprovedAttCount = periodAtt.length - approvedAtt.length;
    totalApprovedAttendanceRecordsUsed += approvedAtt.length;
    totalUnapprovedAttendanceRecordsExcluded += unapprovedAttCount;

    if (params.enforceStrictApprovedAttendance && periodAtt.length > 0 && approvedAtt.length === 0) {
      throw new Error(
        `Unapproved Attendance Blocked: Employee "${w.name}" has ${periodAtt.length} unapproved attendance record(s) for ${params.payPeriod}. HR Manager final approval is required before payroll finalization.`
      );
    }

    const approvedWorkingDays =
      periodAtt.length > 0
        ? approvedAtt.filter((a) => a.status !== "Absent").length
        : params.enforceStrictApprovedAttendance
        ? 0
        : 26;
    const daysWorked = approvedWorkingDays;
    const lateCount = approvedAtt.filter((a) => a.status === "Late").length;

    const approvedLeaveDays = countLeaveDaysInMonth(w, empCode, false);
    const unpaidLeaveDays = countLeaveDaysInMonth(w, empCode, true);
    const unpaidAbsenceDays = approvedAtt.filter((a) => a.status === "Absent").length;
    const absentDays = unpaidAbsenceDays;

    const regularHours =
      periodAtt.length > 0
        ? round2(approvedAtt.reduce((s, a) => s + (Number(a.workingHours) || 0), 0))
        : round2(daysWorked * 8);

    const approvedOtRecordsForPeriod = params.overtimeRequests.filter(
      (ot) =>
        (ot.workerId === w.id || ot.employeeId === empCode) &&
        ot.status === "Approved" &&
        ot.workDate.startsWith(params.payPeriod)
    );
    const approvedOtDates = new Set(approvedOtRecordsForPeriod.map((ot) => ot.workDate));
    const approvedOtHrsFromRequests = round2(
      approvedOtRecordsForPeriod.reduce(
        (s, ot) => s + Number(ot.hoursRequested || 0) * Number(ot.multiplier || 1.5),
        0
      )
    );
    // Only credit attendance OT from HR Manager-approved records (and do not double count dates already in approved OT requests)
    const attOtHrs = round2(
      approvedAtt
        .filter((a) => !approvedOtDates.has(a.date))
        .reduce((s, a) => s + Number(a.overtime || 0), 0)
    );

    const hourlyRate = w.hourlyRate || round2(basicSalary / 208);
    const overtimePay = round2(
      approvedOtHrsFromRequests * hourlyRate + attOtHrs * hourlyRate * 1.5
    );

    // Company policy-based deductions ONLY when an approved AttendanceDeductionPolicy exists
    let policyAttendanceDeductions = 0;
    if (activePolicy) {
      const stdDays = Math.max(1, Number(activePolicy.standardWorkingDaysPerMonth || 26));
      const dailyWage = basicSalary / stdDays;
      const hourlyWage = dailyWage / 8;
      if (activePolicy.deductUnpaidLeave && unpaidLeaveDays > 0) {
        policyAttendanceDeductions += unpaidLeaveDays * dailyWage;
      }
      if (activePolicy.deductUnexcusedAbsence && unpaidAbsenceDays > 0) {
        policyAttendanceDeductions +=
          unpaidAbsenceDays * dailyWage * Number(activePolicy.absenceDailyMultiplier || 1);
      }
      if (activePolicy.lateDeductionEnabled) {
        const graceMins = Math.max(0, Number(activePolicy.graceMinutesBeforeDeduction || 0));
        const excessLateMins = approvedAtt.reduce(
          (sum, a) => sum + Math.max(0, Number(a.lateArrivalMinutes || 0) - graceMins),
          0
        );
        if (excessLateMins > 0) {
          policyAttendanceDeductions +=
            (excessLateMins / 60) * hourlyWage * Number(activePolicy.lateDeductionHourlyFactor || 1);
        }
      }
      policyAttendanceDeductions = round2(policyAttendanceDeductions);
    }

    const { grossEarnings, taxableIncome, incomeTax, employeePension, employerPension } =
      computeEthiopianIncomeTaxAndPension({
        basicSalary,
        taxableAllowances: allowances,
        overtimePay,
        bonuses: 0,
        pensionEligible: structure ? structure.pensionEligible : true,
        config: params.taxConfig,
      });

    const activeLoanDeduction = round2(
      params.loans
        .filter(
          (ln) =>
            (ln.workerId === w.id || ln.employeeId === empCode) &&
            (ln.status === "Approved" || ln.status === "Active Recovery") &&
            ln.remainingBalance > 0
        )
        .reduce((s, ln) => s + Math.min(ln.remainingBalance, ln.monthlyInstallment || ln.remainingBalance), 0)
    );

    const otherDeductions = policyAttendanceDeductions;
    const totalDeductions = round2(incomeTax + employeePension + activeLoanDeduction + otherDeductions);
    const netPay = round2(Math.max(0, grossEarnings - totalDeductions));

    return {
      workerId: w.id,
      employeeId: empCode,
      workerName: w.name,
      project: safeString(w.assignedProject || w.currentSite, "Corporate / Head Office"),
      department: safeString(w.department, "Operations"),
      position: safeString(w.position || w.trade, "Staff"),
      bankName: safeString(w.bankName, "Commercial Bank of Ethiopia"),
      bankAccountNumber: safeString(w.bankAccountNumber, "Pending Bank Setup"),
      daysWorked,
      approvedWorkingDays,
      approvedLeaveDays,
      unpaidLeaveDays,
      unpaidAbsenceDays,
      absentDays,
      lateCount,
      regularHours,
      approvedOvertimeHours: round2(
        approvedOtRecordsForPeriod.reduce((s, ot) => s + Number(ot.hoursRequested || 0), 0) + attOtHrs
      ),
      basicSalary,
      allowances,
      overtimePay,
      bonuses: 0,
      grossEarnings,
      taxableIncome,
      incomeTax,
      employeePension,
      employerPension,
      advanceLoanDeduction: activeLoanDeduction,
      otherDeductions,
      policyAttendanceDeductions,
      totalDeductions,
      netPay,
      attendanceApprovalGatePassed: periodAtt.length === 0 || unapprovedAttCount === 0,
      uniquePayKey: `${params.payPeriod}::${w.id}`,
    };
  });

  const nowIso = new Date().toISOString();
  const id = `HPR-${params.payPeriod}-${Date.now().toString().slice(-5)}`;
  return {
    id,
    runNo: `PAYRUN-${params.payPeriod}-${id.slice(-4)}`,
    payPeriod: params.payPeriod,
    projectScope: params.projectScope,
    totalEmployees: items.length,
    totalGrossPay: round2(items.reduce((s, i) => s + i.grossEarnings, 0)),
    totalOvertimePay: round2(items.reduce((s, i) => s + i.overtimePay, 0)),
    totalIncomeTax: round2(items.reduce((s, i) => s + i.incomeTax, 0)),
    totalEmployeePension: round2(items.reduce((s, i) => s + i.employeePension, 0)),
    totalEmployerPension: round2(items.reduce((s, i) => s + i.employerPension, 0)),
    totalLoanRecovery: round2(items.reduce((s, i) => s + i.advanceLoanDeduction, 0)),
    totalNetPay: round2(items.reduce((s, i) => s + i.netPay, 0)),
    currency: "ETB",
    items,
    workflowStage: "Pending HR Manager",
    attendanceAuditSummary: {
      approvedRecordsUsed: totalApprovedAttendanceRecordsUsed,
      unapprovedRecordsExcluded: totalUnapprovedAttendanceRecordsExcluded,
      approvedDeductionPolicyApplied: Boolean(activePolicy),
      policyName: activePolicy?.policyName,
    },
    approvalHistory: [
      {
        stage: "Submitted",
        actorName: params.actorName,
        actorRole: "HRM Payroll",
        decision: "Submitted",
        timestamp: nowIso,
        notes: `Generated ${items.length} payroll slips for ${params.payPeriod} (Approved attendance used: ${totalApprovedAttendanceRecordsUsed}, Unapproved excluded: ${totalUnapprovedAttendanceRecordsExcluded})`,
      },
    ],
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function recalculatePayrollRunLineItem(params: {
  run: HrmPayrollRunRecord;
  workerId: string;
  bonuses: number;
  otherDeductions: number;
  taxConfig?: EthiopianTaxPensionConfig;
}): HrmPayrollRunRecord {
  const items = params.run.items.map((item) => {
    if (item.workerId !== params.workerId) return item;
    const bonus = round2(Math.max(0, Number(params.bonuses || 0)));
    const otherDed = round2(Math.max(0, Number(params.otherDeductions || 0)));
    const taxRes = computeEthiopianIncomeTaxAndPension({
      basicSalary: item.basicSalary,
      taxableAllowances: item.allowances,
      overtimePay: item.overtimePay,
      bonuses: bonus,
      config: params.taxConfig,
    });
    const totalDeductions = round2(
      taxRes.incomeTax + taxRes.employeePension + item.advanceLoanDeduction + otherDed
    );
    const netPay = round2(Math.max(0, taxRes.grossEarnings - totalDeductions));
    return {
      ...item,
      bonuses: bonus,
      otherDeductions: otherDed,
      grossEarnings: taxRes.grossEarnings,
      taxableIncome: taxRes.taxableIncome,
      incomeTax: taxRes.incomeTax,
      employeePension: taxRes.employeePension,
      employerPension: taxRes.employerPension,
      totalDeductions,
      netPay,
    };
  });

  return {
    ...params.run,
    items,
    totalGrossPay: round2(items.reduce((s, i) => s + i.grossEarnings, 0)),
    totalOvertimePay: round2(items.reduce((s, i) => s + i.overtimePay, 0)),
    totalIncomeTax: round2(items.reduce((s, i) => s + i.incomeTax, 0)),
    totalEmployeePension: round2(items.reduce((s, i) => s + i.employeePension, 0)),
    totalEmployerPension: round2(items.reduce((s, i) => s + i.employerPension, 0)),
    totalLoanRecovery: round2(items.reduce((s, i) => s + i.advanceLoanDeduction, 0)),
    totalNetPay: round2(items.reduce((s, i) => s + i.netPay, 0)),
    updatedAt: new Date().toISOString(),
  };
}

export async function advancePayrollRunStage(params: {
  run: HrmPayrollRunRecord;
  decision: "Approved" | "Rejected";
  actorName: string;
  actorRole: UserRole | string;
  notes?: string;
}): Promise<HrmPayrollRunRecord> {
  const { run, decision, actorName, actorRole, notes } = params;
  const nowIso = new Date().toISOString();
  const stepLog: HrmWorkflowStepLog = {
    stage: run.workflowStage,
    actorName,
    actorRole: String(actorRole),
    decision,
    timestamp: nowIso,
    notes,
  };

  if (decision === "Rejected") {
    const rej: HrmPayrollRunRecord = {
      ...run,
      workflowStage: "Rejected",
      approvalHistory: [...(run.approvalHistory || []), stepLog],
      updatedAt: nowIso,
    };
    await DbService.saveHrmPayrollRun(rej);
    return rej;
  }

  let nextStage: HrmPayrollRunStage = run.workflowStage;
  const patch: Partial<HrmPayrollRunRecord> = {};

  switch (run.workflowStage) {
    case "Draft":
      nextStage = "Pending HR Manager";
      break;
    case "Pending HR Manager":
      patch.hrManagerApproval = stepLog;
      nextStage = "Pending Finance Manager";
      break;
    case "Pending Finance Manager":
      patch.financeManagerApproval = stepLog;
      nextStage = "Pending Operation Manager";
      break;
    case "Pending Operation Manager":
      patch.operationManagerApproval = stepLog;
      nextStage = "Pending Director";
      break;
    case "Pending Director":
      patch.directorApproval = stepLog;
      nextStage = "Approved for Payment";
      break;
    default:
      break;
  }

  const updated: HrmPayrollRunRecord = {
    ...run,
    ...patch,
    workflowStage: nextStage,
    approvalHistory: [...(run.approvalHistory || []), stepLog],
    updatedAt: nowIso,
  };
  await DbService.saveHrmPayrollRun(updated);
  return updated;
}

export async function disburseApprovedHrmPayrollRun(params: {
  run: HrmPayrollRunRecord;
  account?: FinancialAccount;
  paymentReferenceNo: string;
  paymentDate: string;
  loans: SalaryAdvanceLoanRecord[];
  existingRuns: HrmPayrollRunRecord[];
  workers?: Worker[];
  actorName: string;
  actorRole: UserRole | string;
  actorUid: string;
}): Promise<HrmPayrollRunRecord> {
  if (params.run.workflowStage === "Paid") {
    throw new Error("Duplicate payment blocked: this payroll run is already marked Paid.");
  }
  if (params.run.workflowStage !== "Approved for Payment") {
    throw new Error("Payroll run must complete 4-tier verification (HR → Finance → Operation → Director) before disbursement.");
  }

  const dupCheck = validateNoDuplicateSalaryPayment({
    payPeriod: params.run.payPeriod,
    workerIds: params.run.items.map((i) => i.workerId),
    existingRuns: params.existingRuns,
    ignoreRunId: params.run.id,
  });
  if (!dupCheck.valid) {
    throw new Error(
      `Duplicate salary payment prevented for employees: ${dupCheck.duplicateWorkers.join(", ")} in ${params.run.payPeriod}.`
    );
  }

  const nowIso = new Date().toISOString();
  const dt = params.paymentDate.slice(0, 10);
  const payRef = params.paymentReferenceNo.trim() || `PAY-${params.run.runNo}`;

  // Group project labor allocation -> Expense & ActualCostEntry per project
  const byProject = new Map<string, HrmPayrollLineItem[]>();
  params.run.items.forEach((item) => {
    const arr = byProject.get(item.project) || [];
    arr.push(item);
    byProject.set(item.project, arr);
  });

  const expenseRecords: Expense[] = [];
  const actualCostRecords: ActualCostEntry[] = [];
  const journalLines: JournalEntryLine[] = [];
  let lineNo = 1;

  byProject.forEach((projItems, project) => {
    const grossSum = round2(projItems.reduce((s, i) => s + i.grossEarnings, 0));
    const empPenSum = round2(projItems.reduce((s, i) => s + i.employerPension, 0));
    const netSum = round2(projItems.reduce((s, i) => s + i.netPay, 0));
    const totalLaborCost = round2(grossSum + empPenSum);

    const expId = `EXP-HRM-${params.run.id}-${project.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`;
    expenseRecords.push({
      id: expId,
      payableId: expId,
      referenceNo: payRef,
      billNumber: payRef,
      category: "Labor",
      payableCategory: "Employee Payables",
      subtotalAmount: totalLaborCost,
      taxAmount: 0,
      amount: totalLaborCost,
      paidAmount: totalLaborCost,
      date: dt,
      invoiceDate: dt,
      dueDate: dt,
      project,
      department: "Human Resources",
      costCenter: "Site Construction",
      vendor: `Payroll Employees (${projItems.length})`,
      description: `Verified HRM Payroll ${params.run.runNo} (${params.run.payPeriod}) — Gross + 11% Employer Pension`,
      status: "Paid",
      workflowStage: "Paid",
      paymentMethod: "Bank Transfer",
      createdBy: params.actorName,
      createdById: params.actorUid,
      approvedBy: params.actorName,
      approvedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    actualCostRecords.push({
      id: `COST-HRM-${params.run.id}-${project.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`,
      costTransactionId: payRef,
      projectName: project,
      budgetCategory: "Labor Costs",
      sourceModule: "Payroll",
      sourceRecordId: params.run.id,
      supplierOrPayee: `${projItems.length} Project Employees`,
      invoiceNumber: payRef,
      costDescription: `HRM Payroll Labor Cost (${params.run.payPeriod})`,
      quantity: projItems.length,
      unitPrice: projItems.length > 0 ? round2(totalLaborCost / projItems.length) : totalLaborCost,
      totalCost: totalLaborCost,
      paidAmount: totalLaborCost,
      transactionDate: dt,
      recordedBy: params.actorName,
      verificationStatus: "Validated",
      verifiedBy: params.actorName,
      validatedBy: params.actorName,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Debit Direct Labor Expense per project
    journalLines.push({
      lineNo: lineNo++,
      accountCode: "5020",
      accountName: "Direct Labor & Site Payroll",
      accountType: "Cost of Construction",
      subType: "Direct Construction Cost",
      debit: totalLaborCost,
      credit: 0,
      memo: `Payroll Gross + 11% Employer Pension (${projItems.length} staff)`,
      project,
      department: "Human Resources",
    });
  });

  // Credit side of Double-Entry GL Voucher:
  // Credit Bank/Cash for Net Pay Disbursed
  if (params.run.totalNetPay > 0) {
    journalLines.push({
      lineNo: lineNo++,
      accountCode: params.account?.accountType === "Cash" ? "1010" : "1020",
      accountName: params.account?.accountName || "Main Construction Bank Account",
      accountType: "Asset",
      subType: "Current Asset",
      debit: 0,
      credit: params.run.totalNetPay,
      memo: `Net Salary Bank Transfer (${payRef})`,
      project: params.run.projectScope,
      department: "Finance",
    });
  }

  // Credit Tax & Statutory Pension Payable (Income Tax + 7% Emp Pension + 11% Er Pension)
  const statutoryPayable = round2(
    params.run.totalIncomeTax + params.run.totalEmployeePension + params.run.totalEmployerPension
  );
  if (statutoryPayable > 0) {
    journalLines.push({
      lineNo: lineNo++,
      accountCode: "2030",
      accountName: "Taxes & Statutory Dues Payable",
      accountType: "Liability",
      subType: "Current Liability",
      debit: 0,
      credit: statutoryPayable,
      memo: `Ethiopian Income Tax (${formatPlain(params.run.totalIncomeTax)}) + Pension 7%/11%`,
      project: params.run.projectScope,
      department: "Finance",
    });
  }

  // Credit Employee Advances / Loan Recovery (Staff Receivables 1190 / 1110)
  if (params.run.totalLoanRecovery > 0) {
    journalLines.push({
      lineNo: lineNo++,
      accountCode: "1110",
      accountName: "Accounts Receivable & Staff Loan Recovery",
      accountType: "Asset",
      subType: "Current Asset",
      debit: 0,
      credit: params.run.totalLoanRecovery,
      memo: `Salary Advance & Employee Loan Recovery (${params.run.payPeriod})`,
      project: params.run.projectScope,
      department: "Finance",
    });
  }

  const totalDr = round2(journalLines.reduce((s, l) => s + l.debit, 0));
  const totalCr = round2(journalLines.reduce((s, l) => s + l.credit, 0));
  // Guard rounding difference <= 0.05
  if (Math.abs(totalDr - totalCr) > 0.001 && journalLines.length > 0) {
    const diff = round2(totalDr - totalCr);
    journalLines[journalLines.length - 1].credit = round2(journalLines[journalLines.length - 1].credit + diff);
  }
  const finalTotalDr = round2(journalLines.reduce((s, l) => s + l.debit, 0));
  const finalTotalCr = round2(journalLines.reduce((s, l) => s + l.credit, 0));

  const journalEntry: JournalEntryRecord = {
    id: `JE-HRM-${params.run.id}`,
    journalNo: `JV-PAY-${params.run.payPeriod}-${params.run.id.slice(-4)}`,
    entryDate: dt,
    fiscalYear: dt.slice(0, 4),
    periodMonth: dt.slice(0, 7),
    project: params.run.projectScope,
    department: "Human Resources",
    referenceNo: payRef,
    description: `HRM Payroll Run ${params.run.runNo} (${params.run.payPeriod}) — ${params.run.totalEmployees} Employees`,
    entryType: "Auto-Sync",
    sourceModule: "HRM Payroll",
    sourceRecordId: params.run.id,
    sourceKey: `HRMPAY:${params.run.id}`,
    uniqueTransactionKey: `HRMPAY::${params.run.id}`,
    isImmutable: true,
    lines: journalLines,
    totalDebit: finalTotalDr,
    totalCredit: finalTotalCr,
    isBalanced: Math.abs(finalTotalDr - finalTotalCr) <= 0.01,
    status: "Posted",
    preparedBy: params.actorName,
    preparedById: params.actorUid,
    approvedBy: params.actorName,
    approvedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const bankTx: BankTransactionRecord | undefined = params.account
    ? {
        id: `BTX-HRM-${params.run.id}`,
        transactionNo: `BNK-PAY-${params.run.id.slice(-5)}`,
        transactionDate: dt,
        valueDate: dt,
        transactionType: "Salary Payments",
        direction: "Debit",
        accountId: params.account.id,
        accountName: params.account.accountName,
        accountNumber: params.account.accountNumber,
        amount: params.run.totalNetPay,
        currency: params.run.currency || "ETB",
        project: params.run.projectScope,
        department: "Human Resources",
        counterparty: `${params.run.totalEmployees} Payroll Employees`,
        referenceNo: payRef,
        paymentMethod: "Bank Transfer",
        description: `HRM Payroll Disbursement ${params.run.runNo} (${params.run.payPeriod})`,
        sourceChannel: "Payroll",
        linkedDocumentType: "Payroll",
        linkedDocumentId: params.run.id,
        linkedReferenceNo: params.run.runNo,
        approvalStatus: "Approved",
        reconciliationStatus: "Unreconciled",
        recordedBy: params.actorName,
        createdBy: params.actorName,
        createdById: params.actorUid,
        approvedBy: params.actorName,
        approvedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : undefined;

  // Update employee loan recovery balances
  const updatedLoans: SalaryAdvanceLoanRecord[] = [];
  params.run.items.forEach((item) => {
    if (item.advanceLoanDeduction <= 0) return;
    let remainingToDeduct = item.advanceLoanDeduction;
    params.loans
      .filter(
        (ln) =>
          (ln.workerId === item.workerId || ln.employeeId === item.employeeId) &&
          (ln.status === "Approved" || ln.status === "Active Recovery") &&
          ln.remainingBalance > 0
      )
      .forEach((ln) => {
        if (remainingToDeduct <= 0) return;
        const deduct = Math.min(ln.remainingBalance, remainingToDeduct);
        remainingToDeduct = round2(remainingToDeduct - deduct);
        const nextRem = round2(ln.remainingBalance - deduct);
        updatedLoans.push({
          ...ln,
          remainingBalance: nextRem,
          totalRecovered: round2((ln.totalRecovered || 0) + deduct),
          status: nextRem <= 0 ? "Settled" : "Active Recovery",
          updatedAt: nowIso,
        });
      });
  });

  const paidRun: HrmPayrollRunRecord = {
    ...params.run,
    workflowStage: "Paid",
    bankAccountId: params.account?.id,
    bankAccountName: params.account?.accountName,
    paymentReferenceNo: payRef,
    paymentDate: dt,
    paidBy: params.actorName,
    glJournalId: journalEntry.id,
    glSyncedAt: nowIso,
    approvalHistory: [
      ...(params.run.approvalHistory || []),
      {
        stage: "Paid & Synced to GL",
        actorName: params.actorName,
        actorRole: String(params.actorRole),
        decision: "Paid",
        timestamp: nowIso,
        notes: `Bank Ref: ${payRef} | GL: ${journalEntry.journalNo}`,
      },
    ],
    updatedAt: nowIso,
  };

  const workerById = new Map((params.workers || []).map((w) => [w.id, w]));
  const payslips: HrmPayslipRecord[] = paidRun.items.map((item) => {
    const matchedWorker = workerById.get(item.workerId);
    return {
      id: `${paidRun.id}_${item.workerId}`,
      runId: paidRun.id,
      runNo: paidRun.runNo,
      payPeriod: paidRun.payPeriod,
      workerId: item.workerId,
      employeeId: item.employeeId,
      workerUserId: matchedWorker?.userId || item.workerId,
      workerName: item.workerName,
      project: item.project,
      department: item.department,
      position: item.position,
      bankName: item.bankName,
      bankAccountMasked: buildMaskedPreview(item.bankAccountNumber) || item.bankAccountNumber,
      workflowStage: "Paid",
      paymentReferenceNo: payRef,
      paymentDate: dt,
      glJournalId: journalEntry.id,
      item,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });

  await DbService.disburseHrmPayrollRunAtomic({
    run: paidRun,
    journalEntry,
    bankTransaction: bankTx,
    account: params.account,
    expenseRecords,
    actualCostRecords,
    updatedLoans,
    payslips,
  });

  return paidRun;
}

const formatPlain = (n: number) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function computeHrmDashboardState(params: {
  workers: Worker[];
  attendance: AttendanceRecord[];
  manpowerPlans: ManpowerPlanRecord[];
  recruitmentRequests: RecruitmentRequestRecord[];
  excessRequests?: ExcessRecruitmentRequestRecord[];
  leaveRequests: LeaveRequestRecord[];
  overtimeRequests: OvertimeRequestRecord[];
  payrollRuns: HrmPayrollRunRecord[];
  loans: SalaryAdvanceLoanRecord[];
  workSchedules: WorkScheduleConfig[];
  filterDateMonth?: string;
}): HrmDashboardState {
  const monthPrefix = params.filterDateMonth || new Date().toISOString().slice(0, 7);
  const manpowerRows = computeManpowerSummary({
    manpowerPlans: params.manpowerPlans,
    workers: params.workers,
  });

  const totalApprovedManpower = manpowerRows.reduce((s, r) => s + r.approvedManpower, 0);
  const totalActualHired = params.workers.filter((w) => w.status === "Active").length;
  const totalRemainingVacancies = manpowerRows.reduce((s, r) => s + r.remainingVacancies, 0);
  const pendingExcessRequestsCount = (params.excessRequests || []).filter(
    (e) => e.status === "Pending Director"
  ).length;
  const excessRecruitmentCount =
    params.recruitmentRequests.filter((r) => r.exceedsManpowerLimit && r.status !== "Rejected").length +
    pendingExcessRequestsCount;

  const approvedOrFulfilledRequests = params.recruitmentRequests.filter(
    (r) =>
      r.status === "Approved" ||
      r.status === "Fulfilled" ||
      r.workflowStage === "Approved" ||
      r.workflowStage === "Fulfilled"
  );
  const totalManpowerRequests = params.recruitmentRequests.length;
  const approvedRecruitmentRequests = approvedOrFulfilledRequests.length;
  const rejectedRecruitmentRequests = params.recruitmentRequests.filter(
    (r) => r.status === "Rejected" || r.workflowStage === "Rejected"
  ).length;
  const returnedRecruitmentRequests = params.recruitmentRequests.filter(
    (r) => r.workflowStage === "Returned for Correction"
  ).length;
  const totalApprovedManpowerQty = approvedOrFulfilledRequests.reduce(
    (s, r) => s + Math.max(0, Number(r.requestedCount || 0)),
    0
  );
  const registeredEmployeesFromRequests = approvedOrFulfilledRequests.reduce(
    (s, r) => s + Math.max(0, Number(r.hiredCount || 0)),
    0
  );
  const remainingRecruitmentVacancies = approvedOrFulfilledRequests.reduce(
    (s, r) => s + Math.max(0, Number(r.requestedCount || 0) - Number(r.hiredCount || 0)),
    0
  );

  const attendanceSummaryRows: HrmAttendanceSummaryRow[] = params.workers.map((w) => {
    const empCode = safeString((w as any).employeeId, w.id);
    const logs = params.attendance.filter(
      (a) => (a.workerId === w.id || a.workerId === empCode) && (!a.date || a.date.startsWith(monthPrefix))
    );
    const presentDays = logs.filter((a) => a.status === "Present" || a.status === "Late").length;
    const lateDays = logs.filter((a) => a.status === "Late").length;
    const absentDays = logs.filter((a) => a.status === "Absent").length;
    const earlyDepartures = logs.filter((a) => Number(a.underTime || 0) > 0).length;
    const leaveDays = params.leaveRequests
      .filter((lv) => (lv.workerId === w.id || lv.employeeId === empCode) && lv.status === "Approved")
      .reduce((s, lv) => s + Number(lv.totalDays || 0), 0);
    const totalHours = round2(logs.reduce((s, a) => s + Number(a.workingHours || 0), 0));
    const approvedOvertimeHours = round2(
      params.overtimeRequests
        .filter((ot) => (ot.workerId === w.id || ot.employeeId === empCode) && ot.status === "Approved")
        .reduce((s, ot) => s + Number(ot.hoursRequested || 0), 0)
    );
    const hasBiometric = Boolean(w.biometricRegistered || w.fingerprint || w.faceRecognitionData);

    return {
      workerId: w.id,
      employeeId: empCode,
      workerName: w.name,
      project: safeString(w.assignedProject || w.currentSite, "Unassigned"),
      department: safeString(w.department, "Operations"),
      presentDays,
      lateDays,
      earlyDepartures,
      absentDays,
      leaveDays,
      totalHours,
      approvedOvertimeHours,
      biometricStatus: hasBiometric ? "Registered" : "Pending",
    };
  });

  const projLaborMap = new Map<string, ProjectLaborCostSummary>();
  params.payrollRuns
    .filter((r) => r.workflowStage === "Paid" || r.workflowStage === "Approved for Payment")
    .forEach((run) => {
      run.items.forEach((item) => {
        const cur = projLaborMap.get(item.project) || {
          project: item.project,
          employeeCount: 0,
          grossEarnings: 0,
          employerPension: 0,
          totalLaborExpense: 0,
          netDisbursed: 0,
        };
        cur.employeeCount += 1;
        cur.grossEarnings = round2(cur.grossEarnings + item.grossEarnings);
        cur.employerPension = round2(cur.employerPension + item.employerPension);
        cur.totalLaborExpense = round2(cur.grossEarnings + cur.employerPension);
        if (run.workflowStage === "Paid") {
          cur.netDisbursed = round2(cur.netDisbursed + item.netPay);
        }
        projLaborMap.set(item.project, cur);
      });
    });

  return {
    manpowerRows,
    totalApprovedManpower,
    totalActualHired,
    totalRemainingVacancies,
    excessRecruitmentCount,
    totalManpowerRequests,
    approvedRecruitmentRequests,
    rejectedRecruitmentRequests,
    returnedRecruitmentRequests,
    totalApprovedManpowerQty,
    registeredEmployeesFromRequests,
    remainingRecruitmentVacancies,
    pendingExcessRequestsCount,
    attendanceSummaryRows,
    projectLaborSummaries: Array.from(projLaborMap.values()).sort((a, b) => b.totalLaborExpense - a.totalLaborExpense),
    totalPayrollNetYtd: round2(
      params.payrollRuns
        .filter((r) => r.workflowStage === "Paid")
        .reduce((s, r) => s + r.totalNetPay, 0)
    ),
    pendingRecruitmentApprovals: params.recruitmentRequests.filter(
      (r) => r.status === "Pending" && r.workflowStage !== "Returned for Correction"
    ).length,
    pendingLeaveApprovals: params.leaveRequests.filter((l) => l.status.startsWith("Pending")).length,
    pendingOvertimeApprovals: params.overtimeRequests.filter((o) => o.status.startsWith("Pending")).length,
    pendingPayrollApprovals: params.payrollRuns.filter((r) => r.workflowStage.startsWith("Pending")).length,
    activeLoansBalance: round2(
      params.loans
        .filter((l) => l.status === "Approved" || l.status === "Active Recovery")
        .reduce((s, l) => s + Number(l.remainingBalance || 0), 0)
    ),
  };
}

export function buildRecruitmentByProjectAndDepartmentReport(params: {
  recruitmentRequests: RecruitmentRequestRecord[];
  excessRequests?: ExcessRecruitmentRequestRecord[];
  filters?: {
    project?: string;
    department?: string;
    status?: string;
    searchQuery?: string;
    monthPrefix?: string;
  };
}): {
  summaryRows: Record<string, any>[];
  detailRows: Record<string, any>[];
} {
  const f = params.filters || {};
  const q = safeString(f.searchQuery).trim().toLowerCase();
  const filtered = (params.recruitmentRequests || []).filter((req) => {
    if (f.project && f.project !== "ALL" && safeString(req.project) !== f.project) return false;
    if (f.department && f.department !== "ALL" && safeString(req.department) !== f.department) return false;
    if (f.monthPrefix && !safeString(req.createdAt).startsWith(f.monthPrefix)) return false;
    if (f.status && f.status !== "ALL") {
      const fill = getRecruitmentFillStatus(req).fillStatus;
      if (f.status !== req.status && f.status !== req.workflowStage && f.status !== fill) return false;
    }
    if (q) {
      const hay = `${req.requestNo} ${req.project} ${req.department} ${req.jobPosition} ${req.requestedBy} ${req.workflowStage}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const groupMap = new Map<
    string,
    {
      project: string;
      department: string;
      totalRequests: number;
      pendingCount: number;
      returnedCount: number;
      approvedCount: number;
      rejectedCount: number;
      approvedQty: number;
      registeredCount: number;
      remainingVacancies: number;
      excessApprovedQty: number;
      pendingExcessAlerts: number;
    }
  >();

  filtered.forEach((req) => {
    const key = `${req.project || "Unassigned"}::${req.department || "General"}`;
    const cur = groupMap.get(key) || {
      project: req.project || "Unassigned",
      department: req.department || "General",
      totalRequests: 0,
      pendingCount: 0,
      returnedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      approvedQty: 0,
      registeredCount: 0,
      remainingVacancies: 0,
      excessApprovedQty: 0,
      pendingExcessAlerts: 0,
    };
    cur.totalRequests += 1;
    if (req.workflowStage === "Returned for Correction") {
      cur.returnedCount += 1;
    } else if (req.status === "Pending") {
      cur.pendingCount += 1;
    } else if (req.status === "Rejected" || req.workflowStage === "Rejected") {
      cur.rejectedCount += 1;
    } else if (
      req.status === "Approved" ||
      req.status === "Fulfilled" ||
      req.workflowStage === "Approved" ||
      req.workflowStage === "Fulfilled"
    ) {
      cur.approvedCount += 1;
      const stats = getRecruitmentFillStatus(req);
      cur.approvedQty += stats.approvedQty;
      cur.registeredCount += stats.registeredCount;
      cur.remainingVacancies += stats.remainingVacancies;
      cur.excessApprovedQty += Number(req.excessApprovedAdded || 0);
    }
    groupMap.set(key, cur);
  });

  (params.excessRequests || []).forEach((exc) => {
    if (f.project && f.project !== "ALL" && exc.project !== f.project) return;
    if (f.department && f.department !== "ALL" && exc.department !== f.department) return;
    if (exc.status !== "Pending Director") return;
    const key = `${exc.project || "Unassigned"}::${exc.department || "General"}`;
    const cur = groupMap.get(key);
    if (cur) {
      cur.pendingExcessAlerts += 1;
    }
  });

  const summaryRows = Array.from(groupMap.values())
    .sort((a, b) => a.project.localeCompare(b.project) || a.department.localeCompare(b.department))
    .map((g) => ({
      Project: g.project,
      Department: g.department,
      "Total Requests": g.totalRequests,
      Pending: g.pendingCount,
      "Awaiting Correction": g.returnedCount,
      Approved: g.approvedCount,
      Rejected: g.rejectedCount,
      "Approved Manpower Qty": g.approvedQty,
      "Employees Registered": g.registeredCount,
      "Remaining Vacancies": g.remainingVacancies,
      "Fill Rate (%)":
        g.approvedQty > 0 ? Math.round((g.registeredCount / g.approvedQty) * 100) : 0,
      "Excess Approved (+)": g.excessApprovedQty,
      "Pending Excess Alerts": g.pendingExcessAlerts,
    }));

  const detailRows = filtered.map((req) => {
    const stats = getRecruitmentFillStatus(req);
    return {
      "Request No": req.requestNo,
      Project: req.project,
      Department: req.department,
      "Job Position": req.jobPosition,
      "Employment Type": req.employmentType,
      "Requested By": req.requestedBy,
      "Approved Qty": stats.approvedQty,
      Registered: stats.registeredCount,
      "Remaining Vacancies": stats.remainingVacancies,
      "Fill Status":
        req.status === "Approved" || req.status === "Fulfilled" ? stats.fillStatus : "Awaiting Final Approval",
      "Workflow Stage": req.workflowStage,
      Status: req.status,
      "Excess Approved (+)": Number(req.excessApprovedAdded || 0),
      "Excess Approval Status": req.excessApprovalStatus,
      "Expected Date": req.requiredByDate,
      "Proposed Salary (ETB)": req.proposedMonthlySalary,
      "Submitted Date": safeString(req.createdAt).slice(0, 10),
    };
  });

  return { summaryRows, detailRows };
}

function downloadHrmCsv(filenamePrefix: string, rows: Record<string, any>[]) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const safeRows = rows.length ? rows : [{ Info: "No records found" }];
  const headers = Object.keys(safeRows[0]);
  const escapeCell = (val: unknown) => {
    const s = String(val ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...safeRows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `OVID_HRM_${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportHrmReport(params: {
  reportName: string;
  rows: Record<string, any>[];
  format: "csv" | "xlsx";
}) {
  if (params.format === "csv") {
    downloadHrmCsv(params.reportName, params.rows);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(params.rows.length ? params.rows : [{ Info: "No records found" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, params.reportName.slice(0, 31));
  XLSX.writeFile(wb, `OVID_HRM_${params.reportName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function escapePdfText(text: string): string {
  return String(text || "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function generatePayslipPdfBytes(params: {
  run: Pick<HrmPayrollRunRecord, "runNo" | "payPeriod" | "paymentReferenceNo" | "workflowStage" | "glJournalId" | "paymentDate">;
  item: HrmPayrollLineItem;
  companyName?: string;
}): Uint8Array {
  const company = params.companyName || "OVID Real Estate - Digital Construction ERP";
  const maskedAcc = buildMaskedPreview(params.item.bankAccountNumber) || params.item.bankAccountNumber;
  const lines: { text: string; y: number; size: number; bold?: boolean }[] = [
    { text: company, y: 790, size: 15, bold: true },
    { text: `OFFICIAL EMPLOYEE PAYSLIP | Pay Period: ${params.run.payPeriod}`, y: 770, size: 10 },
    { text: `Run No: ${params.run.runNo}   |   Payment Ref: ${params.run.paymentReferenceNo || params.run.workflowStage}   |   Status: ${params.run.workflowStage}`, y: 754, size: 9 },
    { text: "------------------------------------------------------------------------------------", y: 740, size: 9 },
    { text: `Employee ID: ${params.item.employeeId}        Employee Name: ${params.item.workerName}`, y: 722, size: 10, bold: true },
    { text: `Project Site: ${params.item.project}        Department: ${params.item.department}`, y: 706, size: 10 },
    { text: `Job Position: ${params.item.position}        Bank: ${params.item.bankName} (${maskedAcc})`, y: 690, size: 10 },
    { text: `Attendance: ${params.item.daysWorked} Days Worked | ${params.item.absentDays} Absent | ${params.item.lateCount} Late | ${params.item.approvedOvertimeHours} OT Hrs`, y: 674, size: 9 },
    { text: "------------------------------------------------------------------------------------", y: 658, size: 9 },
    { text: "EARNINGS (ETB)                                        DEDUCTIONS & STATUTORY (ETB)", y: 642, size: 10, bold: true },
    { text: `Basic Salary:         ETB ${formatPlain(params.item.basicSalary).padStart(12)}      Ethiopian Income Tax:    ETB ${formatPlain(params.item.incomeTax).padStart(12)}`, y: 622, size: 10 },
    { text: `Allowances:           ETB ${formatPlain(params.item.allowances).padStart(12)}      Employee Pension (7%):   ETB ${formatPlain(params.item.employeePension).padStart(12)}`, y: 604, size: 10 },
    { text: `Overtime Pay:         ETB ${formatPlain(params.item.overtimePay).padStart(12)}      Advance/Loan Recovery:   ETB ${formatPlain(params.item.advanceLoanDeduction).padStart(12)}`, y: 586, size: 10 },
    { text: `Bonuses:              ETB ${formatPlain(params.item.bonuses).padStart(12)}      Other Deductions:        ETB ${formatPlain(params.item.otherDeductions).padStart(12)}`, y: 568, size: 10 },
    { text: "------------------------------------------------------------------------------------", y: 550, size: 9 },
    { text: `TOTAL GROSS EARNINGS: ETB ${formatPlain(params.item.grossEarnings).padStart(12)}      TOTAL DEDUCTIONS:        ETB ${formatPlain(params.item.totalDeductions).padStart(12)}`, y: 532, size: 10, bold: true },
    { text: "------------------------------------------------------------------------------------", y: 514, size: 9 },
    { text: `NET PAYABLE DISBURSED: ETB ${formatPlain(params.item.netPay)}`, y: 492, size: 14, bold: true },
    { text: `Employer Pension Contribution (11%): ETB ${formatPlain(params.item.employerPension)}`, y: 470, size: 9 },
    { text: `General Ledger Journal Ref: ${params.run.glJournalId || "Pending Disbursement"}   |   Payment Date: ${params.run.paymentDate || "Scheduled"}`, y: 454, size: 9 },
    { text: "Generated electronically by OVID Digital Construction ERP - HRM & Payroll Control.", y: 420, size: 8 },
  ];

  const streamOps = [
    "BT",
    ...lines.map((l) => `${l.bold ? "/F2" : "/F1"} ${l.size} Tf 1 0 0 1 42 ${l.y} Tm (${escapePdfText(l.text)}) Tj`),
    "ET",
  ].join("\n");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${streamOps.length} >>\nstream\n${streamOps}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function downloadHrmPayslipPdf(params: {
  run: Pick<HrmPayrollRunRecord, "runNo" | "payPeriod" | "paymentReferenceNo" | "workflowStage" | "glJournalId" | "paymentDate">;
  item: HrmPayrollLineItem;
  companyName?: string;
}) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const pdfBytes = generatePayslipPdfBytes(params);
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeEmp = params.item.employeeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  link.download = `OVID_Payslip_${safeEmp}_${params.run.payPeriod}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function openPrintablePayslipWindow(params: {
  run: HrmPayrollRunRecord;
  item: HrmPayrollLineItem;
  companyName?: string;
}) {
  downloadHrmPayslipPdf(params);
}
