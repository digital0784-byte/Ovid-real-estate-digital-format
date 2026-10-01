import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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

let app;
let db: any = null;
let auth: any = null;
let isFirebaseReady = false;

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
    try {
      db = databaseId
        ? initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId)
        : initializeFirestore(app, { ignoreUndefinedProperties: true });
    } catch {
      db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    }
    auth = getAuth(app);
    isFirebaseReady = true;

    // Enable offline persistence for fully resilient field operations
    if (typeof window !== "undefined") {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore offline persistence notice: Multiple tabs open.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore offline persistence is not supported by this browser.");
        } else {
          console.warn("Firestore offline persistence notice:", err.message);
        }
      });
    }
  } catch (error) {
    console.warn("Firebase Initialization notice. Operating in resilient offline-first mode:", error);
    isFirebaseReady = false;
  }
} else {
  console.info("Firebase environment variables not fully set. Defaulting to local persistent storage engine.");
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error("Firestore Error:", JSON.stringify(errInfo));
  return errInfo;
}

export { db, auth, isFirebaseReady };
