import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { TOTP, Secret } from "otpauth";
import { createBiometricConnectorRouter } from "./src/server/biometricConnectorRouter";
import { fetchUserProfileWithIdToken } from "./src/server/firestoreUserLookup";
let firebaseConfigJson: any = {};
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfigJson = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json:", e);
}

// Load environment variables
dotenv.config();

// Strict 32-byte encryption key resolution (supports 64-char hex or strict 32-byte base64)
function resolveEncryptionKey(raw?: string): Buffer | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  if (/^[A-Za-z0-9+/=]{43,44}$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, "base64");
    if (buf.length === 32 && buf.toString("base64").replace(/=+$/, "") === trimmed.replace(/=+$/, "")) {
      return buf;
    }
  }
  return null;
}

const encryptionKeyBuffer = resolveEncryptionKey(process.env.ENCRYPTION_SECRET_KEY);
let mfaAvailable = Boolean(encryptionKeyBuffer);

if (!encryptionKeyBuffer) {
  if (process.env.REQUIRE_ENCRYPTION_KEY === "true") {
    console.error("[FATAL] ENCRYPTION_SECRET_KEY must be a valid 32-byte key (64 hex chars or 32-byte base64) when REQUIRE_ENCRYPTION_KEY=true.");
    process.exit(1);
  } else {
    console.warn("[WARN] ENCRYPTION_SECRET_KEY is missing or not a valid 32-byte key. MFA endpoints will remain disabled (503 mfa_unavailable) until configured.");
  }
}

const IV_LENGTH = 12;
const MFA_MAX_AGE_MS = 12 * 60 * 60 * 1000;
// MASTER SWITCH, OFF by default. Must stay in sync with VITE_MFA_ENFORCED in client build and mfaEnforced() in firestore.rules.
const MFA_ENFORCED = process.env.MFA_ENFORCED === "true";

// Super Admin intentionally NOT listed (owner decision). To require MFA again add it here, in server.ts SENSITIVE_ROLES, src/services/authService.ts SENSITIVE_ROLES and firestore.rules isSensitiveRole()
const SENSITIVE_ROLES = new Set([
  "Head Office",
  "Project Manager",
  "Section Head",
  "Finance Manager",
]);

// Initialize Firebase Admin SDK
let adminApp: App | null = null;
try {
  const projectId = firebaseConfigJson.projectId || process.env.FIREBASE_PROJECT_ID;
  if (projectId || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const apps = getApps();
    adminApp = apps.length > 0 ? apps[0]! : initializeApp({
      projectId: projectId
    });
  }
} catch (e) {
  console.warn("Firebase Admin SDK initialize warning:", e);
}

function getFirestoreDb() {
  if (!adminApp) return null;
  const databaseId = firebaseConfigJson.firestoreDatabaseId;
  return databaseId ? getFirestore(adminApp, databaseId) : getFirestore(adminApp);
}

// 30-second cache for active approved user role/profile lookups
const userProfileCache = new Map<string, { data: any; expiresAt: number }>();
const USER_CACHE_TTL_MS = 30 * 1000;

async function getCachedUserProfile(
  uid: string,
  rawIdToken?: string,
  appCheckToken?: string
): Promise<any | null> {
  const cached = userProfileCache.get(uid);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const projectId = firebaseConfigJson.projectId || process.env.FIREBASE_PROJECT_ID;
  const databaseId = firebaseConfigJson.firestoreDatabaseId || "(default)";

  if (rawIdToken && projectId) {
    const res = await fetchUserProfileWithIdToken({
      uid,
      idToken: rawIdToken,
      projectId,
      databaseId,
      appCheckToken,
    });
    if (!res.exists || !res.data) {
      return null;
    }
    if (res.data.status === "Active" && res.data.role && res.data.role !== "Pending") {
      userProfileCache.set(uid, { data: res.data, expiresAt: now + USER_CACHE_TTL_MS });
    }
    return res.data;
  }

  const firestore = getFirestoreDb();
  if (!firestore) return null;
  const snap = await firestore.collection("users").doc(uid).get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data() || null;
  if (data && data.status === "Active" && data.role && data.role !== "Pending") {
    userProfileCache.set(uid, { data, expiresAt: now + USER_CACHE_TTL_MS });
  }
  return data;
}

// Real Firebase App Check Verification Middleware
async function verifyAppCheck(req: express.Request, res: express.Response, next: express.NextFunction) {
  const appCheckToken = req.header("X-Firebase-AppCheck");

  if (!appCheckToken) {
    if (process.env.ENFORCE_APP_CHECK === "true") {
      return res.status(401).json({ success: false, error: "unauthorized_app_check", message: "Missing X-Firebase-AppCheck header." });
    }
    return next();
  }

  if (adminApp) {
    try {
      const appCheckClaims = await getAppCheck(adminApp).verifyToken(appCheckToken);
      (req as any).appCheckClaims = appCheckClaims;
      return next();
    } catch (err: any) {
      console.warn("App Check token verification warning:", err.message);
      if (process.env.ENFORCE_APP_CHECK === "true") {
        return res.status(401).json({
          success: false,
          error: "invalid_app_check",
          message: "Invalid or expired App Check token."
        });
      }
      return next();
    }
  } else if (process.env.ENFORCE_APP_CHECK === "true") {
    return res.status(503).json({
      success: false,
      error: "app_check_unavailable",
      message: "Firebase Admin SDK is not initialized for App Check verification."
    });
  } else {
    return next();
  }
}

// Bearer Firebase ID Token verification middleware
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!adminApp) {
    return res.status(503).json({ success: false, error: "auth_unavailable", message: "Authentication service unavailable." });
  }
  const authHeader = req.header("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match || !match[1]) {
    return res.status(401).json({ success: false, error: "unauthorized", message: "Missing Bearer ID token." });
  }
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(match[1]);
    (req as any).authUser = {
      uid: decoded.uid,
      email: decoded.email || "",
      claims: decoded
    };
    (req as any).rawIdToken = match[1];
    return next();
  } catch {
    return res.status(401).json({ success: false, error: "invalid_token", message: "Invalid or expired authentication token." });
  }
}

// Require Active non-Pending user profile and fresh MFA claim for sensitive roles
async function requireActiveUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authUser = (req as any).authUser;
  if (!authUser?.uid) {
    return res.status(401).json({ success: false, error: "unauthorized" });
  }
  try {
    const profile = await getCachedUserProfile(
      authUser.uid,
      (req as any).rawIdToken,
      req.header("X-Firebase-AppCheck")
    );
    if (!profile || profile.status !== "Active" || !profile.role || profile.role === "Pending") {
      return res.status(403).json({ success: false, error: "user_not_active", message: "Account is not approved for this operation." });
    }
    if (MFA_ENFORCED && SENSITIVE_ROLES.has(profile.role)) {
      const mfaAt = Number(authUser.claims?.mfaAt || 0);
      if (!Number.isFinite(mfaAt) || mfaAt <= 0 || Date.now() - mfaAt > MFA_MAX_AGE_MS) {
        return res.status(403).json({ success: false, error: "mfa_required", message: "Fresh TOTP MFA verification required." });
      }
    }
    (req as any).userProfile = profile;
    return next();
  } catch (err) {
    console.error("Active user lookup error:", err);
    return res.status(503).json({ success: false, error: "user_lookup_failed" });
  }
}

// Sliding-window AI rate limiter (20 requests per 60s per uid or IP)
const aiRateWindowStore = new Map<string, number[]>();
const AI_RATE_LIMIT_MAX = 20;
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;

function aiRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = String((req as any).authUser?.uid || req.ip || "unknown");
  const now = Date.now();
  const timestamps = (aiRateWindowStore.get(key) || []).filter((ts) => now - ts < AI_RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= AI_RATE_LIMIT_MAX) {
    const oldest = timestamps[0] || now;
    res.setHeader("Retry-After", String(Math.ceil((AI_RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)));
    return res.status(429).json({
      success: false,
      error: "rate_limit_exceeded",
      message: "Too many AI requests. Please try again shortly."
    });
  }
  timestamps.push(now);
  aiRateWindowStore.set(key, timestamps);
  return next();
}

// Sliding-window MFA rate limiter (8 requests per 60s per uid or IP)
const mfaRateWindowStore = new Map<string, number[]>();
const MFA_RATE_LIMIT_MAX = 8;
const MFA_RATE_LIMIT_WINDOW_MS = 60 * 1000;

function mfaRateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = String((req as any).authUser?.uid || req.ip || "unknown");
  const now = Date.now();
  const timestamps = (mfaRateWindowStore.get(key) || []).filter((ts) => now - ts < MFA_RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MFA_RATE_LIMIT_MAX) {
    const oldest = timestamps[0] || now;
    res.setHeader("Retry-After", String(Math.ceil((MFA_RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)));
    return res.status(429).json({
      success: false,
      error: "rate_limit_exceeded",
      message: "Too many MFA requests. Please wait a minute and try again."
    });
  }
  timestamps.push(now);
  mfaRateWindowStore.set(key, timestamps);
  return next();
}

