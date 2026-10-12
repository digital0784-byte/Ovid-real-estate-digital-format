/**
 * Offline Sync Service for Digital Construction ERP System
 * 
 * Features:
 * - Durable queue with pending, syncing, synced, failed states
 * - Globally unique stable client-side IDs (never regenerated on retries)
 * - Controlled exponential backoff with jitter
 * - Idempotent Firestore writes using stable document ID as key
 * - Preserves original client event capture time & separates server receipt time
 * - Network status listeners and cross-tab/app-restart persistence
 */

export type SyncState = "pending" | "syncing" | "synced" | "failed";

export interface SyncRecordPayload {
  id: string;
  capturedAt: string; // ISO 8601 device capture timestamp
  serverReceivedAt?: string; // Stamped upon server confirmation
  syncedAt?: string;
  retryCount?: number;
  [key: string]: any;
}

export interface SyncQueueItem {
  id: string; // Stable record ID / idempotency key
  collectionName: string;
  action: "set" | "delete";
  payload: SyncRecordPayload;
  status: SyncState;
  createdAt: number;
  lastAttemptAt?: number;
  nextAttemptAt?: number;
  retryCount: number;
  errorMessage?: string;
}

export interface SyncStats {
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  syncedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

const STORAGE_KEY_QUEUE = "erp_durable_sync_queue_v2";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private isProcessing = false;
  private syncIntervalTimer: any = null;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkReturn());
      window.addEventListener("offline", () => this.notifyListeners());
      
      // Periodic check for retry backoffs (every 10 seconds)
      this.syncIntervalTimer = setInterval(() => {
        if (navigator.onLine && !this.isProcessing) {
          this.processQueue().catch(() => {});
        }
      }, 10000);
    }
  }

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  /**
   * Generates a stable, globally unique record ID.
   * Format: `rec_${timestamp}_${uuid}`
   */
  public generateStableId(prefix: string = "REC"): string {
    const timestamp = Date.now();
    let uniquePart = "";
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      uniquePart = crypto.randomUUID();
    } else {
      uniquePart = `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`;
    }
    return `${prefix}-${timestamp}-${uniquePart}`;
  }

  /**
   * Retrieves all items from durable storage.
   */
  public getQueue(): SyncQueueItem[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("[OfflineSyncService] Failed to read queue from localStorage:", e);
      return [];
    }
  }

  private saveQueue(queue: SyncQueueItem[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
      this.notifyListeners();
    } catch (e) {
      console.warn("[OfflineSyncService] Failed to save queue to localStorage:", e);
    }
  }

  /**
   * Adds or updates a record in the durable offline-first queue.
   * If a record with this ID already exists, it preserves the existing stable ID and retry metadata.
   */
  public enqueue(
    collectionName: string,
    action: "set" | "delete",
    payload: SyncRecordPayload
  ): SyncQueueItem {
    const queue = this.getQueue();
    const existingIndex = queue.findIndex(q => q.id === payload.id);

    const now = Date.now();
    let queueItem: SyncQueueItem;

    if (existingIndex >= 0) {
      // Record already queued: update payload while keeping existing stable ID
      queueItem = {
        ...queue[existingIndex],
        payload: {
          ...queue[existingIndex].payload,
          ...payload,
          id: queue[existingIndex].id // Never change stable ID
        },
        status: "pending",
        nextAttemptAt: now
      };
      queue[existingIndex] = queueItem;
    } else {
      // New record captured
      queueItem = {
        id: payload.id,
        collectionName,
        action,
        payload: {
          ...payload,
          capturedAt: payload.capturedAt || new Date().toISOString()
        },
        status: "pending",
        createdAt: now,
        retryCount: 0,
        nextAttemptAt: now
      };
      queue.push(queueItem);
    }

    this.saveQueue(queue);

    // Attempt synchronization if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      setTimeout(() => this.processQueue().catch(() => {}), 50);
    }

    return queueItem;
  }

  /**
   * Calculates exponential backoff with full jitter
   */
  private calculateBackoff(retryCount: number): number {
    const exponential = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, retryCount));
    // Jitter between 50% and 100% of the backoff window
    const jitter = exponential * (0.5 + Math.random() * 0.5);
    return Math.floor(jitter);
  }

  /**
   * Processes all pending and ready-to-retry records in the durable queue.
   */
  public async processQueue(syncExecutor?: (item: SyncQueueItem) => Promise<boolean>): Promise<SyncStats> {
    if (this.isProcessing) return this.getStats();
    if (typeof navigator !== "undefined" && !navigator.onLine) return this.getStats();

    this.isProcessing = true;
    this.notifyListeners();

    try {
      const queue = this.getQueue();
      const now = Date.now();

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // Skip items that are already synced
        if (item.status === "synced") continue;

        // Skip if waiting for backoff window
        if (item.nextAttemptAt && item.nextAttemptAt > now && item.status !== "pending") {
          continue;
        }

        // Mark as syncing
        item.status = "syncing";
        item.lastAttemptAt = now;
        this.saveQueue(queue);

        try {
          let success = false;
          if (syncExecutor) {
            success = await syncExecutor(item);
          } else {
            success = await this.defaultFirestoreSync(item);
          }

          if (success) {
            item.status = "synced";
            item.payload.serverReceivedAt = new Date().toISOString();
            item.payload.syncedAt = new Date().toISOString();
            item.errorMessage = undefined;
          } else {
            this.handleItemFailure(item, new Error("Sync returned false"));
          }
        } catch (err: any) {
          this.handleItemFailure(item, err);
        }

        this.saveQueue(queue);
      }

      // Cleanup old synced items (keep last 50 for audit/history)
      this.purgeOldSyncedItems();
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }

    return this.getStats();
  }

  private handleItemFailure(item: SyncQueueItem, err: any): void {
    const isPermissionDenied = 
      err?.code === "permission-denied" || 
      String(err?.message || "").includes("PERMISSION_DENIED");

    item.retryCount += 1;
    item.errorMessage = err?.message || String(err);

    if (isPermissionDenied || item.retryCount >= MAX_RETRIES) {
      item.status = "failed";
      item.nextAttemptAt = undefined;
    } else {
      item.status = "pending";
      const backoffDelay = this.calculateBackoff(item.retryCount);
      item.nextAttemptAt = Date.now() + backoffDelay;
    }
  }

  /**
   * Default Firestore sync using dynamic import to preserve isolation
   */
  private async defaultFirestoreSync(item: SyncQueueItem): Promise<boolean> {
    try {
      const { db, isFirebaseReady } = await import("../firebase");
      const { doc, setDoc, deleteDoc } = await import("firebase/firestore");

      if (!isFirebaseReady || !db) {
        throw new Error("Firebase is not initialized or offline");
      }

      const docRef = doc(db, item.collectionName, item.id);

      if (item.action === "delete") {
        await deleteDoc(docRef);
        return true;
      }

      // Preserve client capture time and stamp server reception time
      const syncPayload = {
        ...item.payload,
        id: item.id,
        serverReceivedAt: new Date().toISOString(),
        _syncedBy: "durable_sync_engine_v2"
      };

      // Idempotent set with merge: true so duplicate submissions are no-ops
      await setDoc(docRef, syncPayload, { merge: true });
      return true;
    } catch (err: any) {
      console.warn(`[OfflineSyncService] Firestore sync failed for ${item.collectionName}/${item.id}:`, err);
      throw err;
    }
  }

  private purgeOldSyncedItems(): void {
    const queue = this.getQueue();
    const synced = queue.filter(q => q.status === "synced");
    if (synced.length > 50) {
      const unSynced = queue.filter(q => q.status !== "synced");
      const recentSynced = synced.slice(-50);
      this.saveQueue([...unSynced, ...recentSynced]);
    }
  }

  private handleNetworkReturn(): void {
    console.log("[OfflineSyncService] Network connectivity restored. Processing pending queue...");
    this.processQueue().catch(err => {
      console.error("[OfflineSyncService] Error during auto-reconnect flush:", err);
    });
  }

  public getStats(): SyncStats {
    const queue = this.getQueue();
    return {
      pendingCount: queue.filter(q => q.status === "pending").length,
      syncingCount: queue.filter(q => q.status === "syncing").length,
      failedCount: queue.filter(q => q.status === "failed").length,
      syncedCount: queue.filter(q => q.status === "synced").length,
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      isSyncing: this.isProcessing
    };
  }

  private notifyListeners(): void {
    if (typeof window !== "undefined") {
      const stats = this.getStats();
      window.dispatchEvent(new CustomEvent("offline_sync_status_changed", { detail: stats }));
    }
  }

  /**
   * For testing & maintenance: Clear queue
   */
  public clearQueue(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY_QUEUE);
      this.notifyListeners();
    }
  }
}

export const offlineSyncService = OfflineSyncService.getInstance();
