import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Attendance } from '../components/Attendance';
import { UserRole, Worker, AttendanceRecord, AttendanceMethod } from '../types';

describe('Attendance Tab Null-Safety Tests', () => {
  const baseProps = {
    onAddAttendance: vi.fn(),
    isAmharic: false,
    t: (k: string) => k,
    currentUserRole: UserRole.SUPER_ADMIN,
    onAddWorker: vi.fn(),
    onDeleteWorker: vi.fn(),
    evaluations: [],
    onAddEvaluation: vi.fn(),
  };

  it('renders cleanly with complete workers and attendance records', () => {
    const completeWorkers: Worker[] = [
      {
        id: 'W-100',
        name: 'Abebe Bikila',
        trade: 'Carpenter',
        department: 'Formwork',
        company: 'Ovid Construction',
        position: 'Senior Carpenter',
        teamId: 'T-01',
        status: 'Active',
        joinedDate: '2026-01-15',
      },
    ];
    const completeAttendance: AttendanceRecord[] = [
      {
        id: 'ATT-100',
        workerId: 'W-100',
        workerName: 'Abebe Bikila',
        company: 'Ovid Construction',
        date: '2026-07-01',
        status: 'Present',
        checkIn: '08:00',
        checkOut: '17:00',
        workingHours: 8,
        overtime: 0,
        method: AttendanceMethod.FINGERPRINT,
        floor: 4,
        zone: 'Zone A',
        building: 'Block A',
        department: 'Formwork',
        trade: 'Carpenter',
      },
    ];

    expect(() =>
      render(
        <Attendance
          {...baseProps}
          workers={completeWorkers}
          attendance={completeAttendance}
        />
      )
    ).not.toThrow();
  });

  it('does not throw for a worker missing joinedDate, trade, and name', () => {
    const partialWorker = {
      id: 'W-PARTIAL',
      status: 'Active',
      teamId: 'T-01',
    } as unknown as Worker;

    expect(() => {
      const { container } = render(
        <Attendance
          {...baseProps}
          workers={[partialWorker]}
          attendance={[]}
        />
      );
      const directoryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        /directory|roster|workers/i.test(b.textContent || '')
      );
      if (directoryBtn) fireEvent.click(directoryBtn);
    }).not.toThrow();
  });

  it('does not throw for a worker with only { id }', () => {
    const minimalWorker = { id: 'W-ONLY-ID' } as unknown as Worker;

    expect(() => {
      const { container } = render(
        <Attendance
          {...baseProps}
          workers={[minimalWorker, { id: 'W-ONLY-ID-2' } as unknown as Worker]}
          attendance={[]}
        />
      );
      const directoryBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        /directory|roster|workers/i.test(b.textContent || '')
      );
      if (directoryBtn) fireEvent.click(directoryBtn);
    }).not.toThrow();
  });

  it('does not throw for an attendance record with only { id, workerId }', () => {
    const minimalAttendance = {
      id: 'ATT-ONLY-IDS',
      workerId: 'W-ONLY-ID',
    } as unknown as AttendanceRecord;

    expect(() => {
      const { container } = render(
        <Attendance
          {...baseProps}
          workers={[{ id: 'W-ONLY-ID' } as unknown as Worker]}
          attendance={[minimalAttendance]}
        />
      );
      const tableBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        /attendance|table|logs/i.test(b.textContent || '')
      );
      if (tableBtn) fireEvent.click(tableBtn);
    }).not.toThrow();
  });
});
