import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  Users, 
  FileText, 
  Package, 
  TrendingUp, 
  Activity,
  ArrowRight,
  Sparkles,
  Server,
  Zap,
  Timer
} from "lucide-react";

interface SyncMonitorProps {
  isOnline: boolean;
  isAmharic: boolean;
  onSyncFinished?: (recordsCount: number) => void;
}

interface QueuedItem {
  id: string;
  category: "attendance" | "inventory" | "logs";
  titleEn: string;
  titleAm: string;
  timestamp: string;
  synced: boolean;
  detailsEn: string;
  detailsAm: string;
}

export const SyncMonitor: React.FC<SyncMonitorProps> = ({
  isOnline,
  isAmharic,
  onSyncFinished
}) => {
  // Mock internal queues
  const [queues, setQueues] = useState<QueuedItem[]>([
    {
      id: "Q-ATT-101",
      category: "attendance",
      titleEn: "Biometric Clock-In: Dawit Yoseph",
      titleAm: "ባዮሜትሪክ መግቢያ፡ ዳዊት ዮሴፍ",
      timestamp: "10:14:22 AM",
      synced: false,
      detailsEn: "Scanned via Fingerprint Terminal FT-04",
      detailsAm: "በጣት አሻራ ተርሚናል FT-04 ተመዝግቧል"
    },
    {
      id: "Q-ATT-102",
      category: "attendance",
      titleEn: "Biometric Clock-Out: Almaz Gudeta",
      titleAm: "ባዮሜትሪክ መውጫ፡ አልማዝ ጉደታ",
      timestamp: "10:18:05 AM",
      synced: false,
      detailsEn: "Scanned via Face Kiosk FK-02",
      detailsAm: "በፊት ባዮሜትሪክ መግቢያ FK-02 ተመዝግቧል"
    },
    {
      id: "Q-ATT-103",
      category: "attendance",
      titleEn: "Biometric Clock-In: Yohannes Bekele",
      titleAm: "ባዮሜትሪክ መግቢያ፡ ዮሐንስ በቀለ",
      timestamp: "10:22:41 AM",
      synced: false,
      detailsEn: "GPS Geo-validated check-in, Assembly Zone Alpha",
      detailsAm: "በጂፒኤስ የተረጋገጠ መግቢያ፣ የመሰብሰቢያ ዞን አልፋ"
    },
    {
      id: "Q-INV-201",
      category: "inventory",
      titleEn: "Waler Bundle WB-09 Relocation",
      titleAm: "የዋሌር ጥቅል WB-09 ዝውውር",
      timestamp: "10:25:00 AM",
      synced: false,
      detailsEn: "Moved from Zone A to Zone C (Building B)",
      detailsAm: "ከዞን A ወደ ዞን C ተዛውሯል (ህንጻ B)"
    },
    {
      id: "Q-INV-202",
      category: "inventory",
      titleEn: "Corner Panel CP-41 Damage Report",
      titleAm: "የማዕዘን ፓነል CP-41 የብልሽት ሪፖርት",
      timestamp: "10:31:12 AM",
      synced: false,
      detailsEn: "Reported: Bent flange. Status: Pending Repair",
      detailsAm: "ሪፖርት ተደርጓል፡ መታጠፍ። ሁኔታ፡ ጥገና የሚጠብቅ"
    },
    {
      id: "Q-LOG-301",
      category: "logs",
      titleEn: "HSE Toolbox Discussion Session",
      titleAm: "የደህንነት ውይይት መዝገብ (Toolbox Session)",
      timestamp: "10:15:30 AM",
      synced: false,
      detailsEn: "Topic: Scaffold safety limits. Workers present: 18",
      detailsAm: "ርዕስ፡ የስካፎልዲንግ ደህንነት ገደቦች። ሰራተኞች፡ 18"
    },
    {
      id: "Q-LOG-302",
      category: "logs",
      titleEn: "Concrete Pouring Quality Inspection Sign-off",
      titleAm: "የኮንክሪት ማፍሰስ ጥራት ምርመራ ማረጋገጫ",
      timestamp: "10:35:44 AM",
      synced: false,
      detailsEn: "Zone B slab curing check passed",
      detailsAm: "የዞን B የሰሌዳ እርጥበት ምርመራ አልፏል"
    }
  ]);

  const [wasOffline, setWasOffline] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentSyncPhase, setCurrentSyncPhase] = useState<string>("");
  const [currentSyncPhaseAm, setCurrentSyncPhaseAm] = useState<string>("");
  const [syncedCount, setSyncedCount] = useState(0);
  const [syncSpeed, setSyncSpeed] = useState<string>("0 KB/s");
  const [isSyncComplete, setIsSyncComplete] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "attendance" | "inventory" | "logs">("all");

  // Keep track of connection transitions
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setIsSyncComplete(false);
      setSyncProgress(0);
    } else if (isOnline && wasOffline) {
      // Transition offline -> online triggers beautiful sync animation automatically!
      triggerSyncSequence();
    }
  }, [isOnline]);

  const triggerSyncSequence = () => {
    if (isSyncing || queues.filter(q => !q.synced).length === 0) return;
    
    setIsSyncing(true);
    setIsSyncComplete(false);
    setSyncProgress(0);
    setSyncedCount(0);
    
    const totalToSync = queues.filter(q => !q.synced).length;
    const syncPhases = [
      { en: "Establishing TLS 1.3 encrypted handshake with ERP Cloud Broker...", am: "ከኢአርፒ የደመና አገናኝ ጋር ደህንነቱ የተጠበቀ ምስጠራ በመመስረት ላይ..." },
      { en: "Extracting offline payload packet and validating SHA-256 hashes...", am: "ከመስመር ውጭ መረጃዎችን በማውጣት እና የSHA-256 ቁልፎችን በማረጋገጥ ላይ..." },
      { en: "Executing master duplicate checks against central Firestore ledger...", am: "ከደመናው የፋየርስተር መዝገብ ጋር የተደገሙ መረጃዎችን በማጣራት ላይ..." },
      { en: "Streaming attendance records package [1/3]...", am: "የመገኘት መዝገቦችን ወደ ደመና በመላክ ላይ [1/3]..." },
      { en: "Streaming aluminum formwork asset inventory package [2/3]...", am: "የአሉሚኒየም ፎርምወርክ ንብረት መረጃዎችን በመላክ ላይ [2/3]..." },
      { en: "Streaming safety audit logs & snag checklists [3/3]...", am: "የደህንነት ኦዲትና የዕለት ሪፖርቶችን በመላክ ላይ [3/3]..." },
      { en: "Committing transactional block update & purging local device buffer...", am: "የግብይት ጥቅል ዝመናን በማጽደቅ እና የአካባቢ ተርሚናልን በማጽዳት ላይ..." }
    ];

    let currentPhaseIndex = 0;
    
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        const nextProgress = prev + 1;
        
        // Dynamically change steps and speeds
        if (nextProgress === 5) {
          currentPhaseIndex = 1;
        } else if (nextProgress === 15) {
          currentPhaseIndex = 2;
        } else if (nextProgress === 35) {
          currentPhaseIndex = 3;
          // Mark attendance as synced
          setQueues(qList => qList.map(q => q.category === "attendance" ? { ...q, synced: true } : q));
          setSyncedCount(3);
        } else if (nextProgress === 60) {
          currentPhaseIndex = 4;
          // Mark inventory as synced
          setQueues(qList => qList.map(q => q.category === "inventory" ? { ...q, synced: true } : q));
          setSyncedCount(5);
        } else if (nextProgress === 80) {
          currentPhaseIndex = 5;
          // Mark logs as synced
          setQueues(qList => qList.map(q => q.category === "logs" ? { ...q, synced: true } : q));
          setSyncedCount(7);
        } else if (nextProgress === 95) {
          currentPhaseIndex = 6;
        }

        setCurrentSyncPhase(syncPhases[currentPhaseIndex].en);
        setCurrentSyncPhaseAm(syncPhases[currentPhaseIndex].am);

        // Simulated Transfer Speed
        const speed = (Math.random() * 8.5 + 4.2).toFixed(1);
        setSyncSpeed(`${speed} KB/s`);

        if (nextProgress >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setWasOffline(false);
          setIsSyncComplete(true);
          setSyncSpeed("0 KB/s");
          
          if (onSyncFinished) {
            onSyncFinished(totalToSync);
          }
          return 100;
        }
        return nextProgress;
      });
    }, 120);
  };

  const addSimulatedOfflineRecord = (category: "attendance" | "inventory" | "logs") => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const id = `Q-${category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-3)}`;
    
    let newItem: QueuedItem;
    if (category === "attendance") {
      newItem = {
        id,
        category,
        titleEn: `Offline Attendance: Worker #${Math.floor(Math.random() * 50 + 100)}`,
        titleAm: `ከመስመር ውጭ መገኘት፡ ሰራተኛ #${Math.floor(Math.random() * 50 + 100)}`,
        timestamp,
        synced: false,
        detailsEn: "Queued during physical network interruption on floor 4",
        detailsAm: "በፎቅ 4 ላይ በኔትወርክ መቆራረጥ ምክንያት የተመዘገበ መረጃ"
      };
    } else if (category === "inventory") {
      newItem = {
        id,
        category,
        titleEn: `Formwork Prop ID-${Math.floor(Math.random() * 900 + 100)} Setup`,
        titleAm: `ፎርምወርክ ፕሮፕ ID-${Math.floor(Math.random() * 900 + 100)} ማቆም`,
        timestamp,
        synced: false,
        detailsEn: "Prop asset logged: Building Block C, Zone B",
        detailsAm: "የፕሮፕ ንብረት ምዝገባ፡ ግንባታ ብሎክ C፣ ዞን B"
      };
    } else {
      newItem = {
        id,
        category,
        titleEn: `Quality Check: Wedge Pin Lock inspect`,
        titleAm: `የጥራት ፍተሻ፡ የዊጅ ፒን መቆለፊያ ምልከታ`,
        timestamp,
        synced: false,
        detailsEn: "Scaffolding wedge pin inspection passed",
        detailsAm: "የስካፎልዲንግ ፒን መቆለፊያ ጥራት ፍተሻ ስኬታማ"
      };
    }

    setQueues(prev => [newItem, ...prev]);
    setIsSyncComplete(false);
  };

  const handleResetQueue = () => {
    setQueues(qList => qList.map(q => ({ ...q, synced: false })));
    setSyncProgress(0);
    setIsSyncComplete(false);
    setIsSyncing(false);
  };

  const pendingCount = queues.filter(q => !q.synced).length;
  const totalCount = queues.length;
  const isAllSynced = pendingCount === 0;

  // Split calculations
  const attendanceTotal = queues.filter(q => q.category === "attendance").length;
  const attendanceSynced = queues.filter(q => q.category === "attendance" && q.synced).length;
  
  const inventoryTotal = queues.filter(q => q.category === "inventory").length;
  const inventorySynced = queues.filter(q => q.category === "inventory" && q.synced).length;

  const logsTotal = queues.filter(q => q.category === "logs").length;
  const logsSynced = queues.filter(q => q.category === "logs" && q.synced).length;

  const filteredItems = queues.filter(q => activeFilter === "all" || q.category === activeFilter);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100">
      {/* Visual Header Grid */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-xl flex items-center justify-center transition-all ${
            isOnline 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
          }`}>
            {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] tracking-widest uppercase font-black text-red-500 font-mono">
                {isAmharic ? "ስማርት ማመሳሰል መከታተያ" : "Smart Sync Monitor Engine"}
              </span>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"}`} />
            </div>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              {isAmharic ? "የመስመር ውጭ ማመሳሰል መቆጣጠሪያ" : "Offline Packet Sync Monitor"}
              {!isOnline && (
                <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {isAmharic ? "ከመስመር ውጭ" : "Offline Cache Mode"}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Diagnostic actions */}
          {!isOnline && (
            <div className="flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold px-2 uppercase">{isAmharic ? "መዝገብ ጨምር:" : "Insert Cache:"}</span>
              <button 
                onClick={() => addSimulatedOfflineRecord("attendance")}
                className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-600/30 rounded-lg text-[10px] font-bold transition-all"
              >
                + {isAmharic ? "መገኘት" : "Attendance"}
              </button>
              <button 
                onClick={() => addSimulatedOfflineRecord("inventory")}
                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-600/30 rounded-lg text-[10px] font-bold transition-all"
              >
                + {isAmharic ? "ፓነል" : "Panel"}
              </button>
              <button 
                onClick={() => addSimulatedOfflineRecord("logs")}
                className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-600/30 rounded-lg text-[10px] font-bold transition-all"
              >
                + {isAmharic ? "ዕለታዊ ሪፖርት" : "Logs"}
              </button>
            </div>
          )}

          {isOnline && pendingCount > 0 && (
            <button
              onClick={triggerSyncSequence}
              disabled={isSyncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
              <span>{isSyncing ? (isAmharic ? "በማመሳሰል ላይ..." : "Syncing...") : (isAmharic ? "ደመና ላይ አመሳስል" : "Replicate to Cloud Now")}</span>
            </button>
          )}

          {isAllSynced && (
            <button
              onClick={handleResetQueue}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {isAmharic ? "ማመሳሰልን በድጋሚ ሞክር" : "Simulate Offline Buffer"}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Sync Progress Bar Dashboard (Triggered on transition offline->online) */}
        <AnimatePresence mode="wait">
          {(isSyncing || isSyncComplete) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4"
            >
              <div className="flex justify-between items-center text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <Activity size={14} className="text-indigo-400 animate-pulse" />
                  <span className="font-bold text-slate-400 uppercase tracking-wider">{isAmharic ? "የማስተላለፊያ ሂደት" : "TRANSMISSION LEDGER"}</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-400 font-bold">
                  <span className="flex items-center gap-1"><Timer size={12} /> {isSyncing ? (isAmharic ? "በማስተላለፍ ላይ..." : "Active Streams") : (isAmharic ? "የተጠናቀቀ" : "Concluded")}</span>
                  <span className="text-indigo-400 font-bold text-xs bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{syncSpeed}</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${syncProgress}%` }}
                    transition={{ ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-red-500 via-indigo-500 to-emerald-500 rounded-full relative"
                  >
                    {/* Pulsing indicator light */}
                    <div className="absolute right-0 top-0 h-full w-2 bg-white animate-pulse" />
                  </motion.div>
                </div>
                
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>{isAmharic ? "የማመሳሰል ሂደት ማረጋገጫ" : "Sync progress integrity check"}</span>
                  <span className="text-white font-black">{syncProgress}%</span>
                </div>
              </div>

              {/* Console Sync Step */}
              <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300 flex items-start gap-2.5">
                <Server size={14} className="text-indigo-400 mt-0.5 shrink-0 animate-bounce" />
                <div className="space-y-1">
                  <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest">{isAmharic ? "የቀጥታ ስርጭት ሂደት" : "ACTIVE TELESCOPE PIPELINE"}</p>
                  <p className="text-emerald-400 text-[11px] leading-relaxed">
                    {isAmharic ? currentSyncPhaseAm : currentSyncPhase}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories breakdown grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Attendance queue state */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-300">{isAmharic ? "ባዮሜትሪክ መገኘት" : "Attendance Records"}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">biometric_checks_db</p>
                </div>
              </div>
              
              <div className="text-right font-mono">
                <p className="text-xs font-black text-white">{attendanceSynced} / {attendanceTotal}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{isAmharic ? "የተመሳሰሉ" : "Replicated"}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${attendanceTotal > 0 ? (attendanceSynced / attendanceTotal) * 100 : 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>{isAmharic ? "ከመስመር ውጭ የታገዱ" : "Offline Buffered"}</span>
                <span className={attendanceSynced === attendanceTotal ? "text-emerald-400" : "text-amber-400"}>
                  {attendanceSynced === attendanceTotal ? (isAmharic ? "ዝግጁ" : "Synchronized") : `${attendanceTotal - attendanceSynced} ${isAmharic ? "ቀሪ" : "Pending"}`}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory queue state */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-300">{isAmharic ? "ንብረት ቁጥጥር" : "Asset Inventory"}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">aluminum_formwork_assets</p>
                </div>
              </div>
              
              <div className="text-right font-mono">
                <p className="text-xs font-black text-white">{inventorySynced} / {inventoryTotal}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{isAmharic ? "የተመሳሰሉ" : "Replicated"}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${inventoryTotal > 0 ? (inventorySynced / inventoryTotal) * 100 : 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>{isAmharic ? "ከመስመር ውጭ የታገዱ" : "Offline Buffered"}</span>
                <span className={inventorySynced === inventoryTotal ? "text-emerald-400" : "text-amber-400"}>
                  {inventorySynced === inventoryTotal ? (isAmharic ? "ዝግጁ" : "Synchronized") : `${inventoryTotal - inventorySynced} ${isAmharic ? "ቀሪ" : "Pending"}`}
                </span>
              </div>
            </div>
          </div>

          {/* Logs queue state */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-300">{isAmharic ? "ዕለታዊ ሪፖርትና ኦዲት" : "Safety & Audit Logs"}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">site_telemetry_logs</p>
                </div>
              </div>
              
              <div className="text-right font-mono">
                <p className="text-xs font-black text-white">{logsSynced} / {logsTotal}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{isAmharic ? "የተመሳሰሉ" : "Replicated"}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${logsTotal > 0 ? (logsSynced / logsTotal) * 100 : 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>{isAmharic ? "ከመስመር ውጭ የታገዱ" : "Offline Buffered"}</span>
                <span className={logsSynced === logsTotal ? "text-emerald-400" : "text-amber-400"}>
                  {logsSynced === logsTotal ? (isAmharic ? "ዝግጁ" : "Synchronized") : `${logsTotal - logsSynced} ${isAmharic ? "ቀሪ" : "Pending"}`}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Detailed Breakdown list */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Database size={15} className="text-red-500" />
              {isAmharic ? "ከመስመር ውጭ የቆዩ የመዝገብ ዝርዝሮች" : "Offline Roster Buffer Queue Table"}
              <span className="text-[11px] font-mono text-slate-400 font-normal">({queues.length} {isAmharic ? "አጠቃላይ መዝገቦች" : "total records"})</span>
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: "all", labelEn: "All", labelAm: "ሁሉንም" },
                { id: "attendance", labelEn: "Attendance", labelAm: "መገኘት" },
                { id: "inventory", labelEn: "Inventory", labelAm: "ፓነል" },
                { id: "logs", labelEn: "Logs", labelAm: "ሪፖርቶች" }
              ].map((filt) => (
                <button
                  key={filt.id}
                  onClick={() => setActiveFilter(filt.id as any)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeFilter === filt.id
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {isAmharic ? filt.labelAm : filt.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800/70 scrollbar-thin">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                {isAmharic ? "በዚህ ምድብ ምንም መዝገብ የለም።" : "No records found matching filter."}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="p-3.5 hover:bg-slate-900/40 flex items-center justify-between gap-4 transition-colors">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      item.category === "attendance" ? "bg-red-500/10 text-red-400" :
                      item.category === "inventory" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {item.category === "attendance" ? <Users size={14} /> :
                       item.category === "inventory" ? <Package size={14} /> : <FileText size={14} />}
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{isAmharic ? item.titleAm : item.titleEn}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{isAmharic ? item.detailsAm : item.detailsEn}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[9px] font-mono text-indigo-400 font-semibold bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-900/30">{item.id}</span>
                        <span className="text-[9px] font-mono text-slate-500">{item.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center space-x-2">
                    {item.synced ? (
                      <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-900/30 text-[10px] font-mono font-bold uppercase">
                        <CheckCircle size={11} />
                        <span>{isAmharic ? "ተመሳስሏል" : "SYNCED"}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-amber-400 bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-900/30 text-[10px] font-mono font-bold uppercase">
                        <AlertTriangle size={11} className="animate-pulse" />
                        <span>{isAmharic ? "ቀሪ" : "PENDING"}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
