import {
  AluminumFormworkPanel,
  AttendanceRecord,
  ErpTask,
  ExcessRecruitmentRequestRecord,
  PanelMovementLog,
  PanelStatus,
  PerformanceEvaluation,
  ProjectZone,
  RecruitmentRequestRecord,
  Team,
  UserRole,
  Worker,
} from "../types";
import { normalizeLegacyRole } from "../services/authService";

export type DashboardKind =
  | "executive"
  | "hr"
  | "finance"
  | "siteEngineering"
  | "timekeeping"
  | "fieldLead"
  | "fieldWorker"
  | "warehouse"
  | "gate"
  | "system";

export const DASHBOARD_KIND_BY_ROLE: Record<UserRole, DashboardKind> = {
  [UserRole.SUPER_ADMIN]: "executive",
  [UserRole.HEAD_OFFICE]: "executive",
  [UserRole.DIRECTOR]: "executive",
  [UserRole.PROJECT_MANAGER]: "executive",
  [UserRole.OPERATION_MANAGER]: "executive",
  [UserRole.OFFICE_MANAGER]: "executive",
  [UserRole.SECTION_HEAD]: "executive",

  [UserRole.HR]: "hr",
  [UserRole.HR_MANAGER]: "hr",

  [UserRole.FINANCE_MANAGER]: "finance",
  [UserRole.ACCOUNTANT]: "finance",
  [UserRole.AUDITOR]: "finance",

  [UserRole.SITE_ENGINEER]: "siteEngineering",
  [UserRole.SUPERVISOR]: "siteEngineering",
  [UserRole.SURVEYOR]: "siteEngineering",
  [UserRole.HSE_OFFICER]: "siteEngineering",
  [UserRole.OFFICE_AND_TECHNICAL_ENGINEERING]: "siteEngineering",

  [UserRole.TIME_KEEPER]: "timekeeping",

  [UserRole.TEAM_LEADER]: "fieldLead",
  [UserRole.GANG_CHIEF]: "fieldLead",

  [UserRole.ASSEMBLER]: "fieldWorker",
  [UserRole.WORKER]: "fieldWorker",
  [UserRole.EMPLOYEE]: "fieldWorker",
  [UserRole.DRIVER]: "fieldWorker",

  [UserRole.WAREHOUSE_MANAGER]: "warehouse",
  [UserRole.STORE_MANAGER]: "warehouse",
  [UserRole.STORE_OWNER]: "warehouse",
  [UserRole.MATERIAL_HANDLING]: "warehouse",

  [UserRole.GATE_SECURITY_OFFICER]: "gate",

  [UserRole.SYSTEM_OPERATOR]: "system",
};

export interface DashboardKindMeta {
  kind: DashboardKind;
  titleEn: string;
  titleAm: string;
  subtitleEn: string;
  subtitleAm: string;
  quickLinkTabs: string[];
}

