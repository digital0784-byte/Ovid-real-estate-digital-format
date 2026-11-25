import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseReady, sanitizeForFirestore, getDocWithCacheFallback } from "../firebase";
import { getAppCheckToken } from "../appCheck";
import { UserRole } from "../types";

export const MFA_TTL_MS = 12 * 60 * 60 * 1000;

// MASTER SWITCH, OFF by default (owner decision). To turn it on everywhere flip ALL THREE:
// build with VITE_MFA_ENFORCED=true, run the server with MFA_ENFORCED=true,
// and set mfaEnforced() to true in firestore.rules (then publish the rules).
export const MFA_ENFORCED: boolean = import.meta.env.VITE_MFA_ENFORCED === "true";

// Super Admin intentionally NOT listed (owner decision). To require MFA again add it here, in server.ts SENSITIVE_ROLES, src/services/authService.ts SENSITIVE_ROLES and firestore.rules isSensitiveRole()
export const SENSITIVE_ROLES: ReadonlySet<string> = new Set([
  UserRole.HEAD_OFFICE,
  UserRole.PROJECT_MANAGER,
  UserRole.SECTION_HEAD,
  UserRole.FINANCE_MANAGER,
  "Head Office",
  "Project Manager",
  "Section Head",
  "Finance Manager",
]);

export function isSensitiveRole(role: string | UserRole | undefined | null): boolean {
  if (!role || !MFA_ENFORCED) return false;
  return SENSITIVE_ROLES.has(String(role));
}

export const isDemoLoginEnabled: boolean = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true"
);

export interface AuthErrorLocalized {
  en: string;
  am: string;
}

export class AuthServiceError extends Error {
  public readonly messageAm: string;
  public readonly code: string;

  constructor(code: string, messageEn: string, messageAm: string) {
    super(messageEn);
    this.name = "AuthServiceError";
    this.code = code;
    this.messageAm = messageAm;
  }
}

export function validatePassword(password: string): {
  valid: boolean;
  messageEn?: string;
  messageAm?: string;
} {
  if (!password || password.length < 8) {
    return {
      valid: false,
      messageEn: "Password must be at least 8 characters long and include a letter and a digit.",
      messageAm: "የይለፍ ቃል ቢያንስ 8 ቁምፊ መሆን እና ፊደልና ቁጥር መያዝ አለበት።",
    };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return {
      valid: false,
      messageEn: "Password must include at least one letter and one digit.",
      messageAm: "የይለፍ ቃል ቢያንስ አንድ ፊደል እና አንድ ቁጥር መያዝ አለበት።",
    };
  }
  return { valid: true };
}

export interface FirestoreUserRecord {
  uid: string;
  id?: string;
  employeeId?: string;
  displayName: string;
  name?: string;
  email: string;
  phoneNumber?: string;
  role: UserRole | "Pending" | string;
  requestedRole?: UserRole | string;
  status: string;
  department?: string;
  trade?: string;
  position?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeLegacyRole(role: string): string {
  if (typeof role !== "string") return "";
  const trimmed = role.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "directory") return UserRole.DIRECTOR;
  if (
    lower === "store owner" ||
    lower === "site store owner" ||
    lower === "store_owner" ||
    lower === "site_store_owner" ||
    lower === "site manager" ||
    lower === "site_manager"
  ) {
    return UserRole.SITE_MANAGER;
  }
  return trimmed;
}

export function resolveUserRole(
  userData: { role?: unknown; status?: unknown } | null | undefined
): UserRole | "Pending" {
  if (
    userData &&
    userData.status === "Active" &&
    typeof userData.role === "string" &&
    userData.role.trim() !== "" &&
    userData.role !== "Pending"
  ) {
    return normalizeLegacyRole(userData.role) as UserRole;
  }
  return "Pending";
}

