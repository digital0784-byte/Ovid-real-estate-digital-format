import React, { useState, useEffect } from "react";
import { UserRole, Worker, SystemNotification, AuditLog, WORK_SECTORS_CATALOG, DEPARTMENTS_CATALOG } from "../types";
import { DbService } from "../services/db";
import { NotificationService } from "../services/notificationService";
import { auth, isFirebaseReady } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from "firebase/auth";
import { FirebaseConfigModal } from "./FirebaseConfigModal";
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
  Laptop,
  UserPlus,
  UserCheck,
  Briefcase,
  Key
} from "lucide-react";

const formatToE164 = (phone: string): string => {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    return "+251" + cleaned.slice(1);
  }
  if (cleaned.startsWith("251")) {
    return "+" + cleaned;
  }
  return "+251" + cleaned;
};

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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  
  // Security locks
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  
  // Privacy Policy & Firebase Config Modal states
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  // Status/Error Messaging
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [resetErrorMessage, setResetErrorMessage] = useState("");

  // Registration States (Default to login form so user enters directly)
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>(UserRole.WORKER);
  const [regTrade, setRegTrade] = useState(WORK_SECTORS_CATALOG[0].nameAm);
  const [regDept, setRegDept] = useState(DEPARTMENTS_CATALOG[0].nameAm);

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
    let formatted = id.toUpperCase().trim();
    if (formatted.startsWith("DIGITAL CONSTRUCTION ERP-")) {
      formatted = formatted.replace("DIGITAL CONSTRUCTION ERP-", "");
    }
    if (formatted.startsWith("SA") || formatted === "SUPERADMIN" || formatted === "ADMIN") return UserRole.SUPER_ADMIN;
    if (formatted.startsWith("HO") || formatted === "YOSEPH" || formatted === "NURIYE" || formatted === "NURI") return UserRole.HEAD_OFFICE;
    if (formatted.startsWith("PM") || formatted === "DAWIT") return UserRole.PROJECT_MANAGER;
    if (formatted.startsWith("SE") || formatted === "SINTAYEHU") return UserRole.SITE_ENGINEER;
    if (formatted.startsWith("SV") || formatted === "KASSA") return UserRole.SUPERVISOR;
    if (formatted.startsWith("TK") || formatted === "ABEBE") return UserRole.TIME_KEEPER;
    if (formatted.startsWith("TL") || formatted === "YOHANNES") return UserRole.TEAM_LEADER;
    if (formatted.startsWith("GC") || formatted === "FIKRU") return UserRole.GANG_CHIEF;
    if (formatted.startsWith("WM") || formatted === "WAREHOUSE" || formatted === "MULUGETA") return UserRole.WAREHOUSE_MANAGER;
    if (formatted.startsWith("SM") || formatted === "STORE") return UserRole.STORE_MANAGER;
    if (formatted.startsWith("HR") || formatted === "TIGIST") return UserRole.HR_MANAGER;
    if (formatted.startsWith("FM") || formatted === "BEMENT") return UserRole.FINANCE_MANAGER;
    if (formatted.startsWith("SH") || formatted === "ALEMAYEHU") return UserRole.SECTION_HEAD;
    if (formatted.startsWith("SR") || formatted === "TADESSE") return UserRole.SURVEYOR;
    return UserRole.WORKER;
  };

  const getPrefixFromRole = (role: UserRole): string => {
    switch (role) {
      case UserRole.SUPER_ADMIN: return "SA";
      case UserRole.HEAD_OFFICE: return "HO";
      case UserRole.PROJECT_MANAGER: return "PM";
      case UserRole.SITE_ENGINEER: return "SE";
      case UserRole.SUPERVISOR: return "SV";
      case UserRole.TIME_KEEPER: return "TK";
      case UserRole.TEAM_LEADER: return "TL";
      case UserRole.GANG_CHIEF: return "GC";
      case UserRole.WAREHOUSE_MANAGER: return "WM";
      case UserRole.STORE_MANAGER: return "SM";
      case UserRole.HR_MANAGER: return "HR";
      case UserRole.FINANCE_MANAGER: return "FM";
      case UserRole.SECTION_HEAD: return "SH";
      case UserRole.SURVEYOR: return "SR";
      default: return "W";
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!privacyAccepted) {
      setErrorMessage(
        isAmharic
          ? "እባክዎ መጀመሪያ የግል ደህንነት እና የውስጥ ደንብ መመሪያውን ይቀበሉ።"
          : "You must accept the Privacy Policy before accessing the ERP."
      );
      return;
    }

    if (!regName.trim()) {
      setErrorMessage(isAmharic ? "እባክዎ ሙሉ ስም ያስገቡ" : "Please enter your full name");
      return;
    }
    if (!regPhone.trim()) {
      setErrorMessage(isAmharic ? "እባክዎ ስልክ ቁጥር ያስገቡ" : "Please enter your phone number");
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage(isAmharic ? "እባክዎ የኢሜል አድራሻ ያስገቡ" : "Please enter your email address");
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 6) {
      setErrorMessage(isAmharic ? "እባክዎ ቢያንስ 6 አሃዝ ያለው የይለፍ ቃል ያስገቡ" : "Please enter a password with at least 6 characters.");
      return;
    }

    try {
      if (isFirebaseReady && auth) {
        try {
          await createUserWithEmailAndPassword(auth, regEmail.trim().toLowerCase(), regPassword.trim());
        } catch (fbErr: any) {
          if (fbErr.code === "auth/email-already-in-use") {
            setErrorMessage(isAmharic ? "ይህ ኢሜል አስቀድሞ ተመዝግቧል። እባክዎ በመግቢያ ገጽ ይግቡ።" : "This email address is already registered. Please login.");
            return;
          } else {
            console.warn("Firebase registration notice:", fbErr?.message);
          }
        }
      }

      const prefix = getPrefixFromRole(regRole);
      const randNum = Math.floor(100 + Math.random() * 900);
      const generatedId = `${prefix}-${randNum}`;
      const fullEmpId = `Digital Construction ERP-${generatedId}`;

      const newWorker: Worker = {
        id: fullEmpId,
        name: regName.trim(),
        phoneNumber: regPhone.trim(),
        nationalId: `NID-${Math.floor(100000 + Math.random() * 900000)}`,
        company: "Digital Construction ERP",
        department: regDept || regRole,
        trade: regTrade || regRole,
        position: regRole,
        joinedDate: new Date().toISOString().split("T")[0],
        status: "Active",
        teamId: "team-1"
      };

      await DbService.addWorker(newWorker);

      // Create a system notification so Admin and Head Office can see the new registrant
      const newNotif: SystemNotification = {
        id: `NOTIF-REG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        type: "New Registrant",
        title: isAmharic ? `አዲስ ተመዝጋቢ: ${regName.trim()}` : `New Registrant: ${regName.trim()}`,
        message: isAmharic 
          ? `አዲስ ሰራተኛ ${regName.trim()} (${regRole}) በሲስተሙ ላይ ተመዝግቧል። መለያ ቁጥር: ${fullEmpId}`
          : `New staff member ${regName.trim()} (${regRole}) has registered on the system. ID: ${fullEmpId}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      await DbService.addNotification(newNotif).catch(e => console.error("Error writing system notification for registrant:", e));

      // Trigger Enterprise Notification for Admin, Head Office, and HR Manager
      NotificationService.createNotification({
        title: `New Registrant: ${regName.trim()}`,
        titleAm: `አዲስ ተመዝጋቢ: ${regName.trim()}`,
        description: `New staff member ${regName.trim()} (${regRole}) has registered on the ERP system. Assigned ID: ${fullEmpId}`,
        descriptionAm: `አዲስ ሰራተኛ/ተመዝጋቢ ${regName.trim()} (${regRole}) በሲስተሙ ላይ ተመዝግቧል። መለያ ቁጥር: ${fullEmpId}`,
        category: "User Approval Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Global System",
        siteName: "Registration Portal",
        sender: regName.trim(),
        senderRole: regRole || "Self-Registered User",
        receiver: "Admin, Head Office & HR",
        targetRoles: [
          UserRole.SUPER_ADMIN,
          UserRole.HEAD_OFFICE,
          UserRole.HR_MANAGER,
          "Super Admin",
          "Head Office",
          "HR Manager",
          "HR"
        ],
        deliveryChannels: { inApp: true, push: true, email: true, sms: false },
        actionTab: "admin"
      });

      // Also generate an audit log record for self-registration
      const newAuditLog: AuditLog = {
        id: `AUD-REG-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        userId: fullEmpId,
        userName: regName.trim(),
        role: regRole,
        action: "User Self-Registration",
        details: `Successfully registered profile as role: ${regRole}. Assigned ID: ${fullEmpId}. GPS: 9.0272° N, 38.7483° E (Bole Heights Site)`
      };
      await DbService.addAuditLog(newAuditLog).catch(e => console.error("Error creating registration audit log:", e));

      setSuccessMessage(
        isAmharic
          ? `ምዝገባው በተሳካ ሁኔታ ተጠናቋል! መለያ ቁጥርዎ፡ ${fullEmpId} ነው። በመግባት ላይ...`
          : `Registration completed successfully! Your ID is: ${fullEmpId}. Logging in...`
      );

      const simulatedLog = {
        loginTime: new Date().toISOString().replace("T", " ").slice(0, 19),
        device: navigator.userAgent.includes("Mobile") 
          ? "Mobile App client (iOS/Android ERP Core)" 
          : "Desktop Workstation (Windows 11 Enterprise / Chrome)",
        ip: `192.168.10.${Math.floor(10 + Math.random() * 200)}`,
        gps: "9.0272° N, 38.7483° E (Digital Bole Heights Site B1)"
      };

      setTimeout(() => {
        onLoginSuccess(regRole, `Registered User ID (${fullEmpId})`, simulatedLog);
      }, 1500);

    } catch (error) {
      console.error("Registration error:", error);
      setErrorMessage(
        isAmharic
          ? "ምዝገባው አልተሳካም። እባክዎ እንደገና ይሞክሩ።"
          : "Registration failed. Please try again."
      );
    }
  };

  const handleSendPasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetErrorMessage("");
    setResetSuccessMessage("");

    const targetEmail = (resetEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      setResetErrorMessage(
        isAmharic 
          ? "እባክዎ የኢሜል አድራሻ ያስገቡ" 
          : "Please enter your email address."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setResetErrorMessage(
        isAmharic 
          ? "እባክዎ ትክክለኛ የኢሜል አድራሻ ያስገቡ" 
          : "Please enter a valid email address."
      );
      return;
    }

    setResetLoading(true);
    try {
      if (isFirebaseReady && auth) {
        await sendPasswordResetEmail(auth, targetEmail);
      }
      setResetSuccessMessage(
        isAmharic
          ? "ይህ ኢሜል በሲስተሙ ውስጥ ካለ የይለፍ ቃል መቀየሪያ ሊንክ ተላኳል።"
          : "If an account exists for this email, a reset link has been sent."
      );
    } catch (err: any) {
      console.warn("Password reset request error:", err?.code || err?.message);
      const errorCode = err?.code || "";
      if (errorCode === "auth/invalid-email") {
        setResetErrorMessage(
          isAmharic 
            ? "የተሳሳተ የኢሜል ቅርፅ። እባክዎ ትክክለኛ ኢሜል ያስገቡ።" 
            : "Invalid email format. Please check the email address."
        );
      } else if (errorCode === "auth/too-many-requests") {
        setResetErrorMessage(
          isAmharic 
            ? "ብዙ ሙከራ ተደርጓል። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።" 
            : "Too many requests. Please try again later."
        );
      } else {
        setResetSuccessMessage(
          isAmharic
            ? "ይህ ኢሜል በሲስተሙ ውስጥ ካለ የይለፍ ቃል መቀየሪያ ሊንክ ተላኳል።"
            : "If an account exists for this email, a reset link has been sent."
        );
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

      if (password.length < 6) {
        handleFailedAttempt(isAmharic ? "የይለፍ ቃል ቢያንስ 6 ቁምፊ መሆን አለበት" : "Password must be at least 6 characters");
        return;
      }

      const lowerEmail = email.toLowerCase().trim();

      // Real Firebase Authentication verification with fallback
      if (isFirebaseReady && auth) {
        try {
          await signInWithEmailAndPassword(auth, lowerEmail, password);
        } catch (fbErr: any) {
          if (fbErr.code === "auth/user-not-found") {
            try {
              await createUserWithEmailAndPassword(auth, lowerEmail, password);
            } catch (createErr: any) {
              handleFailedAttempt(isAmharic ? "ኢሜል ወይም የይለፍ ቃል አልተገኘም" : "User not found or creation failed");
              return;
            }
          } else {
            handleFailedAttempt(
              isAmharic 
                ? "የተሳሳተ የይለፍ ቃል ወይም የተቀየረ መለያ" 
                : fbErr?.message || "Incorrect password or authentication failed"
            );
            return;
          }
        }
      }
      
      // Smart Auto-detection of roles based on email
      if (lowerEmail === "mejennur669@gmail.com" || lowerEmail.includes("nuriye") || lowerEmail.includes("nuri")) {
        targetRole = UserRole.HEAD_OFFICE;
      } else if (lowerEmail.includes("admin")) {
        targetRole = UserRole.SUPER_ADMIN;
      } else if (lowerEmail.includes("pm") || lowerEmail.includes("manager")) {
        targetRole = UserRole.PROJECT_MANAGER;
      } else if (lowerEmail.includes("engineer")) {
        targetRole = UserRole.SITE_ENGINEER;
      } else if (lowerEmail.includes("surveyor")) {
        targetRole = UserRole.SURVEYOR;
      } else if (lowerEmail.includes("finance")) {
        targetRole = UserRole.FINANCE_MANAGER;
      } else if (lowerEmail.includes("hr")) {
        targetRole = UserRole.HR_MANAGER;
      }
      
      identifiedMethod = "Email/Password Authentication";
    } else if (authMethod === "phone") {
      if (!phoneNumber.trim()) {
        handleFailedAttempt(isAmharic ? "ስልክ ቁጥር ያስገቡ" : "Please enter phone number");
        return;
      }

      const formattedPhone = formatToE164(phoneNumber);
      const e164Regex = /^\+[1-9]\d{7,14}$/;
      if (!formattedPhone || !e164Regex.test(formattedPhone)) {
        handleFailedAttempt(
          isAmharic
            ? "እባክዎ ትክክለኛ የሞባይል ስልክ ቁጥር ያስገቡ (ምሳሌ +251 911 223 344 ወይም 0911223344)"
            : "Please enter a valid mobile phone number in E.164 format (e.g. +251 911 223 344 or 0911223344)"
        );
        return;
      }

      if (!isOtpSent) {
        if (!isFirebaseReady || !auth) {
          handleFailedAttempt(
            isAmharic
              ? "የፋየርቤዝ አገልግሎት አልተዘጋጀም:: እባክዎ የፋየርቤዝ ቅንብሮችን ያረጋግጡ::"
              : "Firebase authentication is not configured."
          );
          return;
        }

        setPhoneLoading(true);
        try {
          let appVerifier = (window as any).recaptchaVerifier;
          if (!appVerifier) {
            appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
              size: "invisible"
            });
            (window as any).recaptchaVerifier = appVerifier;
          }

          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
          setConfirmationResult(confirmation);
          setIsOtpSent(true);
          setOtpCode("");
          setSuccessMessage(
            isAmharic
              ? `የኤስኤምኤስ ማረጋገጫ ኮድ ወደ ${formattedPhone} ተልኳል`
              : `SMS verification code sent to ${formattedPhone}`
          );
        } catch (phoneErr: any) {
          console.error("Firebase Phone Auth error:", phoneErr);
          if ((window as any).recaptchaVerifier) {
            try {
              (window as any).recaptchaVerifier.clear();
              (window as any).recaptchaVerifier = null;
            } catch (e) {}
          }
          const code = phoneErr?.code || "";
          const msg = phoneErr?.message || "";
          if (code === "auth/api-key-not-valid" || msg.includes("api-key-not-valid")) {
            handleFailedAttempt(
              isAmharic
                ? "የፋየርቤዝ ኤፒአይ ቁልፍ (API Key) ትክክለኛ አይደለም:: እባክዎ በፕሮጀክት ቅንብሮች ውስጥ ትክክለኛ VITE_FIREBASE_API_KEY ያስገቡ::"
                : "Invalid Firebase API Key. Please provide a valid VITE_FIREBASE_API_KEY in environment settings."
            );
          } else if (code === "auth/operation-not-allowed") {
            handleFailedAttempt(
              isAmharic
                ? "በፋየርቤዝ ውስጥ የስልክ ማረጋገጫ (Phone Auth) አልተከፈተም:: እባክዎ በFirebase Console -> Authentication -> Sign-in method ውስጥ 'Phone' ን ያንቁ::"
                : "Phone authentication is disabled in your Firebase project. Please enable 'Phone' in Firebase Console > Authentication > Sign-in method."
            );
          } else if (code === "auth/invalid-app-credential") {
            handleFailedAttempt(
              isAmharic
                ? "የመተግበሪያው ጎራ በFirebase Console ውስጥ አልተፈቀደም:: እባክዎ በAuthorized Domains ውስጥ ጎራዎን ያክሉ::"
                : "Domain not authorized in Firebase Console. Please add your domain under Firebase Console > Authentication > Settings > Authorized domains."
            );
          } else if (code === "auth/invalid-phone-number") {
            handleFailedAttempt(
              isAmharic
                ? "ትክክለኛ ያልሆነ የስልክ ቁጥር ቅርፅ። እባክዎ በ+251 የሀገር ኮድ ያረጋግጡ።"
                : "Invalid phone number format. Please ensure correct country code (+251)."
            );
          } else if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") {
            handleFailedAttempt(
              isAmharic
                ? "የኤስኤምኤስ መላክ ገደብ አልፏል ወይም ብዙ ሙከራ ተደርጓል። እባክዎ ቆይተው ይሞክሩ።"
                : "SMS quota exceeded or too many attempts. Please try again later."
            );
          } else if (code === "auth/captcha-check-failed") {
            handleFailedAttempt(
              isAmharic ? "reCAPTCHA ማረጋገጫ አልተሳካም።" : "reCAPTCHA verification failed."
            );
          } else {
            handleFailedAttempt(
              isAmharic
                ? "የኤስኤምኤስ ኮድ መላክ አልተሳካም። እባክዎ ስልክ ቁጥሩን ያረጋግጡ።"
                : phoneErr?.message || "Failed to send SMS code. Please verify phone number."
            );
          }
          return;
        } finally {
          setPhoneLoading(false);
        }
        return;
      } else {
        if (!otpCode.trim()) {
          handleFailedAttempt(isAmharic ? "እባክዎ ባለ 6-አሃዝ ማረጋገጫ ኮድ ያስገቡ" : "Please enter the 6-digit verification code");
          return;
        }

        if (!confirmationResult) {
          handleFailedAttempt(isAmharic ? "የማረጋገጫ ሂደት አልተገኘም። እባክዎ እንደገና ይሞክሩ" : "Verification session expired. Please resend SMS.");
          setIsOtpSent(false);
          return;
        }

        setPhoneLoading(true);
        try {
          await confirmationResult.confirm(otpCode.trim());
        } catch (confirmErr: any) {
          console.error("OTP Confirmation error:", confirmErr);
          const code = confirmErr?.code || "";
          if (code === "auth/invalid-verification-code") {
            handleFailedAttempt(isAmharic ? "የተሳሳተ የኦቲፒ (OTP) ኮድ" : "Incorrect OTP verification code");
          } else if (code === "auth/code-expired") {
            handleFailedAttempt(isAmharic ? "የማረጋገጫ ኮዱ ጊዜው አልፏል። እባክዎ እንደገና ይላኩ" : "Verification code expired. Please request a new code.");
          } else {
            handleFailedAttempt(
              isAmharic
                ? "የኦቲፒ ማረጋገጫ አልተሳካም"
                : confirmErr?.message || "Failed to verify OTP code"
            );
          }
          return;
        } finally {
          setPhoneLoading(false);
        }

        // Smart Auto-detection of roles based on phone
        const cleanPhone = formattedPhone;
        if (cleanPhone.includes("0910097862") || cleanPhone.includes("0920843843") || cleanPhone.includes("0911223344") || cleanPhone.includes("911223344")) {
          targetRole = UserRole.HEAD_OFFICE;
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

    // Determine if TOTP MFA is required (Sensitive roles require MFA by policy)
    const isSensitiveRole = [UserRole.HEAD_OFFICE, UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.SECTION_HEAD, UserRole.FINANCE_MANAGER].includes(targetRole);

    if (isSensitiveRole && !mfaRequired) {
      setMfaRequired(true);
      setMfaCode(""); // User must enter their own MFA code manually
      setSuccessMessage(
        isAmharic
          ? "እባክዎ ባለ 6-አሃዝ MFA ማረጋገጫ ኮድዎን ያስገቡ"
          : "Please enter your 6-digit MFA security token."
      );
      return;
    }

    if (mfaRequired) {
      if (!mfaCode.trim()) {
        setMfaError(isAmharic ? "እባክዎ ባለ 6-አሃዝ MFA ማረጋገጫ ኮድ ያስገቡ" : "Please enter your 6-digit MFA security token.");
        return;
      }
      try {
        const res = await fetch("/api/security/verify-mfa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: mfaCode.trim(),
            userId: email.trim().toLowerCase() || employeeId.trim() || "user",
            userName: email || employeeId || "User"
          })
        });
        const mfaData = await res.json();
        if (!res.ok || !mfaData.success) {
          setMfaError(mfaData.message || mfaData.error || (isAmharic ? "የተሳሳተ የደህንነት TOTP ኮድ!" : "Incorrect TOTP MFA authentication token!"));
          handleFailedAttempt(isAmharic ? "የኤምኤፍኤ ማረጋገጫ አልተሳካም" : "TOTP MFA authentication failed");
          return;
        }
      } catch (mfaErr: any) {
        setMfaError(isAmharic ? "የኤምኤፍኤ ማረጋገጫ አልተሳካም" : "MFA verification failed. Please check network connection.");
        handleFailedAttempt("MFA verification request failed");
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

            {/* ERP Capabilities and Core Pillars Infographics */}
            <div className="mt-6 space-y-4">
              <label className="block text-[10px] font-mono tracking-wider text-slate-400 uppercase mb-2">
                {isAmharic ? "የሲስተሙ ዋና ዋና ክፍሎች" : "Core ERP Capability Pillars"}
              </label>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
                  <div className="p-1.5 bg-red-950/40 rounded-lg text-red-500 border border-red-500/10">
                    <Briefcase size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {isAmharic ? "በስራ ድርሻ ላይ የተመሰረተ ፈቃድ" : "Role-Based Access Control (RBAC)"}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      {isAmharic 
                        ? "እያንዳንዱ ሰራተኛ፣ መሃንዲስ እና ስራ አስኪያጅ በስራ ድርሻው መሰረት ብቻ የተፈቀደለት መረጃ እንዲያይ ይደረጋል።" 
                        : "Tailored access matching your designated job position to secure database queries."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
                  <div className="p-1.5 bg-red-950/40 rounded-lg text-red-500 border border-red-500/10">
                    <Phone size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {isAmharic ? "ባለ ሁለት-ደረጃ ማረጋገጫ (MFA)" : "Multi-Factor Authentication"}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      {isAmharic 
                        ? "ደህንነቱ ይበልጥ የተጠበቀ እንዲሆን በኤስኤምኤስ (SMS) ኦቲፒ እና ባዮሜትሪክስ ማረጋገጫዎችን ያካትታል።" 
                        : "High-security protection via secondary SMS verification codes and hardware-emulated biometrics."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
                  <div className="p-1.5 bg-red-950/40 rounded-lg text-red-500 border border-red-500/10">
                    <Shield size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {isAmharic ? "የግንባታ ውሂብ ጥበቃ" : "Construction Telemetry Encryption"}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      {isAmharic 
                        ? "የግንባታ ዞኖች፣ የቁሳቁስ ክምችት፣ የጥራት እና ደህንነት መዛግብት ምስጠራን በመጠቀም ይጠበቃሉ።" 
                        : "Encrypted transmission protocols guarding project progress logs, QA Snags and structural inventory."}
                    </p>
                  </div>
                </div>
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

          {/* TOP MODE TOGGLE: SIGN IN vs NEW REGISTRATION */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                !isRegistering ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "text-slate-400 hover:text-white"
              }`}
            >
              <Lock size={14} />
              <span>{isAmharic ? "መግቢያ (Sign In)" : "Sign In"}</span>
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setErrorMessage(""); setSuccessMessage(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                isRegistering ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "text-slate-400 hover:text-white"
              }`}
            >
              <UserCheck size={14} />
              <span>{isAmharic ? "አዲስ ተመዝጋቢ (Register)" : "New Registration"}</span>
            </button>
          </div>

          {!isRegistering ? (
            <form onSubmit={(e) => { if (showForgotPassword) { handleSendPasswordReset(e); } else { handleLoginSubmit(e); } }} className="space-y-4">
              
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
                        setShowForgotPassword(false);
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
                showForgotPassword ? (
                  <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-xl animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <KeyRound size={14} className="text-red-500" />
                        <span>{isAmharic ? "ይለፍ ቃል መልሶ ማግኛ" : "Reset Password"}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetErrorMessage("");
                          setResetSuccessMessage("");
                        }}
                        className="text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer"
                      >
                        {isAmharic ? "ወደ መግቢያ ተመለስ" : "Back to Login"}
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      {isAmharic 
                        ? "እባክዎ የተመዘገበበትን ድርጅታዊ ኢሜል ያስገቡ። የይለፍ ቃል መቀየሪያ ሊንክ እንልክልዎታለን።"
                        : "Enter your registered corporate email address to receive a secure password reset link."}
                    </p>

                    {resetErrorMessage && (
                      <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 flex items-start space-x-2 text-xs text-red-300">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{resetErrorMessage}</span>
                      </div>
                    )}

                    {resetSuccessMessage && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-start space-x-2 text-xs text-emerald-300">
                        <CheckCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{resetSuccessMessage}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                        {isAmharic ? "ድርጅታዊ ኢሜል አድራሻ" : "Corporate Email Address"}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 text-slate-500" size={16} />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="e.g. yoseph@digital_construction_erprealestate.com"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetErrorMessage("");
                          setResetSuccessMessage("");
                        }}
                        className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold uppercase rounded-lg transition-all cursor-pointer"
                      >
                        {isAmharic ? "ሰርዝ" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendPasswordReset}
                        disabled={resetLoading}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-red-600/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Mail size={14} />
                        <span>
                          {resetLoading
                            ? (isAmharic ? "በመላክ ላይ..." : "Sending...")
                            : (isAmharic ? "የመቀየሪያ ሊንክ ላክ" : "Send Reset Link")}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
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
                          <div className="flex justify-end mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowForgotPassword(true);
                                setResetEmail(email);
                                setResetErrorMessage("");
                                setResetSuccessMessage("");
                              }}
                              className="text-[11px] text-red-400 hover:text-red-300 font-bold hover:underline transition-colors cursor-pointer"
                            >
                              {isAmharic ? "ይለፍ ቃል ረስተዋል?" : "Forgot Password?"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                  {authMethod === "phone" && (
                    <>
                      <div id="recaptcha-container"></div>
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
              )
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

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMfaRequired(false);
                        setMfaCode("");
                        setMfaError("");
                      }}
                      className="flex-1 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold uppercase transition-all cursor-pointer text-slate-300"
                    >
                      {isAmharic ? "ተመለስ" : "Back"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMfaCode("");
                        setMfaError("");
                        setSuccessMessage(isAmharic ? "አዲስ የማረጋገጫ ኮድ ጥያቄ ተልኳል" : "A new MFA challenge request was sent.");
                      }}
                      className="flex-1 py-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[10px] font-bold uppercase transition-all text-red-400 cursor-pointer"
                    >
                      {isAmharic ? "ኮድ መልሰህ ላክ" : "Resend Token"}
                    </button>
                  </div>
                </div>
              )}

              {!showForgotPassword && (
                <>
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
                    disabled={isLocked || phoneLoading}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Shield size={14} />
                    <span>
                      {phoneLoading
                        ? (isAmharic ? "በማስኬድ ላይ..." : "Processing...")
                        : mfaRequired 
                          ? (isAmharic ? "ማረጋገጫ አረጋግጥ እና ክፈት" : "Verify Token & Authorize") 
                          : authMethod === "phone" && !isOtpSent 
                            ? (isAmharic ? "የማረጋገጫ ኤስኤምኤስ ላክ" : "Send SMS Authentication OTP") 
                            : (isAmharic ? "ግባና ERP ጫን" : "Unlock & Access Command ERP")}
                    </span>
                  </button>
                </>
              )}

              {/* Switch to Registration */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-bold hover:underline transition-colors cursor-pointer"
                >
                  {isAmharic ? "አዲስ ተመዝጋቢ ነዎት? እዚህ ይመዝገቡ (የስራ ድርሻ ጨምሮ)" : "New registrant? Register here with your job role"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="flex items-center space-x-2 text-red-500 mb-2">
                <UserPlus size={18} />
                <h3 className="font-black uppercase text-xs tracking-wider text-white">
                  {isAmharic ? "አዲስ ተጠቃሚ መመዝገቢያ" : "New User Registration"}
                </h3>
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

              <div className="space-y-3">
                {/* Name Field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                    {isAmharic ? "ሙሉ ስም" : "Full Name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Nuriye Ahmed Adem"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                    {isAmharic ? "ስልክ ቁጥር" : "Phone Number"}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. +251 910 097 862"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                    {isAmharic ? "ኢሜል አድራሻ" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. mejennur669@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                    {isAmharic ? "የይለፍ ቃል (Password)" : "Password"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Role Dropdown */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                    {isAmharic ? "በድርጅቱ ውስጥ ያለው የስራ ድርሻ (ሚና)" : "Job Role / Position in Organization"}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-red-500 transition-all font-mono appearance-none"
                    >
                      {[
                        { role: UserRole.SUPER_ADMIN, label: isAmharic ? "ዋና አድሚን (Super Admin)" : "Super Admin" },
                        { role: UserRole.HEAD_OFFICE, label: isAmharic ? "ዋና መሥሪያ ቤት (Head Office)" : "Head Office" },
                        { role: UserRole.PROJECT_MANAGER, label: isAmharic ? "የፕሮጀክት ሥራ አስኪያጅ (Project Manager)" : "Project Manager" },
                        { role: UserRole.SECTION_HEAD, label: isAmharic ? "የክፍል ኃላፊ (Section Head)" : "Section Head" },
                        { role: UserRole.SUPERVISOR, label: isAmharic ? "ተቆጣጣሪ (Supervisor)" : "Supervisor" },
                        { role: UserRole.SITE_ENGINEER, label: isAmharic ? "የሳይት መሃንዲስ (Site Engineer)" : "Site Engineer" },
                        { role: UserRole.QAQC_ENGINEER, label: isAmharic ? "የጥራት ቁጥጥር መሐንዲስ (QA/QC Engineer)" : "QA/QC Engineer" },
                        { role: UserRole.HSE_OFFICER, label: isAmharic ? "የደህንነት ኃላፊ (HSE Officer)" : "HSE Officer" },
                        { role: UserRole.SURVEYOR, label: isAmharic ? "ሰርቬየር (Surveyor)" : "Surveyor" },
                        { role: UserRole.TIME_KEEPER, label: isAmharic ? "የሰዓት ተቆጣጣሪ (Time Keeper)" : "Time Keeper" },
                        { role: UserRole.TEAM_LEADER, label: isAmharic ? "የቡድን መሪ (Team Leader)" : "Team Leader" },
                        { role: UserRole.GANG_CHIEF, label: isAmharic ? "የጋንግ ቺፍ (Gang Chief)" : "Gang Chief" },
                        { role: UserRole.ASSEMBLER, label: isAmharic ? "ተገጣጣሚ ሠራተኛ (Assembler)" : "Assembler" },
                        { role: UserRole.WAREHOUSE_MANAGER, label: isAmharic ? "የመጋዘን ሥራ አስኪያጅ (Warehouse Manager)" : "Warehouse Manager" },
                        { role: UserRole.STORE_OWNER, label: isAmharic ? "የሳይት ስቶር አቃቤ (Store Owner)" : "Store Owner" },
                        { role: UserRole.STORE_MANAGER, label: isAmharic ? "የስቶር ማናጀር (Store Manager)" : "Store Manager" },
                        { role: UserRole.HR_MANAGER, label: isAmharic ? "የሰው ኃይል ሥራ አስኪያጅ (HR Manager)" : "HR Manager" },
                        { role: UserRole.FINANCE_MANAGER, label: isAmharic ? "የፋይናንስ ሥራ አስኪያጅ (Finance Manager)" : "Finance Manager" },
                        { role: UserRole.PROCUREMENT_MANAGER, label: isAmharic ? "የግዥ ሥራ አስኪያጅ (Procurement Manager)" : "Procurement Manager" },
                        { role: UserRole.DRIVER, label: isAmharic ? "የተሽከርካሪ አሽከርካሪ (Driver)" : "Driver" },
                        { role: UserRole.CLIENT_CONSULTANT, label: isAmharic ? "አማካሪ / ደንበኛ (Client / Consultant)" : "Client / Consultant" },
                        { role: UserRole.AUDITOR, label: isAmharic ? "ኦዲተር (Auditor)" : "Auditor" },
                        { role: UserRole.WORKER, label: isAmharic ? "መደበኛ ሰራተኛ (Worker)" : "Worker" },
                        { role: UserRole.VISITOR, label: isAmharic ? "ጎብኚ (Visitor)" : "Visitor" }
                      ].map((opt) => (
                        <option key={opt.role} value={opt.role} className="bg-slate-900 text-white text-xs">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

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

              {/* REGISTER BUTTON */}
              <button
                type="submit"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <UserPlus size={14} />
                <span>
                  {isAmharic ? "ይመዝገቡ እና ERP ይክፈቱ" : "Register & Unlock ERP Access"}
                </span>
              </button>

              {/* Switch back to Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-300 font-bold hover:underline transition-colors cursor-pointer"
                >
                  {isAmharic ? "ቀድሞውኑ አካውንት አለዎት? እዚህ ይግቡ" : "Already have an account? Sign in here"}
                </button>
              </div>
            </form>
          )}

          {/* Secure lock info & Firebase Config Button */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1">
                <Lock size={10} className="text-red-500" />
                <span>TLS 1.3 | SHA-256</span>
              </span>
              <button
                type="button"
                onClick={() => setShowFirebaseModal(true)}
                className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center space-x-1 font-bold cursor-pointer transition-colors"
              >
                <Key size={10} />
                <span>{isAmharic ? "የፋየርቤዝ ኤፒአይ ቁልፍ ያስገቡ (Firebase Keys)" : "Firebase API Keys"}</span>
              </button>
            </div>
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

      {/* FIREBASE CONFIGURATION MODAL */}
      <FirebaseConfigModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
        isAmharic={isAmharic}
      />

    </div>
  );
}
