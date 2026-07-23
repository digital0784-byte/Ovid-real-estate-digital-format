import { db, isFirebaseReady } from "../firebase";
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

// Master Database Services
export const DbService = {
  // === WORKERS ===
  async getWorkers(): Promise<Worker[]> {
    if (isFirebaseReady) {
      try {
        const colRef = collection(db, "workers");
        const snapshot = await getDocs(colRef);
        const workers = snapshot.docs.map(doc => doc.data() as Worker);
        if (workers.length > 0) return workers;
      } catch (err) {
        console.error("Firestore getWorkers failed, falling back to offline db:", err);
      }
    }
    return localDb.getList<Worker>("workers", initialWorkers);
  },

  async addWorker(worker: Worker): Promise<void> {
    localDb.insert<Worker>("workers", worker, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
    if (isFirebaseReady) {
      setDoc(doc(db, "workers", worker.id), worker).catch((err) => {
        console.error("Firestore background addWorker failed:", err);
      });
    }
  },

  async updateWorker(worker: Worker): Promise<void> {
    localDb.update<Worker>("workers", worker, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
    if (isFirebaseReady) {
      setDoc(doc(db, "workers", worker.id), worker, { merge: true }).catch((err) => {
        console.error("Firestore background updateWorker failed:", err);
      });
    }
  },

  async deleteWorker(id: string): Promise<void> {
    localDb.delete<Worker>("workers", id, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
    if (isFirebaseReady) {
      deleteDoc(doc(db, "workers", id)).catch((err) => {
        console.error("Firestore background deleteWorker failed:", err);
      });
    }
  },

  // === TEAMS ===
  async getTeams(): Promise<Team[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "teams"));
        const teams = snapshot.docs.map(doc => doc.data() as Team);
        if (teams.length > 0) return teams;
      } catch (err) {
        console.error("Firestore getTeams failed:", err);
      }
    }
    return localDb.getList<Team>("teams", initialTeams);
  },

  async addTeam(team: Team): Promise<void> {
    localDb.insert<Team>("teams", team, initialTeams);
    if (isFirebaseReady) {
      setDoc(doc(db, "teams", team.id), team).catch((err) => {
        console.error("Firestore background addTeam failed:", err);
      });
    }
  },

  // === ATTENDANCE RECORDS ===
  async getAttendance(): Promise<AttendanceRecord[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "attendance"));
        const records = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
        if (records.length > 0) return records;
      } catch (err) {
        console.error("Firestore getAttendance failed:", err);
      }
    }
    return localDb.getList<AttendanceRecord>("attendance", initialAttendance);
  },

  async addAttendanceRecord(record: AttendanceRecord): Promise<void> {
    localDb.insert<AttendanceRecord>("attendance", record, initialAttendance);
    if (isFirebaseReady) {
      setDoc(doc(db, "attendance", record.id), record).catch((err) => {
        console.error("Firestore background addAttendanceRecord failed:", err);
      });
    }
  },

  async updateAttendanceRecord(record: AttendanceRecord): Promise<void> {
    localDb.update<AttendanceRecord>("attendance", record, initialAttendance);
    if (isFirebaseReady) {
      setDoc(doc(db, "attendance", record.id), record, { merge: true }).catch((err) => {
        console.error("Firestore background updateAttendanceRecord failed:", err);
      });
    }
  },

  // === PERFORMANCE EVALUATIONS ===
  async getEvaluations(): Promise<PerformanceEvaluation[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "evaluations"));
        const evals = snapshot.docs.map(doc => doc.data() as PerformanceEvaluation);
        if (evals.length > 0) return evals;
      } catch (err) {
        console.error("Firestore getEvaluations failed:", err);
      }
    }
    return localDb.getList<PerformanceEvaluation>("evaluations", initialEvaluations);
  },

  async addEvaluation(evaluation: PerformanceEvaluation): Promise<void> {
    localDb.insert<PerformanceEvaluation>("evaluations", evaluation, initialEvaluations);
    if (isFirebaseReady) {
      setDoc(doc(db, "evaluations", evaluation.id), evaluation).catch((err) => {
        console.error("Firestore background addEvaluation failed:", err);
      });
    }
  },

  // === PROJECT ZONES ===
  async getZones(): Promise<ProjectZone[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "zones"));
        const zones = snapshot.docs.map(doc => doc.data() as ProjectZone);
        if (zones.length > 0) return zones;
      } catch (err) {
        console.error("Firestore getZones failed:", err);
      }
    }
    return localDb.getList<ProjectZone>("zones", initialZones);
  },

  async updateZone(zone: ProjectZone): Promise<void> {
    localDb.update<ProjectZone>("zones", zone, initialZones);
    if (isFirebaseReady) {
      setDoc(doc(db, "zones", zone.id), zone, { merge: true }).catch((err) => {
        console.error("Firestore background updateZone failed:", err);
      });
    }
  },

  // === DAILY PROGRESS LOGS ===
  async getProgressLogs(): Promise<DailyProgressLog[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "progressLogs"));
        const logs = snapshot.docs.map(doc => doc.data() as DailyProgressLog);
        if (logs.length > 0) return logs;
      } catch (err) {
        console.error("Firestore getProgressLogs failed:", err);
      }
    }
    return localDb.getList<DailyProgressLog>("progressLogs", initialProgressLogs);
  },

  async addProgressLog(log: DailyProgressLog): Promise<void> {
    localDb.insert<DailyProgressLog>("progressLogs", log, initialProgressLogs);
    if (isFirebaseReady) {
      setDoc(doc(db, "progressLogs", log.id), log).catch((err) => {
        console.error("Firestore background addProgressLog failed:", err);
      });
    }
  },

  // === SAFETY LOGS ===
  async getSafetyLogs(): Promise<SafetyLog[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "safetyLogs"));
        const logs = snapshot.docs.map(doc => doc.data() as SafetyLog);
        if (logs.length > 0) return logs;
      } catch (err) {
        console.error("Firestore getSafetyLogs failed:", err);
      }
    }
    return localDb.getList<SafetyLog>("safetyLogs", initialSafetyLogs);
  },

  async addSafetyLog(log: SafetyLog): Promise<void> {
    localDb.insert<SafetyLog>("safetyLogs", log, initialSafetyLogs);
    if (isFirebaseReady) {
      setDoc(doc(db, "safetyLogs", log.id), log).catch((err) => {
        console.error("Firestore background addSafetyLog failed:", err);
      });
    }
  },

  // === QUALITY SNAGS ===
  async getQualitySnags(): Promise<QualitySnag[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "qualitySnags"));
        const snags = snapshot.docs.map(doc => doc.data() as QualitySnag);
        if (snags.length > 0) return snags;
      } catch (err) {
        console.error("Firestore getQualitySnags failed:", err);
      }
    }
    return localDb.getList<QualitySnag>("qualitySnags", initialQualitySnags);
  },

  async addQualitySnag(snag: QualitySnag): Promise<void> {
    localDb.insert<QualitySnag>("qualitySnags", snag, initialQualitySnags);
    if (isFirebaseReady) {
      setDoc(doc(db, "qualitySnags", snag.id), snag).catch((err) => {
        console.error("Firestore background addQualitySnag failed:", err);
      });
    }
  },

  async updateQualitySnag(snag: QualitySnag): Promise<void> {
    localDb.update<QualitySnag>("qualitySnags", snag, initialQualitySnags);
    if (isFirebaseReady) {
      setDoc(doc(db, "qualitySnags", snag.id), snag, { merge: true }).catch((err) => {
        console.error("Firestore background updateQualitySnag failed:", err);
      });
    }
  },

  // === QUALITY LOGS ===
  async getQualityLogs(): Promise<QualityLog[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "qualityLogs"));
        const logs = snapshot.docs.map(doc => doc.data() as QualityLog);
        if (logs.length > 0) return logs;
      } catch (err) {
        console.error("Firestore getQualityLogs failed:", err);
      }
    }
    return localDb.getList<QualityLog>("qualityLogs", initialQualityLogs);
  },

  async addQualityLog(log: QualityLog): Promise<void> {
    localDb.insert<QualityLog>("qualityLogs", log, initialQualityLogs);
    if (isFirebaseReady) {
      setDoc(doc(db, "qualityLogs", log.id), log).catch((err) => {
        console.error("Firestore background addQualityLog failed:", err);
      });
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
    if (isFirebaseReady) {
      setDoc(doc(db, "notifications", notif.id), notif).catch((err) => {
        console.error("Firestore background addNotification failed:", err);
      });
    }
  },

  async updateNotification(notif: SystemNotification): Promise<void> {
    localDb.update<SystemNotification>("notifications", notif, []);
    if (isFirebaseReady) {
      setDoc(doc(db, "notifications", notif.id), notif, { merge: true }).catch((err) => {
        console.error("Firestore background updateNotification failed:", err);
      });
    }
  },

  // === AUDIT LOGS ===
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, "auditLogs"));
        const logs = snapshot.docs.map(doc => doc.data() as AuditLog);
        if (logs.length > 0) return logs;
      } catch (err) {
        console.error("Firestore getAuditLogs failed:", err);
      }
    }
    return localDb.getList<AuditLog>("auditLogs", initialAuditLogs);
  },

  async addAuditLog(log: AuditLog): Promise<void> {
    localDb.insert<AuditLog>("auditLogs", log, initialAuditLogs);
    if (isFirebaseReady) {
      setDoc(doc(db, "auditLogs", log.id), log).catch((err) => {
        console.error("Firestore background addAuditLog failed:", err);
      });
    }
  },

  // === ALUMINUM FORMWORK PANELS ===
  async getFormworkPanels(): Promise<AluminumFormworkPanel[]> {
    if (isFirebaseReady) {
      try {
        const colRef = collection(db, "formworkPanels");
        const snapshot = await getDocs(colRef);
        const panels = snapshot.docs.map(doc => doc.data() as AluminumFormworkPanel);
        if (panels.length > 0) return panels;
      } catch (err) {
        console.error("Firestore getFormworkPanels failed, falling back to offline db:", err);
      }
    }
    return localDb.getList<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
  },

  async addFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    localDb.insert<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
    if (isFirebaseReady) {
      setDoc(doc(db, "formworkPanels", panel.id), panel).catch((err) => {
        console.error("Firestore background addFormworkPanel failed:", err);
      });
    }
  },

  async updateFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    localDb.update<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
    if (isFirebaseReady) {
      setDoc(doc(db, "formworkPanels", panel.id), panel, { merge: true }).catch((err) => {
        console.error("Firestore background updateFormworkPanel failed:", err);
      });
    }
  },

  async deleteFormworkPanel(id: string): Promise<void> {
    localDb.delete<AluminumFormworkPanel>("formworkPanels", id, initialFormworkPanels);
    if (isFirebaseReady) {
      deleteDoc(doc(db, "formworkPanels", id)).catch((err) => {
        console.error("Firestore background deleteFormworkPanel failed:", err);
      });
    }
  },

  // === PANEL MOVEMENT LOGS ===
  async getPanelMovementLogs(): Promise<PanelMovementLog[]> {
    if (isFirebaseReady) {
      try {
        const colRef = collection(db, "panelMovementLogs");
        const snapshot = await getDocs(colRef);
        const logs = snapshot.docs.map(doc => doc.data() as PanelMovementLog);
        if (logs.length > 0) return logs;
      } catch (err) {
        console.error("Firestore getPanelMovementLogs failed, falling back to offline db:", err);
      }
    }
    return localDb.getList<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
  },

  async addPanelMovementLog(log: PanelMovementLog): Promise<void> {
    localDb.insert<PanelMovementLog>("panelMovementLogs", log, initialMovementLogs);
    if (isFirebaseReady) {
      setDoc(doc(db, "panelMovementLogs", log.id), log).catch((err) => {
        console.error("Firestore background addPanelMovementLog failed:", err);
      });
    }
  },

  // === PANEL DAMAGE REPORTS ===
  async getPanelDamageReports(): Promise<PanelDamageReport[]> {
    if (isFirebaseReady) {
      try {
        const colRef = collection(db, "panelDamageReports");
        const snapshot = await getDocs(colRef);
        const reports = snapshot.docs.map(doc => doc.data() as PanelDamageReport);
        if (reports.length > 0) return reports;
      } catch (err) {
        console.error("Firestore getPanelDamageReports failed:", err);
      }
    }
    return localDb.getList<PanelDamageReport>("panelDamageReports", initialDamageReports);
  },

  async addPanelDamageReport(report: PanelDamageReport): Promise<void> {
    localDb.insert<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
    if (isFirebaseReady) {
      setDoc(doc(db, "panelDamageReports", report.id), report).catch((err) => {
        console.error("Firestore background addPanelDamageReport failed:", err);
      });
    }
  },

  async updatePanelDamageReport(report: PanelDamageReport): Promise<void> {
    localDb.update<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
    if (isFirebaseReady) {
      setDoc(doc(db, "panelDamageReports", report.id), report, { merge: true }).catch((err) => {
        console.error("Firestore background updatePanelDamageReport failed:", err);
      });
    }
  },

  // === PANEL REPAIR RECORDS ===
  async getPanelRepairRecords(): Promise<PanelRepairRecord[]> {
    if (isFirebaseReady) {
      try {
        const colRef = collection(db, "panelRepairRecords");
        const snapshot = await getDocs(colRef);
        const records = snapshot.docs.map(doc => doc.data() as PanelRepairRecord);
        if (records.length > 0) return records;
      } catch (err) {
        console.error("Firestore getPanelRepairRecords failed:", err);
      }
    }
    return localDb.getList<PanelRepairRecord>("panelRepairRecords", initialRepairRecords);
  },

  async addPanelRepairRecord(record: PanelRepairRecord): Promise<void> {
    localDb.insert<PanelRepairRecord>("panelRepairRecords", record, initialRepairRecords);
    if (isFirebaseReady) {
      setDoc(doc(db, "panelRepairRecords", record.id), record).catch((err) => {
        console.error("Firestore background addPanelRepairRecord failed:", err);
      });
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
    if (isFirebaseReady) {
      try {
        const colRef = collection(db, "registeredSites");
        const snapshot = await getDocs(colRef);
        const sites = snapshot.docs.map(doc => doc.data() as RegisteredSite);
        if (sites.length > 0) return sites;
      } catch (err) {
        console.error("Firestore getRegisteredSites failed:", err);
      }
    }
    return localDb.getList<RegisteredSite>("registeredSites", initialRegisteredSites);
  },
  async addRegisteredSite(site: RegisteredSite): Promise<void> {
    localDb.insert<RegisteredSite>("registeredSites", site, initialRegisteredSites);
    if (isFirebaseReady) {
      setDoc(doc(db, "registeredSites", site.id), site).catch((err) => {
        console.error("Firestore background addRegisteredSite failed:", err);
      });
    }
  },
  async updateRegisteredSite(site: RegisteredSite): Promise<void> {
    localDb.update<RegisteredSite>("registeredSites", site, initialRegisteredSites);
    if (isFirebaseReady) {
      setDoc(doc(db, "registeredSites", site.id), site, { merge: true }).catch((err) => {
        console.error("Firestore background updateRegisteredSite failed:", err);
      });
    }
  },
  async deleteRegisteredSite(id: string): Promise<void> {
    localDb.delete<RegisteredSite>("registeredSites", id, initialRegisteredSites);
    if (isFirebaseReady) {
      deleteDoc(doc(db, "registeredSites", id)).catch((err) => {
        console.error("Firestore background deleteRegisteredSite failed:", err);
      });
    }
  }
};
