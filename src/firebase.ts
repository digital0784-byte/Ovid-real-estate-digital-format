import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfigJson from "../firebase-applet-config.json";

// Helper to retrieve saved custom config from localStorage
const getSavedCustomConfig = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("custom_firebase_config");
      if (saved) {
        return JSON.parse(saved);
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
  apiKey: customConfig.apiKey || firebaseConfigJson.apiKey || env.VITE_FIREBASE_API_KEY || "",
  authDomain: customConfig.authDomain || firebaseConfigJson.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: customConfig.projectId || firebaseConfigJson.projectId || env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: customConfig.storageBucket || firebaseConfigJson.storageBucket || env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: customConfig.messagingSenderId || firebaseConfigJson.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: customConfig.appId || firebaseConfigJson.appId || env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: customConfig.firestoreDatabaseId || firebaseConfigJson.firestoreDatabaseId || ""
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
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
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

export { db, auth, isFirebaseReady };
