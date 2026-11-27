import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  FileCheck2,
  FileText,
  History,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import {
  EvaluationCommitteeMember,
  ProcurementLineItem,
  ProcurementRequestRecord,
  ProcurementSupportingDoc,
  ProcurementWorkflowStatus,
  QuotationEvaluationScore,
  UserRole,
} from "../types";
import {
  canReadProcurementModule,
  canRolePerformProcurementAction,
  isDirectorOnlyRole,
  isEvaluationCommitteeRole,
  isProcurementOfficerRole,
  normalizeProcurementRole,
  PROCUREMENT_WORKFLOW_STAGES,
} from "../services/procurementRbac";
import {
  loadCachedProcurementSnapshot,
  ProcurementSnapshot,
  procurementService,
} from "../services/procurementService";

interface ProcurementWorkflowHubProps {
  isAmharic: boolean;
  currentUserRole: UserRole;
  currentUserProfile?: any;
  projects?: Array<{ id?: string; name?: string }>;
  onLogAction?: (action: string, details: string) => void;
}

const DEFAULT_PROJECTS = [
  { id: "PRJ-BOLE-01", name: "OVID Bole Heights Tower A" },
  { id: "PRJ-KAZ-02", name: "Kazanchis Commercial Podium B" },
  { id: "PRJ-CMC-03", name: "CMC Residential Complex Phase II" },
];

const STAGE_ORDER: ProcurementWorkflowStatus[] = [
  "Draft",
  "Submitted for Evaluation",
  "Quotation Collection",
  "Under Evaluation",
  "Award Recommended",
  "Budget Approved",
  "PO Authorized",
  "Executed",
];

