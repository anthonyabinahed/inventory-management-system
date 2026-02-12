import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock auth actions
const mockSetSessionFromTokens = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockUpdatePassword = vi.fn();
const mockSignOut = vi.fn();
vi.mock('@/actions/auth', () => ({
  setSessionFromTokens: (...args) => mockSetSessionFromTokens(...args),
  getCurrentUser: () => mockGetCurrentUser(),
  updatePassword: (...args) => mockUpdatePassword(...args),
  signOut: () => mockSignOut(),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

vi.mock('@/config', () => ({
  default: {
    routes: {
      login: '/login',
      forgotPassword: '/forgot-password',
      resetPassword: '/reset-password',
    },
    colors: { theme: 'light' },
  },
}));

const { default: ResetPasswordPage } = await import('@/app/reset-password/page');

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(null);
  // Reset window.location.hash
  Object.defineProperty(window, 'location', {
    value: { hash: '', pathname: '/reset-password', href: 'http://localhost/reset-password' },
    writable: true,
  });
  window.history.replaceState = vi.fn();
});

describe('Reset Password Page', () => {
  it('shows error when no tokens and not authenticated', async () => {
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /link expired/i })).toBeInTheDocument();
    });
  });

  it('shows password form when user is already authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123', email: 'user@example.com' });
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    });
  });

  it('shows password form when hash contains valid tokens', async () => {
    window.location.hash = '#access_token=test-access&refresh_token=test-refresh';
    mockSetSessionFromTokens.mockResolvedValue({ user: { id: 'user-123' }, errorMessage: null });

    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });
    expect(mockSetSessionFromTokens).toHaveBeenCalledWith('test-access', 'test-refresh');
  });

  it('shows error when hash contains error', async () => {
    window.location.hash = '#error=invalid_token&error_description=Token+has+expired';

    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /link expired/i })).toBeInTheDocument();
      expect(screen.getByText('Token has expired')).toBeInTheDocument();
    });
  });

  it('shows "Request New Link" button on error', async () => {
    render(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByText(/request new link/i)).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123' });
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'short');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      const errors = screen.getAllByText(/password must be at least 8 characters/i);
      expect(errors.length).toBeGreaterThan(0);
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('validates password match', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123' });
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'Password123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'Different456');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('calls updatePassword, signOut, and redirects to login on success', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123' });
    mockUpdatePassword.mockResolvedValue({ success: true, errorMessage: null });
    mockSignOut.mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'NewPass123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'NewPass123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('NewPass123');
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast when updatePassword fails', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-123' });
    mockUpdatePassword.mockResolvedValue({ errorMessage: 'Password too weak' });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('At least 8 characters')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('At least 8 characters'), 'NewPass123');
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'NewPass123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});
