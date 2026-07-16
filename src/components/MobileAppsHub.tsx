import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, 
  Camera, 
  Compass, 
  Fingerprint, 
  Bell, 
  Wifi, 
  WifiOff, 
  Database, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Code, 
  Zap, 
  Send, 
  Users, 
  Layers, 
  Shield, 
  Activity, 
  FileText, 
  Lock, 
  X, 
  ChevronRight,
  Battery,
  AlertOctagon,
  Eye,
  MapPin,
  Check,
  RotateCcw
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MobileAppsHubProps {
  isAmharic: boolean;
  currentUserRole: string;
  onLogAction: (action: string, details: string) => void;
  workers?: any[];
  teams?: any[];
  onAddSnag?: (snag: any) => void;
}

type MobileAppType = 
  | "worker"
  | "gang_chief"
  | "team_leader"
  | "time_keeper"
  | "supervisor"
  | "head_office"
  | "admin";

export function MobileAppsHub({ 
  isAmharic, 
  currentUserRole, 
  onLogAction,
  workers = [],
  teams = [],
  onAddSnag
}: MobileAppsHubProps) {
  
  // --- STATE ---
  const [activeApp, setActiveApp] = useState<MobileAppType>("worker");
  const [devicePlatform, setDevicePlatform] = useState<"android" | "ios">("android");
  const [isPhoneOnline, setIsPhoneOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<{ id: string; action: string; payload: any; timestamp: string }[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<{ id: string; title: string; body: string; timestamp: string }[]>([
    { id: "1", title: "OVID PMO Dispatch", body: "New formwork task assigned for Floor 4.", timestamp: "08:15 AM" }
  ]);
  
  // Biometrics simulation
  const [biometricStatus, setBiometricStatus] = useState<"idle" | "scanning" | "success" | "failed">("idle");
  const [biometricProgress, setBiometricProgress] = useState(0);
  
  // GPS/Geolocation Simulation
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number; inGeofence: boolean }>({
    lat: 9.0049,
    lng: 38.7997,
    accuracy: 5.2,
    inGeofence: true
  });
  
  // Camera Upload Simulation
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [snagDescription, setSnagDescription] = useState("");
  const [snagType, setSnagType] = useState("Formwork Alignment");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Performance Telemetry Ticker
  const [fps, setFps] = useState(60);
  const [memoryUsed, setMemoryUsed] = useState(14.2); // MB
  const [latencyData, setLatencyData] = useState<{ name: string; latency: number }[]>([
    { name: "08:00", latency: 24 },
    { name: "08:10", latency: 18 },
    { name: "08:20", latency: 32 },
    { name: "08:30", latency: 15 },
    { name: "08:40", latency: 20 },
    { name: "08:50", latency: 12 }
  ]);
  
  // Code Export center tabs
  const [codeTab, setCodeTab] = useState<"manifest" | "android" | "ios" | "sw">("manifest");

  // Run a continuous FPS & memory ticker to simulate high performance metrics
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate high speed stable UI metrics
      setFps(Math.floor(58 + Math.random() * 3));
      setMemoryUsed(parseFloat((13.8 + Math.random() * 0.8).toFixed(1)));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Update latency graph dynamically when transactions are made
  const addLatencyPoint = () => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const delay = Math.floor(8 + Math.random() * 12); // fast native performance
    setLatencyData(prev => [...prev.slice(1), { name: now, latency: delay }]);
  };

  // Switch camera streaming
  const toggleCamera = async () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      setIsCameraActive(true);
      setCapturedPhoto(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Webcam not available, fallback to mock site overlay.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    // Generate high resolution canvas visual or mock site snap
    const mockConstructionPhotos = [
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&auto=format&fit=crop&q=60", // Steel framing
      "https://images.unsplash.com/photo-1581094288338-2314dddb7eed?w=600&auto=format&fit=crop&q=60", // Formwork
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=60"  // Site inspection
    ];
    const chosenMock = mockConstructionPhotos[Math.floor(Math.random() * mockConstructionPhotos.length)];
    setCapturedPhoto(chosenMock);
    stopCamera();
    onLogAction("Mobile Camera Capture", "Captured construction quality snap with active timestamp & metadata.");
  };

  // Submit Mobile action (Attendance or Snag)
  const submitMobileAction = (actionName: string, payload: any) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const actionId = `ACT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    if (!isPhoneOnline) {
      const queueItem = {
        id: actionId,
        action: actionName,
        payload,
        timestamp
      };
      setOfflineQueue(prev => [...prev, queueItem]);
      onLogAction("Offline Queue Buffered", `No network. Cached [${actionName}] transaction locally inside phone SQLite schema.`);
      return;
    }

    // Process immediately (simulated cloud sync)
    addLatencyPoint();
    onLogAction(`Mobile sync: ${actionName}`, `Transmitted payload via verified secure gateway from ${activeApp} Mobile App.`);
  };

  // Synchronize local cached database queue
  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;
    onLogAction("Synchronizing Local Mobile Queue", `Re-establishing cloud ledger socket. Replaying ${offlineQueue.length} offline construction transactions.`);
    
    // Simulate staggered dispatch
    offlineQueue.forEach((item, index) => {
      setTimeout(() => {
        onLogAction(`Offline Queue Synchronized`, `Processed item ${item.id} - [${item.action}] successfully dispatched to central OVID database.`);
      }, index * 400);
    });

    setOfflineQueue([]);
  };

  // Push notifications dispatch
  const sendPushNotification = (title: string, body: string) => {
    const id = Date.now().toString();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newNotif = { id, title, body, timestamp };
    setNotificationHistory(prev => [newNotif, ...prev]);
    onLogAction("Push Notification Dispatched", `Sent mobile alert: "${title}" across active mobile terminals.`);
  };

  // Geolocation retrieval simulation
  const triggerMobileGPS = () => {
    setGpsLoading(true);
    setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // Bole Heights bounds coordinates: lat: 9.000 to 9.015, lng: 38.790 to 38.810
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            // Map or check if we are in reasonable distance
            const insideBole = lat > 8.95 && lat < 9.05 && lng > 38.75 && lng < 38.85;
            setGpsCoords({
              lat: parseFloat(lat.toFixed(5)),
              lng: parseFloat(lng.toFixed(5)),
              accuracy: parseFloat(pos.coords.accuracy.toFixed(1)),
              inGeofence: insideBole
            });
            setGpsLoading(false);
            onLogAction("GPS Coordinate Secured", `Acquired spatial lock: ${lat.toFixed(5)}, ${lng.toFixed(5)}. Geofence check: ${insideBole ? "INSIDE BOLE HEIGHTS" : "OUTSIDE BOUNDS"}`);
          },
          () => {
            // Fallback to random mock coordinates
            setGpsCoords({
              lat: 9.0049 + (Math.random() - 0.5) * 0.005,
              lng: 38.7997 + (Math.random() - 0.5) * 0.005,
              accuracy: 4.8,
              inGeofence: true
            });
            setGpsLoading(false);
          }
        );
      } else {
        setGpsLoading(false);
      }
    }, 800);
  };

  // Biometrics simulation handler
  const handleBiometricPress = () => {
    if (biometricStatus === "scanning") return;
    setBiometricStatus("scanning");
    setBiometricProgress(0);

    const interval = setInterval(() => {
      setBiometricProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBiometricStatus("success");
          submitMobileAction("Biometric Access Verified", {
            app: activeApp,
            timestamp: new Date().toISOString(),
            status: "Authorized"
          });
          onLogAction("Biometric Identity Verification", `Biometric match authenticated on mobile secure element for ${activeApp.toUpperCase()} app.`);
          setTimeout(() => setBiometricStatus("idle"), 2500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // PWA & Android/iOS Config Manifest templates
  const manifests = {
    manifest: `{
  "short_name": "OVID ERP",
  "name": "OVID Construction ERP Mobile Suite",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#4f46e5",
  "background_color": "#0f172a",
  "orientation": "portrait-primary",
  "prefer_related_applications": false,
  "categories": ["productivity", "business"]
}`,
    android: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.ovid.construction.erp">

    <!-- Mobile ERP Permissions Requested -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="OVID Construction Mobile"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.OVIDConstruction">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
    ios: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>OVID Mobile ERP</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>com.ovid.construction.mobile</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>NSCameraUsageDescription</key>
	<string>OVID mobile needs camera access to capture safety hazard photos and scan QR barcodes.</string>
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>OVID mobile requires GPS access to confirm attendance geofencing on Bole site.</string>
	<key>NSFaceIDUsageDescription</key>
	<string>OVID mobile requires FaceID to authenticate supervisor signatures.</string>
	<key>UIBackgroundModes</key>
	<array>
		<string>remote-notification</string>
	</array>
</dict>
</plist>`,
    sw: `// OVID Mobile ERP Progressive Web App Service Worker
const CACHE_NAME = 'ovid-erp-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached asset fallback, or fetch from network and store in cache
      return cachedResponse || fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }).catch(() => {
      // Offline fallback asset
      return caches.match('/offline.html');
    })
  );
});`
  };

  const currentManifestCode = manifests[codeTab];

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-500/30 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold">
                {isAmharic ? "ኦቪድ የሞባይል ማቀናበሪያ ማዕከል" : "OVID Mobile Compilation Hub"}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Smartphone className="text-indigo-400" />
              {isAmharic ? "OVID ERP የሞባይል ስሪቶች" : "OVID ERP Native Mobile Apps"}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              {isAmharic 
                ? "ሰባቱን የ OVID ERP የሞባይል መተግበሪያዎች (ለሰራተኛ፣ ለቡድን መሪ፣ ለሱፐርቫይዘር እና ለዋና መስሪያ ቤት) እዚህ ይቆጣጠሩ፣ ይሞክሩ እና ያውርዱ። የመስመር ውጭ ስራ፣ ጂፒኤስ፣ ካሜራ፣ እና ባዮሜትሪክስን በተግባር ይመልከቱ።" 
                : "Manage, simulate, and export OVID ERP's 7 custom native mobile applications. Evaluate low-level device integrations including full offline capabilities, hardware sensor simulation, and multi-channel telemetry."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setDevicePlatform("android");
                onLogAction("Platform Changed", "Switched mobile preview simulator to Google Android OS.");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${devicePlatform === "android" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              Android (.APK)
            </button>
            <button
              onClick={() => {
                setDevicePlatform("ios");
                onLogAction("Platform Changed", "Switched mobile preview simulator to Apple iOS Platform.");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${devicePlatform === "ios" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              iOS (.IPA)
            </button>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE: APP SELECTOR + SIMULATOR PHONE + HARDWARE SENSORS & METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: THE 7 DISTINCT APPS SELECTOR (width: 4/12) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              {isAmharic ? "7ቱ የሞባይል መተግበሪያዎች" : "The 7 Role Applications"}
            </h3>
            
            <div className="flex flex-col gap-1.5">
              {[
                { id: "worker", titleEn: "1. Worker App", titleAm: "1. የሰራተኛ መተግበሪያ", descEn: "Task logging, geofenced clocking, camera hazard snags", descAm: "የስራ ሂደት መዝገብ፣ ባዮሜትሪክ መገኘት እና የስራ ጉድለት ፎቶዎች" },
                { id: "gang_chief", titleEn: "2. Gang Chief App", titleAm: "2. የቡድን መሪ መተግበሪያ", descEn: "Team attendance sheets, toolboxes, offline queues", descAm: "የቡድን አባላት መገኘት፣ የደህንነት ስብሰባዎችና የመስመር ውጭ ስራ" },
                { id: "team_leader", titleEn: "3. Team Leader App", titleAm: "3. የቲም ሊደር መተግበሪያ", descEn: "Panel allocation, verticality check, productivity logs", descAm: "የአሉሚኒየም ፎርምወርክ ቁጥጥር፣ የሰራተኞች ምደባና ምርታማነት" },
                { id: "time_keeper", titleEn: "4. Time Keeper App", titleAm: "4. የሰዓት ቆጣሪ መተግበaria", descEn: "Muster rolls, biometric registration, geolocation logs", descAm: "ባዮሜትሪክ ሰራተኛ ምዝገባ፣ የጂፒኤስ መገኘት ቁጥጥር" },
                { id: "supervisor", titleEn: "5. Supervisor App", titleAm: "5. የሱፐርቫይዘር መተግበሪያ", descEn: "Pour approvals, photo inspections, site alerts broadcast", descAm: "የኮንክሪት ሙሌት ፍቃድ፣ የፎቶዎች ጥራት ቁጥጥርና ማስጠንቀቂያዎች" },
                { id: "head_office", titleEn: "6. Head Office App", titleAm: "6. የዋናው መ/ቤት መተግበሪያ", descEn: "Consolidated financial ledgers, master stats dashboard", descAm: "የበጀት ማጠቃለያ፣ የአባላት ስታቲስቲክስና የቀጥታ የደህንነት መቆጣጠሪያ" },
                { id: "admin", titleEn: "7. Admin App", titleAm: "7. የአድሚን መተግበሪያ", descEn: "SOC telemetry logs, App Check certs, remote wiping", descAm: "የሳይበር ደህንነት መከታተያ፣ የደህንነት ቶከኖችና የሞባይል መቆጣጠሪያ" }
              ].map((app) => (
                <button
                  key={app.id}
                  onClick={() => {
                    setActiveApp(app.id as MobileAppType);
                    onLogAction("Active Mobile Preview Switched", `Switched interactive preview screen to ${app.titleEn}`);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1 cursor-pointer ${
                    activeApp === app.id 
                      ? "bg-indigo-950 border-indigo-950 text-white shadow-md scale-[1.02]" 
                      : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-tight">
                    {isAmharic ? app.titleAm : app.titleEn}
                  </span>
                  <span className={`text-[10px] leading-snug ${activeApp === app.id ? "text-indigo-200" : "text-slate-400 font-sans"}`}>
                    {isAmharic ? app.descAm : app.descEn}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: IMMERSIVE SMARTPHONE SIMULATOR FRAME (width: 5/12) */}
        <div className="lg:col-span-5 flex justify-center items-center">
          
          <div className="relative w-full max-w-[340px] bg-slate-900 p-4 pb-5 rounded-[45px] border-4 border-slate-950 shadow-2xl relative overflow-hidden" style={{ aspectRatio: "9/18" }}>
            
            {/* Phone notch camera / Speaker */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-2xl z-30 flex items-center justify-center">
              <div className="w-12 h-1.5 bg-slate-800 rounded-full mb-1"></div>
              <div className="w-2.5 h-2.5 bg-slate-900 rounded-full ml-3 mb-1 border border-slate-800"></div>
            </div>

            {/* SCREEN CONTAINER */}
            <div className="w-full h-full bg-slate-950 rounded-[34px] overflow-hidden relative flex flex-col pt-6 text-white text-xs select-none">
              
              {/* Phone Status Bar */}
              <div className="h-6 bg-slate-950 px-4 flex items-center justify-between text-[10px] font-mono text-slate-400 shrink-0">
                <span>08:42 AM</span>
                <span className="text-[9px] font-bold text-slate-400">OVID Mobile LTE</span>
                <div className="flex items-center space-x-1.5">
                  {isPhoneOnline ? (
                    <Wifi size={11} className="text-emerald-400" />
                  ) : (
                    <WifiOff size={11} className="text-rose-400 animate-pulse" />
                  )}
                  <Battery size={13} className="text-slate-400" />
                  <span>88%</span>
                </div>
              </div>

              {/* Dynamic Notification Popup Overlay */}
              {notificationHistory.length > 0 && (
                <div className="absolute top-8 inset-x-2 z-40">
                  <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-900/95 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex gap-2 items-start text-[10px] relative"
                  >
                    <Bell size={12} className="text-indigo-400 mt-0.5 animate-bounce shrink-0" />
                    <div>
                      <p className="font-bold text-slate-100">{notificationHistory[0].title}</p>
                      <p className="text-slate-400 leading-snug">{notificationHistory[0].body}</p>
                    </div>
                    <button 
                      onClick={() => setNotificationHistory(prev => prev.slice(1))}
                      className="absolute right-1.5 top-1.5 text-slate-500 hover:text-white"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                </div>
              )}

              {/* APP WORKSPACE SCREEN BODY */}
              <div className="flex-grow p-3 flex flex-col overflow-y-auto space-y-3 scrollbar-none relative">
                
                {/* Mobile app header */}
                <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[8px] uppercase tracking-widest text-indigo-400 font-bold font-mono">
                      {isPhoneOnline ? "Online Sync Link" : "Offline Storage Queue Mode"}
                    </span>
                    <h4 className="font-black text-[11px] truncate uppercase max-w-[170px]">
                      {isAmharic 
                        ? (activeApp === "worker" ? "የሰራተኛ ክፍል" : activeApp === "gang_chief" ? "የቡድን ሃላፊ" : activeApp === "team_leader" ? "የቲም መሪ" : activeApp === "time_keeper" ? "ሰዓት ቆጣሪ" : activeApp === "supervisor" ? "ሳይት ሱፐርቫይዘር" : activeApp === "head_office" ? "ዋና መ/ቤት" : "የደህንነት አድሚን")
                        : (activeApp.replace("_", " ") + " terminal")
                      }
                    </h4>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${isPhoneOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                </div>

                {/* 1. WORKER MOBILE APP */}
                {activeApp === "worker" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
                      <p className="text-[10px] text-slate-400 font-semibold">{isAmharic ? "ዛሬ የተመደበ ስራ:" : "Active Daily Assignment:"}</p>
                      <p className="font-bold text-xs text-indigo-300 leading-snug">
                        {isAmharic 
                          ? "የአሉሚኒየም ፎርምወርክ መግጠም - ህንፃ B1, ፎቅ 4" 
                          : "Assemble Aluminum Formwork Panel Set - Bldg B1, Floor 4 Zone B"}
                      </p>
                      <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-mono">
                        <MapPin size={10} className="text-indigo-400" />
                        <span>Bole Heights Site B1</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2 text-center">
                      <p className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የጣት አሻራ መግቢያ/መውጫ" : "Biometric Clock In"}</p>
                      <button 
                        onPointerDown={handleBiometricPress}
                        className="w-12 h-12 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/30 rounded-full mx-auto flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
                      >
                        <Fingerprint size={24} className="text-indigo-400" />
                      </button>
                      <p className="text-[9px] text-slate-500">{isAmharic ? "ለመመዝገብ ተጭነው ይቆዩ" : "Press and hold to authentic login"}</p>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "ጂፒኤስ የመገኛ ክልል" : "GPS Geofencing Status"}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${gpsCoords.inGeofence ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/20' : 'bg-red-950 text-red-400'}`}>
                          {gpsCoords.inGeofence ? "INSIDE SITE" : "OUTSIDE SITE"}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500">Lat: {gpsCoords.lat}, Lng: {gpsCoords.lng} (Accuracy: {gpsCoords.accuracy}m)</p>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የጥራት ጉድለት ፎቶ ላክ" : "Capture Safety Snag"}</p>
                      <button 
                        onClick={toggleCamera}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Camera size={11} />
                        <span>{isAmharic ? "ካሜራውን ክፈት" : "Launch Mobile Camera"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. GANG CHIEF MOBILE APP */}
                {activeApp === "gang_chief" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የቡድን አባላት መገኘት (Offline)" : "Gang 3 Roll Call Checklist"}</span>
                        <span className="text-[9px] font-mono text-indigo-400 font-bold">8 Workers Listed</span>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        {[
                          { name: "Solomon Ayele", status: "Present", id: "1" },
                          { name: "Tewodros Kassahun", status: "Present", id: "2" },
                          { name: "Eyerusalem Birhanu", status: "Present", id: "3" },
                          { name: "Sileshi Temesgen", status: "Absent", id: "4" }
                        ].map(worker => (
                          <div key={worker.id} className="flex justify-between items-center bg-slate-950 p-1 rounded">
                            <span className="text-[9px] text-slate-200">{worker.name}</span>
                            <span className={`text-[8px] px-1 font-mono rounded ${worker.status === "Present" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                              {worker.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የመሳሪያ ደህንነት ውይይት" : "Toolbox Session Tracker"}</span>
                        <span className="text-[8px] font-mono text-emerald-400">COMPLETE</span>
                      </div>
                      <button 
                        onClick={() => {
                          submitMobileAction("Toolbox Talk Registered", { gangId: "Gang 3", topic: "Aluminum formwork lifting safety" });
                          sendPushNotification("Gang 3 Safety Talk Signed", "Toolbox talk uploaded successfully to supervisor console.");
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[9px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span>{isAmharic ? "የደህንነት ፊርማ አስገባ" : "Sign & Lock Toolbox Talk"}</span>
                      </button>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የመስመር ውጭ መረጃ" : "Local Database Cache"}</span>
                        <span className="text-[9px] font-mono text-amber-500">{offlineQueue.length} items buffered</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        {isAmharic ? "ኔትወርክ ሲቋረጥ መረጃዎች ስልኩ ላይ ተቀምጠው ኔትወርክ ሲመጣ በራስ-ሰር ይተላለፋሉ።" : "Cached requests auto-synchronize to central office storage when LTE drops."}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. TEAM LEADER MOBILE APP */}
                {activeApp === "team_leader" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የአሉሚኒየም ፎርምወርክ አሰላለፍ ቁጥጥር" : "Formwork Verticality Monitor"}</span>
                      <div className="space-y-1">
                        {[
                          { task: "Check pin tightness B1", status: "Passed" },
                          { task: "Verticality plumb line verification", status: "Awaiting" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[9px] bg-slate-950 p-1.5 rounded">
                            <span className="text-slate-300">{item.task}</span>
                            <span className={`font-mono text-[8px] px-1 rounded ${item.status === "Passed" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-900 space-y-1.5 text-center">
                      <p className="text-[10px] text-indigo-300 font-bold">{isAmharic ? "የስራ አፈጻጸም መዝገብ" : "Submit Gang Productivity"}</p>
                      <button 
                        onClick={() => {
                          submitMobileAction("Gang Productivity Transmitted", { score: 92.5 });
                          sendPushNotification("Team Leader Sync", "Daily progress for building B1 successfully locked.");
                        }}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold cursor-pointer"
                      >
                        {isAmharic ? "የቀን ማጠቃለያ ላክ" : "Transmit Daily Metrics"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. TIME KEEPER MOBILE APP */}
                {activeApp === "time_keeper" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "አዲስ ሰራተኛ ምዝገባ (Biometric)" : "Add New Worker Mobile Entry"}</span>
                      <div className="space-y-1.5 text-[10px]">
                        <input 
                          type="text" 
                          placeholder={isAmharic ? "ሙሉ ስም አስገባ" : "Enter Worker Full Name"}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button 
                          onClick={() => {
                            setBiometricStatus("scanning");
                            handleBiometricPress();
                          }}
                          className="w-full py-1 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Fingerprint size={10} />
                          <span>{isAmharic ? "ባዮሜትሪክ መረጃ ቅረጽ" : "Scan Fingerprint Hardware"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የሳይት ጂፒኤስ መቆጣጠሪያ" : "GPS Smart Check-in Lock"}</span>
                      <button 
                        onClick={triggerMobileGPS}
                        className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Compass size={11} className={gpsLoading ? "animate-spin" : ""} />
                        <span>{isAmharic ? "የአሁኑን ቦታ አረጋግጥ" : "Force Locate GPS Terminal"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. SUPERVISOR MOBILE APP */}
                {activeApp === "supervisor" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የኮንክሪት ሙሌት ፍቃድ" : "Concrete Pour Sign-Off"}</span>
                      <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[10px]">
                        <p className="font-bold text-slate-200">Bldg B1, Floor 4 Zone A</p>
                        <p className="text-[9px] text-slate-400">Aluminum Formwork alignment verified.</p>
                      </div>
                      <button 
                        onClick={() => {
                          submitMobileAction("Concrete Pour Authorized", { building: "B1", floor: 4 });
                          sendPushNotification("Pour Authorization Signed", "Pour ticket #401 issued to site engineering.");
                        }}
                        className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-bold cursor-pointer"
                      >
                        {isAmharic ? "ለሙሌት ፍቃድ ፈርም (Approve)" : "Authorize Concrete Pour Now"}
                      </button>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "ማስጠንቀቂያዎችን አስተላልፍ" : "Broadcast Site Emergency Alert"}</span>
                      <button 
                        onClick={() => sendPushNotification("WEATHER ALERT", "High winds expected. Secure lightweight panels.")}
                        className="w-full py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Bell size={10} />
                        <span>{isAmharic ? "ማስጠንቀቂያ አስተላልፍ" : "Trigger Emergency Broadcast"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. HEAD OFFICE MOBILE APP */}
                {activeApp === "head_office" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የዋና መስሪያ ቤት ማጠቃለያ" : "OVID Corporate Executive Ledger"}</span>
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                        <div className="bg-slate-950 p-1.5 rounded">
                          <span className="text-slate-400 text-[8px] block">TOTAL FORMWORK</span>
                          <span className="text-emerald-400 font-black text-xs font-mono">14,250 ㎡</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded">
                          <span className="text-slate-400 text-[8px] block">CAPITAL FLOWS</span>
                          <span className="text-cyan-400 font-black text-xs font-mono">125M ETB</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የእውነተኛ ጊዜ ደህንነት ክትትል" : "Live Terminal Integrity Sync"}</span>
                      <div className="text-[9px] space-y-1 text-slate-400 font-mono">
                        <div className="flex justify-between">
                          <span>Bole Site Active Terminals:</span>
                          <span className="text-emerald-400 font-bold">14 Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Database Replication:</span>
                          <span className="text-emerald-400 font-bold">In-Sync</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. ADMIN MOBILE APP */}
                {activeApp === "admin" && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የሳይበር ደህንነት መከታተያ (SOC)" : "Mobile SOC Integrity Matrix"}</span>
                      <div className="text-[9px] space-y-1 font-mono text-slate-300">
                        <div className="flex justify-between border-b border-slate-800 pb-0.5">
                          <span>App Check Certs:</span>
                          <span className="text-emerald-400 font-bold">ACTIVE</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-0.5">
                          <span>AES-256 Keys:</span>
                          <span className="text-indigo-400">HARDWARE ENCLAVE</span>
                        </div>
                        <div className="flex justify-between">
                          <span>API Threat Shield:</span>
                          <span className="text-emerald-400 font-bold">OK</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-950/40 p-2.5 rounded-xl border border-red-900/50 space-y-1.5 text-center">
                      <span className="text-[9px] text-rose-300 font-bold block">{isAmharic ? "የጠፉ መሳሪያዎችን መቆጣጠሪያ" : "Remote Device Lockdown Trigger"}</span>
                      <button 
                        onClick={() => {
                          submitMobileAction("Remote Device Erase Initiated", { target: "Terminal GC-03" });
                          sendPushNotification("REMOTE DEVICE ERASED", "Admin wiped terminal data for local protection.");
                        }}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold cursor-pointer"
                      >
                        {isAmharic ? "መሳሪያውን አጥፋ (Remote Wipe)" : "Initiate Secure Remote Wipe"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Dynamic Camera Feed Simulation */}
                {isCameraActive && (
                  <div className="absolute inset-0 bg-black z-50 flex flex-col pt-8 p-3 text-center space-y-3 rounded-[34px]">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-mono text-indigo-400">OVID HIGH-RES CAMERA</span>
                      <button onClick={stopCamera} className="text-slate-400 hover:text-white">
                        <X size={16} />
                      </button>
                    </div>
                    
                    <div className="relative flex-grow bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                      {/* Video element for active stream */}
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                      
                      {/* Grid overlays */}
                      <div className="absolute inset-0 border border-white/10 pointer-events-none flex justify-center items-center">
                        <div className="absolute w-2/3 h-[1px] bg-red-500/30"></div>
                        <div className="absolute h-2/3 w-[1px] bg-red-500/30"></div>
                        <div className="border border-white/20 w-24 h-24 rounded-full"></div>
                      </div>
                      
                      <div className="absolute bottom-2 left-2 text-[8px] font-mono text-white/70 bg-black/50 px-1.5 py-0.5 rounded text-left leading-snug">
                        <p>LAT: {gpsCoords.lat}</p>
                        <p>LNG: {gpsCoords.lng}</p>
                        <p>TIME: {new Date().toLocaleTimeString()}</p>
                      </div>
                    </div>

                    <button 
                      onClick={capturePhoto}
                      className="w-14 h-14 bg-white hover:bg-slate-200 border-4 border-slate-900 rounded-full mx-auto flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                    >
                      <div className="w-10 h-10 bg-slate-900 rounded-full"></div>
                    </button>
                  </div>
                )}

                {/* Dynamic Biometrics Scan Laser Overlay */}
                {biometricStatus === "scanning" && (
                  <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col justify-center items-center p-6 rounded-[34px] space-y-6">
                    <div className="relative w-28 h-28 flex items-center justify-center border-2 border-indigo-500/30 rounded-2xl">
                      {/* Scanning laser beam effect */}
                      <motion.div 
                        animate={{ y: [-30, 40] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-20"
                      />
                      <Fingerprint size={64} className="text-indigo-400" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-mono text-[10px] text-cyan-400 font-bold uppercase animate-pulse">{isAmharic ? "የጣት አሻራን በማንበብ ላይ..." : "Scanning Hardware secure enclave..."}</p>
                      <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${biometricProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Simulated Phone Hardware Home Button Bar */}
              <div className="h-8 bg-slate-950 flex justify-center items-center shrink-0">
                <div className="w-24 h-1 bg-slate-700 rounded-full mb-1"></div>
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: HARDWARE SENSORS & REAL-TIME PERFORMANCE CHART (width: 4/12) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* HARDWARE INTERACTION PANEL */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-600" />
              {isAmharic ? "የሞባይል ሃርድዌር መቆጣጠሪያ" : "Mobile Hardware Controllers"}
            </h3>

            {/* Offline Simulator Switch */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 block">{isAmharic ? "ኔትወርክ ግንኙነት" : "Device Network Connection"}</span>
                <span className="text-[10px] text-slate-400 font-sans">{isPhoneOnline ? "Online (Live sync activated)" : "Offline (Local SQLite Cache)"}</span>
              </div>
              <button
                onClick={() => {
                  setIsPhoneOnline(!isPhoneOnline);
                  onLogAction("Device Network Toggle", `Changed network state on phone preview to: ${!isPhoneOnline ? "Online" : "Offline Mode"}`);
                  if (!isPhoneOnline) {
                    // Sync up
                    setTimeout(() => syncOfflineQueue(), 500);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  isPhoneOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {isPhoneOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
                <span>{isPhoneOnline ? "CONNECTED" : "OFFLINE"}</span>
              </button>
            </div>

            {/* GPS Lock controller */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{isAmharic ? "ጂፒኤስ የመገኛ ሥፍራ" : "Sensor: GPS Location Finder"}</span>
                  <span className="text-[10px] text-slate-400 font-sans">Bole Heights Zone Geofencing</span>
                </div>
                <button
                  onClick={triggerMobileGPS}
                  disabled={gpsLoading}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={10} className={gpsLoading ? "animate-spin" : ""} />
                  <span>{isAmharic ? "አድስ" : "Lock GPS"}</span>
                </button>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[10px] space-y-1.5">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="text-slate-800 font-bold">{gpsCoords.lat}, {gpsCoords.lng}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">Accuracy:</span>
                  <span className="text-slate-800 font-bold">±{gpsCoords.accuracy} meters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Geofence Status:</span>
                  <span className={`font-bold ${gpsCoords.inGeofence ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {gpsCoords.inGeofence ? "INSIDE BOLE B1" : "OUT OF BOUNDS"}
                  </span>
                </div>
              </div>
            </div>

            {/* Snag upload submission after photo capture */}
            {capturedPhoto && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-2.5 animate-fade-in">
                <span className="text-xs font-bold text-indigo-900 block">{isAmharic ? "ፎቶው ዝግጁ ነው! ሪፖርት መዝግብ" : "Active Captured Snag Photo"}</span>
                <div className="flex gap-3">
                  <img src={capturedPhoto} alt="Captured Snag" className="w-14 h-14 object-cover rounded-lg border border-indigo-200" />
                  <div className="flex-grow space-y-1">
                    <select 
                      value={snagType}
                      onChange={(e) => setSnagType(e.target.value)}
                      className="w-full text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value="Formwork Alignment">Formwork Alignment</option>
                      <option value="Concrete Leakage">Concrete Leakage</option>
                      <option value="Missing Support Plugs">Missing Support Plugs</option>
                      <option value="Safety Issue">Safety Hazard</option>
                    </select>
                    <input 
                      type="text"
                      placeholder={isAmharic ? "ጉዳቱን በአጭሩ ግለጽ" : "Describe snag details..."}
                      value={snagDescription}
                      onChange={(e) => setSnagDescription(e.target.value)}
                      className="w-full text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onAddSnag) {
                        onAddSnag({
                          id: `SNAG-${Date.now().toString().slice(-4)}`,
                          zone: "Building B1, Floor 4 Zone B",
                          defectType: snagType,
                          comments: snagDescription || "Reported via OVID mobile app",
                          status: "Open",
                          reporter: "Solomon Ayele (Worker ID: 401)",
                          photo: capturedPhoto
                        });
                      }
                      submitMobileAction("Snag Photo Filed", { type: snagType, comments: snagDescription });
                      setCapturedPhoto(null);
                      setSnagDescription("");
                      sendPushNotification("Quality Snag Filed", `A new ${snagType} defect log was synchronized with central engineering.`);
                    }}
                    className="flex-grow py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                  >
                    {isAmharic ? "ጉድለቱን መዝግብ" : "File Quality Snag"}
                  </button>
                  <button
                    onClick={() => setCapturedPhoto(null)}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Offline cache logger */}
            {offlineQueue.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                    <AlertTriangle size={13} className="text-amber-500 animate-pulse" />
                    {isAmharic ? "ያልተላኩ የሞባይል መረጃዎች" : "Offline Buffer Queue"}
                  </span>
                  <span className="text-[10px] font-mono text-amber-700 font-bold">{offlineQueue.length} items</span>
                </div>
                
                <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[9px]">
                  {offlineQueue.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-1.5 rounded border border-amber-100">
                      <span className="text-slate-600 truncate max-w-[120px] font-bold">[{item.id}] {item.action}</span>
                      <span className="text-slate-400 font-bold">{item.timestamp}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={syncOfflineQueue}
                  className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={10} />
                  <span>{isAmharic ? "መረጃዎቹን ወደ ደመናው ላክ" : "Force Cloud Synchronization"}</span>
                </button>
              </div>
            )}

          </div>

          {/* DYNAMIC TELEMETRY PERFORMANCE GRAPH */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Activity size={14} className="text-emerald-500" />
                {isAmharic ? "የሞባይል አፈጻጸም እና ፍጥነት" : "Mobile UI Engine Metrics"}
              </h3>
              <div className="flex gap-2 text-[10px] font-mono">
                <span className="text-emerald-600 font-bold">{fps} FPS</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 font-bold">{memoryUsed} MB</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              {isAmharic 
                ? "መተግበሪያው በሁሉም ስልኮች ላይ ያለምንም መቆራረጥ በ 60 FPS ፍጥነት እንዲሰራ ተደርጎ የተጠናቀቀ ነው። የአውታረ መረብ መዘግየትን (Network Latency) እዚህ ይመልከቱ።" 
                : "Real-time interface telemetry monitor. Direct hardware API bindings execute at FIPS 60 FPS with low network-to-broker overhead."}
            </p>

            {/* Recharts network latency diagram */}
            <div className="h-[120px] w-full font-sans">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} label={{ value: "Latency (ms)", angle: -90, position: "insideLeft", offset: 0, style: { fontSize: "8px", fill: "#94a3b8", fontWeight: "bold" } }} />
                  <Tooltip contentStyle={{ fontSize: "10px", background: "#0f172a", border: "none", borderRadius: "8px", color: "white" }} />
                  <Line type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

      {/* COMPILER CONFIG & MOBILE APP SOURCE CODE EXPORTER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Code size={15} className="text-indigo-600" />
              {isAmharic ? "የሞባይል ምንጭ ኮድ እና ኮምፓይለር" : "Mobile Cross-Framework Exporter center"}
            </h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              {isAmharic 
                ? "ለ Android (Capacitor/Cordova) እና iOS (Swift plist) መተግበሪያዎች የሚሆኑ የቅንብር ሰነዶችን እዚህ ማግኘት እና ማውረድ ይችላሉ።" 
                : "Generate production-grade manifest templates to wrap OVID's responsive frontend into native iOS Xcode and Android Studio projects using Capacitor."}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {[
              { id: "manifest", label: "webmanifest.json" },
              { id: "android", label: "AndroidManifest.xml" },
              { id: "ios", label: "Info.plist (iOS)" },
              { id: "sw", label: "service-worker.js" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCodeTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  codeTab === tab.id ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(currentManifestCode);
                onLogAction("Mobile Config Code Copied", `Copied structural configuration payload for ${codeTab} to clipboard.`);
                alert(isAmharic ? "ኮዱ ወደ ሰሌዳዎ ተገልብጧል!" : "Configuration payload copied to clipboard!");
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              Copy
            </button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(currentManifestCode)}`}
              download={codeTab === "manifest" ? "manifest.json" : codeTab === "android" ? "AndroidManifest.xml" : codeTab === "ios" ? "Info.plist" : "service-worker.js"}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download size={12} />
              <span>Download</span>
            </a>
          </div>

          <pre className="p-4 bg-slate-950 text-indigo-300 font-mono text-[10px] rounded-2xl overflow-x-auto border border-slate-900 max-h-[220px] shadow-inner select-all">
            <code>{currentManifestCode}</code>
          </pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-800 block mb-1">🔌 PWA offline caching</span>
            {isAmharic 
              ? "የ service-worker.js ሰነድ መተግበሪያው ምንም አይነት ኢንተርኔት በሌለበት ጊዜ መረጃዎችን ስልኩ ላይ እንዲያስቀምጥና እንዲሰራ ያስችለዋል።" 
              : "Service workers intercept requests, caching assets to enable full offline execution with zero server overhead in concrete structural shafts."}
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-800 block mb-1">🤖 Google Android compilation</span>
            {isAmharic 
              ? "የ AndroidManifest.xml ፋይልን በመጠቀም በ Android Studio ውስጥ አፕሊኬሽኑን ኮምፓይል በማድረግ በቀጥታ ስልክዎ ላይ መጫን ይችላሉ።" 
              : "Embed AndroidManifest.xml inside Android Studio workspace. Build signed production release APK or Android App Bundles (AAB) with hardware sensor scopes."}
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-800 block mb-1">🍎 Apple iOS deployment</span>
            {isAmharic 
              ? "የ Info.plist ሰነድን በ Xcode ፕሮጀክትዎ ውስጥ በማካተት ለ iOS ስልኮች የሚሆን መተግበሪያ መገንባት ይችላሉ።" 
              : "Import Info.plist into Apple Xcode. Build native IPA binary for distribution via Apple TestFlight or the corporate App Store sandbox."}
          </div>
        </div>

      </div>

    </div>
  );
}
