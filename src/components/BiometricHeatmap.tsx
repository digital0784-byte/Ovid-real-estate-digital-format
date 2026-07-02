import React, { useState, useMemo } from "react";
import { 
  Fingerprint, 
  Users, 
  Flame, 
  MapPin, 
  Filter, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  RefreshCw, 
  Sliders, 
  Search,
  UserCheck
} from "lucide-react";
import { Worker, AttendanceRecord, AttendanceMethod, UserRole } from "../types";

interface BiometricHeatmapProps {
  workers: Worker[];
  attendance: AttendanceRecord[];
  isAmharic: boolean;
  onAddAttendance?: (record: AttendanceRecord) => void;
}

export const BiometricHeatmap: React.FC<BiometricHeatmapProps> = ({
  workers,
  attendance,
  isAmharic,
  onAddAttendance
}) => {
  // Local active configuration
  const [viewMode, setViewMode] = useState<"biometric" | "roster">("biometric");
  const [selectedTrade, setSelectedTrade] = useState<string>("All");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ floor: number; zone: string } | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<string>("");

  // Define building floors and zones to construct the grid
  const floors = [5, 4, 3, 2, 1];
  const zonesList = ["Zone A", "Zone B", "Zone C", "Zone D"];

  // Unique Trades available for filtering
  const trades = useMemo(() => {
    const allTrades = workers.map(w => w.trade).filter(Boolean);
    return ["All", ...Array.from(new Set(allTrades))];
  }, [workers]);

  // Today's date helper
  const todayDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Compute active on-site workers based on last successful biometric check-in (attendance record with checkIn !== null && checkOut === null)
  const activePresentRecords = useMemo(() => {
    // Group attendance by workerId to get their latest record of today
    const latestTodayRecords: Record<string, AttendanceRecord> = {};
    attendance
      .filter(a => a.date === todayDate || a.date === "2026-07-02") // Support mock date and real date
      .forEach(record => {
        const existing = latestTodayRecords[record.workerId];
        if (!existing || (record.checkIn && (!existing.checkIn || record.checkIn > existing.checkIn))) {
          latestTodayRecords[record.workerId] = record;
        }
      });

    // Filter to those currently checked in and not checked out
    return Object.values(latestTodayRecords).filter(a => a.checkIn && !a.checkOut);
  }, [attendance, todayDate]);

  // Map workers to their active status and current location
  const gridData = useMemo(() => {
    // Initialize empty grid mapping
    const map: Record<string, { workers: Worker[]; attendanceRecords: AttendanceRecord[] }> = {};
    floors.forEach(f => {
      zonesList.forEach(z => {
        map[`${f}-${z}`] = { workers: [], attendanceRecords: [] };
      });
    });

    if (viewMode === "biometric") {
      // Find where people checked in
      activePresentRecords.forEach(rec => {
        const worker = workers.find(w => w.id === rec.workerId);
        if (worker) {
          // Filter by Trade if applicable
          if (selectedTrade !== "All" && worker.trade !== selectedTrade) return;
          // Filter by Biometric Method if applicable
          if (selectedMethodFilter !== "All" && rec.method !== selectedMethodFilter) return;
          // Filter by Search query
          if (searchQuery && !worker.name.toLowerCase().includes(searchQuery.toLowerCase()) && !worker.id.toLowerCase().includes(searchQuery.toLowerCase())) return;

          const key = `${rec.floor}-${rec.zone}`;
          if (map[key]) {
            map[key].workers.push(worker);
            map[key].attendanceRecords.push(rec);
          }
        }
      });
    } else {
      // Roster planning view (allocated locations in worker profiles)
      workers.forEach(w => {
        if (w.status !== "Active") return; // Only active workers
        if (selectedTrade !== "All" && w.trade !== selectedTrade) return;
        if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase()) && !w.id.toLowerCase().includes(searchQuery.toLowerCase())) return;

        // In roster view we look at the worker's assigned floor and zone
        const fl = w.floor || 1;
        const zn = w.zone || "Zone A";
        const key = `${fl}-${zn}`;
        if (map[key]) {
          map[key].workers.push(w);
        }
      });
    }

    return map;
  }, [viewMode, activePresentRecords, workers, selectedTrade, selectedMethodFilter, searchQuery]);

  // Max count in a cell to compute relative density
  const maxDensityCount = useMemo(() => {
    let max = 1;
    (Object.values(gridData) as Array<{ workers: Worker[]; attendanceRecords: AttendanceRecord[] }>).forEach(cell => {
      if (cell.workers.length > max) {
        max = cell.workers.length;
      }
    });
    return max;
  }, [gridData]);

  // Dynamic Simulating of a Biometric Check-In
  const handleSimulateCheckIn = () => {
    if (!onAddAttendance) return;
    
    // Find a worker who is active but NOT currently checked in
    const currentlyCheckedInIds = activePresentRecords.map(r => r.workerId);
    const availableWorkers = workers.filter(w => w.status === "Active" && !currentlyCheckedInIds.includes(w.id));
    
    if (availableWorkers.length === 0) {
      setSimulationStatus(isAmharic 
        ? "ሁሉም ንቁ ሰራተኞች አስቀድመው ገብተዋል!" 
        : "All active workers are already checked-in!");
      setTimeout(() => setSimulationStatus(""), 3000);
      return;
    }

    const randomWorker = availableWorkers[Math.floor(Math.random() * availableWorkers.length)];
    const randomFloor = floors[Math.floor(Math.random() * floors.length)];
    const randomZone = zonesList[Math.floor(Math.random() * zonesList.length)];
    const randomMethod = Math.random() > 0.5 ? AttendanceMethod.FACE_RECOGNITION : AttendanceMethod.FINGERPRINT;

    const now = new Date();
    const timeString = now.toTimeString().split(" ")[0];

    const newRecord: AttendanceRecord = {
      id: `SIM-ATT-${Math.floor(1000 + Math.random() * 9000)}`,
      workerId: randomWorker.id,
      workerName: randomWorker.name,
      department: randomWorker.department,
      trade: randomWorker.trade,
      company: randomWorker.company,
      building: "Bole Heights Tower 1",
      floor: randomFloor,
      zone: randomZone,
      date: "2026-07-02", // Consistent mock date
      checkIn: timeString,
      checkOut: null,
      method: randomMethod,
      workingHours: 0,
      overtime: 0,
      status: "Present",
      deviceUsed: `OVID-BIO-SCAN-${Math.floor(10 + Math.random() * 90)}`,
      verifiedBy: "Biometric Auto-Gateway"
    };

    onAddAttendance(newRecord);
    setSimulationStatus(isAmharic 
      ? `እውነተኛ-ጊዜ ማመሳሰል፡ ${randomWorker.name} በ${randomMethod === AttendanceMethod.FACE_RECOGNITION ? "ፊት ገጽታ" : "ጣት አሻራ"} ፎቅ ${randomFloor} ${randomZone} ገብቷል!`
      : `Real-time Telemetry: ${randomWorker.name} verified via ${randomMethod} at FL ${randomFloor} ${randomZone}!`);
    
    // Auto focus the updated cell
    setSelectedCell({ floor: randomFloor, zone: randomZone });
    
    setTimeout(() => {
      setSimulationStatus("");
    }, 4500);
  };

  // Helper to determine background styling based on density
  const getCellClassName = (count: number) => {
    if (count === 0) {
      return "bg-slate-50 border-slate-200 hover:bg-slate-100/80 text-slate-400";
    }
    const ratio = count / maxDensityCount;
    if (ratio <= 0.35) {
      return "bg-red-50 hover:bg-red-100 border-red-200 text-red-700 font-semibold";
    } else if (ratio <= 0.7) {
      return "bg-red-100 hover:bg-red-200 border-red-300 text-red-800 font-extrabold";
    } else {
      return "bg-red-600 hover:bg-red-700 border-red-700 text-white font-black shadow-inner";
    }
  };

  return (
    <div id="biometric-heatmap-container" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      
      {/* Module Title & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-red-600 text-[10px] font-black uppercase text-white px-2.5 py-0.5 rounded-full tracking-wider animate-pulse flex items-center space-x-1">
              <Activity size={10} />
              <span>{isAmharic ? "እውነተኛ ጊዜ (Live)" : "REAL-TIME TELEMETRY"}</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">Bole Heights Tower 1</span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
            <Fingerprint className="text-red-600 shrink-0" size={22} />
            <span>
              {isAmharic 
                ? "የሰራተኞች ባዮሜትሪክ መገኘት የቦታ ሙቀት ካርታ" 
                : "Biometric Employee Real-Time Spatial Heatmap"}
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            {isAmharic 
              ? "የመጨረሻ ባዮሜትሪክ ፍተሻ (የጣት አሻራ ወይም የፊት መለያ) መሰረት በማድረግ ሰራተኞች በፎቆችና በዞኖች ያላቸውን ወቅታዊ ስርጭት ያሳያል"
              : "Visual floor density grid displaying workforce locations based on their last active biometric check-in gateways."}
          </p>
        </div>

        {/* View Mode Switches */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-center">
          <button
            type="button"
            onClick={() => {
              setViewMode("biometric");
              setSelectedCell(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              viewMode === "biometric"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Fingerprint size={13} className={viewMode === "biometric" ? "text-red-600" : ""} />
            <span>{isAmharic ? "ወቅታዊ መገኘት" : "Active Check-Ins"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("roster");
              setSelectedCell(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              viewMode === "roster"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users size={13} className={viewMode === "roster" ? "text-red-600" : ""} />
            <span>{isAmharic ? "ዕቅድ / ድልድል" : "Planned Roster"}</span>
          </button>
        </div>
      </div>

      {/* Control Dashboard Filters */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Trade Filter */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">{isAmharic ? "በሙያ ይለዩ" : "Filter by Trade"}</span>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Sliders size={12} className="text-slate-400" />
              <select
                value={selectedTrade}
                onChange={(e) => {
                  setSelectedTrade(e.target.value);
                  setSelectedCell(null);
                }}
                className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-xs"
              >
                <option value="All">{isAmharic ? "ሁሉም ሙያ" : "All Trades"}</option>
                {trades.filter(t => t !== "All").map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Biometric Method Filter (Only applicable in check-in view) */}
          {viewMode === "biometric" && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">{isAmharic ? "የማረጋገጫ ዘዴ" : "Biometric Method"}</span>
              <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                <Filter size={12} className="text-slate-400" />
                <select
                  value={selectedMethodFilter}
                  onChange={(e) => {
                    setSelectedMethodFilter(e.target.value);
                    setSelectedCell(null);
                  }}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer text-xs"
                >
                  <option value="All">{isAmharic ? "ሁሉም ባዮሜትሪክ" : "All Biometric"}</option>
                  <option value={AttendanceMethod.FACE_RECOGNITION}>{isAmharic ? "የፊት መለያ (Face ID)" : "Face Recognition"}</option>
                  <option value={AttendanceMethod.FINGERPRINT}>{isAmharic ? "የጣት አሻራ" : "Fingerprint"}</option>
                </select>
              </div>
            </div>
          )}

          {/* Text Search */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">{isAmharic ? "ሠራተኛ ይፈልጉ" : "Search Employee"}</span>
            <div className="flex items-center space-x-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs w-48 md:w-56">
              <Search size={12} className="text-slate-400" />
              <input
                type="text"
                placeholder={isAmharic ? "በስም ወይም መለያ ይፈልጉ..." : "Search by name or ID..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedCell(null);
                }}
                className="bg-transparent text-xs text-slate-700 outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Action Button: Live Simulator */}
        {onAddAttendance && (
          <button
            type="button"
            onClick={handleSimulateCheckIn}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs transition-all uppercase self-end md:self-auto"
          >
            <RefreshCw size={13} className="animate-spin-slow text-red-500" />
            <span>{isAmharic ? "የቀጥታ ፍተሻ አስመስል" : "Simulate Live Clock-In"}</span>
          </button>
        )}
      </div>

      {/* Simulation status bar alerts */}
      {simulationStatus && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-fadeIn shadow-xs">
          <UserCheck size={16} className="text-emerald-600 shrink-0 animate-bounce" />
          <span>{simulationStatus}</span>
        </div>
      )}

      {/* Heatmap Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Building Map Grid - Spans 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-700 flex items-center space-x-1">
              <MapPin size={13} className="text-red-600" />
              <span>{isAmharic ? "ቦሌ ሃይትስ፡ ግንባታ ምድብ (Floor Layout)" : "Bole Heights: Structural Grid Matrix"}</span>
            </span>
            {/* Color Legend */}
            <div className="flex items-center space-x-2 font-semibold text-[10px] text-slate-500">
              <span>{isAmharic ? "አነስተኛ" : "Low"}</span>
              <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span>{isAmharic ? "ከፍተኛ" : "High"}</span>
            </div>
          </div>

          {/* Map Outer Boundary */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
            
            {/* Structural Background Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/5 rounded-full blur-xl"></div>

            {/* Grid Header Labels */}
            <div className="grid grid-cols-5 gap-3 mb-2 font-mono text-[10px] tracking-widest text-slate-400 font-extrabold text-center uppercase">
              <div className="text-left font-sans">{isAmharic ? "ፎቅ (Floor)" : "Slab Level"}</div>
              {zonesList.map(z => (
                <div key={z}>{isAmharic ? z.replace("Zone", "ዞን") : z}</div>
              ))}
            </div>

            {/* Grid Building Matrix */}
            <div className="space-y-3 font-sans">
              {floors.map(floorNum => (
                <div key={floorNum} className="grid grid-cols-5 gap-3 items-center">
                  
                  {/* Left Label: Floor Level */}
                  <div className="bg-slate-950 px-3 py-4 rounded-xl border border-slate-800/80 text-left flex flex-col justify-center shadow-xs">
                    <span className="text-white text-xs font-black font-mono">FL {floorNum}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{floorNum === 5 ? (isAmharic ? "ሰገነት" : "Roof Level") : (isAmharic ? "ፎቅ" : "Story")} {floorNum}</span>
                  </div>

                  {/* Zone Columns */}
                  {zonesList.map(zoneName => {
                    const cellKey = `${floorNum}-${zoneName}`;
                    const cell = gridData[cellKey] || { workers: [], attendanceRecords: [] };
                    const workersCount = cell.workers.length;
                    const isSelected = selectedCell?.floor === floorNum && selectedCell?.zone === zoneName;

                    return (
                      <button
                        type="button"
                        key={zoneName}
                        onClick={() => setSelectedCell({ floor: floorNum, zone: zoneName })}
                        className={`py-4 px-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer h-full relative ${getCellClassName(workersCount)} ${
                          isSelected ? "ring-4 ring-red-500 scale-102 border-white" : ""
                        }`}
                      >
                        {/* Cell Value Indicator */}
                        {workersCount > 0 ? (
                          <>
                            <span className="text-base font-black tracking-tight">{workersCount}</span>
                            <span className="text-[9px] uppercase tracking-wider opacity-90 truncate max-w-full font-bold">
                              {isAmharic ? "ሠራተኛ" : "Workers"}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs opacity-40 font-bold font-mono">-</span>
                            <span className="text-[8px] uppercase tracking-wider opacity-30 font-semibold">{isAmharic ? "ባዶ" : "Empty"}</span>
                          </>
                        )}

                        {/* Visual Pulse for very crowded zones */}
                        {workersCount >= 3 && (
                          <span className="absolute top-1 right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </button>
                    );
                  })}

                </div>
              ))}
            </div>

            {/* Technical Footer Accent */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-500">
              <span>* SYSTEM INTEGRATION: ACTIVE GATEWAY LOGS INBOUND</span>
              <span>OVID DIGITAL TELEMETRY CORE v1.4</span>
            </div>

          </div>
        </div>

        {/* Selected Zone Detail Sidebar Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Header selection status */}
            <div className="border-b border-slate-200 pb-2">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">
                {isAmharic ? "የሥራ ቦታ ዝርዝር መረጃ" : "GRID CELL TELEMETRY"}
              </span>
              {selectedCell ? (
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2 mt-1">
                  <MapPin className="text-red-600" size={16} />
                  <span>
                    {isAmharic 
                      ? `ፎቅ ${selectedCell.floor} - ዞን ${selectedCell.zone.replace("Zone ", "")}` 
                      : `Floor ${selectedCell.floor} – ${selectedCell.zone}`}
                  </span>
                </h4>
              ) : (
                <h4 className="text-sm font-extrabold text-slate-500 flex items-center space-x-2 mt-1 italic">
                  <span>{isAmharic ? "እባክዎን ዞን ይምረጡ" : "Select a Zone on Map"}</span>
                </h4>
              )}
            </div>

            {/* Detail Listing */}
            {selectedCell ? (
              (() => {
                const cellKey = `${selectedCell.floor}-${selectedCell.zone}`;
                const cell = gridData[cellKey] || { workers: [], attendanceRecords: [] };
                const list = cell.workers;

                if (list.length === 0) {
                  return (
                    <div className="text-center py-10 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                      <Users size={24} className="mx-auto text-slate-300" />
                      <p className="text-[11px] leading-relaxed">
                        {isAmharic 
                          ? "በዚህ ፎቅ እና ዞን ውስጥ የተመዘገበ ንቁ ሰራተኛ የለም።" 
                          : "No active personnel detected in this sector under current filter criteria."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">
                      {isAmharic ? "በሳይቱ ላይ ያሉ ሰራተኞች" : "Identified Site Crew"} ({list.length})
                    </span>

                    <div className="space-y-2">
                      {list.map(w => {
                        // Find check in record details if in biometric mode
                        const attRec = cell.attendanceRecords.find(r => r.workerId === w.id);
                        return (
                          <div key={w.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-[11px] space-y-1.5 hover:border-red-400 transition-colors">
                            <div className="flex items-center space-x-2.5">
                              <img 
                                src={w.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"} 
                                alt={w.name} 
                                className="w-8 h-8 rounded-full border border-slate-300 object-cover" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-slate-800 block truncate">{w.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 block">{w.id} | {w.trade}</span>
                              </div>
                            </div>

                            {/* Telemetry metadata */}
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[9px] text-slate-500 gap-1.5 font-sans">
                              <span>
                                {isAmharic ? "አሰሪ ኩባንያ:" : "Employer:"} <strong className="text-slate-700">{w.company}</strong>
                              </span>
                              
                              {viewMode === "biometric" && attRec && (
                                <div className="flex items-center space-x-1.5 mt-0.5">
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded flex items-center space-x-0.5 font-bold">
                                    <CheckCircle2 size={9} />
                                    <span>{attRec.checkIn?.substring(0, 5)}</span>
                                  </span>
                                  <span className="bg-red-50 text-red-700 border border-red-200 px-1 rounded flex items-center space-x-0.5 font-semibold">
                                    <Smartphone size={9} />
                                    <span>{attRec.method === AttendanceMethod.FACE_RECOGNITION ? "Face ID" : "Finger"}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                <Flame size={28} className="mx-auto text-slate-300 animate-pulse" />
                <p className="text-[11px] leading-relaxed">
                  {isAmharic 
                    ? "የሙቀት ካርታውን በመጫን በዚያ ቦታ ያሉ የሰራተኞችን ማንነት እና የባዮሜትሪክ መዝገብ ይዘርዝሩ" 
                    : "Click any floor-zone block on the visual grid to load active crew details and verification timestamps."}
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 mt-4">
            <span className="text-[9px] font-mono text-slate-400 tracking-wider uppercase block">Spatial Distribution Stats</span>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-950 p-2 rounded">
                <span className="text-xs text-slate-400 block">{isAmharic ? "ንቁ ፎቆች" : "Active Floors"}</span>
                <span className="font-extrabold text-white text-sm font-mono">
                  {Array.from(new Set(activePresentRecords.map(r => r.floor))).length} / 5
                </span>
              </div>
              <div className="bg-slate-950 p-2 rounded">
                <span className="text-xs text-slate-400 block">{isAmharic ? "መገኘት ጠቅላላ" : "On-Site Total"}</span>
                <span className="font-extrabold text-red-500 text-sm font-mono">{activePresentRecords.length}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
