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
    expect(workers.length).toBeGreaterThan(0);
    expect(workers[0]).toHaveProperty('id');
    expect(workers[0]).toHaveProperty('name');
  });

  it('should add worker, update local cache, and trigger update event', async () => {
    const newWorker: Worker = {
      id: 'TEST-W-01',
      name: 'Abebe Bikila Test',
      company: 'OVID Construction',
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
    const initialWorkers = await DbService.getWorkers();
    const target: Worker = { ...initialWorkers[0], name: 'Updated Worker Name' };

    await DbService.updateWorker(target);
    const updatedWorkers = await DbService.getWorkers();
    const match = updatedWorkers.find(w => w.id === target.id);
    expect(match?.name).toBe('Updated Worker Name');
  });
});
