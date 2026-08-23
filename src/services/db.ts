import { db, auth, isFirebaseReady, handleFirestoreError, OperationType } from "../firebase";
import { NotificationService } from "./notificationService";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  onSnapshot
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
  RegisteredSite,
  RegisteredWarehouse,
  PayrollRecord,
  Expense
} from "../types";
import {
  StoreMaterialItem,
  MaterialReceivingReport,
  MaterialIssueRecord,
  MaterialReturnRecord,
  MaterialRequestItem,
  StoreAuditRecord,
  TruckFleetItem,
  SupplierDeliverySchedule,
  InterSiteTransferVoucher,
  SitePanelBreakdown,
  DailyMaterialRequisition,
  DailyConsumptionVariance,
  RequisitionAuditLog,
  DailyReturnReport,
  DailyConsolidatedReport
} from "../components/StoreOwnerApp";
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
  initialRegisteredSites,
  initialWarehouses,
  initialPayrollRecords
} from "../data";
import {
  initialStoreItems,
  initialReceivingReports,
  initialIssueRecords,
  initialReturnRecords,
  initialMaterialRequests,
  initialStoreAuditRecords,
  initialTruckFleets,
  initialSupplierSchedules,
  initialInterSiteTransfers,
  initialSitePanelBreakdowns,
  initialDailyRequisitions,
  initialDailyConsumptionVariances,
  initialRequisitionAuditLogs,
  initialDailyReturnReports,
  initialDailyConsolidatedReports
} from "../data/storeOwnerData";

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
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        try {
          localStorage.setItem(key, JSON.stringify(defaultData));
        } catch (e) {
          console.warn(`localStorage setItem notice for "${collectionName}":`, e);
        }
        return defaultData;
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn(`Error reading offline cache collection "${collectionName}":`, e);
      return defaultData;
    }
  }

  public saveCache<T>(collectionName: string, list: T[]): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey(collectionName);
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
      console.warn(`localStorage saveCache notice for "${collectionName}":`, e);
    }
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
    try {
      const outboxKey = this.getOutboxKey();
      const existing = localStorage.getItem(outboxKey);
      const queue: OutboxItem[] = existing ? JSON.parse(existing) : [];
      queue.push({ id, action, collectionName, data, timestamp: Date.now() });
      localStorage.setItem(outboxKey, JSON.stringify(queue));
    } catch (e) {
      console.warn("queueOutbox error notice:", e);
    }
  }

  public async flushOutbox(): Promise<void> {
    if (!isFirebaseReady || !db || typeof window === "undefined") return;
    try {
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
    } catch (e) {
      console.warn("flushOutbox error notice:", e);
    }
  }
}

const offlineEngine = new OfflineCacheAndOutboxEngine();

// Auto-flush outbox when browser comes back online or loads
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    offlineEngine.flushOutbox().catch(err => console.error("Error flushing offline outbox:", err));
  });
  // Flush queued items immediately on module load
  setTimeout(() => {
    offlineEngine.flushOutbox().catch(() => {});
  }, 1000);
}

