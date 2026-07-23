import { UserRole, RoleChangeRequest, RoleChangeAuditLog, RoleChangeRequestDoc } from "../types";
import { NotificationService } from "./notificationService";

const STORAGE_KEY_REQUESTS = "buildsync_role_change_requests_v1";
const STORAGE_KEY_AUDIT = "buildsync_role_change_audit_logs_v1";

// Default Initial Seed Requests for immediate testing & demonstration
const INITIAL_SEED_REQUESTS: RoleChangeRequest[] = [
  {
    id: "RCR-2026-101",
    userId: "EMP-SE-042",
    userName: "Sintayehu Tesfaye",
    userEmail: "sintayehu.t@buildsync.et",
    phoneNumber: "+251 911 234 567",
    currentRole: UserRole.SITE_ENGINEER,
    requestedRole: UserRole.PROJECT_MANAGER,
    reason: "Promoted to Site Project Manager for Block B Structural Expansion following senior board decision.",
    supportingDocuments: [
      {
        id: "DOC-PROMO-01",
        fileName: "Promotion_Letter_Sintayehu_2026.pdf",
        fileSize: "1.4 MB",
        fileType: "application/pdf",
        uploadedAt: "2026-07-22 14:30"
      },
      {
        id: "DOC-MEMO-02",
        fileName: "HeadOffice_Assignment_Memo.pdf",
        fileSize: "850 KB",
        fileType: "application/pdf",
        uploadedAt: "2026-07-22 14:32"
      }
    ],
    status: "Pending Approval",
    requestedBy: "Sintayehu Tesfaye",
    requestedByRole: "Site Engineer",
    requestedDate: "2026-07-22",
    requestedTime: "02:30 PM",
    deviceInfo: {
      ip: "192.168.1.145",
      deviceType: "Mobile Tablet (Android)",
      browserOs: "Chrome 126 / Android 14",
      locationGps: "8.9806° N, 38.7578° E (Addis Ababa Site East)"
    }
  },
  {
    id: "RCR-2026-102",
    userId: "EMP-WM-018",
    userName: "Mulugeta Alemu",
    userEmail: "mulugeta.a@buildsync.et",
    phoneNumber: "+251 922 889 012",
    currentRole: UserRole.STORE_OWNER,
    requestedRole: UserRole.WAREHOUSE_MANAGER,
    reason: "Assigned central warehouse logistics oversight across East & West Wing stores.",
    supportingDocuments: [
      {
        id: "DOC-STORE-03",
        fileName: "Warehouse_Manager_Appointment.png",
        fileSize: "2.1 MB",
        fileType: "image/png",
        uploadedAt: "2026-07-21 09:15"
      }
    ],
    status: "Pending Approval",
    requestedBy: "Mulugeta Alemu",
    requestedByRole: "Store Owner",
    requestedDate: "2026-07-21",
    requestedTime: "09:15 AM",
    deviceInfo: {
      ip: "10.0.4.12",
      deviceType: "Desktop Workstation",
      browserOs: "Edge 125 / Windows 11",
      locationGps: "9.0100° N, 38.7600° E (Central Warehouse)"
    }
  },
  {
    id: "RCR-2026-100",
    userId: "EMP-TK-089",
    userName: "Abebe Bikila",
    userEmail: "abebe.b@buildsync.et",
    phoneNumber: "+251 933 456 789",
    currentRole: UserRole.TIME_KEEPER,
    requestedRole: UserRole.SUPERVISOR,
    assignedRole: UserRole.SUPERVISOR,
    reason: "Completed 3 years site operations training and appointed site supervisor for Zone 4.",
    supportingDocuments: [
      {
        id: "DOC-CERT-01",
        fileName: "Site_Supervisor_Certificate.pdf",
        fileSize: "3.2 MB",
        fileType: "application/pdf",
        uploadedAt: "2026-07-18 11:00"
      }
    ],
    status: "Approved",
    requestedBy: "Abebe Bikila",
    requestedByRole: "Time Keeper",
    requestedDate: "2026-07-18",
    requestedTime: "11:00 AM",
    approvedBy: "Super Admin (System)",
    approvedByRole: "Admin",
    approvedDate: "2026-07-18",
    approvedTime: "02:45 PM",
    deviceInfo: {
      ip: "196.188.12.90",
      deviceType: "Mobile Smartphone",
      browserOs: "Safari / iOS 17.5",
      locationGps: "8.9950° N, 38.7700° E (Main Site Gate)"
    }
  },
  {
    id: "RCR-2026-098",
    userId: "EMP-QA-031",
    userName: "Tigist Haile",
    userEmail: "tigist.h@buildsync.et",
    phoneNumber: "+251 911 990 123",
    currentRole: UserRole.ASSEMBLER,
    requestedRole: UserRole.QAQC_ENGINEER,
    reason: "Requested self-service role upgrade following diploma completion.",
    status: "Rejected",
    requestedBy: "Tigist Haile",
    requestedByRole: "Assembler",
    requestedDate: "2026-07-15",
    requestedTime: "04:20 PM",
    approvedBy: "Head Office Executive",
    approvedByRole: "Head Office",
    approvedDate: "2026-07-16",
    approvedTime: "09:00 AM",
    rejectionReason: "Official HR engineering credentials verification document was missing.",
    deviceInfo: {
      ip: "192.168.2.88",
      deviceType: "Mobile Tablet",
      browserOs: "Chrome 124 / Android 13",
      locationGps: "8.9806° N, 38.7578° E"
    }
  }
];

