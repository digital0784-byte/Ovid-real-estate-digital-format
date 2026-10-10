import { describe, it, expect, beforeEach } from 'vitest';
import { DbService } from '../services/db';
import { Worker } from '../types';

describe('DbService - Master Data & Offline Outbox Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should fetch workers and return default list when offline cache is uninitialized', async () => {
    const workers = await DbService.getWorkers();
    expect(Array.isArray(workers)).toBe(true);
    expect(workers.length).toBe(0);
  });

  it('should add worker, update local cache, and trigger update event', async () => {
    const newWorker: Worker = {
      id: 'TEST-W-01',
      name: 'Abebe Bikila Test',
      company: 'Digital Construction ERP System',
      department: 'Formwork Operations',
      trade: 'Formwork Carpenter',
      joinedDate: '2026-01-15',
      status: 'Active',
      teamId: 'TEAM-01'
    };

    let eventFired = false;
    window.addEventListener('workers_updated', () => {
      eventFired = true;
    });

    await DbService.addWorker(newWorker);
    expect(eventFired).toBe(true);

    const workers = await DbService.getWorkers();
    const found = workers.find(w => w.id === 'TEST-W-01');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Abebe Bikila Test');
  });

  it('should support updating worker records', async () => {
    const seedWorker: Worker = {
      id: 'TEST-W-02',
      name: 'Kassahun Tadesse Initial',
      company: 'Digital Construction ERP System',
      department: 'Formwork Operations',
      trade: 'Formwork Carpenter',
      joinedDate: '2026-01-15',
      status: 'Active',
      teamId: 'TEAM-01'
    };
    await DbService.addWorker(seedWorker);

    const target: Worker = { ...seedWorker, name: 'Updated Worker Name' };
    await DbService.updateWorker(target);
    const updatedWorkers = await DbService.getWorkers();
    const match = updatedWorkers.find(w => w.id === target.id);
    expect(match?.name).toBe('Updated Worker Name');
  });

  it('should save user record with sanitized fields and updatedAt timestamp', async () => {
    const userPayload = {
      id: 'test-user-uid-123',
      uid: 'test-user-uid-123',
      employeeId: 'Digital Construction ERP-ENG-999',
      displayName: 'Tesfaye Lemma',
      name: 'Tesfaye Lemma',
      email: 'tesfaye.lemma@example.com',
      phoneNumber: '0911223344',
      role: 'Pending',
      requestedRole: 'Site Engineer',
      department: 'Engineering',
      trade: 'Civil',
      position: 'Site Engineer',
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    await DbService.saveUser(userPayload);
    const usersCacheKey = 'digital_construction_db_users';
    const cachedUsers = JSON.parse(localStorage.getItem(usersCacheKey) || '[]');
    const saved = cachedUsers.find((u: any) => u.id === 'test-user-uid-123');

    expect(saved).toBeDefined();
    expect(saved.email).toBe('tesfaye.lemma@example.com');
    expect(saved.updatedAt).toBeDefined();
    expect(saved.role).toBe('Pending');
  });

  it('should save audit log record and preserve immutability fields', async () => {
    const auditRecord = {
      id: 'AUD-TEST-999',
      timestamp: new Date().toISOString(),
      userId: 'test-user-uid-123',
      userName: 'Tesfaye Lemma',
      role: 'Pending',
      action: 'User Self-Registration',
      details: 'Audit log creation test'
    };

    await DbService.addAuditLog(auditRecord);
    const auditCacheKey = 'digital_construction_db_auditLogs';
    const cachedLogs = JSON.parse(localStorage.getItem(auditCacheKey) || '[]');
    const foundLog = cachedLogs.find((l: any) => l.id === 'AUD-TEST-999');

    expect(foundLog).toBeDefined();
    expect(foundLog.userId).toBe('test-user-uid-123');
    expect(foundLog.action).toBe('User Self-Registration');
  });
});
