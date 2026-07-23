import React, { useState, useEffect } from "react";
import { UserRole, RoleChangeRequest, RoleChangeAuditLog, RoleChangeRequestDoc } from "../types";
import { RoleChangeApprovalService } from "../services/roleChangeApprovalService";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  Lock, 
  User, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Paperclip, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  ChevronRight, 
  Building2, 
  Briefcase, 
  Laptop, 
  MapPin, 
  Activity, 
  Check, 
  X,
  UploadCloud,
  FileCheck2,
  HardHat,
  Eye,
  Info
} from "lucide-react";

interface UserRoleApprovalHubProps {
  currentUserRole: UserRole;
  currentUserName: string;
  currentUserId: string;
  isAmharic: boolean;
  onRoleUpdated?: (newRole: UserRole) => void;
  onLogAction?: (action: string, details: string) => void;
}

// Complete catalog of Construction Job Roles as defined in specification
const CONSTRUCTION_ROLES_CATALOG = [
  { role: UserRole.WAREHOUSE_MANAGER, nameEn: "Warehouse Manager", nameAm: "የመጋዘን አስተዳዳሪ" },
  { role: UserRole.STORE_OWNER, nameEn: "Store Owner", nameAm: "የሳይት ስቶር አቃቤ" },
  { role: UserRole.PROJECT_MANAGER, nameEn: "Project Manager", nameAm: "የፕሮጀክት ሥራ አስኪያጅ" },
  { role: UserRole.SITE_ENGINEER, nameEn: "Site Engineer", nameAm: "የሳይት መሐንዲስ" },
  { role: UserRole.SECTION_HEAD, nameEn: "Section Head", nameAm: "የክፍል ኃላፊ" },
  { role: UserRole.SUPERVISOR, nameEn: "Supervisor", nameAm: "የግንባታ ተቆጣጣሪ" },
  { role: UserRole.TEAM_LEADER, nameEn: "Team Leader", nameAm: "የቡድን መሪ" },
  { role: UserRole.GANG_CHIEF, nameEn: "Gang Chief", nameAm: "የጋንግ መሪ (የሠራተኞች መሪ)" },
  { role: UserRole.TIME_KEEPER, nameEn: "Time Keeper", nameAm: "የሰዓት ተቆጣጣሪ (ታይም ኪፐር)" },
  { role: UserRole.ASSEMBLER, nameEn: "Assembler", nameAm: "ተገጣጣሚ ሠራተኛ (አሰምብለር)" },
  { role: UserRole.FINANCE_MANAGER, nameEn: "Finance Manager", nameAm: "የሒሳብና ፋይናንስ ሥራ አስኪያጅ" },
  { role: UserRole.QAQC_ENGINEER, nameEn: "QA/QC Engineer", nameAm: "የጥራት ቁጥጥር መሐንዲስ" },
  { role: UserRole.HSE_OFFICER, nameEn: "HSE Officer", nameAm: "የደህንነትና አካባቢ ጥበቃ ኃላፊ" },
  { role: UserRole.DRIVER, nameEn: "Driver", nameAm: "የተሽከርካሪ አሽከርካሪ" },
  { role: UserRole.SURVEYOR, nameEn: "Surveyor", nameAm: "የመሬት ልኬታ መሐንዲስ (ሱርቬየር)" },
  { role: UserRole.SUPER_ADMIN, nameEn: "Admin", nameAm: "የሲስተም ዋና አስተዳዳሪ" },
  { role: UserRole.HEAD_OFFICE, nameEn: "Head Office", nameAm: "የዋና መስሪያ ቤት አመራር" }
];