const INITIAL_SEED_AUDITS: RoleChangeAuditLog[] = [
  {
    id: "RCLOG-2026-001",
    timestamp: "2026-07-18 14:45:12",
    date: "2026-07-18",
    time: "02:45 PM",
    userId: "EMP-TK-089",
    userName: "Abebe Bikila",
    previousRole: "Time Keeper",
    newRole: "Supervisor",
    requestedBy: "Abebe Bikila",
    approvedBy: "Super Admin (System)",
    approverRole: "Admin",
    status: "Approved",
    reason: "Completed 3 years site operations training and appointed site supervisor for Zone 4.",
    deviceInfo: {
      ip: "196.188.12.90",
      deviceType: "Mobile Smartphone",
      browserOs: "Safari / iOS 17.5",
      locationGps: "8.9950° N, 38.7700° E"
    }
  },
  {
    id: "RCLOG-2026-002",
    timestamp: "2026-07-16 09:00:05",
    date: "2026-07-16",
    time: "09:00 AM",
    userId: "EMP-QA-031",
    userName: "Tigist Haile",
    previousRole: "Assembler",
    newRole: "Assembler (Rejected upgrade to QA/QC Engineer)",
    requestedBy: "Tigist Haile",
    approvedBy: "Head Office Executive",
    approverRole: "Head Office",
    status: "Rejected",
    reason: "Requested self-service role upgrade following diploma completion.",
    rejectionReason: "Official HR engineering credentials verification document was missing.",
    deviceInfo: {
      ip: "192.168.2.88",
      deviceType: "Mobile Tablet",
      browserOs: "Chrome 124 / Android 13",
      locationGps: "8.9806° N, 38.7578° E"
    }
  }
];

export class RoleChangeApprovalService {
  // Check if current user is authorized to approve/reject role changes
  public static canApproveRoleChange(role: UserRole | string): boolean {
    const r = String(role);
    return r === UserRole.SUPER_ADMIN || r === "Admin" || r === UserRole.HEAD_OFFICE || r === "Head Office";
  }

