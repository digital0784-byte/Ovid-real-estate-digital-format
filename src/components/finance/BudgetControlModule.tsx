import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileCheck2,
  FileSpreadsheet,
  FilterX,
  GitPullRequest,
  Layers,
  Paperclip,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ActualCostEntry,
  ActualCostSourceModule,
  BudgetAllocationRecord,
  BudgetRevisionRecord,
  BudgetUtilizationColor,
  Part4BudgetCategory,
  ProjectBudgetItem,
  ProjectBudgetPlan,
  SupportingDocMeta,
  UserRole,
} from "../../types";
import {
  ACTUAL_COST_SOURCE_MODULES,
  advanceAllocationWorkflow,
  advanceBudgetRevisionWorkflow,
  advanceProjectBudgetWorkflow,
  createBudgetAllocation,
  createOrSubmitProjectBudget,
  generateBudgetRef,
  getMonthQuarterLabel,
  getRemainingUnallocatedBudget,
  PART4_BUDGET_CATEGORIES,
  Part4BudgetAlert,
  Part4BudgetControlState,
  Part4FilterState,
  registerActualCostEntry,
  requestBudgetRevision,
  verifyActualCostEntry,
} from "../../services/budgetControlService";
import { DbService } from "../../services/db";
import { formatCurrency } from "../../utils/formatters";
import { BudgetReportsCenter } from "./BudgetReportsCenter";

interface BudgetControlModuleProps {
  isAmharic: boolean;
  budgetState: Part4BudgetControlState;
  filterState: Part4FilterState;
  onFilterChange: (next: Part4FilterState) => void;
  onResetFilters: () => void;
  rawBudgetPlans: ProjectBudgetPlan[];
  rawAllocations: BudgetAllocationRecord[];
  rawRevisions: BudgetRevisionRecord[];
  rawActualCosts: ActualCostEntry[];
  projectsList: any[];
  currency?: string;
  actorName: string;
  actorRole: string;
  actorUid: string;
  onLogAction?: (action: string, details: string) => void;
}

type BudgetSubTab =
  | "dashboard"
  | "budgets"
  | "allocations"
  | "actual-costs"
  | "revisions-alerts"
  | "performance-reports";

const INDICATOR_CLASSES: Record<BudgetUtilizationColor, string> = {
  Green: "bg-emerald-950/70 text-emerald-300 border-emerald-700/70",
  Yellow: "bg-amber-950/70 text-amber-300 border-amber-700/70",
  Orange: "bg-orange-950/70 text-orange-300 border-orange-700/70",
  Red: "bg-red-950/70 text-red-300 border-red-700/70",
};

const UTIL_BAR_COLORS: Record<BudgetUtilizationColor, string> = {
  Green: "#10b981",
  Yellow: "#eab308",
  Orange: "#f97316",
  Red: "#ef4444",
};