// Unified Primary Data Fetcher & Modifier (Firestore is primary source of truth)
async function fetchCollection<T extends { id: string }>(collectionName: string, defaultData: T[]): Promise<T[]> {
  if (isFirebaseReady && db) {
    try {
      console.log(`[DbService] Fetching Firestore collection "${collectionName}"...`);
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      const cached = offlineEngine.getCache<T>(collectionName, defaultData);

      if (!snapshot.empty) {
        const items = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as T;
          return { ...data, id: data.id || docSnap.id };
        });
        console.log(`[DbService] Successfully loaded ${items.length} documents from Firestore collection "${collectionName}".`);
        
        // Merge Firestore items with local-only cached items so newly registered items aren't wiped
        const fsIds = new Set(items.map(x => x.id));
        const localOnly = cached.filter(x => x && x.id && !fsIds.has(x.id));
        const combined = [...items, ...localOnly];

        offlineEngine.saveCache(collectionName, combined);

        // Back-fill local-only registered items to Firestore
        if (localOnly.length > 0) {
          console.log(`[DbService] Found ${localOnly.length} local-only item(s) in "${collectionName}". Syncing to Firestore...`);
          localOnly.forEach(item => {
            setDoc(doc(db, collectionName, item.id), item, { merge: true }).catch(err => {
              console.warn(`[DbService] Auto-syncing local document ${item.id} to Firestore failed:`, err);
            });
          });
        }

        return combined;
      } else {
        console.log(`[DbService] Firestore collection "${collectionName}" is empty. Checking local cache (${cached.length} items).`);
        // If Firestore is empty, upload all cached items to Firestore if available
        if (cached && cached.length > 0) {
          cached.forEach(item => {
            setDoc(doc(db, collectionName, item.id), item, { merge: true }).catch(err => {
              console.warn(`[DbService] Initial seed sync for ${item.id} failed:`, err);
            });
          });
        }
        return cached;
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
      console.log(`[DbService] Writing document "${item.id}" to Firestore collection "${collectionName}"...`);
      await setDoc(doc(db, collectionName, item.id), item, { merge: true });
      console.log(`[DbService] Successfully saved document "${item.id}" to Firestore collection "${collectionName}".`);
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
      console.log(`[DbService] Deleting document "${id}" from Firestore collection "${collectionName}"...`);
      await deleteDoc(doc(db, collectionName, id));
      console.log(`[DbService] Successfully deleted document "${id}" from Firestore collection "${collectionName}".`);
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
            "Super Admin",
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
  async getNotifications(): Promise<any[]> {
    const defaultNotifs: any[] = [
      {
        id: "n-1",
        type: "Zone Delay",
        title: "Zone C Schedule Warning",
        message: "Zone C Concrete casting is delayed by 3.5 days against standard cycle layout times.",
        description: "Zone C Concrete casting is delayed by 3.5 days against standard cycle layout times.",
        category: "Project Progress Notifications",
        priority: "High",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: "n-2",
        type: "Safety Alert",
        title: "PPE Defects Detected",
        message: "Supervisor reported 3 PPE defects during active shifts on Floor 4.",
        description: "Supervisor reported 3 PPE defects during active shifts on Floor 4.",
        category: "HSE Notifications",
        priority: "Critical",
        status: "Unread",
        projectName: "Addis Ababa Tower Block A",
        timestamp: new Date().toISOString(),
        read: false
      }
    ];
    return fetchCollection<any>("notifications", defaultNotifs);
  },

  subscribeNotifications(
    callback: (notifs: any[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (isFirebaseReady && db) {
      console.log("[DbService] Subscribing real-time onSnapshot listener to 'notifications'...");
      const colRef = collection(db, "notifications");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { ...data, id: data.id || docSnap.id };
          });
          console.log(`[DbService.onSnapshot] Live update received for 'notifications'. Document count: ${items.length}`);
          if (items.length > 0) {
            offlineEngine.saveCache("notifications", items);
            callback(items);
          } else {
            const cached = offlineEngine.getCache<any>("notifications", []);
            callback(cached);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "notifications");
          console.warn("[DbService.onSnapshot] Error in 'notifications' listener:", error);
          if (onError) onError(error);
          const cached = offlineEngine.getCache<any>("notifications", []);
          callback(cached);
        }
      );
      return unsubscribe;
    } else {
      const cached = offlineEngine.getCache<any>("notifications", []);
      callback(cached);
      return () => {};
    }
  },

  async addNotification(notif: any): Promise<void> {
    await writeDocument<any>("notifications", notif, []);
  },

  async updateNotification(notif: any): Promise<void> {
    await writeDocument<any>("notifications", notif, []);
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

  subscribeFormworkPanels(
    callback: (panels: AluminumFormworkPanel[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (isFirebaseReady && db) {
      console.log("[DbService] Subscribing real-time onSnapshot listener to 'formworkPanels'...");
      const colRef = collection(db, "formworkPanels");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map(docSnap => {
            const data = docSnap.data() as AluminumFormworkPanel;
            return { ...data, id: data.id || docSnap.id };
          });
          console.log(`[DbService.onSnapshot] Live update received for 'formworkPanels'. Document count: ${items.length}`);
          if (items.length > 0) {
            offlineEngine.saveCache("formworkPanels", items);
            callback(items);
          } else {
            const cached = offlineEngine.getCache<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
            callback(cached);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "formworkPanels");
          console.warn("[DbService.onSnapshot] Error in 'formworkPanels' listener, falling back to cache:", error);
          if (onError) onError(error);
          const cached = offlineEngine.getCache<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
          callback(cached);
        }
      );
      return unsubscribe;
    } else {
      console.log("[DbService] Firebase not active for 'formworkPanels'. Returning cached state.");
      const cached = offlineEngine.getCache<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
      callback(cached);
      return () => {};
    }
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

  subscribePanelMovementLogs(
    callback: (logs: PanelMovementLog[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (isFirebaseReady && db) {
      console.log("[DbService] Subscribing real-time onSnapshot listener to 'panelMovementLogs'...");
      const colRef = collection(db, "panelMovementLogs");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map(docSnap => {
            const data = docSnap.data() as PanelMovementLog;
            return { ...data, id: data.id || docSnap.id };
          });
          console.log(`[DbService.onSnapshot] Live update received for 'panelMovementLogs'. Document count: ${items.length}`);
          if (items.length > 0) {
            offlineEngine.saveCache("panelMovementLogs", items);
            callback(items);
          } else {
            const cached = offlineEngine.getCache<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
            callback(cached);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelMovementLogs");
          console.warn("[DbService.onSnapshot] Error in 'panelMovementLogs' listener, falling back to cache:", error);
          if (onError) onError(error);
          const cached = offlineEngine.getCache<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
          callback(cached);
        }
      );
      return unsubscribe;
    } else {
      console.log("[DbService] Firebase not active for 'panelMovementLogs'. Returning cached state.");
      const cached = offlineEngine.getCache<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
      callback(cached);
      return () => {};
    }
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
  },

  // === REGISTERED WAREHOUSES ===
  async getWarehouses(): Promise<RegisteredWarehouse[]> {
    return fetchCollection<RegisteredWarehouse>("registeredWarehouses", initialWarehouses);
  },
  async addWarehouse(warehouse: RegisteredWarehouse): Promise<void> {
    await writeDocument<RegisteredWarehouse>("registeredWarehouses", warehouse, initialWarehouses);
  },
  async updateWarehouse(warehouse: RegisteredWarehouse): Promise<void> {
    await writeDocument<RegisteredWarehouse>("registeredWarehouses", warehouse, initialWarehouses);
  },
  async deleteWarehouse(id: string): Promise<void> {
    await removeDocument<RegisteredWarehouse>("registeredWarehouses", id, initialWarehouses);
  },

  // === EXPENSES ===
  async getExpenses(): Promise<Expense[]> {
    return fetchCollection<Expense>("expenses", []);
  },
  async addExpense(expense: Expense): Promise<void> {
    await writeDocument<Expense>("expenses", expense, []);
  },

  // === GENERIC COLLECTION HELPERS ===
  fetchCollection,
  writeDocument,
  removeDocument,

  // === 15 STORE OWNER DATASETS ===
  // 1. storeItems (materials)
  async getStoreItems(): Promise<StoreMaterialItem[]> {
    return fetchCollection<StoreMaterialItem>("materials", initialStoreItems);
  },
  async saveStoreItem(item: StoreMaterialItem): Promise<void> {
    await writeDocument<StoreMaterialItem>("materials", item, initialStoreItems);
  },
  async saveStoreItems(items: StoreMaterialItem[]): Promise<void> {
    for (const item of items) {
      await writeDocument<StoreMaterialItem>("materials", item, initialStoreItems);
    }
  },

  // 2. receivingReports (siteReceivingReports)
  async getReceivingReports(): Promise<MaterialReceivingReport[]> {
    return fetchCollection<MaterialReceivingReport>("siteReceivingReports", initialReceivingReports);
  },
  async saveReceivingReport(report: MaterialReceivingReport): Promise<void> {
    await writeDocument<MaterialReceivingReport>("siteReceivingReports", report, initialReceivingReports);
  },

  // 3. issueRecords (materialIssueRecords)
  async getIssueRecords(): Promise<MaterialIssueRecord[]> {
    return fetchCollection<MaterialIssueRecord>("materialIssueRecords", initialIssueRecords);
  },
  async saveIssueRecord(record: MaterialIssueRecord): Promise<void> {
    await writeDocument<MaterialIssueRecord>("materialIssueRecords", record, initialIssueRecords);
  },

  // 4. returnRecords (materialReturnRecords)
  async getReturnRecords(): Promise<MaterialReturnRecord[]> {
    return fetchCollection<MaterialReturnRecord>("materialReturnRecords", initialReturnRecords);
  },
  async saveReturnRecord(record: MaterialReturnRecord): Promise<void> {
    await writeDocument<MaterialReturnRecord>("materialReturnRecords", record, initialReturnRecords);
  },

  // 5. materialRequests (materialRequests)
  async getMaterialRequests(): Promise<MaterialRequestItem[]> {
    return fetchCollection<MaterialRequestItem>("materialRequests", initialMaterialRequests);
  },
  async saveMaterialRequest(request: MaterialRequestItem): Promise<void> {
    await writeDocument<MaterialRequestItem>("materialRequests", request, initialMaterialRequests);
  },

  // 6. auditRecords (inventoryAudits)
  async getAuditRecords(): Promise<StoreAuditRecord[]> {
    return fetchCollection<StoreAuditRecord>("inventoryAudits", initialStoreAuditRecords);
  },
  async saveAuditRecord(audit: StoreAuditRecord): Promise<void> {
    await writeDocument<StoreAuditRecord>("inventoryAudits", audit, initialStoreAuditRecords);
  },

  // 7. truckFleets (truckFleets)
  async getTruckFleets(): Promise<TruckFleetItem[]> {
    return fetchCollection<TruckFleetItem>("truckFleets", initialTruckFleets);
  },
  async saveTruckFleet(fleet: TruckFleetItem): Promise<void> {
    await writeDocument<TruckFleetItem>("truckFleets", fleet, initialTruckFleets);
  },
  async saveTruckFleets(fleets: TruckFleetItem[]): Promise<void> {
    for (const f of fleets) {
      await writeDocument<TruckFleetItem>("truckFleets", f, initialTruckFleets);
    }
  },

  // 8. supplierSchedules (supplierSchedules)
  async getSupplierSchedules(): Promise<SupplierDeliverySchedule[]> {
    return fetchCollection<SupplierDeliverySchedule>("supplierSchedules", initialSupplierSchedules);
  },
  async saveSupplierSchedule(schedule: SupplierDeliverySchedule): Promise<void> {
    await writeDocument<SupplierDeliverySchedule>("supplierSchedules", schedule, initialSupplierSchedules);
  },

  // 9. interSiteTransfers (dispatchTransfers)
  async getInterSiteTransfers(): Promise<InterSiteTransferVoucher[]> {
    return fetchCollection<InterSiteTransferVoucher>("dispatchTransfers", initialInterSiteTransfers);
  },
  async saveInterSiteTransfer(transfer: InterSiteTransferVoucher): Promise<void> {
    await writeDocument<InterSiteTransferVoucher>("dispatchTransfers", transfer, initialInterSiteTransfers);
  },

  // 10. sitePanelBreakdowns (sitePanelBreakdowns)
  async getSitePanelBreakdowns(): Promise<SitePanelBreakdown[]> {
    return fetchCollection<SitePanelBreakdown>("sitePanelBreakdowns", initialSitePanelBreakdowns);
  },
  async saveSitePanelBreakdown(breakdown: SitePanelBreakdown): Promise<void> {
    await writeDocument<SitePanelBreakdown>("sitePanelBreakdowns", breakdown, initialSitePanelBreakdowns);
  },

  // 11. dailyRequisitions (dailyRequisitions)
  async getDailyRequisitions(): Promise<DailyMaterialRequisition[]> {
    return fetchCollection<DailyMaterialRequisition>("dailyRequisitions", initialDailyRequisitions);
  },
  async saveDailyRequisition(requisition: DailyMaterialRequisition): Promise<void> {
    await writeDocument<DailyMaterialRequisition>("dailyRequisitions", requisition, initialDailyRequisitions);
  },

  // 12. dailyConsumptionVariances (dailyConsumptionVariances)
  async getDailyConsumptionVariances(): Promise<DailyConsumptionVariance[]> {
    return fetchCollection<DailyConsumptionVariance>("dailyConsumptionVariances", initialDailyConsumptionVariances);
  },
  async saveDailyConsumptionVariance(variance: DailyConsumptionVariance): Promise<void> {
    await writeDocument<DailyConsumptionVariance>("dailyConsumptionVariances", variance, initialDailyConsumptionVariances);
  },

  // 13. requisitionAuditLogs (requisitionAuditLogs)
  async getRequisitionAuditLogs(): Promise<RequisitionAuditLog[]> {
    return fetchCollection<RequisitionAuditLog>("requisitionAuditLogs", initialRequisitionAuditLogs);
  },
  async saveRequisitionAuditLog(log: RequisitionAuditLog): Promise<void> {
    await writeDocument<RequisitionAuditLog>("requisitionAuditLogs", log, initialRequisitionAuditLogs);
  },

  // 14. dailyReturnReports (dailyReturnReports)
  async getDailyReturnReports(): Promise<DailyReturnReport[]> {
    return fetchCollection<DailyReturnReport>("dailyReturnReports", initialDailyReturnReports);
  },
  async saveDailyReturnReport(report: DailyReturnReport): Promise<void> {
    await writeDocument<DailyReturnReport>("dailyReturnReports", report, initialDailyReturnReports);
  },

  // 15. dailyConsolidatedReports (dailyConsolidatedReports)
  async getDailyConsolidatedReports(): Promise<DailyConsolidatedReport[]> {
    return fetchCollection<DailyConsolidatedReport>("dailyConsolidatedReports", initialDailyConsolidatedReports);
  },
  async saveDailyConsolidatedReport(report: DailyConsolidatedReport): Promise<void> {
    await writeDocument<DailyConsolidatedReport>("dailyConsolidatedReports", report, initialDailyConsolidatedReports);
  },

  // 16. payroll (payroll)
  async getPayrollRecords(): Promise<PayrollRecord[]> {
    return fetchCollection<PayrollRecord>("payroll", initialPayrollRecords);
  },
  async savePayrollRecord(record: PayrollRecord): Promise<void> {
    const docToSave: PayrollRecord = {
      ...record,
      employeeId: record.employeeId || record.workerId,
      updatedAt: record.updatedAt || new Date().toISOString()
    };
    await writeDocument<PayrollRecord>("payroll", docToSave, []);
  },
  async savePayrollRecords(records: PayrollRecord[]): Promise<void> {
    for (const record of records) {
      await this.savePayrollRecord(record);
    }
  },

  // 17. procurements
  async getProcurements(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("procurements", defaultItems);
  },
  async addProcurement(item: any): Promise<void> {
    await writeDocument<any>("procurements", item, []);
  },

  // 18. equipment
  async getEquipmentLogs(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("equipment", defaultItems);
  },
  async addEquipmentLog(item: any): Promise<void> {
    await writeDocument<any>("equipment", item, []);
  },

  // 19. employeeFeedbacks
  async getEmployeeFeedbacks(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("employeeFeedbacks", defaultItems);
  },
  async addEmployeeFeedback(item: any): Promise<void> {
    await writeDocument<any>("employeeFeedbacks", item, []);
  },

  // 20. performanceAppraisals
  async getPerformanceAppraisals(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("performanceAppraisals", defaultItems);
  },
  async addPerformanceAppraisal(item: any): Promise<void> {
    await writeDocument<any>("performanceAppraisals", item, []);
  },

  // === BATCH A: Enterprise ERP Collections ===
  // 1. materials (reuses existing "materials" collection)
  async getMaterials(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("materials", defaultItems);
  },
  async addMaterial(item: any): Promise<void> {
    await writeDocument<any>("materials", item, []);
  },

  // 2. hseLogs (reuses existing "safetyLogs" collection)
  async getHseLogs(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("safetyLogs", defaultItems);
  },
  async addHseLog(item: any): Promise<void> {
    await writeDocument<any>("safetyLogs", item, []);
  },

  // 3. qualityControls (reuses existing "qualityLogs" collection)
  async getQualityControls(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("qualityLogs", defaultItems);
  },
  async addQualityControl(item: any): Promise<void> {
    await writeDocument<any>("qualityLogs", item, []);
  },

  // 4. concreteTrucks (new "concreteTruckLogs" collection)
  async getConcreteTrucks(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("concreteTruckLogs", defaultItems);
  },
  async addConcreteTruck(item: any): Promise<void> {
    await writeDocument<any>("concreteTruckLogs", item, []);
  },

  // === BATCH B: Enterprise ERP Collections ===
  // 1. documents ("enterpriseDocuments")
  async getEnterpriseDocuments(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("enterpriseDocuments", defaultItems);
  },
  async addEnterpriseDocument(item: any): Promise<void> {
    await writeDocument<any>("enterpriseDocuments", item, []);
  },

  // 2. chats and voice messages ("enterpriseChatMessages")
  async getEnterpriseChatMessages(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("enterpriseChatMessages", defaultItems);
  },
  async addEnterpriseChatMessage(item: any): Promise<void> {
    await writeDocument<any>("enterpriseChatMessages", item, []);
  },

  // 3. clientApprovals ("clientApprovals")
  async getClientApprovals(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("clientApprovals", defaultItems);
  },
  async addClientApproval(item: any): Promise<void> {
    await writeDocument<any>("clientApprovals", item, []);
  },

  // 4. diaryLogs ("siteDiaryLogs")
  async getSiteDiaryLogs(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("siteDiaryLogs", defaultItems);
  },
  async addSiteDiaryLog(item: any): Promise<void> {
    await writeDocument<any>("siteDiaryLogs", item, []);
  },

  // === BATCH C: Enterprise ERP Collections ===
  // 1. permits ("projectPermits")
  async getProjectPermits(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("projectPermits", defaultItems);
  },
  async addProjectPermit(item: any): Promise<void> {
    await writeDocument<any>("projectPermits", item, []);
  },
  async updateProjectPermit(item: any): Promise<void> {
    await writeDocument<any>("projectPermits", item, []);
  },

  // 2. assets ("enterpriseAssets")
  async getEnterpriseAssets(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("enterpriseAssets", defaultItems);
  },
  async addEnterpriseAsset(item: any): Promise<void> {
    await writeDocument<any>("enterpriseAssets", item, []);
  },
  async updateEnterpriseAsset(item: any): Promise<void> {
    await writeDocument<any>("enterpriseAssets", item, []);
  },

  // 3. maintenanceSchedule ("maintenanceSchedules")
  async getMaintenanceSchedules(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("maintenanceSchedules", defaultItems);
  },
  async addMaintenanceSchedule(item: any): Promise<void> {
    await writeDocument<any>("maintenanceSchedules", item, []);
  },
  async updateMaintenanceSchedule(item: any): Promise<void> {
    await writeDocument<any>("maintenanceSchedules", item, []);
  },

  // 4. costItems ("costTrackingItems")
  async getCostTrackingItems(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("costTrackingItems", defaultItems);
  },
  async addCostTrackingItem(item: any): Promise<void> {
    await writeDocument<any>("costTrackingItems", item, []);
  },
  async updateCostTrackingItem(item: any): Promise<void> {
    await writeDocument<any>("costTrackingItems", item, []);
  },

  // === BATCH D: Enterprise ERP Collections ===
  // 1. aiRisks ("aiRiskAssessments")
  async getAiRiskAssessments(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("aiRiskAssessments", defaultItems);
  },
  async addAiRiskAssessment(item: any): Promise<void> {
    await writeDocument<any>("aiRiskAssessments", item, []);
  },
  async updateAiRiskAssessment(item: any): Promise<void> {
    await writeDocument<any>("aiRiskAssessments", item, []);
  },

  // 2. trainingRecords ("trainingRecords")
  async getTrainingRecords(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("trainingRecords", defaultItems);
  },
  async addTrainingRecord(item: any): Promise<void> {
    await writeDocument<any>("trainingRecords", item, []);
  },
  async updateTrainingRecord(item: any): Promise<void> {
    await writeDocument<any>("trainingRecords", item, []);
  },

  // 3. multiProjects (reuses existing "projects" collection)
  async getProjects(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("projects", defaultItems);
  },
  async addProject(item: any): Promise<void> {
    await writeDocument<any>("projects", item, []);
  },
  async updateProject(item: any): Promise<void> {
    await writeDocument<any>("projects", item, []);
  },

  // 4. apiLogs ("apiIntegrationLogs")
  async getApiIntegrationLogs(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("apiIntegrationLogs", defaultItems);
  },
  async addApiIntegrationLog(item: any): Promise<void> {
    await writeDocument<any>("apiIntegrationLogs", item, []);
  },

  // === BATCH E: Enterprise ERP Collections ===
  // 1. backupLogs ("backupLogs")
  async getBackupLogs(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("backupLogs", defaultItems);
  },
  async addBackupLog(item: any): Promise<void> {
    await writeDocument<any>("backupLogs", item, []);
  },
  async updateBackupLog(item: any): Promise<void> {
    await writeDocument<any>("backupLogs", item, []);
  },

  // 2. approvalWorkflows ("approvalWorkflows")
  async getApprovalWorkflows(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("approvalWorkflows", defaultItems);
  },
  async addApprovalWorkflow(item: any): Promise<void> {
    await writeDocument<any>("approvalWorkflows", item, []);
  },
  async updateApprovalWorkflow(item: any): Promise<void> {
    await writeDocument<any>("approvalWorkflows", item, []);
  }
};
