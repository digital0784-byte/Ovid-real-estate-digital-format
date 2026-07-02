import React, { useState } from "react";
import { 
  Plus, 
  Users, 
  ShieldAlert, 
  Layers, 
  Trash2, 
  Check, 
  AlertTriangle, 
  FolderPlus,
  UserCheck,
  Edit,
  Wrench
} from "lucide-react";
import { Worker, Team, UserRole } from "../types";

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
  const [workerTrade, setWorkerTrade] = useState("Foreman");
  const [workerDept, setWorkerDept] = useState("Formwork Assembly");
  const [workerCompany, setWorkerCompany] = useState("OVID Construction");
  const [teamIdForWorker, setTeamIdForWorker] = useState("T-01");

  // Add Team Form State
  const [teamName, setTeamName] = useState("");
  const [teamDept, setTeamDept] = useState("Formwork Assembly");

  // Project/Spatial Parameters Addition Form
  const [newBldgName, setNewBldgName] = useState("");
  const [newFloorNum, setNewFloorNum] = useState(1);
  const [notifyMsg, setNotifyMsg] = useState("");

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    const newW: Worker = {
      id: `W-${Date.now().toString().slice(-4)}`,
      name: workerName,
      department: workerDept,
      trade: workerTrade,
      company: workerCompany,
      teamId: teamIdForWorker,
      status: "Active",
      joinedDate: new Date().toISOString().split("T")[0]
    };

    onAddWorker(newW);
    setWorkerName("");
    setNotifyMsg(`Successfully registered worker ${newW.name} (${newW.id})`);
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

        {/* User Role Simulation Dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-500">Active Duty Role:</span>
          <select 
            value={currentUserRole}
            onChange={(e) => onChangeUserRole(e.target.value as UserRole)}
            className="bg-white border border-slate-200 rounded p-1.5 font-bold text-slate-800 outline-none"
          >
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {notifyMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <Check size={16} className="text-emerald-600" />
          <span>{notifyMsg}</span>
        </div>
      )}

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

              <div className="space-y-1">
                <label className="font-semibold text-slate-600">Department</label>
                <select 
                  value={workerDept} onChange={e => setWorkerDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
                >
                  <option value="Formwork Assembly">Formwork Assembly</option>
                  <option value="Formwork Stripping">Formwork Stripping</option>
                  <option value="Concreting">Concreting</option>
                  <option value="Scaffolding">Scaffolding</option>
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
                placeholder="e.g. OVID Saris Block C"
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
                <th className="p-3">Department</th>
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
                    <td className="p-3 text-slate-600">{w.department}</td>
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