function encryptPayload(text: string) {
  if (!encryptionKeyBuffer) {
    throw new Error("ENCRYPTION_SECRET_KEY is not configured");
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKeyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag: authTag
  };
}

function decryptPayload(ciphertext: string, ivHex: string, tagHex: string) {
  if (!encryptionKeyBuffer) {
    throw new Error("ENCRYPTION_SECRET_KEY is not configured");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKeyBuffer,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const _filename = typeof __filename !== "undefined" ? __filename : "";
const _dirname = typeof __dirname !== "undefined" ? __dirname : process.cwd();

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Security headers middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // AI Studio runs Nginx on 8080 which proxies to port 3000.
  // We must bind to port 3000 (never 8080) to avoid EADDRINUSE collisions.
  const PORT = (process.env.PORT && process.env.PORT !== "8080") ? Number(process.env.PORT) : 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));

  // Helper to lazy-initialize Gemini client
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  const allowSimulatedAi =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_SIMULATED_AI === "true";

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // TOTP MFA Status Endpoint
  app.get("/api/security/mfa/status", verifyAppCheck, requireAuth, async (req, res) => {
    if (!mfaAvailable || !adminApp) {
      return res.status(503).json({
        success: false,
        error: "mfa_unavailable",
        message: "Server MFA service is not configured."
      });
    }
    const authUser = (req as any).authUser;
    const firestore = getFirestoreDb();
    if (!firestore) {
      return res.status(503).json({ success: false, error: "mfa_unavailable" });
    }
    try {
      const [userData, secretSnap] = await Promise.all([
        getCachedUserProfile(
          authUser.uid,
          (req as any).rawIdToken,
          req.header("X-Firebase-AppCheck")
        ),
        firestore.collection("mfa_secrets").doc(authUser.uid).get()
      ]);
      const role = userData?.role || "Pending";
      const required = MFA_ENFORCED && SENSITIVE_ROLES.has(role);
      const secretData = secretSnap.exists ? secretSnap.data() : null;
      const enrolled = Boolean(secretSnap.exists && secretData?.ciphertext && secretData?.confirmed === true);
      const rawMfaAt = Number(authUser.claims?.mfaAt || 0);
      const mfaAt = Number.isFinite(rawMfaAt) && rawMfaAt > 0 ? rawMfaAt : null;
      const verifiedRecently = Boolean(mfaAt && Date.now() - mfaAt <= MFA_MAX_AGE_MS);

      return res.json({
        success: true,
        enrolled,
        required,
        verifiedRecently,
        mfaAt
      });
    } catch (err) {
      console.error("MFA status error:", err);
      return res.status(500).json({ success: false, error: "mfa_status_failed" });
    }
  });

  // TOTP MFA Enrollment Endpoint
  app.post("/api/security/mfa/enroll", verifyAppCheck, requireAuth, mfaRateLimit, async (req, res) => {
    if (!mfaAvailable || !adminApp) {
      return res.status(503).json({
        success: false,
        error: "mfa_unavailable",
        message: "Server MFA encryption key is not configured."
      });
    }
    const authUser = (req as any).authUser;
    const firestore = getFirestoreDb();
    if (!firestore) {
      return res.status(503).json({ success: false, error: "mfa_unavailable" });
    }
    try {
      const secretDocRef = firestore.collection("mfa_secrets").doc(authUser.uid);
      const existingSnap = await secretDocRef.get();
      if (existingSnap.exists) {
        const existingData = existingSnap.data();
        if (existingData?.confirmed === true) {
          const mfaAt = Number(authUser.claims?.mfaAt || 0);
          const hasFreshMfa = Number.isFinite(mfaAt) && mfaAt > 0 && Date.now() - mfaAt <= MFA_MAX_AGE_MS;
          if (!hasFreshMfa) {
            return res.status(409).json({
              success: false,
              error: "mfa_already_enrolled",
              message: "An authenticator is already enrolled. Verify with your current code to reset it."
            });
          }
        } else if (existingData?.ciphertext && existingData?.iv && existingData?.tag) {
          try {
            const base32Secret = decryptPayload(existingData.ciphertext, existingData.iv, existingData.tag);
            const existingOtpSecret = Secret.fromBase32(base32Secret);
            const existingTotp = new TOTP({
              issuer: "Digital Construction ERP",
              label: authUser.email || authUser.uid,
              algorithm: "SHA1",
              digits: 6,
              period: 30,
              secret: existingOtpSecret
            });
            return res.json({
              success: true,
              otpauthUri: existingTotp.toString(),
              secret: existingOtpSecret.base32
            });
          } catch (decryptErr) {
            console.warn("Unconfirmed MFA secret could not be decrypted; generating a new secret:", decryptErr);
          }
        }
      }

      const secret = new Secret({ size: 20 });
      const totp = new TOTP({
        issuer: "Digital Construction ERP",
        label: authUser.email || authUser.uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret
      });
      const encrypted = encryptPayload(secret.base32);
      await secretDocRef.set({
        uid: authUser.uid,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        confirmed: false,
        updatedAt: new Date().toISOString()
      });
      return res.json({
        success: true,
        otpauthUri: totp.toString(),
        secret: secret.base32
      });
    } catch (err) {
      console.error("MFA enroll error:", err);
      return res.status(500).json({ success: false, error: "mfa_enroll_failed" });
    }
  });

  // TOTP MFA Verification Endpoint
  app.post("/api/security/mfa/verify", verifyAppCheck, requireAuth, mfaRateLimit, async (req, res) => {
    if (!mfaAvailable || !adminApp) {
      return res.status(503).json({
        success: false,
        error: "mfa_unavailable",
        message: "Server MFA service is not configured."
      });
    }
    const { code } = req.body || {};
    const cleanCode = String(code || "").trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        error: "invalid_code_format",
        message: "A 6-digit verification code is required."
      });
    }
    const authUser = (req as any).authUser;
    const firestore = getFirestoreDb();
    if (!firestore) {
      return res.status(503).json({ success: false, error: "mfa_unavailable" });
    }
    try {
      const secretDocRef = firestore.collection("mfa_secrets").doc(authUser.uid);
      const secretSnap = await secretDocRef.get();
      if (!secretSnap.exists) {
        return res.status(400).json({
          success: false,
          error: "mfa_not_enrolled",
          message: "MFA has not been enrolled for this account."
        });
      }
      const enc = secretSnap.data()!;
      const base32Secret = decryptPayload(enc.ciphertext, enc.iv, enc.tag);
      const otpSecret = Secret.fromBase32(base32Secret);
      const totp = new TOTP({
        issuer: "Digital Construction ERP",
        label: authUser.email || authUser.uid,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: otpSecret
      });
      const delta = totp.validate({ token: cleanCode, window: 1 });
      if (delta === null) {
        return res.status(401).json({
          success: false,
          error: "invalid_mfa_code",
          message: "Invalid or expired verification code."
        });
      }
      if (enc.confirmed !== true) {
        await secretDocRef.set(
          {
            confirmed: true,
            confirmedAt: new Date().toISOString()
          },
          { merge: true }
        );
      }
      const mfaAt = Date.now();
      const userRecord = await getAuth(adminApp).getUser(authUser.uid);
      await getAuth(adminApp).setCustomUserClaims(authUser.uid, {
        ...(userRecord.customClaims || {}),
        mfaAt
      });
      return res.json({
        success: true,
        mfaAt
      });
    } catch (err) {
      console.error("MFA verify error:", err);
      return res.status(500).json({ success: false, error: "mfa_verify_failed" });
    }
  });

  // AI Predictions Endpoint
  app.post("/api/ai/predict", verifyAppCheck, requireAuth, requireActiveUser, aiRateLimit, async (req, res) => {
    try {
      const { zones, teams, workers, evaluations, progressLogs, safetyLogs, qualitySnags } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        if (allowSimulatedAi) {
          const mockResult = generateMockPredictions(zones, teams, workers, evaluations, progressLogs);
          return res.json({
            success: true,
            simulated: true,
            data: mockResult
          });
        }
        return res.status(503).json({
          success: false,
          error: "ai_not_configured",
          message: "AI service is not configured."
        });
      }

      const prompt = `
You are an expert AI system specialized in OVID Real Estate Aluminum Formwork Attendance, Construction Planning, and Productivity Management.
Analyze the following project dataset and provide predictive analytics:

PROJECT DATASET:
- Active Zones: ${JSON.stringify(zones || [])}
- Teams: ${JSON.stringify(teams || [])}
- Workers: ${JSON.stringify(workers || [])}
- Recent Worker Evaluations: ${JSON.stringify(evaluations || [])}
- Daily Progress Logs: ${JSON.stringify(progressLogs || [])}
- Safety Checklist: ${JSON.stringify(safetyLogs || [])}
- Quality Snags: ${JSON.stringify(qualitySnags || [])}

Provide detailed predictions including:
1. Predicted project completion date (Assume project started 2026-06-01, current date is 2026-07-02. There are 20 total floors planned, currently on floor 4).
2. Predicted delayed zones (at risk of missing their cycle target).
3. Recommended manpower allocation: Identify which zones need help, and which team/workers to move.
4. Overtime hours requirements: Which trades (e.g. Carpenter, Stripper, Steel Fixer) should work overtime and how many hours, with detailed reasoning.
5. Identify low-performing workers: Flag workers who scored below 70 in recent daily evaluations, listing their ID, name, score, and constructive training/process suggestions.
6. A detailed Markdown weekly management report summarizing formwork cycle performance, safety, and quality.

Return a JSON object matching this schema exactly. Do NOT return markdown or wrapping outside of the raw JSON block.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictedCompletionDate: { 
                type: Type.STRING, 
                description: "Predicted completion date in YYYY-MM-DD format based on current cycle speeds." 
              },
              predictedDelayedZones: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    zoneId: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    riskLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                  },
                  required: ["zoneId", "reason", "riskLevel"]
                }
              },
              manpowerAllocationRecommendation: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    teamId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    currentZone: { type: Type.STRING },
                    recommendMoveToZone: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["teamId", "name", "currentZone", "recommendMoveToZone", "reason"]
                }
              },
              overtimeRequirements: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trade: { type: Type.STRING },
                    recommendedHours: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["trade", "recommendedHours", "reason"]
                }
              },
              lowPerformingWorkers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    workerId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    suggestions: { type: Type.STRING }
                  },
                  required: ["workerId", "name", "score", "suggestions"]
                }
              },
              weeklyManagementReport: { 
                type: Type.STRING, 
                description: "An exhaustive, formal Markdown report summarizing formwork progress, cycle compliance, safety compliance, and quality snags for OVID Real Estate Management." 
              }
            },
            required: [
              "predictedCompletionDate", 
              "predictedDelayedZones", 
              "manpowerAllocationRecommendation", 
              "overtimeRequirements", 
              "lowPerformingWorkers", 
              "weeklyManagementReport"
            ]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("Gemini API prediction failed:", error);
      res.status(502).json({
        success: false,
        error: "ai_request_failed",
        message: "AI prediction request failed."
      });
    }
  });

  // AI Financial Analysis & Fraud Detection Endpoint
  app.post("/api/finance/ai-analysis", verifyAppCheck, requireAuth, requireActiveUser, aiRateLimit, async (req, res) => {
    try {
      const { budgetData, expenseData, payrollData, procurementData, assetData, projectsData } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        if (allowSimulatedAi) {
          return res.json({
            success: true,
            simulated: true,
            data: {
              predictedExpensesNextMonth: 104500000,
              predictedCashFlow3Months: [
                { month: "Aug 2026", cashIn: 185000000, cashOut: 110000000, netCash: 75000000 },
                { month: "Sep 2026", cashIn: 195000000, cashOut: 115000000, netCash: 80000000 },
                { month: "Oct 2026", cashIn: 210000000, cashOut: 120000000, netCash: 90000000 }
              ],
              unusualSpendingAlerts: [
                { id: "ALERT-101", category: "Equipment Fuel", amount: 2400000, threshold: 1800000, riskLevel: "High", reason: "Fuel consumption spiked +33% on concrete pump truck CP-02 without corresponding cubic meter log increase." },
                { id: "ALERT-102", category: "Material Procurement", amount: 15400000, threshold: 12000000, riskLevel: "Medium", reason: "Rebar unit price from Ethio Steel Mills is 8% above Q2 market baseline." }
              ],
              payrollAnomalies: [
                { workerId: "W-104", name: "Abebe Kassaye", anomalyType: "Overtime Spike", description: "38 overtime hours logged in single week (exceeds 20h safety cap). Verified with Timekeeper Abebe Girma.", severity: "Warning" },
                { workerId: "W-209", name: "Tewodros Worku", anomalyType: "Duplicate Badge Entry", description: "Biometric clock-in recorded at Site B1 and Site A1 within 12 minutes.", severity: "Severe" }
              ],
              forecastCompletionCost: 362000000,
              recommendedBudgetAdjustments: [
                { fromCategory: "Overhead & Supervision", toCategory: "Material Concrete & Rebar", amount: 3500000, justification: "Overhead is running 12% under budget while concrete supplier prices increased 4%." },
                { fromCategory: "Equipment Leasing", toCategory: "Formwork Spare Accessories", amount: 1200000, justification: "Formwork pin replacement rate requires buffer funding before slab casting floor 8." }
              ],
              fraudRiskAlerts: [
                { riskType: "Split Purchase Orders", targetEntity: "PO-2026-881 & PO-2026-882", severity: "Medium", recommendation: "Two POs issued to same vendor under ETB 15M threshold within 48 hours. Recommend Head Office audit." }
              ],
              executiveSummaryMarkdown: "### Executive Financial Intelligence Summary\n- **Overall Fiscal Health**: **Strong / Low Default Risk** (CPI = 1.08, SPI = 1.04)\n- **Operating Margin**: 28.4% gross profit margin sustained across Bole Heights & Yeka Hills projects.\n- **Cash Flow Runway**: Projected net liquidity reserve exceeds ETB 245M through Q4 2026.\n- **Key Recommendation**: Approve recommended ETB 3.5M budget re-allocation from Overhead to Material buffer to lock in bulk cement discounts."
            }
          });
        }
        return res.status(503).json({
          success: false,
          error: "ai_not_configured",
          message: "AI service is not configured."
        });
      }

      const prompt = `
You are the Chief AI Financial Auditor & Predictive Economist for BuildSync Smart Construction ERP.
Analyze the following corporate financial dataset:
- Budgets: ${JSON.stringify(budgetData || [])}
- Expenses: ${JSON.stringify(expenseData || [])}
- Payroll Summaries: ${JSON.stringify(payrollData || [])}
- Procurement & Imports: ${JSON.stringify(procurementData || [])}
- Equipment & Assets: ${JSON.stringify(assetData || [])}
- Active Projects EVM: ${JSON.stringify(projectsData || [])}

Provide comprehensive financial forecasts and audit alerts:
1. Predict next month total company expenses (ETB).
2. Predict 3-month cash flow trajectory (Inflow, Outflow, Net).
3. Detect unusual spending anomalies and budget variances (>15%).
4. Detect payroll anomalies (suspicious overtime, duplicate entries).
5. Forecast total completion cost (EAC) across active projects.
6. Provide specific budget adjustment recommendations between cost categories.
7. Identify potential financial fraud risks (split POs, pricing deviations).
8. Write a concise Markdown Executive Summary for the CEO and Finance Manager.

Return a JSON object matching this schema exactly without markdown formatting around it:
{
  "predictedExpensesNextMonth": number,
  "predictedCashFlow3Months": [{"month": string, "cashIn": number, "cashOut": number, "netCash": number}],
  "unusualSpendingAlerts": [{"id": string, "category": string, "amount": number, "threshold": number, "riskLevel": string, "reason": string}],
  "payrollAnomalies": [{"workerId": string, "name": string, "anomalyType": string, "description": string, "severity": string}],
  "forecastCompletionCost": number,
  "recommendedBudgetAdjustments": [{"fromCategory": string, "toCategory": string, "amount": number, "justification": string}],
  "fraudRiskAlerts": [{"riskType": string, "targetEntity": string, "severity": string, "recommendation": string}],
  "executiveSummaryMarkdown": string
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("Gemini Finance AI analysis failed:", error);
      res.status(502).json({
        success: false,
        error: "ai_request_failed",
        message: "AI financial analysis failed."
      });
    }
  });

  // AI Safety Predictions Endpoint
  app.post("/api/ai/predict-safety", verifyAppCheck, requireAuth, requireActiveUser, aiRateLimit, async (req, res) => {
    try {
      const { safetyLogs, qualitySnags } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        if (allowSimulatedAi) {
          const mockResult = generateMockSafetyPredictions(safetyLogs || [], qualitySnags || []);
          return res.json({
            success: true,
            simulated: true,
            data: mockResult
          });
        }
        return res.status(503).json({
          success: false,
          error: "ai_not_configured",
          message: "AI service is not configured."
        });
      }

      const prompt = `
You are an expert AI Construction Safety Inspector and Risk Forecaster specialized in OVID Real Estate High-Rise Aluminum Formwork operations.
Analyze the following historical safety records, unsafe acts, unsafe conditions, and quality defects to predict safety hazards, identify precursor patterns, and provide proactive safety alerts:

SAFETY RECORDS:
- Historical Safety Logs: ${JSON.stringify(safetyLogs || [])}
- Quality Snags/Defects (which can lead to mechanical or physical failures): ${JSON.stringify(qualitySnags || [])}

Predictive Hazards Checklist & Structural Compliance:
1. Identify common precursor patterns to potential incidents (e.g., weather constraints, crew fatigue, repetitive unsafe acts like failing to hook harnesses, un-cleared staircases/debris, panel lifting/shifting risks).
2. Calculate a Safety Risk Score (0 to 100, where 100 is maximum hazard/critical risk) for each active zone, detailing the primary hazards and contributing factors.
3. Formulate targeted, proactive safety recommendations specifically labeled for Site Engineers or Supervisors.
4. Generate a highly professional Markdown formatted Safety Briefing for site leaders to use in upcoming Toolbox Talks.

Return a JSON object matching this schema exactly. Do NOT return markdown or wrapping outside of the raw JSON block.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallRiskScore: { type: Type.NUMBER, description: "Predicted overall project risk score from 0 (Safe) to 100 (Extremely Hazardous)." },
              overallRiskLevel: { type: Type.STRING, description: "Risk level: 'Low', 'Medium', or 'High'." },
              predictedRisksByZone: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    zoneId: { type: Type.STRING },
                    riskLevel: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                    riskScore: { type: Type.NUMBER },
                    primaryHazard: { type: Type.STRING },
                    contributingFactors: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  },
                  required: ["zoneId", "riskLevel", "riskScore", "primaryHazard", "contributingFactors"]
                }
              },
              identifiedPatterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    precursor: { type: Type.STRING },
                    incidentCorrelation: { type: Type.STRING },
                    severityPotential: { type: Type.STRING }
                  },
                  required: ["title", "precursor", "incidentCorrelation", "severityPotential"]
                }
              },
              proactiveRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    targetAudience: { type: Type.STRING, enum: ["Site Engineers", "Supervisors", "All Crews"] },
                    actionItem: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["Critical", "High", "Medium"] },
                    zoneOrActivity: { type: Type.STRING }
                  },
                  required: ["targetAudience", "actionItem", "priority", "zoneOrActivity"]
                }
              },
              weeklySafetyBriefingMarkdown: {
                type: Type.STRING,
                description: "An exhaustive, formal Markdown safety briefing guide for the next weekly cycle, focusing on the identified precursors."
              }
            },
            required: [
              "overallRiskScore",
              "overallRiskLevel",
              "predictedRisksByZone",
              "identifiedPatterns",
              "proactiveRecommendations",
              "weeklySafetyBriefingMarkdown"
            ]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("Gemini Safety prediction failed:", error);
      res.status(502).json({
        success: false,
        error: "ai_request_failed",
        message: "AI safety prediction failed."
      });
    }
  });

  // AI CAD Analysis Endpoint - Generates Automatic Work Plan and Daily Assessments
  app.post("/api/ai/analyze-cad", verifyAppCheck, requireAuth, requireActiveUser, aiRateLimit, async (req, res) => {
    const { filename, project, block, floor, zone } = req.body;
    try {
      const ai = getGeminiClient();

      if (!ai) {
        if (allowSimulatedAi) {
          const mockResult = generateMockCadAnalysis(filename || "drawing.dwg", project || "OVID Bole Heights", block || "Block A", floor || 4, zone || "Zone A");
          return res.json({
            success: true,
            simulated: true,
            data: mockResult
          });
        }
        return res.status(503).json({
          success: false,
          error: "ai_not_configured",
          message: "AI service is not configured."
        });
      }

      const prompt = `
You are an expert AI Construction planner, CAD Engineer, and Quality Inspector for OVID Real Estate Aluminum Formwork operations.
Analyze the following CAD drawing details to generate:
1. An automatic Zone Work Plan / construction schedule (የስራ እቅድ ማውጣት) specifying sequence phases, target days, recommended crew size, bill of material estimates, and critical path risks.
2. A Daily Assessment (ዕለታዊ ግምገማዎች) checklist verifying physical progress vs planned CAD template, quality alignment, plumbness check, pour readiness approval, and any deviations detected.

CAD DRAWING DETAILS:
- Filename: ${filename || "OVID_BH_FL04_ZONE_A_REV3.dwg"}
- Project: ${project || "OVID Bole Heights"}
- Block/Tower: ${block || "Block A"}
- Floor: Floor ${floor || 4}
- Zone/Sector: ${zone || "Zone A"}

The output must include both a detailed English representation and an elegant, technically sound Ethiopian Amharic translation for site engineers and local crew chiefs (e.g., using terms like 'የአልሙኒየም ፎርምወርክ ስራ እቅድ', 'የኮንክሪት ሙሌት ፍቃድ', 'የዞን እለታዊ ግምገማ').

Return a JSON object matching this schema exactly. Do NOT return markdown or wrapping outside of the raw JSON block.
`;

      let response;
      let attempts = 3;
      for (let i = 0; i < attempts; i++) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  workPlan: {
                    type: Type.OBJECT,
                    properties: {
                      zone: { type: Type.STRING },
                      targetDays: { type: Type.NUMBER },
                      totalPanelsRequired: { type: Type.NUMBER },
                      bom: {
                        type: Type.OBJECT,
                        properties: {
                          wallPanels: { type: Type.NUMBER },
                          beamPanels: { type: Type.NUMBER },
                          slabPanels: { type: Type.NUMBER },
                          propSupports: { type: Type.NUMBER },
                          accessories: { type: Type.NUMBER }
                        },
                        required: ["wallPanels", "beamPanels", "slabPanels", "propSupports", "accessories"]
                      },
                      recommendedCrewSize: { type: Type.NUMBER },
                      sequence: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            phase: { type: Type.STRING },
                            durationDays: { type: Type.NUMBER },
                            assignedTeam: { type: Type.STRING },
                            tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                          },
                          required: ["phase", "durationDays", "assignedTeam", "tasks"]
                        }
                      },
                      keyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
                      amharicVersion: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                          phases: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                phase: { type: Type.STRING },
                                assignedTeam: { type: Type.STRING },
                                tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                              },
                              required: ["phase", "assignedTeam", "tasks"]
                            }
                          },
                          criticalPath: { type: Type.STRING }
                        },
                        required: ["title", "description", "phases", "criticalPath"]
                      }
                    },
                    required: ["zone", "targetDays", "totalPanelsRequired", "bom", "recommendedCrewSize", "sequence", "keyRisks", "amharicVersion"]
                  },
                  dailyAssessment: {
                    type: Type.OBJECT,
                    properties: {
                      date: { type: Type.STRING },
                      cadComparisonScore: { type: Type.NUMBER },
                      plumbnessCheck: { type: Type.STRING },
                      pourReadyApproved: { type: Type.BOOLEAN },
                      pourReadyStatus: { type: Type.STRING },
                      deviationsDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
                      amharicVersion: {
                        type: Type.OBJECT,
                        properties: {
                          statusText: { type: Type.STRING },
                          deviationsText: { type: Type.STRING },
                          pourReadyText: { type: Type.STRING },
                          summary: { type: Type.STRING }
                        },
                        required: ["statusText", "deviationsText", "pourReadyText", "summary"]
                      }
                    },
                    required: ["date", "cadComparisonScore", "plumbnessCheck", "pourReadyApproved", "pourReadyStatus", "deviationsDetected", "amharicVersion"]
                  }
                },
                required: ["workPlan", "dailyAssessment"]
              }
            }
          });
          break; // successfully got response
        } catch (err) {
          if (i === attempts - 1) {
            throw err; // throw on last attempt
          }
          console.warn(`Gemini API call failed on attempt ${i + 1}. Retrying in 1s...`, err);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      const responseText = response.text || "{}";
      const resultData = JSON.parse(responseText.trim());

      // Enrich with guaranteed hyper-realistic detailed formwork components calculation
      if (resultData && resultData.workPlan) {
        const floorNum = floor ? Number(floor) : 4;
        const comps = getDetailedFormworkComponents(
          filename || "drawing.dwg",
          zone || "Zone A",
          floorNum
        );
        resultData.workPlan.formworkComponents = comps;
        const calculatedBom = calculateBomFromComponents(comps);
        resultData.workPlan.bom = calculatedBom;
        resultData.workPlan.totalPanelsRequired = calculatedBom.wallPanels + calculatedBom.beamPanels + calculatedBom.slabPanels;
      }

      res.json({
        success: true,
        simulated: false,
        data: resultData
      });

    } catch (error) {
      console.error("CAD Automatic analysis Gemini call failed:", error);
      if (allowSimulatedAi) {
        try {
          const fallbackResult = generateMockCadAnalysis(
            filename || "drawing.dwg",
            project || "OVID Bole Heights",
            block || "Block A",
            floor ? Number(floor) : 4,
            zone || "Zone A"
          );
          return res.json({
            success: true,
            simulated: true,
            data: fallbackResult,
            warning: "Simulated CAD analytics module used in development."
          });
        } catch {}
      }
      return res.status(502).json({
        success: false,
        error: "ai_request_failed",
        message: "AI CAD analysis request failed."
      });
    }
  });

  // Biometric Device Integration Connector (ZKTeco G3 Pro & MB360 Plus ADMS + Site Bridge)
  const { router: biometricConnectorRouter } = createBiometricConnectorRouter({
    verifyAppCheck,
    requireAuth,
    requireActiveUser,
    getSharedKey: () => process.env.BIOMETRIC_CONNECTOR_SHARED_KEY,
  });
  app.use(biometricConnectorRouter);

  // Serve static assets or mount Vite dev middleware
  const distPath = path.resolve(process.cwd(), "dist");
  const hasBuiltDist = fs.existsSync(path.join(distPath, "index.html"));
  const isDev = process.env.NODE_ENV === "development";

  if (hasBuiltDist && !isDev) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/iclock/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite dev server initialization notice:", err);
      if (hasBuiltDist) {
        app.use(express.static(distPath));
        app.get("*", (req, res, next) => {
          if (req.path.startsWith("/api/") || req.path.startsWith("/iclock/")) return next();
          res.sendFile(path.join(distPath, "index.html"));
        });
      }
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Digital Construction ERP System Server listening on port ${PORT}`);
  });
}

