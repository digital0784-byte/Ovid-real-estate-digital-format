import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceRecruitmentApproval,
  canRequesterResubmitRecruitmentRequest,
  completeApprovedEmployeeOnboarding,
  generateNextRecruitmentRequestNo,
  HrmRoutingUser,
  resolveHrmPermissions,
  resubmitReturnedRecruitmentRequest,
  submitRecruitmentRequestWithManpowerCheck,
  validateEmployeeRegistrationAuthorization,
} from "../services/hrmService";
import { Dashboard } from "../components/Dashboard";
import { DbService } from "../services/db";
import {
  ErpTask,
  ManpowerPlanRecord,
  RecruitmentRequestRecord,
  UserRole,
  Worker,
} from "../types";

let memRecruitments: RecruitmentRequestRecord[] = [];
let memNotifications: any[] = [];
let memTasks: ErpTask[] = [];

const sampleUsers: HrmRoutingUser[] = [
  { uid: "U-SH-1", displayName: "Eng. Samuel", role: UserRole.SECTION_HEAD, status: "Active" },
  { uid: "U-HR-1", displayName: "Selamawit HR", role: UserRole.HR_MANAGER, status: "Active" },
  { uid: "U-HR-INACTIVE", displayName: "Old HR", role: UserRole.HR_MANAGER, status: "Inactive" },
  { uid: "U-ENG-1", displayName: "Dawit Office Eng", role: UserRole.OFFICE_MANAGER, status: "Active" },
  { uid: "U-FIN-1", displayName: "Bereket Finance", role: UserRole.FINANCE_MANAGER, status: "Active" },
  { uid: "U-OP-1", displayName: "Mekdes Operation", role: UserRole.OPERATION_MANAGER, status: "Active" },
  { uid: "U-DIR-1", displayName: "Ato Girma Director", role: UserRole.DIRECTOR, status: "Active" },
];

