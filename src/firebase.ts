import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  doc,
  enableNetwork,
  disableNetwork,
  type FirestoreSettings,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import firebaseConfigJson from "../firebase-applet-config.json";

// Helper to retrieve saved custom config from localStorage
const getSavedCustomConfig = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("custom_firebase_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        // If custom config matches the default project or is missing apiKey/projectId, prefer the official firebase-applet-config.json
        if (
          !parsed.apiKey ||
          !parsed.projectId ||
          parsed.projectId === firebaseConfigJson.projectId
        ) {
          if (!parsed.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId) {
            parsed.firestoreDatabaseId = firebaseConfigJson.firestoreDatabaseId;
          }
        }
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse custom_firebase_config from localStorage", e);
    }
  }
  return {};
};

const customConfig = getSavedCustomConfig();
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || customConfig.apiKey || env.VITE_FIREBASE_API_KEY || "",
  authDomain: firebaseConfigJson.authDomain || customConfig.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: firebaseConfigJson.projectId || customConfig.projectId || env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: firebaseConfigJson.storageBucket || customConfig.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: firebaseConfigJson.messagingSenderId || customConfig.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: firebaseConfigJson.appId || customConfig.appId || env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || customConfig.firestoreDatabaseId || ""
};

let app: any;
let db: any = null;
let auth: any = null;
let storage: any = null;
let isFirebaseReady = false;

const isBrowserRuntime =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  !env.VITEST;

// Check if variables are configured and non-placeholder
const isConfigValid =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  firebaseConfig.apiKey !== "undefined" &&
  firebaseConfig.projectId !== "undefined" &&
  !firebaseConfig.apiKey.includes("YOUR_") &&
  !firebaseConfig.projectId.includes("demo-");

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const databaseId = firebaseConfig.firestoreDatabaseId;

    const localCache =
      isBrowserRuntime && typeof indexedDB !== "undefined"
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache();

    const firestoreSettings: FirestoreSettings = {
      ignoreUndefinedProperties: true,
      localCache,
      // Use HTTP long-polling in browser runtimes so restricted/proxied iframes and mobile LTE
      // networks never fail WebChannel streaming handshakes with [code=unavailable].
      ...(isBrowserRuntime
        ? {
            experimentalForceLongPolling: true,
            experimentalLongPollingOptions: { timeoutSeconds: 30 },
          }
        : {}),
    };

    try {
      db = databaseId
        ? initializeFirestore(app, firestoreSettings, databaseId)
        : initializeFirestore(app, firestoreSettings);
    } catch (firestoreInitErr: any) {
      const msgLower = String(firestoreInitErr?.message || "").toLowerCase();
      if (!msgLower.includes("already been started") && !msgLower.includes("already exists")) {
        console.warn("Firestore Init notice:", firestoreInitErr);
      }
      db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    }

    auth = getAuth(app);
    try {
      storage = getStorage(app);
    } catch {
      storage = null;
    }
    isFirebaseReady = true;

    if (isBrowserRuntime && db) {
      // Keep Firestore network state synchronized with browser connectivity so offline devices
      // operate cleanly on IndexedDB cache instead of triggering repeated unavailable timeouts.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        disableNetwork(db).catch(() => {});
      }

      window.addEventListener("offline", () => {
        if (db) disableNetwork(db).catch(() => {});
      });

      window.addEventListener("online", () => {
        if (db) enableNetwork(db).catch(() => {});
      });

      // Validate Firestore connectivity once at startup when online
      if (typeof navigator === "undefined" || navigator.onLine !== false) {
        (async function testConnection() {
          try {
            await getDocFromServer(doc(db, "test", "connection"));
          } catch (error: any) {
            const code = error?.code || "";
            if (code && code !== "permission-denied" && code !== "not-found" && code !== "unavailable") {
              console.warn("Firestore connection notice:", error);
            }
            if (error instanceof Error && error.message.includes("the client is offline")) {
              console.warn("Firestore connection notice: operating in offline cache mode until backend becomes reachable.");
            }
          }
        })();
      }
    }
  } catch (error) {
    console.warn("Firebase Initialization notice. Operating in resilient offline-first mode:", error);
    isFirebaseReady = false;
  }
} else {
  console.info("Firebase environment variables not fully set. Defaulting to local persistent storage engine.");
}

export async function getDocWithCacheFallback<T = any>(
  docRef: DocumentReference<T>
): Promise<DocumentSnapshot<T> | null> {
  try {
    return await getDoc(docRef);
  } catch (err: any) {
    const code = err?.code || "";
    const msg = String(err?.message || "").toLowerCase();
    if (
      code === "unavailable" ||
      code === "failed-precondition" ||
      msg.includes("offline") ||
      msg.includes("unavailable")
    ) {
      try {
        return await getDocFromCache(docRef);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

export function getFirebaseConfigDetails() {
  return {
    ...firebaseConfig,
    isCustom: Boolean(customConfig && customConfig.apiKey),
    isFirebaseReady
  };
}

export function saveCustomFirebaseConfig(config: typeof firebaseConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("custom_firebase_config", JSON.stringify(config));
    window.location.reload();
  }
}

export function resetFirebaseConfig() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("custom_firebase_config");
    window.location.reload();
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || "";
  const errInfo: FirestoreErrorInfo = {
    error: rawMessage,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  if (errCode === "unavailable" || rawMessage.toLowerCase().includes("the client is offline")) {
    console.warn("Firestore Offline Notice:", JSON.stringify(errInfo));
  } else {
    console.error("Firestore Error:", JSON.stringify(errInfo));
  }
  return errInfo;
}

export { app, db, auth, storage, isFirebaseReady };
