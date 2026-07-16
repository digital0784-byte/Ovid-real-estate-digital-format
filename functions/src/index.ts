import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * 1. Firebase Authentication: On User Creation Trigger
 * Assigns default custom claims (roles) and provisions user documents in Firestore.
 */
export const onUserSignUp = functions.auth.user().onCreate(async (user) => {
  const email = user.email || "";
  let role = "Worker"; // Default role

  // Assign standard system roles based on email domain and prefix rules
  const formattedEmail = email.toLowerCase().trim();
  if (formattedEmail.startsWith("admin") || formattedEmail.startsWith("sa-")) {
    role = "Super Admin";
  } else if (formattedEmail.endsWith("@ovidrealestate.com")) {
    if (formattedEmail.includes(".pm") || formattedEmail.includes("dawit")) {
      role = "Project Manager";
    } else if (formattedEmail.includes(".se") || formattedEmail.includes("sintayehu")) {
      role = "Site Engineer";
    } else if (formattedEmail.includes(".sv") || formattedEmail.includes("kassa")) {
      role = "Supervisor";
    } else if (formattedEmail.includes(".tk") || formattedEmail.includes("abebe")) {
      role = "Time Keeper";
    } else if (formattedEmail.includes(".sm") || formattedEmail.includes("mulugeta")) {
      role = "Store Manager";
    } else if (formattedEmail.includes(".hr") || formattedEmail.includes("tigist")) {
      role = "HR Manager";
    } else if (formattedEmail.includes(".fm") || formattedEmail.includes("bement")) {
      role = "Finance Manager";
    } else {
      role = "Head Office";
    }
  }

  // Set Firebase Auth custom user claims for secure token-based gatekeeping
  await admin.auth().setCustomUserClaims(user.uid, { role });

  // Provision corresponding User document in Firestore
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email?.split("@")[0] || "OVID Employee",
    phoneNumber: user.phoneNumber || "",
    role: role,
    status: "Active",
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
    details: `Created record for user ${email}. Assigned enterprise ERP role: ${role}. Set custom security claims.`
  });
});

/**
 * 2. Real-time Attendance Aggregation Trigger
 * Automatically aggregates daily site attendance counts, active counts, and updates dashboards.
 */
export const onAttendanceLogged = functions.firestore
  .document("attendance/{attendanceId}")
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
  const hourlyRate = 180; // Default ETB/hr billing rate for OVID skilled workers
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
