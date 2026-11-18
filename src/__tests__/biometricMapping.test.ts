import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractAddisAbabaDateAndTime,
  formatAddisAbabaDateTime,
  processBiometricDeviceAttendanceEvent,
  resolveBiometricMappingPermissions,
  resolveUnmappedBiometricEventRecord,
  saveValidatedBiometricDevice,
  saveValidatedBiometricMapping,
  toggleBiometricMappingStatus,
  validateBiometricMappingInput,
} from "../services/biometricMappingService";
import { DbService } from "../services/db";
import {
  AttendanceMethod,
  AttendanceRecord,
  BiometricDeviceMapping,
  BiometricDeviceRecord,
  BiometricMappingAuditLog,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";

let memDevices: BiometricDeviceRecord[] = [];
let memMappings: BiometricDeviceMapping[] = [];
let memAuditLogs: BiometricMappingAuditLog[] = [];
let memUnmapped: UnmappedBiometricEvent[] = [];
let memAttendance: AttendanceRecord[] = [];

function makeWorkers(): Worker[] {
  return [
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
      status: "Active",
      teamId: "TEAM-HQ",
    },
    {
      id: "OVID-EMP-2026-0003",
      employeeId: "OVID-EMP-2026-0003",
      name: "Dawit Hailu",
      company: "OVID Real Estate",
      department: "Operations",
      trade: "Foreman",
      position: "Foreman",
      joinedDate: "2025-11-01",
      assignedProject: "Bole Tower",
      currentSite: "Bole Tower",
      status: "Inactive",
      teamId: "TEAM-1",
    },
  ];
}

