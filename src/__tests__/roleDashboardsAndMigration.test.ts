import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AttendanceMethod,
  AttendanceRecord,
  AluminumFormworkPanel,
  ErpTask,
  ExcessRecruitmentRequestRecord,
  PanelMovementLog,
  PanelStatus,
  PanelType,
  PerformanceEvaluation,
  ProjectZone,
  RecruitmentRequestRecord,
  Team,
  UserRole,
  Worker,
} from "../types";
import { normalizeLegacyRole, resolveUserRole } from "../services/authService";
import {
  computeKpis,
  DASHBOARD_KIND_BY_ROLE,
  DashboardActor,
  KIND_META,
  resolveDashboardKind,
  RoleDashboardData,
  tasksForActor,
  workersOfLead,
} from "../config/roleDashboards";
import { RoleDashboard } from "../components/RoleDashboard";
import { Dashboard } from "../components/Dashboard";

afterEach(() => {
  cleanup();
});

const TODAY = "2026-07-02";

const fixtureWorkers: Worker[] = [
  {
    id: "W-1",
    employeeId: "OVID-EMP-1",
    userId: "UID-W1",
    name: "Abebe Kebede",
    company: "OVID Construction",
    department: "Structural",
    trade: "Assembler",
    position: "Slab Formwork",
    zone: "Zone A",
    floor: 3,
    status: "Active",
    teamId: "T-1",
    hourlyRate: 100,
    joinedDate: "2025-01-10",
    teamLeader: "Lead Dawit",
  },
  {
    id: "W-2",
    employeeId: "OVID-EMP-2",
    userId: "UID-W2",
    name: "Mulugeta Tadesse",
    company: "OVID Construction",
    department: "Structural",
    trade: "Carpenter",
    position: "Wall Formwork",
    zone: "Zone A",
    floor: 3,
    status: "Active",
    teamId: "T-1",
    hourlyRate: 90,
    joinedDate: "2025-02-01",
    gangChief: "Lead Dawit",
  },
  {
    id: "W-3",
    employeeId: "OVID-EMP-3",
    userId: "UID-W3",
    name: "Tigist Alemu",
    company: "OVID Construction",
    department: "Safety",
    trade: "Helper",
    position: "Worker",
    zone: "Zone B",
    floor: 2,
    status: "Inactive",
    teamId: "T-2",
    hourlyRate: 95,
    joinedDate: "2025-03-01",
    teamLeader: "Other Lead",
  },
];

const fixtureAttendance: AttendanceRecord[] = [
  {
    id: "ATT-1",
    workerId: "W-1",
    workerName: "Abebe Kebede",
    department: "Structural",
    trade: "Assembler",
    company: "OVID Construction",
    building: "B1",
    floor: 3,
    zone: "Zone A",
    date: TODAY,
    checkIn: "07:55:00",
    checkOut: "17:00:00",
    method: AttendanceMethod.FINGERPRINT,
    status: "Present",
    workingHours: 8,
    overtime: 1.5,
  },
  {
    id: "ATT-2",
    workerId: "W-2",
    workerName: "Mulugeta Tadesse",
    department: "Structural",
    trade: "Carpenter",
    company: "OVID Construction",
    building: "B1",
    floor: 3,
    zone: "Zone A",
    date: TODAY,
    checkIn: "08:30:00",
    checkOut: null,
    method: AttendanceMethod.FACE_RECOGNITION,
    status: "Late",
    workingHours: 6.5,
    overtime: 0,
  },
  {
    id: "ATT-3",
    workerId: "W-1",
    workerName: "Abebe Kebede",
    department: "Structural",
    trade: "Assembler",
    company: "OVID Construction",
    building: "B1",
    floor: 3,
    zone: "Zone A",
    date: "2026-07-01",
    checkIn: "08:00:00",
    checkOut: "16:30:00",
    method: AttendanceMethod.FINGERPRINT,
    status: "Present",
    workingHours: 7.5,
    overtime: 0.5,
  },
  {
    id: "ATT-4",
    workerId: "W-1",
    workerName: "Abebe Kebede",
    department: "Structural",
    trade: "Assembler",
    company: "OVID Construction",
    building: "B1",
    floor: 3,
    zone: "Zone A",
    date: "2026-06-28",
    checkIn: "08:00:00",
    checkOut: "16:00:00",
    method: AttendanceMethod.FINGERPRINT,
    status: "Present",
    workingHours: 8,
    overtime: 0,
  },
];