const samplePlans: ManpowerPlanRecord[] = [
  {
    id: "MPP-1",
    planCode: "MP-2026-01",
    fiscalYear: "2026",
    project: "Bole Tower",
    department: "Structural",
    jobPosition: "Structural Engineer",
    approvedManpower: 3,
    budgetedMonthlySalaryPerHead: 22000,
    currency: "ETB",
    status: "Approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const sampleWorkers: Worker[] = [
  {
    id: "OVID-EMP-2026-0001",
    employeeId: "OVID-EMP-2026-0001",
    name: "Existing Engineer",
    company: "OVID",
    department: "Structural",
    trade: "Structural Engineer",
    position: "Structural Engineer",
    joinedDate: "2026-01-10",
    assignedProject: "Bole Tower",
    currentSite: "Bole Tower",
    status: "Active",
    teamId: "TEAM-1",
  },
];

beforeEach(() => {
  memRecruitments = [];
  memNotifications = [];
  memTasks = [];

  vi.spyOn(DbService, "saveRecruitmentRequest").mockImplementation(async (req) => {
    memRecruitments = [...memRecruitments.filter((r) => r.id !== req.id), req];
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
});

describe("Recruitment & Hiring Management (PART 1)", () => {
  it("restricts Manpower Request creation to Section Head (or Super Admin) and generates sequential MRF-YYYY-XXXX IDs", async () => {
    expect(resolveHrmPermissions(UserRole.SECTION_HEAD).canSubmitManpowerRequest).toBe(true);
    expect(resolveHrmPermissions(UserRole.SUPER_ADMIN).canSubmitManpowerRequest).toBe(true);
    expect(resolveHrmPermissions(UserRole.FINANCE_MANAGER).canSubmitManpowerRequest).toBe(false);
    expect(resolveHrmPermissions(UserRole.HR_MANAGER).canSubmitManpowerRequest).toBe(false);

    await expect(
      submitRecruitmentRequestWithManpowerCheck({
        project: "Bole Tower",
        department: "Structural",
        jobPosition: "Structural Engineer",
        requestedCount: 1,
        employmentType: "Permanent",
        urgency: "Normal",
        requiredByDate: "2026-09-01",
        proposedMonthlySalary: 22000,
        jobResponsibilities: "Inspect rebar and concrete pours",
        experienceRequired: "4 years",
        qualificationsRequired: "BSc Civil Engineering",
        justification: "Site expansion",
        actorName: "Bereket Finance",
        actorUid: "U-FIN-1",
        actorRole: UserRole.FINANCE_MANAGER,
        manpowerPlans: samplePlans,
        workers: sampleWorkers,
        users: sampleUsers,
      })
    ).rejects.toThrow(/Only Section Head/);

    const existingReq = {
      requestNo: `MRF-${new Date().getFullYear()}-0007`,
    } as RecruitmentRequestRecord;
    const nextNo = generateNextRecruitmentRequestNo([existingReq]);
    expect(nextNo).toBe(`MRF-${new Date().getFullYear()}-0008`);
  });

  it("enforces exact 6-step sequential approval workflow with automatic task handover, supporting docs, accumulated comments, and pre-approval employee lock", async () => {
    const req = await submitRecruitmentRequestWithManpowerCheck({
      project: "Bole Tower",
      department: "Structural",
      jobPosition: "Structural Engineer",
      requestedCount: 2,
      employmentType: "Permanent",
      urgency: "High",
      requiredByDate: "2026-09-15",
      proposedMonthlySalary: 21500,
      jobResponsibilities: "Structural supervision and QA sign-off",
      experienceRequired: "5+ years high-rise",
      qualificationsRequired: "BSc Structural / Civil Engineering",
      justification: "Tower B podium slab schedule acceleration",
      supportingDocuments: [
        {
          id: "DOC-1",
          name: "section_head_justification.pdf",
          url: "https://example.com/section_head_justification.pdf",
          uploadedAt: "2026-08-01T08:00:00.000Z",
        },
      ],
      actorName: "Eng. Samuel",
      actorUid: "U-SH-1",
      actorRole: UserRole.SECTION_HEAD,
      manpowerPlans: samplePlans,
      workers: sampleWorkers,
      users: sampleUsers,
    });

    expect(req.workflowStage).toBe("Pending HR Manager");
    expect(req.currentStageTaskId).toBeTruthy();
    expect(req.currentStageAssigneeIds).toEqual(["U-HR-1"]);
    expect(req.currentStageAssigneeNames).toEqual(["Selamawit HR"]);

    // Verify Step 2 task in tasks collection carries supporting docs & active HR user only
    const hrTask = memTasks.find((t) => t.id === req.currentStageTaskId)!;
    expect(hrTask).toBeTruthy();
    expect(hrTask.status).toBe("Pending");
    expect(hrTask.relatedRecruitmentNo).toBe(req.requestNo);
    expect(hrTask.assignedToUserIds).toEqual(["U-HR-1"]);
    expect(hrTask.relatedEvidence?.[0]?.url).toBe("https://example.com/section_head_justification.pdf");
    expect(memNotifications.some((n) => n.userId === "U-HR-1" && n.actionTab === "hrmEnterprise:recruitment")).toBe(true);

    // Out-of-order Director or Finance approval must be rejected
    await expect(
      advanceRecruitmentApproval({
        request: req,
        decision: "Approved",
        actorName: "Ato Girma",
        actorUid: "U-DIR-1",
        actorRole: UserRole.DIRECTOR,
        users: sampleUsers,
        tasks: memTasks,
      })
    ).rejects.toThrow(/Sequential workflow rule violation/);

    // Employee registration must stay blocked prior to Director Final Approval
    expect(
      validateEmployeeRegistrationAuthorization({ role: UserRole.HR_MANAGER, recruitmentRequest: req }).allowed
    ).toBe(false);

    // Step 2: HR Manager approves -> forwards to Office Engineer Manager
    const step2 = await advanceRecruitmentApproval({
      request: req,
      decision: "Approved",
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
      notes: "Position & qualifications verified",
      users: sampleUsers,
      tasks: memTasks,
    });
    expect(step2.workflowStage).toBe("Pending Office Manager");
    expect(memTasks.find((t) => t.id === hrTask.id)?.status).toBe("Completed");
    const engTask = memTasks.find((t) => t.id === step2.currentStageTaskId)!;
    expect(engTask.assignedToUserIds).toEqual(["U-ENG-1"]);
    expect(engTask.notes).toContain("Position & qualifications verified");

    // Step 3: Office Engineer Manager (also supports OFFICE_AND_TECHNICAL_ENGINEERING) approves -> Finance Manager
    const step3 = await advanceRecruitmentApproval({
      request: step2,
      decision: "Approved",
      actorName: "Dawit Office Eng",
      actorUid: "U-ENG-1",
      actorRole: UserRole.OFFICE_AND_TECHNICAL_ENGINEERING,
      notes: "Site workload & org chart verified",
      users: sampleUsers,
      tasks: memTasks,
    });
    expect(step3.workflowStage).toBe("Pending Finance Manager");
    expect(memTasks.find((t) => t.id === engTask.id)?.status).toBe("Completed");

    // Step 4: Finance Manager approves -> Operation Department
    const step4 = await advanceRecruitmentApproval({
      request: step3,
      decision: "Approved",
      actorName: "Bereket Finance",
      actorUid: "U-FIN-1",
      actorRole: UserRole.FINANCE_MANAGER,
      notes: "Salary budget ETB 21,500 approved within contingency",
      users: sampleUsers,
      tasks: memTasks,
    });
    expect(step4.workflowStage).toBe("Pending Operation Department");

    // Step 5: Operation Department approves -> Director Final Approval
    const step5 = await advanceRecruitmentApproval({
      request: step4,
      decision: "Approved",
      actorName: "Mekdes Operation",
      actorUid: "U-OP-1",
      actorRole: UserRole.OPERATION_MANAGER,
      notes: "Operational mobilization window confirmed",
      users: sampleUsers,
      tasks: memTasks,
    });
    expect(step5.workflowStage).toBe("Pending Director Final Approval");
    const dirTask = memTasks.find((t) => t.id === step5.currentStageTaskId)!;
    expect(dirTask.assignedToUserIds).toEqual(["U-DIR-1"]);
    expect(dirTask.notes).toContain("Salary budget ETB 21,500 approved within contingency");
    expect(dirTask.relatedEvidence?.length).toBe(1);

    // Step 6: Director gives Final Approval -> authorizes HR onboarding + notifies HR Manager & original requester
    const finalApproved = await advanceRecruitmentApproval({
      request: step5,
      decision: "Approved",
      actorName: "Ato Girma Director",
      actorUid: "U-DIR-1",
      actorRole: UserRole.DIRECTOR,
      notes: "Final authorization granted for immediate hire",
      users: sampleUsers,
      tasks: memTasks,
    });
    expect(finalApproved.workflowStage).toBe("Approved");
    expect(finalApproved.status).toBe("Approved");
    expect(finalApproved.hrRegistrationAuthorized).toBe(true);
    expect(finalApproved.hrOnboardingTaskId).toBeTruthy();

    const hrRegTask = memTasks.find((t) => t.id === finalApproved.hrOnboardingTaskId)!;
    expect(hrRegTask.category).toBe("HRM Employee Registration");
    expect(hrRegTask.assignedToUserIds).toEqual(["U-HR-1"]);
    expect(memNotifications.some((n) => n.userId === "U-SH-1" && n.type === "HRM Recruitment Final Approved")).toBe(true);
    expect(memNotifications.some((n) => n.userId === "U-HR-1" && n.type === "HRM Employee Registration Authorized")).toBe(true);

    // Register 2 workers -> marks request Fulfilled & completes onboarding task
    const wA: Worker = { ...sampleWorkers[0], id: "OVID-EMP-2026-0002", employeeId: "OVID-EMP-2026-0002", name: "Hire One" };
    const wB: Worker = { ...sampleWorkers[0], id: "OVID-EMP-2026-0003", employeeId: "OVID-EMP-2026-0003", name: "Hire Two" };
    const after1 = await completeApprovedEmployeeOnboarding({
      recruitmentRequest: finalApproved,
      newWorker: wA,
      manpowerPlans: samplePlans,
      allWorkersAfterAdd: [...sampleWorkers, wA],
      tasks: memTasks,
      actorName: "Selamawit HR",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(after1.updatedRequest.status).toBe("Approved");
    const after2 = await completeApprovedEmployeeOnboarding({
      recruitmentRequest: after1.updatedRequest,
      newWorker: wB,
      manpowerPlans: samplePlans,
      allWorkersAfterAdd: [...sampleWorkers, wA, wB],
      tasks: memTasks,
      actorName: "Selamawit HR",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(after2.updatedRequest.workflowStage).toBe("Fulfilled");
    expect(after2.updatedRequest.status).toBe("Fulfilled");
  });

  it("handles Rejection permanently with mandatory reason and notifies Section Head", async () => {
    const req = await submitRecruitmentRequestWithManpowerCheck({
      project: "Bole Tower",
      department: "Structural",
      jobPosition: "Structural Engineer",
      requestedCount: 1,
      employmentType: "Contract",
      urgency: "Normal",
      requiredByDate: "2026-09-20",
      proposedMonthlySalary: 20000,
      jobResponsibilities: "CAD & Rebar bar-bending schedules",
      qualificationsRequired: "BSc Civil",
      justification: "Backlog support",
      actorName: "Eng. Samuel",
      actorUid: "U-SH-1",
      actorRole: UserRole.SECTION_HEAD,
      manpowerPlans: samplePlans,
      workers: sampleWorkers,
      users: sampleUsers,
    });

    await expect(
      advanceRecruitmentApproval({
        request: req,
        decision: "Rejected",
        actorName: "Selamawit HR",
        actorUid: "U-HR-1",
        actorRole: UserRole.HR_MANAGER,
        notes: "   ",
        users: sampleUsers,
        tasks: memTasks,
      })
    ).rejects.toThrow(/rejection reason is mandatory/i);

    const rejected = await advanceRecruitmentApproval({
      request: req,
      decision: "Rejected",
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
      notes: "Headcount frozen for contract roles in Q3",
      users: sampleUsers,
      tasks: memTasks,
    });
    expect(rejected.workflowStage).toBe("Rejected");
    expect(rejected.status).toBe("Rejected");
    expect(rejected.hrRegistrationAuthorized).toBe(false);
    expect(memNotifications.some((n) => n.userId === "U-SH-1" && n.type === "HRM Recruitment Rejected")).toBe(true);

    await expect(
      advanceRecruitmentApproval({
        request: rejected,
        decision: "Approved",
        actorName: "Dawit Office Eng",
        actorUid: "U-ENG-1",
        actorRole: UserRole.OFFICE_MANAGER,
        users: sampleUsers,
        tasks: memTasks,
      })
    ).rejects.toThrow();
  });

  it("handles Return for Correction, restricts editing strictly to original requester, preserves prior audit history, and routes resubmission back to HR Manager", async () => {
    const req = await submitRecruitmentRequestWithManpowerCheck({
      project: "Bole Tower",
      department: "Structural",
      jobPosition: "Structural Engineer",
      requestedCount: 1,
      employmentType: "Permanent",
      urgency: "Normal",
      requiredByDate: "2026-09-25",
      proposedMonthlySalary: 32000,
      jobResponsibilities: "Lead QA structural audits",
      qualificationsRequired: "MSc Structural",
      justification: "Dedicated QA",
      actorName: "Eng. Samuel",
      actorUid: "U-SH-1",
      actorRole: UserRole.SECTION_HEAD,
      manpowerPlans: samplePlans,
      workers: sampleWorkers,
      users: sampleUsers,
    });

    const step2 = await advanceRecruitmentApproval({
      request: req,
      decision: "Approved",
      actorName: "Selamawit HR",
      actorUid: "U-HR-1",
      actorRole: UserRole.HR_MANAGER,
      notes: "HR cleared",
      users: sampleUsers,
      tasks: memTasks,
    });
    const step3 = await advanceRecruitmentApproval({
      request: step2,
      decision: "Approved",
      actorName: "Dawit Office Eng",
      actorUid: "U-ENG-1",
      actorRole: UserRole.OFFICE_MANAGER,
      notes: "Office Eng cleared",
      users: sampleUsers,
      tasks: memTasks,
    });
    const returned = await advanceRecruitmentApproval({
      request: step3,
      decision: "Returned",
      actorName: "Bereket Finance",
      actorUid: "U-FIN-1",
      actorRole: UserRole.FINANCE_MANAGER,
      notes: "Reduce proposed salary to ETB 22,000 budget band and attach memo",
      users: sampleUsers,
      tasks: memTasks,
    });

    expect(returned.workflowStage).toBe("Returned for Correction");
    expect(returned.returnedBy).toBe("Bereket Finance");
    const correctionTask = memTasks.find((t) => t.id === returned.currentStageTaskId)!;
    expect(correctionTask.category).toBe("HRM Recruitment Correction");
    expect(correctionTask.assignedToUserIds).toEqual(["U-SH-1"]);

    // Another Section Head cannot steal or edit someone else's returned request
    expect(
      canRequesterResubmitRecruitmentRequest({
        request: returned,
        actorUid: "U-SH-OTHER",
        actorRole: UserRole.SECTION_HEAD,
      })
    ).toBe(false);
    await expect(
      resubmitReturnedRecruitmentRequest({
        request: returned,
        updates: { proposedMonthlySalary: 22000 },
        actorName: "Other Section Head",
        actorUid: "U-SH-OTHER",
        actorRole: UserRole.SECTION_HEAD,
        manpowerPlans: samplePlans,
        workers: sampleWorkers,
        users: sampleUsers,
        tasks: memTasks,
      })
    ).rejects.toThrow(/Only original requester/i);

    // Original Section Head revises salary + attaches supporting doc and resubmits -> restarts at Pending HR Manager preserving prior audit entries
    const resubmitted = await resubmitReturnedRecruitmentRequest({
      request: returned,
      updates: {
        proposedMonthlySalary: 22000,
        supportingDocuments: [
          {
            id: "DOC-2",
            name: "revised_salary_band.pdf",
            url: "https://example.com/revised_salary_band.pdf",
            uploadedAt: "2026-08-05T10:00:00.000Z",
          },
        ],
      },
      actorName: "Eng. Samuel",
      actorUid: "U-SH-1",
      actorRole: UserRole.SECTION_HEAD,
      manpowerPlans: samplePlans,
      workers: sampleWorkers,
      users: sampleUsers,
      tasks: memTasks,
      notes: "Aligned salary with ETB 22,000 quota band",
    });

    expect(resubmitted.workflowStage).toBe("Pending HR Manager");
    expect(resubmitted.proposedMonthlySalary).toBe(22000);
    expect(resubmitted.approvalHistory.length).toBeGreaterThanOrEqual(5);
    expect(resubmitted.approvalHistory.some((h) => h.decision === "Returned")).toBe(true);
    expect(resubmitted.approvalHistory.some((h) => h.decision === "Resubmitted")).toBe(true);
    expect(memTasks.find((t) => t.id === correctionTask.id)?.status).toBe("Completed");
  });

  it("renders actionable Pending Department Manpower & Recruitment Tasks on Department Dashboard", () => {
    const pendingForFinance: RecruitmentRequestRecord = {
      id: "REC-UI-1",
      requestNo: "MRF-2026-0099",
      project: "Bole Tower",
      department: "Structural",
      jobPosition: "Formwork Foreman",
      requestedCount: 2,
      hiredCount: 0,
      employmentType: "Permanent",
      urgency: "High",
      requiredByDate: "2026-10-01",
      proposedMonthlySalary: 16500,
      qualificationsRequired: "TVET Level IV",
      justification: "Tower B Slab Crew",
      requestedBy: "Eng. Samuel",
      requestedById: "U-SH-1",
      requestedByRole: UserRole.SECTION_HEAD,
      exceedsManpowerLimit: false,
      approvedManpowerSnapshot: 5,
      actualHiredSnapshot: 2,
      remainingVacanciesSnapshot: 3,
      excessCount: 0,
      excessApprovalStatus: "Not Required",
      workflowStage: "Pending Finance Manager",
      status: "Pending",
      approvalHistory: [],
      supportingDocuments: [],
      stageSummary: "Stage 4/6: Pending Finance Manager Salary & Budget Verification",
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: "2026-08-01T09:00:00.000Z",
    };

    render(
      React.createElement(Dashboard, {
        workers: sampleWorkers,
        teams: [],
        zones: [],
        attendance: [],
        isAmharic: false,
        t: (k: string) => k,
        activeTab: "dashboard",
        setActiveTab: vi.fn(),
        onNavigateToTab: vi.fn(),
        currentUserRole: UserRole.FINANCE_MANAGER,
        currentUserProfile: { uid: "U-FIN-1", displayName: "Bereket Finance" },
        evaluations: [],
        recruitmentRequests: [pendingForFinance],
        erpTasks: [],
      })
    );

    expect(screen.getByText(/Pending Department Manpower & Recruitment Tasks/i)).toBeTruthy();
    expect(screen.getByText("MRF-2026-0099")).toBeTruthy();
    expect(screen.getByText(/Formwork Foreman/i)).toBeTruthy();
  });
});
