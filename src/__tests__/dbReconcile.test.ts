import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCollection = vi.fn((_db: any, name: string, ..._rest: any[]) => ({ name }));
const mockDoc = vi.fn((_db: any, col: string, id: string, ..._rest: any[]) => ({ col, id }));
const mockQuery = vi.fn((colRef: any, ..._rest: any[]) => colRef);
const mockLimit = vi.fn((..._args: any[]) => ({}));
const mockOnSnapshot = vi.fn((..._args: any[]) => () => {});

vi.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(args[0], args[1], ...args.slice(2)),
  doc: (...args: any[]) => mockDoc(args[0], args[1], args[2], ...args.slice(3)),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  query: (...args: any[]) => mockQuery(args[0], ...args.slice(1)),
  limit: (...args: any[]) => mockLimit(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args)
}));

vi.mock('../firebase', () => ({
  db: { __mock: true },
  auth: { currentUser: { uid: 'test-user-1' } },
  isFirebaseReady: true,
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write'
  },
  sanitizeForFirestore: (data: any) => data,
  handleFirestoreError: vi.fn()
}));

import { DbService } from '../services/db';

describe('DbService - Online Firestore Authoritative Reconciliation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
  });

  it('drops stale local cache entries missing from Firestore and never calls setDoc to re-upload them', async () => {
    localStorage.setItem(
      'digital_construction_db_workers',
      JSON.stringify([
        { id: 'STALE-1', name: 'Deleted Elsewhere Worker', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' },
        { id: 'W-1', name: 'Cached Older Name', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' }
      ])
    );

    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'W-1',
          data: () => ({ id: 'W-1', name: 'Authoritative Firestore Name', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' })
        }
      ]
    });

    const workers = await DbService.getWorkers();
    expect(workers).toHaveLength(1);
    expect(workers[0].id).toBe('W-1');
    expect(workers[0].name).toBe('Authoritative Firestore Name');
    expect(mockSetDoc).not.toHaveBeenCalled();

    const persistedCache = JSON.parse(localStorage.getItem('digital_construction_db_workers') || '[]');
    expect(persistedCache).toHaveLength(1);
    expect(persistedCache[0].id).toBe('W-1');
  });

  it('returns empty array when Firestore snapshot is empty even if localStorage has stale cached items', async () => {
    localStorage.setItem(
      'digital_construction_db_workers',
      JSON.stringify([
        { id: 'STALE-2', name: 'Ghost Worker', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' }
      ])
    );

    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: []
    });

    const workers = await DbService.getWorkers();
    expect(workers).toEqual([]);
    expect(mockSetDoc).not.toHaveBeenCalled();

    const persistedCache = JSON.parse(localStorage.getItem('digital_construction_db_workers') || '[]');
    expect(persistedCache).toEqual([]);
  });

  it('preserves pending outbox set actions not yet committed to Firestore', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'W-1',
          data: () => ({ id: 'W-1', name: 'Existing Worker', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' })
        }
      ]
    });

    localStorage.setItem(
      'digital_construction_outbox_queue',
      JSON.stringify([
        {
          id: 'W-QUEUED',
          action: 'set',
          collectionName: 'workers',
          data: { id: 'W-QUEUED', name: 'Pending Offline Worker', company: 'X', department: 'Ops', trade: 'Steel Fixer', status: 'Active', joinedDate: '2026-01-02', teamId: 'T-1' },
          timestamp: Date.now()
        }
      ])
    );

    const workers = await DbService.getWorkers();
    expect(workers.map(w => w.id)).toEqual(['W-1', 'W-QUEUED']);
    expect(workers.find(w => w.id === 'W-QUEUED')?.name).toBe('Pending Offline Worker');
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('hides items targeted by pending outbox delete actions from reconciled results', async () => {
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'W-1',
          data: () => ({ id: 'W-1', name: 'Keep Worker', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' })
        },
        {
          id: 'W-DEL',
          data: () => ({ id: 'W-DEL', name: 'Delete Pending Worker', company: 'X', department: 'Ops', trade: 'Carpenter', status: 'Active', joinedDate: '2026-01-01', teamId: 'T-1' })
        }
      ]
    });

    localStorage.setItem(
      'digital_construction_outbox_queue',
      JSON.stringify([
        {
          id: 'W-DEL',
          action: 'delete',
          collectionName: 'workers',
          timestamp: Date.now()
        }
      ])
    );

    const workers = await DbService.getWorkers();
    expect(workers).toHaveLength(1);
    expect(workers[0].id).toBe('W-1');
    expect(workers.find(w => w.id === 'W-DEL')).toBeUndefined();
  });
});
