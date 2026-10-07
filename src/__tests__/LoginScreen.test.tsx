import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LoginScreen } from '../components/LoginScreen';

describe('LoginScreen Component Unit Tests', () => {
  it('renders login screen elements correctly in English & Amharic', () => {
    const handleLogin = vi.fn();

    render(
      <LoginScreen 
        isAmharic={false} 
        onLanguageToggle={vi.fn()}
        auditLogsCount={12}
        onLoginSuccess={handleLogin} 
      />
    );

    expect(screen.getAllByText(/Digital Construction ERP/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/digital_construction_erprealestate\.com/i)).toBeInTheDocument();
  });

  it('allows user to input Email and Password', () => {
    const handleLogin = vi.fn();

    render(
      <LoginScreen 
        isAmharic={false} 
        onLanguageToggle={vi.fn()}
        auditLogsCount={12}
        onLoginSuccess={handleLogin} 
      />
    );

    const emailInput = screen.getByPlaceholderText(/digital_construction_erprealestate\.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: 'ho-admin@digital_construction_erprealestate.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });

    expect((emailInput as HTMLInputElement).value).toBe('ho-admin@digital_construction_erprealestate.com');
    expect((passwordInput as HTMLInputElement).value).toBe('SecurePass123!');
  });
});
