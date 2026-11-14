import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from '../components/Dashboard';
import { UserRole, Worker, Team, ProjectZone } from '../types';

describe('Dashboard Super Admin Null-Safety Tests', () => {
  it('renders cleanly as Super Admin even when workers lack name/trade or teams/zones are empty', () => {
    const partialWorkers = [
      { id: 'W-MISSING-1' } as unknown as Worker,
      { id: 'W-MISSING-2', name: undefined } as unknown as Worker,
    ];

    expect(() =>
      render(
        <Dashboard
          workers={partialWorkers}
          teams={[]}
          zones={[]}
          attendance={[]}
          isAmharic={false}
          t={(k: string) => k}
          activeTab="dashboard"
          setActiveTab={vi.fn()}
          currentUserRole={UserRole.SUPER_ADMIN}
          evaluations={[]}
        />
      )
    ).not.toThrow();

    expect(screen.getByText(/Top: W-MISSING-1/i)).toBeTruthy();
    expect(screen.getByText(/0% Rate/i)).toBeTruthy();
  });

  it('renders Top/Low performer highlights cleanly when mixed valid and partial workers exist', () => {
    const mixedWorkers = [
      { id: 'W-1', name: 'Abebe Bikila', trade: 'Formwork', status: 'Active' } as unknown as Worker,
      { id: 'W-2' } as unknown as Worker,
    ];
    const teams: Team[] = [
      {
        id: 'T-1',
        name: 'Alpha Crew',
        leaderId: 'W-1',
        leaderName: 'Abebe Bikila',
        department: 'Formwork',
        membersCount: 2,
        safetyScore: 95,
        qualityScore: 90,
        averageProductivity: 89,
      } as unknown as Team,
    ];
    const zones: ProjectZone[] = [
      {
        id: 'Z-1',
        name: 'Zone A',
        floor: 4,
        status: 'In Progress',
        completionPercentage: 75,
      } as unknown as ProjectZone,
    ];

    const { container } = render(
      <Dashboard
        workers={mixedWorkers}
        teams={teams}
        zones={zones}
        attendance={[]}
        isAmharic={false}
        t={(k: string) => k}
        activeTab="dashboard"
        setActiveTab={vi.fn()}
        currentUserRole={UserRole.SUPER_ADMIN}
        evaluations={[{ id: 'E-1', workerId: 'W-1', totalScore: 98 } as any]}
      />
    );

    expect(container.textContent).toContain('Top: Abebe');
    expect(container.textContent).toContain('Low: W-2');
    expect(container.textContent).not.toContain('NaN%');
  });
});
