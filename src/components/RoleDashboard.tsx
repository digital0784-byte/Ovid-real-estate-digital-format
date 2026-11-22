import React, { useMemo } from "react";
import { ChevronRight, ClipboardList, Compass, ShieldCheck } from "lucide-react";
import { UserRole, ErpTask } from "../types";
import {
  computeKpis,
  DashboardActor,
  KIND_META,
  KpiTone,
  resolveDashboardKind,
  RoleDashboardData,
  tasksForActor,
  todayKey,
} from "../config/roleDashboards";

export interface RoleDashboardProps {
  currentUserRole: UserRole | string;
  currentUserProfile?: {
    uid?: string;
    id?: string;
    employeeId?: string;
    name?: string;
    displayName?: string;
  } | null;
  isAmharic: boolean;
  data: RoleDashboardData;
  hasAccess?: (tab: string) => boolean;
  tabTitle?: (tab: string, isAmharic: boolean) => string;
  onNavigate: (tab: string) => void;
  today?: string;
}

const TONE_CLASSES: Record<KpiTone, string> = {
  ok: "border-emerald-200 bg-emerald-50/50 text-emerald-900",
  warn: "border-amber-200 bg-amber-50/50 text-amber-900",
  bad: "border-rose-200 bg-rose-50/60 text-rose-900",
  neutral: "border-slate-200 bg-white text-slate-900",
};

const TONE_VALUE_CLASSES: Record<KpiTone, string> = {
  ok: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-rose-700",
  neutral: "text-slate-900",
};

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  currentUserRole,
  currentUserProfile,
  isAmharic,
  data,
  hasAccess = (_tab: string) => true,
  tabTitle = (tab: string, _isAmharic: boolean) => tab,
  onNavigate,
  today,
}) => {
  const kind = useMemo(() => resolveDashboardKind(currentUserRole), [currentUserRole]);
  const meta = KIND_META[kind];

  const actor: DashboardActor = useMemo(
    () => ({
      uid: currentUserProfile?.uid,
      id: currentUserProfile?.id,
      employeeId: currentUserProfile?.employeeId,
      name: currentUserProfile?.name,
      displayName: currentUserProfile?.displayName,
      role: currentUserRole,
    }),
    [currentUserProfile, currentUserRole]
  );

  const activeToday = today || todayKey();

  const kpis = useMemo(
    () => computeKpis(kind, data, actor, activeToday),
    [kind, data, actor, activeToday]
  );

  const openTasks: ErpTask[] = useMemo(
    () => tasksForActor(data.erpTasks || [], actor).slice(0, 5),
    [data.erpTasks, actor]
  );

  const visibleWorkspaces = useMemo(
    () => meta.quickLinkTabs.filter((tab) => hasAccess(tab)),
    [meta.quickLinkTabs, hasAccess]
  );

  return (
    <section
      data-testid="role-dashboard"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5"
    >
      {/* Header with role title & role badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-900 text-white">
              <ShieldCheck size={12} />
              <span>{String(currentUserRole)}</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">{activeToday}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {isAmharic ? meta.titleAm : meta.titleEn}
          </h2>
          <p className="text-xs text-slate-500">
            {isAmharic ? meta.subtitleAm : meta.subtitleEn}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((card) => {
          const canJump = Boolean(card.linkTab && hasAccess(card.linkTab));
          const cardContent = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {isAmharic ? card.labelAm : card.labelEn}
                </span>
                {canJump && <ChevronRight size={14} className="text-slate-400 shrink-0" />}
              </div>
              <div className={`text-2xl font-black mt-1 ${TONE_VALUE_CLASSES[card.tone]}`}>
                {card.value}
              </div>
              {card.hint && (
                <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
                  {card.hint}
                </div>
              )}
            </>
          );

          if (canJump && card.linkTab) {
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => onNavigate(card.linkTab!)}
                className={`text-left p-3.5 rounded-xl border transition-colors hover:border-slate-400 cursor-pointer ${TONE_CLASSES[card.tone]}`}
              >
                {cardContent}
              </button>
            );
          }

          return (
            <div
              key={card.key}
              className={`p-3.5 rounded-xl border ${TONE_CLASSES[card.tone]}`}
            >
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* Assigned Tasks & Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Open tasks assigned to me (max 5) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ClipboardList size={15} className="text-red-600" />
              <span>
                {isAmharic ? "ለእኔ የተመደቡ ክፍት ተግባራት" : "Open tasks assigned to me"}
              </span>
            </h3>
            {hasAccess("taskManagement") && (
              <button
                type="button"
                onClick={() => onNavigate("taskManagement")}
                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                {isAmharic ? "ሁሉንም እይ" : "View all"}
              </button>
            )}
          </div>

          {openTasks.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              {isAmharic ? "ለእርስዎ የተመደበ ክፍት ተግባር የለም።" : "No open tasks currently assigned to you."}
            </p>
          ) : (
            <div className="space-y-2">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{task.taskName}</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {task.taskId || task.id} · {task.dueDate || "—"}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your workspaces quick links */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Compass size={15} className="text-blue-600" />
            <span>{isAmharic ? "የእርስዎ የስራ ክፍሎች" : "Your workspaces"}</span>
          </h3>

          {visibleWorkspaces.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              {isAmharic ? "ተጨማሪ የስራ ክፍሎች አልተመደቡም።" : "No additional workspaces enabled for this role."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleWorkspaces.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onNavigate(tab)}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer text-left"
                >
                  <span className="truncate">{tabTitle(tab, isAmharic)}</span>
                  <ChevronRight size={13} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
