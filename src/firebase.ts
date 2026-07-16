import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Secure, lazy initialization configuration
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || ""
};

let app;
let db: any = null;
let auth: any = null;
let isFirebaseReady = false;

// Check if variables are configured
const hasConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.projectId;

if (hasConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseReady = true;

    // Enable offline persistence for fully resilient field operations
    if (typeof window !== "undefined") {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("Firestore offline persistence failed: Multiple tabs open.");
        } else if (err.code === 'unimplemented') {
          console.warn("Firestore offline persistence is not supported by this browser.");
        }
      });
    }
  } catch (error) {
    console.error("Firebase Initialization Error. Operating in resilient offline-first mode:", error);
  }
} else {
  console.info("Firebase environment variables not set. Defaulting to local persistent storage engine.");
}

export { db, auth, isFirebaseReady };
