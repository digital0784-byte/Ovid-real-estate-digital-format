import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfigJson from "../../firebase-applet-config.json";

const app = admin.initializeApp();
const databaseId = firebaseConfigJson.firestoreDatabaseId;
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

/**
 * 1. Firebase Authentication: On User Creation Trigger
 * Assigns default custom claims (roles) and provisions user documents in Firestore.
 */
export const onUserSignUp = functions.auth.user().onCreate(async (user) => {
  const email = (user.email || "").toLowerCase().trim();
  // Security Policy: Every new sign-up gets role "Pending" / no privileged role by default.
  // Role promotion must be granted via the setUserRole callable function by a Super Admin or HR Manager.
  const role = "Pending";

  // Set Firebase Auth custom user claims for secure token-based gatekeeping
  await admin.auth().setCustomUserClaims(user.uid, { role });

  // Provision corresponding User document in Firestore
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email?.split("@")[0] || "OVID Employee",
    phoneNumber: user.phoneNumber || "",
    role: role,
    status: "Pending",
    createdAt: new Date().toISOString(),
    photoURL: user.photoURL || ""
  });

  // Append entry to Audit Log
  const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.collection("auditLogs").doc(logId).set({
    id: logId,
    timestamp: new Date().toISOString(),
    userId: "SYSTEM_TRIGGER",
    userName: "Authentication Engine",
    role: "System",
    action: "User Auth Profile Auto-Provisioned",
    details: `Created record for user ${email}. Assigned default role: Pending. Awaiting admin approval.`
  });
});

/**
 * 2. Authenticated Role Assignment Callable
 * Only an existing Super Admin or HR Manager can promote/change a user's role.
 * Checks context.auth's custom claims before applying changes.
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to assign roles.");
  }

  const callerUid = context.auth.uid;
  const callerClaimRole = context.auth.token?.role;

  // Verify caller's role from custom claims or Firestore doc
  const callerUserDoc = await db.collection("users").doc(callerUid).get();
  const callerDocRole = callerUserDoc.data()?.role;

  const isSuperAdmin = callerClaimRole === "Super Admin" || callerDocRole === "Super Admin";
  const isHRManager = callerClaimRole === "HR Manager" || callerDocRole === "HR Manager";

  if (!isSuperAdmin && !isHRManager) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only Super Admin or HR Manager can promote or update user roles."
    );
  }

  const { targetUid, newRole } = data;
  if (!targetUid || typeof targetUid !== "string" || !newRole || typeof newRole !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Missing required arguments: targetUid and newRole.");
  }

  // Set custom user claims in Firebase Auth
  await admin.auth().setCustomUserClaims(targetUid, { role: newRole });

  // Update user document in Firestore
  await db.collection("users").doc(targetUid).update({
    role: newRole,
    status: "Active",
    updatedAt: new Date().toISOString(),
    updatedBy: callerUid
  });

  // Append entry to Audit Log
  const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.collection("auditLogs").doc(logId).set({
    id: logId,
    timestamp: new Date().toISOString(),
    userId: callerUid,
    userName: callerUserDoc.data()?.displayName || "Admin",
    role: callerClaimRole || callerDocRole || "Admin",
    action: "User Role Promoted",
    details: `Assigned role '${newRole}' to user UID ${targetUid}.`
  });

  return { success: true, targetUid, newRole };
});

/**
 * 2. Real-time Attendance Aggregation Trigger
 * Automatically aggregates daily site attendance counts, active counts, and updates dashboards.
 */
const attendanceTrigger = databaseId
  ? functions.firestore.database(databaseId).document("attendance/{attendanceId}")
  : functions.firestore.document("attendance/{attendanceId}");