// Helper to generate hyper-realistic mock predictions when Gemini is offline / key is missing
function generateMockPredictions(zones: any[], teams: any[], workers: any[], evaluations: any[], progressLogs: any[]) {
  // Let's analyze dataset slightly
  const delayCount = zones ? zones.filter((z: any) => z.status === "Delayed" || z.completionPercentage < 60 && z.status === "In Progress").length : 2;
  const avgEvalScore = evaluations && evaluations.length > 0 
    ? Math.round(evaluations.reduce((acc: number, item: any) => acc + item.totalScore, 0) / evaluations.length)
    : 85;

  return {
    predictedCompletionDate: "2026-11-15",
    predictedDelayedZones: [
      {
        zoneId: "B1-F04-ZB",
        reason: `Zone B completion is currently at 55% after 5 days. Target is 6 days. Delayed beam assembly is causing downstream slab laying bottlenecks.`,
        riskLevel: "High"
      },
      {
        zoneId: "B1-F04-ZC",
        reason: `Not Started yet. Potential start delay due to slow panel shifting from Floor 3.`,
        riskLevel: "Medium"
      }
    ],
    manpowerAllocationRecommendation: [
      {
        teamId: "T-03",
        name: "Steel Fixing Team Gamma",
        currentZone: "Zone A (Floor 4)",
        recommendMoveToZone: "Zone B (Floor 4)",
        reason: "Zone A steel fixing is 100% finished. Moving them immediately to Zone B will accelerate structural locking before concrete casting."
      },
      {
        teamId: "T-05",
        name: "Support Team Epsilon",
        currentZone: "Floor Support",
        recommendMoveToZone: "Zone B panel transport",
        reason: "Moving support riggers to help transport stripped Floor 3 panels to Floor 4 will resolve the panel supply shortage in Zone B."
      }
    ],
    overtimeRequirements: [
      {
        trade: "Carpenter",
        recommendedHours: 2.5,
        reason: "Required for Assembly Team Alpha in Zone B to align wall profiles and avoid missing the concrete pour window planned for Friday."
      },
      {
        trade: "Stripper",
        recommendedHours: 1.5,
        reason: "Required to speed up the dismantling of secondary floor props from completed Floor 3 spaces, releasing critical panels to Floor 4."
      }
    ],
    lowPerformingWorkers: [
      {
        workerId: "OVID-W-108",
        name: "Mekonnen Haile",
        score: 66,
        suggestions: "Mekonnen had a low score in productivity and panel handling. Suggest shadowing him with Yosef (T-02) for 3 days to improve rapid layout techniques and safety clips locking."
      }
    ],
    weeklyManagementReport: `
# OVID REAL ESTATE – ALUMINUM FORMWORK CYCLE REPORT
## WEEK ENDING: JULY 2, 2026
### Prepared by: OVID Predictive Intelligence Engine

---

### 1. Executive Summary
During this weekly cycle, OVID Bole Heights Tower 1 showed moderate performance with an overall project completion rate of **68.2%**. The transition from Floor 3 to Floor 4 was successful, but cycle speed is threatened by structural delays on Floor 4, Zone B. 

*   **Total Floors Completed:** 3 / 20 (Floor 4 is currently 75% complete).
*   **Average Formwork Cycle Duration:** 6.4 Days (Target: 6.0 Days).
*   **Present Workforce Rate:** 88.9% (1 Late, 1 Absent, 1 on Leave).

---

### 2. Formwork Productivity Analytics
We analyzed aluminum panel assembly, stripping, and concrete ready rates.
*   **Zone A (Floor 4):** Highly efficient. Assembly took only 5 days. High-quality alignment (98% quality score) was verified, and concrete pour approval is secured.
*   **Zone B (Floor 4):** experiencing bottlenecking. Assembly is currently at 55%. Moving steel fixers from Zone A is highly recommended to recover lost target days.

---

### 3. Safety compliance & Toolbox Performance
*   **Toolbox Meeting Attendance:** 100% of present staff.
*   **PPE Compliance:** 95%. One scaffolding harness hook violation was noted and immediately addressed on Floor 4 scaffold rail.
*   **Near Misses:** 0 reported. 
*   **Safety Index:** 95/100 (Excellent).

---

### 4. Quality Audits & Defect Log
*   **Inspected Zones:** 2 (Zone A Approved, Zone B Pending).
*   **Open Snags:** 2 (Slab panel gap near elevator lift core; column concrete base slurry gap).
*   **Action Plan:** Snag corrections are assigned to Assembly Team Alpha. Repairs must complete prior to inspection sign-off scheduled for tomorrow afternoon.

---

### 5. AI Recommendations
1.  **Shift Resources:** Deploy 2 steel fixers from Assembly Team Gamma to Zone B immediately.
2.  **Approve Overtime:** Allocate 2.5 hours of carpenter overtime tonight to secure Friday morning concrete casting.
3.  **Targeted Mentorship:** Assign hands-on training to Mekonnen Haile (OVID-W-108) to improve joint lock assembly speeds.
`,
    generatedAt: new Date().toISOString()
  };
}

