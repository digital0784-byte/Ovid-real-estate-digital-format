import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { BiometricAttendanceBoard } from '../components/BiometricAttendanceBoard';
import { UserRole, Worker, AttendanceRecord } from '../types';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe('BiometricAttendanceBoard Null-Safety Tests', () => {
  const baseProps = {
    onAddAttendance: vi.fn(),
    isAmharic: false,
    currentUserRole: UserRole.SUPER_ADMIN,
  };

  it('renders cleanly with empty workers and empty attendance', () => {
    expect(() =>
      render(
        <BiometricAttendanceBoard
          {...baseProps}
          workers={[]}
          attendance={[]}
        />
      )
    ).not.toThrow();
  });

  it('renders cleanly with partial workers lacking optional fields', () => {
    const partialWorkers = [
      { id: 'W-1' } as unknown as Worker,
      { id: 'W-2', name: undefined, trade: undefined, department: undefined } as unknown as Worker,
    ];

    expect(() =>
      render(
        <BiometricAttendanceBoard
          {...baseProps}
          workers={partialWorkers}
          attendance={[]}
        />
      )
    ).not.toThrow();
  });

  it('renders cleanly with partial attendance records lacking optional fields', () => {
    const partialWorkers = [{ id: 'W-1' } as unknown as Worker];
    const partialAttendance = [
      { id: 'A-1', workerId: 'W-1' } as unknown as AttendanceRecord,
      {
        id: 'A-2',
        workerId: 'W-2',
        workerName: undefined,
        trade: undefined,
        floor: undefined,
        status: 'Present',
      } as unknown as AttendanceRecord,
    ];

    expect(() =>
      render(
        <BiometricAttendanceBoard
          {...baseProps}
          workers={partialWorkers}
          attendance={partialAttendance}
        />
      )
    ).not.toThrow();
  });
});
