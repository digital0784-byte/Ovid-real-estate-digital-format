import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Award,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  History,
  Landmark,
  Layers,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
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
  AttendanceApprovalStatus,
  AttendanceAuditLog,
  AttendanceCorrectionRequest,
  AttendanceCorrectionType,
  AttendanceDeductionPolicy,
  AttendanceMethod,
  AttendanceRecord,
  BiometricDeviceMapping,
  BiometricDeviceRecord,
  BiometricEnrollmentStatus,
  BiometricMappingAuditLog,
  EmployeeTransferRecord,
  ErpTask,
  EthiopianTaxBracket,
  EthiopianTaxPensionConfig,
  ExcessRecruitmentRequestRecord,
  FinancialAccount,
  HrmPayrollLineItem,
  HrmPayrollRunRecord,
  HrmPayslipRecord,
  HrmPrivateProfileRecord,
  LeaveRequestRecord,
  ManpowerPlanRecord,
  OvertimeRequestRecord,
  RecruitmentRequestRecord,
  RecruitmentSupportingDocument,
  SalaryAdvanceLoanRecord,
  SalaryStructureRecord,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../../types";
import { DbService } from "../../services/db";
import { offlineSyncService } from "../../services/offlineSyncService";
import { verifyWorkerFingerprint, getBiometricCapabilities } from "../../services/biometricService";
import {
  activateEmployeeBiometricAttendance,
  completeEmployeeBiometricMappingWorkflow,
  computeEmployeeBiometricProfileState,
  computeHrmBiometricEnrollmentStats,
  enrollEmployeeOnBiometricDevice,
  isDeviceVerifiedForBiometricAttendance,
  processBiometricDeviceAttendanceEvent,
  pullAndProcessConnectorQueue,
  resolveBiometricMappingPermissions,
  stripProhibitedBiometricTemplateFields,
  suspendEmployeeBiometricEnrollment,
} from "../../services/biometricMappingService";
import { EmployeeBiometricMappingModule } from "./EmployeeBiometricMappingModule";
import {
  buildMaskedPreview,
  decryptSensitiveText,
  encryptSensitiveText,
  hashSensitiveIdentifier,
} from "../../utils/cryptoPii";
import {
  advancePayrollRunStage,
  advanceRecruitmentApproval,
  buildHrmPayrollRunDraft,
  buildRecruitmentByProjectAndDepartmentReport,
  canActorApproveRecruitmentStage,
  canRequesterResubmitRecruitmentRequest,
  checkDuplicateEmployeeRegistration,
  computeEthiopianIncomeTaxAndPension,
  computeHrmDashboardState,
  computeScheduleAttendanceMetrics,
  decideExcessRecruitmentRequest,
  DEFAULT_ETHIOPIAN_TAX_BRACKETS,
  DEFAULT_ETHIOPIAN_TAX_PENSION_CONFIG,
  disburseApprovedHrmPayrollRun,
  downloadHrmPayslipPdf,
  exportHrmReport,
  generateNextEmployeeId,
  getRecruitmentFillStatus,
  HrmRoutingUser,
  inferWorkerWorkLocationType,
  maskSensitiveValue,
  recalculatePayrollRunLineItem,
  recordExcessRegistrationAttemptAlert,
  registerApprovedEmployeeFromRecruitment,
  resolveHrmPermissions,
  resolveWorkerSchedule,
  resubmitReturnedRecruitmentRequest,
  submitExcessRecruitmentRequest,
  submitRecruitmentRequestWithManpowerCheck,
  validateEmployeeRegistrationAuthorization,
} from "../../services/hrmService";
import {
  AttendancePeriodMode,
  AttendanceReportTypeId,
  buildAttendanceReportRows,
  computeAttendanceWorkflowDashboard,
  detectMissingPunchType,
  formatAddisAbabaDateTime,
  reconcileEmployeeAttendanceDay,
  reportAttendanceDiscrepancy,
  reviewAttendanceException,
  reviewManualCorrectionRequest,
  submitManualCorrectionRequest,
  transitionAttendanceApprovalStatus,
  WorkLocationFilterType,
} from "../../services/attendanceWorkflowService";

interface HrmEnterpriseModuleProps {
  isAmharic?: boolean;
  currentUserRole: UserRole;
  currentUserProfile?: any;
  workers: Worker[];
  attendance: AttendanceRecord[];
  onAddWorker: (w: Worker) => Promise<void> | void;
  onUpdateWorker: (w: Worker) => Promise<void> | void;
  onAddAttendance: (a: AttendanceRecord) => Promise<void> | void;
  onNavigateToTab: (tab: string) => void;
  onLogAction: (action: string, details: string) => void;
  initialSubTab?: HrmSubTab;
}

export type HrmSubTab =
  | "dashboard"
  | "recruitment"
  | "employees"
  | "biometric-mapping"
  | "attendance"
  | "payroll"
  | "reports";
type HrmReportKind =
  | "manpower"
  | "recruitment-project-dept"
  | "recruitment"
  | "attendance"
  | "leave-absence"
  | "payroll"
  | "project-labor"
  | "payment-history"
  | AttendanceReportTypeId;