export const KIND_META: Record<DashboardKind, DashboardKindMeta> = {
  executive: {
    kind: "executive",
    titleEn: "Executive Command Dashboard",
    titleAm: "የአመራር ዕዝ መቆጣጠሪያ ዳሽቦርድ",
    subtitleEn: "Enterprise workforce, attendance, approvals, project progress, and asset health overview.",
    subtitleAm: "አጠቃላይ የሰው ኃይል፣ መገኘት፣ ማፅደቂያዎች፣ የፕሮጀክት ሂደት እና የንብረት ሁኔታ ማሳያ።",
    quickLinkTabs: [
      "hrmEnterprise",
      "financeErp",
      "warehouseSiteStore",
      "planning",
      "predictions",
      "admin",
      "auditLog",
    ],
  },
  hr: {
    kind: "hr",
    titleEn: "HR & Workforce Dashboard",
    titleAm: "የሰው ኃይል እና ቅጥር ዳሽቦርድ",
    subtitleEn: "Daily headcount, check-in status, recruitment stages, onboarding queue, and HR tasks.",
    subtitleAm: "ዕለታዊ የሰራተኞች ብዛት፣ የመገኘት ሁኔታ፣ የቅጥር ደረጃዎች እና የHR ተግባራት።",
    quickLinkTabs: [
      "hrmEnterprise",
      "hrmBiometricMapping",
      "workerProfiles",
      "attendance",
      "financeErp",
      "admin",
    ],
  },
  finance: {
    kind: "finance",
    titleEn: "Finance & Payroll Control Dashboard",
    titleAm: "የፋይናንስ እና የደመወዝ ቁጥጥር ዳሽቦርድ",
    subtitleEn: "Billable working hours, overtime exposure, payroll headcount, and assigned finance actions.",
    subtitleAm: "የስራ ሰዓታት፣ የትርፍ ሰዓት (Overtime)፣ የደመወዝ ሰራተኞች ብዛት እና የተመደቡ ተግባራት።",
    quickLinkTabs: [
      "financeErp",
      "enterpriseErp",
      "hrmEnterprise",
      "warehouseSiteStore",
      "auditLog",
    ],
  },
  siteEngineering: {
    kind: "siteEngineering",
    titleEn: "Site Engineering & Quality Dashboard",
    titleAm: "የሳይት ኢንጂነሪንግ እና ጥራት ዳሽቦርድ",
    subtitleEn: "Zone progress, schedule delays, team safety and quality indexes, and active site crew.",
    subtitleAm: "የዞኖች ሂደት፣ የጊዜ መዘግየት፣ የቡድን ደህንነትና ጥራት ነጥቦች እና በሳይት ያለ ቡድን።",
    quickLinkTabs: [
      "planning",
      "progress",
      "safetyQuality",
      "surveying",
      "cadDrawing",
      "projectDocs",
      "siteLayout",
      "aiInspection",
    ],
  },
  timekeeping: {
    kind: "timekeeping",
    titleEn: "Timekeeping & Biometric Desk",
    titleAm: "የሰዓት እና ባዮሜትሪክ መቆጣጠሪያ ዳሽቦርድ",
    subtitleEn: "Live check-in/out counts, late arrivals, on-site presence, and attendance reconciliation.",
    subtitleAm: "የዕለት መግቢያ/መውጫ ብዛት፣ ዘግይተው የገቡ፣ ያልወጡ ሰራተኞች እና የሰዓት ቁጥጥር።",
    quickLinkTabs: [
      "attendance",
      "biometricBoard",
      "fingerprintBoard",
      "biometricKiosk",
      "workerProfiles",
      "performance",
    ],
  },
  fieldLead: {
    kind: "fieldLead",
    titleEn: "Crew Lead Command Dashboard",
    titleAm: "የቡድን መሪ የስራ ዳሽቦርድ",
    subtitleEn: "Your assigned crew headcount, daily check-ins, team performance, and field tasks.",
    subtitleAm: "በስርዎ ያለው ቡድን ብዛት፣ የዕለት መገኘት፣ የቡድን አፈፃፀም እና የተግባር ዝርዝር።",
    quickLinkTabs: [
      "planning",
      "progress",
      "attendance",
      "safetyQuality",
      "panelTraceability",
      "siteStoreMovement",
      "taskManagement",
    ],
  },
  fieldWorker: {
    kind: "fieldWorker",
    titleEn: "My Field Portal Dashboard",
    titleAm: "የግል የስራ እና መገኘት ዳሽቦርድ",
    subtitleEn: "Your daily check-in/out status, monthly hours, latest evaluation, and assigned tasks.",
    subtitleAm: "የዕለት መገኘትዎ፣ የወር የስራ ሰዓት፣ የቅርብ ጊዜ ግምገማ እና የተመደቡልዎ ስራዎች።",
    quickLinkTabs: [
      "attendance",
      "progress",
      "workerProfiles",
      "hrmEnterprise",
      "taskManagement",
      "siteLayout",
    ],
  },
  warehouse: {
    kind: "warehouse",
    titleEn: "Warehouse & Site Store Dashboard",
    titleAm: "የመጋዘን እና ሳይት ስቶር ዳሽቦርድ",
    subtitleEn: "Formwork inventory statuses, cleaning/repair queues, damaged/missing alerts, and daily movements.",
    subtitleAm: "የፎርምወርክ ዕቃዎች ሁኔታ፣ የጥገና/ጽዳት ክትትል፣ የተበላሹ/የጠፉ እና የዕለት ዝውውሮች።",
    quickLinkTabs: [
      "warehouseSiteStore",
      "warehouseManagerApp",
      "storeOwnerApp",
      "panelTraceability",
      "siteStoreMovement",
      "formworkManagement",
    ],
  },
  gate: {
    kind: "gate",
    titleEn: "Gate Security & Dispatch Checkpoint",
    titleAm: "የበር ደህንነት እና ጭነት መቆጣጠሪያ",
    subtitleEn: "Today's gate movements, verified vehicles, in-transit stock, and checkpoint tasks.",
    subtitleAm: "የዕለቱ የበር እንቅስቃሴዎች፣ ተሽከርካሪዎች፣ በመጓጓዣ ላይ ያሉ ዕቃዎች እና ተግባራት።",
    quickLinkTabs: [
      "warehouseSiteStore",
      "notificationCenter",
      "securitySettings",
    ],
  },
  system: {
    kind: "system",
    titleEn: "System Operations & Telemetry Dashboard",
    titleAm: "የሲስተም አስተዳደር እና ክትትል ዳሽቦርድ",
    subtitleEn: "Live worker collections, daily attendance events, structural zones, panels, and system tasks.",
    subtitleAm: "የሰራተኛ መዝገቦች፣ የዕለት መገኘት መረጃ፣ ዞኖች፣ ፓነሎች እና ክፍት የሲስተም ተግባራት።",
    quickLinkTabs: [
      "firestoreExplorer",
      "auditLog",
      "securitySettings",
      "headOfficeSync",
      "launchReadiness",
      "biometricBoard",
    ],
  },
};

