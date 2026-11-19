import { beforeEach, describe, expect, it, vi } from "vitest";
import { DbService } from "../services/db";
import {
  buildHrmPayrollRunDraft,
  computeScheduleAttendanceMetrics,
  inferWorkerWorkLocationType,
  resolveWorkerSchedule,
} from "../services/hrmService";
import { processBiometricDeviceAttendanceEvent } from "../services/biometricMappingService";
import {
  AttendanceReportTypeId,
  buildAttendanceReportRows,
  computeAttendanceWorkflowDashboard,
  formatAddisAbabaDateTime,
  getMonthDateRange,
  getWeekDateRange,
  reconcileEmployeeAttendanceDay,
  reportAttendanceDiscrepancy,
  reviewAttendanceException,
  reviewManualCorrectionRequest,
  submitManualCorrectionRequest,
  transitionAttendanceApprovalStatus,
} from "../services/attendanceWorkflowService";
import {
  AttendanceAuditLog,
  AttendanceCorrectionRequest,
  AttendanceDeductionPolicy,
  AttendanceMethod,
  AttendanceRecord,
  AuditLog,
  BiometricDeviceMapping,
  BiometricDeviceRecord,
  LeaveRequestRecord,
  OvertimeRequestRecord,
  SalaryStructureRecord,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";

let memAttendance: AttendanceRecord[] = [];
let memUnmapped: UnmappedBiometricEvent[] = [];
let memOvertimeRequests: OvertimeRequestRecord[] = [];
let memAuditLogs: AuditLog[] = [];
let memCorrections: AttendanceCorrectionRequest[] = [];
let memPolicies: AttendanceDeductionPolicy[] = [];
let memAttendanceAuditLogs: AttendanceAuditLog[] = [];

function createFixtures() {
  const workers: Worker[] = [
    {
      id: "OVID-EMP-2026-0001",
      employeeId: "OVID-EMP-2026-0001",
      name: "Abebe Kebede",
      company: "OVID Real Estate",
      department: "Engineering",
      trade: "Site Engineer",
      position: "Site Engineer",
      joinedDate: "2026-01-05",
      assignedProject: "Bole Tower",
      currentSite: "Bole Tower",
      workLocationType: "Construction Site",
      status: "Active",
      teamId: "TEAM-1",
    },
    {
      id: "OVID-EMP-2026-0002",
      employeeId: "OVID-EMP-2026-0002",
      name: "Tigist Tesfaye",
      company: "OVID Real Estate",
      department: "HR",
      trade: "HR Officer",
      position: "HR Officer",
      joinedDate: "2026-01-10",
      assignedProject: "Head Office",
      currentSite: "Head Office",
      workLocationType: "Head Office",
      status: "Active",
      teamId: "TEAM-HQ",
    },
    {
      id: "OVID-EMP-2026-0003",
      employeeId: "OVID-EMP-2026-0003",
      name: "Dawit Mekonnen",
      company: "OVID Real Estate",
      department: "Security",
      trade: "Night Guard Supervisor",
      position: "Night Guard Supervisor",
      joinedDate: "2026-01-12",
      assignedProject: "Bole Tower",
      currentSite: "Bole Tower",
      workLocationType: "Construction Site",
      status: "Active",
      teamId: "TEAM-SEC",
    },
    {
      id: "OVID-EMP-2026-0004",
      employeeId: "OVID-EMP-2026-0004",
      name: "Selamawit Bekele",
      company: "OVID Real Estate",
      department: "Finance",
      trade: "Accountant",
      position: "Accountant",
      joinedDate: "2026-01-15",
      assignedProject: "Head Office",
      currentSite: "Head Office",
      workLocationType: "Head Office",
      status: "Active",
      teamId: "TEAM-FIN",
    },
  ];

  const schedules: WorkScheduleConfig[] = [
    {
      id: "SCH-COMP-DEFAULT",
      scheduleName: "Company Day Shift",
      scopeType: "Company",
      workLocationType: "ALL",
      project: "ALL",
      department: "ALL",
      schedulePeriodType: "Weekly",
      shiftStartTime: "08:00",
      shiftEndTime: "17:00",
      isNightShift: false,
      breakMinutes: 60,
      standardDailyHours: 8,
      graceMinutesLate: 15,
      restDays: ["Sunday"],
      holidays: [{ date: "2026-05-01", name: "Labor Day" }],
      overtimeMultiplierWeekday: 1.5,
      overtimeMultiplierRestDay: 2.0,
      overtimeMultiplierHoliday: 2.5,
      isActive: true,
      updatedBy: "HR Manager",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "SCH-HQ-FINANCE",
      scheduleName: "Head Office Early Desk Shift",
      scopeType: "Department",
      workLocationType: "Head Office",
      project: "ALL",
      department: "Finance",
      schedulePeriodType: "Monthly",
      effectiveFrom: "2026-04-01",
      effectiveTo: "2026-12-31",
      shiftStartTime: "08:30",
      shiftEndTime: "17:30",
      isNightShift: false,
      breakMinutes: 60,
      standardDailyHours: 8,
      graceMinutesLate: 10,
      restDays: ["Saturday", "Sunday"],
      holidays: [],
      overtimeMultiplierWeekday: 1.5,
      overtimeMultiplierRestDay: 2.0,
      overtimeMultiplierHoliday: 2.5,
      isActive: true,
      updatedBy: "HR Manager",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "SCH-NIGHT-DAWIT",
      scheduleName: "Bole Tower Security Night Shift",
      scopeType: "Employee",
      workLocationType: "Construction Site",
      project: "Bole Tower",
      department: "Security",
      workerId: "OVID-EMP-2026-0003",
      employeeId: "OVID-EMP-2026-0003",
      employeeName: "Dawit Mekonnen",
      schedulePeriodType: "Weekly",
      effectiveFrom: "2026-04-01",
      shiftStartTime: "22:00",
      shiftEndTime: "06:00",
      isNightShift: true,
      breakMinutes: 30,
      standardDailyHours: 7.5,
      graceMinutesLate: 15,
      restDays: ["Sunday"],
      holidays: [],
      overtimeMultiplierWeekday: 1.5,
      overtimeMultiplierRestDay: 2.0,
      overtimeMultiplierHoliday: 2.5,
      isActive: true,
      updatedBy: "HR Manager",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "SCH-EXPIRED",
      scheduleName: "Expired Q1 Shift",
      scopeType: "Employee",
      workLocationType: "Construction Site",
      project: "Bole Tower",
      department: "Engineering",
      workerId: "OVID-EMP-2026-0001",
      employeeId: "OVID-EMP-2026-0001",
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-03-31",
      shiftStartTime: "07:00",
      shiftEndTime: "15:00",
      isNightShift: false,
      breakMinutes: 30,
      standardDailyHours: 7.5,
      graceMinutesLate: 5,
      restDays: ["Sunday"],
      holidays: [],
      overtimeMultiplierWeekday: 1.5,
      overtimeMultiplierRestDay: 2.0,
      overtimeMultiplierHoliday: 2.5,
      isActive: true,
      updatedBy: "HR Manager",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const devices: BiometricDeviceRecord[] = [
    {
      id: "BIODEV-G3-01",
      deviceCode: "ZK-G3-SITE-01",
      deviceName: "Bole Tower Main Gate G3 Pro",
      manufacturer: "ZKTeco",
      model: "G3 Pro",
      serialNumber: "ZKG3PRO-9001",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectName: "Bole Tower",
      deviceLocation: "Main Gate",
      status: "Active",
      connectionVerified: true,
      lastHandshakeAt: new Date().toISOString(),
      lastEventAt: new Date().toISOString(), // Online
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "BIODEV-MB360-01",
      deviceCode: "ZK-MB360-HQ-01",
      deviceName: "Head Office Reception MB360 Plus",
      manufacturer: "ZKTeco",
      model: "MB360 Plus",
      serialNumber: "ZKMB360-7002",
      workLocationType: "Head Office",
      projectId: "Head Office",
      projectName: "Head Office",
      deviceLocation: "HQ Lobby",
      status: "Active",
      lastEventAt: "2026-04-01T06:00:00.000Z", // Stale -> Pending Sync / Offline
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "BIODEV-OLD-01",
      deviceCode: "ZK-OLD-01",
      deviceName: "Retired Gate Terminal",
      manufacturer: "ZKTeco",
      model: "G3 Pro",
      serialNumber: "ZKG3-OLD-01",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectName: "Bole Tower",
      deviceLocation: "North Gate",
      status: "Inactive",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const mappings: BiometricDeviceMapping[] = [
    {
      id: "BMAP-1",
      workerRecordId: "OVID-EMP-2026-0001",
      employeeId: "OVID-EMP-2026-0001",
      employeeNameSnapshot: "Abebe Kebede",
      departmentSnapshot: "Engineering",
      positionSnapshot: "Site Engineer",
      employmentStatusSnapshot: "Active",
      biometricUserId: "101",
      deviceId: "BIODEV-G3-01",
      deviceNameSnapshot: "Bole Tower Main Gate G3 Pro",
      deviceModelSnapshot: "G3 Pro",
      deviceSerialNumberSnapshot: "ZKG3PRO-9001",
      workLocationId: "SITE-BOLE-TOWER",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectNameSnapshot: "Bole Tower",
      effectiveDate: "2026-01-05",
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "BMAP-2",
      workerRecordId: "OVID-EMP-2026-0003",
      employeeId: "OVID-EMP-2026-0003",
      employeeNameSnapshot: "Dawit Mekonnen",
      departmentSnapshot: "Security",
      positionSnapshot: "Night Guard Supervisor",
      employmentStatusSnapshot: "Active",
      biometricUserId: "303",
      deviceId: "BIODEV-G3-01",
      deviceNameSnapshot: "Bole Tower Main Gate G3 Pro",
      deviceModelSnapshot: "G3 Pro",
      deviceSerialNumberSnapshot: "ZKG3PRO-9001",
      workLocationId: "SITE-BOLE-TOWER",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectNameSnapshot: "Bole Tower",
      effectiveDate: "2026-01-12",
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-12T00:00:00.000Z",
      updatedAt: "2026-01-12T00:00:00.000Z",
    },
  ];

  const leaves: LeaveRequestRecord[] = [
    {
      id: "LVR-APPROVED-1",
      requestNo: "LV-2026-04-001",
      employeeId: "OVID-EMP-2026-0002",
      workerId: "OVID-EMP-2026-0002",
      workerName: "Tigist Tesfaye",
      project: "Head Office",
      department: "HR",
      leaveType: "Annual Leave",
      startDate: "2026-04-20",
      endDate: "2026-04-21",
      totalDays: 2,
      reason: "Scheduled family travel",
      status: "Approved",
      createdById: "HR-2",
      createdAt: "2026-04-10T08:00:00.000Z",
      updatedAt: "2026-04-12T08:00:00.000Z",
    },
  ];

  return { workers, schedules, devices, mappings, leaves };
}

describe("Attendance Workflow Implementation — Part 1", () => {
  beforeEach(() => {
    memAttendance = [];
    memUnmapped = [];
    memOvertimeRequests = [];
    memAuditLogs = [];
    memCorrections = [];
    memPolicies = [];
    memAttendanceAuditLogs = [];
    vi.restoreAllMocks();
    vi.spyOn(DbService, "saveUnmappedBiometricEvent").mockImplementation(async (evt) => {
      memUnmapped.push(evt);
    });
    vi.spyOn(DbService, "addBiometricMappingAuditLog").mockImplementation(async () => {});
    vi.spyOn(DbService, "addAttendanceRecord").mockImplementation(async (rec) => {
      const idx = memAttendance.findIndex((a) => a.id === rec.id);
      if (idx >= 0) memAttendance[idx] = rec;
      else memAttendance.push(rec);
    });
    vi.spyOn(DbService, "updateAttendanceRecord").mockImplementation(async (rec) => {
      const idx = memAttendance.findIndex((a) => a.id === rec.id);
      if (idx >= 0) memAttendance[idx] = rec;
      else memAttendance.push(rec);
    });
    vi.spyOn(DbService, "saveOvertimeRequest").mockImplementation(async (ot) => {
      memOvertimeRequests.push(ot);
    });
    vi.spyOn(DbService, "addAuditLog").mockImplementation(async (log) => {
      memAuditLogs.push(log);
    });
    vi.spyOn(DbService, "saveAttendanceCorrection").mockImplementation(async (cor) => {
      const idx = memCorrections.findIndex((c) => c.id === cor.id);
      if (idx >= 0) memCorrections[idx] = cor;
      else memCorrections.push(cor);
    });
    vi.spyOn(DbService, "saveAttendanceDeductionPolicy").mockImplementation(async (pol) => {
      const idx = memPolicies.findIndex((p) => p.id === pol.id);
      if (idx >= 0) memPolicies[idx] = pol;
      else memPolicies.push(pol);
    });
    vi.spyOn(DbService, "addAttendanceAuditLog").mockImplementation(async (log) => {
      memAttendanceAuditLogs.push(log);
    });
  });

  it("resolves work location & schedule precedence (Employee > Dept+Location > Company) and ignores expired shifts", () => {
    const { workers, schedules } = createFixtures();

    expect(inferWorkerWorkLocationType(workers[0])).toBe("Construction Site");
    expect(inferWorkerWorkLocationType(workers[1])).toBe("Head Office");

    // Abebe's employee schedule expired on 2026-03-31, so on 2026-04-20 he falls back to Company Day Shift
    const abebeApril = resolveWorkerSchedule(workers[0], schedules, "2026-04-20");
    expect(abebeApril?.id).toBe("SCH-COMP-DEFAULT");

    // On 2026-02-15 his Q1 employee shift WAS active
    const abebeFeb = resolveWorkerSchedule(workers[0], schedules, "2026-02-15");
    expect(abebeFeb?.id).toBe("SCH-EXPIRED");

    // Dawit gets his Employee-specific Night Shift
    const dawitSched = resolveWorkerSchedule(workers[2], schedules, "2026-04-20");
    expect(dawitSched?.id).toBe("SCH-NIGHT-DAWIT");

    // Selamawit (Finance @ Head Office) gets Department+WorkLocation shift
    const finSched = resolveWorkerSchedule(workers[3], schedules, "2026-04-20");
    expect(finSched?.id).toBe("SCH-HQ-FINANCE");
  });

  it("computes night shifts crossing midnight, break deductions, late minutes, and overtime candidates", () => {
    const { workers, schedules } = createFixtures();
    const nightShift = resolveWorkerSchedule(workers[2], schedules, "2026-04-20");

    // Shift 22:00 - 06:00 (30m break, 7.5h standard). Clock in 22:30 (30m late), clock out 07:30 next day (9h span - 0.5h = 8.5h net)
    const lateOtMetrics = computeScheduleAttendanceMetrics({
      date: "2026-04-20",
      checkIn: "22:30",
      checkOut: "07:30",
      schedule: nightShift,
      workerId: workers[2].id,
    });
    expect(lateOtMetrics.status).toBe("Late");
    expect(lateOtMetrics.lateArrivalMinutes).toBe(30);
    expect(lateOtMetrics.workingHours).toBe(7.5);
    expect(lateOtMetrics.overtimeCandidateHours).toBe(1);
    expect(lateOtMetrics.overtime).toBe(1); // Computed raw OT candidate; Payroll requires HR Manager final approval
    expect(lateOtMetrics.punchCompleteness).toBe("Complete");
    expect(lateOtMetrics.hrReviewStatus).toBe("Pending HR Review");

    // Arrival after midnight (00:20) on a 22:00 night shift -> 140 minutes late!
    const postMidnightLate = computeScheduleAttendanceMetrics({
      date: "2026-04-20",
      checkIn: "00:20",
      checkOut: "06:00",
      schedule: nightShift,
      workerId: workers[2].id,
    });
    expect(postMidnightLate.status).toBe("Late");
    expect(postMidnightLate.lateArrivalMinutes).toBe(140);
    expect(postMidnightLate.workingHours).toBe(5.17);
  });

  it("NEVER fabricates missing Check-In or Check-Out times and quarantines unauthorized/inactive/unmatched biometric events", async () => {
    const { workers, schedules, devices, mappings, leaves } = createFixtures();

    // Missing Check-Out holds hours at 0 and routes to Pending HR Review
    const incompleteMetrics = computeScheduleAttendanceMetrics({
      date: "2026-04-20",
      checkIn: "08:05",
      checkOut: null,
      schedule: schedules[0],
      workerId: workers[0].id,
    });
    expect(incompleteMetrics.workingHours).toBe(0);
    expect(incompleteMetrics.overtime).toBe(0);
    expect(incompleteMetrics.punchCompleteness).toBe("Missing Check-Out");
    expect(incompleteMetrics.missingPunchType).toBe("Missing Check-Out");
    expect(incompleteMetrics.hrReviewStatus).toBe("Pending HR Review");

    // Explicit Biometric Check-Out with NO Check-In must NOT copy checkOut into checkIn!
    const bioCheckoutOnly = await processBiometricDeviceAttendanceEvent({
      deviceId: "BIODEV-G3-01",
      biometricUserId: "101",
      eventTime: "2026-04-20T14:15:00Z", // 17:15 Addis Ababa
      punchType: "Check-Out",
      devices,
      mappings,
      workers,
      schedules,
      approvedLeaves: leaves,
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
      onSaveAttendance: async (rec) => {
        memAttendance.push(rec);
      },
    });
    expect(bioCheckoutOnly.resolved).toBe(true);
    expect(bioCheckoutOnly.attendanceRecord?.checkIn).toBeNull();
    expect(bioCheckoutOnly.attendanceRecord?.checkOut).toBe("17:15:00");
    expect(bioCheckoutOnly.attendanceRecord?.workingHours).toBe(0);
    expect(bioCheckoutOnly.attendanceRecord?.missingPunchType).toBe("Missing Check-In");
    expect(bioCheckoutOnly.attendanceRecord?.hrReviewStatus).toBe("Pending HR Review");

    // Duplicate punch within 5 minutes is ignored
    const dup = await processBiometricDeviceAttendanceEvent({
      deviceId: "BIODEV-G3-01",
      biometricUserId: "101",
      eventTime: "2026-04-20T14:17:00Z",
      punchType: "Check-Out",
      devices,
      mappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });
    expect(dup.duplicatePrevented).toBe(true);

    // Unauthorized device -> quarantined with exceptionCategory = "Unauthorized Device"
    const unauth = await processBiometricDeviceAttendanceEvent({
      deviceId: "ROGUE-DEV-99",
      biometricUserId: "101",
      eventTime: "2026-04-20T05:05:00Z",
      punchType: "Check-In",
      devices,
      mappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });
    expect(unauth.resolved).toBe(false);
    expect(unauth.unmappedEvent?.exceptionCategory).toBe("Unauthorized Device");

    // Inactive device -> quarantined with exceptionCategory = "Inactive Device"
    const inactiveDev = await processBiometricDeviceAttendanceEvent({
      deviceId: "BIODEV-OLD-01",
      biometricUserId: "101",
      eventTime: "2026-04-20T05:05:00Z",
      punchType: "Check-In",
      devices,
      mappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });
    expect(inactiveDev.resolved).toBe(false);
    expect(inactiveDev.unmappedEvent?.exceptionCategory).toBe("Inactive Device");
  });

  it("enforces strict HR exception resolution, audit notes, and overtime approval payroll linking", async () => {
    const { workers, schedules, leaves } = createFixtures();

    const incompleteRec: AttendanceRecord = {
      id: "ATT-MISS-1",
      workerId: "OVID-EMP-2026-0001",
      workerName: "Abebe Kebede",
      department: "Engineering",
      trade: "Site Engineer",
      company: "OVID Real Estate",
      building: "Bole Tower",
      floor: 0,
      zone: "Bole Tower",
      workLocationType: "Construction Site",
      date: "2026-04-20",
      checkIn: "08:00:00",
      checkOut: null,
      status: "Present",
      workingHours: 0,
      overtime: 0,
      punchCompleteness: "Missing Check-Out",
      missingPunchType: "Missing Check-Out",
      hrReviewStatus: "Pending HR Review",
      method: AttendanceMethod.FINGERPRINT,
    };
    memAttendance.push(incompleteRec);

    // Unauthorized role rejected
    await expect(
      reviewAttendanceException({
        record: incompleteRec,
        action: "Complete Missing Punch",
        verifiedCheckOut: "19:00",
        reviewNotes: "Verified by gate log",
        worker: workers[0],
        schedules,
        approvedLeaves: leaves,
        actorName: "Site Worker",
        actorUid: "USR-W1",
        actorRole: UserRole.WORKER,
      })
    ).rejects.toThrow(/Authorization Error/);

    // Missing verified timestamp rejected
    await expect(
      reviewAttendanceException({
        record: incompleteRec,
        action: "Complete Missing Punch",
        verifiedCheckOut: "",
        reviewNotes: "Verified by gate log",
        worker: workers[0],
        schedules,
        approvedLeaves: leaves,
        actorName: "HR Manager",
        actorUid: "HR-1",
        actorRole: UserRole.HR_MANAGER,
      })
    ).rejects.toThrow(/Verified Check-Out time is required/);

    // Complete missing punch -> recalculates 10h net = 8h regular + 2h OT candidate
    const completed = await reviewAttendanceException({
      record: incompleteRec,
      action: "Complete Missing Punch",
      verifiedCheckOut: "19:00",
      reviewNotes: "Site engineer signed gate log before departure",
      worker: workers[0],
      schedules,
      approvedLeaves: leaves,
      actorName: "HR Manager",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(completed.updatedRecord.checkOut).toBe("19:00:00");
    expect(completed.updatedRecord.workingHours).toBe(8);
    expect(completed.updatedRecord.overtimeCandidateHours).toBe(2);
    expect(completed.updatedRecord.missingPunchType).toBe("None");
    expect(completed.updatedRecord.punchCompleteness).toBe("Complete");

    // Approve Overtime -> grants 2h approved OT and writes OvertimeRequestRecord
    const otApproved = await reviewAttendanceException({
      record: completed.updatedRecord,
      action: "Approve Overtime",
      reviewNotes: "Concrete pour supervision approved by PM",
      worker: workers[0],
      schedules,
      approvedLeaves: leaves,
      actorName: "HR Manager",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(otApproved.updatedRecord.overtime).toBe(2);
    expect(otApproved.updatedRecord.hrReviewStatus).toBe("Approved");
    expect(otApproved.createdOvertimeRequest?.hoursRequested).toBe(2);
    expect(otApproved.createdOvertimeRequest?.status).toBe("Approved");
    expect(memAuditLogs.length).toBeGreaterThanOrEqual(2);
  });

  it("computes Daily, Weekly, and Monthly rollups, approved leave vs unexcused absence, and dashboard filters", () => {
    const { workers, schedules, devices, leaves } = createFixtures();

    const week = getWeekDateRange("2026-04-20"); // Mon 2026-04-20 .. Sun 2026-04-26
    expect(week.startDate).toBe("2026-04-20");
    expect(week.endDate).toBe("2026-04-26");
    expect(getMonthDateRange("2026-02")).toEqual({
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    const records: AttendanceRecord[] = [
      {
        id: "ATT-1",
        workerId: "OVID-EMP-2026-0001",
        workerName: "Abebe Kebede",
        department: "Engineering",
        trade: "Site Engineer",
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        workLocationType: "Construction Site",
        date: "2026-04-20",
        checkIn: "08:30:00",
        checkOut: "16:30:00",
        status: "Late",
        workingHours: 7,
        overtime: 0,
        overtimeCandidateHours: 0,
        lateArrivalMinutes: 30,
        earlyDepartureMinutes: 30,
        punchCompleteness: "Complete",
        missingPunchType: "None",
        hrReviewStatus: "Pending HR Review",
        method: AttendanceMethod.FINGERPRINT,
      },
      {
        id: "ATT-2",
        workerId: "OVID-EMP-2026-0003",
        workerName: "Dawit Mekonnen",
        department: "Security",
        trade: "Night Guard Supervisor",
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        workLocationType: "Construction Site",
        date: "2026-04-20",
        checkIn: "22:00:00",
        checkOut: null,
        status: "Present",
        workingHours: 0,
        overtime: 0,
        overtimeCandidateHours: 0,
        punchCompleteness: "Missing Check-Out",
        missingPunchType: "Missing Check-Out",
        hrReviewStatus: "Pending HR Review",
        method: AttendanceMethod.FINGERPRINT,
      },
    ];

    const dashboardAll = computeAttendanceWorkflowDashboard({
      workers,
      attendance: records,
      schedules,
      leaveRequests: leaves,
      overtimeRequests: [],
      devices,
      unmappedEvents: [],
      filters: {
        periodMode: "daily",
        anchorDate: "2026-04-20",
        selectedMonth: "2026-04",
        employeeFilter: "ALL",
        departmentFilter: "ALL",
        projectFilter: "ALL",
        workLocationFilter: "ALL",
      },
    });

    // Present: Abebe (Late) + Dawit (Missing Check-Out) = 2
    expect(dashboardAll.presentCount).toBe(2);
    expect(dashboardAll.lateCount).toBe(1);
    expect(dashboardAll.earlyDepartureCount).toBe(1);
    expect(dashboardAll.missingPunchCount).toBe(1);
    // Tigist is on Approved Leave (2026-04-20), Selamawit has no punch -> Absent = 1
    expect(dashboardAll.absentCount).toBe(1);
    expect(dashboardAll.absentWorkersToday.find((x) => x.workerId === "OVID-EMP-2026-0002")?.dayStatus).toBe("Leave");
    expect(dashboardAll.absentWorkersToday.find((x) => x.workerId === "OVID-EMP-2026-0004")?.dayStatus).toBe("Absent");
    expect(dashboardAll.deviceStatusSummary.onlineConnected).toBe(1);
    expect(dashboardAll.deviceStatusSummary.offlineOrUnverified).toBe(1);
    expect(dashboardAll.deviceStatusSummary.inactive).toBe(1);

    // WorkLocation Filter: Head Office only shows Tigist & Selamawit (0 punches on site)
    const dashboardHq = computeAttendanceWorkflowDashboard({
      workers,
      attendance: records,
      schedules,
      leaveRequests: leaves,
      overtimeRequests: [],
      devices,
      unmappedEvents: [],
      filters: {
        periodMode: "weekly",
        anchorDate: "2026-04-20",
        selectedMonth: "2026-04",
        employeeFilter: "ALL",
        departmentFilter: "ALL",
        projectFilter: "ALL",
        workLocationFilter: "Head Office",
      },
    });
    expect(dashboardHq.filteredWorkers.map((w) => w.id)).toEqual([
      "OVID-EMP-2026-0002",
      "OVID-EMP-2026-0004",
    ]);
    expect(dashboardHq.weeklyRows.find((r) => r.workerId === "OVID-EMP-2026-0002")?.leaveDays).toBe(2);
  });
});

describe("Attendance Workflow Implementation — Part 2", () => {
  beforeEach(() => {
    memAttendance = [];
    memUnmapped = [];
    memOvertimeRequests = [];
    memAuditLogs = [];
    memCorrections = [];
    memPolicies = [];
    memAttendanceAuditLogs = [];
    vi.restoreAllMocks();
    vi.spyOn(DbService, "saveUnmappedBiometricEvent").mockImplementation(async (evt) => {
      memUnmapped.push(evt);
    });
    vi.spyOn(DbService, "addBiometricMappingAuditLog").mockImplementation(async () => {});
    vi.spyOn(DbService, "addAttendanceRecord").mockImplementation(async (rec) => {
      const idx = memAttendance.findIndex((a) => a.id === rec.id);
      if (idx >= 0) memAttendance[idx] = rec;
      else memAttendance.push(rec);
    });
    vi.spyOn(DbService, "updateAttendanceRecord").mockImplementation(async (rec) => {
      const idx = memAttendance.findIndex((a) => a.id === rec.id);
      if (idx >= 0) memAttendance[idx] = rec;
      else memAttendance.push(rec);
    });
    vi.spyOn(DbService, "saveOvertimeRequest").mockImplementation(async (ot) => {
      memOvertimeRequests.push(ot);
    });
    vi.spyOn(DbService, "addAuditLog").mockImplementation(async (log) => {
      memAuditLogs.push(log);
    });
    vi.spyOn(DbService, "saveAttendanceCorrection").mockImplementation(async (cor) => {
      const idx = memCorrections.findIndex((c) => c.id === cor.id);
      if (idx >= 0) memCorrections[idx] = cor;
      else memCorrections.push(cor);
    });
    vi.spyOn(DbService, "saveAttendanceDeductionPolicy").mockImplementation(async (pol) => {
      const idx = memPolicies.findIndex((p) => p.id === pol.id);
      if (idx >= 0) memPolicies[idx] = pol;
      else memPolicies.push(pol);
    });
    vi.spyOn(DbService, "addAttendanceAuditLog").mockImplementation(async (log) => {
      memAttendanceAuditLogs.push(log);
    });
  });

  it("enforces STRICT HR Manager-only final approval RBAC and supports Site Manager discrepancy reporting", async () => {
    const { workers } = createFixtures();
    const rec: AttendanceRecord = {
      id: "ATT-P2-RBAC",
      workerId: workers[0].id,
      workerName: workers[0].name,
      department: workers[0].department,
      trade: workers[0].trade,
      company: "OVID Real Estate",
      building: "Bole Tower",
      floor: 0,
      zone: "Bole Tower",
      workLocationType: "Construction Site",
      date: "2026-04-22",
      checkIn: "08:02:00",
      checkOut: "17:05:00",
      status: "Present",
      workingHours: 8,
      overtime: 0,
      punchCompleteness: "Complete",
      missingPunchType: "None",
      hrReviewStatus: "Pending HR Review",
      finalApprovalStatus: "Pending",
      method: AttendanceMethod.FINGERPRINT,
      timezone: "Africa/Addis_Ababa",
    };
    memAttendance.push(rec);

    // Every role other than UserRole.HR_MANAGER must be blocked from Final Approve or Reject
    const nonHrManagerRoles: UserRole[] = [
      UserRole.HR,
      UserRole.DIRECTOR,
      UserRole.SUPER_ADMIN,
      UserRole.PROJECT_MANAGER,
      UserRole.FINANCE_MANAGER,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_MANAGER,
      UserRole.WORKER,
    ];
    for (const blockedRole of nonHrManagerRoles) {
      await expect(
        transitionAttendanceApprovalStatus({
          record: rec,
          action: "Final Approve",
          comments: "Attempting unauthorized final approval",
          actorName: `Actor ${blockedRole}`,
          actorUid: `UID-${blockedRole}`,
          actorRole: blockedRole,
        })
      ).rejects.toThrow(/Authorization Error/);

      await expect(
        transitionAttendanceApprovalStatus({
          record: rec,
          action: "Reject",
          comments: "Attempting unauthorized rejection",
          actorName: `Actor ${blockedRole}`,
          actorUid: `UID-${blockedRole}`,
          actorRole: blockedRole,
        })
      ).rejects.toThrow(/Authorization Error/);
    }

    // Site Manager (Project Manager / Site Engineer) can report discrepancy -> sets Open flag & Under Review
    const flagged = await reportAttendanceDiscrepancy({
      record: rec,
      discrepancyNotes: "Site logbook shows employee stayed on concrete slab until 18:00",
      actorName: "Site Manager Solomon",
      actorUid: "PM-1",
      actorRole: UserRole.PROJECT_MANAGER,
    });
    expect(flagged.finalApprovalStatus).toBe("Under Review");
    expect(flagged.discrepancyFlag?.status).toBe("Open");
    expect(flagged.payrollFinalized).toBe(false);

    // HR Officer (UserRole.HR) can review/prepare or return for correction
    const officerPrepared = await transitionAttendanceApprovalStatus({
      record: flagged,
      action: "Prepare / Mark Under Review",
      comments: "Verified gate logbook attachment by HR Officer",
      actorName: "Tigist (HR Officer)",
      actorUid: "HR-OFF-1",
      actorRole: UserRole.HR,
    });
    expect(officerPrepared.finalApprovalStatus).toBe("Under Review");
    expect(officerPrepared.payrollFinalized).toBe(false);

    const returned = await transitionAttendanceApprovalStatus({
      record: officerPrepared,
      action: "Return for Correction",
      comments: "Please attach site supervisor counter-signature",
      actorName: "Tigist (HR Officer)",
      actorUid: "HR-OFF-1",
      actorRole: UserRole.HR,
    });
    expect(returned.finalApprovalStatus).toBe("Returned for Correction");

    // Missing punch record cannot be final-approved by HR Manager until resolved
    const incompleteRec: AttendanceRecord = {
      ...rec,
      id: "ATT-P2-MISS-BLOCK",
      checkOut: null,
      workingHours: 0,
      punchCompleteness: "Missing Check-Out",
      missingPunchType: "Missing Check-Out",
    };
    await expect(
      transitionAttendanceApprovalStatus({
        record: incompleteRec,
        action: "Final Approve",
        comments: "Should fail because checkOut is still missing",
        actorName: "Mekdes (HR Manager)",
        actorUid: "HRM-1",
        actorRole: UserRole.HR_MANAGER,
      })
    ).rejects.toThrow(/unresolved/i);

    // HR Manager gives final approval -> sets Approved, payrollFinalized = true, resolves open discrepancy, logs audit
    const finalApproved = await transitionAttendanceApprovalStatus({
      record: returned,
      action: "Final Approve",
      comments: "Verified and approved for monthly payroll run",
      actorName: "Mekdes (HR Manager)",
      actorUid: "HRM-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(finalApproved.finalApprovalStatus).toBe("Approved");
    expect(finalApproved.payrollFinalized).toBe(true);
    expect(finalApproved.finalApprovedBy).toBe("Mekdes (HR Manager)");
    expect(finalApproved.discrepancyFlag?.status).toBe("Resolved");
    expect(memAttendanceAuditLogs.length).toBeGreaterThanOrEqual(4);
    expect(memAttendanceAuditLogs.every((l) => l.timezone === "Africa/Addis_Ababa")).toBe(true);
    expect(formatAddisAbabaDateTime("2026-04-22T05:02:00Z")).toContain("EAT");
  });

  it("handles manual corrections while ALWAYS preserving original biometric events and gating updates on HR Manager approval", async () => {
    const { workers, schedules, leaves } = createFixtures();
    const bioIncomplete: AttendanceRecord = {
      id: "ATT-COR-1",
      workerId: workers[0].id,
      workerName: workers[0].name,
      department: workers[0].department,
      trade: workers[0].trade,
      company: "OVID Real Estate",
      building: "Bole Tower",
      floor: 0,
      zone: "Bole Tower",
      workLocationType: "Construction Site",
      date: "2026-04-23",
      checkIn: "08:04:00",
      checkOut: null,
      status: "Present",
      workingHours: 0,
      overtime: 0,
      punchCompleteness: "Missing Check-Out",
      missingPunchType: "Missing Check-Out",
      hrReviewStatus: "Pending HR Review",
      finalApprovalStatus: "Pending",
      method: AttendanceMethod.FINGERPRINT,
      biometricDeviceId: "BIODEV-G3-01",
      biometricDeviceName: "Bole Tower Main Gate G3 Pro",
      biometricUserId: "101",
      timezone: "Africa/Addis_Ababa",
    };
    memAttendance.push(bioIncomplete);

    // Reason & missing punch time validation
    await expect(
      submitManualCorrectionRequest({
        record: bioIncomplete,
        worker: workers[0],
        correctionType: "Missing Check-Out",
        proposedCheckIn: "08:04",
        proposedCheckOut: "18:04",
        proposedStatus: "Present",
        reason: "   ",
        actorName: "Site Supervisor",
        actorUid: "SUP-1",
        actorRole: UserRole.SECTION_HEAD,
      })
    ).rejects.toThrow(/reason is mandatory/i);

    await expect(
      submitManualCorrectionRequest({
        record: bioIncomplete,
        worker: workers[0],
        correctionType: "Missing Check-Out",
        proposedCheckIn: "08:04",
        proposedCheckOut: null,
        proposedStatus: "Present",
        reason: "Device power outage at 18:00",
        actorName: "Site Supervisor",
        actorUid: "SUP-1",
        actorRole: UserRole.SECTION_HEAD,
      })
    ).rejects.toThrow(/Verified Check-Out time is required/i);

    // Submit valid correction -> original attendance checkOut/hours MUST remain untouched while Pending!
    const { correction, untouchedAttendance } = await submitManualCorrectionRequest({
      record: bioIncomplete,
      worker: workers[0],
      correctionType: "Missing Check-Out",
      proposedCheckIn: "08:04",
      proposedCheckOut: "18:04",
      proposedStatus: "Present",
      reason: "Main gate ZKTeco G3 Pro battery died at 17:45; guard register confirms 18:04 exit",
      supportingEvidenceUrl: "https://storage.example/gate-log-2026-04-23.png",
      supportingEvidenceName: "gate-log-2026-04-23.png",
      actorName: "Site Supervisor",
      actorUid: "SUP-1",
      actorRole: UserRole.SECTION_HEAD,
    });

    expect(correction.status).toBe("Pending");
    expect(correction.originalSnapshot.checkIn).toBe("08:04:00");
    expect(correction.originalSnapshot.checkOut).toBeNull();
    expect(untouchedAttendance.checkOut).toBeNull();
    expect(untouchedAttendance.workingHours).toBe(0);
    expect(untouchedAttendance.originalBiometricSnapshot?.checkIn).toBe("08:04:00");
    expect(untouchedAttendance.originalBiometricSnapshot?.checkOut).toBeNull();

    // HR Officer prepares -> Allowed, but cannot Approve
    const { updatedCorrection: underRevCor, updatedAttendance: underRevAtt } =
      await reviewManualCorrectionRequest({
        correction,
        attendanceRecord: untouchedAttendance,
        action: "Mark Under Review",
        comments: "Gate logbook photo checked by HR Officer",
        worker: workers[0],
        schedules,
        approvedLeaves: leaves,
        actorName: "Tigist (HR Officer)",
        actorUid: "HR-OFF-1",
        actorRole: UserRole.HR,
      });
    expect(underRevCor.status).toBe("Under Review");
    expect(underRevAtt.checkOut).toBeNull();

    await expect(
      reviewManualCorrectionRequest({
        correction: underRevCor,
        attendanceRecord: underRevAtt,
        action: "Approve",
        comments: "HR Officer trying to approve correction",
        worker: workers[0],
        schedules,
        approvedLeaves: leaves,
        actorName: "Tigist (HR Officer)",
        actorUid: "HR-OFF-1",
        actorRole: UserRole.HR,
      })
    ).rejects.toThrow(/Authorization Error/);

    // HR Manager approves -> attendance checkOut & workingHours update, AND originalBiometricSnapshot stays intact!
    const { updatedCorrection: approvedCor, updatedAttendance: approvedAtt } =
      await reviewManualCorrectionRequest({
        correction: underRevCor,
        attendanceRecord: underRevAtt,
        action: "Approve",
        comments: "Approved after verifying physical gate register scan",
        worker: workers[0],
        schedules,
        approvedLeaves: leaves,
        actorName: "Mekdes (HR Manager)",
        actorUid: "HRM-1",
        actorRole: UserRole.HR_MANAGER,
      });

    expect(approvedCor.status).toBe("Approved");
    expect(approvedAtt.checkIn).toBe("08:04:00");
    expect(approvedAtt.checkOut).toBe("18:04:00");
    expect(approvedAtt.workingHours).toBe(8);
    expect(approvedAtt.overtime).toBe(1);
    expect(approvedAtt.finalApprovalStatus).toBe("Approved");
    expect(approvedAtt.payrollFinalized).toBe(true);
    // CRITICAL INVARIANT: original biometric snapshot MUST remain untouched
    expect(approvedAtt.originalBiometricSnapshot?.checkIn).toBe("08:04:00");
    expect(approvedAtt.originalBiometricSnapshot?.checkOut).toBeNull();
    expect(approvedAtt.originalBiometricSnapshot?.workingHours).toBe(0);
  });

  it("reconciles all 7 leave, holiday, rest-day, missing-punch, pending, and absence states without false Absents", () => {
    const { workers, schedules, leaves } = createFixtures();
    const extendedLeaves: LeaveRequestRecord[] = [
      ...leaves,
      {
        id: "LVR-UNPAID-1",
        requestNo: "LV-2026-04-002",
        employeeId: workers[3].employeeId!,
        workerId: workers[3].id,
        workerName: workers[3].name,
        project: "Head Office",
        department: "Finance",
        leaveType: "Unpaid Leave",
        startDate: "2026-04-22",
        endDate: "2026-04-22",
        totalDays: 1,
        reason: "Personal unpaid day",
        status: "Approved",
        createdById: "HR-1",
        createdAt: "2026-04-15T08:00:00.000Z",
        updatedAt: "2026-04-16T08:00:00.000Z",
      },
    ];

    const records: AttendanceRecord[] = [
      {
        id: "REC-PRESENT",
        workerId: workers[0].id,
        workerName: workers[0].name,
        department: workers[0].department,
        trade: workers[0].trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        date: "2026-04-22",
        checkIn: "08:00:00",
        checkOut: "17:00:00",
        status: "Present",
        workingHours: 8,
        overtime: 0,
        finalApprovalStatus: "Approved",
        hrReviewStatus: "Approved",
        method: AttendanceMethod.FINGERPRINT,
      },
      {
        id: "REC-PENDING",
        workerId: workers[0].id,
        workerName: workers[0].name,
        department: workers[0].department,
        trade: workers[0].trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        date: "2026-04-23",
        checkIn: "08:00:00",
        checkOut: "17:00:00",
        status: "Present",
        workingHours: 8,
        overtime: 0,
        finalApprovalStatus: "Pending",
        hrReviewStatus: "Pending HR Review",
        method: AttendanceMethod.FINGERPRINT,
      },
      {
        id: "REC-MISSING",
        workerId: workers[2].id,
        workerName: workers[2].name,
        department: workers[2].department,
        trade: workers[2].trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        date: "2026-04-22",
        checkIn: "22:00:00",
        checkOut: null,
        status: "Present",
        workingHours: 0,
        overtime: 0,
        missingPunchType: "Missing Check-Out",
        punchCompleteness: "Missing Check-Out",
        finalApprovalStatus: "Pending",
        method: AttendanceMethod.FINGERPRINT,
      },
    ];

    // 1) Present (Approved complete attendance)
    expect(
      reconcileEmployeeAttendanceDay({
        worker: workers[0],
        date: "2026-04-22",
        attendanceRecords: records,
        schedules,
        leaveRequests: extendedLeaves,
      }).reconciledStatus
    ).toBe("Present");

    // 2) Pending Review (logged punch awaiting HR Manager final approval)
    expect(
      reconcileEmployeeAttendanceDay({
        worker: workers[0],
        date: "2026-04-23",
        attendanceRecords: records,
        schedules,
        leaveRequests: extendedLeaves,
      }).reconciledStatus
    ).toBe("Pending Review");

    // 3) Missing Attendance
    expect(
      reconcileEmployeeAttendanceDay({
        worker: workers[2],
        date: "2026-04-22",
        attendanceRecords: records,
        schedules,
        leaveRequests: extendedLeaves,
      }).reconciledStatus
    ).toBe("Missing Attendance");

    // 4) Approved Leave (paid Annual Leave on 2026-04-20 for Tigist)
    const paidLeaveDay = reconcileEmployeeAttendanceDay({
      worker: workers[1],
      date: "2026-04-20",
      attendanceRecords: records,
      schedules,
      leaveRequests: extendedLeaves,
    });
    expect(paidLeaveDay.reconciledStatus).toBe("Approved Leave");
    expect(paidLeaveDay.isPaidLeave).toBe(true);

    // 5) Unpaid Leave (Selamawit on 2026-04-22)
    const unpaidLeaveDay = reconcileEmployeeAttendanceDay({
      worker: workers[3],
      date: "2026-04-22",
      attendanceRecords: records,
      schedules,
      leaveRequests: extendedLeaves,
    });
    expect(unpaidLeaveDay.reconciledStatus).toBe("Unpaid Leave");
    expect(unpaidLeaveDay.isPaidLeave).toBe(false);

    // 6) Holiday (2026-05-01 Labor Day on Company Default & Sunday rest day 2026-04-26) -> NEVER Absent!
    expect(
      reconcileEmployeeAttendanceDay({
        worker: workers[0],
        date: "2026-05-01",
        attendanceRecords: records,
        schedules,
        leaveRequests: extendedLeaves,
      }).reconciledStatus
    ).toBe("Holiday");
    expect(
      reconcileEmployeeAttendanceDay({
        worker: workers[0],
        date: "2026-04-26", // Sunday rest day
        attendanceRecords: records,
        schedules,
        leaveRequests: extendedLeaves,
      }).reconciledStatus
    ).toBe("Holiday");

    // 7) Absent (regular working day with no punch, no leave, not holiday/rest day)
    expect(
      reconcileEmployeeAttendanceDay({
        worker: workers[0],
        date: "2026-04-24",
        attendanceRecords: records,
        schedules,
        leaveRequests: extendedLeaves,
      }).reconciledStatus
    ).toBe("Absent");
  });

  it("builds all 12 Attendance Reports cleanly with search & work-location filters", () => {
    const { workers, schedules, devices, mappings, leaves } = createFixtures();
    const records: AttendanceRecord[] = [
      {
        id: "RPT-ATT-1",
        workerId: workers[0].id,
        workerName: workers[0].name,
        department: workers[0].department,
        trade: workers[0].trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        workLocationType: "Construction Site",
        date: "2026-04-20",
        checkIn: "08:30:00",
        checkOut: "18:30:00",
        status: "Late",
        workingHours: 8,
        overtime: 1,
        overtimeCandidateHours: 1,
        lateArrivalMinutes: 30,
        finalApprovalStatus: "Approved",
        finalApprovedBy: "Mekdes (HR Manager)",
        finalApprovedAt: "2026-04-21T08:00:00.000Z",
        payrollFinalized: true,
        biometricDeviceId: "BIODEV-G3-01",
        biometricDeviceName: "Bole Tower Main Gate G3 Pro",
        method: AttendanceMethod.FINGERPRINT,
      },
      {
        id: "RPT-ATT-2",
        workerId: workers[2].id,
        workerName: workers[2].name,
        department: workers[2].department,
        trade: workers[2].trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        workLocationType: "Construction Site",
        date: "2026-04-20",
        checkIn: "22:00:00",
        checkOut: null,
        status: "Present",
        workingHours: 0,
        overtime: 0,
        missingPunchType: "Missing Check-Out",
        punchCompleteness: "Missing Check-Out",
        finalApprovalStatus: "Pending",
        biometricDeviceId: "BIODEV-G3-01",
        biometricDeviceName: "Bole Tower Main Gate G3 Pro",
        method: AttendanceMethod.FINGERPRINT,
      },
    ];

    const reportTypes: AttendanceReportTypeId[] = [
      "daily-attendance",
      "weekly-attendance",
      "monthly-attendance",
      "employee-history",
      "department-attendance",
      "project-site-attendance",
      "late-arrival",
      "absence",
      "overtime",
      "missing-punch",
      "hr-approval",
      "biometric-device-sync",
    ];

    reportTypes.forEach((reportType) => {
      const rows = buildAttendanceReportRows({
        reportType,
        workers,
        attendance: records,
        schedules,
        leaveRequests: leaves,
        overtimeRequests: [],
        devices,
        mappings,
        unmappedEvents: [],
        filters: {
          periodMode: "monthly",
          anchorDate: "2026-04-20",
          selectedMonth: "2026-04",
          employeeFilter: "ALL",
          departmentFilter: "ALL",
          projectFilter: "ALL",
          workLocationFilter: "ALL",
          approvalStatusFilter: "ALL",
        },
      });
      expect(rows.length).toBeGreaterThan(0);
    });

    // Verify filters narrow down results accurately
    const hqMissingRows = buildAttendanceReportRows({
      reportType: "missing-punch",
      workers,
      attendance: records,
      schedules,
      leaveRequests: leaves,
      overtimeRequests: [],
      devices,
      mappings,
      unmappedEvents: [],
      filters: {
        periodMode: "monthly",
        anchorDate: "2026-04-20",
        selectedMonth: "2026-04",
        employeeFilter: "ALL",
        departmentFilter: "ALL",
        projectFilter: "ALL",
        workLocationFilter: "Head Office",
      },
    });
    expect(hqMissingRows).toHaveLength(0);

    const searchFiltered = buildAttendanceReportRows({
      reportType: "employee-history",
      workers,
      attendance: records,
      schedules,
      leaveRequests: leaves,
      overtimeRequests: [],
      devices,
      mappings,
      unmappedEvents: [],
      filters: {
        periodMode: "monthly",
        anchorDate: "2026-04-20",
        selectedMonth: "2026-04",
        employeeFilter: "ALL",
        departmentFilter: "ALL",
        projectFilter: "ALL",
        workLocationFilter: "ALL",
        searchQuery: "abebe",
      },
    });
    expect(searchFiltered).toHaveLength(1);
    expect(searchFiltered[0]["Employee Name"]).toBe("Abebe Kebede");
  });

  it("gates Payroll on HR Manager-approved attendance and applies policy deductions ONLY when policy.isApproved === true", () => {
    const { workers } = createFixtures();
    const worker: Worker = {
      ...workers[0],
      basicMonthlySalary: 13000, // dailyWage = 13000 / 26 = 500 ETB
      hourlyRate: 62.5,
    };
    const salaryStructures: SalaryStructureRecord[] = [];
    const unpaidLeave: LeaveRequestRecord = {
      id: "LVR-UNP-PAY",
      requestNo: "LV-2026-04-009",
      employeeId: worker.employeeId!,
      workerId: worker.id,
      workerName: worker.name,
      project: "Bole Tower",
      department: "Engineering",
      leaveType: "Unpaid Leave",
      startDate: "2026-04-10",
      endDate: "2026-04-10",
      totalDays: 1,
      reason: "Personal leave",
      status: "Approved",
      createdById: "HR-1",
      createdAt: "2026-04-08T08:00:00.000Z",
      updatedAt: "2026-04-09T08:00:00.000Z",
    };

    const mixedAttendance: AttendanceRecord[] = [
      {
        id: "PAY-ATT-UNAPPROVED",
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        date: "2026-04-01",
        checkIn: "08:00:00",
        checkOut: "19:00:00",
        status: "Present",
        workingHours: 8,
        overtime: 2,
        finalApprovalStatus: "Pending", // NOT finalized -> MUST be excluded from payroll
        hrReviewStatus: "Pending HR Review",
        method: AttendanceMethod.FINGERPRINT,
      },
      {
        id: "PAY-ATT-ABSENT-APP",
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        date: "2026-04-02",
        checkIn: null,
        checkOut: null,
        status: "Absent",
        workingHours: 0,
        overtime: 0,
        finalApprovalStatus: "Approved",
        hrReviewStatus: "Approved",
        method: AttendanceMethod.MANUAL_ENTRY,
      },
      {
        id: "PAY-ATT-PRESENT-APP",
        workerId: worker.id,
        workerName: worker.name,
        department: worker.department,
        trade: worker.trade,
        company: "OVID Real Estate",
        building: "Bole Tower",
        floor: 0,
        zone: "Bole Tower",
        date: "2026-04-03",
        checkIn: "08:00:00",
        checkOut: "19:00:00",
        status: "Present",
        workingHours: 8,
        overtime: 2,
        finalApprovalStatus: "Approved",
        hrReviewStatus: "Approved",
        method: AttendanceMethod.FINGERPRINT,
      },
    ];

    // 1) Strict gate throws when ALL attendance records in period are unapproved
    expect(() =>
      buildHrmPayrollRunDraft({
        payPeriod: "2026-04",
        projectScope: "Bole Tower",
        workers: [worker],
        attendance: [mixedAttendance[0]], // only Pending record
        leaveRequests: [unpaidLeave],
        overtimeRequests: [],
        salaryStructures,
        loans: [],
        enforceStrictApprovedAttendance: true,
        existingRuns: [],
        actorName: "HR Manager",
        actorUid: "HRM-1",
      })
    ).toThrow(/Unapproved Attendance Blocked/);

    // 2) Draft deduction policy (isApproved: false) MUST yield 0 policyAttendanceDeductions, and Pending record is excluded!
    const draftPolicy: AttendanceDeductionPolicy = {
      id: "POL-DRAFT",
      policyName: "Unapproved Draft Policy",
      isApproved: false,
      deductUnpaidLeave: true,
      deductUnexcusedAbsence: true,
      lateDeductionEnabled: false,
      graceMinutesBeforeDeduction: 15,
      lateDeductionHourlyFactor: 1,
      absenceDailyMultiplier: 1,
      standardWorkingDaysPerMonth: 26,
      updatedBy: "HR Officer",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
    };

    const runNoPolicyDeduction = buildHrmPayrollRunDraft({
      payPeriod: "2026-04",
      projectScope: "Bole Tower",
      workers: [worker],
      attendance: mixedAttendance,
      leaveRequests: [unpaidLeave],
      overtimeRequests: [],
      salaryStructures,
      loans: [],
      deductionPolicy: draftPolicy,
      existingRuns: [],
      actorName: "HR Manager",
      actorUid: "HRM-1",
    });

    const itemNoDed = runNoPolicyDeduction.items[0];
    expect(runNoPolicyDeduction.attendanceAuditSummary?.approvedRecordsUsed).toBe(2);
    expect(runNoPolicyDeduction.attendanceAuditSummary?.unapprovedRecordsExcluded).toBe(1);
    expect(runNoPolicyDeduction.attendanceAuditSummary?.approvedDeductionPolicyApplied).toBe(false);
    expect(itemNoDed.approvedWorkingDays).toBe(1); // Only 2026-04-03 (01 is Pending, 02 is Absent)
    expect(itemNoDed.approvedOvertimeHours).toBe(2); // Only 2h from approved 04-03, NOT 04-01 Pending
    expect(itemNoDed.unpaidAbsenceDays).toBe(1);
    expect(itemNoDed.unpaidLeaveDays).toBe(1);
    expect(itemNoDed.policyAttendanceDeductions).toBe(0); // NO deduction without approved policy!

    // 3) Approved deduction policy (isApproved: true) deducts 1 unpaid absence (500) + 1 unpaid leave (500) = 1000 ETB
    const approvedPolicy: AttendanceDeductionPolicy = {
      ...draftPolicy,
      id: "POL-APPROVED",
      policyName: "Approved Company Attendance Policy 2026",
      isApproved: true,
      approvedBy: "Director",
      approvedAt: "2026-04-01T00:00:00.000Z",
    };

    const runWithApprovedPolicy = buildHrmPayrollRunDraft({
      payPeriod: "2026-04",
      projectScope: "Bole Tower",
      workers: [worker],
      attendance: mixedAttendance,
      leaveRequests: [unpaidLeave],
      overtimeRequests: [],
      salaryStructures,
      loans: [],
      deductionPolicy: approvedPolicy,
      existingRuns: [],
      actorName: "HR Manager",
      actorUid: "HRM-1",
    });

    const itemWithDed = runWithApprovedPolicy.items[0];
    expect(runWithApprovedPolicy.attendanceAuditSummary?.approvedDeductionPolicyApplied).toBe(true);
    expect(itemWithDed.policyAttendanceDeductions).toBe(1000);
    expect(itemWithDed.otherDeductions).toBe(1000);
  });
});