const fixtureTeams: Team[] = [
  {
    id: "T-1",
    name: "Alpha Slab",
    leaderId: "Lead Dawit",
    department: "Structural",
    memberIds: ["W-1", "W-2"],
    safetyScore: 90,
    qualityScore: 86,
    averageProductivity: 92,
  },
  {
    id: "T-2",
    name: "Beta Core",
    leaderId: "Other Lead",
    department: "Structural",
    memberIds: ["W-3"],
    safetyScore: 80,
    qualityScore: 84,
    averageProductivity: 88,
  },
];

const fixtureZones: ProjectZone[] = [
  {
    id: "Z-1",
    building: "B1",
    block: "Block A",
    tower: "Tower 1",
    floor: 3,
    zone: "Zone A",
    wallStatus: 70,
    columnStatus: 70,
    beamStatus: 70,
    slabStatus: 70,
    stairStatus: 70,
    liftCoreStatus: 70,
    startDate: "2026-06-01",
    targetDays: 30,
    completionPercentage: 70,
    status: "In Progress",
  },
  {
    id: "Z-2",
    building: "B1",
    block: "Block B",
    tower: "Tower 1",
    floor: 2,
    zone: "Zone B",
    wallStatus: 50,
    columnStatus: 50,
    beamStatus: 50,
    slabStatus: 50,
    stairStatus: 50,
    liftCoreStatus: 50,
    startDate: "2026-06-05",
    targetDays: 25,
    completionPercentage: 50,
    status: "Delayed",
  },
];

const fixtureEvaluations: PerformanceEvaluation[] = [
  {
    id: "EV-1",
    workerId: "W-1",
    workerName: "Abebe Kebede",
    date: "2026-06-15",
    discipline: 16,
    quality: 16,
    productivity: 16,
    safetyCompliance: 12,
    equipmentHandling: 8,
    teamwork: 8,
    attendance: 4,
    totalScore: 80,
    level: "Good",
    comment: "Solid",
    evaluatedBy: "Supervisor",
  },
  {
    id: "EV-2",
    workerId: "W-1",
    workerName: "Abebe Kebede",
    date: "2026-07-01",
    discipline: 19,
    quality: 19,
    productivity: 19,
    safetyCompliance: 14,
    equipmentHandling: 9,
    teamwork: 9,
    attendance: 5,
    totalScore: 94,
    level: "Excellent",
    comment: "Great",
    evaluatedBy: "Supervisor",
  },
  {
    id: "EV-3",
    workerId: "W-3",
    workerName: "Tigist Alemu",
    date: "2026-07-01",
    discipline: 12,
    quality: 12,
    productivity: 12,
    safetyCompliance: 9,
    equipmentHandling: 6,
    teamwork: 6,
    attendance: 3,
    totalScore: 60,
    level: "Average",
    comment: "Needs focus",
    evaluatedBy: "Supervisor",
  },
];

const fixturePanels: AluminumFormworkPanel[] = [
  {
    id: "P-1",
    serialNumber: "PNL-001",
    bundleNumber: "BND-01",
    size: "600x2400",
    type: PanelType.WALL,
    quantity: 1,
    location: "Zone A",
    zone: "Zone A",
    status: PanelStatus.IN_USE,
    usageCount: 12,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "P-2",
    serialNumber: "PNL-002",
    bundleNumber: "BND-01",
    size: "600x1200",
    type: PanelType.SLAB,
    quantity: 1,
    location: "Gate",
    zone: "Gate",
    status: PanelStatus.IN_TRANSIT,
    usageCount: 4,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "P-3",
    serialNumber: "PNL-003",
    bundleNumber: "BND-02",
    size: "150x2400",
    type: PanelType.CORNER,
    quantity: 1,
    location: "Yard",
    zone: "Yard",
    status: PanelStatus.WAITING_CLEANING,
    usageCount: 8,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "P-4",
    serialNumber: "PNL-004",
    bundleNumber: "BND-02",
    size: "300x1800",
    type: PanelType.BEAM,
    quantity: 1,
    location: "Workshop",
    zone: "Workshop",
    status: PanelStatus.UNDER_REPAIR,
    usageCount: 15,
    createdAt: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "P-5",
    serialNumber: "PNL-005",
    bundleNumber: "BND-03",
    size: "500x2400",
    type: PanelType.WALL,
    quantity: 1,
    location: "Scrap Yard",
    zone: "Scrap Yard",
    status: PanelStatus.DAMAGED,
    usageCount: 20,
    createdAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "P-6",
    serialNumber: "PNL-006",
    bundleNumber: "BND-03",
    size: "400x2400",
    type: PanelType.WALL,
    quantity: 1,
    location: "Unknown",
    zone: "Unknown",
    status: PanelStatus.MISSING,
    usageCount: 10,
    createdAt: "2026-01-06T00:00:00.000Z",
  },
];

