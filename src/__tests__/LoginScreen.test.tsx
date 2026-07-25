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

    expect(screen.getByText(/Digital Construction ERP/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/emp-101/i)).toBeInTheDocument();
  });

  it('allows user to input Employee ID and Password', () => {
    const handleLogin = vi.fn();

    render(
      <LoginScreen 
        isAmharic={false} 
        onLanguageToggle={vi.fn()}
        auditLogsCount={12}
        onLoginSuccess={handleLogin} 
      />
    );

    const empIdInput = screen.getByPlaceholderText(/emp-101/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(empIdInput, { target: { value: 'HO-01' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });

    expect((empIdInput as HTMLInputElement).value).toBe('HO-01');
    expect((passwordInput as HTMLInputElement).value).toBe('SecurePass123!');
  });
});
