import * as XLSX from "xlsx";
import {
  ActualCostEntry,
  AttendanceRecord,
  BankTransactionRecord,
  EmployeeTransferRecord,
  ErpTask,
  EthiopianTaxBracket,
  EthiopianTaxPensionConfig,
  Expense,
  FinancialAccount,
  HrmPayrollLineItem,
  HrmPayrollRunRecord,
  HrmPayrollRunStage,
  HrmPayslipRecord,
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
import { buildMaskedPreview } from "../utils/cryptoPii";

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
    role === UserRole.DIRECTORY ||
    role === UserRole.HEAD_OFFICE ||
    isSuperAdmin;
  const isHrManager = role === UserRole.HR_MANAGER || role === UserRole.HR;
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
  let maxSeq = 0;
  const regex = new RegExp(`OVID-EMP-${year}-(\\d+)`, "i");
  existingWorkers.forEach((w) => {
    const code = safeString((w as any).employeeId || w.id);
    const m = code.match(regex);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxSeq) maxSeq = n;
    }
  });
  const nextSeq = Math.max(maxSeq + 1, existingWorkers.length + 1);
  return `OVID-EMP-${year}-${String(nextSeq).padStart(4, "0")}`;
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

export function resolveWorkerSchedule(
  worker: Pick<Worker, "assignedProject" | "currentSite" | "department">,
  schedules: WorkScheduleConfig[]
): WorkScheduleConfig | undefined {
  const proj = safeString(worker.assignedProject || worker.currentSite).toLowerCase();
  const dept = safeString(worker.department).toLowerCase();
  const active = schedules.filter((s) => s.isActive !== false);
  return (
    active.find((s) => s.project.toLowerCase() === proj && s.department.toLowerCase() === dept) ||
    active.find((s) => s.project.toLowerCase() === proj && s.department.toLowerCase() === "all") ||
    active.find((s) => s.project.toLowerCase() === "all" && s.department.toLowerCase() === dept) ||
    active[0]
  );
}

