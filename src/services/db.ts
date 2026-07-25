import { db, isFirebaseReady } from "../firebase";
import { NotificationService } from "./notificationService";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit
} from "firebase/firestore";
import { 
  Worker, 
  Team, 
  AttendanceRecord, 
  PerformanceEvaluation, 
  ProjectZone, 
  DailyProgressLog, 
  SafetyLog, 
  QualitySnag, 
  QualityLog, 
  AuditLog, 
  SystemNotification,
  UserRole,
  AluminumFormworkPanel,
  PanelMovementLog,
  PanelDamageReport,
  PanelRepairRecord,
  PanelType,
  PanelStatus,
  OverseasShipment,
  CustomsRecord,
  DispatchTransfer,
  SiteReceivingReport,
  InventoryAuditRecord,
  RegisteredSite
} from "../types";
import { 
  initialWorkers, 
  initialTeams, 
  initialZones, 
  initialAttendance, 
  initialEvaluations, 
  initialProgressLogs, 
  initialSafetyLogs, 
  initialQualitySnags, 
  initialQualityLogs,
  initialAuditLogs,
  initialFormworkPanels,
  initialMovementLogs,
  initialDamageReports,
  initialRepairRecords,
  initialShipments,
  initialCustomsRecords,
  initialDispatchTransfers,
  initialSiteReceivingReports,
  initialInventoryAudits,
  initialRegisteredSites
} from "../data";

// High-integrity Local Database Engine
class LocalDatabaseEngine {
  private getStorageKey(collectionName: string): string {
    return `digital_construction_db_${collectionName}`;
  }