export type KpiTone = "ok" | "warn" | "bad" | "neutral";

export interface KpiCard {
  key: string;
  labelEn: string;
  labelAm: string;
  value: string | number;
  tone: KpiTone;
  hint?: string;
  linkTab?: string;
}

export interface DashboardActor {
  uid?: string;
  id?: string;
  employeeId?: string;
  name?: string;
  displayName?: string;
  role: UserRole | string;
}

export interface RoleDashboardData {
  workers?: Worker[];
  attendance?: AttendanceRecord[];
  teams?: Team[];
  zones?: ProjectZone[];
  evaluations?: PerformanceEvaluation[];
  formworkPanels?: AluminumFormworkPanel[];
  panelMovementLogs?: PanelMovementLog[];
  recruitmentRequests?: RecruitmentRequestRecord[];
  excessRecruitmentRequests?: ExcessRecruitmentRequestRecord[];
  erpTasks?: ErpTask[];
}

export function todayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normStr(val: unknown): string {
  return typeof val === "string" ? val.trim().toLowerCase() : "";
}

function buildActorIdSet(actor: DashboardActor): Set<string> {
  const ids = new Set<string>();
  [actor.uid, actor.id, actor.employeeId].forEach((v) => {
    const clean = typeof v === "string" ? v.trim() : "";
    if (clean) ids.add(clean);
  });
  return ids;
}

function buildActorMatchTokens(actor: DashboardActor): Set<string> {
  const tokens = new Set<string>();
  [actor.uid, actor.id, actor.employeeId, actor.name, actor.displayName].forEach((v) => {
    const clean = normStr(v);
    if (clean) tokens.add(clean);
  });
  return tokens;
}

const CLOSED_TASK_STATUSES = new Set<string>(["Completed", "Cancelled", "Rejected"]);

export function tasksForActor(tasks: ErpTask[] = [], actor: DashboardActor): ErpTask[] {
  const actorIds = buildActorIdSet(actor);
  const actorRoleNorm = normalizeLegacyRole(String(actor.role || "")).trim().toLowerCase();

  return (tasks || []).filter((task) => {
    if (!task) return false;
    if (CLOSED_TASK_STATUSES.has(String(task.status))) return false;

    const assignedId = typeof task.assignedToId === "string" ? task.assignedToId.trim() : "";
    const assignedList = Array.isArray(task.assignedToUserIds)
      ? task.assignedToUserIds.map((x) => String(x || "").trim()).filter(Boolean)
      : [];

    const hasExplicitUserAssignment = Boolean(assignedId) || assignedList.length > 0;
    const matchesUserId =
      (assignedId !== "" && actorIds.has(assignedId)) ||
      assignedList.some((id) => actorIds.has(id));

    if (matchesUserId) return true;
    if (hasExplicitUserAssignment) return false;

    const taskRoleNorm = normalizeLegacyRole(String(task.assignedToRole || "")).trim().toLowerCase();
    return Boolean(actorRoleNorm) && taskRoleNorm === actorRoleNorm;
  });
}

export function findOwnWorker(workers: Worker[] = [], actor: DashboardActor): Worker | undefined {
  const list = workers || [];
  const uid = typeof actor.uid === "string" ? actor.uid.trim() : "";
  const id = typeof actor.id === "string" ? actor.id.trim() : "";
  const empId = typeof actor.employeeId === "string" ? actor.employeeId.trim() : "";
  const nameTokens = new Set<string>(
    [actor.name, actor.displayName].map(normStr).filter(Boolean)
  );

  if (uid) {
    const byUid = list.find((w) => (w.userId && w.userId.trim() === uid) || w.id.trim() === uid);
    if (byUid) return byUid;
  }
  if (empId) {
    const byEmp = list.find(
      (w) =>
        (w.employeeId && w.employeeId.trim().toLowerCase() === empId.toLowerCase()) ||
        w.id.trim().toLowerCase() === empId.toLowerCase()
    );
    if (byEmp) return byEmp;
  }
  if (id) {
    const byId = list.find((w) => w.id.trim() === id || (w.employeeId && w.employeeId.trim() === id));
    if (byId) return byId;
  }
  if (nameTokens.size > 0) {
    const byName = list.find((w) => nameTokens.has(normStr(w.name)));
    if (byName) return byName;
  }
  return undefined;
}

export function workersOfLead(workers: Worker[] = [], actor: DashboardActor): Worker[] {
  const tokens = buildActorMatchTokens(actor);
  if (tokens.size === 0) return [];
  return (workers || []).filter((w) => {
    const tl = normStr(w.teamLeader);
    const gc = normStr(w.gangChief);
    return (tl !== "" && tokens.has(tl)) || (gc !== "" && tokens.has(gc));
  });
}

function workerKeysSet(w: Worker): Set<string> {
  const set = new Set<string>();
  if (w.id) set.add(w.id.trim());
  if (w.employeeId) set.add(w.employeeId.trim());
  return set;
}

