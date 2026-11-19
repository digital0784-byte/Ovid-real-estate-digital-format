import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateEmployeeBiometricAttendance,
  completeEmployeeBiometricMappingWorkflow,
  computeEmployeeBiometricProfileState,
  computeHrmBiometricEnrollmentStats,
  enrollEmployeeOnBiometricDevice,
  isDeviceVerifiedForBiometricAttendance,
  processBiometricDeviceAttendanceEvent,
  resolveBiometricMappingPermissions,
  stripProhibitedBiometricTemplateFields,
  suspendEmployeeBiometricEnrollment,
} from "../services/biometricMappingService";
import { generateNextEmployeeId, resolveHrmPermissions } from "../services/hrmService";
import { DbService } from "../services/db";
import {
  AttendanceRecord,
  BiometricDeviceMapping,
  BiometricDeviceRecord,
  BiometricMappingAuditLog,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";

let memWorkers: Worker[] = [];
let memDevices: BiometricDeviceRecord[] = [];
let memMappings: BiometricDeviceMapping[] = [];
let memAuditLogs: BiometricMappingAuditLog[] = [];
let memUnmapped: UnmappedBiometricEvent[] = [];
let memAttendance: AttendanceRecord[] = [];

function seedWorkers(): Worker[] {
  return [
    {
      id: "OVID-EMP-2026-0001",
      employeeId: "OVID-EMP-2026-0001",
      name: "Selamawit Bekele",
      company: "OVID Real Estate",
      department: "Engineering",
      trade: "Structural Engineer",
      position: "Structural Engineer",
      joinedDate: "2026-01-12",
      workLocationType: "Construction Site",
      assignedProject: "Bole Tower",
      currentSite: "Bole Tower",
      status: "Active",
      teamId: "TEAM-BOLE",
      biometricEnrollmentStatus: "Not Registered",
      biometricWorkflowStage: "Employee Registration",
      biometricMappingStatus: "Unmapped",
      biometricAttendanceActivated: false,
    },
    {
      id: "OVID-EMP-2026-0002",
      employeeId: "OVID-EMP-2026-0002",
      name: "Yohannes Alemu",
      company: "OVID Real Estate",
      department: "Finance",
      trade: "Senior Accountant",
      position: "Senior Accountant",
      joinedDate: "2026-01-15",
      workLocationType: "Head Office",
      assignedProject: "Head Office",
      currentSite: "Head Office",
      status: "Active",
      teamId: "TEAM-HQ",
      biometricEnrollmentStatus: "Not Registered",
      biometricWorkflowStage: "Employee Registration",
      biometricMappingStatus: "Unmapped",
      biometricAttendanceActivated: false,
    },
    {
      id: "OVID-EMP-2026-0003",
      employeeId: "OVID-EMP-2026-0003",
      name: "Dawit Teshome",
      company: "OVID Real Estate",
      department: "Construction",
      trade: "Foreman",
      position: "Foreman",
      joinedDate: "2025-10-01",
      workLocationType: "Construction Site",
      assignedProject: "Bole Tower",
      currentSite: "Bole Tower",
      status: "Inactive",
      teamId: "TEAM-BOLE",
    },
  ];
}

function seedDevices(): BiometricDeviceRecord[] {
  return [
    {
      id: "DEV-G3PRO-UNVERIFIED",
      deviceCode: "DEV-001",
      deviceName: "Bole Gate G3 Pro",
      manufacturer: "ZKTeco",
      model: "G3 Pro",
      serialNumber: "ZKG3P-2026-001",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectName: "Bole Tower",
      deviceLocation: "Main Site Entrance",
      protocolType: "ADMS_PUSH_HTTP",
      connectionVerified: false,
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "DEV-MB360-VERIFIED",
      deviceCode: "DEV-002",
      deviceName: "Head Office Lobby MB360 Plus",
      manufacturer: "ZKTeco",
      model: "MB360 Plus",
      serialNumber: "ZKMB360-2026-002",
      workLocationType: "Head Office",
      projectId: "Head Office",
      projectName: "Head Office",
      deviceLocation: "HQ Ground Floor Reception",
      protocolType: "ADMS_PUSH_HTTP",
      connectionVerified: true,
      lastHandshakeAt: "2026-07-01T06:00:00.000Z",
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "DEV-INACTIVE-003",
      deviceCode: "DEV-003",
      deviceName: "Decommissioned Annex Terminal",
      manufacturer: "ZKTeco",
      model: "G3 Pro",
      serialNumber: "ZKG3P-OLD-003",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectName: "Bole Tower",
      deviceLocation: "Old Gate",
      status: "Inactive",
      createdBy: "HR Manager",
      createdByUid: "HR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

function seedSchedules(): WorkScheduleConfig[] {
  return [
    {
      id: "SCH-STD",
      scheduleName: "Standard Shift",
      project: "ALL",
      department: "ALL",
      shiftStartTime: "08:00",
      shiftEndTime: "17:00",
      breakMinutes: 60,
      standardDailyHours: 8,
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
  ];
}

beforeEach(() => {
  memWorkers = seedWorkers();
  memDevices = seedDevices();
  memMappings = [];
  memAuditLogs = [];
  memUnmapped = [];
  memAttendance = [];

  vi.spyOn(DbService, "updateWorker").mockImplementation(async (w) => {
    memWorkers = memWorkers.map((cur) => (cur.id === w.id ? w : cur));
  });
  vi.spyOn(DbService, "saveBiometricDevice").mockImplementation(async (dev) => {
    memDevices = [...memDevices.filter((d) => d.id !== dev.id), dev];
  });
  vi.spyOn(DbService, "saveBiometricDeviceMapping").mockImplementation(async (map) => {
    memMappings = [...memMappings.filter((m) => m.id !== map.id), map];
  });
  vi.spyOn(DbService, "addBiometricMappingAuditLog").mockImplementation(async (log) => {
    memAuditLogs.push(log);
  });
  vi.spyOn(DbService, "saveUnmappedBiometricEvent").mockImplementation(async (evt) => {
    memUnmapped = [...memUnmapped.filter((e) => e.id !== evt.id), evt];
  });
  vi.spyOn(DbService, "addAttendanceRecord").mockImplementation(async (att) => {
    memAttendance = [...memAttendance.filter((a) => a.id !== att.id), att];
  });
});

describe("Integrated Employee Biometric Registration Workflow", () => {
  it("1. auto-assigns strictly unique Employee IDs across empty, sequential, gapped, and colliding records", () => {
    expect(generateNextEmployeeId([], 2026)).toBe("OVID-EMP-2026-0001");

    const seqId = generateNextEmployeeId(memWorkers, 2026);
    expect(seqId).toBe("OVID-EMP-2026-0004");

    const gappedWorkers: Worker[] = [
      ...memWorkers,
      {
        ...memWorkers[0],
        id: "OVID-EMP-2026-0009",
        employeeId: "OVID-EMP-2026-0009",
      },
      // Simulate collision where doc id matches next sequence 0010
      {
        ...memWorkers[0],
        id: "OVID-EMP-2026-0010",
        employeeId: "LEGACY-01",
      },
    ];
    expect(generateNextEmployeeId(gappedWorkers, 2026)).toBe("OVID-EMP-2026-0011");
  });

  it("2. enforces HR Department ONLY permissions (blocks Site Managers and non-HR departments)", async () => {
    expect(resolveHrmPermissions(UserRole.HR_MANAGER).canManageBiometricEnrollment).toBe(true);
    expect(resolveHrmPermissions(UserRole.HR).canManageBiometricEnrollment).toBe(true);
    expect(resolveBiometricMappingPermissions(UserRole.HR_MANAGER).canManageBiometricEnrollment).toBe(true);
    expect(resolveBiometricMappingPermissions(UserRole.HR).canManageBiometricEnrollment).toBe(true);

    const nonHrRoles: UserRole[] = [
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.SECTION_HEAD,
      UserRole.SUPERVISOR,
      UserRole.OPERATION_MANAGER,
      UserRole.OFFICE_MANAGER,
      UserRole.FINANCE_MANAGER,
      UserRole.DIRECTOR,
      UserRole.SUPER_ADMIN,
      UserRole.EMPLOYEE,
      UserRole.WORKER,
    ];

    for (const role of nonHrRoles) {
      expect(resolveHrmPermissions(role).canManageBiometricEnrollment).toBe(false);
      expect(resolveBiometricMappingPermissions(role).canManageBiometricEnrollment).toBe(false);
      expect(resolveBiometricMappingPermissions(role).canActivateAttendance).toBe(false);

      await expect(
        enrollEmployeeOnBiometricDevice({
          worker: memWorkers[0],
          deviceId: "DEV-G3PRO-UNVERIFIED",
          biometricUserId: "5001",
          workLocationType: "Construction Site",
          projectSite: "Bole Tower",
          devices: memDevices,
          existingMappings: memMappings,
          allWorkers: memWorkers,
          actorName: "Non-HR User",
          actorUid: "USR-NONHR",
          actorRole: role,
        })
      ).rejects.toThrow(/HR Department Only/i);
    }
  });

  it("3. completes full 4-stage flow, enforces device verification gate, and blocks attendance until Active", async () => {
    const targetWorker = memWorkers[0];

    // Stage 2a: HR registers employee biometric User ID on G3 Pro (unverified)
    const stage2a = await enrollEmployeeOnBiometricDevice({
      worker: targetWorker,
      deviceId: "DEV-G3PRO-UNVERIFIED",
      biometricUserId: "1042",
      workLocationType: "Construction Site",
      projectSite: "Bole Tower",
      enrollmentDate: "2026-07-10",
      devices: memDevices,
      existingMappings: memMappings,
      allWorkers: memWorkers,
      actorName: "HR Officer",
      actorUid: "HR-OFF-1",
      actorRole: UserRole.HR,
    });
    expect(stage2a.updatedWorker.biometricEnrollmentStatus).toBe("Registered on Device");
    expect(stage2a.updatedWorker.biometricWorkflowStage).toBe("Biometric Enrollment");
    expect(stage2a.updatedWorker.biometricMappingStatus).toBe("Pending");

    // Stage 2b: HR marks Mapping Pending
    const stage2b = await enrollEmployeeOnBiometricDevice({
      worker: stage2a.updatedWorker,
      deviceId: "DEV-G3PRO-UNVERIFIED",
      biometricUserId: "1042",
      workLocationType: "Construction Site",
      projectSite: "Bole Tower",
      enrollmentDate: "2026-07-10",
      markMappingPending: true,
      devices: memDevices,
      existingMappings: memMappings,
      allWorkers: memWorkers,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(stage2b.updatedWorker.biometricEnrollmentStatus).toBe("Mapping Pending");

    // Stage 3: HR completes Employee Biometric Mapping
    const stage3 = await completeEmployeeBiometricMappingWorkflow({
      worker: stage2b.updatedWorker,
      deviceId: "DEV-G3PRO-UNVERIFIED",
      biometricUserId: "1042",
      workLocationType: "Construction Site",
      projectSite: "Bole Tower",
      workers: memWorkers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(stage3.mapping.status).toBe("Active");
    expect(stage3.updatedWorker.biometricEnrollmentStatus).toBe("Mapping Completed");
    expect(stage3.updatedWorker.biometricWorkflowStage).toBe("Employee Biometric Mapping");
    expect(stage3.updatedWorker.biometricAttendanceActivated).toBe(false);

    // Stage 4 GATE: Device is NOT verified yet -> activation MUST fail
    expect(isDeviceVerifiedForBiometricAttendance(memDevices[0])).toBe(false);
    await expect(
      activateEmployeeBiometricAttendance({
        worker: stage3.updatedWorker,
        mappings: memMappings,
        devices: memDevices,
        actorName: "HR Manager",
        actorUid: "HR-MGR-1",
        actorRole: UserRole.HR_MANAGER,
      })
    ).rejects.toThrow(/Device Verification Required/i);

    // Attendance punch while status is Mapping Completed (not Active) MUST be blocked and queued
    const blockedPunch = await processBiometricDeviceAttendanceEvent({
      deviceId: "DEV-G3PRO-UNVERIFIED",
      biometricUserId: "1042",
      eventTime: "2026-07-20T05:05:00.000Z", // 08:05 EAT
      punchType: "Check-In",
      devices: memDevices,
      mappings: memMappings,
      workers: memWorkers,
      schedules: seedSchedules(),
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });
    expect(blockedPunch.resolved).toBe(false);
    expect(blockedPunch.reason).toMatch(/Attendance Activation is required/i);
    expect(memUnmapped.length).toBe(1);

    // Simulate verified ADMS handshake on G3 Pro -> Stage 4 succeeds
    memDevices[0] = {
      ...memDevices[0],
      connectionVerified: true,
      lastHandshakeAt: "2026-07-20T04:55:00.000Z",
    };
    expect(isDeviceVerifiedForBiometricAttendance(memDevices[0])).toBe(true);

    const stage4 = await activateEmployeeBiometricAttendance({
      worker: stage3.updatedWorker,
      mappings: memMappings,
      devices: memDevices,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(stage4.updatedWorker.biometricEnrollmentStatus).toBe("Active");
    expect(stage4.updatedWorker.biometricWorkflowStage).toBe("Attendance Activation");
    expect(stage4.updatedWorker.biometricAttendanceActivated).toBe(true);

    // Now attendance punch succeeds cleanly
    const activePunch = await processBiometricDeviceAttendanceEvent({
      deviceId: "DEV-G3PRO-UNVERIFIED",
      biometricUserId: "1042",
      eventTime: "2026-07-20T05:05:00.000Z",
      punchType: "Check-In",
      devices: memDevices,
      mappings: memMappings,
      workers: memWorkers,
      schedules: seedSchedules(),
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });
    expect(activePunch.resolved).toBe(true);
    expect(activePunch.attendanceRecord?.workerId).toBe("OVID-EMP-2026-0001");

    // Suspend enrollment -> sets status Suspended, deactivates mapping, preserves audit logs
    const suspended = await suspendEmployeeBiometricEnrollment({
      worker: stage4.updatedWorker,
      mappings: memMappings,
      devices: memDevices,
      reason: "Transferred to new site gate",
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(suspended.updatedWorker.biometricEnrollmentStatus).toBe("Suspended");
    expect(suspended.deactivatedMapping?.status).toBe("Inactive");
    expect(suspended.updatedWorker.biometricAttendanceActivated).toBe(false);
    expect(memAuditLogs.some((l) => l.action === "Enrollment Suspended")).toBe(true);
  });

  it("4. prevents duplicate Device User IDs across active mappings and pending enrollments", async () => {
    await enrollEmployeeOnBiometricDevice({
      worker: memWorkers[1],
      deviceId: "DEV-MB360-VERIFIED",
      biometricUserId: "2050",
      workLocationType: "Head Office",
      projectSite: "Head Office",
      devices: memDevices,
      existingMappings: memMappings,
      allWorkers: memWorkers,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    await expect(
      enrollEmployeeOnBiometricDevice({
        worker: memWorkers[0],
        deviceId: "DEV-MB360-VERIFIED",
        biometricUserId: "2050",
        workLocationType: "Head Office",
        projectSite: "Head Office",
        devices: memDevices,
        existingMappings: memMappings,
        allWorkers: memWorkers,
        actorName: "HR Manager",
        actorUid: "HR-MGR-1",
        actorRole: UserRole.HR_MANAGER,
      })
    ).rejects.toThrow(/Duplicate Device User ID/i);
  });

  it("5. strips raw fingerprint and face templates from worker records and computes dashboard metrics accurately", async () => {
    const taintedWorker = {
      ...memWorkers[1],
      fingerprint: "RAW_FP_BYTES",
      faceRecognitionData: "RAW_FACE_VECTOR",
      fingerprintTemplate: "TPL_FP",
      faceTemplate: "TPL_FACE",
      rawBiometricTemplate: "RAW_TPL",
      biometricTemplate: "BIO_TPL",
      biometricTemplateEncrypted: "ENC_TPL",
    } as unknown as Worker;

    const clean = stripProhibitedBiometricTemplateFields(taintedWorker) as any;
    expect(clean.fingerprint).toBeUndefined();
    expect(clean.faceRecognitionData).toBeUndefined();
    expect(clean.fingerprintTemplate).toBeUndefined();
    expect(clean.faceTemplate).toBeUndefined();
    expect(clean.rawBiometricTemplate).toBeUndefined();
    expect(clean.biometricTemplate).toBeUndefined();
    expect(clean.biometricTemplateEncrypted).toBeUndefined();

    // Activate Yohannes on verified Head Office terminal
    const e1 = await enrollEmployeeOnBiometricDevice({
      worker: memWorkers[1],
      deviceId: "DEV-MB360-VERIFIED",
      biometricUserId: "777",
      workLocationType: "Head Office",
      projectSite: "Head Office",
      devices: memDevices,
      existingMappings: memMappings,
      allWorkers: memWorkers,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    const m1 = await completeEmployeeBiometricMappingWorkflow({
      worker: e1.updatedWorker,
      deviceId: "DEV-MB360-VERIFIED",
      biometricUserId: "777",
      workLocationType: "Head Office",
      projectSite: "Head Office",
      workers: memWorkers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    await activateEmployeeBiometricAttendance({
      worker: m1.updatedWorker,
      mappings: memMappings,
      devices: memDevices,
      actorName: "HR Manager",
      actorUid: "HR-MGR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const profileState = computeEmployeeBiometricProfileState(
      memWorkers[1],
      memMappings,
      memDevices
    );
    expect(profileState.enrollmentStatus).toBe("Active");
    expect(profileState.deviceVerified).toBe(true);
    expect(profileState.mappingStatus).toBe("Active");

    const stats = computeHrmBiometricEnrollmentStats(memWorkers, memMappings, memDevices);
    expect(stats.totalEmployees).toBe(2); // Active only
    expect(stats.activeAttendanceCount).toBe(1);
    expect(stats.notRegisteredCount).toBe(1);
    expect(stats.headOfficeActiveCount).toBe(1);
    expect(stats.siteActiveCount).toBe(0);
    expect(stats.verifiedDevicesCount).toBe(1);
    expect(stats.activeDevicesCount).toBe(2);
    expect(stats.completionRatePercent).toBe(50);
  });
});
