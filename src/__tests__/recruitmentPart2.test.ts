import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceRecruitmentApproval,
  buildRecruitmentByProjectAndDepartmentReport,
  checkDuplicateEmployeeRegistration,
  computeHrmDashboardState,
  decideExcessRecruitmentRequest,
  generateNextEmployeeId,
  generateNextExcessRecruitmentRequestNo,
  getRecruitmentFillStatus,
  HrmRoutingUser,
  normalizePhoneForDuplicateCheck,
  recordExcessRegistrationAttemptAlert,
  registerApprovedEmployeeFromRecruitment,
  submitExcessRecruitmentRequest,
  submitRecruitmentRequestWithManpowerCheck,
  validateEmployeeRegistrationAuthorization,
} from "../services/hrmService";
import { Dashboard } from "../components/Dashboard";
import { DbService } from "../services/db";
import {
  AuditLog,
  ErpTask,
  ExcessRecruitmentRequestRecord,
  HrmPrivateProfileRecord,
  ManpowerPlanRecord,
  RecruitmentRequestRecord,
  UserRole,
  Worker,
} from "../types";
import { encryptSensitiveText, hashSensitiveIdentifier } from "../utils/cryptoPii";

let memRecruitments: RecruitmentRequestRecord[] = [];
let memExcessRequests: ExcessRecruitmentRequestRecord[] = [];
let memNotifications: any[] = [];
let memTasks: ErpTask[] = [];
let memAuditLogs: AuditLog[] = [];

const sampleUsers: HrmRoutingUser[] = [
  { uid: "U-SH-1", displayName: "Eng. Samuel", role: UserRole.SECTION_HEAD, status: "Active" },
  { uid: "U-HR-1", displayName: "Selamawit HR", role: UserRole.HR_MANAGER, status: "Active" },
  { uid: "U-ENG-1", displayName: "Dawit Office Eng", role: UserRole.OFFICE_MANAGER, status: "Active" },
  { uid: "U-FIN-1", displayName: "Bereket Finance", role: UserRole.FINANCE_MANAGER, status: "Active" },
  { uid: "U-OP-1", displayName: "Mekdes Operation", role: UserRole.OPERATION_MANAGER, status: "Active" },
  { uid: "U-DIR-1", displayName: "Ato Girma Director", role: UserRole.DIRECTOR, status: "Active" },
];

