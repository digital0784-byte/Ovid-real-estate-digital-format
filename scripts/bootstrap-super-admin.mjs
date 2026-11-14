#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg || !emailArg.includes("@")) {
    console.error("Usage: node scripts/bootstrap-super-admin.mjs <user-email>");
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

  const app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId });
  const auth = getAuth(app);
  const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

  // Check if an active Super Admin already exists
  const existingAdminsSnap = await db
    .collection("users")
    .where("role", "==", "Super Admin")
    .where("status", "==", "Active")
    .get();

  if (!existingAdminsSnap.empty && process.env.FORCE !== "1") {
    console.error(
      `Refusing bootstrap: ${existingAdminsSnap.size} active Super Admin account(s) already exist. Re-run with FORCE=1 to override.`
    );
    process.exit(1);
  }

  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;
  const now = new Date().toISOString();

  await auth.setCustomUserClaims(uid, {
    ...(userRecord.customClaims || {}),
    role: "Super Admin",
  });

  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        id: uid,
        uid,
        email,
        displayName: userRecord.displayName || "Super Admin",
        name: userRecord.displayName || "Super Admin",
        role: "Super Admin",
        requestedRole: "Super Admin",
        status: "Active",
        approvedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  const auditId = `AUD-BOOTSTRAP-${Date.now()}`;
  await db
    .collection("auditLogs")
    .doc(auditId)
    .set({
      id: auditId,
      timestamp: now,
      userId: uid,
      userName: userRecord.displayName || email,
      role: "Super Admin",
      action: "Bootstrap Super Admin",
      details: `Promoted ${email} (uid: ${uid}) to Super Admin via CLI bootstrap.`,
    });

  console.log(`Successfully bootstrapped Super Admin: ${email} (uid: ${uid})`);
}

main().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});