// Helper to generate realistic mock safety predictions when Gemini is offline
function generateMockSafetyPredictions(safetyLogs: any[], qualitySnags: any[]) {
  const hasUnsafeHarness = safetyLogs.some(log => 
    (log.unsafeActs && log.unsafeActs.some((act: string) => act.toLowerCase().includes("harness") || act.toLowerCase().includes("scaffold")))
  );
  const hasSlippery = safetyLogs.some(log => 
    (log.unsafeConditions && log.unsafeConditions.some((c: string) => c.toLowerCase().includes("slippery") || c.toLowerCase().includes("wet") || c.toLowerCase().includes("rain") || c.toLowerCase().includes("mud")))
  );
  const hasDebris = safetyLogs.some(log => 
    (log.unsafeConditions && log.unsafeConditions.some((c: string) => c.toLowerCase().includes("debris") || c.toLowerCase().includes("staircase") || c.toLowerCase().includes("clutter")))
  );
  const openPanelGap = qualitySnags.some(snag => snag.defectType === "Panel Gap" && snag.status !== "Resolved");

  const patterns = [];
  const recommendations = [];
  const zoneRisks = [];

  zoneRisks.push({
    zoneId: "B1-F04-ZB",
    riskLevel: hasSlippery || hasUnsafeHarness ? "High" : "Medium",
    riskScore: hasSlippery || hasUnsafeHarness ? 84 : 58,
    primaryHazard: "Elevation falls and manual panel handling slippage.",
    contributingFactors: [
      hasSlippery ? "Slippery slab conditions logged due to local rain moisture." : "Early morning fog and concrete floor plate condensation.",
      openPanelGap ? "Active unresolved Panel Gaps causing micro-alignment shifts." : "Shoring bracket spacing limits on wet-cured concrete deck.",
      "High wind forces affecting upper-level exterior scaffolding panels."
    ]
  });

  zoneRisks.push({
    zoneId: "B1-F04-ZA",
    riskLevel: "Low",
    riskScore: 24,
    primaryHazard: "Minor hand-trapping hazards during joint pinning.",
    contributingFactors: [
      "All major formwork snags resolved.",
      "Full Toolbox safety compliance verified.",
      "Safety score sustained at 95%."
    ]
  });

  if (hasUnsafeHarness) {
    patterns.push({
      title: "Scaffolding Outer Perimeter Bypass",
      precursor: "Workers failing to lock safety harness hooks on outer perimeter cantilever brackets.",
      incidentCorrelation: "High altitude fall hazard during early stripping hours.",
      severityPotential: "Critical (Life Safety Hazard)"
    });
    recommendations.push({
      targetAudience: "Supervisors" as const,
      actionItem: "Conduct a 100% active harness check prior to authorizing any scaffolding or bracket-mounting works. Terminate work for non-compliant crews.",
      priority: "Critical" as const,
      zoneOrActivity: "Outer Scaffolding Stripping"
    });
  } else {
    patterns.push({
      title: "Pinch Points in Wall-Formwork Pinning",
      precursor: "Rapid locking of wedge-and-pin connectors without proper impact gloves.",
      incidentCorrelation: "Crush injuries to hands and fingers during manual rapid alignment.",
      severityPotential: "Medium (First Aid Incident)"
    });
  }

  if (hasSlippery) {
    patterns.push({
      title: "Post-Rain Slab Friction Loss",
      precursor: "Wet concrete slab surfaces combined with loose aluminum panel dust.",
      incidentCorrelation: "Slips, trips, and falls during manual carrying of 2.4m heavy panels.",
      severityPotential: "High (Lost Time Injury)"
    });
    recommendations.push({
      targetAudience: "Site Engineers" as const,
      actionItem: "Order complete application of friction-inducing compound or sawdust across wet slabs before beginning any panel stripping or shifting operations.",
      priority: "High" as const,
      zoneOrActivity: "Wet Slab Area"
    });
  }

  if (hasDebris) {
    patterns.push({
      title: "Staircase Access Obstructions",
      precursor: "Stacking of wedge pins, bracing bars, and timber fillets on emergency escape stairs.",
      incidentCorrelation: "Tripping hazards and blocked egress channels during rapid evacuation alerts.",
      severityPotential: "Medium (Emergency Response Failure)"
    });
    recommendations.push({
      targetAudience: "Site Engineers" as const,
      actionItem: "Establish dedicated parts containment bins in every zone; clear staircase routes twice per shift.",
      priority: "Medium" as const,
      zoneOrActivity: "Emergency Egress Routes"
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      targetAudience: "Site Engineers" as const,
      actionItem: "Audit the verticality and dual-locking system of formwork prop pins on all loaded floor plates.",
      priority: "High" as const,
      zoneOrActivity: "Shoring & Prop Release"
    });
    recommendations.push({
      targetAudience: "Supervisors" as const,
      actionItem: "Mandate pre-shift inspect-and-replace protocols for all crane-lifting chains and tie-rod assemblies.",
      priority: "Medium" as const,
      zoneOrActivity: "Tower Crane Shifting"
    });
  }

  if (patterns.length < 2) {
    patterns.push({
      title: "Fatigue from Overtime Concrete Pours",
      precursor: "Consecutive late shifts for concrete crews followed by early morning formwork alignment.",
      incidentCorrelation: "Cognitive lapses leading to structural pins being missed or double-joint failures.",
      severityPotential: "High (Structural Failure)"
    });
  }

  return {
    overallRiskScore: hasSlippery || hasUnsafeHarness ? 78 : 42,
    overallRiskLevel: hasSlippery || hasUnsafeHarness ? "High" : "Medium",
    predictedRisksByZone: zoneRisks,
    identifiedPatterns: patterns,
    proactiveRecommendations: recommendations,
    weeklySafetyBriefingMarkdown: `
# OVID REAL ESTATE – PREDICTIVE HAZARD SECURITY BRIEFING
## SAFETY CAMPAIGN: PRECURSOR PATTERN IDENTIFICATION & MITIGATION

This briefing highlights active precursor risks identified across the Tower 1 layout.

### 1. Highlighted Critical Risks & Precursors
${hasUnsafeHarness ? `*   **Outer Scaffolding Fall Risk:** Harness hook bypass is a direct precursor to elevation hazards. Site Marshals must perform zero-tolerance safety audits on all perimeter cantilever work.` : "*   **High Elevation Work Safety:** Monitor all guardrail locks and perimeter bracing regularly."}
${hasSlippery ? `*   **Wet Surface Slip Risk:** Slippery floor plates on Floor 4 must be cleared of dust and moisture prior to any formwork manual carrying.` : "*   **Slab Moisture Awareness:** Ensure sawdust or non-slip pathways are maintained in active work zones."}
*   **Wedge-and-Pin Debris Accumulation:** Debris on slab pathways restricts sight lines and increases hand injury rates.

### 2. Mandatory Standard Operating Procedures (SOPs)
1.  **Dual-Signature Inspection:** No concrete pour is to be authorized without pre-pour structural inspection of wall and slab prop locks.
2.  **Access Clearance:** Keep all emergency escape routes 100% free of panel piles.
3.  **Toolbox Focus:** The next Toolbox meeting must address **"Pinch-Point Avoidance during High-Velocity Formwork Assembly"**.
`
  };
}