const fixtureMovements: PanelMovementLog[] = [
  {
    id: "M-1",
    panelId: "P-2",
    fromLocation: "Main Store",
    fromZone: "Store",
    toLocation: "Site A",
    toZone: "Gate",
    movedBy: "Warehouse Mgr",
    truckPlate: "ET-1234",
    timestamp: `${TODAY}T08:15:00.000Z`,
  },
  {
    id: "M-2",
    panelId: "P-1",
    fromLocation: "Site A",
    fromZone: "Gate",
    toLocation: "Zone A",
    toZone: "Zone A",
    movedBy: "Store Owner",
    truckPlate: "et-1234",
    timestamp: `${TODAY}T09:00:00.000Z`,
  },
  {
    id: "M-3",
    panelId: "P-3",
    fromLocation: "Zone B",
    fromZone: "Zone B",
    toLocation: "Main Store",
    toZone: "Store",
    movedBy: "Gate Officer",
    truckPlate: "ET-9999",
    timestamp: `${TODAY}T10:30:00.000Z`,
  },
  {
    id: "M-4",
    panelId: "P-4",
    fromLocation: "Zone A",
    fromZone: "Zone A",
    toLocation: "Workshop",
    toZone: "Workshop",
    movedBy: "Gate Officer",
    truckPlate: "ET-7777",
    timestamp: "2026-07-01T14:00:00.000Z",
  },
];

