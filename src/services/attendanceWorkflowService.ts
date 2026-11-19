import {
  AttendanceApprovalAuditEntry,
  AttendanceApprovalStatus,
  AttendanceAuditLog,
  AttendanceCorrectionRequest,
  AttendanceCorrectionType,
  AttendanceMethod,
  AttendanceReconciledDayStatus,
  AttendanceRecord,
  AuditLog,
  BiometricDeviceMapping,
  BiometricDeviceRecord,
  LeaveRequestRecord,
  OriginalBiometricEventSnapshot,
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

export type AttendanceReportTypeId =
  | "daily-attendance"
  | "weekly-attendance"
  | "monthly-attendance"
  | "employee-history"
  | "department-attendance"
  | "project-site-attendance"
  | "late-arrival"
  | "absence"
  | "overtime"
  | "missing-punch"
  | "hr-approval"
  | "biometric-device-sync";

export function formatAddisAbabaDateTime(isoOrDate?: string | Date): string {
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if (isNaN(d.getTime())) return String(isoOrDate || "");
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
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} EAT`;
  } catch {
    return d.toISOString();
  }
}

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
  if (!perms.canFinalApproveAttendance && !perms.canPrepareAttendanceReview) {
    throw new Error(
      "Authorization Error: Only HR Manager (final approval) or authorized HR Officer (review prep) can resolve attendance exceptions."
    );
  }
  if (
    (params.action === "Approve Overtime" || params.action === "Reject Overtime") &&
    !perms.canFinalApproveAttendance
  ) {
    throw new Error(
      "Authorization Error: Only HR Manager is authorized to give final attendance / overtime approval."
    );
  }

  const notes = String(params.reviewNotes || "").trim();
  if (!notes) {
    throw new Error("HR review reason / notes are mandatory for audit traceability.");
  }

  const nowIso = new Date().toISOString();
  const originalSnapshot: OriginalBiometricEventSnapshot =
    params.record.originalBiometricSnapshot || {
      checkIn: params.record.checkIn,
      checkOut: params.record.checkOut,
      lunchOut: params.record.lunchOut || null,
      lunchIn: params.record.lunchIn || null,
      status: params.record.status,
      workingHours: Number(params.record.workingHours || 0),
      overtime: Number(params.record.overtime || 0),
      method: params.record.method,
      biometricDeviceId: params.record.biometricDeviceId,
      biometricDeviceName: params.record.biometricDeviceName,
      biometricUserId: params.record.biometricUserId,
      biometricMappingId: params.record.biometricMappingId,
      capturedAt: nowIso,
      timezone: "Africa/Addis_Ababa",
    };

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
  let finalReviewStatus: AttendanceRecord["hrReviewStatus"] = perms.canFinalApproveAttendance
    ? "Approved"
    : "Pending HR Review";
  let nextFinalApprovalStatus: AttendanceApprovalStatus = perms.canFinalApproveAttendance
    ? "Approved"
    : "Under Review";

  if (params.action === "Reject Overtime") {
    finalOvertime = 0;
    finalReviewStatus = "Rejected";
    nextFinalApprovalStatus = "Rejected";
  } else if (params.action === "Approve Overtime" && metrics.overtimeCandidateHours > 0) {
    finalOvertime = metrics.overtimeCandidateHours;
    finalReviewStatus = "Approved";
    nextFinalApprovalStatus = "Approved";
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

  const historyEntry: AttendanceApprovalAuditEntry = {
    id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    action: perms.canFinalApproveAttendance ? "Final Approved" : "Prepared / Marked Under Review",
    previousStatus: params.record.finalApprovalStatus || params.record.hrReviewStatus || "Pending",
    newStatus: nextFinalApprovalStatus,
    comments: notes,
  };

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
    finalApprovalStatus: nextFinalApprovalStatus,
    originalBiometricSnapshot: originalSnapshot,
    hrReviewedBy: params.actorName,
    hrReviewedAt: nowIso,
    hrReviewNotes: notes,
    reviewedBy: params.actorName,
    reviewedByUid: params.actorUid,
    reviewedByRole: String(params.actorRole),
    reviewedAt: nowIso,
    ...(perms.canFinalApproveAttendance
      ? {
          finalApprovedBy: params.actorName,
          finalApprovedByUid: params.actorUid,
          finalApprovedAt: nowIso,
          approvalComments: notes,
        }
      : {}),
    approvalAuditHistory: [...(params.record.approvalAuditHistory || []), historyEntry],
    timezone: "Africa/Addis_Ababa",
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
    details: `${updatedRecord.workerName} (${updatedRecord.date}) -> Hours: ${updatedRecord.workingHours}h, OT: ${updatedRecord.overtime}h, Completeness: ${updatedRecord.punchCompleteness}, Status: ${updatedRecord.finalApprovalStatus} | Notes: ${notes}`,
  };
  await DbService.addAuditLog(auditEntry).catch(() => {});
  await DbService.addAttendanceAuditLog({
    id: `AUD-ATT2-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    attendanceId: updatedRecord.id,
    workerId: updatedRecord.workerId,
    employeeId: params.worker?.employeeId || updatedRecord.workerId,
    workerName: updatedRecord.workerName,
    date: updatedRecord.date,
    action: `Attendance Exception: ${params.action}`,
    previousStatus: params.record.finalApprovalStatus || "Pending",
    newStatus: nextFinalApprovalStatus,
    comments: notes,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
  }).catch(() => {});

  return { updatedRecord, createdOvertimeRequest };
}

// ============================================================================
// PART 2: LEAVE & ABSENCE RECONCILIATION
// ============================================================================