// Helper to calculate BOM from components list with exact sums to prevent discrepancies
function calculateBomFromComponents(components: any[]) {
  let wallCount = 0;
  let beamCount = 0;
  let slabCount = 0;
  let propCount = 0;
  let accessoryCount = 0;

  components.forEach((comp) => {
    const code = comp.code.toUpperCase();
    const name = comp.name.toLowerCase();
    
    if (
      ["AC", "I/C", "WS", "W", "WE", "KICKER", "KICKER IC"].includes(code) || 
      name.includes("wall") || 
      name.includes("kicker") ||
      code.startsWith("W")
    ) {
      wallCount += comp.quantity;
    } else if (["B", "BEAM IC", "BEAM BOTTOM", "END BEAM", "STAIR END BEAM", "MB"].includes(code) || name.includes("beam")) {
      beamCount += comp.quantity;
    } else if (["SC", "D", "SIA", "SCA", "SCU", "SOA", "DST", "DS"].includes(code) || name.includes("slab") || name.includes("decking")) {
      slabCount += comp.quantity;
    } else if (["PROPHEAD", "STD", "STPH"].includes(code) || name.includes("prop") || name.includes("support")) {
      propCount += comp.quantity;
    } else {
      accessoryCount += comp.quantity;
    }
  });

  return {
    wallPanels: wallCount,
    beamPanels: beamCount,
    slabPanels: slabCount,
    propSupports: propCount,
    accessories: accessoryCount || 320
  };
}

