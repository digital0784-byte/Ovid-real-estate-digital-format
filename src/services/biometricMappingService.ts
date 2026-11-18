import {
  AttendanceMethod,
  AttendanceRecord,
  BiometricDeviceMapping,
  BiometricDeviceProtocolType,
  BiometricDeviceRecord,
  BiometricMappingAuditAction,
  BiometricMappingAuditLog,
  BiometricMappingStatus,
  LeaveRequestRecord,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";
import { DbService } from "./db";
import { authFetch } from "./authService";
import { computeScheduleAttendanceMetrics, resolveWorkerSchedule } from "./hrmService";
import { sanitizeBiometricMetadata, ZKTecoNormalizedEvent } from "./zktecoConnector";

export interface BiometricMappingPermissions {
  canView: boolean;
  canManageDevices: boolean;
  canCreateEdit: boolean;
  canDeactivateReactivate: boolean;
  canResolveUnmappedEvents: boolean;
  canExport: boolean;
  scopeToAssignedSite: boolean;
}

export function resolveBiometricMappingPermissions(role: UserRole | string): BiometricMappingPermissions {
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isHrManager = role === UserRole.HR_MANAGER;
  const isHrOfficer = role === UserRole.HR;
  const isExecutiveViewer =
    role === UserRole.DIRECTOR || role === UserRole.DIRECTORY || role === UserRole.HEAD_OFFICE;
  const isScopedManager =
    role === UserRole.PROJECT_MANAGER ||
    role === UserRole.SECTION_HEAD ||
    role === UserRole.OPERATION_MANAGER ||
    role === UserRole.OFFICE_MANAGER ||
    role === UserRole.SITE_ENGINEER;

  if (isSuperAdmin || isHrManager) {
    return {
      canView: true,
      canManageDevices: true,
      canCreateEdit: true,
      canDeactivateReactivate: true,
      canResolveUnmappedEvents: true,
      canExport: true,
      scopeToAssignedSite: false,
    };
  }

  if (isHrOfficer) {
    return {
      canView: true,
      canManageDevices: false,
      canCreateEdit: true,
      canDeactivateReactivate: false,
      canResolveUnmappedEvents: true,
      canExport: true,
      scopeToAssignedSite: false,
    };
  }

  if (isExecutiveViewer) {
    return {
      canView: true,
      canManageDevices: false,
      canCreateEdit: false,
      canDeactivateReactivate: false,
      canResolveUnmappedEvents: false,
      canExport: true,
      scopeToAssignedSite: false,
    };
  }

  if (isScopedManager) {
    return {
      canView: true,
      canManageDevices: false,
      canCreateEdit: false,
      canDeactivateReactivate: false,
      canResolveUnmappedEvents: false,
      canExport: false,
      scopeToAssignedSite: true,
    };
  }

  return {
    canView: false,
    canManageDevices: false,
    canCreateEdit: false,
    canDeactivateReactivate: false,
    canResolveUnmappedEvents: false,
    canExport: false,
    scopeToAssignedSite: true,
  };
}

export function formatAddisAbabaDateTime(isoString?: string): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

export function extractAddisAbabaDateAndTime(isoString: string): { date: string; timeHHMMSS: string } {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      timeHHMMSS: now.toISOString().slice(11, 19),
    };
  }
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
    const hour = get("hour") === "24" ? "00" : get("hour");
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      timeHHMMSS: `${hour}:${get("minute")}:${get("second")}`,
    };
  } catch {
    return {
      date: d.toISOString().slice(0, 10),
      timeHHMMSS: d.toISOString().slice(11, 19),
    };
  }
}

export interface BiometricMappingValidationResult {
  valid: boolean;
  error?: string;
  worker?: Worker;
  device?: BiometricDeviceRecord;
}

