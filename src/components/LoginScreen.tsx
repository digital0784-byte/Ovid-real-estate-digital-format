import React, { useState, useEffect } from "react";
import { UserRole } from "../types";
import { 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  Lock, 
  Mail, 
  Phone, 
  User, 
  Fingerprint, 
  Scan, 
  KeyRound, 
  Info, 
  Smartphone, 
  Globe, 
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  MapPin,
  Laptop
} from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (
    role: UserRole, 
    method: string, 
    loginLog: {
      loginTime: string;
      device: string;
      ip: string;
      gps: string;
    }
  ) => void;
  isAmharic: boolean;
  onLanguageToggle: () => void;
  auditLogsCount: number;
}

export function LoginScreen({ onLoginSuccess, isAmharic, onLanguageToggle, auditLogsCount }: LoginScreenProps) {
  // Authentication Method Choice
  const [authMethod, setAuthMethod] = useState<"credentials" | "phone" | "empId" | "biometric">("credentials");
  
  // Input fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  
  // Biometric methods
  const [biometricType, setBiometricType] = useState<"fingerprint" | "face">("fingerprint");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanSuccess, setScanSuccess] = useState(false);
  
  // Selected role for simulations
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.HEAD_OFFICE);
  
  // MFA (for sensitive roles)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [simulatedMfaToken, setSimulatedMfaToken] = useState("");
  
  // Security locks
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  
  // Privacy Policy state
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Status/Error Messaging
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Countdown timer for Lockout
  useEffect(() => {
    if (isLocked && lockoutTime > 0) {
      const timer = setTimeout(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLocked, lockoutTime]);

  // Handle simulate biometric scan
  const startBiometricScan = () => {
    if (isScanning || isLocked) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanSuccess(false);
    setErrorMessage("");

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setScanSuccess(true);
          setSuccessMessage(
            biometricType === "fingerprint"
              ? (isAmharic ? "የጣት አሻራ በተሳካ ሁኔታ ተለይቷል!" : "Fingerprint successfully recognized!")
              : (isAmharic ? "የፊት ገጽታ እውቅና ማረጋገጫ ተጠናቅቋል!" : "Face recognition identity matched!")
          );
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // Helper to map Employee ID to standard roles
  const getRoleFromEmpId = (id: string): UserRole => {
    const formatted = id.toUpperCase().trim();
    if (formatted.startsWith("SA") || formatted === "SUPERADMIN" || formatted === "ADMIN") return UserRole.SUPER_ADMIN;
    if (formatted.startsWith("HO") || formatted === "YOSEPH" || formatted === "NURIYE" || formatted === "NURI") return UserRole.HEAD_OFFICE;
    if (formatted.startsWith("PM") || formatted === "DAWIT") return UserRole.PROJECT_MANAGER;
    if (formatted.startsWith("SE") || formatted === "SINTAYEHU") return UserRole.SITE_ENGINEER;
    if (formatted.startsWith("SV") || formatted === "KASSA") return UserRole.SUPERVISOR;
    if (formatted.startsWith("TK") || formatted === "ABEBE") return UserRole.TIME_KEEPER;
    if (formatted.startsWith("TL") || formatted === "YOHANNES") return UserRole.TEAM_LEADER;
    if (formatted.startsWith("GC") || formatted === "FIKRU") return UserRole.GANG_CHIEF;
    if (formatted.startsWith("SM") || formatted === "MULUGETA") return UserRole.STORE_MANAGER;
    if (formatted.startsWith("HR") || formatted === "TIGIST") return UserRole.HR_MANAGER;
    if (formatted.startsWith("FM") || formatted === "BEMENT") return UserRole.FINANCE_MANAGER;
    if (formatted.startsWith("SH") || formatted === "ALEMAYEHU") return UserRole.SECTION_HEAD;
    if (formatted.startsWith("SR") || formatted === "TADESSE") return UserRole.SURVEYOR;
    return UserRole.WORKER;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isLocked) {
      setErrorMessage(
        isAmharic
          ? `መለያዎ ታግዷል! እባክዎ ከ ${lockoutTime} ሰከንድ በኋላ ይሞክሩ።`
          : `Account locked! Please wait ${lockoutTime}s to retry.`
      );
      return;
    }

    if (!privacyAccepted) {
      setErrorMessage(
        isAmharic
          ? "እባክዎ መጀመሪያ የግል ደህንነት እና የውስጥ ደንብ መመሪያውን ይቀበሉ።"
          : "You must accept the Privacy Policy before accessing the ERP."
      );
      return;
    }

    // Validate inputs depending on authMethod
    let targetRole = selectedRole;
    let identifiedMethod = "Password Check";

    if (authMethod === "credentials") {
      if (!email || !password) {
        handleFailedAttempt(isAmharic ? "የኢሜል እና የይለፍ ቃል ያስገቡ" : "Please enter email and password");
        return;
      }
      // Simple credentials simulator
      if (password.length < 4) {
        handleFailedAttempt(isAmharic ? "የይለፍ ቃል ቢያንስ 4 ቁምፊ መሆን አለበት" : "Password must be at least 4 characters");
        return;
      }
      identifiedMethod = "Email / Password";
    } else if (authMethod === "phone") {
      if (!phoneNumber) {
        handleFailedAttempt(isAmharic ? "ስልክ ቁጥር ያስገቡ" : "Please enter phone number");
        return;
      }
      if (!isOtpSent) {
        // Send OTP Simulation
        setIsOtpSent(true);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setSimulatedMfaToken(code);
        setSuccessMessage(isAmharic ? `የኤስኤምኤስ ማረጋገጫ ኮድ ተልኳል፡ ${code}` : `OTP code sent to mobile: ${code}`);
        return;
      } else {
        if (otpCode !== simulatedMfaToken) {
          handleFailedAttempt(isAmharic ? "የተሳሳተ የኦቲፒ (OTP) ኮድ" : "Incorrect OTP verification code");
          return;
        }
        identifiedMethod = "Mobile SMS OTP";
      }
    } else if (authMethod === "empId") {
      if (!employeeId) {
        handleFailedAttempt(isAmharic ? "እባክዎ የኩባንያ መታወቂያ ያስገቡ" : "Please enter Employee ID");
        return;
      }
      targetRole = getRoleFromEmpId(employeeId);
      identifiedMethod = `Employee ID (${employeeId})`;
    } else if (authMethod === "biometric") {
      if (!scanSuccess) {
        handleFailedAttempt(isAmharic ? "እባክዎ መጀመሪያ ባዮሜትሪክ መለያ ይቃኙ" : "Please perform biometric scan first");
        return;
      }
      identifiedMethod = biometricType === "fingerprint" ? "Secure Fingerprint Scan" : "High-Res Face Recognition";
    }

    // Determine if MFA is required (Sensitive roles require MFA by policy)
    const isSensitiveRole = [UserRole.HEAD_OFFICE, UserRole.PROJECT_MANAGER, UserRole.SECTION_HEAD].includes(targetRole);
    if (isSensitiveRole && !mfaRequired) {
      setMfaRequired(true);
      const mfaToken = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedMfaToken(mfaToken);
      setSuccessMessage(
        isAmharic
          ? `የደህንነት ኤምኤፍኤ (MFA) ኮድ፡ ${mfaToken}`
          : `Sensitive role detected. Simulated Multi-Factor Authenticator code: ${mfaToken}`
      );
      return;
    }

    if (mfaRequired) {
      if (mfaCode !== simulatedMfaToken) {
        setMfaError(isAmharic ? "የተሳሳተ የደህንነት ኮድ!" : "Incorrect MFA authentication token!");
        handleFailedAttempt(isAmharic ? "የኤምኤፍኤ ማረጋገጫ አልተሳካም" : "MFA authentication failed");
        return;
      }
    }

    // Successful login details
    const simulatedLog = {
      loginTime: new Date().toISOString().replace("T", " ").slice(0, 19),
      device: navigator.userAgent.includes("Mobile") 
        ? "Mobile App client (iOS/Android ERP Core)" 
        : "Desktop Workstation (Windows 11 Enterprise / Chrome)",
      ip: `192.168.10.${Math.floor(10 + Math.random() * 200)}`,
      gps: "9.0272° N, 38.7483° E (Digital Bole Heights Site B1)"
    };

    setSuccessMessage(isAmharic ? "በተሳካ ሁኔታ ገብተዋል! በመጫን ላይ..." : "Authorized successfully! Loading ERP...");
    setTimeout(() => {
      onLoginSuccess(targetRole, identifiedMethod, simulatedLog);
    }, 800);
  };

  const handleFailedAttempt = (err: string) => {
    setErrorMessage(err);
    const nextFailed = failedAttempts + 1;
    setFailedAttempts(nextFailed);

    if (nextFailed >= 3) {
      setIsLocked(true);
      setLockoutTime(30); // 30 seconds lock out
      setErrorMessage(
        isAmharic
          ? "በተደጋጋሚ የተሳሳተ ሙከራ! መለያው ለ30 ሰከንዶች ተቆልፏል።"
          : "Too many failed attempts! Login locked for 30 seconds."
      );
    }
  };

  const handleSimulateAutoFill = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage("");
    setSuccessMessage("");
    setScanSuccess(true);
    setPrivacyAccepted(true);
    
    // Autofill matching role mock credentials
    if (role === UserRole.SUPER_ADMIN) {
      setEmail("admin@digital_construction_erprealestate.com");
      setPassword("super_admin_pass_123");
      setPhoneNumber("+251910001122");
      setEmployeeId("Digital Construction ERP-SA-ADMIN");
    } else if (role === UserRole.HEAD_OFFICE) {
      setEmail("mejennur669@gmail.com");
      setPassword("admin_pass_9981");
      setPhoneNumber("0910097862");
      setEmployeeId("Digital Construction ERP-HO-NURI");
    } else if (role === UserRole.PROJECT_MANAGER) {
      setEmail("dawit.pm@digital_construction_erprealestate.com");
      setPassword("pm_sec_7721");
      setPhoneNumber("+251922334455");
      setEmployeeId("Digital Construction ERP-PM-01");
    } else if (role === UserRole.SITE_ENGINEER) {
      setEmail("sintayehu@digital_construction_erprealestate.com");
      setPassword("se_eng_5522");
      setPhoneNumber("+251944556677");
      setEmployeeId("Digital Construction ERP-SE-01");
    } else if (role === UserRole.SUPERVISOR) {
      setEmail("kassa.sv@digital_construction_erprealestate.com");
      setPassword("sv_pass_4433");
      setPhoneNumber("+251955112233");
      setEmployeeId("Digital Construction ERP-SV-01");
    } else if (role === UserRole.TIME_KEEPER) {
      setEmail("abebe.tk@digital_construction_erprealestate.com");
      setPassword("tk_pass_5566");
      setPhoneNumber("+251966778899");
      setEmployeeId("Digital Construction ERP-TK-01");
    } else if (role === UserRole.TEAM_LEADER) {
      setEmail("yohannes.tl@digital_construction_erprealestate.com");
      setPassword("tl_pass_8899");
      setPhoneNumber("+251977112233");
      setEmployeeId("Digital Construction ERP-TL-01");
    } else if (role === UserRole.GANG_CHIEF) {
      setEmail("fikru.gc@digital_construction_erprealestate.com");
      setPassword("gc_pass_2211");
      setPhoneNumber("+251988112233");
      setEmployeeId("Digital Construction ERP-GC-01");
    } else if (role === UserRole.STORE_MANAGER) {
      setEmail("mulugeta.sm@digital_construction_erprealestate.com");
      setPassword("store_pass_99");
      setPhoneNumber("+251999112233");
      setEmployeeId("Digital Construction ERP-SM-01");
    } else if (role === UserRole.HR_MANAGER) {
      setEmail("tigist.hr@digital_construction_erprealestate.com");
      setPassword("hr_pass_7766");
      setPhoneNumber("+251911445566");
      setEmployeeId("Digital Construction ERP-HR-01");
    } else if (role === UserRole.FINANCE_MANAGER) {
      setEmail("bement.fm@digital_construction_erprealestate.com");
      setPassword("finance_pass_88");
      setPhoneNumber("+251922445566");
      setEmployeeId("Digital Construction ERP-FM-01");
    } else if (role === UserRole.SECTION_HEAD) {
      setEmail("alemayehu@digital_construction_erprealestate.com");
      setPassword("sh_sec_4411");
      setPhoneNumber("+251933445566");
      setEmployeeId("Digital Construction ERP-SH-01");
    } else if (role === UserRole.SURVEYOR) {
      setEmail("tadesse.s@digital_construction_erprealestate.com");
      setPassword("sv_pass_1100");
      setPhoneNumber("+251955667788");
      setEmployeeId("Digital Construction ERP-SR-01");
    } else {
      setEmail("bekele.w@digital_construction_erprealestate.com");
      setPassword("worker_pass");
      setPhoneNumber("+251977889900");
      setEmployeeId("ERP-W-101");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Dynamic Ambient Security Laser Grid effect in background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
      
      {/* Top Bar */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/20">
            <Shield size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-white uppercase">{isAmharic ? "ዲጂታል ኮንስትራክሽን ERP ሲስተም" : "Digital Construction ERP System"}</h1>
            <p className="text-[10px] font-mono tracking-wider text-slate-400">SMART CONSTRUCTION ERP</p>
          </div>
        </div>

        <button 
          onClick={onLanguageToggle}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer"
        >
          <Globe size={13} className="text-red-500" />
          <span>{isAmharic ? "English" : "አማርኛ"}</span>
        </button>
      </div>

      {/* Main Authentication Core */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 py-4 flex flex-col lg:flex-row items-stretch justify-center gap-8 my-auto">
        
        {/* Left Side: Simulation presets & ERP Security overview */}
        <div className="lg:w-5/12 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-red-500 mb-4">
              <Lock size={16} />
              <span className="text-xs font-black tracking-wider uppercase font-mono">
                {isAmharic ? "ደህንነቱ የተጠበቀ ግንኙነት" : "Secure Gatekeeper"}
              </span>
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
              {isAmharic 
                ? "ወደ ዲጂታል ኮንስትራክሽን ERP ሲስተም መግቢያ" 
                : "Enter Digital Construction ERP System"}
            </h2>
            
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {isAmharic 
                ? "ይህ የደህንነት በር የተፈቀደላቸው መሃንዲሶች፣ ሰርቬየሮች እና የስራ መሪዎች ብቻ የግንባታውን መረጃ እንዲመለከቱና እንዲያሻሽሉ የተዘጋጀ የባዮሜትሪክ ድጋፍ ያለው መግቢያ ነው።" 
                : "This gateway enforces biometric credential check-ins, end-to-end telemetry encryption, and strict RBAC alignment to safeguard real-time site engineering datasets."}
            </p>

            {/* Quick Presets Selector */}
            <div className="mt-6">
              <label className="block text-[10px] font-mono tracking-wider text-slate-400 uppercase mb-2 flex items-center justify-between">
                <span>{isAmharic ? "ፈጣን የሙከራ ሚና መምረጫ" : "Quick Persona Simulator"}</span>
                <span className="text-red-500 font-bold">{isAmharic ? "አውቶሞቢል" : "AUTOFILL"}</span>
              </label>

              <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {[
                  { role: UserRole.SUPER_ADMIN, label: isAmharic ? "ሱፐር አድሚን" : "Super Admin" },
                  { role: UserRole.HEAD_OFFICE, label: isAmharic ? "ዋና መስሪያ ቤት" : "Head Office" },
                  { role: UserRole.PROJECT_MANAGER, label: isAmharic ? "ፕሮጀክት ስራ አስኪያጅ" : "Project Manager" },
                  { role: UserRole.SITE_ENGINEER, label: isAmharic ? "ሳይት መሃንዲስ" : "Site Engineer" },
                  { role: UserRole.SUPERVISOR, label: isAmharic ? "ሳይት ተቆጣጣሪ" : "Supervisor" },
                  { role: UserRole.TIME_KEEPER, label: isAmharic ? "መገኘት ተቆጣጣሪ" : "Time Keeper" },
                  { role: UserRole.TEAM_LEADER, label: isAmharic ? "ቡድን መሪ" : "Team Leader" },
                  { role: UserRole.GANG_CHIEF, label: isAmharic ? "ጋንግ ቺፍ" : "Gang Chief" },
                  { role: UserRole.STORE_MANAGER, label: isAmharic ? "መጋዘን ኃላፊ" : "Store Manager" },
                  { role: UserRole.HR_MANAGER, label: isAmharic ? "የሰው ኃይል ኃላፊ" : "HR Manager" },
                  { role: UserRole.FINANCE_MANAGER, label: isAmharic ? "ፋይናንስ ኃላፊ" : "Finance Manager" },
                  { role: UserRole.WORKER, label: isAmharic ? "ሰራተኛ" : "Worker" }
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleSimulateAutoFill(item.role)}
                    className={`px-2 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] font-bold transition-all text-left truncate flex items-center space-x-1.5 cursor-pointer ${
                      selectedRole === item.role ? "border-red-500/80 bg-red-950/20 text-red-400" : "text-slate-300"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedRole === item.role ? "bg-red-500 animate-pulse" : "bg-slate-600"}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Laptop size={12} className="text-slate-400" />
              <span>AES-256 Enabled</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <MapPin size={12} className="text-red-500" />
              <span>Bole Heights Site</span>
            </span>
          </div>
        </div>

        {/* Right Side: The Interactive Login Form Card */}
        <div className="lg:w-7/12 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 flex flex-col justify-between relative">
          
          {isLocked && (
            <div className="absolute inset-0 bg-slate-950/95 rounded-2xl z-20 flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle size={48} className="text-red-500 animate-bounce mb-3" />
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                {isAmharic ? "የደህንነት እገዳ ተጥሏል!" : "SECURITY INTRUSION PREVENTED"}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-2">
                {isAmharic 
                  ? "ተደጋጋሚ የተሳሳቱ ሙከራዎች ስለተመዘገቡ ይህ አይፒ አድራሻ ለጊዜው ታግዷል። እባክዎ ጊዜው እስኪያበቃ ድረስ ይጠብቁ።" 
                  : "Multiple failed authentication requests detected. Automatic brute-force protection has locked this client workstation."}
              </p>
              <div className="mt-6 flex items-center space-x-3 bg-red-950/30 border border-red-900/50 px-4 py-2 rounded-lg">
                <Clock size={16} className="text-red-400 animate-spin" />
                <span className="text-sm font-mono text-red-300 font-bold">
                  {isAmharic ? `የመጠባበቂያ ሰዓት፡ ${lockoutTime} ሰከንድ` : `Remaining lockout: ${lockoutTime} seconds`}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Header tab navigation for Auth Method */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/60">
              {[
                { id: "credentials", icon: Mail, label: isAmharic ? "ፓስዎርድ" : "Password" },
                { id: "phone", icon: Phone, label: isAmharic ? "ኤስኤምኤስ" : "SMS" },
                { id: "empId", icon: User, label: isAmharic ? "መታወቂያ" : "Emp ID" },
                { id: "biometric", icon: Fingerprint, label: isAmharic ? "ባዮሜትሪክ" : "Biometrics" },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAuthMethod(m.id as any);
                      setErrorMessage("");
                      setSuccessMessage("");
                      setIsOtpSent(false);
                      setMfaRequired(false);
                    }}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                      authMethod === m.id ? "bg-red-600 text-white shadow-lg shadow-red-600/10" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ERROR / SUCCESS FEEDBACKS */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 flex items-start space-x-2 text-xs text-red-300">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-start space-x-2 text-xs text-emerald-300">
                <CheckCircle size={15} className="mt-0.5 shrink-0 animate-pulse" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* RENDER DYNAMIC FORM FIELDS */}
            {!mfaRequired ? (
              <div className="space-y-3">
                {authMethod === "credentials" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                        {isAmharic ? "ድርጅታዊ ኢሜል አድራሻ" : "Corporate Email Address"}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. yoseph@digital_construction_erprealestate.com"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                        {isAmharic ? "ይለፍ ቃል" : "Secure Password"}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </>
                )}

                {authMethod === "phone" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                        {isAmharic ? "የሞባይል ስልክ ቁጥር" : "Registered Mobile Number"}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. +251 911 223 344"
                          disabled={isOtpSent}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {isOtpSent && (
                      <div className="animate-fade-in">
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold flex items-center justify-between">
                          <span>{isAmharic ? "የማረጋገጫ ኮድ (OTP)" : "Enter SMS Verification Code"}</span>
                          <button 
                            type="button" 
                            onClick={() => setIsOtpSent(false)} 
                            className="text-red-500 hover:underline hover:text-red-400 text-[10px] font-bold"
                          >
                            {isAmharic ? "ስልክ ቁጥር ቀይር" : "Change Mobile"}
                          </button>
                        </label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-2.5 text-slate-500" size={16} />
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="6-digit code"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 tracking-[0.5em] font-black text-center transition-all font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {authMethod === "empId" && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                      {isAmharic ? "የኩባንያ መታወቂያ / ሰራተኛ መለያ ቁጥር" : "Company Employee Identity ID"}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="e.g. Digital Construction ERP-PM-01, Digital Construction ERP-HO-01"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono uppercase"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {isAmharic ? "ምሳሌ፦ PM-01 ለስራ አስኪያጅ፣ HO-01 ለዋና መ/ቤት" : "Note: ID prefix maps to custom authorizations automatically."}
                    </p>
                  </div>
                )}

                {authMethod === "biometric" && (
                  <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="flex justify-center space-x-2 mb-2">
                      <button
                        type="button"
                        onClick={() => { setBiometricType("fingerprint"); setScanSuccess(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          biometricType === "fingerprint" ? "bg-slate-800 text-red-400 border border-red-500/30" : "text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        {isAmharic ? "የጣት አሻራ" : "Fingerprint"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBiometricType("face"); setScanSuccess(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          biometricType === "face" ? "bg-slate-800 text-red-400 border border-red-500/30" : "text-slate-400 hover:bg-slate-900"
                        }`}
                      >
                        {isAmharic ? "የፊት መለያ" : "Face ID"}
                      </button>
                    </div>

                    <div className="flex flex-col items-center justify-center py-4 relative">
                      {biometricType === "fingerprint" ? (
                        <button
                          type="button"
                          onClick={startBiometricScan}
                          disabled={isScanning}
                          className={`w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all relative cursor-pointer ${
                            scanSuccess 
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-400" 
                              : isScanning 
                                ? "bg-slate-900 border-red-500 text-red-500 animate-pulse" 
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <Fingerprint size={32} />
                          {isScanning && (
                            <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startBiometricScan}
                          disabled={isScanning}
                          className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 transition-all relative overflow-hidden cursor-pointer ${
                            scanSuccess 
                              ? "bg-emerald-950/40 border-emerald-500 text-emerald-400" 
                              : isScanning 
                                ? "bg-slate-900 border-red-500 text-red-500" 
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          <Scan size={36} className={isScanning ? "animate-pulse text-red-500" : ""} />
                          {isScanning && (
                            <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 shadow-md shadow-red-500/80 animate-bounce" />
                          )}
                        </button>
                      )}

                      {isScanning && (
                        <div className="mt-4 w-40 bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-800">
                          <div className="bg-red-500 h-full transition-all duration-150" style={{ width: `${scanProgress}%` }} />
                        </div>
                      )}

                      <span className="text-[10px] font-mono text-slate-500 mt-2 block">
                        {isScanning 
                          ? (isAmharic ? `በመቃኘት ላይ... ${scanProgress}%` : `Scanning Secure Elements... ${scanProgress}%`) 
                          : scanSuccess 
                            ? (isAmharic ? "ተቀባይነት አግኝቷል" : "SecID Match Verified (100% Hash)") 
                            : (isAmharic ? "ለመቃኘት ምልክቱን ይጫኑ" : "Click to emulate hardware scan")}
                      </span>
                    </div>

                    <div className="text-left bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
                      <Info size={13} className="text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {isAmharic 
                          ? "ባዮሜትሪክ መረጃ በሳይት መመዝገቢያ ሃርድዌር የተመዘገበውን ይለፍ-ቃል ሃሽ ብቻ ያነጻጽራል። ጥሬ ምስል በደመና ላይ አይቀመጥም።" 
                          : "Biometrics uses encrypted trust modules which cross-reference secure mathematical vectors without storing raw facial or ridge templates."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // MFA VERIFICATION VIEW (Triggered for Head Office, Proj Manager, Section Head)
              <div className="space-y-4 bg-slate-950 border border-red-950/80 p-4 rounded-xl animate-fade-in">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center mx-auto mb-2 text-red-400">
                    <KeyRound size={20} className="animate-spin" />
                  </div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest">
                    {isAmharic ? "ሁለተኛ ደረጃ ማረጋገጫ (MFA)" : "Multi-Factor Authentication"}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isAmharic 
                      ? "ለስሜታዊ ሚናዎች ከፍተኛ ጥበቃን ለማረጋገጥ የማረጋገጫ ኮድ ያስገቡ" 
                      : "Strict HO security protocol requires secondary verification code to open administrative database privileges."}
                  </p>
                </div>

                {mfaError && (
                  <p className="text-xs text-red-400 text-center font-bold bg-red-950/20 py-1.5 rounded border border-red-900/30">
                    {mfaError}
                  </p>
                )}

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 text-center uppercase font-bold">
                    {isAmharic ? "የ 6-አሃዝ ማረጋገጫ ኮድ" : "6-Digit Security Token"}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => { setMfaCode(e.target.value); setMfaError(""); }}
                    placeholder="0 0 0 0 0 0"
                    className="w-full py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 tracking-[0.7em] font-black text-center transition-all font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaRequired(false);
                      setMfaCode("");
                      setMfaError("");
                    }}
                    className="flex-1 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold uppercase transition-all cursor-pointer"
                  >
                    {isAmharic ? "ተመለስ" : "Back"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Regenerate MFA
                      const nextCode = Math.floor(100000 + Math.random() * 900000).toString();
                      setSimulatedMfaToken(nextCode);
                      setSuccessMessage(isAmharic ? `አዲስ ማረጋገጫ ኮድ ተልኳል፡ ${nextCode}` : `New MFA token synchronized: ${nextCode}`);
                    }}
                    className="flex-1 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold uppercase transition-all text-red-400 cursor-pointer"
                  >
                    {isAmharic ? "ኮድ መልሰህ ላክ" : "Regenerate Token"}
                  </button>
                </div>
              </div>
            )}

            {/* PRIVACY POLICY COMPLIANCE */}
            <div className="pt-2">
              <label className="flex items-start space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-1 accent-red-600 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 leading-normal group-hover:text-slate-300 transition-colors">
                  {isAmharic ? "የዲጂታል ኮንስትራክሽን ERP ሲስተም" : "I accept the Digital Construction ERP System "}{" "}
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(true)}
                    className="text-red-500 hover:underline font-bold"
                  >
                    {isAmharic ? "የግል ደህንነት፣ ምስጢራዊነት እና የግል መረጃ አጠቃቀም ፖሊሲን" : "Privacy Policy & GDPR Compliance Term"}
                  </button>{" "}
                  {isAmharic ? "በሙሉ ተስማምቻለሁ።" : "before first use."}
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLocked}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Shield size={14} />
              <span>
                {mfaRequired 
                  ? (isAmharic ? "ማረጋገጫ አረጋግጥ እና ክፈት" : "Verify Token & Authorize") 
                  : authMethod === "phone" && !isOtpSent 
                    ? (isAmharic ? "የማረጋገጫ ኤስኤምኤስ ላክ" : "Send SMS Authentication OTP") 
                    : (isAmharic ? "ግባና ERP ጫን" : "Unlock & Access Command ERP")}
              </span>
            </button>
          </form>

          {/* Secure lock info */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <Lock size={10} className="text-red-500" />
              <span>TLS 1.3 | SHA-256</span>
            </span>
            <span>
              {failedAttempts > 0 && `${failedAttempts}/3 ${isAmharic ? "የተሳሳቱ ሙከራዎች" : "Failed attempts"}`}
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER & TRUST INDICATION */}
      <div className="relative z-10 text-center py-6 border-t border-slate-900 text-slate-500 text-[11px] font-mono space-y-1">
        <p>© {new Date().getFullYear()} Digital Construction ERP System Engineering Division. All rights reserved.</p>
        <p className="text-slate-400 font-bold">
          {isAmharic 
            ? "የአድሚን መተግበሪያ በአልሚው፡ ኑሪዬ አህመድ አደም የተገነባ" 
            : "Admin App developed by: Nuriye Ahmed Adem"} 
          {" "}| {isAmharic ? "ስልክ:" : "Phone:"} 0910097862/0920843843
        </p>
        <p className="text-[10px] text-slate-600">
          Authorized ERP Terminal ID: Digital Construction ERP-ET-ADB-B1 | Registered Audit Logs Count: {auditLogsCount} | mejennur669@gmail.com
        </p>
      </div>

      {/* PRIVACY POLICY BOTTOM DRAWER / MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 flex flex-col justify-between max-h-[85vh] animate-fade-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2 text-red-500">
                <ShieldCheck size={18} />
                <h3 className="font-black uppercase text-xs tracking-wider text-white">
                  {isAmharic ? "ዲጂታል ኮንስትራክሽን ERP ሲስተም የግላዊነት ፖሊሲ" : "Digital Construction ERP System Privacy & Compliance Policy"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto pr-2 text-xs text-slate-300 space-y-3 font-sans leading-relaxed">
              <p className="font-bold text-white border-b border-slate-800 pb-1">1. {isAmharic ? "የመረጃ አሰባሰብ እና አጠቃቀም ምድብ" : "Information Category & Collection Principles"}</p>
              <p>
                {isAmharic 
                  ? "ይህ የዲጂታል ኮንስትራክሽን ERP ስማርት ግንባታ መቆጣጠሪያ ሶፍትዌር የግንባታውን ደህንነት እና የሰው ኃይል ትክክለኛነት ለማረጋገጥ የሚከተሉትን መረጃዎች ይሰበስባል፦ የጣት አሻራ ሃሽ ኮዶች፣ የፊት ገጽታ ምስል ማመሳሰያ ሃሽ፣ የስራ መገኛ GPS ቦታ (በሳይት ውስጥ ሲሆኑ ብቻ)፣ እና የመገኘት ዝርዝሮችን።" 
                  : "Digital Construction ERP Smart Construction ERP records structural survey inputs, supervisor photo uploads, CAD interactions, and employee biometric hash data to generate accurate timesheets, prevent construction drift, and automate payroll checks."}
              </p>
              <p>
                {isAmharic 
                  ? "ጥሬ ባዮሜትሪክ ምስሎች በየትኛውም የደመና አገልጋይ ላይ አይቀመጡም፤ ይልቁንም በሃርድዌሩ ላይ ወደ ደህንነቱ የተጠበቀ የቁጥር አልጎሪዝም ተቀይረው ብቻ ለመታወቂያ ማረጋገጫነት ይውላሉ።" 
                  : "We adhere strictly to biometric security guidelines: raw fingerprint ridges and facial geometries are immediately processed on the local terminal's hardware and converted to mathematical cryptographic vectors. No raw biometric templates are synchronized to cloud buckets."}
              </p>

              <p className="font-bold text-white border-b border-slate-800 pb-1">2. {isAmharic ? "የመረጃ ተደራሽነት ደረጃዎች" : "Role-Based Data Access (RBAC)"}</p>
              <p>
                {isAmharic 
                  ? "የተሰበሰቡት መረጃዎች በስራ መደብዎ መሰረት በጥብቅ የተከፋፈሉ ናቸው። ለምሳሌ የደመወዝ መረጃ በዋና መስሪያ ቤት እና በፋይናንስ አስተዳዳሪዎች ብቻ የሚታይ ሲሆን የሰርቬይ መረጃ በሰርቬየር እና በሳይት መሃንዲሶች ብቻ ይፈቀዳል።" 
                  : "Access is controlled strictly by role permissions. Head Office maintains full global oversight; Section Heads and PMs view assigned project elements; and Site Engineers access design compliance interfaces. Unauthorized cross-role database queries are restricted at the API level."}
              </p>

              <p className="font-bold text-white border-b border-slate-800 pb-1">3. {isAmharic ? "የመረጃ ማከማቻ እና ደህንነት መቆጣጠሪያ" : "Data Retention & Encryption Standards"}</p>
              <p>
                {isAmharic 
                  ? "ሁሉም የኮሙኒኬሽን መረጃዎች በ HTTPS/TLS የተመሰጠሩ ሲሆኑ የኦዲት መዝገቦች ለሰባት (7) ዓመታት ያህል ተከማችተው ይቀመጣሉ።" 
                  : "All cloud operations use SSL/TLS encryption in transit and AES-256 for at-rest storage. Activity logs, timesheets, and CAD draw modifications are preserved in a secure archive for a period of seven (7) years to satisfy regulatory audits."}
              </p>

              <p className="font-bold text-white border-b border-slate-800 pb-1">4. {isAmharic ? "የተጠቃሚ መብቶች እና የእውቂያ አድራሻ" : "Employee Rights & Compliance Contacts"}</p>
              <p>
                {isAmharic 
                  ? "የዲጂታል ኮንስትራክሽን ERP ሰራተኞች በማንኛውም ጊዜ በመቆጣጠሪያው ላይ የተመዘገበውን የራሳቸውን መገለጫ መረጃ የመመልከት፣ የማረም፣ ወይም ባዮሜትሪክ መረጃ መልሶ የመመዝገብ መብት አላቸው። ጥያቄዎች ካሉዎት በ email: privacy@digital_construction_erprealestate.com ማነጋገር ይችላሉ።" 
                  : "All site workers and management team members hold the right to inspect their personal metadata profile, request biometric re-enrollment, and verify work history logs. For questions regarding GDPR compliance or data handling, write to compliance@digital_construction_erprealestate.com."}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-3 mt-4 flex justify-between items-center">
              <span className="text-[9px] font-mono text-slate-500">
                Digital Construction ERP ERP Policy v4.2.1-SEC
              </span>
              <button
                type="button"
                onClick={() => {
                  setPrivacyAccepted(true);
                  setShowPrivacyModal(false);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase rounded-lg transition-all cursor-pointer"
              >
                {isAmharic ? "አንብቤያለሁ፣ እስማማለሁ" : "I Accept Policy"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
