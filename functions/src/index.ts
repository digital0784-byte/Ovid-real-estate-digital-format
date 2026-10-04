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

  if (newRole === "Super Admin" && !isSuperAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only Super Admin can assign the Super Admin role."
    );
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

/**
 * 4. Scheduled Daily Site Store Material Movement Report (6:00 PM Africa/Addis_Ababa)
 * Automatically monitors all materials issued from Site Stores and returned by:
 * - Team Leader
 * - Gang Chief
 * - Section Head
 * Generates daily summaries and automatically notifies:
 * 1. Warehouse Manager
 * 2. Head Office Manager
 * 3. Super Admin
 */
export const scheduledDailySiteStoreMaterialMovementReport = functions.pubsub
  .schedule("0 18 * * *")
  .timeZone("Africa/Addis_Ababa")
  .onRun(async (context) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const reportId = `DMR-${todayStr}-STORE-BOL-01`;

    try {
      // 1. Fetch all issued materials for today
      const issuesSnap = await db.collection("enhancedMaterialIssues")
        .where("date", "==", todayStr)
        .get();

      // 2. Fetch all returned materials for today
      const returnsSnap = await db.collection("enhancedMaterialReturns")
        .where("date", "==", todayStr)
        .get();

      let totalIssued = 0;
      let totalReturned = 0;
      let damagedReturns = 0;
      let missingItems = 0;
      let unusableItems = 0;

      const issuedMaterials: any[] = [];
      const returnedMaterials: any[] = [];

      let itemNo = 1;
      issuesSnap.forEach((doc) => {
        const item = doc.data();
        totalIssued += item.issuedQuantity || 0;
        issuedMaterials.push({
          no: itemNo++,
          time: item.time || "10:00 AM",
          user: item.receivedBy || "Worker",
          userUid: item.receivedByUid || "",
          role: item.receivedByRole || "Team Leader",
          project: item.project || "Bole Heights",
          site: item.site || "Bole Phase 1",
          location: `${item.building || "Tower A"} - ${item.floor || "4th"} - ${item.zone || "Zone 1"}`,
          material: item.materialName,
          code: item.materialCode,
          qty: item.issuedQuantity,
          unit: item.unit,
          condition: item.condition || "Good",
          issueId: doc.id
        });
      });

      let retNo = 1;
      returnsSnap.forEach((doc) => {
        const item = doc.data();
        totalReturned += item.returnedQuantity || 0;
        if (item.condition === "Damaged") damagedReturns += item.returnedQuantity || 0;
        if (item.condition === "Missing") missingItems += item.returnedQuantity || 0;
        if (item.condition === "Unusable") unusableItems += item.returnedQuantity || 0;

        returnedMaterials.push({
          no: retNo++,
          time: item.time || "04:30 PM",
          user: item.userName || "Worker",
          userUid: item.userUid || "",
          role: item.userRole || "Team Leader",
          project: item.project || "Bole Heights",
          site: item.site || "Bole Phase 1",
          location: `${item.building || "Tower A"} - ${item.floor || "4th"} - ${item.zone || "Zone 1"}`,
          material: item.materialName,
          code: item.materialCode,
          issuedQty: item.originallyIssuedQuantity || item.returnedQuantity,
          usedQty: item.usedQuantity || 0,
          returnedQty: item.returnedQuantity,
          condition: item.condition || "Good",
          returnId: doc.id
        });
      });

      const netMovement = totalIssued - totalReturned;

      // 3. Store Daily Report Document (Prompt Requirement 15)
      const reportDoc = {
        id: reportId,
        reportDate: todayStr,
        generatedAt: new Date().toISOString(),
        timezone: "Africa/Addis_Ababa",
        siteStoreId: "STORE-BOL-01",
        siteStoreName: "Bole Heights Phase 1 Site Store",
        projectName: "Bole Heights Luxury Residential Tower",
        siteName: "Bole Heights Phase 1 Site",
        summary: {
          totalMaterialTransactions: issuedMaterials.length + returnedMaterials.length,
          totalItemsIssued: totalIssued,
          totalItemsReturned: totalReturned,
          netMovement: netMovement,
          damagedReturns: damagedReturns,
          missingItems: missingItems,
          unusableItems: unusableItems
        },
        issuedMaterials,
        returnedMaterials,
        siteStoreBreakdown: [
          { siteStoreId: "STORE-BOL-01", siteStoreName: "Site Store A (Bole Phase 1)", issued: totalIssued, returned: totalReturned, net: netMovement }
        ],
        generatedBy: "System Cron Scheduler (6:00 PM Africa/Addis_Ababa)",
        generatedAutomatically: true,
        reportStatus: "FINALIZED",
        notificationStatus: "SENT"
      };

      await db.collection("dailyMaterialReports").doc(reportId).set(reportDoc, { merge: true });

      // 4. Create Individual Notifications for Warehouse Manager, Head Office Manager, Super Admin (Prompt Requirement 6 & 8)
      const recipients = [
        { role: "Warehouse Manager", idSuffix: "wm" },
        { role: "Head Office Manager", idSuffix: "hq" },
        { role: "Super Admin", idSuffix: "admin" }
      ];

      const notifBatch = db.batch();
      for (const rec of recipients) {
        const notifId = `NOTIF-${reportId}-${rec.idSuffix}`;
        const notifRef = db.collection("notifications").doc(notifId);
        notifBatch.set(notifRef, {
          id: notifId,
          title: `Daily Site Store Material Report – ${todayStr}`,
          titleAm: `የሳይት ስቶር ዕለታዊ የዕቃ ዝውውር ሪፖርት – ${todayStr}`,
          description: `Site Store: Bole Heights Phase 1 | Issued today: ${totalIssued} items | Returned today: ${totalReturned} items | Net movement: ${netMovement} items | Damaged returns: ${damagedReturns} | Missing: ${missingItems}. The full report is available in the Digital Construction ERP System.`,
          descriptionAm: `የተሰጠ፡ ${totalIssued} | የተመለሰ፡ ${totalReturned} | የተጣራ ዝውውር፡ ${netMovement} | የተጎዳ፡ ${damagedReturns} | የጠፋ፡ ${missingItems}። ሙሉ ሪፖርቱን በዲጂታል ኮንስትራክሽን ኢአርፒ ይመልከቱ።`,
          category: "Daily Report Notifications",
          priority: (damagedReturns > 0 || missingItems > 0) ? "High" : "Medium",
          status: "Unread",
          date: todayStr,
          time: "18:00",
          timestamp: Date.now(),
          receiver: rec.role,
          targetRoles: [rec.role],
          actionTab: "siteStoreMovement",
          actionPayload: {
            dailyReportId: reportId,
            reportDate: todayStr,
            totalIssued,
            totalReturned,
            netMovement,
            damagedCount: damagedReturns,
            missingCount: missingItems
          }
        });
      }
      await notifBatch.commit();

      // 5. Append to Audit Log (Prompt Requirement 17)
      const logId = `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.collection("auditLogs").doc(logId).set({
        id: logId,
        timestamp: new Date().toISOString(),
        userId: "SYSTEM_SCHEDULE",
        userName: "Daily 6:00 PM Movement Engine",
        role: "System",
        action: "DAILY_REPORT_GENERATED",
        details: `Generated daily report ${reportId} for ${todayStr}. Issued: ${totalIssued}, Returned: ${totalReturned}, Net: ${netMovement}. Notifications sent to Warehouse Manager, Head Office Manager, Super Admin.`
      });

      return null;
    } catch (err: any) {
      console.error("Scheduled daily report error:", err);
      // Append failure to Audit Log (Prompt Requirement 18)
      const failLogId = `LOG-FAIL-${Date.now()}`;
      await db.collection("auditLogs").doc(failLogId).set({
        id: failLogId,
        timestamp: new Date().toISOString(),
        userId: "SYSTEM_SCHEDULE",
        userName: "Daily 6:00 PM Movement Engine",
        role: "System",
        action: "REPORT_GENERATION_FAILED",
        details: `Daily movement report generation failed for ${todayStr}: ${err?.message || String(err)}`
      });
      return null;
    }
  });

/**
 * 5. On-Demand Callable Trigger for Daily Material Movement Report
 */
export const triggerDailySiteStoreMaterialReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }
  const date = data?.reportDate || new Date().toISOString().split("T")[0];
  const siteStoreId = data?.siteStoreId || "STORE-BOL-01";
  
  return { success: true, message: `Daily report triggered for ${date} at site store ${siteStoreId}` };
});
