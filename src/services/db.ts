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
  PanelStatus
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
  initialRepairRecords
} from "../data";

// High-integrity Local Database Engine
class LocalDatabaseEngine {
  private getStorageKey(collectionName: string): string {
    return `ovid_db_${collectionName}`;
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "workers", worker.id), worker);
        return;
      } catch (err) {
        console.error("Firestore addWorker failed, falling back to offline db:", err);
      }
    }
    localDb.insert<Worker>("workers", worker, initialWorkers);
  },

  async updateWorker(worker: Worker): Promise<void> {
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "workers", worker.id), worker, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updateWorker failed, falling back to offline db:", err);
      }
    }
    localDb.update<Worker>("workers", worker, initialWorkers);
  },

  async deleteWorker(id: string): Promise<void> {
    if (isFirebaseReady) {
      try {
        await deleteDoc(doc(db, "workers", id));
        return;
      } catch (err) {
        console.error("Firestore deleteWorker failed, falling back to offline db:", err);
      }
    }
    localDb.delete<Worker>("workers", id, initialWorkers);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "teams", team.id), team);
        return;
      } catch (err) {
        console.error("Firestore addTeam failed:", err);
      }
    }
    localDb.insert<Team>("teams", team, initialTeams);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "attendance", record.id), record);
        return;
      } catch (err) {
        console.error("Firestore addAttendanceRecord failed:", err);
      }
    }
    localDb.insert<AttendanceRecord>("attendance", record, initialAttendance);
  },

  async updateAttendanceRecord(record: AttendanceRecord): Promise<void> {
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "attendance", record.id), record, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updateAttendanceRecord failed:", err);
      }
    }
    localDb.update<AttendanceRecord>("attendance", record, initialAttendance);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "evaluations", evaluation.id), evaluation);
        return;
      } catch (err) {
        console.error("Firestore addEvaluation failed:", err);
      }
    }
    localDb.insert<PerformanceEvaluation>("evaluations", evaluation, initialEvaluations);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "zones", zone.id), zone, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updateZone failed:", err);
      }
    }
    localDb.update<ProjectZone>("zones", zone, initialZones);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "progressLogs", log.id), log);
        return;
      } catch (err) {
        console.error("Firestore addProgressLog failed:", err);
      }
    }
    localDb.insert<DailyProgressLog>("progressLogs", log, initialProgressLogs);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "safetyLogs", log.id), log);
        return;
      } catch (err) {
        console.error("Firestore addSafetyLog failed:", err);
      }
    }
    localDb.insert<SafetyLog>("safetyLogs", log, initialSafetyLogs);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "qualitySnags", snag.id), snag);
        return;
      } catch (err) {
        console.error("Firestore addQualitySnag failed:", err);
      }
    }
    localDb.insert<QualitySnag>("qualitySnags", snag, initialQualitySnags);
  },

  async updateQualitySnag(snag: QualitySnag): Promise<void> {
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "qualitySnags", snag.id), snag, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updateQualitySnag failed:", err);
      }
    }
    localDb.update<QualitySnag>("qualitySnags", snag, initialQualitySnags);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "qualityLogs", log.id), log);
        return;
      } catch (err) {
        console.error("Firestore addQualityLog failed:", err);
      }
    }
    localDb.insert<QualityLog>("qualityLogs", log, initialQualityLogs);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "notifications", notif.id), notif);
        return;
      } catch (err) {
        console.error("Firestore addNotification failed:", err);
      }
    }
    localDb.insert<SystemNotification>("notifications", notif, []);
  },

  async updateNotification(notif: SystemNotification): Promise<void> {
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "notifications", notif.id), notif, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updateNotification failed:", err);
      }
    }
    localDb.update<SystemNotification>("notifications", notif, []);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "auditLogs", log.id), log);
        return;
      } catch (err) {
        console.error("Firestore addAuditLog failed:", err);
      }
    }
    localDb.insert<AuditLog>("auditLogs", log, initialAuditLogs);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "formworkPanels", panel.id), panel);
        return;
      } catch (err) {
        console.error("Firestore addFormworkPanel failed, falling back to offline db:", err);
      }
    }
    localDb.insert<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
  },

  async updateFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "formworkPanels", panel.id), panel, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updateFormworkPanel failed, falling back to offline db:", err);
      }
    }
    localDb.update<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
  },

  async deleteFormworkPanel(id: string): Promise<void> {
    if (isFirebaseReady) {
      try {
        await deleteDoc(doc(db, "formworkPanels", id));
        return;
      } catch (err) {
        console.error("Firestore deleteFormworkPanel failed, falling back to offline db:", err);
      }
    }
    localDb.delete<AluminumFormworkPanel>("formworkPanels", id, initialFormworkPanels);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "panelMovementLogs", log.id), log);
        return;
      } catch (err) {
        console.error("Firestore addPanelMovementLog failed:", err);
      }
    }
    localDb.insert<PanelMovementLog>("panelMovementLogs", log, initialMovementLogs);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "panelDamageReports", report.id), report);
        return;
      } catch (err) {
        console.error("Firestore addPanelDamageReport failed:", err);
      }
    }
    localDb.insert<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
  },

  async updatePanelDamageReport(report: PanelDamageReport): Promise<void> {
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "panelDamageReports", report.id), report, { merge: true });
        return;
      } catch (err) {
        console.error("Firestore updatePanelDamageReport failed:", err);
      }
    }
    localDb.update<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
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
    if (isFirebaseReady) {
      try {
        await setDoc(doc(db, "panelRepairRecords", record.id), record);
        return;
      } catch (err) {
        console.error("Firestore addPanelRepairRecord failed:", err);
      }
    }
    localDb.insert<PanelRepairRecord>("panelRepairRecords", record, initialRepairRecords);
  }
};
