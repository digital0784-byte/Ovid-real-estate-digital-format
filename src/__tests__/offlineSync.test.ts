import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineSyncService, SyncQueueItem } from '../services/offlineSyncService';

describe('Offline-First Data Capture & Idempotent Synchronization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    offlineSyncService.clearQueue();
    vi.restoreAllMocks();
  });

  it('should generate stable, globally unique client IDs that never change on retry', () => {
    const id1 = offlineSyncService.generateStableId('ATT');
    const id2 = offlineSyncService.generateStableId('ATT');

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('ATT-')).toBe(true);

    // Enqueue a record with id1
    const originalCaptureTime = '2026-10-12T08:00:00.000Z';
    const item1 = offlineSyncService.enqueue('attendance', 'set', {
      id: id1,
      workerId: 'W-001',
      workerName: 'Abebe Test',
      capturedAt: originalCaptureTime,
      status: 'Present'
    });

    expect(item1.id).toBe(id1);
    expect(item1.payload.capturedAt).toBe(originalCaptureTime);

    // Simulate a retry of the same event: enqueue again with same stable ID
    const retryItem = offlineSyncService.enqueue('attendance', 'set', {
      id: id1,
      workerId: 'W-001',
      workerName: 'Abebe Test',
      capturedAt: originalCaptureTime,
      status: 'Present'
    });

    // ID must remain strictly identical
    expect(retryItem.id).toBe(id1);
    expect(retryItem.payload.capturedAt).toBe(originalCaptureTime);

    // Queue must contain exactly 1 entry, NOT 2 entries
    const queue = offlineSyncService.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(id1);
  });

  it('should preserve queued records locally across simulated app restarts and reloads', () => {
    const stableId = offlineSyncService.generateStableId('ATT');
    const captureTime = new Date().toISOString();

    offlineSyncService.enqueue('attendance', 'set', {
      id: stableId,
      workerId: 'W-002',
      workerName: 'Kassahun Test',
      capturedAt: captureTime
    });

    // Verify written to storage
    const storedRaw = localStorage.getItem('erp_durable_sync_queue_v2');
    expect(storedRaw).toBeDefined();
    expect(storedRaw).toContain(stableId);

    // Simulate app restart by reading fresh instance from localStorage
    const reloadedQueue = offlineSyncService.getQueue();
    expect(reloadedQueue.length).toBe(1);
    expect(reloadedQueue[0].id).toBe(stableId);
    expect(reloadedQueue[0].status).toBe('pending');
    expect(reloadedQueue[0].payload.capturedAt).toBe(captureTime);
  });

  it('should preserve original client capture time and separately record server receipt time upon sync', async () => {
    const stableId = offlineSyncService.generateStableId('ATT');
    const deviceCaptureIso = '2026-10-12T07:15:30.000Z';

    offlineSyncService.enqueue('attendance', 'set', {
      id: stableId,
      workerId: 'W-003',
      workerName: 'Almaz Test',
      capturedAt: deviceCaptureIso,
      method: 'Fingerprint'
    });

    // Mock executor that simulates server response
    const mockServerDb = new Map<string, any>();
    const mockSyncExecutor = async (item: SyncQueueItem): Promise<boolean> => {
      // Simulate server receipt
      const serverReceiptIso = new Date().toISOString();
      mockServerDb.set(item.id, {
        ...item.payload,
        serverReceivedAt: serverReceiptIso
      });
      return true;
    };

    const stats = await offlineSyncService.processQueue(mockSyncExecutor);
    expect(stats.syncedCount).toBe(1);
    expect(stats.pendingCount).toBe(0);

    const serverDoc = mockServerDb.get(stableId);
    expect(serverDoc).toBeDefined();
    // Must preserve original client time
    expect(serverDoc.capturedAt).toBe(deviceCaptureIso);
    // Must have separate server receipt time
    expect(serverDoc.serverReceivedAt).toBeDefined();
    expect(new Date(serverDoc.serverReceivedAt).getTime()).toBeGreaterThanOrEqual(new Date(deviceCaptureIso).getTime());
  });

  it('should guarantee idempotency when multiple retries occur: server stores only one record', async () => {
    const stableId = offlineSyncService.generateStableId('ATT');
    const captureTime = '2026-10-12T06:30:00.000Z';

    const serverStore = new Map<string, any>();
    let serverWriteCount = 0;

    const mockSyncExecutor = async (item: SyncQueueItem): Promise<boolean> => {
      serverWriteCount++;
      // Emulate Firestore setDoc(doc(db, col, item.id), payload, { merge: true })
      serverStore.set(item.id, {
        ...item.payload,
        serverReceivedAt: new Date().toISOString()
      });
      return true;
    };

    // First offline creation
    offlineSyncService.enqueue('attendance', 'set', {
      id: stableId,
      workerId: 'W-004',
      capturedAt: captureTime
    });

    // First sync attempt
    await offlineSyncService.processQueue(mockSyncExecutor);
    expect(serverStore.size).toBe(1);
    expect(serverWriteCount).toBe(1);

    // Simulate network flicker / user re-submitting same record
    offlineSyncService.enqueue('attendance', 'set', {
      id: stableId,
      workerId: 'W-004',
      capturedAt: captureTime
    });

    // Second sync attempt (retry)
    await offlineSyncService.processQueue(mockSyncExecutor);

    // The server store must still contain exactly 1 document (no duplicates created!)
    expect(serverStore.size).toBe(1);
    expect(serverStore.has(stableId)).toBe(true);
  });

  it('should handle exponential backoff and transition states correctly on transient failures', async () => {
    const stableId = offlineSyncService.generateStableId('ATT');
    offlineSyncService.enqueue('attendance', 'set', {
      id: stableId,
      workerId: 'W-005',
      capturedAt: new Date().toISOString()
    });

    let attempt = 0;
    const failingExecutor = async (_item: SyncQueueItem): Promise<boolean> => {
      attempt++;
      throw new Error('Network timeout (simulated 504)');
    };

    // First attempt fails
    await offlineSyncService.processQueue(failingExecutor);
    const queueAfterFail = offlineSyncService.getQueue();
    const item = queueAfterFail.find(q => q.id === stableId);

    expect(item).toBeDefined();
    expect(item?.retryCount).toBe(1);
    expect(item?.status).toBe('pending');
    expect(item?.nextAttemptAt).toBeDefined();
    expect(item?.nextAttemptAt!).toBeGreaterThan(Date.now());
  });
});