function isPresentOrLate(a: AttendanceRecord): boolean {
  return a.status === "Present" || a.status === "Late";
}

function roundHours(n: number): number {
  return Math.round(n * 10) / 10;
}

export function resolveDashboardKind(role: UserRole | string): DashboardKind {
  const normalized = normalizeLegacyRole(String(role || "")) as UserRole;
  return DASHBOARD_KIND_BY_ROLE[normalized] ?? "executive";
}

export function computeKpis(
  kind: DashboardKind,
  data: RoleDashboardData,
  actor: DashboardActor,
  today: string = todayKey()
): KpiCard[] {
  const workers = data.workers || [];
  const attendance = data.attendance || [];
  const teams = data.teams || [];
  const zones = data.zones || [];
  const evaluations = data.evaluations || [];
  const formworkPanels = data.formworkPanels || [];
  const panelMovementLogs = data.panelMovementLogs || [];
  const recruitmentRequests = data.recruitmentRequests || [];
  const excessRecruitmentRequests = data.excessRecruitmentRequests || [];
  const erpTasks = data.erpTasks || [];

  const todayAttendance = attendance.filter((a) => a.date === today);
  const myOpenTasks = tasksForActor(erpTasks, actor);
  const monthPrefix = today.slice(0, 7);

  switch (kind) {
    case "executive": {
      const presentToday = todayAttendance.filter(isPresentOrLate).length;
      const presentPct = workers.length > 0 ? Math.round((presentToday / workers.length) * 100) : 0;
      const pendingRec = recruitmentRequests.filter((r) => r.status === "Pending").length;
      const pendingExcess = excessRecruitmentRequests.filter((e) => e.status === "Pending Director").length;
      const pendingApprovals = pendingRec + pendingExcess;
      const zonesInProgress = zones.filter((z) => z.status === "In Progress").length;
      const delayedZones = zones.filter((z) => z.status === "Delayed").length;
      const avgPerf =
        evaluations.length > 0
          ? `${Math.round(evaluations.reduce((s, e) => s + Number(e.totalScore || 0), 0) / evaluations.length)}%`
          : "—";
      const damagedMissing = formworkPanels.filter(
        (p) => p.status === PanelStatus.DAMAGED || p.status === PanelStatus.MISSING
      ).length;

      return [
        {
          key: "workforceCount",
          labelEn: "Total Workforce",
          labelAm: "ጠቅላላ ሰራተኞች",
          value: workers.length,
          tone: "neutral",
          linkTab: "workerProfiles",
        },
        {
          key: "presentTodayPct",
          labelEn: "Present Today",
          labelAm: "ዛሬ የተገኙ (%)",
          value: workers.length > 0 ? `${presentPct}%` : "—",
          hint: `${presentToday}/${workers.length}`,
          tone: workers.length === 0 ? "neutral" : presentPct >= 80 ? "ok" : presentPct >= 50 ? "warn" : "bad",
          linkTab: "attendance",
        },
        {
          key: "pendingApprovals",
          labelEn: "Pending Approvals",
          labelAm: "ማፅደቂያ የሚጠብቁ",
          value: pendingApprovals,
          hint: pendingExcess > 0 ? `${pendingRec} rec · ${pendingExcess} excess` : undefined,
          tone: pendingApprovals > 0 ? "warn" : "ok",
          linkTab: "hrmEnterprise",
        },
        {
          key: "zonesInProgress",
          labelEn: "Zones In Progress",
          labelAm: "በስራ ላይ ያሉ ዞኖች",
          value: zonesInProgress,
          tone: "neutral",
          linkTab: "planning",
        },
        {
          key: "delayedZones",
          labelEn: "Delayed Zones",
          labelAm: "የዘገዩ ዞኖች",
          value: delayedZones,
          tone: delayedZones > 0 ? "bad" : "ok",
          linkTab: "planning",
        },
        {
          key: "avgPerformance",
          labelEn: "Avg Performance",
          labelAm: "አማካይ የስራ አፈፃፀም",
          value: avgPerf,
          tone: evaluations.length === 0 ? "neutral" : "ok",
          linkTab: "performance",
        },
        {
          key: "damagedMissingPanels",
          labelEn: "Damaged / Missing Panels",
          labelAm: "የተበላሹ / የጠፉ ፓነሎች",
          value: damagedMissing,
          tone: damagedMissing > 0 ? "bad" : "ok",
          linkTab: "panelTraceability",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "hr": {
      const presentToday = todayAttendance.filter(isPresentOrLate).length;
      const lateToday = todayAttendance.filter((a) => a.status === "Late").length;
      const checkedInIds = new Set(
        todayAttendance
          .filter((a) => Boolean(a.checkIn) || isPresentOrLate(a))
          .map((a) => a.workerId)
      );
      const notCheckedIn = Math.max(0, workers.length - checkedInIds.size);
      const pendingRec = recruitmentRequests.filter((r) => r.status === "Pending").length;
      const awaitingReg = recruitmentRequests.filter(
        (r) =>
          (r.status === "Approved" || r.workflowStage === "Approved") &&
          Number(r.hiredCount || 0) < Number(r.requestedCount || 0)
      );
      const openVacancies = awaitingReg.reduce(
        (sum, r) => sum + Math.max(0, Number(r.requestedCount || 0) - Number(r.hiredCount || 0)),
        0
      );
      const excessPending = excessRecruitmentRequests.filter((e) => e.status === "Pending Director").length;

      return [
        {
          key: "headcount",
          labelEn: "Total Headcount",
          labelAm: "ጠቅላላ ሰራተኞች",
          value: workers.length,
          tone: "neutral",
          linkTab: "workerProfiles",
        },
        {
          key: "presentToday",
          labelEn: "Present Today",
          labelAm: "ዛሬ የተገኙ",
          value: presentToday,
          tone: presentToday > 0 ? "ok" : "neutral",
          linkTab: "attendance",
        },
        {
          key: "lateToday",
          labelEn: "Late Today",
          labelAm: "ዛሬ የዘገዩ",
          value: lateToday,
          tone: lateToday > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "notCheckedIn",
          labelEn: "Not Checked In",
          labelAm: "ያልገቡ",
          value: notCheckedIn,
          tone: notCheckedIn > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "pendingRecruitment",
          labelEn: "Pending Recruitment",
          labelAm: "በሂደት ላይ ያሉ ቅጥሮች",
          value: pendingRec,
          tone: pendingRec > 0 ? "warn" : "ok",
          linkTab: "hrmEnterprise",
        },
        {
          key: "approvedAwaitingReg",
          labelEn: "Approved Awaiting Reg.",
          labelAm: "ምዝገባ የሚጠብቁ",
          value: awaitingReg.length,
          hint: `${openVacancies} open vacancies`,
          tone: awaitingReg.length > 0 ? "warn" : "ok",
          linkTab: "hrmEnterprise",
        },
        {
          key: "excessPendingDirector",
          labelEn: "Excess Pending Director",
          labelAm: "የዳይሬክተር ፈቃድ የሚጠብቅ ትርፍ",
          value: excessPending,
          tone: excessPending > 0 ? "bad" : "ok",
          linkTab: "hrmEnterprise",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "finance": {
      const workHoursToday = roundHours(
        todayAttendance.reduce((s, a) => s + Number(a.workingHours || 0), 0)
      );
      const otHoursToday = roundHours(
        todayAttendance.reduce((s, a) => s + Number(a.overtime || 0), 0)
      );
      const monthAttendance = attendance.filter((a) => String(a.date || "").startsWith(monthPrefix));
      const workHoursMonth = roundHours(
        monthAttendance.reduce((s, a) => s + Number(a.workingHours || 0), 0)
      );
      const otHoursMonth = roundHours(
        monthAttendance.reduce((s, a) => s + Number(a.overtime || 0), 0)
      );
      const payrollHeadcount = workers.filter((w) => w.status !== "Inactive").length;

      return [
        {
          key: "workingHoursToday",
          labelEn: "Working Hours Today",
          labelAm: "የዛሬ የስራ ሰዓት",
          value: `${workHoursToday}h`,
          tone: "neutral",
          linkTab: "attendance",
        },
        {
          key: "overtimeHoursToday",
          labelEn: "Overtime Today",
          labelAm: "የዛሬ ትርፍ ሰዓት",
          value: `${otHoursToday}h`,
          tone: otHoursToday > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "workingHoursMonth",
          labelEn: "Working Hours (Month)",
          labelAm: "የወሩ የስራ ሰዓት",
          value: `${workHoursMonth}h`,
          tone: "neutral",
          linkTab: "financeErp",
        },
        {
          key: "overtimeHoursMonth",
          labelEn: "Overtime (Month)",
          labelAm: "የወሩ ትርፍ ሰዓት",
          value: `${otHoursMonth}h`,
          tone: otHoursMonth > 0 ? "warn" : "ok",
          linkTab: "financeErp",
        },
        {
          key: "payrollHeadcount",
          labelEn: "Payroll Headcount",
          labelAm: "የደመወዝ ሰራተኞች",
          value: payrollHeadcount,
          tone: "neutral",
          linkTab: "financeErp",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "siteEngineering": {
      const zonesInProgress = zones.filter((z) => z.status === "In Progress").length;
      const delayedZones = zones.filter((z) => z.status === "Delayed").length;
      const avgCompletion =
        zones.length > 0
          ? `${Math.round(zones.reduce((s, z) => s + Number(z.completionPercentage || 0), 0) / zones.length)}%`
          : "—";
      const avgSafety =
        teams.length > 0
          ? `${Math.round(teams.reduce((s, t) => s + Number(t.safetyScore || 0), 0) / teams.length)}%`
          : "—";
      const avgQuality =
        teams.length > 0
          ? `${Math.round(teams.reduce((s, t) => s + Number(t.qualityScore || 0), 0) / teams.length)}%`
          : "—";
      const crewPresent = todayAttendance.filter(isPresentOrLate).length;

      return [
        {
          key: "zonesTotal",
          labelEn: "Total Zones",
          labelAm: "ጠቅላላ ዞኖች",
          value: zones.length,
          tone: "neutral",
          linkTab: "planning",
        },
        {
          key: "zonesInProgress",
          labelEn: "Zones In Progress",
          labelAm: "በስራ ላይ ያሉ ዞኖች",
          value: zonesInProgress,
          tone: "neutral",
          linkTab: "planning",
        },
        {
          key: "delayedZones",
          labelEn: "Delayed Zones",
          labelAm: "የዘገዩ ዞኖች",
          value: delayedZones,
          tone: delayedZones > 0 ? "bad" : "ok",
          linkTab: "planning",
        },
        {
          key: "avgZoneCompletion",
          labelEn: "Avg Zone Completion",
          labelAm: "አማካይ የዞን አፈፃፀም",
          value: avgCompletion,
          tone: zones.length === 0 ? "neutral" : "ok",
          linkTab: "progress",
        },
        {
          key: "avgTeamSafety",
          labelEn: "Team Safety Score",
          labelAm: "አማካይ የደህንነት ነጥብ",
          value: avgSafety,
          tone: teams.length === 0 ? "neutral" : "ok",
          linkTab: "safetyQuality",
        },
        {
          key: "avgTeamQuality",
          labelEn: "Team Quality Score",
          labelAm: "አማካይ የጥራት ነጥብ",
          value: avgQuality,
          tone: teams.length === 0 ? "neutral" : "ok",
          linkTab: "safetyQuality",
        },
        {
          key: "crewPresentToday",
          labelEn: "Crew Present Today",
          labelAm: "ዛሬ በሳይት ያሉ",
          value: crewPresent,
          tone: crewPresent > 0 ? "ok" : "neutral",
          linkTab: "attendance",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "timekeeping": {
      const checkedInRecords = todayAttendance.filter((a) => Boolean(a.checkIn));
      const checkedInWorkerIds = new Set(checkedInRecords.map((a) => a.workerId));
      const notYetCheckedIn = Math.max(0, workers.length - checkedInWorkerIds.size);
      const lateToday = todayAttendance.filter((a) => a.status === "Late").length;
      const checkedOutToday = todayAttendance.filter((a) => Boolean(a.checkOut)).length;
      const insideNotOut = todayAttendance.filter((a) => Boolean(a.checkIn) && !a.checkOut).length;

      return [
        {
          key: "checkedIn",
          labelEn: "Checked In Today",
          labelAm: "ዛሬ የገቡ",
          value: checkedInRecords.length,
          tone: "ok",
          linkTab: "attendance",
        },
        {
          key: "notYetCheckedIn",
          labelEn: "Not Yet Checked In",
          labelAm: "ገና ያልገቡ",
          value: notYetCheckedIn,
          tone: notYetCheckedIn > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "late",
          labelEn: "Late Arrivals",
          labelAm: "ዘግይተው የገቡ",
          value: lateToday,
          tone: lateToday > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "checkedOut",
          labelEn: "Checked Out",
          labelAm: "የወጡ",
          value: checkedOutToday,
          tone: "neutral",
          linkTab: "attendance",
        },
        {
          key: "insideNotCheckedOut",
          labelEn: "Inside (No Check-Out)",
          labelAm: "ውስጥ ያሉ (ያልወጡ)",
          value: insideNotOut,
          tone: insideNotOut > 0 ? "warn" : "ok",
          linkTab: "biometricBoard",
        },
        {
          key: "registeredWorkers",
          labelEn: "Registered Workers",
          labelAm: "የተመዘገቡ ሰራተኞች",
          value: workers.length,
          tone: "neutral",
          linkTab: "workerProfiles",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "fieldLead": {
      const teamWorkers = workersOfLead(workers, actor);
      const teamIdSet = new Set<string>();
      teamWorkers.forEach((w) => {
        workerKeysSet(w).forEach((k) => teamIdSet.add(k));
      });
      const teamAttToday = todayAttendance.filter((a) => teamIdSet.has(a.workerId));
      const teamPresent = teamAttToday.filter(isPresentOrLate).length;
      const teamLate = teamAttToday.filter((a) => a.status === "Late").length;
      const presentWorkerIds = new Set(teamAttToday.filter(isPresentOrLate).map((a) => a.workerId));
      const teamNotIn = Math.max(0, teamWorkers.length - presentWorkerIds.size);
      const teamEvals = evaluations.filter((ev) => teamIdSet.has(ev.workerId));
      const teamAvgPerf =
        teamEvals.length > 0
          ? `${Math.round(teamEvals.reduce((s, e) => s + Number(e.totalScore || 0), 0) / teamEvals.length)}%`
          : "—";

      return [
        {
          key: "myTeamSize",
          labelEn: "My Team Size",
          labelAm: "የቡድኔ ብዛት",
          value: teamWorkers.length,
          tone: "neutral",
          linkTab: "workerProfiles",
        },
        {
          key: "teamPresentToday",
          labelEn: "Team Present Today",
          labelAm: "ዛሬ የተገኙ (ቡድን)",
          value: teamPresent,
          tone: teamPresent > 0 ? "ok" : "neutral",
          linkTab: "attendance",
        },
        {
          key: "teamLateToday",
          labelEn: "Team Late Today",
          labelAm: "ዛሬ የዘገዩ (ቡድን)",
          value: teamLate,
          tone: teamLate > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "teamNotInToday",
          labelEn: "Team Not In Today",
          labelAm: "ዛሬ ያልተገኙ (ቡድን)",
          value: teamNotIn,
          tone: teamNotIn > 0 ? "warn" : "ok",
          linkTab: "attendance",
        },
        {
          key: "teamAvgPerformance",
          labelEn: "Team Avg Performance",
          labelAm: "የቡድን አማካይ አፈፃፀም",
          value: teamAvgPerf,
          tone: teamEvals.length === 0 ? "neutral" : "ok",
          linkTab: "performance",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "fieldWorker": {
      const me = findOwnWorker(workers, actor);
      if (!me) {
        return [
          {
            key: "myStatusToday",
            labelEn: "My Status Today",
            labelAm: "የዛሬ ሁኔታዬ",
            value: "—",
            hint: "No linked worker profile",
            tone: "neutral",
            linkTab: "attendance",
          },
          {
            key: "daysWorkedMonth",
            labelEn: "Days Worked (Month)",
            labelAm: "በወሩ የሰራሁበት ቀናት",
            value: "—",
            tone: "neutral",
            linkTab: "attendance",
          },
          {
            key: "hoursMonth",
            labelEn: "Hours This Month",
            labelAm: "የወሩ የስራ ሰዓት",
            value: "—",
            tone: "neutral",
            linkTab: "attendance",
          },
          {
            key: "latestEvaluation",
            labelEn: "Latest Evaluation",
            labelAm: "የቅርብ ጊዜ ግምገማ",
            value: "—",
            tone: "neutral",
            linkTab: "workerProfiles",
          },
          {
            key: "myOpenTasks",
            labelEn: "My Open Tasks",
            labelAm: "ክፍት ተግባራቶቼ",
            value: myOpenTasks.length,
            tone: myOpenTasks.length > 0 ? "warn" : "ok",
            linkTab: "taskManagement",
          },
        ];
      }

      const myKeys = workerKeysSet(me);
      const myToday = todayAttendance.find((a) => myKeys.has(a.workerId));
      const myMonth = attendance.filter(
        (a) => myKeys.has(a.workerId) && String(a.date || "").startsWith(monthPrefix)
      );
      const daysWorked = myMonth.filter(isPresentOrLate).length;
      const hoursWorked = roundHours(myMonth.reduce((s, a) => s + Number(a.workingHours || 0), 0));
      const myEvals = evaluations
        .filter((e) => myKeys.has(e.workerId))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      const latestEval = myEvals[0];

      return [
        {
          key: "myStatusToday",
          labelEn: "My Status Today",
          labelAm: "የዛሬ ሁኔታዬ",
          value: myToday ? myToday.status : "Not Checked In",
          hint: myToday
            ? `In ${myToday.checkIn || "—"} · Out ${myToday.checkOut || "—"}`
            : "In — · Out —",
          tone: !myToday ? "warn" : isPresentOrLate(myToday) ? "ok" : "bad",
          linkTab: "attendance",
        },
        {
          key: "daysWorkedMonth",
          labelEn: "Days Worked (Month)",
          labelAm: "በወሩ የሰራሁበት ቀናት",
          value: daysWorked,
          tone: "neutral",
          linkTab: "attendance",
        },
        {
          key: "hoursMonth",
          labelEn: "Hours This Month",
          labelAm: "የወሩ የስራ ሰዓት",
          value: `${hoursWorked}h`,
          tone: "neutral",
          linkTab: "attendance",
        },
        {
          key: "latestEvaluation",
          labelEn: "Latest Evaluation",
          labelAm: "የቅርብ ጊዜ ግምገማ",
          value: latestEval ? `${latestEval.totalScore}%` : "—",
          hint: latestEval?.level,
          tone: latestEval ? "ok" : "neutral",
          linkTab: "workerProfiles",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "warehouse": {
      const installed = formworkPanels.filter((p) => p.status === PanelStatus.IN_USE).length;
      const inTransit = formworkPanels.filter((p) => p.status === PanelStatus.IN_TRANSIT).length;
      const waitingCleanInspect = formworkPanels.filter(
        (p) =>
          p.status === PanelStatus.WAITING_CLEANING || p.status === PanelStatus.UNDER_INSPECTION
      ).length;
      const underRepair = formworkPanels.filter((p) => p.status === PanelStatus.UNDER_REPAIR).length;
      const damagedMissing = formworkPanels.filter(
        (p) => p.status === PanelStatus.DAMAGED || p.status === PanelStatus.MISSING
      ).length;
      const movementsToday = panelMovementLogs.filter((m) =>
        String(m.timestamp || "").startsWith(today)
      ).length;

      return [
        {
          key: "formworkTotal",
          labelEn: "Formwork Items",
          labelAm: "ጠቅላላ ፎርምወርክ",
          value: formworkPanels.length,
          tone: "neutral",
          linkTab: "panelTraceability",
        },
        {
          key: "installedInUse",
          labelEn: "Installed / In Use",
          labelAm: "በስራ ላይ / የተገጠሙ",
          value: installed,
          tone: "ok",
          linkTab: "panelTraceability",
        },
        {
          key: "inTransit",
          labelEn: "In Transit",
          labelAm: "በመጓጓዣ ላይ",
          value: inTransit,
          tone: inTransit > 0 ? "warn" : "neutral",
          linkTab: "siteStoreMovement",
        },
        {
          key: "waitingCleaningInspection",
          labelEn: "Cleaning / Inspection",
          labelAm: "ጽዳት / ፍተሻ የሚጠብቁ",
          value: waitingCleanInspect,
          tone: waitingCleanInspect > 0 ? "warn" : "ok",
          linkTab: "panelTraceability",
        },
        {
          key: "underRepair",
          labelEn: "Under Repair",
          labelAm: "በጥገና ላይ",
          value: underRepair,
          tone: underRepair > 0 ? "warn" : "ok",
          linkTab: "panelTraceability",
        },
        {
          key: "damagedMissing",
          labelEn: "Damaged + Missing",
          labelAm: "የተበላሹ + የጠፉ",
          value: damagedMissing,
          tone: damagedMissing > 0 ? "bad" : "ok",
          linkTab: "panelTraceability",
        },
        {
          key: "movementsToday",
          labelEn: "Movements Today",
          labelAm: "የዛሬ ዝውውሮች",
          value: movementsToday,
          tone: "neutral",
          linkTab: "siteStoreMovement",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }

    case "gate": {
      const todayMovements = panelMovementLogs.filter((m) =>
        String(m.timestamp || "").startsWith(today)
      );
      const distinctVehicles = new Set(
        todayMovements.map((m) => (m.truckPlate || "").trim().toUpperCase()).filter(Boolean)
      ).size;
      const itemsInTransit = formworkPanels.filter((p) => p.status === PanelStatus.IN_TRANSIT).length;

      return [
        {
          key: "movementsToday",
          labelEn: "Movements Today",
          labelAm: "የዛሬ ዝውውሮች",
          value: todayMovements.length,
          tone: "neutral",
          linkTab: "warehouseSiteStore",
        },
        {
          key: "distinctVehiclesToday",
          labelEn: "Distinct Vehicles Today",
          labelAm: "የዛሬ ተሽከርካሪዎች",
          value: distinctVehicles,
          tone: "neutral",
          linkTab: "warehouseSiteStore",
        },
        {
          key: "itemsInTransit",
          labelEn: "Items In Transit",
          labelAm: "በመጓጓዣ ላይ ያሉ ዕቃዎች",
          value: itemsInTransit,
          tone: itemsInTransit > 0 ? "warn" : "ok",
          linkTab: "warehouseSiteStore",
        },
        {
          key: "myOpenTasks",
          labelEn: "My Open Tasks",
          labelAm: "ክፍት ተግባራቶቼ",
          value: myOpenTasks.length,
          tone: myOpenTasks.length > 0 ? "warn" : "ok",
          linkTab: "notificationCenter",
        },
      ];
    }

    case "system": {
      const allOpenTasks = erpTasks.filter(
        (t) => !CLOSED_TASK_STATUSES.has(String(t.status))
      ).length;

      return [
        {
          key: "workerRecords",
          labelEn: "Worker Records",
          labelAm: "የሰራተኛ መዝገቦች",
          value: workers.length,
          tone: "neutral",
          linkTab: "firestoreExplorer",
        },
        {
          key: "attendanceToday",
          labelEn: "Attendance Today",
          labelAm: "የዛሬ መገኘት መዝገቦች",
          value: todayAttendance.length,
          tone: "neutral",
          linkTab: "biometricBoard",
        },
        {
          key: "zones",
          labelEn: "Zones",
          labelAm: "ዞኖች",
          value: zones.length,
          tone: "neutral",
          linkTab: "siteLayout",
        },
        {
          key: "formworkItems",
          labelEn: "Formwork Items",
          labelAm: "የፎርምወርክ ዕቃዎች",
          value: formworkPanels.length,
          tone: "neutral",
          linkTab: "panelTraceability",
        },
        {
          key: "allOpenTasks",
          labelEn: "All Open Tasks",
          labelAm: "ሁሉም ክፍት ተግባራት",
          value: allOpenTasks,
          tone: allOpenTasks > 0 ? "warn" : "ok",
          linkTab: "taskManagement",
        },
      ];
    }
  }
}