export function validateBiometricMappingInput(params: {
  employeeIdOrWorkerId: string;
  deviceId: string;
  biometricUserId: string;
  effectiveDate: string;
  status: BiometricMappingStatus;
  workers: Worker[];
  devices: BiometricDeviceRecord[];
  existingMappings: BiometricDeviceMapping[];
  editingMappingId?: string;
}): BiometricMappingValidationResult {
  const cleanBioId = String(params.biometricUserId || "").trim();
  if (!cleanBioId) {
    return { valid: false, error: "Biometric User ID is mandatory." };
  }
  if (!String(params.effectiveDate || "").trim()) {
    return { valid: false, error: "Effective Date is mandatory." };
  }

  const worker = params.workers.find(
    (w) =>
      w.id === params.employeeIdOrWorkerId ||
      (w.employeeId && w.employeeId === params.employeeIdOrWorkerId)
  );
  if (!worker) {
    return {
      valid: false,
      error: "Selected Employee ID does not exist in existing ERP employee records.",
    };
  }

  const device = params.devices.find((d) => d.id === params.deviceId);
  if (!device) {
    return {
      valid: false,
      error: "Selected Biometric Device does not exist in registered biometric devices.",
    };
  }

  if (params.status === "Active") {
    if (worker.status !== "Active") {
      return {
        valid: false,
        error: `Cannot create or activate biometric mapping for inactive employee ${worker.name} (${worker.employeeId || worker.id}).`,
      };
    }

    if (device.status !== "Active") {
      return {
        valid: false,
        error: `Selected Biometric Device "${device.deviceName}" is Inactive. Only Active devices can hold active mappings.`,
      };
    }

    // 1) Prevent duplicate active Biometric User ID on the SAME device across different employees
    const dupBioUserOnSameDevice = params.existingMappings.find(
      (m) =>
        m.id !== params.editingMappingId &&
        m.status === "Active" &&
        m.deviceId === device.id &&
        String(m.biometricUserId || "").trim().toLowerCase() === cleanBioId.toLowerCase()
    );
    if (dupBioUserOnSameDevice) {
      return {
        valid: false,
        error: `Duplicate Biometric User ID: ID "${cleanBioId}" is already actively assigned to ${dupBioUserOnSameDevice.employeeNameSnapshot} (${dupBioUserOnSameDevice.employeeId}) on device ${device.deviceName}.`,
      };
    }

    // 2) Prevent duplicate active mappings for the SAME employee on the SAME device
    const dupEmpOnSameDevice = params.existingMappings.find(
      (m) =>
        m.id !== params.editingMappingId &&
        m.status === "Active" &&
        (m.workerRecordId === worker.id || m.employeeId === (worker.employeeId || worker.id)) &&
        m.deviceId === device.id
    );
    if (dupEmpOnSameDevice) {
      return {
        valid: false,
        error: `Duplicate Active Mapping: ${worker.name} already has an active mapping (Biometric User ID: ${dupEmpOnSameDevice.biometricUserId}) on device ${device.deviceName}.`,
      };
    }
  }

  return { valid: true, worker, device };
}