function makeDevices(): BiometricDeviceRecord[] {
  return [
    {
      id: "BIODEV-BOLE-01",
      deviceCode: "DEV-BOLE-01",
      deviceName: "Bole Gate 1 Terminal",
      manufacturer: "ZKTeco",
      model: "SpeedFace V5L",
      serialNumber: "ZK-SF5-99001",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectName: "Bole Tower",
      deviceLocation: "Main Site Entrance",
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-MGR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "BIODEV-HQ-01",
      deviceCode: "DEV-HQ-01",
      deviceName: "Head Office Lobby Scanner",
      manufacturer: "Hikvision",
      model: "DS-K1T671",
      serialNumber: "HK-671-88002",
      workLocationType: "Head Office",
      projectId: "HEAD-OFFICE",
      projectName: "Head Office",
      deviceLocation: "HQ Lobby Gate",
      status: "Active",
      createdBy: "HR Manager",
      createdByUid: "HR-MGR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "BIODEV-INACTIVE-01",
      deviceCode: "DEV-OLD-01",
      deviceName: "Decommissioned Annex Reader",
      manufacturer: "ZKTeco",
      model: "MB460",
      serialNumber: "ZK-MB460-001",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      projectName: "Bole Tower",
      deviceLocation: "Old Annex",
      status: "Inactive",
      createdBy: "HR Manager",
      createdByUid: "HR-MGR-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

function makeSchedules(): WorkScheduleConfig[] {
  return [
    {
      id: "SCH-1",
      scheduleName: "Standard Day Shift",
      project: "Bole Tower",
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
  memDevices = makeDevices();
  memMappings = [];
  memAuditLogs = [];
  memUnmapped = [];
  memAttendance = [];

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

describe("Employee Biometric Mapping Module", () => {
  it("1. creates mapping cleanly with valid existing employee and active device", async () => {
    const workers = makeWorkers();
    const res = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "101",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      notes: "Initial site gate enrollment",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(res.mapping.employeeId).toBe("OVID-EMP-2026-0001");
    expect(res.mapping.employeeNameSnapshot).toBe("Abebe Kebede");
    expect(res.mapping.deviceModelSnapshot).toBe("ZKTeco SpeedFace V5L");
    expect(res.mapping.deviceSerialNumberSnapshot).toBe("ZK-SF5-99001");
    expect(res.mapping.biometricUserId).toBe("101");
    expect(res.mapping.status).toBe("Active");
    expect(memMappings).toHaveLength(1);
    expect(memAuditLogs).toHaveLength(1);
  });

  it("2. rejects nonexistent or inactive employee", () => {
    const workers = makeWorkers();

    const missingEmp = validateBiometricMappingInput({
      employeeIdOrWorkerId: "NON-EXISTENT-999",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "102",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
    });
    expect(missingEmp.valid).toBe(false);
    expect(missingEmp.error).toMatch(/does not exist/i);

    const inactiveEmp = validateBiometricMappingInput({
      employeeIdOrWorkerId: "OVID-EMP-2026-0003",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "103",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
    });
    expect(inactiveEmp.valid).toBe(false);
    expect(inactiveEmp.error).toMatch(/inactive employee/i);
  });

  it("3. rejects unregistered or inactive biometric device", () => {
    const workers = makeWorkers();

    const unregistered = validateBiometricMappingInput({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-UNKNOWN",
      biometricUserId: "105",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
    });
    expect(unregistered.valid).toBe(false);
    expect(unregistered.error).toMatch(/does not exist/i);

    const inactiveDev = validateBiometricMappingInput({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-INACTIVE-01",
      biometricUserId: "105",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
    });
    expect(inactiveDev.valid).toBe(false);
    expect(inactiveDev.error).toMatch(/Inactive/i);
  });

  it("4. rejects duplicate active Biometric User ID on the same device", async () => {
    const workers = makeWorkers();
    await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "101",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    await expect(
      saveValidatedBiometricMapping({
        employeeIdOrWorkerId: "OVID-EMP-2026-0002",
        deviceId: "BIODEV-BOLE-01",
        biometricUserId: "101",
        workLocationType: "Construction Site",
        projectId: "Bole Tower",
        effectiveDate: "2026-07-01",
        status: "Active",
        workers,
        devices: memDevices,
        existingMappings: memMappings,
        actorName: "Selamawit HR",
        actorUid: "HR-1",
        actorRole: UserRole.HR_MANAGER,
      })
    ).rejects.toThrow(/Duplicate Biometric User ID/i);
  });

  it("5. allows the same numeric Biometric User ID on different registered devices", async () => {
    const workers = makeWorkers();
    const mapA = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "101",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const mapB = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0002",
      deviceId: "BIODEV-HQ-01",
      biometricUserId: "101",
      workLocationType: "Head Office",
      projectId: "Head Office",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(mapA.mapping.biometricUserId).toBe("101");
    expect(mapB.mapping.biometricUserId).toBe("101");
    expect(mapA.mapping.deviceId).not.toBe(mapB.mapping.deviceId);
    expect(memMappings).toHaveLength(2);
  });

  it("6. deactivates and reactivates mapping cleanly while preserving historical record", async () => {
    const workers = makeWorkers();
    const { mapping } = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "205",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const deact = await toggleBiometricMappingStatus({
      mapping,
      targetStatus: "Inactive",
      reason: "Transferred temporarily",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(deact.mapping.status).toBe("Inactive");
    expect(deact.mapping.deactivationReason).toBe("Transferred temporarily");
    expect(memMappings).toHaveLength(1);

    const react = await toggleBiometricMappingStatus({
      mapping: deact.mapping,
      targetStatus: "Active",
      reason: "Returned to site",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    expect(react.mapping.status).toBe("Active");
  });

  it("7. records immutable audit logs for creation, edits, User ID change, device change, deactivation & reactivation", async () => {
    const workers = makeWorkers();
    const created = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "301",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const editedUserIdAndDevice = await saveValidatedBiometricMapping({
      editingMapping: created.mapping,
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-HQ-01",
      biometricUserId: "302",
      workLocationType: "Head Office",
      projectId: "Head Office",
      effectiveDate: "2026-07-02",
      status: "Active",
      notes: "Reassigned gate scanner and BioID",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const editedMetaOnly = await saveValidatedBiometricMapping({
      editingMapping: editedUserIdAndDevice.mapping,
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-HQ-01",
      biometricUserId: "302",
      workLocationType: "Head Office",
      projectId: "Head Office",
      effectiveDate: "2026-07-03",
      status: "Active",
      notes: "Adjusted effective date",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const deact = await toggleBiometricMappingStatus({
      mapping: editedMetaOnly.mapping,
      targetStatus: "Inactive",
      reason: "Leave of absence",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });
    await toggleBiometricMappingStatus({
      mapping: deact.mapping,
      targetStatus: "Active",
      reason: "Resumed duty",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const actions = memAuditLogs.map((l) => l.action);
    expect(actions).toContain("Mapping Created");
    expect(actions).toContain("Biometric User ID Changed");
    expect(actions).toContain("Device Changed");
    expect(actions).toContain("Mapping Edited");
    expect(actions).toContain("Mapping Deactivated");
    expect(actions).toContain("Mapping Activated");
  });

  it("8. resolves attendance punch using active mapping, formats Africa/Addis_Ababa time, and prevents duplicate timestamps", async () => {
    const workers = makeWorkers();
    const schedules = makeSchedules();

    await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "404",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    // 05:05:00 UTC === 08:05:00 Africa/Addis_Ababa (+03:00)
    const eventIso = "2026-07-15T05:05:00.000Z";
    const addis = extractAddisAbabaDateAndTime(eventIso);
    expect(addis.date).toBe("2026-07-15");
    expect(addis.timeHHMMSS).toBe("08:05:00");
    expect(formatAddisAbabaDateTime(eventIso)).toContain("08:05");

    const punch1 = await processBiometricDeviceAttendanceEvent({
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "404",
      eventTime: eventIso,
      punchType: "Check-In",
      devices: memDevices,
      mappings: memMappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
    });

    expect(punch1.resolved).toBe(true);
    expect(punch1.duplicatePrevented).toBe(false);
    expect(punch1.attendanceRecord?.workerId).toBe("OVID-EMP-2026-0001");
    expect(punch1.attendanceRecord?.method).toBe(AttendanceMethod.FINGERPRINT);
    expect(punch1.attendanceRecord?.deviceUsed).toContain("Bole Gate 1 Terminal");
    expect(memAttendance).toHaveLength(1);

    // Duplicate punch at exact same time is deduplicated safely
    const punchDup = await processBiometricDeviceAttendanceEvent({
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "404",
      eventTime: eventIso,
      punchType: "Check-In",
      devices: memDevices,
      mappings: memMappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
    });
    expect(punchDup.resolved).toBe(true);
    expect(punchDup.duplicatePrevented).toBe(true);
    expect(memAttendance).toHaveLength(1);
  });

  it("9. routes unmapped biometric event to quarantine queue without guessing and resolves after mapping creation", async () => {
    const workers = makeWorkers();
    const schedules = makeSchedules();

    const unmatched = await processBiometricDeviceAttendanceEvent({
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "777",
      eventTime: "2026-07-16T05:10:00.000Z",
      punchType: "Check-In",
      devices: memDevices,
      mappings: memMappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
    });

    expect(unmatched.resolved).toBe(false);
    expect(unmatched.attendanceRecord).toBeUndefined();
    expect(memAttendance).toHaveLength(0);
    expect(memUnmapped).toHaveLength(1);
    expect(memUnmapped[0].status).toBe("Unmapped");

    // Once HR maps 777 -> Abebe Kebede, reprocessing resolves cleanly
    await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "777",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-16",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const resolved = await resolveUnmappedBiometricEventRecord({
      unmappedEvent: memUnmapped[0],
      devices: memDevices,
      mappings: memMappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(resolved.updatedEvent.status).toBe("Resolved");
    expect(resolved.updatedEvent.resolvedEmployeeId).toBe("OVID-EMP-2026-0001");
    expect(memAttendance).toHaveLength(1);
    expect(memAuditLogs.some((l) => l.action === "Unmapped Event Resolved")).toBe(true);
  });

  it("10. enforces strict role permissions for viewing, device management, mapping edits, and deactivation", async () => {
    const workers = makeWorkers();

    expect(resolveBiometricMappingPermissions(UserRole.EMPLOYEE).canView).toBe(false);
    expect(resolveBiometricMappingPermissions(UserRole.WORKER).canView).toBe(false);
    expect(resolveBiometricMappingPermissions(UserRole.FINANCE_MANAGER).canView).toBe(false);
    expect(resolveBiometricMappingPermissions(UserRole.PROJECT_MANAGER).canView).toBe(true);
    expect(resolveBiometricMappingPermissions(UserRole.PROJECT_MANAGER).canCreateEdit).toBe(false);
    expect(resolveBiometricMappingPermissions(UserRole.PROJECT_MANAGER).scopeToAssignedSite).toBe(true);
    expect(resolveBiometricMappingPermissions(UserRole.HR).canCreateEdit).toBe(true);
    expect(resolveBiometricMappingPermissions(UserRole.HR).canDeactivateReactivate).toBe(false);
    expect(resolveBiometricMappingPermissions(UserRole.HR_MANAGER).canDeactivateReactivate).toBe(true);
    expect(resolveBiometricMappingPermissions(UserRole.SUPER_ADMIN).canManageDevices).toBe(true);

    // Finance Manager denied creating mapping
    await expect(
      saveValidatedBiometricMapping({
        employeeIdOrWorkerId: "OVID-EMP-2026-0001",
        deviceId: "BIODEV-BOLE-01",
        biometricUserId: "888",
        workLocationType: "Construction Site",
        projectId: "Bole Tower",
        effectiveDate: "2026-07-01",
        status: "Active",
        workers,
        devices: memDevices,
        existingMappings: memMappings,
        actorName: "Finance Mgr",
        actorUid: "FIN-1",
        actorRole: UserRole.FINANCE_MANAGER,
      })
    ).rejects.toThrow(/Authorization Error/i);

    // Plain HR officer denied registering devices or deactivating mappings
    await expect(
      saveValidatedBiometricDevice({
        deviceCode: "DEV-NEW",
        deviceName: "New Gate",
        manufacturer: "ZKTeco",
        model: "uFace",
        serialNumber: "SN-999",
        workLocationType: "Construction Site",
        deviceLocation: "Gate B",
        status: "Active",
        actorName: "HR Officer",
        actorUid: "HR-OFF",
        actorRole: UserRole.HR,
        existingDevices: memDevices,
      })
    ).rejects.toThrow(/Unauthorized/i);

    const createdByHr = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "889",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "HR Officer",
      actorUid: "HR-OFF",
      actorRole: UserRole.HR,
    });

    await expect(
      toggleBiometricMappingStatus({
        mapping: createdByHr.mapping,
        targetStatus: "Inactive",
        workers,
        devices: memDevices,
        existingMappings: memMappings,
        actorName: "HR Officer",
        actorUid: "HR-OFF",
        actorRole: UserRole.HR,
      })
    ).rejects.toThrow(/Authorization Error/i);
  });

  it("11. preserves existing employee and device records without duplication or stored credentials", async () => {
    const workers = makeWorkers();
    const initialWorkerCount = workers.length;
    const dev = await saveValidatedBiometricDevice({
      deviceCode: "DEV-SITE2-01",
      deviceName: "Kality Site Gate",
      manufacturer: "ZKTeco",
      model: "G3 Pro",
      serialNumber: "ZK-G3P-5511",
      workLocationType: "Construction Site",
      projectName: "Kality Warehouse",
      deviceLocation: "North Gate",
      status: "Active",
      actorName: "HR Mgr",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
      existingDevices: memDevices,
    });

    // Zero secrets/passwords fields stored on device metadata
    expect((dev as any).password).toBeUndefined();
    expect((dev as any).apiSecret).toBeUndefined();
    expect(workers).toHaveLength(initialWorkerCount);

    const { mapping } = await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: dev.id,
      biometricUserId: "901",
      workLocationType: "Construction Site",
      projectId: "Kality Warehouse",
      effectiveDate: "2026-07-10",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "HR Mgr",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    expect(mapping.workerRecordId).toBe(workers[0].id);
    expect(mapping.deviceId).toBe(dev.id);
    expect((mapping as any).fingerprintTemplate).toBeUndefined();
  });

  it("12. parses ZKTeco G3 Pro & MB360 Plus ATTLOG payloads, strips templates/secrets, and pairs Check-In/Out in batch", async () => {
    const {
      parseZKTecoAdmsAttLog,
      sanitizeBiometricMetadata,
      ZKTECO_VERIFIED_HARDWARE_PROFILES,
    } = await import("../services/zktecoConnector");
    const { batchProcessZKTecoEvents } = await import("../services/biometricMappingService");

    expect(ZKTECO_VERIFIED_HARDWARE_PROFILES.map((p) => p.model)).toEqual(["G3 Pro", "MB360 Plus"]);

    const scrubbed = sanitizeBiometricMetadata({
      deviceSerialNumber: "ZK-G3P-5511",
      password: "super-secret-password",
      commKey: "123456",
      fingerprintTemplate: "RAW_BASE64_FP_BLOB",
      faceTemplate: "RAW_FACE_VECTOR",
      nested: {
        userPic: "JPEG_BLOB",
        verifyModeLabel: "Face",
      },
    });
    expect((scrubbed as any).password).toBeUndefined();
    expect((scrubbed as any).commKey).toBeUndefined();
    expect((scrubbed as any).fingerprintTemplate).toBeUndefined();
    expect((scrubbed as any).faceTemplate).toBeUndefined();
    expect((scrubbed as any).nested.userPic).toBeUndefined();
    expect((scrubbed as any).nested.verifyModeLabel).toBe("Face");

    const rawAdmsPayload = [
      "BIODATA\tPIN=101\tValid=1\tTMP=SECRET_TEMPLATE_HEX",
      "101\t2026-07-20 08:04:00\t0\t15\t0", // 08:04 Addis Check-In (Face)
      "101\t2026-07-20 08:06:30\t0\t15\t0", // Double-tap within 5 min -> deduplicated
      "101\t2026-07-20 17:10:00\t1\t15\t0", // 17:10 Addis Check-Out (Face)
      "999\t2026-07-20 08:12:00\t0\t1\t0",  // Unmapped user -> quarantined without guessing
    ].join("\n");

    const parsed = parseZKTecoAdmsAttLog(rawAdmsPayload, {
      deviceSerialNumber: "ZK-SF5-99001", // Existing BIODEV-BOLE-01 serial number
      sourceProtocol: "ADMS_PUSH_HTTP",
    });

    expect(parsed.skippedTemplateLines).toBe(1);
    expect(parsed.events).toHaveLength(4);
    expect(parsed.events[0].punchType).toBe("Check-In");
    expect(parsed.events[0].verifyModeLabel).toBe("Face");
    expect(parsed.events[2].punchType).toBe("Check-Out");

    const workers = makeWorkers();
    const schedules = makeSchedules();
    await saveValidatedBiometricMapping({
      employeeIdOrWorkerId: "OVID-EMP-2026-0001",
      deviceId: "BIODEV-BOLE-01",
      biometricUserId: "101",
      workLocationType: "Construction Site",
      projectId: "Bole Tower",
      effectiveDate: "2026-07-01",
      status: "Active",
      workers,
      devices: memDevices,
      existingMappings: memMappings,
      actorName: "Selamawit HR",
      actorUid: "HR-1",
      actorRole: UserRole.HR_MANAGER,
    });

    const batch = await batchProcessZKTecoEvents({
      events: parsed.events.map((e, idx) => ({ ...e, id: `EVT-${idx}` })),
      devices: memDevices,
      mappings: memMappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });

    expect(batch.total).toBe(4);
    expect(batch.matched).toBe(2); // Check-In + Check-Out
    expect(batch.duplicatesSkipped).toBe(1); // 08:06:30 double-tap skipped
    expect(batch.unmappedQueued).toBe(1); // BioID 999 quarantined
    expect(memAttendance).toHaveLength(1);
    expect(memAttendance[0].checkIn).toBe("08:04:00");
    expect(memAttendance[0].checkOut).toBe("17:10:00");
    expect(memAttendance[0].biometricDeviceId).toBe("BIODEV-BOLE-01");
    expect(memAttendance[0].biometricUserId).toBe("101");
    expect(memAttendance[0].biometricSourceProtocol).toBe("ADMS_PUSH_HTTP");
    expect(memUnmapped).toHaveLength(1);
    expect(memUnmapped[0].biometricUserId).toBe("999");

    // Re-running the same batch must be 100% idempotent (0 new attendance, 0 duplicate unmapped rows)
    const retryBatch = await batchProcessZKTecoEvents({
      events: parsed.events.map((e, idx) => ({ ...e, id: `EVT-RETRY-${idx}` })),
      devices: memDevices,
      mappings: memMappings,
      workers,
      schedules,
      existingAttendance: memAttendance,
      existingUnmappedEvents: memUnmapped,
    });
    expect(retryBatch.matched).toBe(0);
    expect(retryBatch.unmappedQueued).toBe(0);
    expect(retryBatch.duplicatesSkipped).toBe(4);
    expect(memAttendance).toHaveLength(1);
    expect(memUnmapped).toHaveLength(1);
  });
});