export const onAttendanceLogged = attendanceTrigger
  .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data) return;

    const date = data.date; // YYYY-MM-DD
    const siteId = data.siteId || "site_bole_heights";

    const dailySummaryRef = db.collection("attendanceSummaries").doc(`${siteId}_${date}`);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(dailySummaryRef);
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      if (doc.exists) {
        const stats = doc.data() || {};
        presentCount = stats.presentCount || 0;
        lateCount = stats.lateCount || 0;
        absentCount = stats.absentCount || 0;
      }

      if (data.status === "Present") {
        presentCount += 1;
      } else if (data.status === "Late") {
        lateCount += 1;
      } else if (data.status === "Absent") {
        absentCount += 1;
      }

      transaction.set(dailySummaryRef, {
        siteId,
        date,
        presentCount,
        lateCount,
        absentCount,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    });
  });

/**
 * 3. Payroll Calculation & Validation HTTP Trigger
 * Recalculates salary, overtime, and deductions based on secure database records.
 */
export const calculateEmployeePayroll = functions.https.onCall(async (data, context) => {
  // Gatekeeping: Request must be from a verified HR or Finance Manager
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const callerUid = context.auth.uid;
  const callerUserDoc = await db.collection("users").doc(callerUid).get();
  const callerRole = callerUserDoc.data()?.role;

  if (callerRole !== "Super Admin" && callerRole !== "Head Office" && callerRole !== "Finance Manager" && callerRole !== "HR Manager") {
    throw new functions.https.HttpsError("permission-denied", "Only HR and Finance managers can run payroll calculators.");
  }

  const { employeeId, month } = data;
  if (!employeeId || !month) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required arguments: employeeId, month.");
  }

  // Fetch worker info
  const workerDoc = await db.collection("workers").doc(employeeId).get();
  if (!workerDoc.exists) {
    throw new functions.https.HttpsError("not-found", "The specified worker was not found.");
  }

  const worker = workerDoc.data();
  const hourlyRate = worker?.hourlyRate || worker?.rate;
  if (!hourlyRate || typeof hourlyRate !== "number" || hourlyRate <= 0) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Worker '${employeeId}' is missing a valid 'hourlyRate' field in the workers collection.`
    );
  }
  const overtimeRate = hourlyRate * 1.5; // Standard 150% overtime rate

  // Query all present attendance logs for this month
  const attendanceSnapshot = await db.collection("attendance")
    .where("workerId", "==", employeeId)
    .where("date", ">=", `${month}-01`)
    .where("date", "<=", `${month}-31`)
    .get();

  let totalWorkingHours = 0;
  let totalOvertimeHours = 0;

  attendanceSnapshot.forEach((doc) => {
    const record = doc.data();
    if (record.status === "Present" || record.status === "Late") {
      totalWorkingHours += record.workingHours || 8;
      totalOvertimeHours += record.overtime || 0;
    }
  });

  const basicSalary = totalWorkingHours * hourlyRate;
  const overtimePay = totalOvertimeHours * overtimeRate;
  const allowances = worker?.trade === "Welder" || worker?.trade === "Mason" ? 2500 : 1000; // Hazard/Hardship allowances
  const deductions = 0.15 * basicSalary; // Tax and Pension withholdings (15%)
  const netPayable = basicSalary + overtimePay + allowances - deductions;

  const payrollId = `PAY-${employeeId}-${month}`;
  await db.collection("payroll").doc(payrollId).set({
    id: payrollId,
    employeeId,
    month,
    basicSalary,
    overtimePay,
    allowances,
    deductions,
    netPayable,
    status: "Draft",
    calculatedBy: callerUid,
    calculatedAt: new Date().toISOString()
  });

  // Log to immutable Audit Trail
  const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  await db.collection("auditLogs").doc(logId).set({
    id: logId,
    timestamp: new Date().toISOString(),
    userId: callerUid,
    userName: callerUserDoc.data()?.displayName || "ERP Auditor",
    role: callerRole,
    action: "Payroll Calculation Completed",
    details: `Calculated monthly payroll ID: ${payrollId} for worker ${worker?.name}. Net payable: ${netPayable} ETB.`
  });

  return { success: true, payrollId, netPayable };
});