  // Get all requests from local storage or seed
  public static getRequests(): RoleChangeRequest[] {
    if (typeof window === "undefined") return INITIAL_SEED_REQUESTS;
    const stored = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(INITIAL_SEED_REQUESTS));
      return INITIAL_SEED_REQUESTS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_SEED_REQUESTS;
    }
  }

  public static saveRequests(requests: RoleChangeRequest[]): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    }
  }

  // Get all audit logs
  public static getAuditLogs(): RoleChangeAuditLog[] {
    if (typeof window === "undefined") return INITIAL_SEED_AUDITS;
    const stored = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(INITIAL_SEED_AUDITS));
      return INITIAL_SEED_AUDITS;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return INITIAL_SEED_AUDITS;
    }
  }

  public static saveAuditLogs(logs: RoleChangeAuditLog[]): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(logs));
    }
  }

  // Submit a new Role Change Request
  public static submitRoleChangeRequest(params: {
    userId: string;
    userName: string;
    userEmail?: string;
    phoneNumber?: string;
    currentRole: UserRole | string;
    requestedRole: UserRole | string;
    reason: string;
    supportingDocuments?: RoleChangeRequestDoc[];
    requestedBy?: string;
    requestedByRole?: string;
    customDeviceInfo?: Partial<RoleChangeRequest["deviceInfo"]>;
  }): { request: RoleChangeRequest; success: boolean; messageEn: string; messageAm: string } {
    const requests = this.getRequests();

    // Check if there is already a pending request for this user
    const existingPending = requests.find(
      r => r.userId === params.userId && r.status === "Pending Approval"
    );

    if (existingPending) {
      return {
        request: existingPending,
        success: false,
        messageEn: `You already have a pending Role Change Request (#${existingPending.id}). Please wait for Admin or Head Office review.`,
        messageAm: `ቀደም ሲል የተላከ ክፍት የሥራ ድርሻ ለውጥ ጥያቄ (#${existingPending.id}) አለዎት። እባክዎን የአስተዳዳሪ ማጽደቂያ ይጠብቁ።`
      };
    }

    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Detect browser/device
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Web Client";
    const isMobile = /Android|iPhone|iPad|Mobile/i.test(userAgent);
    const browserOs = userAgent.includes("Chrome") ? "Chrome" : userAgent.includes("Firefox") ? "Firefox" : "Web Browser";

    const newReq: RoleChangeRequest = {
      id: `RCR-2026-${Math.floor(100 + Math.random() * 900)}`,
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      phoneNumber: params.phoneNumber,
      currentRole: params.currentRole,
      requestedRole: params.requestedRole,
      reason: params.reason.trim(),
      supportingDocuments: params.supportingDocuments || [],
      status: "Pending Approval",
      requestedBy: params.requestedBy || params.userName,
      requestedByRole: params.requestedByRole || String(params.currentRole),
      requestedDate: currentDate,
      requestedTime: currentTime,
      deviceInfo: {
        ip: params.customDeviceInfo?.ip || "192.168.1.108",
        deviceType: params.customDeviceInfo?.deviceType || (isMobile ? "Mobile Device" : "Desktop Workstation"),
        browserOs: params.customDeviceInfo?.browserOs || browserOs,
        locationGps: params.customDeviceInfo?.locationGps || "8.9806° N, 38.7578° E (Addis Ababa Core Site)"
      }
    };

    requests.unshift(newReq);
    this.saveRequests(requests);

    // Trigger Notification for Admin & Head Office
    NotificationService.createNotification({
      title: "New Role Change Request Submitted",
      titleAm: "አዲስ የሥራ ድርሻ ለውጥ ጥያቄ ተላከ",
      description: `${params.userName} requested role change from "${params.currentRole}" to "${params.requestedRole}". Reason: ${params.reason}`,
      descriptionAm: `${params.userName} ከ"${params.currentRole}" ወደ "${params.requestedRole}" የሥራ ድርሻ ለውጥ ጠይቀዋል። ምክንያት፡ ${params.reason}`,
      category: "User Approval Notifications",
      priority: "High",
      status: "Unread",
      projectName: "Addis Ababa Tower Block A",
      sender: params.userName,
      senderRole: String(params.currentRole),
      receiver: "Admin / Head Office",
      targetRoles: [UserRole.SUPER_ADMIN, UserRole.HEAD_OFFICE],
      deliveryChannels: { inApp: true, push: true, email: true, sms: false }
    });

    return {
      request: newReq,
      success: true,
      messageEn: "Role Change Request successfully submitted! Your request is now Pending Approval by Admin or Head Office.",
      messageAm: "የሥራ ድርሻ ለውጥ ጥያቄዎ በተሳካ ሁኔታ ተልኳል! ጥያቄው በአስተዳዳሪ ወይም በዋና መስሪያ ቤት ማጽደቂያ ሂደት ላይ ይገኛል።"
    };
  }

  // Approve a Role Change Request
  public static approveRequest(params: {
    requestId: string;
    approverName: string;
    approverRole: UserRole | string;
    assignedRoleOverride?: UserRole | string;
  }): { request: RoleChangeRequest | null; success: boolean; messageEn: string; messageAm: string } {
    if (!this.canApproveRoleChange(params.approverRole)) {
      return {
        request: null,
        success: false,
        messageEn: "Unauthorized: Only Admin or Head Office can approve role changes.",
        messageAm: "ፈቃድ የለዎትም፡ የሥራ ድርሻ ለውጥ ማጽደቅ የሚችሉት Admin ወይም Head Office ብቻ ናቸው።"
      };
    }

    const requests = this.getRequests();
    const req = requests.find(r => r.id === params.requestId);

    if (!req) {
      return {
        request: null,
        success: false,
        messageEn: "Role Change Request not found.",
        messageAm: "የተጠየቀው የሥራ ድርሻ ለውጥ አልተገኘም።"
      };
    }

    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const finalRole = params.assignedRoleOverride || req.requestedRole;

    req.status = "Approved";
    req.assignedRole = finalRole;
    req.approvedBy = params.approverName;
    req.approvedByRole = String(params.approverRole);
    req.approvedDate = currentDate;
    req.approvedTime = currentTime;

    this.saveRequests(requests);

    // Record Audit Log
    const auditLogs = this.getAuditLogs();
    const auditItem: RoleChangeAuditLog = {
      id: `RCLOG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: `${currentDate} ${currentTime}`,
      date: currentDate,
      time: currentTime,
      userId: req.userId,
      userName: req.userName,
      previousRole: String(req.currentRole),
      newRole: String(finalRole),
      requestedBy: req.requestedBy,
      approvedBy: params.approverName,
      approverRole: String(params.approverRole),
      status: "Approved",
      reason: req.reason,
      deviceInfo: req.deviceInfo
    };
    auditLogs.unshift(auditItem);
    this.saveAuditLogs(auditLogs);

    // Send User Notification
    NotificationService.createNotification({
      title: "Role Change Request Approved!",
      titleAm: "የሥራ ድርሻ ለውጥ ጥያቄዎ ጸድቋል!",
      description: `Your job role has been updated to "${finalRole}" by ${params.approverName} (${params.approverRole}). Permissions and dashboard features have been updated.`,
      descriptionAm: `የሥራ ድርሻዎ በ ${params.approverName} ወደ "${finalRole}" ተቀይሯል። የስራ ፈቃዶችና ዳሽቦርድ አገልግሎቶች ታድሰዋል።`,
      category: "User Approval Notifications",
      priority: "High",
      status: "Unread",
      projectName: "Addis Ababa Tower Block A",
      sender: params.approverName,
      senderRole: String(params.approverRole),
      receiver: req.userName,
      targetRoles: [finalRole],
      deliveryChannels: { inApp: true, push: true, email: true, sms: true }
    });

    return {
      request: req,
      success: true,
      messageEn: `Request #${req.id} approved! User "${req.userName}" role updated to "${finalRole}". Permissions updated & audit logged.`,
      messageAm: `ጥያቄ #${req.id} ጸድቋል! የሰራተኛው "${req.userName}" ድርሻ ወደ "${finalRole}" ተቀይሯል።`
    };
  }

  // Reject a Role Change Request
  public static rejectRequest(params: {
    requestId: string;
    approverName: string;
    approverRole: UserRole | string;
    rejectionReason: string;
  }): { request: RoleChangeRequest | null; success: boolean; messageEn: string; messageAm: string } {
    if (!this.canApproveRoleChange(params.approverRole)) {
      return {
        request: null,
        success: false,
        messageEn: "Unauthorized: Only Admin or Head Office can reject role changes.",
        messageAm: "ፈቃድ የለዎትም፡ ጥያቄ ውድቅ ማድረግ የሚችሉት Admin ወይም Head Office ብቻ ናቸው።"
      };
    }

    const requests = this.getRequests();
    const req = requests.find(r => r.id === params.requestId);

    if (!req) {
      return {
        request: null,
        success: false,
        messageEn: "Role Change Request not found.",
        messageAm: "የተጠየቀው የሥራ ድርሻ ለውጥ አልተገኘም።"
      };
    }

    const now = new Date();
    const currentDate = now.toISOString().slice(0, 10);
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    req.status = "Rejected";
    req.approvedBy = params.approverName;
    req.approvedByRole = String(params.approverRole);
    req.approvedDate = currentDate;
    req.approvedTime = currentTime;
    req.rejectionReason = params.rejectionReason.trim();

    this.saveRequests(requests);

    // Record Audit Log
    const auditLogs = this.getAuditLogs();
    const auditItem: RoleChangeAuditLog = {
      id: `RCLOG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: `${currentDate} ${currentTime}`,
      date: currentDate,
      time: currentTime,
      userId: req.userId,
      userName: req.userName,
      previousRole: String(req.currentRole),
      newRole: `${req.currentRole} (Rejected upgrade to ${req.requestedRole})`,
      requestedBy: req.requestedBy,
      approvedBy: params.approverName,
      approverRole: String(params.approverRole),
      status: "Rejected",
      reason: req.reason,
      rejectionReason: params.rejectionReason,
      deviceInfo: req.deviceInfo
    };
    auditLogs.unshift(auditItem);
    this.saveAuditLogs(auditLogs);

    // Send User Notification
    NotificationService.createNotification({
      title: "Role Change Request Rejected",
      titleAm: "የሥራ ድርሻ ለውጥ ጥያቄዎ ውድቅ ተደርጓል",
      description: `Your role change request to "${req.requestedRole}" was rejected by ${params.approverName}. Reason: ${params.rejectionReason}`,
      descriptionAm: `ወደ "${req.requestedRole}" ለመቀየር ያቀረቡት ጥያቄ በ ${params.approverName} ውድቅ ተደርጓል። ምክንያት፡ ${params.rejectionReason}`,
      category: "User Approval Notifications",
      priority: "Medium",
      status: "Unread",
      projectName: "Addis Ababa Tower Block A",
      sender: params.approverName,
      senderRole: String(params.approverRole),
      receiver: req.userName,
      targetRoles: [req.currentRole],
      deliveryChannels: { inApp: true, push: true, email: true, sms: false }
    });

    return {
      request: req,
      success: true,
      messageEn: `Request #${req.id} rejected. Reason recorded in audit logs.`,
      messageAm: `ጥያቄ #${req.id} ውድቅ ተደርጓል። ምክንያቱ በኦዲት መዝገብ ላይ ተመዝግቧል።`
    };
  }

  // Cancel a pending request
  public static cancelRequest(requestId: string, userName: string): boolean {
    const requests = this.getRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return false;

    req.status = "Cancelled";
    this.saveRequests(requests);
    return true;
  }
}
