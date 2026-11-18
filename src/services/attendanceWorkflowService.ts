import {
  AttendanceRecord,
  AuditLog,
  BiometricDeviceRecord,
  LeaveRequestRecord,
  OvertimeRequestRecord,
  UnmappedBiometricEvent,
  UserRole,
  WorkScheduleConfig,
  Worker,
} from "../types";
import { DbService } from "./db";
import {
  computeScheduleAttendanceMetrics,
  inferWorkerWorkLocationType,
  resolveHrmPermissions,
  resolveWorkerSchedule,
} from "./hrmService";

export type AttendancePeriodMode = "daily" | "weekly" | "monthly";
export type WorkLocationFilterType = "ALL" | "Head Office" | "Construction Site";

export interface AttendanceWorkflowFilters {
  periodMode: AttendancePeriodMode;
  anchorDate: string; // YYYY-MM-DD
  selectedMonth: string; // YYYY-MM
  employeeFilter: string; // "ALL" or worker.id
  departmentFilter: string; // "ALL" or department string
  projectFilter: string; // "ALL" or project string
  workLocationFilter: WorkLocationFilterType;
}

export interface AttendanceRollupRow {
  workerId: string;
  employeeId: string;
  workerName: string;
  department: string;
  project: string;
  workLocationType: "Head Office" | "Construction Site";
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  earlyDepartures: number;
  missingPunches: number;
  regularHours: number;
  overtimeCandidateHours: number;
  approvedOvertimeHours: number;
  lateMinutesTotal: number;
  earlyExitMinutesTotal: number;
}

export interface AttendanceExceptionItem {
  id: string;
  sourceType: "attendance" | "unmapped";
  category:
    | "Missing Check-Out"
    | "Missing Check-In"
    | "Overtime Candidate"
    | "Early Departure"
    | "Unmatched Biometric ID"
    | "Unauthorized Device"
    | "Inactive Device"
    | "Inactive Employee";
  date: string;
  workerId?: string;
  employeeId?: string;
  workerName: string;
  department?: string;
  project: string;
  workLocationType?: "Head Office" | "Construction Site";
  checkIn?: string | null;
  checkOut?: string | null;
  deviceName?: string;
  biometricUserId?: string;
  overtimeCandidateHours?: number;
  earlyDepartureMinutes?: number;
  details: string;
  reviewStatus: "Pending HR Review" | "Approved" | "Rejected" | "Unmapped";
  attendanceRecord?: AttendanceRecord;
  unmappedEvent?: UnmappedBiometricEvent;
}

export interface DeviceStatusItem extends BiometricDeviceRecord {
  connectivityState: "Online" | "Pending Sync / Offline" | "Inactive";
}

export interface AttendanceWorkflowDashboardState {
  periodLabel: string;
  periodStartDate: string;
  periodEndDate: string;
  filteredWorkers: Worker[];
  filteredRecords: AttendanceRecord[];
  absentWorkersToday: Array<{
    workerId: string;
    employeeId: string;
    workerName: string;
    department: string;
    project: string;
    workLocationType: "Head Office" | "Construction Site";
    dayStatus: "Absent" | "Leave" | "Holiday" | "Rest Day";
    scheduleName: string;
  }>;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  earlyDepartureCount: number;
  missingPunchCount: number;
  overtimeCandidateCount: number;
  overtimeCandidateHoursTotal: number;
  pendingHrApprovalCount: number;
  deviceStatusSummary: {
    total: number;
    active: number;
    inactive: number;
    onlineConnected: number;
    offlineOrUnverified: number;
    devices: DeviceStatusItem[];
  };
  weeklyRows: AttendanceRollupRow[];
  monthlyRows: AttendanceRollupRow[];
  exceptionItems: AttendanceExceptionItem[];
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function getWeekDateRange(anchorDate: string): {
  startDate: string;
  endDate: string;
  dates: string[];
} {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(anchorDate)
    ? new Date(`${anchorDate}T12:00:00Z`)
    : new Date();
  const day = base.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(base.getTime() + diffToMon * 86400000);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(mon.getTime() + i * 86400000).toISOString().slice(0, 10));
  }
  return {
    startDate: dates[0],
    endDate: dates[6],
    dates,
  };
}

