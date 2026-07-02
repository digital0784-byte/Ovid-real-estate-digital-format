import React, { useState } from "react";
import { 
  Plus, 
  Layers, 
  CheckSquare, 
  Camera, 
  AlertCircle, 
  FileText,
  User,
  Clock,
  MessageSquare
} from "lucide-react";
import { DailyProgressLog } from "../types";

interface DailyProgressProps {
  logs: DailyProgressLog[];
  onAddLog: (log: DailyProgressLog) => void;
  isAmharic: boolean;
  t: (key: string) => string;
}

export const DailyProgress: React.FC<DailyProgressProps> = ({
  logs,
  onAddLog,
  isAmharic,
  t
}) => {
  // New Log Form State
  const [building, setBuilding] = useState("OVID Bole Heights");
  const [floor, setFloor] = useState(4);
  const [zone, setZone] = useState("Zone A");
  const [installed, setInstalled] = useState(45);
  const [removed, setRemoved] = useState(15);
  const [remaining, setRemaining] = useState(5);
  const [concreteReady, setConcreteReady] = useState(false);
  const [inspection, setInspection] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [comments, setComments] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  // Handle mock file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) return;

    const newLog: DailyProgressLog = {
      id: `LOG-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      engineerId: "ENG-001",
      engineerName: "Eng. Yoseph Hailu",
      building,
      floor,
      zone,
      installedPanels: Number(installed),
      removedPanels: Number(removed),
      remainingPanels: Number(remaining),
      concreteReady,
      inspectionStatus: inspection,
      comments,
      photoUrl: photo || undefined
    };

    onAddLog(newLog);

    // Reset Form
    setComments("");
    setPhoto(null);
    setConcreteReady(false);
    setInspection("Pending");
  };

  return (
    <div className="space-y-6">
      
      {/* Daily Progress Entry Form & Live Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Entry Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="text-red-600" size={20} />
            <span>{t("Record Daily Formwork Progress")}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {isAmharic 
              ? "የእለቱን የአሉሚኒየም ፎርምወርቅ ገጠማ፣ የተነሱ ፓነሎች ብዛት፣ ፍተሻ ሁኔታ እና አስተያየቶችን መመዝገቢያ።"
              : "Logs panel cycle activities, safety status, and site notes."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Spatial details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Building & Block")}</label>
                <select 
                  value={building} 
                  onChange={e => setBuilding(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
                >
                  <option value="OVID Bole Heights">OVID Bole Heights</option>
                  <option value="OVID Saris Block B">OVID Saris Block B</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Floor & Zone")}</label>
                <input 
                  type="number" 
                  value={floor} 
                  onChange={e => setFloor(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Zone</label>
                <select 
                  value={zone} 
                  onChange={e => setZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none"
                >
                  <option value="Zone A">Zone A</option>
                  <option value="Zone B">Zone B</option>
                  <option value="Zone C">Zone C</option>
                </select>
              </div>
            </div>

            {/* Panel counts */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Installed Panels")}</label>
                <input 
                  type="number" 
                  value={installed} 
                  onChange={e => setInstalled(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Removed Panels")}</label>
                <input 
                  type="number" 
                  value={removed} 
                  onChange={e => setRemoved(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Remaining Panels")}</label>
                <input 
                  type="number" 
                  value={remaining} 
                  onChange={e => setRemaining(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
                />
              </div>
            </div>

            {/* Quality & Concrete toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Concrete ready toggle */}
              <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" 
                  id="concreteReady"
                  checked={concreteReady} 
                  onChange={e => setConcreteReady(e.target.checked)}
                  className="w-4 h-4 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer" 
                />
                <label htmlFor="concreteReady" className="font-semibold text-slate-700 cursor-pointer">
                  {t("Concrete Ready for Pouring")}
                </label>
              </div>

              {/* Inspection Status */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">{t("Inspection Status")}</label>
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                  {(["Pending", "Approved", "Rejected"] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setInspection(status)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                        inspection === status ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Photos & Camera upload */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700">Attach Site Progress Photo</label>
              <div className="flex items-center space-x-3">
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg flex items-center space-x-2 border border-slate-300">
                  <Camera size={14} />
                  <span>Choose Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {photo ? (
                  <div className="relative w-14 h-14 border rounded overflow-hidden">
                    <img src={photo} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="site progress" />
                    <button 
                      type="button" 
                      onClick={() => setPhoto(null)} 
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">No file selected (Optional)</span>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">{t("Comments")}</label>
              <textarea 
                rows={3} 
                value={comments} 
                onChange={e => setComments(e.target.value)}
                placeholder="Details of the installation quality, gaps sealed, scaffolding secure..."
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-800 outline-none" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 shadow-xs"
            >
              <Plus size={14} />
              <span>{t("Log Daily Progress")}</span>
            </button>
          </form>
        </div>

        {/* Live Daily Output Summary Dashboard */}
        <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 space-y-6 shadow-xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CheckSquare className="text-emerald-500" size={18} />
              <span>Today's Structural Summary</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Instantly calculated metrics across today's recorded panels.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Total Panels Installed</span>
              <span className="text-2xl font-black text-emerald-400">
                {logs.reduce((acc, log) => acc + log.installedPanels, 0)}
              </span>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Total Panels Stripped</span>
              <span className="text-2xl font-black text-blue-400">
                {logs.reduce((acc, log) => acc + log.removedPanels, 0)}
              </span>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 col-span-2">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Active Concreting Status</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block">
                {logs.some(l => l.concreteReady) ? "✓ Ready for Concrete pour" : "⚠ Alignment / lock verification pending"}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 text-[11px] text-slate-400 space-y-1 bg-slate-950 p-3 rounded-xl">
            <div className="flex justify-between">
              <span>Primary Site:</span>
              <span className="font-bold text-white">OVID Bole Heights</span>
            </div>
            <div className="flex justify-between">
              <span>Duty Engineer:</span>
              <span className="font-bold text-white">Yoseph Hailu</span>
            </div>
          </div>
        </div>

      </div>

      {/* History of logged events */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">{isAmharic ? "የቀን ስራዎች ታሪክ" : "Daily Progress History Logs"}</h2>
        
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 items-start justify-between text-xs text-slate-700">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded font-bold font-mono">
                    {log.building}
                  </span>
                  <span className="bg-red-50 text-red-700 text-[10px] px-2 py-0.5 rounded font-bold">
                    Floor {log.floor} - {log.zone}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    log.inspectionStatus === "Approved" ? "bg-emerald-100 text-emerald-800" :
                    log.inspectionStatus === "Rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {log.inspectionStatus}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1 max-w-sm text-[11px] font-medium text-slate-600">
                  <span>Installed: <strong className="text-slate-950">{log.installedPanels}</strong></span>
                  <span>Stripped: <strong className="text-slate-950">{log.removedPanels}</strong></span>
                  <span>In Stacks: <strong className="text-slate-950">{log.remainingPanels}</strong></span>
                </div>

                <div className="flex items-start space-x-1.5 bg-white p-2 rounded-lg border border-slate-100">
                  <MessageSquare size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <p className="text-slate-600 font-sans italic">"{log.comments}"</p>
                </div>
              </div>

              {/* Log meta and optional thumbnail */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                {log.photoUrl && (
                  <div className="w-16 h-16 rounded overflow-hidden border">
                    <img src={log.photoUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="progress snap" />
                  </div>
                )}
                <div className="text-right text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center space-x-1 justify-end text-slate-500 font-medium">
                    <User size={12} />
                    <span>{log.engineerName}</span>
                  </div>
                  <div className="flex items-center space-x-1 justify-end">
                    <Clock size={12} />
                    <span className="font-mono">{log.date}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