export const BudgetControlModule: React.FC<BudgetControlModuleProps> = ({
  isAmharic,
  budgetState,
  filterState,
  onFilterChange,
  onResetFilters,
  rawBudgetPlans,
  rawAllocations,
  rawRevisions,
  rawActualCosts,
  projectsList,
  currency = "ETB",
  actorName,
  actorRole,
  actorUid,
  onLogAction,
}) => {
  const { permissions, kpis, charts, alerts } = budgetState;
  const isPm = actorRole === UserRole.PROJECT_MANAGER;
  const canAuthorBudgets = permissions.canManageBudgets || isPm;
  const canAuthorAllocations =
    permissions.canManageBudgets || permissions.isFinanceManager || permissions.isDirector || permissions.isAccountant;
  const canRegisterCosts =
    permissions.canManageTransactions || permissions.canManageBudgets || isPm;

  const [subTab, setSubTab] = useState<BudgetSubTab>("dashboard");
  const [allocationPeriodView, setAllocationPeriodView] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [toast, setToast] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [auditViewerTitle, setAuditViewerTitle] = useState<string | null>(null);
  const [auditViewerEntries, setAuditViewerEntries] = useState<any[]>([]);

  // Modal: New Project Budget
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    projectName: budgetState.assignedProjects[0] || budgetState.filterOptions.projects[0] || projectsList[0]?.name || "",
    projectCode: "",
    contractNumber: "",
    clientName: "",
    projectManager: actorName,
    department: "Engineering & Operations",
    budgetPreparationDate: new Date().toISOString().slice(0, 10),
    budgetYear: new Date().toISOString().slice(0, 4),
    budgetPeriod: new Date().toISOString().slice(0, 4),
    projectStartDate: new Date().toISOString().slice(0, 10),
    projectCompletionDate: `${new Date().getFullYear() + 1}-12-31`,
    originalContractAmount: "",
    contingencyBudget: "",
    submitForReview: true,
  });
  const [budgetDocs, setBudgetDocs] = useState<SupportingDocMeta[]>([]);
  const [draftLineItems, setDraftLineItems] = useState<ProjectBudgetItem[]>([
    {
      id: "LINE-1",
      budgetItemId: "ITM-001",
      projectName: "",
      budgetCategory: "Material Costs",
      subcategory: "Structural Concrete & Rebar",
      itemDescription: "Reinforcement Steel & Grade C-30 Concrete",
      unitOfMeasurement: "Lot",
      plannedQuantity: 1,
      unitPrice: 0,
      totalPlannedCost: 0,
      remarks: "",
    },
  ]);

  // Modal: Monthly Allocation
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocForm, setAllocForm] = useState({
    projectBudgetPlanId: "",
    budgetMonth: new Date().toISOString().slice(0, 7),
    budgetCategory: "Material Costs" as Part4BudgetCategory,
    budgetItemId: "",
    allocatedAmount: "",
    notes: "",
    autoApprove: permissions.isFinanceManager || permissions.isDirector,
    authorizeOverAllocation: false,
  });

  // Modal: Register Actual Cost
  const [showCostModal, setShowCostModal] = useState(false);
  const [costForm, setCostForm] = useState({
    projectName: budgetState.assignedProjects[0] || budgetState.filterOptions.projects[0] || "",
    transactionDate: new Date().toISOString().slice(0, 10),
    budgetCategory: "Material Costs" as Part4BudgetCategory,
    budgetItemId: "",
    budgetItem: "",
    costDescription: "",
    quantity: "1",
    unitPrice: "",
    paidAmount: "0",
    supplierOrPayee: "",
    invoiceNumber: "",
    paymentVoucherNumber: "",
    sourceModule: "Direct Entry" as ActualCostSourceModule,
    sourceRecordId: "",
    autoValidate: permissions.isFinanceManager || permissions.isDirector,
  });
  const [costDocs, setCostDocs] = useState<SupportingDocMeta[]>([]);

  // Modal: Request Budget Revision
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionForm, setRevisionForm] = useState({
    projectBudgetPlanId: "",
    affectedCategory: "All Categories" as Part4BudgetCategory | "All Categories",
    proposedRevisedBudget: "",
    revisionReason: "",
  });
  const [revisionDocs, setRevisionDocs] = useState<SupportingDocMeta[]>([]);

  // Inline Reject Prompt State (never window.prompt/alert)
  const [rejectContext, setRejectContext] = useState<{
    kind: "budget" | "allocation" | "cost" | "revision";
    record: any;
    plan?: ProjectBudgetPlan;
    reason: string;
  } | null>(null);

  const [dispatchedAlerts, setDispatchedAlerts] = useState<Set<string>>(new Set());

  const notify = (msg: string) => {
    setToast(msg);
    setErrMsg(null);
    setTimeout(() => setToast(null), 4500);
  };

  const approvedPlans = useMemo(
    () => rawBudgetPlans.filter((p) => p.budgetStatus === "Approved" || p.budgetStatus === "Revised"),
    [rawBudgetPlans]
  );

  const handleFileAttachment = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<SupportingDocMeta[]>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400_000) {
      setErrMsg(isAmharic ? "ፋይሉ ከ 400KB መብለጥ የለበትም።" : "Supporting file must be <= 400KB for Firestore storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter((prev) => [
        ...prev,
        {
          id: `DOC-${Date.now()}`,
          name: file.name,
          fileType: file.type,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: actorName,
          dataUrl: typeof reader.result === "string" ? reader.result : undefined,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const addDraftLineItem = () => {
    const nextIdx = draftLineItems.length + 1;
    setDraftLineItems((prev) => [
      ...prev,
      {
        id: `LINE-${Date.now()}-${nextIdx}`,
        budgetItemId: `ITM-${String(nextIdx).padStart(3, "0")}`,
        projectName: budgetForm.projectName,
        budgetCategory: "Labor Costs",
        subcategory: "",
        itemDescription: "",
        unitOfMeasurement: "Unit",
        plannedQuantity: 1,
        unitPrice: 0,
        totalPlannedCost: 0,
        remarks: "",
      },
    ]);
  };

  const updateDraftLineItem = (idx: number, patch: Partial<ProjectBudgetItem>) => {
    setDraftLineItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const merged = { ...row, ...patch };
        merged.totalPlannedCost =
          Math.max(0, Number(merged.plannedQuantity) || 0) * Math.max(0, Number(merged.unitPrice) || 0);
        return merged;
      })
    );
  };

  const removeDraftLineItem = (idx: number) => {
    if (draftLineItems.length <= 1) return;
    setDraftLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const draftBudgetTotal = useMemo(
    () => draftLineItems.reduce((s, li) => s + (Number(li.totalPlannedCost) || 0), 0),
    [draftLineItems]
  );

  // Submit Handlers
  const handleCreateBudgetPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg(null);
    try {
      const created = await createOrSubmitProjectBudget({
        draft: {
          ...budgetForm,
          projectCode: budgetForm.projectCode || generateBudgetRef("BGT").slice(0, 10),
          originalContractAmount: Number(budgetForm.originalContractAmount || 0),
          contingencyBudget: Number(budgetForm.contingencyBudget || 0),
          lineItems: draftLineItems,
          supportingDocuments: budgetDocs,
        },
        submitForReview: budgetForm.submitForReview,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Create Project Budget", `${created.budgetId} (${created.projectName})`);
      setShowBudgetModal(false);
      setBudgetDocs([]);
      notify(
        isAmharic
          ? `${created.budgetId} የፕሮጀክት በጀት ተመዝግቧል።`
          : `Project Budget ${created.budgetId} (${created.budgetStatus}) saved to Firestore.`
      );
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to save project budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleBudgetWorkflow = async (
    plan: ProjectBudgetPlan,
    action: "Submit" | "Finance Review" | "PM Review" | "Approve" | "Close"
  ) => {
    setSaving(true);
    setErrMsg(null);
    try {
      const updated = await advanceProjectBudgetWorkflow({
        plan,
        action,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.(`Budget ${action}`, `${updated.budgetId} -> ${updated.budgetStatus}`);
      notify(`Budget ${updated.budgetId} updated to ${updated.budgetStatus} (${updated.workflowStage}).`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to update budget workflow.");
    } finally {
      setSaving(false);
    }
  };

  const selectedAllocPlan = approvedPlans.find((p) => p.id === allocForm.projectBudgetPlanId) || approvedPlans[0];
  const selectedAllocHeadroom = selectedAllocPlan
    ? getRemainingUnallocatedBudget(selectedAllocPlan, rawAllocations)
    : { approvedBudget: 0, allocatedTotal: 0, remainingUnallocated: 0 };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocPlan) {
      setErrMsg("Select an Approved Project Budget first.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    try {
      const linkedItem = (selectedAllocPlan.lineItems || []).find(
        (li) => li.budgetItemId === allocForm.budgetItemId
      );
      const created = await createBudgetAllocation({
        plan: selectedAllocPlan,
        existingAllocations: rawAllocations,
        budgetMonth: allocForm.budgetMonth,
        budgetCategory: allocForm.budgetCategory,
        budgetItemId: linkedItem?.budgetItemId,
        budgetItem: linkedItem?.itemDescription,
        allocatedAmount: Number(allocForm.allocatedAmount),
        notes: allocForm.notes,
        autoApprove: allocForm.autoApprove,
        authorizeOverAllocation: allocForm.authorizeOverAllocation,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Create Budget Allocation", `${created.allocationId} (${created.budgetMonth})`);
      setShowAllocModal(false);
      setAllocForm((prev) => ({ ...prev, allocatedAmount: "", notes: "" }));
      notify(`Allocation ${created.allocationId} (${created.approvalStatus}) saved.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to create allocation.");
    } finally {
      setSaving(false);
    }
  };

  const handleAllocationAction = async (
    allocation: BudgetAllocationRecord,
    action: "Finance Verify" | "Approve"
  ) => {
    setSaving(true);
    setErrMsg(null);
    try {
      const updated = await advanceAllocationWorkflow({
        allocation,
        action,
        actorName,
        actorRole,
        actorUid,
      });
      notify(`Allocation ${updated.allocationId} -> ${updated.approvalStatus}.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to update allocation.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateActualCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrMsg(null);
    try {
      const created = await registerActualCostEntry({
        draft: {
          projectName: costForm.projectName,
          transactionDate: costForm.transactionDate,
          budgetCategory: costForm.budgetCategory,
          budgetItemId: costForm.budgetItemId || undefined,
          budgetItem: costForm.budgetItem || undefined,
          costDescription: costForm.costDescription,
          quantity: Number(costForm.quantity),
          unitPrice: Number(costForm.unitPrice),
          paidAmount: Number(costForm.paidAmount || 0),
          supplierOrPayee: costForm.supplierOrPayee,
          invoiceNumber: costForm.invoiceNumber || undefined,
          paymentVoucherNumber: costForm.paymentVoucherNumber || undefined,
          sourceModule: costForm.sourceModule,
          sourceRecordId: costForm.sourceRecordId || undefined,
          supportingDocuments: costDocs,
        },
        existingEntries: rawActualCosts,
        autoValidate: costForm.autoValidate,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Register Actual Cost", `${created.costTransactionId} (${created.projectName})`);
      setShowCostModal(false);
      setCostDocs([]);
      setCostForm((prev) => ({
        ...prev,
        costDescription: "",
        unitPrice: "",
        paidAmount: "0",
        invoiceNumber: "",
        paymentVoucherNumber: "",
        sourceRecordId: "",
      }));
      notify(`Actual Cost ${created.costTransactionId} (${created.verificationStatus}) saved.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to register actual cost.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyActualCost = async (
    entry: ActualCostEntry,
    action: "Source Verify" | "Classify Budget" | "Validate"
  ) => {
    setSaving(true);
    setErrMsg(null);
    try {
      const updated = await verifyActualCostEntry({
        entry,
        action,
        actorName,
        actorRole,
        actorUid,
      });
      notify(`Cost ${updated.costTransactionId} -> ${updated.verificationStatus}.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to verify actual cost.");
    } finally {
      setSaving(false);
    }
  };

  const selectedRevPlan =
    approvedPlans.find((p) => p.id === revisionForm.projectBudgetPlanId) || approvedPlans[0];

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRevPlan) {
      setErrMsg("Select an Approved Project Budget first.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    try {
      const created = await requestBudgetRevision({
        plan: selectedRevPlan,
        proposedRevisedBudget: Number(revisionForm.proposedRevisedBudget),
        affectedCategory: revisionForm.affectedCategory,
        revisionReason: revisionForm.revisionReason,
        supportingDocuments: revisionDocs,
        actorName,
        actorRole,
        actorUid,
      });
      onLogAction?.("Request Budget Revision", `${created.revisionId} (${created.projectName})`);
      setShowRevisionModal(false);
      setRevisionDocs([]);
      setRevisionForm((prev) => ({ ...prev, proposedRevisedBudget: "", revisionReason: "" }));
      notify(`Budget Revision ${created.revisionId} submitted for review.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to submit budget revision.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevisionAction = async (
    revision: BudgetRevisionRecord,
    action: "Finance Review" | "PM Review" | "Approve"
  ) => {
    const plan = rawBudgetPlans.find((p) => p.id === revision.projectBudgetPlanId);
    if (!plan) {
      setErrMsg("Linked Project Budget record not found.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    try {
      const res = await advanceBudgetRevisionWorkflow({
        revision,
        plan,
        action,
        actorName,
        actorRole,
        actorUid,
      });
      notify(`Revision ${res.revision.revisionId} -> ${res.revision.revisionStatus}.`);
    } catch (err: any) {
      setErrMsg(err?.message || "Failed to advance revision workflow.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectContext || !rejectContext.reason.trim()) {
      setErrMsg("Please enter a rejection reason.");
      return;
    }
    setSaving(true);
    setErrMsg(null);
    try {
      if (rejectContext.kind === "budget") {
        await advanceProjectBudgetWorkflow({
          plan: rejectContext.record,
          action: "Reject",
          actorName,
          actorRole,
          actorUid,
          notes: rejectContext.reason.trim(),
        });
      } else if (rejectContext.kind === "allocation") {
        await advanceAllocationWorkflow({
          allocation: rejectContext.record,
          action: "Reject",
          actorName,
          actorRole,
          actorUid,
          notes: rejectContext.reason.trim(),
        });
      } else if (rejectContext.kind === "cost") {
        await verifyActualCostEntry({
          entry: rejectContext.record,
          action: "Reject",
          actorName,
          actorRole,
          actorUid,
          notes: rejectContext.reason.trim(),
        });
      } else if (rejectContext.kind === "revision" && rejectContext.plan) {
        await advanceBudgetRevisionWorkflow({
          revision: rejectContext.record,
          plan: rejectContext.plan,
          action: "Reject",
          actorName,
          actorRole,
          actorUid,
          notes: rejectContext.reason.trim(),
        });
      }
      setRejectContext(null);
      notify("Record rejected with audit trail.");
    } catch (err: any) {
      setErrMsg(err?.message || "Rejection failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchBudgetAlert = async (alert: Part4BudgetAlert) => {
    const nowIso = new Date().toISOString();
    await DbService.addNotification({
      id: `${alert.id}-${Date.now()}`,
      type: "Budget Control Alert",
      title: alert.title,
      titleAm: alert.titleAm,
      message: alert.description,
      description: alert.description,
      descriptionAm: alert.descriptionAm,
      category: "Budget Notifications",
      priority: alert.severity === "CRITICAL" ? "Critical" : "High",
      status: "Unread",
      projectName: alert.project || "Corporate Budget Control",
      sender: actorName,
      senderRole: actorRole,
      receiver: "Finance Manager, PM & General Manager",
      targetRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.HEAD_OFFICE,
        UserRole.FINANCE_MANAGER,
        UserRole.PROJECT_MANAGER,
      ],
      date: nowIso.slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: Date.now(),
      read: false,
      actionTab: "financeErp",
    });
    setDispatchedAlerts((prev) => new Set(prev).add(alert.id));
    onLogAction?.("Dispatch Budget Alert", `${alert.title} (${alert.project})`);
    notify(`Alert "${alert.title}" dispatched to Management & Project Team.`);
  };

  // Quarterly and Annual allocation aggregations
  const quarterlyAllocations = useMemo(() => {
    const map = new Map<string, { quarter: string; projectName: string; allocatedAmount: number; actualIncurred: number }>();
    budgetState.allocations
      .filter((a) => a.approvalStatus === "Approved")
      .forEach((a) => {
        const q = getMonthQuarterLabel(a.budgetMonth);
        const key = `${a.projectName}::${q}`;
        const curRow = map.get(key) || { quarter: q, projectName: a.projectName, allocatedAmount: 0, actualIncurred: 0 };
        curRow.allocatedAmount += Number(a.allocatedAmount) || 0;
        map.set(key, curRow);
      });
    budgetState.verifiedActualCosts.forEach((c) => {
      const key = `${c.projectName}::${c.quarter}`;
      const existing = map.get(key);
      if (existing) existing.actualIncurred += c.incurredAmount;
    });
    return Array.from(map.values()).sort((a, b) => b.quarter.localeCompare(a.quarter));
  }, [budgetState.allocations, budgetState.verifiedActualCosts]);

  const annualAllocations = useMemo(() => {
    const map = new Map<string, { year: string; projectName: string; approvedBudget: number; allocatedAmount: number; actualIncurred: number }>();
    budgetState.officialBudgets.forEach((p) => {
      const key = `${p.projectName}::${p.budgetYear}`;
      const curRow = map.get(key) || { year: p.budgetYear, projectName: p.projectName, approvedBudget: 0, allocatedAmount: 0, actualIncurred: 0 };
      curRow.approvedBudget += p.approvedProjectBudget;
      map.set(key, curRow);
    });
    budgetState.allocations
      .filter((a) => a.approvalStatus === "Approved")
      .forEach((a) => {
        const key = `${a.projectName}::${a.budgetYear}`;
        const curRow = map.get(key) || { year: a.budgetYear, projectName: a.projectName, approvedBudget: 0, allocatedAmount: 0, actualIncurred: 0 };
        curRow.allocatedAmount += Number(a.allocatedAmount) || 0;
        map.set(key, curRow);
      });
    budgetState.verifiedActualCosts.forEach((c) => {
      const key = `${c.projectName}::${c.year}`;
      const curRow = map.get(key);
      if (curRow) curRow.actualIncurred += c.incurredAmount;
    });
    return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [budgetState.officialBudgets, budgetState.allocations, budgetState.verifiedActualCosts]);

  const overallIndicator = useMemo(() => {
    const cls = kpis.overallBudgetUtilizationPct > 100
      ? INDICATOR_CLASSES.Red
      : kpis.overallBudgetUtilizationPct > 85
      ? INDICATOR_CLASSES.Orange
      : kpis.overallBudgetUtilizationPct >= 70
      ? INDICATOR_CLASSES.Yellow
      : INDICATOR_CLASSES.Green;
    return cls;
  }, [kpis.overallBudgetUtilizationPct]);

  return (
    <div className="space-y-5" id="part4-budget-control-module">
      {/* Header Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-blue-400">
            <Briefcase size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                {isAmharic
                  ? "10. የፕሮጀክት በጀት እና የወጪ ቁጥጥር (Budget Management & Cost Control)"
                  : "10. Project Budget Management & Cost Control"}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${overallIndicator}`}>
                {kpis.overallBudgetUtilizationPct.toFixed(1)}% Utilized
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic
                ? "12 የወጪ ዘርፎች፣ የማፅደቅ ሂደት፣ ወርሃዊ ምደባ፣ ተቀናጅቶ የመጣ ትክክለኛ ወጪ፣ ማሻሻያ እና 14 ሪፖርቶች"
                : "12 Cost Categories, 5-Stage Budget Approval, Monthly Allocations, Anti-Double-Count Actual Costs, Revisions, Alerts & 14 Statements."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canAuthorBudgets && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setShowBudgetModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus size={14} />
              <span>{isAmharic ? "አዲስ የፕሮጀክት በጀት" : "New Project Budget"}</span>
            </button>
          )}
          {canAuthorAllocations && approvedPlans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setAllocForm((prev) => ({
                  ...prev,
                  projectBudgetPlanId: prev.projectBudgetPlanId || approvedPlans[0]?.id || "",
                }));
                setShowAllocModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Calendar size={14} />
              <span>{isAmharic ? "ወርሃዊ በጀት መድብ" : "Allocate Budget"}</span>
            </button>
          )}
          {canRegisterCosts && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setShowCostModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Receipt size={14} />
              <span>{isAmharic ? "ትክክለኛ ወጪ መዝግብ" : "Record Actual Cost"}</span>
            </button>
          )}
          {canAuthorBudgets && approvedPlans.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setRevisionForm((prev) => ({
                  ...prev,
                  projectBudgetPlanId: prev.projectBudgetPlanId || approvedPlans[0]?.id || "",
                }));
                setShowRevisionModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <GitPullRequest size={14} />
              <span>{isAmharic ? "የበጀት ማሻሻያ" : "Request Revision"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Error Banners */}
      {toast && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}
      {errMsg && (
        <div className="bg-red-950/70 border border-red-800 text-red-300 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} />
            {errMsg}
          </span>
          <button type="button" onClick={() => setErrMsg(null)} className="cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Part 4 Sub-Module Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "dashboard", labelEn: "Cost Control Dashboard", labelAm: "የወጪ ቁጥጥር ዳሽቦርድ", icon: BarChart3 },
          { id: "budgets", labelEn: `Project Budgets (${budgetState.budgetPlans.length})`, labelAm: `የፕሮጀክት በጀቶች (${budgetState.budgetPlans.length})`, icon: Layers },
          { id: "allocations", labelEn: `Allocations (${budgetState.allocations.length})`, labelAm: `ወርሃዊ ምደባ (${budgetState.allocations.length})`, icon: Calendar },
          { id: "actual-costs", labelEn: `Actual Costs (${budgetState.unifiedActualCosts.length})`, labelAm: `ትክክለኛ ወጪዎች (${budgetState.unifiedActualCosts.length})`, icon: Receipt },
          { id: "revisions-alerts", labelEn: `Revisions & Alerts (${alerts.length})`, labelAm: `ማሻሻያና ማስጠንቀቂያ (${alerts.length})`, icon: AlertTriangle },
          { id: "performance-reports", labelEn: "Performance & 14 Reports", labelAm: "አፈፃፀምና 14 ሪፖርቶች", icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as BudgetSubTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition ${
                active
                  ? "bg-red-600 text-white border-red-500"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={14} />
              <span>{isAmharic ? tab.labelAm : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Dedicated Part 4 Filters */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
        <select
          value={filterState.project}
          onChange={(e) => onFilterChange({ ...filterState, project: e.target.value })}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          aria-label="Filter by Project"
        >
          <option value="ALL">{isAmharic ? "ሁሉም ፕሮጀክቶች" : "All Projects"}</option>
          {budgetState.filterOptions.projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          value={filterState.budgetYear}
          onChange={(e) => onFilterChange({ ...filterState, budgetYear: e.target.value })}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          aria-label="Filter by Financial Year"
        >
          <option value="ALL">{isAmharic ? "ሁሉም ዓመታት" : "All Years"}</option>
          {budgetState.filterOptions.years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={filterState.budgetCategory}
          onChange={(e) => onFilterChange({ ...filterState, budgetCategory: e.target.value })}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          aria-label="Filter by Budget Category"
        >
          <option value="ALL">{isAmharic ? "ሁሉም 12 ዘርፎች" : "All 12 Categories"}</option>
          {PART4_BUDGET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={filterState.startDate}
          onChange={(e) => onFilterChange({ ...filterState, startDate: e.target.value })}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          aria-label="Start Date"
        />

        <input
          type="date"
          value={filterState.endDate}
          onChange={(e) => onFilterChange({ ...filterState, endDate: e.target.value })}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
          aria-label="End Date"
        />

        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={filterState.searchTerm}
              onChange={(e) => onFilterChange({ ...filterState, searchTerm: e.target.value })}
              placeholder={isAmharic ? "ፈልግ..." : "Search..."}
              className="w-full pl-7 pr-2 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            title="Reset Part 4 Filters"
            className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
          >
            <FilterX size={14} />
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUB-TAB 1: COST CONTROL DASHBOARD (8 KPIs + 6 CHARTS + TABLES)     */}
      {/* ================================================================== */}
      {subTab === "dashboard" && (
        <div className="space-y-5">
          {/* 8 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                1. {isAmharic ? "ጠቅላላ የጸደቀ በጀት" : "Total Approved Budget"}
              </span>
              <span className="text-lg font-mono font-black text-blue-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalApprovedProjectBudget, currency)}
              </span>
              <span className="text-[10px] text-slate-500">
                {budgetState.officialBudgets.length} Official Project Plan(s)
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                2. {isAmharic ? "ትክክለኛ የወጣ ወጪ (Incurred)" : "Actual Incurred Cost"}
              </span>
              <span className="text-lg font-mono font-black text-red-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalActualIncurredCost, currency)}
              </span>
              <span className="text-[10px] text-slate-500">
                {budgetState.verifiedActualCosts.length} Verified Cost Tx(s)
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                3. {isAmharic ? "በጥሬ ገንዘብ የተከፈለ ወጪ (Paid)" : "Actual Paid Cost"}
              </span>
              <span className="text-lg font-mono font-black text-amber-400 tabular-nums mt-1 block">
                {formatCurrency(kpis.totalActualPaidCost, currency)}
              </span>
              <span className="text-[10px] text-slate-500">Settled cash disbursements</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                4. {isAmharic ? "ቀሪ የፕሮጀክት በጀት" : "Total Remaining Budget"}
              </span>
              <span
                className={`text-lg font-mono font-black tabular-nums mt-1 block ${
                  kpis.totalRemainingBudget >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatCurrency(kpis.totalRemainingBudget, currency)}
              </span>
              <span className="text-[10px] text-slate-500">Approved − Incurred</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                5. {isAmharic ? "ጠቅላላ የበጀት ልዩነት (Variance)" : "Total Budget Variance"}
              </span>
              <span
                className={`text-lg font-mono font-black tabular-nums mt-1 block ${
                  kpis.totalBudgetVariance >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {kpis.totalBudgetVariance >= 0 ? "+" : ""}
                {formatCurrency(kpis.totalBudgetVariance, currency)}
              </span>
              <span className="text-[10px] text-slate-500">
                {kpis.totalBudgetVariance > 0
                  ? "Under Budget (Positive)"
                  : kpis.totalBudgetVariance === 0
                  ? "On Budget"
                  : "Over Budget (Negative)"}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                6. {isAmharic ? "አጠቃላይ የበጀት አጠቃቀም (%)" : "Overall Utilization (%)"}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-mono font-black text-white tabular-nums">
                  {kpis.overallBudgetUtilizationPct.toFixed(1)}%
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${overallIndicator}`}>
                  {kpis.overallBudgetUtilizationPct > 100
                    ? "Red >100%"
                    : kpis.overallBudgetUtilizationPct > 85
                    ? "Orange >85%"
                    : kpis.overallBudgetUtilizationPct >= 70
                    ? "Yellow 70-85%"
                    : "Green <70%"}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Threshold bands enforced</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                7. {isAmharic ? "ከበጀት በላይ የሆኑ ፕሮጀክቶች" : "Projects Over Budget"}
              </span>
              <span className="text-lg font-mono font-black text-red-400 tabular-nums mt-1 block">
                {kpis.projectsOverBudgetCount}
              </span>
              <span className="text-[10px] text-slate-500">Exceeding 100% approved limit</span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                8. {isAmharic ? "በበጀት ውስጥ ያሉ ፕሮጀክቶች" : "Projects Within Budget"}
              </span>
              <span className="text-lg font-mono font-black text-emerald-400 tabular-nums mt-1 block">
                {kpis.projectsWithinBudgetCount}
              </span>
              <span className="text-[10px] text-slate-500">Active & within threshold</span>
            </div>
          </div>

          {/* 6 Interactive Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Approved Budget vs Actual Cost */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                1. {isAmharic ? "የጸደቀ በጀት ከትክክለኛ ወጪ ጋር (በፕሮጀክት)" : "Approved Budget vs Actual Cost (By Project)"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.budgetVsActualByProject}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="project" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="approvedBudget" name="Approved Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualIncurred" name="Actual Incurred" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualPaid" name="Actual Paid" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Monthly Budget vs Actual Expenditure */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                2. {isAmharic ? "ወርሃዊ የበጀት ምደባ እና ትክክለኛ ወጪ" : "Monthly Budget Allocation vs Actual Expenditure"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlyBudgetVsActual}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="plannedAllocation" name="Monthly Allocation" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualIncurred" name="Actual Incurred" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Cost Distribution by Category */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                3. {isAmharic ? "የወጪ ስርጭት በዘርፍ (12 Categories)" : "Cost Distribution by Category (12 Categories)"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.costDistributionByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis type="category" dataKey="category" width={125} stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="approvedBudget" name="Category Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="actualIncurred" name="Actual Cost" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Project Budget Utilization (%) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                4. {isAmharic ? "የፕሮጀክት በጀት አጠቃቀም (%)" : "Project Budget Utilization (%) & Alert Bands"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.projectBudgetUtilization}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="project" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                    />
                    <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" />
                    <ReferenceLine y={85} stroke="#f97316" strokeDasharray="3 3" />
                    <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" />
                    <Bar dataKey="utilizationPct" name="Utilization %" radius={[4, 4, 0, 0]}>
                      {charts.projectBudgetUtilization.map((entry, idx) => (
                        <Cell key={idx} fill={UTIL_BAR_COLORS[entry.color]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Monthly Cost Trend */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                5. {isAmharic ? "ወርሃዊ እና ተደማሪ የወጪ አዝማሚያ" : "Cumulative Cost Trend vs Allocated Baseline"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyCostTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Area type="monotone" dataKey="cumulativeBudget" name="Cumulative Allocated" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.14} />
                    <Area type="monotone" dataKey="cumulativeCost" name="Cumulative Incurred" stroke="#ef4444" fill="#ef4444" fillOpacity={0.22} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Budget Variance Analysis */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-3">
                6. {isAmharic ? "የበጀት ልዩነት ትንተና (Variance Analysis)" : "Budget Variance Analysis (+ Under / − Over)"}
              </h3>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.budgetVarianceAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="project" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#020617", borderColor: "#1e293b", borderRadius: "10px", fontSize: "11px" }}
                      formatter={(v: any) => formatCurrency(v, currency)}
                    />
                    <ReferenceLine y={0} stroke="#64748b" />
                    <Bar dataKey="varianceAmount" name="Budget Variance" radius={[4, 4, 0, 0]}>
                      {charts.budgetVarianceAnalysis.map((entry, idx) => (
                        <Cell key={idx} fill={entry.varianceAmount >= 0 ? "#10b981" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 12-Category Breakdown Matrix */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {isAmharic ? "በ12ቱ የወጪ ዘርፎች የተከፋፈለ በጀት ከወጪ" : "Budget vs Actual Analysis Across All 12 Cost Categories"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                    <th className="py-3 px-4">Budget Category</th>
                    <th className="py-3 px-4 text-right">Approved Budget</th>
                    <th className="py-3 px-4 text-right">Allocated</th>
                    <th className="py-3 px-4 text-right">Actual Incurred</th>
                    <th className="py-3 px-4 text-right">Actual Paid</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4">Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {budgetState.categoryBreakdownRows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 font-bold text-white">{row.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-400">
                        {formatCurrency(row.approvedBudget, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                        {formatCurrency(row.monthlyAllocated, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-400">
                        {formatCurrency(row.actualIncurred, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-400">
                        {formatCurrency(row.actualPaid, currency)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono font-bold tabular-nums ${
                          row.costVariance >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatCurrency(row.costVariance, currency)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${INDICATOR_CLASSES[row.indicator.color]}`}>
                          {row.utilizationPct.toFixed(1)}% · {row.indicator.color}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Line-Item Level Variance Table */}
          {budgetState.lineItemPerformanceRows.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  {isAmharic ? "ዝርዝር የበጀት ንጥሎች አፈፃፀም" : "Line-Item Budget vs Actual Breakdown"}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                      <th className="py-2.5 px-4">Item ID</th>
                      <th className="py-2.5 px-4">Project / Category</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-right">Qty × Price</th>
                      <th className="py-2.5 px-4 text-right">Planned Cost</th>
                      <th className="py-2.5 px-4 text-right">Actual Cost</th>
                      <th className="py-2.5 px-4">Indicator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {budgetState.lineItemPerformanceRows.map((item) => (
                      <tr key={`${item.projectName}-${item.budgetItemId}`} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-4 font-mono text-slate-400">{item.budgetItemId}</td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-white">{item.projectName}</div>
                          <div className="text-[10px] text-slate-400">{item.category}</div>
                        </td>
                        <td className="py-2.5 px-4">{item.itemDescription}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300">
                          {item.plannedQuantity} {item.unitOfMeasurement} × {formatCurrency(item.unitPrice, currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-400">
                          {formatCurrency(item.plannedTotalCost, currency)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-400">
                          {formatCurrency(item.actualCost, currency)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${INDICATOR_CLASSES[item.indicator.color]}`}>
                            {item.utilizationPct.toFixed(1)}% · {item.indicator.color}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 2: PROJECT BUDGETS & 5-STAGE APPROVAL WORKFLOW             */}
      {/* ================================================================== */}
      {subTab === "budgets" && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {isAmharic ? "የተመዘገቡ የፕሮጀክት በጀቶች እና የማፅደቅ ሂደት" : "Registered Project Budgets & Approval Workflow"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAmharic
                  ? "የጸደቁ በጀቶች ብቻ ኦፊሴላዊ የፕሮጀክት በጀት ይሆናሉ"
                  : "Workflow: Budget Preparation -> Finance Review -> Project Manager Review -> Management Approval -> Activation"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                  <th className="py-3 px-4">Budget ID</th>
                  <th className="py-3 px-4">Project & Contract</th>
                  <th className="py-3 px-4">Year / Period</th>
                  <th className="py-3 px-4 text-right">Original Baseline</th>
                  <th className="py-3 px-4 text-right">Approved Budget</th>
                  <th className="py-3 px-4 text-right">Contingency</th>
                  <th className="py-3 px-4">Status / Stage</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {budgetState.budgetPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      {isAmharic
                        ? "ምንም የፕሮጀክት በጀት አልተመዘገበም። 'አዲስ የፕሮጀክት በጀት' የሚለውን ይጫኑ።"
                        : "No Project Budget Plans recorded yet. Click 'New Project Budget' to prepare one."}
                    </td>
                  </tr>
                ) : (
                  budgetState.budgetPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        <div>{plan.budgetId}</div>
                        <div className="text-[10px] text-slate-500">{(plan.lineItems || []).length} line item(s)</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{plan.projectName} ({plan.projectCode})</div>
                        <div className="text-[10px] text-slate-400">
                          Contract #{plan.contractNumber || "—"} · Client: {plan.clientName || "—"} · PM: {plan.projectManager || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div>{plan.budgetYear}</div>
                        <div className="text-[10px] text-slate-500">{plan.projectStartDate} → {plan.projectCompletionDate}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                        {formatCurrency(plan.originalApprovedBudget || plan.approvedProjectBudget, plan.currency || currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-white">
                        {formatCurrency(plan.approvedProjectBudget, plan.currency || currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">
                        {formatCurrency(plan.contingencyBudget, plan.currency || currency)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            plan.budgetStatus === "Approved" || plan.budgetStatus === "Revised"
                              ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                              : plan.budgetStatus === "Rejected"
                              ? "bg-red-950/70 text-red-300 border-red-800"
                              : "bg-amber-950/70 text-amber-300 border-amber-800"
                          }`}
                        >
                          {plan.budgetStatus}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{plan.workflowStage}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          {plan.budgetStatus === "Draft" && canAuthorBudgets && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleBudgetWorkflow(plan, "Submit")}
                              className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Submit
                            </button>
                          )}
                          {plan.budgetStatus === "Submitted" && (permissions.isFinanceManager || permissions.isDirector) && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleBudgetWorkflow(plan, "Finance Review")}
                              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Finance Review
                            </button>
                          )}
                          {plan.budgetStatus === "Under Review" && plan.workflowStage === "Project Manager Review" && (isPm || permissions.isDirector || permissions.isFinanceManager) && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleBudgetWorkflow(plan, "PM Review")}
                              className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              PM Review
                            </button>
                          )}
                          {(plan.budgetStatus === "Submitted" || plan.budgetStatus === "Under Review") && (permissions.isFinanceManager || permissions.isDirector) && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleBudgetWorkflow(plan, "Approve")}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                          {(plan.budgetStatus === "Submitted" || plan.budgetStatus === "Under Review") && (permissions.isFinanceManager || permissions.isDirector) && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setRejectContext({ kind: "budget", record: plan, reason: "" })}
                              className="px-2 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                            >
                              Reject
                            </button>
                          )}
                          {(plan.budgetStatus === "Approved" || plan.budgetStatus === "Revised") && (permissions.isFinanceManager || permissions.isDirector) && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleBudgetWorkflow(plan, "Close")}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                            >
                              Close
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAuditViewerTitle(`Audit Trail: ${plan.budgetId}`);
                              setAuditViewerEntries(plan.auditHistory || []);
                            }}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold cursor-pointer"
                          >
                            Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 3: MONTHLY, QUARTERLY & ANNUAL BUDGET ALLOCATIONS          */}
      {/* ================================================================== */}
      {subTab === "allocations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-4">
            <div className="flex gap-2">
              {[
                { id: "monthly", label: isAmharic ? "ወርሃዊ እይታ" : "Monthly Allocations" },
                { id: "quarterly", label: isAmharic ? "የሩብ ዓመት ማጠቃለያ" : "Quarterly Roll-up" },
                { id: "annual", label: isAmharic ? "ዓመታዊ ማጠቃለያ" : "Annual Budget Control" },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setAllocationPeriodView(v.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    allocationPeriodView === v.id
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">
              {isAmharic
                ? "ያለ ፍቃድ ከጸደቀው በጀት በላይ መመደብ ተከልክሏል።"
                : "Over-allocation guard active: total allocations cannot exceed Approved Project Budget without revision."}
            </span>
          </div>

          {allocationPeriodView === "monthly" && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                      <th className="py-3 px-4">Allocation ID</th>
                      <th className="py-3 px-4">Project / Month</th>
                      <th className="py-3 px-4">Category & Item</th>
                      <th className="py-3 px-4 text-right">Allocated Amount</th>
                      <th className="py-3 px-4 text-right">Remaining Unallocated</th>
                      <th className="py-3 px-4">Approval Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {budgetState.allocations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          {isAmharic ? "ምንም ወርሃዊ የበጀት ምደባ አልተመዘገበም።" : "No monthly budget allocations created yet."}
                        </td>
                      </tr>
                    ) : (
                      budgetState.allocations.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">{a.allocationId}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{a.projectName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{a.budgetMonth} ({getMonthQuarterLabel(a.budgetMonth)})</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{a.budgetCategory}</div>
                            <div className="text-[10px] text-slate-400">{a.budgetItem || "Category Pool"}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums">
                            {formatCurrency(a.allocatedAmount, currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">
                            {formatCurrency(a.remainingUnallocatedBudget, currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                a.approvalStatus === "Approved"
                                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                                  : a.approvalStatus === "Rejected"
                                  ? "bg-red-950/70 text-red-300 border-red-800"
                                  : "bg-amber-950/70 text-amber-300 border-amber-800"
                              }`}
                            >
                              {a.approvalStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              {a.approvalStatus === "Pending Verification" && (permissions.isFinanceManager || permissions.isDirector) && (
                                <button
                                  type="button"
                                  onClick={() => handleAllocationAction(a, "Finance Verify")}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Verify
                                </button>
                              )}
                              {(a.approvalStatus === "Pending Verification" || a.approvalStatus === "Finance Verified") && (permissions.isFinanceManager || permissions.isDirector) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAllocationAction(a, "Approve")}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectContext({ kind: "allocation", record: a, reason: "" })}
                                    className="px-2 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {allocationPeriodView === "quarterly" && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                    <th className="py-3 px-4">Quarter</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4 text-right">Approved Quarterly Allocation</th>
                    <th className="py-3 px-4 text-right">Actual Incurred</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {quarterlyAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No approved quarterly allocations yet.
                      </td>
                    </tr>
                  ) : (
                    quarterlyAllocations.map((q) => (
                      <tr key={`${q.projectName}-${q.quarter}`}>
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{q.quarter}</td>
                        <td className="py-3 px-4 font-bold text-white">{q.projectName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatCurrency(q.allocatedAmount, currency)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-red-400">{formatCurrency(q.actualIncurred, currency)}</td>
                        <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${q.allocatedAmount - q.actualIncurred >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatCurrency(q.allocatedAmount - q.actualIncurred, currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {allocationPeriodView === "annual" && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4 text-right">Annual Approved Budget</th>
                    <th className="py-3 px-4 text-right">Total Allocated</th>
                    <th className="py-3 px-4 text-right">Actual Incurred</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {annualAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No annual project budgets found.
                      </td>
                    </tr>
                  ) : (
                    annualAllocations.map((yRow) => (
                      <tr key={`${yRow.projectName}-${yRow.year}`}>
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{yRow.year}</td>
                        <td className="py-3 px-4 font-bold text-white">{yRow.projectName}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatCurrency(yRow.approvedBudget, currency)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-indigo-400">{formatCurrency(yRow.allocatedAmount, currency)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-red-400">{formatCurrency(yRow.actualIncurred, currency)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 4: ACTUAL COST MANAGEMENT & ANTI-DOUBLE-COUNT SYNC         */}
      {/* ================================================================== */}
      {subTab === "actual-costs" && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <ShieldCheck size={16} />
              <span>
                {isAmharic
                  ? "ድርብ ቆጠራ መከላከያ ንቁ ነው፦ የAP ወጪዎች እና የጥሬ ገንዘብ ክፍያዎች ለየብቻ ተለይተው ይሰላሉ።"
                  : "Anti-Double-Count Safeguard Active: AP Invoices are recognized once at Incurred Cost; linked Cash Payments update Paid Cost without double-counting."}
              </span>
            </div>
            <span className="font-mono text-slate-400">
              Verified: {budgetState.verifiedActualCosts.length} · Pending Validation: {budgetState.unverifiedActualCosts.length}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                    <th className="py-3 px-4">Cost TX ID</th>
                    <th className="py-3 px-4">Date & Project</th>
                    <th className="py-3 px-4">Category & Description</th>
                    <th className="py-3 px-4">Source Module</th>
                    <th className="py-3 px-4 text-right">Incurred Cost</th>
                    <th className="py-3 px-4 text-right">Paid Cost</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {budgetState.unifiedActualCosts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        {isAmharic ? "ምንም ትክክለኛ የወጪ መዝገብ የለም።" : "No actual cost records found for selected filters."}
                      </td>
                    </tr>
                  ) : (
                    budgetState.unifiedActualCosts.map((c) => {
                      const rawEntry = rawActualCosts.find((e) => e.id === c.id);
                      return (
                        <tr key={c.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono font-bold text-slate-200">
                            <div>{c.costTransactionId}</div>
                            {c.invoiceNumber && <div className="text-[10px] text-slate-500">Inv: {c.invoiceNumber}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{c.projectName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{c.transactionDate}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-blue-300">{c.budgetCategory}</div>
                            <div className="text-[11px] text-slate-300">{c.costDescription}</div>
                            <div className="text-[10px] text-slate-500">Payee: {c.supplierOrPayee}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                              {c.sourceModule}
                            </span>
                            {c.isAutoSyncedFromErp && (
                              <div className="text-[10px] text-cyan-400 mt-0.5">Auto-Synced</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-red-400 tabular-nums">
                            {formatCurrency(c.incurredAmount, currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-400 tabular-nums">
                            {formatCurrency(c.paidAmount, currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                c.isVerifiedOfficial
                                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                                  : "bg-amber-950/70 text-amber-300 border-amber-800"
                              }`}
                            >
                              {c.verificationStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {rawEntry && !c.isVerifiedOfficial ? (
                              <div className="flex justify-end gap-1">
                                {rawEntry.verificationStatus === "Registered" && (
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyActualCost(rawEntry, "Source Verify")}
                                    className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Verify Source
                                  </button>
                                )}
                                {(permissions.isFinanceManager || permissions.isDirector) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyActualCost(rawEntry, "Validate")}
                                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Validate
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectContext({ kind: "cost", record: rawEntry, reason: "" })}
                                      className="px-2 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500">Official</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 5: BUDGET REVISIONS & CONTROL ALERTS                       */}
      {/* ================================================================== */}
      {subTab === "revisions-alerts" && (
        <div className="space-y-5">
          {/* 8 Budget Control Alerts Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <span>
                {isAmharic
                  ? "ራስ-ሰር የበጀት ቁጥጥር ማስጠንቀቂያዎች (8 ህጎች)"
                  : "Automated Budget Control Alerts (70%, 85%, >100%, Monthly, Category & Governance Rules)"}
              </span>
            </h3>

            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-400 font-bold">
                {isAmharic
                  ? "ሁሉም የፕሮጀክት በጀቶች እና ምደባዎች በጤናማ ወሰን ውስጥ ናቸው።"
                  : "All project budgets, categories, and monthly allocations are within safe operating thresholds."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {alerts.map((al) => {
                  const sent = dispatchedAlerts.has(al.id);
                  return (
                    <div
                      key={al.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        al.severity === "CRITICAL"
                          ? "bg-red-950/30 border-red-900/70"
                          : al.severity === "WARNING"
                          ? "bg-amber-950/30 border-amber-900/70"
                          : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {isAmharic ? al.titleAm : al.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-300">
                            {al.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAmharic ? al.descriptionAm : al.description}
                        </p>
                      </div>
                      {permissions.canAcknowledgeAlerts && (
                        <button
                          type="button"
                          disabled={sent}
                          onClick={() => handleDispatchBudgetAlert(al)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <Send size={12} />
                          <span>{sent ? "Dispatched" : isAmharic ? "ለአመራር ላክ" : "Notify Management"}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget Revisions Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {isAmharic ? "የበጀት ማሻሻያ ታሪክ እና የማፅደቅ ሂደት" : "Budget Revision Requests & Immutable History"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                    <th className="py-3 px-4">Revision ID</th>
                    <th className="py-3 px-4">Project & Reason</th>
                    <th className="py-3 px-4 text-right">Original Budget</th>
                    <th className="py-3 px-4 text-right">Previous Revised</th>
                    <th className="py-3 px-4 text-right">Proposed Revised</th>
                    <th className="py-3 px-4 text-right">Delta (+/-)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {budgetState.revisions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-500">
                        No budget revision requests recorded yet.
                      </td>
                    </tr>
                  ) : (
                    budgetState.revisions.map((rev) => {
                      const linkedPlan = rawBudgetPlans.find((p) => p.id === rev.projectBudgetPlanId);
                      return (
                        <tr key={rev.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">{rev.revisionId}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{rev.projectName}</div>
                            <div className="text-[11px] text-slate-300">{rev.revisionReason}</div>
                            <div className="text-[10px] text-slate-500">Requested by {rev.requestedBy}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                            {formatCurrency(rev.originalApprovedBudget, currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            {formatCurrency(rev.previousRevisedBudget, currency)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums">
                            {formatCurrency(rev.proposedRevisedBudget, currency)}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${rev.budgetChangeAmount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {rev.budgetChangeAmount >= 0 ? "+" : ""}
                            {formatCurrency(rev.budgetChangeAmount, currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                rev.revisionStatus === "Approved"
                                  ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                                  : rev.revisionStatus === "Rejected"
                                  ? "bg-red-950/70 text-red-300 border-red-800"
                                  : "bg-amber-950/70 text-amber-300 border-amber-800"
                              }`}
                            >
                              {rev.revisionStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              {rev.revisionStatus === "Requested" && (permissions.isFinanceManager || permissions.isDirector) && (
                                <button
                                  type="button"
                                  onClick={() => handleRevisionAction(rev, "Finance Review")}
                                  className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Finance Review
                                </button>
                              )}
                              {rev.revisionStatus === "Finance Review" && (isPm || permissions.isFinanceManager || permissions.isDirector) && (
                                <button
                                  type="button"
                                  onClick={() => handleRevisionAction(rev, "PM Review")}
                                  className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  PM Review
                                </button>
                              )}
                              {(rev.revisionStatus === "Requested" || rev.revisionStatus === "Finance Review" || rev.revisionStatus === "PM Review") && (permissions.isFinanceManager || permissions.isDirector) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRevisionAction(rev, "Approve")}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setRejectContext({ kind: "revision", record: rev, plan: linkedPlan, reason: "" })}
                                    className="px-2 py-1 rounded bg-red-900/70 hover:bg-red-800 text-red-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* SUB-TAB 6: PROJECT FINANCIAL PERFORMANCE & 14 REPORTS              */}
      {/* ================================================================== */}
      {subTab === "performance-reports" && (
        <div className="space-y-5">
          {/* Section 11: Project Financial Performance Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                {isAmharic
                  ? "የፕሮጀክት አጠቃላይ የፋይናንስ አፈፃፀም መግለጫ (AR፣ AP እና በጀት የተጣመረ)"
                  : "Project Financial Performance Matrix (Original vs Current Budget, Allocations, Incurred vs Paid Cost, AP & AR)"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/60 text-[10px]">
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4 text-right">Original Budget</th>
                    <th className="py-3 px-4 text-right">Current Budget</th>
                    <th className="py-3 px-4 text-right">Allocations</th>
                    <th className="py-3 px-4 text-right">Incurred Cost</th>
                    <th className="py-3 px-4 text-right">Paid Cost</th>
                    <th className="py-3 px-4 text-right">Open AP</th>
                    <th className="py-3 px-4 text-right">Open AR</th>
                    <th className="py-3 px-4 text-right">Remaining</th>
                    <th className="py-3 px-4">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {budgetState.projectPerformanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-500">
                        No approved project budget or verified expenditure performance data available yet.
                      </td>
                    </tr>
                  ) : (
                    budgetState.projectPerformanceRows.map((row) => (
                      <tr key={row.projectName} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{row.projectName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{row.budgetId}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          {formatCurrency(row.originalApprovedBudget, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-blue-400">
                          {formatCurrency(row.currentApprovedBudget, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {formatCurrency(row.totalMonthlyAllocations, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-red-400">
                          {formatCurrency(row.totalActualIncurredCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">
                          {formatCurrency(row.totalActualPaidCost, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-orange-300">
                          {formatCurrency(row.outstandingProjectPayables, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-cyan-300">
                          {formatCurrency(row.projectReceivables, currency)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${row.remainingBudget >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {formatCurrency(row.remainingBudget, currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${INDICATOR_CLASSES[row.indicator.color]}`}>
                            {row.utilizationPct.toFixed(1)}% · {row.financialPerformanceStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <BudgetReportsCenter isAmharic={isAmharic} budgetState={budgetState} currency={currency} />
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 1: CREATE PROJECT BUDGET & 12-CATEGORY LINE ITEMS            */}
      {/* ================================================================== */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">
                {isAmharic ? "አዲስ የፕሮጀክት በጀት እና ዝርዝር ምዝገባ" : "Register Project Budget & 12-Category Line Items"}
              </h3>
              <button type="button" onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBudgetPlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Name *</label>
                  <input
                    required
                    value={budgetForm.projectName}
                    onChange={(e) => setBudgetForm({ ...budgetForm, projectName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="e.g., Bole Mixed-Use Tower"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Code *</label>
                  <input
                    required
                    value={budgetForm.projectCode}
                    onChange={(e) => setBudgetForm({ ...budgetForm, projectCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="PRJ-2026-01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Contract Number</label>
                  <input
                    value={budgetForm.contractNumber}
                    onChange={(e) => setBudgetForm({ ...budgetForm, contractNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="CTR-2026-881"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Client Name</label>
                  <input
                    value={budgetForm.clientName}
                    onChange={(e) => setBudgetForm({ ...budgetForm, clientName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    placeholder="Client Organization"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Manager</label>
                  <input
                    value={budgetForm.projectManager}
                    onChange={(e) => setBudgetForm({ ...budgetForm, projectManager: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Budget Year</label>
                  <input
                    value={budgetForm.budgetYear}
                    onChange={(e) => setBudgetForm({ ...budgetForm, budgetYear: e.target.value, budgetPeriod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Original Contract Amount ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={budgetForm.originalContractAmount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, originalContractAmount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Start Date</label>
                  <input
                    type="date"
                    value={budgetForm.projectStartDate}
                    onChange={(e) => setBudgetForm({ ...budgetForm, projectStartDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={budgetForm.projectCompletionDate}
                    onChange={(e) => setBudgetForm({ ...budgetForm, projectCompletionDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-950/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-white">
                    Budget Line Items ({draftLineItems.length}) · Auto Total:{" "}
                    <span className="text-blue-400 font-mono">{formatCurrency(draftBudgetTotal, currency)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={addDraftLineItem}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    Add Line Item
                  </button>
                </div>

                <div className="space-y-2">
                  {draftLineItems.map((li, idx) => (
                    <div key={li.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <select
                        value={li.budgetCategory}
                        onChange={(e) => updateDraftLineItem(idx, { budgetCategory: e.target.value as Part4BudgetCategory })}
                        className="md:col-span-3 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                      >
                        {PART4_BUDGET_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <input
                        value={li.itemDescription}
                        onChange={(e) => updateDraftLineItem(idx, { itemDescription: e.target.value })}
                        placeholder="Item Description *"
                        required
                        className="md:col-span-3 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                      />
                      <input
                        value={li.unitOfMeasurement}
                        onChange={(e) => updateDraftLineItem(idx, { unitOfMeasurement: e.target.value })}
                        placeholder="Unit (Ton, m3)"
                        className="md:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.plannedQuantity}
                        onChange={(e) => updateDraftLineItem(idx, { plannedQuantity: Number(e.target.value) })}
                        placeholder="Qty"
                        className="md:col-span-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.unitPrice}
                        onChange={(e) => updateDraftLineItem(idx, { unitPrice: Number(e.target.value) })}
                        placeholder="Unit Price"
                        className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white font-mono"
                      />
                      <div className="md:col-span-1 text-right font-mono font-bold text-emerald-400 tabular-nums truncate">
                        {formatCurrency(li.totalPlannedCost, currency)}
                      </div>
                      <div className="md:col-span-1 text-right">
                        {draftLineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDraftLineItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Supporting Documents (BOQ / Contract Spec &lt;=400KB)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => handleFileAttachment(e, setBudgetDocs)}
                    className="w-full text-[11px] text-slate-300"
                  />
                  {budgetDocs.length > 0 && (
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Paperclip size={11} />
                      <span>{budgetDocs.map((d) => d.name).join(", ")}</span>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={budgetForm.submitForReview}
                    onChange={(e) => setBudgetForm({ ...budgetForm, submitForReview: e.target.checked })}
                  />
                  <span>Submit immediately for Finance Review (uncheck to save as Draft)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : budgetForm.submitForReview ? "Save & Submit Budget" : "Save Draft Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 2: MONTHLY BUDGET ALLOCATION                                 */}
      {/* ================================================================== */}
      {showAllocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Create Monthly Budget Allocation</h3>
              <button type="button" onClick={() => setShowAllocModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Approved Project Budget *</label>
                <select
                  value={allocForm.projectBudgetPlanId}
                  onChange={(e) => setAllocForm({ ...allocForm, projectBudgetPlanId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {approvedPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.budgetId} · {p.projectName} ({formatCurrency(p.approvedProjectBudget, currency)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAllocPlan && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Approved</span>
                    <span className="font-mono font-bold text-blue-400">{formatCurrency(selectedAllocHeadroom.approvedBudget, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Allocated</span>
                    <span className="font-mono font-bold text-slate-200">{formatCurrency(selectedAllocHeadroom.allocatedTotal, currency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Unallocated</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrency(selectedAllocHeadroom.remainingUnallocated, currency)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Budget Month *</label>
                  <input
                    type="month"
                    required
                    value={allocForm.budgetMonth}
                    onChange={(e) => setAllocForm({ ...allocForm, budgetMonth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Category *</label>
                  <select
                    value={allocForm.budgetCategory}
                    onChange={(e) => setAllocForm({ ...allocForm, budgetCategory: e.target.value as Part4BudgetCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {PART4_BUDGET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Allocated Amount ({currency}) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={allocForm.allocatedAmount}
                  onChange={(e) => setAllocForm({ ...allocForm, allocatedAmount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Notes</label>
                <input
                  value={allocForm.notes}
                  onChange={(e) => setAllocForm({ ...allocForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Monthly work schedule justification"
                />
              </div>

              {(permissions.isFinanceManager || permissions.isDirector) && (
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allocForm.autoApprove}
                    onChange={(e) => setAllocForm({ ...allocForm, autoApprove: e.target.checked })}
                  />
                  <span>Approve & activate allocation immediately</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowAllocModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer disabled:opacity-50">
                  {saving ? "Saving..." : "Save Allocation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 3: ACTUAL COST REGISTRATION                                  */}
      {/* ================================================================== */}
      {showCostModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Register Actual Project Cost Transaction</h3>
              <button type="button" onClick={() => setShowCostModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActualCost} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Project Name *</label>
                  <input
                    required
                    value={costForm.projectName}
                    onChange={(e) => setCostForm({ ...costForm, projectName: e.target.value })}
                    list="p4-projects-list"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                  <datalist id="p4-projects-list">
                    {budgetState.filterOptions.projects.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={costForm.transactionDate}
                    onChange={(e) => setCostForm({ ...costForm, transactionDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Budget Category *</label>
                  <select
                    value={costForm.budgetCategory}
                    onChange={(e) => setCostForm({ ...costForm, budgetCategory: e.target.value as Part4BudgetCategory })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {PART4_BUDGET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Source Module *</label>
                  <select
                    value={costForm.sourceModule}
                    onChange={(e) => setCostForm({ ...costForm, sourceModule: e.target.value as ActualCostSourceModule })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {ACTUAL_COST_SOURCE_MODULES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Cost Description *</label>
                <input
                  required
                  value={costForm.costDescription}
                  onChange={(e) => setCostForm({ ...costForm, costDescription: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Describe material, labor, equipment, or subcontractor charge"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={costForm.quantity}
                    onChange={(e) => setCostForm({ ...costForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Unit Price ({currency}) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={costForm.unitPrice}
                    onChange={(e) => setCostForm({ ...costForm, unitPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Paid So Far ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costForm.paidAmount}
                    onChange={(e) => setCostForm({ ...costForm, paidAmount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Supplier / Payee *</label>
                  <input
                    required
                    value={costForm.supplierOrPayee}
                    onChange={(e) => setCostForm({ ...costForm, supplierOrPayee: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Invoice Number</label>
                  <input
                    value={costForm.invoiceNumber}
                    onChange={(e) => setCostForm({ ...costForm, invoiceNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Voucher Number</label>
                  <input
                    value={costForm.paymentVoucherNumber}
                    onChange={(e) => setCostForm({ ...costForm, paymentVoucherNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Supporting Document (&lt;=400KB)</label>
                <input type="file" onChange={(e) => handleFileAttachment(e, setCostDocs)} className="text-[11px] text-slate-300" />
              </div>

              {(permissions.isFinanceManager || permissions.isDirector) && (
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={costForm.autoValidate}
                    onChange={(e) => setCostForm({ ...costForm, autoValidate: e.target.checked })}
                  />
                  <span>Validate immediately as official verified project cost</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowCostModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer disabled:opacity-50">
                  {saving ? "Saving..." : "Record Actual Cost"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 4: REQUEST BUDGET REVISION                                   */}
      {/* ================================================================== */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">Request Project Budget Revision</h3>
              <button type="button" onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Approved Project Budget *</label>
                <select
                  value={revisionForm.projectBudgetPlanId}
                  onChange={(e) => setRevisionForm({ ...revisionForm, projectBudgetPlanId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {approvedPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.budgetId} · {p.projectName} (Current: {formatCurrency(p.approvedProjectBudget, currency)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedRevPlan && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Original Baseline (Preserved)</span>
                    <span className="font-mono font-bold text-slate-200">
                      {formatCurrency(selectedRevPlan.originalApprovedBudget || selectedRevPlan.approvedProjectBudget, currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Approved Budget</span>
                    <span className="font-mono font-bold text-blue-400">
                      {formatCurrency(selectedRevPlan.approvedProjectBudget, currency)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Proposed Revised Budget ({currency}) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={revisionForm.proposedRevisedBudget}
                  onChange={(e) => setRevisionForm({ ...revisionForm, proposedRevisedBudget: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Revision Reason / Variation Justification *</label>
                <textarea
                  rows={3}
                  required
                  value={revisionForm.revisionReason}
                  onChange={(e) => setRevisionForm({ ...revisionForm, revisionReason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  placeholder="Describe variation order, market price escalation, or scope adjustment..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Supporting Variation Docs (&lt;=400KB)</label>
                <input type="file" onChange={(e) => handleFileAttachment(e, setRevisionDocs)} className="text-[11px] text-slate-300" />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setShowRevisionModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer disabled:opacity-50">
                  {saving ? "Submitting..." : "Submit Revision Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 5: INLINE REJECTION REASON MODAL                             */}
      {/* ================================================================== */}
      {rejectContext && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-white">Provide Rejection Reason</h3>
            <form onSubmit={handleConfirmReject} className="space-y-3 text-xs">
              <textarea
                rows={3}
                required
                value={rejectContext.reason}
                onChange={(e) => setRejectContext({ ...rejectContext, reason: e.target.value })}
                placeholder="Enter rejection justification for audit trail..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setRejectContext(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL 6: AUDIT TRAIL VIEWER                                        */}
      {/* ================================================================== */}
      {auditViewerTitle && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-white">{auditViewerTitle}</h3>
              <button type="button" onClick={() => setAuditViewerTitle(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {auditViewerEntries.length === 0 ? (
                <div className="text-slate-500 py-4 text-center">No audit trail events recorded.</div>
              ) : (
                auditViewerEntries.map((ev, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="flex justify-between font-bold text-white">
                      <span>{ev.action}</span>
                      <span className="font-mono text-[10px] text-slate-400">{String(ev.timestamp || "").slice(0, 16)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {ev.actorName} ({ev.actorRole}) {ev.stage ? `· ${ev.stage}` : ""}
                    </div>
                    {ev.notes && <div className="text-[11px] text-slate-300 mt-1">{ev.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