function getStatusBadgeClass(status: ProcurementWorkflowStatus): string {
  switch (status) {
    case "Executed":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "PO Authorized":
      return "bg-teal-100 text-teal-800 border-teal-300";
    case "Budget Approved":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "Award Recommended":
      return "bg-violet-100 text-violet-800 border-violet-300";
    case "Quotation Collection":
    case "Under Evaluation":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "Submitted for Evaluation":
    case "Resubmitted":
      return "bg-sky-100 text-sky-800 border-sky-300";
    case "Rejected":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

export const ProcurementWorkflowHub: React.FC<ProcurementWorkflowHubProps> = ({
  isAmharic,
  currentUserRole,
  currentUserProfile,
  projects,
  onLogAction,
}) => {
  const normalizedRole = normalizeProcurementRole(currentUserRole);
  const isOfficer = isProcurementOfficerRole(normalizedRole);
  const isCommittee = isEvaluationCommitteeRole(normalizedRole);
  const isDirector = isDirectorOnlyRole(normalizedRole);
  const canRead = canReadProcurementModule(normalizedRole);

  const projectOptions = useMemo(() => {
    const valid = (projects || []).filter((p) => p?.name);
    return valid.length > 0 ? valid : DEFAULT_PROJECTS;
  }, [projects]);

  const [snapshot, setSnapshot] = useState<ProcurementSnapshot>(() => loadCachedProcurementSnapshot());
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeDetailTab, setActiveDetailTab] = useState<"workflow" | "quotations" | "evaluation" | "audit">("workflow");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Create PR state (Procurement Officer)
  const [prTitle, setPrTitle] = useState("");
  const [prProject, setPrProject] = useState(projectOptions[0]?.name || "OVID Bole Heights Tower A");
  const [prDeliveryDate, setPrDeliveryDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [prJustification, setPrJustification] = useState("");
  const [prSpecDocName, setPrSpecDocName] = useState("");
  const [prSpecDocRef, setPrSpecDocRef] = useState("");
  const [prItems, setPrItems] = useState<ProcurementLineItem[]>([
    {
      id: "ITEM-1",
      description: "",
      quantity: 1,
      unit: "Pcs",
      specification: "",
      estimatedUnitCostEtb: 0,
    },
  ]);

  // Resubmission / Rejection comment state
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resubmitComment, setResubmitComment] = useState("");

  // Quotation form state (Evaluation Committee)
  const [qSupplierName, setQSupplierName] = useState("");
  const [qSupplierContact, setQSupplierContact] = useState("");
  const [qSupplierTin, setQSupplierTin] = useState("");
  const [qTotalEtb, setQTotalEtb] = useState("");
  const [qLeadDays, setQLeadDays] = useState("7");
  const [qPaymentTerms, setQPaymentTerms] = useState("30% Advance, 70% Upon Delivery");
  const [qTechNotes, setQTechNotes] = useState("");
  const [qDocName, setQDocName] = useState("");
  const [qDocRef, setQDocRef] = useState("");

  // Evaluation Committee recommendation state
  const [committeeMembers, setCommitteeMembers] = useState<EvaluationCommitteeMember[]>([
    { name: currentUserProfile?.displayName || currentUserProfile?.name || "", role: "Evaluation Committee Chair" },
    { name: "", role: "Technical Evaluator" },
    { name: "", role: "Financial Evaluator" },
  ]);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { tech: string; fin: string; remarks: string }>>({});
  const [recommendedQuotationId, setRecommendedQuotationId] = useState("");
  const [evalReasons, setEvalReasons] = useState("");
  const [evalSummary, setEvalSummary] = useState("");
  const [evalDocName, setEvalDocName] = useState("Committee Quotation Evaluation Report");
  const [evalDocRef, setEvalDocRef] = useState("");

  // Director Budget Allocation & PO state
  const [budgetAmountEtb, setBudgetAmountEtb] = useState("");
  const [budgetLine, setBudgetLine] = useState("CAPEX-MAT-2026");
  const [costCenter, setCostCenter] = useState("Main Construction Procurement");
  const [budgetComments, setBudgetComments] = useState("");
  const [poDeliveryTerms, setPoDeliveryTerms] = useState("Site Delivery with GRV & Inspection");

  // Execution state
  const [execRef, setExecRef] = useState("");
  const [execNotes, setExecNotes] = useState("");

  const refreshSnapshot = async () => {
    try {
      const data = await procurementService.fetchSnapshot();
      setSnapshot(data);
      if (!selectedRequestId && data.requests.length > 0) {
        setSelectedRequestId(data.requests[0]!.id);
      }
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Failed to load procurement records." });
    }
  };

  useEffect(() => {
    if (!canRead) return;
    refreshSnapshot();
    const unsub = procurementService.subscribeCollections((partial) => {
      setSnapshot((prev) => ({
        requests: partial.requests ?? prev.requests,
        quotations: partial.quotations ?? prev.quotations,
        evaluations: partial.evaluations ?? prev.evaluations,
        budgetAllocations: partial.budgetAllocations ?? prev.budgetAllocations,
        orders: partial.orders ?? prev.orders,
        auditLogs: partial.auditLogs ?? prev.auditLogs,
      }));
    });
    return () => unsub();
  }, [canRead]);

  const sortedRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...snapshot.requests]
      .filter((r) => {
        if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
        if (!q) return true;
        return (
          r.requestNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q) ||
          (r.recommendedSupplierName || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  }, [snapshot.requests, searchTerm, statusFilter]);

  const selectedRequest: ProcurementRequestRecord | undefined = useMemo(
    () => snapshot.requests.find((r) => r.id === selectedRequestId) || sortedRequests[0],
    [snapshot.requests, selectedRequestId, sortedRequests]
  );

  const selectedQuotations = useMemo(
    () => (selectedRequest ? snapshot.quotations.filter((q) => q.requestId === selectedRequest.id) : []),
    [snapshot.quotations, selectedRequest]
  );

  const selectedEvaluation = useMemo(
    () =>
      selectedRequest
        ? snapshot.evaluations.find((e) => e.id === selectedRequest.evaluationId || e.requestId === selectedRequest.id)
        : undefined,
    [snapshot.evaluations, selectedRequest]
  );

  const selectedBudget = useMemo(
    () =>
      selectedRequest
        ? snapshot.budgetAllocations.find(
            (b) => b.id === selectedRequest.budgetAllocationId || b.requestId === selectedRequest.id
          )
        : undefined,
    [snapshot.budgetAllocations, selectedRequest]
  );

  const selectedOrder = useMemo(
    () =>
      selectedRequest
        ? snapshot.orders.find((o) => o.id === selectedRequest.poId || o.requestId === selectedRequest.id)
        : undefined,
    [snapshot.orders, selectedRequest]
  );

  const selectedAuditLogs = useMemo(
    () =>
      selectedRequest
        ? [...snapshot.auditLogs]
            .filter((l) => l.requestId === selectedRequest.id)
            .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
        : [],
    [snapshot.auditLogs, selectedRequest]
  );

  useEffect(() => {
    if (selectedRequest && selectedEvaluation && !budgetAmountEtb) {
      setBudgetAmountEtb(String(selectedEvaluation.recommendedAmountEtb || selectedRequest.estimatedTotalEtb || ""));
    } else if (selectedRequest && !budgetAmountEtb) {
      setBudgetAmountEtb(String(selectedRequest.estimatedTotalEtb || ""));
    }
  }, [selectedRequest?.id, selectedEvaluation?.id]);

  useEffect(() => {
    if (selectedQuotations.length > 0 && !recommendedQuotationId) {
      setRecommendedQuotationId(selectedQuotations[0]!.id);
    }
  }, [selectedQuotations]);

  if (!canRead) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
        <Ban className="mx-auto text-red-600" size={36} />
        <h2 className="text-lg font-black text-slate-900">
          {isAmharic ? "የግዢ ቁጥጥር ሞጁል መዳረሻ ተከልክሏል" : "Procurement Governance Access Restricted"}
        </h2>
        <p className="text-sm text-slate-600">
          {isAmharic
            ? `የአሁኑ ሚናዎ (${currentUserRole}) ለግዢ አስተዳደር ሞጁል አልተፈቀደም።`
            : `Your current role (${currentUserRole}) does not have permission to access the Procurement Governance Portal.`}
        </p>
      </div>
    );
  }

  const runAction = async (fn: () => Promise<void>, successMessage: string, auditDetails?: string) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      await refreshSnapshot();
      setFeedback({ type: "ok", text: successMessage });
      if (auditDetails && onLogAction) {
        onLogAction("Procurement Workflow Action", auditDetails);
      }
    } catch (err: any) {
      setFeedback({ type: "err", text: err?.message || "Action rejected by server security policy." });
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePr = async (submitImmediately: boolean) => {
    const cleanItems = prItems.map((it, idx) => ({
      ...it,
      id: it.id || `ITEM-${idx + 1}`,
      quantity: Number(it.quantity || 0),
      estimatedUnitCostEtb: Number(it.estimatedUnitCostEtb || 0),
    }));
    const estimatedTotalEtb = cleanItems.reduce(
      (sum, it) => sum + Number(it.quantity || 0) * Number(it.estimatedUnitCostEtb || 0),
      0
    );
    const docs: ProcurementSupportingDoc[] =
      prSpecDocName.trim() && prSpecDocRef.trim()
        ? [
            {
              id: `DOC-${Date.now()}`,
              name: prSpecDocName.trim(),
              category: "Specification",
              urlOrRef: prSpecDocRef.trim(),
              uploadedBy: currentUserProfile?.displayName || normalizedRole,
              uploadedByUid: currentUserProfile?.uid || "",
              uploadedAt: new Date().toISOString(),
            },
          ]
        : [];

    await runAction(
      async () => {
        const res = await procurementService.createPurchaseRequest({
          title: prTitle,
          projectId: prProject,
          projectName: prProject,
          requiredDeliveryDate: prDeliveryDate,
          justification: prJustification || "Construction project material requisition",
          estimatedTotalEtb,
          items: cleanItems,
          supportingDocuments: docs,
          submitImmediately,
        });
        setSelectedRequestId(res.request.id);
        setShowCreateForm(false);
        setPrTitle("");
        setPrJustification("");
        setPrSpecDocName("");
        setPrSpecDocRef("");
        setPrItems([
          { id: "ITEM-1", description: "", quantity: 1, unit: "Pcs", specification: "", estimatedUnitCostEtb: 0 },
        ]);
      },
      submitImmediately
        ? "Purchase Request created and submitted for Evaluation Committee quotation collection."
        : "Purchase Request saved as Draft.",
      `PR "${prTitle}" (${submitImmediately ? "Submitted for Evaluation" : "Draft"})`
    );
  };

  const handleSubmitOrResubmit = async (req: ProcurementRequestRecord) => {
    await runAction(
      async () => {
        await procurementService.submitOrResubmitRequest(req.id, {
          comment: resubmitComment.trim() || undefined,
        });
        setResubmitComment("");
      },
      req.status === "Rejected"
        ? `Resubmitted ${req.requestNumber} with revision comments for evaluation.`
        : `Submitted ${req.requestNumber} for quotation collection.`,
      `Submitted PR ${req.requestNumber}`
    );
  };

  const handleAddQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    await runAction(
      async () => {
        await procurementService.collectQuotation(selectedRequest.id, {
          supplierName: qSupplierName,
          supplierContact: qSupplierContact,
          supplierTin: qSupplierTin,
          totalAmountEtb: Number(qTotalEtb),
          currency: "ETB",
          deliveryLeadTimeDays: Number(qLeadDays || 7),
          paymentTerms: qPaymentTerms,
          technicalComplianceNotes: qTechNotes,
          attachmentName: qDocName,
          attachmentUrlOrRef: qDocRef,
        });
        setQSupplierName("");
        setQSupplierContact("");
        setQSupplierTin("");
        setQTotalEtb("");
        setQTechNotes("");
        setQDocName("");
        setQDocRef("");
      },
      `Supplier quotation from "${qSupplierName}" registered.`,
      `Collected quotation from ${qSupplierName} for ${selectedRequest.requestNumber}`
    );
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    const quotationScores: QuotationEvaluationScore[] = selectedQuotations.map((q) => {
      const s = scoreInputs[q.id] || { tech: "80", fin: "80", remarks: "Evaluated" };
      const tech = Number(s.tech || 0);
      const fin = Number(s.fin || 0);
      return {
        quotationId: q.id,
        supplierName: q.supplierName,
        technicalScore: tech,
        financialScore: fin,
        weightedTotalScore: Number((tech * 0.6 + fin * 0.4).toFixed(2)),
        remarks: s.remarks || "Evaluated by committee",
      };
    });

    const supportingDocuments: ProcurementSupportingDoc[] =
      evalDocName.trim() && evalDocRef.trim()
        ? [
            {
              id: `EDOC-${Date.now()}`,
              name: evalDocName.trim(),
              category: "Evaluation Report",
              urlOrRef: evalDocRef.trim(),
              uploadedBy: currentUserProfile?.displayName || normalizedRole,
              uploadedByUid: currentUserProfile?.uid || "",
              uploadedAt: new Date().toISOString(),
            },
          ]
        : [];

    await runAction(
      async () => {
        await procurementService.submitEvaluationRecommendation(selectedRequest.id, {
          committeeMembers: committeeMembers.filter((m) => m.name.trim().length > 0),
          quotationScores,
          recommendedQuotationId,
          recommendationReasons: evalReasons,
          evaluationReportSummary: evalSummary || evalReasons,
          supportingDocuments,
        });
      },
      `Winner recommendation submitted to Director for budget allocation approval.`,
      `Evaluation recommendation submitted for ${selectedRequest.requestNumber}`
    );
  };

  const handleDirectorBudgetDecision = async (decision: "Approved" | "Rejected") => {
    if (!selectedRequest) return;
    await runAction(
      async () => {
        await procurementService.submitDirectorBudgetDecision(selectedRequest.id, {
          decision,
          allocatedBudgetEtb: decision === "Approved" ? Number(budgetAmountEtb) : 0,
          budgetLine,
          costCenter,
          fiscalYear: String(new Date().getFullYear()),
          comments: budgetComments,
        });
        setBudgetComments("");
      },
      decision === "Approved"
        ? `Director allocated ETB ${Number(budgetAmountEtb).toLocaleString()} for ${selectedRequest.requestNumber}.`
        : `Director rejected budget allocation for ${selectedRequest.requestNumber}.`,
      `Director budget decision (${decision}) for ${selectedRequest.requestNumber}`
    );
  };

  const handleAuthorizePo = async () => {
    if (!selectedRequest) return;
    await runAction(
      async () => {
        await procurementService.authorizePurchaseOrder(selectedRequest.id, {
          authorizedAmountEtb: Number(budgetAmountEtb || selectedRequest.allocatedBudgetEtb || 0),
          deliveryTerms: poDeliveryTerms,
        });
      },
      `Contract / Purchase Order authorized by Director. Execution is now unlocked.`,
      `Director authorized PO for ${selectedRequest.requestNumber}`
    );
  };

  const handleExecute = async () => {
    if (!selectedRequest) return;
    await runAction(
      async () => {
        await procurementService.executeProcurement(selectedRequest.id, {
          executionReference: execRef || undefined,
          executionNotes: execNotes || undefined,
        });
        setExecRef("");
        setExecNotes("");
      },
      `Procurement executed for ${selectedRequest.requestNumber}.`,
      `Executed procurement for ${selectedRequest.requestNumber}`
    );
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    await runAction(
      async () => {
        await procurementService.rejectRequest(selectedRequest.id, rejectComment);
        setRejectComment("");
        setShowRejectModal(false);
      },
      `Request ${selectedRequest.requestNumber} rejected with comments.`,
      `Rejected ${selectedRequest.requestNumber}`
    );
  };

  const canCreatePr = canRolePerformProcurementAction(normalizedRole, "CREATE_PR").allowed;
  const canSubmitPr = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "SUBMIT_PR", selectedRequest).allowed
    : false;
  const canCollectQuote = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "COLLECT_QUOTATION", selectedRequest).allowed
    : false;
  const canEvaluate = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "EVALUATE_AND_RECOMMEND", selectedRequest).allowed
    : false;
  const canApproveBudget = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "APPROVE_BUDGET", selectedRequest).allowed
    : false;
  const canAuthorizePo = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "AUTHORIZE_PO", selectedRequest).allowed
    : false;
  const canExecute = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "EXECUTE_PROCUREMENT", selectedRequest).allowed
    : false;
  const canReject = selectedRequest
    ? canRolePerformProcurementAction(normalizedRole, "REJECT_REQUEST", selectedRequest).allowed
    : false;

  const activeStageIndex = selectedRequest
    ? STAGE_ORDER.indexOf(selectedRequest.status === "Resubmitted" ? "Submitted for Evaluation" : selectedRequest.status)
    : -1;

  return (
    <div className="space-y-6">
      {/* Top Governance Header & Role Authority Matrix */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-red-600 rounded-xl">
                <ShoppingCart size={20} />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-red-400">
                {isAmharic ? "የግዢ ሥልጣንና የሥራ ድርሻ መቆጣጠሪያ" : "Procurement Authority & Governance Workflow"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {isAmharic ? "ዲጂታል የግዢ አስተዳደር ሥርዓት" : "Three-Tier Procurement Authority & Approval Portal"}
            </h1>
            <p className="text-xs text-slate-300">
              {isAmharic
                ? "የግዢ ኦፊሰር (ጥያቄ) → የግምገማ ኮሚቴ (ዋጋና አሸናፊ) → ዳይሬክተር (በጀትና PO ፈቃድ) → አፈፃፀም"
                : "Procurement Officer (PR) → Evaluation Committee (Quotations & Winner) → Director (Budget & PO Authorization) → Execution"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>{isAmharic ? `ሚና፡ ${normalizedRole}` : `Active Role: ${normalizedRole}`}</span>
            </span>
            <button
              onClick={refreshSnapshot}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={busy ? "animate-spin" : ""} />
              <span>{isAmharic ? "አድስ" : "Refresh"}</span>
            </button>
            {canCreatePr && (
              <button
                onClick={() => setShowCreateForm((v) => !v)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus size={14} />
                <span>{isAmharic ? "አዲስ የግዢ ጥያቄ" : "New Purchase Request"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Authority Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className={`p-3.5 rounded-xl border ${isOfficer ? "bg-cyan-950/50 border-cyan-500/70" : "bg-slate-800/60 border-slate-700/70"}`}>
            <div className="flex items-center justify-between font-black text-cyan-300 mb-1">
              <span>1. {isAmharic ? "የግዢ ኦፊሰር" : "Procurement Officer"}</span>
              {isOfficer && <span className="text-[10px] bg-cyan-500/20 px-2 py-0.5 rounded">YOU</span>}
            </div>
            <p className="text-slate-300 text-[11px]">
              {isAmharic
                ? "የግዢ ጥያቄ መፍጠር፣ መግለጫ/ብዛት/የመድረሻ ቀን ማስገባትና መላክ። ዋጋ መገምገም ወይም በጀት ማጽደቅ አይችልም።"
                : "Create PRs, enter item specs, quantities & delivery dates, submit for evaluation. Blocked from quotation evaluation, winner selection & budget approval."}
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border ${isCommittee ? "bg-violet-950/50 border-violet-500/70" : "bg-slate-800/60 border-slate-700/70"}`}>
            <div className="flex items-center justify-between font-black text-violet-300 mb-1">
              <span>2. {isAmharic ? "የግምገማ ኮሚቴ" : "Evaluation Committee"}</span>
              {isCommittee && <span className="text-[10px] bg-violet-500/20 px-2 py-0.5 rounded">YOU</span>}
            </div>
            <p className="text-slate-300 text-[11px]">
              {isAmharic
                ? "የአቅራቢ ዋጋዎችን መሰብሰብ፣ ማወዳደር፣ ቴክኒካልና ፋይናንሻል ነጥብ መስጠት፣ አሸናፊ መምረጥና ከሰነዶች ጋር ማቅረብ።"
                : "Collect & compare quotations, evaluate technical & financial offers with member names, scores, reasons & docs, recommend winner."}
            </p>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDirector ? "bg-red-950/50 border-red-500/70" : "bg-slate-800/60 border-slate-700/70"}`}>
            <div className="flex items-center justify-between font-black text-red-300 mb-1">
              <span>3. {isAmharic ? "ዳይሬክተር (ብቸኛ የበጀት ባለስልጣን)" : "Director (Exclusive Budget Authority)"}</span>
              {isDirector && <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded">YOU</span>}
            </div>
            <p className="text-slate-300 text-[11px]">
              {isAmharic
                ? "ምክረ ሃሳቦችን መገምገም፣ የፕሮጀክት በጀት መመደብና ማጽደቅ ወይም መቃወም፣ እና ውል/PO መፍቀድ።"
                : "Review award recommendations, approve or reject budget allocation, allocate project procurement budget & authorize Contract/PO."}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
            feedback.type === "ok"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "ok" ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline text-[11px] cursor-pointer">
            {isAmharic ? "ዝጋ" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Create Purchase Request Form (Procurement Officer ONLY) */}
      {showCreateForm && canCreatePr && (
        <div className="bg-white rounded-2xl border border-cyan-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-cyan-600" />
              <span>{isAmharic ? "አዲስ የግዢ ጥያቄ ዝግጅት (Procurement Officer)" : "Create Purchase Requisition / Purchase Order Request"}</span>
            </h2>
            <button onClick={() => setShowCreateForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
              {isAmharic ? "ሰርዝ" : "Cancel"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">{isAmharic ? "የግዢው ርዕስ *" : "Requisition Title *"}</label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder="e.g. Reinforcement Steel Bars & Formwork Pins"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">{isAmharic ? "ፕሮጀክት *" : "Project *"}</label>
              <select
                value={prProject}
                onChange={(e) => setPrProject(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold bg-white"
              >
                {projectOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">{isAmharic ? "የሚያስፈልግበት የመድረሻ ቀን *" : "Required Delivery Date *"}</label>
              <input
                type="date"
                value={prDeliveryDate}
                onChange={(e) => setPrDeliveryDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 uppercase">
                {isAmharic ? "የእቃዎች ዝርዝር፣ ብዛት እና ቴክኒካል መግለጫ" : "Line Items, Quantities & Technical Specifications"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPrItems((prev) => [
                    ...prev,
                    {
                      id: `ITEM-${prev.length + 1}`,
                      description: "",
                      quantity: 1,
                      unit: "Pcs",
                      specification: "",
                      estimatedUnitCostEtb: 0,
                    },
                  ])
                }
                className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} /> {isAmharic ? "እቃ ጨምር" : "Add Line Item"}
              </button>
            </div>

            {prItems.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500">Description *</label>
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) =>
                      setPrItems((prev) => prev.map((row, i) => (i === idx ? { ...row, description: e.target.value } : row)))
                    }
                    placeholder="Item description"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-500">Specification *</label>
                  <input
                    type="text"
                    value={it.specification}
                    onChange={(e) =>
                      setPrItems((prev) => prev.map((row, i) => (i === idx ? { ...row, specification: e.target.value } : row)))
                    }
                    placeholder="Grade, dimension, standard"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) =>
                      setPrItems((prev) => prev.map((row, i) => (i === idx ? { ...row, quantity: Number(e.target.value) } : row)))
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500">Unit</label>
                  <input
                    type="text"
                    value={it.unit}
                    onChange={(e) =>
                      setPrItems((prev) => prev.map((row, i) => (i === idx ? { ...row, unit: e.target.value } : row)))
                    }
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                  />
                </div>
                <div className="md:col-span-2 flex items-end gap-1.5">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-500">Est. Unit ETB</label>
                    <input
                      type="number"
                      min={0}
                      value={it.estimatedUnitCostEtb || 0}
                      onChange={(e) =>
                        setPrItems((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, estimatedUnitCostEtb: Number(e.target.value) } : row))
                        )
                      }
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white font-mono"
                    />
                  </div>
                  {prItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPrItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-600 block mb-1">{isAmharic ? "የግዢ ምክንያት" : "Justification"}</label>
              <input
                type="text"
                value={prJustification}
                onChange={(e) => setPrJustification(e.target.value)}
                placeholder="Urgency / engineering BOQ reference"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">{isAmharic ? "የቴክኒክ ሰነድ ስም" : "Spec Doc Name (optional)"}</label>
              <input
                type="text"
                value={prSpecDocName}
                onChange={(e) => setPrSpecDocName(e.target.value)}
                placeholder="BOQ_Rebar_Specs.pdf"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">{isAmharic ? "የሰነድ አድራሻ / ማጣቀሻ" : "Spec Doc URL / Ref"}</label>
              <input
                type="text"
                value={prSpecDocRef}
                onChange={(e) => setPrSpecDocRef(e.target.value)}
                placeholder="https://... or DOC-REF-001"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleCreatePr(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {isAmharic ? "እንደ ረቂቅ አስቀምጥ (Save Draft)" : "Save as Draft"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleCreatePr(true)}
              className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={13} />
              <span>{isAmharic ? "ለግምገማ ኮሚቴ ላክ" : "Submit Purchase Request for Evaluation"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Governance Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Queue */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase text-slate-700">
              {isAmharic ? `የግዢ ጥያቄዎች (${sortedRequests.length})` : `Purchase Requisitions (${sortedRequests.length})`}
            </h2>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isAmharic ? "ፈልግ (ቁጥር፣ ርዕስ፣ ፕሮጀክት)..." : "Search PR#, title, project..."}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold"
          >
            <option value="ALL">{isAmharic ? "ሁሉም ደረጃዎች" : "All Workflow Stages"}</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="Rejected">Rejected</option>
          </select>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {sortedRequests.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                {isAmharic
                  ? "ምንም የግዢ ጥያቄ አልተገኘም።"
                  : "No purchase requisitions recorded yet."}
              </div>
            ) : (
              sortedRequests.map((req) => {
                const isSelected = selectedRequest?.id === req.id;
                return (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequestId(req.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow"
                        : "bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-[10px] font-bold ${isSelected ? "text-red-300" : "text-slate-500"}`}>
                        {req.requestNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getStatusBadgeClass(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold line-clamp-1">{req.title}</div>
                    <div className={`text-[11px] flex items-center justify-between ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                      <span className="truncate">{req.projectName}</span>
                      <span className="font-mono font-bold">ETB {Number(req.estimatedTotalEtb || 0).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Stage Controls */}
        <div className="lg:col-span-8 space-y-5">
          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
              <ShoppingCart className="mx-auto text-slate-400" size={32} />
              <p className="text-sm font-bold text-slate-700">
                {isAmharic ? "ዝርዝሩን ለማየት ከግራ በኩል አንድ የግዢ ጥያቄ ይምረጡ።" : "Select a Purchase Request to inspect its workflow, quotations, evaluation, and approvals."}
              </p>
            </div>
          ) : (
            <>
              {/* Automated Workflow Progress Stepper */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-red-600">{selectedRequest.requestNumber}</span>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${getStatusBadgeClass(selectedRequest.status)}`}>
                        {selectedRequest.status}
                      </span>
                      {selectedRequest.poNumber && (
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-[10px] font-bold">
                          {selectedRequest.poNumber}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-black text-slate-900 mt-1">{selectedRequest.title}</h2>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Building2 size={12} /> {selectedRequest.projectName}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> Delivery: {selectedRequest.requiredDeliveryDate}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> By: {selectedRequest.createdByName}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      {selectedRequest.allocatedBudgetEtb
                        ? isAmharic ? "የጸደቀ በጀት" : "Director Allocated Budget"
                        : isAmharic ? "ግምታዊ ዋጋ" : "Estimated Budget"}
                    </div>
                    <div className="text-lg font-black font-mono text-slate-900">
                      ETB {Number(selectedRequest.allocatedBudgetEtb || selectedRequest.estimatedTotalEtb || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Rejection Banner & Resubmission */}
                {selectedRequest.status === "Rejected" && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                    <div className="flex items-start gap-2 text-red-800 text-xs">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black">
                          Rejected by {selectedRequest.lastRejectedByName} ({selectedRequest.lastRejectedByRole})
                        </div>
                        <p className="mt-0.5">{selectedRequest.lastRejectionReason}</p>
                      </div>
                    </div>
                    {canSubmitPr && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={resubmitComment}
                          onChange={(e) => setResubmitComment(e.target.value)}
                          placeholder={isAmharic ? "የማስተካከያ አስተያየት ያስገቡ (ግዴታ)..." : "Mandatory resubmission comment explaining revisions..."}
                          className="flex-1 border border-red-300 rounded-lg px-3 py-1.5 text-xs bg-white"
                        />
                        <button
                          onClick={() => handleSubmitOrResubmit(selectedRequest)}
                          disabled={busy || !resubmitComment.trim()}
                          className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>{isAmharic ? "አስተካክለህ እንደገና ላክ" : "Resubmit Request"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Visual 8-Step Stepper */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROCUREMENT_WORKFLOW_STAGES.map((st, idx) => {
                    const done = activeStageIndex > idx || (activeStageIndex === idx && selectedRequest.status === "Executed");
                    const current = activeStageIndex === idx && selectedRequest.status !== "Executed";
                    return (
                      <div
                        key={st.key}
                        className={`p-2.5 rounded-xl border text-[11px] ${
                          done
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : current
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="font-black truncate">{isAmharic ? st.labelAm : st.labelEn}</div>
                        <div className="text-[10px] opacity-80 truncate">{st.responsibleRole}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Detail Sub-tabs */}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {[
                    { id: "workflow", label: isAmharic ? "የስራ ሂደትና እርምጃዎች" : "Workflow & Approvals", icon: ClipboardCheck },
                    { id: "quotations", label: isAmharic ? `ዋጋዎች (${selectedQuotations.length})` : `Quotations (${selectedQuotations.length})`, icon: Scale },
                    { id: "evaluation", label: isAmharic ? "የኮሚቴ ግምገማ" : "Evaluation Report", icon: Award },
                    { id: "audit", label: isAmharic ? `የኦዲት መዝገብ (${selectedAuditLogs.length})` : `Approval History & Audit (${selectedAuditLogs.length})`, icon: History },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDetailTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                          activeDetailTab === tab.id
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Icon size={13} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUB-TAB 1: WORKFLOW & APPROVAL ACTIONS */}
              {activeDetailTab === "workflow" && (
                <div className="space-y-4">
                  {/* Line Items Table */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-700">
                      {isAmharic ? "የተጠየቁ እቃዎች እና መግለጫ" : "Requested Items & Technical Specifications"}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                          <tr>
                            <th className="p-2">Item Description</th>
                            <th className="p-2">Specification</th>
                            <th className="p-2">Quantity</th>
                            <th className="p-2">Est. Unit ETB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedRequest.items || []).map((item) => (
                            <tr key={item.id}>
                              <td className="p-2 font-bold text-slate-800">{item.description}</td>
                              <td className="p-2 text-slate-600">{item.specification}</td>
                              <td className="p-2 font-mono">{item.quantity} {item.unit}</td>
                              <td className="p-2 font-mono">{Number(item.estimatedUnitCostEtb || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Draft Submit Action (Procurement Officer) */}
                  {selectedRequest.status === "Draft" && canSubmitPr && (
                    <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="text-xs text-cyan-900">
                        <div className="font-black">Draft Purchase Request</div>
                        <div>Submit this Purchase Request to the Evaluation Committee for supplier quotation collection.</div>
                      </div>
                      <button
                        onClick={() => handleSubmitOrResubmit(selectedRequest)}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={13} />
                        <span>{isAmharic ? "ለግምገማ ላክ" : "Submit for Evaluation"}</span>
                      </button>
                    </div>
                  )}

                  {/* Director Budget Allocation Panel */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                        <DollarSign size={15} className="text-red-600" />
                        <span>
                          {isAmharic
                            ? "የዳይሬክተር የበጀት ፈቃድ እና PO ማጽደቂያ"
                            : "Director Budget Allocation & Contract / PO Authorization"}
                        </span>
                      </h3>
                      {!isDirector && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                          <Lock size={11} /> Director Authority Only
                        </span>
                      )}
                    </div>

                    {selectedBudget ? (
                      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1">
                        <div className="font-black text-blue-900">
                          {selectedBudget.allocationNumber} — {selectedBudget.decision} (ETB{" "}
                          {Number(selectedBudget.allocatedBudgetEtb || 0).toLocaleString()})
                        </div>
                        <div className="text-blue-800">
                          Budget Line: {selectedBudget.budgetLine} | Cost Center: {selectedBudget.costCenter} | Authorized by:{" "}
                          {selectedBudget.authorizedByName} ({selectedBudget.authorizedByRole})
                        </div>
                        {selectedBudget.comments && <div className="text-blue-700 italic">"{selectedBudget.comments}"</div>}
                      </div>
                    ) : canApproveBudget ? (
                      <div className="space-y-3 bg-red-50/40 border border-red-200 rounded-xl p-4">
                        <div className="text-xs font-bold text-slate-800">
                          Recommended Winner: <span className="text-red-700">{selectedRequest.recommendedSupplierName}</span>{" "}
                          (Score: {selectedEvaluation?.totalScore ?? "N/A"}/100 | Quote: ETB{" "}
                          {Number(selectedEvaluation?.recommendedAmountEtb || 0).toLocaleString()})
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">Allocated Budget (ETB) *</label>
                            <input
                              type="number"
                              value={budgetAmountEtb}
                              onChange={(e) => setBudgetAmountEtb(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">Project Budget Line *</label>
                            <input
                              type="text"
                              value={budgetLine}
                              onChange={(e) => setBudgetLine(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-600 block mb-1">Cost Center *</label>
                            <input
                              type="text"
                              value={costCenter}
                              onChange={(e) => setCostCenter(e.target.value)}
                              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                            />
                          </div>
                        </div>
                        <textarea
                          rows={2}
                          value={budgetComments}
                          onChange={(e) => setBudgetComments(e.target.value)}
                          placeholder="Director authorization notes or mandatory rejection reasons..."
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                        />
                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            onClick={() => handleDirectorBudgetDecision("Rejected")}
                            disabled={busy || !budgetComments.trim()}
                            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 text-xs font-bold cursor-pointer"
                          >
                            {isAmharic ? "በጀቱን ውድቅ አድርግ" : "Reject Budget Allocation"}
                          </button>
                          <button
                            onClick={() => handleDirectorBudgetDecision("Approved")}
                            disabled={busy || Number(budgetAmountEtb) <= 0}
                            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
                          >
                            {isAmharic ? "በጀት መድብና አጽድቅ" : "Approve & Allocate Project Budget"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        {selectedRequest.status === "Award Recommended"
                          ? "Awaiting Director review and exclusive budget allocation decision."
                          : "Budget allocation opens after Evaluation Committee submits an Award Recommendation."}
                      </div>
                    )}

                    {/* PO Authorization Step */}
                    {selectedOrder ? (
                      <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs space-y-1">
                        <div className="font-black text-teal-900">
                          Contract / Purchase Order {selectedOrder.poNumber} — {selectedOrder.status}
                        </div>
                        <div className="text-teal-800">
                          Supplier: {selectedOrder.supplierName} | Authorized Amount: ETB{" "}
                          {Number(selectedOrder.authorizedAmountEtb || 0).toLocaleString()} | Authorized By:{" "}
                          {selectedOrder.authorizedByName}
                        </div>
                      </div>
                    ) : canAuthorizePo ? (
                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3 text-xs">
                        <div className="font-black text-teal-900">Ready for Contract / Purchase Order Authorization</div>
                        <input
                          type="text"
                          value={poDeliveryTerms}
                          onChange={(e) => setPoDeliveryTerms(e.target.value)}
                          placeholder="Contract & delivery terms"
                          className="w-full border border-teal-300 rounded-lg px-3 py-2 bg-white"
                        />
                        <button
                          onClick={handleAuthorizePo}
                          disabled={busy}
                          className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileCheck2 size={14} />
                          <span>{isAmharic ? "ውል / PO አጽድቅ" : "Authorize Contract / Purchase Order"}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Execution Gate */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                      <Truck size={15} className="text-emerald-600" />
                      <span>{isAmharic ? "የግዢ አፈፃፀም (Procurement Execution Gate)" : "Procurement Execution Gate"}</span>
                    </h3>

                    {selectedRequest.status === "Executed" ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                        <div className="font-black">Procurement Executed</div>
                        <div>
                          Executed by {selectedRequest.executedByName} on{" "}
                          {selectedRequest.executedAt ? new Date(selectedRequest.executedAt).toLocaleString() : ""}
                        </div>
                        {selectedRequest.executionNotes && <div className="mt-1">{selectedRequest.executionNotes}</div>}
                      </div>
                    ) : canExecute ? (
                      <div className="space-y-3 bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={execRef}
                            onChange={(e) => setExecRef(e.target.value)}
                            placeholder="Dispatch / Contract Execution Reference (e.g. EXEC-2026-01)"
                            className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
                          />
                          <input
                            type="text"
                            value={execNotes}
                            onChange={(e) => setExecNotes(e.target.value)}
                            placeholder="Execution & supplier dispatch notes"
                            className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
                          />
                        </div>
                        <button
                          onClick={handleExecute}
                          disabled={busy}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                        >
                          {isAmharic ? "ግዢውን ፈጽም (Record Execution)" : "Confirm & Record Procurement Execution"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                        <Lock size={14} className="text-slate-500 shrink-0" />
                        <span>
                          {isAmharic
                            ? "የዳይሬክተር በጀት ፈቃድ እና የPO ማረጋገጫ ሳይኖር ግዢውን መፈጸም በሲስተም ተቆልፏል።"
                            : "Procurement execution is strictly locked by backend & database rules until Director Budget Approval and PO Authorization are completed."}
                        </span>
                      </div>
                    )}

                    {canReject && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => setShowRejectModal((v) => !v)}
                          className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold cursor-pointer"
                        >
                          {isAmharic ? "ጥያቄውን መልስ / ውድቅ አድርግ" : "Reject / Return with Comments"}
                        </button>
                      </div>
                    )}

                    {showRejectModal && canReject && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2 text-xs">
                        <textarea
                          rows={2}
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="Mandatory rejection comment for Procurement Officer..."
                          className="w-full border border-red-300 rounded-lg p-2 bg-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setShowRejectModal(false)} className="px-3 py-1 rounded border text-slate-600 cursor-pointer">
                            Cancel
                          </button>
                          <button
                            onClick={handleRejectRequest}
                            disabled={busy || !rejectComment.trim()}
                            className="px-3 py-1 rounded bg-red-600 text-white font-bold disabled:opacity-50 cursor-pointer"
                          >
                            Confirm Rejection
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: QUOTATION COLLECTION & COMPARISON */}
              {activeDetailTab === "quotations" && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-800">
                        {isAmharic ? "የአቅራቢዎች ዋጋ ማወዳደሪያ" : "Supplier Quotations Comparison Matrix"}
                      </h3>
                      {!isCommittee && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-1">
                          <Lock size={11} /> Evaluation Committee Only
                        </span>
                      )}
                    </div>

                    {selectedQuotations.length === 0 ? (
                      <p className="text-xs text-slate-500">No supplier quotations collected yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                            <tr>
                              <th className="p-2">Supplier</th>
                              <th className="p-2">Total (ETB)</th>
                              <th className="p-2">Lead Time</th>
                              <th className="p-2">Payment Terms</th>
                              <th className="p-2">Technical Notes</th>
                              <th className="p-2">Document</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedQuotations.map((q) => (
                              <tr key={q.id} className={selectedRequest.recommendedQuotationId === q.id ? "bg-violet-50/60" : ""}>
                                <td className="p-2 font-bold text-slate-900">
                                  {q.supplierName}
                                  <div className="text-[10px] font-normal text-slate-500">{q.supplierContact}</div>
                                </td>
                                <td className="p-2 font-mono font-bold">ETB {Number(q.totalAmountEtb).toLocaleString()}</td>
                                <td className="p-2">{q.deliveryLeadTimeDays} days</td>
                                <td className="p-2">{q.paymentTerms}</td>
                                <td className="p-2 text-slate-600">{q.technicalComplianceNotes}</td>
                                <td className="p-2 font-mono text-[10px] text-blue-700">{q.attachmentName}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {canCollectQuote && (
                      <form onSubmit={handleAddQuotation} className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                        <h4 className="font-black text-violet-900 uppercase">
                          {isAmharic ? "አዲስ የአቅራቢ ዋጋ መዝግብ" : "Register Supplier Quotation (Evaluation Committee)"}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            required
                            type="text"
                            value={qSupplierName}
                            onChange={(e) => setQSupplierName(e.target.value)}
                            placeholder="Supplier Name *"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                          <input
                            required
                            type="text"
                            value={qSupplierContact}
                            onChange={(e) => setQSupplierContact(e.target.value)}
                            placeholder="Phone / Email *"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                          <input
                            required
                            type="number"
                            min={1}
                            value={qTotalEtb}
                            onChange={(e) => setQTotalEtb(e.target.value)}
                            placeholder="Total Offer Amount (ETB) *"
                            className="border border-slate-300 rounded-lg px-3 py-2 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="number"
                            min={0}
                            value={qLeadDays}
                            onChange={(e) => setQLeadDays(e.target.value)}
                            placeholder="Lead Time (Days)"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                          <input
                            type="text"
                            value={qPaymentTerms}
                            onChange={(e) => setQPaymentTerms(e.target.value)}
                            placeholder="Payment Terms"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                          <input
                            type="text"
                            value={qTechNotes}
                            onChange={(e) => setQTechNotes(e.target.value)}
                            placeholder="Technical compliance notes"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            required
                            type="text"
                            value={qDocName}
                            onChange={(e) => setQDocName(e.target.value)}
                            placeholder="Quotation Doc Name (e.g. Quote_SupplierA.pdf) *"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                          <input
                            required
                            type="text"
                            value={qDocRef}
                            onChange={(e) => setQDocRef(e.target.value)}
                            placeholder="Quotation Doc URL or Ref ID *"
                            className="border border-slate-300 rounded-lg px-3 py-2"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={busy}
                          className="px-4 py-2 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-black cursor-pointer"
                        >
                          {isAmharic ? "የአቅራቢ ዋጋ መዝግብ" : "Register Quotation"}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: EVALUATION REPORT & WINNER SELECTION */}
              {activeDetailTab === "evaluation" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-800">
                    {isAmharic ? "የግምገማ ኮሚቴ ሪፖርትና አሸናፊ ምርጫ" : "Evaluation Report, Committee Members & Winner Selection"}
                  </h3>

                  {selectedEvaluation ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 space-y-2">
                        <div className="font-black text-violet-900">
                          Recommended Winner: {selectedEvaluation.recommendedSupplierName} — Weighted Score:{" "}
                          {selectedEvaluation.totalScore}/100 (Tech: {selectedEvaluation.technicalScore}, Fin:{" "}
                          {selectedEvaluation.financialScore})
                        </div>
                        <div>
                          <span className="font-bold">Committee Members:</span>{" "}
                          {(selectedEvaluation.committeeMembers || []).map((m) => `${m.name} (${m.role})`).join(" • ")}
                        </div>
                        <div>
                          <span className="font-bold">Selection Reasons:</span> {selectedEvaluation.recommendationReasons}
                        </div>
                        <div>
                          <span className="font-bold">Supporting Docs:</span>{" "}
                          {(selectedEvaluation.supportingDocuments || []).map((d) => `${d.name} [${d.urlOrRef}]`).join(", ")}
                        </div>
                      </div>
                    </div>
                  ) : canEvaluate ? (
                    <form onSubmit={handleSubmitEvaluation} className="space-y-4 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>Evaluation Committee Members (Names Mandatory) *</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCommitteeMembers((prev) => [...prev, { name: "", role: "Committee Member" }])
                            }
                            className="text-violet-700 hover:underline cursor-pointer"
                          >
                            + Add Member
                          </button>
                        </div>
                        {committeeMembers.map((m, idx) => (
                          <div key={idx} className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={m.name}
                              onChange={(e) =>
                                setCommitteeMembers((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                                )
                              }
                              placeholder={`Member #${idx + 1} Full Name`}
                              className="border border-slate-300 rounded-lg px-3 py-1.5"
                            />
                            <input
                              type="text"
                              value={m.role}
                              onChange={(e) =>
                                setCommitteeMembers((prev) =>
                                  prev.map((row, i) => (i === idx ? { ...row, role: e.target.value } : row))
                                )
                              }
                              placeholder="Committee Role"
                              className="border border-slate-300 rounded-lg px-3 py-1.5"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <div className="font-bold text-slate-700">Score Quotations & Select Winner *</div>
                        {selectedQuotations.map((q) => {
                          const s = scoreInputs[q.id] || { tech: "85", fin: "80", remarks: "" };
                          return (
                            <div key={q.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 items-center">
                              <div className="md:col-span-4 flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="winnerQuote"
                                  checked={recommendedQuotationId === q.id}
                                  onChange={() => setRecommendedQuotationId(q.id)}
                                />
                                <div>
                                  <div className="font-bold">{q.supplierName}</div>
                                  <div className="text-[10px] font-mono text-slate-500">ETB {Number(q.totalAmountEtb).toLocaleString()}</div>
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-slate-500">Tech (0-100)</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={s.tech}
                                  onChange={(e) =>
                                    setScoreInputs((prev) => ({
                                      ...prev,
                                      [q.id]: { ...s, tech: e.target.value },
                                    }))
                                  }
                                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-mono"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="text-[10px] text-slate-500">Fin (0-100)</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={s.fin}
                                  onChange={(e) =>
                                    setScoreInputs((prev) => ({
                                      ...prev,
                                      [q.id]: { ...s, fin: e.target.value },
                                    }))
                                  }
                                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-mono"
                                />
                              </div>
                              <div className="md:col-span-4">
                                <label className="text-[10px] text-slate-500">Remarks</label>
                                <input
                                  type="text"
                                  value={s.remarks}
                                  onChange={(e) =>
                                    setScoreInputs((prev) => ({
                                      ...prev,
                                      [q.id]: { ...s, remarks: e.target.value },
                                    }))
                                  }
                                  placeholder="Technical/Financial remarks"
                                  className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <textarea
                        required
                        rows={2}
                        value={evalReasons}
                        onChange={(e) => setEvalReasons(e.target.value)}
                        placeholder="Mandatory justification & selection reasons *"
                        className="w-full border border-slate-300 rounded-lg p-2.5"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          required
                          type="text"
                          value={evalDocName}
                          onChange={(e) => setEvalDocName(e.target.value)}
                          placeholder="Supporting Evaluation Report Name *"
                          className="border border-slate-300 rounded-lg px-3 py-2"
                        />
                        <input
                          required
                          type="text"
                          value={evalDocRef}
                          onChange={(e) => setEvalDocRef(e.target.value)}
                          placeholder="Supporting Report URL or Archive Ref *"
                          className="border border-slate-300 rounded-lg px-3 py-2"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 rounded-lg bg-violet-700 hover:bg-violet-800 text-white text-xs font-black cursor-pointer"
                      >
                        {isAmharic
                          ? "አሸናፊ አቅራቢ መርጠህ ለዳይሬክተር አቅርብ"
                          : "Submit Award Recommendation to Director"}
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Evaluation report will appear once the Evaluation Committee collects quotations and submits their recommendation.
                    </p>
                  )}
                </div>
              )}

              {/* SUB-TAB 4: IMMUTABLE APPROVAL HISTORY & AUDIT LOG */}
              {activeDetailTab === "audit" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-800">
                    {isAmharic ? "የግዢ ማፅደቂያ እና ኦዲት መዝገብ" : "Immutable Procurement Approval History & Audit Trail"}
                  </h3>
                  <div className="space-y-2">
                    {selectedAuditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-900">
                            {log.action} ({log.previousStatus} → {log.newStatus})
                          </div>
                          <div className="text-slate-600 mt-0.5">{log.comments}</div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Actor: {log.actorName} ({log.actorRole})
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
