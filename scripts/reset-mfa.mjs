#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg || !emailArg.includes("@")) {
    console.error("Usage: node scripts/reset-mfa.mjs <user-email>");
    process.exit(1);
  }
  const email = emailArg.trim().toLowerCase();

  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("Missing firebase-applet-config.json in workspace root.");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const projectId = config.projectId || process.env.FIREBASE_PROJECT_ID;
  const databaseId = config.firestoreDatabaseId;

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: applicationDefault(),
          projectId,
        });

  const auth = getAuth(app);
  const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  const now = new Date().toISOString();

  await db.collection("mfa_secrets").doc(uid).delete();

  const nextClaims = { ...(userRecord.customClaims || {}) };
  delete nextClaims.mfaAt;
  await auth.setCustomUserClaims(uid, nextClaims);

  await auth.revokeRefreshTokens(uid);

  const auditId = `AUD-RESET-MFA-${Date.now()}`;
  await db
    .collection("auditLogs")
    .doc(auditId)
    .set({
      id: auditId,
      timestamp: now,
      userId: uid,
      userName: userRecord.displayName || email,
      role: nextClaims.role || "User",
      action: "Reset MFA",
      details: `Reset TOTP MFA secret, cleared mfaAt claim, and revoked refresh tokens for ${email} (uid: ${uid}).`,
    });

  console.log(
    `Successfully reset MFA for ${email} (uid: ${uid}): deleted mfa_secrets/${uid}, removed mfaAt claim, revoked refresh tokens, and logged audit entry ${auditId}.`
  );
}

main().catch((err) => {
  console.error("MFA reset failed:", err);
  process.exit(1);
});