const fmtMoney = (v: number) =>
  Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const HrmEnterpriseModule: React.FC<HrmEnterpriseModuleProps> = ({
  isAmharic,
  currentUserRole,
  currentUserProfile,
  workers,
  attendance,
  onAddWorker,
  onUpdateWorker,
  onAddAttendance,
  onNavigateToTab,
  onLogAction,
  initialSubTab,
}) => {
  const actorName =
    currentUserProfile?.displayName || currentUserProfile?.name || String(currentUserRole);
  const actorUid = currentUserProfile?.uid || currentUserProfile?.id || String(currentUserRole);
  const perms = useMemo(() => resolveHrmPermissions(currentUserRole), [currentUserRole]);
  const biometricMappingPerms = useMemo(
    () => resolveBiometricMappingPermissions(currentUserRole),
    [currentUserRole]
  );

  const [activeTab, setActiveTab] = useState<HrmSubTab>(initialSubTab || "dashboard");
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [banner, setBanner] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [revealPii, setRevealPii] = useState(false);

  // Firestore Collections (role-scoped to avoid unauthorized collection reads)
  const [projects, setProjects] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<FinancialAccount[]>([]);
  const [manpowerPlans, setManpowerPlans] = useState<ManpowerPlanRecord[]>([]);
  const [recruitmentRequests, setRecruitmentRequests] = useState<RecruitmentRequestRecord[]>([]);
  const [excessRecruitmentRequests, setExcessRecruitmentRequests] = useState<ExcessRecruitmentRequestRecord[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkScheduleConfig[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequestRecord[]>([]);
  const [employeeTransfers, setEmployeeTransfers] = useState<EmployeeTransferRecord[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructureRecord[]>([]);
  const [taxPensionConfigs, setTaxPensionConfigs] = useState<EthiopianTaxPensionConfig[]>([]);
  const [loans, setLoans] = useState<SalaryAdvanceLoanRecord[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<HrmPayrollRunRecord[]>([]);
  const [privateProfiles, setPrivateProfiles] = useState<HrmPrivateProfileRecord[]>([]);
  const [decryptedPiiMap, setDecryptedPiiMap] = useState<Record<string, { faydaId: string; bankAccountNumber: string; mobileMoneyNumber: string }>>({});
  const [personalPayslips, setPersonalPayslips] = useState<HrmPayslipRecord[]>([]);
  const [erpTasks, setErpTasks] = useState<ErpTask[]>([]);
  const [systemUsers, setSystemUsers] = useState<HrmRoutingUser[]>([]);
  const [biometricDevices, setBiometricDevices] = useState<BiometricDeviceRecord[]>([]);
  const [biometricDeviceMappings, setBiometricDeviceMappings] = useState<BiometricDeviceMapping[]>([]);
  const [biometricMappingAuditLogs, setBiometricMappingAuditLogs] = useState<BiometricMappingAuditLog[]>([]);
  const [unmappedBiometricEvents, setUnmappedBiometricEvents] = useState<UnmappedBiometricEvent[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<AttendanceCorrectionRequest[]>([]);
  const [attendanceDeductionPolicies, setAttendanceDeductionPolicies] = useState<AttendanceDeductionPolicy[]>([]);
  const [attendanceAuditLogs, setAttendanceAuditLogs] = useState<AttendanceAuditLog[]>([]);

  const [offlineStats, setOfflineStats] = useState(() => offlineSyncService.getStats());

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    DbService.getProjects().then(setProjects).catch(() => {});

    const canReadAccounts =
      perms.canDisbursePayroll ||
      perms.canApproveFinanceStage ||
      perms.canManageEmployees ||
      perms.isHrManager ||
      perms.isDirector ||
      perms.isOperationManager ||
      perms.isProjectManager ||
      perms.isAuditor;
    if (canReadAccounts) {
      unsubs.push(DbService.subscribeFinancialAccounts(setBankAccounts));
    }

    if (!perms.isEmployee) {
      unsubs.push(DbService.subscribeManpowerPlans(setManpowerPlans));
      unsubs.push(DbService.subscribeRecruitmentRequests(setRecruitmentRequests));
      unsubs.push(DbService.subscribeExcessRecruitmentRequests(setExcessRecruitmentRequests));
      unsubs.push(DbService.subscribeEmployeeTransfers(setEmployeeTransfers));
      unsubs.push(DbService.subscribeTasks(setErpTasks));
      unsubs.push(DbService.subscribeUsers((users) => setSystemUsers(users as HrmRoutingUser[])));
      unsubs.push(DbService.subscribeAttendanceCorrections(setAttendanceCorrections));
      unsubs.push(DbService.subscribeAttendanceAuditLogs(setAttendanceAuditLogs));
    }

    if (biometricMappingPerms.canView) {
      unsubs.push(DbService.subscribeBiometricDevices(setBiometricDevices));
      unsubs.push(DbService.subscribeBiometricDeviceMappings(setBiometricDeviceMappings));
      unsubs.push(DbService.subscribeBiometricMappingAuditLogs(setBiometricMappingAuditLogs));
      unsubs.push(DbService.subscribeUnmappedBiometricEvents(setUnmappedBiometricEvents));
    }

    unsubs.push(DbService.subscribeWorkSchedules(setWorkSchedules));
    unsubs.push(DbService.subscribeAttendanceDeductionPolicies(setAttendanceDeductionPolicies));

    // Scope leave, overtime & loans to creator UID for standard Employee self-service
    const selfUidFilter = perms.isEmployee ? actorUid : undefined;
    unsubs.push(DbService.subscribeLeaveRequests(setLeaveRequests, undefined, selfUidFilter));
    unsubs.push(DbService.subscribeOvertimeRequests(setOvertimeRequests, undefined, selfUidFilter));
    unsubs.push(DbService.subscribeSalaryAdvancesLoans(setLoans, undefined, selfUidFilter));

    if (perms.canViewPayrollAmounts) {
      unsubs.push(DbService.subscribeSalaryStructures(setSalaryStructures));
      unsubs.push(DbService.subscribeTaxPensionConfigs(setTaxPensionConfigs));
      unsubs.push(DbService.subscribeHrmPayrollRuns(setPayrollRuns));
      unsubs.push(DbService.subscribeHrmPayslips(setPersonalPayslips));
    } else if (perms.isEmployee) {
      unsubs.push(DbService.subscribeHrmPayslips(setPersonalPayslips, undefined, actorUid));
    }

    if (perms.canViewSensitivePii) {
      unsubs.push(DbService.subscribeHrmPrivateProfiles(setPrivateProfiles));
    } else if (perms.isEmployee) {
      unsubs.push(DbService.subscribeHrmPrivateProfiles(setPrivateProfiles, undefined, actorUid));
    }

    const handleSyncEvt = () => setOfflineStats(offlineSyncService.getStats());
    window.addEventListener("offline_sync_status_changed", handleSyncEvt);
    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("offline_sync_status_changed", handleSyncEvt);
    };
  }, [actorUid, perms, biometricMappingPerms.canView]);

  useEffect(() => {
    if (!perms.canViewSensitivePii && !perms.isEmployee) {
      setDecryptedPiiMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next: Record<string, { faydaId: string; bankAccountNumber: string; mobileMoneyNumber: string }> = {};
      for (const prof of privateProfiles) {
        const faydaId = await decryptSensitiveText(prof.faydaIdEncrypted);
        const bankAccountNumber = await decryptSensitiveText(prof.bankAccountEncrypted);
        const mobileMoneyNumber = await decryptSensitiveText(prof.mobileMoneyNumberEncrypted);
        next[prof.workerId] = { faydaId, bankAccountNumber, mobileMoneyNumber };
      }
      if (!cancelled) setDecryptedPiiMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [privateProfiles, perms.canViewSensitivePii, perms.isEmployee]);

  const activeTaxConfig = useMemo<EthiopianTaxPensionConfig>(() => {
    if (taxPensionConfigs.length > 0) {
      return [...taxPensionConfigs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    }
    return DEFAULT_ETHIOPIAN_TAX_PENSION_CONFIG;
  }, [taxPensionConfigs]);

  const latestDeductionPolicy = useMemo<AttendanceDeductionPolicy | undefined>(() => {
    if (attendanceDeductionPolicies.length > 0) {
      return [...attendanceDeductionPolicies].sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || "")
      )[0];
    }
    return undefined;
  }, [attendanceDeductionPolicies]);

  const approvedDeductionPolicy = useMemo<AttendanceDeductionPolicy | undefined>(
    () => (latestDeductionPolicy?.isApproved ? latestDeductionPolicy : undefined),
    [latestDeductionPolicy]
  );

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const dash = useMemo(
    () =>
      computeHrmDashboardState({
        workers,
        attendance,
        manpowerPlans,
        recruitmentRequests,
        excessRequests: excessRecruitmentRequests,
        leaveRequests,
        overtimeRequests,
        payrollRuns,
        loans,
        workSchedules,
        filterDateMonth: selectedMonth,
      }),
    [
      workers,
      attendance,
      manpowerPlans,
      recruitmentRequests,
      excessRecruitmentRequests,
      leaveRequests,
      overtimeRequests,
      payrollRuns,
      loans,
      workSchedules,
      selectedMonth,
    ]
  );

  const bioDash = useMemo(
    () =>
      computeHrmBiometricEnrollmentStats(
        workers,
        biometricDeviceMappings,
        biometricDevices
      ),
    [workers, biometricDeviceMappings, biometricDevices]
  );

  const projectNames = useMemo(() => {
    const set = new Set<string>(["Bole Tower", "CMC Residential", "Megenagna Commercial", "Head Office"]);
    projects.forEach((p) => p.name && set.add(p.name));
    workers.forEach((w) => (w.assignedProject || w.currentSite) && set.add(String(w.assignedProject || w.currentSite)));
    return Array.from(set);
  }, [projects, workers]);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner((cur) => (cur?.text === text ? null : cur)), 6000);
  };

  // ============================================================
  // 1. RECRUITMENT & MANPOWER STATE
  // ============================================================
  const [planForm, setPlanForm] = useState({
    project: "Bole Tower",
    department: "Construction",
    jobPosition: "Steel Fixer",
    approvedManpower: 20,
    budgetedMonthlySalaryPerHead: 14000,
    fiscalYear: String(new Date().getFullYear()),
    notes: "",
  });

  const [recForm, setRecForm] = useState({
    project: "Bole Tower",
    department: "Construction",
    jobPosition: "Steel Fixer",
    requestedCount: 2,
    employmentType: "Permanent" as "Permanent" | "Contract" | "Daily Labourer",
    urgency: "Normal" as "Normal" | "High" | "Critical",
    requiredByDate: new Date().toISOString().slice(0, 10),
    proposedMonthlySalary: 14500,
    jobResponsibilities: "",
    experienceRequired: "2+ Years Site Construction Experience",
    qualificationsRequired: "Grade 10+ / TVET Level III Certificate",
    justification: "",
    supportingDocuments: [] as RecruitmentSupportingDocument[],
  });
  const [uploadingRecDoc, setUploadingRecDoc] = useState(false);

  // Recruitment Decision / Audit / Resubmit / Excess Approval Modals
  const [recDecisionModal, setRecDecisionModal] = useState<{
    req: RecruitmentRequestRecord;
    decision: "Approved" | "Rejected" | "Returned";
  } | null>(null);
  const [recDecisionNotes, setRecDecisionNotes] = useState("");
  const [viewingRecAudit, setViewingRecAudit] = useState<RecruitmentRequestRecord | null>(null);
  const [resubmittingRec, setResubmittingRec] = useState<RecruitmentRequestRecord | null>(null);
  const [excessModalReq, setExcessModalReq] = useState<RecruitmentRequestRecord | null>(null);
  const [excessCountInput, setExcessCountInput] = useState(1);
  const [excessJustificationInput, setExcessJustificationInput] = useState("");
  const [excessBusy, setExcessBusy] = useState(false);
  const [excessDecisionModal, setExcessDecisionModal] = useState<{
    excess: ExcessRecruitmentRequestRecord;
    decision: "Approved" | "Rejected";
  } | null>(null);
  const [excessDecisionNotes, setExcessDecisionNotes] = useState("");
  const [resubmitForm, setResubmitForm] = useState({
    project: "",
    department: "",
    jobPosition: "",
    requestedCount: 1,
    employmentType: "Permanent" as "Permanent" | "Contract" | "Daily Labourer",
    urgency: "Normal" as "Normal" | "High" | "Critical",
    requiredByDate: "",
    proposedMonthlySalary: 0,
    jobResponsibilities: "",
    experienceRequired: "",
    qualificationsRequired: "",
    justification: "",
    supportingDocuments: [] as RecruitmentSupportingDocument[],
    notes: "",
  });

  const liveRecManpowerPreview = useMemo(() => {
    const row = dash.manpowerRows.find(
      (r) =>
        r.project.toLowerCase() === recForm.project.toLowerCase() &&
        r.jobPosition.toLowerCase() === recForm.jobPosition.toLowerCase()
    );
    const approved = row?.approvedManpower || 0;
    const hired = row?.actualHired || 0;
    const remaining = row?.remainingVacancies || 0;
    const excess = Math.max(0, recForm.requestedCount - remaining);
    return { approved, hired, remaining, excess, exceeds: excess > 0 };
  }, [dash.manpowerRows, recForm.project, recForm.jobPosition, recForm.requestedCount]);

  const allDirectorApprovedRecruitmentRequests = useMemo(
    () =>
      recruitmentRequests.filter(
        (r) =>
          (r.workflowStage === "Approved" ||
            r.workflowStage === "Fulfilled" ||
            r.status === "Approved" ||
            r.status === "Fulfilled") &&
          Boolean(r.hrRegistrationAuthorized)
      ),
    [recruitmentRequests]
  );

  const approvedRequestsWithOpenSlots = useMemo(
    () =>
      allDirectorApprovedRecruitmentRequests.filter(
        (r) =>
          r.workflowStage === "Approved" &&
          r.status === "Approved" &&
          (r.hiredCount || 0) < r.requestedCount
      ),
    [allDirectorApprovedRecruitmentRequests]
  );

  const pendingExcessRequests = useMemo(
    () => excessRecruitmentRequests.filter((e) => e.status === "Pending Director"),
    [excessRecruitmentRequests]
  );

  const actionableRequestsForRole = useMemo(
    () =>
      recruitmentRequests.filter(
        (r) => r.status === "Pending" && canActorApproveRecruitmentStage(currentUserRole, r.workflowStage)
      ),
    [recruitmentRequests, currentUserRole]
  );

  const returnedRequestsForUser = useMemo(
    () =>
      recruitmentRequests.filter((r) =>
        canRequesterResubmitRecruitmentRequest({
          request: r,
          actorUid,
          actorRole: currentUserRole,
        })
      ),
    [recruitmentRequests, actorUid, currentUserRole]
  );

  const openExcessRequestModal = (req: RecruitmentRequestRecord, prefillReason?: string) => {
    if (!perms.canRegisterApprovedEmployees) {
      return showToast(
        "error",
        "Only HR Manager (or Super Admin) can submit an Excess Recruitment Approval Request."
      );
    }
    setExcessModalReq(req);
    setExcessCountInput(1);
    setExcessJustificationInput(prefillReason || "");
  };

  const handleSubmitExcessRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excessModalReq) return;
    setExcessBusy(true);
    try {
      const created = await submitExcessRecruitmentRequest({
        recruitmentRequest: excessModalReq,
        excessCount: Number(excessCountInput || 1),
        justification: excessJustificationInput,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        existingExcessRequests: excessRecruitmentRequests,
        users: systemUsers,
      });
      onLogAction(
        "HRM Excess Recruitment Requested",
        `${created.requestNo} (+${created.excessCount}x ${created.jobPosition} on ${created.recruitmentRequestNo}) sent to Director`
      );
      showToast(
        "info",
        `Excess Recruitment Request ${created.requestNo} (+${created.excessCount}) submitted to Director. Excess registration remains blocked until Director approves.`
      );
      setExcessModalReq(null);
      setExcessJustificationInput("");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to submit excess recruitment request.");
    } finally {
      setExcessBusy(false);
    }
  };

  const handleSubmitExcessDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excessDecisionModal) return;
    const parentReq = recruitmentRequests.find(
      (r) => r.id === excessDecisionModal.excess.recruitmentRequestId
    );
    if (!parentReq) {
      return showToast("error", "Parent recruitment request could not be found.");
    }
    setExcessBusy(true);
    try {
      const res = await decideExcessRecruitmentRequest({
        excessRequest: excessDecisionModal.excess,
        recruitmentRequest: parentReq,
        decision: excessDecisionModal.decision,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        notes: excessDecisionNotes,
        users: systemUsers,
      });
      onLogAction(
        "HRM Excess Recruitment Decision",
        `${res.updatedExcess.requestNo} -> ${res.updatedExcess.status} (Authorized Qty: ${res.updatedRecruitment.requestedCount})`
      );
      showToast(
        res.updatedExcess.status === "Approved" ? "success" : "info",
        res.updatedExcess.status === "Approved"
          ? `Director approved ${res.updatedExcess.requestNo}! Authorized qty for ${res.updatedRecruitment.requestNo} is now ${res.updatedRecruitment.requestedCount}. HR Manager may finalize registration.`
          : `Director rejected ${res.updatedExcess.requestNo}. Excess registration remains blocked.`
      );
      setExcessDecisionModal(null);
      setExcessDecisionNotes("");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to process excess decision.");
    } finally {
      setExcessBusy(false);
    }
  };

  const handleSaveManpowerPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canManageEmployees && !perms.isHrManager && !perms.isDirector && !perms.isOperationManager) {
      return showToast("error", "Only HR Manager, Operation Manager, or Director can update Manpower Plans.");
    }
    const nowIso = new Date().toISOString();
    const record: ManpowerPlanRecord = {
      id: `MPP-${Date.now()}`,
      planCode: `MP-${planForm.fiscalYear}-${Math.floor(100 + Math.random() * 900)}`,
      fiscalYear: planForm.fiscalYear,
      project: planForm.project,
      department: planForm.department,
      jobPosition: planForm.jobPosition,
      approvedManpower: Number(planForm.approvedManpower || 0),
      budgetedMonthlySalaryPerHead: Number(planForm.budgetedMonthlySalaryPerHead || 0),
      currency: "ETB",
      status: "Approved",
      approvedBy: actorName,
      approvedAt: nowIso,
      notes: planForm.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveManpowerPlan(record);
    onLogAction("HRM Manpower Plan Saved", `${record.project} / ${record.jobPosition}: Approved Quota ${record.approvedManpower}`);
    showToast("success", `Manpower quota saved (${record.approvedManpower} headcount for ${record.jobPosition}).`);
  };

  const handleUploadRecDocument = async (file: File) => {
    setUploadingRecDoc(true);
    try {
      const nowIso = new Date().toISOString();
      const path = `hrm/recruitment/docs/${Date.now()}_${file.name}`;
      const res = await DbService.uploadHrmFile(file, path);
      const docMeta: RecruitmentSupportingDocument = {
        id: `RECDOC-${Date.now()}`,
        name: file.name,
        url: res.url,
        storagePath: res.storagePath,
        uploadedAt: nowIso,
        uploadedBy: actorName,
      };
      setRecForm((p) => ({
        ...p,
        supportingDocuments: [...p.supportingDocuments, docMeta],
      }));
      showToast("success", `Attached supporting document "${file.name}".`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to upload supporting document.");
    } finally {
      setUploadingRecDoc(false);
    }
  };

  const handleUploadResubmitDocument = async (file: File) => {
    setUploadingRecDoc(true);
    try {
      const nowIso = new Date().toISOString();
      const path = `hrm/recruitment/docs/${Date.now()}_${file.name}`;
      const res = await DbService.uploadHrmFile(file, path);
      const docMeta: RecruitmentSupportingDocument = {
        id: `RECDOC-${Date.now()}`,
        name: file.name,
        url: res.url,
        storagePath: res.storagePath,
        uploadedAt: nowIso,
        uploadedBy: actorName,
      };
      setResubmitForm((p) => ({
        ...p,
        supportingDocuments: [...p.supportingDocuments, docMeta],
      }));
      showToast("success", `Attached updated document "${file.name}".`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to upload supporting document.");
    } finally {
      setUploadingRecDoc(false);
    }
  };

  const handleSubmitRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canSubmitManpowerRequest) {
      return showToast(
        "error",
        "Only Section Head (or Super Admin) can submit a new Manpower Recruitment Request."
      );
    }
    if (!recForm.justification.trim()) {
      return showToast("error", "Please enter a recruitment reason / justification.");
    }
    if (!recForm.jobResponsibilities.trim()) {
      return showToast("error", "Please specify key job responsibilities.");
    }
    try {
      const rec = await submitRecruitmentRequestWithManpowerCheck({
        ...recForm,
        requestedCount: Number(recForm.requestedCount || 1),
        proposedMonthlySalary: Number(recForm.proposedMonthlySalary || 0),
        actorName,
        actorUid,
        actorRole: currentUserRole,
        manpowerPlans,
        workers,
        existingRequests: recruitmentRequests,
        users: systemUsers,
      });
      onLogAction(
        "HRM Recruitment Requested",
        `${rec.requestNo} (${rec.requestedCount}x ${rec.jobPosition} for ${rec.project})${rec.exceedsManpowerLimit ? " [EXCESS ALERT SENT TO DIRECTOR]" : ""}`
      );
      showToast(
        rec.exceedsManpowerLimit ? "info" : "success",
        rec.exceedsManpowerLimit
          ? `Submitted ${rec.requestNo} to HR Manager (Step 2). Exceeds approved manpower by ${rec.excessCount} — Director Alert also sent.`
          : `Submitted ${rec.requestNo} and automatically notified HR Manager for Step 2 verification.`
      );
      setRecForm((p) => ({
        ...p,
        jobResponsibilities: "",
        justification: "",
        supportingDocuments: [],
      }));
    } catch (err: any) {
      showToast("error", err?.message || "Failed to submit recruitment request.");
    }
  };

  const canActOnRecruitmentStage = (stage: RecruitmentRequestRecord["workflowStage"]): boolean =>
    canActorApproveRecruitmentStage(currentUserRole, stage);

  const openRecruitmentDecisionModal = (
    req: RecruitmentRequestRecord,
    decision: "Approved" | "Rejected" | "Returned"
  ) => {
    if (!canActOnRecruitmentStage(req.workflowStage)) {
      return showToast(
        "error",
        `Your role (${currentUserRole}) cannot act on stage "${req.workflowStage}".`
      );
    }
    setRecDecisionNotes("");
    setRecDecisionModal({ req, decision });
  };

  const handleSubmitRecruitmentDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recDecisionModal) return;
    const { req, decision } = recDecisionModal;
    try {
      const updated = await advanceRecruitmentApproval({
        request: req,
        decision,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        notes: recDecisionNotes,
        users: systemUsers,
        tasks: erpTasks,
      });
      onLogAction(
        "HRM Recruitment Workflow",
        `${req.requestNo} -> ${decision} at ${req.workflowStage} -> Now: ${updated.workflowStage}`
      );
      showToast(
        decision === "Rejected" ? "info" : "success",
        updated.workflowStage === "Approved"
          ? `${req.requestNo} received Director Final Approval! HR Manager is now authorized to register employee(s).`
          : `${req.requestNo} updated to "${updated.workflowStage}". Notifications & department tasks dispatched.`
      );
      setRecDecisionModal(null);
    } catch (err: any) {
      showToast("error", err?.message || "Workflow error.");
    }
  };

  const openResubmitModal = (req: RecruitmentRequestRecord) => {
    if (
      !canRequesterResubmitRecruitmentRequest({
        request: req,
        actorUid,
        actorRole: currentUserRole,
      })
    ) {
      return showToast(
        "error",
        `Only the original requester (${req.requestedBy}) or Super Admin can revise and resubmit ${req.requestNo}.`
      );
    }
    setResubmittingRec(req);
    setResubmitForm({
      project: req.project,
      department: req.department,
      jobPosition: req.jobPosition,
      requestedCount: req.requestedCount,
      employmentType: req.employmentType,
      urgency: req.urgency,
      requiredByDate: req.requiredByDate,
      proposedMonthlySalary: req.proposedMonthlySalary,
      jobResponsibilities: req.jobResponsibilities || "",
      experienceRequired: req.experienceRequired || "",
      qualificationsRequired: req.qualificationsRequired,
      justification: req.justification,
      supportingDocuments: req.supportingDocuments || [],
      notes: "",
    });
  };

  const handleResubmitRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmittingRec) return;
    try {
      const updated = await resubmitReturnedRecruitmentRequest({
        request: resubmittingRec,
        updates: {
          project: resubmitForm.project,
          department: resubmitForm.department,
          jobPosition: resubmitForm.jobPosition,
          requestedCount: Number(resubmitForm.requestedCount || 1),
          employmentType: resubmitForm.employmentType,
          urgency: resubmitForm.urgency,
          requiredByDate: resubmitForm.requiredByDate,
          proposedMonthlySalary: Number(resubmitForm.proposedMonthlySalary || 0),
          jobResponsibilities: resubmitForm.jobResponsibilities,
          experienceRequired: resubmitForm.experienceRequired,
          qualificationsRequired: resubmitForm.qualificationsRequired,
          justification: resubmitForm.justification,
          supportingDocuments: resubmitForm.supportingDocuments,
        },
        actorName,
        actorUid,
        actorRole: currentUserRole,
        manpowerPlans,
        workers,
        users: systemUsers,
        tasks: erpTasks,
        notes: resubmitForm.notes,
      });
      onLogAction("HRM Recruitment Resubmitted", `${updated.requestNo} revised & resubmitted to HR Manager`);
      showToast("success", `${updated.requestNo} resubmitted to HR Manager (Step 2) with full prior audit history preserved.`);
      setResubmittingRec(null);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to resubmit request.");
    }
  };

  // ============================================================
  // 2. EMPLOYEE REGISTRATION & DIRECTORY STATE
  // ============================================================
  const [empSearch, setEmpSearch] = useState("");
  const [empProjectFilter, setEmpProjectFilter] = useState("ALL");
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [onboardingFromRec, setOnboardingFromRec] = useState<RecruitmentRequestRecord | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [docCategory, setDocCategory] = useState<
    "Contract" | "ID / Fayda" | "Certificate" | "Medical" | "Clearance" | "Other"
  >("Contract");

  const emptyEmpForm = () => ({
    employeeId: generateNextEmployeeId(workers),
    userId: "",
    name: "",
    phoneNumber: "",
    faydaId: "",
    nationalId: "",
    gender: "Male" as "Male" | "Female" | "Other",
    dateOfBirth: "1994-01-01",
    address: "Addis Ababa",
    emergencyContact: "",
    department: "Construction",
    position: "Engineer",
    trade: "Site Engineer",
    jobResponsibilities: "",
    employmentType: "Permanent",
    joinedDate: new Date().toISOString().slice(0, 10),
    assignedProject: projectNames[0] || "Bole Tower",
    workLocationType: "Construction Site" as "Head Office" | "Construction Site",
    qualifications: "",
    experienceYears: 3,
    experienceSummary: "",
    skills: "",
    certifications: "",
    bankName: "Commercial Bank of Ethiopia",
    bankAccountNumber: "",
    mobileMoneyType: "Telebirr",
    mobileMoneyNumber: "",
    salaryStructureId: "",
    salaryGrade: "",
    basicMonthlySalary: 14000,
    housingAllowance: 0,
    transportAllowance: 0,
    positionAllowance: 0,
    medicalAllowance: 0,
    biometricRegistered: false,
    photo: "",
    photoStoragePath: "",
    documents: [] as NonNullable<Worker["documents"]>,
    status: "Active" as "Active" | "Inactive",
  });

  const [empForm, setEmpForm] = useState(emptyEmpForm);

  const openNewEmployeeModal = (fromRec?: RecruitmentRequestRecord) => {
    if (!perms.canRegisterApprovedEmployees) {
      return showToast(
        "error",
        "Employee registration is strictly restricted to HR Manager after Director final approval."
      );
    }
    const targetRec =
      fromRec || approvedRequestsWithOpenSlots[0] || allDirectorApprovedRecruitmentRequests[0] || null;
    if (!targetRec) {
      return showToast(
        "error",
        "Employee registration is blocked until Director gives Final Approval on a Recruitment Request."
      );
    }
    const authCheck = validateEmployeeRegistrationAuthorization({
      role: currentUserRole,
      recruitmentRequest: targetRec,
    });
    if (!authCheck.allowed) {
      if (authCheck.excessDetected) {
        showToast(
          "error",
          authCheck.reason ||
            "Approved manpower quantity already filled. Submit an Additional Excess Approval Request to Director."
        );
        openExcessRequestModal(
          targetRec,
          `Additional headcount needed beyond approved ${targetRec.requestedCount} for ${targetRec.jobPosition} at ${targetRec.project}.`
        );
        return;
      }
      return showToast(
        "error",
        authCheck.reason ||
          "Employee registration is blocked until Director gives Final Approval on a Recruitment Request."
      );
    }
    const base = emptyEmpForm();
    const matchedStructure = salaryStructures.find(
      (s) =>
        s.isActive &&
        (s.structureName.toLowerCase().includes(targetRec.jobPosition.toLowerCase()) ||
          s.department.toLowerCase() === targetRec.department.toLowerCase())
    );
    setOnboardingFromRec(targetRec);
    setEmpForm({
      ...base,
      assignedProject: targetRec.project,
      workLocationType: inferWorkerWorkLocationType({ assignedProject: targetRec.project }),
      department: targetRec.department,
      position: targetRec.jobPosition,
      trade: targetRec.jobPosition,
      jobResponsibilities: targetRec.jobResponsibilities || "",
      employmentType: targetRec.employmentType,
      joinedDate: targetRec.requiredByDate || new Date().toISOString().slice(0, 10),
      salaryStructureId: matchedStructure?.id || "",
      salaryGrade: matchedStructure?.jobGrade || "",
      basicMonthlySalary: targetRec.proposedMonthlySalary || matchedStructure?.basicSalary || 14000,
      housingAllowance: matchedStructure?.housingAllowance || 0,
      transportAllowance: matchedStructure?.transportAllowance || 0,
      positionAllowance: matchedStructure?.positionAllowance || 0,
      medicalAllowance: matchedStructure?.medicalAllowance || 0,
      qualifications: targetRec.qualificationsRequired || "",
      experienceSummary: targetRec.experienceRequired || "",
    });
    setEditingWorkerId(null);
    setShowEmpModal(true);
  };

  const openEditEmployeeModal = (w: Worker) => {
    if (!perms.canEditEmployeeProfiles) {
      return showToast(
        "error",
        isAmharic
          ? "በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃ ማሻሻልና ማስተካከል የሚችለው HR manager ብቻ ነው።"
          : "According to company policy, only the HR Manager can modify and update employee information."
      );
    }
    const dec = decryptedPiiMap[w.id];
    setOnboardingFromRec(null);
    setEditingWorkerId(w.id);
    setEmpForm({
      employeeId: w.employeeId || w.id,
      userId: w.userId || "",
      name: w.name || "",
      phoneNumber: w.phoneNumber || "",
      faydaId: dec?.faydaId || w.faydaId || "",
      nationalId: w.nationalId || dec?.faydaId || "",
      gender: w.gender || "Male",
      dateOfBirth: w.dateOfBirth || "1994-01-01",
      address: w.address || "",
      emergencyContact: w.emergencyContact || "",
      department: w.department || "Construction",
      position: w.position || w.trade || "Staff",
      trade: w.trade || w.position || "Staff",
      jobResponsibilities: w.jobResponsibilities || "",
      employmentType: String(w.employmentType || "Permanent"),
      joinedDate: w.joinedDate || new Date().toISOString().slice(0, 10),
      assignedProject: w.assignedProject || w.currentSite || projectNames[0] || "Bole Tower",
      workLocationType: inferWorkerWorkLocationType(w),
      qualifications: w.qualifications || "",
      experienceYears: Number(w.experienceYears || 0),
      experienceSummary: w.experienceSummary || "",
      skills: w.skills || "",
      certifications: w.certifications || "",
      bankName: w.bankName || "Commercial Bank of Ethiopia",
      bankAccountNumber: dec?.bankAccountNumber || w.bankAccountNumber || "",
      mobileMoneyType: String(w.mobileMoneyType || "Telebirr"),
      mobileMoneyNumber: dec?.mobileMoneyNumber || w.mobileMoneyNumber || "",
      salaryStructureId: w.salaryStructureId || "",
      salaryGrade: w.salaryGrade || "",
      basicMonthlySalary: Number(w.basicMonthlySalary || 14000),
      housingAllowance: Number(w.housingAllowance || 0),
      transportAllowance: Number(w.transportAllowance || 0),
      positionAllowance: Number(w.positionAllowance || 0),
      medicalAllowance: Number(w.medicalAllowance || 0),
      biometricRegistered: Boolean(
        w.biometricEnrollmentStatus === "Active" || w.biometricAttendanceActivated || w.biometricRegistered
      ),
      photo: w.photo || "",
      photoStoragePath: w.photoStoragePath || "",
      documents: w.documents || [],
      status: w.status || "Active",
    });
    setShowEmpModal(true);
  };

  // Integrated Employee Biometric Enrollment Profile Modal State & Handlers
  const [viewingBioProfileWorkerId, setViewingBioProfileWorkerId] = useState<string | null>(null);
  const [bioProfileBusy, setBioProfileBusy] = useState(false);
  const [bioSuspendReason, setBioSuspendReason] = useState("");
  const [bioEnrollForm, setBioEnrollForm] = useState({
    deviceId: "",
    biometricUserId: "",
    workLocationType: "Construction Site" as "Head Office" | "Construction Site",
    projectSite: "",
    enrollmentDate: new Date().toISOString().slice(0, 10),
    markMappingPending: false,
    notes: "",
  });

  const viewingBioProfileWorker = useMemo(
    () => workers.find((w) => w.id === viewingBioProfileWorkerId) || null,
    [workers, viewingBioProfileWorkerId]
  );

  const viewingBioProfileState = useMemo(
    () =>
      viewingBioProfileWorker
        ? computeEmployeeBiometricProfileState(
            viewingBioProfileWorker,
            biometricDeviceMappings,
            biometricDevices
          )
        : null,
    [viewingBioProfileWorker, biometricDeviceMappings, biometricDevices]
  );

  const openEmployeeBiometricProfileModal = (w: Worker) => {
    const state = computeEmployeeBiometricProfileState(
      w,
      biometricDeviceMappings,
      biometricDevices
    );
    const firstActiveDev = biometricDevices.find((d) => d.status === "Active");
    setViewingBioProfileWorkerId(w.id);
    setBioSuspendReason("");
    setBioEnrollForm({
      deviceId: state.biometricDeviceId || firstActiveDev?.id || "",
      biometricUserId: state.deviceUserId || "",
      workLocationType: state.workLocationType,
      projectSite: state.projectSite || w.assignedProject || w.currentSite || "Head Office",
      enrollmentDate: state.enrollmentDate || new Date().toISOString().slice(0, 10),
      markMappingPending: state.enrollmentStatus === "Mapping Pending",
      notes: "",
    });
  };

  const handleStage2DeviceEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingBioProfileWorker) return;
    setBioProfileBusy(true);
    try {
      const res = await enrollEmployeeOnBiometricDevice({
        worker: viewingBioProfileWorker,
        deviceId: bioEnrollForm.deviceId,
        biometricUserId: bioEnrollForm.biometricUserId,
        workLocationType: bioEnrollForm.workLocationType,
        projectSite: bioEnrollForm.projectSite,
        enrollmentDate: bioEnrollForm.enrollmentDate,
        markMappingPending: bioEnrollForm.markMappingPending,
        notes: bioEnrollForm.notes,
        devices: biometricDevices,
        existingMappings: biometricDeviceMappings,
        allWorkers: workers,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveWorker: onUpdateWorker,
      });
      onLogAction(
        "Employee Biometric Device Enrollment",
        `${res.updatedWorker.name} (${res.updatedWorker.employeeId || res.updatedWorker.id}) enrolled on ${res.updatedWorker.biometricDeviceName} [BioID: ${res.updatedWorker.biometricDeviceUserId}] (${res.updatedWorker.biometricEnrollmentStatus})`
      );
      showToast(
        "success",
        `Biometric Enrollment saved (${res.updatedWorker.biometricEnrollmentStatus}). Next step: Complete Employee Biometric Mapping.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to save biometric enrollment.");
    } finally {
      setBioProfileBusy(false);
    }
  };

  const handleStage3CompleteMapping = async () => {
    if (!viewingBioProfileWorker || !viewingBioProfileState) return;
    setBioProfileBusy(true);
    try {
      const res = await completeEmployeeBiometricMappingWorkflow({
        worker: viewingBioProfileWorker,
        editingMapping: viewingBioProfileState.activeMapping || null,
        deviceId: bioEnrollForm.deviceId || viewingBioProfileState.biometricDeviceId,
        biometricUserId: bioEnrollForm.biometricUserId || viewingBioProfileState.deviceUserId,
        workLocationType: bioEnrollForm.workLocationType,
        projectSite: bioEnrollForm.projectSite,
        effectiveDate: bioEnrollForm.enrollmentDate,
        notes: bioEnrollForm.notes,
        workers,
        devices: biometricDevices,
        existingMappings: biometricDeviceMappings,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveWorker: onUpdateWorker,
      });
      onLogAction(
        "Employee Biometric Mapping Completed",
        `${res.updatedWorker.name} (${res.mapping.employeeId}) <-> ${res.mapping.deviceNameSnapshot} [BioID: ${res.mapping.biometricUserId}]`
      );
      showToast(
        "success",
        `Mapping completed (${res.mapping.deviceNameSnapshot} · BioID ${res.mapping.biometricUserId}). Next step: Verify device connection & Activate Attendance.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to complete biometric mapping.");
    } finally {
      setBioProfileBusy(false);
    }
  };

  const handleStage4ActivateAttendance = async () => {
    if (!viewingBioProfileWorker) return;
    setBioProfileBusy(true);
    try {
      const res = await activateEmployeeBiometricAttendance({
        worker: viewingBioProfileWorker,
        mappings: biometricDeviceMappings,
        devices: biometricDevices,
        notes: bioEnrollForm.notes,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveWorker: onUpdateWorker,
      });
      onLogAction(
        "Employee Biometric Attendance Activated",
        `${res.updatedWorker.name} (${res.updatedWorker.employeeId || res.updatedWorker.id}) -> Status: Active on ${res.updatedWorker.biometricDeviceName}`
      );
      showToast(
        "success",
        `Biometric attendance is now ACTIVE for ${res.updatedWorker.name}. Punches will now sync directly to Attendance.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Cannot activate biometric attendance yet.");
    } finally {
      setBioProfileBusy(false);
    }
  };

  const handleSuspendBiometricEnrollment = async () => {
    if (!viewingBioProfileWorker) return;
    setBioProfileBusy(true);
    try {
      const res = await suspendEmployeeBiometricEnrollment({
        worker: viewingBioProfileWorker,
        mappings: biometricDeviceMappings,
        devices: biometricDevices,
        reason: bioSuspendReason,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveWorker: onUpdateWorker,
      });
      onLogAction(
        "Employee Biometric Enrollment Suspended",
        `${res.updatedWorker.name} (${res.updatedWorker.employeeId || res.updatedWorker.id}): ${bioSuspendReason}`
      );
      setBioSuspendReason("");
      showToast(
        "info",
        `Biometric enrollment suspended for ${res.updatedWorker.name}. Historical audit logs preserved.`
      );
    } catch (err: any) {
      showToast("error", err?.message || "Failed to suspend biometric enrollment.");
    } finally {
      setBioProfileBusy(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const path = `hrm/employees/${empForm.employeeId}/photo_${Date.now()}_${file.name}`;
      const res = await DbService.uploadHrmFile(file, path);
      setEmpForm((p) => ({ ...p, photo: res.url, photoStoragePath: res.storagePath }));
      onLogAction("HRM Photo Uploaded", `Uploaded photo for ${empForm.employeeId}`);
      showToast("success", "Employee photo uploaded.");
    } catch (err: any) {
      showToast("error", err?.message || "Photo upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocUpload = async (
    file: File,
    category: "Contract" | "ID / Fayda" | "Certificate" | "Medical" | "Clearance" | "Other"
  ) => {
    try {
      const nowIso = new Date().toISOString();
      const path = `hrm/employees/${empForm.employeeId}/docs/${Date.now()}_${file.name}`;
      const res = await DbService.uploadHrmFile(file, path);
      const docId = `DOC-${Date.now()}`;
      setEmpForm((p) => ({
        ...p,
        documents: [
          ...p.documents,
          {
            id: docId,
            name: file.name,
            category,
            url: res.url,
            storagePath: res.storagePath,
            uploadedAt: nowIso,
          },
        ],
      }));
      // Sync into Enterprise Document Management registry
      await DbService.addEnterpriseDocument({
        id: docId,
        title: `${empForm.employeeId} (${empForm.name || "Employee"}) — ${file.name}`,
        name: file.name,
        category: `HRM - ${category}`,
        project: empForm.assignedProject,
        url: res.url,
        storagePath: res.storagePath,
        uploadedBy: actorName,
        uploadedAt: nowIso,
      }).catch(() => {});
      onLogAction("HRM Document Uploaded", `${category}: ${file.name} (${empForm.employeeId})`);
      showToast("success", `Attached ${file.name} (${category}) & synced to Document Management.`);
    } catch (err: any) {
      showToast("error", err?.message || "Document upload failed.");
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canEditEmployeeProfiles) {
      return showToast(
        "error",
        isAmharic
          ? "በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃ ማሻሻልና ማስተካከል የሚችለው HR manager ብቻ ነው።"
          : "According to company policy, only the HR Manager can create or modify employee profiles."
      );
    }
    if (!empForm.name.trim()) {
      return showToast("error", "Employee full name is required.");
    }
    const nowIso = new Date().toISOString();
    const nowDate = nowIso.slice(0, 10);
    const existing = editingWorkerId ? workers.find((w) => w.id === editingWorkerId) : undefined;
    // Guarantee strict uniqueness on newly assigned Employee IDs even under concurrent registrations
    const assignedEmployeeId = existing
      ? existing.employeeId || existing.id
      : workers.some(
          (w) =>
            String(w.employeeId || "").trim().toUpperCase() ===
              String(empForm.employeeId || "").trim().toUpperCase() ||
            String(w.id || "").trim().toUpperCase() ===
              String(empForm.employeeId || "").trim().toUpperCase()
        )
      ? generateNextEmployeeId(workers)
      : empForm.employeeId;
    const targetWorkerId = existing ? existing.id : assignedEmployeeId;
    const prevDecrypted = decryptedPiiMap[targetWorkerId];

    // Preserve unmasked PII if form still contains masked asterisks from unrevealed state
    const resolvedFayda =
      empForm.faydaId.includes("****") && prevDecrypted?.faydaId
        ? prevDecrypted.faydaId
        : empForm.faydaId.trim();
    const resolvedNationalId =
      empForm.nationalId.includes("****") && prevDecrypted?.faydaId
        ? prevDecrypted.faydaId
        : (empForm.nationalId || resolvedFayda).trim();
    const resolvedBankAcc =
      empForm.bankAccountNumber.includes("****") && prevDecrypted?.bankAccountNumber
        ? prevDecrypted.bankAccountNumber
        : empForm.bankAccountNumber.trim();
    const resolvedMobileMoney =
      empForm.mobileMoneyNumber.includes("****") && prevDecrypted?.mobileMoneyNumber
        ? prevDecrypted.mobileMoneyNumber
        : empForm.mobileMoneyNumber.trim();

    // Check duplicate Employee ID / Phone / Fayda ID / National ID / Name+DOB
    const dupCheck = await checkDuplicateEmployeeRegistration({
      employeeId: assignedEmployeeId,
      phoneNumber: empForm.phoneNumber,
      faydaId: resolvedFayda,
      nationalId: resolvedNationalId,
      name: empForm.name,
      dateOfBirth: empForm.dateOfBirth,
      ignoreWorkerId: existing?.id,
      existingWorkers: workers,
      existingPrivateProfiles: privateProfiles,
    });
    if (dupCheck.isDuplicate) {
      return showToast("error", dupCheck.reason || "Duplicate employee registration blocked.");
    }

    // Encrypt sensitive PII & compute deterministic hashes for duplicate blocking
    const [
      faydaEnc,
      nationalEnc,
      bankEnc,
      mobileEnc,
      emergencyEnc,
      faydaIdHash,
      nationalIdHash,
      phoneNormalizedHash,
    ] = await Promise.all([
      encryptSensitiveText(resolvedFayda),
      encryptSensitiveText(resolvedNationalId),
      encryptSensitiveText(resolvedBankAcc),
      encryptSensitiveText(resolvedMobileMoney),
      encryptSensitiveText(empForm.emergencyContact.trim()),
      hashSensitiveIdentifier(resolvedFayda),
      hashSensitiveIdentifier(resolvedNationalId),
      hashSensitiveIdentifier(empForm.phoneNumber.replace(/\D/g, "").replace(/^251/, "").replace(/^0/, "")),
    ]);

    const privateProfile: HrmPrivateProfileRecord = {
      id: targetWorkerId,
      workerId: targetWorkerId,
      employeeId: assignedEmployeeId,
      userId: empForm.userId.trim() || existing?.userId || targetWorkerId,
      faydaIdEncrypted: faydaEnc,
      nationalIdEncrypted: nationalEnc,
      bankName: empForm.bankName,
      bankAccountEncrypted: bankEnc,
      mobileMoneyType: empForm.mobileMoneyType,
      mobileMoneyNumberEncrypted: mobileEnc,
      emergencyContactEncrypted: emergencyEnc,
      faydaIdHash: faydaIdHash || undefined,
      nationalIdHash: nationalIdHash || undefined,
      phoneNormalizedHash: phoneNormalizedHash || undefined,
      encryptionAlgorithm: "AES-GCM-256",
      updatedBy: actorName,
      createdAt: existing?.joinedDate ? `${existing.joinedDate}T00:00:00.000Z` : nowIso,
      updatedAt: nowIso,
    };

    // Store only safe masked previews on public Worker document
    const maskedFayda = resolvedFayda ? buildMaskedPreview(resolvedFayda) : "";
    const maskedNational = resolvedNationalId ? buildMaskedPreview(resolvedNationalId) : "";
    const maskedBank = resolvedBankAcc ? buildMaskedPreview(resolvedBankAcc) : "";
    const maskedMobile = resolvedMobileMoney ? buildMaskedPreview(resolvedMobileMoney) : "";

    const workerPayload: Worker = stripProhibitedBiometricTemplateFields({
      ...(existing || {
        company: "OVID Real Estate — Digital Construction ERP",
        teamId: "TEAM-GENERAL",
        leaveBalances: { annual: 16, sick: 10, maternityPaternity: 15, unpaidUsed: 0 },
      }),
      id: targetWorkerId,
      employeeId: assignedEmployeeId,
      userId: empForm.userId.trim() || existing?.userId || undefined,
      name: empForm.name.trim(),
      phoneNumber: empForm.phoneNumber,
      faydaId: maskedFayda,
      nationalId: maskedNational,
      gender: empForm.gender,
      dateOfBirth: empForm.dateOfBirth,
      address: empForm.address,
      emergencyContact: empForm.emergencyContact ? buildMaskedPreview(empForm.emergencyContact) : "",
      department: empForm.department,
      position: empForm.position,
      trade: empForm.trade || empForm.position,
      jobResponsibilities: empForm.jobResponsibilities,
      employmentType: empForm.employmentType,
      joinedDate: empForm.joinedDate || existing?.joinedDate || nowDate,
      assignedProject: empForm.assignedProject,
      currentSite: empForm.assignedProject,
      workLocationType: empForm.workLocationType,
      qualifications: empForm.qualifications,
      experienceYears: Number(empForm.experienceYears || 0),
      experienceSummary: empForm.experienceSummary,
      skills: empForm.skills,
      certifications: empForm.certifications,
      bankName: empForm.bankName,
      bankAccountNumber: maskedBank,
      mobileMoneyType: empForm.mobileMoneyType,
      mobileMoneyNumber: maskedMobile,
      salaryStructureId: empForm.salaryStructureId || undefined,
      salaryGrade: empForm.salaryGrade || undefined,
      basicMonthlySalary: Number(empForm.basicMonthlySalary || 0),
      hourlyRate: Math.round((Number(empForm.basicMonthlySalary || 0) / 208) * 100) / 100,
      housingAllowance: Number(empForm.housingAllowance || 0),
      transportAllowance: Number(empForm.transportAllowance || 0),
      positionAllowance: Number(empForm.positionAllowance || 0),
      medicalAllowance: Number(empForm.medicalAllowance || 0),
      biometricRegistered: existing?.biometricRegistered || false,
      biometricEnrollmentStatus:
        existing?.biometricEnrollmentStatus || ("Not Registered" as BiometricEnrollmentStatus),
      biometricWorkflowStage:
        existing?.biometricWorkflowStage || "Employee Registration",
      biometricMappingStatus: existing?.biometricMappingStatus || "Unmapped",
      biometricAttendanceActivated: existing?.biometricAttendanceActivated || false,
      photo: empForm.photo,
      photoStoragePath: empForm.photoStoragePath,
      documents: empForm.documents,
      status: empForm.status,
      recruitmentRequestId: onboardingFromRec?.id || existing?.recruitmentRequestId,
    });

    if (existing) {
      await DbService.saveHrmPrivateProfile(privateProfile);
      await onUpdateWorker(workerPayload);
      onLogAction("HRM Employee Updated", `Updated ${workerPayload.name} (${workerPayload.employeeId}) with encrypted PII`);
      showToast("success", `Employee ${workerPayload.name} updated & PII encrypted.`);
      setShowEmpModal(false);
    } else {
      const authCheck = validateEmployeeRegistrationAuthorization({
        role: currentUserRole,
        recruitmentRequest: onboardingFromRec,
      });
      if (!authCheck.allowed || !onboardingFromRec) {
        if (authCheck.excessDetected && onboardingFromRec) {
          recordExcessRegistrationAttemptAlert({
            recruitmentRequest: onboardingFromRec,
            candidateName: empForm.name.trim(),
            actorName,
            actorUid,
            actorRole: currentUserRole,
            users: systemUsers,
          }).catch(() => {});
          showToast(
            "error",
            authCheck.reason ||
              "Excess recruitment blocked: Director has been alerted. Submit Additional Excess Approval Request."
          );
          setShowEmpModal(false);
          openExcessRequestModal(
            onboardingFromRec,
            `Attempted registration for ${empForm.name.trim()} (${empForm.position}) beyond approved quantity (${onboardingFromRec.requestedCount}).`
          );
          return;
        }
        return showToast(
          "error",
          authCheck.reason || "Director Final Approval on a Recruitment Request is required before employee registration."
        );
      }
      try {
        const onboardingOutcome = await registerApprovedEmployeeFromRecruitment({
          recruitmentRequest: onboardingFromRec,
          worker: workerPayload,
          privateProfile,
          existingWorkers: workers,
          existingPrivateProfiles: privateProfiles,
          manpowerPlans,
          tasks: erpTasks,
          actorName,
          actorUid,
          actorRole: currentUserRole,
        });
        onLogAction(
          "HRM Employee Onboarded",
          `Registered ${workerPayload.employeeId} — ${workerPayload.name} (Linked Request: ${onboardingFromRec.requestNo}, ${onboardingOutcome.updatedRequest.hiredCount}/${onboardingOutcome.updatedRequest.requestedCount})`
        );
        showToast(
          onboardingOutcome.exceededManpowerAlert ? "info" : "success",
          onboardingOutcome.exceededManpowerAlert
            ? `Registered ${workerPayload.name} (${workerPayload.employeeId}) [${onboardingOutcome.updatedRequest.hiredCount}/${onboardingOutcome.updatedRequest.requestedCount}]. Alert sent to Director: active headcount exceeds project manpower quota.`
            : `Employee ${workerPayload.name} registered (${workerPayload.employeeId}) under ${onboardingFromRec.requestNo} (${onboardingOutcome.updatedRequest.hiredCount}/${onboardingOutcome.updatedRequest.requestedCount} filled).`
        );
        setShowEmpModal(false);
      } catch (err: any) {
        const msg = err?.message || "Failed to register employee.";
        if (msg.includes("EXCESS_QUOTA_EXCEEDED") && onboardingFromRec) {
          recordExcessRegistrationAttemptAlert({
            recruitmentRequest: onboardingFromRec,
            candidateName: empForm.name.trim(),
            actorName,
            actorUid,
            actorRole: currentUserRole,
            users: systemUsers,
          }).catch(() => {});
          showToast("error", msg);
          setShowEmpModal(false);
          openExcessRequestModal(
            onboardingFromRec,
            `Attempted registration for ${empForm.name.trim()} beyond approved quantity (${onboardingFromRec.requestedCount}).`
          );
          return;
        }
        showToast("error", msg);
      }
    }
  };

  const filteredWorkers = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return workers.filter((w) => {
      if (empProjectFilter !== "ALL" && (w.assignedProject || w.currentSite) !== empProjectFilter) {
        return false;
      }
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        String(w.employeeId || w.id).toLowerCase().includes(q) ||
        String(w.position || w.trade || "").toLowerCase().includes(q) ||
        String(w.department || "").toLowerCase().includes(q)
      );
    });
  }, [workers, empSearch, empProjectFilter]);

  // ============================================================
  // 3. ATTENDANCE, SCHEDULE, LEAVE, OVERTIME & TRANSFER STATE
  // ============================================================
  const [attSubView, setAttSubView] = useState<
    "board" | "exceptions" | "corrections" | "schedules" | "leaves" | "overtime" | "transfers"
  >("board");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<"ALL" | AttendanceApprovalStatus>("ALL");
  const [quickClock, setQuickClock] = useState({
    workerId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "08:00",
    checkOut: "17:00",
    explicitStatus: "Auto" as "Auto" | "Present" | "Late" | "Absent",
    qrOrEmpInput: "",
    biometricVerifiedNote: "",
    method: AttendanceMethod.MANUAL_ENTRY,
    attViewMode: "daily" as AttendancePeriodMode,
    dailyFilterDate: new Date().toISOString().slice(0, 10),
    dailyFilterProject: "ALL",
    filterDepartment: "ALL",
    filterEmployeeId: "ALL",
    filterWorkLocation: "ALL" as WorkLocationFilterType,
  });
  const [exceptionDrafts, setExceptionDrafts] = useState<
    Record<string, { time: string; notes: string }>
  >({});
  const [syncingBioQueue, setSyncingBioQueue] = useState(false);
  const [bioClockForm, setBioClockForm] = useState({
    deviceId: "",
    biometricUserId: "",
    punchType: "Check-In" as "Check-In" | "Check-Out",
  });
  const [correctionForm, setCorrectionForm] = useState({
    attendanceId: "",
    workerId: "",
    date: new Date().toISOString().slice(0, 10),
    correctionType: "Missing Check-Out" as AttendanceCorrectionType,
    proposedCheckIn: "08:00",
    proposedCheckOut: "17:00",
    proposedStatus: "Present" as AttendanceRecord["status"],
    reason: "",
    supportingEvidenceUrl: "",
    supportingEvidenceName: "",
    supportingEvidenceNote: "",
  });
  const [uploadingCorrectionEvidence, setUploadingCorrectionEvidence] = useState(false);
  const [correctionReviewNotes, setCorrectionReviewNotes] = useState<Record<string, string>>({});
  const [attActionModal, setAttActionModal] = useState<{
    record: AttendanceRecord;
    mode:
      | "Prepare / Mark Under Review"
      | "Return for Correction"
      | "Final Approve"
      | "Reject"
      | "Report Discrepancy";
  } | null>(null);
  const [attActionComments, setAttActionComments] = useState("");
  const [enforceStrictAttendanceGate, setEnforceStrictAttendanceGate] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    policyName: "OVID Standard Ethiopian Construction Attendance Policy",
    isApproved: false,
    deductUnpaidLeave: true,
    deductUnexcusedAbsence: true,
    absenceDailyMultiplier: 1,
    lateDeductionEnabled: false,
    graceMinutesBeforeDeduction: 15,
    lateDeductionHourlyFactor: 1,
    standardWorkingDaysPerMonth: 26,
    notes: "",
  });
  useEffect(() => {
    if (latestDeductionPolicy) {
      setPolicyForm({
        policyName: latestDeductionPolicy.policyName,
        isApproved: latestDeductionPolicy.isApproved,
        deductUnpaidLeave: latestDeductionPolicy.deductUnpaidLeave,
        deductUnexcusedAbsence: latestDeductionPolicy.deductUnexcusedAbsence,
        absenceDailyMultiplier: latestDeductionPolicy.absenceDailyMultiplier,
        lateDeductionEnabled: latestDeductionPolicy.lateDeductionEnabled,
        graceMinutesBeforeDeduction: latestDeductionPolicy.graceMinutesBeforeDeduction,
        lateDeductionHourlyFactor: latestDeductionPolicy.lateDeductionHourlyFactor,
        standardWorkingDaysPerMonth: latestDeductionPolicy.standardWorkingDaysPerMonth,
        notes: latestDeductionPolicy.notes || "",
      });
    }
  }, [latestDeductionPolicy]);
  const [reportSearch, setReportSearch] = useState("");

  const [schedForm, setSchedForm] = useState({
    scheduleName: "Standard Construction Day Shift",
    scopeType: "Company" as "Company" | "Project" | "Department" | "Employee",
    workLocationType: "ALL" as "ALL" | "Head Office" | "Construction Site",
    project: "ALL",
    department: "ALL",
    workerId: "",
    schedulePeriodType: "Weekly" as "Weekly" | "Monthly" | "Fixed",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    shiftStartTime: "08:00",
    shiftEndTime: "17:00",
    isNightShift: false,
    breakMinutes: 60,
    standardDailyHours: 8,
    graceMinutesLate: 15,
    restDays: ["Sunday"],
    holidayDate: "",
    holidayName: "",
    holidays: [] as { date: string; name: string }[],
    overtimeMultiplierWeekday: 1.5,
    overtimeMultiplierRestDay: 2.0,
    overtimeMultiplierHoliday: 2.5,
  });

  const [leaveForm, setLeaveForm] = useState({
    workerId: "",
    leaveType: "Annual Leave" as LeaveRequestRecord["leaveType"],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const [otForm, setOtForm] = useState({
    workerId: "",
    workDate: new Date().toISOString().slice(0, 10),
    hoursRequested: 2,
    dayType: "Weekday" as OvertimeRequestRecord["dayType"],
    reason: "",
  });

  const [transferForm, setTransferForm] = useState({
    workerId: "",
    toWorkLocationType: "Construction Site" as "Head Office" | "Construction Site",
    toProject: projectNames[0] || "CMC Residential",
    toDepartment: "Construction",
    toPosition: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  const departmentOptions = useMemo(() => {
    const set = new Set<string>(["Engineering", "Construction", "Operations", "Finance", "HR", "Administration"]);
    workers.forEach((w) => w.department && set.add(w.department));
    return Array.from(set);
  }, [workers]);

  const attDashboard = useMemo(
    () =>
      computeAttendanceWorkflowDashboard({
        workers,
        attendance,
        schedules: workSchedules,
        leaveRequests,
        overtimeRequests,
        devices: biometricDevices,
        unmappedEvents: unmappedBiometricEvents,
        filters: {
          periodMode: quickClock.attViewMode,
          anchorDate: quickClock.dailyFilterDate,
          selectedMonth,
          employeeFilter: quickClock.filterEmployeeId,
          departmentFilter: quickClock.filterDepartment,
          projectFilter: quickClock.dailyFilterProject,
          workLocationFilter: quickClock.filterWorkLocation,
        },
      }),
    [
      workers,
      attendance,
      workSchedules,
      leaveRequests,
      overtimeRequests,
      biometricDevices,
      unmappedBiometricEvents,
      quickClock.attViewMode,
      quickClock.dailyFilterDate,
      quickClock.filterEmployeeId,
      quickClock.filterDepartment,
      quickClock.dailyFilterProject,
      quickClock.filterWorkLocation,
      selectedMonth,
    ]
  );

  const handleQrQuickScan = () => {
    const token = quickClock.qrOrEmpInput.trim().toLowerCase();
    if (!token) {
      return showToast("error", "Enter or scan an Employee ID or QR token first.");
    }
    const matched = workers.find(
      (w) =>
        w.id.toLowerCase() === token ||
        String(w.employeeId || "").toLowerCase() === token ||
        String(w.qrCode || "").toLowerCase() === token
    );
    if (!matched) {
      return showToast("error", `No employee found matching QR/ID "${quickClock.qrOrEmpInput}".`);
    }
    setQuickClock((p) => ({
      ...p,
      workerId: matched.id,
      method: AttendanceMethod.QR_CODE,
      biometricVerifiedNote: `QR / Employee ID verified: ${matched.employeeId || matched.id}`,
    }));
    showToast("success", `Matched ${matched.name} (${matched.employeeId || matched.id}). Ready to log check-in/out.`);
  };

  const handleHardwareBiometricVerify = async () => {
    const w = workers.find((x) => x.id === quickClock.workerId) || workers[0];
    if (!w) return showToast("error", "Select an employee first.");
    const caps = getBiometricCapabilities();
    if (!caps.webAuthnSupported || !caps.isSecureContext) {
      return showToast(
        "error",
        "WebAuthn hardware fingerprint sensor unavailable on this browser context. Use QR/Employee ID or Authorized Manual entry."
      );
    }
    const res = await verifyWorkerFingerprint({
      id: w.id,
      name: w.name,
      fingerprint: w.fingerprint,
    });
    if (!res.success) {
      return showToast("error", res.message);
    }
    setQuickClock((p) => ({
      ...p,
      workerId: w.id,
      method: AttendanceMethod.FINGERPRINT,
      biometricVerifiedNote: `WebAuthn hardware verified (${res.credentialId?.slice(0, 8)}...)`,
    }));
    showToast("success", res.message);
  };

  const handleQuickAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = workers.find((x) => x.id === quickClock.workerId) || workers[0];
    if (!w) return showToast("error", "No registered employee selected.");
    const siteName = w.assignedProject || w.currentSite || "Head Office";
    const workLocType = inferWorkerWorkLocationType(w);
    const schedule = resolveWorkerSchedule(w, workSchedules, quickClock.date);
    const cleanIn = quickClock.explicitStatus === "Absent" ? null : quickClock.checkIn.trim() || null;
    const cleanOut = quickClock.explicitStatus === "Absent" ? null : quickClock.checkOut.trim() || null;

    const metrics = computeScheduleAttendanceMetrics({
      date: quickClock.date,
      checkIn: cleanIn,
      checkOut: cleanOut,
      explicitStatus: quickClock.explicitStatus === "Auto" ? undefined : quickClock.explicitStatus,
      schedule,
      approvedLeaves: leaveRequests,
      workerId: w.id,
      employeeId: w.employeeId,
    });

    const rec: AttendanceRecord = {
      id: `ATT-HRM-${w.id}-${quickClock.date}-${Date.now().toString().slice(-4)}`,
      workerId: w.id,
      workerName: w.name,
      department: w.department || "Operations",
      trade: w.trade || w.position || "Staff",
      company: w.company || "OVID Real Estate",
      building: siteName,
      floor: 0,
      zone: siteName,
      workLocationType: workLocType,
      date: quickClock.date,
      checkIn: cleanIn,
      checkOut: cleanOut,
      status: metrics.status,
      workingHours: metrics.workingHours,
      overtime: metrics.overtime,
      overtimeCandidateHours: metrics.overtimeCandidateHours,
      underTime: metrics.underTime,
      lateArrivalMinutes: metrics.lateArrivalMinutes,
      earlyDepartureMinutes: metrics.earlyDepartureMinutes,
      punchCompleteness: metrics.punchCompleteness,
      missingPunchType: metrics.missingPunchType,
      hrReviewStatus: metrics.hrReviewStatus,
      ...(metrics.missingPunchType !== "None"
        ? { exceptionReason: `${metrics.missingPunchType} logged — hours held at 0h pending HR verification` }
        : {}),
      scheduleId: schedule?.id,
      recordedByUid: actorUid,
      method: quickClock.method,
      gpsLocationString: siteName,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineSyncService.enqueue("attendance", "set", {
        ...rec,
        capturedAt: new Date().toISOString(),
      });
      setOfflineStats(offlineSyncService.getStats());
      onLogAction("HRM Attendance Queued Offline", `${w.name} (${rec.date}: ${rec.status})`);
      showToast("info", `Offline mode: queued attendance for ${w.name}. Will auto-sync when online.`);
      return;
    }

    await onAddAttendance(rec);
    onLogAction(
      "HRM Attendance Recorded",
      `${w.name} (${rec.date}) -> ${rec.status} | Completeness: ${metrics.punchCompleteness} | Hours: ${metrics.workingHours}h + ${metrics.overtime}h OT`
    );
    showToast(
      metrics.missingPunchType !== "None" ? "info" : "success",
      metrics.missingPunchType !== "None"
        ? `Logged ${w.name} with ${metrics.missingPunchType} (hours held at 0h and queued for HR Review).`
        : `Logged ${w.name}: ${metrics.status} (${metrics.workingHours}h regular, ${metrics.overtimeCandidateHours}h OT candidate, ${metrics.lateArrivalMinutes}m late).`
    );
  };

  const handleSyncConnectorQueueInAttendance = async () => {
    setSyncingBioQueue(true);
    try {
      const res = await pullAndProcessConnectorQueue({
        devices: biometricDevices,
        mappings: biometricDeviceMappings,
        workers,
        schedules: workSchedules,
        approvedLeaves: leaveRequests,
        existingAttendance: attendance,
        existingUnmappedEvents: unmappedBiometricEvents,
        onSaveAttendance: onAddAttendance,
      });
      if (res.total === 0) {
        showToast("info", "No staged ZKTeco ADMS / Site Bridge hardware punches waiting in connector queue.");
      } else {
        onLogAction(
          "HRM Biometric Hardware Sync",
          `Total ${res.total}: ${res.matched} matched, ${res.duplicatesSkipped} duplicates skipped, ${res.unmappedQueued} quarantined`
        );
        showToast(
          res.unmappedQueued > 0 ? "info" : "success",
          `Synced ${res.total} hardware event(s): ${res.matched} matched, ${res.duplicatesSkipped} duplicate(s) skipped, ${res.unmappedQueued} unmapped queued.`
        );
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to sync ZKTeco hardware queue.");
    } finally {
      setSyncingBioQueue(false);
    }
  };

  const handleProcessMappedDevicePunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDeviceId =
      bioClockForm.deviceId || biometricDevices.find((d) => d.status === "Active")?.id || "";
    if (!targetDeviceId) {
      return showToast("error", "Register or select an Active Biometric Device first.");
    }
    if (!bioClockForm.biometricUserId.trim()) {
      return showToast("error", "Enter the Biometric User ID from the device terminal.");
    }
    try {
      const res = await processBiometricDeviceAttendanceEvent({
        deviceId: targetDeviceId,
        biometricUserId: bioClockForm.biometricUserId.trim(),
        eventTime: new Date().toISOString(),
        punchType: bioClockForm.punchType,
        devices: biometricDevices,
        mappings: biometricDeviceMappings,
        workers,
        schedules: workSchedules,
        approvedLeaves: leaveRequests,
        existingAttendance: attendance,
        existingUnmappedEvents: unmappedBiometricEvents,
        onSaveAttendance: onAddAttendance,
      });
      if (res.resolved && res.attendanceRecord) {
        if (res.duplicatePrevented) {
          showToast(
            "info",
            `Duplicate ${bioClockForm.punchType} punch within 5-minute deduplication window ignored for ${res.attendanceRecord.workerName}.`
          );
        } else {
          onLogAction(
            "HRM Mapped Biometric Punch",
            `${res.attendanceRecord.workerName} (${res.attendanceRecord.biometricDeviceName} · BioID ${res.attendanceRecord.biometricUserId}) ${bioClockForm.punchType}`
          );
          showToast(
            "success",
            `Mapped punch recorded for ${res.attendanceRecord.workerName} (${res.attendanceRecord.biometricDeviceName}).`
          );
          setBioClockForm((p) => ({ ...p, biometricUserId: "" }));
        }
      } else {
        showToast(
          "error",
          `${res.reason || "No active mapping found."} Punch quarantined to Unmapped Biometric Events queue without guessing.`
        );
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to process device punch.");
    }
  };

  const handleResolveAttendanceException = async (
    record: AttendanceRecord,
    action: "Complete Missing Punch" | "Approve Overtime" | "Reject Overtime" | "Acknowledge Exception"
  ) => {
    const draft = exceptionDrafts[record.id] || { time: "", notes: "" };
    if (!draft.notes.trim()) {
      return showToast("error", "Enter an HR review note / justification for audit compliance.");
    }
    const missingType = detectMissingPunchType(record);
    try {
      const worker = workers.find(
        (w) => w.id === record.workerId || w.employeeId === record.workerId
      );
      const res = await reviewAttendanceException({
        record,
        action,
        verifiedCheckIn: missingType === "Missing Check-In" ? draft.time : undefined,
        verifiedCheckOut: missingType === "Missing Check-Out" ? draft.time : undefined,
        reviewNotes: draft.notes,
        worker,
        schedules: workSchedules,
        approvedLeaves: leaveRequests,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveAttendance: onAddAttendance,
      });
      onLogAction(
        `HRM Attendance Exception (${action})`,
        `${res.updatedRecord.workerName} (${res.updatedRecord.date}) -> ${res.updatedRecord.workingHours}h reg / ${res.updatedRecord.overtime}h OT`
      );
      showToast(
        "success",
        res.createdOvertimeRequest
          ? `Approved ${res.updatedRecord.workerName} overtime (${res.updatedRecord.overtime}h) and linked ${res.createdOvertimeRequest.requestNo} to payroll.`
          : `Resolved attendance exception for ${res.updatedRecord.workerName} (${res.updatedRecord.workingHours}h worked).`
      );
      setExceptionDrafts((p) => {
        const next = { ...p };
        delete next[record.id];
        return next;
      });
    } catch (err: any) {
      showToast("error", err?.message || "Failed to resolve attendance exception.");
    }
  };

  const handleOpenCorrectionForRecord = (record: AttendanceRecord) => {
    setCorrectionForm({
      attendanceId: record.id,
      workerId: record.workerId,
      date: record.date,
      correctionType:
        detectMissingPunchType(record) === "Missing Check-In"
          ? "Missing Check-In"
          : detectMissingPunchType(record) === "Missing Check-Out"
          ? "Missing Check-Out"
          : "Incorrect Attendance Record",
      proposedCheckIn: (record.checkIn || "08:00").slice(0, 5),
      proposedCheckOut: (record.checkOut || "17:00").slice(0, 5),
      proposedStatus: record.status === "Absent" ? "Present" : record.status,
      reason: "",
      supportingEvidenceUrl: "",
      supportingEvidenceName: "",
      supportingEvidenceNote: "",
    });
    setAttSubView("corrections");
  };

  const handleUploadCorrectionEvidence = async (file: File) => {
    setUploadingCorrectionEvidence(true);
    try {
      const path = `hrm/attendance-corrections/${Date.now()}_${file.name}`;
      const url = await DbService.uploadHrmFile(file, path);
      setCorrectionForm((p) => ({
        ...p,
        supportingEvidenceUrl: url,
        supportingEvidenceName: file.name,
      }));
      showToast("success", `Uploaded evidence: ${file.name}`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to upload supporting evidence.");
    } finally {
      setUploadingCorrectionEvidence(false);
    }
  };

  const handleSubmitManualCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let targetRecord = attendance.find((a) => a.id === correctionForm.attendanceId);
      const targetWorker =
        workers.find((w) => w.id === (targetRecord?.workerId || correctionForm.workerId)) || workers[0];
      if (!targetWorker) {
        return showToast("error", "Select an employee first.");
      }
      if (!targetRecord) {
        targetRecord = {
          id: `ATT-SYNC-${targetWorker.id}-${correctionForm.date}-${Date.now().toString().slice(-4)}`,
          workerId: targetWorker.id,
          workerName: targetWorker.name,
          department: targetWorker.department || "Operations",
          trade: targetWorker.trade || targetWorker.position || "Staff",
          company: targetWorker.company || "OVID Real Estate",
          building: targetWorker.assignedProject || targetWorker.currentSite || "Head Office",
          floor: 0,
          zone: targetWorker.assignedProject || targetWorker.currentSite || "Head Office",
          workLocationType: inferWorkerWorkLocationType(targetWorker),
          date: correctionForm.date,
          checkIn: null,
          checkOut: null,
          status: "Absent",
          workingHours: 0,
          overtime: 0,
          punchCompleteness: "Missing Check-In",
          missingPunchType: "Missing Check-In",
          hrReviewStatus: "Pending HR Review",
          finalApprovalStatus: "Pending",
          timezone: "Africa/Addis_Ababa",
          recordedByUid: actorUid,
          method: AttendanceMethod.MANUAL_ENTRY,
        };
      }
      const res = await submitManualCorrectionRequest({
        record: targetRecord,
        worker: targetWorker,
        correctionType: correctionForm.correctionType,
        proposedCheckIn: correctionForm.proposedCheckIn || null,
        proposedCheckOut: correctionForm.proposedCheckOut || null,
        proposedStatus: correctionForm.proposedStatus,
        reason: correctionForm.reason,
        supportingEvidenceUrl: correctionForm.supportingEvidenceUrl || undefined,
        supportingEvidenceName: correctionForm.supportingEvidenceName || undefined,
        supportingEvidenceNote: correctionForm.supportingEvidenceNote || undefined,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveAttendance: onAddAttendance,
      });
      onLogAction(
        "HRM Manual Correction Submitted",
        `${res.correction.requestNo} (${targetWorker.name} on ${targetRecord.date}): ${res.correction.correctionType}`
      );
      showToast(
        "success",
        `Correction ${res.correction.requestNo} submitted. Original biometric punch preserved until HR Manager approval.`
      );
      setCorrectionForm((p) => ({ ...p, reason: "", supportingEvidenceNote: "", supportingEvidenceUrl: "", supportingEvidenceName: "" }));
    } catch (err: any) {
      showToast("error", err?.message || "Failed to submit manual correction request.");
    }
  };

  const handleReviewCorrection = async (
    correction: AttendanceCorrectionRequest,
    action: "Mark Under Review" | "Return for Correction" | "Approve" | "Reject"
  ) => {
    const notes = correctionReviewNotes[correction.id] || "";
    const linkedAtt = attendance.find((a) => a.id === correction.attendanceId) || {
      id: correction.attendanceId,
      workerId: correction.workerId,
      workerName: correction.workerName,
      department: correction.department,
      trade: "Staff",
      company: "OVID Real Estate",
      building: correction.project,
      floor: 0,
      zone: correction.project,
      workLocationType: correction.workLocationType,
      date: correction.date,
      checkIn: correction.originalSnapshot.checkIn,
      checkOut: correction.originalSnapshot.checkOut,
      status: correction.originalSnapshot.status,
      workingHours: correction.originalSnapshot.workingHours,
      overtime: correction.originalSnapshot.overtime,
      originalBiometricSnapshot: correction.originalSnapshot,
      method: correction.originalSnapshot.method,
    };
    const linkedWorker = workers.find(
      (w) => w.id === correction.workerId || w.employeeId === correction.employeeId
    );
    try {
      const res = await reviewManualCorrectionRequest({
        correction,
        attendanceRecord: linkedAtt,
        action,
        comments: notes || (action === "Mark Under Review" ? "Checked by HR Officer" : ""),
        worker: linkedWorker,
        schedules: workSchedules,
        approvedLeaves: leaveRequests,
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveAttendance: onAddAttendance,
      });
      onLogAction(
        `HRM Correction ${action}`,
        `${correction.requestNo} (${correction.workerName} ${correction.date}) -> ${res.updatedCorrection.status}`
      );
      showToast("success", `Correction ${correction.requestNo} updated to ${res.updatedCorrection.status}.`);
      setCorrectionReviewNotes((p) => {
        const next = { ...p };
        delete next[correction.id];
        return next;
      });
    } catch (err: any) {
      showToast("error", err?.message || "Failed to review manual correction.");
    }
  };

  const handleSubmitAttendanceActionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attActionModal) return;
    try {
      if (attActionModal.mode === "Report Discrepancy") {
        await reportAttendanceDiscrepancy({
          record: attActionModal.record,
          discrepancyNotes: attActionComments,
          actorName,
          actorUid,
          actorRole: currentUserRole,
          onSaveAttendance: onAddAttendance,
        });
        showToast("info", `Discrepancy flagged for ${attActionModal.record.workerName}. Moved to Under Review.`);
      } else {
        const updated = await transitionAttendanceApprovalStatus({
          record: attActionModal.record,
          action: attActionModal.mode,
          comments: attActionComments,
          actorName,
          actorUid,
          actorRole: currentUserRole,
          onSaveAttendance: onAddAttendance,
        });
        showToast(
          "success",
          `${updated.workerName} (${updated.date}) -> ${updated.finalApprovalStatus}`
        );
      }
      onLogAction(
        `HRM Attendance ${attActionModal.mode}`,
        `${attActionModal.record.workerName} (${attActionModal.record.date}): ${attActionComments || attActionModal.mode}`
      );
      setAttActionModal(null);
      setAttActionComments("");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update attendance workflow.");
    }
  };

  const handleBulkFinalApproveReady = async () => {
    if (!perms.canFinalApproveAttendance) {
      return showToast("error", "Authorization Error: Only HR Manager can grant final attendance approval.");
    }
    const eligible = attDashboard.filteredRecords.filter(
      (a) =>
        a.finalApprovalStatus !== "Approved" &&
        a.finalApprovalStatus !== "Rejected" &&
        detectMissingPunchType(a) === "None"
    );
    if (eligible.length === 0) {
      return showToast("info", "No complete pending attendance records in current filter require final approval.");
    }
    let count = 0;
    for (const rec of eligible) {
      await transitionAttendanceApprovalStatus({
        record: rec,
        action: "Final Approve",
        comments: "Bulk final approval by HR Manager for payroll",
        actorName,
        actorUid,
        actorRole: currentUserRole,
        onSaveAttendance: onAddAttendance,
      });
      count += 1;
    }
    onLogAction("HRM Attendance Bulk Final Approved", `${count} complete record(s) finalized for payroll`);
    showToast("success", `HR Manager approved ${count} complete attendance record(s) for payroll.`);
  };

  const handleSaveDeductionPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canFinalApproveAttendance && !perms.isDirector) {
      return showToast("error", "Only HR Manager or Director can approve/save attendance deduction policy.");
    }
    const nowIso = new Date().toISOString();
    const policy: AttendanceDeductionPolicy = {
      id: latestDeductionPolicy?.id || "OVID-ATT-DED-POLICY-DEFAULT",
      policyName: policyForm.policyName.trim() || "Company Attendance Deduction Policy",
      isApproved: policyForm.isApproved,
      approvedBy: policyForm.isApproved ? actorName : undefined,
      approvedByRole: policyForm.isApproved ? String(currentUserRole) : undefined,
      approvedAt: policyForm.isApproved ? nowIso : undefined,
      deductUnpaidLeave: policyForm.deductUnpaidLeave,
      deductUnexcusedAbsence: policyForm.deductUnexcusedAbsence,
      absenceDailyMultiplier: Number(policyForm.absenceDailyMultiplier || 1),
      lateDeductionEnabled: policyForm.lateDeductionEnabled,
      graceMinutesBeforeDeduction: Number(policyForm.graceMinutesBeforeDeduction || 0),
      lateDeductionHourlyFactor: Number(policyForm.lateDeductionHourlyFactor || 1),
      standardWorkingDaysPerMonth: Number(policyForm.standardWorkingDaysPerMonth || 26),
      notes: policyForm.notes,
      updatedBy: actorName,
      createdAt: latestDeductionPolicy?.createdAt || nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveAttendanceDeductionPolicy(policy);
    onLogAction(
      "HRM Attendance Deduction Policy Updated",
      `${policy.policyName} (${policy.isApproved ? "APPROVED" : "Draft / Inactive"})`
    );
    showToast(
      "success",
      `Attendance Deduction Policy saved (${policy.isApproved ? "Approved for Payroll" : "Inactive — Zero Automatic Deductions"}).`
    );
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canManageEmployees && !perms.isHrManager && !perms.isDirector && !perms.isOperationManager && !perms.isProjectManager) {
      return showToast("error", "Insufficient permission to edit work schedules.");
    }
    const targetWorker =
      schedForm.scopeType === "Employee"
        ? workers.find((w) => w.id === (schedForm.workerId || workers[0]?.id))
        : undefined;
    const nowIso = new Date().toISOString();
    const cfg: WorkScheduleConfig = {
      id: `WSC-${Date.now()}`,
      scheduleName: schedForm.scheduleName.trim() || "Work Shift Policy",
      scopeType: schedForm.scopeType,
      workLocationType:
        schedForm.scopeType === "Project"
          ? schedForm.project.toLowerCase().includes("head office")
            ? "Head Office"
            : "Construction Site"
          : schedForm.workLocationType,
      project: schedForm.scopeType === "Project" ? schedForm.project : "ALL",
      department: schedForm.scopeType === "Department" ? schedForm.department : "ALL",
      ...(targetWorker
        ? {
            workerId: targetWorker.id,
            employeeId: targetWorker.employeeId || targetWorker.id,
            employeeName: targetWorker.name,
          }
        : {}),
      schedulePeriodType: schedForm.schedulePeriodType,
      effectiveFrom: schedForm.effectiveFrom || undefined,
      effectiveTo: schedForm.effectiveTo || undefined,
      shiftStartTime: schedForm.shiftStartTime,
      shiftEndTime: schedForm.shiftEndTime,
      isNightShift: Boolean(schedForm.isNightShift) || schedForm.shiftEndTime <= schedForm.shiftStartTime,
      breakMinutes: Number(schedForm.breakMinutes),
      standardDailyHours: Number(schedForm.standardDailyHours),
      graceMinutesLate: Number(schedForm.graceMinutesLate),
      restDays: schedForm.restDays,
      holidays: schedForm.holidays,
      overtimeMultiplierWeekday: Number(schedForm.overtimeMultiplierWeekday),
      overtimeMultiplierRestDay: Number(schedForm.overtimeMultiplierRestDay),
      overtimeMultiplierHoliday: Number(schedForm.overtimeMultiplierHoliday),
      isActive: true,
      updatedBy: actorName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveWorkSchedule(cfg);
    onLogAction(
      "HRM Schedule Configured",
      `${cfg.scheduleName} [${cfg.scopeType}${cfg.employeeName ? `: ${cfg.employeeName}` : ""}] (${cfg.shiftStartTime}-${cfg.shiftEndTime}${cfg.isNightShift ? " Night" : ""})`
    );
    showToast("success", `Work schedule "${cfg.scheduleName}" saved (${cfg.scopeType} scope).`);
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = workers.find((x) => x.id === leaveForm.workerId) || workers[0];
    if (!w) return showToast("error", "Select an employee.");
    const d1 = new Date(leaveForm.startDate);
    const d2 = new Date(leaveForm.endDate);
    const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
    const nowIso = new Date().toISOString();
    const rec: LeaveRequestRecord = {
      id: `LVR-${Date.now()}`,
      requestNo: `LV-${nowIso.slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: w.employeeId || w.id,
      workerId: w.id,
      workerName: w.name,
      project: w.assignedProject || w.currentSite || "General",
      department: w.department || "Operations",
      leaveType: leaveForm.leaveType,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      totalDays: days,
      reason: leaveForm.reason || "Personal / Scheduled leave",
      status: "Pending Section Head",
      createdById: actorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveLeaveRequest(rec);
    onLogAction("HRM Leave Requested", `${rec.requestNo} for ${w.name} (${days} days ${rec.leaveType})`);
    showToast("success", `Leave request ${rec.requestNo} submitted to Section Head.`);
    setLeaveForm((p) => ({ ...p, reason: "" }));
  };

  const handleAdvanceLeave = async (lv: LeaveRequestRecord, decision: "Approved" | "Rejected") => {
    const nowIso = new Date().toISOString();
    const log = {
      stage: lv.status,
      actorName,
      actorRole: String(currentUserRole),
      decision,
      timestamp: nowIso,
    };
    let nextStatus = lv.status;
    const patch: Partial<LeaveRequestRecord> = {};
    if (decision === "Rejected") {
      nextStatus = "Rejected";
    } else if (lv.status === "Pending Section Head") {
      if (!perms.canApproveLeaveOrOvertimeSection) {
        return showToast("error", "Only Section Head, Project Manager, or Director can approve Step 1.");
      }
      patch.sectionHeadApproval = log;
      nextStatus = "Pending HR Manager";
    } else if (lv.status === "Pending HR Manager") {
      if (!perms.isStrictHrManager) {
        return showToast("error", "Only HR Manager can give final leave approval and update employee leave balances.");
      }
      patch.hrManagerApproval = log;
      nextStatus = "Approved";

      // Update worker leave balances
      const w = workers.find((x) => x.id === lv.workerId);
      if (w) {
        const bal = w.leaveBalances || { annual: 16, sick: 10, maternityPaternity: 15, unpaidUsed: 0 };
        const updatedBal = { ...bal };
        if (lv.leaveType === "Annual Leave") updatedBal.annual = Math.max(0, updatedBal.annual - lv.totalDays);
        else if (lv.leaveType === "Sick Leave") updatedBal.sick = Math.max(0, updatedBal.sick - lv.totalDays);
        else if (lv.leaveType === "Maternity/Paternity Leave")
          updatedBal.maternityPaternity = Math.max(0, updatedBal.maternityPaternity - lv.totalDays);
        else if (lv.leaveType === "Unpaid Leave") updatedBal.unpaidUsed += lv.totalDays;
        await onUpdateWorker({ ...w, leaveBalances: updatedBal });
      }
    }
    await DbService.saveLeaveRequest({ ...lv, ...patch, status: nextStatus, updatedAt: nowIso });
    onLogAction("HRM Leave Workflow", `${lv.requestNo} -> ${nextStatus}`);
    showToast("success", `Leave ${lv.requestNo}: ${nextStatus}`);
  };

  const handleSubmitOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = workers.find((x) => x.id === otForm.workerId) || workers[0];
    if (!w) return showToast("error", "Select an employee.");
    const activeSched = workSchedules[0];
    const mult =
      otForm.dayType === "Holiday"
        ? activeSched?.overtimeMultiplierHoliday || 2.5
        : otForm.dayType === "Rest Day"
        ? activeSched?.overtimeMultiplierRestDay || 2.0
        : activeSched?.overtimeMultiplierWeekday || 1.5;
    const nowIso = new Date().toISOString();
    const rec: OvertimeRequestRecord = {
      id: `OTR-${Date.now()}`,
      requestNo: `OT-${nowIso.slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: w.employeeId || w.id,
      workerId: w.id,
      workerName: w.name,
      project: w.assignedProject || w.currentSite || "General",
      department: w.department || "Operations",
      workDate: otForm.workDate,
      hoursRequested: Number(otForm.hoursRequested || 1),
      dayType: otForm.dayType,
      multiplier: mult,
      reason: otForm.reason || "Critical site milestone activity",
      status: "Pending Section Head",
      createdById: actorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveOvertimeRequest(rec);
    onLogAction("HRM Overtime Requested", `${rec.requestNo} for ${w.name}: ${rec.hoursRequested} hrs @ ${mult}x`);
    showToast("success", `Overtime request ${rec.requestNo} submitted (${mult}x rate).`);
    setOtForm((p) => ({ ...p, reason: "" }));
  };

  const handleAdvanceOvertime = async (ot: OvertimeRequestRecord, decision: "Approved" | "Rejected") => {
    const nowIso = new Date().toISOString();
    const log = {
      stage: ot.status,
      actorName,
      actorRole: String(currentUserRole),
      decision,
      timestamp: nowIso,
    };
    let nextStatus = ot.status;
    const patch: Partial<OvertimeRequestRecord> = {};
    if (decision === "Rejected") {
      nextStatus = "Rejected";
    } else if (ot.status === "Pending Section Head") {
      if (!perms.canApproveLeaveOrOvertimeSection) {
        return showToast("error", "Section Head / PM / Director approval required for Step 1.");
      }
      patch.sectionHeadApproval = log;
      nextStatus = "Pending HR Manager";
    } else if (ot.status === "Pending HR Manager") {
      if (!perms.canApproveHrStage) {
        return showToast("error", "HR Manager / Director approval required for Step 2.");
      }
      patch.hrManagerApproval = log;
      nextStatus = "Approved";
    }
    await DbService.saveOvertimeRequest({ ...ot, ...patch, status: nextStatus, updatedAt: nowIso });
    onLogAction("HRM Overtime Workflow", `${ot.requestNo} -> ${nextStatus}`);
    showToast("success", `Overtime ${ot.requestNo}: ${nextStatus}`);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canEditEmployeeProfiles) {
      return showToast(
        "error",
        isAmharic
          ? "በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃና ምደባ ማሻሻል የሚችለው HR manager ብቻ ነው።"
          : "According to company policy, only the HR Manager can modify employee assignments and profiles."
      );
    }
    const w = workers.find((x) => x.id === transferForm.workerId) || workers[0];
    if (!w) return showToast("error", "Select an employee to transfer.");
    const nowIso = new Date().toISOString();
    const nextPos = transferForm.toPosition.trim() || w.position || w.trade || "Staff";
    const fromLoc = inferWorkerWorkLocationType(w);
    const toLoc =
      transferForm.toProject.toLowerCase().includes("head office")
        ? "Head Office"
        : transferForm.toWorkLocationType;
    const rec: EmployeeTransferRecord = {
      id: `TRF-${Date.now()}`,
      transferNo: `TR-${nowIso.slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: w.employeeId || w.id,
      workerId: w.id,
      workerName: w.name,
      fromWorkLocationType: fromLoc,
      toWorkLocationType: toLoc,
      fromProject: w.assignedProject || w.currentSite || "Unassigned",
      toProject: transferForm.toProject,
      fromDepartment: w.department || "Operations",
      toDepartment: transferForm.toDepartment,
      fromPosition: w.position || w.trade || "Staff",
      toPosition: nextPos,
      effectiveDate: transferForm.effectiveDate,
      reason: transferForm.reason || "Project site deployment rebalance",
      approvedBy: actorName,
      approvedRole: String(currentUserRole),
      status: "Completed",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveEmployeeTransfer(rec);
    await onUpdateWorker({
      ...w,
      assignedProject: rec.toProject,
      currentSite: rec.toProject,
      workLocationType: rec.toWorkLocationType,
      department: rec.toDepartment,
      position: rec.toPosition,
      trade: rec.toPosition,
    });
    onLogAction(
      "HRM Site Transfer Executed",
      `${w.name}: ${rec.fromWorkLocationType} (${rec.fromProject}) -> ${rec.toWorkLocationType} (${rec.toProject})`
    );
    showToast("success", `Transferred ${w.name} to ${rec.toWorkLocationType} — ${rec.toProject}.`);
  };

  // ============================================================
  // 4. PAYROLL, ETHIOPIAN TAX/PENSION & LOANS STATE
  // ============================================================
  const [payrollSubView, setPayrollSubView] = useState<"runs" | "structures" | "tax" | "loans">("runs");
  const [payPeriodInput, setPayPeriodInput] = useState(() => new Date().toISOString().slice(0, 7));
  const [payProjectScope, setPayProjectScope] = useState("ALL");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [disburseModalRun, setDisburseModalRun] = useState<HrmPayrollRunRecord | null>(null);
  const [disburseBankId, setDisburseBankId] = useState("");
  const [disburseRefNo, setDisburseRefNo] = useState("");
  const [disburseDate, setDisburseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [structForm, setStructForm] = useState({
    structureCode: "STR-G5",
    structureName: "Site Engineer Grade V",
    jobGrade: "Grade V",
    department: "Engineering",
    basicSalary: 18500,
    housingAllowance: 2500,
    transportAllowance: 1200,
    positionAllowance: 1500,
    medicalAllowance: 500,
    overtimeEligible: true,
    pensionEligible: true,
  });

  const [taxForm, setTaxForm] = useState<{
    employeePensionPercent: number;
    employerPensionPercent: number;
    brackets: EthiopianTaxBracket[];
  }>(() => ({
    employeePensionPercent: activeTaxConfig.employeePensionPercent,
    employerPensionPercent: activeTaxConfig.employerPensionPercent,
    brackets: activeTaxConfig.taxBrackets,
  }));

  useEffect(() => {
    setTaxForm({
      employeePensionPercent: activeTaxConfig.employeePensionPercent,
      employerPensionPercent: activeTaxConfig.employerPensionPercent,
      brackets: activeTaxConfig.taxBrackets,
    });
  }, [activeTaxConfig]);

  const [loanForm, setLoanForm] = useState({
    workerId: "",
    type: "Salary Advance" as "Salary Advance" | "Employee Loan",
    principalAmount: 5000,
    installmentMonths: 2,
    reason: "",
  });

  const handleGeneratePayrollRun = async () => {
    if (!perms.canManageEmployees && !perms.isHrManager && !perms.isDirector && !perms.canApproveFinanceStage) {
      return showToast("error", "Only HR Manager, Finance Manager, or Director can generate payroll runs.");
    }
    try {
      const draft = buildHrmPayrollRunDraft({
        payPeriod: payPeriodInput,
        projectScope: payProjectScope,
        workers,
        attendance,
        overtimeRequests,
        leaveRequests,
        salaryStructures,
        loans,
        taxConfig: activeTaxConfig,
        deductionPolicy: approvedDeductionPolicy,
        enforceStrictApprovedAttendance: enforceStrictAttendanceGate,
        existingRuns: payrollRuns,
        actorName,
        actorUid,
      });
      await DbService.saveHrmPayrollRun(draft);
      setSelectedRunId(draft.id);
      onLogAction(
        "HRM Payroll Generated",
        `${draft.runNo} (${draft.payPeriod}, ${draft.totalEmployees} staff, Net ETB ${fmtMoney(draft.totalNetPay)}, Approved Att: ${draft.attendanceAuditSummary?.approvedRecordsUsed || 0}, Excluded: ${draft.attendanceAuditSummary?.unapprovedRecordsExcluded || 0})`
      );
      showToast("success", `Generated ${draft.runNo} for ${draft.totalEmployees} staff. Submitted to HR Verification.`);
    } catch (err: any) {
      showToast("error", err?.message || "Failed to generate payroll run.");
    }
  };

  const canActOnPayrollStage = (stage: HrmPayrollRunRecord["workflowStage"]): boolean => {
    switch (stage) {
      case "Draft":
      case "Pending HR Manager":
        return perms.canApproveHrStage;
      case "Pending Finance Manager":
        return perms.canApproveFinanceStage;
      case "Pending Operation Manager":
        return perms.canApproveOperationStage;
      case "Pending Director":
        return perms.canApproveDirectorStage;
      default:
        return false;
    }
  };

  const handleAdvancePayrollStage = async (
    run: HrmPayrollRunRecord,
    decision: "Approved" | "Rejected"
  ) => {
    if (!canActOnPayrollStage(run.workflowStage)) {
      return showToast("error", `Your role (${currentUserRole}) cannot verify stage "${run.workflowStage}".`);
    }
    const updated = await advancePayrollRunStage({
      run,
      decision,
      actorName,
      actorRole: currentUserRole,
    });
    onLogAction("HRM Payroll Verification", `${run.runNo}: ${run.workflowStage} -> ${updated.workflowStage}`);
    showToast("success", `${run.runNo} moved to ${updated.workflowStage}.`);
  };

  const [payslipModalData, setPayslipModalData] = useState<{
    run: Pick<
      HrmPayrollRunRecord,
      "runNo" | "payPeriod" | "paymentReferenceNo" | "workflowStage" | "glJournalId" | "paymentDate"
    >;
    item: HrmPayrollLineItem;
  } | null>(null);
  const [adjustLineTarget, setAdjustLineTarget] = useState<{
    runId: string;
    workerId: string;
    workerName: string;
    bonuses: number;
    otherDeductions: number;
  } | null>(null);

  const handleSaveLineAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustLineTarget) return;
    if (!perms.canManageEmployees && !perms.isHrManager && !perms.isDirector && !perms.canApproveFinanceStage) {
      return showToast("error", "Only HR/Finance/Director can adjust payroll line items.");
    }
    const targetRun = payrollRuns.find((r) => r.id === adjustLineTarget.runId);
    if (!targetRun || targetRun.workflowStage === "Paid") {
      return showToast("error", "Paid payroll runs are immutable and cannot be edited.");
    }
    const updatedRun = recalculatePayrollRunLineItem({
      run: targetRun,
      workerId: adjustLineTarget.workerId,
      bonuses: Number(adjustLineTarget.bonuses || 0),
      otherDeductions: Number(adjustLineTarget.otherDeductions || 0),
      taxConfig: activeTaxConfig,
    });
    await DbService.saveHrmPayrollRun(updatedRun);
    onLogAction(
      "HRM Payroll Line Adjusted",
      `${updatedRun.runNo} — ${adjustLineTarget.workerName}: Bonus ETB ${fmtMoney(adjustLineTarget.bonuses)}, Other Ded ETB ${fmtMoney(adjustLineTarget.otherDeductions)}`
    );
    showToast("success", `Recalculated tax, pension & net pay for ${adjustLineTarget.workerName}.`);
    setAdjustLineTarget(null);
  };

  const handleDisbursePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseModalRun) return;
    if (!perms.canDisbursePayroll) {
      return showToast("error", "Only Finance Manager or Director can disburse verified payroll.");
    }
    const acc = bankAccounts.find((a) => a.id === disburseBankId) || bankAccounts[0];
    try {
      const paid = await disburseApprovedHrmPayrollRun({
        run: disburseModalRun,
        account: acc,
        paymentReferenceNo: disburseRefNo || `CBE-${disburseModalRun.runNo}`,
        paymentDate: disburseDate,
        loans,
        existingRuns: payrollRuns,
        workers,
        actorName,
        actorRole: currentUserRole,
        actorUid,
      });
      onLogAction(
        "HRM Payroll Disbursed & Synced GL",
        `${paid.runNo} Paid via ${acc?.accountName || "Bank"} | Ref: ${paid.paymentReferenceNo} | GL: ${paid.glJournalId}`
      );
      showToast("success", `${paid.runNo} disbursed & synced atomically to Bank, Project Labor Cost, Official Payslips & Part 8 General Ledger!`);
      setDisburseModalRun(null);
      setDisburseRefNo("");
    } catch (err: any) {
      showToast("error", err?.message || "Disbursement blocked.");
    }
  };

  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canManageEmployees && !perms.isHrManager && !perms.isDirector && !perms.canApproveFinanceStage) {
      return showToast("error", "Only HR/Finance/Director can manage salary structures.");
    }
    const nowIso = new Date().toISOString();
    const rec: SalaryStructureRecord = {
      id: `STR-${Date.now()}`,
      ...structForm,
      basicSalary: Number(structForm.basicSalary),
      housingAllowance: Number(structForm.housingAllowance),
      transportAllowance: Number(structForm.transportAllowance),
      positionAllowance: Number(structForm.positionAllowance),
      medicalAllowance: Number(structForm.medicalAllowance),
      currency: "ETB",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveSalaryStructure(rec);
    onLogAction("HRM Salary Structure Saved", `${rec.structureCode} — ${rec.structureName} (Basic ETB ${fmtMoney(rec.basicSalary)})`);
    showToast("success", `Salary structure ${rec.structureName} saved.`);
  };

  const handleSaveTaxConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perms.canManageEmployees && !perms.isHrManager && !perms.isDirector && !perms.canApproveFinanceStage) {
      return showToast("error", "Only HR/Finance/Director can configure tax & pension rules.");
    }
    const nowIso = new Date().toISOString();
    const rec: EthiopianTaxPensionConfig = {
      id: "ETH-TAX-PENSION-ACTIVE",
      configName: `Ethiopian Tax & Pension (${taxForm.employeePensionPercent}% / ${taxForm.employerPensionPercent}%)`,
      effectiveFrom: nowIso.slice(0, 10),
      employeePensionPercent: Number(taxForm.employeePensionPercent),
      employerPensionPercent: Number(taxForm.employerPensionPercent),
      taxBrackets: taxForm.brackets,
      updatedBy: actorName,
      createdAt: activeTaxConfig.createdAt || nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveTaxPensionConfig(rec);
    onLogAction("HRM Tax/Pension Updated", `Pension ${rec.employeePensionPercent}% Emp / ${rec.employerPensionPercent}% Er`);
    showToast("success", "Ethiopian Income Tax & Pension configuration updated.");
  };

  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = workers.find((x) => x.id === loanForm.workerId) || workers[0];
    if (!w) return showToast("error", "Select an employee.");
    const principal = Math.max(100, Number(loanForm.principalAmount || 0));
    const months = Math.max(1, Number(loanForm.installmentMonths || 1));
    const nowIso = new Date().toISOString();
    const rec: SalaryAdvanceLoanRecord = {
      id: `LN-${Date.now()}`,
      referenceNo: `ADV-${nowIso.slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: w.employeeId || w.id,
      workerId: w.id,
      workerName: w.name,
      project: w.assignedProject || w.currentSite || "General",
      department: w.department || "Operations",
      type: loanForm.type,
      principalAmount: principal,
      installmentMonths: months,
      monthlyInstallment: Math.round((principal / months) * 100) / 100,
      remainingBalance: principal,
      totalRecovered: 0,
      reason: loanForm.reason || "Staff advance request",
      requestedDate: nowIso.slice(0, 10),
      status: "Pending HR",
      createdById: actorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveSalaryAdvanceLoan(rec);
    onLogAction("HRM Salary Advance Requested", `${rec.referenceNo} (${rec.type} ETB ${fmtMoney(rec.principalAmount)} for ${w.name})`);
    showToast("success", `${rec.type} ${rec.referenceNo} submitted for HR review.`);
    setLoanForm((p) => ({ ...p, reason: "" }));
  };

  const handleAdvanceLoan = async (ln: SalaryAdvanceLoanRecord, decision: "Approved" | "Rejected") => {
    const nowIso = new Date().toISOString();
    const log = { stage: ln.status, actorName, actorRole: String(currentUserRole), decision, timestamp: nowIso };
    let nextStatus = ln.status;
    const patch: Partial<SalaryAdvanceLoanRecord> = {};
    if (decision === "Rejected") {
      nextStatus = "Rejected";
    } else if (ln.status === "Pending HR") {
      if (!perms.canApproveHrStage) return showToast("error", "HR approval required.");
      patch.hrApproval = log;
      nextStatus = "Pending Finance";
    } else if (ln.status === "Pending Finance") {
      if (!perms.canApproveFinanceStage) return showToast("error", "Finance Manager/Director approval required.");
      patch.financeApproval = log;
      nextStatus = "Active Recovery";
    }
    await DbService.saveSalaryAdvanceLoan({ ...ln, ...patch, status: nextStatus, updatedAt: nowIso });
    onLogAction("HRM Advance/Loan Workflow", `${ln.referenceNo} -> ${nextStatus}`);
    showToast("success", `${ln.referenceNo} updated to ${nextStatus}.`);
  };

  // ============================================================
  // 5. REPORTS BUILDER
  // ============================================================
  const [selectedReport, setSelectedReport] = useState<HrmReportKind>("manpower");
  const [recReportStatusFilter, setRecReportStatusFilter] = useState<string>("ALL");
  const [recReportMonthFilter, setRecReportMonthFilter] = useState<string>("");

  const recruitmentReportData = useMemo(
    () =>
      buildRecruitmentByProjectAndDepartmentReport({
        recruitmentRequests,
        excessRequests: excessRecruitmentRequests,
        filters: {
          project: quickClock.dailyFilterProject,
          department: quickClock.filterDepartment,
          status: recReportStatusFilter,
          searchQuery: reportSearch,
          monthPrefix: recReportMonthFilter || undefined,
        },
      }),
    [
      recruitmentRequests,
      excessRecruitmentRequests,
      quickClock.dailyFilterProject,
      quickClock.filterDepartment,
      recReportStatusFilter,
      reportSearch,
      recReportMonthFilter,
    ]
  );

  const activeReportRows = useMemo<Record<string, any>[]>(() => {
    switch (selectedReport) {
      case "manpower":
        return dash.manpowerRows.map((r) => ({
          Project: r.project,
          Department: r.department,
          "Job Position": r.jobPosition,
          "Approved Manpower": r.approvedManpower,
          "Actual Hired": r.actualHired,
          "Remaining Vacancies": r.remainingVacancies,
          "Excess Above Limit": r.excessCount,
        }));
      case "recruitment-project-dept":
        return recruitmentReportData.summaryRows;
      case "recruitment":
        return recruitmentReportData.detailRows;
      case "attendance":
        return dash.attendanceSummaryRows.map((a) => ({
          "Employee ID": a.employeeId,
          "Employee Name": a.workerName,
          Project: a.project,
          Department: a.department,
          "Present Days": a.presentDays,
          "Late Days": a.lateDays,
          "Early Departures": a.earlyDepartures,
          "Absent Days": a.absentDays,
          "Approved Leave Days": a.leaveDays,
          "Hours Worked": a.totalHours,
          "Approved OT Hours": a.approvedOvertimeHours,
          Biometric: a.biometricStatus,
        }));
      case "leave-absence":
        return leaveRequests.map((lv) => {
          const w = workers.find((x) => x.id === lv.workerId);
          return {
            "Request No": lv.requestNo,
            "Employee ID": lv.employeeId,
            "Employee Name": lv.workerName,
            Project: lv.project,
            Department: lv.department,
            "Leave Type": lv.leaveType,
            "Start Date": lv.startDate,
            "End Date": lv.endDate,
            "Total Days": lv.totalDays,
            Status: lv.status,
            "Remaining Annual Balance": w?.leaveBalances?.annual ?? 16,
            "Remaining Sick Balance": w?.leaveBalances?.sick ?? 10,
          };
        });
      case "payroll":
        return payrollRuns.flatMap((run) =>
          run.items.map((i) => ({
            "Pay Period": run.payPeriod,
            "Run No": run.runNo,
            Stage: run.workflowStage,
            "Employee ID": i.employeeId,
            "Employee Name": i.workerName,
            Project: i.project,
            "Basic Salary": perms.canViewPayrollAmounts ? i.basicSalary : "Restricted",
            Allowances: perms.canViewPayrollAmounts ? i.allowances : "Restricted",
            "Overtime Pay": perms.canViewPayrollAmounts ? i.overtimePay : "Restricted",
            Bonuses: perms.canViewPayrollAmounts ? i.bonuses : "Restricted",
            "Gross Earnings": perms.canViewPayrollAmounts ? i.grossEarnings : "Restricted",
            "Income Tax": perms.canViewPayrollAmounts ? i.incomeTax : "Restricted",
            "Pension (7%)": perms.canViewPayrollAmounts ? i.employeePension : "Restricted",
            "Employer Pension (11%)": perms.canViewPayrollAmounts ? i.employerPension : "Restricted",
            "Loan Recovery": perms.canViewPayrollAmounts ? i.advanceLoanDeduction : "Restricted",
            "Other Deductions": perms.canViewPayrollAmounts ? i.otherDeductions : "Restricted",
            "Net Pay": perms.canViewPayrollAmounts ? i.netPay : "Restricted",
          }))
        );
      case "project-labor":
        return dash.projectLaborSummaries.map((p) => ({
          Project: p.project,
          "Pay Slips Count": p.employeeCount,
          "Gross Earnings (ETB)": perms.canViewPayrollAmounts ? p.grossEarnings : "Restricted",
          "Employer Pension 11% (ETB)": perms.canViewPayrollAmounts ? p.employerPension : "Restricted",
          "Total Labor Expense (ETB)": perms.canViewPayrollAmounts ? p.totalLaborExpense : "Restricted",
          "Net Disbursed (ETB)": perms.canViewPayrollAmounts ? p.netDisbursed : "Restricted",
        }));
      case "payment-history":
        return loans.map((l) => ({
          Ref: l.referenceNo,
          "Employee ID": l.employeeId,
          Employee: l.workerName,
          Project: l.project,
          Type: l.type,
          Principal: l.principalAmount,
          "Monthly Installment": l.monthlyInstallment,
          Recovered: l.totalRecovered,
          "Remaining Balance": l.remainingBalance,
          Status: l.status,
        }));
      default:
        return buildAttendanceReportRows({
          reportType: selectedReport as AttendanceReportTypeId,
          workers,
          attendance,
          schedules: workSchedules,
          leaveRequests,
          overtimeRequests,
          devices: biometricDevices,
          mappings: biometricDeviceMappings,
          unmappedEvents: unmappedBiometricEvents,
          filters: {
            periodMode: quickClock.attViewMode,
            anchorDate: quickClock.dailyFilterDate,
            selectedMonth,
            employeeFilter: quickClock.filterEmployeeId,
            departmentFilter: quickClock.filterDepartment,
            projectFilter: quickClock.dailyFilterProject,
            workLocationFilter: quickClock.filterWorkLocation,
            searchQuery: reportSearch,
            approvalStatusFilter,
          },
        });
    }
  }, [
    selectedReport,
    dash,
    recruitmentReportData,
    leaveRequests,
    workers,
    payrollRuns,
    loans,
    perms.canViewPayrollAmounts,
    attendance,
    workSchedules,
    overtimeRequests,
    biometricDevices,
    biometricDeviceMappings,
    unmappedBiometricEvents,
    quickClock,
    selectedMonth,
    reportSearch,
    approvalStatusFilter,
  ]);

  const activeRun = useMemo(() => {
    if (selectedRunId) {
      const found = payrollRuns.find((r) => r.id === selectedRunId);
      if (found) return found;
    }
    return payrollRuns[0] || null;
  }, [payrollRuns, selectedRunId]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-red-600/15 border border-red-500/30 text-red-400">
            <Users size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              {isAmharic ? "የሰው ኃይል አስተዳደር (Enterprise HRM & Payroll)" : "Human Resource Management (HRM) & Ethiopian Payroll"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isAmharic
                ? "የሰው ኃይል ዕቅድ · የ5-ደረጃ ቅጥር · ፋይዳ መታወቂያ እና ባዮሜትሪክስ · ፈረቃ/ፈቃድ/ትርፍ ሰዓት · የኢትዮጵያ ግብርና ጡረታ (7%/11%) · ቀጥታ የፋይናንስ GL ውህደት"
                : "Manpower Planning · 5-Stage Recruitment · Fayda ID & Biometrics · Shift/Leave/OT · 4-Tier Ethiopian Tax & Pension Payroll · Direct Finance GL Sync"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-semibold">
            {isAmharic ? "ሚና" : "Role"}: <span className="text-red-400 font-bold">{currentUserRole}</span>
          </div>
          {perms.canViewSensitivePii && (
            <button
              onClick={() => setRevealPii((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {revealPii ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>
                {revealPii
                  ? isAmharic
                    ? "የፋይዳ/ባንክ መረጃ ደብቅ"
                    : "Mask Fayda/Bank PII"
                  : isAmharic
                  ? "ሚስጥራዊ መረጃ አሳይ"
                  : "Reveal Sensitive PII"}
              </span>
            </button>
          )}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
            title={isAmharic ? "የወቅቱ የHRM ወር" : "Active HRM Period Month"}
          />
        </div>
      </div>

      {/* Feedback Banner */}
      {banner && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            banner.type === "error"
              ? "bg-red-950/60 border-red-500/40 text-red-200"
              : banner.type === "info"
              ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
              : "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
          }`}
        >
          <span>{banner.text}</span>
          <button onClick={() => setBanner(null)} className="text-slate-300 hover:text-white cursor-pointer">
            {isAmharic ? "ዝጋ" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2">
        {(
          [
            { id: "dashboard", label: isAmharic ? "የHRM ዳሽቦርድ" : "HRM Dashboard", icon: Layers },
            {
              id: "recruitment",
              label: isAmharic
                ? `ቅጥር እና የሰው ኃይል ዕቅድ (${dash.pendingRecruitmentApprovals})`
                : `Recruitment & Manpower (${dash.pendingRecruitmentApprovals})`,
              icon: UserPlus,
            },
            {
              id: "employees",
              label: isAmharic ? `ሠራተኞች (${workers.length})` : `Employees (${workers.length})`,
              icon: Users,
            },
            ...(biometricMappingPerms.canView
              ? [
                  {
                    id: "biometric-mapping" as HrmSubTab,
                    label: isAmharic
                      ? "የሠራተኛ ባዮሜትሪክ ማጣመሪያ"
                      : "Employee Biometric Mapping",
                    icon: Fingerprint,
                  },
                ]
              : []),
            {
              id: "attendance",
              label: isAmharic ? "ሰዓት መቆጣጠሪያ፣ ፈቃድ እና ትርፍ ሰዓት" : "Attendance, Leave & OT",
              icon: Clock,
            },
            {
              id: "payroll",
              label: isAmharic
                ? `ደመወዝ እና ግብር (${dash.pendingPayrollApprovals})`
                : `Payroll & Tax (${dash.pendingPayrollApprovals})`,
              icon: Banknote,
            },
            {
              id: "reports",
              label: isAmharic ? "የHRM ሪፖርቶች እና ማውጫ" : "HRM Reports & Exports",
              icon: FileSpreadsheet,
            },
          ] as { id: HrmSubTab; label: string; icon: any }[]
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? "bg-red-600 text-white"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB 1: HRM DASHBOARD
         ============================================================ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {isAmharic ? "የጸደቀ የሰው ኃይል" : "Approved Manpower"}
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-white mt-1">
                {dash.totalApprovedManpower}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isAmharic ? "በሁሉም ፕሮጀክቶች" : "Across all project quotas"}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {isAmharic ? "በሥራ ላይ ያሉ ሠራተኞች" : "Active Employees"}
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-emerald-400 mt-1">
                {dash.totalActualHired}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isAmharic ? "ክፍት ቦታዎች" : "Vacancies"}:{" "}
                <span className="font-mono text-slate-300">{dash.totalRemainingVacancies}</span>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {isAmharic ? "ከኮታ በላይ ማንቂያዎች" : "Excess Manpower Alerts"}
              </div>
              <div
                className={`text-2xl font-black font-mono tabular-nums mt-1 ${
                  dash.excessRecruitmentCount > 0 ? "text-amber-400" : "text-slate-300"
                }`}
              >
                {dash.excessRecruitmentCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isAmharic ? "የዳይሬክተር ልዩ ፈቃድ ይፈልጋል" : "Requires Director Approval"}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {isAmharic ? "በመጠባበቅ ላይ ያሉ ማጽደቆች" : "Pending Approvals"}
              </div>
              <div className="text-2xl font-black font-mono tabular-nums text-blue-400 mt-1">
                {dash.pendingRecruitmentApprovals +
                  dash.pendingLeaveApprovals +
                  dash.pendingOvertimeApprovals +
                  dash.pendingPayrollApprovals}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isAmharic
                  ? `ቅጥር ${dash.pendingRecruitmentApprovals} · ፈቃድ ${dash.pendingLeaveApprovals} · OT ${dash.pendingOvertimeApprovals} · ደመወዝ ${dash.pendingPayrollApprovals}`
                  : `Rec ${dash.pendingRecruitmentApprovals} · Lv ${dash.pendingLeaveApprovals} · OT ${dash.pendingOvertimeApprovals} · Pay ${dash.pendingPayrollApprovals}`}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {isAmharic ? "የተከፈለ ዓመታዊ ደመወዝ" : "Disbursed Payroll YTD"}
              </div>
              <div className="text-xl font-black font-mono tabular-nums text-white mt-1">
                {perms.canViewPayrollAmounts
                  ? `ETB ${fmtMoney(dash.totalPayrollNetYtd)}`
                  : isAmharic
                  ? "የተገደበ"
                  : "Restricted"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isAmharic ? "ከፋይናንስ እና GL ጋር የተገናኘ" : "Synced to Finance & GL"}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {isAmharic ? "ቀሪ ብድር እና ቅድሚያ ክፍያ" : "Active Advances / Loans"}
              </div>
              <div className="text-xl font-black font-mono tabular-nums text-rose-400 mt-1">
                {perms.canViewPayrollAmounts
                  ? `ETB ${fmtMoney(dash.activeLoansBalance)}`
                  : isAmharic
                  ? "የተገደበ"
                  : "Restricted"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {isAmharic ? "በደመወዝ ወቅት በራስ-ሰር ይቀነሳል" : "Auto-recovered via payroll"}
              </div>
            </div>
          </div>

          {/* Recruitment & Approved Manpower Real-Time KPIs */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  {isAmharic
                    ? "የቅጥር ጥያቄዎች እና የጸደቀ የሰው ኃይል ቁጥጥር KPI"
                    : "Recruitment Requests & Approved Manpower Control KPIs"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Live requisition pipeline, approved manpower capacity, onboarding fill progress, and excess alerts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("recruitment")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  Open Recruitment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport("recruitment-project-dept");
                    setActiveTab("reports");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Project & Dept Report
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
              {[
                { label: "Total Requests", val: dash.totalManpowerRequests, color: "text-white", border: "border-slate-800" },
                { label: "Pending", val: dash.pendingRecruitmentApprovals, color: "text-blue-400", border: "border-blue-500/30" },
                { label: "Approved", val: dash.approvedRecruitmentRequests, color: "text-emerald-400", border: "border-emerald-500/30" },
                { label: "Rejected", val: dash.rejectedRecruitmentRequests, color: "text-red-400", border: "border-red-500/30" },
                { label: "Awaiting Correction", val: dash.returnedRecruitmentRequests, color: "text-amber-300", border: "border-amber-500/30" },
                { label: "Approved Qty", val: dash.totalApprovedManpowerQty, color: "text-cyan-300", border: "border-cyan-500/30" },
                { label: "Registered", val: dash.registeredEmployeesFromRequests, color: "text-emerald-300", border: "border-emerald-500/40" },
                { label: "Remaining Vacancies", val: dash.remainingRecruitmentVacancies, color: "text-indigo-300", border: "border-indigo-500/30" },
                {
                  label: "Excess Alerts",
                  val: dash.pendingExcessRequestsCount + dash.excessRecruitmentCount,
                  color: dash.pendingExcessRequestsCount > 0 ? "text-rose-400" : "text-slate-300",
                  border: dash.pendingExcessRequestsCount > 0 ? "border-rose-500/50" : "border-slate-800",
                },
              ].map((kpi) => (
                <div key={kpi.label} className={`p-3 rounded-xl bg-slate-900/70 border ${kpi.border}`}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-tight">
                    {kpi.label}
                  </div>
                  <div className={`text-xl font-black font-mono tabular-nums mt-1 ${kpi.color}`}>
                    {kpi.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-extrabold text-white mb-4">
                {isAmharic
                  ? "የጸደቀ የሰው ኃይል ከተቀጠሩ ጋር (በፕሮጀክት እና በሥራ መደብ)"
                  : "Approved vs. Hired Manpower by Project & Role"}
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dash.manpowerRows.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="jobPosition" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="approvedManpower"
                      name={isAmharic ? "የጸደቀ ኮታ" : "Approved Quota"}
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="actualHired"
                      name={isAmharic ? "የተቀጠሩ" : "Actual Hired"}
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="remainingVacancies"
                      name={isAmharic ? "ክፍት ቦታዎች" : "Vacancies"}
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-extrabold text-white mb-4">
                {isAmharic
                  ? "የፕሮጀክት የሰው ኃይል ወጪ (ጠቅላላ + 11% የአሠሪ ጡረታ)"
                  : "Project Labor Cost Allocation (Gross + 11% Pension)"}
              </h3>
              {dash.projectLaborSummaries.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-slate-500 text-xs text-center gap-3">
                  <Banknote size={28} className="text-slate-600" />
                  <span>
                    {isAmharic
                      ? "የፕሮጀክት የሰው ኃይል ወጪ ትንተናን ለማየት የHRM ደመወዝ ያዘጋጁ እና ያጽድቁ።"
                      : "Generate and approve an HRM Payroll Run to visualize live project labor cost allocation."}
                  </span>
                  <button
                    onClick={() => setActiveTab("payroll")}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs cursor-pointer"
                  >
                    {isAmharic ? "የደመወዝ ማዘጋጃ ክፈት" : "Open Payroll Processing"}
                  </button>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dash.projectLaborSummaries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="project" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }}
                      />
                      <Legend />
                      <Bar
                        dataKey="totalLaborExpense"
                        name={isAmharic ? "ጠቅላላ የጉልበት ወጪ" : "Total Labor Expense"}
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="netDisbursed"
                        name={isAmharic ? "የተጣራ ክፍያ" : "Net Disbursed"}
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Biometric Enrollment & Mapping Progress Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Fingerprint size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    {isAmharic
                      ? "የሠራተኛ ባዮሜትሪክ ምዝገባ እና ማጣመሪያ ሂደት"
                      : "Integrated Biometric Enrollment & Mapping Progress"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Workflow: Employee Registration &rarr; Biometric Enrollment &rarr; Employee Biometric Mapping &rarr; Attendance Activation (HR Department Only)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-300">
                  Verified Terminals:{" "}
                  <strong className="font-mono text-emerald-400">
                    {bioDash.verifiedDevicesCount}/{bioDash.activeDevicesCount}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("employees")}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  Open Employee Profiles
                </button>
                {biometricMappingPerms.canView && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("biometric-mapping")}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Employee Biometric Mapping
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Biometric Attendance Activation Coverage ({bioDash.activeAttendanceCount} /{" "}
                  {bioDash.totalEmployees} active employees)
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {bioDash.completionRatePercent}% Active
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 transition-all"
                  style={{ width: `${bioDash.completionRatePercent}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 pt-1">
                <span>
                  Head Office Active:{" "}
                  <strong className="font-mono text-white">
                    {bioDash.headOfficeActiveCount}/{bioDash.headOfficeTotalCount}
                  </strong>
                </span>
                <span>
                  Construction Sites Active:{" "}
                  <strong className="font-mono text-white">
                    {bioDash.siteActiveCount}/{bioDash.siteTotalCount}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(
                [
                  {
                    label: "Not Registered",
                    count: bioDash.notRegisteredCount,
                    color: "text-slate-300",
                    border: "border-slate-800",
                  },
                  {
                    label: "Registered on Device",
                    count: bioDash.enrolledOnDeviceCount,
                    color: "text-blue-400",
                    border: "border-blue-500/30",
                  },
                  {
                    label: "Mapping Pending",
                    count: bioDash.mappingPendingCount,
                    color: "text-amber-400",
                    border: "border-amber-500/30",
                  },
                  {
                    label: "Mapping Completed",
                    count: bioDash.mappingCompletedCount,
                    color: "text-cyan-400",
                    border: "border-cyan-500/30",
                  },
                  {
                    label: "Active",
                    count: bioDash.activeAttendanceCount,
                    color: "text-emerald-400",
                    border: "border-emerald-500/40",
                  },
                  {
                    label: "Suspended",
                    count: bioDash.suspendedCount,
                    color: "text-red-400",
                    border: "border-red-500/30",
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.label}
                  className={`p-3 rounded-xl bg-slate-900/70 border ${item.border}`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    {item.label}
                  </div>
                  <div className={`text-xl font-black font-mono tabular-nums mt-1 ${item.color}`}>
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Department Recruitment & Onboarding Tasks Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>
                    {isAmharic
                      ? "የክፍልዎ የቅጥር ማጽደቂያ እና የተግባር ወረፋ"
                      : `Pending Department Recruitment & Onboarding Queue (${currentUserRole})`}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Section Head &rarr; HR Manager &rarr; Office Engineer Manager &rarr; Finance Manager &rarr; Operation Dept &rarr; Director Final Approval
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("recruitment")}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAmharic ? "የቅጥር ሂደቱን ክፈት" : "Open Recruitment Workflow"}
              </button>
            </div>
            {actionableRequestsForRole.length === 0 &&
            returnedRequestsForUser.length === 0 &&
            !(perms.canApproveDirectorStage && pendingExcessRequests.length > 0) &&
            !(perms.canRegisterApprovedEmployees && approvedRequestsWithOpenSlots.length > 0) ? (
              <div className="text-xs text-slate-500 py-2">
                {isAmharic
                  ? "ለአሁኑ የክፍልዎ ሚና የተመደበ በመጠባበቅ ላይ ያለ የቅጥር ተግባር የለም።"
                  : `No pending manpower recruitment or onboarding actions currently assigned to ${currentUserRole}.`}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {perms.canApproveDirectorStage &&
                  pendingExcessRequests.map((exc) => (
                    <div
                      key={`dash-exc-${exc.id}`}
                      className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">{exc.requestNo}</span>
                        <span className="px-2 py-0.5 rounded bg-rose-600/30 text-rose-200 text-[10px] font-bold">
                          Excess Alert (+{exc.excessCount})
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200">
                        {exc.jobPosition} · {exc.project} ({exc.recruitmentRequestNo})
                      </div>
                      <div className="text-[11px] text-rose-200 line-clamp-2">{exc.justification}</div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setExcessDecisionNotes("");
                            setExcessDecisionModal({ excess: exc, decision: "Approved" });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Approve Excess
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExcessDecisionNotes("");
                            setExcessDecisionModal({ excess: exc, decision: "Rejected" });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Reject Excess
                        </button>
                      </div>
                    </div>
                  ))}
                {actionableRequestsForRole.map((req) => (
                  <div
                    key={`dash-rec-${req.id}`}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{req.requestNo}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                        {req.workflowStage}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-200">
                      {req.requestedCount}x {req.jobPosition} · {req.project}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Requested by {req.requestedBy} · Salary: ETB {fmtMoney(req.proposedMonthlySalary)}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => openRecruitmentDecisionModal(req, "Approved")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Review & Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openRecruitmentDecisionModal(req, "Returned")}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Return
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingRecAudit(req)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                      >
                        Docs & Audit
                      </button>
                    </div>
                  </div>
                ))}
                {returnedRequestsForUser.map((req) => (
                  <div
                    key={`dash-ret-${req.id}`}
                    className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{req.requestNo}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-600/30 text-amber-200 text-[10px] font-bold">
                        Returned for Correction
                      </span>
                    </div>
                    <div className="font-semibold text-slate-200">
                      {req.jobPosition} ({req.project})
                    </div>
                    <div className="text-[11px] text-amber-200">
                      {req.returnedBy}: {req.correctionNotes}
                    </div>
                    <button
                      type="button"
                      onClick={() => openResubmitModal(req)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Edit & Resubmit
                    </button>
                  </div>
                ))}
                {perms.canRegisterApprovedEmployees &&
                  approvedRequestsWithOpenSlots.map((req) => (
                    <div
                      key={`dash-hr-${req.id}`}
                      className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">{req.requestNo}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-200 text-[10px] font-bold">
                          Authorized for HR Onboarding
                        </span>
                      </div>
                      <div className="font-semibold text-slate-200">
                        {req.jobPosition} — {req.hiredCount || 0}/{req.requestedCount} Registered
                      </div>
                      <button
                        type="button"
                        onClick={() => openNewEmployeeModal(req)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Register Employee
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-white">
                {isAmharic ? "የERP ክፍሎች ቀጥተኛ ውህደት ነቅቷል" : "Cross-Module ERP Integrations Active"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isAmharic
                  ? "የደመወዝ ክፍያዎች በባንክ ሂሳቦች፣ በክፍል 4 የፕሮጀክት ወጪ እና በክፍል 8 ዋና ሌጀር (GL) ላይ በራስ-ሰር ይመዘገባሉ።"
                  : "Payroll disbursements post atomically to Finance Bank Accounts, Part 4 Project Actual Costs, and Part 8 General Ledger Double-Entry Vouchers."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateToTab("biometricBoard")}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Fingerprint size={14} className="text-purple-400" />
                <span>{isAmharic ? "የባዮሜትሪክ ምዝገባ ሰሌዳ" : "Biometric Enrollment Board"}</span>
              </button>
              <button
                onClick={() => onNavigateToTab("financeErp")}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Landmark size={14} className="text-emerald-400" />
                <span>{isAmharic ? "ፋይናንስ እና ክፍል 8 GL ክፈት" : "Open Finance & Part 8 GL"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: RECRUITMENT & MANPOWER PLANNING
         ============================================================ */}
      {activeTab === "recruitment" && (
        <div className="space-y-6">
          {/* Recruitment Part 2 KPIs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5">
            {[
              { label: "Total Requests", val: dash.totalManpowerRequests, color: "text-white", border: "border-slate-800" },
              { label: "Pending", val: dash.pendingRecruitmentApprovals, color: "text-blue-400", border: "border-blue-500/30" },
              { label: "Approved", val: dash.approvedRecruitmentRequests, color: "text-emerald-400", border: "border-emerald-500/30" },
              { label: "Rejected", val: dash.rejectedRecruitmentRequests, color: "text-red-400", border: "border-red-500/30" },
              { label: "Awaiting Correction", val: dash.returnedRecruitmentRequests, color: "text-amber-300", border: "border-amber-500/30" },
              { label: "Approved Qty", val: dash.totalApprovedManpowerQty, color: "text-cyan-300", border: "border-cyan-500/30" },
              { label: "Registered", val: dash.registeredEmployeesFromRequests, color: "text-emerald-300", border: "border-emerald-500/40" },
              { label: "Remaining", val: dash.remainingRecruitmentVacancies, color: "text-indigo-300", border: "border-indigo-500/30" },
              {
                label: "Excess Alerts",
                val: dash.pendingExcessRequestsCount + dash.excessRecruitmentCount,
                color: dash.pendingExcessRequestsCount > 0 ? "text-rose-400" : "text-slate-300",
                border: dash.pendingExcessRequestsCount > 0 ? "border-rose-500/50" : "border-slate-800",
              },
            ].map((kpi) => (
              <div key={`rec-kpi-${kpi.label}`} className={`bg-slate-950 p-3 rounded-xl border ${kpi.border}`}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold leading-tight">
                  {kpi.label}
                </div>
                <div className={`text-xl font-black font-mono tabular-nums mt-1 ${kpi.color}`}>
                  {kpi.val}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Approved Manpower Quota Registration */}
            <form
              onSubmit={handleSaveManpowerPlan}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white">
                  {isAmharic ? "1. የጸደቀ የሰው ኃይል ኮታ ምዝገባ" : "1. Register Approved Manpower Quota"}
                </h3>
                <span className="text-[11px] font-bold text-slate-400">HR / Operation / Director</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {isAmharic ? "ፕሮጀክት" : "Project"}
                  </label>
                  <select
                    value={planForm.project}
                    onChange={(e) => setPlanForm((p) => ({ ...p, project: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    {projectNames.map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {isAmharic ? "ክፍል / ዲፓርትመንት" : "Department"}
                  </label>
                  <input
                    value={planForm.department}
                    onChange={(e) => setPlanForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {isAmharic ? "የሥራ መደብ" : "Job Position / Trade"}
                  </label>
                  <input
                    value={planForm.jobPosition}
                    onChange={(e) => setPlanForm((p) => ({ ...p, jobPosition: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {isAmharic ? "የጸደቀ ብዛት ገደብ" : "Approved Headcount Limit"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.approvedManpower}
                    onChange={(e) => setPlanForm((p) => ({ ...p, approvedManpower: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {isAmharic ? "የተያዘለት ወርሃዊ ደመወዝ (ETB)" : "Budgeted Salary / Head (ETB)"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.budgetedMonthlySalaryPerHead}
                    onChange={(e) =>
                      setPlanForm((p) => ({ ...p, budgetedMonthlySalaryPerHead: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {isAmharic ? "የበጀት ዓመት" : "Fiscal Year"}
                  </label>
                  <input
                    value={planForm.fiscalYear}
                    onChange={(e) => setPlanForm((p) => ({ ...p, fiscalYear: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isAmharic ? "የሰው ኃይል ኮታ አስቀምጥ" : "Save Manpower Quota"}
              </button>
            </form>

            {/* Manpower Recruitment Request Form (Section Head) */}
            {perms.canSubmitManpowerRequest ? (
              <form
                onSubmit={handleSubmitRecruitment}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-white">
                    {isAmharic ? "2. የሠራተኛ ቅጥር መጠየቂያ ቅጽ" : "2. Manpower Request Form (Section Head)"}
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    {isAmharic
                      ? "Section Head → HR → Office Engineer → Finance → Operation → Director → HR ምዝገባ"
                      : "Section Head → HR → Office Eng Mgr → Finance → Operation → Director → HR Reg"}
                  </span>
                </div>

                {liveRecManpowerPreview.exceeds && (
                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <div className="font-bold">
                        {isAmharic
                          ? `ከተፈቀደው የሰው ኃይል ገደብ በላይ (+${liveRecManpowerPreview.excess} ትርፍ)`
                          : `Exceeds Approved Manpower Limit (+${liveRecManpowerPreview.excess} Excess)`}
                      </div>
                      <div>
                        {isAmharic
                          ? `የጸደቀ: ${liveRecManpowerPreview.approved} · የተቀጠሩ: ${liveRecManpowerPreview.hired} · ቀሪ ክፍት ቦታ: ${liveRecManpowerPreview.remaining}። ማቅረብ ለዳይሬክተሩ በራስ-ሰር ማሳወቂያ ይልካል።`
                          : `Approved: ${liveRecManpowerPreview.approved} · Active Hired: ${liveRecManpowerPreview.hired} · Remaining Vacancies: ${liveRecManpowerPreview.remaining}. Submitting automatically alerts the Director.`}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Project *</label>
                    <select
                      value={recForm.project}
                      onChange={(e) => setRecForm((p) => ({ ...p, project: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      {projectNames.map((pr) => (
                        <option key={pr} value={pr}>{pr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Department *</label>
                    <input
                      value={recForm.department}
                      onChange={(e) => setRecForm((p) => ({ ...p, department: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Job Position *</label>
                    <input
                      value={recForm.jobPosition}
                      onChange={(e) => setRecForm((p) => ({ ...p, jobPosition: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Employees Required *</label>
                    <input
                      type="number"
                      min={1}
                      value={recForm.requestedCount}
                      onChange={(e) => setRecForm((p) => ({ ...p, requestedCount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Employment Type</label>
                    <select
                      value={recForm.employmentType}
                      onChange={(e) => setRecForm((p) => ({ ...p, employmentType: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                      <option value="Daily Labourer">Daily Labourer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Expected Employment Date *</label>
                    <input
                      type="date"
                      value={recForm.requiredByDate}
                      onChange={(e) => setRecForm((p) => ({ ...p, requiredByDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Proposed Salary (ETB)</label>
                    <input
                      type="number"
                      min={0}
                      value={recForm.proposedMonthlySalary}
                      onChange={(e) =>
                        setRecForm((p) => ({ ...p, proposedMonthlySalary: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Urgency</label>
                    <select
                      value={recForm.urgency}
                      onChange={(e) => setRecForm((p) => ({ ...p, urgency: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Required Experience</label>
                    <input
                      value={recForm.experienceRequired}
                      onChange={(e) => setRecForm((p) => ({ ...p, experienceRequired: e.target.value }))}
                      placeholder="e.g. 3+ Years Building Structural Work"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Job Responsibilities *</label>
                    <textarea
                      rows={2}
                      placeholder="Key duties, site reporting line, safety & deliverable responsibilities..."
                      value={recForm.jobResponsibilities}
                      onChange={(e) => setRecForm((p) => ({ ...p, jobResponsibilities: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Required Qualifications</label>
                    <textarea
                      rows={2}
                      placeholder="Academic / TVET / Professional licenses required..."
                      value={recForm.qualificationsRequired}
                      onChange={(e) => setRecForm((p) => ({ ...p, qualificationsRequired: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Reason for Recruitment *</label>
                    <input
                      placeholder="Justification / Project Milestone or Replacement Need *"
                      value={recForm.justification}
                      onChange={(e) => setRecForm((p) => ({ ...p, justification: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Supporting Documents ({recForm.supportingDocuments.length} attached) {uploadingRecDoc && "(Uploading...)"}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => e.target.files?.[0] && handleUploadRecDocument(e.target.files[0])}
                      className="w-full text-xs text-slate-300"
                    />
                  </div>
                </div>

                {recForm.supportingDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {recForm.supportingDocuments.map((docItem) => (
                      <span
                        key={docItem.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5"
                      >
                        <FileText size={12} className="text-blue-400" />
                        <span>{docItem.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRecForm((p) => ({
                              ...p,
                              supportingDocuments: p.supportingDocuments.filter((d) => d.id !== docItem.id),
                            }))
                          }
                          className="text-slate-400 hover:text-red-400 cursor-pointer ml-1"
                          title="Remove document"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAmharic ? "የቅጥር ጥያቄ አቅርብ (ወደ HR አስተላልፍ)" : "Submit Manpower Request (Route to HR Manager)"}
                </button>
              </form>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Lock size={15} className="text-amber-400" />
                      <span>2. Manpower Request Form (Section Head Only)</span>
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">{currentUserRole}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    New Manpower Requests originate from <strong>Section Head</strong> (Step 1) and automatically advance through{" "}
                    <strong>HR Manager</strong> &rarr; <strong>Office Engineer Manager</strong> &rarr; <strong>Finance Manager</strong> &rarr;{" "}
                    <strong>Operation Department</strong> &rarr; <strong>Director Final Approval</strong>.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  Your role has <strong>{actionableRequestsForRole.length}</strong> stage approval(s) currently awaiting review in the queue below.
                </div>
              </div>
            )}
          </div>

          {/* Actionable Department Task Queue Banner */}
          {(actionableRequestsForRole.length > 0 ||
            returnedRequestsForUser.length > 0 ||
            (perms.canRegisterApprovedEmployees && approvedRequestsWithOpenSlots.length > 0)) && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-emerald-300 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span>
                    Action Queue for {currentUserRole} (
                    {actionableRequestsForRole.length +
                      returnedRequestsForUser.length +
                      (perms.canRegisterApprovedEmployees ? approvedRequestsWithOpenSlots.length : 0)}
                    )
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  Strict sequential approval order enforced
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {actionableRequestsForRole.map((req) => (
                  <div
                    key={`act-${req.id}`}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{req.requestNo}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/40 text-blue-300 text-[10px] font-bold">
                        {req.workflowStage}
                      </span>
                    </div>
                    <div className="text-slate-200 font-semibold">
                      {req.requestedCount}x {req.jobPosition} ({req.project})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Salary: ETB {fmtMoney(req.proposedMonthlySalary)} · Expected: {req.requiredByDate}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => openRecruitmentDecisionModal(req, "Approved")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => openRecruitmentDecisionModal(req, "Returned")}
                        className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Return
                      </button>
                      <button
                        type="button"
                        onClick={() => openRecruitmentDecisionModal(req, "Rejected")}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {returnedRequestsForUser.map((req) => (
                  <div
                    key={`ret-${req.id}`}
                    className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{req.requestNo}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-600/30 text-amber-200 text-[10px] font-bold">
                        Returned for Correction
                      </span>
                    </div>
                    <div className="text-slate-200 font-semibold">
                      {req.jobPosition} ({req.project})
                    </div>
                    <div className="text-[11px] text-amber-200">
                      Note ({req.returnedBy}): {req.correctionNotes}
                    </div>
                    <button
                      type="button"
                      onClick={() => openResubmitModal(req)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Edit & Resubmit Request
                    </button>
                  </div>
                ))}
                {perms.canRegisterApprovedEmployees &&
                  approvedRequestsWithOpenSlots.map((req) => (
                    <div
                      key={`hrreg-${req.id}`}
                      className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white">{req.requestNo}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-200 text-[10px] font-bold">
                          Step 7: HR Registration Authorized
                        </span>
                      </div>
                      <div className="text-slate-200 font-semibold">
                        {req.jobPosition} — {req.hiredCount || 0}/{req.requestedCount} Registered
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Task ID: {req.hrOnboardingTaskId || "Auto-assigned"} · Director Approved
                      </div>
                      <button
                        type="button"
                        onClick={() => openNewEmployeeModal(req)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Register Authorized Employee
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Approved Manpower vs Actual Hired vs Vacancies */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-extrabold text-white mb-3">
              {isAmharic
                ? "የጸደቀ የሰው ኃይል ከተቀጠሩ እና ከቀሪ ክፍት ቦታዎች ጋር"
                : "Approved Manpower vs. Actual Hired & Remaining Vacancies"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-3">{isAmharic ? "ፕሮጀክት" : "Project"}</th>
                    <th className="py-2.5 px-3">{isAmharic ? "ክፍል" : "Department"}</th>
                    <th className="py-2.5 px-3">{isAmharic ? "የሥራ መደብ" : "Job Position"}</th>
                    <th className="py-2.5 px-3 text-right">{isAmharic ? "የጸደቀ" : "Approved"}</th>
                    <th className="py-2.5 px-3 text-right">{isAmharic ? "የተቀጠሩ" : "Actual Hired"}</th>
                    <th className="py-2.5 px-3 text-right">{isAmharic ? "ክፍት ቦታ" : "Vacancies"}</th>
                    <th className="py-2.5 px-3 text-right">{isAmharic ? "ትርፍ" : "Excess"}</th>
                  </tr>
                </thead>
                <tbody>
                  {dash.manpowerRows.map((r, i) => (
                    <tr key={`${r.project}-${r.jobPosition}-${i}`} className="border-b border-slate-900 hover:bg-slate-900/50">
                      <td className="py-2.5 px-3 font-semibold text-white">{r.project}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.department}</td>
                      <td className="py-2.5 px-3 text-slate-200">{r.jobPosition}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.approvedManpower}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">{r.actualHired}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-400">{r.remainingVacancies}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          r.excessCount > 0 ? "text-amber-400" : "text-slate-500"
                        }`}
                      >
                        {r.excessCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Excess Recruitment Alerts & Director Additional Approval Queue */}
          {excessRecruitmentRequests.length > 0 && (
            <div className="bg-slate-950 border border-rose-500/40 rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-rose-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>
                    Excess Recruitment Alerts & Additional Director Approvals ({pendingExcessRequests.length} Pending)
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  HR Manager is strictly blocked from exceeding Director-approved headcount unless Director approves below.
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-3">Excess Req</th>
                      <th className="py-2 px-3">Parent Requisition</th>
                      <th className="py-2 px-3">Project / Role</th>
                      <th className="py-2 px-3 text-right">Approved / Reg / +Excess</th>
                      <th className="py-2 px-3">Justification</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Director Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excessRecruitmentRequests.map((exc) => (
                      <tr key={exc.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{exc.requestNo}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{exc.recruitmentRequestNo}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-white">{exc.jobPosition}</div>
                          <div className="text-[10px] text-slate-400">
                            {exc.project} · {exc.department}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {exc.approvedQuantitySnapshot} / {exc.registeredCountSnapshot} /{" "}
                          <span className="text-rose-400 font-bold">+{exc.excessCount}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs">{exc.justification}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              exc.status === "Approved"
                                ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/40"
                                : exc.status === "Rejected"
                                ? "bg-red-950/70 text-red-300 border border-red-500/40"
                                : "bg-amber-950/70 text-amber-200 border border-amber-500/40"
                            }`}
                          >
                            {exc.status}
                          </span>
                          {exc.directorNotes && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {exc.directorDecisionBy}: {exc.directorNotes}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {exc.status === "Pending Director" && perms.canApproveDirectorStage ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setExcessDecisionNotes("");
                                  setExcessDecisionModal({ excess: exc, decision: "Approved" });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Approve +{exc.excessCount}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setExcessDecisionNotes("");
                                  setExcessDecisionModal({ excess: exc, decision: "Rejected" });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              {exc.status === "Pending Director" ? "Awaiting Director" : exc.directorDecisionAt?.slice(0, 10) || "Decided"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6-Step Sequential Recruitment Pipeline */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-extrabold text-white mb-3">
              {isAmharic
                ? "የቅጥር ጥያቄዎች ሂደት (Section Head → HR → ቢሮ/ምህንድስና → ፋይናንስ → ኦፕሬሽን → ዳይሬክተር → HR ምዝገባ)"
                : "Manpower Recruitment Pipeline & Approved Manpower Control"}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-2.5 px-3">{isAmharic ? "መለያ ቁጥር" : "Req No"}</th>
                    <th className="py-2.5 px-3">{isAmharic ? "ፕሮጀክት / የሥራ መደብ" : "Project / Position"}</th>
                    <th className="py-2.5 px-3 text-right">Approved / Reg / Left</th>
                    <th className="py-2.5 px-3">Fill & Quota Status</th>
                    <th className="py-2.5 px-3">{isAmharic ? "የአሁኑ ደረጃ" : "Current Workflow Stage"}</th>
                    <th className="py-2.5 px-3">{isAmharic ? "ጠያቂ" : "Requested By"}</th>
                    <th className="py-2.5 px-3 text-right">{isAmharic ? "እርምጃ" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {recruitmentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        {isAmharic ? "እስካሁን የቅጥር ጥያቄ አልቀረበም።" : "No recruitment requests submitted yet."}
                      </td>
                    </tr>
                  ) : (
                    recruitmentRequests.map((req) => {
                      const fill = getRecruitmentFillStatus(req);
                      const isDirectorApproved =
                        (req.status === "Approved" || req.status === "Fulfilled") &&
                        Boolean(req.hrRegistrationAuthorized);
                      return (
                        <tr key={req.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                          <td className="py-3 px-3 font-mono text-white font-bold">{req.requestNo}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{req.jobPosition}</div>
                            <div className="text-[11px] text-slate-400">
                              {req.project} · {req.department} ({req.employmentType}) · Expected: {req.requiredByDate}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <span className="text-white font-bold">{fill.approvedQty}</span> /{" "}
                            <span className="text-emerald-400">{fill.registeredCount}</span> /{" "}
                            <span className={fill.remainingVacancies > 0 ? "text-cyan-300" : "text-slate-500"}>
                              {fill.remainingVacancies}
                            </span>
                          </td>
                          <td className="py-3 px-3 space-y-1">
                            {isDirectorApproved && (
                              <div>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    fill.fillStatus === "Filled"
                                      ? "bg-emerald-950/70 border border-emerald-500/40 text-emerald-300"
                                      : fill.fillStatus === "Partially Filled"
                                      ? "bg-blue-950/70 border border-blue-500/40 text-blue-300"
                                      : "bg-cyan-950/70 border border-cyan-500/40 text-cyan-300"
                                  }`}
                                >
                                  {fill.fillStatus}
                                </span>
                              </div>
                            )}
                            {req.exceedsManpowerLimit ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                                +{req.excessApprovedAdded || req.excessCount} Excess ({req.excessApprovalStatus})
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px]">
                                Within Quota
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-semibold ${
                                req.workflowStage === "Rejected"
                                  ? "text-red-400"
                                  : req.workflowStage === "Returned for Correction"
                                  ? "text-amber-300"
                                  : req.workflowStage === "Approved" || req.workflowStage === "Fulfilled"
                                  ? "text-emerald-400"
                                  : "text-blue-300"
                              }`}
                            >
                              {req.workflowStage === "Pending Office Manager"
                                ? "Pending Office Engineer Manager"
                                : req.workflowStage}
                            </span>
                            {req.currentStageAssigneeNames && req.currentStageAssigneeNames.length > 0 && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Assigned: {req.currentStageAssigneeNames.join(", ")}
                              </div>
                            )}
                            {req.rejectionReason && (
                              <div className="text-[10px] text-red-300">Reason: {req.rejectionReason}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <div>{req.requestedBy}</div>
                            <div className="text-[10px] text-slate-500">{req.requestedByRole}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setViewingRecAudit(req)}
                                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                Details / Audit
                              </button>
                              {req.status === "Pending" && canActOnRecruitmentStage(req.workflowStage) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openRecruitmentDecisionModal(req, "Approved")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    {isAmharic ? "ደረጃውን አጽድቅ" : "Approve Stage"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRecruitmentDecisionModal(req, "Returned")}
                                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    {isAmharic ? "ለእርማት መልስ" : "Return"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRecruitmentDecisionModal(req, "Rejected")}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    {isAmharic ? "ውድቅ አድርግ" : "Reject"}
                                  </button>
                                </>
                              )}
                              {canRequesterResubmitRecruitmentRequest({
                                request: req,
                                actorUid,
                                actorRole: currentUserRole,
                              }) && (
                                <button
                                  type="button"
                                  onClick={() => openResubmitModal(req)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  Edit & Resubmit
                                </button>
                              )}
                              {isDirectorApproved && fill.remainingVacancies > 0 && perms.canRegisterApprovedEmployees && (
                                <button
                                  type="button"
                                  onClick={() => openNewEmployeeModal(req)}
                                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  {isAmharic ? "ሠራተኛ መዝግብ" : `Register (${fill.remainingVacancies} left)`}
                                </button>
                              )}
                              {isDirectorApproved && fill.remainingVacancies === 0 && perms.canRegisterApprovedEmployees && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openExcessRequestModal(
                                      req,
                                      `Additional employees required beyond approved ${fill.approvedQty} in ${req.requestNo}.`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  Request Excess (+)
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
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: EMPLOYEE DIRECTORY & ONBOARDING
         ============================================================ */}
      {activeTab === "employees" && (
        <div className="space-y-4">
          {/* Director-Approved Registration Gate Notice */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Lock size={15} className="text-emerald-400 shrink-0" />
              <span>
                <strong>HR Manager Policy Control:</strong>{" "}
                {isAmharic
                  ? "በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃ ማስመዝገብና ማሻሻል የሚችለው HR Manager ብቻ ነው።"
                  : "Per company policy, ONLY the HR Manager can register or modify employee information."} New employee onboarding requires{" "}
                <strong>Director Final Approval</strong> ({approvedRequestsWithOpenSlots.length} open authorized requisition(s)).
              </span>
            </div>
            {perms.canRegisterApprovedEmployees && approvedRequestsWithOpenSlots.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {approvedRequestsWithOpenSlots.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openNewEmployeeModal(r)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Register from {r.requestNo} ({r.requestedCount - (r.hiredCount || 0)} left)
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  placeholder={
                    isAmharic
                      ? "በመለያ ቁጥር፣ ስም፣ የሥራ መደብ ወይም ክፍል ይፈልጉ..."
                      : "Search by Employee ID, Name, Position, or Department..."
                  }
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <select
                value={empProjectFilter}
                onChange={(e) => setEmpProjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
                {projectNames.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {perms.canRegisterApprovedEmployees && (
              approvedRequestsWithOpenSlots.length > 0 ? (
                <button
                  type="button"
                  onClick={() => openNewEmployeeModal()}
                  title="Register Employee from Director-Approved Recruitment Request"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>{isAmharic ? "አዲስ ሠራተኛ መዝግብ" : "Register New Employee"}</span>
                </button>
              ) : allDirectorApprovedRecruitmentRequests.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    openExcessRequestModal(
                      allDirectorApprovedRecruitmentRequests[0],
                      "All Director-approved recruitment slots are filled; requesting additional capacity."
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <AlertTriangle size={15} />
                  <span>Request Excess Approval (Quota Filled)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Requires a Director-approved Manpower Recruitment Request with open slots"
                  className="px-4 py-2 rounded-xl bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Lock size={15} />
                  <span>Registration Locked (Needs Director Approval)</span>
                </button>
              )
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                  <th className="py-2.5 px-3">{isAmharic ? "መለያ ቁጥር" : "Employee ID"}</th>
                  <th className="py-2.5 px-3">{isAmharic ? "ሠራተኛ እና ብቃት" : "Employee & Qualifications"}</th>
                  <th className="py-2.5 px-3">{isAmharic ? "ፕሮጀክት እና ክፍል" : "Project & Dept"}</th>
                  <th className="py-2.5 px-3">{isAmharic ? "ፋይዳ መታወቂያ" : "Fayda ID"}</th>
                  <th className="py-2.5 px-3">{isAmharic ? "የባንክ ሂሳብ" : "Bank Account"}</th>
                  <th className="py-2.5 px-3 text-right">{isAmharic ? "ወርሃዊ ደመወዝ" : "Monthly Salary"}</th>
                  <th className="py-2.5 px-3">{isAmharic ? "ባዮሜትሪክ" : "Biometric"}</th>
                  <th className="py-2.5 px-3 text-right">{isAmharic ? "አስተዳድር" : "Manage"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((w) => {
                  const canSeePii = perms.canViewSensitivePii && revealPii;
                  const dec = decryptedPiiMap[w.id];
                  const faydaDisplay = canSeePii ? (dec?.faydaId || w.faydaId || w.nationalId) : (w.faydaId || w.nationalId);
                  const bankDisplay = canSeePii ? (dec?.bankAccountNumber || w.bankAccountNumber) : w.bankAccountNumber;
                  return (
                    <tr key={w.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {w.employeeId || w.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {w.photo ? (
                            <img src={w.photo} alt={w.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                              {w.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white">{w.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {w.position || w.trade} · {w.experienceYears || 0} yrs exp · {w.qualifications || "Verified"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-semibold">{w.assignedProject || w.currentSite || "Unassigned"}</div>
                        <div className="text-[11px] text-slate-500">{w.department}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {maskSensitiveValue(faydaDisplay, canSeePii)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-300">{w.bankName || "CBE"}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {maskSensitiveValue(bankDisplay, canSeePii)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400 font-bold">
                        {perms.canViewPayrollAmounts
                          ? `ETB ${fmtMoney(Number(w.basicMonthlySalary || (w.hourlyRate ? w.hourlyRate * 208 : 0)))}`
                          : "Restricted"}
                      </td>
                      <td className="py-3 px-3">
                        {(() => {
                          const bioState = computeEmployeeBiometricProfileState(
                            w,
                            biometricDeviceMappings,
                            biometricDevices
                          );
                          const badgeCls =
                            bioState.enrollmentStatus === "Active"
                              ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-300"
                              : bioState.enrollmentStatus === "Mapping Completed"
                              ? "bg-cyan-950/70 border-cyan-500/40 text-cyan-300"
                              : bioState.enrollmentStatus === "Mapping Pending"
                              ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
                              : bioState.enrollmentStatus === "Registered on Device"
                              ? "bg-blue-950/70 border-blue-500/40 text-blue-300"
                              : bioState.enrollmentStatus === "Suspended"
                              ? "bg-red-950/70 border-red-500/40 text-red-300"
                              : "bg-slate-900 border-slate-700 text-slate-400";
                          return (
                            <div className="space-y-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${badgeCls}`}
                              >
                                {bioState.enrollmentStatus}
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {bioState.deviceUserId
                                  ? `BioID: ${bioState.deviceUserId} · Map: ${bioState.mappingStatus}`
                                  : `Map: ${bioState.mappingStatus}`}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEmployeeBiometricProfileModal(w)}
                            className="px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-800/70 border border-purple-500/30 text-purple-200 text-[11px] font-bold cursor-pointer"
                          >
                            {perms.canManageBiometricEnrollment ? "Profile & Biometric" : "View Profile"}
                          </button>
                          {perms.canEditEmployeeProfiles && (
                            <button
                              type="button"
                              onClick={() => openEditEmployeeModal(w)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                            >
                              Edit / Docs
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

      {/* ============================================================
          TAB 4: ATTENDANCE, SCHEDULES, LEAVE, OVERTIME & TRANSFERS
         ============================================================ */}
      {activeTab === "attendance" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "board", label: isAmharic ? "የሰዓት ቁጥጥር እና ባዮሜትሪክ" : "Attendance Dashboard & Sync" },
                  {
                    id: "exceptions",
                    label: isAmharic
                      ? `የሰዓት ግድፈቶች እና HR ማጽደቂያ (${attDashboard.exceptionItems.length})`
                      : `Exceptions & HR Review (${attDashboard.exceptionItems.length})`,
                  },
                  {
                    id: "corrections",
                    label: isAmharic
                      ? `የእጅ ማስተካከያ እና የHR ማጽደቂያ (${attendanceCorrections.filter((c) => c.status !== "Approved" && c.status !== "Rejected").length})`
                      : `Manual Corrections & Approval Audit (${attendanceCorrections.filter((c) => c.status !== "Approved" && c.status !== "Rejected").length})`,
                  },
                  {
                    id: "schedules",
                    label: isAmharic ? `የሥራ ፈረቃ እና በዓላት (${workSchedules.length})` : `Work Shifts & Holidays (${workSchedules.length})`,
                  },
                  {
                    id: "leaves",
                    label: isAmharic ? `የፈቃድ አስተዳደር (${leaveRequests.length})` : `Leave Management (${leaveRequests.length})`,
                  },
                  {
                    id: "overtime",
                    label: isAmharic ? `የትርፍ ሰዓት ጥያቄዎች (${overtimeRequests.length})` : `Overtime Requests (${overtimeRequests.length})`,
                  },
                  {
                    id: "transfers",
                    label: isAmharic ? `የፕሮጀክት ዝውውሮች (${employeeTransfers.length})` : `Site Transfers (${employeeTransfers.length})`,
                  },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setAttSubView(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                    attSubView === s.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Wifi size={13} className={offlineStats.isOnline ? "text-emerald-400" : "text-amber-400"} />
                {isAmharic ? "ያልተላኩ ኦፍላይን መዝገቦች" : "Pending Offline Queue"}:{" "}
                <strong className="font-mono text-white">{offlineStats.pendingCount}</strong>
              </span>
              <button
                onClick={() => offlineSyncService.processQueue().then(() => showToast("success", "Offline attendance queue synced."))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>{isAmharic ? "ኦፍላይን መዝገብ አመሳስል" : "Sync Offline Logs"}</span>
              </button>
              <button
                onClick={() => onNavigateToTab("fingerprintBoard")}
                className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
              >
                <Fingerprint size={13} />
                <span>{isAmharic ? "ባዮሜትሪክ / QR ጣቢያ" : "Biometric / QR Station"}</span>
              </button>
            </div>
          </div>

          {attSubView === "board" && (
            <div className="space-y-5">
              {/* Attendance Dashboard 8 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Present Employees</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">{attDashboard.presentCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{attDashboard.filteredWorkers.length} in scope</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Absent Employees</div>
                  <div className="text-xl font-black text-red-400 font-mono mt-1">{attDashboard.absentCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Unexcused on {quickClock.dailyFilterDate}</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Late Employees</div>
                  <div className="text-xl font-black text-amber-400 font-mono mt-1">{attDashboard.lateCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Beyond shift grace</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Early Departures</div>
                  <div className="text-xl font-black text-orange-400 font-mono mt-1">{attDashboard.earlyDepartureCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Left before shift end</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Missing Punches</div>
                  <div className="text-xl font-black text-rose-400 font-mono mt-1">{attDashboard.missingPunchCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">No time fabricated</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Overtime Candidates</div>
                  <div className="text-xl font-black text-purple-400 font-mono mt-1">{attDashboard.overtimeCandidateCount}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{attDashboard.overtimeCandidateHoursTotal}h flagged</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttSubView("exceptions")}
                  className="bg-slate-950 border border-amber-500/30 hover:border-amber-400 rounded-xl p-3 text-left cursor-pointer"
                >
                  <div className="text-[10px] uppercase tracking-wider text-amber-300">Pending HR Approval</div>
                  <div className="text-xl font-black text-amber-300 font-mono mt-1">{attDashboard.pendingHrApprovalCount}</div>
                  <div className="text-[10px] text-amber-400/80 mt-0.5">Open exception queue →</div>
                </button>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Biometric Devices</div>
                  <div className="text-xl font-black text-cyan-400 font-mono mt-1">
                    {attDashboard.deviceStatusSummary.onlineConnected}/{attDashboard.deviceStatusSummary.active}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {attDashboard.deviceStatusSummary.offlineOrUnverified} offline · {attDashboard.deviceStatusSummary.inactive} inactive
                  </div>
                </div>
              </div>

              {/* Biometric Mapping, Device Status & ZKTeco Hardware Attendance Sync */}
              {biometricMappingPerms.canView && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Fingerprint size={16} className="text-emerald-400" />
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                          {isAmharic
                            ? "የባዮሜትሪክ መሳሪያ ሁኔታ እና ZKTeco ማመሳሰል"
                            : "Biometric Device Status, Mapping & ZKTeco Hardware Sync"}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Active Devices:{" "}
                          <strong className="text-white">{attDashboard.deviceStatusSummary.active}</strong>{" "}
                          · Active Mappings:{" "}
                          <strong className="text-emerald-400">
                            {biometricDeviceMappings.filter((m) => m.status === "Active").length}
                          </strong>{" "}
                          · Unmapped / Device Exceptions:{" "}
                          <strong className="text-amber-400">
                            {unmappedBiometricEvents.filter((u) => u.status === "Unmapped").length}
                          </strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {biometricMappingPerms.canResolveUnmappedEvents && (
                        <button
                          type="button"
                          onClick={handleSyncConnectorQueueInAttendance}
                          disabled={syncingBioQueue}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={13} className={syncingBioQueue ? "animate-spin" : ""} />
                          <span>{syncingBioQueue ? "Syncing Queue..." : "Sync ADMS Hardware Queue"}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab("biometric-mapping")}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sliders size={13} />
                        <span>Open Mapping & Unmapped Queue</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Device Health Strip (G3 Pro / MB360 Plus) */}
                  {attDashboard.deviceStatusSummary.devices.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                      {attDashboard.deviceStatusSummary.devices.map((dev) => (
                        <div
                          key={dev.id}
                          className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{dev.deviceName}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {dev.model} · {dev.workLocationType}
                              {dev.projectName ? ` · ${dev.projectName}` : ""}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              dev.connectivityState === "Online"
                                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                                : dev.connectivityState === "Pending Sync / Offline"
                                ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                                : "bg-red-950/80 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {dev.connectivityState}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {biometricMappingPerms.canResolveUnmappedEvents && (
                    <form
                      onSubmit={handleProcessMappedDevicePunch}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 items-end"
                    >
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Registered Biometric Device</label>
                        <select
                          value={
                            bioClockForm.deviceId ||
                            biometricDevices.find((d) => d.status === "Active")?.id ||
                            ""
                          }
                          onChange={(e) => setBioClockForm((p) => ({ ...p, deviceId: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          <option value="">-- Select Device --</option>
                          {biometricDevices
                            .filter((d) => d.status === "Active")
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.deviceName} ({d.model})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Device Biometric User ID</label>
                        <input
                          value={bioClockForm.biometricUserId}
                          onChange={(e) =>
                            setBioClockForm((p) => ({ ...p, biometricUserId: e.target.value }))
                          }
                          placeholder="e.g. 101"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Punch Type</label>
                        <select
                          value={bioClockForm.punchType}
                          onChange={(e) =>
                            setBioClockForm((p) => ({
                              ...p,
                              punchType: e.target.value as "Check-In" | "Check-Out",
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          <option value="Check-In">Check-In</option>
                          <option value="Check-Out">Check-Out</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        Process Mapped Device Punch
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Schedule-Aware Biometric / QR / Authorized Manual Time Clock */}
              <form
                onSubmit={handleQuickAttendanceSubmit}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {isAmharic
                        ? "ከፈረቃ ጋር የተገናኘ የሰዓት መመዝገቢያ (ባዮሜትሪክ / QR / በተፈቀደ መምሪያ)"
                        : "Schedule-Aware Time Clock (Hardware Biometric / QR Scan / Authorized Manual)"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Leave Check-In or Check-Out blank to record a Missing Punch (hours remain 0h and route to HR Review — never fabricated).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        placeholder={isAmharic ? "QR ወይም መለያ ቁጥር..." : "Scan QR or Employee ID..."}
                        value={quickClock.qrOrEmpInput}
                        onChange={(e) => setQuickClock((p) => ({ ...p, qrOrEmpInput: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono w-44"
                      />
                      <button
                        type="button"
                        onClick={handleQrQuickScan}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        {isAmharic ? "QR/መለያ አዛምድ" : "Match QR/ID"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleHardwareBiometricVerify}
                      className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Fingerprint size={13} />
                      <span>{isAmharic ? "ጣት አሻራ አረጋግጥ" : "Verify Fingerprint"}</span>
                    </button>
                  </div>
                </div>

                {quickClock.biometricVerifiedNote && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                    {quickClock.biometricVerifiedNote}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Employee</label>
                    <select
                      value={quickClock.workerId || workers[0]?.id || ""}
                      onChange={(e) => setQuickClock((p) => ({ ...p, workerId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.employeeId || w.id} — {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={quickClock.date}
                      onChange={(e) => setQuickClock((p) => ({ ...p, date: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Check-In</span>
                      {quickClock.checkIn && (
                        <button
                          type="button"
                          onClick={() => setQuickClock((p) => ({ ...p, checkIn: "" }))}
                          className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <input
                      type="time"
                      value={quickClock.checkIn}
                      onChange={(e) => setQuickClock((p) => ({ ...p, checkIn: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>Check-Out</span>
                      {quickClock.checkOut && (
                        <button
                          type="button"
                          onClick={() => setQuickClock((p) => ({ ...p, checkOut: "" }))}
                          className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </label>
                    <input
                      type="time"
                      value={quickClock.checkOut}
                      onChange={(e) => setQuickClock((p) => ({ ...p, checkOut: e.target.value }))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mode / Status</label>
                    <select
                      value={quickClock.explicitStatus}
                      onChange={(e) => setQuickClock((p) => ({ ...p, explicitStatus: e.target.value as any }))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="Auto">Auto-Compute (Shift)</option>
                      <option value="Present">Force Present</option>
                      <option value="Late">Force Late</option>
                      <option value="Absent">Mark Absent</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                  >
                    {isAmharic ? "መግቢያ/መውጫ መዝግብ" : "Log Check-In/Out"}
                  </button>
                </div>
              </form>

              {/* Daily / Weekly / Monthly Toggle & 5-Filter Bar (Date, Employee, Department, Project, Work Location) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickClock((p) => ({ ...p, attViewMode: "daily" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        quickClock.attViewMode === "daily"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {isAmharic ? "ዕለታዊ መዝገብ" : "Daily Attendance"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickClock((p) => ({ ...p, attViewMode: "weekly" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        quickClock.attViewMode === "weekly"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {isAmharic ? "ሳምንታዊ ማጠቃለያ" : "Weekly Rollup"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickClock((p) => ({ ...p, attViewMode: "monthly" }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        quickClock.attViewMode === "monthly"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {isAmharic ? `ወርሃዊ ማጠቃለያ (${selectedMonth})` : `Monthly Rollup (${selectedMonth})`}
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Period: <strong className="text-white">{attDashboard.periodLabel}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      {quickClock.attViewMode === "monthly" ? "Month" : "Anchor Date"}
                    </label>
                    {quickClock.attViewMode === "monthly" ? (
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    ) : (
                      <input
                        type="date"
                        value={quickClock.dailyFilterDate}
                        onChange={(e) => setQuickClock((p) => ({ ...p, dailyFilterDate: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Employee</label>
                    <select
                      value={quickClock.filterEmployeeId}
                      onChange={(e) => setQuickClock((p) => ({ ...p, filterEmployeeId: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="ALL">All Employees ({workers.length})</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.employeeId || w.id} — {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Department</label>
                    <select
                      value={quickClock.filterDepartment}
                      onChange={(e) => setQuickClock((p) => ({ ...p, filterDepartment: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="ALL">All Departments</option>
                      {departmentOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Project / Site</label>
                    <select
                      value={quickClock.dailyFilterProject}
                      onChange={(e) => setQuickClock((p) => ({ ...p, dailyFilterProject: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="ALL">All Projects & Head Office</option>
                      {projectNames.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Work Location</label>
                    <select
                      value={quickClock.filterWorkLocation}
                      onChange={(e) =>
                        setQuickClock((p) => ({ ...p, filterWorkLocation: e.target.value as WorkLocationFilterType }))
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="ALL">All Locations</option>
                      <option value="Head Office">Head Office</option>
                      <option value="Construction Site">Construction Site</option>
                    </select>
                  </div>
                </div>
              </div>

              {quickClock.attViewMode === "daily" ? (
                <div className="space-y-4">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                          Daily Attendance Log & HR Manager Approval Workflow (
                          {
                            attDashboard.filteredRecords.filter(
                              (a) =>
                                approvalStatusFilter === "ALL" ||
                                (a.finalApprovalStatus || "Pending") === approvalStatusFilter
                            ).length
                          }
                          )
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Timezone: <span className="font-mono text-emerald-400">Africa/Addis_Ababa (EAT, UTC+3)</span> ·{" "}
                          Final Payroll Approval restricted strictly to <strong className="text-white">HR Manager</strong>.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={approvalStatusFilter}
                          onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          <option value="ALL">All Approval Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Returned for Correction">Returned for Correction</option>
                          <option value="Approved">Approved (Payroll Ready)</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        {perms.canFinalApproveAttendance && (
                          <button
                            type="button"
                            onClick={handleBulkFinalApproveReady}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            HR Manager Final Approve Complete Records
                          </button>
                        )}
                      </div>
                    </div>
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Location / Site</th>
                          <th className="py-2.5 px-3">Check-In</th>
                          <th className="py-2.5 px-3">Check-Out</th>
                          <th className="py-2.5 px-3 text-right">Late / Early</th>
                          <th className="py-2.5 px-3 text-right">Work / OT Hrs</th>
                          <th className="py-2.5 px-3">Attendance & Approval Status</th>
                          <th className="py-2.5 px-3">Device / Method</th>
                          <th className="py-2.5 px-3 text-right">Workflow Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attDashboard.filteredRecords.filter(
                          (a) =>
                            approvalStatusFilter === "ALL" ||
                            (a.finalApprovalStatus || "Pending") === approvalStatusFilter
                        ).length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-6 text-center text-slate-500">
                              No attendance punches match the selected filters on {quickClock.dailyFilterDate}.
                            </td>
                          </tr>
                        ) : (
                          attDashboard.filteredRecords
                            .filter(
                              (a) =>
                                approvalStatusFilter === "ALL" ||
                                (a.finalApprovalStatus || "Pending") === approvalStatusFilter
                            )
                            .map((a) => {
                              const missingType = detectMissingPunchType(a);
                              const finalStat = a.finalApprovalStatus || "Pending";
                              return (
                                <tr key={a.id} className="border-b border-slate-900">
                                  <td className="py-2.5 px-3 font-mono text-slate-300">{a.date}</td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-white">{a.workerName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {a.workerId} · {a.department || "General"}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300">
                                    <div>{a.zone || a.gpsLocationString || "Site"}</div>
                                    <div className="text-[10px] text-slate-500">{a.workLocationType || "Construction Site"}</div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-emerald-300">
                                    {a.checkIn || <span className="text-rose-400">MISSING</span>}
                                    {a.originalBiometricSnapshot &&
                                      a.originalBiometricSnapshot.checkIn !== a.checkIn && (
                                        <div className="text-[10px] text-slate-500">
                                          Orig: {a.originalBiometricSnapshot.checkIn || "MISSING"}
                                        </div>
                                      )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-200">
                                    {a.checkOut || <span className="text-rose-400">MISSING</span>}
                                    {a.originalBiometricSnapshot &&
                                      a.originalBiometricSnapshot.checkOut !== a.checkOut && (
                                        <div className="text-[10px] text-slate-500">
                                          Orig: {a.originalBiometricSnapshot.checkOut || "MISSING"}
                                        </div>
                                      )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono">
                                    <span className="text-amber-400">{Number(a.lateArrivalMinutes || 0)}m</span>
                                    <span className="text-slate-500"> / </span>
                                    <span className="text-slate-300">
                                      {Number(a.earlyDepartureMinutes || Math.round(Number(a.underTime || 0) * 60))}m
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono">
                                    <div className="text-white font-bold">{Number(a.workingHours || 0)}h</div>
                                    <div className="text-[10px] text-purple-400">
                                      OT {Number(a.overtime || 0)}h
                                      {Number(a.overtimeCandidateHours || 0) > Number(a.overtime || 0)
                                        ? ` (${a.overtimeCandidateHours}h cand)`
                                        : ""}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 space-y-1">
                                    <div className="flex flex-wrap gap-1">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          a.status === "Present"
                                            ? "bg-emerald-950/70 text-emerald-300"
                                            : a.status === "Late"
                                            ? "bg-amber-950/70 text-amber-300"
                                            : a.status === "Leave" || a.status === "Holiday"
                                            ? "bg-blue-950/70 text-blue-300"
                                            : "bg-red-950/70 text-red-300"
                                        }`}
                                      >
                                        {a.status}
                                      </span>
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          finalStat === "Approved"
                                            ? "bg-emerald-900/70 text-emerald-200 border border-emerald-500/40"
                                            : finalStat === "Rejected"
                                            ? "bg-red-950 text-red-300 border border-red-500/40"
                                            : finalStat === "Returned for Correction"
                                            ? "bg-orange-950 text-orange-300 border border-orange-500/40"
                                            : finalStat === "Under Review"
                                            ? "bg-blue-950 text-blue-300 border border-blue-500/40"
                                            : "bg-slate-800 text-amber-300"
                                        }`}
                                      >
                                        {finalStat}
                                      </span>
                                    </div>
                                    {missingType !== "None" && (
                                      <div className="text-[10px] font-bold text-rose-400">{missingType}</div>
                                    )}
                                    {a.discrepancyFlag && a.discrepancyFlag.status === "Open" && (
                                      <div className="text-[10px] text-amber-300">
                                        Discrepancy ({a.discrepancyFlag.reportedByRole}): {a.discrepancyFlag.notes}
                                      </div>
                                    )}
                                    {a.finalApprovedBy && (
                                      <div className="text-[10px] text-emerald-400">
                                        Finalized by {a.finalApprovedBy}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-400">
                                    <div>{a.method}</div>
                                    {(a.biometricDeviceName || a.biometricUserId) && (
                                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                                        {a.biometricDeviceName || a.biometricDeviceId}
                                        {a.biometricUserId ? ` · BioID ${a.biometricUserId}` : ""}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex flex-wrap justify-end gap-1">
                                      {perms.canFinalApproveAttendance && finalStat !== "Approved" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAttActionModal({ record: a, mode: "Final Approve" });
                                            setAttActionComments("Verified and finalized for payroll");
                                          }}
                                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                        >
                                          Final Approve
                                        </button>
                                      )}
                                      {perms.canFinalApproveAttendance && finalStat !== "Rejected" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAttActionModal({ record: a, mode: "Reject" });
                                            setAttActionComments("");
                                          }}
                                          className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-[10px] font-bold cursor-pointer"
                                        >
                                          Reject
                                        </button>
                                      )}
                                      {perms.canPrepareAttendanceReview && finalStat === "Pending" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAttActionModal({ record: a, mode: "Prepare / Mark Under Review" });
                                            setAttActionComments("Prepared & reviewed by HR Officer");
                                          }}
                                          className="px-2 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                                        >
                                          Under Review
                                        </button>
                                      )}
                                      {perms.canPrepareAttendanceReview && finalStat !== "Approved" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAttActionModal({ record: a, mode: "Return for Correction" });
                                            setAttActionComments("");
                                          }}
                                          className="px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold cursor-pointer"
                                        >
                                          Return
                                        </button>
                                      )}
                                      {perms.canReportAttendanceDiscrepancy && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setAttActionModal({ record: a, mode: "Report Discrepancy" });
                                            setAttActionComments("");
                                          }}
                                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer"
                                        >
                                          Flag Discrepancy
                                        </button>
                                      )}
                                      {perms.canSubmitManualCorrection && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenCorrectionForRecord(a)}
                                          className="px-2 py-1 rounded bg-slate-800 hover:bg-purple-700 text-purple-300 hover:text-white text-[10px] font-bold cursor-pointer"
                                        >
                                          Correction
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
                  </div>

                  {/* Employees Without Attendance Punch on Selected Date (Leave & Absence Reconciliation) */}
                  {attDashboard.absentWorkersToday.length > 0 && (
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                        Leave & Absence Reconciliation on {quickClock.dailyFilterDate} ({attDashboard.absentWorkersToday.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {attDashboard.absentWorkersToday.map((aw) => {
                          const wObj = workers.find((x) => x.id === aw.workerId);
                          const rec = wObj
                            ? reconcileEmployeeAttendanceDay({
                                worker: wObj,
                                date: quickClock.dailyFilterDate,
                                attendanceRecords: attendance,
                                schedules: workSchedules,
                                leaveRequests,
                              })
                            : null;
                          const label = rec?.reconciledStatus || aw.dayStatus;
                          return (
                            <div
                              key={aw.workerId}
                              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">
                                  {aw.employeeId} — {aw.workerName}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {aw.department} · {aw.project} ({aw.workLocationType})
                                  {rec?.leaveType ? ` · ${rec.leaveType}` : ""}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                  label === "Absent"
                                    ? "bg-red-950/80 text-red-300 border border-red-500/30"
                                    : label === "Approved Leave"
                                    ? "bg-blue-950/80 text-blue-300 border border-blue-500/30"
                                    : label === "Unpaid Leave"
                                    ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
                                    : "bg-slate-800 text-slate-300"
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      {quickClock.attViewMode === "weekly"
                        ? `Weekly Attendance Summary (${attDashboard.periodLabel})`
                        : `Monthly Attendance Summary (${attDashboard.periodLabel})`}
                    </h4>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                        <th className="py-2.5 px-3">Employee ID</th>
                        <th className="py-2.5 px-3">Employee Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Location / Site</th>
                        <th className="py-2.5 px-3 text-right">Present</th>
                        <th className="py-2.5 px-3 text-right">Late</th>
                        <th className="py-2.5 px-3 text-right">Early Exit</th>
                        <th className="py-2.5 px-3 text-right">Missing Punch</th>
                        <th className="py-2.5 px-3 text-right">Absent</th>
                        <th className="py-2.5 px-3 text-right">Leave Days</th>
                        <th className="py-2.5 px-3 text-right">Regular Hrs</th>
                        <th className="py-2.5 px-3 text-right">OT (Appr / Cand)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(quickClock.attViewMode === "weekly"
                        ? attDashboard.weeklyRows
                        : attDashboard.monthlyRows
                      ).map((row) => (
                        <tr key={row.workerId} className="border-b border-slate-900">
                          <td className="py-2.5 px-3 font-mono text-white">{row.employeeId}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{row.workerName}</td>
                          <td className="py-2.5 px-3 text-slate-300">{row.department}</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <div>{row.project}</div>
                            <div className="text-[10px] text-slate-500">{row.workLocationType}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{row.presentDays}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400">{row.lateDays}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-orange-400">{row.earlyDepartures}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-400">{row.missingPunches}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-red-400">{row.absentDays}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-400">{row.leaveDays}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-white font-bold">{row.regularHours}h</td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-400">
                            {row.approvedOvertimeHours}h / {row.overtimeCandidateHours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {attSubView === "corrections" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form
                  onSubmit={handleSubmitManualCorrection}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
                >
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      Submit Manual Attendance Correction
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Preserves unmodified original biometric events. Requires reason & HR Manager approval before payroll.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Target Attendance Record (optional for Sync Failure)
                    </label>
                    <select
                      value={correctionForm.attendanceId}
                      onChange={(e) => {
                        const chosen = attendance.find((a) => a.id === e.target.value);
                        setCorrectionForm((p) => ({
                          ...p,
                          attendanceId: e.target.value,
                          ...(chosen
                            ? {
                                workerId: chosen.workerId,
                                date: chosen.date,
                                proposedCheckIn: (chosen.checkIn || "08:00").slice(0, 5),
                                proposedCheckOut: (chosen.checkOut || "17:00").slice(0, 5),
                              }
                            : {}),
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="">-- New Sync Failure / Missing Record --</option>
                      {attendance.slice(0, 80).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.date} · {a.workerName} ({a.checkIn || "MISSING"} - {a.checkOut || "MISSING"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!correctionForm.attendanceId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Employee</label>
                        <select
                          value={correctionForm.workerId || workers[0]?.id || ""}
                          onChange={(e) => setCorrectionForm((p) => ({ ...p, workerId: e.target.value }))}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.employeeId || w.id} — {w.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Date</label>
                        <input
                          type="date"
                          value={correctionForm.date}
                          onChange={(e) => setCorrectionForm((p) => ({ ...p, date: e.target.value }))}
                          className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Correction Type</label>
                    <select
                      value={correctionForm.correctionType}
                      onChange={(e) =>
                        setCorrectionForm((p) => ({
                          ...p,
                          correctionType: e.target.value as AttendanceCorrectionType,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="Missing Check-In">Missing Check-In</option>
                      <option value="Missing Check-Out">Missing Check-Out</option>
                      <option value="Incorrect Attendance Record">Incorrect Attendance Record</option>
                      <option value="Device Synchronization Failure">Device Synchronization Failure</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Proposed Check-In</label>
                      <input
                        type="time"
                        value={correctionForm.proposedCheckIn}
                        onChange={(e) => setCorrectionForm((p) => ({ ...p, proposedCheckIn: e.target.value }))}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Proposed Check-Out</label>
                      <input
                        type="time"
                        value={correctionForm.proposedCheckOut}
                        onChange={(e) => setCorrectionForm((p) => ({ ...p, proposedCheckOut: e.target.value }))}
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Proposed Status</label>
                      <select
                        value={correctionForm.proposedStatus}
                        onChange={(e) =>
                          setCorrectionForm((p) => ({
                            ...p,
                            proposedStatus: e.target.value as AttendanceRecord["status"],
                          }))
                        }
                        className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Leave">Leave</option>
                        <option value="Holiday">Holiday</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mandatory Correction Reason *</label>
                    <textarea
                      required
                      rows={2}
                      value={correctionForm.reason}
                      onChange={(e) => setCorrectionForm((p) => ({ ...p, reason: e.target.value }))}
                      placeholder="Explain why the correction is needed (gate log, device power outage, supervisor verification)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400">
                      Supporting Evidence (Signed Log / Document) {uploadingCorrectionEvidence && "— Uploading..."}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => e.target.files?.[0] && handleUploadCorrectionEvidence(e.target.files[0])}
                      className="text-xs text-slate-300"
                    />
                    {correctionForm.supportingEvidenceName && (
                      <div className="text-[11px] text-emerald-400">
                        Attached: {correctionForm.supportingEvidenceName}
                      </div>
                    )}
                    <input
                      placeholder="Evidence reference / gate book note (optional)"
                      value={correctionForm.supportingEvidenceNote}
                      onChange={(e) =>
                        setCorrectionForm((p) => ({ ...p, supportingEvidenceNote: e.target.value }))
                      }
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Submit Correction for HR Review
                  </button>
                </form>

                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        Manual Correction Requests ({attendanceCorrections.length})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        HR Officer prepares/returns ·{" "}
                        <strong className="text-emerald-400">ONLY HR Manager</strong> gives final Approval or Rejection.
                      </p>
                    </div>
                    {!perms.canFinalApproveAttendance && (
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-amber-300">
                        Final Approve restricted to HR Manager
                      </span>
                    )}
                  </div>

                  {attendanceCorrections.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No manual attendance correction requests submitted yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                      {attendanceCorrections.map((cor) => (
                        <div
                          key={cor.id}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-white">{cor.requestNo}</span>{" "}
                              <span className="text-slate-300 font-semibold">· {cor.workerName}</span>{" "}
                              <span className="text-slate-500 font-mono">({cor.employeeId} · {cor.date})</span>
                              <div className="text-[11px] text-purple-300 font-semibold mt-0.5">
                                {cor.correctionType} · Submitted by {cor.submittedBy} ({cor.submittedByRole})
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                cor.status === "Approved"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                  : cor.status === "Rejected"
                                  ? "bg-red-950 text-red-300 border border-red-500/40"
                                  : cor.status === "Returned for Correction"
                                  ? "bg-orange-950 text-orange-300"
                                  : "bg-amber-950 text-amber-300"
                              }`}
                            >
                              {cor.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                              <div className="font-bold text-slate-400 uppercase text-[10px]">
                                Original Biometric Event (Preserved)
                              </div>
                              <div className="font-mono text-slate-200 mt-1">
                                In: {cor.originalSnapshot.checkIn || "MISSING"} · Out:{" "}
                                {cor.originalSnapshot.checkOut || "MISSING"}
                              </div>
                              <div className="text-slate-400">
                                Hours: {cor.originalSnapshot.workingHours}h · Status: {cor.originalSnapshot.status}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                              <div className="font-bold text-emerald-400 uppercase text-[10px]">
                                Proposed Correction
                              </div>
                              <div className="font-mono text-white mt-1">
                                In: {cor.proposedCheckIn || "MISSING"} · Out: {cor.proposedCheckOut || "MISSING"}
                              </div>
                              <div className="text-slate-300">Proposed Status: {cor.proposedStatus}</div>
                            </div>
                          </div>

                          <div className="text-slate-300">
                            <strong className="text-slate-400">Reason:</strong> {cor.reason}
                          </div>

                          {(cor.supportingEvidenceUrl || cor.supportingEvidenceNote) && (
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-blue-300">
                              {cor.supportingEvidenceUrl && (
                                <a
                                  href={cor.supportingEvidenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline font-bold"
                                >
                                  View Evidence ({cor.supportingEvidenceName || "Attachment"})
                                </a>
                              )}
                              {cor.supportingEvidenceNote && (
                                <span className="text-slate-400">Note: {cor.supportingEvidenceNote}</span>
                              )}
                            </div>
                          )}

                          {cor.status !== "Approved" && cor.status !== "Rejected" && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                              <input
                                placeholder="HR Officer / HR Manager review comments..."
                                value={correctionReviewNotes[cor.id] || ""}
                                onChange={(e) =>
                                  setCorrectionReviewNotes((p) => ({ ...p, [cor.id]: e.target.value }))
                                }
                                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                              />
                              {perms.canPrepareAttendanceReview && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewCorrection(cor, "Mark Under Review")}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Mark Under Review
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewCorrection(cor, "Return for Correction")}
                                    className="px-2.5 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Return
                                  </button>
                                </>
                              )}
                              {perms.canFinalApproveAttendance && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewCorrection(cor, "Approve")}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    HR Manager Approve & Apply
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReviewCorrection(cor, "Reject")}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Immutable Attendance Approval & Correction Audit Log */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Immutable Attendance Approval & Correction Audit History ({attendanceAuditLogs.length}) — Africa/Addis_Ababa
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {attendanceAuditLogs.slice(0, 40).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-white">{log.action}</span> ·{" "}
                        <span className="text-slate-300">{log.workerName}</span> ({log.date})
                        {log.previousStatus && log.newStatus && (
                          <span className="ml-2 text-[11px] font-mono text-emerald-400">
                            {log.previousStatus} → {log.newStatus}
                          </span>
                        )}
                        <div className="text-[11px] text-slate-400">
                          Actor: {log.actorName} ({log.actorRole}) {log.comments ? `— ${log.comments}` : ""}
                        </div>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {formatAddisAbabaDateTime(log.timestamp)}
                      </div>
                    </div>
                  ))}
                  {attendanceAuditLogs.length === 0 && (
                    <div className="text-xs text-slate-500 py-4 text-center">No attendance audit entries recorded yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {attSubView === "exceptions" && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" />
                    <span>Attendance Exceptions & HR Review / Approval Queue</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Incomplete punches hold 0h until HR verifies the missing Check-In/Check-Out timestamp. Overtime candidates require HR approval before payroll credit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("biometric-mapping")}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Open Biometric Mapping & Unmapped Queue
                </button>
              </div>

              {attDashboard.exceptionItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No pending attendance exceptions or unmapped biometric events for the selected filter scope.
                </div>
              ) : (
                <div className="space-y-3">
                  {attDashboard.exceptionItems.map((ex) => {
                    const draft = exceptionDrafts[ex.id] || { time: "", notes: "" };
                    return (
                      <div
                        key={ex.id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  ex.category.startsWith("Missing")
                                    ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                                    : ex.category === "Overtime Candidate"
                                    ? "bg-purple-950 text-purple-300 border border-purple-500/40"
                                    : ex.sourceType === "unmapped"
                                    ? "bg-red-950 text-red-300 border border-red-500/40"
                                    : "bg-amber-950 text-amber-300 border border-amber-500/40"
                                }`}
                              >
                                {ex.category}
                              </span>
                              <span className="text-xs font-bold text-white">{ex.workerName}</span>
                              {ex.employeeId && (
                                <span className="text-[11px] font-mono text-slate-400">({ex.employeeId})</span>
                              )}
                              <span className="text-[11px] font-mono text-slate-400">· {ex.date}</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{ex.details}</p>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {ex.project}
                              {ex.workLocationType ? ` (${ex.workLocationType})` : ""}
                              {ex.deviceName ? ` · Device: ${ex.deviceName}` : ""}
                              {ex.biometricUserId ? ` · BioID: ${ex.biometricUserId}` : ""}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 text-[10px] font-bold">
                            {ex.reviewStatus}
                          </span>
                        </div>

                        {ex.sourceType === "attendance" && ex.attendanceRecord ? (
                          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-800/80">
                            {(ex.category === "Missing Check-Out" || ex.category === "Missing Check-In") && (
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">
                                  {ex.category === "Missing Check-In" ? "Verified Check-In Time" : "Verified Check-Out Time"}
                                </label>
                                <input
                                  type="time"
                                  value={draft.time}
                                  onChange={(e) =>
                                    setExceptionDrafts((p) => ({
                                      ...p,
                                      [ex.id]: { ...draft, time: e.target.value },
                                    }))
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-[10px] text-slate-400 mb-1">HR Review Audit Notes *</label>
                              <input
                                placeholder="Enter verified reason / supervisor confirmation..."
                                value={draft.notes}
                                onChange={(e) =>
                                  setExceptionDrafts((p) => ({
                                    ...p,
                                    [ex.id]: { ...draft, notes: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(ex.category === "Missing Check-Out" || ex.category === "Missing Check-In") && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResolveAttendanceException(ex.attendanceRecord!, "Complete Missing Punch")
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  Complete Missing Punch
                                </button>
                              )}
                              {ex.category === "Overtime Candidate" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResolveAttendanceException(ex.attendanceRecord!, "Approve Overtime")
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Approve Overtime ({ex.overtimeCandidateHours || 0}h)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleResolveAttendanceException(ex.attendanceRecord!, "Reject Overtime")
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Reject OT
                                  </button>
                                </>
                              )}
                              {ex.category === "Early Departure" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResolveAttendanceException(ex.attendanceRecord!, "Acknowledge Exception")
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                                >
                                  Acknowledge Early Exit
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end pt-2 border-t border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => setActiveTab("biometric-mapping")}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                            >
                              Resolve in Biometric Mapping Module →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {attSubView === "schedules" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form
                onSubmit={handleSaveSchedule}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <h3 className="text-sm font-extrabold text-white">
                  Configure Work Shifts, Night Shifts, Scopes & Holidays
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Schedule Name</label>
                    <input
                      value={schedForm.scheduleName}
                      onChange={(e) => setSchedForm((p) => ({ ...p, scheduleName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Schedule Scope</label>
                    <select
                      value={schedForm.scopeType}
                      onChange={(e) =>
                        setSchedForm((p) => ({
                          ...p,
                          scopeType: e.target.value as "Company" | "Project" | "Department" | "Employee",
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="Company">Company-Wide / Location Default</option>
                      <option value="Project">Site / Project Specific</option>
                      <option value="Department">Department Specific</option>
                      <option value="Employee">Employee-Specific Shift</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Work Location Scope</label>
                    <select
                      value={schedForm.workLocationType}
                      onChange={(e) =>
                        setSchedForm((p) => ({
                          ...p,
                          workLocationType: e.target.value as "ALL" | "Head Office" | "Construction Site",
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="ALL">All Locations</option>
                      <option value="Head Office">Head Office Only</option>
                      <option value="Construction Site">Construction Sites Only</option>
                    </select>
                  </div>
                  {schedForm.scopeType === "Project" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Target Project / Site</label>
                      <select
                        value={schedForm.project}
                        onChange={(e) => setSchedForm((p) => ({ ...p, project: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        <option value="ALL">All Projects</option>
                        {projectNames.map((pr) => (
                          <option key={pr} value={pr}>{pr}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {schedForm.scopeType === "Department" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Target Department</label>
                      <select
                        value={schedForm.department}
                        onChange={(e) => setSchedForm((p) => ({ ...p, department: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        <option value="ALL">All Departments</option>
                        {departmentOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {schedForm.scopeType === "Employee" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Target Employee</label>
                      <select
                        value={schedForm.workerId || workers[0]?.id || ""}
                        onChange={(e) => setSchedForm((p) => ({ ...p, workerId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                      >
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.employeeId || w.id} — {w.name} ({w.department || "General"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Schedule Period Type</label>
                    <select
                      value={schedForm.schedulePeriodType}
                      onChange={(e) =>
                        setSchedForm((p) => ({
                          ...p,
                          schedulePeriodType: e.target.value as "Weekly" | "Monthly" | "Fixed",
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="Weekly">Weekly Repeating Shift</option>
                      <option value="Monthly">Monthly Roster Shift</option>
                      <option value="Fixed">Fixed Date Range</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={schedForm.isNightShift}
                        onChange={(e) => setSchedForm((p) => ({ ...p, isNightShift: e.target.checked }))}
                      />
                      <span>Night Shift (Crosses Midnight)</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Effective From</label>
                    <input
                      type="date"
                      value={schedForm.effectiveFrom}
                      onChange={(e) => setSchedForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Effective To (Optional)</label>
                    <input
                      type="date"
                      value={schedForm.effectiveTo}
                      onChange={(e) => setSchedForm((p) => ({ ...p, effectiveTo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Shift Start</label>
                    <input
                      type="time"
                      value={schedForm.shiftStartTime}
                      onChange={(e) => setSchedForm((p) => ({ ...p, shiftStartTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Shift End</label>
                    <input
                      type="time"
                      value={schedForm.shiftEndTime}
                      onChange={(e) => setSchedForm((p) => ({ ...p, shiftEndTime: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Break (min) / Standard Hrs / Grace (min)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={schedForm.breakMinutes}
                        onChange={(e) => setSchedForm((p) => ({ ...p, breakMinutes: Number(e.target.value) }))}
                        title="Unpaid Break Minutes"
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        min={1}
                        step="0.5"
                        value={schedForm.standardDailyHours}
                        onChange={(e) => setSchedForm((p) => ({ ...p, standardDailyHours: Number(e.target.value) }))}
                        title="Standard Daily Working Hours"
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        min={0}
                        value={schedForm.graceMinutesLate}
                        onChange={(e) => setSchedForm((p) => ({ ...p, graceMinutesLate: Number(e.target.value) }))}
                        title="Late Grace Minutes"
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">OT Weekday / Rest / Holiday Multipliers</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={schedForm.overtimeMultiplierWeekday}
                        onChange={(e) =>
                          setSchedForm((p) => ({ ...p, overtimeMultiplierWeekday: Number(e.target.value) }))
                        }
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={schedForm.overtimeMultiplierRestDay}
                        onChange={(e) =>
                          setSchedForm((p) => ({ ...p, overtimeMultiplierRestDay: Number(e.target.value) }))
                        }
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={schedForm.overtimeMultiplierHoliday}
                        onChange={(e) =>
                          setSchedForm((p) => ({ ...p, overtimeMultiplierHoliday: Number(e.target.value) }))
                        }
                        className="w-full px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Weekly Rest Days</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                        const active = schedForm.restDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() =>
                              setSchedForm((p) => ({
                                ...p,
                                restDays: active
                                  ? p.restDays.filter((x) => x !== day)
                                  : [...p.restDays, day],
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              active
                                ? "bg-amber-600 text-white"
                                : "bg-slate-900 text-slate-400 border border-slate-800"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Add Public Holiday</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={schedForm.holidayDate}
                        onChange={(e) => setSchedForm((p) => ({ ...p, holidayDate: e.target.value }))}
                        className="px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                      <input
                        placeholder="Holiday Name"
                        value={schedForm.holidayName}
                        onChange={(e) => setSchedForm((p) => ({ ...p, holidayName: e.target.value }))}
                        className="flex-1 px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!schedForm.holidayDate || !schedForm.holidayName) return;
                          setSchedForm((p) => ({
                            ...p,
                            holidays: [...p.holidays, { date: p.holidayDate, name: p.holidayName }],
                            holidayDate: "",
                            holidayName: "",
                          }));
                        }}
                        className="px-3 py-2 rounded-lg bg-slate-800 text-xs font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Schedule Configuration
                </button>
              </form>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-white">Active Work Schedules</h3>
                {workSchedules.length === 0 ? (
                  <p className="text-xs text-slate-500">Default 08:00–17:00 schedule active. Save custom shift policies on the left.</p>
                ) : (
                  workSchedules.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-white">{s.scheduleName}</div>
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 text-[10px] font-bold">
                            {s.scopeType || (s.project !== "ALL" ? "Project" : "Company")}
                          </span>
                          {s.workLocationType && s.workLocationType !== "ALL" && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                              {s.workLocationType}
                            </span>
                          )}
                          {s.isNightShift && (
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 text-[10px] font-bold">
                              Night Shift
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-300">
                        Target:{" "}
                        {s.employeeName
                          ? `${s.employeeId || s.workerId} — ${s.employeeName}`
                          : s.project !== "ALL"
                          ? `Site: ${s.project}`
                          : s.department !== "ALL"
                          ? `Dept: ${s.department}`
                          : "Company / Location Default"}
                        {s.schedulePeriodType ? ` · ${s.schedulePeriodType}` : ""}
                        {s.effectiveFrom ? ` · From ${s.effectiveFrom}` : ""}
                        {s.effectiveTo ? ` to ${s.effectiveTo}` : ""}
                      </div>
                      <div className="text-slate-400">
                        Hours: {s.shiftStartTime}–{s.shiftEndTime} · Break: {s.breakMinutes}m · Standard: {s.standardDailyHours}h · Grace: {s.graceMinutesLate}m · OT: {s.overtimeMultiplierWeekday}x / {s.overtimeMultiplierRestDay}x / {s.overtimeMultiplierHoliday}x
                      </div>
                      <div className="text-slate-500">
                        Rest Days: {s.restDays.join(", ") || "None"} · Holidays: {s.holidays.length}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {attSubView === "leaves" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSubmitLeave}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-extrabold text-white">Submit Leave Request</h3>
                <select
                  value={leaveForm.workerId || workers[0]?.id || ""}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, workerId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.employeeId || w.id} — {w.name}</option>
                  ))}
                </select>
                {(() => {
                  const selW = workers.find((x) => x.id === leaveForm.workerId) || workers[0];
                  const bal = selW?.leaveBalances || { annual: 16, sick: 10, maternityPaternity: 15, unpaidUsed: 0 };
                  return selW ? (
                    <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-center text-[10px]">
                      <div>
                        <div className="text-slate-400">Annual</div>
                        <div className="font-mono font-bold text-emerald-400">{bal.annual}d</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Sick</div>
                        <div className="font-mono font-bold text-blue-400">{bal.sick}d</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Mat/Pat</div>
                        <div className="font-mono font-bold text-purple-400">{bal.maternityPaternity}d</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Unpaid</div>
                        <div className="font-mono font-bold text-amber-400">{bal.unpaidUsed}d</div>
                      </div>
                    </div>
                  ) : null;
                })()}
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Maternity/Paternity Leave">Maternity/Paternity Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <input
                  placeholder="Reason / Handover Notes"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Submit Leave Application
                </button>
              </form>

              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-sm font-extrabold text-white mb-3">
                  Leave Requests (Section Head → HR Manager Approval & Balance Deduction)
                </h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2">Ref</th>
                      <th className="py-2 px-2">Employee</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Dates</th>
                      <th className="py-2 px-2 text-right">Days</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((lv) => (
                      <tr key={lv.id} className="border-b border-slate-900">
                        <td className="py-2.5 px-2 font-mono text-white">{lv.requestNo}</td>
                        <td className="py-2.5 px-2 font-semibold text-white">{lv.workerName}</td>
                        <td className="py-2.5 px-2 text-slate-300">{lv.leaveType}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-400">{lv.startDate} → {lv.endDate}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{lv.totalDays}</td>
                        <td className="py-2.5 px-2 text-blue-300 font-semibold">{lv.status}</td>
                        <td className="py-2.5 px-2 text-right space-x-1">
                          {lv.status.startsWith("Pending") && (
                            <>
                              <button
                                onClick={() => handleAdvanceLeave(lv, "Approved")}
                                className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdvanceLeave(lv, "Rejected")}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {attSubView === "overtime" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSubmitOvertime}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-extrabold text-white">Submit Overtime Request</h3>
                <select
                  value={otForm.workerId || workers[0]?.id || ""}
                  onChange={(e) => setOtForm((p) => ({ ...p, workerId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.employeeId || w.id} — {w.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={otForm.workDate}
                    onChange={(e) => setOtForm((p) => ({ ...p, workDate: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                  <input
                    type="number"
                    min={0.5}
                    step="0.5"
                    value={otForm.hoursRequested}
                    onChange={(e) => setOtForm((p) => ({ ...p, hoursRequested: Number(e.target.value) }))}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <select
                  value={otForm.dayType}
                  onChange={(e) => setOtForm((p) => ({ ...p, dayType: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Weekday">Weekday Overtime (1.5x)</option>
                  <option value="Rest Day">Rest Day Overtime (2.0x)</option>
                  <option value="Holiday">Public Holiday Overtime (2.5x)</option>
                </select>
                <input
                  placeholder="Overtime Task / Site Pouring Reason"
                  value={otForm.reason}
                  onChange={(e) => setOtForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                >
                  Submit Overtime Request
                </button>
              </form>

              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-sm font-extrabold text-white mb-3">
                  Overtime Approvals (Approved OT Automatically Feeds Monthly Payroll)
                </h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2">Ref</th>
                      <th className="py-2 px-2">Employee</th>
                      <th className="py-2 px-2">Work Date</th>
                      <th className="py-2 px-2 text-right">Hours</th>
                      <th className="py-2 px-2">Rate</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeRequests.map((ot) => (
                      <tr key={ot.id} className="border-b border-slate-900">
                        <td className="py-2.5 px-2 font-mono text-white">{ot.requestNo}</td>
                        <td className="py-2.5 px-2 font-semibold text-white">{ot.workerName}</td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">{ot.workDate}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{ot.hoursRequested} hrs</td>
                        <td className="py-2.5 px-2 font-mono text-purple-300">{ot.multiplier}x ({ot.dayType})</td>
                        <td className="py-2.5 px-2 text-blue-300 font-semibold">{ot.status}</td>
                        <td className="py-2.5 px-2 text-right space-x-1">
                          {ot.status.startsWith("Pending") && (
                            <>
                              <button
                                onClick={() => handleAdvanceOvertime(ot, "Approved")}
                                className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdvanceOvertime(ot, "Rejected")}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {attSubView === "transfers" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleCreateTransfer}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-extrabold text-white">Transfer Employee Between Locations & Sites</h3>
                <select
                  value={transferForm.workerId || workers[0]?.id || ""}
                  onChange={(e) => setTransferForm((p) => ({ ...p, workerId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({inferWorkerWorkLocationType(w)}: {w.assignedProject || w.currentSite || "Unassigned"})
                    </option>
                  ))}
                </select>
                <select
                  value={transferForm.toWorkLocationType}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      toWorkLocationType: e.target.value as "Head Office" | "Construction Site",
                      toProject:
                        e.target.value === "Head Office"
                          ? "Head Office"
                          : p.toProject === "Head Office"
                          ? projectNames[0] || "CMC Residential"
                          : p.toProject,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Construction Site">To Work Location: Construction Site</option>
                  <option value="Head Office">To Work Location: Head Office</option>
                </select>
                <select
                  value={transferForm.toProject}
                  onChange={(e) =>
                    setTransferForm((p) => ({
                      ...p,
                      toProject: e.target.value,
                      toWorkLocationType: e.target.value.toLowerCase().includes("head office")
                        ? "Head Office"
                        : "Construction Site",
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Head Office">To Site: Head Office</option>
                  {projectNames.map((pr) => (
                    <option key={pr} value={pr}>To Project: {pr}</option>
                  ))}
                </select>
                <input
                  placeholder="Destination Department"
                  value={transferForm.toDepartment}
                  onChange={(e) => setTransferForm((p) => ({ ...p, toDepartment: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <input
                  placeholder="New Position (optional)"
                  value={transferForm.toPosition}
                  onChange={(e) => setTransferForm((p) => ({ ...p, toPosition: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <input
                  type="date"
                  value={transferForm.effectiveDate}
                  onChange={(e) => setTransferForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <input
                  placeholder="Transfer Reason"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                {!perms.canEditEmployeeProfiles && (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 text-[11px] text-amber-200">
                    {isAmharic
                      ? "በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃና ምደባ ማሻሻል የሚችለው HR manager ብቻ ነው።"
                      : "Per company policy, only the HR Manager can execute employee transfers or modify employee records."}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={!perms.canEditEmployeeProfiles}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowRightLeft size={14} />
                  <span>{perms.canEditEmployeeProfiles ? "Execute Transfer" : "Locked (HR Manager Only)"}</span>
                </button>
              </form>

              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-sm font-extrabold text-white mb-3">Site & Location Transfer History</h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2">Transfer No</th>
                      <th className="py-2 px-2">Employee</th>
                      <th className="py-2 px-2">From Location / Site</th>
                      <th className="py-2 px-2">To Location / Site</th>
                      <th className="py-2 px-2">Dept</th>
                      <th className="py-2 px-2">Effective Date</th>
                      <th className="py-2 px-2">Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeTransfers.map((tr) => (
                      <tr key={tr.id} className="border-b border-slate-900">
                        <td className="py-2.5 px-2 font-mono text-white">{tr.transferNo}</td>
                        <td className="py-2.5 px-2 font-semibold text-white">{tr.workerName}</td>
                        <td className="py-2.5 px-2 text-slate-400">
                          <div>{tr.fromProject}</div>
                          {tr.fromWorkLocationType && (
                            <div className="text-[10px] text-slate-500">{tr.fromWorkLocationType}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-emerald-400 font-bold">
                          <div>{tr.toProject}</div>
                          {tr.toWorkLocationType && (
                            <div className="text-[10px] text-emerald-300/80 font-normal">{tr.toWorkLocationType}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-slate-300">{tr.toDepartment}</td>
                        <td className="py-2.5 px-2 font-mono">{tr.effectiveDate}</td>
                        <td className="py-2.5 px-2 text-slate-300">{tr.approvedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 5: PAYROLL, ETHIOPIAN TAX & PENSION, SALARY ADVANCES
         ============================================================ */}
      {activeTab === "payroll" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-3">
            {(
              [
                {
                  id: "runs",
                  label: isAmharic ? `ወርሃዊ የደመወዝ ዝግጅቶች (${payrollRuns.length})` : `Monthly Payroll Runs (${payrollRuns.length})`,
                },
                {
                  id: "structures",
                  label: isAmharic ? `የደመወዝ መዋቅሮች (${salaryStructures.length})` : `Salary Structures (${salaryStructures.length})`,
                },
                {
                  id: "tax",
                  label: isAmharic ? "የኢትዮጵያ ግብር እና ጡረታ (7% / 11%)" : "Ethiopian Tax & Pension Config (7% / 11%)",
                },
                {
                  id: "loans",
                  label: isAmharic ? `ቅድሚያ ደመወዝ እና ብድር (${loans.length})` : `Salary Advances & Loans (${loans.length})`,
                },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setPayrollSubView(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                  payrollSubView === s.id
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {payrollSubView === "runs" && (
            <div className="space-y-5">
              {/* Employee Self-Service Payslips */}
              {(perms.isEmployee || personalPayslips.length > 0) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-white">
                      {perms.isEmployee
                        ? isAmharic
                          ? "የእኔ የተከፈሉ የደመወዝ ደረሰኞች (Payslips)"
                          : "My Official Disbursed Payslips"
                        : isAmharic
                        ? `የተከፈሉ የሠራተኞች ደመወዝ ደረሰኞች (${personalPayslips.length})`
                        : `Disbursed Employee Payslips (${personalPayslips.length})`}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {isAmharic
                        ? "ኦፊሴላዊ PDF ደረሰኝ · በኢትዮጵያ ግብርና ጡረታ የተረጋገጠ"
                        : "Official PDF Payslips · Ethiopian Tax & Pension Verified"}
                    </span>
                  </div>
                  {personalPayslips.length === 0 ? (
                    <div className="text-xs text-slate-500 py-3">
                      {isAmharic ? "ለመለያዎ የተከፈለ ደመወዝ ደረሰኝ ገና አልተገኘም።" : "No official disbursed payslips found for your account yet."}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                            <th className="py-2 px-2">{isAmharic ? "ወር" : "Period"}</th>
                            <th className="py-2 px-2">{isAmharic ? "መለያ" : "Run No"}</th>
                            <th className="py-2 px-2">{isAmharic ? "ሠራተኛ" : "Employee"}</th>
                            <th className="py-2 px-2">{isAmharic ? "ፕሮጀክት" : "Project"}</th>
                            <th className="py-2 px-2 text-right">{isAmharic ? "ጠቅላላ (ETB)" : "Gross (ETB)"}</th>
                            <th className="py-2 px-2 text-right">{isAmharic ? "ተቀናሽ" : "Deductions"}</th>
                            <th className="py-2 px-2 text-right">{isAmharic ? "የተጣራ ክፍያ" : "Net Disbursed"}</th>
                            <th className="py-2 px-2 text-right">{isAmharic ? "ደረሰኝ" : "Payslip"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personalPayslips.slice(0, 20).map((ps) => (
                            <tr key={ps.id} className="border-b border-slate-900">
                              <td className="py-2 px-2 font-mono text-white">{ps.payPeriod}</td>
                              <td className="py-2 px-2 font-mono text-slate-300">{ps.runNo}</td>
                              <td className="py-2 px-2 font-semibold text-white">{ps.workerName}</td>
                              <td className="py-2 px-2 text-slate-300">{ps.project}</td>
                              <td className="py-2 px-2 text-right font-mono">{fmtMoney(ps.item.grossEarnings)}</td>
                              <td className="py-2 px-2 text-right font-mono text-amber-300">{fmtMoney(ps.item.totalDeductions)}</td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-emerald-400">{fmtMoney(ps.item.netPay)}</td>
                              <td className="py-2 px-2 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPayslipModalData({
                                      run: {
                                        runNo: ps.runNo,
                                        payPeriod: ps.payPeriod,
                                        paymentReferenceNo: ps.paymentReferenceNo,
                                        workflowStage: ps.workflowStage,
                                        glJournalId: ps.glJournalId,
                                        paymentDate: ps.paymentDate,
                                      },
                                      item: ps.item,
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                                >
                                  {isAmharic ? "እይ" : "View"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadHrmPayslipPdf({
                                      run: {
                                        runNo: ps.runNo,
                                        payPeriod: ps.payPeriod,
                                        paymentReferenceNo: ps.paymentReferenceNo,
                                        workflowStage: ps.workflowStage,
                                        glJournalId: ps.glJournalId,
                                        paymentDate: ps.paymentDate,
                                      },
                                      item: ps.item,
                                    })
                                  }
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Generate Monthly Run */}
              {(perms.canManageEmployees || perms.isHrManager || perms.isDirector || perms.canApproveFinanceStage) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isAmharic ? "የክፍያ ወር" : "Pay Period"}
                        </label>
                        <input
                          type="month"
                          value={payPeriodInput}
                          onChange={(e) => setPayPeriodInput(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {isAmharic ? "የፕሮጀክት ወሰን" : "Project Scope"}
                        </label>
                        <select
                          value={payProjectScope}
                          onChange={(e) => setPayProjectScope(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
                          {projectNames.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleGeneratePayrollRun}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isAmharic ? "የተረጋገጠ ደመወዝ አዘጋጅ" : "Generate Verified Payroll Run"}
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 text-right">
                      <div>
                        {isAmharic
                          ? `ድርብ ክፍያ መከላከያ: ነቅቷል · ጡረታ: ${activeTaxConfig.employeePensionPercent}% ሠራተኛ / ${activeTaxConfig.employerPensionPercent}% አሠሪ`
                          : `Duplicate Pay Guard: Active · Tax Config: ${activeTaxConfig.employeePensionPercent}% Emp / ${activeTaxConfig.employerPensionPercent}% Er Pension`}
                      </div>
                      <div className="mt-0.5 text-emerald-400">
                        {approvedDeductionPolicy
                          ? `Approved Deduction Policy: ${approvedDeductionPolicy.policyName}`
                          : "Deduction Policy: None Approved (0 automatic attendance deductions applied)"}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enforceStrictAttendanceGate}
                        onChange={(e) => setEnforceStrictAttendanceGate(e.target.checked)}
                      />
                      <span>
                        Strict Gate: Block payroll generation if an employee has unapproved attendance in {payPeriodInput} (recommended)
                      </span>
                    </label>
                    <span className="text-[11px] text-amber-300">
                      Unapproved records in {payPeriodInput}:{" "}
                      <strong className="font-mono">
                        {
                          attendance.filter(
                            (a) =>
                              a.date?.startsWith(payPeriodInput) &&
                              a.finalApprovalStatus !== "Approved" &&
                              a.hrReviewStatus !== "Approved"
                          ).length
                        }
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Runs Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-sm font-extrabold text-white mb-3">
                  {isAmharic
                    ? "ባለ 4-ደረጃ የደመወዝ ማረጋገጫ (HR → ፋይናንስ → ኦፕሬሽን → ዳይሬክተር → ክፍያ)"
                    : "4-Tier Payroll Verification (HR Manager → Finance Manager → Operation Manager → Director → Paid)"}
                </h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2.5 px-3">{isAmharic ? "መለያ" : "Run No"}</th>
                      <th className="py-2.5 px-3">{isAmharic ? "ወር / ወሰን" : "Period / Scope"}</th>
                      <th className="py-2.5 px-3 text-right">{isAmharic ? "ብዛት" : "Staff"}</th>
                      <th className="py-2.5 px-3 text-right">{isAmharic ? "ጠቅላላ (ETB)" : "Gross (ETB)"}</th>
                      <th className="py-2.5 px-3 text-right">{isAmharic ? "የገቢ ግብር" : "Income Tax"}</th>
                      <th className="py-2.5 px-3 text-right">{isAmharic ? "ጡረታ (7%+11%)" : "Pension (7%+11%)"}</th>
                      <th className="py-2.5 px-3 text-right">{isAmharic ? "የተጣራ ክፍያ" : "Net Payable"}</th>
                      <th className="py-2.5 px-3">{isAmharic ? "የማረጋገጫ ደረጃ" : "Verification Stage"}</th>
                      <th className="py-2.5 px-3 text-right">{isAmharic ? "እርምጃ" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRuns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500">
                          No payroll runs generated yet. Select a pay period and click "Generate Verified Payroll Run".
                        </td>
                      </tr>
                    ) : (
                      payrollRuns.map((run) => (
                        <tr
                          key={run.id}
                          onClick={() => setSelectedRunId(run.id)}
                          className={`border-b border-slate-900 cursor-pointer ${
                            activeRun?.id === run.id ? "bg-slate-900/80" : "hover:bg-slate-900/40"
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-white">{run.runNo}</td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-white">{run.payPeriod}</div>
                            <div className="text-[11px] text-slate-400">{run.projectScope}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono">{run.totalEmployees}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {perms.canViewPayrollAmounts ? fmtMoney(run.totalGrossPay) : "***"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-amber-300">
                            {perms.canViewPayrollAmounts ? fmtMoney(run.totalIncomeTax) : "***"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-300">
                            {perms.canViewPayrollAmounts
                              ? fmtMoney(run.totalEmployeePension + run.totalEmployerPension)
                              : "***"}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">
                            {perms.canViewPayrollAmounts ? fmtMoney(run.totalNetPay) : "***"}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-1 rounded text-[11px] font-bold ${
                                run.workflowStage === "Paid"
                                  ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30"
                                  : run.workflowStage === "Approved for Payment"
                                  ? "bg-blue-950/70 text-blue-300 border border-blue-500/30"
                                  : run.workflowStage === "Rejected"
                                  ? "bg-red-950/70 text-red-300 border border-red-500/30"
                                  : "bg-slate-800 text-amber-300"
                              }`}
                            >
                              {run.workflowStage}
                            </span>
                            {run.glJournalId && (
                              <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                                GL: {run.glJournalId}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              {canActOnPayrollStage(run.workflowStage) && (
                                <>
                                  <button
                                    onClick={() => handleAdvancePayrollStage(run, "Approved")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Verify & Advance
                                  </button>
                                  <button
                                    onClick={() => handleAdvancePayrollStage(run, "Rejected")}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-200 text-[11px] font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {run.workflowStage === "Approved for Payment" && perms.canDisbursePayroll && (
                                <button
                                  onClick={() => {
                                    setDisburseModalRun(run);
                                    setDisburseBankId(bankAccounts[0]?.id || "");
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  Disburse & Sync GL
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

              {/* Active Run Employee Line Items & Payslips */}
              {activeRun && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        Payslip Breakdown — {activeRun.runNo} ({activeRun.payPeriod})
                      </h4>
                      {activeRun.attendanceAuditSummary && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Approved Attendance Used:{" "}
                          <strong className="text-emerald-400 font-mono">
                            {activeRun.attendanceAuditSummary.approvedRecordsUsed}
                          </strong>{" "}
                          · Unapproved Excluded:{" "}
                          <strong className="text-amber-300 font-mono">
                            {activeRun.attendanceAuditSummary.unapprovedRecordsExcluded}
                          </strong>{" "}
                          · Policy Deductions:{" "}
                          <strong className="text-white">
                            {activeRun.attendanceAuditSummary.approvedDeductionPolicyApplied
                              ? activeRun.attendanceAuditSummary.policyName
                              : "None (Unapproved / Inactive)"}
                          </strong>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      Employer Pension (11%): ETB{" "}
                      <strong className="font-mono text-white">
                        {perms.canViewPayrollAmounts ? fmtMoney(activeRun.totalEmployerPension) : "Restricted"}
                      </strong>
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                        <th className="py-2 px-2">Employee</th>
                        <th className="py-2 px-2">Project</th>
                        <th className="py-2 px-2 text-right">Appr Days / Leave / Abs</th>
                        <th className="py-2 px-2 text-right">Basic</th>
                        <th className="py-2 px-2 text-right">Allowances</th>
                        <th className="py-2 px-2 text-right">OT Pay</th>
                        <th className="py-2 px-2 text-right">Bonus</th>
                        <th className="py-2 px-2 text-right">Gross</th>
                        <th className="py-2 px-2 text-right">Tax</th>
                        <th className="py-2 px-2 text-right">Pen (7%)</th>
                        <th className="py-2 px-2 text-right">Loan/Pol Ded</th>
                        <th className="py-2 px-2 text-right">Net Pay</th>
                        <th className="py-2 px-2 text-right">Payslip & Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRun.items.map((item) => (
                        <tr key={item.workerId} className="border-b border-slate-900">
                          <td className="py-2.5 px-2">
                            <div className="font-semibold text-white">{item.workerName}</div>
                            <div className="text-[10px] font-mono text-slate-500">{item.employeeId}</div>
                          </td>
                          <td className="py-2.5 px-2 text-slate-300">{item.project}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-[11px]">
                            <span className="text-emerald-400">{item.approvedWorkingDays ?? item.daysWorked}d</span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-blue-400">{item.approvedLeaveDays ?? 0}L</span>
                            <span className="text-slate-500"> / </span>
                            <span className="text-rose-400">{item.unpaidAbsenceDays ?? item.absentDays}A</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">{perms.canViewPayrollAmounts ? fmtMoney(item.basicSalary) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{perms.canViewPayrollAmounts ? fmtMoney(item.allowances) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-purple-300">{perms.canViewPayrollAmounts ? fmtMoney(item.overtimePay) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-emerald-300">{perms.canViewPayrollAmounts ? fmtMoney(item.bonuses) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-white">{perms.canViewPayrollAmounts ? fmtMoney(item.grossEarnings) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-amber-300">{perms.canViewPayrollAmounts ? fmtMoney(item.incomeTax) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-blue-300">{perms.canViewPayrollAmounts ? fmtMoney(item.employeePension) : "***"}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-rose-300">
                            {perms.canViewPayrollAmounts ? fmtMoney(item.advanceLoanDeduction + item.otherDeductions) : "***"}
                            {Number(item.policyAttendanceDeductions || 0) > 0 && (
                              <span className="block text-[10px] text-amber-300">
                                (Att Pol: {fmtMoney(item.policyAttendanceDeductions!)})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-400">{perms.canViewPayrollAmounts ? fmtMoney(item.netPay) : "***"}</td>
                          <td className="py-2.5 px-2 text-right">
                            {perms.canViewPayrollAmounts && (
                              <div className="inline-flex items-center gap-1">
                                {activeRun.workflowStage !== "Paid" && (perms.canManageEmployees || perms.isHrManager || perms.isDirector || perms.canApproveFinanceStage) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAdjustLineTarget({
                                        runId: activeRun.id,
                                        workerId: item.workerId,
                                        workerName: item.workerName,
                                        bonuses: item.bonuses,
                                        otherDeductions: item.otherDeductions,
                                      })
                                    }
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-600 text-amber-300 hover:text-white text-[11px] font-bold cursor-pointer"
                                    title="Adjust Bonus or Other Deduction"
                                  >
                                    <Sliders size={11} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPayslipModalData({ run: activeRun, item })}
                                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadHrmPayslipPdf({ run: activeRun, item })}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Download size={11} />
                                  <span>PDF</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {payrollSubView === "structures" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSaveSalaryStructure}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-extrabold text-white">Create Salary Structure Grade</h3>
                <input
                  placeholder="Structure Code"
                  value={structForm.structureCode}
                  onChange={(e) => setStructForm((p) => ({ ...p, structureCode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
                <input
                  placeholder="Structure Title"
                  value={structForm.structureName}
                  onChange={(e) => setStructForm((p) => ({ ...p, structureName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Basic Salary</label>
                    <input
                      type="number"
                      value={structForm.basicSalary}
                      onChange={(e) => setStructForm((p) => ({ ...p, basicSalary: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Housing Allowance</label>
                    <input
                      type="number"
                      value={structForm.housingAllowance}
                      onChange={(e) => setStructForm((p) => ({ ...p, housingAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Transport Allowance</label>
                    <input
                      type="number"
                      value={structForm.transportAllowance}
                      onChange={(e) => setStructForm((p) => ({ ...p, transportAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Position Allowance</label>
                    <input
                      type="number"
                      value={structForm.positionAllowance}
                      onChange={(e) => setStructForm((p) => ({ ...p, positionAllowance: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Salary Structure
                </button>
              </form>

              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-sm font-extrabold text-white mb-3">Salary Grades & Allowances</h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2">Code</th>
                      <th className="py-2 px-2">Title</th>
                      <th className="py-2 px-2 text-right">Basic</th>
                      <th className="py-2 px-2 text-right">Allowances</th>
                      <th className="py-2 px-2 text-right">Total Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryStructures.map((s) => (
                      <tr key={s.id} className="border-b border-slate-900">
                        <td className="py-2.5 px-2 font-mono font-bold text-white">{s.structureCode}</td>
                        <td className="py-2.5 px-2 text-slate-200">{s.structureName}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmtMoney(s.basicSalary)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {fmtMoney(s.housingAllowance + s.transportAllowance + s.positionAllowance + s.medicalAllowance)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400">
                          {fmtMoney(
                            s.basicSalary +
                              s.housingAllowance +
                              s.transportAllowance +
                              s.positionAllowance +
                              s.medicalAllowance
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payrollSubView === "tax" && (
            <form
              onSubmit={handleSaveTaxConfig}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Configurable Ethiopian Income Tax Brackets & Pension Rates (7% / 11%)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Formula: Taxable Income × Rate % − Statutory Deduction. Employee Pension % & Employer Pension % apply to Basic Salary.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTaxForm({
                      employeePensionPercent: 7,
                      employerPensionPercent: 11,
                      brackets: DEFAULT_ETHIOPIAN_TAX_BRACKETS,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
                >
                  Reset to Default Ethiopian Law Brackets
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Employee Pension %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={taxForm.employeePensionPercent}
                    onChange={(e) => setTaxForm((p) => ({ ...p, employeePensionPercent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Employer Pension %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={taxForm.employerPensionPercent}
                    onChange={(e) => setTaxForm((p) => ({ ...p, employerPensionPercent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <table className="w-full text-xs text-left max-w-3xl">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    <th className="py-2 px-2">Min Salary (ETB)</th>
                    <th className="py-2 px-2">Max Salary (ETB)</th>
                    <th className="py-2 px-2">Tax Rate %</th>
                    <th className="py-2 px-2">Deduction (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  {taxForm.brackets.map((b, idx) => (
                    <tr key={idx} className="border-b border-slate-900">
                      <td className="py-2 px-2 font-mono">{b.minAmount}</td>
                      <td className="py-2 px-2 font-mono">{b.maxAmount ?? "Unlimited"}</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={b.ratePercent}
                          onChange={(e) => {
                            const next = [...taxForm.brackets];
                            next[idx] = { ...b, ratePercent: Number(e.target.value) };
                            setTaxForm((p) => ({ ...p, brackets: next }));
                          }}
                          className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.5"
                          value={b.deductionAmount}
                          onChange={(e) => {
                            const next = [...taxForm.brackets];
                            next[idx] = { ...b, deductionAmount: Number(e.target.value) };
                            setTaxForm((p) => ({ ...p, brackets: next }));
                          }}
                          className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Tax & Pension Policy
              </button>
            </form>
          )}

          {payrollSubView === "tax" && (
            <form
              onSubmit={handleSaveDeductionPolicy}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 mt-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Company Attendance Deduction Policy (Payroll Gate)
                  </h3>
                  <p className="text-xs text-slate-400">
                    System NEVER applies automatic salary deductions for absence/unpaid leave/lateness unless an HR Manager or Director explicitly marks this policy as Approved.
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                    policyForm.isApproved
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                      : "bg-slate-800 text-amber-300"
                  }`}
                >
                  {policyForm.isApproved ? "APPROVED & ACTIVE" : "DRAFT / INACTIVE"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Policy Title</label>
                  <input
                    value={policyForm.policyName}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, policyName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Standard Working Days / Month</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={policyForm.standardWorkingDaysPerMonth}
                    onChange={(e) =>
                      setPolicyForm((p) => ({ ...p, standardWorkingDaysPerMonth: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Absence Daily Multiplier</label>
                  <input
                    type="number"
                    step="0.25"
                    min={0}
                    value={policyForm.absenceDailyMultiplier}
                    onChange={(e) =>
                      setPolicyForm((p) => ({ ...p, absenceDailyMultiplier: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-xs text-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.deductUnpaidLeave}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, deductUnpaidLeave: e.target.checked }))}
                  />
                  <span>Deduct Approved Unpaid Leave</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.deductUnexcusedAbsence}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, deductUnexcusedAbsence: e.target.checked }))}
                  />
                  <span>Deduct Unexcused Absence Days</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policyForm.lateDeductionEnabled}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, lateDeductionEnabled: e.target.checked }))}
                  />
                  <span>Enable Late Minutes Deduction</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-400">
                  <input
                    type="checkbox"
                    checked={policyForm.isApproved}
                    onChange={(e) => setPolicyForm((p) => ({ ...p, isApproved: e.target.checked }))}
                  />
                  <span>Approve & Activate Policy for Payroll</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Save Attendance Deduction Policy
              </button>
            </form>
          )}

          {payrollSubView === "loans" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSubmitLoan}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-extrabold text-white">Salary Advance / Employee Loan</h3>
                <select
                  value={loanForm.workerId || workers[0]?.id || ""}
                  onChange={(e) => setLoanForm((p) => ({ ...p, workerId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.employeeId || w.id} — {w.name}</option>
                  ))}
                </select>
                <select
                  value={loanForm.type}
                  onChange={(e) => setLoanForm((p) => ({ ...p, type: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Salary Advance">Salary Advance</option>
                  <option value="Employee Loan">Employee Loan</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Principal (ETB)</label>
                    <input
                      type="number"
                      min={100}
                      value={loanForm.principalAmount}
                      onChange={(e) => setLoanForm((p) => ({ ...p, principalAmount: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Installment Months</label>
                    <input
                      type="number"
                      min={1}
                      max={36}
                      value={loanForm.installmentMonths}
                      onChange={(e) => setLoanForm((p) => ({ ...p, installmentMonths: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                    />
                  </div>
                </div>
                <input
                  placeholder="Purpose / Notes"
                  value={loanForm.reason}
                  onChange={(e) => setLoanForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                >
                  Submit Advance / Loan Request
                </button>
              </form>

              <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <h3 className="text-sm font-extrabold text-white mb-3">
                  Advances & Loans Recovery Tracker (HR → Finance Approval → Payroll Deduction)
                </h3>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                      <th className="py-2 px-2">Ref</th>
                      <th className="py-2 px-2">Employee</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2 text-right">Principal</th>
                      <th className="py-2 px-2 text-right">Monthly Ded</th>
                      <th className="py-2 px-2 text-right">Balance</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((ln) => (
                      <tr key={ln.id} className="border-b border-slate-900">
                        <td className="py-2.5 px-2 font-mono text-white">{ln.referenceNo}</td>
                        <td className="py-2.5 px-2 font-semibold text-white">{ln.workerName}</td>
                        <td className="py-2.5 px-2 text-slate-300">{ln.type}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmtMoney(ln.principalAmount)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmtMoney(ln.monthlyInstallment)}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-400">{fmtMoney(ln.remainingBalance)}</td>
                        <td className="py-2.5 px-2 font-semibold text-blue-300">{ln.status}</td>
                        <td className="py-2.5 px-2 text-right space-x-1">
                          {(ln.status === "Pending HR" || ln.status === "Pending Finance") && (
                            <>
                              <button
                                onClick={() => handleAdvanceLoan(ln, "Approved")}
                                className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAdvanceLoan(ln, "Rejected")}
                                className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 6: HRM REPORTS & EXPORTS
         ============================================================ */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "manpower", label: isAmharic ? "የሰው ኃይል እና ክፍት ቦታዎች" : "Manpower & Vacancies" },
                  { id: "recruitment-project-dept", label: isAmharic ? "የቅጥር ሪፖርት (በፕሮጀክት እና ክፍል)" : "Recruitment Summary (Project & Dept)" },
                  { id: "recruitment", label: isAmharic ? "የቅጥር ዝርዝር ሂደት" : "Recruitment Detailed Pipeline" },
                  { id: "attendance", label: isAmharic ? "የሰዓት ቁጥጥር ማጠቃለያ" : "Attendance Summary" },
                  { id: "leave-absence", label: isAmharic ? "ፈቃድ እና ቀሪ ቀናት" : "Leave & Absence Balances" },
                  { id: "payroll", label: isAmharic ? "ወርሃዊ ደመወዝ እና ግብር" : "Monthly Payroll & Tax/Pension" },
                  { id: "project-labor", label: isAmharic ? "የፕሮጀክት የጉልበት ወጪ" : "Project Labor Expenses" },
                  { id: "payment-history", label: isAmharic ? "ቅድሚያ ክፍያ እና ብድር ታሪክ" : "Advances & Loans History" },
                  { id: "daily-attendance", label: "Daily Attendance" },
                  { id: "weekly-attendance", label: "Weekly Attendance" },
                  { id: "monthly-attendance", label: "Monthly Attendance" },
                  { id: "employee-history", label: "Employee History" },
                  { id: "department-attendance", label: "Department Attendance" },
                  { id: "project-site-attendance", label: "Project/Site Attendance" },
                  { id: "late-arrival", label: "Late Arrival" },
                  { id: "absence", label: "Absence & Leave" },
                  { id: "overtime", label: "Overtime Report" },
                  { id: "missing-punch", label: "Missing Punch" },
                  { id: "hr-approval", label: "HR Approval Report" },
                  { id: "biometric-device-sync", label: "Biometric Device Sync" },
                ] as { id: HrmReportKind; label: string }[]
              ).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    selectedReport === r.id
                      ? "bg-red-600 text-white"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  exportHrmReport({ reportName: selectedReport, rows: activeReportRows, format: "xlsx" });
                  onLogAction("HRM Report Exported", `Exported ${selectedReport} report to Excel (.xlsx)`);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                <span>{isAmharic ? "ወደ Excel አውጣ" : "Export Excel"}</span>
              </button>
              <button
                onClick={() => {
                  exportHrmReport({ reportName: selectedReport, rows: activeReportRows, format: "csv" });
                  onLogAction("HRM Report Exported", `Exported ${selectedReport} report to CSV`);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>{isAmharic ? "ወደ CSV አውጣ" : "Export CSV"}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>{isAmharic ? "አትም" : "Print"}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 items-end">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Search</label>
              <input
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Employee, device, site..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            {selectedReport === "recruitment" || selectedReport === "recruitment-project-dept" ? (
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Submitted Month</label>
                <input
                  type="month"
                  value={recReportMonthFilter}
                  onChange={(e) => setRecReportMonthFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Anchor Date</label>
                <input
                  type="date"
                  value={quickClock.dailyFilterDate}
                  onChange={(e) => setQuickClock((p) => ({ ...p, dailyFilterDate: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Employee</label>
              <select
                value={quickClock.filterEmployeeId}
                onChange={(e) => setQuickClock((p) => ({ ...p, filterEmployeeId: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Employees</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.employeeId || w.id} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Department</label>
              <select
                value={quickClock.filterDepartment}
                onChange={(e) => setQuickClock((p) => ({ ...p, filterDepartment: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Departments</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Project / Site</label>
              <select
                value={quickClock.dailyFilterProject}
                onChange={(e) => setQuickClock((p) => ({ ...p, dailyFilterProject: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Projects</option>
                {projectNames.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Work Location</label>
              <select
                value={quickClock.filterWorkLocation}
                onChange={(e) =>
                  setQuickClock((p) => ({ ...p, filterWorkLocation: e.target.value as WorkLocationFilterType }))
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ALL">All Locations</option>
                <option value="Head Office">Head Office</option>
                <option value="Construction Site">Construction Site</option>
              </select>
            </div>
            {selectedReport === "recruitment" || selectedReport === "recruitment-project-dept" ? (
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Recruitment / Fill Status</label>
                <select
                  value={recReportStatusFilter}
                  onChange={(e) => setRecReportStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Returned for Correction">Awaiting Correction</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Open">Fill: Open</option>
                  <option value="Partially Filled">Fill: Partially Filled</option>
                  <option value="Filled">Fill: Filled</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Approval Status</label>
                <select
                  value={approvalStatusFilter}
                  onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Returned for Correction">Returned for Correction</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
            {activeReportRows.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">No rows available for this report.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                    {Object.keys(activeReportRows[0]).map((k) => (
                      <th key={k} className="py-2.5 px-3">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeReportRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-900">
                      {Object.values(row).map((val, cIdx) => (
                        <td key={cIdx} className="py-2.5 px-3 font-mono text-slate-200">
                          {typeof val === "number" ? val.toLocaleString() : String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: REGISTER / EDIT EMPLOYEE
         ============================================================ */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEmployee}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {editingWorkerId ? "Edit Employee Profile" : "Register New Employee (Director-Approved Recruitment)"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Auto Employee ID: <strong className="font-mono text-emerald-400">{empForm.employeeId}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmpModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Linked Approved Recruitment Selector (New Registration) */}
            {!editingWorkerId && (
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    Linked Director-Approved Recruitment Request *
                  </label>
                  {onboardingFromRec && (() => {
                    const st = getRecruitmentFillStatus(onboardingFromRec);
                    return (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.remainingVacancies === 0
                            ? "bg-rose-950/70 text-rose-300 border border-rose-500/40"
                            : "bg-emerald-950/70 text-emerald-300 border border-emerald-500/40"
                        }`}
                      >
                        Approved: {st.approvedQty} · Registered: {st.registeredCount} · Remaining: {st.remainingVacancies} ({st.fillStatus})
                      </span>
                    );
                  })()}
                </div>
                <select
                  value={onboardingFromRec?.id || ""}
                  onChange={(e) => {
                    const picked = allDirectorApprovedRecruitmentRequests.find((r) => r.id === e.target.value);
                    if (picked) {
                      setOnboardingFromRec(picked);
                      setEmpForm((p) => ({
                        ...p,
                        assignedProject: picked.project,
                        workLocationType: inferWorkerWorkLocationType({ assignedProject: picked.project }),
                        department: picked.department,
                        position: picked.jobPosition,
                        trade: picked.jobPosition,
                        jobResponsibilities: picked.jobResponsibilities || p.jobResponsibilities,
                        employmentType: picked.employmentType,
                        joinedDate: picked.requiredByDate || p.joinedDate,
                        basicMonthlySalary: picked.proposedMonthlySalary || p.basicMonthlySalary,
                        qualifications: picked.qualificationsRequired || p.qualifications,
                        experienceSummary: picked.experienceRequired || p.experienceSummary,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  required
                >
                  {allDirectorApprovedRecruitmentRequests.map((r) => {
                    const st = getRecruitmentFillStatus(r);
                    return (
                      <option key={r.id} value={r.id}>
                        {r.requestNo} — {r.jobPosition} ({r.project} / {r.department}) [{st.registeredCount}/{st.approvedQty} Registered · {st.remainingVacancies} Left]
                      </option>
                    );
                  })}
                </select>
                {onboardingFromRec && getRecruitmentFillStatus(onboardingFromRec).remainingVacancies <= 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Normal registration is blocked: {onboardingFromRec.requestNo} has 0 remaining vacancies. Director Excess Approval is required.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmpModal(false);
                        openExcessRequestModal(
                          onboardingFromRec,
                          `Additional capacity needed beyond ${onboardingFromRec.requestedCount} approved positions in ${onboardingFromRec.requestNo}.`
                        );
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      Submit Excess Request to Director
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Section 1: Personal Details */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                1. Personal Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Full Name *</label>
                  <input
                    value={empForm.name}
                    onChange={(e) => setEmpForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Gender *</label>
                  <select
                    value={empForm.gender}
                    onChange={(e) => setEmpForm((p) => ({ ...p, gender: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Date of Birth *</label>
                  <input
                    type="date"
                    value={empForm.dateOfBirth}
                    onChange={(e) => setEmpForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Phone Number *</label>
                  <input
                    value={empForm.phoneNumber}
                    onChange={(e) => setEmpForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="+2519..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Residential Address *</label>
                  <input
                    value={empForm.address}
                    onChange={(e) => setEmpForm((p) => ({ ...p, address: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Emergency Contact *</label>
                  <input
                    value={empForm.emergencyContact}
                    onChange={(e) => setEmpForm((p) => ({ ...p, emergencyContact: e.target.value }))}
                    placeholder="Name & Phone Number"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Assignment & Job Responsibilities */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                2. Department, Project Assignment & Role
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Work Location Type</label>
                  <select
                    value={empForm.workLocationType}
                    onChange={(e) =>
                      setEmpForm((p) => ({
                        ...p,
                        workLocationType: e.target.value as "Head Office" | "Construction Site",
                        assignedProject:
                          e.target.value === "Head Office"
                            ? "Head Office"
                            : p.assignedProject === "Head Office"
                            ? projectNames[0] || "Bole Tower"
                            : p.assignedProject,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Construction Site">Construction Site</option>
                    <option value="Head Office">Head Office</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Assigned Project / Site</label>
                  <select
                    value={empForm.assignedProject}
                    onChange={(e) =>
                      setEmpForm((p) => ({
                        ...p,
                        assignedProject: e.target.value,
                        workLocationType: e.target.value.toLowerCase().includes("head office")
                          ? "Head Office"
                          : p.workLocationType,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Head Office">Head Office</option>
                    {projectNames.map((pr) => (
                      <option key={pr} value={pr}>{pr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Department *</label>
                  <input
                    value={empForm.department}
                    onChange={(e) => setEmpForm((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Job Position *</label>
                  <input
                    value={empForm.position}
                    onChange={(e) => setEmpForm((p) => ({ ...p, position: e.target.value, trade: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Employment Type *</label>
                  <select
                    value={empForm.employmentType}
                    onChange={(e) => setEmpForm((p) => ({ ...p, employmentType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Permanent">Permanent</option>
                    <option value="Contract">Contract</option>
                    <option value="Daily Labourer">Daily Labourer</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Employment Start Date *</label>
                  <input
                    type="date"
                    value={empForm.joinedDate}
                    onChange={(e) => setEmpForm((p) => ({ ...p, joinedDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[11px] text-slate-400">Job Responsibilities</label>
                  <textarea
                    rows={2}
                    value={empForm.jobResponsibilities}
                    onChange={(e) => setEmpForm((p) => ({ ...p, jobResponsibilities: e.target.value }))}
                    placeholder="Primary role duties, site supervision/deliverables, reporting line..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Qualifications, Experience, Skills & Certifications */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                3. Education, Work Experience, Skills & Certifications
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Education & Qualifications</label>
                  <input
                    value={empForm.qualifications}
                    onChange={(e) => setEmpForm((p) => ({ ...p, qualifications: e.target.value }))}
                    placeholder="e.g. BSc Civil Engineering / TVET III"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Work Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={empForm.experienceYears}
                    onChange={(e) => setEmpForm((p) => ({ ...p, experienceYears: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Work Experience Summary</label>
                  <input
                    value={empForm.experienceSummary}
                    onChange={(e) => setEmpForm((p) => ({ ...p, experienceSummary: e.target.value }))}
                    placeholder="Prior projects, roles held..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400">Technical & Field Skills</label>
                  <input
                    value={empForm.skills}
                    onChange={(e) => setEmpForm((p) => ({ ...p, skills: e.target.value }))}
                    placeholder="AutoCAD, Bar Bending, Rebar Detailing, Safety Supervision..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Certifications & Licenses</label>
                  <input
                    value={empForm.certifications}
                    onChange={(e) => setEmpForm((p) => ({ ...p, certifications: e.target.value }))}
                    placeholder="COC Level III, HSE Cert..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Compensation, Salary Grade & Allowances */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                4. Salary Grade, Basic Salary & Allowances (ETB)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Salary Structure Preset</label>
                  <select
                    value={empForm.salaryStructureId}
                    onChange={(e) => {
                      const st = salaryStructures.find((s) => s.id === e.target.value);
                      setEmpForm((p) => ({
                        ...p,
                        salaryStructureId: e.target.value,
                        salaryGrade: st ? st.jobGrade : p.salaryGrade,
                        basicMonthlySalary: st ? st.basicSalary : p.basicMonthlySalary,
                        housingAllowance: st ? st.housingAllowance : p.housingAllowance,
                        transportAllowance: st ? st.transportAllowance : p.transportAllowance,
                        positionAllowance: st ? st.positionAllowance : p.positionAllowance,
                        medicalAllowance: st ? st.medicalAllowance : p.medicalAllowance,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="">Custom / Manual Entry</option>
                    {salaryStructures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.structureCode} ({s.jobGrade}) — ETB {fmtMoney(s.basicSalary)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Salary Grade</label>
                  <input
                    value={empForm.salaryGrade}
                    onChange={(e) => setEmpForm((p) => ({ ...p, salaryGrade: e.target.value }))}
                    placeholder="e.g. Grade V"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Basic Monthly Salary (ETB) *</label>
                  <input
                    type="number"
                    min={0}
                    value={empForm.basicMonthlySalary}
                    onChange={(e) => setEmpForm((p) => ({ ...p, basicMonthlySalary: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Housing Allowance (ETB)</label>
                  <input
                    type="number"
                    min={0}
                    value={empForm.housingAllowance}
                    onChange={(e) => setEmpForm((p) => ({ ...p, housingAllowance: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Transport Allowance (ETB)</label>
                  <input
                    type="number"
                    min={0}
                    value={empForm.transportAllowance}
                    onChange={(e) => setEmpForm((p) => ({ ...p, transportAllowance: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Position & Medical Allowances (ETB)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      title="Position Allowance"
                      placeholder="Position"
                      value={empForm.positionAllowance}
                      onChange={(e) => setEmpForm((p) => ({ ...p, positionAllowance: Number(e.target.value) }))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      title="Medical Allowance"
                      placeholder="Medical"
                      value={empForm.medicalAllowance}
                      onChange={(e) => setEmpForm((p) => ({ ...p, medicalAllowance: Number(e.target.value) }))}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Identification, Bank & Compliance */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                5. Identification, Bank Details & Biometric Status
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Fayda ID (Digital ID)</label>
                  <input
                    value={empForm.faydaId}
                    onChange={(e) => setEmpForm((p) => ({ ...p, faydaId: e.target.value }))}
                    placeholder="FIN-XXXX-XXXX-XXXX"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">National / Kebele ID</label>
                  <input
                    value={empForm.nationalId}
                    onChange={(e) => setEmpForm((p) => ({ ...p, nationalId: e.target.value }))}
                    placeholder="National / Kebele ID No."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Bank Name</label>
                  <input
                    value={empForm.bankName}
                    onChange={(e) => setEmpForm((p) => ({ ...p, bankName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Bank Account Number</label>
                  <input
                    value={empForm.bankAccountNumber}
                    onChange={(e) => setEmpForm((p) => ({ ...p, bankAccountNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Mobile Money Provider</label>
                  <select
                    value={empForm.mobileMoneyType}
                    onChange={(e) => setEmpForm((p) => ({ ...p, mobileMoneyType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE Birr">CBE Birr</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Amole">Amole</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Mobile Money Number</label>
                  <input
                    value={empForm.mobileMoneyNumber}
                    onChange={(e) => setEmpForm((p) => ({ ...p, mobileMoneyNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400">
                    Self-Service Portal User UID (optional — links Employee login account)
                  </label>
                  <input
                    value={empForm.userId}
                    onChange={(e) => setEmpForm((p) => ({ ...p, userId: e.target.value }))}
                    placeholder="Firebase Auth UID (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                    Biometric:{" "}
                    <strong className="text-purple-300">
                      {editingWorkerId
                        ? workers.find((w) => w.id === editingWorkerId)?.biometricEnrollmentStatus || "Not Registered"
                        : "Not Registered (Enroll after saving)"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Upload Photograph {uploadingPhoto && "(Uploading...)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                  className="text-xs text-slate-300"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400">
                    Upload Document ({empForm.documents.length} attached)
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as any)}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] text-white"
                  >
                    <option value="Contract">Contract</option>
                    <option value="ID / Fayda">ID / Fayda</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Medical">Medical</option>
                    <option value="Clearance">Clearance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <input
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleDocUpload(e.target.files[0], docCategory)}
                  className="text-xs text-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEmpModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !editingWorkerId &&
                  Boolean(onboardingFromRec && getRecruitmentFillStatus(onboardingFromRec).remainingVacancies <= 0)
                }
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer"
              >
                {editingWorkerId ? "Update Employee Profile" : "Register Employee Atomically"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: BANK DISBURSEMENT & GL SYNC
         ============================================================ */}
      {disburseModalRun && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleDisbursePayroll}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-white">
              Disburse Verified Payroll — {disburseModalRun.runNo}
            </h3>
            <p className="text-xs text-slate-400">
              Net Salary Payable: <strong className="text-emerald-400 font-mono">ETB {fmtMoney(disburseModalRun.totalNetPay)}</strong>.
              Confirming will deduct bank balance, create Part 8 General Ledger double-entry voucher, record Project Labor Costs, generate Employee Payslips, and deduct active loan installments.
            </p>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Disbursement Bank Account</label>
              <select
                value={disburseBankId}
                onChange={(e) => setDisburseBankId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                {bankAccounts.length === 0 ? (
                  <option value="">Default Construction Bank Account</option>
                ) : (
                  bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} ({b.bankName || b.accountType}) — ETB {fmtMoney(b.currentBalance)}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Bank Payment Reference No *</label>
              <input
                value={disburseRefNo}
                onChange={(e) => setDisburseRefNo(e.target.value)}
                placeholder={`CBE-${disburseModalRun.runNo}`}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Payment Date</label>
              <input
                type="date"
                value={disburseDate}
                onChange={(e) => setDisburseDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDisburseModalRun(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm & Post to Finance + GL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: ADJUST PAYROLL LINE BONUS & OTHER DEDUCTIONS
         ============================================================ */}
      {adjustLineTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLineAdjustment}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-white">
              Adjust Bonus / Other Deductions
            </h3>
            <div className="text-xs text-slate-400">
              Employee: <strong className="text-white">{adjustLineTarget.workerName}</strong>. Income tax & net pay will be recalculated automatically using the active Ethiopian progressive brackets.
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Bonus / Commission (ETB)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={adjustLineTarget.bonuses}
                onChange={(e) =>
                  setAdjustLineTarget((p) => (p ? { ...p, bonuses: Number(e.target.value) } : null))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Other Deductions (ETB)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={adjustLineTarget.otherDeductions}
                onChange={(e) =>
                  setAdjustLineTarget((p) => (p ? { ...p, otherDeductions: Number(e.target.value) } : null))
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustLineTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                Recalculate & Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: IN-APP OFFICIAL EMPLOYEE PAYSLIP VIEWER & PDF
         ============================================================ */}
      {payslipModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider font-bold text-red-400">
                  OVID Real Estate — Digital Construction ERP
                </div>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  {isAmharic
                    ? `ኦፊሴላዊ የሠራተኛ ደመወዝ ደረሰኝ (${payslipModalData.run.payPeriod})`
                    : `Official Employee Payslip (${payslipModalData.run.payPeriod})`}
                </h3>
                <div className="text-xs text-slate-400 mt-1">
                  {isAmharic ? "ዙር" : "Run"}: <span className="font-mono text-white">{payslipModalData.run.runNo}</span> ·{" "}
                  {isAmharic ? "ማጣቀሻ" : "Ref"}:{" "}
                  <span className="font-mono text-emerald-400">
                    {payslipModalData.run.paymentReferenceNo || payslipModalData.run.workflowStage}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayslipModalData(null)}
                className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                {isAmharic ? "ዝጋ" : "Close"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div>
                <div className="text-slate-400">{isAmharic ? "የሠራተኛ ስም" : "Employee Name"}</div>
                <div className="font-bold text-white">{payslipModalData.item.workerName}</div>
              </div>
              <div>
                <div className="text-slate-400">{isAmharic ? "የሠራተኛ መለያ ቁጥር" : "Employee ID"}</div>
                <div className="font-mono font-bold text-white">{payslipModalData.item.employeeId}</div>
              </div>
              <div>
                <div className="text-slate-400">{isAmharic ? "ፕሮጀክት እና ክፍል" : "Project & Department"}</div>
                <div className="text-slate-200">{payslipModalData.item.project} · {payslipModalData.item.department}</div>
              </div>
              <div>
                <div className="text-slate-400">{isAmharic ? "የባንክ ሂሳብ" : "Bank Account"}</div>
                <div className="font-mono text-slate-200">
                  {payslipModalData.item.bankName} ({buildMaskedPreview(payslipModalData.item.bankAccountNumber) || payslipModalData.item.bankAccountNumber})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-extrabold text-emerald-400 uppercase text-[11px]">
                  {isAmharic ? "ገቢዎች (ETB)" : "Earnings (ETB)"}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "መሰረታዊ ደመወዝ" : "Basic Salary"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "አበሎች" : "Allowances"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.allowances)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {isAmharic
                      ? `የትርፍ ሰዓት ክፍያ (${payslipModalData.item.approvedOvertimeHours} ሰ)`
                      : `Overtime Pay (${payslipModalData.item.approvedOvertimeHours}h)`}
                  </span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.overtimePay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "ቦነስ" : "Bonuses"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.bonuses)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                  <span className="text-white">{isAmharic ? "ጠቅላላ ገቢ" : "Gross Earnings"}</span>
                  <span className="font-mono text-emerald-400">{fmtMoney(payslipModalData.item.grossEarnings)}</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-extrabold text-amber-400 uppercase text-[11px]">
                  {isAmharic ? "ተቀናሾች (ETB)" : "Deductions (ETB)"}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "የኢትዮጵያ የገቢ ግብር" : "Ethiopian Income Tax"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.incomeTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "የሠራተኛ ጡረታ (7%)" : "Employee Pension (7%)"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.employeePension)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "ቅድሚያ ክፍያ / ብድር ተቀናሽ" : "Advance / Loan Recovery"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.advanceLoanDeduction)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAmharic ? "ሌሎች ተቀናሾች" : "Other Deductions"}</span>
                  <span className="font-mono text-white">{fmtMoney(payslipModalData.item.otherDeductions)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                  <span className="text-white">{isAmharic ? "ጠቅላላ ተቀናሽ" : "Total Deductions"}</span>
                  <span className="font-mono text-rose-400">{fmtMoney(payslipModalData.item.totalDeductions)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase text-emerald-300 font-bold">
                  {isAmharic ? "የተጣራ የተከፈለ ደመወዝ" : "Net Payable Disbursed"}
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ETB {fmtMoney(payslipModalData.item.netPay)}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>
                  {isAmharic ? "የአሠሪ ጡረታ (11%)" : "Employer Pension (11%)"}:{" "}
                  <span className="font-mono text-white">ETB {fmtMoney(payslipModalData.item.employerPension)}</span>
                </div>
                <div>
                  {isAmharic ? "የGL መዝገብ" : "GL Journal"}:{" "}
                  <span className="font-mono text-white">
                    {payslipModalData.run.glJournalId || (isAmharic ? "ክፍያ በመጠባበቅ ላይ" : "Pending Disbursement")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => downloadHrmPayslipPdf({ run: payslipModalData.run, item: payslipModalData.item })}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>{isAmharic ? "ኦፊሴላዊ PDF አውርድ" : "Download Official PDF"}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>{isAmharic ? "አትም" : "Print"}</span>
              </button>
              <button
                type="button"
                onClick={() => setPayslipModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                {isAmharic ? "ዝጋ" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB: EMPLOYEE BIOMETRIC MAPPING MODULE
         ============================================================ */}
      {activeTab === "biometric-mapping" && (
        <EmployeeBiometricMappingModule
          isAmharic={isAmharic}
          currentUserRole={currentUserRole}
          currentUserProfile={currentUserProfile}
          workers={workers}
          attendance={attendance}
          workSchedules={workSchedules}
          projectNames={projectNames}
          onAddAttendance={onAddAttendance}
          onUpdateWorker={onUpdateWorker}
          onLogAction={onLogAction}
        />
      )}

      {/* ============================================================
          MODAL: EMPLOYEE PROFILE & INTEGRATED BIOMETRIC ENROLLMENT
         ============================================================ */}
      {viewingBioProfileWorker && viewingBioProfileState && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                {viewingBioProfileWorker.photo ? (
                  <img
                    src={viewingBioProfileWorker.photo}
                    alt={viewingBioProfileWorker.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                    {viewingBioProfileWorker.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Employee Profile &amp; Biometric Enrollment — {viewingBioProfileWorker.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Employee ID:{" "}
                    <strong className="font-mono text-emerald-400">
                      {viewingBioProfileState.employeeId}
                    </strong>{" "}
                    · {viewingBioProfileWorker.department} ·{" "}
                    {viewingBioProfileWorker.position || viewingBioProfileWorker.trade} ·{" "}
                    {viewingBioProfileWorker.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBioProfileWorkerId(null)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 4-Stage Workflow Stepper */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                Integrated Biometric Registration Workflow
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                {(
                  [
                    { idx: 1, title: "1. Employee Registration", sub: viewingBioProfileState.employeeId },
                    {
                      idx: 2,
                      title: "2. Biometric Enrollment",
                      sub: viewingBioProfileState.deviceUserId
                        ? `Device BioID ${viewingBioProfileState.deviceUserId}`
                        : "Enroll on terminal",
                    },
                    {
                      idx: 3,
                      title: "3. Employee Biometric Mapping",
                      sub: `Mapping: ${viewingBioProfileState.mappingStatus}`,
                    },
                    {
                      idx: 4,
                      title: "4. Attendance Activation",
                      sub: viewingBioProfileState.attendanceActivated
                        ? "Active & Verified"
                        : "Requires Mapping + Device Verify",
                    },
                  ] as const
                ).map((step) => {
                  const completed =
                    step.idx < viewingBioProfileState.stageIndex ||
                    (step.idx === 4 && viewingBioProfileState.enrollmentStatus === "Active");
                  const current = step.idx === viewingBioProfileState.stageIndex;
                  return (
                    <div
                      key={step.idx}
                      className={`p-3 rounded-xl border ${
                        completed
                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                          : current
                          ? "bg-blue-950/40 border-blue-500/40 text-blue-200"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="font-extrabold">{step.title}</div>
                      <div className="text-[11px] font-mono mt-0.5 truncate">{step.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Required 7-Field Biometric Enrollment Section Summary */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Fingerprint size={14} />
                  <span>Biometric Enrollment Profile Section (Zero Raw Templates Stored)</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
                  {viewingBioProfileState.deviceVerified
                    ? "Linked Device Verified"
                    : "Device Verification Pending"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Enrollment Status</div>
                  <div className="font-extrabold text-white mt-0.5">
                    {viewingBioProfileState.enrollmentStatus}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Biometric Device</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {viewingBioProfileState.biometricDeviceName
                      ? `${viewingBioProfileState.biometricDeviceName} (${viewingBioProfileState.biometricDeviceModel})`
                      : "Not Assigned"}
                  </div>
                  {viewingBioProfileState.biometricDeviceSerialNumber && (
                    <div className="text-[10px] font-mono text-slate-500">
                      S/N: {viewingBioProfileState.biometricDeviceSerialNumber}
                    </div>
                  )}
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Device User ID</div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {viewingBioProfileState.deviceUserId || "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Mapping Status</div>
                  <div className="font-bold text-cyan-300 mt-0.5">
                    {viewingBioProfileState.mappingStatus}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Work Location</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {viewingBioProfileState.workLocationType}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Project / Site</div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {viewingBioProfileState.projectSite}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Enrollment Date</div>
                  <div className="font-mono text-slate-200 mt-0.5">
                    {viewingBioProfileState.enrollmentDate || "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] uppercase text-slate-500">Attendance Activation</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {viewingBioProfileState.attendanceActivated
                      ? "Active"
                      : "Pending Verification / Mapping"}
                  </div>
                </div>
              </div>
            </div>

            {/* HR Department ONLY Enrollment & Mapping Controls */}
            {perms.canManageBiometricEnrollment ? (
              <div className="space-y-4">
                <form
                  onSubmit={handleStage2DeviceEnroll}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-blue-300">
                      HR Department Actions — Stage 2 (Biometric Enrollment) &amp; Stage 3 (Mapping)
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Authorized HR Personnel Only
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Registered Biometric Device *
                      </label>
                      <select
                        required
                        value={bioEnrollForm.deviceId}
                        onChange={(e) => {
                          const dev = biometricDevices.find((d) => d.id === e.target.value);
                          setBioEnrollForm((p) => ({
                            ...p,
                            deviceId: e.target.value,
                            workLocationType: dev?.workLocationType || p.workLocationType,
                            projectSite: dev?.projectName || p.projectSite,
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="">-- Select Biometric Device --</option>
                        {biometricDevices
                          .filter((d) => d.status === "Active")
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.deviceName} ({d.model} · S/N: {d.serialNumber}){" "}
                              {isDeviceVerifiedForBiometricAttendance(d) ? "[Verified]" : "[Unverified]"}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Device User ID (Biometric User ID) *
                      </label>
                      <input
                        required
                        value={bioEnrollForm.biometricUserId}
                        onChange={(e) =>
                          setBioEnrollForm((p) => ({ ...p, biometricUserId: e.target.value }))
                        }
                        placeholder="e.g. 1042"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Enrollment Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bioEnrollForm.enrollmentDate}
                        onChange={(e) =>
                          setBioEnrollForm((p) => ({ ...p, enrollmentDate: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Work Location *
                      </label>
                      <select
                        value={bioEnrollForm.workLocationType}
                        onChange={(e) =>
                          setBioEnrollForm((p) => ({
                            ...p,
                            workLocationType: e.target.value as "Head Office" | "Construction Site",
                            projectSite:
                              e.target.value === "Head Office"
                                ? "Head Office"
                                : projectNames[0] || "Bole Tower",
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="Head Office">Head Office</option>
                        <option value="Construction Site">Construction Site</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Project / Site *
                      </label>
                      <select
                        value={bioEnrollForm.projectSite}
                        onChange={(e) =>
                          setBioEnrollForm((p) => ({ ...p, projectSite: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        {Array.from(new Set(["Head Office", ...projectNames])).map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={bioEnrollForm.markMappingPending}
                          onChange={(e) =>
                            setBioEnrollForm((p) => ({
                              ...p,
                              markMappingPending: e.target.checked,
                            }))
                          }
                        />
                        <span>Mark Mapping Pending</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Enrollment / Mapping Notes
                    </label>
                    <input
                      value={bioEnrollForm.notes}
                      onChange={(e) => setBioEnrollForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Physical terminal ID verification notes (no raw templates stored)..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={bioProfileBusy}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Stage 2: Save Device Enrollment
                      </button>
                      <button
                        type="button"
                        disabled={bioProfileBusy || !bioEnrollForm.deviceId || !bioEnrollForm.biometricUserId.trim()}
                        onClick={handleStage3CompleteMapping}
                        className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Stage 3: Complete Biometric Mapping
                      </button>
                      <button
                        type="button"
                        disabled={
                          bioProfileBusy ||
                          !viewingBioProfileState.activeMapping ||
                          !viewingBioProfileState.deviceVerified
                        }
                        title={
                          !viewingBioProfileState.activeMapping
                            ? "Complete Stage 3 Employee Biometric Mapping first"
                            : !viewingBioProfileState.deviceVerified
                            ? "Linked biometric device must pass ADMS/connector verification first"
                            : "Activate Biometric Attendance"
                        }
                        onClick={handleStage4ActivateAttendance}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Stage 4: Activate Attendance
                      </button>
                    </div>
                  </div>

                  {!viewingBioProfileState.deviceVerified && (
                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
                      <strong>Attendance Activation Gate:</strong> Biometric attendance cannot be activated until BOTH an Active Employee Biometric Mapping exists AND the linked ZKTeco device passes connection/handshake verification.
                    </div>
                  )}
                </form>

                {perms.isHrManager && (
                  <div className="bg-slate-900/40 border border-red-500/20 rounded-xl p-3.5 flex flex-wrap items-center gap-2">
                    <input
                      value={bioSuspendReason}
                      onChange={(e) => setBioSuspendReason(e.target.value)}
                      placeholder="Mandatory reason to suspend enrollment & deactivate mapping..."
                      className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={bioProfileBusy || !bioSuspendReason.trim()}
                      onClick={handleSuspendBiometricEnrollment}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40"
                    >
                      Suspend Enrollment
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2.5">
                <Lock size={15} className="text-amber-400 shrink-0" />
                <span>
                  <strong>HR Department Only:</strong> Site Managers and other departments have view-only access and cannot perform biometric enrollment or manage employee biometric mappings.
                </span>
              </div>
            )}

            {/* Employee Biometric Audit History */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                <History size={14} className="text-blue-400" />
                <span>Immutable Biometric Enrollment &amp; Mapping History</span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-2">
                {biometricMappingAuditLogs
                  .filter(
                    (l) =>
                      l.employeeId === viewingBioProfileState.employeeId ||
                      l.employeeId === viewingBioProfileWorker.id
                  )
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] flex flex-wrap justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-emerald-400">{log.action}</span> ·{" "}
                        <span className="text-slate-300">{log.deviceName || log.deviceId}</span> ·{" "}
                        <span className="font-mono text-white">BioID {log.biometricUserId}</span>
                        {log.reason && (
                          <div className="text-slate-400 mt-0.5">{log.reason}</div>
                        )}
                      </div>
                      <div className="text-right text-slate-500 font-mono">
                        <div>{log.actorName} ({log.actorRole})</div>
                        <div>{formatAddisAbabaDateTime(log.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                {biometricMappingAuditLogs.filter(
                  (l) =>
                    l.employeeId === viewingBioProfileState.employeeId ||
                    l.employeeId === viewingBioProfileWorker.id
                ).length === 0 && (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    No biometric enrollment or mapping events recorded yet for this employee.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: RECRUITMENT STAGE DECISION (APPROVE / RETURN / REJECT)
         ============================================================ */}
      {recDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitRecruitmentDecision}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {recDecisionModal.decision === "Approved"
                    ? `Approve Stage — ${recDecisionModal.req.requestNo}`
                    : recDecisionModal.decision === "Returned"
                    ? `Return for Correction — ${recDecisionModal.req.requestNo}`
                    : `Reject Recruitment Request — ${recDecisionModal.req.requestNo}`}
                </h3>
                <div className="text-xs text-slate-300 mt-1">
                  Stage: <strong className="text-blue-300">{recDecisionModal.req.workflowStage}</strong> · Position:{" "}
                  <strong>{recDecisionModal.req.requestedCount}x {recDecisionModal.req.jobPosition}</strong> ({recDecisionModal.req.project} / {recDecisionModal.req.department})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecDecisionModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Full Manpower Request Review Snapshot before Decision (Mandatory for Director & Reviewers) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Employment Type / Expected Date:</span>
                <div className="text-slate-200 font-semibold">
                  {recDecisionModal.req.employmentType} · {recDecisionModal.req.requiredByDate}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Proposed Monthly Salary:</span>
                <div className="text-emerald-400 font-mono font-bold">
                  ETB {fmtMoney(recDecisionModal.req.proposedMonthlySalary)}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Job Responsibilities:</span>
                <div className="text-slate-200">{recDecisionModal.req.jobResponsibilities || "—"}</div>
              </div>
              <div>
                <span className="text-slate-500">Qualifications & Experience:</span>
                <div className="text-slate-200">
                  {recDecisionModal.req.qualificationsRequired} ({recDecisionModal.req.experienceRequired || "Standard"})
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">Reason for Recruitment:</span>
                <div className="text-slate-200">{recDecisionModal.req.justification}</div>
              </div>
            </div>

            {recDecisionModal.req.supportingDocuments && recDecisionModal.req.supportingDocuments.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300">
                  Supporting Documents ({recDecisionModal.req.supportingDocuments.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {recDecisionModal.req.supportingDocuments.map((d) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-blue-300 hover:underline flex items-center gap-1.5"
                    >
                      <FileText size={12} />
                      <span>{d.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {recDecisionModal.req.approvalHistory && recDecisionModal.req.approvalHistory.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300">
                  Previous Department Approvals & Reviewer Comments ({recDecisionModal.req.approvalHistory.length})
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {recDecisionModal.req.approvalHistory.map((h, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex flex-wrap justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-white">{h.stage}</span> —{" "}
                        <span
                          className={
                            h.decision === "Rejected"
                              ? "text-red-400 font-bold"
                              : h.decision === "Returned"
                              ? "text-amber-300 font-bold"
                              : "text-emerald-400 font-bold"
                          }
                        >
                          {h.decision}
                        </span>
                        <div className="text-slate-400">
                          {h.actorName} ({h.actorRole}){h.notes ? ` — "${h.notes}"` : ""}
                        </div>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">{h.timestamp.slice(0, 16).replace("T", " ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {recDecisionModal.decision === "Approved"
                  ? "Verification Comments (optional)"
                  : recDecisionModal.decision === "Returned"
                  ? "Correction Instructions Required *"
                  : "Rejection Reason Required *"}
              </label>
              <textarea
                rows={3}
                required={recDecisionModal.decision !== "Approved"}
                value={recDecisionNotes}
                onChange={(e) => setRecDecisionNotes(e.target.value)}
                placeholder={
                  recDecisionModal.decision === "Approved"
                    ? "Verification notes, budget confirmation, or operational remarks..."
                    : "Enter specific reason or required corrections..."
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecDecisionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  recDecisionModal.decision === "Approved"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : recDecisionModal.decision === "Returned"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                Confirm {recDecisionModal.decision}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: RECRUITMENT DETAILS, SUPPORTING DOCS & AUDIT TRAIL
         ============================================================ */}
      {viewingRecAudit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {viewingRecAudit.requestNo} — Full Audit History & Supporting Reviews
                </h3>
                <p className="text-xs text-slate-400">
                  {viewingRecAudit.requestedCount}x {viewingRecAudit.jobPosition} · {viewingRecAudit.project} / {viewingRecAudit.department}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecAudit(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500">Responsibilities:</span>
                <div className="text-slate-200">{viewingRecAudit.jobResponsibilities || "—"}</div>
              </div>
              <div>
                <span className="text-slate-500">Qualifications & Experience:</span>
                <div className="text-slate-200">
                  {viewingRecAudit.qualificationsRequired} ({viewingRecAudit.experienceRequired || "Standard"})
                </div>
              </div>
              <div>
                <span className="text-slate-500">Reason for Recruitment:</span>
                <div className="text-slate-200">{viewingRecAudit.justification}</div>
              </div>
              <div>
                <span className="text-slate-500">Proposed Salary / Expected Date:</span>
                <div className="text-emerald-400 font-mono">
                  ETB {fmtMoney(viewingRecAudit.proposedMonthlySalary)} · {viewingRecAudit.requiredByDate}
                </div>
              </div>
            </div>
            {viewingRecAudit.supportingDocuments && viewingRecAudit.supportingDocuments.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-300">Supporting Documents</div>
                <div className="flex flex-wrap gap-2">
                  {viewingRecAudit.supportingDocuments.map((d) => (
                    <a
                      key={d.id}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-blue-300 hover:underline flex items-center gap-1.5"
                    >
                      <FileText size={13} />
                      <span>{d.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-bold text-slate-300">Approval & Audit Trail</div>
              {(viewingRecAudit.approvalHistory || []).map((h, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex flex-wrap justify-between gap-2">
                  <div>
                    <span className="font-bold text-white">{h.stage}</span> —{" "}
                    <span
                      className={
                        h.decision === "Rejected"
                          ? "text-red-400 font-bold"
                          : h.decision === "Returned"
                          ? "text-amber-300 font-bold"
                          : "text-emerald-400 font-bold"
                      }
                    >
                      {h.decision}
                    </span>
                    <div className="text-slate-400">
                      {h.actorName} ({h.actorRole}) {h.notes ? `— ${h.notes}` : ""}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">{h.timestamp}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: SECTION HEAD EDIT & RESUBMIT RETURNED REQUEST
         ============================================================ */}
      {resubmittingRec && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleResubmitRecruitment}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-extrabold text-white">
                Revise & Resubmit Request — {resubmittingRec.requestNo}
              </h3>
              <button
                type="button"
                onClick={() => setResubmittingRec(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200">
              Returned by {resubmittingRec.returnedBy} ({resubmittingRec.returnedAtStage}):{" "}
              {resubmittingRec.correctionNotes}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Project *</label>
                <select
                  value={resubmitForm.project}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, project: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {projectNames.map((pr) => (
                    <option key={pr} value={pr}>{pr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Department *</label>
                <input
                  required
                  value={resubmitForm.department}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Job Position *</label>
                <input
                  required
                  value={resubmitForm.jobPosition}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, jobPosition: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Requested Count *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={resubmitForm.requestedCount}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, requestedCount: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Employment Type</label>
                <select
                  value={resubmitForm.employmentType}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, employmentType: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Daily Labourer">Daily Labourer</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Urgency</label>
                <select
                  value={resubmitForm.urgency}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, urgency: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Proposed Salary (ETB)</label>
                <input
                  type="number"
                  min={0}
                  value={resubmitForm.proposedMonthlySalary}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, proposedMonthlySalary: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Expected Date</label>
                <input
                  type="date"
                  value={resubmitForm.requiredByDate}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, requiredByDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Required Experience</label>
                <input
                  value={resubmitForm.experienceRequired}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, experienceRequired: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Job Responsibilities *</label>
                <textarea
                  rows={2}
                  required
                  value={resubmitForm.jobResponsibilities}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, jobResponsibilities: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Required Qualifications</label>
                <textarea
                  rows={2}
                  value={resubmitForm.qualificationsRequired}
                  onChange={(e) => setResubmitForm((p) => ({ ...p, qualificationsRequired: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Justification *</label>
              <input
                required
                value={resubmitForm.justification}
                onChange={(e) => setResubmitForm((p) => ({ ...p, justification: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] text-slate-400">
                Supporting Documents ({resubmitForm.supportingDocuments.length} attached) {uploadingRecDoc && "(Uploading...)"}
              </label>
              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && handleUploadResubmitDocument(e.target.files[0])}
                className="w-full text-xs text-slate-300"
              />
              {resubmitForm.supportingDocuments.length > 0 && (
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {resubmitForm.supportingDocuments.map((docItem) => (
                    <span
                      key={docItem.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5"
                    >
                      <FileText size={12} className="text-blue-400" />
                      <a href={docItem.url} target="_blank" rel="noreferrer" className="hover:underline text-blue-300">
                        {docItem.name}
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setResubmitForm((p) => ({
                            ...p,
                            supportingDocuments: p.supportingDocuments.filter((d) => d.id !== docItem.id),
                          }))
                        }
                        className="text-slate-400 hover:text-red-400 cursor-pointer ml-1"
                        title="Remove document"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Resubmission Notes</label>
              <input
                value={resubmitForm.notes}
                onChange={(e) => setResubmitForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Summary of changes made..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResubmittingRec(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
              >
                Resubmit to HR Manager
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: ATTENDANCE APPROVAL / RETURN / DISCREPANCY ACTION
         ============================================================ */}
      {attActionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitAttendanceActionModal}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-white">
              {attActionModal.mode} — {attActionModal.record.workerName}
            </h3>
            <div className="text-xs text-slate-400">
              Date: <strong className="font-mono text-white">{attActionModal.record.date}</strong> · Current Approval Status:{" "}
              <strong className="text-amber-300">{attActionModal.record.finalApprovalStatus || "Pending"}</strong>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Comments / Audit Justification{" "}
                {attActionModal.mode === "Reject" ||
                attActionModal.mode === "Return for Correction" ||
                attActionModal.mode === "Report Discrepancy"
                  ? "(Required *)"
                  : "(Optional)"}
              </label>
              <textarea
                rows={3}
                required={
                  attActionModal.mode === "Reject" ||
                  attActionModal.mode === "Return for Correction" ||
                  attActionModal.mode === "Report Discrepancy"
                }
                value={attActionComments}
                onChange={(e) => setAttActionComments(e.target.value)}
                placeholder="Enter verification comments, discrepancy details, or correction notes..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttActionModal(null);
                  setAttActionComments("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                  attActionModal.mode === "Final Approve"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : attActionModal.mode === "Reject"
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                Confirm {attActionModal.mode}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: EXCESS RECRUITMENT ADDITIONAL APPROVAL REQUEST (HR -> DIRECTOR)
         ============================================================ */}
      {excessModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitExcessRecruitment}
            className="bg-slate-950 border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-rose-300 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  <span>Excess Recruitment Alert — Additional Director Approval</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Requisition <strong className="font-mono text-white">{excessModalReq.requestNo}</strong> ({excessModalReq.jobPosition} · {excessModalReq.project})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExcessModalReq(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
              Director-approved quantity (<strong>{excessModalReq.requestedCount}</strong>) is already filled ({excessModalReq.hiredCount || 0}/{excessModalReq.requestedCount}). Normal registration is blocked. Submitting this request alerts the Director immediately.
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Additional Excess Employees Requested *</label>
              <input
                type="number"
                min={1}
                required
                value={excessCountInput}
                onChange={(e) => setExcessCountInput(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Operational Justification *</label>
              <textarea
                rows={3}
                required
                maxLength={1000}
                value={excessJustificationInput}
                onChange={(e) => setExcessJustificationInput(e.target.value)}
                placeholder="Explain urgent site need or revised manpower plan..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExcessModalReq(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={excessBusy}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-bold text-white cursor-pointer"
              >
                {excessBusy ? "Sending..." : "Submit Excess Request to Director"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================
          MODAL: DIRECTOR EXCESS RECRUITMENT DECISION
         ============================================================ */}
      {excessDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitExcessDecision}
            className="bg-slate-950 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-base font-extrabold text-white">
              {excessDecisionModal.decision === "Approved" ? "Approve Excess Recruitment" : "Reject Excess Recruitment"} — {excessDecisionModal.excess.requestNo}
            </h3>
            <div className="text-xs text-slate-300 space-y-1">
              <div>
                Parent Request: <strong className="font-mono text-white">{excessDecisionModal.excess.recruitmentRequestNo}</strong>
              </div>
              <div>
                Role / Project: <strong>{excessDecisionModal.excess.jobPosition}</strong> ({excessDecisionModal.excess.project})
              </div>
              <div>
                Requested Excess Qty: <strong className="text-rose-300">+{excessDecisionModal.excess.excessCount}</strong> (Current Approved: {excessDecisionModal.excess.approvedQuantitySnapshot})
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 mt-2">
                Justification: {excessDecisionModal.excess.justification}
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Director Decision Comments {excessDecisionModal.decision === "Rejected" ? "(Required *)" : "(Optional)"}
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                required={excessDecisionModal.decision === "Rejected"}
                value={excessDecisionNotes}
                onChange={(e) => setExcessDecisionNotes(e.target.value)}
                placeholder="Enter executive approval or rejection reason..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExcessDecisionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={excessBusy}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50 ${
                  excessDecisionModal.decision === "Approved"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {excessBusy ? "Saving..." : `Confirm ${excessDecisionModal.decision}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
