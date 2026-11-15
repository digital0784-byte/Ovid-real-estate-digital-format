import { describe, it, expect } from 'vitest';
import { isSensitiveRole, MFA_ENFORCED, SENSITIVE_ROLES } from '../services/authService';

describe('TOTP MFA master switch', () => {
  it('defaults MFA_ENFORCED to false', () => {
    expect(MFA_ENFORCED).toBe(false);
  });

  it('returns false from isSensitiveRole for all roles when MFA_ENFORCED is false', () => {
    for (const role of SENSITIVE_ROLES) {
      expect(isSensitiveRole(role)).toBe(false);
    }

    expect(isSensitiveRole('Super Admin')).toBe(false);
    expect(isSensitiveRole('Site Engineer')).toBe(false);
    expect(isSensitiveRole('Pending')).toBe(false);
  });
});
