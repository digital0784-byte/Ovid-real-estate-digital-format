import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  Search,
  RefreshCw,
  Folder,
  FileText,
  Calendar,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Eye,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  Code,
  Table,
  CheckCircle2,
  Clock,
  Key,
  Layers
} from "lucide-react";
import { UserRole } from "../types";
import { db, isFirebaseReady } from "../firebase";
import {
  collection,
  getDocs,
  limit,
  query,
  orderBy,
  startAfter,
  DocumentSnapshot
} from "firebase/firestore";

interface FirestoreDataExplorerProps {
  currentUserRole: UserRole;
  currentUserProfile?: any;
  isAmharic: boolean;
  onLogAction?: (action: string, details: string) => void;
}

// Authorized ERP Collections catalog with schema descriptions
const AUTHORIZED_COLLECTIONS: { id: string; nameEn: string; nameAm: string; category: string; description: string }[] = [
  { id: "tasks", nameEn: "Tasks & Work Orders", nameAm: "የስራ ትዕዛዞች", category: "Operations", description: "Construction tasks, assignments, deadlines and execution status" },
  { id: "traceablePanels", nameEn: "Traceable Panels", nameAm: "የተመዘገቡ ፓነሎች", category: "Traceability", description: "Serialized aluminum formwork panels, QR codes, dimensions, locations" },
  { id: "panelTraceabilityMovements", nameEn: "Panel Movements", nameAm: "የፓነል እንቅስቃሴዎች", category: "Traceability", description: "Panel transfer and movement ledger with origin and destination" },
  { id: "panelDamageInspections", nameEn: "Damage Inspections", nameAm: "የጉዳት ፍተሻዎች", category: "Traceability", description: "Inspection findings, weld cracks, severity, and repair decisions" },
  { id: "panelIssueTransactions", nameEn: "Panel Issue Transactions", nameAm: "የፓነል ወጪ መዝገቦች", category: "Traceability", description: "Material issuance from store to field gang chief / supervisor" },
  { id: "panelReturnTransactions", nameEn: "Panel Return Transactions", nameAm: "የፓነል ገቢ መዝገቦች", category: "Traceability", description: "Returned panels after stripping, inspection results" },
  { id: "panelInventoryReconciliations", nameEn: "Inventory Reconciliations", nameAm: "የክምችት ማስታረቂያ", category: "Traceability", description: "Discrepancy audits between physical counts and system balances" },
  { id: "panelTraceabilityAuditLogs", nameEn: "Panel Audit Logs", nameAm: "የፓነል ኦዲት መዝገብ", category: "Traceability", description: "Cryptographically tracked immutable panel changes" },
  { id: "panelDimensionLibrary", nameEn: "Panel Dimensions Library", nameAm: "የፓነል ልኬቶች ዝርዝር", category: "Traceability", description: "Standard formwork dimensions, lengths, widths and unit weights" },
  { id: "users", nameEn: "User Profiles", nameAm: "የተጠቃሚዎች መገለጫ", category: "Access & HR", description: "Active user documents, roles, employee IDs and approval states" },
  { id: "workers", nameEn: "Workers Roster", nameAm: "የሳይት ሰራተኞች", category: "Access & HR", description: "Site trades, artisans, carpenters and daily laborers" },
  { id: "employees", nameEn: "Employees Record", nameAm: "የቋሚ ሰራተኞች መዝገብ", category: "Access & HR", description: "Permanent engineering and administrative corporate staff" },
  { id: "teams", nameEn: "Construction Teams", nameAm: "የግንባታ ቡድኖች", category: "Operations", description: "Assigned assembly squads, productivity and quality metrics" },
  { id: "attendance", nameEn: "Attendance Records", nameAm: "የመገኘት መዝገብ", category: "Operations", description: "Clock-in/out timestamps, biometric verification methods, hours" },
  { id: "payroll", nameEn: "Payroll Ledger", nameAm: "የደመወዝ ዝርዝር", category: "Finance", description: "Monthly calculations, basic pay, overtime, and bank details" },
  { id: "expenses", nameEn: "Site Expenses", nameAm: "የሳይት ወጪዎች", category: "Finance", description: "Material, labor, and equipment expenditures" },
  { id: "invoices", nameEn: "Invoices", nameAm: "ደረሰኞች", category: "Finance", description: "Vendor and contractor billings" },
  { id: "contracts", nameEn: "Subcontractor Contracts", nameAm: "የንዑስ ተቋራጭ ውሎች", category: "Finance", description: "Subcontractor scope, agreed rates and performance commitments" },
  { id: "auditLogs", nameEn: "Security Audit Logs", nameAm: "የደህንነት ኦዲት", category: "Security", description: "System-wide immutable operation audit trail" },
  { id: "notifications", nameEn: "System Notifications", nameAm: "የስርዓት ማሳወቂያዎች", category: "System", description: "Push alerts, threshold breaches, and approval updates" },
  { id: "projects", nameEn: "Master Projects", nameAm: "ዋና ፕሮጀክቶች", category: "Master Data", description: "High-level project locations, budgets and timelines" },
  { id: "sites", nameEn: "Construction Sites", nameAm: "የግንባታ ሳይቶች", category: "Master Data", description: "Site compounds, geo-coordinates and project links" },
  { id: "warehouses", nameEn: "Central Warehouses", nameAm: "ማዕከላዊ መጋዘኖች", category: "Master Data", description: "Main supply yards, storage capacities and yard managers" },
  { id: "siteStores", nameEn: "Site Stores", nameAm: "የሳይት ስቶሮች", category: "Master Data", description: "Site-level formwork stores and storekeeper contacts" },
  { id: "zones", nameEn: "Project Zones", nameAm: "የፕሮጀክት ዞኖች", category: "Operations", description: "Building, floor and zone layout progress and cycles" },
  { id: "progressLogs", nameEn: "Daily Progress Logs", nameAm: "ዕለታዊ የግንባታ ሂደት", category: "Operations", description: "Daily installed and stripped panel tallies by zone" },
  { id: "safetyLogs", nameEn: "Safety Compliance Logs", nameAm: "የደህንነት መዝገብ", category: "HSE", description: "Toolbox talks, hazard inspections, and safety scores" },
  { id: "qualitySnags", nameEn: "Quality Defect Snags", nameAm: "የጥራት ጉድለቶች", category: "Quality", description: "Structural snags, punch lists, and resolution states" },
  { id: "cadFiles", nameEn: "CAD Documents", nameAm: "የካድ ንድፎች", category: "Engineering", description: "DWG/PDF drawings and blueprint links" }
];