  public getList<T>(collectionName: string, defaultData: T[]): T[] {
    if (typeof window === "undefined") return defaultData;
    const key = this.getStorageKey(collectionName);
    const data = localStorage.getItem(key);
    if (!data) {
      // Seed data into LocalStorage if empty
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading local storage collection "${collectionName}":`, e);
      return defaultData;
    }
  }

  public saveList<T>(collectionName: string, list: T[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(collectionName);
    localStorage.setItem(key, JSON.stringify(list));
  }

  public insert<T extends { id: string }>(collectionName: string, item: T, defaultData: T[]): void {
    const list = this.getList<T>(collectionName, defaultData);
    list.unshift(item); // insert at start
    this.saveList(collectionName, list);
  }

  public update<T extends { id: string }>(collectionName: string, item: T, defaultData: T[]): void {
    const list = this.getList<T>(collectionName, defaultData);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    this.saveList(collectionName, list);
  }

  public delete<T extends { id: string }>(collectionName: string, id: string, defaultData: T[]): void {
    const list = this.getList<T>(collectionName, defaultData);
    const filtered = list.filter(x => x.id !== id);
    this.saveList(collectionName, filtered);
  }
}

const localDb = new LocalDatabaseEngine();

// Resilient helper to read from Firestore with timeout and automatic local fallback
async function safeFirestoreRead<T>(readFn: () => Promise<T>): Promise<T | null> {
  if (!isFirebaseReady || !db) return null;
  try {
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const result = await Promise.race([
      readFn().catch(() => null),
      timeoutPromise
    ]);
    return result;
  } catch (e) {
    return null;
  }
}

// Master Database Services
export const DbService = {
  // === WORKERS ===
  async getWorkers(): Promise<Worker[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const colRef = collection(db, "workers");
      const snapshot = await getDocs(colRef);
      const workers = snapshot.docs.map(doc => doc.data() as Worker);
      return workers.length > 0 ? workers : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<Worker>("workers", initialWorkers);
  },

  async addWorker(worker: Worker): Promise<void> {
    localDb.insert<Worker>("workers", worker, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
      try {
        NotificationService.createNotification({
          title: `New Registrant: ${worker.name}`,
          titleAm: `አዲስ ተመዝጋቢ: ${worker.name}`,
          description: `New staff member ${worker.name} (${worker.position || worker.trade || worker.department || "Staff"}) registered on the ERP system. ID: ${worker.id}`,
          descriptionAm: `አዲስ ሰራተኛ/ተመዝጋቢ ${worker.name} (${worker.position || worker.trade || worker.department || "ሰራተኛ"}) በሲስተሙ ላይ ተመዝግቧል። መለያ ቁጥር: ${worker.id}`,
          category: "User Approval Notifications",
          priority: "High",
          status: "Unread",
          projectName: "Global System",
          siteName: "Registration",
          sender: worker.name,
          senderRole: String(worker.position || worker.trade || "Registered Worker"),
          receiver: "Admin, Head Office & HR",
          targetRoles: [
            UserRole.SUPER_ADMIN,
            UserRole.HEAD_OFFICE,
            UserRole.HR_MANAGER,
            "Admin",
            "Head Office",
            "HR Manager",
            "HR"
          ],
          deliveryChannels: { inApp: true, push: true, email: true, sms: false },
          actionTab: "admin"
        });
      } catch (err) {
        console.error("Error creating notification in addWorker:", err);
      }
    }
    if (isFirebaseReady && db) {
      setDoc(doc(db, "workers", worker.id), worker).catch(() => {});
    }
  },

  async updateWorker(worker: Worker): Promise<void> {
    localDb.update<Worker>("workers", worker, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
    if (isFirebaseReady && db) {
      setDoc(doc(db, "workers", worker.id), worker, { merge: true }).catch(() => {});
    }
  },

  async deleteWorker(id: string): Promise<void> {
    localDb.delete<Worker>("workers", id, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
    if (isFirebaseReady && db) {
      deleteDoc(doc(db, "workers", id)).catch(() => {});
    }
  },

  // === TEAMS ===
  async getTeams(): Promise<Team[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "teams"));
      const teams = snapshot.docs.map(doc => doc.data() as Team);
      return teams.length > 0 ? teams : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<Team>("teams", initialTeams);
  },

  async addTeam(team: Team): Promise<void> {
    localDb.insert<Team>("teams", team, initialTeams);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "teams", team.id), team).catch(() => {});
    }
  },

  // === ATTENDANCE RECORDS ===
  async getAttendance(): Promise<AttendanceRecord[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "attendance"));
      const records = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
      return records.length > 0 ? records : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<AttendanceRecord>("attendance", initialAttendance);
  },

  async addAttendanceRecord(record: AttendanceRecord): Promise<void> {
    localDb.insert<AttendanceRecord>("attendance", record, initialAttendance);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "attendance", record.id), record).catch(() => {});
    }
  },

  async updateAttendanceRecord(record: AttendanceRecord): Promise<void> {
    localDb.update<AttendanceRecord>("attendance", record, initialAttendance);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "attendance", record.id), record, { merge: true }).catch(() => {});
    }
  },

  // === PERFORMANCE EVALUATIONS ===
  async getEvaluations(): Promise<PerformanceEvaluation[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "evaluations"));
      const evals = snapshot.docs.map(doc => doc.data() as PerformanceEvaluation);
      return evals.length > 0 ? evals : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<PerformanceEvaluation>("evaluations", initialEvaluations);
  },

  async addEvaluation(evaluation: PerformanceEvaluation): Promise<void> {
    localDb.insert<PerformanceEvaluation>("evaluations", evaluation, initialEvaluations);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "evaluations", evaluation.id), evaluation).catch(() => {});
    }
  },

  // === PROJECT ZONES ===
  async getZones(): Promise<ProjectZone[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "zones"));
      const zones = snapshot.docs.map(doc => doc.data() as ProjectZone);
      return zones.length > 0 ? zones : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<ProjectZone>("zones", initialZones);
  },

  async updateZone(zone: ProjectZone): Promise<void> {
    localDb.update<ProjectZone>("zones", zone, initialZones);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "zones", zone.id), zone, { merge: true }).catch(() => {});
    }
  },

  // === DAILY PROGRESS LOGS ===
  async getProgressLogs(): Promise<DailyProgressLog[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "progressLogs"));
      const logs = snapshot.docs.map(doc => doc.data() as DailyProgressLog);
      return logs.length > 0 ? logs : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<DailyProgressLog>("progressLogs", initialProgressLogs);
  },

  async addProgressLog(log: DailyProgressLog): Promise<void> {
    localDb.insert<DailyProgressLog>("progressLogs", log, initialProgressLogs);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "progressLogs", log.id), log).catch(() => {});
    }
  },

  // === SAFETY LOGS ===
  async getSafetyLogs(): Promise<SafetyLog[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "safetyLogs"));
      const logs = snapshot.docs.map(doc => doc.data() as SafetyLog);
      return logs.length > 0 ? logs : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<SafetyLog>("safetyLogs", initialSafetyLogs);
  },

  async addSafetyLog(log: SafetyLog): Promise<void> {
    localDb.insert<SafetyLog>("safetyLogs", log, initialSafetyLogs);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "safetyLogs", log.id), log).catch(() => {});
    }
  },

  // === QUALITY SNAGS ===
  async getQualitySnags(): Promise<QualitySnag[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "qualitySnags"));
      const snags = snapshot.docs.map(doc => doc.data() as QualitySnag);
      return snags.length > 0 ? snags : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<QualitySnag>("qualitySnags", initialQualitySnags);
  },

  async addQualitySnag(snag: QualitySnag): Promise<void> {
    localDb.insert<QualitySnag>("qualitySnags", snag, initialQualitySnags);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "qualitySnags", snag.id), snag).catch(() => {});
    }
  },

  async updateQualitySnag(snag: QualitySnag): Promise<void> {
    localDb.update<QualitySnag>("qualitySnags", snag, initialQualitySnags);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "qualitySnags", snag.id), snag, { merge: true }).catch(() => {});
    }
  },

  // === QUALITY LOGS ===
  async getQualityLogs(): Promise<QualityLog[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "qualityLogs"));
      const logs = snapshot.docs.map(doc => doc.data() as QualityLog);
      return logs.length > 0 ? logs : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<QualityLog>("qualityLogs", initialQualityLogs);
  },

  async addQualityLog(log: QualityLog): Promise<void> {
    localDb.insert<QualityLog>("qualityLogs", log, initialQualityLogs);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "qualityLogs", log.id), log).catch(() => {});
    }
  },

  // === SYSTEM NOTIFICATIONS ===
  async getNotifications(): Promise<SystemNotification[]> {
    const defaultNotifs: SystemNotification[] = [
      {
        id: "n-1",
        type: "Zone Delay",
        title: "Zone C Schedule Warning",
        message: "Zone C Concrete casting is delayed by 3.5 days against standard cycle layout times.",
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: "n-2",
        type: "Safety Alert",
        title: "PPE Defects Detected",
        message: "Supervisor reported 3 PPE defects during active shifts on Floor 4.",
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
    return localDb.getList<SystemNotification>("notifications", defaultNotifs);
  },

  async addNotification(notif: SystemNotification): Promise<void> {
    localDb.insert<SystemNotification>("notifications", notif, []);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "notifications", notif.id), notif).catch(() => {});
    }
  },

  async updateNotification(notif: SystemNotification): Promise<void> {
    localDb.update<SystemNotification>("notifications", notif, []);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "notifications", notif.id), notif, { merge: true }).catch(() => {});
    }
  },

  // === AUDIT LOGS ===
  async getAuditLogs(): Promise<AuditLog[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const snapshot = await getDocs(collection(db, "auditLogs"));
      const logs = snapshot.docs.map(doc => doc.data() as AuditLog);
      return logs.length > 0 ? logs : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<AuditLog>("auditLogs", initialAuditLogs);
  },

  async addAuditLog(log: AuditLog): Promise<void> {
    localDb.insert<AuditLog>("auditLogs", log, initialAuditLogs);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "auditLogs", log.id), log).catch(() => {});
    }
  },

  // === ALUMINUM FORMWORK PANELS ===
  async getFormworkPanels(): Promise<AluminumFormworkPanel[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const colRef = collection(db, "formworkPanels");
      const snapshot = await getDocs(colRef);
      const panels = snapshot.docs.map(doc => doc.data() as AluminumFormworkPanel);
      return panels.length > 0 ? panels : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
  },

  async addFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    localDb.insert<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "formworkPanels", panel.id), panel).catch(() => {});
    }
  },

  async updateFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    localDb.update<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "formworkPanels", panel.id), panel, { merge: true }).catch(() => {});
    }
  },

  async deleteFormworkPanel(id: string): Promise<void> {
    localDb.delete<AluminumFormworkPanel>("formworkPanels", id, initialFormworkPanels);
    if (isFirebaseReady && db) {
      deleteDoc(doc(db, "formworkPanels", id)).catch(() => {});
    }
  },

  // === PANEL MOVEMENT LOGS ===
  async getPanelMovementLogs(): Promise<PanelMovementLog[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const colRef = collection(db, "panelMovementLogs");
      const snapshot = await getDocs(colRef);
      const logs = snapshot.docs.map(doc => doc.data() as PanelMovementLog);
      return logs.length > 0 ? logs : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
  },

  async addPanelMovementLog(log: PanelMovementLog): Promise<void> {
    localDb.insert<PanelMovementLog>("panelMovementLogs", log, initialMovementLogs);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "panelMovementLogs", log.id), log).catch(() => {});
    }
  },

  // === PANEL DAMAGE REPORTS ===
  async getPanelDamageReports(): Promise<PanelDamageReport[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const colRef = collection(db, "panelDamageReports");
      const snapshot = await getDocs(colRef);
      const reports = snapshot.docs.map(doc => doc.data() as PanelDamageReport);
      return reports.length > 0 ? reports : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<PanelDamageReport>("panelDamageReports", initialDamageReports);
  },

  async addPanelDamageReport(report: PanelDamageReport): Promise<void> {
    localDb.insert<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "panelDamageReports", report.id), report).catch(() => {});
    }
  },

  async updatePanelDamageReport(report: PanelDamageReport): Promise<void> {
    localDb.update<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "panelDamageReports", report.id), report, { merge: true }).catch(() => {});
    }
  },

  // === PANEL REPAIR RECORDS ===
  async getPanelRepairRecords(): Promise<PanelRepairRecord[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const colRef = collection(db, "panelRepairRecords");
      const snapshot = await getDocs(colRef);
      const records = snapshot.docs.map(doc => doc.data() as PanelRepairRecord);
      return records.length > 0 ? records : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<PanelRepairRecord>("panelRepairRecords", initialRepairRecords);
  },

  async addPanelRepairRecord(record: PanelRepairRecord): Promise<void> {
    localDb.insert<PanelRepairRecord>("panelRepairRecords", record, initialRepairRecords);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "panelRepairRecords", record.id), record).catch(() => {});
    }
  },

  // === OVERSEAS SHIPMENTS & CUSTOMS ===
  async getOverseasShipments(): Promise<OverseasShipment[]> {
    return localDb.getList<OverseasShipment>("overseasShipments", initialShipments);
  },
  async addOverseasShipment(shipment: OverseasShipment): Promise<void> {
    localDb.insert<OverseasShipment>("overseasShipments", shipment, initialShipments);
  },
  async getCustomsRecords(): Promise<CustomsRecord[]> {
    return localDb.getList<CustomsRecord>("customsRecords", initialCustomsRecords);
  },
  async addCustomsRecord(record: CustomsRecord): Promise<void> {
    localDb.insert<CustomsRecord>("customsRecords", record, initialCustomsRecords);
  },

  // === DISPATCH TRANSFERS ===
  async getDispatchTransfers(): Promise<DispatchTransfer[]> {
    return localDb.getList<DispatchTransfer>("dispatchTransfers", initialDispatchTransfers);
  },
  async addDispatchTransfer(transfer: DispatchTransfer): Promise<void> {
    localDb.insert<DispatchTransfer>("dispatchTransfers", transfer, initialDispatchTransfers);
  },
  async updateDispatchTransfer(transfer: DispatchTransfer): Promise<void> {
    localDb.update<DispatchTransfer>("dispatchTransfers", transfer, initialDispatchTransfers);
  },

  // === SITE RECEIVING REPORTS ===
  async getSiteReceivingReports(): Promise<SiteReceivingReport[]> {
    return localDb.getList<SiteReceivingReport>("siteReceivingReports", initialSiteReceivingReports);
  },
  async addSiteReceivingReport(report: SiteReceivingReport): Promise<void> {
    localDb.insert<SiteReceivingReport>("siteReceivingReports", report, initialSiteReceivingReports);
  },

  // === INVENTORY AUDITS ===
  async getInventoryAudits(): Promise<InventoryAuditRecord[]> {
    return localDb.getList<InventoryAuditRecord>("inventoryAudits", initialInventoryAudits);
  },
  async addInventoryAudit(audit: InventoryAuditRecord): Promise<void> {
    localDb.insert<InventoryAuditRecord>("inventoryAudits", audit, initialInventoryAudits);
  },

  // === REGISTERED SITES ===
  async getRegisteredSites(): Promise<RegisteredSite[]> {
    const firestoreData = await safeFirestoreRead(async () => {
      const colRef = collection(db, "registeredSites");
      const snapshot = await getDocs(colRef);
      const sites = snapshot.docs.map(doc => doc.data() as RegisteredSite);
      return sites.length > 0 ? sites : null;
    });
    if (firestoreData) return firestoreData;
    return localDb.getList<RegisteredSite>("registeredSites", initialRegisteredSites);
  },
  async addRegisteredSite(site: RegisteredSite): Promise<void> {
    localDb.insert<RegisteredSite>("registeredSites", site, initialRegisteredSites);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "registeredSites", site.id), site).catch(() => {});
    }
  },
  async updateRegisteredSite(site: RegisteredSite): Promise<void> {
    localDb.update<RegisteredSite>("registeredSites", site, initialRegisteredSites);
    if (isFirebaseReady && db) {
      setDoc(doc(db, "registeredSites", site.id), site, { merge: true }).catch(() => {});
    }
  },
  async deleteRegisteredSite(id: string): Promise<void> {
    localDb.delete<RegisteredSite>("registeredSites", id, initialRegisteredSites);
    if (isFirebaseReady && db) {
      deleteDoc(doc(db, "registeredSites", id)).catch(() => {});
    }
  }
};