export function UserRoleApprovalHub({
  currentUserRole,
  currentUserName,
  currentUserId,
  isAmharic,
  onRoleUpdated,
  onLogAction
}: UserRoleApprovalHubProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "new_request" | "audit_log" | "rbac_matrix">("requests");
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<RoleChangeAuditLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectionInputReason, setRejectionInputReason] = useState("");

  // Role Change Request Form State
  const [formData, setFormData] = useState({
    userId: currentUserId || "EMP-104",
    userName: currentUserName || "Abebe Bikila",
    userEmail: "abebe.b@buildsync.et",
    phoneNumber: "+251 911 000 111",
    currentRole: currentUserRole,
    requestedRole: UserRole.SITE_ENGINEER,
    reason: "",
    attachedDocs: [] as RoleChangeRequestDoc[]
  });

  const [formSuccessMessage, setFormSuccessMessage] = useState("");
  const [formErrorMessage, setFormErrorMessage] = useState("");

  // Override Role modal when approving
  const [approvingReq, setApprovingReq] = useState<RoleChangeRequest | null>(null);
  const [overrideRole, setOverrideRole] = useState<UserRole | "">( "");

  const canApprove = RoleChangeApprovalService.canApproveRoleChange(currentUserRole);

  // Load requests and audit logs on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setRequests(RoleChangeApprovalService.getRequests());
    setAuditLogs(RoleChangeApprovalService.getAuditLogs());
  };

  // Submit Request Form Handler
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage("");
    setFormSuccessMessage("");

    if (!formData.reason.trim()) {
      setFormErrorMessage(isAmharic ? "እባክዎን የሥራ ድርሻ ለውጡን ምክንያት በግልጽ ያስገቡ።" : "Please provide a clear reason for the requested role change.");
      return;
    }

    if (formData.requestedRole === formData.currentRole) {
      setFormErrorMessage(isAmharic ? "የተመረጠው አዲስ ድርሻ ከአሁኑ ድርሻዎ ጋር ተመሳሳይ ነው!" : "The requested role is identical to your current active role!");
      return;
    }

    const res = RoleChangeApprovalService.submitRoleChangeRequest({
      userId: formData.userId,
      userName: formData.userName,
      userEmail: formData.userEmail,
      phoneNumber: formData.phoneNumber,
      currentRole: formData.currentRole,
      requestedRole: formData.requestedRole,
      reason: formData.reason,
      supportingDocuments: formData.attachedDocs
    });

    if (res.success) {
      setFormSuccessMessage(isAmharic ? res.messageAm : res.messageEn);
      refreshData();
      if (onLogAction) {
        onLogAction("Role Change Request Submitted", `User ${formData.userName} requested role change to ${formData.requestedRole}`);
      }
      setTimeout(() => {
        setShowRequestModal(false);
        setFormSuccessMessage("");
        setFormData(prev => ({ ...prev, reason: "", attachedDocs: [] }));
        setActiveTab("requests");
      }, 1800);
    } else {
      setFormErrorMessage(isAmharic ? res.messageAm : res.messageEn);
    }
  };

  // Handle Document Attachment Simulation
  const handleAttachSampleDoc = (docType: "promotion" | "transfer" | "certificate") => {
    const docMap = {
      promotion: {
        id: `DOC-PROMO-${Date.now()}`,
        fileName: "Official_Promotion_Letter_Signed.pdf",
        fileSize: "1.8 MB",
        fileType: "application/pdf",
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      },
      transfer: {
        id: `DOC-XFER-${Date.now()}`,
        fileName: "Site_Transfer_Appointment_Memo.pdf",
        fileSize: "920 KB",
        fileType: "application/pdf",
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      },
      certificate: {
        id: `DOC-CERT-${Date.now()}`,
        fileName: "Technical_Competency_Certificate.png",
        fileSize: "2.4 MB",
        fileType: "image/png",
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      }
    };

    setFormData(prev => ({
      ...prev,
      attachedDocs: [...prev.attachedDocs, docMap[docType]]
    }));
  };

  // Approve Action Handler
  const handleApprove = (req: RoleChangeRequest) => {
    setApprovingReq(req);
    setOverrideRole(req.requestedRole as UserRole);
  };

  const confirmApprove = () => {
    if (!approvingReq) return;

    const res = RoleChangeApprovalService.approveRequest({
      requestId: approvingReq.id,
      approverName: currentUserName,
      approverRole: currentUserRole,
      assignedRoleOverride: overrideRole || undefined
    });

    if (res.success) {
      refreshData();
      if (onLogAction) {
        onLogAction(
          "Role Change Approved",
          `Approved request #${approvingReq.id} for user ${approvingReq.userName}. New Role: ${overrideRole || approvingReq.requestedRole}`
        );
      }
      // If approving for the currently logged in user
      if (approvingReq.userId === currentUserId || approvingReq.userName === currentUserName) {
        if (onRoleUpdated && overrideRole) {
          onRoleUpdated(overrideRole as UserRole);
        }
      }
      setApprovingReq(null);
    }
  };

  // Reject Action Handler
  const confirmReject = () => {
    if (!rejectingReqId) return;

    if (!rejectionInputReason.trim()) {
      alert(isAmharic ? "እባክዎን ጥያቄው ውድቅ የተደረገበትን ምክንያት ያስገቡ!" : "Please provide a reason for rejecting the request.");
      return;
    }

    const res = RoleChangeApprovalService.rejectRequest({
      requestId: rejectingReqId,
      approverName: currentUserName,
      approverRole: currentUserRole,
      rejectionReason: rejectionInputReason
    });

    if (res.success) {
      refreshData();
      if (onLogAction) {
        onLogAction("Role Change Rejected", `Rejected request #${rejectingReqId}. Reason: ${rejectionInputReason}`);
      }
      setRejectingReqId(null);
      setRejectionInputReason("");
    }
  };

  // Cancel Request Handler
  const handleCancelRequest = (reqId: string) => {
    if (window.confirm(isAmharic ? "ይህንን የሥራ ድርሻ ለውጥ ጥያቄ መሰረዝ ይፈልጋሉ?" : "Are you sure you want to cancel this role change request?")) {
      RoleChangeApprovalService.cancelRequest(reqId, currentUserName);
      refreshData();
    }
  };

  // Filtered Requests List
  const filteredRequests = requests.filter(r => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesSearch = searchQuery === "" || 
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.currentRole).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.requestedRole).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === "Pending Approval").length;
  const approvedCount = requests.filter(r => r.status === "Approved").length;
  const rejectedCount = requests.filter(r => r.status === "Rejected").length;

  return (
    <div className="space-y-6">
      {/* ENTERPRISE TITLE HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 rounded-2xl shadow-lg">
              <ShieldCheck size={28} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black text-white tracking-tight">
                  {isAmharic ? "የሥራ ድርሻ ለውጥ ማጽደቂያ እና ደህንነት መቆጣጠሪያ" : "User Role Change Approval System"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  BuildSync ERP RBAC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isAmharic
                  ? "የተጠቃሚዎችን የሥራ ድርሻ በደህንነት ደንብ መሠረት የማጽደቅ፣ የመገደብ እና የኦዲት መዝገቦችን የመቆጣጠር ማዕከል"
                  : "Centralized governance engine for assignment, restriction enforcement, authorization, and audit logs."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  userId: currentUserId || "EMP-104",
                  userName: currentUserName || "Abebe Bikila",
                  currentRole: currentUserRole
                }));
                setShowRequestModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition"
            >
              <Plus size={16} />
              <span>{isAmharic ? "አዲስ የሥራ ድርሻ ለውጥ ጠይቅ" : "Submit Role Change Request"}</span>
            </button>
          </div>
        </div>

        {/* RESTRICTION NOTICE BAR */}
        <div className="mt-5 p-3 bg-slate-950/80 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 text-slate-300">
            <Lock size={16} className="text-amber-400 flex-shrink-0" />
            <span>
              <strong className="text-white">{isAmharic ? "የደህንነት መመሪያ ግዴታ፦" : "Security Restriction Policy:"}</strong>{" "}
              {isAmharic
                ? "ተጠቃሚዎች ከምዝገባ በኋላ የራሳቸውን የሥራ ድርሻ (Role) በራሳቸው መቀየር አይችሉም። ማንኛውም ድርሻ ለውጥ በAdmin ወይም Head Office ብቻ ይጸድቃል።"
                : "Users CANNOT change their own job role after registration. Self-service role modification is disabled. All changes require Admin or Head Office authorization."}
            </span>
          </div>
          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-800 text-[11px] text-slate-400 whitespace-nowrap">
            <span>Current Active Role:</span>
            <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/80 rounded font-bold font-mono">
              {currentUserRole}
            </span>
          </div>
        </div>
      </div>

      {/* KPI STATS BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isAmharic ? "ጠቅላላ ጥያቄዎች" : "Total Requests"}
            </div>
            <div className="text-2xl font-black text-white mt-1">{totalCount}</div>
          </div>
          <div className="p-3 bg-blue-950 text-blue-400 rounded-xl border border-blue-800/50">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
              <span>{isAmharic ? "በሂደት ላይ ያሉ" : "Pending Approval"}</span>
              {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>}
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">{pendingCount}</div>
          </div>
          <div className="p-3 bg-amber-950 text-amber-400 rounded-xl border border-amber-800/50">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              {isAmharic ? "የጸደቁ ጥያቄዎች" : "Approved Roles"}
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{approvedCount}</div>
          </div>
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/50">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              {isAmharic ? "ውድቅ የተደረጉ" : "Rejected"}
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">{rejectedCount}</div>
          </div>
          <div className="p-3 bg-rose-950 text-rose-400 rounded-xl border border-rose-800/50">
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 text-xs font-bold">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === "requests"
              ? "border-amber-500 text-amber-400 bg-slate-900"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileCheck2 size={16} />
          <span>{isAmharic ? "የሥራ ድርሻ ለውጥ ጥያቄዎች ማዕከል" : "Role Change Requests"}</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit_log")}
          className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === "audit_log"
              ? "border-amber-500 text-amber-400 bg-slate-900"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Activity size={16} />
          <span>{isAmharic ? "የደህንነት ኦዲት መዝገብ (Audit Logs)" : "Security Audit Trail"}</span>
        </button>

        <button
          onClick={() => setActiveTab("rbac_matrix")}
          className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === "rbac_matrix"
              ? "border-amber-500 text-amber-400 bg-slate-900"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Shield size={16} />
          <span>{isAmharic ? "የሥራ ድርሻዎችና የፈቃድ መصفوفታቸው" : "Role & Permissions Catalog"}</span>
        </button>
      </div>

      {/* TAB 1: REQUESTS LIST & APPROVAL ACTIONS */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAmharic ? "በስም፣ በኢዲ ወይም በድርሻ ፈልግ..." : "Search user, ID, role or reason..."}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto text-xs">
              <span className="text-slate-400 font-bold whitespace-nowrap">{isAmharic ? "ሁኔታ፦" : "Status:"}</span>
              {["ALL", "Pending Approval", "Approved", "Rejected", "Cancelled"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    statusFilter === status
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {status === "ALL" ? (isAmharic ? "ሁሉም" : "All") : status}
                </button>
              ))}
            </div>
          </div>

          {/* REQUEST CARDS LIST */}
          {filteredRequests.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <ShieldAlert size={40} className="mx-auto text-slate-600" />
              <p className="text-sm font-bold">
                {isAmharic ? "ምንም የተመዘገበ የሥራ ድርሻ ለውጥ ጥያቄ አልተገኘም።" : "No Role Change Requests match your current filter criteria."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition shadow-lg"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                        {req.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">{req.userName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-950 text-slate-400 border border-slate-800 rounded font-bold">
                            {req.userId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                          <span>Requested on: {req.requestedDate} {req.requestedTime}</span>
                          <span>•</span>
                          <span>By: {req.requestedBy} ({req.requestedByRole})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        req.status === "Pending Approval" ? "bg-amber-950/80 text-amber-300 border border-amber-800" :
                        req.status === "Approved" ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" :
                        req.status === "Rejected" ? "bg-rose-950/80 text-rose-300 border border-rose-800" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* ROLE TRANSITION DISPLAY */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Current Active Role:</span>
                      <span className="px-2.5 py-1 bg-slate-900 text-slate-300 border border-slate-700 rounded-lg font-bold font-mono inline-block">
                        {req.currentRole}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <ChevronRight className="text-amber-400 hidden md:block" />
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold uppercase block mb-1">Requested New Role:</span>
                        <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-lg font-bold font-mono inline-block">
                          {req.requestedRole}
                        </span>
                      </div>
                    </div>

                    {req.assignedRole && req.assignedRole !== req.requestedRole && (
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-1">Assigned Override Role:</span>
                        <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg font-bold font-mono inline-block">
                          {req.assignedRole}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* REASON & ATTACHMENTS */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold">{isAmharic ? "የጥያቄው ምክንያት፦ " : "Reason for Request: "}</span>
                      <span className="text-slate-200">{req.reason}</span>
                    </div>

                    {req.rejectionReason && (
                      <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 font-medium">
                        <strong>Rejection Notes:</strong> {req.rejectionReason}
                      </div>
                    )}

                    {req.supportingDocuments && req.supportingDocuments.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-slate-500 text-[11px] font-bold flex items-center space-x-1">
                          <Paperclip size={13} />
                          <span>Supporting Documents ({req.supportingDocuments.length}):</span>
                        </span>
                        {req.supportingDocuments.map((doc) => (
                          <span
                            key={doc.id}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono flex items-center space-x-1 cursor-pointer border border-slate-700"
                            onClick={() => alert(`Simulated preview for attached document: ${doc.fileName} (${doc.fileSize})`)}
                          >
                            <FileText size={12} className="text-amber-400" />
                            <span>{doc.fileName}</span>
                            <span className="text-[9px] text-slate-500">({doc.fileSize})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DEVICE FOOTPRINT & ACTION BUTTONS */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-800/80 text-[11px] gap-2">
                    <div className="text-slate-500 space-x-3 font-mono">
                      <span>IP: {req.deviceInfo.ip}</span>
                      <span>•</span>
                      <span>Device: {req.deviceInfo.deviceType}</span>
                      <span>•</span>
                      <span>GPS: {req.deviceInfo.locationGps || "Acquired"}</span>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                      {req.status === "Pending Approval" && (
                        <>
                          {canApprove ? (
                            <>
                              <button
                                onClick={() => handleApprove(req)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center space-x-1 shadow transition"
                              >
                                <Check size={14} />
                                <span>{isAmharic ? "አጽድቅ (Approve)" : "Approve & Apply"}</span>
                              </button>

                              <button
                                onClick={() => setRejectingReqId(req.id)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center space-x-1 shadow transition"
                              >
                                <X size={14} />
                                <span>{isAmharic ? "ውድቅ አድርግ" : "Reject"}</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-amber-400 font-bold italic text-[10px]">
                              {isAmharic ? "የAdmin/Head Office ማጽደቂያ በመጠበቅ ላይ" : "Awaiting Admin/HO Approval"}
                            </span>
                          )}

                          {(req.userId === currentUserId || canApprove) && (
                            <button
                              onClick={() => handleCancelRequest(req.id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl font-bold transition"
                            >
                              {isAmharic ? "ሰርዝ" : "Cancel"}
                            </button>
                          )}
                        </>
                      )}

                      {req.status === "Approved" && (
                        <div className="text-emerald-400 font-bold text-[11px] flex items-center space-x-1">
                          <CheckCircle2 size={14} />
                          <span>Approved by {req.approvedBy} ({req.approvedByRole})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL LOG TABLE */}
      {activeTab === "audit_log" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Activity size={18} className="text-amber-400" />
                <span>{isAmharic ? "የሥራ ድርሻ ለውጦች ኦፊሴላዊ የኦዲት ታሪክ (Audit Log)" : "Role Change Security Audit Trail History"}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Complete security registry capturing User Name, ID, Previous Role, New Role, Requester, Approver, Date, Time, Reason, and Device Fingerprint.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  alert("Simulated export of Role Change Audit Logs in CSV / Compliance format.");
                }}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-1.5"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-1.5"
              >
                <Printer size={14} />
                <span>Print Audit Report</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[10px] uppercase font-black text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">User & ID</th>
                  <th className="p-3">Previous Role</th>
                  <th className="p-3">New / Action Role</th>
                  <th className="p-3">Approved By & Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reason / Details</th>
                  <th className="p-3">Device & IP Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic">
                      No security role change audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 whitespace-nowrap text-slate-400">
                        <div>{log.date}</div>
                        <div className="text-[9px] text-slate-500">{log.time}</div>
                      </td>
                      <td className="p-3 text-white font-bold whitespace-nowrap">
                        <div>{log.userName}</div>
                        <div className="text-[9px] text-amber-400 font-mono">{log.userId}</div>
                      </td>
                      <td className="p-3 text-slate-400">{log.previousRole}</td>
                      <td className="p-3 text-emerald-300 font-bold">{log.newRole}</td>
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        <div className="font-bold text-amber-300">{log.approvedBy}</div>
                        <div className="text-[9px] text-slate-500">{log.approverRole}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          log.status === "Approved" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                          log.status === "Rejected" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                          "bg-slate-800 text-slate-400"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-slate-300" title={log.reason}>
                        {log.reason}
                        {log.rejectionReason && <div className="text-rose-400 text-[9px] mt-0.5">Note: {log.rejectionReason}</div>}
                      </td>
                      <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap">
                        <div>{log.deviceInfo.ip}</div>
                        <div>{log.deviceInfo.deviceType}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROLE PERMISSIONS MATRIX CATALOG */}
      {activeTab === "rbac_matrix" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Shield className="text-amber-400" size={18} />
              <span>{isAmharic ? "የግንባታ ERP የሥራ ድርሻዎችና የፈቃድ መዝገብ" : "Construction ERP Role & RBAC Capability Catalog"}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Authorized role descriptions and access permissions for all construction site positions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {CONSTRUCTION_ROLES_CATALOG.map((item) => (
              <div key={item.role} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.nameEn}</h4>
                    <div className="text-xs text-amber-400 font-medium">{item.nameAm}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded text-[10px] font-mono font-bold">
                    {item.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-2">
                  {item.role === UserRole.SUPER_ADMIN || item.role === UserRole.HEAD_OFFICE ? (
                    <span className="text-emerald-400 font-bold">★ Authorized to approve & modify user roles. Full administrative oversight.</span>
                  ) : (
                    <span className="text-slate-400">Standard field/department role. Self-service role editing is restricted.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBMIT ROLE CHANGE REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldAlert size={18} className="text-amber-400" />
                  <span>{isAmharic ? "አዲስ የሥራ ድርሻ ለውጥ ጥያቄ ማቅረቢያ" : "Role Change Request Form"}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Submit formal role change request for Admin / Head Office approval.
                </p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            {formSuccessMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl font-bold flex items-center space-x-2">
                <CheckCircle2 size={16} />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            {formErrorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl font-bold flex items-center space-x-2">
                <AlertTriangle size={16} />
                <span>{formErrorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">User Name / ስም:</label>
                  <input
                    type="text"
                    required
                    value={formData.userName}
                    onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">User ID / መለያ ቁጥር:</label>
                  <input
                    type="text"
                    required
                    value={formData.userId}
                    onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Current Active Role:</label>
                  <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 font-mono font-bold">
                    {formData.currentRole}
                  </div>
                </div>

                <div>
                  <label className="block text-amber-300 font-bold mb-1">Requested New Role / አዲስ ድርሻ:</label>
                  <select
                    value={formData.requestedRole}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestedRole: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-amber-500 rounded-xl text-white font-bold focus:outline-none"
                  >
                    {CONSTRUCTION_ROLES_CATALOG.map(item => (
                      <option key={item.role} value={item.role}>
                        {item.nameEn} ({item.nameAm})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Reason for Role Change / ለድርሻ ለውጡ ምክንያት (Mandatory):
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={isAmharic ? "ምሳሌ፡ ወደ ክፍል ኃላፊነት ከተደረገው እድገት ጋር ተያይዞ አዲሱን የሥራ ድርሻ ለማግኝት..." : "e.g. Promoted to Site Engineer / Assigned warehouse operations oversight by Head Office memo..."}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Attach Supporting Documents (Optional):
                </label>
                <div className="p-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl space-y-2">
                  <div className="text-[11px] text-slate-400">Attach official appointment letters, promotion memos, or ID verification files:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAttachSampleDoc("promotion")}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                    >
                      <Plus size={12} />
                      <span>+ Add Promotion Letter.pdf</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachSampleDoc("transfer")}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center space-x-1"
                    >
                      <Plus size={12} />
                      <span>+ Add Transfer Memo.pdf</span>
                    </button>
                  </div>

                  {formData.attachedDocs.length > 0 && (
                    <div className="pt-2 space-y-1">
                      {formData.attachedDocs.map(doc => (
                        <div key={doc.id} className="text-[11px] text-emerald-400 font-mono flex items-center space-x-2">
                          <CheckCircle2 size={12} />
                          <span>{doc.fileName} ({doc.fileSize})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl text-[10px] text-slate-400 font-mono space-y-0.5">
                <div>Device Footprint: Desktop / Web Client (IP: 192.168.1.108)</div>
                <div>Location GPS: 8.9806° N, 38.7578° E (Addis Ababa Site Core)</div>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-bold shadow"
                >
                  {isAmharic ? "ጥያቄውን ላክ" : "Submit Role Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVE OVERRIDE MODAL */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>Authorize Role Change Approval</span>
              </h3>
              <button onClick={() => setApprovingReq(null)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div><strong>User:</strong> {approvingReq.userName} ({approvingReq.userId})</div>
                <div><strong>Current Role:</strong> {approvingReq.currentRole}</div>
                <div><strong>Requested Role:</strong> {approvingReq.requestedRole}</div>
                <div><strong>Reason:</strong> {approvingReq.reason}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Assigned Role (Option to Override):</label>
                <select
                  value={overrideRole}
                  onChange={(e) => setOverrideRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                >
                  {CONSTRUCTION_ROLES_CATALOG.map(item => (
                    <option key={item.role} value={item.role}>
                      {item.nameEn} ({item.nameAm})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                Approving will immediately update the user's active role, recalculate RBAC permissions, notify the user, and record an immutable audit log entry.
              </p>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setApprovingReq(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmApprove}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow"
                >
                  Confirm Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <XCircle size={18} className="text-rose-400" />
                <span>Reject Role Change Request</span>
              </h3>
              <button onClick={() => setRejectingReqId(null)} className="text-slate-400 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Reason for Rejection / ውድቅ የተደረገበት ምክንያት (Mandatory):
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionInputReason}
                  onChange={(e) => setRejectionInputReason(e.target.value)}
                  placeholder="e.g. Official HR promotion memo document was missing or role assignment criteria not met..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectingReqId(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