// Sensitive fields to redact from display/preview to protect credentials & PII
const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "pin",
  "attendancePin",
  "biometricSecret",
  "fingerprintSecret",
  "secretKey",
  "apiKey",
  "privateKey",
  "private_key",
  "credentials",
  "credential",
  "sessionToken"
]);

export const FirestoreDataExplorer: React.FC<FirestoreDataExplorerProps> = ({
  currentUserRole,
  currentUserProfile,
  isAmharic,
  onLogAction
}) => {
  // Authorization Gate: Strictly Super Admin, Head Office, and Project Manager / Auditors
  const isAuthorized = useMemo(() => {
    return [
      UserRole.SUPER_ADMIN,
      UserRole.HEAD_OFFICE,
      UserRole.PROJECT_MANAGER,
      UserRole.AUDITOR
    ].includes(currentUserRole);
  }, [currentUserRole]);

  const [selectedCollection, setSelectedCollection] = useState<string>("tasks");
  const [collectionDocs, setCollectionDocs] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search & Filter
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<any | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Query Bounds & Pagination
  const [queryLimit, setQueryLimit] = useState<number>(25);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  // Available Categories
  const categories = useMemo(() => {
    return Array.from(new Set(AUTHORIZED_COLLECTIONS.map(c => c.category)));
  }, []);

  const filteredCollectionsList = useMemo(() => {
    return AUTHORIZED_COLLECTIONS.filter(c => {
      if (categoryFilter !== "ALL" && c.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter]);

  // Fetch Bounded Query from Firestore
  const fetchCollectionData = async (collectionId: string, resetCursor: boolean = true) => {
    if (!isAuthorized) return;
    setIsLoadingDocs(true);
    setErrorMessage(null);

    try {
      if (!isFirebaseReady || !db) {
        throw new Error("Firestore client is offline or not configured.");
      }

      const colRef = collection(db, collectionId);
      // Safe bounded query with limit
      const q = query(colRef, limit(queryLimit));
      const snap = await getDocs(q);

      const items = snap.docs.map(docSnap => {
        const rawData = docSnap.data();
        // Sanitize sensitive credential fields
        const safeData: Record<string, any> = {};
        for (const [key, value] of Object.entries(rawData)) {
          if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
            safeData[key] = "•••••••• [REDACTED]";
          } else {
            safeData[key] = value;
          }
        }
        return {
          id: docSnap.id,
          ...safeData
        };
      });

      setCollectionDocs(items);
      setHasMore(snap.docs.length === queryLimit);
      if (snap.docs.length > 0) {
        setLastVisibleDoc(snap.docs[snap.docs.length - 1]);
      } else {
        setLastVisibleDoc(null);
      }

      if (onLogAction) {
        onLogAction(
          "Firestore Collection Inspected",
          `Inspected ${items.length} records in collection "${collectionId}" via Data Explorer.`
        );
      }
    } catch (err: any) {
      console.error(`Error querying collection ${collectionId}:`, err);
      // Graceful error state handling
      if (err.message?.includes("requires an index") || err.code === "failed-precondition") {
        setErrorMessage(
          isAmharic
            ? `ለዚህ ኮሌክሽን የተወሳሰበ ኢንዴክስ (Composite Index) ያስፈልጋል። እባክዎ በFirebase Console ውስጥ ኢንዴክሱን ይፍጠሩ።`
            : `This query requires a Firestore composite index. You can create the index in the Firebase Console: ${err.message}`
        );
      } else if (err.code === "permission-denied") {
        setErrorMessage(
          isAmharic
            ? `ፍቃድ ተከልክሏል፡ ለኮሌክሽን "${collectionId}" ተገቢውን ሚና በደህንነት ደንቦች ውስጥ ያረጋግጡ።`
            : `Permission Denied: Your role does not have authorization to list documents in "${collectionId}".`
        );
      } else {
        setErrorMessage(err.message || String(err));
      }
      setCollectionDocs([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (selectedCollection && isAuthorized) {
      fetchCollectionData(selectedCollection, true);
    }
  }, [selectedCollection, queryLimit, isAuthorized]);

  // Client-side text filter on the fetched bounded snapshot
  const filteredDocs = useMemo(() => {
    if (!filterQuery.trim()) return collectionDocs;
    const q = filterQuery.toLowerCase();
    return collectionDocs.filter(d => {
      if (d.id?.toLowerCase().includes(q)) return true;
      return Object.values(d).some(v => {
        if (typeof v === "string" || typeof v === "number") {
          return String(v).toLowerCase().includes(q);
        }
        return false;
      });
    });
  }, [collectionDocs, filterQuery]);

  // Export Filtered Records to JSON
  const handleExportJson = () => {
    if (filteredDocs.length === 0) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredDocs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `Firestore_${selectedCollection}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe schema detector for table columns
  const detectedKeys = useMemo(() => {
    if (collectionDocs.length === 0) return ["id"];
    const keySet = new Set<string>(["id"]);
    collectionDocs.slice(0, 10).forEach(d => {
      Object.keys(d).forEach(k => {
        if (typeof d[k] !== "object") keySet.add(k);
      });
    });
    return Array.from(keySet).slice(0, 7); // First 7 scalar keys for clean table
  }, [collectionDocs]);

  if (!isAuthorized) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto shadow-xl">
        <div className="w-16 h-16 bg-red-600/10 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <h3 className="text-xl font-black text-white">
          {isAmharic ? "የዳታቤዝ ፍተሻ ፍቃድ የለዎትም" : "Administrator-Only Access Required"}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {isAmharic
            ? "የFirestore Data Explorer አገልግሎት ለSuper Admin፣ Head Office እና Project Manager ብቻ የተፈቀደ የደህንነት መሳሪያ ነው።"
            : "The Firestore Data Explorer is an administrative inspection tool restricted to authorized Super Admin, Head Office, and Project Manager roles to prevent unauthorized data exposure."}
        </p>
      </div>
    );
  }

  const currentMeta = AUTHORIZED_COLLECTIONS.find(c => c.id === selectedCollection);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-600/30">
              <Database size={20} />
            </span>
            <span className="text-xs uppercase tracking-widest font-extrabold text-emerald-400">
              {isAmharic ? "የዳታቤዝ አሰሳ እና የደህንነት ቁጥጥር" : "Enterprise Firestore Data Explorer"}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {isAmharic ? "የFirestore ዳታቤዝ ሰነዶችና ኮሌክሽኖች መርማሪ" : "Firestore Data Explorer & Schema Inspector"}
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {isAmharic
              ? "በሲስተሙ የተፈቀዱ 30+ ኮሌክሽኖችን በቀጥታ ከCloud Firestore በመጠየቅ፣ ሰነዶችን በደህንነት ለመመርመር፣ የተሰወሩ መስኮችን ለመፈተሽ የሚያስችል መሳሪያ።"
              : "Inspect active Firestore collections, schema shapes, bounded documents, and record timestamps safely with automatic credential redaction and index-aware querying."}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchCollectionData(selectedCollection, true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw size={14} className={isLoadingDocs ? "animate-spin text-emerald-400" : ""} />
            <span>{isAmharic ? "ዳታ አድስ" : "Refresh Data"}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Download size={14} />
            <span>{isAmharic ? "ወደ JSON ላክ" : "Export JSON"}</span>
          </button>
        </div>
      </div>

      {/* Main Explorer Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Authorized Collections Navigation */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Folder size={14} className="text-emerald-500" />
              <span>{isAmharic ? "ኮሌክሽኖች" : "Collections"} ({AUTHORIZED_COLLECTIONS.length})</span>
            </h4>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-600"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 max-h-[550px] overflow-y-auto pr-1">
            {filteredCollectionsList.map(c => {
              const isSelected = selectedCollection === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCollection(c.id);
                    setFilterQuery("");
                    setSelectedDocForPreview(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-2xl transition-all cursor-pointer font-bold text-xs flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-md"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate text-xs">{isAmharic ? c.nameAm : c.nameEn}</div>
                    <div className={`font-mono text-[10px] truncate ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                      /{c.id}
                    </div>
                  </div>
                  <ChevronRight size={14} className={isSelected ? "text-emerald-400" : "text-slate-300"} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Document List & Data Viewer */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 lg:col-span-3">
          {/* Active Collection Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                  /{selectedCollection}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {currentMeta?.category || "Database Collection"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentMeta?.description}
              </p>
            </div>

            {/* Bounded Limit Selector */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-bold">{isAmharic ? "ገደብ:" : "Limit:"}</span>
              <select
                value={queryLimit}
                onChange={(e) => setQueryLimit(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700"
              >
                <option value={10}>10 docs</option>
                <option value={25}>25 docs</option>
                <option value={50}>50 docs</option>
                <option value={100}>100 docs</option>
              </select>
            </div>
          </div>

          {/* Search bar inside collection */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={isAmharic ? "በሰነድ መለያ ወይም በመረጃ ፈልግ..." : "Filter loaded records by document ID or fields..."}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold space-y-1">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Records Table */}
          {isLoadingDocs ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw size={24} className="animate-spin mx-auto text-emerald-500" />
              <p className="text-xs font-bold">{isAmharic ? "ሰነዶች ከFirestore በመጫን ላይ ናቸው..." : "Fetching bounded documents from Firestore..."}</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">{isAmharic ? "በዚህ ኮሌክሽን ውስጥ ምንም ሰነድ አልተገኘም" : "No documents found in this collection."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 text-[11px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Document ID</th>
                    {detectedKeys.filter(k => k !== "id").map(k => (
                      <th key={k} className="py-2.5 px-3 truncate max-w-[140px]">{k}</th>
                    ))}
                    <th className="py-2.5 px-3 text-center">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((docItem) => (
                    <tr key={docItem.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                        {docItem.id}
                      </td>
                      {detectedKeys.filter(k => k !== "id").map(k => {
                        const val = docItem[k];
                        const displayVal = val === undefined || val === null
                          ? "—"
                          : typeof val === "object"
                          ? JSON.stringify(val).slice(0, 20) + "..."
                          : String(val);
                        return (
                          <td key={k} className="py-2.5 px-3 truncate max-w-[140px]" title={String(val)}>
                            {displayVal}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedDocForPreview(docItem)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          {isAmharic ? "ይዘት ተመልከት" : "Preview"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Record Count Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              {isAmharic ? "የቀረቡ ሰነዶች:" : "Displayed Records:"}{" "}
              <strong className="text-slate-800">{filteredDocs.length}</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              {hasMore ? "More documents available (increase limit to fetch)" : "All documents in current bounded batch loaded"}
            </span>
          </div>
        </div>
      </div>

      {/* DOCUMENT JSON PREVIEW MODAL */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  /{selectedCollection}/{selectedDocForPreview.id}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {isAmharic ? "የሰነድ ሙሉ መረጃ (Safe Data Preview)" : "Document Schema & Raw Data Preview"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">{isAmharic ? "የተገኙ መስኮች (Field Summary):" : "Discovered Fields:"}</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(selectedDocForPreview).map(f => (
                  <span key={f} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px]">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1">
                JSON Payload ({isAmharic ? "ደህንነታቸው የተጠበቁ መስኮች" : "Redacted for Credential Safety"}):
              </span>
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
                {JSON.stringify(selectedDocForPreview, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                {isAmharic ? "ዝጋ" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
