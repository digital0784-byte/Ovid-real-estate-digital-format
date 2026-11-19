import { db, auth, storage, isFirebaseReady, handleFirestoreError, OperationType, sanitizeForFirestore } from "../firebase";
import { NotificationService } from "./notificationService";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  limit,
  runTransaction
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
  WarehousePanelTypeEntry,
  PayrollRecord,
  Expense,
  TraceablePanel,
  PanelTraceabilityMovement,
  PanelDamageInspection,
  PanelIssueTransaction,
  PanelReturnTransaction,
  PanelInventoryReconciliationRecord,
  PanelTraceabilityAuditLog,
  ConfiguredDimensionOption,
  ErpTask,
  FinancialInvoiceRecord,
  FinancialPaymentRecord,
  FinancialAccount,
  CashTransactionRecord,
  FinancialBudgetRecord,
  MonthlyFinancialTarget,
  FinancialSettingsConfig,
  MonthlyCollectionPlan,
  MonthlyPaymentPlan,
  ProjectBudgetPlan,
  BudgetAllocationRecord,
  BudgetRevisionRecord,
  ActualCostEntry,
  CashFlowForecastItem,
  BankReconciliationRecord,
  BankTransactionRecord,
  ImmutableBankStatementRecord,
  ChartAccountRecord,
  JournalEntryRecord,
  FinancialPeriodCloseRecord,
  FinancialYearRecord,
  ManpowerPlanRecord,
  RecruitmentRequestRecord,
  WorkScheduleConfig,
  LeaveRequestRecord,
  OvertimeRequestRecord,
  EmployeeTransferRecord,
  SalaryStructureRecord,
  EthiopianTaxPensionConfig,
  SalaryAdvanceLoanRecord,
  HrmPayrollRunRecord,
  HrmPrivateProfileRecord,
  HrmPayslipRecord,
  BiometricDeviceRecord,
  BiometricDeviceMapping,
  BiometricMappingAuditLog,
  UnmappedBiometricEvent,
  AttendanceCorrectionRequest,
  AttendanceDeductionPolicy,
  AttendanceAuditLog,
} from "../types";
import { initialErpTasks } from "../data/initialTasks";
import {
  INITIAL_SEED_PANELS,
  INITIAL_SEED_MOVEMENTS,
  DEFAULT_DIMENSION_LIBRARY
} from "../data/panelTraceabilitySeed";
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

  public getRawCache<T>(collectionName: string): T[] | null {
    if (typeof window === "undefined") return null;
    const key = this.getStorageKey(collectionName);
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      console.warn(`Error reading raw cache collection "${collectionName}":`, e);
      return null;
    }
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

  public getOutboxQueue(): OutboxItem[] {
    if (typeof window === "undefined") return [];
    try {
      const existing = localStorage.getItem(this.getOutboxKey());
      if (!existing) return [];
      const queue: OutboxItem[] = JSON.parse(existing);
      if (!Array.isArray(queue)) return [];
      return [...queue].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    } catch {
      return [];
    }
  }

  public reconcileWithOutbox<T extends { id?: string }>(collectionName: string, firestoreItems: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of firestoreItems) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }

    const pendingActions = this.getOutboxQueue().filter(entry => entry.collectionName === collectionName);
    for (const entry of pendingActions) {
      if (entry.action === "delete") {
        map.delete(entry.id);
      } else if (entry.action === "set" && entry.data) {
        const existing = map.get(entry.id);
        map.set(entry.id, existing ? { ...existing, ...entry.data, id: entry.id } : { ...entry.data, id: entry.id });
      }
    }

    const reconciled = Array.from(map.values());
    this.saveCache(collectionName, reconciled);
    return reconciled;
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
    const isNavigatorOnline = typeof navigator === "undefined" || navigator.onLine !== false;
    if (!isFirebaseReady || !db || !isNavigatorOnline || (auth && !auth.currentUser) || typeof window === "undefined") return;
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
            await setDoc(doc(db, item.collectionName, item.id), sanitizeForFirestore(item.data), { merge: true });
          } else if (item.action === "delete") {
            await deleteDoc(doc(db, item.collectionName, item.id));
          }
        } catch (err: any) {
          const isPermissionDenied = 
            err?.code === "permission-denied" || 
            String(err?.message || "").includes("PERMISSION_DENIED");
          if (isPermissionDenied) {
            console.warn(`Outbox item ${item.collectionName}/${item.id} rejected by rules (permission-denied). Dropping from queue.`);
          } else {
            console.warn(`Outbox sync failed for ${item.collectionName}/${item.id}, retaining in queue:`, err);
            remaining.push(item);
          }
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
  setTimeout(() => {
    offlineEngine.flushOutbox().catch(() => {});
  }, 1000);
}

function canQueryFirestore(): boolean {
  const isNavigatorOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  return Boolean(isFirebaseReady && db && isNavigatorOnline && (auth ? Boolean(auth.currentUser) : true));
}

// Unified Primary Data Fetcher (Firestore is authoritative source of truth when online)
async function fetchCollection<T extends { id: string }>(collectionName: string, defaultData: T[], maxLimit: number = 100): Promise<T[]> {
  if (canQueryFirestore() && db) {
    try {
      const colRef = collection(db, collectionName);
      const q = query(colRef, limit(maxLimit));
      const snapshot = await getDocs(q);
      const items = snapshot.empty
        ? []
        : snapshot.docs.map(docSnap => {
            const data = docSnap.data() as T;
            return { ...data, id: data.id || docSnap.id };
          });
      return offlineEngine.reconcileWithOutbox<T>(collectionName, items);
    } catch (err) {
      console.warn(`Firestore primary read failed for "${collectionName}". Falling back to offline cache:`, err);
      const rawCache = offlineEngine.getRawCache<T>(collectionName);
      return rawCache ?? offlineEngine.getCache<T>(collectionName, defaultData);
    }
  }
  return offlineEngine.getCache<T>(collectionName, defaultData);
}

async function writeDocument<T extends { id: string }>(collectionName: string, item: T, defaultData: T[]): Promise<void> {
  const sanitizedItem = sanitizeForFirestore(item);
  // 1. Update local cache immediately for instantaneous UI updates
  offlineEngine.updateCacheItem<T>(collectionName, sanitizedItem, defaultData);

  // 2. Ensure stable capturedAt timestamp is preserved
  const itemWithTimestamp: any = {
    ...sanitizedItem,
    capturedAt: (sanitizedItem as any).capturedAt || (sanitizedItem as any).timestamp || new Date().toISOString()
  };

  // 3. Primary Firestore sync with idempotent setDoc or durable queue fallback
  if (isFirebaseReady && db) {
    try {
      console.log(`[DbService] Writing document "${sanitizedItem.id}" to Firestore collection "${collectionName}"...`);
      const syncPayload = {
        ...itemWithTimestamp,
        serverReceivedAt: new Date().toISOString()
      };
      await setDoc(doc(db, collectionName, sanitizedItem.id), syncPayload, { merge: true });
      console.log(`[DbService] Successfully saved document "${sanitizedItem.id}" to Firestore collection "${collectionName}".`);
    } catch (err: any) {
      const isPermissionDenied = 
        err?.code === "permission-denied" || 
        String(err?.message || "").includes("PERMISSION_DENIED");
      
      if (isPermissionDenied) {
        console.warn(`[DbService] Write rejected by Firestore security rules for "${collectionName}/${sanitizedItem.id}" (insufficient role permissions). Not queuing in outbox.`);
      } else {
        console.warn(`Firestore primary write failed for "${collectionName}/${sanitizedItem.id}". Enqueueing in durable outbox:`, err);
        offlineEngine.queueOutbox("set", collectionName, sanitizedItem.id, itemWithTimestamp);
        // Also register into durable queue for exponential backoff and status tracking
        try {
          const { offlineSyncService } = await import("./offlineSyncService");
          offlineSyncService.enqueue(collectionName, "set", itemWithTimestamp);
        } catch {}
      }
    }
  } else {
    offlineEngine.queueOutbox("set", collectionName, sanitizedItem.id, itemWithTimestamp);
    try {
      const { offlineSyncService } = await import("./offlineSyncService");
      offlineSyncService.enqueue(collectionName, "set", itemWithTimestamp);
    } catch {}
  }
}

