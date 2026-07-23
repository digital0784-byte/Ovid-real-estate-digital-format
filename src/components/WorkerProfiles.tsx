import React, { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  User, 
  Phone, 
  UserPlus, 
  CheckCircle, 
  Activity, 
  X, 
  Save, 
  FileText, 
  Briefcase, 
  Building2, 
  Award, 
  Wrench, 
  Contact, 
  AlertTriangle,
  IdCard,
  Trash2,
  Compass,
  MapPin
} from "lucide-react";
import { Worker, UserRole, ProjectZone } from "../types";

export const calculateExperience = (joinedDateStr: string, isAmharic: boolean) => {
  if (!joinedDateStr) return isAmharic ? "አልታወቀም" : "Unknown";
  
  const joinedDate = new Date(joinedDateStr);
  const now = new Date();
  
  if (isNaN(joinedDate.getTime())) {
    return isAmharic ? "አልታወቀም" : "Unknown";
  }
  
  let years = now.getFullYear() - joinedDate.getFullYear();
  let months = now.getMonth() - joinedDate.getMonth();
  let days = now.getDate() - joinedDate.getDate();
  
  if (days < 0) {
    months--;
    days += 30; // Approximation of days in previous month
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const parts: string[] = [];
  if (years > 0) {
    parts.push(isAmharic ? `${years} ዓመት` : `${years} ${years === 1 ? 'year' : 'years'}`);
  }
  if (months > 0) {
    parts.push(isAmharic ? `${months} ወር` : `${months} ${months === 1 ? 'month' : 'months'}`);
  }
  if (days > 0 || parts.length === 0) {
    parts.push(isAmharic ? `${days} ቀን` : `${days} ${days === 1 ? 'day' : 'days'}`);
  }
  
  return parts.join(isAmharic ? " ከ " : " ");
};

interface WorkerProfilesProps {
  workers: Worker[];
  zones?: ProjectZone[];
  onAddWorker: (worker: Worker) => void;
  onUpdateWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  isAmharic: boolean;
  currentUserRole: UserRole;
  onLogAction?: (action: string, details: string) => void;
}

export const WorkerProfiles: React.FC<WorkerProfilesProps> = ({
  workers,
  zones = [],
  onAddWorker,
  onUpdateWorker,
  onDeleteWorker,
  isAmharic,
  currentUserRole,
  onLogAction
}) => {
  // Check authorization (Super Admin/Head Office and Project Manager are authorized)
  const isAuthorized = useMemo(() => {
    return currentUserRole === UserRole.HEAD_OFFICE || currentUserRole === UserRole.PROJECT_MANAGER;
  }, [currentUserRole]);

  // Check if authorized to assign/muddib work zones (Section Head, Supervisor, Team Leader, and higher Admins)
  const isZoneAssignmentAuthorized = useMemo(() => {
    return [
      UserRole.HEAD_OFFICE,
      UserRole.PROJECT_MANAGER,
      UserRole.SECTION_HEAD,
      UserRole.SUPERVISOR,
      UserRole.TEAM_LEADER,
      UserRole.SUPER_ADMIN
    ].includes(currentUserRole);
  }, [currentUserRole]);

  // Roster States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedTrade, setSelectedTrade] = useState("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Selected Worker for Detail view/edit
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(
    workers.length > 0 ? workers[0].id : null
  );

  // Edit worker form state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Worker>>({});

  // Add worker modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    id: "",
    name: "",
    department: "Formwork Assembly",
    trade: "Carpenter",
    company: "Digital Construction ERP",
    phoneNumber: "",
    emergencyContact: "",
    skills: "",
    joinedDate: new Date().toISOString().split("T")[0],
    status: "Active" as "Active" | "Inactive",
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
    teamId: "T-01",
    zone: ""
  });

  const [formError, setFormError] = useState("");

  // Get active selected worker object
  const activeWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId) || null;
  }, [workers, selectedWorkerId]);

  // Unique options for filter dropdowns
  const departments = useMemo(() => {
    const list = new Set(workers.map(w => w.department));
    return ["All", ...Array.from(list)];
  }, [workers]);

  const trades = useMemo(() => {
    const list = new Set(workers.map(w => w.trade));
    return ["All", ...Array.from(list)];
  }, [workers]);

  const companies = useMemo(() => {
    const list = new Set(workers.map(w => w.company));
    return ["All", ...Array.from(list)];
  }, [workers]);

  // Filtered Workers
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchSearch = 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = selectedDepartment === "All" || w.department === selectedDepartment;
      const matchTrade = selectedTrade === "All" || w.trade === selectedTrade;
      const matchCompany = selectedCompany === "All" || w.company === selectedCompany;
      const matchStatus = selectedStatus === "All" || w.status === selectedStatus;

      return matchSearch && matchDept && matchTrade && matchCompany && matchStatus;
    });
  }, [workers, searchTerm, selectedDepartment, selectedTrade, selectedCompany, selectedStatus]);

  // Start edit handler
  const startEdit = (worker: Worker) => {
    if (!isAuthorized) return;
    setEditForm({ ...worker });
    setIsEditing(true);
  };

  // Save edit handler
  const saveEdit = () => {
    if (!editForm.id || !editForm.name) {
      setFormError(isAmharic ? "እባክዎ ስምና መለያ ቁጥር ያስገቡ!" : "Name and ID are required!");
      return;
    }
    
    onUpdateWorker(editForm as Worker);
    setIsEditing(false);
    setFormError("");
    if (onLogAction) {
      onLogAction("Worker Profile Updated", `Updated worker profile ${editForm.name} (${editForm.id})`);
    }
  };

  // Add new worker handler
  const handleAddNewWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.id || !addForm.name) {
      setFormError(isAmharic ? "እባክዎ ስምና መለያ ቁጥር ያስገቡ!" : "Name and ID are required!");
      return;
    }

    if (workers.some(w => w.id === addForm.id)) {
      setFormError(isAmharic ? "ይህ የሠራተኛ መለያ ቁጥር ቀድሞ ተመዝግቧል!" : "This Worker ID is already registered!");
      return;
    }

    const newWorker: Worker = {
      ...addForm,
      id: addForm.id.trim(),
      name: addForm.name.trim(),
      phoneNumber: addForm.phoneNumber.trim() || undefined,
      emergencyContact: addForm.emergencyContact.trim() || undefined,
      skills: addForm.skills.trim() || undefined,
      zone: addForm.zone || undefined
    };

    onAddWorker(newWorker);
    // Reset filters so the newly created worker is immediately visible
    setSearchTerm("");
    setSelectedDepartment("All");
    setSelectedTrade("All");
    setSelectedCompany("All");
    setSelectedStatus("All");
    setSelectedWorkerId(newWorker.id);
    setShowAddModal(false);
    
    // Reset add form
    const nextIdNum = 100 + workers.length + 2;
    setAddForm({
      id: `ERP-W-${nextIdNum}`,
      name: "",
      department: "Formwork Assembly",
      trade: "Carpenter",
      company: "Digital Construction ERP",
      phoneNumber: "",
      emergencyContact: "",
      skills: "",
      joinedDate: new Date().toISOString().split("T")[0],
      status: "Active",
      photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop",
      teamId: "T-01",
      zone: ""
    });
    setFormError("");

    if (onLogAction) {
      onLogAction("Worker Profile Registered", `Registered new worker profile ${newWorker.name} (${newWorker.id})`);
    }
  };

  // Helper to trigger automated placeholder ID
  const suggestNewId = () => {
    const nextIdNum = 100 + workers.length + 1;
    setAddForm(prev => ({ ...prev, id: `ERP-W-${nextIdNum}` }));
  };

  return (
    <div id="worker-profiles-module" className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
            <Users size={18} className="text-red-600" />
            <span>{isAmharic ? "የሰራተኞች ዝርዝር መገለጫ" : "Detailed Worker Profiles Directory"}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isAmharic 
              ? "የሰራተኞች መለያ መረጃ፣ ዲፓርትመንት፣ ሙያ፣ ችሎታ እና ድንገተኛ አደጋ አድራሻዎችን ማስተዳደሪያ።" 
              : "Access, audit, and update certified worker credentials, skill sets, emergency contacts, and active status."}
          </p>
        </div>

        {/* ROLE SECURITY STATUS */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${
            isAuthorized 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {isAuthorized ? (
              <>
                <ShieldCheck size={16} className="text-emerald-600" />
                <span>{isAmharic ? "ፈቃድ አለዎት (አድሚን / ስራ አስኪያጅ)" : "Write Permission Granted"}</span>
              </>
            ) : (
              <>
                <ShieldAlert size={16} className="text-amber-600" />
                <span>{isAmharic ? "ለዕይታ ብቻ (የተገደበ)" : "Read-Only Access"}</span>
              </>
            )}
          </div>

          {isAuthorized && (
            <button
              onClick={() => {
                suggestNewId();
                setShowAddModal(true);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>{isAmharic ? "አዲስ ሰራተኛ መዝግብ" : "Add Worker Profile"}</span>
            </button>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* SEARCH FIELD */}
          <div className="md:col-span-2 relative">
            <span className="absolute left-3.5 top-2.5 text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isAmharic ? "በስም ወይም መለያ ቁጥር ይፈልጉ..." : "Search by name, ID number..."}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none focus:border-red-500 placeholder-slate-500 text-white"
            />
          </div>

          {/* DEPT FILTER */}
          <div className="space-y-1">
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-white cursor-pointer"
            >
              <option value="All">{isAmharic ? "ሁሉም ዲፓርትመንት" : "All Departments"}</option>
              {departments.filter(d => d !== "All").map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* TRADE FILTER */}
          <div className="space-y-1">
            <select
              value={selectedTrade}
              onChange={e => setSelectedTrade(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-white cursor-pointer"
            >
              <option value="All">{isAmharic ? "ሁሉም የሙያ ዘርፍ" : "All Trades"}</option>
              {trades.filter(t => t !== "All").map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
          </div>

          {/* COMPANY FILTER */}
          <div className="space-y-1">
            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-white cursor-pointer"
            >
              <option value="All">{isAmharic ? "ሁሉም ኩባንያዎች" : "All Companies"}</option>
              {companies.filter(c => c !== "All").map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>{isAmharic ? "አጠቃላይ የተገኙ ሠራተኞች ቆጠራ:" : "Active Match Index:"} <strong className="text-white">{filteredWorkers.length}</strong></span>
            <span>{isAmharic ? "ሁኔታ:" : "Status Filter:"}</span>
            <div className="flex gap-1">
              {["All", "Active", "Inactive"].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                    selectedStatus === status 
                      ? "bg-red-600 text-white" 
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {isAmharic ? (
                    status === "All" ? "ሁሉም" :
                    status === "Active" ? "ንቁ" : "ያልነቃ"
                  ) : status}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedDepartment("All");
              setSelectedTrade("All");
              setSelectedCompany("All");
              setSelectedStatus("All");
            }}
            className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider cursor-pointer"
          >
            {isAmharic ? "ማጣሪያዎችን አጽዳ" : "Reset Filters"}
          </button>
        </div>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* WORKER DIRECTORY ROSTER LIST (LEFT COLUMN) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {isAmharic ? "የሰራተኞች ስም ዝርዝር" : "Organization Roster"}
            </span>
            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {filteredWorkers.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredWorkers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
                <p>{isAmharic ? "ምንም ተዛማጅ ሰራተኛ አልተገኘም" : "No workers found matching selected criteria."}</p>
              </div>
            ) : (
              filteredWorkers.map(w => {
                const isActive = w.id === selectedWorkerId;
                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      setSelectedWorkerId(w.id);
                      setIsEditing(false);
                      setFormError("");
                    }}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                      isActive 
                        ? "bg-red-50/75 border-l-4 border-red-600 pl-2.5" 
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* AVATAR IMAGE */}
                    <img
                      src={w.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop"}
                      alt={w.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                    />

                    {/* BASIC CREDENTIALS */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                          {w.name}
                        </h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                          w.status === "Active" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {isAmharic ? (w.status === "Active" ? "ንቁ" : "ያልነቃ") : w.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{w.id}</p>
                      
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-0.5">
                          <Building2 size={10} />
                          <span>{w.company}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-semibold">{w.trade}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-red-600 font-bold bg-red-50/70 px-1 py-0.5 rounded text-[9px] shrink-0 font-sans flex items-center gap-0.5">
                          <Briefcase size={8} className="text-red-500" />
                          <span>{calculateExperience(w.joinedDate, isAmharic)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DETAILED PROFILE VIEW / EDIT PANEL (RIGHT COLUMN) */}
        <div className="lg:col-span-7 space-y-6">
          {activeWorker ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* PANEL BAR */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <IdCard size={16} className="text-red-500" />
                  <span className="text-xs font-extrabold uppercase tracking-widest">
                    {isAmharic ? "የሠራተኛው ሙሉ መገለጫ" : "Worker Profile File"}
                  </span>
                </div>
                {isAuthorized && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setFormError("");
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} />
                          <span>{isAmharic ? "ሰርዝ" : "Cancel"}</span>
                        </button>
                        <button
                          onClick={saveEdit}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Save size={13} />
                          <span>{isAmharic ? "አስቀምጥ" : "Save Changes"}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(activeWorker)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Wrench size={13} />
                        <span>{isAmharic ? "መገለጫውን አሻሽል" : "Modify Credentials"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* PROFILE OVERVIEW HERO CARD */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative shrink-0">
                    <img
                      src={isEditing ? (editForm.photo || "") : (activeWorker.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop")}
                      alt={activeWorker.name}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-md"
                    />
                    {isEditing && (
                      <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-1.5 rounded-lg border border-slate-700 cursor-pointer hover:bg-slate-800">
                        <Phone size={10} className="hidden" /> {/* just standard iconography */}
                        <UserPlus size={10} />
                      </div>
                    )}
                  </div>

                  <div className="text-center sm:text-left flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editForm.name || ""}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="text-sm font-bold bg-white border border-slate-300 rounded px-2 py-1 w-full text-slate-800"
                          placeholder="Worker Full Name"
                        />
                        <input
                          type="text"
                          value={editForm.id || ""}
                          disabled // ID is primary key
                          className="text-xs font-mono bg-slate-100 border border-slate-200 rounded px-2 py-1 w-full text-slate-500 cursor-not-allowed"
                          placeholder="Worker ID"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                          {activeWorker.name}
                        </h3>
                        <p className="text-xs font-mono text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">ID:</span>
                          <strong>{activeWorker.id}</strong>
                        </p>
                        
                        <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2 text-[10px] font-bold uppercase">
                          <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100">
                            {activeWorker.trade}
                          </span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {activeWorker.department}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* WORK ZONE ASSIGNMENT SECTION */}
              <div id="worker-zone-assignment-card" className="mx-6 mt-4 p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-extrabold uppercase text-[10px] text-slate-500 tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} className="text-red-600 animate-bounce" />
                    <span>{isAmharic ? "የስራ ዞን ምደባ" : "Work Zone Assignment"}</span>
                  </h4>
                  {isZoneAssignmentAuthorized ? (
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded font-black uppercase">
                      {isAmharic ? "መመደብ ይቻላል" : "Authorized"}
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-black uppercase">
                      {isAmharic ? "ለዕይታ ብቻ" : "Read-Only"}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center text-xs">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      {isAmharic ? "አሁን ያለበት ዞን" : "Current Assigned Zone"}
                    </label>
                    {activeWorker.zone ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl font-bold border border-red-100 font-mono">
                        <Compass size={13} className="text-red-500" />
                        <span>{activeWorker.zone}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        {isAmharic ? "ምንም ዞን አልተመደበም" : "No Zone Assigned"}
                      </div>
                    )}
                  </div>

                  {isZoneAssignmentAuthorized ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        {isAmharic ? "አዲስ ዞን ይመድቡ" : "Assign New Zone"}
                      </label>
                      <select
                        id="zone-assignment-dropdown"
                        value={activeWorker.zone || ""}
                        onChange={(e) => {
                          const newZone = e.target.value;
                          const updatedWorker = { ...activeWorker, zone: newZone || undefined };
                          onUpdateWorker(updatedWorker);
                          if (onLogAction) {
                            onLogAction(
                              "Worker Zone Assigned",
                              `Assigned worker ${activeWorker.name} (${activeWorker.id}) to zone: ${newZone || "None"}`
                            );
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-bold text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        <option value="">{isAmharic ? "-- ዞን ይምረጡ --" : "-- Select Zone --"}</option>
                        {zones.map((z) => {
                          const label = `${z.building} - FL ${z.floor} (${z.zone})`;
                          return (
                            <option key={z.id} value={label}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 font-medium leading-relaxed">
                      {isAmharic 
                        ? "እያንዳንዱን ሰራተኛ ዞን መመደብ የsection head supervisor and team leader ስራ ነው።" 
                        : "Assigning worker zones is restricted to Section Heads, Supervisors, and Team Leaders."}
                    </div>
                  )}
                </div>
              </div>

              {/* FORM ERROR MESSAGE */}
              {formError && (
                <div className="m-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800 font-medium">
                  <AlertTriangle className="text-red-500 shrink-0" size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* COMPREHENSIVE FIELDS MATRIX */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700">
                
                {/* COMPANY & ORGANIZATION */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3.5">
                  <h4 className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider flex items-center gap-1 border-b pb-1">
                    <Building2 size={12} className="text-slate-500" />
                    <span>{isAmharic ? "ድርጅታዊ መረጃ" : "Company & Roster"}</span>
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "ቀጣሪ ኩባንያ" : "Employer Company"}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.company || ""}
                        onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    ) : (
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 size={13} className="text-red-600 shrink-0" />
                        <span>{activeWorker.company}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "ዲፓርትመንት" : "Department"}
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.department || "Formwork Assembly"}
                        onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                      >
                        <option value="Formwork Assembly">Formwork Assembly</option>
                        <option value="Formwork Stripping">Formwork Stripping</option>
                        <option value="Steel Fixing">Steel Fixing</option>
                        <option value="Concrete Casting">Concrete Casting</option>
                        <option value="Safety & Rigging">Safety & Rigging</option>
                        <option value="Support & Logistics">Support & Logistics</option>
                      </select>
                    ) : (
                      <div className="font-semibold text-slate-800">{activeWorker.department}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "የስራ ዘርፍ / ሙያ" : "Certified Trade"}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.trade || ""}
                        onChange={e => setEditForm({ ...editForm, trade: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    ) : (
                      <div className="font-semibold text-slate-800">{activeWorker.trade}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "የተቀጠረበት ቀን" : "Employment Date"}
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.joinedDate || ""}
                        onChange={e => setEditForm({ ...editForm, joinedDate: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    ) : (
                      <div className="font-medium text-slate-600 font-mono">{activeWorker.joinedDate}</div>
                    )}
                  </div>
                </div>

                {!isEditing && (
                  <div className="bg-red-50/45 p-3 rounded-xl border border-red-100 flex items-center gap-3">
                    <Briefcase size={18} className="text-red-500 shrink-0" />
                    <div>
                      <div className="text-[10px] font-black uppercase text-red-600">
                        {isAmharic ? "በራስ-ሰር የተሰላ የስራ ልምድ" : "Auto-Calculated Work Experience"}
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {calculateExperience(activeWorker.joinedDate, isAmharic)}
                      </div>
                    </div>
                  </div>
                )}

                {/* PERSONAL & CONTACT */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3.5">
                  <h4 className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider flex items-center gap-1 border-b pb-1">
                    <Contact size={12} className="text-slate-500" />
                    <span>{isAmharic ? "ግላዊ እና አድራሻ" : "Identity & Contacts"}</span>
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "ስልክ ቁጥር" : "Phone Number"}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.phoneNumber || ""}
                        onChange={e => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                        placeholder="+251 9XX-XXXXXX"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    ) : (
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                        <Phone size={13} className="text-slate-400" />
                        <span>{activeWorker.phoneNumber || "Not Configured / አልተሞላም"}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "አደጋ ጊዜ ተጠሪ አድራሻ" : "Emergency Contact Information"}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.emergencyContact || ""}
                        onChange={e => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                        placeholder="Aster Kebede - Wife (+251 911...)"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    ) : (
                      <div className="font-semibold text-slate-800 bg-red-50/40 p-2 rounded-lg border border-red-100/40 leading-relaxed">
                        {activeWorker.emergencyContact || "No Emergency Contact configured / የለም"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "የመገለጫ ፎቶ ሊንክ" : "Profile Picture URL"}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.photo || ""}
                        onChange={e => setEditForm({ ...editForm, photo: e.target.value })}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                      />
                    ) : (
                      <p className="text-[10px] text-slate-400 truncate font-mono">
                        {activeWorker.photo || "No photo path assigned"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 block">
                      {isAmharic ? "ሁኔታ" : "Organization Status"}
                    </label>
                    {isEditing ? (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="editStatus"
                            checked={editForm.status === "Active"}
                            onChange={() => setEditForm({ ...editForm, status: "Active" })}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>Active</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="editStatus"
                            checked={editForm.status === "Inactive"}
                            onChange={() => setEditForm({ ...editForm, status: "Inactive" })}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>Inactive</span>
                        </label>
                      </div>
                    ) : (
                      <span className={`inline-block font-bold text-[10px] uppercase px-2 py-0.5 rounded ${
                        activeWorker.status === "Active" 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {activeWorker.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* SKILLS SET & COMPETENCIES (FULL WIDTH) */}
                <div className="md:col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                  <h4 className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider flex items-center gap-1 border-b pb-1">
                    <Award size={12} className="text-slate-500" />
                    <span>{isAmharic ? "ሙያዊ ችሎታዎች እና የምስክር ወረቀቶች" : "Skills Matrix & Verified Competencies"}</span>
                  </h4>

                  <div className="space-y-2">
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={editForm.skills || ""}
                        onChange={e => setEditForm({ ...editForm, skills: e.target.value })}
                        placeholder="Enter skills separated by commas, e.g. Aluminium Formwork, Rebar Spacing"
                        className="w-full bg-white border border-slate-300 rounded p-2 text-xs"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {activeWorker.skills ? (
                          activeWorker.skills.split(",").map((s, idx) => (
                            <span 
                              key={idx} 
                              className="bg-slate-900 text-slate-100 text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-800 font-sans shadow-2xs"
                            >
                              ✓ {s.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">No custom skills mapped yet / የሙያ ችሎታዎች አልተገለጹም</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* READ ONLY BANNER FOR UNAUTHORIZED ROLE */}
              {!isAuthorized && (
                <div className="m-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-amber-900 leading-relaxed font-semibold">
                    <p className="font-bold">
                      {isAmharic ? "ማሳሰቢያ: መገለጫዎችን ማሻሻል አልተፈቀደም" : "Authorization Alert: Read-Only Session"}
                    </p>
                    <p className="mt-1 font-medium text-amber-700">
                      {isAmharic 
                        ? "በድርጅቱ ሕግ መሠረት የሠራተኞችን መረጃ ማሻሻልና ማስተካከል የሚችሉት 'Super Admin' ወይም 'Project Manager' ብቻ ናቸው። እባክዎ መለያዎን በራስጌው ላይ ይቀይሩ።" 
                        : "According to compliance bylaws, modifying worker profile fields is restricted to 'Super Admin' (Head Office) or 'Project Manager' profiles. Please switch session roles in the header dropdown to gain write permissions."}
                    </p>
                  </div>
                </div>
              )}

              {/* ADMINISTRATIVE ACTIONS FOR DELETION */}
              {isAuthorized && !isEditing && (
                <div className="mx-6 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <h5 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider">{isAmharic ? "የሰራተኛ መረጃ ስረዛ" : "Roster Decommissioning"}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{isAmharic ? "ይህንን ሰራተኛ ከቋሚ መዝገብ ላይ ለመሰረዝ" : "Remove this worker from active operations roster."}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(isAmharic ? `${activeWorker.name} ን ከድርጅት መዝገብ ላይ ለመሰረዝ እርግጠኛ ነዎት?` : `Are you absolutely sure you want to remove ${activeWorker.name} from organization registry?`)) {
                        onDeleteWorker(activeWorker.id);
                        setSelectedWorkerId(workers[0]?.id || null);
                        if (onLogAction) {
                          onLogAction("Worker Decommissioned", `Decommissioned worker ${activeWorker.name} (${activeWorker.id})`);
                        }
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Trash2 size={12} />
                    <span>{isAmharic ? "ሠራተኛውን ሰርዝ" : "Delete Worker"}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <p>{isAmharic ? "እባክዎ መረጃውን ለማየት ከግራ በኩል ሰራተኛ ይምረጡ" : "Please select a worker from the roster list on the left to review detailed profile cards."}</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD NEW WORKER MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* MODAL HEADER */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-red-500" />
                <h3 className="text-xs font-black uppercase tracking-widest">
                  {isAmharic ? "አዲስ ሰራተኛ መመዝገቢያ ቅጽ" : "Add Worker Profile"}
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL FORM BODY */}
            <form onSubmit={handleAddNewWorker} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              
              {/* COMPREHENSIVE ERROR BUBBLE */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium flex items-start gap-2">
                  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID FIELD */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "መለያ ቁጥር" : "Worker ID"} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={addForm.id}
                      onChange={e => setAddForm({ ...addForm, id: e.target.value })}
                      placeholder="e.g. ERP-W-111"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={suggestNewId}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 rounded text-[10px] font-bold border border-slate-300 cursor-pointer"
                    >
                      {isAmharic ? "አዲስ ፍጠር" : "Suggest"}
                    </button>
                  </div>
                </div>

                {/* NAME FIELD */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "ሙሉ ስም" : "Worker Name"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g. Chala Chuko"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* DEPT SELECTOR */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "ዲፓርትመንት" : "Department"}
                  </label>
                  <select
                    value={addForm.department}
                    onChange={e => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 cursor-pointer focus:bg-white"
                  >
                    <option value="Formwork Assembly">Formwork Assembly</option>
                    <option value="Formwork Stripping">Formwork Stripping</option>
                    <option value="Steel Fixing">Steel Fixing</option>
                    <option value="Concrete Casting">Concrete Casting</option>
                    <option value="Safety & Rigging">Safety & Rigging</option>
                    <option value="Support & Logistics">Support & Logistics</option>
                  </select>
                </div>

                {/* TRADE */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "የስራ ዘርፍ / ሙያ" : "Certified Trade"}
                  </label>
                  <input
                    type="text"
                    value={addForm.trade}
                    onChange={e => setAddForm({ ...addForm, trade: e.target.value })}
                    placeholder="e.g. Carpenter"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* COMPANY */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "ኩባንያ" : "Company"}
                  </label>
                  <input
                    type="text"
                    value={addForm.company}
                    onChange={e => setAddForm({ ...addForm, company: e.target.value })}
                    placeholder="Digital Construction ERP"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* PHONE */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "ስልክ ቁጥር" : "Phone Number"}
                  </label>
                  <input
                    type="text"
                    value={addForm.phoneNumber}
                    onChange={e => setAddForm({ ...addForm, phoneNumber: e.target.value })}
                    placeholder="+251 9XX-XXXXXX"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* EMERGENCY CONTACT */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "አደጋ ጊዜ ተጠሪ አድራሻ" : "Emergency Contact Information"}
                  </label>
                  <input
                    type="text"
                    value={addForm.emergencyContact}
                    onChange={e => setAddForm({ ...addForm, emergencyContact: e.target.value })}
                    placeholder="e.g. Aster Kebede - Wife (+251 911-234567)"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* PHOTO PATH */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "የመገለጫ ፎቶ ሊንክ" : "Profile Photo URL"}
                  </label>
                  <input
                    type="text"
                    value={addForm.photo}
                    onChange={e => setAddForm({ ...addForm, photo: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white font-mono"
                  />
                </div>

                {/* SKILLS */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "ሙያዊ ችሎታዎች (በኮማ የተለዩ)" : "Skills (comma separated)"}
                  </label>
                  <input
                    type="text"
                    value={addForm.skills}
                    onChange={e => setAddForm({ ...addForm, skills: e.target.value })}
                    placeholder="Aluminium Formwork, Blueprint reading, Scaffold safety"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* JOINED DATE */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "የተቀጠረበት ቀን" : "Joined Date"}
                  </label>
                  <input
                    type="date"
                    value={addForm.joinedDate}
                    onChange={e => setAddForm({ ...addForm, joinedDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:bg-white"
                  />
                </div>

                {/* STATUS */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "ሁኔታ" : "Roster Status"}
                  </label>
                  <select
                    value={addForm.status}
                    onChange={e => setAddForm({ ...addForm, status: e.target.value as "Active" | "Inactive" })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 cursor-pointer focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* ASSIGNED ZONE */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 block">
                    {isAmharic ? "የስራ ዞን ምደባ" : "Assigned Work Zone"}
                  </label>
                  <select
                    value={addForm.zone}
                    onChange={e => setAddForm({ ...addForm, zone: e.target.value })}
                    disabled={!isZoneAssignmentAuthorized}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 cursor-pointer focus:bg-white font-bold text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{isAmharic ? "-- ዞን ይምረጡ (አማራጭ) --" : "-- Select Zone (Optional) --"}</option>
                    {zones.map(z => {
                      const label = `${z.building} - FL ${z.floor} (${z.zone})`;
                      return (
                        <option key={z.id} value={label}>{label}</option>
                      );
                    })}
                  </select>
                  {!isZoneAssignmentAuthorized && (
                    <p className="text-[9px] text-amber-600 mt-1 italic">
                      {isAmharic ? "እያንዳንዱን ሰራተኛ ዞን መመደብ የsection head supervisor and team leader ስራ ነው።" : "Zone assignment is restricted to section head, supervisor, and team leader."}
                    </p>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold uppercase cursor-pointer"
                >
                  {isAmharic ? "ዝጋ" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-extrabold uppercase tracking-wider cursor-pointer"
                >
                  {isAmharic ? "ይመዝገብ" : "Register Worker Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
