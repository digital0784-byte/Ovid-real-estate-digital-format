#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const LEGACY_STORE_OWNER_ROLES = new Set([
  "Store Owner",
  "Site Store Owner",
  "store_owner",
  "site_store_owner",
]);

async function main() {
  const apply = process.env.APPLY === "1";

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

  const usersSnap = await db.collection("users").get();
  const candidates = [];

  usersSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    if (
      LEGACY_STORE_OWNER_ROLES.has(String(data.role || "")) ||
      LEGACY_STORE_OWNER_ROLES.has(String(data.requestedRole || ""))
    ) {
      candidates.push({
        uid: data.uid || docSnap.id,
        docId: docSnap.id,
        email: data.email || "",
        displayName: data.displayName || data.name || "",
        role: data.role || "",
        requestedRole: data.requestedRole || "",
        status: data.status || "",
      });
    }
  });

  if (candidates.length === 0) {
    console.log("No users found with legacy 'Store Owner' / 'Site Store Owner' role. Nothing to migrate.");
    return;
  }

  console.log(
    `${apply ? "[APPLY]" : "[DRY RUN]"} Found ${candidates.length} user(s) with legacy Store Owner role:`
  );
  candidates.forEach((u) => {
    console.log(
      `  - uid=${u.uid} email=${u.email || "(none)"} role=${u.role} requestedRole=${u.requestedRole} status=${u.status}`
    );
  });

  if (!apply) {
    console.log("\nDry run complete. Re-run with APPLY=1 to migrate these accounts to 'Site Manager'.");
    return;
  }

  const now = new Date().toISOString();
  const migratedUids = [];

  for (const user of candidates) {
    const updatePayload = { updatedAt: now };
    if (LEGACY_STORE_OWNER_ROLES.has(String(user.role || ""))) {
      updatePayload.role = "Site Manager";
    }
    if (LEGACY_STORE_OWNER_ROLES.has(String(user.requestedRole || ""))) {
      updatePayload.requestedRole = "Site Manager";
    }

    await db.collection("users").doc(user.docId).set(updatePayload, { merge: true });

    try {
      const authRecord = await auth.getUser(user.uid);
      const existingClaims = authRecord.customClaims || {};
      if (
        LEGACY_STORE_OWNER_ROLES.has(String(user.role || "")) ||
        LEGACY_STORE_OWNER_ROLES.has(String(existingClaims.role || ""))
      ) {
        await auth.setCustomUserClaims(user.uid, {
          ...existingClaims,
          role: "Site Manager",
        });
      }
      await auth.revokeRefreshTokens(user.uid);
    } catch (authErr) {
      console.warn(
        `Warning: Updated Firestore user ${user.uid}, but Auth claim/token update failed: ${
          authErr?.message || authErr
        }`
      );
    }

    migratedUids.push(user.uid);
    console.log(`Migrated ${user.email || user.uid} (uid: ${user.uid}) -> Site Manager`);
  }

  const auditId = `AUD-MIGRATE-SM-${Date.now()}`;
  await db
    .collection("auditLogs")
    .doc(auditId)
    .set({
      id: auditId,
      timestamp: now,
      userId: "CLI-MIGRATION",
      userName: "Migration Script",
      role: "Super Admin",
      action: "Migrate Store Owner Role to Site Manager",
      details: `Migrated ${migratedUids.length} account(s) from legacy Store Owner role to 'Site Manager': ${migratedUids.join(", ")}`,
    });

  console.log(`\nMigration complete. Updated ${migratedUids.length} user(s) and logged ${auditId}.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
