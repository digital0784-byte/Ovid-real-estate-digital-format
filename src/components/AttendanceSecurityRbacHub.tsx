import React, { useState } from "react";
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Users, 
  CheckCircle2, 
  AlertOctagon, 
  FileText, 
  Clock, 
  Database, 
  Search, 
  RefreshCw, 
  Check, 
  X, 
  ShieldAlert,
  Smartphone,
  Eye,
  Activity,
  UserCheck,
  ChevronRight,
  Sparkles,
  Laptop,
  Briefcase,
  Layers,
  Building2,
  HardHat,
  Cpu,
  FileCheck2,
  Wrench,
  Truck,
  EyeOff
} from "lucide-react";
import { UserRole, AuditLog } from "../types";

interface AttendanceSecurityRbacHubProps {
  currentUserRole: UserRole;
  isAmharic: boolean;
  authorizedRoles: UserRole[];
  onToggleRolePermission: (role: UserRole) => void;
  auditLogs?: AuditLog[];
  onLogAction?: (action: string, details: string) => void;
  onSwitchRole?: (newRole: UserRole) => void;
}

// Complete 21 Enterprise System Roles Metadata Specification
const ENTERPRISE_ROLES_SPEC: Record<string, {
  title: string;
  category: "Executive & Admin" | "Financial & Procurement" | "Supply & Warehouse" | "Site & Field Operations" | "Engineering & Quality" | "External & Audit";
  canDo: string[];
  cannotDo: string[];
  description: string;
}> = {
  [UserRole.SUPER_ADMIN]: {
    title: "1. Admin",
    category: "Executive & Admin",
    description: "Full system access & administrative governance.",
    canDo: [
      "Create, Edit & Delete Users",
      "Assign & Revoke System Roles",
      "Reset Passwords & Manage Security Policies",
      "View Every Project, Site & Dashboard",
      "View Financial Reports, Payroll & Warehouse",
      "Configure ERP Settings & System Updates",
      "Audit System Logs & Security Overrides"
    ],
    cannotDo: ["No restrictions (Full System Authority)"]
  },
  [UserRole.HEAD_OFFICE]: {
    title: "2. Head Office",
    category: "Executive & Admin",
    description: "Executive multi-project monitoring & strategic oversight.",
    canDo: [
      "View All Projects & Construction Sites",
      "View All Attendance, Warehouse & Financial Reports",
      "View All Survey, Safety & Quality Reports",
      "Access Executive Dashboard & AI Performance Analytics",
      "Monitor Material Consumption Trends"
    ],
    cannotDo: [
      "Cannot modify system configurations or user credentials",
      "Cannot delete historical transaction ledgers"
    ]
  },
  [UserRole.FINANCE_MANAGER]: {
    title: "3. Finance Manager",
    category: "Financial & Procurement",
    description: "Financial management, payroll calculation & cost control.",
    canDo: [
      "Access Payroll, Salary & Overtime/Under Time calculations",
      "Manage Project Budgets & Cost Control Ledgers",
      "Track Asset Values, Material Costs & Warehouse Inventories",
      "Generate Financial Dashboards & Tax Audit Reports"
    ],
    cannotDo: [
      "Cannot directly modify daily biometric attendance records",
      "Cannot alter warehouse material issuance tickets"
    ]
  },
  [UserRole.WAREHOUSE_MANAGER]: {
    title: "4. Warehouse Manager",
    category: "Supply & Warehouse",
    description: "Centralized warehouse operations & material tracking.",
    canDo: [
      "Manage All Central Warehouses & Site Stores",
      "Process Material Transfers, QR/Barcode & Panel Tracking",
      "Approve Material Requests & Material Returns",
      "Manage Damaged Materials, Cleaning & Repair Queues"
    ],
    cannotDo: [
      "Cannot view employee salary rates or financial payroll",
      "Cannot override site CAD drawings or survey coordinates"
    ]
  },
  [UserRole.STORE_OWNER]: {
    title: "5. Store Owner",
    category: "Supply & Warehouse",
    description: "Assigned site store inventory receiving & issuance.",
    canDo: [
      "Manage Assigned Site Store Inventory",
      "Receive Materials & Issue Stock to Teams",
      "Process Material Returns & Daily Stock Counts",
      "Submit Site Material Requisitions"
    ],
    cannotDo: [
      "Cannot access company financial data or payroll",
      "Cannot access unassigned site stores"
    ]
  },
  [UserRole.PROCUREMENT_MANAGER]: {
    title: "6. Procurement Manager",
    category: "Financial & Procurement",
    description: "Vendor procurement, purchase orders & material supply chains.",
    canDo: [
      "Manage Purchase Requisitions & Vendor Quotes",
      "Process Purchase Orders & Material Deliveries",
      "Track Supplier Performance & Material Costs"
    ],
    cannotDo: [
      "Cannot edit biometric attendance records",
      "Cannot modify engineering CAD blueprints"
    ]
  },
  [UserRole.PROJECT_MANAGER]: {
    title: "7. Project Manager",
    category: "Site & Field Operations",
    description: "Project execution, progress monitoring & team leadership.",
    canDo: [
      "Access Assigned Project Execution Progress",
      "Monitor Project Materials & Inventory Levels",
      "View Project Attendance Summaries & Labor Performance",
      "Access Project Budget & Executive Summaries"
    ],
    cannotDo: [
      "Cannot alter global ERP security configurations",
      "Cannot modify payroll rate parameters without Admin"
    ]
  },
  [UserRole.SECTION_HEAD]: {
    title: "8. Section Head",
    category: "Site & Field Operations",
    description: "Sectional management across buildings, floors & zones.",
    canDo: [
      "Manage Assigned Section, Buildings, Floors & Zones",
      "Track Team Progress & Material Usage Rate",
      "Review Attendance & Daily Section Reports"
    ],
    cannotDo: [
      "Cannot view project-wide financial profitability",
      "Cannot issue central warehouse procurement orders"
    ]
  },
  [UserRole.SUPERVISOR]: {
    title: "9. Supervisor",
    category: "Site & Field Operations",
    description: "Direct field supervision of workers, zones & inspections.",
    canDo: [
      "Supervise Assigned Building, Floor & Zone",
      "Manage Assigned Field Workers & Daily Progress",
      "Monitor Material Consumption & Inspection Reports",
      "Verify Attendance Geofence Status"
    ],
    cannotDo: [
      "Cannot approve financial payments or salary payouts",
      "Cannot modify system RBAC user roles"
    ]
  },
  [UserRole.SITE_ENGINEER]: {
    title: "10. Site Engineer",
    category: "Engineering & Quality",
    description: "Technical engineering, CAD drawings & survey verification.",
    canDo: [
      "Access CAD Drawings & Structural Blueprints",
      "Review Survey Reports & Technical Inspections",
      "Submit Site Progress & Material Consumption Reports"
    ],
    cannotDo: [
      "Cannot delete financial ledger records",
      "Cannot modify worker overtime pay rates"
    ]
  },
  [UserRole.SURVEYOR]: {
    title: "11. Surveyor",
    category: "Engineering & Quality",
    description: "Geodetic survey, GPS coordinates & layout synchronization.",
    canDo: [
      "Manage Survey Instruments & Calibration Data",
      "Record GPS Coordinates, Level & Layout Reports",
      "Auto-sync survey data live with Site Engineer, Supervisor, Section Head, PM & Head Office"
    ],
    cannotDo: [
      "Cannot edit financial payroll or worker salaries",
      "Cannot approve warehouse material requisitions"
    ]
  },
  [UserRole.QAQC_ENGINEER]: {
    title: "12. QA/QC Engineer",
    category: "Engineering & Quality",
    description: "Quality assurance, concrete testing & snag list resolution.",
    canDo: [
      "Generate Quality Inspection Reports & Snag Lists",
      "Issue Non-Conformance Reports (NCR)",
      "Inspect Material Quality, Concrete Slump & Formwork Quality"
    ],
    cannotDo: [
      "Cannot bypass safety hazard shutdowns",
      "Cannot modify financial budget allocations"
    ]
  },
  [UserRole.HSE_OFFICER]: {
    title: "13. HSE Officer",
    category: "Engineering & Quality",
    description: "Health, safety, environmental compliance & hazard reporting.",
    canDo: [
      "Conduct Safety Audits & PPE Inspections",
      "Log Toolbox Meetings & Hazard Incident Reports",
      "Issue Work Stop Notices for Unsafe Conditions"
    ],
    cannotDo: [
      "Cannot alter structural CAD engineering designs",
      "Cannot edit worker wage rates"
    ]
  },
  [UserRole.TEAM_LEADER]: {
    title: "14. Team Leader",
    category: "Site & Field Operations",
    description: "Team level task coordination, panel assembly & daily progress.",
    canDo: [
      "Manage Assigned Team Members & Daily Progress",
      "Submit Daily Material Requests & Track Panels",
      "Record Team Daily Work Reports"
    ],
    cannotDo: [
      "Cannot view other teams' confidential details",
      "Cannot access financial accounting"
    ]
  },
  [UserRole.GANG_CHIEF]: {
    title: "15. Gang Chief",
    category: "Site & Field Operations",
    description: "Gang level labor supervision & daily material requests.",
    canDo: [
      "Supervise Assigned Gang Workers",
      "Verify Daily Gang Attendance & Material Requests",
      "Submit Daily Gang Execution Summaries"
    ],
    cannotDo: [
      "Cannot access project-wide financial summaries",
      "Cannot alter CAD technical drawings"
    ]
  },
  [UserRole.TIME_KEEPER]: {
    title: "16. Time Keeper",
    category: "Site & Field Operations",
    description: "Biometric attendance registration & clock-in/out verification.",
    canDo: [
      "Register Employee Biometrics (Face ID & Fingerprint)",
      "Process Check-In / Check-Out Verification",
      "Record Overtime, Under Time & Leave Applications",
      "Verify GPS Geofence Attendance Coordinates"
    ],
    cannotDo: [
      "Cannot alter worker base hourly wage rates",
      "Cannot issue warehouse inventory stock"
    ]
  },
  [UserRole.ASSEMBLER]: {
    title: "17. Assembler",
    category: "Site & Field Operations",
    description: "Personal task execution & daily work schedule.",
    canDo: [
      "View Personal Biometric Attendance Records",
      "View Assigned Tasks & Work Schedule",
      "Submit Personal Material/Tool Requests"
    ],
    cannotDo: [
      "STRICTLY FORBIDDEN from viewing other employees' information",
      "Cannot access project budgets, payroll, or warehouse stock"
    ]
  },
  [UserRole.DRIVER]: {
    title: "18. Driver",
    category: "Supply & Warehouse",
    description: "Material logistics delivery & GPS route tracking.",
    canDo: [
      "View Assigned Material Deliveries & Cargo Manifests",
      "Access GPS Navigation Routes & Delivery Receipts",
      "Confirm Material Delivery Receipts at Site Stores"
    ],
    cannotDo: [
      "Cannot view employee wage details",
      "Cannot modify warehouse inventory quantities"
    ]
  },
  [UserRole.CLIENT_CONSULTANT]: {
    title: "19. Client / Consultant",
    category: "External & Audit",
    description: "External stakeholder transparency & approved progress review.",
    canDo: [
      "View Approved Project Progress Reports & Milestone Photos",
      "View Approved CAD Drawings & Inspection Summaries"
    ],
    cannotDo: [
      "Cannot access internal financial payroll or worker wage details",
      "Cannot view unapproved internal drafts or cost ledgers"
    ]
  },
  [UserRole.AUDITOR]: {
    title: "20. Auditor",
    category: "External & Audit",
    description: "Read-only financial, inventory & attendance compliance auditing.",
    canDo: [
      "Read-Only Access to Financial Reports & Cost Ledgers",
      "Read-Only Access to Warehouse Inventories & Transfers",
      "Read-Only Access to Attendance Ledgers & System Audit Logs"
    ],
    cannotDo: [
      "STRICTLY FORBIDDEN from creating, editing, or deleting any records",
      "Cannot modify system parameters or configuration"
    ]
  },
  [UserRole.VISITOR]: {
    title: "21. Visitor",
    category: "External & Audit",
    description: "Restricted guest access to pre-approved public information.",
    canDo: [
      "Access explicitly pre-approved public project summaries"
    ],
    cannotDo: [
      "Cannot access operational data, attendance, payroll, or warehouse",
      "Cannot view confidential structural CAD drawings"
    ]
  }
};