function getPrefixFromRole(role: string): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "SA";
    case UserRole.HEAD_OFFICE:
      return "HO";
    case UserRole.PROJECT_MANAGER:
      return "PM";
    case UserRole.SITE_ENGINEER:
      return "SE";
    case UserRole.SUPERVISOR:
      return "SV";
    case UserRole.TIME_KEEPER:
      return "TK";
    case UserRole.TEAM_LEADER:
      return "TL";
    case UserRole.GANG_CHIEF:
      return "GC";
    case UserRole.WAREHOUSE_MANAGER:
      return "WM";
    case UserRole.STORE_MANAGER:
    case UserRole.SITE_MANAGER:
      return "SM";
    case UserRole.HR_MANAGER:
    case UserRole.HR:
      return "HR";
    case UserRole.FINANCE_MANAGER:
      return "FM";
    case UserRole.ACCOUNTANT:
      return "AC";
    case UserRole.SECTION_HEAD:
      return "SH";
    case UserRole.SURVEYOR:
      return "SR";
    case UserRole.OFFICE_AND_TECHNICAL_ENGINEERING:
      return "OTE";
    case UserRole.DIRECTOR:
      return "DIR";
    case UserRole.OFFICE_MANAGER:
      return "OM";
    case UserRole.OPERATION_MANAGER:
      return "OP";
    case UserRole.MATERIAL_HANDLING:
      return "MH";
    case UserRole.GATE_SECURITY_OFFICER:
      return "GS";
    default:
      return "W";
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{
  user: User;
  profile: FirestoreUserRecord;
  resolvedRole: UserRole | "Pending";
}> {
  if (!isFirebaseReady || !auth) {
    throw new AuthServiceError(
      "auth/unavailable",
      "Authentication service is not configured.",
      "የማረጋገጫ አገልግሎቱ አልተዘጋጀም።"
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new AuthServiceError(
      "auth/invalid-credentials",
      "Invalid email or password.",
      "የተሳሳተ ኢሜል ወይም የይለፍ ቃል።"
    );
  }

  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (err: any) {
    const code = err?.code || "";
    if (
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-email"
    ) {
      throw new AuthServiceError(
        "auth/invalid-credentials",
        "Invalid email or password.",
        "የተሳሳተ ኢሜል ወይም የይለፍ ቃል።"
      );
    }
    if (code === "auth/too-many-requests") {
      throw new AuthServiceError(
        code,
        "Too many failed login attempts. Please wait and try again.",
        "ብዙ የተሳሳቱ የመግቢያ ሙከራዎች ተደርገዋል። እባክዎ ትንሽ ቆይተው ይሞክሩ።"
      );
    }
    if (code === "auth/user-disabled") {
      throw new AuthServiceError(
        code,
        "This account has been disabled by an administrator.",
        "ይህ መለያ በአስተዳዳሪ ታግዷል።"
      );
    }
    throw new AuthServiceError(
      code || "auth/sign-in-failed",
      "Unable to sign in. Please try again.",
      "መግባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።"
    );
  }

  const firebaseUser = cred.user;
  let profileData: Record<string, any> | null = null;
  if (db) {
    try {
      const snap = await getDocWithCacheFallback(doc(db, "users", firebaseUser.uid));
      if (snap && snap.exists()) {
        profileData = snap.data();
      }
    } catch {
      profileData = null;
    }
  }

  const resolvedRole = resolveUserRole(profileData);
  const profile: FirestoreUserRecord = {
    uid: firebaseUser.uid,
    id: firebaseUser.uid,
    employeeId: profileData?.employeeId || "",
    displayName:
      profileData?.displayName ||
      firebaseUser.displayName ||
      normalizedEmail.split("@")[0] ||
      "User",
    name: profileData?.name || profileData?.displayName || "",
    email: profileData?.email || firebaseUser.email || normalizedEmail,
    phoneNumber: profileData?.phoneNumber || firebaseUser.phoneNumber || "",
    role: resolvedRole,
    requestedRole: profileData?.requestedRole || "Worker",
    status: resolvedRole === "Pending" ? "Pending" : "Active",
    department: profileData?.department || "",
    trade: profileData?.trade || "",
    position: profileData?.position || "",
    createdAt: profileData?.createdAt,
    updatedAt: profileData?.updatedAt,
  };

  return { user: firebaseUser, profile, resolvedRole };
}

export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  requestedRole: UserRole | string;
  department?: string;
  trade?: string;
}): Promise<{
  user: User;
  profile: FirestoreUserRecord;
  employeeId: string;
}> {
  if (!isFirebaseReady || !auth || !db) {
    throw new AuthServiceError(
      "auth/unavailable",
      "Authentication service is not configured.",
      "የማረጋገጫ አገልግሎቱ አልተዘጋጀም።"
    );
  }

  const pwCheck = validatePassword(params.password);
  if (!pwCheck.valid) {
    throw new AuthServiceError(
      "auth/weak-password",
      pwCheck.messageEn || "Password does not meet security policy.",
      pwCheck.messageAm || "የይለፍ ቃሉ የደህንነት መስፈርቱን አያሟላም።"
    );
  }

  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new AuthServiceError(
      "auth/invalid-email",
      "Please enter a valid email address.",
      "እባክዎ ትክክለኛ የኢሜል አድራሻ ያስገቡ።"
    );
  }

  const sanitizedRequestedRole =
    !params.requestedRole ||
    params.requestedRole === UserRole.SUPER_ADMIN ||
    String(params.requestedRole) === "Super Admin"
      ? UserRole.WORKER
      : String(params.requestedRole);

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/email-already-in-use") {
      throw new AuthServiceError(
        code,
        "An account with this email already exists. Please sign in.",
        "በዚህ ኢሜል የተመዘገበ መለያ አለ። እባክዎ ይግቡ።"
      );
    }
    if (code === "auth/weak-password") {
      throw new AuthServiceError(
        code,
        "Password is too weak. Use at least 8 characters with a letter and a digit.",
        "የይለፍ ቃሉ ደካማ ነው። ቢያንስ 8 ቁምፊ ከፊደልና ከቁጥር ጋር ይጠቀሙ።"
      );
    }
    throw new AuthServiceError(
      code || "auth/registration-failed",
      "Registration failed. Please verify your details and try again.",
      "ምዝገባው አልተሳካም። እባክዎ መረጃዎን አረጋግጠው እንደገና ይሞክሩ።"
    );
  }

  const uid = cred.user.uid;
  const prefix = getPrefixFromRole(sanitizedRequestedRole);
  const fullEmpId = `DCERP-${prefix}-${uid.slice(0, 6).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  // Strictly whitelisted fields matching firestore.rules `users/{userId}` create rule
  const userProfilePayload: FirestoreUserRecord = {
    id: uid,
    uid,
    employeeId: fullEmpId,
    displayName: params.displayName.trim(),
    name: params.displayName.trim(),
    email: cleanEmail,
    phoneNumber: params.phoneNumber.trim(),
    role: "Pending",
    status: "Pending",
    requestedRole: sanitizedRequestedRole,
    department: params.department || sanitizedRequestedRole,
    trade: params.trade || sanitizedRequestedRole,
    position: sanitizedRequestedRole,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setDoc(doc(db, "users", uid), sanitizeForFirestore(userProfilePayload));

  const requestPayload = sanitizeForFirestore({
    id: uid,
    userId: uid,
    uid,
    userName: params.displayName.trim(),
    userEmail: cleanEmail,
    phoneNumber: params.phoneNumber.trim(),
    currentRole: "Pending",
    requestedRole: sanitizedRequestedRole,
    reason: `Self-registration requested role: ${sanitizedRequestedRole}`,
    status: "Pending Approval",
    requestedBy: params.displayName.trim(),
    requestedByRole: "Pending User",
    requestedDate: nowIso.slice(0, 10),
    requestedTime: nowIso.slice(11, 16),
    createdAt: nowIso,
  });

  await setDoc(doc(db, "role_change_requests", uid), requestPayload, { merge: true }).catch(
    (err) => console.warn("Could not write role_change_requests doc on signup:", err)
  );

  await setDoc(
    doc(db, "registrants", uid),
    sanitizeForFirestore({ ...userProfilePayload, userId: uid }),
    { merge: true }
  ).catch((err) => console.warn("Could not write registrants doc on signup:", err));

  return {
    user: cred.user,
    profile: userProfilePayload,
    employeeId: fullEmpId,
  };
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!isFirebaseReady || !auth) return;
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signOutCurrentUser(): Promise<void> {
  if (auth?.currentUser) {
    await signOut(auth);
  }
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  try {
    if (auth?.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
    }
  } catch {
    // Proceed without bearer token if unavailable; server enforces auth
  }

  try {
    const appCheckToken = await getAppCheckToken();
    if (appCheckToken) {
      headers.set("X-Firebase-AppCheck", appCheckToken);
    }
  } catch {
    // Ignore App Check token fetch error
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export interface MfaStatusResponse {
  enrolled: boolean;
  required: boolean;
  verifiedRecently: boolean;
  mfaAt?: number | null;
}

export async function getMfaStatus(): Promise<MfaStatusResponse> {
  const res = await authFetch("/api/security/mfa/status", { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Failed to retrieve MFA status");
  }
  return data;
}

export async function enrollMfa(): Promise<{ otpauthUri: string; secret?: string }> {
  const res = await authFetch("/api/security/mfa/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || "Failed to initialize MFA enrollment");
  }
  return data;
}

export async function verifyMfa(
  code: string
): Promise<{ success: boolean; mfaAt?: number; message?: string; error?: string }> {
  const res = await authFetch("/api/security/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return {
      success: false,
      error: data?.error || "mfa_verification_failed",
      message: data?.message || "Invalid or expired verification code.",
    };
  }
  if (auth?.currentUser) {
    await auth.currentUser.getIdToken(true).catch(() => {});
  }
  return {
    success: true,
    mfaAt: data.mfaAt,
  };
}

export async function hasFreshMfaClaim(forceRefresh = false): Promise<boolean> {
  if (!auth?.currentUser) return false;
  try {
    const tokenResult = await auth.currentUser.getIdTokenResult(forceRefresh);
    const rawMfaAt = tokenResult?.claims?.mfaAt;
    const mfaAt = typeof rawMfaAt === "number" ? rawMfaAt : Number(rawMfaAt);
    if (!Number.isFinite(mfaAt) || mfaAt <= 0) return false;
    return Date.now() - mfaAt <= MFA_TTL_MS;
  } catch {
    return false;
  }
}

const CACHED_PROFILE_PREFIX = "erp_cached_user_profile_v1_";

export function saveCachedUserProfile(profile: {
  uid: string;
  role: string;
  status: string;
  [key: string]: any;
}): void {
  if (typeof window === "undefined" || !profile?.uid) return;
  try {
    const resolved = resolveUserRole(profile);
    if (resolved === "Pending" || profile.status !== "Active") return;
    window.localStorage.setItem(
      `${CACHED_PROFILE_PREFIX}${profile.uid}`,
      JSON.stringify({ ...profile, role: resolved, status: "Active", _cachedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadCachedUserProfile<T = FirestoreUserRecord>(uid: string | undefined | null): T | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    const raw = window.localStorage.getItem(`${CACHED_PROFILE_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const resolved = resolveUserRole(parsed);
    if (resolved === "Pending") return null;
    return { ...parsed, role: resolved, status: "Active" } as T;
  } catch {
    return null;
  }
}

export function clearCachedUserProfile(uid?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (uid) {
      window.localStorage.removeItem(`${CACHED_PROFILE_PREFIX}${uid}`);
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(CACHED_PROFILE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Ignore storage errors
  }
}

