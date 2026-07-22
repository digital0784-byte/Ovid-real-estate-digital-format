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
  Unlock,
  LogOut,
  Calendar,
  UserCheck,
  TrendingUp,
  X, 
  ChevronRight,
  Battery,
  AlertOctagon,
  Eye,
  MapPin,
  Check,
  RotateCcw,
  Building,
  Truck,
  QrCode,
  Store,
  ArrowRightLeft
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MobileAppsHubProps {
  isAmharic: boolean;
  currentUserRole: string;
  onLogAction: (action: string, details: string) => void;
  workers?: any[];
  teams?: any[];
  onAddSnag?: (snag: any) => void;
  onNavigateToTab?: (tab: string) => void;
}

type MobileAppType = 
  | "worker"
  | "gang_chief"
  | "assembler"
  | "team_leader"
  | "time_keeper"
  | "supervisor"
  | "head_office"
  | "admin"
  | "sub_contractor"
  | "warehouse_manager"
  | "store_owner";

export function MobileAppsHub({ 
  isAmharic, 
  currentUserRole, 
  onLogAction,
  workers = [],
  teams = [],
  onAddSnag,
  onNavigateToTab
}: MobileAppsHubProps) {
  
  // --- STATE ---
  const [activeApp, setActiveApp] = useState<MobileAppType>("worker");
  const [devicePlatform, setDevicePlatform] = useState<"android" | "ios">("android");
  const [isPhoneOnline, setIsPhoneOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<{ id: string; action: string; payload: any; timestamp: string }[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<{ id: string; title: string; body: string; timestamp: string }[]>([
    { id: "1", title: "Digital Construction ERP PMO Dispatch", body: "New formwork task assigned for Floor 4.", timestamp: "08:15 AM" }
  ]);
  
  // Interconnected shared system states
  const [sharedAttendance, setSharedAttendance] = useState([
    { id: "att-1", name: "Kebede Yosef (Assembler)", role: "Assembler", time: "08:02 AM", method: "GPS Geofenced", status: "Present" },
    { id: "att-2", name: "Almaz Demeke (Worker)", role: "Helper", time: "08:11 AM", method: "Biometric ID Check", status: "Present" },
    { id: "att-3", name: "Chala Bekele (Carpenter)", role: "Formwork Setter", time: "08:15 AM", method: "GPS Geofenced", status: "Present" }
  ]);

  const [sharedDefects, setSharedDefects] = useState([
    { id: "def-1", panel: "W600", description: "Slightly bent bottom flange", reportedBy: "Assembler", status: "Open", date: "Today 08:24 AM" }
  ]);

  const [subcontractors, setSubcontractors] = useState([
    { id: "sub-1", name: "Bole Formwork Specialists", lead: "Alula Kebede", workersCount: 14, activeWorkers: 14, task: "Floor 4 Slab Erection", progress: 75, rating: 4.8, status: "Active" as "Active" | "Awaiting Inspection" | "Suspended", zone: "Zone A", budgetReleased: false },
    { id: "sub-2", name: "Saris Concrete Pourers", lead: "Selamawit Tekle", workersCount: 8, activeWorkers: 8, task: "Floor 3 Joint Casting", progress: 90, rating: 4.5, status: "Active" as "Active" | "Awaiting Inspection" | "Suspended", zone: "Zone B", budgetReleased: false },
    { id: "sub-3", name: "Mercato Steel Erectors", lead: "Yonas Alemu", workersCount: 12, activeWorkers: 12, task: "Floor 4 Reinforcement Rebar", progress: 40, rating: 4.2, status: "Active" as "Active" | "Awaiting Inspection" | "Suspended", zone: "Zone C", budgetReleased: false }
  ]);
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState("sub-1");

  // Subcontractor restricted portal states
  const [subContractorLoggedIn, setSubContractorLoggedIn] = useState(false);
  const [subContractorIdLoggedIn, setSubContractorIdLoggedIn] = useState("sub-1");
  const [subContractorPassword, setSubContractorPassword] = useState("");
  const [subContractorLoginError, setSubContractorLoginError] = useState<string | null>(null);
  const [subContractorCrews, setSubContractorCrews] = useState<{ [subId: string]: { id: string; name: string; checked: boolean }[] }>({
    "sub-1": [
      { id: "crew-1-1", name: "Kebede Yosef", checked: true },
      { id: "crew-1-2", name: "Almaz Demeke", checked: true },
      { id: "crew-1-3", name: "Chala Bekele", checked: true },
      { id: "crew-1-4", name: "Sileshi Tesfaye", checked: false },
      { id: "crew-1-5", name: "Aster Ayele", checked: false }
    ],
    "sub-2": [
      { id: "crew-2-1", name: "Dereje Hailu", checked: true },
      { id: "crew-2-2", name: "Fantu Girma", checked: true },
      { id: "crew-2-3", name: "Kassa Tesfaye", checked: false },
      { id: "crew-2-4", name: "Zenabu Assefa", checked: false }
    ],
    "sub-3": [
      { id: "crew-3-1", name: "Hirut Belay", checked: true },
      { id: "crew-3-2", name: "Abebe Bikila", checked: true },
      { id: "crew-3-3", name: "Martha Getachew", checked: false },
      { id: "crew-3-4", name: "Zewdu Tekle", checked: false }
    ]
  });
  const [subContractorAttendanceHistory, setSubContractorAttendanceHistory] = useState<{
    id: string;
    subId: string;
    date: string;
    crewCount: number;
    presentNames: string[];
    timestamp: string;
  }[]>([
    { id: "sh-1", subId: "sub-1", date: "2026-07-18", crewCount: 3, presentNames: ["Kebede Yosef", "Almaz Demeke", "Chala Bekele"], timestamp: "08:15 AM" }
  ]);
  const [subContractorPortalTab, setSubContractorPortalTab] = useState<"dashboard" | "attendance">("dashboard");

  // New subcontractor form inputs (for owner control)
  const [newSubName, setNewSubName] = useState("");
  const [newSubLead, setNewSubLead] = useState("");
  const [newSubTask, setNewSubTask] = useState("");

  // Assembler App States
  const [assembledPanelsCount, setAssembledPanelsCount] = useState(14);
  const [assemblerPlumbAngle, setAssemblerPlumbAngle] = useState(90.0);
  const [assemblerChecklist, setAssemblerChecklist] = useState([
    { id: "align", taskEn: "Layout line alignment marking", taskAm: "የመስመር አሰላለፍና ምልክት ማድረግ", done: true },
    { id: "release", taskEn: "Apply release oil agent to panels", taskAm: "የፓነል ቅባት መቀባት", done: true },
    { id: "wallSet", taskEn: "Position W600 wall panels with ties", taskAm: "W600 የግድግዳ ፓነሎችን ማቆም", done: false },
    { id: "corners", taskEn: "Secure external corners with AC", taskAm: "ማዕዘናትን በኤሲ (AC) ቅንፍ ማሰር", done: false }
  ]);
  const [selectedDefectPanel, setSelectedDefectPanel] = useState("W600");
  const [defectDescriptionText, setDefectDescriptionText] = useState("");
  const [tomorrowRequested, setTomorrowRequested] = useState(false);
  
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
        onLogAction(`Offline Queue Synchronized`, `Processed item ${item.id} - [${item.action}] successfully dispatched to central Digital Construction ERP database.`);
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
  "short_name": "Digital Construction ERP ERP",
  "name": "Digital Construction ERP ERP Mobile Suite",
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
    package="com.digital.construction.erp">

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
        android:label="Digital Construction ERP Mobile"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.DigitalConstruction">
        
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
	<string>Digital Construction ERP Mobile ERP</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>com.digital.construction.mobile</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>NSCameraUsageDescription</key>
	<string>Digital Construction ERP mobile needs camera access to capture safety hazard photos and scan QR barcodes.</string>
	<key>NSLocationWhenInUseUsageDescription</key>
	<string>Digital Construction ERP mobile requires GPS access to confirm attendance geofencing on Bole site.</string>
	<key>NSFaceIDUsageDescription</key>
	<string>Digital Construction ERP mobile requires FaceID to authenticate supervisor signatures.</string>
	<key>UIBackgroundModes</key>
	<array>
		<string>remote-notification</string>
	</array>
</dict>
</plist>`,
    sw: `// Digital Construction ERP Mobile ERP Progressive Web App Service Worker
const CACHE_NAME = 'digital-construction-erp-v1';
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
                {isAmharic ? "ዲጂታል ኮንስትራክሽን ERP የሞባይል ማቀናበሪያ ማዕከል" : "Digital Construction ERP Mobile Compilation Hub"}
              </span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Smartphone className="text-indigo-400" />
              {isAmharic ? "Digital Construction ERP ERP የሞባይል ስሪቶች" : "Digital Construction ERP ERP Native Mobile Apps"}
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              {isAmharic 
                ? "ዘጠኙን የ Digital Construction ERP ERP የሞባይል መተግበሪያዎች (ለሰራተኛ፣ ለቡድን መሪ፣ ለአሰባሳቢ/Assembler፣ ለሰብ-ኮንትራክተር፣ ለሱፐርቫይዘር እና ለዋና መስሪያ ቤት) እዚህ ይቆጣጠሩ፣ ይሞክሩ እና ያውርዱ። የመስመር ውጭ ስራ፣ ጂፒኤስ፣ ካሜራ፣ እና ባዮሜትሪክስን በተግባር ይመልከቱ።" 
                : "Manage, simulate, and export Digital Construction ERP ERP's 9 custom native mobile applications. Evaluate low-level device integrations including full offline capabilities, hardware sensor simulation, and multi-channel telemetry."}
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
        
        {/* LEFT COLUMN: THE 8 DISTINCT APPS SELECTOR (width: 4/12) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Users size={14} className="text-indigo-600" />
              {isAmharic ? "11ቱ የሞባይል መተግበሪያዎች" : "The 11 Role Applications"}
            </h3>
            
            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[500px] pr-1">
              {[
                { id: "worker", titleEn: "1. Worker App", titleAm: "1. የሰራተኛ መተግበሪያ", descEn: "Task logging, geofenced clocking, camera hazard snags", descAm: "የስራ ሂደት መዝገብ፣ ባዮሜትሪክ መገኘት እና የስራ ጉድለት ፎቶዎች" },
                { id: "gang_chief", titleEn: "2. Gang Chief App", titleAm: "2. የቡድን መሪ መተግበሪያ", descEn: "Team attendance, toolboxes, interconnected assembler progress", descAm: "የቡድን አባላት መገኘት፣ የደህንነት ስብሰባዎችና የአሰባሳቢ ሪፖርት" },
                { id: "assembler", titleEn: "3. Assembler App", titleAm: "3. የአሰባሳቢ (Assembler) መተግበሪያ", descEn: "GPS Clock-In, panel counts, schedule requests, defects logging", descAm: "ጂፒኤስ መገኘት መሙያ፣ የፓነል ቁጥር፣ የቀጣይ ቀን ጥያቄ እና ብልሽት ሪፖርት" },
                { id: "team_leader", titleEn: "4. Team Leader App", titleAm: "4. የቲም ሊደር መተግበሪያ", descEn: "Interconnected verticality plum Verification & defect list", descAm: "የአሉሚኒየም ፎርምወርክ ቁጥጥር፣ የአሰባሳቢ ስራ እና ጉድለቶች ዝርዝር" },
                { id: "time_keeper", titleEn: "5. Time Keeper App", titleAm: "5. የሰዓት ቆጣሪ መተግበሪያ", descEn: "Biometrics check, live GPS self-clockings roster approval", descAm: "የጣት አሻራ ምዝገባ፣ የጂፒኤስ መገኘት ቁጥጥርና የራስ መገኘት ማጽደቂያ" },
                { id: "supervisor", titleEn: "6. Supervisor App", titleAm: "6. የሱፐርቫይዘር መተግበሪያ", descEn: "Interconnected defects review, pour approval based on count", descAm: "የኮንክሪት ሙሌት ፍቃድ፣ የፓነል ቁጥርና የአሰባሳቢ ጉድለቶች ፍተሻ" },
                { id: "sub_contractor", titleEn: "7. Sub Contractor App", titleAm: "7. የሰብ-ኮንትራክተር መተግበሪያ", descEn: "Manage progress slider, log site active workers, inspect requests", descAm: "የስራ ሂደት መጠን፣ የሰራተኞች ቁጥር እና የቁጥጥር ጥያቄዎች" },
                { id: "head_office", titleEn: "8. Enterprise Owner App", titleAm: "8. የድርጅቱ ባለቤት መተግበሪያ", descEn: "Subcontractors monitor & control dashboard, master budgets", descAm: "የሰብ-ኮንትራክተሮች ቁጥጥር ቦርድ፣ የበጀት ማጠቃለያና የቀጥታ ክትትል" },
                { id: "admin", titleEn: "9. Admin App", titleAm: "9. የአድሚን መተግበሪያ", descEn: "SOC telemetry logs, App Check certs, remote wiping", descAm: "የሳይበር ደህንነት መከታተያ፣ የደህንነት ቶከኖችና የሞባይል መቆጣጠሪያ" },
                { id: "warehouse_manager", titleEn: "10. Warehouse Manager App", titleAm: "10. የመጋዘን አስተዳዳሪ መተግበሪያ", descEn: "Central store dispatch, truck fleet plate logs & QR gate pass", descAm: "የማዕከላዊ መጋዘን ስርጭት፣ የጭነት መኪና ሰሌዳ ቁጥር እና የQR በር ፍቃድ" },
                { id: "store_owner", titleEn: "11. Site Store Owner App", titleAm: "11. የሳይት ስቶር አቃቤ መተግበሪያ", descEn: "Site material receipts, issue vouchers, bin card balance & requisitions", descAm: "የሳይት እቃዎች መረከቢያ፣ ወጪ ማድረጊያ ቫውቸር እና የክምችት መጠን" }
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
                <span className="text-[9px] font-bold text-slate-400">Digital Construction ERP Mobile LTE</span>
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
                        ? (activeApp === "worker" ? "የሰራተኛ ክፍል" : activeApp === "gang_chief" ? "የቡድን ሃላፊ" : activeApp === "team_leader" ? "የቲም መሪ" : activeApp === "time_keeper" ? "ሰዓት ቆጣሪ" : activeApp === "supervisor" ? "ሳይት ሱፐርቫይዘር" : activeApp === "head_office" ? "ዋና መ/ቤት" : activeApp === "warehouse_manager" ? "መጋዘን አስተዳዳሪ" : "የደህንነት አድሚን")
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

                {/* 3. ASSEMBLER MOBILE APP */}
                {activeApp === "assembler" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    
                    {/* NEW: GPS-Based Self Attendance Clock-In (የራስ መገኘት መመዝገቢያ) */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                          <MapPin size={10} className="text-emerald-400" />
                          {isAmharic ? "የራስ መገኘት መመዝገቢያ (GPS)" : "On-Site Self-Attendance (GPS)"}
                        </span>
                        <span className={`text-[8px] px-1 font-mono rounded ${gpsCoords.inGeofence ? "bg-emerald-950 text-emerald-300 border border-emerald-500/20" : "bg-red-950 text-red-300"}`}>
                          {gpsCoords.inGeofence ? (isAmharic ? "ሳይት ውስጥ ነዎት" : "IN SITE GEOFENCE") : (isAmharic ? "ከሳይት ውጪ" : "OUTSIDE GEOFENCE")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] bg-slate-950 p-1.5 rounded">
                        <div className="space-y-0.5">
                          <p className="text-slate-400">{isAmharic ? "ጂፒኤስ መጋጠሚያ:" : "Site Lock Coords:"}</p>
                          <p className="font-mono text-slate-300 font-bold">{gpsCoords.lat}, {gpsCoords.lng}</p>
                        </div>
                        <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded ${
                          sharedAttendance.some(att => att.name.includes("Assembler") && att.status === "Present")
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/25 animate-pulse"
                            : "bg-amber-950 text-amber-400 border border-amber-500/25"
                        }`}>
                          {sharedAttendance.some(att => att.name.includes("Assembler") && att.status === "Present")
                            ? (isAmharic ? "ተመዝግቧል" : "CLOCKED IN")
                            : (isAmharic ? "ያልተመዘገበ" : "NOT CLOCKED")}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (!gpsCoords.inGeofence) {
                            sendPushNotification(
                              isAmharic ? "የመገኛ ክልል ስህተት" : "Attendance Location Error", 
                              isAmharic ? "መገኘት ለመሙላት በሳይቱ ክልል (Geofence) ውስጥ መሆን አለብዎት!" : "You must be inside the site boundaries to register attendance!"
                            );
                            onLogAction("Self-Attendance Blocked", "Outside of Bole Heights geofence boundary limit.");
                            return;
                          }
                          const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const newRecord = {
                            id: `att-as-${Date.now()}`,
                            name: "Kebede Yosef (Assembler)",
                            role: "Assembler",
                            time: timeStr,
                            method: "GPS Geofenced",
                            status: "Present"
                          };
                          setSharedAttendance(prev => [
                            newRecord,
                            ...prev.filter(att => !att.name.includes("Assembler"))
                          ]);
                          submitMobileAction("Assembler Self Attendance Recorded", { method: "GPS", status: "Present" });
                          sendPushNotification("GPS Attendance Logged", "Assembler Kebede Yosef checked in via site Geofence.");
                          onLogAction("Assembler Self-Attendance", `Logged GPS clock-in: Kebede Yosef (Assembler) present at ${timeStr}`);
                        }}
                        disabled={sharedAttendance.some(att => att.name.includes("Assembler") && att.status === "Present")}
                        className={`w-full py-1.5 text-[9px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          sharedAttendance.some(att => att.name.includes("Assembler") && att.status === "Present")
                            ? "bg-slate-800 text-slate-500 border border-slate-700/50"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <CheckCircle2 size={10} />
                        <span>{isAmharic ? "መገኘት መዝግብ (Clock-In)" : "Register Site Attendance"}</span>
                      </button>
                    </div>

                    {/* Active Daily Setup Work Panel */}
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {isAmharic ? "የዛሬ የፓነል መገጣጠም ስራ" : "Active Daily Work Assignment"}
                        </span>
                        <span className="text-[8px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900 px-1 rounded">Zone B1-4</span>
                      </div>
                      
                      <div className="text-[10px] space-y-1">
                        <p className="font-bold text-indigo-300 leading-tight">
                          {isAmharic 
                            ? "ህንፃ B1, ፎቅ 4 ዞን B - የአሉሚኒየም ግድግዳና ወለል ፎርምወርክ መግጠም"
                            : "Assemble Aluminum Wall & Slab Formwork - Bldg B1, Floor 4 Zone B"
                          }
                        </p>
                        
                        {/* Interactive list of panels required */}
                        <div className="grid grid-cols-3 gap-1 pt-1 text-[8px] font-mono text-center">
                          <div className="bg-slate-950 p-1 rounded border border-slate-800/60">
                            <span className="text-slate-400 block">W600</span>
                            <span className="text-white font-bold">12 pcs</span>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800/60">
                            <span className="text-slate-400 block">W200</span>
                            <span className="text-white font-bold">4 pcs</span>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800/60">
                            <span className="text-slate-400 block">Pins & Wedges</span>
                            <span className="text-indigo-400 font-bold">48 sets</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive checklist for today */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">
                          {isAmharic ? "የሥራ ሂደት ዝርዝር" : "Erection Progress Checklist"}
                        </span>
                        {assemblerChecklist.map((item) => (
                          <label key={item.id} className="flex items-center space-x-2 bg-slate-950/80 p-1 rounded border border-slate-900 text-[9px] cursor-pointer hover:bg-slate-900 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={item.done}
                              onChange={() => {
                                const updated = assemblerChecklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c);
                                setAssemblerChecklist(updated);
                                onLogAction("Assembler Checklist Update", `Toggled '${item.taskEn}' checklist item to: ${!item.done ? "Completed" : "Incomplete"}`);
                              }}
                              className="rounded border-slate-800 text-indigo-600 bg-slate-900 focus:ring-0"
                            />
                            <span className={item.done ? "line-through text-slate-500 font-sans" : "text-slate-300 font-sans"}>
                              {isAmharic ? item.taskAm : item.taskEn}
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Interactive Panel Assembly Counter */}
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-900 space-y-1">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-400">{isAmharic ? "የተገጠሙ የፓነሎች ብዛት" : "Assembled Panels Tracker"}</span>
                          <span className="font-bold text-indigo-400">{assembledPanelsCount} / 24 pcs</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all" style={{ width: `${(assembledPanelsCount / 24) * 100}%` }}></div>
                        </div>
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              if (assembledPanelsCount < 24) {
                                setAssembledPanelsCount(prev => prev + 1);
                                submitMobileAction("Panel Assembled incremented", { total: assembledPanelsCount + 1 });
                                if (assembledPanelsCount + 1 === 24) {
                                  sendPushNotification("Assignment Completed!", "Assembler completed setting up all 24 assigned panels on Floor 4.");
                                }
                              }
                            }}
                            className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[8px] font-bold cursor-pointer"
                          >
                            {isAmharic ? "+1 ጨምር" : "+1 Installed"}
                          </button>
                          <button
                            onClick={() => {
                              if (assembledPanelsCount > 0) {
                                setAssembledPanelsCount(prev => prev - 1);
                              }
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[8px] font-bold cursor-pointer"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tomorrow's Program / Schedules */}
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {isAmharic ? "የነገ የሥራ ፕሮግራሞችና እቅዶች" : "Tomorrow's Schedule & Programs"}
                        </span>
                        <span className="text-[8px] font-mono text-emerald-400 font-bold">Planned</span>
                      </div>

                      <div className="text-[9px] space-y-1.5 leading-normal">
                        <div className="bg-slate-950 p-1.5 rounded text-slate-300 space-y-0.5">
                          <p className="font-bold text-slate-100">08:30 AM: {isAmharic ? "የቋሚነትና የሌቭል ፈተሻ" : "Verticality & Level Verification Check"}</p>
                          <p className="text-slate-400 leading-snug">{isAmharic ? "ከሳይት ሱፐርቫይዘር ጋር የተመጣጠነ ፕላምብ መስመር ፈተሻ" : "Joint walkthrough plumb inspection with Project Supervisor"}</p>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded text-slate-300 space-y-0.5">
                          <p className="font-bold text-slate-100">11:00 AM: {isAmharic ? "የወለል ፎርምወርክ መዘርጋት (Floor Decking)" : "Slab Decking & Beam Bottom Assembly"}</p>
                          <p className="text-slate-400 leading-snug">{isAmharic ? "ለፎቅ 5 ዞን A ፎርምወርክ ቁሶች ዝግጅት" : "Pre-stage aluminum soffit and end beams for Floor 5 Zone A"}</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            setTomorrowRequested(true);
                            submitMobileAction("Pre-stage Materials Requested", { date: "Tomorrow" });
                            sendPushNotification("Pre-stage Material Request Locked", "Requested 24x W600, 12x W300, and 120 pins for tomorrow morning's shift.");
                          }}
                          disabled={tomorrowRequested}
                          className={`w-full py-1 text-[8px] rounded font-bold cursor-pointer transition-all ${
                            tomorrowRequested 
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-900/40"
                              : "bg-indigo-900 hover:bg-indigo-800 text-indigo-200"
                          }`}
                        >
                          {tomorrowRequested 
                            ? (isAmharic ? "የነገ ቁሶች ጥያቄ ተልኳል ✓" : "Pre-stage request transmitted ✓")
                            : (isAmharic ? "የነገ ቁሶችን አስቀድመህ እዘዝ (Pre-stage Request)" : "Pre-stage Tomorrow's Materials")
                          }
                        </button>
                      </div>
                    </div>

                    {/* Interactive Plumb Line Sensor Simulation */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {isAmharic ? "የፕላምብ መስመር (Verticality plumb) ፈተሻ" : "Sensor: Wall Plumb Verification"}
                        </span>
                        <span className={`text-[8px] px-1 font-bold font-mono rounded ${Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400 animate-pulse"}`}>
                          {Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "VERTICAL (OK)" : "ERROR: ADJUST WALL"}
                        </span>
                      </div>
                      
                      {/* Verticality illustration visual */}
                      <div className="bg-slate-950 h-16 rounded-lg relative flex items-center justify-center overflow-hidden border border-slate-900">
                        {/* Center Line target */}
                        <div className="absolute inset-y-0 w-0.5 bg-emerald-500/40 z-10"></div>
                        
                        {/* Hanging plumb bob wire rotating according to slider */}
                        <div 
                          style={{ 
                            transform: `rotate(${(assemblerPlumbAngle - 90.0) * 15}deg)`, 
                            transformOrigin: "top center" 
                          }}
                          className="absolute top-1 bottom-4 w-0.5 bg-indigo-400 transition-transform duration-100"
                        >
                          {/* Plumb bob weight */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-3 bg-indigo-400 clip-cone rounded-b-sm shadow-[0_0_6px_#6366f1]"></div>
                        </div>
                        
                        <div className="absolute bottom-1 right-2 font-mono text-[8px] text-slate-400">
                          {isAmharic ? "አንግል:" : "Current:"} <span className={Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{assemblerPlumbAngle.toFixed(1)}°</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <input 
                          type="range" 
                          min="88.0" 
                          max="92.0" 
                          step="0.1" 
                          value={assemblerPlumbAngle} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAssemblerPlumbAngle(val);
                            if (val === 90.0) {
                              submitMobileAction("Plumb verticality calibration", { angle: 90.0 });
                            }
                          }}
                          className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                          <span>88.0°</span>
                          <span className="text-emerald-500 font-bold">90.0° (Target)</span>
                          <span>92.0°</span>
                        </div>
                      </div>
                    </div>

                    {/* Defect reporting or accessories request */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">
                        {isAmharic ? "የተጎዱ ፓነሎችን ሪፖርት ማድረጊያ" : "Report Damaged Aluminum Panel"}
                      </span>

                      <div className="space-y-1 text-[9px]">
                        <div className="flex gap-1.5">
                          <select 
                            value={selectedDefectPanel}
                            onChange={(e) => setSelectedDefectPanel(e.target.value)}
                            className="bg-slate-950 text-white border border-slate-800 rounded px-1.5 py-1 text-[9px] focus:outline-none"
                          >
                            <option value="W600">W600 (600x2450)</option>
                            <option value="W200">W200 (200x2450)</option>
                            <option value="W300">W300 (300x2450)</option>
                            <option value="AC">AC Corner (100x100)</option>
                            <option value="B">B Beam (400x1200)</option>
                          </select>
                          
                          <input 
                            type="text" 
                            placeholder={isAmharic ? "ብልሽቱን ይግለጹ (ለምሳሌ፡ የተጣመመ)" : "Describe defect (e.g. Bent edge)"}
                            value={defectDescriptionText}
                            onChange={(e) => setDefectDescriptionText(e.target.value)}
                            className="flex-1 bg-slate-950 text-white border border-slate-800 rounded px-2 py-1 text-[9px] focus:outline-none"
                          />
                        </div>

                        <button
                          onClick={() => {
                            if (!defectDescriptionText.trim()) return;
                            const newDefect = {
                              id: `def-${Date.now()}`,
                              panel: selectedDefectPanel,
                              description: defectDescriptionText,
                              reportedBy: "Assembler",
                              status: "Open",
                              date: `Today ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            };
                            setSharedDefects(prev => [newDefect, ...prev]);
                            submitMobileAction("Assembler Defect Report Issued", { panel: selectedDefectPanel, issue: defectDescriptionText });
                            sendPushNotification("Panel Defect Logged", `${selectedDefectPanel} reported with defect: '${defectDescriptionText}' by Assembler.`);
                            setDefectDescriptionText("");
                            onLogAction("Defect Logged", `Logged panel defect: ${selectedDefectPanel} - ${defectDescriptionText}`);
                          }}
                          className="w-full py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded cursor-pointer"
                        >
                          {isAmharic ? "ብልሽቱን ሪፖርት አድርግ" : "Log Damaged Panel"}
                        </button>
                      </div>
                    </div>
                    
                    {/* Accessories store request */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የተጨማሪ ፒንና ዌጅ (Pins/Wedges) ጥያቄ" : "Fast Store Accessory Request"}</span>
                        <span className="text-[8px] font-mono text-cyan-400">Direct Socket</span>
                      </div>
                      <button 
                        onClick={() => {
                          submitMobileAction("Accessory Pin Request Sent", { qty: 50, item: "Pins & Wedges" });
                          sendPushNotification("Accessory Request Logged", "Requested 50x Joint Pins and 50x Wedges to Site B1-Floor 4 Zone B.");
                        }}
                        className="w-full py-1 bg-cyan-900 hover:bg-cyan-800 text-cyan-100 rounded text-[9px] font-bold cursor-pointer"
                      >
                        {isAmharic ? "50 ፒን እና 50 ዌጅ ከስቶር እዘዝ" : "Order 50 Joint Pins & Wedges"}
                      </button>
                    </div>

                  </div>
                )}

                {/* 4. TEAM LEADER MOBILE APP */}
                {activeApp === "team_leader" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የአሉሚኒየም ፎርምወርክ አሰላለፍ ቁጥጥር" : "Formwork Verticality Monitor"}</span>
                      <div className="space-y-1">
                        {[
                          { task: isAmharic ? "የፒን ጥብቅነት መፈተሻ (B1)" : "Check pin tightness B1", status: "Passed" },
                          { task: isAmharic ? "የፕላምብ መስመር ማረጋገጫ (Plumb)" : "Verticality plumb line verification", status: Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "Passed" : "Awaiting" }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[9px] bg-slate-950 p-1.5 rounded">
                            <span className="text-slate-300 font-sans">{item.task}</span>
                            <span className={`font-mono text-[8px] px-1 rounded ${item.status === "Passed" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-400"}`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Integrated Live Assembler Feed */}
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {isAmharic ? "ከአሰባሳቢ የቀረበ ቀጥታ መረጃ" : "Connected Assembler Live Feed"}
                      </span>
                      <div className="text-[9px] space-y-1 bg-slate-950 p-2 rounded leading-snug">
                        <div className="flex justify-between">
                          <span className="text-slate-400">{isAmharic ? "የተገጠሙ ፓነሎች:" : "Erected Panels:"}</span>
                          <span className="text-indigo-400 font-bold font-mono">{assembledPanelsCount} / 24 pcs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{isAmharic ? "የፕላምብ አንግል:" : "Plumb Alignment:"}</span>
                          <span className={`font-mono font-bold ${Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "text-emerald-400" : "text-amber-400 animate-pulse"}`}>
                            {assemblerPlumbAngle.toFixed(1)}° ({Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "VERTICAL OK" : "NEED RE-ALIGN"})
                          </span>
                        </div>
                        
                        {sharedDefects.length > 0 && (
                          <div className="pt-1.5 border-t border-slate-900 mt-1">
                            <span className="text-[8px] text-rose-400 font-bold block mb-1">
                              {isAmharic ? "ያልተፈቱ የአሉሚኒየም ፓነል ብልሽቶች:" : "Open Panel Defects Reported:"}
                            </span>
                            <div className="max-h-16 overflow-y-auto space-y-1">
                              {sharedDefects.map((def) => (
                                <div key={def.id} className="bg-slate-900 p-1 rounded flex justify-between items-center text-[7.5px] text-slate-300 font-mono">
                                  <span>{def.panel}: {def.description}</span>
                                  <span className="text-rose-400 font-bold uppercase">{def.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-900 space-y-1.5 text-center">
                      <p className="text-[10px] text-indigo-300 font-bold">{isAmharic ? "የስራ አፈጻጸም መዝገብ" : "Submit Gang Productivity"}</p>
                      <button 
                        onClick={() => {
                          const hasIssues = Math.abs(assemblerPlumbAngle - 90.0) >= 0.2 || assembledPanelsCount < 20;
                          const calculatedScore = hasIssues ? 72.0 : 96.5;
                          submitMobileAction("Gang Productivity Transmitted", { score: calculatedScore, assemblerPanels: assembledPanelsCount });
                          sendPushNotification(
                            isAmharic ? "የቡድን ምርታማነት ተልኳል" : "Team Leader Sync", 
                            isAmharic 
                              ? `ምርታማነት ውጤት ${calculatedScore}% ለዋና መ/ቤት ተልኳል`
                              : `Daily progress for building B1 locked at ${calculatedScore}% efficiency.`
                          );
                          onLogAction("Team Leader Metric Sync", `Transmitted gang productivity score of ${calculatedScore}% to corporate ledger.`);
                        }}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold cursor-pointer"
                      >
                        {isAmharic ? "የቀን ማጠቃለያ ላክ (Transmit)" : "Transmit Daily Metrics"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. TIME KEEPER MOBILE APP */}
                {activeApp === "time_keeper" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "አዲስ ሰራተኛ ምዝገባ (Biometric)" : "Add New Worker Mobile Entry"}</span>
                      <div className="space-y-1.5 text-[10px]">
                        <input 
                          type="text" 
                          id="newWorkerNameInput"
                          placeholder={isAmharic ? "ሙሉ ስም አስገባ" : "Enter Worker Full Name"}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[9px] text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button 
                          onClick={() => {
                            const inputEl = document.getElementById("newWorkerNameInput") as HTMLInputElement;
                            const nameVal = inputEl?.value || "Chala Yosef";
                            setBiometricStatus("scanning");
                            handleBiometricPress();
                            setTimeout(() => {
                              submitMobileAction("Worker Registered Biometrically", { name: nameVal, status: "Activated" });
                              sendPushNotification("Biometric Profile Locked", `Added hardware fingerprint hash for ${nameVal}.`);
                              if (inputEl) inputEl.value = "";
                            }, 1550);
                          }}
                          className="w-full py-1.5 bg-indigo-900 hover:bg-indigo-800 text-indigo-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Fingerprint size={10} />
                          <span>{isAmharic ? "ባዮሜትሪክ መረጃ ቅረጽ" : "Scan Fingerprint Hardware"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Live GPS Self-Clockings Approval Panel */}
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {isAmharic ? "የራስ-መገኘት ማጽደቂያ" : "GPS Self-Clockings Approval"}
                        </span>
                        <span className="text-[8px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900 px-1 rounded">Muster Roll</span>
                      </div>

                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                        {sharedAttendance.filter(att => att.method === "GPS Geofenced").length === 0 ? (
                          <p className="text-[8.5px] text-slate-500 text-center py-2 font-sans italic">
                            {isAmharic ? "የቀረበ የራስ መገኘት ጥያቄ የለም" : "No pending self-attendance logs found."}
                          </p>
                        ) : (
                          sharedAttendance.filter(att => att.method === "GPS Geofenced").map((att) => (
                            <div key={att.id} className="bg-slate-950 p-1.5 rounded border border-slate-900 flex justify-between items-center text-[8.5px]">
                              <div className="space-y-0.5 text-left">
                                <p className="font-bold text-slate-200 leading-tight">{att.name}</p>
                                <p className="text-[7.5px] text-indigo-400 font-mono">GPS: verified • {att.time}</p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setSharedAttendance(prev => prev.map(a => a.id === att.id ? { ...a, status: "Present" } : a));
                                    sendPushNotification("Roster Approved", `Approved clock-in for ${att.name}`);
                                    onLogAction("Timekeeper Approval", `Approved self-clock-in: ${att.name}`);
                                  }}
                                  className="px-1.5 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-300 rounded text-[7.5px] font-bold cursor-pointer"
                                >
                                  {isAmharic ? "አጽድቅ" : "Approve"}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የሳይት ጂፒኤስ መቆጣጠሪያ" : "GPS Smart Check-in Lock"}</span>
                      <button 
                        onClick={triggerMobileGPS}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Compass size={11} className={gpsLoading ? "animate-spin" : ""} />
                        <span>{isAmharic ? "የአሁኑን ቦታ አረጋግጥ" : "Force Locate GPS Terminal"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. SUPERVISOR MOBILE APP */}
                {activeApp === "supervisor" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    
                    {/* Interconnected Pour Approvals depending on Assembler stats */}
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የኮንክሪት ሙሌት ፍቃድ (Pour)" : "Concrete Pour Sign-Off"}</span>
                        <span className={`text-[8px] font-mono px-1 rounded ${
                          assembledPanelsCount >= 20 && Math.abs(assemblerPlumbAngle - 90.0) < 0.2
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-950 text-amber-400 animate-pulse border border-amber-500/20"
                        }`}>
                          {assembledPanelsCount >= 20 && Math.abs(assemblerPlumbAngle - 90.0) < 0.2
                            ? (isAmharic ? "ለመቀበል ዝግጁ" : "READY FOR POUR")
                            : (isAmharic ? "ይገምገም" : "EVALUATE FORMWORK")}
                        </span>
                      </div>
                      
                      <div className="p-2 bg-slate-950 rounded border border-slate-900 text-[9px] space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span>{isAmharic ? "መገኛ ቦታ:" : "Location:"}</span>
                          <span className="font-bold text-slate-100">Bldg B1, Floor 4 Zone B</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>{isAmharic ? "የተተከሉ ፓነሎች:" : "Erected Panels Count:"}</span>
                          <span className={`font-mono font-bold ${assembledPanelsCount >= 20 ? "text-emerald-400" : "text-amber-400"}`}>
                            {assembledPanelsCount} / 24 pcs
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>{isAmharic ? "አሰላለፍ (Verticality):" : "Plumb Line Alignment:"}</span>
                          <span className={`font-mono font-bold ${Math.abs(assemblerPlumbAngle - 90.0) < 0.2 ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                            {assemblerPlumbAngle.toFixed(1)}°
                          </span>
                        </div>
                      </div>

                      {/* Warning box if assembler conditions are not met */}
                      {(assembledPanelsCount < 20 || Math.abs(assemblerPlumbAngle - 90.0) >= 0.2) ? (
                        <p className="text-[8px] text-amber-400 leading-normal font-sans bg-amber-950/40 p-1.5 rounded border border-amber-900/30">
                          ⚠️ {isAmharic 
                            ? "ማስጠንቀቂያ: ፓነሎች ሙሉ በሙሉ አልተገጠሙም ወይም የፕላምብ መስመሩ አልተስተካከለም! እባክዎ አሰባሳቢውን ያነጋግሩ።" 
                            : "FORM INSPECTION FAILED: Insufficient panel count (<20) or verticality plumb error. Adjust with Assembler."}
                        </p>
                      ) : null}

                      <button 
                        onClick={() => {
                          if (assembledPanelsCount < 20) {
                            sendPushNotification(
                              isAmharic ? "የሙሌት ፍቃድ ተከልክሏል" : "Pour Authorization Rejected", 
                              isAmharic ? "ፎርምወርክ ሙሉ በሙሉ ስላልተገጠመ መፍቀድ አይችሉም!" : "Cannot authorize pour! Wait until Assembler installs at least 20 panels."
                            );
                            onLogAction("Pour Attempt Rejected", "Formwork count check failed. Pour authorization blocked.");
                            return;
                          }
                          if (Math.abs(assemblerPlumbAngle - 90.0) >= 0.2) {
                            sendPushNotification(
                              isAmharic ? "የፕላምብ መስመር ስህተት" : "Plumb Check Failed", 
                              isAmharic ? "የፕላምብ መስመር አንግል ስህተት ስላለው መፍቀድ አይችሉም!" : "Cannot authorize pour! Plumb line must be at 90.0°."
                            );
                            onLogAction("Pour Attempt Rejected", "Verticality check failed. Pour authorization blocked.");
                            return;
                          }
                          submitMobileAction("Concrete Pour Authorized", { building: "B1", floor: 4, panels: assembledPanelsCount });
                          sendPushNotification("Pour Authorization Signed", "Pour ticket #401 issued to site engineering.");
                          onLogAction("Concrete Pour Signed Off", `Supervisor signed off pour ticket #401 for B1-F4 based on successful plumb check of ${assemblerPlumbAngle}°`);
                        }}
                        className={`w-full py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition-all ${
                          assembledPanelsCount >= 20 && Math.abs(assemblerPlumbAngle - 90.0) < 0.2
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                            : "bg-slate-800 text-slate-500 cursor-not-allowed"
                        }`}
                      >
                        {isAmharic ? "ለሙሌት ፍቃድ ፈርም (Approve)" : "Authorize Concrete Pour Now"}
                      </button>
                    </div>

                    {/* Integrated Assembler Defect Review */}
                    {sharedDefects.length > 0 && (
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                        <span className="text-[10px] text-rose-400 font-bold">{isAmharic ? "የአሉሚኒየም ፎርምወርክ ጉድለቶች" : "Reported Panel Defects Review"}</span>
                        <div className="space-y-1 max-h-[110px] overflow-y-auto pr-0.5">
                          {sharedDefects.map((def) => (
                            <div key={def.id} className="bg-slate-950 p-1.5 rounded border border-slate-900 flex justify-between items-center text-[8px]">
                              <div className="space-y-0.5 text-left">
                                <p className="font-bold text-slate-200">{def.panel} - {def.description}</p>
                                <p className="text-[7px] text-slate-500 font-mono">By: {def.reportedBy} • {def.date}</p>
                              </div>
                              <button
                                onClick={() => {
                                  setSharedDefects(prev => prev.filter(d => d.id !== def.id));
                                  sendPushNotification("Defect Resolved", `Defect on ${def.panel} resolved.`);
                                  onLogAction("Defect Closed", `Supervisor cleared defect on panel ${def.panel}`);
                                }}
                                className="px-1.5 py-0.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded text-[7.5px] font-bold cursor-pointer"
                              >
                                {isAmharic ? "ፈታሁት" : "Resolve"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "ማስጠንቀቂያዎችን አስተላልፍ" : "Broadcast Site Emergency Alert"}</span>
                      <button 
                        onClick={() => {
                          sendPushNotification("WEATHER ALERT", "High winds expected. Secure lightweight panels.");
                          onLogAction("Supervisor Site Broadcast Issued", "Sent high wind alert broadcast to all active mobile hubs.");
                        }}
                        className="w-full py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                      >
                        <Bell size={10} />
                        <span>{isAmharic ? "ማስጠንቀቂያ አስተላልፍ" : "Trigger Emergency Broadcast"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 7. SUB CONTRACTOR MOBILE APP */}
                {activeApp === "sub_contractor" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    {!subContractorLoggedIn ? (
                      /* Restricted Login Interface */
                      <div className="space-y-3 text-left">
                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                              <Lock size={11} className="text-amber-400" />
                              {isAmharic ? "ደህንነቱ የተጠበቀ መግቢያ" : "Restricted Partner Portal"}
                            </span>
                            <span className="text-[8px] font-mono bg-amber-950 text-amber-400 border border-amber-900 px-1 rounded">
                              {isAmharic ? "ተዘግቷል" : "Encrypted"}
                            </span>
                          </div>

                          {/* Subcontractor selection */}
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-400 font-bold block uppercase tracking-wide">
                              {isAmharic ? "ድርጅት ይምረጡ:" : "Select Subcontractor Company:"}
                            </label>
                            <select
                              value={selectedSubcontractorId}
                              onChange={(e) => {
                                setSelectedSubcontractorId(e.target.value);
                                setSubContractorPassword("");
                                setSubContractorLoginError(null);
                              }}
                              className="w-full bg-slate-950 text-white border border-slate-800 rounded px-1.5 py-1 text-[9px] focus:outline-none"
                            >
                              {subcontractors.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name} ({sub.zone})</option>
                              ))}
                            </select>
                          </div>

                          {/* Passcode Input */}
                          <div className="space-y-1">
                            <label className="text-[8px] text-slate-400 font-bold block uppercase tracking-wide">
                              {isAmharic ? "የይለፍ ቃል ያስገቡ:" : "Partner Passcode:"}
                            </label>
                            <input
                              type="password"
                              value={subContractorPassword}
                              onChange={(e) => {
                                setSubContractorPassword(e.target.value);
                                setSubContractorLoginError(null);
                              }}
                              placeholder={isAmharic ? "••••••" : "Passcode"}
                              className="w-full bg-slate-950 text-white border border-slate-800 rounded px-1.5 py-1 text-[9px] focus:outline-none tracking-widest placeholder:tracking-normal"
                            />
                          </div>

                          {/* Error block if any */}
                          {subContractorLoginError && (
                            <div className="bg-rose-950/40 border border-rose-900/60 p-1.5 rounded text-[8px] text-rose-300 flex items-center gap-1">
                              <AlertTriangle size={10} className="shrink-0 text-rose-400" />
                              <span>{subContractorLoginError}</span>
                            </div>
                          )}

                          {/* Submit button */}
                          <button
                            onClick={() => {
                              const activeSub = subcontractors.find(sub => sub.id === selectedSubcontractorId) || subcontractors[0];
                              let expectedPass = "1234";
                              if (activeSub.id === "sub-1") expectedPass = "bole75";
                              else if (activeSub.id === "sub-2") expectedPass = "saris90";
                              else if (activeSub.id === "sub-3") expectedPass = "mercato40";

                              if (subContractorPassword.trim() === expectedPass || subContractorPassword.trim() === "1234") {
                                setSubContractorLoggedIn(true);
                                setSubContractorIdLoggedIn(activeSub.id);
                                setSubContractorLoginError(null);
                                onLogAction("Subcontractor Login Success", `Approved restricted access for ${activeSub.name} to ${activeSub.zone}`);
                                sendPushNotification(
                                  isAmharic ? "ደህንነቱ የተጠበቀ መግቢያ ተፈቅዷል" : "Restricted Session Initiated", 
                                  `${activeSub.name} logged into Partner Portal for ${activeSub.zone}.`
                                );
                              } else {
                                setSubContractorLoginError(isAmharic ? "የይለፍ ቃል ስህተት ነው! (ምክር፡- bole75፣ saris90 ወይም mercato40 ይሞክሩ)" : "Invalid passcode! (Hint: Use bole75, saris90 or mercato40)");
                                onLogAction("Subcontractor Login Failed", `Failed passcode attempt for ${activeSub.name}`);
                              }
                            }}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9.5px] font-bold cursor-pointer transition-colors"
                          >
                            {isAmharic ? "ወደ ፖርታል ግባ (Access Portal)" : "Authenticate & Open Portal"}
                          </button>
                        </div>

                        {/* Demo login instructions info block */}
                        <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                          <span className="text-[8px] font-bold text-amber-400 block uppercase tracking-wide flex items-center gap-0.5">
                            <Unlock size={9} />
                            {isAmharic ? "ምሳሊያዊ መግቢያ የይለፍ ቃሎች (Demo Passcodes):" : "Sandbox Passcode Reference:"}
                          </span>
                          <div className="text-[7.5px] text-slate-400 font-mono space-y-0.5 text-left">
                            <p>• Bole Formwork Specialists: <span className="text-amber-300 font-bold">bole75</span></p>
                            <p>• Saris Concrete Pourers: <span className="text-amber-300 font-bold">saris90</span></p>
                            <p>• Mercato Steel Erectors: <span className="text-amber-300 font-bold">mercato40</span></p>
                            <p>• {isAmharic ? "ሌሎች / አዲስ የተመዘገቡ:" : "Others / New registrations:"} <span className="text-amber-300 font-bold">1234</span></p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Authenticated restricted subcontractor portal workspace */
                      (() => {
                        const activeSub = subcontractors.find(sub => sub.id === subContractorIdLoggedIn) || subcontractors[0];
                        if (!activeSub) return null;

                        const crewList = subContractorCrews[activeSub.id] || [
                          { id: `crew-${activeSub.id}-1`, name: "Mulugeta Teshome", checked: false },
                          { id: `crew-${activeSub.id}-2`, name: "Tigist Hailu", checked: false },
                          { id: `crew-${activeSub.id}-3`, name: "Dawit Worku", checked: false }
                        ];

                        const activeSubLogs = subContractorAttendanceHistory.filter(log => log.subId === activeSub.id);

                        return (
                          <div className="space-y-3 animate-fade-in text-slate-200">
                            
                            {/* Restricted Session Header */}
                            <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 flex justify-between items-center">
                              <div className="text-left space-y-0.5">
                                <p className="text-[9.5px] font-bold text-white truncate max-w-[140px]">{activeSub.name}</p>
                                <p className="text-[7.5px] text-slate-400 flex items-center gap-1">
                                  <MapPin size={9} className="text-cyan-400" />
                                  {isAmharic ? `ቀጠና: ${activeSub.zone}` : `Zone Locked: ${activeSub.zone}`}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setSubContractorLoggedIn(false);
                                  setSubContractorPassword("");
                                  onLogAction("Subcontractor Logout", `${activeSub.name} closed restricted session`);
                                }}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[7.5px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <LogOut size={8} />
                                <span>{isAmharic ? "ውጣ" : "Logout"}</span>
                              </button>
                            </div>

                            {/* Dual Tabs Selector */}
                            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-900">
                              <button
                                onClick={() => setSubContractorPortalTab("dashboard")}
                                className={`py-1 text-[8.5px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                  subContractorPortalTab === "dashboard"
                                    ? "bg-indigo-900/60 text-indigo-200 border border-indigo-800/50"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                <TrendingUp size={10} />
                                <span>{isAmharic ? "መቆጣጠሪያ ቦርድ" : "Dashboard"}</span>
                              </button>
                              <button
                                onClick={() => setSubContractorPortalTab("attendance")}
                                className={`py-1 text-[8.5px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                  subContractorPortalTab === "attendance"
                                    ? "bg-indigo-900/60 text-indigo-200 border border-indigo-800/50"
                                    : "text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                <UserCheck size={10} />
                                <span>{isAmharic ? "የሰራተኞች መገኘት" : "Crew Roster"}</span>
                              </button>
                            </div>

                            {subContractorPortalTab === "dashboard" ? (
                              /* TAB 1: DEDICATED DASHBOARD SUMMARY */
                              <div className="space-y-2.5">
                                
                                {/* Status and inspection card */}
                                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2 text-left">
                                  <div className="flex justify-between items-center text-[9px]">
                                    <span className="text-slate-400">{isAmharic ? "የጥራት ደረጃ / ፍቃድ:" : "Quality Sign-Off Status:"}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[7.5px] font-mono font-black uppercase ${
                                      activeSub.status === "Active" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                                      activeSub.status === "Awaiting Inspection" ? "bg-amber-950 text-amber-400 border border-amber-900 animate-pulse" :
                                      "bg-rose-950 text-rose-400 border border-rose-900"
                                    }`}>
                                      {activeSub.status === "Active" ? (isAmharic ? "አሪፍ / እየሰራ" : "Approved / Active") :
                                       activeSub.status === "Awaiting Inspection" ? (isAmharic ? "ቁጥጥር እየተጠበቀ" : "Pending Audit") :
                                       (isAmharic ? "የታገደ" : "Suspended")}
                                    </span>
                                  </div>

                                  {/* Subcontractor progress update */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[8.5px]">
                                      <span className="text-slate-400">{isAmharic ? "የኮንትራት ስራ ሂደት መጠን:" : "Contract Completion progress:"}</span>
                                      <span className="font-extrabold text-cyan-400 font-mono">{activeSub.progress}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={activeSub.progress}
                                      disabled={activeSub.status === "Suspended"}
                                      onChange={(e) => {
                                        const progVal = parseInt(e.target.value, 10);
                                        setSubcontractors(prev => prev.map(s => s.id === activeSub.id ? { ...s, progress: progVal } : s));
                                        submitMobileAction("Subcontractor Progress Slider Shifted", { subId: activeSub.id, progress: progVal });
                                      }}
                                      className={`w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${activeSub.status === "Suspended" ? "opacity-30 cursor-not-allowed" : ""}`}
                                    />
                                  </div>

                                  {/* On-site active workers counter */}
                                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 flex justify-between items-center text-[9px]">
                                    <div className="space-y-0.5">
                                      <span className="text-slate-400 block">{isAmharic ? "በሳይት የሉ ሰራተኞች:" : "Active On-Site Crew:"}</span>
                                      <span className="font-bold text-white font-mono">{activeSub.activeWorkers} {isAmharic ? "ሰራተኞች" : "Workers"}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => {
                                          if (activeSub.status !== "Suspended") {
                                            setSubcontractors(prev => prev.map(s => s.id === activeSub.id ? { ...s, activeWorkers: s.activeWorkers + 1 } : s));
                                            submitMobileAction("Active Worker Count Incremented", { subId: activeSub.id });
                                          }
                                        }}
                                        disabled={activeSub.status === "Suspended"}
                                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed text-white rounded font-bold text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (activeSub.status !== "Suspended" && activeSub.activeWorkers > 0) {
                                            setSubcontractors(prev => prev.map(s => s.id === activeSub.id ? { ...s, activeWorkers: s.activeWorkers - 1 } : s));
                                            submitMobileAction("Active Worker Count Decremented", { subId: activeSub.id });
                                          }
                                        }}
                                        disabled={activeSub.status === "Suspended" || activeSub.activeWorkers <= 0}
                                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed text-white rounded font-bold text-xs flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                    </div>
                                  </div>

                                  {/* Request inspection button */}
                                  <button
                                    onClick={() => {
                                      setSubcontractors(prev => prev.map(s => s.id === activeSub.id ? { ...s, status: "Awaiting Inspection" } : s));
                                      submitMobileAction("Subcontractor Inspection Requested", { subId: activeSub.id });
                                      sendPushNotification(
                                        isAmharic ? "ፍተሻ ተጠይቋል" : "Inspection Requested", 
                                        isAmharic 
                                          ? `${activeSub.name} የሰራው ስራ እንዲፈተሽለት ጥያቄ አቅርቧል`
                                          : `${activeSub.name} issued a supervisor quality check request for ${activeSub.zone}.`
                                      );
                                      onLogAction("Subcontractor Request", `${activeSub.name} requested milestone verticality check in ${activeSub.zone}`);
                                    }}
                                    disabled={activeSub.status !== "Active"}
                                    className={`w-full py-1.5 text-[8.5px] font-bold rounded-lg cursor-pointer transition-all ${
                                      activeSub.status !== "Active"
                                        ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                                        : "bg-cyan-600 hover:bg-cyan-700 text-white"
                                    }`}
                                  >
                                    {activeSub.status === "Awaiting Inspection"
                                      ? (isAmharic ? "የፍተሻ ጥያቄ ቀርቧል ✓" : "Inspection Awaiting Review ✓")
                                      : activeSub.status === "Suspended"
                                      ? (isAmharic ? "አገልግሎት በባለቤቱ ታግዷል" : "Account Suspended by Owner")
                                      : (isAmharic ? "የስራ ፍተሻ ጥያቄ አቅርብ (Inspect)" : "Request Supervisor Inspection")
                                    }
                                  </button>
                                </div>

                                {/* Financial and Allocation KPI summary */}
                                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2 text-left">
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">
                                    {isAmharic ? "ቀጠናዊ የፋይናንስና ድልድል ማጠቃለያ" : "Zone Financials & Allocation Summary"}
                                  </span>
                                  <div className="grid grid-cols-2 gap-1.5 text-[8px] font-mono">
                                    <div className="bg-slate-950 p-1.5 rounded border border-slate-900">
                                      <span className="text-slate-500 block">{isAmharic ? "ደረጃ" : "RATING:"}</span>
                                      <span className="text-amber-400 font-bold">{activeSub.rating} ★★★★★</span>
                                    </div>
                                    <div className="bg-slate-950 p-1.5 rounded border border-slate-900">
                                      <span className="text-slate-500 block">{isAmharic ? "የበጀት ሁኔታ" : "FUNDING STATE:"}</span>
                                      <span className={activeSub.budgetReleased ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                        {activeSub.budgetReleased ? (isAmharic ? "የተለቀቀ ✓" : "Released ✓") : (isAmharic ? "በሂደት ላይ" : "Milestone Pending")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-slate-950 p-1.5 rounded border border-slate-900 text-[8px] space-y-0.5">
                                    <p className="text-slate-400"><span className="text-slate-500 font-bold">{isAmharic ? "ኃላፊ:" : "LEAD REPRESENTATIVE:"}</span> {activeSub.lead}</p>
                                    <p className="text-slate-400"><span className="text-slate-500 font-bold">{isAmharic ? "የተመደበለት ስራ:" : "ASSIGNED CONTRACT TASK:"}</span> {activeSub.task}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* TAB 2: INTERACTIVE CREW ATTENDANCE LOGS */
                              <div className="space-y-2.5 text-left">
                                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                                  <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      {isAmharic ? "የሰራተኞች የስራ መገኘት መመዝገቢያ" : "Daily Crew Attendance Logging"}
                                    </span>
                                    <span className="text-[8px] text-slate-500 font-mono flex items-center gap-1">
                                      <Calendar size={8} />
                                      {new Date().toLocaleDateString()}
                                    </span>
                                  </div>

                                  {/* Roster crew checkboxes */}
                                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-0.5">
                                    {crewList.map((worker) => (
                                      <label 
                                        key={worker.id}
                                        className="flex items-center justify-between p-1.5 bg-slate-950 hover:bg-slate-900 rounded border border-slate-900 cursor-pointer text-[8.5px] transition-colors"
                                      >
                                        <span className="text-slate-200 font-medium">{worker.name}</span>
                                        <input
                                          type="checkbox"
                                          checked={worker.checked}
                                          disabled={activeSub.status === "Suspended"}
                                          onChange={() => {
                                            if (activeSub.status !== "Suspended") {
                                              setSubContractorCrews(prev => {
                                                const currentCrew = prev[activeSub.id] || crewList;
                                                const updated = currentCrew.map(c => c.id === worker.id ? { ...c, checked: !c.checked } : c);
                                                return { ...prev, [activeSub.id]: updated };
                                              });
                                            }
                                          }}
                                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer h-3 w-3 accent-indigo-500"
                                        />
                                      </label>
                                    ))}
                                  </div>

                                  {/* Log action button */}
                                  <button
                                    onClick={() => {
                                      const presentCrew = crewList.filter(c => c.checked);
                                      
                                      // 1. Create a new historical log
                                      const newLog = {
                                        id: `sh-${Date.now()}`,
                                        subId: activeSub.id,
                                        date: new Date().toISOString().split('T')[0],
                                        crewCount: presentCrew.length,
                                        presentNames: presentCrew.map(p => p.name),
                                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      };
                                      setSubContractorAttendanceHistory(prev => [newLog, ...prev]);

                                      // 2. Push approved items directly to sharedAttendance to interconnect everything!
                                      const newSharedAttendanceItems = presentCrew.map(w => ({
                                        id: `att-sub-${Date.now()}-${w.id}`,
                                        name: `${w.name} (${activeSub.name})`,
                                        role: isAmharic ? "ሰብ-ኮንትራክተር" : "Subcontractor Crew",
                                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                        method: "Subcontractor Portal",
                                        status: "Present"
                                      }));
                                      setSharedAttendance(prev => [...newSharedAttendanceItems, ...prev]);

                                      // 3. Log actions & notifications
                                      submitMobileAction("Subcontractor Crew Attendance Submitted", { subId: activeSub.id, crewCount: presentCrew.length });
                                      sendPushNotification(
                                        isAmharic ? "የመገኘት መዝገብ ደርሷል" : "Roster Attendance Logged", 
                                        isAmharic 
                                          ? `${activeSub.name} ለ${presentCrew.length} ሰራተኞች የመገኘት መዝገብ ልኳል`
                                          : `${activeSub.name} logged on-site attendance for ${presentCrew.length} crew workers.`
                                      );
                                      onLogAction("Subcontractor Attendance Logged", `${activeSub.name} synchronized attendance roster with main ERP (Present count: ${presentCrew.length})`);
                                    }}
                                    disabled={activeSub.status === "Suspended" || crewList.length === 0}
                                    className={`w-full py-1.5 text-[8.5px] font-bold rounded-lg cursor-pointer transition-all ${
                                      activeSub.status === "Suspended"
                                        ? "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    }`}
                                  >
                                    {activeSub.status === "Suspended" 
                                      ? (isAmharic ? "አገልግሎቱ ታግዷል" : "Roster Locked - Suspended")
                                      : (isAmharic ? "መገኘት መዝግብ (Submit Roster)" : "Submit Active Crew Attendance")
                                    }
                                  </button>
                                </div>

                                {/* Historical submissions list */}
                                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                                  <span className="text-[8.5px] text-slate-400 font-bold block uppercase tracking-wide">
                                    {isAmharic ? "የቅርብ ጊዜ መዝገቦች ታሪክ" : "Recent Attendance Submissions"}
                                  </span>
                                  {activeSubLogs.length === 0 ? (
                                    <p className="text-[7.5px] text-slate-500 text-center py-1">{isAmharic ? "ምንም ታሪክ የለም" : "No recent logs found"}</p>
                                  ) : (
                                    <div className="space-y-1 max-h-[80px] overflow-y-auto pr-0.5">
                                      {activeSubLogs.map((log) => (
                                        <div key={log.id} className="bg-slate-950 p-1.5 rounded border border-slate-900/50 flex justify-between items-center text-[7.5px] font-mono">
                                          <div>
                                            <p className="text-slate-300 font-bold">{isAmharic ? `ተገኝተዋል: ${log.crewCount} ሰራተኞች` : `${log.crewCount} Present`}</p>
                                            <p className="text-slate-500 text-[6.5px] truncate max-w-[130px]">{log.presentNames.join(", ")}</p>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900 px-1 rounded block">{isAmharic ? "የተላከ" : "Synced ✓"}</span>
                                            <span className="text-slate-500 text-[6px] block mt-0.5">{log.timestamp}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* 8. ENTERPRISE OWNER MOBILE APP (HEAD OFFICE) */}
                {activeApp === "head_office" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    
                    {/* Master statistics card */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የድርጅት ባለቤት ማጠቃለያ" : "Enterprise Executive Ledger"}</span>
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                        <div className="bg-slate-950 p-1.5 rounded">
                          <span className="text-slate-400 text-[8px] block">TOTAL FORMWORK</span>
                          <span className="text-emerald-400 font-black text-xs font-mono">14,250 ㎡</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded">
                          <span className="text-slate-400 text-[8px] block">ACTIVE CONTRACTS</span>
                          <span className="text-cyan-400 font-black text-xs font-mono">{subcontractors.length} Subcontractors</span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Subcontractor Control Center */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "የሰብ-ኮንትራክተሮች መቆጣጠሪያ" : "Subcontractors Control Board"}</span>
                        <span className="text-[8px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-900 px-1 rounded">Live Monitor</span>
                      </div>

                      <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-0.5">
                        {subcontractors.map((sub) => (
                          <div key={sub.id} className="bg-slate-950 p-2 rounded-lg border border-slate-900 space-y-1.5 text-[8.5px]">
                            <div className="flex justify-between items-start">
                              <div className="text-left">
                                <p className="font-bold text-slate-100 leading-tight">{sub.name}</p>
                                <p className="text-[7.5px] text-slate-400">Lead: {sub.lead} • {sub.zone}</p>
                              </div>
                              <span className={`px-1 rounded font-mono text-[7px] font-bold ${
                                sub.status === "Active" ? "bg-emerald-950 text-emerald-400" :
                                sub.status === "Awaiting Inspection" ? "bg-amber-950 text-amber-400 animate-pulse" :
                                "bg-rose-950 text-rose-400"
                              }`}>
                                {sub.status}
                              </span>
                            </div>

                            {/* Progress bar visual */}
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-[7px] text-slate-500 font-mono">
                                <span>Progress: {sub.progress}%</span>
                                <span>Crew: {sub.activeWorkers}</span>
                              </div>
                              <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full transition-all" style={{ width: `${sub.progress}%` }}></div>
                              </div>
                            </div>

                            {/* Owner controls */}
                            <div className="flex gap-1 pt-1">
                              {/* Release funding */}
                              <button
                                onClick={() => {
                                  setSubcontractors(prev => prev.map(s => s.id === sub.id ? { ...s, budgetReleased: true } : s));
                                  submitMobileAction("Milestone Funding Released", { subId: sub.id, amount: "500,000 ETB" });
                                  sendPushNotification("Capital Released", `Authorized milestone payout of 500,000 ETB to ${sub.name}`);
                                  onLogAction("Owner Budget release", `Released 500k ETB milestone progress payout to ${sub.name}`);
                                }}
                                className="flex-1 py-0.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-300 rounded font-bold text-[7.5px] cursor-pointer"
                              >
                                {sub.budgetReleased ? (isAmharic ? "በጀት ተለቋል ✓" : "Funded ✓") : (isAmharic ? "በጀት ፍቀድ" : "Release Budget")}
                              </button>

                              {/* Toggle Status */}
                              <button
                                onClick={() => {
                                  const nextStatus = sub.status === "Active" ? "Suspended" : "Active";
                                  setSubcontractors(prev => prev.map(s => s.id === sub.id ? { ...s, status: nextStatus } : s));
                                  sendPushNotification("Status Updated", `${sub.name} contract status changed to: ${nextStatus}`);
                                  onLogAction("Owner Status Override", `Overwrote status of ${sub.name} to ${nextStatus}`);
                                }}
                                className={`px-1.5 py-0.5 rounded font-bold text-[7.5px] cursor-pointer ${
                                  sub.status === "Active" ? "bg-rose-950 text-rose-300 hover:bg-rose-900" : "bg-indigo-950 text-indigo-300 hover:bg-indigo-900"
                                }`}
                              >
                                {sub.status === "Active" ? (isAmharic ? "አግድ" : "Suspend") : (isAmharic ? "አግብር" : "Activate")}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add new subcontractor form */}
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 space-y-1.5 mt-2">
                        <span className="text-[8.5px] text-indigo-300 font-bold block">{isAmharic ? "አዲስ ሰብ-ኮንትራክተር መመዝገቢያ" : "Register New Subcontractor"}</span>
                        <div className="grid grid-cols-2 gap-1">
                          <input 
                            type="text" 
                            id="newSubName"
                            placeholder={isAmharic ? "ድርጅት" : "Company Name"} 
                            className="bg-slate-900 text-white text-[8px] rounded p-1 border border-slate-800 focus:outline-none"
                          />
                          <input 
                            type="text" 
                            id="newSubLead"
                            placeholder={isAmharic ? "ተወካይ" : "Lead Person"} 
                            className="bg-slate-900 text-white text-[8px] rounded p-1 border border-slate-800 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const nameIn = document.getElementById("newSubName") as HTMLInputElement;
                            const leadIn = document.getElementById("newSubLead") as HTMLInputElement;
                            const company = nameIn?.value || "Lasta Formwork S.C.";
                            const representative = leadIn?.value || "Chala Yosef";
                            
                            const newSub = {
                              id: `sub-${Date.now()}`,
                              name: company,
                              lead: representative,
                              progress: 0,
                              activeWorkers: 0,
                              rating: 5.0,
                              status: "Active" as const,
                              zone: `Zone ${String.fromCharCode(65 + subcontractors.length)}`
                            };
                            setSubcontractors(prev => [...prev, newSub]);
                            sendPushNotification("Contractor Registered", `${company} added as an authorized ERP subcontractor.`);
                            onLogAction("Owner Registered Contractor", `Registered new subcontractor: ${company} under lead: ${representative}`);
                            if (nameIn) nameIn.value = "";
                            if (leadIn) leadIn.value = "";
                          }}
                          className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[8px] font-bold cursor-pointer"
                        >
                          {isAmharic ? "ሰብ-ኮንትራክተር ይመዝገብ" : "Register & Onboard"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 9. ADMIN MOBILE APP */}
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

                {/* 10. WAREHOUSE MANAGER MOBILE APP */}
                {activeApp === "warehouse_manager" && (
                  <div className="space-y-3 animate-fade-in text-slate-200">
                    {/* Central Warehouse Summary */}
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Building size={11} />
                          {isAmharic ? "የማዕከላዊ መጋዘን ማጠቃለያ" : "Central Warehouse Hub"}
                        </span>
                        <span className="text-[8px] font-mono bg-amber-950 text-amber-300 border border-amber-900 px-1 rounded">MAIN HUB 01</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-center">
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900">
                          <span className="text-slate-400 text-[7.5px] block">{isAmharic ? "ጠቅላላ ክምችት" : "Central Stock"}</span>
                          <span className="text-amber-400 font-bold text-xs">18,450 Pcs</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900">
                          <span className="text-slate-400 text-[7.5px] block">{isAmharic ? "የጭነት መኪኖች" : "Dispatch Trucks"}</span>
                          <span className="text-emerald-400 font-bold text-xs">6 Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Truck Dispatch & Gate Pass Generator */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-300 font-bold block border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>{isAmharic ? "የጭነት መኪና መላኪያ እና የQR በር ፍቃድ" : "Dispatch Truck Cargo & QR Gate Pass"}</span>
                        <span className="text-[8px] text-indigo-400 font-mono">GATE PASS #GP-882</span>
                      </span>

                      <div className="space-y-1.5 text-[9px]">
                        <div>
                          <label className="text-[7.5px] text-slate-400 block">{isAmharic ? "የመኪናው ሰሌዳ ቁጥር:" : "Truck Plate Number:"}</label>
                          <input 
                            type="text" 
                            id="wmTruckPlate" 
                            defaultValue="ET-3-11029" 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-[9px] focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[7.5px] text-slate-400 block">{isAmharic ? "የሚላክበት ሳይት ስቶር:" : "Destination Site Store:"}</label>
                          <select 
                            id="wmDestSite"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-[9px] focus:outline-none"
                          >
                            <option value="Bole Heights Site Store">Bole Heights Phase 1 Site Store</option>
                            <option value="Saris Project Site Store">Saris Project Site Store</option>
                            <option value="Mercato Site Store">Mercato Project Site Store</option>
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const plateInput = (document.getElementById("wmTruckPlate") as HTMLInputElement)?.value || "ET-3-11029";
                            const destInput = (document.getElementById("wmDestSite") as HTMLSelectElement)?.value || "Bole Heights Site Store";
                            submitMobileAction("Warehouse Dispatch Created", { plate: plateInput, destination: destInput });
                            sendPushNotification(
                              isAmharic ? "የመጋዘን ጭነት ተላከ" : "Warehouse Cargo Dispatched",
                              isAmharic ? `የጭነት መኪና ${plateInput} ወደ ${destInput} በQR በር ፍቃድ ተልኳል!` : `Truck ${plateInput} loaded & dispatched to ${destInput} with QR Gate Pass.`
                            );
                            onLogAction("Warehouse Manager Dispatch", `Dispatched cargo truck ${plateInput} to ${destInput}`);
                          }}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                        >
                          <Truck size={10} />
                          <span>{isAmharic ? "የQR በር ፍቃድ አውጣና ላክ" : "Generate Gate Pass & Dispatch"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Supplier Intake Scanner */}
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold">{isAmharic ? "ከአቅራቢዎች የተረከቡትን በQR መመዝገቢያ" : "Scan Supplier Delivery QR"}</span>
                        <span className="text-[8px] font-mono text-emerald-400">READY</span>
                      </div>
                      <button
                        onClick={() => {
                          addLatencyPoint();
                          submitMobileAction("Supplier Goods Received", { supplier: "Dangote Cement Factory", qty: 500 });
                          sendPushNotification("Supplier Delivery Verified", "500 Bags of Cement received & logged at Central Warehouse Yard.");
                          onLogAction("Warehouse Supplier Intake", "Scanned & validated 500 bags Dangote OPC cement delivery");
                        }}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <QrCode size={11} className="text-amber-400" />
                        <span>{isAmharic ? "የአቅራቢ ደረሰኝ በQR ኮድ ስካን አድርግ" : "Scan Supplier QR Delivery Note"}</span>
                      </button>
                    </div>

                    {/* Launch Full Standalone App Trigger */}
                    {onNavigateToTab && (
                      <button
                        onClick={() => {
                          onNavigateToTab("warehouseManagerApp");
                          onLogAction("Launched Full Warehouse App", "Navigated from Mobile Simulator to Fullscreen Warehouse Manager App");
                        }}
                        className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                      >
                        <Building size={13} />
                        <span>{isAmharic ? "ወደ ሙሉ የመጋዘን አስተዳዳሪ መተግበሪያ ሂድ" : "Open Full Warehouse App"}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 11. SITE STORE OWNER APP SCREEN */}
                {activeApp === "store_owner" && (
                  <div className="p-3 space-y-2.5 overflow-y-auto max-h-[480px]">
                    <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <Store size={11} />
                          {isAmharic ? "የሳይት ስቶር ክምችት ማጠቃለያ" : "Site Store Yard Inventory"}
                        </span>
                        <span className="text-[8px] font-mono bg-amber-950 text-amber-400 border border-amber-900 px-1 rounded">BOLE SITE STORE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono text-center">
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900">
                          <span className="text-slate-400 text-[7.5px] block">{isAmharic ? "የኮንክሪት ሲሚንቶ" : "OPC Cement"}</span>
                          <span className="text-amber-400 font-bold text-xs">420 Bags</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900">
                          <span className="text-slate-400 text-[7.5px] block">{isAmharic ? "የብረት ዘንግ (Rebar)" : "16mm Rebar"}</span>
                          <span className="text-emerald-400 font-bold text-xs">12.5 Tons</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Material Issue Voucher */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-[10px] text-slate-300 font-bold block border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>{isAmharic ? "የእቃ ወጪ ማድረጊያ ቫውቸር (Issue Voucher)" : "Quick Material Issue Voucher"}</span>
                        <span className="text-[8px] text-emerald-400 font-mono">SIV-9904</span>
                      </span>

                      <div className="space-y-1.5 text-[9px]">
                        <div>
                          <label className="text-[7.5px] text-slate-400 block">{isAmharic ? "የሚወጣው እቃ አይነት:" : "Material Item:"}</label>
                          <select 
                            id="soMaterialSelect" 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-[9px] focus:outline-none"
                          >
                            <option value="Cement (Muger OPC 42.5)">Muger OPC Cement (50kg Bag)</option>
                            <option value="Rebar 16mm Ribbed">Rebar 16mm Ribbed Steel</option>
                            <option value="Formwork Release Oil">Formwork Release Oil (20L Drum)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[7.5px] text-slate-400 block">{isAmharic ? "የሚቀበለው ቡድን / ተራራፊ:" : "Receiving Gang / Subcontractor:"}</label>
                          <input 
                            type="text" 
                            id="soRecipient" 
                            defaultValue="Bole Formwork Specialists (Floor 4)" 
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-[9px] focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const mat = (document.getElementById("soMaterialSelect") as HTMLSelectElement)?.value || "Muger OPC Cement";
                            const recipient = (document.getElementById("soRecipient") as HTMLInputElement)?.value || "Bole Formwork Specialists";
                            submitMobileAction("Material Issued", { material: mat, recipient });
                            sendPushNotification(
                              isAmharic ? "የእቃ ወጪ ተደረገ" : "Material Issued at Site Store",
                              isAmharic ? `${mat} ለ ${recipient} በወጪ ቫውቸር ተሰጥቷል!` : `${mat} issued to ${recipient}. Bin card updated.`
                            );
                            onLogAction("Site Store Material Issue", `Issued ${mat} to ${recipient}`);
                          }}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowRightLeft size={10} />
                          <span>{isAmharic ? "ወጪ አድርግ እና ቢን ካርድ አዘምን" : "Issue Material & Update Bin Card"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Launch Full Standalone App Trigger */}
                    {onNavigateToTab && (
                      <button
                        onClick={() => {
                          onNavigateToTab("storeOwnerApp");
                          onLogAction("Launched Full Site Store App", "Navigated from Mobile Simulator to Fullscreen Site Store Owner App");
                        }}
                        className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                      >
                        <Store size={13} />
                        <span>{isAmharic ? "ወደ ሙሉ የሳይት ስቶር አቃቤ መተግበሪያ ሂድ" : "Open Full Site Store App"}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Dynamic Camera Feed Simulation */}
                {isCameraActive && (
                  <div className="absolute inset-0 bg-black z-50 flex flex-col pt-8 p-3 text-center space-y-3 rounded-[34px]">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-mono text-indigo-400">Digital Construction ERP HIGH-RES CAMERA</span>
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
                          comments: snagDescription || "Reported via Digital Construction ERP mobile app",
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
                : "Generate production-grade manifest templates to wrap Digital Construction ERP's responsive frontend into native iOS Xcode and Android Studio projects using Capacitor."}
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