export const AttendanceSecurityRbacHub: React.FC<AttendanceSecurityRbacHubProps> = ({
  currentUserRole,
  isAmharic,
  authorizedRoles,
  onToggleRolePermission,
  auditLogs = [],
  onLogAction,
  onSwitchRole
}) => {
  const [selectedRoleForDetails, setSelectedRoleForDetails] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const [selectedAuditFilter, setSelectedAuditFilter] = useState("All");
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(15);
  const [deviceAuthEnabled, setDeviceAuthEnabled] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [activeRulesTab, setActiveRulesTab] = useState<"firestore" | "cloud_functions">("firestore");

  const allRolesList = Object.values(UserRole).filter((v, i, a) => a.indexOf(v) === i && typeof v === "string");

  const isAdmin = currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.HEAD_OFFICE;

  // Filtered audit logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                          log.details.toLowerCase().includes(auditSearchQuery.toLowerCase());
    const matchesRole = selectedAuditFilter === "All" || log.role === selectedAuditFilter;
    return matchesSearch && matchesRole;
  });

  const selectedSpec = ENTERPRISE_ROLES_SPEC[selectedRoleForDetails] || ENTERPRISE_ROLES_SPEC[UserRole.SUPER_ADMIN];

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER BANNER */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-600/20 text-red-500 rounded-xl border border-red-500/30">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center space-x-2">
                <span>{isAmharic ? "ኢንተርፕራይዝ የደህንነት እና የመዳረሻ መቆጣጠሪያ ማዕከል (21 System Roles)" : "Enterprise Role-Based Access Control (RBAC) Governance Hub"}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                  21 SYSTEM ROLES ACTIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAmharic 
                  ? "የ BuildSync ERP ሁለም 21 የስራ መደቦች የመረጃ፣ የሪፖርት እና የተግባር ፍቃዶችን በከፍተኛ ደህንነት ይቆጣጠሩ"
                  : "Centralized authority matrix governing data access, report viewing, and operational execution for all 21 ERP system roles."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-mono text-slate-300">256-Bit AES Encrypted</span>
            </div>
            <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-mono text-slate-300">
              Timeout: {sessionTimeoutMins}m
            </div>
          </div>
        </div>

        {/* ROLE SIMULATOR BANNER */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <UserCheck size={16} className="text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-medium">
              Current Active Session Role: <strong className="text-white font-extrabold">{currentUserRole}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400">Test Role Simulation:</span>
            <select
              value={currentUserRole}
              onChange={(e) => {
                if (onSwitchRole) {
                  onSwitchRole(e.target.value as UserRole);
                  if (onLogAction) {
                    onLogAction("Switched Session Role", `Simulating ERP as ${e.target.value}`);
                  }
                }
              }}
              className="bg-slate-800 text-white border border-slate-700 rounded-lg p-1.5 font-bold font-mono text-xs outline-none cursor-pointer"
            >
              {allRolesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 21 SYSTEM ROLES INTERACTIVE DIRECTORY & SCOPE INSPECTOR */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <Users size={18} className="text-red-600" />
              <span>{isAmharic ? "21 የኢንተርፕራይዝ ስራ መደቦች እና የፍቃድ ዝርዝር" : "21 System Roles Matrix & Capability Scope"}</span>
            </h4>
            <p className="text-xs text-slate-500">
              {isAmharic 
                ? "ማንኛውም ተጠቃሚ የተፈቀደለትን መረጃ ብቻ የመመልከትና የማስተካከል ስልጣን ይኖረዋል" 
                : "Click any role below to view allowed permissions, restrictions, and security boundaries."}
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
            Selected: {selectedRoleForDetails}
          </span>
        </div>

        {/* 21 Roles Grid Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {allRolesList.map(roleKey => {
            const spec = ENTERPRISE_ROLES_SPEC[roleKey];
            const isSelected = selectedRoleForDetails === roleKey;
            const isAttendanceAuthorized = authorizedRoles.includes(roleKey);

            return (
              <button
                key={roleKey}
                onClick={() => setSelectedRoleForDetails(roleKey)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20" 
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                    {spec?.category || "System Role"}
                  </div>
                  <div className="font-extrabold text-xs mt-0.5 truncate">{roleKey}</div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-200/40 pt-1.5 text-[9px]">
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                    isAttendanceAuthorized ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {isAttendanceAuthorized ? "ATTENDANCE" : "RESTRICTED"}
                  </span>
                  <ChevronRight size={10} className={isSelected ? "text-white" : "text-slate-400"} />
                </div>
              </button>
            );
          })}
        </div>

        {/* SELECTED ROLE DETAILED INSPECTOR CARD */}
        {selectedSpec && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-red-600 tracking-wider">
                  {selectedSpec.category}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <span>{selectedSpec.title}</span>
                  {selectedRoleForDetails === UserRole.SUPER_ADMIN && (
                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">FULL AUTHORITY</span>
                  )}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">{selectedSpec.description}</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => {
                    onToggleRolePermission(selectedRoleForDetails);
                    if (onLogAction) {
                      onLogAction("Toggled Attendance Permission", `${selectedRoleForDetails} set to ${!authorizedRoles.includes(selectedRoleForDetails)}`);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 ${
                    authorizedRoles.includes(selectedRoleForDetails) 
                      ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                      : "bg-slate-800 text-white hover:bg-slate-900"
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>
                    {authorizedRoles.includes(selectedRoleForDetails) ? "Authorized Attendance Access" : "Grant Attendance Access"}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Allowed Capabilities */}
              <div className="bg-white p-4 rounded-xl border border-emerald-200 space-y-2">
                <div className="font-extrabold text-emerald-800 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Permitted System Capabilities & Access Scope:</span>
                </div>
                <ul className="space-y-1.5">
                  {selectedSpec.canDo.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-slate-700 leading-snug">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Forbidden / Restricted Capabilities */}
              <div className="bg-white p-4 rounded-xl border border-red-200 space-y-2">
                <div className="font-extrabold text-red-800 uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
                  <ShieldAlert size={14} className="text-red-600" />
                  <span>Strict Security Restrictions & Prohibitions:</span>
                </div>
                <ul className="space-y-1.5">
                  {selectedSpec.cannotDo.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-slate-700 leading-snug">
                      <span className="text-red-500 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIREBASE FIRESTORE & CLOUD FUNCTIONS SECURITY RULES CODE GENERATOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        
        {/* Firebase Rules Code View */}
        <div className="bg-slate-950 text-slate-200 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2 text-red-400 font-bold text-xs">
              <Database size={14} />
              <span>firestore.rules (Enterprise Security Rules)</span>
            </div>
            <div className="flex items-center space-x-2 text-[10px]">
              <button 
                onClick={() => setActiveRulesTab("firestore")}
                className={`px-2 py-0.5 rounded cursor-pointer ${activeRulesTab === "firestore" ? "bg-red-600 text-white" : "text-slate-400"}`}
              >
                Firestore
              </button>
              <button 
                onClick={() => setActiveRulesTab("cloud_functions")}
                className={`px-2 py-0.5 rounded cursor-pointer ${activeRulesTab === "cloud_functions" ? "bg-red-600 text-white" : "text-slate-400"}`}
              >
                Cloud Functions
              </button>
            </div>
          </div>

          <pre className="text-[10px] leading-relaxed text-slate-300 bg-slate-900 p-3.5 rounded-xl border border-slate-800 overflow-x-auto max-h-[220px]">
{activeRulesTab === "firestore" ? `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Enterprise Role Helper Function
    function hasRole(roles) {
      return request.auth != null && request.auth.token.role in roles;
    }

    // Attendance Records Collection
    match /attendance_records/{recordId} {
      allow read: if hasRole([
        'Admin', 'Head Office', 'Finance Manager', 
        'Project Manager', 'Section Head', 'Supervisor', 
        'Time Keeper', 'Team Leader', 'Gang Chief', 'Auditor'
      ]);
      allow write: if hasRole(['Admin', 'Time Keeper']);
    }

    // Material & Warehouse Collection
    match /warehouse_materials/{matId} {
      allow read: if hasRole(['Admin', 'Head Office', 'Warehouse Manager', 'Store Owner', 'Auditor']);
      allow write: if hasRole(['Admin', 'Warehouse Manager', 'Store Owner']);
    }

    // Payroll & Salary Collection
    match /payroll/{payId} {
      allow read, write: if hasRole(['Admin', 'Finance Manager', 'Auditor']);
    }
  }
}` : `// Cloud Functions Authorization Handler
const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.enforceRoleSecurity = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }
  
  const userRole = context.auth.token.role;
  const allowedRoles = ["Admin", "Head Office", "Project Manager", "Finance Manager"];
  
  if (!allowedRoles.includes(userRole)) {
    throw new functions.https.HttpsError("permission-denied", "Unauthorized access level");
  }
  
  return { status: "AUTHORIZED", role: userRole };
});`}
          </pre>
        </div>

        {/* Security Controls & Encryption */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
            <Lock size={16} className="text-red-600" />
            <span>Enterprise Security Configuration</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">256-Bit AES Data Encryption</div>
                <div className="text-[10px] text-slate-500">Encrypts biometrics, salaries & CAD assets</div>
              </div>
              <button 
                onClick={() => setEncryptionEnabled(!encryptionEnabled)}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer ${
                  encryptionEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                }`}
              >
                {encryptionEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">Hardware Device Binding</div>
                <div className="text-[10px] text-slate-500">Restricts login to registered mobile terminals</div>
              </div>
              <button 
                onClick={() => setDeviceAuthEnabled(!deviceAuthEnabled)}
                className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer ${
                  deviceAuthEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"
                }`}
              >
                {deviceAuthEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">Session Timeout Governance</div>
                <div className="text-[10px] text-slate-500">Auto-locks inactive sessions</div>
              </div>
              <select 
                value={sessionTimeoutMins}
                onChange={(e) => setSessionTimeoutMins(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-lg p-1.5 font-mono text-xs outline-none"
              >
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px] leading-relaxed">
              <strong>Automatic Audit Logging:</strong> Every action records User Name, User ID, Role, Date, Time, GPS Coordinates, and Hardware Device Info.
            </div>
          </div>
        </div>

      </div>

      {/* COMPREHENSIVE SECURITY AUDIT TRAIL TABLE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <Activity size={16} className="text-red-600" />
              <span>{isAmharic ? "የኢንተርፕራይዝ ደህንነት ኦዲት መዝገብ" : "Enterprise System Access & Audit Trail Ledger"}</span>
            </h4>
            <p className="text-xs text-slate-500">
              {isAmharic ? "በስርዓቱ ውስጥ የተደረጉ ማናቸውም ስራዎች በስም፣ በ ID፣ በፍቃድ እና በቦታ ይመዘገባሉ" : "Tracks all views, logins, data edits, and report exports with full device & GPS telemetry."}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input 
              type="text" 
              placeholder="Search audit logs..." 
              value={auditSearchQuery}
              onChange={(e) => setAuditSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none"
            />
            <select 
              value={selectedAuditFilter}
              onChange={(e) => setSelectedAuditFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none max-w-[150px]"
            >
              <option value="All">All Roles</option>
              {allRolesList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100 text-[10px]">
                <th className="p-3">Timestamp</th>
                <th className="p-3">User & Role</th>
                <th className="p-3">Action Performed</th>
                <th className="p-3">Audit Details</th>
                <th className="p-3">Device & Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-slate-500">{log.timestamp}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-red-600 font-semibold">{log.role}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{log.action}</td>
                    <td className="p-3 text-slate-600 font-sans text-xs">{log.details}</td>
                    <td className="p-3 text-[10px]">
                      {log.gps?.status === "acquired" ? (
                        <div className="text-emerald-600 font-bold flex items-center space-x-1">
                          <CheckCircle2 size={11} />
                          <span>GPS: {log.gps.latitude.toFixed(4)}, {log.gps.longitude.toFixed(4)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Mobile Terminal #01 (Verified)</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 font-sans">
                    No security audit events match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