const samplePlans: ManpowerPlanRecord[] = [
  {
    id: "MPP-BT-1",
    planCode: "MP-2026-01",
    fiscalYear: "2026",
    project: "Bole Tower",
    department: "Structural",
    jobPosition: "Site Engineer",
    approvedManpower: 4,
    budgetedMonthlySalaryPerHead: 25000,
    currency: "ETB",
    status: "Approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const baseWorkers: Worker[] = [
  {
    id: "OVID-EMP-2026-0001",
    employeeId: "OVID-EMP-2026-0001",
    name: "Abel Tadesse",
    company: "OVID",
    department: "Structural",
    trade: "Site Engineer",
    position: "Site Engineer",
    joinedDate: "2026-01-15",
    assignedProject: "Bole Tower",
    currentSite: "Bole Tower",
    workLocationType: "Construction Site",
    status: "Active",
    teamId: "TEAM-1",
    phoneNumber: "+251911223344",
    dateOfBirth: "1992-05-10",
  },
];

async function createDirectorApprovedRequest(requestedCount = 2): Promise<RecruitmentRequestRecord> {
  const step1 = await submitRecruitmentRequestWithManpowerCheck({
    project: "Bole Tower",
    department: "Structural",
    jobPosition: "Site Engineer",
    requestedCount,
    employmentType: "Permanent",
    urgency: "High",
    requiredByDate: "2026-10-01",
    proposedMonthlySalary: 25000,
    jobResponsibilities: "Concrete pour supervision & structural QA checks",
    experienceRequired: "4+ years high-rise",
    qualificationsRequired: "BSc Civil Engineering",
    justification: "Tower C structural crew reinforcement",
    actorName: "Eng. Samuel",
    actorUid: "U-SH-1",
    actorRole: UserRole.SECTION_HEAD,
    manpowerPlans: samplePlans,
    workers: baseWorkers,
    users: sampleUsers,
  });

  const step2 = await advanceRecruitmentApproval({
    request: step1,
    decision: "Approved",
    actorName: "Selamawit HR",
    actorUid: "U-HR-1",
    actorRole: UserRole.HR_MANAGER,
    users: sampleUsers,
    tasks: memTasks,
  });

  const step3 = await advanceRecruitmentApproval({
    request: step2,
    decision: "Approved",
    actorName: "Dawit Office Eng",
    actorUid: "U-ENG-1",
    actorRole: UserRole.OFFICE_MANAGER,
    users: sampleUsers,
    tasks: memTasks,
  });

  const step4 = await advanceRecruitmentApproval({
    request: step3,
    decision: "Approved",
    actorName: "Bereket Finance",
    actorUid: "U-FIN-1",
    actorRole: UserRole.FINANCE_MANAGER,
    users: sampleUsers,
    tasks: memTasks,
  });

  const step5 = await advanceRecruitmentApproval({
    request: step4,
    decision: "Approved",
    actorName: "Mekdes Operation",
    actorUid: "U-OP-1",
    actorRole: UserRole.OPERATION_MANAGER,
    users: sampleUsers,
    tasks: memTasks,
  });

  return advanceRecruitmentApproval({
    request: step5,
    decision: "Approved",
    actorName: "Ato Girma Director",
    actorUid: "U-DIR-1",
    actorRole: UserRole.DIRECTOR,
    notes: "Final Director approval granted for onboarding",
    users: sampleUsers,
    tasks: memTasks,
  });
}

async function buildCandidatePayload(params: {
  workers: Worker[];
  req: RecruitmentRequestRecord;
  name: string;
  phoneNumber: string;
  dateOfBirth: string;
  faydaId: string;
  nationalId: string;
  excessApprovalRequestId?: string;
}): Promise<{ worker: Worker; privateProfile: HrmPrivateProfileRecord }> {
  const empCode = generateNextEmployeeId(params.workers);
  const cleanPhoneNorm = normalizePhoneForDuplicateCheck(params.phoneNumber);
  const [faydaHash, nationalHash, phoneHash, faydaEnc, nationalEnc, bankAccEnc, phoneEnc] =
    await Promise.all([
      hashSensitiveIdentifier(params.faydaId),
      hashSensitiveIdentifier(params.nationalId),
      cleanPhoneNorm ? hashSensitiveIdentifier(cleanPhoneNorm) : Promise.resolve(""),
      encryptSensitiveText(params.faydaId),
      encryptSensitiveText(params.nationalId),
      encryptSensitiveText("1000234567891"),
      encryptSensitiveText(params.phoneNumber),
    ]);

  const worker: Worker = {
    id: empCode,
    employeeId: empCode,
    name: params.name,
    company: "OVID",
    department: params.req.department,
    trade: params.req.jobPosition,
    position: params.req.jobPosition,
    jobResponsibilities: params.req.jobResponsibilities,
    employmentType: params.req.employmentType,
    joinedDate: "2026-09-01",
    assignedProject: params.req.project,
    currentSite: params.req.project,
    workLocationType: "Construction Site",
    status: "Active",
    teamId: "TEAM-1",
    dateOfBirth: params.dateOfBirth,
    gender: "Male",
    phoneNumber: params.phoneNumber,
    address: "Bole Sub-City, Woreda 03, Addis Ababa",
    emergencyContact: "Almaz Kebede (+251911009988)",
    qualifications: "BSc Civil Engineering, ETB PMP",
    experienceYears: 5,
    skills: "Structural Supervision, Rebar QA, AutoCAD",
    certifications: "Licensed Site Engineer Tier II",
    salaryGrade: "SG-07",
    basicMonthlySalary: params.req.proposedMonthlySalary,
    housingAllowance: 3000,
    transportAllowance: 1800,
    positionAllowance: 1500,
    medicalAllowance: 800,
    bankName: "Commercial Bank of Ethiopia",
    recruitmentRequestId: params.req.id,
    excessApprovalRequestId: params.excessApprovalRequestId,
    biometricEnrollmentStatus: "Not Registered",
    biometricMappingStatus: "Unmapped",
    biometricRegistered: false,
  };

  const privateProfile: HrmPrivateProfileRecord = {
    id: empCode,
    workerId: empCode,
    employeeId: empCode,
    faydaIdEncrypted: faydaEnc,
    faydaIdHash: faydaHash,
    nationalIdEncrypted: nationalEnc,
    nationalIdHash: nationalHash,
    bankName: "Commercial Bank of Ethiopia",
    bankAccountEncrypted: bankAccEnc,
    emergencyContactEncrypted: phoneEnc,
    phoneNormalizedHash: phoneHash,
    encryptionAlgorithm: "AES-GCM-256",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
    updatedBy: "Selamawit HR",
  };

  return { worker, privateProfile };
}

beforeEach(() => {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  memRecruitments = [];
  memExcessRequests = [];
  memNotifications = [];
  memTasks = [];
  memAuditLogs = [];

  vi.restoreAllMocks();

  vi.spyOn(DbService, "saveRecruitmentRequest").mockImplementation(async (req) => {
    memRecruitments = [...memRecruitments.filter((r) => r.id !== req.id), req];
  });
  vi.spyOn(DbService, "saveExcessRecruitmentRequest").mockImplementation(async (req) => {
    memExcessRequests = [...memExcessRequests.filter((r) => r.id !== req.id), req];
  });
  vi.spyOn(DbService, "addNotification").mockImplementation(async (notif: any) => {
    memNotifications.push(notif);
  });
  vi.spyOn(DbService, "addTask").mockImplementation(async (task: ErpTask) => {
    memTasks = [...memTasks.filter((t) => t.id !== task.id), task];
  });
  vi.spyOn(DbService, "updateTask").mockImplementation(async (task: ErpTask) => {
    memTasks = [...memTasks.filter((t) => t.id !== task.id), task];
  });
  vi.spyOn(DbService, "addAuditLog").mockImplementation(async (log: AuditLog) => {
    memAuditLogs.push(log);
  });
});

describe("Recruitment & Hiring Management (PART 2)", () => {
  it("routes Director final approval to HR Manager and registers employees with full Part 2 fields + Open -> Partially Filled -> Filled quota tracking", async () => {
    const approvedReq = await createDirectorApprovedRequest(2);

    expect(approvedReq.status).toBe("Approved");
    expect(approvedReq.workflowStage).toBe("Approved");
    expect(approvedReq.hrRegistrationAuthorized).toBe(true);
    expect(getRecruitmentFillStatus(approvedReq)).toEqual({
      approvedQty: 2,
      registeredCount: 0,
      remainingVacancies: 2,
      fillStatus: "Open",
    });

    // HR queue notification + task created upon Director Final Approval
    expect(
      memNotifications.some(
        (n) => n.userId === "U-HR-1" && n.type === "HRM Employee Registration Authorized"
      )
    ).toBe(true);
    const hrOnboardingTask = memTasks.find((t) => t.id === approvedReq.hrOnboardingTaskId);
    expect(hrOnboardingTask?.category).toBe("HRM Employee Registration");

    // Non-HR role (e.g. Site Manager / Finance) cannot register employees even after Director approval
    const nonHrAuth = validateEmployeeRegistrationAuthorization({
      role: UserRole.FINANCE_MANAGER,
      recruitmentRequest: approvedReq,
    });
    expect(nonHrAuth.allowed).toBe(false);

    // Register Employee #1 (Partially Filled: 1/2)
    const cand1 = await buildCandidatePayload({
      workers: baseWorkers,
      req: approvedReq,
      name: "Dawit Bekele",
      phoneNumber: "0922334455",
      dateOfBirth: "1994-03-21",
      faydaId: "FIN-8877665544",
      nationalId: "ETH-NAT-100200",
    });
    expect(cand1.worker.employeeId).toBe("OVID-EMP-2026-0002");

    const reg1 = await registerApprovedEmployeeFromRecruitment({
      recruitmentRequest: approvedReq,
      worker: cand1.worker,
      privateProfile: cand1.privateProfile,
      existingWorkers: baseWorkers,
      existingPrivateProfiles: [],
      manpowerPlans: samplePlans,
      tasks: memTasks,
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(reg1.updatedRequest.hiredCount).toBe(1);
    expect(reg1.updatedRequest.remainingVacanciesSnapshot).toBe(1);
    expect(reg1.updatedRequest.recruitmentFillStatus).toBe("Partially Filled");
    expect(reg1.updatedRequest.status).toBe("Approved");
    expect(reg1.updatedRequest.hiredEmployeeIds).toEqual(["OVID-EMP-2026-0002"]);

    // Register Employee #2 (Filled: 2/2 -> request automatically becomes Fulfilled)
    const workersAfter1 = [cand1.worker, ...baseWorkers];
    const cand2 = await buildCandidatePayload({
      workers: workersAfter1,
      req: reg1.updatedRequest,
      name: "Hanna Tesfaye",
      phoneNumber: "+251933445566",
      dateOfBirth: "1995-07-12",
      faydaId: "FIN-9988776655",
      nationalId: "ETH-NAT-200300",
    });
    expect(cand2.worker.employeeId).toBe("OVID-EMP-2026-0003");

    const reg2 = await registerApprovedEmployeeFromRecruitment({
      recruitmentRequest: reg1.updatedRequest,
      worker: cand2.worker,
      privateProfile: cand2.privateProfile,
      existingWorkers: workersAfter1,
      existingPrivateProfiles: [cand1.privateProfile],
      manpowerPlans: samplePlans,
      tasks: memTasks,
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(reg2.updatedRequest.hiredCount).toBe(2);
    expect(reg2.updatedRequest.remainingVacanciesSnapshot).toBe(0);
    expect(reg2.updatedRequest.recruitmentFillStatus).toBe("Filled");
    expect(reg2.updatedRequest.status).toBe("Fulfilled");
    expect(reg2.updatedRequest.workflowStage).toBe("Fulfilled");
  });

  it("blocks duplicate manpower requests and duplicate employee registrations across Employee ID, phone (+251/09), Fayda ID hash, National ID hash, and Name+DOB", async () => {
    const approvedReq = await createDirectorApprovedRequest(2);

    // Duplicate Manpower Request idempotency guard
    await expect(
      submitRecruitmentRequestWithManpowerCheck({
        project: "Bole Tower",
        department: "Structural",
        jobPosition: "Site Engineer",
        requestedCount: 2,
        employmentType: "Permanent",
        urgency: "High",
        requiredByDate: "2026-10-01",
        proposedMonthlySalary: 25000,
        jobResponsibilities: "Concrete pour supervision & structural QA checks",
        experienceRequired: "4+ years high-rise",
        qualificationsRequired: "BSc Civil Engineering",
        justification: "Tower C structural crew reinforcement",
        actorName: "Eng. Samuel",
        actorUid: "U-SH-1",
        actorRole: UserRole.SECTION_HEAD,
        manpowerPlans: samplePlans,
        workers: baseWorkers,
        existingRequests: [
          {
            ...approvedReq,
            status: "Pending",
            workflowStage: "Pending HR Manager",
          },
        ],
        users: sampleUsers,
      })
    ).rejects.toThrow(/Duplicate submission blocked/i);

    const cand1 = await buildCandidatePayload({
      workers: baseWorkers,
      req: approvedReq,
      name: "Dawit Bekele",
      phoneNumber: "+251922334455",
      dateOfBirth: "1994-03-21",
      faydaId: "FIN-1122334455",
      nationalId: "NAT-445566",
    });

    // 1. Duplicate Employee ID
    const dupEmpId = await checkDuplicateEmployeeRegistration({
      employeeId: "OVID-EMP-2026-0001",
      existingWorkers: baseWorkers,
    });
    expect(dupEmpId.isDuplicate).toBe(true);
    expect(dupEmpId.field).toBe("employeeId");

    // 2. Duplicate normalized phone (+251911223344 vs 0911223344)
    const dupPhone = await checkDuplicateEmployeeRegistration({
      employeeId: "OVID-EMP-2026-0099",
      phoneNumber: "0911223344",
      existingWorkers: baseWorkers,
    });
    expect(dupPhone.isDuplicate).toBe(true);
    expect(dupPhone.field).toBe("phoneNumber");

    // 3. Duplicate Name + DOB
    const dupNameDob = await checkDuplicateEmployeeRegistration({
      employeeId: "OVID-EMP-2026-0099",
      name: "  abel   tadesse ",
      dateOfBirth: "1992-05-10",
      existingWorkers: baseWorkers,
    });
    expect(dupNameDob.isDuplicate).toBe(true);
    expect(dupNameDob.field).toBe("name+dateOfBirth");

    // 4. Duplicate Fayda ID hash & National ID hash
    const dupFayda = await checkDuplicateEmployeeRegistration({
      employeeId: "OVID-EMP-2026-0099",
      faydaId: "FIN 1122 3344 55",
      existingWorkers: baseWorkers,
      existingPrivateProfiles: [cand1.privateProfile],
    });
    expect(dupFayda.isDuplicate).toBe(true);
    expect(dupFayda.field).toBe("faydaId");

    const dupNat = await checkDuplicateEmployeeRegistration({
      employeeId: "OVID-EMP-2026-0099",
      nationalId: "nat-445566",
      existingWorkers: baseWorkers,
      existingPrivateProfiles: [cand1.privateProfile],
    });
    expect(dupNat.isDuplicate).toBe(true);
    expect(dupNat.field).toBe("nationalId");
  });

  it("blocks registration above Director-approved quota, triggers Director Excess Recruitment Alert, keeps blocked on rejection, and unlocks on Director approval", async () => {
    const approvedReq = await createDirectorApprovedRequest(1);

    const cand1 = await buildCandidatePayload({
      workers: baseWorkers,
      req: approvedReq,
      name: "Mikias Alemu",
      phoneNumber: "0911998877",
      dateOfBirth: "1993-01-11",
      faydaId: "FIN-5544332211",
      nationalId: "NAT-554433",
    });

    const afterOne = await registerApprovedEmployeeFromRecruitment({
      recruitmentRequest: approvedReq,
      worker: cand1.worker,
      privateProfile: cand1.privateProfile,
      existingWorkers: baseWorkers,
      existingPrivateProfiles: [],
      manpowerPlans: samplePlans,
      tasks: memTasks,
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(afterOne.updatedRequest.status).toBe("Fulfilled");
    expect(afterOne.updatedRequest.hiredCount).toBe(1);

    // Attempting 2nd registration beyond approved 1/1 must be blocked with EXCESS detected
    const authCheck = validateEmployeeRegistrationAuthorization({
      role: UserRole.HR_MANAGER,
      recruitmentRequest: afterOne.updatedRequest,
    });
    expect(authCheck.allowed).toBe(false);
    expect(authCheck.excessDetected).toBe(true);

    const workersAfter1 = [cand1.worker, ...baseWorkers];
    const cand2 = await buildCandidatePayload({
      workers: workersAfter1,
      req: afterOne.updatedRequest,
      name: "Yonas Girma",
      phoneNumber: "0922887766",
      dateOfBirth: "1991-09-09",
      faydaId: "FIN-7766554433",
      nationalId: "NAT-776655",
    });

    await expect(
      registerApprovedEmployeeFromRecruitment({
        recruitmentRequest: afterOne.updatedRequest,
        worker: cand2.worker,
        privateProfile: cand2.privateProfile,
        existingWorkers: workersAfter1,
        existingPrivateProfiles: [cand1.privateProfile],
        manpowerPlans: samplePlans,
        tasks: memTasks,
        actorName: "Selamawit HR",
        actorUid: "U-HR-1",
        actorRole: UserRole.HR_MANAGER,
      })
    ).rejects.toThrow(/Excess Recruitment Blocked/i);

    // Blocked excess registration attempt immediately alerts Director & writes immutable audit log
    await recordExcessRegistrationAttemptAlert({
      recruitmentRequest: afterOne.updatedRequest,
      candidateName: cand2.worker.name,
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
      users: sampleUsers,
    });
    expect(
      memNotifications.some(
        (n) => n.userId === "U-DIR-1" && n.type === "HRM Excess Recruitment Attempt Blocked"
      )
    ).toBe(true);
    expect(memAuditLogs.some((l) => l.action === "HRM_EXCESS_REGISTRATION_BLOCKED")).toBe(true);

    // Non-HR cannot submit Excess Request
    await expect(
      submitExcessRecruitmentRequest({
        recruitmentRequest: afterOne.updatedRequest,
        excessCount: 1,
        justification: "Need extra engineer",
        actorName: "Bereket Finance",
        actorUid: "U-FIN-1",
        actorRole: UserRole.FINANCE_MANAGER,
        users: sampleUsers,
      })
    ).rejects.toThrow(/Only HR Manager/i);

    // Justification > 1000 chars rejected to match Firestore rules
    await expect(
      submitExcessRecruitmentRequest({
        recruitmentRequest: afterOne.updatedRequest,
        excessCount: 1,
        justification: "X".repeat(1001),
        actorName: "Selamawit HR",
        actorUid: "U-HR-1",
        actorRole: UserRole.HR_MANAGER,
        users: sampleUsers,
      })
    ).rejects.toThrow(/1000 characters/i);

    // HR Manager submits Excess Recruitment Request #1 -> Director immediately alerted
    const errReq1 = await submitExcessRecruitmentRequest({
      recruitmentRequest: afterOne.updatedRequest,
      excessCount: 1,
      justification: "Urgent night-shift concrete pour added to Tower B schedule",
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
      existingExcessRequests: memExcessRequests,
      users: sampleUsers,
    });
    expect(errReq1.requestNo).toMatch(/^ERR-\d{4}-0001$/);
    expect(errReq1.status).toBe("Pending Director");
    expect(
      memNotifications.some(
        (n) => n.userId === "U-DIR-1" && n.type === "HRM Excess Recruitment Alert"
      )
    ).toBe(true);
    expect(memTasks.some((t) => t.id === errReq1.directorTaskId && t.category === "HRM Excess Recruitment Approval")).toBe(true);

    // Non-Director cannot approve/reject excess request
    await expect(
      decideExcessRecruitmentRequest({
        excessRequest: errReq1,
        recruitmentRequest: afterOne.updatedRequest,
        decision: "Approved",
        actorName: "Selamawit HR",
        actorUid: "U-HR-1",
        actorRole: UserRole.HR_MANAGER,
        users: sampleUsers,
      })
    ).rejects.toThrow(/ONLY Director may decide excess requests/i);

    // If Director REJECTS excess request -> registration remains blocked!
    const rejRes = await decideExcessRecruitmentRequest({
      excessRequest: errReq1,
      recruitmentRequest: {
        ...afterOne.updatedRequest,
        excessApprovalStatus: "Pending Director",
      },
      decision: "Rejected",
      actorName: "Ato Girma Director",
      actorUid: "U-DIR-1",
      actorRole: UserRole.DIRECTOR,
      notes: "Use existing Bole Tower shift rotation instead",
      users: sampleUsers,
    });
    expect(rejRes.updatedExcess.status).toBe("Rejected");
    expect(rejRes.updatedRecruitment.requestedCount).toBe(1);
    expect(
      validateEmployeeRegistrationAuthorization({
        role: UserRole.HR_MANAGER,
        recruitmentRequest: rejRes.updatedRecruitment,
      }).allowed
    ).toBe(false);

    // HR submits a new Excess Request #2 -> Director APPROVES -> quota increments from 1 to 2 & HR can register!
    const errReq2 = await submitExcessRecruitmentRequest({
      recruitmentRequest: rejRes.updatedRecruitment,
      excessCount: 1,
      justification: "Client approved accelerated milestone B3 requiring dedicated night QA engineer",
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
      existingExcessRequests: memExcessRequests,
      users: sampleUsers,
    });
    expect(errReq2.requestNo).toBe(
      generateNextExcessRecruitmentRequestNo([errReq1])
    );

    const appRes = await decideExcessRecruitmentRequest({
      excessRequest: errReq2,
      recruitmentRequest: {
        ...rejRes.updatedRecruitment,
        excessApprovalStatus: "Pending Director",
      },
      decision: "Approved",
      actorName: "Ato Girma Director",
      actorUid: "U-DIR-1",
      actorRole: UserRole.DIRECTOR,
      notes: "Approved +1 engineer for accelerated B3 pour",
      users: sampleUsers,
    });

    expect(appRes.updatedExcess.status).toBe("Approved");
    expect(appRes.updatedRecruitment.requestedCount).toBe(2);
    expect(appRes.updatedRecruitment.excessApprovedAdded).toBe(1);
    expect(appRes.updatedRecruitment.remainingVacanciesSnapshot).toBe(1);
    expect(appRes.updatedRecruitment.workflowStage).toBe("Approved");
    expect(appRes.updatedRecruitment.hrRegistrationAuthorized).toBe(true);

    // HR Manager can now finalize excess employee registration linked to the approved excess request
    const finalReg = await registerApprovedEmployeeFromRecruitment({
      recruitmentRequest: appRes.updatedRecruitment,
      worker: { ...cand2.worker, excessApprovalRequestId: errReq2.id },
      privateProfile: cand2.privateProfile,
      existingWorkers: workersAfter1,
      existingPrivateProfiles: [cand1.privateProfile],
      manpowerPlans: samplePlans,
      tasks: memTasks,
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(finalReg.updatedRequest.hiredCount).toBe(2);
    expect(finalReg.updatedRequest.recruitmentFillStatus).toBe("Filled");
    expect(finalReg.updatedRequest.status).toBe("Fulfilled");
  });

  it("computes real-time Recruitment & Manpower KPIs, Project/Department Recruitment Reports, and renders Director Excess Alerts on Executive Dashboard", async () => {
    const req1 = await createDirectorApprovedRequest(3);
    const req2: RecruitmentRequestRecord = {
      ...req1,
      id: "REC-2",
      requestNo: "MRF-2026-0002",
      project: "Head Office",
      department: "Finance",
      jobPosition: "Cost Accountant",
      requestedCount: 1,
      hiredCount: 0,
      remainingVacanciesSnapshot: 1,
      recruitmentFillStatus: "Open",
      workflowStage: "Returned for Correction",
      status: "Pending",
      hrRegistrationAuthorized: false,
      createdAt: "2026-09-05T09:00:00.000Z",
    };
    const req3: RecruitmentRequestRecord = {
      ...req1,
      id: "REC-3",
      requestNo: "MRF-2026-0003",
      project: "Kazanchis Complex",
      department: "MEP",
      jobPosition: "Electrical Engineer",
      requestedCount: 2,
      hiredCount: 0,
      remainingVacanciesSnapshot: 2,
      recruitmentFillStatus: "Open",
      workflowStage: "Rejected",
      status: "Rejected",
      hrRegistrationAuthorized: false,
      createdAt: "2026-08-15T09:00:00.000Z",
    };

    const req1With1Hired: RecruitmentRequestRecord = {
      ...req1,
      hiredCount: 1,
      remainingVacanciesSnapshot: 2,
      recruitmentFillStatus: "Partially Filled",
      createdAt: "2026-09-01T09:00:00.000Z",
    };

    const excessPending: ExcessRecruitmentRequestRecord = {
      id: "ERR-UI-1",
      requestNo: "ERR-2026-0001",
      recruitmentRequestId: req1.id,
      recruitmentRequestNo: req1.requestNo,
      project: "Bole Tower",
      department: "Structural",
      jobPosition: "Site Engineer",
      approvedQuantitySnapshot: 3,
      registeredCountSnapshot: 3,
      excessCount: 2,
      justification: "Additional structural shift coverage",
      requestedBy: "Selamawit HR",
      requestedById: "U-HR-1",
      requestedByRole: UserRole.HR_MANAGER,
      status: "Pending Director",
      auditHistory: [],
      createdAt: "2026-09-10T09:00:00.000Z",
      updatedAt: "2026-09-10T09:00:00.000Z",
    };

    const kpis = computeHrmDashboardState({
      workers: baseWorkers,
      manpowerPlans: samplePlans,
      recruitmentRequests: [req1With1Hired, req2, req3],
      excessRequests: [excessPending],
      attendance: [],
      leaveRequests: [],
      overtimeRequests: [],
      payrollRuns: [],
      loans: [],
      workSchedules: [],
    });

    expect(kpis.totalManpowerRequests).toBe(3);
    expect(kpis.pendingRecruitmentApprovals).toBe(0);
    expect(kpis.returnedRecruitmentRequests).toBe(1);
    expect(kpis.approvedRecruitmentRequests).toBe(1);
    expect(kpis.rejectedRecruitmentRequests).toBe(1);
    expect(kpis.totalApprovedManpowerQty).toBe(3);
    expect(kpis.registeredEmployeesFromRequests).toBe(1);
    expect(kpis.remainingRecruitmentVacancies).toBe(2);
    expect(kpis.pendingExcessRequestsCount).toBe(1);

    // Project & Department Report + filters
    const fullReport = buildRecruitmentByProjectAndDepartmentReport({
      recruitmentRequests: [req1With1Hired, req2, req3],
      excessRequests: [excessPending],
    });
    expect(fullReport.summaryRows).toHaveLength(3);
    expect(fullReport.detailRows).toHaveLength(3);

    const boleReport = buildRecruitmentByProjectAndDepartmentReport({
      recruitmentRequests: [req1With1Hired, req2, req3],
      excessRequests: [excessPending],
      filters: { project: "Bole Tower", status: "Partially Filled", monthPrefix: "2026-09" },
    });
    expect(boleReport.summaryRows).toHaveLength(1);
    expect(boleReport.summaryRows[0]["Approved Manpower Qty"]).toBe(3);
    expect(boleReport.summaryRows[0]["Employees Registered"]).toBe(1);
    expect(boleReport.summaryRows[0]["Remaining Vacancies"]).toBe(2);
    expect(boleReport.summaryRows[0]["Pending Excess Alerts"]).toBe(1);

    // Executive Dashboard renders Director Excess Alert card
    render(
      React.createElement(Dashboard, {
        workers: baseWorkers,
        teams: [],
        zones: [],
        attendance: [],
        isAmharic: false,
        t: (k: string) => k,
        activeTab: "dashboard",
        setActiveTab: vi.fn(),
        onNavigateToTab: vi.fn(),
        currentUserRole: UserRole.DIRECTOR,
        currentUserProfile: { uid: "U-DIR-1", displayName: "Ato Girma Director" },
        evaluations: [],
        recruitmentRequests: [req1With1Hired],
        excessRecruitmentRequests: [excessPending],
        erpTasks: [],
      })
    );

    expect(screen.getByText("ERR-2026-0001")).toBeTruthy();
    expect(screen.getByText(/EXCESS RECRUITMENT ALERT/i)).toBeTruthy();
  });
});
