import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Users, 
  ShieldAlert, 
  ShieldCheck,
  Layers, 
  Trash2, 
  Check, 
  AlertTriangle, 
  FolderPlus,
  UserCheck,
  Edit,
  Wrench,
  RefreshCw,
  Clock,
  CheckCircle2,
  Mail,
  Phone,
  Database
} from "lucide-react";
import { Worker, Team, UserRole } from "../types";
import { DbService } from "../services/db";
import { RoleChangeApprovalService } from "../services/roleChangeApprovalService";
import { db, isFirebaseReady, sanitizeForFirestore } from "../firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

interface AdminPanelProps {
  workers: Worker[];
  teams: Team[];
  currentUserRole: UserRole;
  onChangeUserRole: (role: UserRole) => void;
  onAddWorker: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onAddTeam: (team: Team) => void;
  isAmharic: boolean;
  t: (key: string) => string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  workers,
  teams,
  currentUserRole,
  onChangeUserRole,
  onAddWorker,
  onDeleteWorker,
  onAddTeam,
  isAmharic,
  t
}) => {
  // Add Worker Form State
  const [workerName, setWorkerName] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerTrade, setWorkerTrade] = useState("Foreman");
  const [workerDept, setWorkerDept] = useState("Formwork Assembly");
  const [workerCompany, setWorkerCompany] = useState("Digital Construction ERP");
  const [teamIdForWorker, setTeamIdForWorker] = useState("T-01");

  // Add Team Form State
  const [teamName, setTeamName] = useState("");
  const [teamDept, setTeamDept] = useState("Formwork Assembly");

  // Project/Spatial Parameters Addition Form
  const [newBldgName, setNewBldgName] = useState("");
  const [newFloorNum, setNewFloorNum] = useState(1);
  const [notifyMsg, setNotifyMsg] = useState("");

  // Live Firestore Registrants / Users State
  const [firestoreUsers, setFirestoreUsers] = useState<any[]>([]);
  const [roleSelections, setRoleSelections] = useState<Record<string, UserRole>>({});
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  useEffect(() => {
    const unsubUsers = DbService.subscribeUsers((liveUsers) => {
      setFirestoreUsers(liveUsers || []);
    });

    let unsubReqs = () => {};
    if (isFirebaseReady && db) {
      unsubReqs = onSnapshot(
        collection(db, "role_change_requests"),
        (snap) => {
          snap.docs.forEach((d) => {
            const reqData = d.data();
            if (reqData && reqData.userId && reqData.userName) {
              setFirestoreUsers((prev) => {
                if (prev.some((u) => (u.uid || u.id) === reqData.userId)) return prev;
                return [
                  {
                    id: reqData.userId,
                    uid: reqData.userId,
                    displayName: reqData.userName,
                    email: reqData.userEmail || "",
                    phoneNumber: reqData.phoneNumber || "",
                    role: reqData.status === "Approved" ? (reqData.assignedRole || reqData.requestedRole) : "Pending",
                    requestedRole: reqData.requestedRole || UserRole.WORKER,
                    status: reqData.status === "Approved" ? "Active" : "Pending",
                    createdAt: reqData.requestedDate || new Date().toISOString()
                  },
                  ...prev
                ];
              });
            }
          });
        },
        () => {}
      );
    }

    return () => {
      unsubUsers();
      unsubReqs();
    };
  }, []);

  const handleForceSyncRegistrantsToFirestore = async () => {
    setIsSyncingFirestore(true);
    try {
      await DbService.syncOutboxNow();
      const allUsers = await DbService.getUsers();
      const allReqs = RoleChangeApprovalService.getRequests();
      if (isFirebaseReady && db) {
        for (const u of allUsers) {
          const uid = u.uid || u.id;
          if (uid) {
            await setDoc(doc(db, "users", uid), sanitizeForFirestore({ ...u, id: uid, uid }), { merge: true });
          }
        }
        for (const r of allReqs) {
          if (r.id) {
            await setDoc(doc(db, "role_change_requests", r.id), sanitizeForFirestore(r), { merge: true });
          }
          if (r.userId && r.userName) {
            await setDoc(
              doc(db, "users", r.userId),
              sanitizeForFirestore({
                id: r.userId,
                uid: r.userId,
                displayName: r.userName,
                name: r.userName,
                email: r.userEmail || "",
                phoneNumber: r.phoneNumber || "",
                role: r.status === "Approved" ? (r.assignedRole || r.requestedRole) : "Pending",
                requestedRole: r.requestedRole || UserRole.WORKER,
                status: r.status === "Approved" ? "Active" : "Pending",
                createdAt: r.requestedDate || new Date().toISOString()
              }),
              { merge: true }
            );
          }
        }
        for (const w of workers) {
          if (w.id) {
            await setDoc(doc(db, "workers", w.id), sanitizeForFirestore(w), { merge: true });
            await setDoc(doc(db, "employees", w.id), sanitizeForFirestore(w), { merge: true });
          }
        }
      }
      const refreshed = await DbService.getUsers();
      setFirestoreUsers(refreshed);
      setNotifyMsg(
        isAmharic
          ? "ሁሉም አዲስ ተመዝጋቢዎች እና ሰራተኞች ወደ Firestore በተሳካ ሁኔታ ተመሳስለዋል!"
          : "All registrants and workers successfully synchronized to Firestore!"
      );
      setTimeout(() => setNotifyMsg(""), 4000);
    } catch (err) {
      console.error("Error syncing registrants to Firestore:", err);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  const handleApproveRegistrant = async (userRec: any) => {
    const uid = userRec.uid || userRec.id;
    if (!uid) return;
    const targetRole =
      roleSelections[uid] ||
      (userRec.requestedRole && userRec.requestedRole !== "Pending" ? userRec.requestedRole : UserRole.WORKER);

    const updatedUser = {
      ...userRec,
      id: uid,
      uid,
      role: targetRole,
      requestedRole: targetRole,
      status: "Active",
      approvedAt: new Date().toISOString()
    };

    await DbService.saveUser(updatedUser);
    if (isFirebaseReady && db) {
      await setDoc(doc(db, "users", uid), sanitizeForFirestore(updatedUser), { merge: true }).catch(() => {});
    }

    // Also approve any matching request in RoleChangeApprovalService
    const allReqs = RoleChangeApprovalService.getRequests();
    const matchingReq = allReqs.find(
      (r) =>
        r.userId === uid ||
        (userRec.email && r.userEmail?.toLowerCase() === userRec.email.toLowerCase())
    );
    if (matchingReq) {
      RoleChangeApprovalService.approveRequest({
        requestId: matchingReq.id,
        approverName: "Admin Console",
        approverRole: currentUserRole,
        assignedRoleOverride: targetRole
      });
    }

    // Also ensure registrant is in workers & employees collections
    const existingWorker = workers.find((w) => w.id === uid || w.id === userRec.employeeId);
    if (!existingWorker) {
      const wId = userRec.employeeId || uid;
      onAddWorker({
        id: wId,
        name: userRec.displayName || userRec.name || "Registered Staff",
        phoneNumber: userRec.phoneNumber || "",
        department: userRec.department || String(targetRole),
        trade: userRec.trade || String(targetRole),
        position: String(targetRole),
        company: "Digital Construction ERP",
        teamId: "T-01",
        status: "Active",
        joinedDate: new Date().toISOString().split("T")[0]
      });
    }

    setNotifyMsg(
      isAmharic
        ? `ተመዝጋቢ ${userRec.displayName || userRec.name} በ"${targetRole}" የስራ ድርሻ ጸድቋል!`
        : `Approved registrant ${userRec.displayName || userRec.name} with role "${targetRole}"!`
    );
    setTimeout(() => setNotifyMsg(""), 3500);
  };

  const handleDeleteRegistrant = async (uid: string) => {
    setFirestoreUsers((prev) => prev.filter((u) => (u.uid || u.id) !== uid));
    if (isFirebaseReady && db) {
      await deleteDoc(doc(db, "users", uid)).catch(() => {});
    }
    await DbService.removeDocument("users", uid, []);
  };

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    const newW: Worker = {
      id: `W-${Date.now().toString().slice(-4)}`,
      name: workerName.trim(),
      phoneNumber: workerPhone.trim() || "",
      department: workerDept,
      trade: workerTrade,
      company: workerCompany,
      teamId: teamIdForWorker,
      status: "Active",
      joinedDate: new Date().toISOString().split("T")[0]
    };

    if (workerEmail.trim()) {
      (newW as any).email = workerEmail.trim().toLowerCase();
    }

    onAddWorker(newW);
    setWorkerName("");
    setWorkerPhone("");
    setWorkerEmail("");
    setNotifyMsg(`Successfully registered worker ${newW.name} (${newW.id}) to Firestore`);
    setTimeout(() => setNotifyMsg(""), 3500);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const newT: Team = {
      id: `T-${Date.now().toString().slice(-2)}`,
      name: teamName,
      leaderId: "W-100", // placeholder Leader
      department: teamDept,
      memberIds: [],
      safetyScore: 95,
      qualityScore: 90,
      averageProductivity: 85
    };

    onAddTeam(newT);
    setTeamName("");
    setNotifyMsg(`Successfully registered assembly crew: ${newT.name}`);
    setTimeout(() => setNotifyMsg(""), 3500);
  };

  const handleAddProjectSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBldgName.trim()) return;

    setNotifyMsg(`Registered New Project Target: ${newBldgName}, Floor ${newFloorNum}`);
    setNewBldgName("");
    setTimeout(() => setNotifyMsg(""), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls: Role Switcher & System Notifications */}
      <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="text-red-600" size={22} />
            <span>{isAmharic ? "የአስተዳደር መቆጣጠሪያ ፓነል" : "Administrative System Command Console"}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isAmharic 
              ? "የሰራተኞች ምዝገባ፣ የቡድን ድልድል፣ የህንፃ ፕሮጀክት መቆጣጠሪያዎች እና የተጠቃሚ ሚናዎች አስተዳደር።"
              : "Manage site carpenters, scaffolders, concrete foremen, and project boundaries."}
          </p>
        </div>

        {/* User Role Simulation Dropdown & Sole Super Admin Badge */}
        <div className="flex flex-col items-end gap-2 text-xs">
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-700">
            <span className="font-black text-red-700 uppercase">Only Super Admin:</span>{" "}
            <span className="font-bold text-slate-900">Nuriye Ahmed Adem</span>{" | "}
            <span>0910097862/0920843843</span>{" | "}
            <span className="underline">mejennur669@gmail.com</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-500">Active Duty Role:</span>
            <select 
              value={currentUserRole}
              onChange={(e) => onChangeUserRole(e.target.value as UserRole)}
              className="bg-white border border-slate-200 rounded p-1.5 font-bold text-slate-800 outline-none"
            >
              {Array.from(new Set(Object.values(UserRole)))
                .filter(role => role !== UserRole.SUPER_ADMIN || currentUserRole === UserRole.SUPER_ADMIN)
                .map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {notifyMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <Check size={16} className="text-emerald-600" />
          <span>{notifyMsg}</span>
        </div>
      )}

      {/* Role Change Approval System Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-5 rounded-2xl border border-amber-500/30 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="text-sm font-bold text-white">
                {isAmharic ? "የአዲስ ተመዝጋቢዎች እና የሥራ ድርሻ ማጽደቂያ (Firestore Live)" : "New Registrants & Role Approval Registry (Firestore Live)"}
              </h3>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono font-bold">
                {isAmharic ? `በFirestore የተመዘገቡ: ${firestoreUsers.length}` : `Firestore Users: ${firestoreUsers.length}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isAmharic 
                ? "አዲስ ተመዝጋቢዎች ሲመዘገቡ በቀጥታ በFirestore (users, workers, employees, role_change_requests) ላይ ይቀመጣሉ። ከታች ባለው ሰንጠረዥ ማጽደቅ ይችላሉ።"
                : "All newly registered users are automatically stored in Firestore (users, workers, employees, role_change_requests) and listed in real time below."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleForceSyncRegistrantsToFirestore}
          disabled={isSyncingFirestore}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-2 shrink-0 cursor-pointer transition disabled:opacity-50"
        >
          <RefreshCw size={15} className={isSyncingFirestore ? "animate-spin" : ""} />
          <span>{isAmharic ? "ወደ Firestore አመሳስል (Sync Now)" : "Sync All to Firestore"}</span>
        </button>
      </div>

      {/* Live Firestore Registrants Directory */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Database size={18} className="text-red-600" />
              <span>
                {isAmharic
                  ? "አዲስ ተመዝጋቢዎች እና የተጠቃሚዎች ዝርዝር (Firestore `users` Collection)"
                  : "New Registrants & Users Directory (Firestore `users` Collection)"}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAmharic
                ? "ከመመዝገቢያ ገጽ እና ከሰራተኛ መመዝገቢያ የተመዘገቡ አዲስ ተመዝጋቢዎች ቀጥታ ከFirestore"
                : "Live real-time list of registered accounts and pending registrants stored in Firestore"}
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
            {isAmharic ? `ጠቅላላ ተመዝጋቢዎች: ${firestoreUsers.length}` : `Total Registrants: ${firestoreUsers.length}`}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-100">
                <th className="p-3">{isAmharic ? "መለያ (UID / ID)" : "User / Emp ID"}</th>
                <th className="p-3">{isAmharic ? "ሙሉ ስም" : "Full Name"}</th>
                <th className="p-3">{isAmharic ? "ኢሜል እና ስልክ" : "Email & Phone"}</th>
                <th className="p-3">{isAmharic ? "የተጠየቀ ድርሻ" : "Requested Role"}</th>
                <th className="p-3">{isAmharic ? "የአሁን ድርሻ / ሁኔታ" : "Active Role & Status"}</th>
                <th className="p-3 text-right">{isAmharic ? "እርምጃ (Approve / Role)" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {firestoreUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    {isAmharic
                      ? "ምንም የተመዘገበ ተጠቃሚ አልተገኘም። 'ወደ Firestore አመሳስል' የሚለውን ይጫኑ ወይም አዲስ ተመዝጋቢ ይመዝግቡ።"
                      : "No registrants found in Firestore yet. Click 'Sync All to Firestore' or register a new user."}
                  </td>
                </tr>
              ) : (
                firestoreUsers.map((u) => {
                  const uid = u.uid || u.id;
                  const isPending = u.status === "Pending" || u.role === "Pending";
                  const selectedRoleForRow =
                    roleSelections[uid] ||
                    (u.requestedRole && u.requestedRole !== "Pending" ? u.requestedRole : (u.role && u.role !== "Pending" ? u.role : UserRole.WORKER));
                  return (
                    <tr key={uid} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-500">
                        <div>{u.employeeId || uid}</div>
                        <div className="text-[10px] text-slate-400">UID: {String(uid).slice(0, 12)}</div>
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {u.displayName || u.name || "Registered User"}
                      </td>
                      <td className="p-3 text-slate-600 space-y-0.5">
                        {u.email && (
                          <div className="flex items-center space-x-1 font-mono text-[11px]">
                            <Mail size={11} className="text-slate-400" />
                            <span>{u.email}</span>
                          </div>
                        )}
                        {u.phoneNumber && (
                          <div className="flex items-center space-x-1 font-mono text-[11px]">
                            <Phone size={11} className="text-slate-400" />
                            <span>{u.phoneNumber}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded font-mono text-[11px]">
                          {u.requestedRole || u.role || "Worker"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                              isPending
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            }`}
                          >
                            {isPending ? (isAmharic ? "በመጠባበቅ ላይ (Pending)" : "Pending Approval") : `${u.role} (Active)`}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <select
                            value={selectedRoleForRow}
                            onChange={(e) =>
                              setRoleSelections((prev) => ({
                                ...prev,
                                [uid]: e.target.value as UserRole
                              }))
                            }
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-800 outline-none"
                          >
                            {Array.from(new Set(Object.values(UserRole)))
                              .filter((r) => r !== UserRole.SUPER_ADMIN || u.email === "mejennur669@gmail.com")
                              .map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleApproveRegistrant(u)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer transition"
                          >
                            <CheckCircle2 size={12} />
                            <span>{isPending ? (isAmharic ? "አጽድቅ" : "Approve") : (isAmharic ? "ድርሻ ቀይር" : "Update")}</span>
                          </button>
                          {u.email !== "mejennur669@gmail.com" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRegistrant(uid)}
                              className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer"
                              title="Delete Registrant"
                            >
                              <Trash2 size={14} />
                            </button>
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

      {/* Grid: Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recruit / Add Worker Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
            <Plus className="text-red-600" size={18} />
            <span>Register New Site Worker</span>
          </h3>
          <p className="text-[11px] text-slate-400">Recruit new craftsmen and attach them to specific formwork assembly crews.</p>

          <form onSubmit={handleCreateWorker} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Full Worker Name</label>
              <input 
                type="text" required value={workerName}
                onChange={e => setWorkerName(e.target.value)}
                placeholder="e.g. Samuel Kebede"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Trade Specialty</label>
                <select 
                  value={workerTrade} onChange={e => setWorkerTrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
                >
                  <option value="Foreman">Foreman</option>
                  <option value="Lead Carpenter">Lead Carpenter</option>
                  <option value="Carpenter">Carpenter</option>
                  <option value="Steel Fixer">Steel Fixer</option>
                  <option value="Concrete Pourer">Concrete Pourer</option>
                  <option value="Scaffolder">Scaffolder</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Crew Team</label>
                <select 
                  value={teamIdForWorker} onChange={e => setTeamIdForWorker(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Company</label>
                <input 
                  type="text" value={workerCompany}
                  onChange={e => setWorkerCompany(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              Recruit Worker
            </button>
          </form>
        </div>

        {/* Create Team Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
            <Plus className="text-red-600" size={18} />
            <span>Create New Assembly Crew</span>
          </h3>
          <p className="text-[11px] text-slate-400">Establish structural crews and configure baseline metrics.</p>

          <form onSubmit={handleCreateTeam} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Crew/Team Name</label>
              <input 
                type="text" required value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Assembly Crew Delta"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Main Department Assignment</label>
              <select 
                value={teamDept} onChange={e => setTeamDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
              >
                <option value="Formwork Assembly">Formwork Assembly</option>
                <option value="Formwork Stripping">Formwork Stripping</option>
                <option value="Concreting">Concreting</option>
                <option value="Scaffolding">Scaffolding</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              Create Crew
            </button>
          </form>
        </div>

        {/* Spatial Targets / Projects Addition */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 text-xs">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
            <FolderPlus className="text-red-600" size={18} />
            <span>Register Project Blocks & Floors</span>
          </h3>
          <p className="text-[11px] text-slate-400">Add spatial constraints and structure blocks into cycle trackers.</p>

          <form onSubmit={handleAddProjectSpace} className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Building / Block Name</label>
              <input 
                type="text" required value={newBldgName}
                onChange={e => setNewBldgName(e.target.value)}
                placeholder="e.g. Digital Construction ERP Saris Block C"
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600">Starting Floor Number</label>
              <input 
                type="number" min="1" max="40" value={newFloorNum}
                onChange={e => setNewFloorNum(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
            >
              Add Project Space
            </button>
          </form>
        </div>

      </div>

      {/* Roster lists */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Registered Craftsmen Roster</h3>
        
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-100">
                <th className="p-3">Worker ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Trade SPECIALTY</th>
                <th className="p-3">Company</th>
                <th className="p-3">Assigned Crew</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {workers.map(w => {
                const team = teams.find(t => t.id === w.teamId);
                return (
                  <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-500">{w.id}</td>
                    <td className="p-3 font-bold text-slate-900">{w.name}</td>
                    <td className="p-3 text-slate-600">{w.trade}</td>
                    <td className="p-3 text-slate-500">{w.company}</td>
                    <td className="p-3">
                      <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded">
                        {team ? team.name : "Unassigned"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => onDeleteWorker(w.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Worker"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
