import { db, isFirebaseReady } from "../firebase";
import { NotificationService } from "./notificationService";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc
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

interface OutboxItem {
  id: string;
  action: "set" | "delete";
  collectionName: string;
  data?: any;
  timestamp: number;
}

// Local Database Cache & Outbox Engine for resilient offline sync
class OfflineCacheAndOutboxEngine {
  private getStorageKey(collectionName: string): string {
    return `digital_construction_db_${collectionName}`;
  }

  private getOutboxKey(): string {
    return `digital_construction_outbox_queue`;
  }

  public getCache<T>(collectionName: string, defaultData: T[]): T[] {
    if (typeof window === "undefined") return defaultData;
    const key = this.getStorageKey(collectionName);
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading offline cache collection "${collectionName}":`, e);
      return defaultData;
    }
  }

  public saveCache<T>(collectionName: string, list: T[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(collectionName);
    localStorage.setItem(key, JSON.stringify(list));
  }

  public updateCacheItem<T extends { id: string }>(collectionName: string, item: T, defaultData: T[]): void {
    const list = this.getCache<T>(collectionName, defaultData);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.unshift(item);
    }
    this.saveCache(collectionName, list);
  }

  public deleteCacheItem<T extends { id: string }>(collectionName: string, id: string, defaultData: T[]): void {
    const list = this.getCache<T>(collectionName, defaultData);
    const filtered = list.filter(x => x.id !== id);
    this.saveCache(collectionName, filtered);
  }

  public queueOutbox(action: "set" | "delete", collectionName: string, id: string, data?: any): void {
    if (typeof window === "undefined") return;
    const outboxKey = this.getOutboxKey();
    const existing = localStorage.getItem(outboxKey);
    const queue: OutboxItem[] = existing ? JSON.parse(existing) : [];
    queue.push({ id, action, collectionName, data, timestamp: Date.now() });
    localStorage.setItem(outboxKey, JSON.stringify(queue));
  }

  public async flushOutbox(): Promise<void> {
    if (!isFirebaseReady || !db || typeof window === "undefined") return;
    const outboxKey = this.getOutboxKey();
    const existing = localStorage.getItem(outboxKey);
    if (!existing) return;
    const queue: OutboxItem[] = JSON.parse(existing);
    if (queue.length === 0) return;

    const remaining: OutboxItem[] = [];
    for (const item of queue) {
      try {
        if (item.action === "set") {
          await setDoc(doc(db, item.collectionName, item.id), item.data, { merge: true });
        } else if (item.action === "delete") {
          await deleteDoc(doc(db, item.collectionName, item.id));
        }
      } catch (err) {
        console.warn(`Outbox sync failed for ${item.collectionName}/${item.id}, retaining in queue:`, err);
        remaining.push(item);
      }
    }
    localStorage.setItem(outboxKey, JSON.stringify(remaining));
  }
}

const offlineEngine = new OfflineCacheAndOutboxEngine();

// Auto-flush outbox when browser comes back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineEngine.flushOutbox().catch(err => console.error("Error flushing offline outbox:", err));
  });
}

// Unified Primary Data Fetcher & Modifier (Firestore is primary source of truth)
async function fetchCollection<T extends { id: string }>(collectionName: string, defaultData: T[]): Promise<T[]> {
  if (isFirebaseReady && db) {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const items = snapshot.docs.map(docSnap => docSnap.data() as T);
        offlineEngine.saveCache(collectionName, items);
        return items;
      }
    } catch (err) {
      console.warn(`Firestore primary read failed for "${collectionName}". Falling back to offline cache:`, err);
    }
  }
  return offlineEngine.getCache<T>(collectionName, defaultData);
}

async function writeDocument<T extends { id: string }>(collectionName: string, item: T, defaultData: T[]): Promise<void> {
  // 1. Update local cache immediately for instantaneous UI updates
  offlineEngine.updateCacheItem<T>(collectionName, item, defaultData);

  // 2. Primary Firestore sync or Outbox Queue
  if (isFirebaseReady && db) {
    try {
      await setDoc(doc(db, collectionName, item.id), item, { merge: true });
    } catch (err) {
      console.warn(`Firestore primary write failed for "${collectionName}/${item.id}". Enqueueing in outbox:`, err);
      offlineEngine.queueOutbox("set", collectionName, item.id, item);
    }
  } else {
    offlineEngine.queueOutbox("set", collectionName, item.id, item);
  }
}

async function removeDocument<T extends { id: string }>(collectionName: string, id: string, defaultData: T[]): Promise<void> {
  offlineEngine.deleteCacheItem<T>(collectionName, id, defaultData);

  if (isFirebaseReady && db) {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      console.warn(`Firestore primary delete failed for "${collectionName}/${id}". Enqueueing in outbox:`, err);
      offlineEngine.queueOutbox("delete", collectionName, id);
    }
  } else {
    offlineEngine.queueOutbox("delete", collectionName, id);
  }
}

// Master Database Services
export const DbService = {
  // Flush offline modifications manually if needed
  async syncOutboxNow(): Promise<void> {
    await offlineEngine.flushOutbox();
  },

  // === WORKERS ===
  async getWorkers(): Promise<Worker[]> {
    return fetchCollection<Worker>("workers", initialWorkers);
  },

  async addWorker(worker: Worker): Promise<void> {
    await writeDocument<Worker>("workers", worker, initialWorkers);
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
  },

  async updateWorker(worker: Worker): Promise<void> {
    await writeDocument<Worker>("workers", worker, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
  },

  async deleteWorker(id: string): Promise<void> {
    await removeDocument<Worker>("workers", id, initialWorkers);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
  },

  // === TEAMS ===
  async getTeams(): Promise<Team[]> {
    return fetchCollection<Team>("teams", initialTeams);
  },

  async addTeam(team: Team): Promise<void> {
    await writeDocument<Team>("teams", team, initialTeams);
  },

  // === ATTENDANCE RECORDS ===
  async getAttendance(): Promise<AttendanceRecord[]> {
    return fetchCollection<AttendanceRecord>("attendance", initialAttendance);
  },

  async addAttendanceRecord(record: AttendanceRecord): Promise<void> {
    await writeDocument<AttendanceRecord>("attendance", record, initialAttendance);
  },

  async updateAttendanceRecord(record: AttendanceRecord): Promise<void> {
    await writeDocument<AttendanceRecord>("attendance", record, initialAttendance);
  },

  // === PERFORMANCE EVALUATIONS ===
  async getEvaluations(): Promise<PerformanceEvaluation[]> {
    return fetchCollection<PerformanceEvaluation>("evaluations", initialEvaluations);
  },

  async addEvaluation(evaluation: PerformanceEvaluation): Promise<void> {
    await writeDocument<PerformanceEvaluation>("evaluations", evaluation, initialEvaluations);
  },

  // === PROJECT ZONES ===
  async getZones(): Promise<ProjectZone[]> {
    return fetchCollection<ProjectZone>("zones", initialZones);
  },

  async updateZone(zone: ProjectZone): Promise<void> {
    await writeDocument<ProjectZone>("zones", zone, initialZones);
  },

  // === DAILY PROGRESS LOGS ===
  async getProgressLogs(): Promise<DailyProgressLog[]> {
    return fetchCollection<DailyProgressLog>("progressLogs", initialProgressLogs);
  },

  async addProgressLog(log: DailyProgressLog): Promise<void> {
    await writeDocument<DailyProgressLog>("progressLogs", log, initialProgressLogs);
  },

  // === SAFETY LOGS ===
  async getSafetyLogs(): Promise<SafetyLog[]> {
    return fetchCollection<SafetyLog>("safetyLogs", initialSafetyLogs);
  },

  async addSafetyLog(log: SafetyLog): Promise<void> {
    await writeDocument<SafetyLog>("safetyLogs", log, initialSafetyLogs);
  },

  // === QUALITY SNAGS ===
  async getQualitySnags(): Promise<QualitySnag[]> {
    return fetchCollection<QualitySnag>("qualitySnags", initialQualitySnags);
  },

  async addQualitySnag(snag: QualitySnag): Promise<void> {
    await writeDocument<QualitySnag>("qualitySnags", snag, initialQualitySnags);
  },

  async updateQualitySnag(snag: QualitySnag): Promise<void> {
    await writeDocument<QualitySnag>("qualitySnags", snag, initialQualitySnags);
  },

  // === QUALITY LOGS ===
  async getQualityLogs(): Promise<QualityLog[]> {
    return fetchCollection<QualityLog>("qualityLogs", initialQualityLogs);
  },

  async addQualityLog(log: QualityLog): Promise<void> {
    await writeDocument<QualityLog>("qualityLogs", log, initialQualityLogs);
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
    return fetchCollection<SystemNotification>("notifications", defaultNotifs);
  },

  async addNotification(notif: SystemNotification): Promise<void> {
    await writeDocument<SystemNotification>("notifications", notif, []);
  },

  async updateNotification(notif: SystemNotification): Promise<void> {
    await writeDocument<SystemNotification>("notifications", notif, []);
  },

  // === AUDIT LOGS ===
  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchCollection<AuditLog>("auditLogs", initialAuditLogs);
  },

  async addAuditLog(log: AuditLog): Promise<void> {
    await writeDocument<AuditLog>("auditLogs", log, initialAuditLogs);
  },

  // === ALUMINUM FORMWORK PANELS ===
  async getFormworkPanels(): Promise<AluminumFormworkPanel[]> {
    return fetchCollection<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
  },

  async addFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    await writeDocument<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
  },

  async updateFormworkPanel(panel: AluminumFormworkPanel): Promise<void> {
    await writeDocument<AluminumFormworkPanel>("formworkPanels", panel, initialFormworkPanels);
  },

  async deleteFormworkPanel(id: string): Promise<void> {
    await removeDocument<AluminumFormworkPanel>("formworkPanels", id, initialFormworkPanels);
  },

  // === PANEL MOVEMENT LOGS ===
  async getPanelMovementLogs(): Promise<PanelMovementLog[]> {
    return fetchCollection<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
  },

  async addPanelMovementLog(log: PanelMovementLog): Promise<void> {
    await writeDocument<PanelMovementLog>("panelMovementLogs", log, initialMovementLogs);
  },

  // === PANEL DAMAGE REPORTS ===
  async getPanelDamageReports(): Promise<PanelDamageReport[]> {
    return fetchCollection<PanelDamageReport>("panelDamageReports", initialDamageReports);
  },

  async addPanelDamageReport(report: PanelDamageReport): Promise<void> {
    await writeDocument<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
  },

  async updatePanelDamageReport(report: PanelDamageReport): Promise<void> {
    await writeDocument<PanelDamageReport>("panelDamageReports", report, initialDamageReports);
  },

  // === PANEL REPAIR RECORDS ===
  async getPanelRepairRecords(): Promise<PanelRepairRecord[]> {
    return fetchCollection<PanelRepairRecord>("panelRepairRecords", initialRepairRecords);
  },

  async addPanelRepairRecord(record: PanelRepairRecord): Promise<void> {
    await writeDocument<PanelRepairRecord>("panelRepairRecords", record, initialRepairRecords);
  },

  // === OVERSEAS SHIPMENTS & CUSTOMS ===
  async getOverseasShipments(): Promise<OverseasShipment[]> {
    return fetchCollection<OverseasShipment>("overseasShipments", initialShipments);
  },
  async addOverseasShipment(shipment: OverseasShipment): Promise<void> {
    await writeDocument<OverseasShipment>("overseasShipments", shipment, initialShipments);
  },
  async getCustomsRecords(): Promise<CustomsRecord[]> {
    return fetchCollection<CustomsRecord>("customsRecords", initialCustomsRecords);
  },
  async addCustomsRecord(record: CustomsRecord): Promise<void> {
    await writeDocument<CustomsRecord>("customsRecords", record, initialCustomsRecords);
  },

  // === DISPATCH TRANSFERS ===
  async getDispatchTransfers(): Promise<DispatchTransfer[]> {
    return fetchCollection<DispatchTransfer>("dispatchTransfers", initialDispatchTransfers);
  },
  async addDispatchTransfer(transfer: DispatchTransfer): Promise<void> {
    await writeDocument<DispatchTransfer>("dispatchTransfers", transfer, initialDispatchTransfers);
  },
  async updateDispatchTransfer(transfer: DispatchTransfer): Promise<void> {
    await writeDocument<DispatchTransfer>("dispatchTransfers", transfer, initialDispatchTransfers);
  },

  // === SITE RECEIVING REPORTS ===
  async getSiteReceivingReports(): Promise<SiteReceivingReport[]> {
    return fetchCollection<SiteReceivingReport>("siteReceivingReports", initialSiteReceivingReports);
  },
  async addSiteReceivingReport(report: SiteReceivingReport): Promise<void> {
    await writeDocument<SiteReceivingReport>("siteReceivingReports", report, initialSiteReceivingReports);
  },

  // === INVENTORY AUDITS ===
  async getInventoryAudits(): Promise<InventoryAuditRecord[]> {
    return fetchCollection<InventoryAuditRecord>("inventoryAudits", initialInventoryAudits);
  },
  async addInventoryAudit(audit: InventoryAuditRecord): Promise<void> {
    await writeDocument<InventoryAuditRecord>("inventoryAudits", audit, initialInventoryAudits);
  },

  // === REGISTERED SITES ===
  async getRegisteredSites(): Promise<RegisteredSite[]> {
    return fetchCollection<RegisteredSite>("registeredSites", initialRegisteredSites);
  },
  async addRegisteredSite(site: RegisteredSite): Promise<void> {
    await writeDocument<RegisteredSite>("registeredSites", site, initialRegisteredSites);
  },
  async updateRegisteredSite(site: RegisteredSite): Promise<void> {
    await writeDocument<RegisteredSite>("registeredSites", site, initialRegisteredSites);
  },
  async deleteRegisteredSite(id: string): Promise<void> {
    await removeDocument<RegisteredSite>("registeredSites", id, initialRegisteredSites);
  }
};