// Detailed formwork components generator including all 33+ types requested
function getDetailedFormworkComponents(filename: string, zone: string, floor: number) {
  let floorMultiplier = 1.0;
  if (floor === 1) floorMultiplier = 0.80;
  else if (floor === 2) floorMultiplier = 0.88;
  else if (floor === 3) floorMultiplier = 0.94;
  else if (floor === 4) floorMultiplier = 1.00;
  else if (floor === 5) floorMultiplier = 1.05;
  else floorMultiplier = 1.0 + (floor - 4) * 0.02;

  const componentsList = [
    // Specific Aluminum Wall Panels requested by the user
    { code: "W600", name: "W600 Standard Wall Panel", nameAmharic: "የግድግዳ ፓነል W600", size: "600x2450mm", baseQty: 35, unit: "pcs", purpose: "Standard high-capacity aluminum wall formwork panel." },
    { code: "W200", name: "W200 Narrow Wall Panel", nameAmharic: "የግድግዳ ፓነል W200", size: "200x2450mm", baseQty: 18, unit: "pcs", purpose: "Narrow filler wall panel for precision column connections." },
    { code: "W290", name: "W290 Filler Wall Panel", nameAmharic: "የግድግዳ ፓነል W290", size: "290x2450mm", baseQty: 12, unit: "pcs", purpose: "Custom-width modular wall panel for layout compliance." },
    { code: "W300", name: "W300 Standard Wall Panel", nameAmharic: "የግድግዳ ፓነል W300", size: "300x2450mm", baseQty: 24, unit: "pcs", purpose: "Mid-sized standard structural wall panel." },
    { code: "W250", name: "W250 Modular Wall Panel", nameAmharic: "የግድግዳ ፓነል W250", size: "250x2450mm", baseQty: 16, unit: "pcs", purpose: "Medium filler panel for room partitioning grids." },
    { code: "W100", name: "W100 Skinny Wall Panel", nameAmharic: "የግድግዳ ፓነል W100", size: "100x2450mm", baseQty: 10, unit: "pcs", purpose: "Ultra-narrow wall joint panel for tight tolerances." },
    { code: "W150", name: "W150 Joint Wall Panel", nameAmharic: "የግድግዳ ፓነል W150", size: "150x2450mm", baseQty: 12, unit: "pcs", purpose: "Narrow filler panel for custom room geometries." },
    { code: "W110", name: "W110 Micro Wall Panel", nameAmharic: "የግድግዳ ፓነል W110", size: "110x2450mm", baseQty: 8, unit: "pcs", purpose: "Micro filler wall panel for structural alignment." },
    { code: "W310", name: "W310 Precision Wall Panel", nameAmharic: "የግድግዳ ፓነል W310", size: "310x2450mm", baseQty: 14, unit: "pcs", purpose: "Precision intermediate wall formwork panel." },
    { code: "W400", name: "W400 Broad Wall Panel", nameAmharic: "የግድግዳ ፓነል W400", size: "400x2450mm", baseQty: 22, unit: "pcs", purpose: "Broad wall panel for high lateral pressure resistance." },
    { code: "W450", name: "W450 Wide Wall Panel", nameAmharic: "የግድግዳ ፓነል W450", size: "450x2450mm", baseQty: 28, unit: "pcs", purpose: "Wide structural partition panel for monolithic concrete." },
    { code: "W500", name: "W500 Large Wall Panel", nameAmharic: "የግድግዳ ፓነል W500", size: "500x2450mm", baseQty: 26, unit: "pcs", purpose: "Large wall panel optimizing assembly speed and crane-lifts." },
    { code: "W540", name: "W540 Custom Wall Panel", nameAmharic: "የግድግዳ ፓነል W540", size: "540x2450mm", baseQty: 15, unit: "pcs", purpose: "Specially calibrated wall formwork panel for shaft interiors." },
    { code: "W550", name: "W550 Broad Wall Panel", nameAmharic: "የግድግዳ ፓነል W550", size: "550x2450mm", baseQty: 16, unit: "pcs", purpose: "Wide modular shaft panel for elevator perimeter core." },
    { code: "W590", name: "W590 High-Clearance Panel", nameAmharic: "የግድግዳ ፓነል W590", size: "590x2400mm", baseQty: 18, unit: "pcs", purpose: "High-clearance aluminum wall panel for special floor plates." },

    // Additional standard formwork elements
    { code: "AC", name: "AC corner angle", nameAmharic: "ኤሲ የማዕዘን ቅንፍ", size: "100x100x2700mm", baseQty: 18, unit: "pcs", purpose: "Connects vertical wall panels at external 90-degree corners." },
    { code: "I/C", name: "I/C inner corner angle", nameAmharic: "የውስጥ ማዕዘን አንግል (I/C)", size: "150x150x2700mm", baseQty: 24, unit: "pcs", purpose: "Connects vertical wall panels at internal 90-degree corners." },
    { code: "WE", name: "WE wall end", nameAmharic: "የግድግዳ መጨረሻ ፓነል (WE)", size: "200x2700mm", baseQty: 12, unit: "pcs", purpose: "Used at the termination points of structural walls." },
    { code: "B", name: "B beam", nameAmharic: "የቢም ፓነል (B)", size: "400x1200mm", baseQty: 28, unit: "pcs", purpose: "Standard panel for beam side formwork." },
    { code: "Beam IC", name: "Beam IC", nameAmharic: "የቢም የውስጥ ማዕዘን (Beam IC)", size: "150x150x1200mm", baseQty: 16, unit: "pcs", purpose: "Inner corner connector for beam intersections." },
    { code: "Beam bottom", name: "Beam bottom", nameAmharic: "የቢም ታችኛው ክፍል (Beam Bottom)", size: "300x1200mm", baseQty: 18, unit: "pcs", purpose: "Soffit panel to support the underside of structural beams." },
    { code: "End beam", name: "End beam", nameAmharic: "የቢም ጫፍ ፓነል (End Beam)", size: "200x1200mm", baseQty: 10, unit: "pcs", purpose: "Soffit termination panel for beam endings." },
    { code: "SC", name: "SC slab corner", nameAmharic: "የሰሌዳ ማዕዘን (SC)", size: "150x150mm", baseQty: 32, unit: "pcs", purpose: "Corner transition piece between wall and slab decking." },
    { code: "D", name: "D slab", nameAmharic: "የሰሌዳ ፎቅ ፓነል (D)", size: "400x1100mm", baseQty: 96, unit: "pcs", purpose: "Horizontal decking panel for floor slabs." },
    { code: "Kicker", name: "Kicker", nameAmharic: "ኪከር ፓነል", size: "100x1200mm", baseQty: 20, unit: "pcs", purpose: "Starter formwork piece for the next vertical pour level." },
    { code: "Stair down", name: "Stair down", nameAmharic: "የደረጃ መውረጃ ፓነል", size: "300x1000mm", baseQty: 4, unit: "pcs", purpose: "Downward sloping side board for staircase formwork." },
    { code: "Stair up", name: "Stair up", nameAmharic: "የደረጃ መውጫ ፓነል", size: "300x1000mm", baseQty: 4, unit: "pcs", purpose: "Upward sloping side board for staircase formwork." },
    { code: "Prophead", name: "Prophead", nameAmharic: "የድጋፍ ጭንቅላት (Prophead)", size: "150x150mm", baseQty: 45, unit: "pcs", purpose: "Telescopic prop cap ensuring secure slab beam load bearing." },
    { code: "Kicker IC", name: "Kicker IC", nameAmharic: "የኪከር የውስጥ ማዕዘን (Kicker IC)", size: "100x100x1200mm", baseQty: 8, unit: "pcs", purpose: "Internal corner transition piece for kicker starters." },
    { code: "Stair side sponda", name: "Stair side sponda", nameAmharic: "የደረጃ ጎን ስፖንዳ (Sponda)", size: "250x1200mm", baseQty: 6, unit: "pcs", purpose: "Staircase edge profile or side containment barrier." },
    { code: "Stair kicker", name: "Stair kicker", nameAmharic: "የደረጃ ኪከር", size: "100x1000mm", baseQty: 8, unit: "pcs", purpose: "Starter formwork for the lower landing of stairs." },
    { code: "Gun", name: "Gun", nameAmharic: "የደረጃ ጉን ፓነል (Gun Panel)", size: "150x1200mm", baseQty: 6, unit: "pcs", purpose: "Specially shaped diagonal connector panel for stairs." },
    { code: "Stair IC", name: "Stair IC", nameAmharic: "የደረጃ የውስጥ ማዕዘን (Stair IC)", size: "120x120mm", baseQty: 8, unit: "pcs", purpose: "Inner corner connection for stairs landings and steps." },
    { code: "Trade", name: "Trade", nameAmharic: "የደረጃ መርገጫ (Tread)", size: "300x1200mm", baseQty: 10, unit: "pcs", purpose: "Horizontal tread formwork for individual stairs." },
    { code: "Riser", name: "Riser", nameAmharic: "የደረጃ መወጣጫ (Riser)", size: "150x1200mm", baseQty: 10, unit: "pcs", purpose: "Vertical riser panel for individual steps in stairs." },
    { code: "SIA", name: "SIA", nameAmharic: "ኤስ-አይ-ኤ የማዕዘን ፓነል (SIA)", size: "150x1200mm", baseQty: 12, unit: "pcs", purpose: "Slab inner angle profile piece." },
    { code: "SCA", name: "SCA", nameAmharic: "ኤስ-ሲ-ኤ ማዕዘን (SCA)", size: "150x150x1200mm", baseQty: 14, unit: "pcs", purpose: "Slab corner angle alignment bracket." },
    { code: "Stair slab", name: "Stair slab", nameAmharic: "የደረጃ ሰሌዳ ፓነል (Stair Slab)", size: "400x1200mm", baseQty: 12, unit: "pcs", purpose: "Slanted horizontal panel supporting stair flights." },
    { code: "Stair end beam", name: "Stair end beam", nameAmharic: "የደረጃ መጨረሻ ቢም", size: "300x1200mm", baseQty: 4, unit: "pcs", purpose: "Support beam panel specifically for stair landings." },
    { code: "MB", name: "MB", nameAmharic: "ኤም-ቢ መካከለኛ ድጋፍ ቢም (MB)", size: "150x1200mm", baseQty: 18, unit: "pcs", purpose: "Middle support beam runner for horizontal slab panels." },
    { code: "SCU", name: "SCU", nameAmharic: "ኤስ-ሲ-ዩ የሰሌዳ ማዕዘን (SCU)", size: "150x150x150mm", baseQty: 8, unit: "pcs", purpose: "Special multi-directional slab corner union panel." },
    { code: "SOA", name: "SOA", nameAmharic: "ኤስ-ኦ-ኤ የውጭ አንግል (SOA)", size: "150x1200mm", baseQty: 12, unit: "pcs", purpose: "Slab outer angle perimeter closure piece." },
    { code: "DST", name: "DST", nameAmharic: "ዲ-ኤስ-ቲ የሰሌዳ መለወጫ (DST)", size: "200x1200mm", baseQty: 10, unit: "pcs", purpose: "Deck slab transition piece for level adjustments." },
    { code: "DS", name: "DS", nameAmharic: "ዲ-ኤስ የሰሌዳ ማያያዣ (DS)", size: "100x1200mm", baseQty: 24, unit: "pcs", purpose: "Deck strip connector used between standard slab panels." },
    { code: "STD", name: "STD", nameAmharic: "ኤስ-ቲ-ዲ የደረጃ መወጣጫ ድጋፍ (STD)", size: "150x150x1500mm", baseQty: 6, unit: "pcs", purpose: "Staircase truss or landing vertical support brace." },
    { code: "STPH", name: "STPH", nameAmharic: "ኤስ-ቲ-ፒ-ኤች የደረጃ ድጋፍ ራስ (STPH)", size: "150x150mm", baseQty: 6, unit: "pcs", purpose: "Prop head attachment for heavy staircase load support." }
  ];

  return componentsList.map((comp) => {
    const zoneA = Math.max(1, Math.round(comp.baseQty * floorMultiplier * 1.15));
    const zoneB = Math.max(1, Math.round(comp.baseQty * floorMultiplier * 0.95));
    const zoneC = Math.max(1, Math.round(comp.baseQty * floorMultiplier * 0.75));

    let quantity = zoneA;
    const lowerZone = zone.toLowerCase();
    if (lowerZone.includes("zone b") || lowerZone.includes("zb") || lowerZone.includes("sector 2")) {
      quantity = zoneB;
    } else if (lowerZone.includes("zone c") || lowerZone.includes("zc") || lowerZone.includes("sector 3")) {
      quantity = zoneC;
    }

    return {
      code: comp.code,
      name: comp.name,
      nameAmharic: comp.nameAmharic,
      size: comp.size,
      quantity,
      zoneBreakdown: {
        zoneA,
        zoneB,
        zoneC
      },
      unit: comp.unit,
      purpose: comp.purpose
    };
  });
}