export function reconcileEmployeeAttendanceDay(params: {
  worker: Worker;
  date: string;
  attendanceRecords: AttendanceRecord[];
  schedules: WorkScheduleConfig[];
  leaveRequests: LeaveRequestRecord[];
}): {
  reconciledStatus: AttendanceReconciledDayStatus;
  leaveType?: LeaveRequestRecord["leaveType"];
  isPaidLeave: boolean;
  isHoliday: boolean;
  isRestDay: boolean;
  scheduleName: string;
  matchedRecord?: AttendanceRecord;
} {
  const empCode = params.worker.employeeId || params.worker.id;
  const sched = resolveWorkerSchedule(params.worker, params.schedules, params.date);
  const scheduleName = sched?.scheduleName || "Default Shift";

  const approvedLeave = params.leaveRequests.find(
    (lv) =>
      lv.status === "Approved" &&
      (lv.workerId === params.worker.id || lv.employeeId === empCode) &&
      lv.startDate <= params.date &&
      lv.endDate >= params.date
  );

  const isHoliday = Boolean(sched?.holidays?.some((h) => h.date === params.date));
  const weekdayName = new Date(`${params.date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const isRestDay = Boolean(
    sched?.restDays?.some((d) => d.toLowerCase() === weekdayName.toLowerCase())
  );

  const dayRecord = params.attendanceRecords.find(
    (a) =>
      a.date === params.date &&
      (a.workerId === params.worker.id || a.workerId === empCode)
  );

  // 1. Check approved leave FIRST before ever classifying an employee as Absent
  if (approvedLeave && (!dayRecord || dayRecord.status === "Leave" || dayRecord.status === "Absent")) {
    const isUnpaid = approvedLeave.leaveType === "Unpaid Leave";
    return {
      reconciledStatus: isUnpaid ? "Unpaid Leave" : "Approved Leave",
      leaveType: approvedLeave.leaveType,
      isPaidLeave: !isUnpaid,
      isHoliday,
      isRestDay,
      scheduleName,
      matchedRecord: dayRecord,
    };
  }

  // 2. Check existing attendance record for the day
  if (dayRecord) {
    const missType = detectMissingPunchType(dayRecord);
    if (missType !== "None") {
      return {
        reconciledStatus: "Missing Attendance",
        isPaidLeave: false,
        isHoliday,
        isRestDay,
        scheduleName,
        matchedRecord: dayRecord,
      };
    }
    if (dayRecord.status === "Leave") {
      const isUnpaid = String(dayRecord.leaveStatus || "").toLowerCase().includes("unpaid");
      return {
        reconciledStatus: isUnpaid ? "Unpaid Leave" : "Approved Leave",
        isPaidLeave: !isUnpaid,
        isHoliday,
        isRestDay,
        scheduleName,
        matchedRecord: dayRecord,
      };
    }
    if (dayRecord.status === "Holiday") {
      return {
        reconciledStatus: "Holiday",
        isPaidLeave: false,
        isHoliday: true,
        isRestDay,
        scheduleName,
        matchedRecord: dayRecord,
      };
    }
    if (
      dayRecord.finalApprovalStatus === "Under Review" ||
      dayRecord.finalApprovalStatus === "Returned for Correction" ||
      dayRecord.finalApprovalStatus === "Pending" ||
      dayRecord.hrReviewStatus === "Pending HR Review"
    ) {
      return {
        reconciledStatus: "Pending Review",
        isPaidLeave: false,
        isHoliday,
        isRestDay,
        scheduleName,
        matchedRecord: dayRecord,
      };
    }
    if (dayRecord.status === "Absent") {
      if (isHoliday || isRestDay) {
        return {
          reconciledStatus: "Holiday",
          isPaidLeave: false,
          isHoliday,
          isRestDay,
          scheduleName,
          matchedRecord: dayRecord,
        };
      }
      return {
        reconciledStatus: "Absent",
        isPaidLeave: false,
        isHoliday: false,
        isRestDay: false,
        scheduleName,
        matchedRecord: dayRecord,
      };
    }
    return {
      reconciledStatus: "Present",
      isPaidLeave: false,
      isHoliday,
      isRestDay,
      scheduleName,
      matchedRecord: dayRecord,
    };
  }

  // 3. No attendance punch on a holiday or rest day -> NEVER mark as Absent
  if (isHoliday || isRestDay) {
    return {
      reconciledStatus: "Holiday",
      isPaidLeave: false,
      isHoliday,
      isRestDay,
      scheduleName,
    };
  }

  // 4. Scheduled working day, no approved leave, no holiday, no rest day, no punch -> Absent
  return {
    reconciledStatus: "Absent",
    isPaidLeave: false,
    isHoliday: false,
    isRestDay: false,
    scheduleName,
  };
}

// ============================================================================
// PART 2: HR MANAGER ONLY FINAL APPROVAL & DISCREPANCY REPORTING
// ============================================================================

export async function transitionAttendanceApprovalStatus(params: {
  record: AttendanceRecord;
  action: "Prepare / Mark Under Review" | "Return for Correction" | "Final Approve" | "Reject";
  comments: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<AttendanceRecord> {
  const perms = resolveHrmPermissions(params.actorRole);
  const comments = String(params.comments || "").trim();

  if (params.action === "Final Approve" || params.action === "Reject") {
    if (!perms.canFinalApproveAttendance) {
      throw new Error(
        `Authorization Error: Role "${params.actorRole}" is NOT authorized. Only the HR Manager may give final attendance approval or rejection.`
      );
    }
    if (params.action === "Reject" && !comments) {
      throw new Error("Comments are mandatory when rejecting an attendance record.");
    }
    if (params.action === "Final Approve" && detectMissingPunchType(params.record) !== "None") {
      throw new Error(
        `Cannot grant final approval while "${detectMissingPunchType(params.record)}" is unresolved. Submit and approve a verified manual correction first.`
      );
    }
  } else {
    if (!perms.canPrepareAttendanceReview) {
      throw new Error(
        `Authorization Error: Role "${params.actorRole}" cannot review or return attendance records.`
      );
    }
    if (params.action === "Return for Correction" && !comments) {
      throw new Error("Correction notes are required when returning attendance for correction.");
    }
  }

  const nowIso = new Date().toISOString();
  const prevStatus = params.record.finalApprovalStatus || "Pending";
  const nextStatus: AttendanceApprovalStatus =
    params.action === "Prepare / Mark Under Review"
      ? "Under Review"
      : params.action === "Return for Correction"
      ? "Returned for Correction"
      : params.action === "Final Approve"
      ? "Approved"
      : "Rejected";

  const snapshot: OriginalBiometricEventSnapshot =
    params.record.originalBiometricSnapshot || {
      checkIn: params.record.checkIn,
      checkOut: params.record.checkOut,
      lunchOut: params.record.lunchOut || null,
      lunchIn: params.record.lunchIn || null,
      status: params.record.status,
      workingHours: Number(params.record.workingHours || 0),
      overtime: Number(params.record.overtime || 0),
      method: params.record.method,
      biometricDeviceId: params.record.biometricDeviceId,
      biometricDeviceName: params.record.biometricDeviceName,
      biometricUserId: params.record.biometricUserId,
      biometricMappingId: params.record.biometricMappingId,
      capturedAt: nowIso,
      timezone: "Africa/Addis_Ababa",
    };

  const auditAction: AttendanceApprovalAuditEntry["action"] =
    params.action === "Prepare / Mark Under Review"
      ? "Prepared / Marked Under Review"
      : params.action === "Return for Correction"
      ? "Returned for Correction"
      : params.action === "Final Approve"
      ? "Final Approved"
      : "Rejected";

  const entry: AttendanceApprovalAuditEntry = {
    id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    action: auditAction,
    previousStatus: prevStatus,
    newStatus: nextStatus,
    comments: comments || params.action,
  };

  const updated: AttendanceRecord = {
    ...params.record,
    originalBiometricSnapshot: snapshot,
    finalApprovalStatus: nextStatus,
    hrReviewStatus:
      nextStatus === "Approved"
        ? "Approved"
        : nextStatus === "Rejected"
        ? "Rejected"
        : "Pending HR Review",
    reviewedBy:
      params.action === "Prepare / Mark Under Review" || params.action === "Return for Correction"
        ? params.actorName
        : params.record.reviewedBy || params.actorName,
    reviewedByUid: params.record.reviewedByUid || params.actorUid,
    reviewedByRole: params.record.reviewedByRole || String(params.actorRole),
    reviewedAt: params.record.reviewedAt || nowIso,
    ...(nextStatus === "Approved" || nextStatus === "Rejected"
      ? {
          finalApprovedBy: params.actorName,
          finalApprovedByUid: params.actorUid,
          finalApprovedAt: nowIso,
          approvalComments: comments || `${nextStatus} by HR Manager`,
          ...(params.record.discrepancyFlag
            ? { discrepancyFlag: { ...params.record.discrepancyFlag, status: "Resolved" as const } }
            : {}),
        }
      : {
          approvalComments: comments || params.record.approvalComments,
        }),
    payrollFinalized: nextStatus === "Approved",
    ...(nextStatus === "Approved" ? { payrollFinalizedAt: nowIso } : {}),
    approvalAuditHistory: [...(params.record.approvalAuditHistory || []), entry],
    timezone: "Africa/Addis_Ababa",
  };

  if (params.onSaveAttendance) {
    await params.onSaveAttendance(updated);
  } else {
    await DbService.updateAttendanceRecord(updated);
  }

  await DbService.addAttendanceAuditLog({
    id: `AAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    attendanceId: updated.id,
    workerId: updated.workerId,
    workerName: updated.workerName,
    date: updated.date,
    action: `Attendance ${params.action}`,
    previousStatus: prevStatus,
    newStatus: nextStatus,
    comments: comments || params.action,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
  }).catch(() => {});

  return updated;
}

