import { describe, it, expect, vi, afterEach } from 'vitest';
import { simulationsEnabled, blockedAsSimulation } from '../config/features';

describe('features configuration & simulation gating', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disables simulations in production unless VITE_ENABLE_SIMULATIONS is "true"', () => {
    expect(simulationsEnabled({ PROD: true })).toBe(false);
    expect(simulationsEnabled({ PROD: true, VITE_ENABLE_SIMULATIONS: 'false' })).toBe(false);
    expect(simulationsEnabled({ PROD: true, VITE_ENABLE_SIMULATIONS: 'true' })).toBe(true);
    expect(simulationsEnabled({ PROD: false })).toBe(true);
  });

  it('blockedAsSimulation alerts once and returns true when disabled', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const blocked = blockedAsSimulation('x', false);
    expect(blocked).toBe(true);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[0]).toContain('x:');
  });

  it('blockedAsSimulation does not alert and returns false when enabled', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const blocked = blockedAsSimulation('x', true);
    expect(blocked).toBe(false);
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