// Helper to generate hyper-realistic automatic CAD work planning and daily assessments
function generateMockCadAnalysis(filename: string, project: string, block: string, floor: number, zone: string) {
  const components = getDetailedFormworkComponents(filename, zone, floor);
  const bom = calculateBomFromComponents(components);
  const totalPanels = bom.wallPanels + bom.beamPanels + bom.slabPanels;

  // Tailor crew size based on zone
  const isZoneA = zone.includes("Zone A");
  const isZoneB = zone.includes("Zone B");

  return {
    workPlan: {
      zone: zone,
      targetDays: 6,
      totalPanelsRequired: totalPanels,
      bom: bom,
      formworkComponents: components,
      recommendedCrewSize: isZoneA ? 12 : 10,
      sequence: [
        {
          phase: "Formwork Assembly",
          durationDays: 2,
          assignedTeam: "Carpenter Team Alpha (T-01)",
          tasks: ["Erect vertical wall panels according to CAD layer X-W1", "Lock wall corners using OVID standard external corner brackets", "Install tie-rods and PVC sleeve spacers"]
        },
        {
          phase: "Shoring & Leveling",
          durationDays: 1,
          assignedTeam: "Support Team Epsilon (T-05)",
          tasks: ["Erect vertical telescopic prop supports at 1200mm grid intervals", "Install beam soffit runners and locking pins", "Verify base leveling screws are fully locked and bearing load"]
        },
        {
          phase: "Slab Decking & Steel Lock",
          durationDays: 1.5,
          assignedTeam: "Assembly Team Alpha (T-01) & Steel Fixing Team Gamma (T-03)",
          tasks: ["Lay horizontal aluminum slab decking panels (Standard 1200x600)", "Apply water-soluble form release oil", "Lay rebar mesh and wire-lock double bottom joints"]
        },
        {
          phase: "Inspection & Concrete Pour",
          durationDays: 1.5,
          assignedTeam: "Quality Control Inspectors & Concrete Casting Team Delta (T-04)",
          tasks: ["Laser inspect vertical plumbness and slab flatness", "Perform pre-pour compliance audit sign-off", "Execute concrete casting, apply mechanical needle vibrators"]
        }
      ],
      keyRisks: [
        "Slab decking joints in inner lift core zone are tight; monitor panels cutting offsets closely.",
        "Vertical plumbing drift can exceed +/- 2mm limit if wall-bracing props are not locked before steel fixing."
      ],
      amharicVersion: {
        title: `አውቶማቲክ የዞን የስራ እቅድ - ${zone} (ፎቅ ${floor})`,
        description: `የአልሙኒየም ፎርምወርክ ቁሶችን በካድ ስዕል (${filename}) መሰረት አሰላልፎ ለመስራት የተዘጋጀ የ6 ቀን ሳይክል እቅድ።`,
        phases: [
          {
            phase: "የፎርምወርክ መገጣጠም (Wall Assembly)",
            assignedTeam: "የአናፂዎች ቡድን አልፋ (ቲ-01)",
            tasks: ["በካድ ድንጋጌ መሰረት ቀጥተኛ ግድግዳዎችን ማቆም", "የማዕዘን ፓነሎችን በOVID መደበኛ ቅንፍ መቆለፍ", "የታይ-ሮድ እና የፒቪሲ ቱቦዎችን መግጠም"]
          },
          {
            phase: "የድጋፍ ምሰሶዎች አሰላለፍ (Shoring & Leveling)",
            assignedTeam: "የእርዳታ ሪገሮች ቡድን ኤፕሲሎን (ቲ-05)",
            tasks: ["በየ 1200 ሚሜ ልዩነት የቴሌስኮፒክ ድጋፍ ምሰሶዎችን ማቆም", "የቢም ሶፊት ድጋፎችን መቆለፍ", "የታችኛው ማስተካከያ ብሎኖች በአግባቡ መታሰራቸውን ማረጋገጥ"]
          },
          {
            phase: "የፎቅ ሰሌዳ እና የብረት ስራ (Slab Decking & Steel)",
            assignedTeam: "የአናፂዎች ቡድን አልፋ (ቲ-01) እና የብረታብረት ቡድን ጋማ (ቲ-03)",
            tasks: ["የአልሙኒየም ፎቅ ሰሌዳዎችን (1200x600) በስርዓቱ መዘርጋት", "የፓነል ዘይት በእኩል መጠን መቀባት", "ባለ ሁለት ፎቅ የብረት መረብ ማንጠፍና ማሰር"]
          },
          {
            phase: "ቁጥጥር እና የኮንክሪት ሙሌት (Inspection & Pouring)",
            assignedTeam: "የጥራት ቁጥጥር መሃንዲሶች እና የኮንክሪት ቡድን ዴልታ (ቲ-04)",
            tasks: ["በሌዘር ቀጥተኝነትን እና የሰሌዳ ደረጃን መለካት", "ቅድመ-ኮንክሪት የፍቃድ ሰነድ መፈረም", "ኮንክሪት መሙላት እና በቫይብሬተር ማደቅዘዝ"]
          }
        ],
        criticalPath: `ማሳሰቢያ፦ በማዕከላዊ ሊፍት ኮር ዞን ውስጥ ያሉት መገጣጠሚያዎች ጠባብ በመሆናቸው የፓነል ቁርጥራጮችን በጥንቃቄ መከታተል ያስፈልጋል።`
      }
    },
    dailyAssessment: {
      date: new Date().toISOString().split("T")[0],
      cadComparisonScore: isZoneA ? 97 : isZoneB ? 94 : 91,
      plumbnessCheck: "Within Spec (+/- 1.5mm) - Inspected with Leica Laser Level",
      pourReadyApproved: isZoneA || isZoneB,
      pourReadyStatus: isZoneA || isZoneB ? "APPROVED FOR CASTING" : "HOLD - Adjust Prop Leveling",
      deviationsDetected: isZoneA 
        ? ["No critical visual deviation found versus template revision.", "Plumbness is fully stable."]
        : ["Beam outer profile shows 2.2mm horizontal shift on Axis C.", "Add 1 additional support prop under Axis C-4 runner before concrete cast."],
      amharicVersion: {
        statusText: isZoneA || isZoneB ? "ኮንክሪት ለመሙላት የተፈቀደ (Approved)" : "የታገደ - ማስተካከያ ይፈልጋል (Hold)",
        deviationsText: isZoneA 
          ? "ምንም አይነት ወሳኝ የልዩነት ጉድለት አልተገኘም። ቀጥተኝነት አስተማማኝ ነው።" 
          : "የቢም የውጨኛው አካል በዘንግ C ላይ የ 2.2 ሚሜ አግድም መዛባት ያሳያል። ኮንክሪት ከመሞላቱ በፊት በዘንግ C-4 ስር ተጨማሪ 1 ድጋፍ ይጫኑ።",
        pourReadyText: isZoneA || isZoneB ? "የኮንክሪት ሙሌት ፍቃድ፡ ተሰጥቷል" : "የኮንክሪት ሙሌት ፍቃድ፡ አልተሰጠም (ለጊዜው የታገደ)",
        summary: `በካድ ስዕል እና በእውነተኛው የጣቢያ ፎቶግራፍ መካከል የተደረገው የንፅፅር ውጤት የ ${isZoneA ? '97%' : '94%'} ተመሳሳይነት አሳይቷል።`
      }
    }
  };
}

startServer();