export function getMonthDateRange(monthStr: string): {
  startDate: string;
  endDate: string;
} {
  const clean = /^\d{4}-\d{2}$/.test(monthStr)
    ? monthStr
    : new Date().toISOString().slice(0, 7);
  const [y, m] = clean.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return {
    startDate: `${clean}-01`,
    endDate: `${clean}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function detectMissingPunchType(
  rec: Pick<AttendanceRecord, "checkIn" | "checkOut" | "status" | "missingPunchType">
): "Missing Check-Out" | "Missing Check-In" | "None" {
  if (
    rec.missingPunchType === "Missing Check-Out" ||
    rec.missingPunchType === "Missing Check-In"
  ) {
    return rec.missingPunchType;
  }
  if (rec.status === "Absent" || rec.status === "Leave" || rec.status === "Holiday") {
    return "None";
  }
  if (rec.checkIn && !rec.checkOut) return "Missing Check-Out";
  if (!rec.checkIn && rec.checkOut) return "Missing Check-In";
  return "None";
}

function buildRollupRows(params: {
  workers: Worker[];
  periodRecords: AttendanceRecord[];
  leaveRequests: LeaveRequestRecord[];
  overtimeRequests: OvertimeRequestRecord[];
  startDate: string;
  endDate: string;
}): AttendanceRollupRow[] {
  return params.workers.map((w) => {
    const empCode = w.employeeId || w.id;
    const wLoc = inferWorkerWorkLocationType(w);
    const logs = params.periodRecords.filter(
      (a) => a.workerId === w.id || a.workerId === empCode
    );
    const presentDays = logs.filter(
      (a) => a.status === "Present" || a.status === "Late"
    ).length;
    const lateDays = logs.filter(
      (a) => a.status === "Late" || Number(a.lateArrivalMinutes || 0) > 0
    ).length;
    const absentDays = logs.filter((a) => a.status === "Absent").length;
    const leaveDaysFromRequests = params.leaveRequests
      .filter((lv) => {
        if (lv.status !== "Approved") return false;
        if (lv.workerId !== w.id && lv.employeeId !== empCode) return false;
        return lv.startDate <= params.endDate && lv.endDate >= params.startDate;
      })
      .reduce((sum, lv) => {
        const s = lv.startDate > params.startDate ? lv.startDate : params.startDate;
        const e = lv.endDate < params.endDate ? lv.endDate : params.endDate;
        if (s > e) return sum;
        const d1 = new Date(`${s}T12:00:00Z`).getTime();
        const d2 = new Date(`${e}T12:00:00Z`).getTime();
        return sum + Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
      }, 0);
    const leaveDaysFromLogs = logs.filter((a) => a.status === "Leave").length;
    const leaveDays = Math.max(leaveDaysFromRequests, leaveDaysFromLogs);

    const earlyDepartures = logs.filter(
      (a) =>
        Number(a.earlyDepartureMinutes || 0) > 0 || Number(a.underTime || 0) > 0
    ).length;
    const missingPunches = logs.filter(
      (a) => detectMissingPunchType(a) !== "None"
    ).length;
    const regularHours = round2(
      logs.reduce((s, a) => s + Number(a.workingHours || 0), 0)
    );
    const overtimeCandidateHours = round2(
      logs.reduce(
        (s, a) => s + Number(a.overtimeCandidateHours ?? a.overtime ?? 0),
        0
      )
    );
    const approvedOvertimeHours = round2(
      params.overtimeRequests
        .filter(
          (ot) =>
            ot.status === "Approved" &&
            (ot.workerId === w.id || ot.employeeId === empCode) &&
            ot.workDate >= params.startDate &&
            ot.workDate <= params.endDate
        )
        .reduce((s, ot) => s + Number(ot.hoursRequested || 0), 0)
    );
    const lateMinutesTotal = logs.reduce(
      (s, a) => s + Number(a.lateArrivalMinutes || 0),
      0
    );
    const earlyExitMinutesTotal = logs.reduce(
      (s, a) =>
        s +
        Number(
          a.earlyDepartureMinutes || Math.round(Number(a.underTime || 0) * 60)
        ),
      0
    );

    return {
      workerId: w.id,
      employeeId: empCode,
      workerName: w.name,
      department: w.department || "Operations",
      project: w.assignedProject || w.currentSite || "Head Office",
      workLocationType: wLoc,
      presentDays,
      lateDays,
      absentDays,
      leaveDays,
      earlyDepartures,
      missingPunches,
      regularHours,
      overtimeCandidateHours,
      approvedOvertimeHours,
      lateMinutesTotal,
      earlyExitMinutesTotal,
    };
  });
}

export function computeAttendanceWorkflowDashboard(params: {
  workers: Worker[];
  attendance: AttendanceRecord[];
  schedules: WorkScheduleConfig[];
  leaveRequests: LeaveRequestRecord[];
  overtimeRequests: OvertimeRequestRecord[];
  devices: BiometricDeviceRecord[];
  unmappedEvents: UnmappedBiometricEvent[];
  filters: AttendanceWorkflowFilters;
}): AttendanceWorkflowDashboardState {
  const { filters } = params;
  const anchorDate =
    filters.anchorDate || new Date().toISOString().slice(0, 10);
  const selectedMonth =
    filters.selectedMonth || anchorDate.slice(0, 7);

  const weekRange = getWeekDateRange(anchorDate);
  const monthRange = getMonthDateRange(selectedMonth);

  const periodStartDate =
    filters.periodMode === "daily"
      ? anchorDate
      : filters.periodMode === "weekly"
      ? weekRange.startDate
      : monthRange.startDate;
  const periodEndDate =
    filters.periodMode === "daily"
      ? anchorDate
      : filters.periodMode === "weekly"
      ? weekRange.endDate
      : monthRange.endDate;
  const periodLabel =
    filters.periodMode === "daily"
      ? anchorDate
      : filters.periodMode === "weekly"
      ? `${weekRange.startDate} → ${weekRange.endDate}`
      : selectedMonth;

  const workerById = new Map<string, Worker>();
  params.workers.forEach((w) => {
    workerById.set(w.id, w);
    if (w.employeeId) workerById.set(w.employeeId, w);
  });

  const matchesWorkerFilters = (w: Worker) => {
    if (filters.employeeFilter !== "ALL" && w.id !== filters.employeeFilter && w.employeeId !== filters.employeeFilter) {
      return false;
    }
    if (
      filters.departmentFilter !== "ALL" &&
      String(w.department || "").toLowerCase() !== filters.departmentFilter.toLowerCase()
    ) {
      return false;
    }
    const proj = w.assignedProject || w.currentSite || "Head Office";
    if (
      filters.projectFilter !== "ALL" &&
      proj.toLowerCase() !== filters.projectFilter.toLowerCase()
    ) {
      return false;
    }
    const wLoc = inferWorkerWorkLocationType(w);
    if (
      filters.workLocationFilter !== "ALL" &&
      wLoc !== filters.workLocationFilter
    ) {
      return false;
    }
    return true;
  };

  const filteredWorkers = params.workers.filter(matchesWorkerFilters);

  const matchesRecordFilters = (a: AttendanceRecord) => {
    if (!a.date || a.date < periodStartDate || a.date > periodEndDate) {
      return false;
    }
    const linkedWorker = workerById.get(a.workerId);
    if (
      filters.employeeFilter !== "ALL" &&
      a.workerId !== filters.employeeFilter &&
      linkedWorker?.id !== filters.employeeFilter &&
      linkedWorker?.employeeId !== filters.employeeFilter
    ) {
      return false;
    }
    const dept = a.department || linkedWorker?.department || "";
    if (
      filters.departmentFilter !== "ALL" &&
      dept.toLowerCase() !== filters.departmentFilter.toLowerCase()
    ) {
      return false;
    }
    const proj =
      a.zone ||
      a.gpsLocationString ||
      a.building ||
      linkedWorker?.assignedProject ||
      linkedWorker?.currentSite ||
      "Head Office";
    if (
      filters.projectFilter !== "ALL" &&
      proj.toLowerCase() !== filters.projectFilter.toLowerCase() &&
      String(linkedWorker?.assignedProject || linkedWorker?.currentSite || "").toLowerCase() !==
        filters.projectFilter.toLowerCase()
    ) {
      return false;
    }
    const rLoc =
      a.workLocationType ||
      (linkedWorker ? inferWorkerWorkLocationType(linkedWorker) : undefined) ||
      (proj.toLowerCase().includes("head office") ? "Head Office" : "Construction Site");
    if (
      filters.workLocationFilter !== "ALL" &&
      rLoc !== filters.workLocationFilter
    ) {
      return false;
    }
    return true;
  };

  const filteredRecords = params.attendance.filter(matchesRecordFilters);

  // Absent check for anchorDate across active filtered workers
  const activeFilteredWorkers = filteredWorkers.filter(
    (w) => w.status === "Active"
  );
  const absentWorkersToday: AttendanceWorkflowDashboardState["absentWorkersToday"] = [];
  activeFilteredWorkers.forEach((w) => {
    const empCode = w.employeeId || w.id;
    const hasLogOnDate = params.attendance.some(
      (a) =>
        a.date === anchorDate &&
        (a.workerId === w.id || a.workerId === empCode)
    );
    if (hasLogOnDate) return;

    const sched = resolveWorkerSchedule(w, params.schedules, anchorDate);
    const onApprovedLeave = params.leaveRequests.some(
      (lv) =>
        lv.status === "Approved" &&
        (lv.workerId === w.id || lv.employeeId === empCode) &&
        lv.startDate <= anchorDate &&
        lv.endDate >= anchorDate
    );
    const isHoliday = Boolean(sched?.holidays?.some((h) => h.date === anchorDate));
    const weekdayName = new Date(`${anchorDate}T12:00:00Z`).toLocaleDateString(
      "en-US",
      { weekday: "long", timeZone: "UTC" }
    );
    const isRestDay = Boolean(
      sched?.restDays?.some((d) => d.toLowerCase() === weekdayName.toLowerCase())
    );

    const dayStatus: "Absent" | "Leave" | "Holiday" | "Rest Day" = onApprovedLeave
      ? "Leave"
      : isHoliday
      ? "Holiday"
      : isRestDay
      ? "Rest Day"
      : "Absent";

    absentWorkersToday.push({
      workerId: w.id,
      employeeId: empCode,
      workerName: w.name,
      department: w.department || "Operations",
      project: w.assignedProject || w.currentSite || "Head Office",
      workLocationType: inferWorkerWorkLocationType(w),
      dayStatus,
      scheduleName: sched?.scheduleName || "Default Shift",
    });
  });

  const explicitAbsentRecords = filteredRecords.filter(
    (a) => a.status === "Absent"
  ).length;
  const unloggedAbsentToday = absentWorkersToday.filter(
    (x) => x.dayStatus === "Absent"
  ).length;

  const presentWorkerIds = new Set(
    filteredRecords
      .filter((a) => a.status === "Present" || a.status === "Late")
      .map((a) => a.workerId)
  );
  const lateWorkerIds = new Set(
    filteredRecords
      .filter((a) => a.status === "Late" || Number(a.lateArrivalMinutes || 0) > 0)
      .map((a) => a.workerId)
  );
  const earlyDepartureCount = filteredRecords.filter(
    (a) =>
      Number(a.earlyDepartureMinutes || 0) > 0 || Number(a.underTime || 0) > 0
  ).length;
  const missingPunchRecords = filteredRecords.filter(
    (a) => detectMissingPunchType(a) !== "None"
  );
  const overtimeCandidateRecords = filteredRecords.filter(
    (a) => Number(a.overtimeCandidateHours ?? a.overtime ?? 0) > 0
  );
  const overtimeCandidateHoursTotal = round2(
    overtimeCandidateRecords.reduce(
      (s, a) => s + Number(a.overtimeCandidateHours ?? a.overtime ?? 0),
      0
    )
  );

  // Exception queue items (all dates or scoped filters so HR doesn't miss earlier exceptions, ordered recent first)
  const scopedUnmapped = params.unmappedEvents.filter((u) => {
    if (u.status !== "Unmapped") return false;
    if (
      filters.projectFilter !== "ALL" &&
      u.projectName &&
      u.projectName.toLowerCase() !== filters.projectFilter.toLowerCase()
    ) {
      return false;
    }
    if (
      filters.workLocationFilter !== "ALL" &&
      u.workLocationType &&
      u.workLocationType !== filters.workLocationFilter
    ) {
      return false;
    }
    return true;
  });

  const exceptionItems: AttendanceExceptionItem[] = [];
  filteredRecords.forEach((a) => {
    const linkedWorker = workerById.get(a.workerId);
    const missType = detectMissingPunchType(a);
    const otCand = Number(a.overtimeCandidateHours ?? a.overtime ?? 0);
    const earlyMins = Number(
      a.earlyDepartureMinutes || Math.round(Number(a.underTime || 0) * 60)
    );
    const locType =
      a.workLocationType ||
      (linkedWorker ? inferWorkerWorkLocationType(linkedWorker) : "Construction Site");

    if (missType !== "None") {
      exceptionItems.push({
        id: `EXC-${a.id}-MISS`,
        sourceType: "attendance",
        category: missType,
        date: a.date,
        workerId: a.workerId,
        employeeId: linkedWorker?.employeeId || a.workerId,
        workerName: a.workerName,
        department: a.department,
        project: a.zone || a.gpsLocationString || a.building || "Site",
        workLocationType: locType,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        deviceName: a.biometricDeviceName || a.deviceUsed,
        biometricUserId: a.biometricUserId,
        details:
          a.exceptionReason ||
          `${missType} detected — working hours held at 0h until HR verifies actual punch time.`,
        reviewStatus: a.hrReviewStatus === "Approved" || a.hrReviewStatus === "Rejected"
          ? a.hrReviewStatus
          : "Pending HR Review",
        attendanceRecord: a,
      });
    } else if (otCand > 0) {
      exceptionItems.push({
        id: `EXC-${a.id}-OT`,
        sourceType: "attendance",
        category: "Overtime Candidate",
        date: a.date,
        workerId: a.workerId,
        employeeId: linkedWorker?.employeeId || a.workerId,
        workerName: a.workerName,
        department: a.department,
        project: a.zone || a.gpsLocationString || a.building || "Site",
        workLocationType: locType,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        deviceName: a.biometricDeviceName || a.deviceUsed,
        overtimeCandidateHours: otCand,
        details: `${otCand}h worked beyond scheduled hours (${a.checkIn || "—"} → ${a.checkOut || "—"}).`,
        reviewStatus: a.hrReviewStatus === "Approved" || a.hrReviewStatus === "Rejected"
          ? a.hrReviewStatus
          : "Pending HR Review",
        attendanceRecord: a,
      });
    } else if (earlyMins > 0 && a.hrReviewStatus === "Pending HR Review") {
      exceptionItems.push({
        id: `EXC-${a.id}-EARLY`,
        sourceType: "attendance",
        category: "Early Departure",
        date: a.date,
        workerId: a.workerId,
        employeeId: linkedWorker?.employeeId || a.workerId,
        workerName: a.workerName,
        department: a.department,
        project: a.zone || a.gpsLocationString || a.building || "Site",
        workLocationType: locType,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        deviceName: a.biometricDeviceName || a.deviceUsed,
        earlyDepartureMinutes: earlyMins,
        details: `Left ${earlyMins} minutes before scheduled shift end (${a.checkOut || "—"}).`,
        reviewStatus: "Pending HR Review",
        attendanceRecord: a,
      });
    }
  });

  scopedUnmapped.forEach((u) => {
    const reason = String(u.rawEventMeta?.failureReason || "");
    const cat: AttendanceExceptionItem["category"] =
      u.exceptionCategory ||
      (reason.toLowerCase().includes("not registered")
        ? "Unauthorized Device"
        : reason.toLowerCase().includes("inactive") && reason.toLowerCase().includes("device")
        ? "Inactive Device"
        : reason.toLowerCase().includes("inactive")
        ? "Inactive Employee"
        : "Unmatched Biometric ID");

    exceptionItems.push({
      id: `EXC-${u.id}`,
      sourceType: "unmapped",
      category: cat,
      date: u.eventTime.slice(0, 10),
      workerName: `Unmapped BioID #${u.biometricUserId}`,
      project: u.projectName || "Unassigned",
      workLocationType: u.workLocationType,
      deviceName: u.deviceName || u.deviceId,
      biometricUserId: u.biometricUserId,
      details:
        reason ||
        `Unmatched ${u.punchType} punch from device ${u.deviceName || u.deviceId} for BioID "${u.biometricUserId}".`,
      reviewStatus: "Unmapped",
      unmappedEvent: u,
    });
  });

  const pendingAttendanceReviews = filteredRecords.filter(
    (a) => a.hrReviewStatus === "Pending HR Review" || detectMissingPunchType(a) !== "None"
  ).length;

  const pendingLeavesCount = params.leaveRequests.filter((l) =>
    l.status.startsWith("Pending")
  ).length;
  const pendingOtCount = params.overtimeRequests.filter((o) =>
    o.status.startsWith("Pending")
  ).length;

  const filteredDevices = params.devices.filter((d) => {
    if (
      filters.workLocationFilter !== "ALL" &&
      d.workLocationType !== filters.workLocationFilter
    ) {
      return false;
    }
    if (
      filters.projectFilter !== "ALL" &&
      d.projectName &&
      d.projectName.toLowerCase() !== filters.projectFilter.toLowerCase()
    ) {
      return false;
    }
    return true;
  });

  const deviceItems: DeviceStatusItem[] = filteredDevices.map((d) => ({
    ...d,
    connectivityState:
      d.status !== "Active"
        ? "Inactive"
        : d.connectionVerified || d.lastHandshakeAt
        ? "Online"
        : "Pending Sync / Offline",
  }));

  const weeklyRecords = params.attendance.filter((a) => {
    if (!a.date || a.date < weekRange.startDate || a.date > weekRange.endDate) return false;
    const lw = workerById.get(a.workerId);
    return lw ? matchesWorkerFilters(lw) : true;
  });
  const monthlyRecords = params.attendance.filter((a) => {
    if (!a.date || a.date < monthRange.startDate || a.date > monthRange.endDate) return false;
    const lw = workerById.get(a.workerId);
    return lw ? matchesWorkerFilters(lw) : true;
  });

  return {
    periodLabel,
    periodStartDate,
    periodEndDate,
    filteredWorkers,
    filteredRecords,
    absentWorkersToday,
    presentCount: presentWorkerIds.size,
    absentCount:
      filters.periodMode === "daily" ? unloggedAbsentToday + explicitAbsentRecords : explicitAbsentRecords,
    lateCount: lateWorkerIds.size,
    earlyDepartureCount,
    missingPunchCount: missingPunchRecords.length,
    overtimeCandidateCount: overtimeCandidateRecords.length,
    overtimeCandidateHoursTotal,
    pendingHrApprovalCount:
      pendingAttendanceReviews + scopedUnmapped.length + pendingLeavesCount + pendingOtCount,
    deviceStatusSummary: {
      total: deviceItems.length,
      active: deviceItems.filter((d) => d.status === "Active").length,
      inactive: deviceItems.filter((d) => d.status === "Inactive").length,
      onlineConnected: deviceItems.filter((d) => d.connectivityState === "Online").length,
      offlineOrUnverified: deviceItems.filter(
        (d) => d.connectivityState === "Pending Sync / Offline"
      ).length,
      devices: deviceItems,
    },
    weeklyRows: buildRollupRows({
      workers: filteredWorkers,
      periodRecords: weeklyRecords,
      leaveRequests: params.leaveRequests,
      overtimeRequests: params.overtimeRequests,
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
    }),
    monthlyRows: buildRollupRows({
      workers: filteredWorkers,
      periodRecords: monthlyRecords,
      leaveRequests: params.leaveRequests,
      overtimeRequests: params.overtimeRequests,
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
    }),
    exceptionItems,
  };
}