export async function saveValidatedBiometricDevice(params: {
  editingDevice?: BiometricDeviceRecord | null;
  deviceCode: string;
  deviceName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  workLocationType: "Head Office" | "Construction Site";
  projectId?: string;
  projectName?: string;
  deviceLocation: string;
  protocolType?: BiometricDeviceProtocolType;
  networkTopology?: string;
  admsPath?: string;
  supportedCapabilities?: string[];
  status: "Active" | "Inactive";
  notes?: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  existingDevices: BiometricDeviceRecord[];
}): Promise<BiometricDeviceRecord> {
  const perms = resolveBiometricMappingPermissions(params.actorRole);
  if (!perms.canManageDevices) {
    throw new Error("Unauthorized: Only HR Manager or Super Admin can register or modify biometric devices.");
  }

  const serial = params.serialNumber.trim();
  const code = params.deviceCode.trim();
  if (!params.deviceName.trim() || !serial || !code) {
    throw new Error("Device Code, Device Name, and Serial Number are required.");
  }

  const dupSerial = params.existingDevices.find(
    (d) =>
      d.id !== params.editingDevice?.id &&
      String(d.serialNumber || "").trim().toLowerCase() === serial.toLowerCase()
  );
  if (dupSerial) {
    throw new Error(`Device with serial number "${serial}" is already registered (${dupSerial.deviceName}).`);
  }

  const nowIso = new Date().toISOString();
  const record: BiometricDeviceRecord = sanitizeBiometricMetadata({
    id: params.editingDevice?.id || `BIODEV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    deviceCode: code,
    deviceName: params.deviceName.trim(),
    manufacturer: params.manufacturer.trim() || "ZKTeco",
    model: params.model.trim() || "G3 Pro",
    serialNumber: serial,
    workLocationType: params.workLocationType,
    projectId: params.projectId || (params.workLocationType === "Head Office" ? "HEAD-OFFICE" : params.projectName || ""),
    projectName: params.projectName || (params.workLocationType === "Head Office" ? "Head Office" : ""),
    deviceLocation: params.deviceLocation.trim(),
    protocolType: params.protocolType || params.editingDevice?.protocolType || "ADMS_PUSH_HTTP",
    networkTopology:
      params.networkTopology?.trim() ||
      params.editingDevice?.networkTopology ||
      "Separate Site Network (ADMS Cloud Push)",
    admsPath: params.admsPath?.trim() || params.editingDevice?.admsPath || "/iclock/cdata",
    supportedCapabilities:
      params.supportedCapabilities && params.supportedCapabilities.length > 0
        ? params.supportedCapabilities
        : params.editingDevice?.supportedCapabilities || ["Fingerprint", "Face"],
    lastHandshakeAt: params.editingDevice?.lastHandshakeAt,
    lastEventAt: params.editingDevice?.lastEventAt,
    connectionVerified: params.editingDevice?.connectionVerified ?? false,
    status: params.status,
    notes: params.notes?.trim() || "",
    createdBy: params.editingDevice?.createdBy || params.actorName,
    createdByUid: params.editingDevice?.createdByUid || params.actorUid,
    createdAt: params.editingDevice?.createdAt || nowIso,
    updatedBy: params.actorName,
    updatedAt: nowIso,
  });

  await DbService.saveBiometricDevice(record);
  return record;
}

export async function saveValidatedBiometricMapping(params: {
  editingMapping?: BiometricDeviceMapping | null;
  employeeIdOrWorkerId: string;
  deviceId: string;
  biometricUserId: string;
  workLocationType: "Head Office" | "Construction Site";
  projectId: string;
  effectiveDate: string;
  status: BiometricMappingStatus;
  notes?: string;
  workers: Worker[];
  devices: BiometricDeviceRecord[];
  existingMappings: BiometricDeviceMapping[];
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
}): Promise<{ mapping: BiometricDeviceMapping; auditLogs: BiometricMappingAuditLog[] }> {
  const perms = resolveBiometricMappingPermissions(params.actorRole);
  if (!perms.canCreateEdit) {
    throw new Error(
      `Authorization Error: Role "${params.actorRole}" does not have permission to create or edit biometric mappings.`
    );
  }

  const validation = validateBiometricMappingInput({
    employeeIdOrWorkerId: params.employeeIdOrWorkerId,
    deviceId: params.deviceId,
    biometricUserId: params.biometricUserId,
    effectiveDate: params.effectiveDate,
    status: params.status,
    workers: params.workers,
    devices: params.devices,
    existingMappings: params.existingMappings,
    editingMappingId: params.editingMapping?.id,
  });

  if (!validation.valid || !validation.worker || !validation.device) {
    throw new Error(validation.error || "Invalid biometric mapping parameters.");
  }

  const { worker, device } = validation;
  const nowIso = new Date().toISOString();
  const cleanBioId = params.biometricUserId.trim();
  const empId = worker.employeeId || worker.id;
  const resolvedProject =
    params.projectId.trim() ||
    (params.workLocationType === "Head Office"
      ? "Head Office"
      : worker.assignedProject || worker.currentSite || device.projectName || "Head Office");

  const mapping: BiometricDeviceMapping = {
    id:
      params.editingMapping?.id ||
      `BIOMAP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    employeeId: empId,
    workerRecordId: worker.id,
    employeeNameSnapshot: worker.name,
    departmentSnapshot: worker.department || "Operations",
    positionSnapshot: worker.position || worker.trade || "Staff",
    employmentStatusSnapshot: worker.status || "Active",
    biometricUserId: cleanBioId,
    deviceId: device.id,
    deviceNameSnapshot: device.deviceName,
    deviceModelSnapshot: `${device.manufacturer} ${device.model}`.trim(),
    deviceSerialNumberSnapshot: device.serialNumber,
    workLocationId: params.workLocationType === "Head Office" ? "HEAD_OFFICE" : resolvedProject,
    workLocationType: params.workLocationType,
    projectId: resolvedProject,
    projectNameSnapshot: resolvedProject,
    effectiveDate: params.effectiveDate,
    status: params.status,
    notes: params.notes?.trim() || "",
    createdBy: params.editingMapping?.createdBy || params.actorName,
    createdByUid: params.editingMapping?.createdByUid || params.actorUid,
    createdAt: params.editingMapping?.createdAt || nowIso,
    updatedBy: params.actorName,
    updatedByUid: params.actorUid,
    updatedAt: nowIso,
    deactivatedBy: params.status === "Inactive" ? params.editingMapping?.deactivatedBy || params.actorName : undefined,
    deactivatedByUid:
      params.status === "Inactive" ? params.editingMapping?.deactivatedByUid || params.actorUid : undefined,
    deactivatedAt: params.status === "Inactive" ? params.editingMapping?.deactivatedAt || nowIso : undefined,
    deactivationReason: params.status === "Inactive" ? params.editingMapping?.deactivationReason : undefined,
  };

  await DbService.saveBiometricDeviceMapping(mapping);

  const auditLogs: BiometricMappingAuditLog[] = [];
  const createAudit = async (
    action: BiometricMappingAuditAction,
    previousValue?: Record<string, any>,
    newValue?: Record<string, any>,
    reason?: string
  ) => {
    const log: BiometricMappingAuditLog = {
      id: `BIOLOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      mappingId: mapping.id,
      employeeId: mapping.employeeId,
      employeeName: mapping.employeeNameSnapshot,
      deviceId: mapping.deviceId,
      deviceName: mapping.deviceNameSnapshot,
      biometricUserId: mapping.biometricUserId,
      action,
      previousValue,
      newValue,
      reason,
      actorName: params.actorName,
      actorUid: params.actorUid,
      actorRole: String(params.actorRole),
      timestamp: nowIso,
    };
    await DbService.addBiometricMappingAuditLog(log);
    auditLogs.push(log);
  };

  if (!params.editingMapping) {
    await createAudit(
      "Mapping Created",
      undefined,
      {
        biometricUserId: mapping.biometricUserId,
        deviceId: mapping.deviceId,
        deviceName: mapping.deviceNameSnapshot,
        workLocationType: mapping.workLocationType,
        projectId: mapping.projectId,
        status: mapping.status,
      },
      params.notes?.trim()
    );
  } else {
    const prev = params.editingMapping;
    if (prev.biometricUserId !== mapping.biometricUserId) {
      await createAudit(
        "Biometric User ID Changed",
        { biometricUserId: prev.biometricUserId },
        { biometricUserId: mapping.biometricUserId },
        params.notes?.trim()
      );
    }
    if (prev.deviceId !== mapping.deviceId) {
      await createAudit(
        "Device Changed",
        { deviceId: prev.deviceId, deviceName: prev.deviceNameSnapshot },
        { deviceId: mapping.deviceId, deviceName: mapping.deviceNameSnapshot },
        params.notes?.trim()
      );
    }
    if (prev.biometricUserId === mapping.biometricUserId && prev.deviceId === mapping.deviceId) {
      await createAudit(
        "Mapping Edited",
        {
          workLocationType: prev.workLocationType,
          projectId: prev.projectId,
          effectiveDate: prev.effectiveDate,
          status: prev.status,
          notes: prev.notes,
        },
        {
          workLocationType: mapping.workLocationType,
          projectId: mapping.projectId,
          effectiveDate: mapping.effectiveDate,
          status: mapping.status,
          notes: mapping.notes,
        },
        params.notes?.trim()
      );
    }
  }

  return { mapping, auditLogs };
}

export async function toggleBiometricMappingStatus(params: {
  mapping: BiometricDeviceMapping;
  targetStatus: BiometricMappingStatus;
  reason?: string;
  workers: Worker[];
  devices: BiometricDeviceRecord[];
  existingMappings: BiometricDeviceMapping[];
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
}): Promise<{ mapping: BiometricDeviceMapping; auditLog: BiometricMappingAuditLog }> {
  const perms = resolveBiometricMappingPermissions(params.actorRole);
  if (!perms.canDeactivateReactivate) {
    throw new Error(
      `Authorization Error: Only HR Manager or Super Admin can activate or deactivate biometric mappings.`
    );
  }

  if (params.targetStatus === "Active") {
    const check = validateBiometricMappingInput({
      employeeIdOrWorkerId: params.mapping.workerRecordId || params.mapping.employeeId,
      deviceId: params.mapping.deviceId,
      biometricUserId: params.mapping.biometricUserId,
      effectiveDate: params.mapping.effectiveDate,
      status: "Active",
      workers: params.workers,
      devices: params.devices,
      existingMappings: params.existingMappings,
      editingMappingId: params.mapping.id,
    });
    if (!check.valid) {
      throw new Error(check.error || "Cannot reactivate conflicting or invalid mapping.");
    }
  }

  const nowIso = new Date().toISOString();
  const updated: BiometricDeviceMapping = {
    ...params.mapping,
    status: params.targetStatus,
    updatedBy: params.actorName,
    updatedByUid: params.actorUid,
    updatedAt: nowIso,
    ...(params.targetStatus === "Inactive"
      ? {
          deactivatedBy: params.actorName,
          deactivatedByUid: params.actorUid,
          deactivatedAt: nowIso,
          deactivationReason: params.reason?.trim() || "Deactivated by administrator",
        }
      : {
          deactivationReason: undefined,
        }),
  };

  await DbService.saveBiometricDeviceMapping(updated);

  const auditLog: BiometricMappingAuditLog = {
    id: `BIOLOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    mappingId: updated.id,
    employeeId: updated.employeeId,
    employeeName: updated.employeeNameSnapshot,
    deviceId: updated.deviceId,
    deviceName: updated.deviceNameSnapshot,
    biometricUserId: updated.biometricUserId,
    action: params.targetStatus === "Inactive" ? "Mapping Deactivated" : "Mapping Activated",
    previousValue: { status: params.mapping.status },
    newValue: { status: params.targetStatus },
    reason: params.reason?.trim() || undefined,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
  };

  await DbService.addBiometricMappingAuditLog(auditLog);
  return { mapping: updated, auditLog };
}

function hhmmssToSeconds(t?: string | null): number | null {
  if (!t) return null;
  const parts = t.split(":").map(Number);
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
}

export async function processBiometricDeviceAttendanceEvent(params: {
  deviceId?: string;
  deviceSerialNumber?: string;
  biometricUserId: string;
  eventTime: string;
  punchType?: "Check-In" | "Check-Out" | "Lunch-Out" | "Lunch-In" | "Unknown";
  sourceProtocol?: BiometricDeviceProtocolType;
  rawEventMeta?: Record<string, any>;
  devices: BiometricDeviceRecord[];
  mappings: BiometricDeviceMapping[];
  workers: Worker[];
  schedules: WorkScheduleConfig[];
  approvedLeaves?: LeaveRequestRecord[];
  existingAttendance: AttendanceRecord[];
  existingUnmappedEvents?: UnmappedBiometricEvent[];
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<{
  resolved: boolean;
  duplicatePrevented?: boolean;
  attendanceRecord?: AttendanceRecord;
  mapping?: BiometricDeviceMapping;
  unmappedEvent?: UnmappedBiometricEvent;
  reason?: string;
}> {
  const cleanBioId = String(params.biometricUserId || "").trim();
  const cleanDeviceId = String(params.deviceId || "").trim();
  const cleanSerial = String(params.deviceSerialNumber || "").trim();

  // Resolve device strictly by ID or exact registered Serial Number (never guess)
  const device =
    (cleanDeviceId ? params.devices.find((d) => d.id === cleanDeviceId) : undefined) ||
    (cleanSerial
      ? params.devices.find((d) => String(d.serialNumber || "").trim().toLowerCase() === cleanSerial.toLowerCase())
      : undefined);

  const resolvedDeviceKey = device?.id || cleanDeviceId || (cleanSerial ? `SN:${cleanSerial}` : "UNKNOWN-DEVICE");
  const nowIso = new Date().toISOString();

  // Strictly match ACTIVE mapping on exact (device.id, biometricUserId)
  const activeMapping =
    device && device.status === "Active"
      ? params.mappings.find(
          (m) =>
            m.status === "Active" &&
            m.deviceId === device.id &&
            String(m.biometricUserId || "").trim().toLowerCase() === cleanBioId.toLowerCase()
        )
      : undefined;

  const worker = activeMapping
    ? params.workers.find(
        (w) =>
          w.id === activeMapping.workerRecordId ||
          (w.employeeId && w.employeeId === activeMapping.employeeId)
      )
    : undefined;

  if (!device || device.status !== "Active" || !activeMapping || !worker || worker.status !== "Active") {
    const exceptionCategory: UnmappedBiometricEvent["exceptionCategory"] = !device
      ? "Unauthorized Device"
      : device.status !== "Active"
      ? "Inactive Device"
      : !activeMapping
      ? "Unmatched Biometric ID"
      : "Inactive Employee";

    const reason = !device
      ? `Biometric device (${cleanSerial || cleanDeviceId || "unknown"}) is not registered in ERP.`
      : device.status !== "Active"
      ? `Device "${device.deviceName}" is Inactive.`
      : !activeMapping
      ? `No Active mapping for Biometric User ID "${cleanBioId}" on device "${device.deviceName}".`
      : !worker
      ? `Mapped Employee (${activeMapping.employeeId}) not found in ERP.`
      : `Mapped Employee (${worker.name}) is Inactive.`;

    const sanitizedMeta = sanitizeBiometricMetadata({
      ...(params.rawEventMeta || {}),
      deviceSerialNumber: cleanSerial || device?.serialNumber,
      sourceProtocol: params.sourceProtocol || device?.protocolType,
      failureReason: reason,
    });

    const punchType = params.punchType || "Check-In";
    const duplicateQueued = (params.existingUnmappedEvents || []).find(
      (u) =>
        u.status === "Unmapped" &&
        u.deviceId === resolvedDeviceKey &&
        String(u.biometricUserId || "").trim().toLowerCase() === cleanBioId.toLowerCase() &&
        u.eventTime === params.eventTime &&
        u.punchType === punchType
    );
    if (duplicateQueued) {
      return { resolved: false, duplicatePrevented: true, unmappedEvent: duplicateQueued, reason };
    }

    const unmappedEvent: UnmappedBiometricEvent = {
      id: `UNMAP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      deviceId: resolvedDeviceKey,
      deviceName: device?.deviceName || (cleanSerial ? `Unregistered Terminal (${cleanSerial})` : resolvedDeviceKey),
      biometricUserId: cleanBioId,
      eventTime: params.eventTime,
      punchType,
      workLocationType: device?.workLocationType,
      projectName: device?.projectName,
      status: "Unmapped",
      exceptionCategory,
      rawEventMeta: sanitizedMeta,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await DbService.saveUnmappedBiometricEvent(unmappedEvent);
    return { resolved: false, unmappedEvent, reason };
  }

  const { date, timeHHMMSS } = extractAddisAbabaDateAndTime(params.eventTime);
  const existingDayRecord = params.existingAttendance.find(
    (a) => (a.workerId === worker.id || a.workerId === activeMapping.employeeId) && a.date === date
  );

  const normalizedPunchType =
    params.punchType && params.punchType !== "Unknown"
      ? params.punchType
      : existingDayRecord?.checkIn
      ? "Check-Out"
      : "Check-In";

  // Deduplicate exact same timestamp/punch OR double-tap repeat within 5 minutes
  if (existingDayRecord) {
    const incomingSec = hhmmssToSeconds(timeHHMMSS);
    const existingInSec = hhmmssToSeconds(existingDayRecord.checkIn);
    const existingOutSec = hhmmssToSeconds(existingDayRecord.checkOut);

    const sameCheckIn =
      normalizedPunchType === "Check-In" &&
      existingDayRecord.checkIn &&
      (existingDayRecord.checkIn === timeHHMMSS ||
        (incomingSec !== null && existingInSec !== null && Math.abs(incomingSec - existingInSec) <= 300));

    const sameCheckOut =
      normalizedPunchType === "Check-Out" &&
      existingDayRecord.checkOut &&
      (existingDayRecord.checkOut === timeHHMMSS ||
        (incomingSec !== null && existingOutSec !== null && Math.abs(incomingSec - existingOutSec) <= 300));

    if (sameCheckIn || sameCheckOut) {
      return {
        resolved: true,
        duplicatePrevented: true,
        attendanceRecord: existingDayRecord,
        mapping: activeMapping,
      };
    }
  }

  const nextCheckIn =
    normalizedPunchType === "Check-In" ? timeHHMMSS : existingDayRecord?.checkIn || null;
  const nextCheckOut =
    normalizedPunchType === "Check-Out" ? timeHHMMSS : existingDayRecord?.checkOut || null;
  const nextLunchOut =
    normalizedPunchType === "Lunch-Out" ? timeHHMMSS : existingDayRecord?.lunchOut || null;
  const nextLunchIn =
    normalizedPunchType === "Lunch-In" ? timeHHMMSS : existingDayRecord?.lunchIn || null;

  const sched = resolveWorkerSchedule(worker, params.schedules, date);
  const metrics = computeScheduleAttendanceMetrics({
    date,
    checkIn: nextCheckIn ? nextCheckIn.slice(0, 5) : null,
    checkOut: nextCheckOut ? nextCheckOut.slice(0, 5) : null,
    schedule: sched,
    approvedLeaves: params.approvedLeaves,
    workerId: worker.id,
    employeeId: activeMapping.employeeId,
  });

  const protocolUsed = params.sourceProtocol || device.protocolType || "ADMS_PUSH_HTTP";

  const record: AttendanceRecord = {
    id: existingDayRecord?.id || `ATT-BIO-${worker.id}-${date}`,
    workerId: worker.id,
    workerName: worker.name,
    department: worker.department || activeMapping.departmentSnapshot,
    trade: worker.trade || worker.position || activeMapping.positionSnapshot,
    company: worker.company || "OVID Real Estate — Digital Construction ERP",
    building: worker.assignedProject || activeMapping.projectNameSnapshot || "Head Office",
    floor: worker.floor || 1,
    zone:
      activeMapping.workLocationType === "Head Office"
        ? "Head Office"
        : worker.zone || activeMapping.projectNameSnapshot,
    date,
    checkIn: nextCheckIn,
    checkOut: nextCheckOut,
    ...(nextLunchOut ? { lunchOut: nextLunchOut } : {}),
    ...(nextLunchIn ? { lunchIn: nextLunchIn } : {}),
    method: AttendanceMethod.FINGERPRINT,
    workingHours: metrics.workingHours,
    overtime: metrics.overtime,
    overtimeCandidateHours: metrics.overtimeCandidateHours,
    underTime: metrics.underTime,
    lateArrivalMinutes: metrics.lateArrivalMinutes,
    earlyDepartureMinutes: metrics.earlyDepartureMinutes,
    status: metrics.status,
    punchCompleteness: metrics.punchCompleteness,
    missingPunchType: metrics.missingPunchType,
    hrReviewStatus: metrics.hrReviewStatus,
    ...(metrics.missingPunchType !== "None"
      ? { exceptionReason: `${metrics.missingPunchType} detected on biometric terminal ${device.deviceName}` }
      : {}),
    workLocationType: activeMapping.workLocationType,
    deviceUsed: `${device.deviceName} (BioID: ${activeMapping.biometricUserId})`,
    verifiedBy: `Mapped Device Terminal (${activeMapping.deviceSerialNumberSnapshot})`,
    biometricStatus: `Mapped Device Verified (${device.model} · User ID: ${activeMapping.biometricUserId})`,
    scheduleId: sched?.id,
    biometricDeviceId: device.id,
    biometricDeviceName: device.deviceName,
    biometricUserId: activeMapping.biometricUserId,
    biometricMappingId: activeMapping.id,
    biometricSourceProtocol: protocolUsed,
  };

  if (params.onSaveAttendance) {
    await params.onSaveAttendance(record);
  } else {
    await DbService.addAttendanceRecord(record);
  }

  return {
    resolved: true,
    duplicatePrevented: false,
    attendanceRecord: record,
    mapping: activeMapping,
  };
}

export interface BatchProcessZKTecoResult {
  total: number;
  matched: number;
  duplicatesSkipped: number;
  unmappedQueued: number;
  processedEventIds: string[];
  results: Array<{
    biometricUserId: string;
    deviceSerialNumber: string;
    eventTime: string;
    outcome: "matched" | "duplicate" | "unmapped";
    workerName?: string;
    reason?: string;
  }>;
}

export async function batchProcessZKTecoEvents(params: {
  events: Array<ZKTecoNormalizedEvent & { id?: string }>;
  devices: BiometricDeviceRecord[];
  mappings: BiometricDeviceMapping[];
  workers: Worker[];
  schedules: WorkScheduleConfig[];
  approvedLeaves?: LeaveRequestRecord[];
  existingAttendance: AttendanceRecord[];
  existingUnmappedEvents?: UnmappedBiometricEvent[];
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<BatchProcessZKTecoResult> {
  const ordered = [...params.events].sort((a, b) => a.eventTime.localeCompare(b.eventTime));
  let workingAttendance = [...params.existingAttendance];
  let workingUnmapped = [...(params.existingUnmappedEvents || [])];

  let matched = 0;
  let duplicatesSkipped = 0;
  let unmappedQueued = 0;
  const processedEventIds: string[] = [];
  const results: BatchProcessZKTecoResult["results"] = [];

  for (const evt of ordered) {
    const res = await processBiometricDeviceAttendanceEvent({
      deviceId: evt.deviceId,
      deviceSerialNumber: evt.deviceSerialNumber,
      biometricUserId: evt.biometricUserId,
      eventTime: evt.eventTime,
      punchType: evt.punchType,
      sourceProtocol: evt.sourceProtocol,
      rawEventMeta: sanitizeBiometricMetadata({
        verifyModeLabel: evt.verifyModeLabel,
        workCode: evt.workCode,
        rawDeviceTimestamp: evt.rawDeviceTimestamp,
        eventFingerprint: evt.eventFingerprint,
      }),
      devices: params.devices,
      mappings: params.mappings,
      workers: params.workers,
      schedules: params.schedules,
      approvedLeaves: params.approvedLeaves,
      existingAttendance: workingAttendance,
      existingUnmappedEvents: workingUnmapped,
      onSaveAttendance: params.onSaveAttendance,
    });

    if (evt.id) processedEventIds.push(evt.id);

    if (res.resolved && res.attendanceRecord) {
      workingAttendance = [
        res.attendanceRecord,
        ...workingAttendance.filter((a) => a.id !== res.attendanceRecord!.id),
      ];
      if (res.duplicatePrevented) {
        duplicatesSkipped += 1;
        results.push({
          biometricUserId: evt.biometricUserId,
          deviceSerialNumber: evt.deviceSerialNumber,
          eventTime: evt.eventTime,
          outcome: "duplicate",
          workerName: res.attendanceRecord.workerName,
        });
      } else {
        matched += 1;
        results.push({
          biometricUserId: evt.biometricUserId,
          deviceSerialNumber: evt.deviceSerialNumber,
          eventTime: evt.eventTime,
          outcome: "matched",
          workerName: res.attendanceRecord.workerName,
        });
      }
    } else {
      if (res.unmappedEvent && !res.duplicatePrevented) {
        workingUnmapped = [res.unmappedEvent, ...workingUnmapped];
        unmappedQueued += 1;
      } else if (res.duplicatePrevented) {
        duplicatesSkipped += 1;
      }
      results.push({
        biometricUserId: evt.biometricUserId,
        deviceSerialNumber: evt.deviceSerialNumber,
        eventTime: evt.eventTime,
        outcome: res.duplicatePrevented ? "duplicate" : "unmapped",
        reason: res.reason,
      });
    }
  }

  return {
    total: ordered.length,
    matched,
    duplicatesSkipped,
    unmappedQueued,
    processedEventIds,
    results,
  };
}

export async function fetchBiometricConnectorStatus(): Promise<{
  success: boolean;
  hardwareConnected: boolean;
  sharedKeyConfigured: boolean;
  pendingQueueCount: number;
  discardedTemplatePackets: number;
  handshakenDevices: Array<{
    serialNumber: string;
    protocol: string;
    lastHandshakeAt: string;
    lastTable: string;
    eventsReceivedCount: number;
  }>;
  admsEndpoints?: Record<string, string>;
}> {
  const res = await authFetch("/api/biometric/connector/status");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Connector status check failed (${res.status}).`);
  }
  return res.json();
}

export async function pullAndProcessConnectorQueue(params: {
  devices: BiometricDeviceRecord[];
  mappings: BiometricDeviceMapping[];
  workers: Worker[];
  schedules: WorkScheduleConfig[];
  approvedLeaves?: LeaveRequestRecord[];
  existingAttendance: AttendanceRecord[];
  existingUnmappedEvents?: UnmappedBiometricEvent[];
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<BatchProcessZKTecoResult> {
  const queueRes = await authFetch("/api/biometric/connector/queue");
  if (!queueRes.ok) {
    const err = await queueRes.json().catch(() => ({}));
    throw new Error(err.message || `Failed to pull connector queue (${queueRes.status}).`);
  }
  const queueJson = await queueRes.json();
  const stagedEvents = Array.isArray(queueJson.events) ? queueJson.events : [];
  if (stagedEvents.length === 0) {
    return {
      total: 0,
      matched: 0,
      duplicatesSkipped: 0,
      unmappedQueued: 0,
      processedEventIds: [],
      results: [],
    };
  }

  const batchResult = await batchProcessZKTecoEvents({
    events: stagedEvents,
    devices: params.devices,
    mappings: params.mappings,
    workers: params.workers,
    schedules: params.schedules,
    approvedLeaves: params.approvedLeaves,
    existingAttendance: params.existingAttendance,
    existingUnmappedEvents: params.existingUnmappedEvents,
    onSaveAttendance: params.onSaveAttendance,
  });

  if (batchResult.processedEventIds.length > 0) {
    await authFetch("/api/biometric/connector/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: batchResult.processedEventIds }),
    }).catch(() => {});
  }

  return batchResult;
}

export async function resolveUnmappedBiometricEventRecord(params: {
  unmappedEvent: UnmappedBiometricEvent;
  devices: BiometricDeviceRecord[];
  mappings: BiometricDeviceMapping[];
  workers: Worker[];
  schedules: WorkScheduleConfig[];
  existingAttendance: AttendanceRecord[];
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<{ attendanceRecord: AttendanceRecord; updatedEvent: UnmappedBiometricEvent }> {
  const perms = resolveBiometricMappingPermissions(params.actorRole);
  if (!perms.canResolveUnmappedEvents) {
    throw new Error("Unauthorized: Only HR staff or Super Admin can resolve unmapped biometric events.");
  }

  const res = await processBiometricDeviceAttendanceEvent({
    deviceId: params.unmappedEvent.deviceId.startsWith("SN:")
      ? undefined
      : params.unmappedEvent.deviceId,
    deviceSerialNumber: params.unmappedEvent.deviceId.startsWith("SN:")
      ? params.unmappedEvent.deviceId.slice(3)
      : params.unmappedEvent.rawEventMeta?.deviceSerialNumber,
    biometricUserId: params.unmappedEvent.biometricUserId,
    eventTime: params.unmappedEvent.eventTime,
    punchType: params.unmappedEvent.punchType,
    rawEventMeta: params.unmappedEvent.rawEventMeta,
    devices: params.devices,
    mappings: params.mappings,
    workers: params.workers,
    schedules: params.schedules,
    existingAttendance: params.existingAttendance,
    onSaveAttendance: params.onSaveAttendance,
  });

  if (!res.resolved || !res.attendanceRecord || !res.mapping) {
    throw new Error(
      res.reason ||
        `No active mapping exists yet for Biometric User ID "${params.unmappedEvent.biometricUserId}" on this device.`
    );
  }

  const nowIso = new Date().toISOString();
  const updatedEvent: UnmappedBiometricEvent = {
    ...params.unmappedEvent,
    status: "Resolved",
    resolvedMappingId: res.mapping.id,
    resolvedEmployeeId: res.mapping.employeeId,
    resolvedAttendanceId: res.attendanceRecord.id,
    resolvedBy: params.actorName,
    resolvedAt: nowIso,
    updatedAt: nowIso,
  };
  await DbService.saveUnmappedBiometricEvent(updatedEvent);

  await DbService.addBiometricMappingAuditLog({
    id: `BIOLOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    mappingId: res.mapping.id,
    employeeId: res.mapping.employeeId,
    employeeName: res.mapping.employeeNameSnapshot,
    deviceId: res.mapping.deviceId,
    deviceName: res.mapping.deviceNameSnapshot,
    biometricUserId: res.mapping.biometricUserId,
    action: "Unmapped Event Resolved",
    newValue: {
      unmappedEventId: params.unmappedEvent.id,
      resolvedAttendanceId: res.attendanceRecord.id,
      eventTime: params.unmappedEvent.eventTime,
    },
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
  });

  return { attendanceRecord: res.attendanceRecord, updatedEvent };
}