const fixtureRecruitments: RecruitmentRequestRecord[] = [
  {
    id: "R-1",
    requestNo: "MRF-2026-001",
    project: "Bole Tower",
    department: "Structural",
    jobPosition: "Formwork Carpenter",
    requestedCount: 4,
    hiredCount: 1,
    employmentType: "Permanent",
    urgency: "High",
    requiredByDate: "2026-08-01",
    proposedMonthlySalary: 14000,
    qualificationsRequired: "TVET",
    justification: "Slab cycle",
    requestedBy: "Eng. Samuel",
    requestedById: "U-SH-1",
    requestedByRole: UserRole.SECTION_HEAD,
    exceedsManpowerLimit: false,
    approvedManpowerSnapshot: 6,
    actualHiredSnapshot: 1,
    remainingVacanciesSnapshot: 5,
    excessCount: 0,
    excessApprovalStatus: "Not Required",
    workflowStage: "Approved",
    status: "Approved",
    approvalHistory: [],
    supportingDocuments: [],
    stageSummary: "Approved",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "R-2",
    requestNo: "MRF-2026-002",
    project: "Bole Tower",
    department: "Engineering",
    jobPosition: "Site Engineer",
    requestedCount: 1,
    hiredCount: 0,
    employmentType: "Permanent",
    urgency: "Normal",
    requiredByDate: "2026-08-15",
    proposedMonthlySalary: 28000,
    qualificationsRequired: "BSc Civil",
    justification: "Block C",
    requestedBy: "Eng. Samuel",
    requestedById: "U-SH-1",
    requestedByRole: UserRole.SECTION_HEAD,
    exceedsManpowerLimit: false,
    approvedManpowerSnapshot: 3,
    actualHiredSnapshot: 1,
    remainingVacanciesSnapshot: 2,
    excessCount: 0,
    excessApprovalStatus: "Not Required",
    workflowStage: "Pending HR Manager",
    status: "Pending",
    approvalHistory: [],
    supportingDocuments: [],
    stageSummary: "Pending HR",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

const fixtureExcess: ExcessRecruitmentRequestRecord[] = [
  {
    id: "EX-1",
    requestNo: "ERR-2026-001",
    recruitmentRequestId: "R-2",
    recruitmentRequestNo: "MRF-2026-002",
    project: "Bole Tower",
    department: "Engineering",
    jobPosition: "Site Engineer",
    approvedQuantitySnapshot: 1,
    registeredCountSnapshot: 1,
    excessCount: 2,
    justification: "Schedule acceleration",
    requestedBy: "Eng. Samuel",
    requestedById: "U-SH-1",
    requestedByRole: UserRole.SECTION_HEAD,
    status: "Pending Director",
    auditHistory: [],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

const fixtureTasks: ErpTask[] = [
  {
    id: "TSK-1",
    taskId: "TSK-2026-001",
    taskName: "Inspect Zone A slab props",
    description: "Verify prop spacing",
    projectId: "P-BOLE",
    projectName: "Bole Tower",
    siteName: "Bole Heights",
    category: "Safety Rectification",
    priority: "High",
    status: "Pending",
    dueDate: TODAY,
    assignedToId: "UID-W1",
    assignedToName: "Abebe Kebede",
    assignedToRole: UserRole.WORKER,
    createdByName: "Supervisor",
    createdById: "U-SUP-1",
    createdAt: `${TODAY}T07:00:00.000Z`,
    updatedAt: `${TODAY}T07:00:00.000Z`,
  },
  {
    id: "TSK-2",
    taskId: "TSK-2026-002",
    taskName: "Completed inspection",
    description: "Done already",
    projectId: "P-BOLE",
    projectName: "Bole Tower",
    siteName: "Bole Heights",
    category: "Safety Rectification",
    priority: "Low",
    status: "Completed",
    dueDate: TODAY,
    assignedToId: "UID-W1",
    assignedToName: "Abebe Kebede",
    assignedToRole: UserRole.WORKER,
    createdByName: "Supervisor",
    createdById: "U-SUP-1",
    createdAt: `${TODAY}T07:00:00.000Z`,
    updatedAt: `${TODAY}T08:00:00.000Z`,
  },
  {
    id: "TSK-3",
    taskId: "TSK-2026-003",
    taskName: "Another worker task",
    description: "Assigned explicitly to W-2",
    projectId: "P-BOLE",
    projectName: "Bole Tower",
    siteName: "Bole Heights",
    category: "General Civil",
    priority: "Medium",
    status: "Pending",
    dueDate: TODAY,
    assignedToId: "UID-W2",
    assignedToName: "Mulugeta Tadesse",
    assignedToRole: UserRole.WORKER,
    createdByName: "Lead Dawit",
    createdById: "U-TL-1",
    createdAt: `${TODAY}T07:30:00.000Z`,
    updatedAt: `${TODAY}T07:30:00.000Z`,
  },
  {
    id: "TSK-4",
    taskId: "TSK-2026-004",
    taskName: "Director Budget Signoff",
    description: "Review quarterly budget",
    projectId: "P-BOLE",
    projectName: "Bole Tower",
    siteName: "Bole Heights",
    category: "General Civil",
    priority: "Critical",
    status: "In Progress",
    dueDate: TODAY,
    assignedToId: "",
    assignedToName: "Director",
    assignedToRole: UserRole.DIRECTOR,
    createdByName: "Finance Mgr",
    createdById: "U-FIN-1",
    createdAt: `${TODAY}T08:00:00.000Z`,
    updatedAt: `${TODAY}T08:00:00.000Z`,
  },
  {
    id: "TSK-5",
    taskId: "TSK-2026-005",
    taskName: "Cancelled director task",
    description: "Ignored",
    projectId: "P-BOLE",
    projectName: "Bole Tower",
    siteName: "Bole Heights",
    category: "General Civil",
    priority: "Low",
    status: "Cancelled",
    dueDate: TODAY,
    assignedToId: "",
    assignedToName: "Director",
    assignedToRole: UserRole.DIRECTOR,
    createdByName: "Finance Mgr",
    createdById: "U-FIN-1",
    createdAt: `${TODAY}T08:00:00.000Z`,
    updatedAt: `${TODAY}T08:00:00.000Z`,
  },
];

const fixtureData: RoleDashboardData = {
  workers: fixtureWorkers,
  attendance: fixtureAttendance,
  teams: fixtureTeams,
  zones: fixtureZones,
  evaluations: fixtureEvaluations,
  formworkPanels: fixturePanels,
  panelMovementLogs: fixtureMovements,
  recruitmentRequests: fixtureRecruitments,
  excessRecruitmentRequests: fixtureExcess,
  erpTasks: fixtureTasks,
};

function kpiMap(cards: ReturnType<typeof computeKpis>): Record<string, string | number> {
  return Object.fromEntries(cards.map((c) => [c.key, c.value]));
}

describe("Part A: Directory role merged into Director", () => {
  it("removes UserRole.DIRECTORY from enum and maps legacy Directory accounts cleanly", () => {
    const roleValues = Object.values(UserRole) as string[];
    expect(roleValues).not.toContain("Directory");
    expect((UserRole as Record<string, unknown>).DIRECTORY).toBeUndefined();
    expect(roleValues).toContain(UserRole.DIRECTOR);

    expect(normalizeLegacyRole("Directory")).toBe(UserRole.DIRECTOR);
    expect(normalizeLegacyRole(UserRole.WORKER)).toBe(UserRole.WORKER);

    expect(resolveUserRole({ role: "Directory", status: "Active" })).toBe(UserRole.DIRECTOR);
    expect(resolveUserRole({ role: "Directory", status: "Pending" })).toBe("Pending");
    expect(resolveUserRole({ role: "Pending", status: "Pending" })).toBe("Pending");
  });
});

describe("Part B: Role dashboards mapping, KPI computations, and rendering", () => {
  it("maps every UserRole exhaustively to a DashboardKind with complete metadata", () => {
    const allRoles = Object.values(UserRole);
    expect(Object.keys(DASHBOARD_KIND_BY_ROLE).sort()).toEqual([...allRoles].sort());

    for (const role of allRoles) {
      const kind = DASHBOARD_KIND_BY_ROLE[role];
      expect(kind).toBeTruthy();
      const meta = KIND_META[kind];
      expect(meta).toBeDefined();
      expect(meta.titleEn.trim().length).toBeGreaterThan(0);
      expect(meta.titleAm.trim().length).toBeGreaterThan(0);
      expect(meta.subtitleEn.trim().length).toBeGreaterThan(0);
      expect(meta.subtitleAm.trim().length).toBeGreaterThan(0);
      expect(meta.quickLinkTabs.length).toBeGreaterThan(0);
    }

    expect(resolveDashboardKind("Directory")).toBe("executive");
  });

  it("filters open tasks via tasksForActor (ignoring completed/cancelled/other users)", () => {
    const w1Actor: DashboardActor = {
      uid: "UID-W1",
      employeeId: "OVID-EMP-1",
      name: "Abebe Kebede",
      role: UserRole.WORKER,
    };
    const w1Tasks = tasksForActor(fixtureTasks, w1Actor);
    expect(w1Tasks.map((t) => t.id)).toEqual(["TSK-1"]);

    const dirActor: DashboardActor = {
      uid: "U-DIR-1",
      name: "Ato Girma",
      role: UserRole.DIRECTOR,
    };
    const dirTasks = tasksForActor(fixtureTasks, dirActor);
    expect(dirTasks.map((t) => t.id)).toEqual(["TSK-4"]);
  });

  it("computes real KPIs accurately for all 10 DashboardKinds", () => {
    const exec = kpiMap(
      computeKpis("executive", fixtureData, { uid: "U-DIR-1", role: UserRole.DIRECTOR }, TODAY)
    );
    expect(exec.workforceCount).toBe(3);
    expect(exec.presentTodayPct).toBe("67%");
    expect(exec.pendingApprovals).toBe(2);
    expect(exec.zonesInProgress).toBe(1);
    expect(exec.delayedZones).toBe(1);
    expect(exec.avgPerformance).toBe("78%");
    expect(exec.damagedMissingPanels).toBe(2);
    expect(exec.myOpenTasks).toBe(1);

    const hr = kpiMap(
      computeKpis("hr", fixtureData, { uid: "U-HR-1", role: UserRole.HR_MANAGER }, TODAY)
    );
    expect(hr.headcount).toBe(3);
    expect(hr.presentToday).toBe(2);
    expect(hr.lateToday).toBe(1);
    expect(hr.notCheckedIn).toBe(1);
    expect(hr.pendingRecruitment).toBe(1);
    expect(hr.approvedAwaitingReg).toBe(1);
    expect(hr.excessPendingDirector).toBe(1);

    const fin = kpiMap(
      computeKpis("finance", fixtureData, { uid: "U-FIN-1", role: UserRole.FINANCE_MANAGER }, TODAY)
    );
    expect(fin.workingHoursToday).toBe("14.5h");
    expect(fin.overtimeHoursToday).toBe("1.5h");
    expect(fin.workingHoursMonth).toBe("22h");
    expect(fin.overtimeHoursMonth).toBe("2h");
    expect(fin.payrollHeadcount).toBe(2);

    const eng = kpiMap(
      computeKpis(
        "siteEngineering",
        fixtureData,
        { uid: "U-ENG-1", role: UserRole.SITE_ENGINEER },
        TODAY
      )
    );
    expect(eng.zonesTotal).toBe(2);
    expect(eng.zonesInProgress).toBe(1);
    expect(eng.delayedZones).toBe(1);
    expect(eng.avgZoneCompletion).toBe("60%");
    expect(eng.avgTeamSafety).toBe("85%");
    expect(eng.avgTeamQuality).toBe("85%");
    expect(eng.crewPresentToday).toBe(2);

    const tk = kpiMap(
      computeKpis("timekeeping", fixtureData, { uid: "U-TK-1", role: UserRole.TIME_KEEPER }, TODAY)
    );
    expect(tk.checkedIn).toBe(2);
    expect(tk.notYetCheckedIn).toBe(1);
    expect(tk.late).toBe(1);
    expect(tk.checkedOut).toBe(1);
    expect(tk.insideNotCheckedOut).toBe(1);
    expect(tk.registeredWorkers).toBe(3);

    const leadActor: DashboardActor = {
      uid: "U-TL-1",
      name: "Lead Dawit",
      role: UserRole.TEAM_LEADER,
    };
    expect(workersOfLead(fixtureWorkers, leadActor).map((w) => w.id)).toEqual(["W-1", "W-2"]);
    const lead = kpiMap(computeKpis("fieldLead", fixtureData, leadActor, TODAY));
    expect(lead.myTeamSize).toBe(2);
    expect(lead.teamPresentToday).toBe(2);
    expect(lead.teamLateToday).toBe(1);
    expect(lead.teamNotInToday).toBe(0);
    expect(lead.teamAvgPerformance).toBe("87%");

    const workerLinked = kpiMap(
      computeKpis(
        "fieldWorker",
        fixtureData,
        { uid: "UID-W1", name: "Abebe Kebede", role: UserRole.WORKER },
        TODAY
      )
    );
    expect(workerLinked.myStatusToday).toBe("Present");
    expect(workerLinked.daysWorkedMonth).toBe(2);
    expect(workerLinked.hoursMonth).toBe("15.5h");
    expect(workerLinked.latestEvaluation).toBe("94%");
    expect(workerLinked.myOpenTasks).toBe(1);

    const workerUnlinked = kpiMap(
      computeKpis(
        "fieldWorker",
        fixtureData,
        { uid: "UID-UNKNOWN", name: "Stranger", role: UserRole.WORKER },
        TODAY
      )
    );
    expect(workerUnlinked.myStatusToday).toBe("—");
    expect(workerUnlinked.daysWorkedMonth).toBe("—");
    expect(workerUnlinked.hoursMonth).toBe("—");
    expect(workerUnlinked.latestEvaluation).toBe("—");

    const wh = kpiMap(
      computeKpis("warehouse", fixtureData, { uid: "U-WH-1", role: UserRole.WAREHOUSE_MANAGER }, TODAY)
    );
    expect(wh.formworkTotal).toBe(6);
    expect(wh.installedInUse).toBe(1);
    expect(wh.inTransit).toBe(1);
    expect(wh.waitingCleaningInspection).toBe(1);
    expect(wh.underRepair).toBe(1);
    expect(wh.damagedMissing).toBe(2);
    expect(wh.movementsToday).toBe(3);

    const gate = kpiMap(
      computeKpis("gate", fixtureData, { uid: "U-GT-1", role: UserRole.GATE_SECURITY_OFFICER }, TODAY)
    );
    expect(gate.movementsToday).toBe(3);
    expect(gate.distinctVehiclesToday).toBe(2);
    expect(gate.itemsInTransit).toBe(1);

    const sys = kpiMap(
      computeKpis("system", fixtureData, { uid: "U-SYS-1", role: UserRole.SYSTEM_OPERATOR }, TODAY)
    );
    expect(sys.workerRecords).toBe(3);
    expect(sys.attendanceToday).toBe(2);
    expect(sys.zones).toBe(2);
    expect(sys.formworkItems).toBe(6);
    expect(sys.allOpenTasks).toBe(3);
  });

  it("renders RoleDashboard and hides workspace links disallowed by hasAccess", () => {
    const onNavigate = vi.fn();
    const allowedTabs = new Set(["warehouseSiteStore", "notificationCenter"]);

    render(
      React.createElement(RoleDashboard, {
        currentUserRole: UserRole.GATE_SECURITY_OFFICER,
        currentUserProfile: { uid: "U-GT-1", displayName: "Gate Officer" },
        isAmharic: false,
        data: fixtureData,
        hasAccess: (tab) => allowedTabs.has(tab),
        tabTitle: (tab) => `Tab:${tab}`,
        onNavigate,
        today: TODAY,
      })
    );

    expect(screen.getByText("Gate Security & Dispatch Checkpoint")).toBeTruthy();
    expect(screen.getByText(UserRole.GATE_SECURITY_OFFICER)).toBeTruthy();
    expect(screen.getByText("Tab:warehouseSiteStore")).toBeTruthy();
    expect(screen.getByText("Tab:notificationCenter")).toBeTruthy();
    expect(screen.queryByText("Tab:securitySettings")).toBeNull();

    fireEvent.click(screen.getByText("Tab:warehouseSiteStore"));
    expect(onNavigate).toHaveBeenCalledWith("warehouseSiteStore");
  });

  it("shows only RoleDashboard for non-legacy roles unless pending recruitment approvals exist", () => {
    const { rerender } = render(
      React.createElement(Dashboard, {
        workers: fixtureWorkers,
        teams: fixtureTeams,
        zones: fixtureZones,
        attendance: fixtureAttendance,
        isAmharic: false,
        t: (k: string) => k,
        activeTab: "dashboard",
        setActiveTab: vi.fn(),
        onNavigateToTab: vi.fn(),
        currentUserRole: UserRole.GATE_SECURITY_OFFICER,
        currentUserProfile: { uid: "U-GT-1", displayName: "Gate Officer" },
        evaluations: fixtureEvaluations,
        formworkPanels: fixturePanels,
        panelMovementLogs: fixtureMovements,
        recruitmentRequests: [],
        excessRecruitmentRequests: [],
        erpTasks: [],
        hasAccess: (tab) => tab === "warehouseSiteStore",
        tabTitle: (tab) => tab,
      })
    );

    expect(screen.getByTestId("role-dashboard")).toBeTruthy();
    expect(screen.queryByText(/Aluminum Formwork Attendance & Productivity/i)).toBeNull();

    rerender(
      React.createElement(Dashboard, {
        workers: fixtureWorkers,
        teams: fixtureTeams,
        zones: fixtureZones,
        attendance: fixtureAttendance,
        isAmharic: false,
        t: (k: string) => k,
        activeTab: "dashboard",
        setActiveTab: vi.fn(),
        onNavigateToTab: vi.fn(),
        currentUserRole: UserRole.DIRECTOR,
        currentUserProfile: { uid: "U-DIR-1", displayName: "Ato Girma" },
        evaluations: fixtureEvaluations,
        formworkPanels: fixturePanels,
        panelMovementLogs: fixtureMovements,
        recruitmentRequests: fixtureRecruitments,
        excessRecruitmentRequests: fixtureExcess,
        erpTasks: fixtureTasks,
        hasAccess: () => true,
        tabTitle: (tab) => tab,
      })
    );

    expect(screen.getByTestId("role-dashboard")).toBeTruthy();
    expect(screen.getByText("Executive Command Dashboard")).toBeTruthy();
    expect(screen.getByText(/Aluminum Formwork Attendance & Productivity/i)).toBeTruthy();
  });
});