export async function reviewAttendanceException(params: {
  record: AttendanceRecord;
  action: "Complete Missing Punch" | "Approve Overtime" | "Reject Overtime" | "Acknowledge Exception";
  verifiedCheckIn?: string;
  verifiedCheckOut?: string;
  reviewNotes: string;
  worker?: Worker;
  schedules: WorkScheduleConfig[];
  approvedLeaves?: LeaveRequestRecord[];
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<{ updatedRecord: AttendanceRecord; createdOvertimeRequest?: OvertimeRequestRecord }> {
  const perms = resolveHrmPermissions(params.actorRole);
  if (!perms.canManageEmployees && !perms.canApproveHrStage && !perms.isDirector) {
    throw new Error("Authorization Error: Only HR or Director can review and resolve attendance exceptions.");
  }

  const notes = String(params.reviewNotes || "").trim();
  if (!notes) {
    throw new Error("HR review reason / notes are mandatory for audit traceability.");
  }

  const nowIso = new Date().toISOString();
  const sched = params.worker
    ? resolveWorkerSchedule(params.worker, params.schedules, params.record.date)
    : params.schedules.find((s) => s.id === params.record.scheduleId) || params.schedules[0];

  let nextCheckIn = params.record.checkIn;
  let nextCheckOut = params.record.checkOut;

  if (params.action === "Complete Missing Punch") {
    const missingType = detectMissingPunchType(params.record);
    if (missingType === "Missing Check-Out") {
      const providedOut = String(params.verifiedCheckOut || "").trim();
      if (!providedOut) {
        throw new Error("Verified Check-Out time is required. System will never invent missing punch times.");
      }
      nextCheckOut = providedOut.length === 5 ? `${providedOut}:00` : providedOut;
    } else if (missingType === "Missing Check-In") {
      const providedIn = String(params.verifiedCheckIn || "").trim();
      if (!providedIn) {
        throw new Error("Verified Check-In time is required. System will never invent missing punch times.");
      }
      nextCheckIn = providedIn.length === 5 ? `${providedIn}:00` : providedIn;
    }
  }

  const metrics = computeScheduleAttendanceMetrics({
    date: params.record.date,
    checkIn: nextCheckIn ? nextCheckIn.slice(0, 5) : null,
    checkOut: nextCheckOut ? nextCheckOut.slice(0, 5) : null,
    schedule: sched,
    approvedLeaves: params.approvedLeaves,
    workerId: params.record.workerId,
    employeeId: params.worker?.employeeId,
  });

  let createdOvertimeRequest: OvertimeRequestRecord | undefined;
  let finalOvertime = metrics.overtime;
  let finalReviewStatus: AttendanceRecord["hrReviewStatus"] = "Approved";

  if (params.action === "Reject Overtime") {
    finalOvertime = 0;
    finalReviewStatus = "Rejected";
  } else if (params.action === "Approve Overtime" && metrics.overtimeCandidateHours > 0) {
    finalOvertime = metrics.overtimeCandidateHours;
    finalReviewStatus = "Approved";
    const otReq: OvertimeRequestRecord = {
      id: `OTR-ATT-${params.record.workerId}-${params.record.date}-${Date.now().toString().slice(-4)}`,
      requestNo: `OT-${params.record.date.slice(0, 7)}-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: params.worker?.employeeId || params.record.workerId,
      workerId: params.record.workerId,
      workerName: params.record.workerName,
      project: params.record.zone || params.worker?.assignedProject || "Head Office",
      department: params.record.department || params.worker?.department || "Operations",
      workDate: params.record.date,
      hoursRequested: metrics.overtimeCandidateHours,
      dayType: "Weekday",
      multiplier: sched?.overtimeMultiplierWeekday || 1.5,
      reason: `Attendance HR Approved Overtime: ${notes}`,
      status: "Approved",
      hrManagerApproval: {
        stage: "Pending HR Manager",
        actorName: params.actorName,
        actorRole: String(params.actorRole),
        actorUid: params.actorUid,
        decision: "Approved",
        timestamp: nowIso,
        notes,
      },
      createdById: params.actorUid || "HR",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await DbService.saveOvertimeRequest(otReq);
    createdOvertimeRequest = otReq;
  }

  const updatedRecord: AttendanceRecord = {
    ...params.record,
    checkIn: nextCheckIn,
    checkOut: nextCheckOut,
    status: metrics.status,
    workingHours: metrics.workingHours,
    overtime: finalOvertime,
    overtimeCandidateHours: metrics.overtimeCandidateHours,
    underTime: metrics.underTime,
    lateArrivalMinutes: metrics.lateArrivalMinutes,
    earlyDepartureMinutes: metrics.earlyDepartureMinutes,
    punchCompleteness: metrics.punchCompleteness,
    missingPunchType: metrics.missingPunchType,
    hrReviewStatus: finalReviewStatus,
    hrReviewedBy: params.actorName,
    hrReviewedAt: nowIso,
    hrReviewNotes: notes,
    verifiedBy: `HR Verified (${params.actorName})`,
  };

  if (params.onSaveAttendance) {
    await params.onSaveAttendance(updatedRecord);
  } else {
    await DbService.updateAttendanceRecord(updatedRecord);
  }

  const auditEntry: AuditLog = {
    id: `AUD-ATT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: nowIso,
    userId: params.actorUid,
    userName: params.actorName,
    role: params.actorRole as UserRole,
    action: `HRM Attendance Exception: ${params.action}`,
    details: `${updatedRecord.workerName} (${updatedRecord.date}) -> Hours: ${updatedRecord.workingHours}h, OT: ${updatedRecord.overtime}h, Completeness: ${updatedRecord.punchCompleteness}, Status: ${updatedRecord.hrReviewStatus} | Notes: ${notes}`,
  };
  await DbService.addAuditLog(auditEntry).catch(() => {});

  return { updatedRecord, createdOvertimeRequest };
}