async function removeDocument<T extends { id: string }>(collectionName: string, id: string, defaultData: T[]): Promise<void> {
  offlineEngine.deleteCacheItem<T>(collectionName, id, defaultData);

  if (isFirebaseReady && db) {
    try {
      console.log(`[DbService] Deleting document "${id}" from Firestore collection "${collectionName}"...`);
      await deleteDoc(doc(db, collectionName, id));
      console.log(`[DbService] Successfully deleted document "${id}" from Firestore collection "${collectionName}".`);
    } catch (err: any) {
      const isPermissionDenied = 
        err?.code === "permission-denied" || 
        String(err?.message || "").includes("PERMISSION_DENIED");
      
      if (isPermissionDenied) {
        console.warn(`[DbService] Delete rejected by Firestore security rules for "${collectionName}/${id}" (insufficient role permissions). Not queuing in outbox.`);
      } else {
        console.warn(`Firestore primary delete failed for "${collectionName}/${id}". Enqueueing in outbox:`, err);
        offlineEngine.queueOutbox("delete", collectionName, id);
      }
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

  // === USERS & REGISTRANTS ===
  async getUsers(): Promise<any[]> {
    return fetchCollection<any>("users", []);
  },

  async saveUser(userRecord: any): Promise<void> {
    const id = userRecord.uid || userRecord.id;
    if (!id) return;
    const normalized = sanitizeForFirestore({
      ...userRecord,
      id,
      uid: id,
      updatedAt: new Date().toISOString()
    });
    await writeDocument<any>("users", normalized, []);
    await writeDocument<any>("registrants", normalized, []);
    if (userRecord.employeeId && userRecord.employeeId !== id) {
      await writeDocument<any>("registrants", { ...normalized, id: userRecord.employeeId }, []);
    }
  },

  subscribeUsers(
    callback: (users: any[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "users");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return { ...data, id: data.id || data.uid || docSnap.id, uid: data.uid || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<any>("users", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "users");
          if (onError) onError(error);
          callback(offlineEngine.getCache<any>("users", []));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<any>("users", []));
      return () => {};
    }
  },

  // === WORKERS ===
  async getWorkers(): Promise<Worker[]> {
    return fetchCollection<Worker>("workers", initialWorkers);
  },

  subscribeWorkers(
    callback: (workersList: Worker[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "workers");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as any;
                const resolvedName = data.name || data.fullName || data.workerName || data.displayName || "";
                return {
                  ...data,
                  id: data.id || docSnap.id,
                  name: resolvedName,
                  company: data.company || "",
                  department: data.department || "Operations",
                  trade: data.trade || "General Labor",
                  status: data.status || "Active"
                } as Worker;
              });
          const reconciled = offlineEngine.reconcileWithOutbox<Worker>("workers", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "workers");
          if (onError) onError(error);
          callback(offlineEngine.getCache<Worker>("workers", initialWorkers));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<Worker>("workers", initialWorkers));
      return () => {};
    }
  },

  async addWorker(worker: Worker): Promise<void> {
    const safeWorker = { ...worker } as any;
    delete safeWorker.fingerprint;
    delete safeWorker.faceRecognitionData;
    delete safeWorker.fingerprintTemplate;
    delete safeWorker.faceTemplate;
    delete safeWorker.rawBiometricTemplate;
    delete safeWorker.biometricTemplate;
    delete safeWorker.biometricTemplateEncrypted;
    const cleanWorker = sanitizeForFirestore(safeWorker);
    await writeDocument<Worker>("workers", cleanWorker, initialWorkers);
    await writeDocument<Worker>("employees", cleanWorker, []);
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
    const safeWorker = { ...worker } as any;
    delete safeWorker.fingerprint;
    delete safeWorker.faceRecognitionData;
    delete safeWorker.fingerprintTemplate;
    delete safeWorker.faceTemplate;
    delete safeWorker.rawBiometricTemplate;
    delete safeWorker.biometricTemplate;
    delete safeWorker.biometricTemplateEncrypted;
    const cleanWorker = sanitizeForFirestore(safeWorker);
    await writeDocument<Worker>("workers", cleanWorker, initialWorkers);
    await writeDocument<Worker>("employees", cleanWorker, []);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("workers_updated"));
    }
  },

  async deleteWorker(id: string): Promise<void> {
    await removeDocument<Worker>("workers", id, initialWorkers);
    await removeDocument<Worker>("employees", id, []);
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
    const items = await fetchCollection<any>("notifications", defaultNotifs);

    // Apply persistent read state so read notifications never revert to unread
    let readIds = new Set<string>();
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("buildsync_read_notification_ids");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) readIds = new Set<string>(parsed);
        }
      } catch {}
    }

    const processed = items.map(n => {
      if (readIds.has(n.id) || n.status === "Read" || n.read === true) {
        return { ...n, status: "Read", read: true };
      }
      return n;
    });

    // Strictly sort newest to oldest (new to old)
    return processed.sort((a, b) => {
      const timeB = NotificationService.getNumericTimestamp(b);
      const timeA = NotificationService.getNumericTimestamp(a);
      if (timeB !== timeA) return timeB - timeA;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
  },

  subscribeNotifications(
    callback: (notifs: any[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "notifications");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return { ...data, id: data.id || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<any>("notifications", items);

          let readIds = new Set<string>();
          if (typeof window !== "undefined") {
            try {
              const raw = localStorage.getItem("buildsync_read_notification_ids");
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) readIds = new Set<string>(parsed);
              }
            } catch {}
          }

          const processed = reconciled.map(n => {
            if (readIds.has(n.id) || n.status === "Read" || n.read === true) {
              return { ...n, status: "Read", read: true };
            }
            return n;
          }).sort((a, b) => {
            const timeB = NotificationService.getNumericTimestamp(b);
            const timeA = NotificationService.getNumericTimestamp(a);
            if (timeB !== timeA) return timeB - timeA;
            return String(b.id || "").localeCompare(String(a.id || ""));
          });

          offlineEngine.saveCache("notifications", processed);
          callback(processed);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "notifications");
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
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "formworkPanels");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as AluminumFormworkPanel;
                return { ...data, id: data.id || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<AluminumFormworkPanel>("formworkPanels", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "formworkPanels");
          if (onError) onError(error);
          const cached = offlineEngine.getCache<AluminumFormworkPanel>("formworkPanels", initialFormworkPanels);
          callback(cached);
        }
      );
      return unsubscribe;
    } else {
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
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelMovementLogs");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelMovementLog;
                return { ...data, id: data.id || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelMovementLog>("panelMovementLogs", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelMovementLogs");
          if (onError) onError(error);
          const cached = offlineEngine.getCache<PanelMovementLog>("panelMovementLogs", initialMovementLogs);
          callback(cached);
        }
      );
      return unsubscribe;
    } else {
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
    await writeDocument<any>("warehouses", warehouse, []);
  },
  async updateWarehouse(warehouse: RegisteredWarehouse): Promise<void> {
    await writeDocument<RegisteredWarehouse>("registeredWarehouses", warehouse, initialWarehouses);
    await writeDocument<any>("warehouses", warehouse, []);
  },
  async deleteWarehouse(id: string): Promise<void> {
    await removeDocument<RegisteredWarehouse>("registeredWarehouses", id, initialWarehouses);
    await removeDocument<any>("warehouses", id, []);
  },

  // === WAREHOUSE PANEL TYPES (Section 2 & 3) ===
  async getWarehousePanelTypes(warehouseId?: string): Promise<WarehousePanelTypeEntry[]> {
    const all = await fetchCollection<WarehousePanelTypeEntry>("panelTypes", []);
    if (warehouseId) {
      return all.filter(p => p.warehouseId === warehouseId);
    }
    return all;
  },
  async saveWarehousePanelType(panelType: WarehousePanelTypeEntry): Promise<void> {
    await writeDocument<WarehousePanelTypeEntry>("panelTypes", panelType, []);
  },
  async saveWarehousePanelTypes(panelTypes: WarehousePanelTypeEntry[]): Promise<void> {
    for (const pt of panelTypes) {
      await writeDocument<WarehousePanelTypeEntry>("panelTypes", pt, []);
    }
  },
  async deleteWarehousePanelType(id: string): Promise<void> {
    await removeDocument<WarehousePanelTypeEntry>("panelTypes", id, []);
  },

  // === WAREHOUSE LOCATIONS (Section 10) ===
  async getWarehouseLocations(): Promise<any[]> {
    return fetchCollection<any>("warehouseLocations", []);
  },
  async saveWarehouseLocation(location: any): Promise<void> {
    await writeDocument<any>("warehouseLocations", location, []);
  },

  // === EXPENSES ===
  async getExpenses(): Promise<Expense[]> {
    return fetchCollection<Expense>("expenses", []);
  },
  subscribeExpenses(
    callback: (expenses: Expense[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "expenses");
      return onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as Expense;
                return { ...data, id: data.id || docSnap.id };
              });
          callback(offlineEngine.reconcileWithOutbox<Expense>("expenses", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "expenses");
          if (onError) onError(error);
          callback(offlineEngine.getCache<Expense>("expenses", []));
        }
      );
    }
    callback(offlineEngine.getCache<Expense>("expenses", []));
    return () => {};
  },
  async addExpense(expense: Expense): Promise<void> {
    await writeDocument<Expense>("expenses", expense, []);
  },
  async updateExpense(expense: Expense): Promise<void> {
    await writeDocument<Expense>("expenses", expense, []);
  },
  async deleteExpense(expenseId: string): Promise<void> {
    await removeDocument<Expense>("expenses", expenseId, []);
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

  // === CANONICAL WAREHOUSE & SITE STORE COLLECTIONS (Section 22) ===
  async getStockTransactions(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("stockTransactions", defaultItems);
  },
  async saveStockTransaction(tx: any): Promise<void> {
    await writeDocument<any>("stockTransactions", tx, []);
  },

  async getStockDiscrepancies(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("stockDiscrepancies", defaultItems);
  },
  async saveStockDiscrepancy(item: any): Promise<void> {
    await writeDocument<any>("stockDiscrepancies", item, []);
  },

  async getStockAdjustments(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("stockAdjustments", defaultItems);
  },
  async saveStockAdjustment(item: any): Promise<void> {
    await writeDocument<any>("stockAdjustments", item, []);
  },

  async getStockCounts(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("stockCounts", defaultItems);
  },
  async saveStockCount(item: any): Promise<void> {
    await writeDocument<any>("stockCounts", item, []);
  },

  async getDamagedMissingReports(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("damagedMissingReports", defaultItems);
  },
  async saveDamagedMissingReport(item: any): Promise<void> {
    await writeDocument<any>("damagedMissingReports", item, []);
  },

  async getGoodsReceipts(): Promise<MaterialReceivingReport[]> {
    return fetchCollection<MaterialReceivingReport>("goodsReceipts", initialReceivingReports);
  },
  async saveGoodsReceipt(report: MaterialReceivingReport): Promise<void> {
    await writeDocument<MaterialReceivingReport>("goodsReceipts", report, initialReceivingReports);
    await writeDocument<MaterialReceivingReport>("siteReceivingReports", report, initialReceivingReports);
  },

  async getStockTransfers(): Promise<InterSiteTransferVoucher[]> {
    return fetchCollection<InterSiteTransferVoucher>("stockTransfers", initialInterSiteTransfers);
  },
  async saveStockTransfer(transfer: InterSiteTransferVoucher): Promise<void> {
    await writeDocument<InterSiteTransferVoucher>("stockTransfers", transfer, initialInterSiteTransfers);
    await writeDocument<InterSiteTransferVoucher>("dispatchTransfers", transfer, initialInterSiteTransfers);
  },

  async getMaterialIssues(): Promise<MaterialIssueRecord[]> {
    return fetchCollection<MaterialIssueRecord>("materialIssues", initialIssueRecords);
  },
  async saveMaterialIssue(issue: MaterialIssueRecord): Promise<void> {
    await writeDocument<MaterialIssueRecord>("materialIssues", issue, initialIssueRecords);
    await writeDocument<MaterialIssueRecord>("materialIssueRecords", issue, initialIssueRecords);
  },

  async getMaterialReturns(): Promise<MaterialReturnRecord[]> {
    return fetchCollection<MaterialReturnRecord>("materialReturns", initialReturnRecords);
  },
  async saveMaterialReturn(ret: MaterialReturnRecord): Promise<void> {
    await writeDocument<MaterialReturnRecord>("materialReturns", ret, initialReturnRecords);
    await writeDocument<MaterialReturnRecord>("materialReturnRecords", ret, initialReturnRecords);
  },

  async getFloorZones(): Promise<SitePanelBreakdown[]> {
    return fetchCollection<SitePanelBreakdown>("floorZones", initialSitePanelBreakdowns);
  },
  async saveFloorZone(fz: SitePanelBreakdown): Promise<void> {
    await writeDocument<SitePanelBreakdown>("floorZones", fz, initialSitePanelBreakdowns);
    await writeDocument<SitePanelBreakdown>("sitePanelBreakdowns", fz, initialSitePanelBreakdowns);
  },

  async getSuppliers(): Promise<SupplierDeliverySchedule[]> {
    return fetchCollection<SupplierDeliverySchedule>("suppliers", initialSupplierSchedules);
  },
  async saveSupplier(supplier: SupplierDeliverySchedule): Promise<void> {
    await writeDocument<SupplierDeliverySchedule>("suppliers", supplier, initialSupplierSchedules);
    await writeDocument<SupplierDeliverySchedule>("supplierSchedules", supplier, initialSupplierSchedules);
  },

  async getSiteStores(): Promise<RegisteredSite[]> {
    return fetchCollection<RegisteredSite>("siteStores", initialRegisteredSites);
  },
  async saveSiteStore(siteStore: RegisteredSite): Promise<void> {
    await writeDocument<RegisteredSite>("siteStores", siteStore, initialRegisteredSites);
    await writeDocument<RegisteredSite>("registeredSites", siteStore, initialRegisteredSites);
  },

  // 16. payroll (payroll)
  async getPayrollRecords(): Promise<PayrollRecord[]> {
    return fetchCollection<PayrollRecord>("payroll", []);
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
  async getFinanceProcurements(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("financeProcurements", defaultItems);
  },
  async addFinanceProcurement(item: any): Promise<void> {
    await writeDocument<any>("financeProcurements", item, []);
  },

  // 18. equipment
  async getEquipmentLogs(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("equipment", defaultItems);
  },
  async addEquipmentLog(item: any): Promise<void> {
    await writeDocument<any>("equipment", item, []);
  },
  async getFinanceEquipments(defaultItems: any[] = []): Promise<any[]> {
    return fetchCollection<any>("financeEquipment", defaultItems);
  },
  async addFinanceEquipment(item: any): Promise<void> {
    await writeDocument<any>("financeEquipment", item, []);
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
  },

  // === BATCH F: Finance ERP Collections ===
  // 1. projectBudgets ("projectBudgets")
  async getProjectBudgets(defaultItems: any[] = []): Promise<FinancialBudgetRecord[]> {
    return fetchCollection<FinancialBudgetRecord>("projectBudgets", defaultItems);
  },
  subscribeProjectBudgets(
    callback: (budgets: FinancialBudgetRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "projectBudgets"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialBudgetRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialBudgetRecord>("projectBudgets", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "projectBudgets");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialBudgetRecord>("projectBudgets", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialBudgetRecord>("projectBudgets", []));
    return () => {};
  },
  async addProjectBudget(item: FinancialBudgetRecord): Promise<void> {
    await writeDocument<FinancialBudgetRecord>("projectBudgets", item, []);
  },
  async updateProjectBudget(item: FinancialBudgetRecord): Promise<void> {
    await writeDocument<FinancialBudgetRecord>("projectBudgets", item, []);
  },
  async deleteProjectBudget(budgetId: string): Promise<void> {
    await removeDocument<FinancialBudgetRecord>("projectBudgets", budgetId, []);
  },

  // 2. invoices ("invoices" - reuses existing collection)
  async getInvoices(defaultItems: any[] = []): Promise<FinancialInvoiceRecord[]> {
    return fetchCollection<FinancialInvoiceRecord>("invoices", defaultItems);
  },
  subscribeInvoices(
    callback: (invoices: FinancialInvoiceRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "invoices"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialInvoiceRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialInvoiceRecord>("invoices", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "invoices");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialInvoiceRecord>("invoices", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialInvoiceRecord>("invoices", []));
    return () => {};
  },
  async addInvoice(item: FinancialInvoiceRecord): Promise<void> {
    await writeDocument<FinancialInvoiceRecord>("invoices", item, []);
  },
  async updateInvoice(item: FinancialInvoiceRecord): Promise<void> {
    await writeDocument<FinancialInvoiceRecord>("invoices", item, []);
  },
  async deleteInvoice(invoiceId: string): Promise<void> {
    await removeDocument<FinancialInvoiceRecord>("invoices", invoiceId, []);
  },

  // 3. paymentRecords ("paymentRecords")
  async getPaymentRecords(defaultItems: any[] = []): Promise<FinancialPaymentRecord[]> {
    return fetchCollection<FinancialPaymentRecord>("paymentRecords", defaultItems);
  },
  subscribePaymentRecords(
    callback: (payments: FinancialPaymentRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "paymentRecords"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialPaymentRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialPaymentRecord>("paymentRecords", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "paymentRecords");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialPaymentRecord>("paymentRecords", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialPaymentRecord>("paymentRecords", []));
    return () => {};
  },
  async addPaymentRecord(item: FinancialPaymentRecord): Promise<void> {
    await writeDocument<FinancialPaymentRecord>("paymentRecords", item, []);
  },
  async updatePaymentRecord(item: FinancialPaymentRecord): Promise<void> {
    await writeDocument<FinancialPaymentRecord>("paymentRecords", item, []);
  },

  // 4. financialTargets ("financialTargets" - Monthly Planned Revenue, Expense, Collection, Payment)
  async getFinancialTargets(): Promise<MonthlyFinancialTarget[]> {
    return fetchCollection<MonthlyFinancialTarget>("financialTargets", []);
  },
  subscribeFinancialTargets(
    callback: (targets: MonthlyFinancialTarget[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "financialTargets"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as MonthlyFinancialTarget), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<MonthlyFinancialTarget>("financialTargets", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "financialTargets");
          if (onError) onError(error);
          callback(offlineEngine.getCache<MonthlyFinancialTarget>("financialTargets", []));
        }
      );
    }
    callback(offlineEngine.getCache<MonthlyFinancialTarget>("financialTargets", []));
    return () => {};
  },
  async saveFinancialTarget(target: MonthlyFinancialTarget): Promise<void> {
    await writeDocument<MonthlyFinancialTarget>("financialTargets", target, []);
  },
  async deleteFinancialTarget(targetId: string): Promise<void> {
    await removeDocument<MonthlyFinancialTarget>("financialTargets", targetId, []);
  },

  // 5. financialAccounts ("financialAccounts" - Cash & Bank Accounts)
  async getFinancialAccounts(): Promise<FinancialAccount[]> {
    return fetchCollection<FinancialAccount>("financialAccounts", []);
  },
  subscribeFinancialAccounts(
    callback: (accounts: FinancialAccount[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "financialAccounts"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialAccount), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialAccount>("financialAccounts", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "financialAccounts");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialAccount>("financialAccounts", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialAccount>("financialAccounts", []));
    return () => {};
  },
  async saveFinancialAccount(account: FinancialAccount): Promise<void> {
    await writeDocument<FinancialAccount>("financialAccounts", account, []);
  },
  async deleteFinancialAccount(accountId: string): Promise<void> {
    await removeDocument<FinancialAccount>("financialAccounts", accountId, []);
  },

  // 6. cashTransactions ("cashTransactions" - Posted Cash Collections, Payments & Transfers)
  async getCashTransactions(): Promise<CashTransactionRecord[]> {
    return fetchCollection<CashTransactionRecord>("cashTransactions", []);
  },
  subscribeCashTransactions(
    callback: (txs: CashTransactionRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "cashTransactions"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as CashTransactionRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<CashTransactionRecord>("cashTransactions", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "cashTransactions");
          if (onError) onError(error);
          callback(offlineEngine.getCache<CashTransactionRecord>("cashTransactions", []));
        }
      );
    }
    callback(offlineEngine.getCache<CashTransactionRecord>("cashTransactions", []));
    return () => {};
  },
  async saveCashTransaction(tx: CashTransactionRecord): Promise<void> {
    await writeDocument<CashTransactionRecord>("cashTransactions", tx, []);
  },
  async deleteCashTransaction(txId: string): Promise<void> {
    await removeDocument<CashTransactionRecord>("cashTransactions", txId, []);
  },

  // 7. financialSettings ("financialSettings" - Currency, Fiscal Year, Alert Thresholds)
  async getFinancialSettings(): Promise<FinancialSettingsConfig[]> {
    return fetchCollection<FinancialSettingsConfig>("financialSettings", []);
  },
  subscribeFinancialSettings(
    callback: (settings: FinancialSettingsConfig[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "financialSettings"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialSettingsConfig), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialSettingsConfig>("financialSettings", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "financialSettings");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialSettingsConfig>("financialSettings", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialSettingsConfig>("financialSettings", []));
    return () => {};
  },
  async saveFinancialSettings(settings: FinancialSettingsConfig): Promise<void> {
    await writeDocument<FinancialSettingsConfig>("financialSettings", settings, []);
  },

  // 7.1 collectionPlans ("collectionPlans" - Part 2 Monthly Cash Collection Planning)
  async getCollectionPlans(): Promise<MonthlyCollectionPlan[]> {
    return fetchCollection<MonthlyCollectionPlan>("collectionPlans", []);
  },
  subscribeCollectionPlans(
    callback: (plans: MonthlyCollectionPlan[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "collectionPlans"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as MonthlyCollectionPlan), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<MonthlyCollectionPlan>("collectionPlans", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "collectionPlans");
          if (onError) onError(error);
          callback(offlineEngine.getCache<MonthlyCollectionPlan>("collectionPlans", []));
        }
      );
    }
    callback(offlineEngine.getCache<MonthlyCollectionPlan>("collectionPlans", []));
    return () => {};
  },
  async saveCollectionPlan(plan: MonthlyCollectionPlan): Promise<void> {
    await writeDocument<MonthlyCollectionPlan>("collectionPlans", plan, []);
  },
  async deleteCollectionPlan(planId: string): Promise<void> {
    await removeDocument<MonthlyCollectionPlan>("collectionPlans", planId, []);
  },

  // 7.2 paymentPlans ("paymentPlans" - Part 2 Monthly Cash Payment Planning)
  async getPaymentPlans(): Promise<MonthlyPaymentPlan[]> {
    return fetchCollection<MonthlyPaymentPlan>("paymentPlans", []);
  },
  subscribePaymentPlans(
    callback: (plans: MonthlyPaymentPlan[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "paymentPlans"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as MonthlyPaymentPlan), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<MonthlyPaymentPlan>("paymentPlans", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "paymentPlans");
          if (onError) onError(error);
          callback(offlineEngine.getCache<MonthlyPaymentPlan>("paymentPlans", []));
        }
      );
    }
    callback(offlineEngine.getCache<MonthlyPaymentPlan>("paymentPlans", []));
    return () => {};
  },
  async savePaymentPlan(plan: MonthlyPaymentPlan): Promise<void> {
    await writeDocument<MonthlyPaymentPlan>("paymentPlans", plan, []);
  },
  async deletePaymentPlan(planId: string): Promise<void> {
    await removeDocument<MonthlyPaymentPlan>("paymentPlans", planId, []);
  },

  // 7.2B Part 4 Budget Management & Cost Control Collections
  // 1) projectBudgetPlans
  async getProjectBudgetPlans(): Promise<ProjectBudgetPlan[]> {
    return fetchCollection<ProjectBudgetPlan>("projectBudgetPlans", []);
  },
  subscribeProjectBudgetPlans(
    callback: (plans: ProjectBudgetPlan[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "projectBudgetPlans"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as ProjectBudgetPlan), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<ProjectBudgetPlan>("projectBudgetPlans", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "projectBudgetPlans");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ProjectBudgetPlan>("projectBudgetPlans", []));
        }
      );
    }
    callback(offlineEngine.getCache<ProjectBudgetPlan>("projectBudgetPlans", []));
    return () => {};
  },
  async saveProjectBudgetPlan(plan: ProjectBudgetPlan): Promise<void> {
    await writeDocument<ProjectBudgetPlan>("projectBudgetPlans", plan, []);
  },
  async deleteProjectBudgetPlan(planId: string): Promise<void> {
    await removeDocument<ProjectBudgetPlan>("projectBudgetPlans", planId, []);
  },

  // 2) budgetAllocations
  async getBudgetAllocations(): Promise<BudgetAllocationRecord[]> {
    return fetchCollection<BudgetAllocationRecord>("budgetAllocations", []);
  },
  subscribeBudgetAllocations(
    callback: (allocations: BudgetAllocationRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "budgetAllocations"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BudgetAllocationRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BudgetAllocationRecord>("budgetAllocations", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "budgetAllocations");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BudgetAllocationRecord>("budgetAllocations", []));
        }
      );
    }
    callback(offlineEngine.getCache<BudgetAllocationRecord>("budgetAllocations", []));
    return () => {};
  },
  async saveBudgetAllocation(allocation: BudgetAllocationRecord): Promise<void> {
    await writeDocument<BudgetAllocationRecord>("budgetAllocations", allocation, []);
  },
  async deleteBudgetAllocation(allocationId: string): Promise<void> {
    await removeDocument<BudgetAllocationRecord>("budgetAllocations", allocationId, []);
  },

  // 3) budgetRevisions
  async getBudgetRevisions(): Promise<BudgetRevisionRecord[]> {
    return fetchCollection<BudgetRevisionRecord>("budgetRevisions", []);
  },
  subscribeBudgetRevisions(
    callback: (revisions: BudgetRevisionRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "budgetRevisions"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BudgetRevisionRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BudgetRevisionRecord>("budgetRevisions", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "budgetRevisions");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BudgetRevisionRecord>("budgetRevisions", []));
        }
      );
    }
    callback(offlineEngine.getCache<BudgetRevisionRecord>("budgetRevisions", []));
    return () => {};
  },
  async saveBudgetRevision(revision: BudgetRevisionRecord): Promise<void> {
    await writeDocument<BudgetRevisionRecord>("budgetRevisions", revision, []);
  },
  async deleteBudgetRevision(revisionId: string): Promise<void> {
    await removeDocument<BudgetRevisionRecord>("budgetRevisions", revisionId, []);
  },

  // 4) actualCostEntries
  async getActualCostEntries(): Promise<ActualCostEntry[]> {
    return fetchCollection<ActualCostEntry>("actualCostEntries", []);
  },
  subscribeActualCostEntries(
    callback: (entries: ActualCostEntry[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "actualCostEntries"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as ActualCostEntry), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<ActualCostEntry>("actualCostEntries", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "actualCostEntries");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ActualCostEntry>("actualCostEntries", []));
        }
      );
    }
    callback(offlineEngine.getCache<ActualCostEntry>("actualCostEntries", []));
    return () => {};
  },
  async saveActualCostEntry(entry: ActualCostEntry): Promise<void> {
    await writeDocument<ActualCostEntry>("actualCostEntries", entry, []);
  },
  async deleteActualCostEntry(costId: string): Promise<void> {
    await removeDocument<ActualCostEntry>("actualCostEntries", costId, []);
  },

  // 7.2C Part 5 Cash Flow Management & Financial Forecasting Collections
  // 1) cashFlowForecastItems
  async getCashFlowForecastItems(): Promise<CashFlowForecastItem[]> {
    return fetchCollection<CashFlowForecastItem>("cashFlowForecastItems", []);
  },
  subscribeCashFlowForecastItems(
    callback: (items: CashFlowForecastItem[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "cashFlowForecastItems"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as CashFlowForecastItem), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<CashFlowForecastItem>("cashFlowForecastItems", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "cashFlowForecastItems");
          if (onError) onError(error);
          callback(offlineEngine.getCache<CashFlowForecastItem>("cashFlowForecastItems", []));
        }
      );
    }
    callback(offlineEngine.getCache<CashFlowForecastItem>("cashFlowForecastItems", []));
    return () => {};
  },
  async saveCashFlowForecastItem(item: CashFlowForecastItem): Promise<void> {
    await writeDocument<CashFlowForecastItem>("cashFlowForecastItems", item, []);
  },
  async deleteCashFlowForecastItem(forecastId: string): Promise<void> {
    await removeDocument<CashFlowForecastItem>("cashFlowForecastItems", forecastId, []);
  },

  // 2) bankReconciliations
  async getBankReconciliations(): Promise<BankReconciliationRecord[]> {
    return fetchCollection<BankReconciliationRecord>("bankReconciliations", []);
  },
  subscribeBankReconciliations(
    callback: (items: BankReconciliationRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "bankReconciliations"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BankReconciliationRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BankReconciliationRecord>("bankReconciliations", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "bankReconciliations");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BankReconciliationRecord>("bankReconciliations", []));
        }
      );
    }
    callback(offlineEngine.getCache<BankReconciliationRecord>("bankReconciliations", []));
    return () => {};
  },
  async saveBankReconciliation(rec: BankReconciliationRecord): Promise<void> {
    await writeDocument<BankReconciliationRecord>("bankReconciliations", rec, []);
  },
  async deleteBankReconciliation(recId: string): Promise<void> {
    await removeDocument<BankReconciliationRecord>("bankReconciliations", recId, []);
  },

  // 7.2D Part 6 Bank Management & Bank Reconciliation Collections
  // 1) bankTransactions
  async getBankTransactions(): Promise<BankTransactionRecord[]> {
    return fetchCollection<BankTransactionRecord>("bankTransactions", []);
  },
  subscribeBankTransactions(
    callback: (items: BankTransactionRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "bankTransactions"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BankTransactionRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BankTransactionRecord>("bankTransactions", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "bankTransactions");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BankTransactionRecord>("bankTransactions", []));
        }
      );
    }
    callback(offlineEngine.getCache<BankTransactionRecord>("bankTransactions", []));
    return () => {};
  },
  async saveBankTransaction(tx: BankTransactionRecord): Promise<void> {
    await writeDocument<BankTransactionRecord>("bankTransactions", tx, []);
  },
  async deleteBankTransaction(txId: string): Promise<void> {
    await removeDocument<BankTransactionRecord>("bankTransactions", txId, []);
  },

  // 2) bankStatements (Immutable Archive - create only, never overwrite or delete)
  async getBankStatements(): Promise<ImmutableBankStatementRecord[]> {
    return fetchCollection<ImmutableBankStatementRecord>("bankStatements", []);
  },
  subscribeBankStatements(
    callback: (items: ImmutableBankStatementRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "bankStatements"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as ImmutableBankStatementRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<ImmutableBankStatementRecord>("bankStatements", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "bankStatements");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ImmutableBankStatementRecord>("bankStatements", []));
        }
      );
    }
    callback(offlineEngine.getCache<ImmutableBankStatementRecord>("bankStatements", []));
    return () => {};
  },
  async createImmutableBankStatement(statement: ImmutableBankStatementRecord): Promise<void> {
    const existing = offlineEngine.getCache<ImmutableBankStatementRecord>("bankStatements", []);
    if (existing.some(s => s.id === statement.id)) {
      throw new Error("Original bank statements are immutable and cannot be overwritten.");
    }
    const sanitized = sanitizeForFirestore({ ...statement, isImmutable: true as const });
    offlineEngine.updateCacheItem<ImmutableBankStatementRecord>("bankStatements", sanitized, []);
    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const ref = doc(db!, "bankStatements", sanitized.id);
          const snap = await transaction.get(ref);
          if (snap.exists()) {
            throw new Error("Original bank statements are immutable and cannot be overwritten.");
          }
          transaction.set(ref, { ...sanitized, serverReceivedAt: new Date().toISOString() });
        });
        return;
      } catch (err: any) {
        const isImmutableErr = String(err?.message || "").includes("immutable");
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        handleFirestoreError(err, OperationType.WRITE, `bankStatements/${sanitized.id}`);
        if (isImmutableErr || isPermissionDenied) throw err;
        offlineEngine.queueOutbox("set", "bankStatements", sanitized.id, sanitized);
        return;
      }
    }
    offlineEngine.queueOutbox("set", "bankStatements", sanitized.id, sanitized);
  },

  // 3) Atomic Bank Transaction Approval / Reversal (bankTransactions + financialAccounts + optional second transfer account + linked AR/AP/Payroll)
  async applyBankTransactionAtomic(params: {
    tx: BankTransactionRecord;
    account?: FinancialAccount;
    accountDelta: number;
    toAccount?: FinancialAccount;
    toAccountDelta?: number;
    linkedInvoice?: FinancialInvoiceRecord;
    invoicePaidDelta?: number;
    linkedExpense?: Expense;
    expensePaidDelta?: number;
    linkedPayroll?: PayrollRecord;
    payrollNextStatus?: "Approved" | "Paid";
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const sanitizedTx = sanitizeForFirestore(params.tx);
    offlineEngine.updateCacheItem<BankTransactionRecord>("bankTransactions", sanitizedTx, []);

    let fallbackAccount: FinancialAccount | undefined;
    if (params.account && params.accountDelta !== 0) {
      fallbackAccount = sanitizeForFirestore({
        ...params.account,
        currentBalance: Number(params.account.currentBalance || 0) + params.accountDelta,
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<FinancialAccount>("financialAccounts", fallbackAccount, []);
    }

    let fallbackToAccount: FinancialAccount | undefined;
    if (params.toAccount && params.toAccountDelta && params.toAccountDelta !== 0) {
      fallbackToAccount = sanitizeForFirestore({
        ...params.toAccount,
        currentBalance: Number(params.toAccount.currentBalance || 0) + params.toAccountDelta,
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<FinancialAccount>("financialAccounts", fallbackToAccount, []);
    }

    let fallbackInvoice: FinancialInvoiceRecord | undefined;
    if (params.linkedInvoice && params.invoicePaidDelta && params.invoicePaidDelta !== 0) {
      const prevPaid = Number(params.linkedInvoice.paidAmount || 0);
      const baseAmount = Number(params.linkedInvoice.amount || 0);
      const newPaid = Math.max(0, Math.min(baseAmount, prevPaid + params.invoicePaidDelta));
      const isSettled = newPaid >= baseAmount && baseAmount > 0;
      fallbackInvoice = sanitizeForFirestore({
        ...params.linkedInvoice,
        paidAmount: newPaid,
        status: isSettled ? "Paid" : newPaid > 0 ? "Partially Paid" : "Approved",
        workflowStage: isSettled ? "Completed" : params.linkedInvoice.workflowStage || "Verified",
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<FinancialInvoiceRecord>("invoices", fallbackInvoice, []);
    }

    let fallbackExpense: Expense | undefined;
    if (params.linkedExpense && params.expensePaidDelta && params.expensePaidDelta !== 0) {
      const prevPaid = Number(params.linkedExpense.paidAmount || 0);
      const baseAmount = Number(params.linkedExpense.amount || 0);
      const newPaid = Math.max(0, Math.min(baseAmount, prevPaid + params.expensePaidDelta));
      const isSettled = newPaid >= baseAmount && baseAmount > 0;
      fallbackExpense = sanitizeForFirestore({
        ...params.linkedExpense,
        paidAmount: newPaid,
        status: isSettled ? "Paid" : newPaid > 0 ? "Partially Paid" : "Approved",
        workflowStage: isSettled ? "Paid" : params.linkedExpense.workflowStage || "Approved",
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<Expense>("expenses", fallbackExpense, []);
    }

    let fallbackPayroll: PayrollRecord | undefined;
    if (params.linkedPayroll && params.payrollNextStatus) {
      fallbackPayroll = sanitizeForFirestore({
        ...params.linkedPayroll,
        status: params.payrollNextStatus,
      });
      offlineEngine.updateCacheItem<PayrollRecord>("payroll", fallbackPayroll, []);
    }

    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const txRef = doc(db!, "bankTransactions", sanitizedTx.id);
          const accRef = params.account && params.accountDelta !== 0 ? doc(db!, "financialAccounts", params.account.id) : null;
          const toAccRef = params.toAccount && params.toAccountDelta ? doc(db!, "financialAccounts", params.toAccount.id) : null;
          const invRef = params.linkedInvoice && params.invoicePaidDelta ? doc(db!, "invoices", params.linkedInvoice.id) : null;
          const expRef = params.linkedExpense && params.expensePaidDelta ? doc(db!, "expenses", params.linkedExpense.id) : null;
          const payRef = params.linkedPayroll && params.payrollNextStatus ? doc(db!, "payroll", params.linkedPayroll.id) : null;

          const accSnap = accRef ? await transaction.get(accRef) : null;
          const toAccSnap = toAccRef ? await transaction.get(toAccRef) : null;
          const invSnap = invRef ? await transaction.get(invRef) : null;
          const expSnap = expRef ? await transaction.get(expRef) : null;
          const paySnap = payRef ? await transaction.get(payRef) : null;

          transaction.set(txRef, { ...sanitizedTx, serverReceivedAt: nowIso }, { merge: true });

          if (accRef) {
            const liveAcc = accSnap && accSnap.exists() ? (accSnap.data() as FinancialAccount) : params.account!;
            transaction.set(
              accRef,
              sanitizeForFirestore({
                ...liveAcc,
                currentBalance: Number(liveAcc.currentBalance || 0) + params.accountDelta,
                updatedAt: nowIso,
              }),
              { merge: true }
            );
          }

          if (toAccRef && params.toAccountDelta) {
            const liveToAcc = toAccSnap && toAccSnap.exists() ? (toAccSnap.data() as FinancialAccount) : params.toAccount!;
            transaction.set(
              toAccRef,
              sanitizeForFirestore({
                ...liveToAcc,
                currentBalance: Number(liveToAcc.currentBalance || 0) + params.toAccountDelta,
                updatedAt: nowIso,
              }),
              { merge: true }
            );
          }

          if (invRef && params.invoicePaidDelta) {
            const liveInv = invSnap && invSnap.exists() ? (invSnap.data() as FinancialInvoiceRecord) : params.linkedInvoice!;
            const prevPaid = Number(liveInv.paidAmount || 0);
            const liveAmount = Number(liveInv.amount || 0);
            const nextPaid = Math.max(0, Math.min(liveAmount, prevPaid + params.invoicePaidDelta));
            const isSettled = nextPaid >= liveAmount && liveAmount > 0;
            transaction.set(
              invRef,
              sanitizeForFirestore({
                ...liveInv,
                paidAmount: nextPaid,
                status: isSettled ? "Paid" : nextPaid > 0 ? "Partially Paid" : "Approved",
                workflowStage: isSettled ? "Completed" : liveInv.workflowStage || "Verified",
                updatedAt: nowIso,
              }),
              { merge: true }
            );
          }

          if (expRef && params.expensePaidDelta) {
            const liveExp = expSnap && expSnap.exists() ? (expSnap.data() as Expense) : params.linkedExpense!;
            const prevPaid = Number(liveExp.paidAmount || 0);
            const liveAmount = Number(liveExp.amount || 0);
            const nextPaid = Math.max(0, Math.min(liveAmount, prevPaid + params.expensePaidDelta));
            const isSettled = nextPaid >= liveAmount && liveAmount > 0;
            transaction.set(
              expRef,
              sanitizeForFirestore({
                ...liveExp,
                paidAmount: nextPaid,
                status: isSettled ? "Paid" : nextPaid > 0 ? "Partially Paid" : "Approved",
                workflowStage: isSettled ? "Paid" : liveExp.workflowStage || "Approved",
                updatedAt: nowIso,
              }),
              { merge: true }
            );
          }

          if (payRef && params.payrollNextStatus) {
            const livePay = paySnap && paySnap.exists() ? (paySnap.data() as PayrollRecord) : params.linkedPayroll!;
            transaction.set(payRef, sanitizeForFirestore({ ...livePay, status: params.payrollNextStatus }), { merge: true });
          }
        });
        return;
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        handleFirestoreError(err, OperationType.WRITE, `bankTransactions/${sanitizedTx.id}`);
        if (isPermissionDenied) throw err;
        offlineEngine.queueOutbox("set", "bankTransactions", sanitizedTx.id, sanitizedTx);
        if (fallbackAccount) offlineEngine.queueOutbox("set", "financialAccounts", fallbackAccount.id, fallbackAccount);
        if (fallbackToAccount) offlineEngine.queueOutbox("set", "financialAccounts", fallbackToAccount.id, fallbackToAccount);
        if (fallbackInvoice) offlineEngine.queueOutbox("set", "invoices", fallbackInvoice.id, fallbackInvoice);
        if (fallbackExpense) offlineEngine.queueOutbox("set", "expenses", fallbackExpense.id, fallbackExpense);
        if (fallbackPayroll) offlineEngine.queueOutbox("set", "payroll", fallbackPayroll.id, fallbackPayroll);
        return;
      }
    }

    offlineEngine.queueOutbox("set", "bankTransactions", sanitizedTx.id, sanitizedTx);
    if (fallbackAccount) offlineEngine.queueOutbox("set", "financialAccounts", fallbackAccount.id, fallbackAccount);
    if (fallbackToAccount) offlineEngine.queueOutbox("set", "financialAccounts", fallbackToAccount.id, fallbackToAccount);
    if (fallbackInvoice) offlineEngine.queueOutbox("set", "invoices", fallbackInvoice.id, fallbackInvoice);
    if (fallbackExpense) offlineEngine.queueOutbox("set", "expenses", fallbackExpense.id, fallbackExpense);
    if (fallbackPayroll) offlineEngine.queueOutbox("set", "payroll", fallbackPayroll.id, fallbackPayroll);
  },

  // 7.2E Part 7 Financial Statements, Double-Entry Ledger & Period Closing Collections
  // 1) chartOfAccounts
  async getChartOfAccounts(): Promise<ChartAccountRecord[]> {
    return fetchCollection<ChartAccountRecord>("chartOfAccounts", []);
  },
  subscribeChartOfAccounts(
    callback: (accounts: ChartAccountRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "chartOfAccounts"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as ChartAccountRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<ChartAccountRecord>("chartOfAccounts", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "chartOfAccounts");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ChartAccountRecord>("chartOfAccounts", []));
        }
      );
    }
    callback(offlineEngine.getCache<ChartAccountRecord>("chartOfAccounts", []));
    return () => {};
  },
  async saveChartAccount(account: ChartAccountRecord): Promise<void> {
    await writeDocument<ChartAccountRecord>("chartOfAccounts", account, []);
  },
  async deleteChartAccount(accountId: string): Promise<void> {
    await removeDocument<ChartAccountRecord>("chartOfAccounts", accountId, []);
  },

  // 2) journalEntries
  async getJournalEntries(): Promise<JournalEntryRecord[]> {
    return fetchCollection<JournalEntryRecord>("journalEntries", []);
  },
  subscribeJournalEntries(
    callback: (entries: JournalEntryRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "journalEntries"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as JournalEntryRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<JournalEntryRecord>("journalEntries", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "journalEntries");
          if (onError) onError(error);
          callback(offlineEngine.getCache<JournalEntryRecord>("journalEntries", []));
        }
      );
    }
    callback(offlineEngine.getCache<JournalEntryRecord>("journalEntries", []));
    return () => {};
  },
  async saveJournalEntry(entry: JournalEntryRecord): Promise<void> {
    const diff = Math.abs(Number(entry.totalDebit || 0) - Number(entry.totalCredit || 0));
    if (!entry.isBalanced || diff > 0.01) {
      throw new Error("Double-entry validation failed: Total Debit must equal Total Credit.");
    }
    await writeDocument<JournalEntryRecord>("journalEntries", entry, []);
  },
  async deleteJournalEntry(entryId: string): Promise<void> {
    const existing = offlineEngine.getCache<JournalEntryRecord>("journalEntries", []).find(e => e.id === entryId);
    if (existing && existing.status === "Posted") {
      throw new Error("Approved/Posted journal entries are immutable and cannot be deleted. Create an authorized Reversing entry instead.");
    }
    await removeDocument<JournalEntryRecord>("journalEntries", entryId, []);
  },
  async reverseJournalEntryAtomic(params: {
    originalEntry: JournalEntryRecord;
    reversingEntry: JournalEntryRecord;
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const diff = Math.abs(Number(params.reversingEntry.totalDebit || 0) - Number(params.reversingEntry.totalCredit || 0));
    if (!params.reversingEntry.isBalanced || diff > 0.01) {
      throw new Error("Reversing entry must maintain Total Debits = Total Credits.");
    }
    const updatedOriginal: JournalEntryRecord = sanitizeForFirestore({
      ...params.originalEntry,
      status: "Reversed",
      reversedByEntryId: params.reversingEntry.id,
      reversalReason: params.reversingEntry.reversalReason || params.reversingEntry.description,
      updatedAt: nowIso,
    });
    const sanitizedReversal = sanitizeForFirestore({
      ...params.reversingEntry,
      isImmutable: true,
    });

    offlineEngine.updateCacheItem<JournalEntryRecord>("journalEntries", updatedOriginal, []);
    offlineEngine.updateCacheItem<JournalEntryRecord>("journalEntries", sanitizedReversal, []);

    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const origRef = doc(db!, "journalEntries", updatedOriginal.id);
          const revRef = doc(db!, "journalEntries", sanitizedReversal.id);
          transaction.set(origRef, { ...updatedOriginal, serverReceivedAt: nowIso }, { merge: true });
          transaction.set(revRef, { ...sanitizedReversal, serverReceivedAt: nowIso }, { merge: true });
        });
        return;
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        handleFirestoreError(err, OperationType.WRITE, `journalEntries/${updatedOriginal.id}`);
        if (isPermissionDenied) throw err;
      }
    }
    offlineEngine.queueOutbox("set", "journalEntries", updatedOriginal.id, updatedOriginal);
    offlineEngine.queueOutbox("set", "journalEntries", sanitizedReversal.id, sanitizedReversal);
  },

  // 2B) financialYears ("financialYears" - Part 8 Fiscal Year Controls)
  async getFinancialYears(): Promise<FinancialYearRecord[]> {
    return fetchCollection<FinancialYearRecord>("financialYears", []);
  },
  subscribeFinancialYears(
    callback: (years: FinancialYearRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "financialYears"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialYearRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialYearRecord>("financialYears", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "financialYears");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialYearRecord>("financialYears", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialYearRecord>("financialYears", []));
    return () => {};
  },
  async saveFinancialYear(year: FinancialYearRecord): Promise<void> {
    await writeDocument<FinancialYearRecord>("financialYears", year, []);
  },

  // 3) financialPeriods
  async getFinancialPeriods(): Promise<FinancialPeriodCloseRecord[]> {
    return fetchCollection<FinancialPeriodCloseRecord>("financialPeriods", []);
  },
  subscribeFinancialPeriods(
    callback: (periods: FinancialPeriodCloseRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "financialPeriods"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as FinancialPeriodCloseRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<FinancialPeriodCloseRecord>("financialPeriods", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "financialPeriods");
          if (onError) onError(error);
          callback(offlineEngine.getCache<FinancialPeriodCloseRecord>("financialPeriods", []));
        }
      );
    }
    callback(offlineEngine.getCache<FinancialPeriodCloseRecord>("financialPeriods", []));
    return () => {};
  },
  async saveFinancialPeriod(period: FinancialPeriodCloseRecord): Promise<void> {
    await writeDocument<FinancialPeriodCloseRecord>("financialPeriods", period, []);
  },
  async deleteFinancialPeriod(periodId: string): Promise<void> {
    await removeDocument<FinancialPeriodCloseRecord>("financialPeriods", periodId, []);
  },

  // 4) Atomic Financial Period Close (persists Period Close + Closing Journal Entry together)
  async closeFinancialPeriodAtomic(params: {
    period: FinancialPeriodCloseRecord;
    closingEntry?: JournalEntryRecord;
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const sanitizedPeriod = sanitizeForFirestore(params.period);
    const sanitizedClosing = params.closingEntry ? sanitizeForFirestore(params.closingEntry) : undefined;
    if (sanitizedClosing) {
      const diff = Math.abs(Number(sanitizedClosing.totalDebit || 0) - Number(sanitizedClosing.totalCredit || 0));
      if (!sanitizedClosing.isBalanced || diff > 0.01) {
        throw new Error("Closing journal entry is unbalanced.");
      }
    }

    offlineEngine.updateCacheItem<FinancialPeriodCloseRecord>("financialPeriods", sanitizedPeriod, []);
    if (sanitizedClosing) {
      offlineEngine.updateCacheItem<JournalEntryRecord>("journalEntries", sanitizedClosing, []);
    }

    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const periodRef = doc(db!, "financialPeriods", sanitizedPeriod.id);
          transaction.set(periodRef, { ...sanitizedPeriod, serverReceivedAt: nowIso }, { merge: true });
          if (sanitizedClosing) {
            const jeRef = doc(db!, "journalEntries", sanitizedClosing.id);
            transaction.set(jeRef, { ...sanitizedClosing, serverReceivedAt: nowIso }, { merge: true });
          }
        });
        return;
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        handleFirestoreError(err, OperationType.WRITE, `financialPeriods/${sanitizedPeriod.id}`);
        if (isPermissionDenied) throw err;
        offlineEngine.queueOutbox("set", "financialPeriods", sanitizedPeriod.id, sanitizedPeriod);
        if (sanitizedClosing) {
          offlineEngine.queueOutbox("set", "journalEntries", sanitizedClosing.id, sanitizedClosing);
        }
        return;
      }
    }

    offlineEngine.queueOutbox("set", "financialPeriods", sanitizedPeriod.id, sanitizedPeriod);
    if (sanitizedClosing) {
      offlineEngine.queueOutbox("set", "journalEntries", sanitizedClosing.id, sanitizedClosing);
    }
  },

  // Atomic budget revision approval (updates revision + projectBudgetPlan budget atomically while preserving originalApprovedBudget)
  async applyBudgetRevisionApprovalAtomic(params: {
    revision: BudgetRevisionRecord;
    plan: ProjectBudgetPlan;
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const sanitizedRevision = sanitizeForFirestore(params.revision);
    const sanitizedPlan = sanitizeForFirestore(params.plan);
    offlineEngine.updateCacheItem<BudgetRevisionRecord>("budgetRevisions", sanitizedRevision, []);
    offlineEngine.updateCacheItem<ProjectBudgetPlan>("projectBudgetPlans", sanitizedPlan, []);

    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const revRef = doc(db, "budgetRevisions", sanitizedRevision.id);
          const planRef = doc(db, "projectBudgetPlans", sanitizedPlan.id);
          transaction.set(revRef, { ...sanitizedRevision, serverReceivedAt: nowIso }, { merge: true });
          transaction.set(planRef, { ...sanitizedPlan, serverReceivedAt: nowIso }, { merge: true });
        });
        return;
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        handleFirestoreError(err, OperationType.WRITE, `budgetRevisions/${sanitizedRevision.id}`);
        if (isPermissionDenied) throw err;
        offlineEngine.queueOutbox("set", "budgetRevisions", sanitizedRevision.id, sanitizedRevision);
        offlineEngine.queueOutbox("set", "projectBudgetPlans", sanitizedPlan.id, sanitizedPlan);
        return;
      }
    }
    offlineEngine.queueOutbox("set", "budgetRevisions", sanitizedRevision.id, sanitizedRevision);
    offlineEngine.queueOutbox("set", "projectBudgetPlans", sanitizedPlan.id, sanitizedPlan);
  },

  // 7.3 Atomic Cash Ledger Mutation (cashTransactions + financialAccounts + linked invoice/expense)
  async applyCashLedgerAtomic(params: {
    tx: CashTransactionRecord;
    account?: FinancialAccount;
    accountDelta: number; // + for confirmed Collection / Payment reversal, - for confirmed Payment / Collection reversal
    linkedInvoice?: FinancialInvoiceRecord;
    invoicePaidDelta?: number;
    linkedExpense?: Expense;
    expensePaidDelta?: number;
    allowAuthorizedAdjustment?: boolean;
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const sanitizedTx = sanitizeForFirestore(params.tx);

    // Prepare updated fallback copies immediately
    offlineEngine.updateCacheItem<CashTransactionRecord>("cashTransactions", sanitizedTx, []);

    let fallbackAccount: FinancialAccount | undefined;
    if (params.account && params.accountDelta !== 0) {
      fallbackAccount = sanitizeForFirestore({
        ...params.account,
        currentBalance: Number(params.account.currentBalance || 0) + params.accountDelta,
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<FinancialAccount>("financialAccounts", fallbackAccount, []);
    }

    let fallbackInvoice: FinancialInvoiceRecord | undefined;
    if (params.linkedInvoice && params.invoicePaidDelta && params.invoicePaidDelta !== 0) {
      const prevPaid = Number(params.linkedInvoice.paidAmount || 0);
      const rawNextPaid = prevPaid + params.invoicePaidDelta;
      const baseAmount = Number(params.linkedInvoice.amount || 0);
      const newPaid = params.allowAuthorizedAdjustment
        ? Math.max(0, rawNextPaid)
        : Math.max(0, Math.min(baseAmount, rawNextPaid));
      const isSettled = newPaid >= baseAmount && baseAmount > 0;
      fallbackInvoice = sanitizeForFirestore({
        ...params.linkedInvoice,
        paidAmount: newPaid,
        status: isSettled ? "Paid" : newPaid > 0 ? "Partially Paid" : "Approved",
        workflowStage: isSettled ? "Completed" : params.linkedInvoice.workflowStage || "Verified",
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<FinancialInvoiceRecord>("invoices", fallbackInvoice, []);
    }

    let fallbackExpense: Expense | undefined;
    if (params.linkedExpense && params.expensePaidDelta && params.expensePaidDelta !== 0) {
      const prevPaid = Number(params.linkedExpense.paidAmount || 0);
      const rawNextPaid = prevPaid + params.expensePaidDelta;
      const baseAmount = Number(params.linkedExpense.amount || 0);
      const newPaid = params.allowAuthorizedAdjustment
        ? Math.max(0, rawNextPaid)
        : Math.max(0, Math.min(baseAmount, rawNextPaid));
      const isSettled = newPaid >= baseAmount && baseAmount > 0;
      fallbackExpense = sanitizeForFirestore({
        ...params.linkedExpense,
        paidAmount: newPaid,
        status: isSettled ? "Paid" : newPaid > 0 ? "Partially Paid" : "Approved",
        workflowStage: isSettled ? "Paid" : params.linkedExpense.workflowStage || "Approved",
        updatedAt: nowIso,
      });
      offlineEngine.updateCacheItem<Expense>("expenses", fallbackExpense, []);
    }

    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const txRef = doc(db, "cashTransactions", sanitizedTx.id);
          const accRef = params.account && params.accountDelta !== 0 ? doc(db, "financialAccounts", params.account.id) : null;
          const invRef = params.linkedInvoice && params.invoicePaidDelta ? doc(db, "invoices", params.linkedInvoice.id) : null;
          const expRef = params.linkedExpense && params.expensePaidDelta ? doc(db, "expenses", params.linkedExpense.id) : null;

          // Reads must happen before writes inside Firestore runTransaction
          const accSnap = accRef ? await transaction.get(accRef) : null;
          const invSnap = invRef ? await transaction.get(invRef) : null;
          const expSnap = expRef ? await transaction.get(expRef) : null;

          transaction.set(txRef, { ...sanitizedTx, serverReceivedAt: nowIso }, { merge: true });

          if (accRef) {
            const liveAcc = accSnap && accSnap.exists() ? (accSnap.data() as FinancialAccount) : params.account!;
            const nextBalance = Number(liveAcc.currentBalance || 0) + params.accountDelta;
            transaction.set(accRef, sanitizeForFirestore({ ...liveAcc, currentBalance: nextBalance, updatedAt: nowIso }), { merge: true });
          }

          if (invRef && params.invoicePaidDelta) {
            const liveInv = invSnap && invSnap.exists() ? (invSnap.data() as FinancialInvoiceRecord) : params.linkedInvoice!;
            const prevPaid = Number(liveInv.paidAmount || 0);
            const rawNext = prevPaid + params.invoicePaidDelta;
            const liveAmount = Number(liveInv.amount || 0);
            const nextPaid = params.allowAuthorizedAdjustment ? Math.max(0, rawNext) : Math.max(0, Math.min(liveAmount, rawNext));
            const isSettled = nextPaid >= liveAmount && liveAmount > 0;
            const nextStatus = isSettled ? "Paid" : nextPaid > 0 ? "Partially Paid" : "Approved";
            const nextStage = isSettled ? "Completed" : liveInv.workflowStage || "Verified";
            transaction.set(invRef, sanitizeForFirestore({ ...liveInv, paidAmount: nextPaid, status: nextStatus, workflowStage: nextStage, updatedAt: nowIso }), { merge: true });
          }

          if (expRef && params.expensePaidDelta) {
            const liveExp = expSnap && expSnap.exists() ? (expSnap.data() as Expense) : params.linkedExpense!;
            const prevPaid = Number(liveExp.paidAmount || 0);
            const rawNext = prevPaid + params.expensePaidDelta;
            const liveAmount = Number(liveExp.amount || 0);
            const nextPaid = params.allowAuthorizedAdjustment ? Math.max(0, rawNext) : Math.max(0, Math.min(liveAmount, rawNext));
            const isSettled = nextPaid >= liveAmount && liveAmount > 0;
            const nextStatus = isSettled ? "Paid" : nextPaid > 0 ? "Partially Paid" : "Approved";
            const nextStage = isSettled ? "Paid" : liveExp.workflowStage || "Approved";
            transaction.set(expRef, sanitizeForFirestore({ ...liveExp, paidAmount: nextPaid, status: nextStatus, workflowStage: nextStage, updatedAt: nowIso }), { merge: true });
          }
        });
        return;
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        if (isPermissionDenied) {
          handleFirestoreError(err, OperationType.WRITE, `cashTransactions/${sanitizedTx.id}`);
          throw err;
        }
        handleFirestoreError(err, OperationType.WRITE, `cashTransactions/${sanitizedTx.id}`);
        // Enqueue durable offline outbox mutations
        offlineEngine.queueOutbox("set", "cashTransactions", sanitizedTx.id, sanitizedTx);
        if (fallbackAccount) offlineEngine.queueOutbox("set", "financialAccounts", fallbackAccount.id, fallbackAccount);
        if (fallbackInvoice) offlineEngine.queueOutbox("set", "invoices", fallbackInvoice.id, fallbackInvoice);
        if (fallbackExpense) offlineEngine.queueOutbox("set", "expenses", fallbackExpense.id, fallbackExpense);
        return;
      }
    }

    offlineEngine.queueOutbox("set", "cashTransactions", sanitizedTx.id, sanitizedTx);
    if (fallbackAccount) offlineEngine.queueOutbox("set", "financialAccounts", fallbackAccount.id, fallbackAccount);
    if (fallbackInvoice) offlineEngine.queueOutbox("set", "invoices", fallbackInvoice.id, fallbackInvoice);
    if (fallbackExpense) offlineEngine.queueOutbox("set", "expenses", fallbackExpense.id, fallbackExpense);
  },

  // 8. Live subscriptions for Projects & Suppliers & Payroll (for finance cross-module linking)
  subscribeProjects(
    callback: (projects: any[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "projects"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as any), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<any>("projects", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "projects");
          if (onError) onError(error);
          callback(offlineEngine.getCache<any>("projects", []));
        }
      );
    }
    callback(offlineEngine.getCache<any>("projects", []));
    return () => {};
  },

  subscribePayrollRecords(
    callback: (records: PayrollRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "payroll"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as PayrollRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<PayrollRecord>("payroll", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "payroll");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PayrollRecord>("payroll", []));
        }
      );
    }
    callback(offlineEngine.getCache<PayrollRecord>("payroll", []));
    return () => {};
  },

  // ============================================================
  // PANEL TRACEABILITY FIRESTORE COLLECTIONS (Primary Cloud Store)
  // ============================================================

  // 1. traceablePanels ("traceablePanels")
  async getTraceablePanels(): Promise<TraceablePanel[]> {
    const raw = await fetchCollection<any>("traceablePanels", INITIAL_SEED_PANELS);
    return raw.map(p => ({ ...p, id: p.id || p.panelId, panelId: p.panelId || p.id }));
  },

  getCachedTraceablePanels(): TraceablePanel[] {
    const raw = offlineEngine.getCache<any>("traceablePanels", INITIAL_SEED_PANELS);
    return raw.map(p => ({ ...p, id: p.id || p.panelId, panelId: p.panelId || p.id }));
  },

  subscribeTraceablePanels(
    callback: (panels: TraceablePanel[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "traceablePanels");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as TraceablePanel;
                const id = data.id || data.panelId || docSnap.id;
                return { ...data, id, panelId: data.panelId || id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<TraceablePanel>("traceablePanels", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "traceablePanels");
          if (onError) onError(error);
          callback(offlineEngine.getCache<TraceablePanel>("traceablePanels", INITIAL_SEED_PANELS));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<TraceablePanel>("traceablePanels", INITIAL_SEED_PANELS));
      return () => {};
    }
  },

  async addTraceablePanel(panel: TraceablePanel): Promise<void> {
    const id = panel.id || panel.panelId;
    const item = { ...panel, id, panelId: panel.panelId || id };
    await writeDocument<any>("traceablePanels", item, INITIAL_SEED_PANELS);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("traceable_panels_updated"));
    }
  },

  async updateTraceablePanel(panel: TraceablePanel): Promise<void> {
    const id = panel.id || panel.panelId;
    const item = { ...panel, id, panelId: panel.panelId || id };
    await writeDocument<any>("traceablePanels", item, INITIAL_SEED_PANELS);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("traceable_panels_updated"));
    }
  },

  async deleteTraceablePanel(panelId: string): Promise<void> {
    await removeDocument<any>("traceablePanels", panelId, INITIAL_SEED_PANELS);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("traceable_panels_updated"));
    }
  },

  // 2. panelTraceabilityMovements ("panelTraceabilityMovements")
  async getPanelTraceabilityMovements(): Promise<PanelTraceabilityMovement[]> {
    const raw = await fetchCollection<any>("panelTraceabilityMovements", INITIAL_SEED_MOVEMENTS);
    return raw.map(m => ({ ...m, id: m.id || m.movementId, movementId: m.movementId || m.id }));
  },

  getCachedPanelTraceabilityMovements(): PanelTraceabilityMovement[] {
    const raw = offlineEngine.getCache<any>("panelTraceabilityMovements", INITIAL_SEED_MOVEMENTS);
    return raw.map(m => ({ ...m, id: m.id || m.movementId, movementId: m.movementId || m.id }));
  },

  subscribePanelTraceabilityMovements(
    callback: (movements: PanelTraceabilityMovement[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelTraceabilityMovements");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelTraceabilityMovement;
                const id = data.id || data.movementId || docSnap.id;
                return { ...data, id, movementId: data.movementId || id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelTraceabilityMovement>("panelTraceabilityMovements", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelTraceabilityMovements");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PanelTraceabilityMovement>("panelTraceabilityMovements", INITIAL_SEED_MOVEMENTS));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<PanelTraceabilityMovement>("panelTraceabilityMovements", INITIAL_SEED_MOVEMENTS));
      return () => {};
    }
  },

  async addPanelTraceabilityMovement(movement: PanelTraceabilityMovement): Promise<void> {
    const id = movement.id || movement.movementId;
    const item = { ...movement, id, movementId: movement.movementId || id };
    await writeDocument<any>("panelTraceabilityMovements", item, INITIAL_SEED_MOVEMENTS);
  },

  async updatePanelTraceabilityMovement(movement: PanelTraceabilityMovement): Promise<void> {
    const id = movement.id || movement.movementId;
    const item = { ...movement, id, movementId: movement.movementId || id };
    await writeDocument<any>("panelTraceabilityMovements", item, INITIAL_SEED_MOVEMENTS);
  },

  async deletePanelTraceabilityMovement(movementId: string): Promise<void> {
    await removeDocument<any>("panelTraceabilityMovements", movementId, INITIAL_SEED_MOVEMENTS);
  },

  // 3. panelDamageInspections ("panelDamageInspections")
  async getPanelDamageInspections(): Promise<PanelDamageInspection[]> {
    const raw = await fetchCollection<any>("panelDamageInspections", []);
    return raw.map(d => ({ ...d, id: d.id || d.inspectionId, inspectionId: d.inspectionId || d.id }));
  },

  getCachedPanelDamageInspections(): PanelDamageInspection[] {
    const raw = offlineEngine.getCache<any>("panelDamageInspections", []);
    return raw.map(d => ({ ...d, id: d.id || d.inspectionId, inspectionId: d.inspectionId || d.id }));
  },

  subscribePanelDamageInspections(
    callback: (damages: PanelDamageInspection[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelDamageInspections");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelDamageInspection;
                const id = data.id || data.inspectionId || docSnap.id;
                return { ...data, id, inspectionId: data.inspectionId || id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelDamageInspection>("panelDamageInspections", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelDamageInspections");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PanelDamageInspection>("panelDamageInspections", []));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<PanelDamageInspection>("panelDamageInspections", []));
      return () => {};
    }
  },

  async addPanelDamageInspection(inspection: PanelDamageInspection): Promise<void> {
    const id = inspection.id || inspection.inspectionId;
    const item = { ...inspection, id, inspectionId: inspection.inspectionId || id };
    await writeDocument<any>("panelDamageInspections", item, []);
  },

  async updatePanelDamageInspection(inspection: PanelDamageInspection): Promise<void> {
    const id = inspection.id || inspection.inspectionId;
    const item = { ...inspection, id, inspectionId: inspection.inspectionId || id };
    await writeDocument<any>("panelDamageInspections", item, []);
  },

  async deletePanelDamageInspection(inspectionId: string): Promise<void> {
    await removeDocument<any>("panelDamageInspections", inspectionId, []);
  },

  // 4. panelIssueTransactions ("panelIssueTransactions")
  async getPanelIssueTransactions(): Promise<PanelIssueTransaction[]> {
    const raw = await fetchCollection<any>("panelIssueTransactions", []);
    return raw.map(i => ({ ...i, id: i.id || i.issueId, issueId: i.issueId || i.id }));
  },

  getCachedPanelIssueTransactions(): PanelIssueTransaction[] {
    const raw = offlineEngine.getCache<any>("panelIssueTransactions", []);
    return raw.map(i => ({ ...i, id: i.id || i.issueId, issueId: i.issueId || i.id }));
  },

  subscribePanelIssueTransactions(
    callback: (issues: PanelIssueTransaction[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelIssueTransactions");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelIssueTransaction;
                const id = data.id || data.issueId || docSnap.id;
                return { ...data, id, issueId: data.issueId || id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelIssueTransaction>("panelIssueTransactions", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelIssueTransactions");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PanelIssueTransaction>("panelIssueTransactions", []));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<PanelIssueTransaction>("panelIssueTransactions", []));
      return () => {};
    }
  },

  async addPanelIssueTransaction(issue: PanelIssueTransaction): Promise<void> {
    const id = issue.id || issue.issueId;
    const item = { ...issue, id, issueId: issue.issueId || id };
    await writeDocument<any>("panelIssueTransactions", item, []);
  },

  async updatePanelIssueTransaction(issue: PanelIssueTransaction): Promise<void> {
    const id = issue.id || issue.issueId;
    const item = { ...issue, id, issueId: issue.issueId || id };
    await writeDocument<any>("panelIssueTransactions", item, []);
  },

  async deletePanelIssueTransaction(issueId: string): Promise<void> {
    await removeDocument<any>("panelIssueTransactions", issueId, []);
  },

  // 5. panelReturnTransactions ("panelReturnTransactions")
  async getPanelReturnTransactions(): Promise<PanelReturnTransaction[]> {
    const raw = await fetchCollection<any>("panelReturnTransactions", []);
    return raw.map(r => ({ ...r, id: r.id || r.returnId, returnId: r.returnId || r.id }));
  },

  getCachedPanelReturnTransactions(): PanelReturnTransaction[] {
    const raw = offlineEngine.getCache<any>("panelReturnTransactions", []);
    return raw.map(r => ({ ...r, id: r.id || r.returnId, returnId: r.returnId || r.id }));
  },

  subscribePanelReturnTransactions(
    callback: (returns: PanelReturnTransaction[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelReturnTransactions");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelReturnTransaction;
                const id = data.id || data.returnId || docSnap.id;
                return { ...data, id, returnId: data.returnId || id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelReturnTransaction>("panelReturnTransactions", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelReturnTransactions");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PanelReturnTransaction>("panelReturnTransactions", []));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<PanelReturnTransaction>("panelReturnTransactions", []));
      return () => {};
    }
  },

  async addPanelReturnTransaction(returnRecord: PanelReturnTransaction): Promise<void> {
    const id = returnRecord.id || returnRecord.returnId;
    const item = { ...returnRecord, id, returnId: returnRecord.returnId || id };
    await writeDocument<any>("panelReturnTransactions", item, []);
  },

  async updatePanelReturnTransaction(returnRecord: PanelReturnTransaction): Promise<void> {
    const id = returnRecord.id || returnRecord.returnId;
    const item = { ...returnRecord, id, returnId: returnRecord.returnId || id };
    await writeDocument<any>("panelReturnTransactions", item, []);
  },

  async deletePanelReturnTransaction(returnId: string): Promise<void> {
    await removeDocument<any>("panelReturnTransactions", returnId, []);
  },

  // 6. panelInventoryReconciliations ("panelInventoryReconciliations")
  async getPanelInventoryReconciliations(): Promise<PanelInventoryReconciliationRecord[]> {
    const raw = await fetchCollection<any>("panelInventoryReconciliations", []);
    return raw.map(rc => ({ ...rc, id: rc.id || rc.reconciliationId, reconciliationId: rc.reconciliationId || rc.id }));
  },

  getCachedPanelInventoryReconciliations(): PanelInventoryReconciliationRecord[] {
    const raw = offlineEngine.getCache<any>("panelInventoryReconciliations", []);
    return raw.map(rc => ({ ...rc, id: rc.id || rc.reconciliationId, reconciliationId: rc.reconciliationId || rc.id }));
  },

  subscribePanelInventoryReconciliations(
    callback: (records: PanelInventoryReconciliationRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelInventoryReconciliations");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelInventoryReconciliationRecord;
                const id = data.id || data.reconciliationId || docSnap.id;
                return { ...data, id, reconciliationId: data.reconciliationId || id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelInventoryReconciliationRecord>("panelInventoryReconciliations", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelInventoryReconciliations");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PanelInventoryReconciliationRecord>("panelInventoryReconciliations", []));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<PanelInventoryReconciliationRecord>("panelInventoryReconciliations", []));
      return () => {};
    }
  },

  async addPanelInventoryReconciliation(record: PanelInventoryReconciliationRecord): Promise<void> {
    const id = record.id || record.reconciliationId;
    const item = { ...record, id, reconciliationId: record.reconciliationId || id };
    await writeDocument<any>("panelInventoryReconciliations", item, []);
  },

  async updatePanelInventoryReconciliation(record: PanelInventoryReconciliationRecord): Promise<void> {
    const id = record.id || record.reconciliationId;
    const item = { ...record, id, reconciliationId: record.reconciliationId || id };
    await writeDocument<any>("panelInventoryReconciliations", item, []);
  },

  async deletePanelInventoryReconciliation(reconciliationId: string): Promise<void> {
    await removeDocument<any>("panelInventoryReconciliations", reconciliationId, []);
  },

  // 7. panelTraceabilityAuditLogs ("panelTraceabilityAuditLogs")
  async getPanelTraceabilityAuditLogs(): Promise<PanelTraceabilityAuditLog[]> {
    return fetchCollection<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", []);
  },

  getCachedPanelTraceabilityAuditLogs(): PanelTraceabilityAuditLog[] {
    return offlineEngine.getCache<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", []);
  },

  subscribePanelTraceabilityAuditLogs(
    callback: (logs: PanelTraceabilityAuditLog[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelTraceabilityAuditLogs");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as PanelTraceabilityAuditLog;
                return { ...data, id: data.id || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelTraceabilityAuditLogs");
          if (onError) onError(error);
          callback(offlineEngine.getCache<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", []));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", []));
      return () => {};
    }
  },

  async addPanelTraceabilityAuditLog(log: PanelTraceabilityAuditLog): Promise<void> {
    await writeDocument<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", log, []);
  },
  async updatePanelTraceabilityAuditLog(log: PanelTraceabilityAuditLog): Promise<void> {
    await writeDocument<PanelTraceabilityAuditLog>("panelTraceabilityAuditLogs", log, []);
  },

  // 8. panelDimensionLibrary ("panelDimensionLibrary")
  async getPanelDimensionLibrary(): Promise<ConfiguredDimensionOption[]> {
    return fetchCollection<ConfiguredDimensionOption>("panelDimensionLibrary", DEFAULT_DIMENSION_LIBRARY);
  },

  getCachedPanelDimensionLibrary(): ConfiguredDimensionOption[] {
    return offlineEngine.getCache<ConfiguredDimensionOption>("panelDimensionLibrary", DEFAULT_DIMENSION_LIBRARY);
  },

  subscribePanelDimensionLibrary(
    callback: (dimensions: ConfiguredDimensionOption[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "panelDimensionLibrary");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as ConfiguredDimensionOption;
                return { ...data, id: data.id || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<ConfiguredDimensionOption>("panelDimensionLibrary", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "panelDimensionLibrary");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ConfiguredDimensionOption>("panelDimensionLibrary", DEFAULT_DIMENSION_LIBRARY));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<ConfiguredDimensionOption>("panelDimensionLibrary", DEFAULT_DIMENSION_LIBRARY));
      return () => {};
    }
  },

  async addPanelDimensionOption(dimension: ConfiguredDimensionOption): Promise<void> {
    await writeDocument<ConfiguredDimensionOption>("panelDimensionLibrary", dimension, DEFAULT_DIMENSION_LIBRARY);
  },

  async updatePanelDimensionOption(dimension: ConfiguredDimensionOption): Promise<void> {
    await writeDocument<ConfiguredDimensionOption>("panelDimensionLibrary", dimension, DEFAULT_DIMENSION_LIBRARY);
  },

  async deletePanelDimensionOption(dimensionId: string): Promise<void> {
    await removeDocument<ConfiguredDimensionOption>("panelDimensionLibrary", dimensionId, DEFAULT_DIMENSION_LIBRARY);
  },

  // Aliases for convenience
  async addPanelDimension(dimension: ConfiguredDimensionOption): Promise<void> {
    return this.addPanelDimensionOption(dimension);
  },

  async updatePanelDimension(dimension: ConfiguredDimensionOption): Promise<void> {
    return this.updatePanelDimensionOption(dimension);
  },

  async deletePanelDimension(dimensionId: string): Promise<void> {
    return this.deletePanelDimensionOption(dimensionId);
  },

  // ============================================================
  // TASK MANAGEMENT FIRESTORE COLLECTIONS ("tasks")
  // ============================================================

  async getTasks(): Promise<ErpTask[]> {
    return fetchCollection<ErpTask>("tasks", initialErpTasks);
  },

  getCachedTasks(): ErpTask[] {
    return offlineEngine.getCache<ErpTask>("tasks", initialErpTasks);
  },

  subscribeTasks(
    callback: (tasks: ErpTask[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      const colRef = collection(db, "tasks");
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(docSnap => {
                const data = docSnap.data() as ErpTask;
                return { ...data, id: data.id || docSnap.id };
              });
          const reconciled = offlineEngine.reconcileWithOutbox<ErpTask>("tasks", items);
          callback(reconciled);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "tasks");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ErpTask>("tasks", initialErpTasks));
        }
      );
      return unsubscribe;
    } else {
      callback(offlineEngine.getCache<ErpTask>("tasks", initialErpTasks));
      return () => {};
    }
  },

  async addTask(task: ErpTask): Promise<void> {
    await writeDocument<ErpTask>("tasks", task, initialErpTasks);
  },

  async updateTask(task: ErpTask): Promise<void> {
    await writeDocument<ErpTask>("tasks", task, initialErpTasks);
  },

  async deleteTask(taskId: string): Promise<void> {
    await removeDocument<ErpTask>("tasks", taskId, initialErpTasks);
  },

  // ============================================================
  // ENTERPRISE HUMAN RESOURCE MANAGEMENT (HRM) COLLECTIONS
  // ============================================================

  async uploadHrmFile(file: File, storagePath: string): Promise<{ url: string; storagePath: string }> {
    const readAsDataUrl = (): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

    if (canQueryFirestore() && storage) {
      try {
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        return { url, storagePath };
      } catch (err) {
        console.warn("Firebase Storage upload fallback to compressed/data URL:", err);
      }
    }
    const dataUrl = await readAsDataUrl();
    return { url: dataUrl, storagePath: `local:${storagePath}` };
  },

  // 1) manpowerPlans
  subscribeManpowerPlans(
    callback: (plans: ManpowerPlanRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "manpowerPlans"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as ManpowerPlanRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<ManpowerPlanRecord>("manpowerPlans", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "manpowerPlans");
          if (onError) onError(error);
          callback(offlineEngine.getCache<ManpowerPlanRecord>("manpowerPlans", []));
        }
      );
    }
    callback(offlineEngine.getCache<ManpowerPlanRecord>("manpowerPlans", []));
    return () => {};
  },
  async saveManpowerPlan(plan: ManpowerPlanRecord): Promise<void> {
    await writeDocument<ManpowerPlanRecord>("manpowerPlans", plan, []);
  },
  async deleteManpowerPlan(planId: string): Promise<void> {
    await removeDocument<ManpowerPlanRecord>("manpowerPlans", planId, []);
  },

  // 2) recruitmentRequests
  subscribeRecruitmentRequests(
    callback: (reqs: RecruitmentRequestRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "recruitmentRequests"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as RecruitmentRequestRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<RecruitmentRequestRecord>("recruitmentRequests", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "recruitmentRequests");
          if (onError) onError(error);
          callback(offlineEngine.getCache<RecruitmentRequestRecord>("recruitmentRequests", []));
        }
      );
    }
    callback(offlineEngine.getCache<RecruitmentRequestRecord>("recruitmentRequests", []));
    return () => {};
  },
  async saveRecruitmentRequest(req: RecruitmentRequestRecord): Promise<void> {
    await writeDocument<RecruitmentRequestRecord>("recruitmentRequests", req, []);
  },
  async deleteRecruitmentRequest(reqId: string): Promise<void> {
    await removeDocument<RecruitmentRequestRecord>("recruitmentRequests", reqId, []);
  },

  // 3) workSchedules
  subscribeWorkSchedules(
    callback: (schedules: WorkScheduleConfig[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "workSchedules"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as WorkScheduleConfig), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<WorkScheduleConfig>("workSchedules", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "workSchedules");
          if (onError) onError(error);
          callback(offlineEngine.getCache<WorkScheduleConfig>("workSchedules", []));
        }
      );
    }
    callback(offlineEngine.getCache<WorkScheduleConfig>("workSchedules", []));
    return () => {};
  },
  async saveWorkSchedule(schedule: WorkScheduleConfig): Promise<void> {
    await writeDocument<WorkScheduleConfig>("workSchedules", schedule, []);
  },

  // 4) leaveRequests
  subscribeLeaveRequests(
    callback: (leaves: LeaveRequestRecord[]) => void,
    onError?: (error: any) => void,
    filterByCreatorUid?: string
  ): () => void {
    if (canQueryFirestore() && db) {
      const refOrQuery = filterByCreatorUid
        ? query(collection(db, "leaveRequests"), where("createdById", "==", filterByCreatorUid))
        : collection(db, "leaveRequests");
      return onSnapshot(
        refOrQuery,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as LeaveRequestRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<LeaveRequestRecord>("leaveRequests", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "leaveRequests");
          if (onError) onError(error);
          callback(offlineEngine.getCache<LeaveRequestRecord>("leaveRequests", []));
        }
      );
    }
    callback(offlineEngine.getCache<LeaveRequestRecord>("leaveRequests", []));
    return () => {};
  },
  async saveLeaveRequest(leave: LeaveRequestRecord): Promise<void> {
    await writeDocument<LeaveRequestRecord>("leaveRequests", leave, []);
  },

  // 5) overtimeRequests
  subscribeOvertimeRequests(
    callback: (overtimes: OvertimeRequestRecord[]) => void,
    onError?: (error: any) => void,
    filterByCreatorUid?: string
  ): () => void {
    if (canQueryFirestore() && db) {
      const refOrQuery = filterByCreatorUid
        ? query(collection(db, "overtimeRequests"), where("createdById", "==", filterByCreatorUid))
        : collection(db, "overtimeRequests");
      return onSnapshot(
        refOrQuery,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as OvertimeRequestRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<OvertimeRequestRecord>("overtimeRequests", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "overtimeRequests");
          if (onError) onError(error);
          callback(offlineEngine.getCache<OvertimeRequestRecord>("overtimeRequests", []));
        }
      );
    }
    callback(offlineEngine.getCache<OvertimeRequestRecord>("overtimeRequests", []));
    return () => {};
  },
  async saveOvertimeRequest(ot: OvertimeRequestRecord): Promise<void> {
    await writeDocument<OvertimeRequestRecord>("overtimeRequests", ot, []);
  },

  // 6) employeeTransfers
  subscribeEmployeeTransfers(
    callback: (transfers: EmployeeTransferRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "employeeTransfers"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as EmployeeTransferRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<EmployeeTransferRecord>("employeeTransfers", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "employeeTransfers");
          if (onError) onError(error);
          callback(offlineEngine.getCache<EmployeeTransferRecord>("employeeTransfers", []));
        }
      );
    }
    callback(offlineEngine.getCache<EmployeeTransferRecord>("employeeTransfers", []));
    return () => {};
  },
  async saveEmployeeTransfer(transfer: EmployeeTransferRecord): Promise<void> {
    await writeDocument<EmployeeTransferRecord>("employeeTransfers", transfer, []);
  },

  // 7) salaryStructures
  subscribeSalaryStructures(
    callback: (structures: SalaryStructureRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "salaryStructures"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as SalaryStructureRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<SalaryStructureRecord>("salaryStructures", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "salaryStructures");
          if (onError) onError(error);
          callback(offlineEngine.getCache<SalaryStructureRecord>("salaryStructures", []));
        }
      );
    }
    callback(offlineEngine.getCache<SalaryStructureRecord>("salaryStructures", []));
    return () => {};
  },
  async saveSalaryStructure(structure: SalaryStructureRecord): Promise<void> {
    await writeDocument<SalaryStructureRecord>("salaryStructures", structure, []);
  },

  // 8) taxPensionConfigs
  subscribeTaxPensionConfigs(
    callback: (configs: EthiopianTaxPensionConfig[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "taxPensionConfigs"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as EthiopianTaxPensionConfig), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<EthiopianTaxPensionConfig>("taxPensionConfigs", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "taxPensionConfigs");
          if (onError) onError(error);
          callback(offlineEngine.getCache<EthiopianTaxPensionConfig>("taxPensionConfigs", []));
        }
      );
    }
    callback(offlineEngine.getCache<EthiopianTaxPensionConfig>("taxPensionConfigs", []));
    return () => {};
  },
  async saveTaxPensionConfig(cfg: EthiopianTaxPensionConfig): Promise<void> {
    await writeDocument<EthiopianTaxPensionConfig>("taxPensionConfigs", cfg, []);
  },

  // 9) salaryAdvancesLoans
  subscribeSalaryAdvancesLoans(
    callback: (loans: SalaryAdvanceLoanRecord[]) => void,
    onError?: (error: any) => void,
    filterByCreatorUid?: string
  ): () => void {
    if (canQueryFirestore() && db) {
      const refOrQuery = filterByCreatorUid
        ? query(collection(db, "salaryAdvancesLoans"), where("createdById", "==", filterByCreatorUid))
        : collection(db, "salaryAdvancesLoans");
      return onSnapshot(
        refOrQuery,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as SalaryAdvanceLoanRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<SalaryAdvanceLoanRecord>("salaryAdvancesLoans", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "salaryAdvancesLoans");
          if (onError) onError(error);
          callback(offlineEngine.getCache<SalaryAdvanceLoanRecord>("salaryAdvancesLoans", []));
        }
      );
    }
    callback(offlineEngine.getCache<SalaryAdvanceLoanRecord>("salaryAdvancesLoans", []));
    return () => {};
  },
  async saveSalaryAdvanceLoan(loan: SalaryAdvanceLoanRecord): Promise<void> {
    await writeDocument<SalaryAdvanceLoanRecord>("salaryAdvancesLoans", loan, []);
  },

  // 9B) hrmPrivateProfiles (Encrypted PII: Fayda ID, Bank Account, Mobile Money, Biometrics)
  subscribeHrmPrivateProfiles(
    callback: (profiles: HrmPrivateProfileRecord[]) => void,
    onError?: (error: any) => void,
    filterByUserId?: string
  ): () => void {
    if (canQueryFirestore() && db) {
      const refOrQuery = filterByUserId
        ? query(collection(db, "hrmPrivateProfiles"), where("userId", "==", filterByUserId))
        : collection(db, "hrmPrivateProfiles");
      return onSnapshot(
        refOrQuery,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as HrmPrivateProfileRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<HrmPrivateProfileRecord>("hrmPrivateProfiles", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "hrmPrivateProfiles");
          if (onError) onError(error);
          callback(offlineEngine.getCache<HrmPrivateProfileRecord>("hrmPrivateProfiles", []));
        }
      );
    }
    callback(offlineEngine.getCache<HrmPrivateProfileRecord>("hrmPrivateProfiles", []));
    return () => {};
  },
  async saveHrmPrivateProfile(profile: HrmPrivateProfileRecord): Promise<void> {
    const safeProfile = { ...profile } as any;
    delete safeProfile.biometricTemplateEncrypted;
    delete safeProfile.fingerprint;
    delete safeProfile.faceRecognitionData;
    delete safeProfile.fingerprintTemplate;
    delete safeProfile.faceTemplate;
    delete safeProfile.rawBiometricTemplate;
    delete safeProfile.biometricTemplate;
    await writeDocument<HrmPrivateProfileRecord>("hrmPrivateProfiles", safeProfile, []);
  },

  // 9C) hrmPayslips (Individual employee self-service payslip records)
  subscribeHrmPayslips(
    callback: (payslips: HrmPayslipRecord[]) => void,
    onError?: (error: any) => void,
    filterByWorkerUserId?: string
  ): () => void {
    if (canQueryFirestore() && db) {
      const refOrQuery = filterByWorkerUserId
        ? query(collection(db, "hrmPayslips"), where("workerUserId", "==", filterByWorkerUserId))
        : collection(db, "hrmPayslips");
      return onSnapshot(
        refOrQuery,
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as HrmPayslipRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<HrmPayslipRecord>("hrmPayslips", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "hrmPayslips");
          if (onError) onError(error);
          callback(offlineEngine.getCache<HrmPayslipRecord>("hrmPayslips", []));
        }
      );
    }
    callback(offlineEngine.getCache<HrmPayslipRecord>("hrmPayslips", []));
    return () => {};
  },
  async saveHrmPayslip(payslip: HrmPayslipRecord): Promise<void> {
    await writeDocument<HrmPayslipRecord>("hrmPayslips", payslip, []);
  },

  // 10) hrmPayrollRuns & Atomic Payroll Disbursement -> Bank + GL + Project Cost Control
  subscribeHrmPayrollRuns(
    callback: (runs: HrmPayrollRunRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "hrmPayrollRuns"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as HrmPayrollRunRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<HrmPayrollRunRecord>("hrmPayrollRuns", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "hrmPayrollRuns");
          if (onError) onError(error);
          callback(offlineEngine.getCache<HrmPayrollRunRecord>("hrmPayrollRuns", []));
        }
      );
    }
    callback(offlineEngine.getCache<HrmPayrollRunRecord>("hrmPayrollRuns", []));
    return () => {};
  },
  async saveHrmPayrollRun(run: HrmPayrollRunRecord): Promise<void> {
    await writeDocument<HrmPayrollRunRecord>("hrmPayrollRuns", run, []);
  },
  async disburseHrmPayrollRunAtomic(params: {
    run: HrmPayrollRunRecord;
    journalEntry: JournalEntryRecord;
    bankTransaction?: BankTransactionRecord;
    account?: FinancialAccount;
    expenseRecords: Expense[];
    actualCostRecords: ActualCostEntry[];
    updatedLoans: SalaryAdvanceLoanRecord[];
    payslips?: HrmPayslipRecord[];
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const diff = Math.abs(Number(params.journalEntry.totalDebit || 0) - Number(params.journalEntry.totalCredit || 0));
    if (!params.journalEntry.isBalanced || diff > 0.01) {
      throw new Error("Payroll GL Journal Entry is unbalanced.");
    }
    const sanitizedRun = sanitizeForFirestore(params.run);
    const sanitizedJournal = sanitizeForFirestore(params.journalEntry);
    const sanitizedBankTx = params.bankTransaction ? sanitizeForFirestore(params.bankTransaction) : undefined;
    const updatedAcc = params.account
      ? sanitizeForFirestore({
          ...params.account,
          currentBalance: Number(params.account.currentBalance || 0) - Number(params.run.totalNetPay || 0),
          updatedAt: nowIso,
        })
      : undefined;

    offlineEngine.updateCacheItem<HrmPayrollRunRecord>("hrmPayrollRuns", sanitizedRun, []);
    offlineEngine.updateCacheItem<JournalEntryRecord>("journalEntries", sanitizedJournal, []);
    if (sanitizedBankTx) offlineEngine.updateCacheItem<BankTransactionRecord>("bankTransactions", sanitizedBankTx, []);
    if (updatedAcc) offlineEngine.updateCacheItem<FinancialAccount>("financialAccounts", updatedAcc, []);
    params.expenseRecords.forEach((ex) => offlineEngine.updateCacheItem<Expense>("expenses", sanitizeForFirestore(ex), []));
    params.actualCostRecords.forEach((ac) => offlineEngine.updateCacheItem<ActualCostEntry>("actualCostEntries", sanitizeForFirestore(ac), []));
    params.updatedLoans.forEach((ln) => offlineEngine.updateCacheItem<SalaryAdvanceLoanRecord>("salaryAdvancesLoans", sanitizeForFirestore(ln), []));
    (params.payslips || []).forEach((ps) => offlineEngine.updateCacheItem<HrmPayslipRecord>("hrmPayslips", sanitizeForFirestore(ps), []));

    if (canQueryFirestore() && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const runRef = doc(db!, "hrmPayrollRuns", sanitizedRun.id);
          const runSnap = await transaction.get(runRef);
          if (runSnap.exists() && (runSnap.data() as HrmPayrollRunRecord).workflowStage === "Paid") {
            throw new Error("This payroll run has already been disbursed (duplicate payment prevented).");
          }

          let liveAccount = params.account;
          if (params.account) {
            const accRef = doc(db!, "financialAccounts", params.account.id);
            const accSnap = await transaction.get(accRef);
            if (accSnap.exists()) {
              liveAccount = accSnap.data() as FinancialAccount;
            }
          }

          transaction.set(runRef, { ...sanitizedRun, serverReceivedAt: nowIso }, { merge: true });
          transaction.set(doc(db!, "journalEntries", sanitizedJournal.id), { ...sanitizedJournal, serverReceivedAt: nowIso }, { merge: true });
          if (sanitizedBankTx) {
            transaction.set(doc(db!, "bankTransactions", sanitizedBankTx.id), { ...sanitizedBankTx, serverReceivedAt: nowIso }, { merge: true });
          }
          if (liveAccount && params.account) {
            transaction.set(
              doc(db!, "financialAccounts", params.account.id),
              sanitizeForFirestore({
                ...liveAccount,
                currentBalance: Number(liveAccount.currentBalance || 0) - Number(params.run.totalNetPay || 0),
                updatedAt: nowIso,
              }),
              { merge: true }
            );
          }
          params.expenseRecords.forEach((ex) => {
            const s = sanitizeForFirestore(ex);
            transaction.set(doc(db!, "expenses", s.id), { ...s, serverReceivedAt: nowIso }, { merge: true });
          });
          params.actualCostRecords.forEach((ac) => {
            const s = sanitizeForFirestore(ac);
            transaction.set(doc(db!, "actualCostEntries", s.id), { ...s, serverReceivedAt: nowIso }, { merge: true });
          });
          params.updatedLoans.forEach((ln) => {
            const s = sanitizeForFirestore(ln);
            transaction.set(doc(db!, "salaryAdvancesLoans", s.id), { ...s, serverReceivedAt: nowIso }, { merge: true });
          });
          (params.payslips || []).forEach((ps) => {
            const s = sanitizeForFirestore(ps);
            transaction.set(doc(db!, "hrmPayslips", s.id), { ...s, serverReceivedAt: nowIso }, { merge: true });
          });
        });
        return;
      } catch (err: any) {
        const isDupOrPerm =
          String(err?.message || "").includes("duplicate") ||
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        handleFirestoreError(err, OperationType.WRITE, `hrmPayrollRuns/${sanitizedRun.id}`);
        if (isDupOrPerm) throw err;
      }
    }

    offlineEngine.queueOutbox("set", "hrmPayrollRuns", sanitizedRun.id, sanitizedRun);
    offlineEngine.queueOutbox("set", "journalEntries", sanitizedJournal.id, sanitizedJournal);
    if (sanitizedBankTx) offlineEngine.queueOutbox("set", "bankTransactions", sanitizedBankTx.id, sanitizedBankTx);
    if (updatedAcc) offlineEngine.queueOutbox("set", "financialAccounts", updatedAcc.id, updatedAcc);
    params.expenseRecords.forEach((ex) => offlineEngine.queueOutbox("set", "expenses", ex.id, sanitizeForFirestore(ex)));
    params.actualCostRecords.forEach((ac) => offlineEngine.queueOutbox("set", "actualCostEntries", ac.id, sanitizeForFirestore(ac)));
    params.updatedLoans.forEach((ln) => offlineEngine.queueOutbox("set", "salaryAdvancesLoans", ln.id, sanitizeForFirestore(ln)));
    (params.payslips || []).forEach((ps) => offlineEngine.queueOutbox("set", "hrmPayslips", ps.id, sanitizeForFirestore(ps)));
  },

  // ============================================================
  // EMPLOYEE BIOMETRIC MAPPING MODULE COLLECTIONS
  // ============================================================

  // 1) biometricDevices (Registered physical biometric terminals; zero secrets stored)
  subscribeBiometricDevices(
    callback: (devices: BiometricDeviceRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "biometricDevices"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BiometricDeviceRecord), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BiometricDeviceRecord>("biometricDevices", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "biometricDevices");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BiometricDeviceRecord>("biometricDevices", []));
        }
      );
    }
    callback(offlineEngine.getCache<BiometricDeviceRecord>("biometricDevices", []));
    return () => {};
  },
  async saveBiometricDevice(device: BiometricDeviceRecord): Promise<void> {
    await writeDocument<BiometricDeviceRecord>("biometricDevices", device, []);
  },

  // 2) biometricDeviceMappings (Employee-to-Biometric-Device User ID mappings)
  subscribeBiometricDeviceMappings(
    callback: (mappings: BiometricDeviceMapping[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "biometricDeviceMappings"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BiometricDeviceMapping), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BiometricDeviceMapping>("biometricDeviceMappings", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "biometricDeviceMappings");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BiometricDeviceMapping>("biometricDeviceMappings", []));
        }
      );
    }
    callback(offlineEngine.getCache<BiometricDeviceMapping>("biometricDeviceMappings", []));
    return () => {};
  },
  async saveBiometricDeviceMapping(mapping: BiometricDeviceMapping): Promise<void> {
    await writeDocument<BiometricDeviceMapping>("biometricDeviceMappings", mapping, []);
  },

  // 3) biometricMappingAuditLogs (Immutable create-only mapping change history)
  subscribeBiometricMappingAuditLogs(
    callback: (logs: BiometricMappingAuditLog[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "biometricMappingAuditLogs"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as BiometricMappingAuditLog), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<BiometricMappingAuditLog>("biometricMappingAuditLogs", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "biometricMappingAuditLogs");
          if (onError) onError(error);
          callback(offlineEngine.getCache<BiometricMappingAuditLog>("biometricMappingAuditLogs", []));
        }
      );
    }
    callback(offlineEngine.getCache<BiometricMappingAuditLog>("biometricMappingAuditLogs", []));
    return () => {};
  },
  async addBiometricMappingAuditLog(log: BiometricMappingAuditLog): Promise<void> {
    const sanitized = sanitizeForFirestore(log);
    offlineEngine.updateCacheItem<BiometricMappingAuditLog>("biometricMappingAuditLogs", sanitized, []);
    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, "biometricMappingAuditLogs", sanitized.id), {
          ...sanitized,
          serverReceivedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        if (isPermissionDenied) {
          handleFirestoreError(err, OperationType.CREATE, `biometricMappingAuditLogs/${sanitized.id}`);
        } else {
          offlineEngine.queueOutbox("set", "biometricMappingAuditLogs", sanitized.id, sanitized);
        }
      }
    } else {
      offlineEngine.queueOutbox("set", "biometricMappingAuditLogs", sanitized.id, sanitized);
    }
  },

  // 4) unmappedBiometricEvents (Attendance punches from unregistered/unmapped device user IDs)
  subscribeUnmappedBiometricEvents(
    callback: (events: UnmappedBiometricEvent[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "unmappedBiometricEvents"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as UnmappedBiometricEvent), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<UnmappedBiometricEvent>("unmappedBiometricEvents", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "unmappedBiometricEvents");
          if (onError) onError(error);
          callback(offlineEngine.getCache<UnmappedBiometricEvent>("unmappedBiometricEvents", []));
        }
      );
    }
    callback(offlineEngine.getCache<UnmappedBiometricEvent>("unmappedBiometricEvents", []));
    return () => {};
  },
  async saveUnmappedBiometricEvent(evt: UnmappedBiometricEvent): Promise<void> {
    await writeDocument<UnmappedBiometricEvent>("unmappedBiometricEvents", evt, []);
  },

  // ============================================================
  // ATTENDANCE WORKFLOW PART 2: CORRECTIONS, POLICIES & AUDIT LOGS
  // ============================================================

  subscribeAttendanceCorrections(
    callback: (corrections: AttendanceCorrectionRequest[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "attendanceCorrections"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as AttendanceCorrectionRequest), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<AttendanceCorrectionRequest>("attendanceCorrections", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "attendanceCorrections");
          if (onError) onError(error);
          callback(offlineEngine.getCache<AttendanceCorrectionRequest>("attendanceCorrections", []));
        }
      );
    }
    callback(offlineEngine.getCache<AttendanceCorrectionRequest>("attendanceCorrections", []));
    return () => {};
  },
  async saveAttendanceCorrection(correction: AttendanceCorrectionRequest): Promise<void> {
    await writeDocument<AttendanceCorrectionRequest>("attendanceCorrections", correction, []);
  },

  subscribeAttendanceDeductionPolicies(
    callback: (policies: AttendanceDeductionPolicy[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "attendanceDeductionPolicies"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as AttendanceDeductionPolicy), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<AttendanceDeductionPolicy>("attendanceDeductionPolicies", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "attendanceDeductionPolicies");
          if (onError) onError(error);
          callback(offlineEngine.getCache<AttendanceDeductionPolicy>("attendanceDeductionPolicies", []));
        }
      );
    }
    callback(offlineEngine.getCache<AttendanceDeductionPolicy>("attendanceDeductionPolicies", []));
    return () => {};
  },
  async saveAttendanceDeductionPolicy(policy: AttendanceDeductionPolicy): Promise<void> {
    await writeDocument<AttendanceDeductionPolicy>("attendanceDeductionPolicies", policy, []);
  },

  subscribeAttendanceAuditLogs(
    callback: (logs: AttendanceAuditLog[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (canQueryFirestore() && db) {
      return onSnapshot(
        collection(db, "attendanceAuditLogs"),
        (snapshot) => {
          const items = snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ ...(d.data() as AttendanceAuditLog), id: (d.data() as any).id || d.id }));
          callback(offlineEngine.reconcileWithOutbox<AttendanceAuditLog>("attendanceAuditLogs", items));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, "attendanceAuditLogs");
          if (onError) onError(error);
          callback(offlineEngine.getCache<AttendanceAuditLog>("attendanceAuditLogs", []));
        }
      );
    }
    callback(offlineEngine.getCache<AttendanceAuditLog>("attendanceAuditLogs", []));
    return () => {};
  },
  async addAttendanceAuditLog(log: AttendanceAuditLog): Promise<void> {
    const sanitized = sanitizeForFirestore(log);
    offlineEngine.updateCacheItem<AttendanceAuditLog>("attendanceAuditLogs", sanitized, []);
    if (isFirebaseReady && db) {
      try {
        await setDoc(doc(db, "attendanceAuditLogs", sanitized.id), {
          ...sanitized,
          serverReceivedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        const isPermissionDenied =
          err?.code === "permission-denied" ||
          String(err?.message || "").includes("PERMISSION_DENIED");
        if (isPermissionDenied) {
          handleFirestoreError(err, OperationType.CREATE, `attendanceAuditLogs/${sanitized.id}`);
        } else {
          offlineEngine.queueOutbox("set", "attendanceAuditLogs", sanitized.id, sanitized);
        }
      }
    } else {
      offlineEngine.queueOutbox("set", "attendanceAuditLogs", sanitized.id, sanitized);
    }
  }
};