export async function reportAttendanceDiscrepancy(params: {
  record: AttendanceRecord;
  discrepancyNotes: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<AttendanceRecord> {
  const perms = resolveHrmPermissions(params.actorRole);
  if (!perms.canReportAttendanceDiscrepancy) {
    throw new Error(
      `Authorization Error: Role "${params.actorRole}" is not authorized to report attendance discrepancies.`
    );
  }
  const notes = String(params.discrepancyNotes || "").trim();
  if (!notes) {
    throw new Error("Discrepancy description is required when flagging an attendance record.");
  }

  const nowIso = new Date().toISOString();
  const prevStatus = params.record.finalApprovalStatus || "Pending";
  const snapshot: OriginalBiometricEventSnapshot =
    params.record.originalBiometricSnapshot || {
      checkIn: params.record.checkIn,
      checkOut: params.record.checkOut,
      status: params.record.status,
      workingHours: Number(params.record.workingHours || 0),
      overtime: Number(params.record.overtime || 0),
      method: params.record.method,
      biometricDeviceId: params.record.biometricDeviceId,
      biometricDeviceName: params.record.biometricDeviceName,
      biometricUserId: params.record.biometricUserId,
      capturedAt: nowIso,
      timezone: "Africa/Addis_Ababa",
    };

  const entry: AttendanceApprovalAuditEntry = {
    id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    action: "Discrepancy Reported",
    previousStatus: prevStatus,
    newStatus: "Under Review",
    comments: notes,
  };

  const updated: AttendanceRecord = {
    ...params.record,
    originalBiometricSnapshot: snapshot,
    finalApprovalStatus: "Under Review",
    hrReviewStatus: "Pending HR Review",
    payrollFinalized: false,
    discrepancyFlag: {
      reportedBy: params.actorName,
      reportedByUid: params.actorUid,
      reportedByRole: String(params.actorRole),
      reportedAt: nowIso,
      notes,
      status: "Open",
    },
    approvalAuditHistory: [...(params.record.approvalAuditHistory || []), entry],
    timezone: "Africa/Addis_Ababa",
  };

  if (params.onSaveAttendance) {
    await params.onSaveAttendance(updated);
  } else {
    await DbService.updateAttendanceRecord(updated);
  }

  await DbService.addAttendanceAuditLog({
    id: `AAL-DISC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    attendanceId: updated.id,
    workerId: updated.workerId,
    workerName: updated.workerName,
    date: updated.date,
    action: "Discrepancy Reported",
    previousStatus: prevStatus,
    newStatus: "Under Review",
    comments: notes,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
  }).catch(() => {});

  return updated;
}

// ============================================================================
// PART 2: MANUAL CORRECTIONS (PRESERVING ORIGINAL BIOMETRIC EVENTS)
// ============================================================================

export async function submitManualCorrectionRequest(params: {
  record: AttendanceRecord;
  worker?: Worker;
  correctionType: AttendanceCorrectionType;
  proposedCheckIn: string | null;
  proposedCheckOut: string | null;
  proposedStatus: AttendanceRecord["status"];
  reason: string;
  supportingEvidenceUrl?: string;
  supportingEvidenceName?: string;
  supportingEvidenceNote?: string;
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<{ correction: AttendanceCorrectionRequest; untouchedAttendance: AttendanceRecord }> {
  const perms = resolveHrmPermissions(params.actorRole);
  if (!perms.canSubmitManualCorrection) {
    throw new Error(
      `Authorization Error: Role "${params.actorRole}" is not authorized to submit manual attendance corrections.`
    );
  }
  const cleanReason = String(params.reason || "").trim();
  if (!cleanReason) {
    throw new Error("A correction reason is mandatory for manual attendance corrections.");
  }

  const normalizeTime = (t: string | null | undefined): string | null => {
    const s = String(t || "").trim();
    if (!s) return null;
    return s.length === 5 ? `${s}:00` : s;
  };

  const propIn = normalizeTime(params.proposedCheckIn);
  const propOut = normalizeTime(params.proposedCheckOut);

  if (params.correctionType === "Missing Check-In" && !propIn) {
    throw new Error("Verified Check-In time is required for a Missing Check-In correction.");
  }
  if (params.correctionType === "Missing Check-Out" && !propOut) {
    throw new Error("Verified Check-Out time is required for a Missing Check-Out correction.");
  }

  const nowIso = new Date().toISOString();
  // Capture and preserve the unmodified original biometric event snapshot
  const originalSnapshot: OriginalBiometricEventSnapshot =
    params.record.originalBiometricSnapshot || {
      checkIn: params.record.checkIn,
      checkOut: params.record.checkOut,
      lunchOut: params.record.lunchOut || null,
      lunchIn: params.record.lunchIn || null,
      status: params.record.status,
      workingHours: Number(params.record.workingHours || 0),
      overtime: Number(params.record.overtime || 0),
      method: params.record.method,
      biometricDeviceId: params.record.biometricDeviceId,
      biometricDeviceName: params.record.biometricDeviceName,
      biometricUserId: params.record.biometricUserId,
      biometricMappingId: params.record.biometricMappingId,
      capturedAt: nowIso,
      timezone: "Africa/Addis_Ababa",
    };

  const correction: AttendanceCorrectionRequest = {
    id: `ACOR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    requestNo: `COR-${params.record.date}-${Math.floor(100 + Math.random() * 900)}`,
    attendanceId: params.record.id,
    workerId: params.record.workerId,
    employeeId: params.worker?.employeeId || params.record.workerId,
    workerName: params.record.workerName,
    project:
      params.record.zone ||
      params.worker?.assignedProject ||
      params.worker?.currentSite ||
      "Head Office",
    department: params.record.department || params.worker?.department || "Operations",
    workLocationType:
      params.record.workLocationType ||
      (params.worker ? inferWorkerWorkLocationType(params.worker) : "Construction Site"),
    date: params.record.date,
    correctionType: params.correctionType,
    originalSnapshot,
    proposedCheckIn: propIn,
    proposedCheckOut: propOut,
    proposedStatus: params.proposedStatus,
    reason: cleanReason,
    ...(params.supportingEvidenceUrl ? { supportingEvidenceUrl: params.supportingEvidenceUrl } : {}),
    ...(params.supportingEvidenceName ? { supportingEvidenceName: params.supportingEvidenceName } : {}),
    ...(params.supportingEvidenceNote ? { supportingEvidenceNote: params.supportingEvidenceNote } : {}),
    submittedBy: params.actorName,
    submittedByUid: params.actorUid,
    submittedByRole: String(params.actorRole),
    status: "Pending",
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await DbService.saveAttendanceCorrection(correction);

  // IMPORTANT: Preserve original biometric check-in/out/hours untouched on the attendance record until HR Manager approves!
  const untouchedAttendance: AttendanceRecord = {
    ...params.record,
    originalBiometricSnapshot: originalSnapshot,
    finalApprovalStatus: "Pending",
    payrollFinalized: false,
    approvalAuditHistory: [
      ...(params.record.approvalAuditHistory || []),
      {
        id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        timezone: "Africa/Addis_Ababa",
        actorName: params.actorName,
        actorUid: params.actorUid,
        actorRole: String(params.actorRole),
        action: "Manual Correction Requested",
        previousStatus: params.record.finalApprovalStatus || "Pending",
        newStatus: "Pending",
        comments: `${params.correctionType}: ${cleanReason}`,
      },
    ],
  };

  if (params.onSaveAttendance) {
    await params.onSaveAttendance(untouchedAttendance);
  } else {
    await DbService.updateAttendanceRecord(untouchedAttendance);
  }

  await DbService.addAttendanceAuditLog({
    id: `AAL-COR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    attendanceId: params.record.id,
    correctionId: correction.id,
    workerId: correction.workerId,
    employeeId: correction.employeeId,
    workerName: correction.workerName,
    date: correction.date,
    action: `Manual Correction Requested (${correction.correctionType})`,
    previousStatus: params.record.finalApprovalStatus || "Pending",
    newStatus: "Pending",
    comments: cleanReason,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
  }).catch(() => {});

  return { correction, untouchedAttendance };
}

export async function reviewManualCorrectionRequest(params: {
  correction: AttendanceCorrectionRequest;
  attendanceRecord: AttendanceRecord;
  action: "Mark Under Review" | "Return for Correction" | "Approve" | "Reject";
  comments: string;
  worker?: Worker;
  schedules: WorkScheduleConfig[];
  approvedLeaves?: LeaveRequestRecord[];
  actorName: string;
  actorUid: string;
  actorRole: UserRole | string;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void> | void;
}): Promise<{ updatedCorrection: AttendanceCorrectionRequest; updatedAttendance: AttendanceRecord }> {
  const perms = resolveHrmPermissions(params.actorRole);
  const comments = String(params.comments || "").trim();

  if (params.action === "Approve" || params.action === "Reject") {
    if (!perms.canFinalApproveAttendance) {
      throw new Error(
        `Authorization Error: Only HR Manager can give final approval or rejection for manual attendance corrections (Role "${params.actorRole}" blocked).`
      );
    }
    if (!comments) {
      throw new Error("HR Manager comments are mandatory when approving or rejecting a correction.");
    }
  } else {
    if (!perms.canPrepareAttendanceReview) {
      throw new Error(
        `Authorization Error: Only HR Officer or HR Manager can review/return correction requests.`
      );
    }
    if (params.action === "Return for Correction" && !comments) {
      throw new Error("Notes are required when returning a manual correction request.");
    }
  }

  const nowIso = new Date().toISOString();
  const preservedOriginalSnapshot =
    params.attendanceRecord.originalBiometricSnapshot || params.correction.originalSnapshot;

  if (params.action === "Mark Under Review" || params.action === "Return for Correction") {
    const nextCorStatus: AttendanceApprovalStatus =
      params.action === "Mark Under Review" ? "Under Review" : "Returned for Correction";
    const updatedCorrection: AttendanceCorrectionRequest = {
      ...params.correction,
      status: nextCorStatus,
      hrOfficerReviewedBy: params.actorName,
      hrOfficerReviewedByUid: params.actorUid,
      hrOfficerReviewedAt: nowIso,
      hrOfficerNotes: comments || "Reviewed by HR Officer",
      updatedAt: nowIso,
    };
    await DbService.saveAttendanceCorrection(updatedCorrection);

    const updatedAttendance: AttendanceRecord = {
      ...params.attendanceRecord,
      originalBiometricSnapshot: preservedOriginalSnapshot,
      finalApprovalStatus: nextCorStatus,
      reviewedBy: params.actorName,
      reviewedByUid: params.actorUid,
      reviewedByRole: String(params.actorRole),
      reviewedAt: nowIso,
      approvalAuditHistory: [
        ...(params.attendanceRecord.approvalAuditHistory || []),
        {
          id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: nowIso,
          timezone: "Africa/Addis_Ababa",
          actorName: params.actorName,
          actorUid: params.actorUid,
          actorRole: String(params.actorRole),
          action:
            params.action === "Mark Under Review"
              ? "Prepared / Marked Under Review"
              : "Returned for Correction",
          previousStatus: params.correction.status,
          newStatus: nextCorStatus,
          comments: comments || params.action,
        },
      ],
    };
    if (params.onSaveAttendance) {
      await params.onSaveAttendance(updatedAttendance);
    } else {
      await DbService.updateAttendanceRecord(updatedAttendance);
    }

    await DbService.addAttendanceAuditLog({
      id: `AAL-COR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      attendanceId: updatedAttendance.id,
      correctionId: updatedCorrection.id,
      workerId: updatedCorrection.workerId,
      workerName: updatedCorrection.workerName,
      date: updatedCorrection.date,
      action: `Correction ${params.action}`,
      previousStatus: params.correction.status,
      newStatus: nextCorStatus,
      comments: comments || params.action,
      actorName: params.actorName,
      actorUid: params.actorUid,
      actorRole: String(params.actorRole),
      timestamp: nowIso,
      timezone: "Africa/Addis_Ababa",
    }).catch(() => {});

    return { updatedCorrection, updatedAttendance };
  }

  if (params.action === "Reject") {
    const updatedCorrection: AttendanceCorrectionRequest = {
      ...params.correction,
      status: "Rejected",
      hrManagerDecisionBy: params.actorName,
      hrManagerDecisionByUid: params.actorUid,
      hrManagerDecisionAt: nowIso,
      hrManagerComments: comments,
      updatedAt: nowIso,
    };
    await DbService.saveAttendanceCorrection(updatedCorrection);

    // Original biometric punch values remain intact!
    const updatedAttendance: AttendanceRecord = {
      ...params.attendanceRecord,
      originalBiometricSnapshot: preservedOriginalSnapshot,
      finalApprovalStatus: "Rejected",
      hrReviewStatus: "Rejected",
      finalApprovedBy: params.actorName,
      finalApprovedByUid: params.actorUid,
      finalApprovedAt: nowIso,
      approvalComments: `Correction rejected: ${comments}`,
      payrollFinalized: false,
      approvalAuditHistory: [
        ...(params.attendanceRecord.approvalAuditHistory || []),
        {
          id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: nowIso,
          timezone: "Africa/Addis_Ababa",
          actorName: params.actorName,
          actorUid: params.actorUid,
          actorRole: String(params.actorRole),
          action: "Correction Rejected",
          previousStatus: params.correction.status,
          newStatus: "Rejected",
          comments,
        },
      ],
    };
    if (params.onSaveAttendance) {
      await params.onSaveAttendance(updatedAttendance);
    } else {
      await DbService.updateAttendanceRecord(updatedAttendance);
    }
    return { updatedCorrection, updatedAttendance };
  }

  // HR Manager APPROVES correction -> recompute hours while preserving originalBiometricSnapshot!
  const sched = params.worker
    ? resolveWorkerSchedule(params.worker, params.schedules, params.attendanceRecord.date)
    : params.schedules.find((s) => s.id === params.attendanceRecord.scheduleId) || params.schedules[0];

  const metrics = computeScheduleAttendanceMetrics({
    date: params.attendanceRecord.date,
    checkIn: params.correction.proposedCheckIn ? params.correction.proposedCheckIn.slice(0, 5) : null,
    checkOut: params.correction.proposedCheckOut ? params.correction.proposedCheckOut.slice(0, 5) : null,
    explicitStatus:
      params.correction.proposedStatus === "Absent" ||
      params.correction.proposedStatus === "Leave" ||
      params.correction.proposedStatus === "Holiday"
        ? params.correction.proposedStatus
        : undefined,
    schedule: sched,
    approvedLeaves: params.approvedLeaves,
    workerId: params.attendanceRecord.workerId,
    employeeId: params.worker?.employeeId || params.correction.employeeId,
  });

  const updatedCorrection: AttendanceCorrectionRequest = {
    ...params.correction,
    status: "Approved",
    hrManagerDecisionBy: params.actorName,
    hrManagerDecisionByUid: params.actorUid,
    hrManagerDecisionAt: nowIso,
    hrManagerComments: comments,
    updatedAt: nowIso,
  };
  await DbService.saveAttendanceCorrection(updatedCorrection);

  const updatedAttendance: AttendanceRecord = {
    ...params.attendanceRecord,
    checkIn: params.correction.proposedCheckIn,
    checkOut: params.correction.proposedCheckOut,
    status: metrics.status,
    workingHours: metrics.workingHours,
    overtime: metrics.overtime,
    overtimeCandidateHours: metrics.overtimeCandidateHours,
    underTime: metrics.underTime,
    lateArrivalMinutes: metrics.lateArrivalMinutes,
    earlyDepartureMinutes: metrics.earlyDepartureMinutes,
    punchCompleteness: metrics.punchCompleteness,
    missingPunchType: metrics.missingPunchType,
    originalBiometricSnapshot: preservedOriginalSnapshot,
    hrReviewStatus: "Approved",
    finalApprovalStatus: "Approved",
    finalApprovedBy: params.actorName,
    finalApprovedByUid: params.actorUid,
    finalApprovedAt: nowIso,
    approvalComments: `Correction ${params.correction.requestNo} approved: ${comments}`,
    payrollFinalized: true,
    payrollFinalizedAt: nowIso,
    ...(params.attendanceRecord.discrepancyFlag
      ? { discrepancyFlag: { ...params.attendanceRecord.discrepancyFlag, status: "Resolved" as const } }
      : {}),
    approvalAuditHistory: [
      ...(params.attendanceRecord.approvalAuditHistory || []),
      {
        id: `AAH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        timezone: "Africa/Addis_Ababa",
        actorName: params.actorName,
        actorUid: params.actorUid,
        actorRole: String(params.actorRole),
        action: "Correction Approved",
        previousStatus: params.correction.status,
        newStatus: "Approved",
        comments: `${params.correction.correctionType} approved (${params.correction.requestNo}): ${comments}`,
      },
    ],
    timezone: "Africa/Addis_Ababa",
  };

  if (params.onSaveAttendance) {
    await params.onSaveAttendance(updatedAttendance);
  } else {
    await DbService.updateAttendanceRecord(updatedAttendance);
  }

  await DbService.addAttendanceAuditLog({
    id: `AAL-COR-APP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    attendanceId: updatedAttendance.id,
    correctionId: updatedCorrection.id,
    workerId: updatedCorrection.workerId,
    workerName: updatedCorrection.workerName,
    date: updatedCorrection.date,
    action: `Manual Correction Approved by HR Manager`,
    previousStatus: params.correction.status,
    newStatus: "Approved",
    comments,
    actorName: params.actorName,
    actorUid: params.actorUid,
    actorRole: String(params.actorRole),
    timestamp: nowIso,
    timezone: "Africa/Addis_Ababa",
  }).catch(() => {});

  return { updatedCorrection, updatedAttendance };
}

// ============================================================================
// PART 2: 12 ATTENDANCE REPORTS BUILDER (FILTERABLE + EXPORTABLE)
// ============================================================================

export interface AttendanceReportQueryParams {
  reportType: AttendanceReportTypeId;
  workers: Worker[];
  attendance: AttendanceRecord[];
  schedules: WorkScheduleConfig[];
  leaveRequests: LeaveRequestRecord[];
  overtimeRequests: OvertimeRequestRecord[];
  devices: BiometricDeviceRecord[];
  mappings?: BiometricDeviceMapping[];
  unmappedEvents?: UnmappedBiometricEvent[];
  filters: AttendanceWorkflowFilters & {
    searchQuery?: string;
    approvalStatusFilter?: "ALL" | AttendanceApprovalStatus;
  };
}

export function buildAttendanceReportRows(
  params: AttendanceReportQueryParams
): Record<string, any>[] {
  const { filters } = params;
  const search = String(filters.searchQuery || "").trim().toLowerCase();
  const workerById = new Map<string, Worker>();
  params.workers.forEach((w) => {
    workerById.set(w.id, w);
    if (w.employeeId) workerById.set(w.employeeId, w);
  });

  const anchorDate = filters.anchorDate || new Date().toISOString().slice(0, 10);
  const weekRange = getWeekDateRange(anchorDate);
  const monthRange = getMonthDateRange(filters.selectedMonth || anchorDate.slice(0, 7));

  const matchesWorker = (w: Worker) => {
    if (
      filters.employeeFilter !== "ALL" &&
      w.id !== filters.employeeFilter &&
      w.employeeId !== filters.employeeFilter
    ) {
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
    if (
      filters.workLocationFilter !== "ALL" &&
      inferWorkerWorkLocationType(w) !== filters.workLocationFilter
    ) {
      return false;
    }
    if (search) {
      const hay = `${w.employeeId || w.id} ${w.name} ${w.department} ${proj}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  };

  const matchesRecord = (a: AttendanceRecord, start?: string, end?: string) => {
    if (start && a.date < start) return false;
    if (end && a.date > end) return false;
    const lw = workerById.get(a.workerId);
    if (
      filters.employeeFilter !== "ALL" &&
      a.workerId !== filters.employeeFilter &&
      lw?.id !== filters.employeeFilter &&
      lw?.employeeId !== filters.employeeFilter
    ) {
      return false;
    }
    const dept = a.department || lw?.department || "";
    if (
      filters.departmentFilter !== "ALL" &&
      dept.toLowerCase() !== filters.departmentFilter.toLowerCase()
    ) {
      return false;
    }
    const proj = a.zone || a.gpsLocationString || a.building || lw?.assignedProject || "Head Office";
    if (
      filters.projectFilter !== "ALL" &&
      proj.toLowerCase() !== filters.projectFilter.toLowerCase() &&
      String(lw?.assignedProject || lw?.currentSite || "").toLowerCase() !== filters.projectFilter.toLowerCase()
    ) {
      return false;
    }
    const loc = a.workLocationType || (lw ? inferWorkerWorkLocationType(lw) : "Construction Site");
    if (filters.workLocationFilter !== "ALL" && loc !== filters.workLocationFilter) {
      return false;
    }
    const appStat = a.finalApprovalStatus || (a.hrReviewStatus === "Approved" ? "Approved" : "Pending");
    if (
      filters.approvalStatusFilter &&
      filters.approvalStatusFilter !== "ALL" &&
      appStat !== filters.approvalStatusFilter
    ) {
      return false;
    }
    if (search) {
      const hay = `${lw?.employeeId || a.workerId} ${a.workerName} ${dept} ${proj} ${a.biometricDeviceName || ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  };

  const filteredWorkers = params.workers.filter(matchesWorker);

  switch (params.reportType) {
    case "daily-attendance":
      return params.attendance
        .filter((a) => matchesRecord(a, anchorDate, anchorDate))
        .map((a) => {
          const w = workerById.get(a.workerId);
          return {
            Date: a.date,
            "Employee ID": w?.employeeId || a.workerId,
            "Employee Name": a.workerName,
            Department: a.department || w?.department || "Operations",
            "Work Location": a.workLocationType || (w ? inferWorkerWorkLocationType(w) : "Construction Site"),
            "Project / Site": a.zone || w?.assignedProject || "Head Office",
            "Check-In": a.checkIn || "MISSING",
            "Check-Out": a.checkOut || "MISSING",
            "Work Hrs": Number(a.workingHours || 0),
            "Late (min)": Number(a.lateArrivalMinutes || 0),
            "Early Exit (min)": Number(a.earlyDepartureMinutes || 0),
            "OT Hrs": Number(a.overtime || 0),
            Status: a.status,
            "Approval Status": a.finalApprovalStatus || "Pending",
            Device: a.biometricDeviceName || a.method || "Manual",
          };
        });

    case "weekly-attendance":
    case "monthly-attendance": {
      const range = params.reportType === "weekly-attendance" ? weekRange : monthRange;
      const periodRecs = params.attendance.filter((a) => matchesRecord(a, range.startDate, range.endDate));
      return buildRollupRows({
        workers: filteredWorkers,
        periodRecords: periodRecs,
        leaveRequests: params.leaveRequests,
        overtimeRequests: params.overtimeRequests,
        startDate: range.startDate,
        endDate: range.endDate,
      }).map((r) => ({
        Period: `${range.startDate} .. ${range.endDate}`,
        "Employee ID": r.employeeId,
        "Employee Name": r.workerName,
        Department: r.department,
        "Work Location": r.workLocationType,
        "Project / Site": r.project,
        "Present Days": r.presentDays,
        "Late Days": r.lateDays,
        "Early Exits": r.earlyDepartures,
        "Missing Punches": r.missingPunches,
        "Absent Days": r.absentDays,
        "Leave Days": r.leaveDays,
        "Regular Hrs": r.regularHours,
        "Approved OT Hrs": r.approvedOvertimeHours,
      }));
    }

    case "employee-history":
      return params.attendance
        .filter((a) => matchesRecord(a))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((a) => {
          const w = workerById.get(a.workerId);
          return {
            Date: a.date,
            "Employee ID": w?.employeeId || a.workerId,
            "Employee Name": a.workerName,
            "Project / Site": a.zone || w?.assignedProject || "Head Office",
            "Original Bio Check-In": a.originalBiometricSnapshot?.checkIn || a.checkIn || "—",
            "Original Bio Check-Out": a.originalBiometricSnapshot?.checkOut || a.checkOut || "—",
            "Current Check-In": a.checkIn || "MISSING",
            "Current Check-Out": a.checkOut || "MISSING",
            "Hours Worked": Number(a.workingHours || 0),
            Status: a.status,
            "HR Approval": a.finalApprovalStatus || "Pending",
            "Approved By": a.finalApprovedBy || "—",
            Timezone: a.timezone || "Africa/Addis_Ababa",
          };
        });

    case "department-attendance": {
      const deptMap = new Map<string, { dept: string; headcount: number; present: number; late: number; absent: number; missing: number; hours: number; ot: number }>();
      filteredWorkers.forEach((w) => {
        const d = w.department || "Operations";
        if (!deptMap.has(d)) deptMap.set(d, { dept: d, headcount: 0, present: 0, late: 0, absent: 0, missing: 0, hours: 0, ot: 0 });
        deptMap.get(d)!.headcount += 1;
      });
      params.attendance
        .filter((a) => matchesRecord(a, monthRange.startDate, monthRange.endDate))
        .forEach((a) => {
          const d = a.department || workerById.get(a.workerId)?.department || "Operations";
          if (!deptMap.has(d)) deptMap.set(d, { dept: d, headcount: 0, present: 0, late: 0, absent: 0, missing: 0, hours: 0, ot: 0 });
          const row = deptMap.get(d)!;
          if (a.status === "Present" || a.status === "Late") row.present += 1;
          if (a.status === "Late") row.late += 1;
          if (a.status === "Absent") row.absent += 1;
          if (detectMissingPunchType(a) !== "None") row.missing += 1;
          row.hours = round2(row.hours + Number(a.workingHours || 0));
          row.ot = round2(row.ot + Number(a.overtime || 0));
        });
      return Array.from(deptMap.values()).map((d) => ({
        Department: d.dept,
        Period: filters.selectedMonth,
        "Employees In Dept": d.headcount,
        "Present Logs": d.present,
        "Late Logs": d.late,
        "Absent Logs": d.absent,
        "Missing Punches": d.missing,
        "Total Regular Hrs": d.hours,
        "Total OT Hrs": d.ot,
      }));
    }

    case "project-site-attendance": {
      const projMap = new Map<string, { project: string; locationType: string; staff: number; present: number; late: number; absent: number; missing: number; hours: number }>();
      filteredWorkers.forEach((w) => {
        const p = w.assignedProject || w.currentSite || "Head Office";
        if (!projMap.has(p)) projMap.set(p, { project: p, locationType: inferWorkerWorkLocationType(w), staff: 0, present: 0, late: 0, absent: 0, missing: 0, hours: 0 });
        projMap.get(p)!.staff += 1;
      });
      params.attendance
        .filter((a) => matchesRecord(a, monthRange.startDate, monthRange.endDate))
        .forEach((a) => {
          const lw = workerById.get(a.workerId);
          const p = a.zone || lw?.assignedProject || lw?.currentSite || "Head Office";
          if (!projMap.has(p)) projMap.set(p, { project: p, locationType: a.workLocationType || "Construction Site", staff: 0, present: 0, late: 0, absent: 0, missing: 0, hours: 0 });
          const row = projMap.get(p)!;
          if (a.status === "Present" || a.status === "Late") row.present += 1;
          if (a.status === "Late") row.late += 1;
          if (a.status === "Absent") row.absent += 1;
          if (detectMissingPunchType(a) !== "None") row.missing += 1;
          row.hours = round2(row.hours + Number(a.workingHours || 0));
        });
      return Array.from(projMap.values()).map((r) => ({
        "Project / Site": r.project,
        "Work Location Type": r.locationType,
        "Assigned Staff": r.staff,
        "Present Logs": r.present,
        "Late Logs": r.late,
        "Absent Logs": r.absent,
        "Missing Punches": r.missing,
        "Total Work Hrs": r.hours,
      }));
    }

    case "late-arrival":
      return params.attendance
        .filter((a) => matchesRecord(a, monthRange.startDate, monthRange.endDate) && (a.status === "Late" || Number(a.lateArrivalMinutes || 0) > 0))
        .map((a) => {
          const w = workerById.get(a.workerId);
          return {
            Date: a.date,
            "Employee ID": w?.employeeId || a.workerId,
            "Employee Name": a.workerName,
            Department: a.department || w?.department || "Operations",
            "Project / Site": a.zone || w?.assignedProject || "Head Office",
            "Check-In": a.checkIn || "—",
            "Late Minutes": Number(a.lateArrivalMinutes || 0),
            "Early Exit Minutes": Number(a.earlyDepartureMinutes || 0),
            "Approval Status": a.finalApprovalStatus || "Pending",
          };
        });

    case "absence":
      return filteredWorkers
        .filter((w) => w.status === "Active")
        .map((w) => {
          const rec = reconcileEmployeeAttendanceDay({
            worker: w,
            date: anchorDate,
            attendanceRecords: params.attendance,
            schedules: params.schedules,
            leaveRequests: params.leaveRequests,
          });
          return { w, rec };
        })
        .filter(({ rec }) => rec.reconciledStatus === "Absent" || rec.reconciledStatus === "Approved Leave" || rec.reconciledStatus === "Unpaid Leave" || rec.reconciledStatus === "Holiday")
        .map(({ w, rec }) => ({
          Date: anchorDate,
          "Employee ID": w.employeeId || w.id,
          "Employee Name": w.name,
          Department: w.department || "Operations",
          "Project / Site": w.assignedProject || w.currentSite || "Head Office",
          "Reconciled Category": rec.reconciledStatus,
          "Leave Type": rec.leaveType || "—",
          "Paid vs Unpaid": rec.reconciledStatus === "Approved Leave" ? "Paid Leave" : rec.reconciledStatus === "Unpaid Leave" ? "Unpaid Leave" : rec.reconciledStatus === "Absent" ? "Unexcused Absence" : "Scheduled Off/Holiday",
          Schedule: rec.scheduleName,
        }));

    case "overtime":
      return params.attendance
        .filter((a) => matchesRecord(a, monthRange.startDate, monthRange.endDate) && (Number(a.overtime || 0) > 0 || Number(a.overtimeCandidateHours || 0) > 0))
        .map((a) => {
          const w = workerById.get(a.workerId);
          return {
            Date: a.date,
            "Employee ID": w?.employeeId || a.workerId,
            "Employee Name": a.workerName,
            "Project / Site": a.zone || w?.assignedProject || "Head Office",
            "Check-In": a.checkIn || "—",
            "Check-Out": a.checkOut || "—",
            "Candidate OT Hrs": Number(a.overtimeCandidateHours || a.overtime || 0),
            "Approved OT Hrs": a.finalApprovalStatus === "Approved" || a.hrReviewStatus === "Approved" ? Number(a.overtime || 0) : 0,
            "Approval Status": a.finalApprovalStatus || "Pending",
            "Approved By": a.finalApprovedBy || a.hrReviewedBy || "Pending HR Manager",
          };
        });

    case "missing-punch":
      return params.attendance
        .filter((a) => matchesRecord(a) && detectMissingPunchType(a) !== "None")
        .map((a) => {
          const w = workerById.get(a.workerId);
          return {
            Date: a.date,
            "Employee ID": w?.employeeId || a.workerId,
            "Employee Name": a.workerName,
            "Project / Site": a.zone || w?.assignedProject || "Head Office",
            "Missing Type": detectMissingPunchType(a),
            "Recorded Check-In": a.checkIn || "MISSING",
            "Recorded Check-Out": a.checkOut || "MISSING",
            "Device": a.biometricDeviceName || a.method || "Manual",
            "HR Status": a.finalApprovalStatus || a.hrReviewStatus || "Pending",
          };
        });

    case "hr-approval":
      return params.attendance
        .filter((a) => matchesRecord(a, monthRange.startDate, monthRange.endDate))
        .map((a) => {
          const w = workerById.get(a.workerId);
          return {
            Date: a.date,
            "Employee ID": w?.employeeId || a.workerId,
            "Employee Name": a.workerName,
            "Work Location": a.workLocationType || (w ? inferWorkerWorkLocationType(w) : "Construction Site"),
            "Approval Status": a.finalApprovalStatus || "Pending",
            "HR Officer Review": a.reviewedBy || "—",
            "HR Manager Final Approver": a.finalApprovedBy || "—",
            "Final Approved At (EAT)": a.finalApprovedAt ? formatAddisAbabaDateTime(a.finalApprovedAt) : "—",
            "Payroll Finalized": a.payrollFinalized ? "Yes (Payroll Ready)" : "No",
            "Discrepancy": a.discrepancyFlag ? `${a.discrepancyFlag.status}: ${a.discrepancyFlag.notes}` : "None",
            Comments: a.approvalComments || a.hrReviewNotes || "—",
          };
        });

    case "biometric-device-sync":
      return params.devices
        .filter((d) => {
          if (filters.workLocationFilter !== "ALL" && d.workLocationType !== filters.workLocationFilter) return false;
          if (filters.projectFilter !== "ALL" && d.projectName && d.projectName.toLowerCase() !== filters.projectFilter.toLowerCase()) return false;
          if (search) {
            const hay = `${d.deviceCode} ${d.deviceName} ${d.model} ${d.serialNumber} ${d.projectName || ""}`.toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        })
        .map((d) => {
          const mappedCount = (params.mappings || []).filter((m) => m.deviceId === d.id && m.status === "Active").length;
          const unmappedCount = (params.unmappedEvents || []).filter((u) => u.deviceId === d.id && u.status === "Unmapped").length;
          const punchedLogs = params.attendance.filter((a) => a.biometricDeviceId === d.id).length;
          return {
            "Device Code": d.deviceCode,
            "Device Name": d.deviceName,
            Model: `${d.manufacturer} ${d.model}`,
            "Serial No": d.serialNumber,
            "Work Location": d.workLocationType,
            "Project / Site": d.projectName || "Head Office",
            Protocol: d.protocolType || "ADMS_PUSH_HTTP",
            Status: d.status,
            Connectivity: d.status !== "Active" ? "Inactive" : d.connectionVerified || d.lastHandshakeAt ? "Online" : "Pending Sync / Offline",
            "Active Mapped Staff": mappedCount,
            "Synced Attendance Logs": punchedLogs,
            "Unmapped Events": unmappedCount,
            "Last Handshake (EAT)": d.lastHandshakeAt ? formatAddisAbabaDateTime(d.lastHandshakeAt) : "Not Yet Connected",
          };
        });
  }
}