export function computeScheduleAttendanceMetrics(params: {
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  explicitStatus?: "Present" | "Absent" | "Late" | "Leave" | "Holiday";
  schedule?: WorkScheduleConfig;
}): {
  status: "Present" | "Absent" | "Late" | "Leave" | "Holiday";
  workingHours: number;
  lateArrivalMinutes: number;
  earlyDepartureMinutes: number;
  underTime: number;
  overtime: number;
} {
  const shiftStart = parseTimeToMinutes(params.schedule?.shiftStartTime || "08:00") ?? 480;
  const shiftEnd = parseTimeToMinutes(params.schedule?.shiftEndTime || "17:00") ?? 1020;
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

  if (params.explicitStatus === "Absent" || params.explicitStatus === "Leave") {
    return {
      status: params.explicitStatus,
      workingHours: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      underTime: 0,
      overtime: 0,
    };
  }

  const inMins = parseTimeToMinutes(params.checkIn);
  const outMins = parseTimeToMinutes(params.checkOut);

  if (inMins === null) {
    return {
      status: isHoliday ? "Holiday" : "Absent",
      workingHours: 0,
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      underTime: 0,
      overtime: 0,
    };
  }

  const rawLate = Math.max(0, inMins - shiftStart);
  const lateArrivalMinutes = rawLate > grace ? rawLate : 0;

  let earlyDepartureMinutes = 0;
  let totalMinutesWorked = stdHours * 60;
  if (outMins !== null) {
    const rawSpan = outMins >= inMins ? outMins - inMins : outMins + 1440 - inMins;
    const deductedBreak = rawSpan > 300 ? breakMins : 0;
    totalMinutesWorked = Math.max(0, rawSpan - deductedBreak);
    if (outMins < shiftEnd && !isHoliday && !isRestDay) {
      earlyDepartureMinutes = shiftEnd - outMins;
    }
  } else {
    // Check-in only: initial shift credit minus late penalty until clock-out
    totalMinutesWorked = Math.max(0, stdHours * 60 - lateArrivalMinutes);
  }

  const totalHours = round2(totalMinutesWorked / 60);
  const overtime = isHoliday || isRestDay ? totalHours : round2(Math.max(0, totalHours - stdHours));
  const regularHours = isHoliday || isRestDay ? 0 : round2(Math.min(stdHours, totalHours));
  const underTime = round2(earlyDepartureMinutes / 60);

  let status: "Present" | "Absent" | "Late" | "Leave" | "Holiday" = "Present";
  if (params.explicitStatus === "Holiday" || (isHoliday && totalHours === 0)) {
    status = "Holiday";
  } else if (params.explicitStatus === "Late" || lateArrivalMinutes > 0) {
    status = "Late";
  }

  return {
    status,
    workingHours: regularHours,
    lateArrivalMinutes,
    earlyDepartureMinutes,
    underTime,
    overtime,
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
}) {
  const nowIso = new Date().toISOString();
  await DbService.addNotification({
    id: params.id,
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
    targetUserId: params.targetUserId,
    date: nowIso.slice(0, 10),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timestamp: Date.now(),
    read: false,
    actionTab: "hrmEnterprise",
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
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  manpowerPlans: ManpowerPlanRecord[];
  workers: Worker[];
}): Promise<RecruitmentRequestRecord> {
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
  const reqNo = `MRF-${nowIso.slice(0, 4)}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  const record: RecruitmentRequestRecord = {
    id,
    requestNo: reqNo,
    project: params.project,
    department: params.department,
    jobPosition: params.jobPosition,
    requestedCount: params.requestedCount,
    hiredCount: 0,
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
    approvalHistory: [
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
    ],
    directorNotifiedAt: exceedsLimit ? nowIso : undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveRecruitmentRequest(record);

  // Automatic Stage 2 routing notification to HR Manager
  await dispatchRecruitmentStageNotification({
    id: `HRM-STAGE-HR-${record.id}`,
    type: "HRM Recruitment Stage Assignment",
    title: `Step 2 Action Required — Verify Recruitment Request ${reqNo}`,
    titleAm: `ደረጃ 2፡ የቅጥር ጥያቄ ${reqNo} ማረጋገጫ ያስፈልጋል`,
    message: `${params.actorName} (${params.actorRole}) submitted ${reqNo} for ${params.requestedCount}x ${params.jobPosition} (${params.project} / ${params.department}). HR Manager must verify manpower requirements, job position, and qualifications.`,
    priority: params.urgency === "Critical" ? "Critical" : "High",
    projectName: params.project,
    sender: params.actorName,
    senderRole: String(params.actorRole),
    receiver: "HR Manager",
    targetRoles: [UserRole.HR_MANAGER, UserRole.HR],
  });

  // Automatic Director alert when recruitment exceeds approved manpower limit
  if (exceedsLimit) {
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
      targetRoles: [UserRole.DIRECTOR, UserRole.DIRECTORY, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
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

  if (decision === "Rejected") {
    const rejected: RecruitmentRequestRecord = {
      ...request,
      workflowStage: "Rejected",
      status: "Rejected",
      excessApprovalStatus: request.exceedsManpowerLimit ? "Rejected" : request.excessApprovalStatus,
      hrRegistrationAuthorized: false,
      rejectionReason: trimmedNotes,
      rejectedBy: actorName,
      rejectedByRole: String(actorRole),
      rejectedAt: nowIso,
      rejectedAtStage: request.workflowStage,
      approvalHistory: [...(request.approvalHistory || []), stepLog],
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
    });

    return rejected;
  }

  if (decision === "Returned") {
    const returned: RecruitmentRequestRecord = {
      ...request,
      workflowStage: "Returned for Correction",
      status: "Pending",
      hrRegistrationAuthorized: false,
      correctionNotes: trimmedNotes,
      returnedBy: actorName,
      returnedByRole: String(actorRole),
      returnedAt: nowIso,
      returnedAtStage: request.workflowStage,
      approvalHistory: [...(request.approvalHistory || []), stepLog],
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

  // Automatic Stage 7 Task Generation & HR Registration Authorization ONLY upon Director Final Approval
  if (nextStage === "Approved" && !onboardingTaskId) {
    const taskCode = `TSK-HRM-${request.requestNo}`;
    onboardingTaskId = `TSK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    onboardingTaskCreatedAt = nowIso;
    const hrTask: ErpTask = {
      id: onboardingTaskId,
      taskId: taskCode,
      taskName: `Register Approved Employee(s): ${request.jobPosition} (${request.requestedCount}) — ${request.requestNo}`,
      description: `Director final approval granted for ${request.requestNo} (${request.project} / ${request.department}). HR Manager is authorized to complete employee registration for ${request.requestedCount}x ${request.jobPosition} (${request.employmentType}).`,
      projectId: request.project,
      projectName: request.project,
      siteName: request.project,
      assignedToName: "HR Manager",
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
      completionPercentage: 0,
      notes: `Linked Recruitment Request: ${request.requestNo} (${request.id})`,
    };
    await DbService.addTask(hrTask).catch(() => {});
  }

  const updated: RecruitmentRequestRecord = {
    ...request,
    ...patch,
    workflowStage: nextStage,
    status: nextStatus,
    excessApprovalStatus: nextExcessStatus,
    hrRegistrationAuthorized: hrAuthorized,
    hrOnboardingTaskId: onboardingTaskId,
    hrOnboardingTaskCreatedAt: onboardingTaskCreatedAt,
    approvalHistory: [...(request.approvalHistory || []), stepLog],
    updatedAt: nowIso,
  };

  await DbService.saveRecruitmentRequest(updated);

  // Dispatch automatic notifications to the next approver or final stakeholders
  if (nextStage === "Pending Office Manager") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-OFF-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 3 Action Required — Office Engineer / Office Manager Review: ${request.requestNo}`,
      titleAm: `ደረጃ 3፡ የቢሮ አስተዳዳሪ / ምህንድስና ማረጋገጫ (${request.requestNo})`,
      message: `HR Manager verified ${request.requestNo} (${request.jobPosition}, ${request.project}). Verify manpower necessity and organizational structure.`,
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Office Engineer / Office Manager",
      targetRoles: [UserRole.OFFICE_MANAGER, UserRole.OFFICE_AND_TECHNICAL_ENGINEERING],
    });
  } else if (nextStage === "Pending Finance Manager") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-FIN-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 4 Action Required — Finance Budget Verification: ${request.requestNo}`,
      titleAm: `ደረጃ 4፡ የፋይናንስ በጀት ማረጋገጫ (${request.requestNo})`,
      message: `Office Manager verified ${request.requestNo}. Verify salary budget (ETB ${request.proposedMonthlySalary}/head x ${request.requestedCount}) and financial capacity.`,
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Finance Manager",
      targetRoles: [UserRole.FINANCE_MANAGER],
    });
  } else if (nextStage === "Pending Operation Department") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-OPS-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 5 Action Required — Operation Department Review: ${request.requestNo}`,
      titleAm: `ደረጃ 5፡ የኦፕሬሽን ክፍል ማረጋገጫ (${request.requestNo})`,
      message: `Finance Manager verified salary budget for ${request.requestNo}. Verify operational requirements and project site needs.`,
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Operation Department",
      targetRoles: [UserRole.OPERATION_MANAGER],
    });
  } else if (nextStage === "Pending Director Final Approval") {
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-DIR-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Stage Assignment",
      title: `Step 6 Action Required — Director Final Approval: ${request.requestNo}`,
      titleAm: `ደረጃ 6፡ የዳይሬክተር የመጨረሻ ውሳኔ (${request.requestNo})`,
      message: `All 4 prior department checks completed (HR, Office, Finance, Operation) for ${request.requestNo} (${request.requestedCount}x ${request.jobPosition}). Ready for Director Final Approval.`,
      priority: request.exceedsManpowerLimit ? "Critical" : "High",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: "Director",
      targetRoles: [UserRole.DIRECTOR, UserRole.DIRECTORY, UserRole.HEAD_OFFICE],
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
    });
    await dispatchRecruitmentStageNotification({
      id: `HRM-STAGE-REQAPP-${request.id}-${Date.now()}`,
      type: "HRM Recruitment Final Approved",
      title: `Recruitment Request Approved by Director: ${request.requestNo}`,
      titleAm: `የቅጥር ጥያቄ በዳይሬክተር ጸድቋል: ${request.requestNo}`,
      message: `Your request ${request.requestNo} (${request.requestedCount}x ${request.jobPosition} for ${request.project}) received final Director approval. HR Manager may now register the employee(s).`,
      priority: "Normal",
      projectName: request.project,
      sender: actorName,
      senderRole: String(actorRole),
      receiver: request.requestedBy || "Section Head",
      targetRoles: [request.requestedByRole || UserRole.SECTION_HEAD, UserRole.SECTION_HEAD],
      targetUserId: request.requestedById,
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
}): Promise<RecruitmentRequestRecord> {
  const { request, updates } = params;
  if (request.workflowStage !== "Returned for Correction") {
    throw new Error(`Only requests in "Returned for Correction" stage can be resubmitted (current: ${request.workflowStage}).`);
  }

  const nextProject = updates.project ?? request.project;
  const nextPosition = updates.jobPosition ?? request.jobPosition;
  const nextCount = Number(updates.requestedCount ?? request.requestedCount);

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

  const updated: RecruitmentRequestRecord = {
    ...request,
    ...updates,
    project: nextProject,
    jobPosition: nextPosition,
    requestedCount: nextCount,
    workflowStage: "Pending HR Manager",
    status: "Pending",
    exceedsManpowerLimit: exceedsLimit,
    approvedManpowerSnapshot: approvedSnap,
    actualHiredSnapshot: hiredSnap,
    remainingVacanciesSnapshot: remainingSnap,
    excessCount,
    excessApprovalStatus: exceedsLimit ? "Pending Director" : "Not Required",
    hrRegistrationAuthorized: false,
    resubmittedAt: nowIso,
    resubmittedCount: (request.resubmittedCount || 0) + 1,
    approvalHistory: [...(request.approvalHistory || []), resubLog],
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
  });

  return updated;
}

export function validateEmployeeRegistrationAuthorization(params: {
  role: UserRole | string;
  recruitmentRequest?: RecruitmentRequestRecord | null;
}): { allowed: boolean; reason?: string } {
  const perms = resolveHrmPermissions(params.role);
  if (!perms.canRegisterApprovedEmployees) {
    return {
      allowed: false,
      reason:
        "Employee registration is strictly restricted to HR Manager / HR after Director final approval.",
    };
  }
  const req = params.recruitmentRequest;
  if (!req) {
    return {
      allowed: false,
      reason:
        "A Director-approved Manpower Recruitment Request is required before registering a new employee.",
    };
  }
  if (req.workflowStage !== "Approved" || req.status !== "Approved" || !req.hrRegistrationAuthorized) {
    return {
      allowed: false,
      reason: `Cannot register employee: Request ${req.requestNo} is at stage "${req.workflowStage}" and has not received Director final approval.`,
    };
  }
  if ((req.hiredCount || 0) >= req.requestedCount) {
    return {
      allowed: false,
      reason: `All ${req.requestedCount} approved positions in ${req.requestNo} have already been registered.`,
    };
  }
  return { allowed: true };
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
  const nextHired = (req.hiredCount || 0) + 1;
  const isFulfilled = nextHired >= req.requestedCount;

  const updatedRequest: RecruitmentRequestRecord = {
    ...req,
    hiredCount: nextHired,
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
      targetRoles: [UserRole.DIRECTOR, UserRole.DIRECTORY, UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN],
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
    const daysWorked = periodAtt.filter((a) => a.status !== "Absent").length || 26;
    const lateCount = periodAtt.filter((a) => a.status === "Late").length;
    const absentDays = periodAtt.filter((a) => a.status === "Absent").length;
    const regularHours = round2(
      periodAtt.reduce((s, a) => s + (Number(a.workingHours) || 8), 0) || daysWorked * 8
    );

    const approvedOtHrs = round2(
      params.overtimeRequests
        .filter(
          (ot) =>
            (ot.workerId === w.id || ot.employeeId === empCode) &&
            ot.status === "Approved" &&
            ot.workDate.startsWith(params.payPeriod)
        )
        .reduce((s, ot) => s + Number(ot.hoursRequested || 0) * Number(ot.multiplier || 1.5), 0)
    );
    const attOtHrs = round2(periodAtt.reduce((s, a) => s + Number(a.overtime || 0), 0));
    const effectiveOtHrs = approvedOtHrs > 0 ? approvedOtHrs : attOtHrs;

    const hourlyRate = w.hourlyRate || round2(basicSalary / 208);
    const overtimePay = round2(effectiveOtHrs * hourlyRate * (approvedOtHrs > 0 ? 1 : 1.5));

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

    const totalDeductions = round2(incomeTax + employeePension + activeLoanDeduction);
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
      absentDays,
      lateCount,
      regularHours,
      approvedOvertimeHours: effectiveOtHrs,
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
      otherDeductions: 0,
      totalDeductions,
      netPay,
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
    approvalHistory: [
      {
        stage: "Submitted",
        actorName: params.actorName,
        actorRole: "HRM Payroll",
        decision: "Submitted",
        timestamp: nowIso,
        notes: `Generated ${items.length} payroll slips for ${params.payPeriod}`,
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
  const excessRecruitmentCount = params.recruitmentRequests.filter(
    (r) => r.exceedsManpowerLimit && r.status !== "Rejected"
  ).length;

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
    attendanceSummaryRows,
    projectLaborSummaries: Array.from(projLaborMap.values()).sort((a, b) => b.totalLaborExpense - a.totalLaborExpense),
    totalPayrollNetYtd: round2(
      params.payrollRuns
        .filter((r) => r.workflowStage === "Paid")
        .reduce((s, r) => s + r.totalNetPay, 0)
    ),
    pendingRecruitmentApprovals: params.recruitmentRequests.filter((r) => r.status === "Pending").length,
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
