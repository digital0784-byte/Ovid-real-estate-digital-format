import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileText,
  History,
  Lock,
  Plus,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { EngineeringMaterialRequest, MaterialPlanRecord } from "../../types";
import {
  ErpWarehouseSnapshot,
  WarehouseActorContext,
  WarehouseStoreDataService,
} from "../../services/warehouseStoreDataService";
import {
  canPerformWarehouseModuleAction,
  isStrictDirectorRole,
} from "../../services/warehouseStoreRbac";
import { compareMaterialRequestAgainstPlan } from "../../services/warehouseManagementService";
import { tr } from "./warehouseI18n";
import { StatusBadge } from "./WarehouseSharedUi";

export function MaterialPlanningAndRequestsView({
  mode,
  snapshot,
  actor,
  isAmharic = false,
  onFeedback,
}: {
  mode: "material_planning" | "material_requests" | "director_approvals";
  snapshot: ErpWarehouseSnapshot;
  actor: WarehouseActorContext;
  isAmharic?: boolean;
  onFeedback: (type: "success" | "error" | "info", message: string) => void;
}) {
  const canPlan = canPerformWarehouseModuleAction(actor.role, "CREATE_REVISE_MATERIAL_PLAN");
  const canRequest = canPerformWarehouseModuleAction(actor.role, "CREATE_MATERIAL_REQUEST");
  const canVerify = canPerformWarehouseModuleAction(actor.role, "VERIFY_RETURN_MATERIAL_REQUEST");
  const isDirector = isStrictDirectorRole(actor.role);
  const [reqSubTab, setReqSubTab] = useState<"requests" | "verification">(
    canVerify && !canRequest ? "verification" : "requests"
  );

  // Plan Create / Revise state
  const [planTitle, setPlanTitle] = useState("");
  const [planProjectId, setPlanProjectId] = useState(snapshot.erpProjects[0]?.id || "PROJ-MAIN");
  const [planDept, setPlanDept] = useState("Structural Engineering");
  const [planLines, setPlanLines] = useState<Array<{ itemId: string; plannedQty: number; specification: string }>>([
    { itemId: snapshot.items[0]?.id || "", plannedQty: 100, specification: "" },
  ]);

  const [revisingPlan, setRevisingPlan] = useState<MaterialPlanRecord | null>(null);
  const [revReason, setRevReason] = useState("");
  const [revLines, setRevLines] = useState<any[]>([]);
  const [viewingHistoryPlanId, setViewingHistoryPlanId] = useState<string | null>(null);

  // Request Creation state
  const [selectedPlanId, setSelectedPlanId] = useState(snapshot.materialPlans[0]?.id || "");
  const [reqStoreId, setReqStoreId] = useState(snapshot.projectStores[0]?.id || "");
  const [reqWhId, setReqWhId] = useState(snapshot.warehouses[0]?.id || "");
  const [reqDate, setReqDate] = useState("");
  const [reqPurpose, setReqPurpose] = useState("Block Structural Execution");
  const [reqItemQtys, setReqItemQtys] = useState<Record<string, { qty: number; spec: string }>>({});

  // Verification & Director remarks
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedPlan = snapshot.materialPlans.find((p) => p.id === selectedPlanId) || snapshot.materialPlans[0];

  // Live automatic plan vs request comparison preview
  const liveComparison = React.useMemo(() => {
    if (!selectedPlan) return null;
    const requestedItems = (selectedPlan.items || [])
      .map((pi) => {
        const entry = reqItemQtys[pi.itemId];
        const qty = Number(entry?.qty || 0);
        if (qty <= 0) return null;
        return {
          itemId: pi.itemId,
          itemCode: pi.itemCode,
          itemName: pi.itemName,
          specification: entry?.spec ?? pi.specification,
          inventoryType: pi.inventoryType,
          unit: pi.unit,
          requestedQty: qty,
        };
      })
      .filter(Boolean) as any[];
    if (requestedItems.length === 0) return null;
    return compareMaterialRequestAgainstPlan({
      plan: selectedPlan,
      requestedItems,
      existingRequestsForPlan: snapshot.materialRequests.filter((r) => r.planId === selectedPlan.id),
      warehouseBalances: snapshot.stockBalances,
      warehouseId: reqWhId || snapshot.warehouses[0]?.id || "",
    });
  }, [selectedPlan, reqItemQtys, snapshot.materialRequests, snapshot.stockBalances, reqWhId, snapshot.warehouses]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const proj = snapshot.erpProjects.find((p: any) => p.id === planProjectId);
      const items = planLines
        .filter((l) => l.itemId && l.plannedQty > 0)
        .map((l) => {
          const meta = snapshot.items.find((i) => i.id === l.itemId)!;
          return {
            itemId: meta.id,
            itemCode: meta.itemCode,
            itemName: meta.itemName,
            specification: l.specification || meta.specification || "",
            inventoryType: meta.inventoryType,
            unit: meta.unit,
            plannedQty: Number(l.plannedQty),
          };
        });
      if (items.length === 0) throw new Error(tr(isAmharic, "Add at least one catalog item with positive quantity.", "ቢያንስ አንድ እቃ ከብዛት ጋር ያስገቡ።"));
      const created = await WarehouseStoreDataService.createMaterialPlan(
        {
          title: planTitle,
          projectId: proj?.id || planProjectId,
          projectName: proj?.name || proj?.title || planProjectId,
          department: planDept,
          items,
        },
        actor
      );
      setPlanTitle("");
      onFeedback("success", tr(isAmharic, `Material Plan ${created.planNumber} published and ready for Site Store requests.`, `የምህንድስና ዕቅድ ${created.planNumber} ታትሟል፣ ለሳይት ስቶር ጥያቄዎች ዝግጁ ነው።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to publish material plan.", "የእቃ ዕቅዱን ማተም አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingPlan) return;
    setSubmitting(true);
    try {
      const res = await WarehouseStoreDataService.reviseMaterialPlan(
        revisingPlan.id,
        { items: revLines, reason: revReason },
        actor
      );
      setRevisingPlan(null);
      setRevReason("");
      onFeedback("success", tr(isAmharic, `${res.plan.planNumber} revised to Rev ${res.plan.revisionNumber}. Notifications dispatched.`, `${res.plan.planNumber} ወደ ክለሳ ${res.plan.revisionNumber} ተሻሽሏል። ማሳወቂያዎች ተልከዋል።`));
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to revise plan.", "ዕቅዱን ማሻሻል አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const store = snapshot.projectStores.find((s) => s.id === reqStoreId) || snapshot.projectStores[0];
      const wh = snapshot.warehouses.find((w) => w.id === reqWhId) || snapshot.warehouses[0];
      if (!store || !wh) throw new Error(tr(isAmharic, "Register a Warehouse and a Project Site Store first.", "መጋዘን እና የፕሮጀክት ሳይት ስቶር መጀመሪያ መመዝገብ አለባቸው።"));
      const items = (selectedPlan.items || [])
        .map((pi) => {
          const entry = reqItemQtys[pi.itemId];
          const qty = Number(entry?.qty || 0);
          if (qty <= 0) return null;
          return {
            itemId: pi.itemId,
            itemCode: pi.itemCode,
            itemName: pi.itemName,
            specification: entry?.spec ?? pi.specification,
            inventoryType: pi.inventoryType,
            unit: pi.unit,
            requestedQty: qty,
          };
        })
        .filter(Boolean) as any[];
      if (items.length === 0) throw new Error(tr(isAmharic, "Enter a positive requested quantity for at least one planned item.", "ቢያንስ ለአንድ የታቀደ እቃ የሚጠየቅ ብዛት ያስገቡ።"));

      const created = await WarehouseStoreDataService.createMaterialRequest(
        {
          planId: selectedPlan.id,
          projectId: selectedPlan.projectId,
          projectName: selectedPlan.projectName,
          projectStoreId: store.id,
          projectStoreName: store.storeName,
          warehouseId: wh.id,
          warehouseName: wh.name,
          requiredByDate: reqDate || undefined,
          purpose: reqPurpose,
          items,
        },
        actor
      );
      setReqItemQtys({});
      onFeedback(
        created.hasPlanMismatch ? "info" : "success",
        tr(
          isAmharic,
          `Request ${created.requestNumber} submitted for Warehouse Manager plan comparison verification.`,
          `የእቃ ጥያቄ ${created.requestNumber} ለመጋዘን ማናጀር ማረጋገጫ ተልኳል።`
        )
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Failed to submit material request.", "የእቃ ጥያቄውን መላክ አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWarehouseVerify = async (reqDoc: EngineeringMaterialRequest, action: "verify" | "return") => {
    setSubmitting(true);
    try {
      const note = actionNotes[reqDoc.id] || "";
      const res = await WarehouseStoreDataService.verifyOrReturnRequest(
        reqDoc.id,
        { action, remarks: note, reason: note },
        actor
      );
      onFeedback(
        action === "verify" ? "success" : "info",
        action === "verify"
          ? tr(isAmharic, `${res.request.requestNumber} verified & forwarded to Director for Final Approval.`, `${res.request.requestNumber} ተረጋግጦ ለዳይሬክተር የመጨረሻ ውሳኔ ተላልፏል።`)
          : tr(isAmharic, `${res.request.requestNumber} returned due to discrepancy.`, `${res.request.requestNumber} በልዩነት ምክንያት ተመልሷል።`)
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Verification failed.", "ማረጋገጥ አልተቻለም።"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectorDecision = async (
    reqDoc: EngineeringMaterialRequest,
    decision: "Director Approved" | "Director Disapproved"
  ) => {
    setSubmitting(true);
    try {
      const note = actionNotes[reqDoc.id] || "";
      const res = await WarehouseStoreDataService.submitDirectorDecision(
        reqDoc.id,
        { decision, comments: note, reason: note },
        actor
      );
      onFeedback(
        decision === "Director Approved" ? "success" : "info",
        tr(isAmharic, `${res.request.requestNumber} permanently marked as ${decision}.`, `${res.request.requestNumber} በቋሚነት "${decision}" ተብሎ ተወስኗል።`)
      );
    } catch (err: any) {
      onFeedback("error", err?.message || tr(isAmharic, "Director decision failed.", "የዳይሬክተር ውሳኔ አልተሳካም።"));
    } finally {
      setSubmitting(false);
    }
  };

  // VIEW 1: MATERIAL PLANS & REVISIONS
  if (mode === "material_planning") {
    return (
      <div className="space-y-4">
        {canPlan && (
          <form onSubmit={handleCreatePlan} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-amber-400" />
              <span>{tr(isAmharic, "Create Approved Engineering Material Plan (Office Manager Engineer)", "የጸደቀ የምህንድስና እቃ ዕቅድ መፍጠሪያ (Office Manager Engineer)")}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                placeholder={tr(isAmharic, "Plan Title (e.g. Phase 2 Superstructure BOQ)", "የዕቅዱ ርዕስ (ለምሳሌ፡ ምዕራፍ 2 BOQ)")}
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <select
                value={planProjectId}
                onChange={(e) => setPlanProjectId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {snapshot.erpProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>
                ))}
                {snapshot.erpProjects.length === 0 && <option value="PROJ-MAIN">OVID Main Project</option>}
              </select>
              <input
                placeholder={tr(isAmharic, "Engineering Department", "የምህንድስና ክፍል")}
                value={planDept}
                onChange={(e) => setPlanDept(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-2">
              {planLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select
                    value={line.itemId}
                    onChange={(e) => {
                      const next = [...planLines];
                      next[idx].itemId = e.target.value;
                      setPlanLines(next);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white sm:col-span-2"
                  >
                    <option value="">{tr(isAmharic, "Select Catalog Item...", "ከካታሎግ እቃ ይምረጡ...")}</option>
                    {snapshot.items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.itemCode} — {it.itemName} ({it.unit}) [{it.inventoryType}]
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    placeholder={tr(isAmharic, "Planned Qty", "የታቀደ ብዛት")}
                    value={line.plannedQty}
                    onChange={(e) => {
                      const next = [...planLines];
                      next[idx].plannedQty = Number(e.target.value);
                      setPlanLines(next);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    placeholder={tr(isAmharic, "Spec / Grade", "መስፈርት / ደረጃ")}
                    value={line.specification}
                    onChange={(e) => {
                      const next = [...planLines];
                      next[idx].specification = e.target.value;
                      setPlanLines(next);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPlanLines([...planLines, { itemId: "", plannedQty: 1, specification: "" }])}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                {tr(isAmharic, "+ Add Another Material Line", "+ ሌላ እቃ ጨምር")}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>{tr(isAmharic, "Publish Material Plan", "የእቃ ዕቅዱን አትም")}</span>
            </button>
          </form>
        )}

        {/* Active Material Plans List */}
        <div className="space-y-3">
          {snapshot.materialPlans.map((plan) => {
            const revs = snapshot.materialPlanRevisions.filter((r) => r.planId === plan.id);
            return (
              <div key={plan.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold text-amber-400">{plan.planNumber}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {tr(isAmharic, "Rev", "ክለሳ")} {plan.revisionNumber}
                      </span>
                      <StatusBadge status={plan.status} isAmharic={isAmharic} />
                    </div>
                    <h4 className="text-sm font-bold text-white mt-1">{plan.title}</h4>
                    <div className="text-xs text-slate-400">
                      {tr(isAmharic, "Project", "ፕሮጀክት")}: {plan.projectName} · {tr(isAmharic, "Created by", "አዘጋጅ")} {plan.createdByName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingHistoryPlanId(viewingHistoryPlanId === plan.id ? null : plan.id)
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <History size={13} />
                      <span>{tr(isAmharic, "Revisions", "ክለሳዎች")} ({revs.length})</span>
                    </button>
                    {canPlan && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevisingPlan(plan);
                          setRevLines((plan.items || []).map((i) => ({ ...i })));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>{tr(isAmharic, "Revise Plan", "ዕቅድ አሻሽል")}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="px-3 py-2">{tr(isAmharic, "Code", "መለያ ኮድ")}</th>
                        <th className="px-3 py-2">{tr(isAmharic, "Item & Specification", "እቃ እና መስፈርት")}</th>
                        <th className="px-3 py-2">{tr(isAmharic, "Type", "አይነት")}</th>
                        <th className="px-3 py-2 text-right">{tr(isAmharic, "Planned Qty", "የታቀደ ብዛት")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(plan.items || []).map((it) => (
                        <tr key={it.itemId}>
                          <td className="px-3 py-2 font-mono text-amber-300">{it.itemCode}</td>
                          <td className="px-3 py-2 text-white">
                            {it.itemName} {it.specification && <span className="text-slate-400">({it.specification})</span>}
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={it.inventoryType} isAmharic={isAmharic} /></td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-300 tabular-nums">
                            {it.plannedQty} {it.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {viewingHistoryPlanId === plan.id && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-bold uppercase text-amber-400">{tr(isAmharic, "Revision Audit History", "የክለሳ ታሪክ")}</div>
                    {revs.length === 0 ? (
                      <div className="text-xs text-slate-500">{tr(isAmharic, "Initial Revision 1 — no subsequent revisions.", "መጀመሪያ ክለሳ 1 — ተጨማሪ ማሻሻያ የለም።")}</div>
                    ) : (
                      revs.map((r) => (
                        <div key={r.id} className="text-xs border-b border-slate-800/70 pb-2 last:border-0">
                          <div className="font-semibold text-white">
                            {tr(isAmharic, "Rev", "ክለሳ")} {r.revisionNumber} — {r.revisedByName} ({(r.revisedAt || "").slice(0, 10)})
                          </div>
                          <div className="text-slate-400">{tr(isAmharic, "Reason", "ምክንያት")}: {r.reason}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Revision Modal */}
        {revisingPlan && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmitRevision}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-5 space-y-4"
            >
              <h4 className="text-sm font-bold text-white">
                {tr(isAmharic, `Revise Material Plan ${revisingPlan.planNumber} (Current Rev ${revisingPlan.revisionNumber})`, `ዕቅድ ${revisingPlan.planNumber} ማሻሻል (አሁን ክለሳ ${revisingPlan.revisionNumber})`)}
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {revLines.map((rl, idx) => (
                  <div key={rl.itemId} className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg">
                    <span className="text-xs text-white font-medium flex-1">
                      {rl.itemCode} — {rl.itemName} ({rl.unit})
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={rl.plannedQty}
                      onChange={(e) => {
                        const next = [...revLines];
                        next[idx] = { ...next[idx], plannedQty: Number(e.target.value) };
                        setRevLines(next);
                      }}
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-right"
                    />
                  </div>
                ))}
              </div>
              <input
                required
                placeholder={tr(isAmharic, "Mandatory engineering revision reason...", "የምህንድስና ማሻሻያ ምክንያት (ግዴታ)...")}
                value={revReason}
                onChange={(e) => setRevReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevisingPlan(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {tr(isAmharic, "Cancel", "ሰርዝ")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                >
                  {tr(isAmharic, "Save Revision & Notify ERP", "ማሻሻያውን አስቀምጥ እና አሳውቅ")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // VIEW 2: SITE STORE MATERIAL REQUESTS, LIVE PLAN COMPARISON & WAREHOUSE VERIFICATION
  if (mode === "material_requests") {
    const verificationQueue = snapshot.materialRequests.filter((r) =>
      ["Submitted", "Warehouse Reviewing", "Returned by Warehouse Manager"].includes(r.status)
    );
    return (
      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setReqSubTab("requests")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              reqSubTab === "requests" ? "bg-cyan-600 text-white" : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <Send size={13} />
            <span>
              {tr(
                isAmharic,
                `Submit & Track Material Requests (${snapshot.materialRequests.length})`,
                `ከመጋዘን እቃ መጠየቂያ እና መከታተያ (${snapshot.materialRequests.length})`
              )}
            </span>
          </button>
          {canVerify && (
            <button
              type="button"
              onClick={() => setReqSubTab("verification")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                reqSubTab === "verification" ? "bg-amber-600 text-white" : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
              }`}
            >
              <ClipboardCheck size={13} />
              <span>
                {tr(
                  isAmharic,
                  `Warehouse Manager Plan Verification (${verificationQueue.length} Pending)`,
                  `የመጋዘን ማናጀር ዕቅድ ማረጋገጫ (${verificationQueue.length} በመጠባበቅ ላይ)`
                )}
              </span>
            </button>
          )}
        </div>

        {reqSubTab === "requests" ? (
          <div className="space-y-4">
            {canRequest && (
              <form onSubmit={handleSubmitRequest} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send size={16} className="text-cyan-400" />
                  <span>
                    {tr(
                      isAmharic,
                      "Request Items from Warehouse Manager & Track Status (Auto-Compared vs Engineering Plan)",
                      "ከመጋዘን ማናጀር እቃ መጠየቂያ እና ሁኔታ መከታተያ (ከምህንድስና ዕቅድ ጋር በራስ-ሰር ይነጻጸራል)"
                    )}
                  </span>
                </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {tr(isAmharic, "Approved Material Plan", "የጸደቀ የእቃ ዕቅድ")}
                </label>
                <select
                  value={selectedPlan?.id || ""}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                >
                  {snapshot.materialPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.planNumber} ({tr(isAmharic, "Rev", "ክለሳ")} {p.revisionNumber}) — {p.projectName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {tr(isAmharic, "Requesting Project Store", "ጠያቂው ሳይት ስቶር")}
                </label>
                <select
                  value={reqStoreId || snapshot.projectStores[0]?.id || ""}
                  onChange={(e) => setReqStoreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                >
                  {snapshot.projectStores.map((s) => (
                    <option key={s.id} value={s.id}>{s.storeName} ({s.projectName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {tr(isAmharic, "Source Warehouse", "ላኪው ዋና መጋዘን")}
                </label>
                <select
                  value={reqWhId || snapshot.warehouses[0]?.id || ""}
                  onChange={(e) => setReqWhId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                >
                  {snapshot.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {tr(isAmharic, "Required By Date", "የሚፈለግበት ቀን")}
                </label>
                <input
                  type="date"
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <input
              required
              placeholder={tr(isAmharic, "Work Package / Execution Purpose", "የስራው ዓይነት / ምክንያት")}
              value={reqPurpose}
              onChange={(e) => setReqPurpose(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
            />

            {selectedPlan ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">{tr(isAmharic, "Planned Material", "በዕቅድ የተያዘ እቃ")}</th>
                      <th className="px-3 py-2 text-right">{tr(isAmharic, "Planned Qty", "የታቀደ ብዛት")}</th>
                      <th className="px-3 py-2 text-right">{tr(isAmharic, "Request Qty", "የሚጠየቅ ብዛት")}</th>
                      <th className="px-3 py-2">{tr(isAmharic, "Spec Override", "መስፈርት (Spec)")}</th>
                      <th className="px-3 py-2">{tr(isAmharic, "Live Plan Check", "ቀጥታ የዕቅድ ንጽጽር")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(selectedPlan.items || []).map((pi) => {
                      const cmp = liveComparison?.comparedItems.find((c) => c.itemId === pi.itemId);
                      return (
                        <tr key={pi.itemId}>
                          <td className="px-3 py-2">
                            <div className="text-white font-semibold">{pi.itemCode} — {pi.itemName}</div>
                            <div className="text-[11px] text-slate-400">{pi.specification || "-"} · {pi.unit}</div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300 tabular-nums">
                            {pi.plannedQty} {pi.unit}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={reqItemQtys[pi.itemId]?.qty ?? ""}
                              onChange={(e) =>
                                setReqItemQtys({
                                  ...reqItemQtys,
                                  [pi.itemId]: {
                                    qty: Number(e.target.value),
                                    spec: reqItemQtys[pi.itemId]?.spec ?? pi.specification,
                                  },
                                })
                              }
                              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              placeholder={tr(isAmharic, "Spec matches plan", "ከዕቅድ ጋር ይዛመዳል")}
                              value={reqItemQtys[pi.itemId]?.spec ?? pi.specification}
                              onChange={(e) =>
                                setReqItemQtys({
                                  ...reqItemQtys,
                                  [pi.itemId]: {
                                    qty: reqItemQtys[pi.itemId]?.qty ?? 0,
                                    spec: e.target.value,
                                  },
                                })
                              }
                              className="w-40 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {cmp ? (
                              cmp.comparisonStatus === "Matched" ? (
                                <span className="text-emerald-400 font-semibold">
                                  {tr(isAmharic, "Matched", "ተዛምዷል")} ({tr(isAmharic, "Stock", "ክምችት")}: {cmp.warehouseAvailableQty})
                                </span>
                              ) : (
                                <span className="text-rose-400 font-semibold">{cmp.comparisonStatus}: {cmp.mismatchReason}</span>
                              )
                            ) : (
                              <span className="text-slate-500">{tr(isAmharic, "Enter qty", "ብዛት ያስገቡ")}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-amber-300">
                {tr(
                  isAmharic,
                  "No Approved Material Plan available yet. Office Manager Engineer must publish a Material Plan first.",
                  "እስካሁን የጸደቀ የምህንድስና እቃ ዕቅድ የለም። ቢሮ መሃንዲስ ማናጀር መጀመሪያ ዕቅድ ማተም አለበት።"
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedPlan}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={14} />
              <span>{tr(isAmharic, "Submit Request for Verification", "ጥያቄውን ለማረጋገጫ ላክ")}</span>
            </button>
          </form>
        )}

            <RequestListCards requests={snapshot.materialRequests} isAmharic={isAmharic} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-amber-400" />
                  <span>{tr(isAmharic, "Warehouse Manager — Engineering Plan Comparison & Verification Queue", "የመጋዘን ማናጀር — የምህንድስና ዕቅድ ማነጻጸሪያ እና ማረጋገጫ ወረፋ")}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tr(
                    isAmharic,
                    "Warehouse Manager verifies exact alignment with Engineering Material Plan & available warehouse stock before forwarding to Director. Warehouse Manager cannot give final approval.",
                    "የመጋዘን ማናጀር የቀረበውን ጥያቄ ከምህንድስና ዕቅድ እና ከመጋዘን ክምችት ጋር አረጋግጦ ለዳይሬክተር ያስተላልፋል። የመጨረሻ ውሳኔ የሚሰጠው በዳይሬክተር ብቻ ነው።"
                  )}
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {verificationQueue.length} {tr(isAmharic, "Pending", "በመጠባበቅ ላይ")}
              </span>
            </div>

            {verificationQueue.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                {tr(isAmharic, "No submitted material requests awaiting Warehouse Manager verification.", "የመጋዘን ማናጀር ማረጋገጫ የሚጠብቅ የእቃ ጥያቄ የለም።")}
              </div>
            ) : (
              verificationQueue.map((reqDoc) => (
                <div key={reqDoc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-xs">{reqDoc.requestNumber}</span>
                        <span className="text-xs text-slate-400">{tr(isAmharic, "Plan", "ዕቅድ")} {reqDoc.planNumber}</span>
                        <StatusBadge status={reqDoc.status} isAmharic={isAmharic} />
                        {reqDoc.hasPlanMismatch && <StatusBadge status="Plan Mismatch" isAmharic={isAmharic} />}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        {reqDoc.projectName} ({reqDoc.projectStoreName}) ← {reqDoc.warehouseName} · {tr(isAmharic, "By", "ጠያቂ")} {reqDoc.requestedByName}
                      </div>
                    </div>
                  </div>

                  {reqDoc.mismatchSummary && (
                    <div className="bg-rose-950/60 border border-rose-700/60 rounded-xl px-3 py-2 text-xs text-rose-200 flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>{reqDoc.mismatchSummary}</span>
                    </div>
                  )}

                  <RequestItemsTable items={reqDoc.items} isAmharic={isAmharic} />

                  {canVerify && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <input
                        placeholder={tr(isAmharic, "Verification remarks or mandatory return reason...", "የማረጋገጫ አስተያየት ወይም የመመለሻ ምክንያት...")}
                        value={actionNotes[reqDoc.id] || ""}
                        onChange={(e) => setActionNotes({ ...actionNotes, [reqDoc.id]: e.target.value })}
                        className="flex-1 min-w-[240px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={submitting || reqDoc.hasPlanMismatch}
                        onClick={() => handleWarehouseVerify(reqDoc, "verify")}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                        <span>{tr(isAmharic, "Verify & Forward to Director", "አረጋግጥ እና ለዳይሬክተር ላክ")}</span>
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleWarehouseVerify(reqDoc, "return")}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle size={14} />
                        <span>{tr(isAmharic, "Return to Engineering / Store", "ለምህንድስና / ስቶር መልስ")}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // VIEW 4: DIRECTOR ONLY FINAL APPROVAL CONSOLE
  const pendingDir = snapshot.materialRequests.filter((r) => r.status === "Verified Pending Director");
  const decidedDir = snapshot.materialRequests.filter((r) =>
    ["Director Approved", "Director Disapproved", "Partially Dispatched", "Fully Dispatched"].includes(r.status)
  );

  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-rose-400" />
            <span>{tr(isAmharic, "Director Exclusive Final Approval Console", "የዳይሬክተር የመጨረሻ ማፅደቂያ መቆጣጠሪያ")}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {tr(
              isAmharic,
              "ONLY the Director role can Approve or Disapprove verified material requests. Decisions are permanent & cryptographically logged.",
              "የተረጋገጡ የእቃ ጥያቄዎችን ማጽደቅ ወይም መከልከል የሚችለው ዳይሬክተር ብቻ ነው። ውሳኔዎች ቋሚ እና በኦዲት መዝገብ የሚያዙ ናቸው።"
            )}
          </p>
        </div>
        {!isDirector && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/70 border border-rose-700/60 text-rose-300 text-xs font-semibold">
            <Lock size={13} />
            {tr(isAmharic, "Read-Only View (Director Only Action)", "ለንባብ ብቻ (የዳይሬክተር ተግባር ብቻ)")}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase text-amber-400">
          {tr(isAmharic, `Verified & Awaiting Director Final Decision (${pendingDir.length})`, `ተረጋግጠው የዳይሬክተር ውሳኔ የሚጠብቁ (${pendingDir.length})`)}
        </h4>
        {pendingDir.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
            {tr(isAmharic, "No requests currently pending Director approval.", "በአሁኑ ጊዜ የዳይሬክተር ውሳኔ የሚጠብቅ ጥያቄ የለም።")}
          </div>
        )}
        {pendingDir.map((reqDoc) => (
          <div key={reqDoc.id} className="bg-slate-900 border border-amber-700/50 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-xs">{reqDoc.requestNumber}</span>
                  <span className="text-xs text-slate-400">{tr(isAmharic, "Plan", "ዕቅድ")} {reqDoc.planNumber} ({tr(isAmharic, "Rev", "ክለሳ")} {reqDoc.planRevisionNumber})</span>
                  <StatusBadge status={reqDoc.status} isAmharic={isAmharic} />
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {reqDoc.projectName} ({reqDoc.projectStoreName}) · {tr(isAmharic, "Verified by", "ያረጋገጠው")} {reqDoc.warehouseVerifiedByName}
                </div>
              </div>
            </div>
            <RequestItemsTable items={reqDoc.items} isAmharic={isAmharic} />
            {isDirector && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  placeholder={tr(isAmharic, "Director comments or mandatory disapproval reason...", "የዳይሬክተር አስተያየት ወይም የመከልከል ምክንያት...")}
                  value={actionNotes[reqDoc.id] || ""}
                  onChange={(e) => setActionNotes({ ...actionNotes, [reqDoc.id]: e.target.value })}
                  className="flex-1 min-w-[240px] bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDirectorDecision(reqDoc, "Director Approved")}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{tr(isAmharic, "Approve Permanently", "በቋሚነት አጽድቅ")}</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDirectorDecision(reqDoc, "Director Disapproved")}
                  className="px-4 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={14} />
                  <span>{tr(isAmharic, "Disapprove Permanently", "በቋሚነት ከልክል")}</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase text-slate-400">
          {tr(isAmharic, `Permanent Director Decision Archive (${decidedDir.length})`, `የዳይሬክተር ቋሚ ውሳኔ መዝገብ (${decidedDir.length})`)}
        </h4>
        <RequestListCards requests={decidedDir} isAmharic={isAmharic} />
      </div>
    </div>
  );
}

function RequestItemsTable({ items, isAmharic = false }: { items: EngineeringMaterialRequest["items"]; isAmharic?: boolean }) {
  return (
    <div className="overflow-x-auto border border-slate-800 rounded-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
          <tr>
            <th className="px-3 py-2">{tr(isAmharic, "Code & Name", "ኮድ እና ስም")}</th>
            <th className="px-3 py-2 text-right">{tr(isAmharic, "Planned", "የታቀደ")}</th>
            <th className="px-3 py-2 text-right">{tr(isAmharic, "Prior Req", "ቀደም ያለ ጥያቄ")}</th>
            <th className="px-3 py-2 text-right">{tr(isAmharic, "This Req", "አሁን የተጠየቀ")}</th>
            <th className="px-3 py-2 text-right">{tr(isAmharic, "WH Avail", "መጋዘን ክምችት")}</th>
            <th className="px-3 py-2">{tr(isAmharic, "Comparison", "ንጽጽር")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {(items || []).map((it, idx) => (
            <tr key={it.id || it.itemId || idx}>
              <td className="px-3 py-2 text-white font-medium">{it.itemCode} — {it.itemName}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{it.plannedQty} {it.unit}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-400">{it.previouslyApprovedOrIssuedQty}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-cyan-300 font-bold">{it.requestedQty}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{it.warehouseAvailableQty}</td>
              <td className="px-3 py-2"><StatusBadge status={it.comparisonStatus} isAmharic={isAmharic} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestListCards({ requests, isAmharic = false }: { requests: EngineeringMaterialRequest[]; isAmharic?: boolean }) {
  return (
    <div className="space-y-3">
      {requests.map((r) => {
        const lineItems = Array.isArray(r.items) ? r.items : [];
        return (
        <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-400 text-xs">{r.requestNumber || r.id}</span>
              <span className="text-xs text-slate-400">{tr(isAmharic, "Plan", "ዕቅድ")} {r.planNumber || "SITE-STORE"}</span>
              <StatusBadge status={r.status} isAmharic={isAmharic} />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{r.requestedDate || ""}</span>
          </div>
          <div className="text-xs text-slate-300">
            {r.projectName} ({r.projectStoreName}) ← {r.warehouseName} · {lineItems.length} {tr(isAmharic, "item(s)", "እቃ(ዎች)")}
          </div>
          {lineItems.length > 0 && (
            <div className="text-[11px] text-slate-400">
              {lineItems.map((it) => `${it.itemName}: ${it.requestedQty} ${it.unit}`).join(" · ")}
            </div>
          )}
          {r.directorDecisionPermanent && (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Lock size={11} className="text-amber-400" />
              <span>
                {tr(isAmharic, "Permanent Decision by", "ቋሚ ውሳኔ በ")} {r.directorDecisionByName} ({r.directorDecisionAt?.slice(0, 10)})
                {r.disapprovalReason ? ` — ${tr(isAmharic, "Reason", "ምክንያት")}: ${r.disapprovalReason}` : ""}
              </span>
            </div>
          )}
        </div>
        );
      })}
      {requests.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
          {tr(isAmharic, "No material requests recorded yet.", "እስካሁን የተመዘገበ የእቃ ጥያቄ የለም።")}
        </div>
      )}
    </div>
  );
}
