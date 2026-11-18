import { beforeEach, describe, expect, it, vi } from "vitest";
import { DbService } from "../services/db";
import {
  computeScheduleAttendanceMetrics,
  inferWorkerWorkLocationType,
  resolveWorkerSchedule,
} from "../services/hrmService";
import { processBiometricDeviceAttendanceEvent } from "../services/biometricMappingService";
import {
  computeAttendanceWorkflowDashboard,
  getMonthDateRange,
  getWeekDateRange,
  reviewAttendanceException,
} from "../services/attendanceWorkflowService";
import {
  AttendanceMethod,
  AttendanceRecord,
  AuditLog,
  BiometricDeviceMapping,
  BiometricDeviceRecord,
  LeaveRequestRecord,
  OvertimeRequestRecord,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";

let memAttendance: AttendanceRecord[] = [];
let memUnmapped: UnmappedBiometricEvent[] = [];
let memOvertimeRequests: OvertimeRequestRecord[] = [];
let memAuditLogs: AuditLog[] = [];

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
      lastSyncedAt: new Date().toISOString(), // Online
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
      lastSyncedAt: "2026-04-01T06:00:00.000Z", // Stale -> Pending Sync / Offline
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
      workerId: "OVID-EMP-2026-0001",
      employeeId: "OVID-EMP-2026-0001",
      employeeName: "Abebe Kebede",
      department: "Engineering",
      position: "Site Engineer",
      biometricUserId: "101",
      deviceId: "BIODEV-G3-01",
      deviceName: "Bole Tower Main Gate G3 Pro",
      deviceModel: "G3 Pro",
      serialNumber: "ZKG3PRO-9001",
      workLocationType: "Construction Site",
      projectSite: "Bole Tower",
      effectiveDate: "2026-01-05",
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "BMAP-2",
      workerId: "OVID-EMP-2026-0003",
      employeeId: "OVID-EMP-2026-0003",
      employeeName: "Dawit Mekonnen",
      department: "Security",
      position: "Night Guard Supervisor",
      biometricUserId: "303",
      deviceId: "BIODEV-G3-01",
      deviceName: "Bole Tower Main Gate G3 Pro",
      deviceModel: "G3 Pro",
      serialNumber: "ZKG3PRO-9001",
      workLocationType: "Construction Site",
      projectSite: "Bole Tower",
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
    expect(lateOtMetrics.overtime).toBe(0); // Held at 0 until HR approves
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
    expect(incompleteMetrics.punchCompleteness).toBe("Incomplete");
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
      punchCompleteness: "Incomplete",
      missingPunchType: "Missing Check-Out",
      hrReviewStatus: "Pending HR Review",
      method: AttendanceMethod.BIOMETRIC_DEVICE,
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
        method: AttendanceMethod.BIOMETRIC_DEVICE,
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
        punchCompleteness: "Incomplete",
        missingPunchType: "Missing Check-Out",
        hrReviewStatus: "Pending HR Review",
        method: AttendanceMethod.BIOMETRIC_DEVICE,
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
